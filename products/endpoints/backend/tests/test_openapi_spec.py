from posthog.test.base import APIBaseTest, ClickhouseTestMixin, flush_persons_and_events
from unittest import mock

from django.utils import timezone

from rest_framework import status

from posthog.schema import Breakdown, BreakdownFilter, BreakdownType, EventsNode, TrendsQuery

from posthog.models.insight_variable import InsightVariable

from products.data_modeling.backend.models.datawarehouse_saved_query import DataWarehouseSavedQuery
from products.endpoints.backend.tests.conftest import create_endpoint_with_version
from products.warehouse_sources.backend.models.table import DataWarehouseTable


class TestEndpointOpenAPISpec(ClickhouseTestMixin, APIBaseTest):
    """Tests for the OpenAPI specification generation endpoint."""

    def setUp(self):
        super().setUp()
        self.sample_hogql_query = {
            "kind": "HogQLQuery",
            "query": "SELECT count(1) FROM events",
        }
        self.sync_workflow_patcher = mock.patch(
            "products.data_warehouse.backend.data_load.saved_query_service.sync_saved_query_workflow"
        )
        self.sync_workflow_patcher.start()

    def tearDown(self):
        self.sync_workflow_patcher.stop()
        super().tearDown()

    def _materialize_endpoint(self, endpoint):
        flush_persons_and_events()

        response = self.client.patch(
            f"/api/environments/{self.team.id}/endpoints/{endpoint.name}/",
            {"is_materialized": True, "data_freshness_seconds": 86400},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK, response.json()

        version = endpoint.versions.first()
        assert version is not None
        version.refresh_from_db()
        saved_query = version.saved_query
        assert saved_query is not None

        saved_query.status = DataWarehouseSavedQuery.Status.COMPLETED
        saved_query.last_run_at = timezone.now()
        saved_query.table = DataWarehouseTable.objects.create(
            team=self.team,
            name=endpoint.name,
            format=DataWarehouseTable.TableFormat.Parquet,
            url_pattern=f"s3://test-bucket/{endpoint.name}",
        )
        saved_query.save()

        return saved_query

    def test_openapi_spec_basic(self):
        """Test generating OpenAPI spec for a basic endpoint."""
        create_endpoint_with_version(
            name="basic-endpoint",
            team=self.team,
            query=self.sample_hogql_query,
            description="A basic test endpoint",
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/basic-endpoint/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        self.assertEqual(spec["openapi"], "3.0.3")
        self.assertEqual(spec["info"]["title"], "basic-endpoint")
        self.assertEqual(spec["info"]["description"], "A basic test endpoint")
        self.assertEqual(spec["info"]["version"], "1")

        self.assertIn("servers", spec)
        self.assertEqual(len(spec["servers"]), 1)

        run_path = f"/api/environments/{self.team.id}/endpoints/basic-endpoint/run"
        self.assertIn(run_path, spec["paths"])

        post_op = spec["paths"][run_path]["post"]
        self.assertEqual(post_op["operationId"], "run_basic_endpoint")
        self.assertIn("requestBody", post_op)
        self.assertIn("responses", post_op)
        self.assertIn("200", post_op["responses"])

        response_schema = post_op["responses"]["200"]["content"]["application/json"]["schema"]
        self.assertIn("results", response_schema["properties"])
        self.assertEqual(response_schema["properties"]["results"]["type"], "array")

    def test_openapi_spec_with_variables(self):
        variable = InsightVariable.objects.create(
            team=self.team,
            name="Country Filter",
            code_name="country",
            type=InsightVariable.Type.STRING,
            default_value="US",
        )

        query_with_variables = {
            "kind": "HogQLQuery",
            "query": "SELECT * FROM events WHERE properties.$country = {variables.country}",
            "variables": {str(variable.id): {"variableId": str(variable.id), "code_name": "country", "value": "US"}},
        }

        create_endpoint_with_version(
            name="endpoint-with-vars",
            team=self.team,
            query=query_with_variables,
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/endpoint-with-vars/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        endpoint_schema = spec["components"]["schemas"]["EndpointRunRequest"]
        self.assertIn("variables", endpoint_schema["properties"])

        self.assertIn("Variables", spec["components"]["schemas"])
        variables_schema = spec["components"]["schemas"]["Variables"]
        self.assertEqual(variables_schema["type"], "object")
        self.assertIn("country", variables_schema["properties"])
        self.assertEqual(variables_schema["properties"]["country"]["type"], "string")

    def test_openapi_spec_variable_types(self):
        test_cases = [
            (InsightVariable.Type.NUMBER, "number", None),
            (InsightVariable.Type.BOOLEAN, "boolean", None),
            (InsightVariable.Type.DATE, "string", "date"),
        ]

        for var_type, expected_openapi_type, expected_format in test_cases:
            with self.subTest(var_type=var_type):
                variable = InsightVariable.objects.create(
                    team=self.team,
                    name=f"Test {var_type}",
                    code_name=f"test_{var_type.lower()}",
                    type=var_type,
                    default_value="42" if var_type == InsightVariable.Type.NUMBER else None,
                )

                query = {
                    "kind": "HogQLQuery",
                    "query": f"SELECT * FROM events WHERE x = {{variables.test_{var_type.lower()}}}",
                    "variables": {
                        str(variable.id): {
                            "variableId": str(variable.id),
                            "code_name": f"test_{var_type.lower()}",
                            "value": None,
                        }
                    },
                }

                ep_name = f"typed-var-{var_type.lower()}"
                create_endpoint_with_version(
                    name=ep_name,
                    team=self.team,
                    query=query,
                    created_by=self.user,
                    is_active=True,
                )

                response = self.client.get(f"/api/environments/{self.team.id}/endpoints/{ep_name}/openapi.json/")
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                spec = response.json()

                var_schema = spec["components"]["schemas"]["Variables"]["properties"][f"test_{var_type.lower()}"]
                self.assertEqual(var_schema["type"], expected_openapi_type)
                if expected_format:
                    self.assertEqual(var_schema["format"], expected_format)

    def test_openapi_spec_refresh_enum(self):
        create_endpoint_with_version(
            name="refresh-test",
            team=self.team,
            query=self.sample_hogql_query,
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/refresh-test/openapi.json/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        refresh_schema = spec["components"]["schemas"]["EndpointRunRequest"]["properties"]["refresh"]
        self.assertEqual(refresh_schema["enum"], ["cache", "force", "direct"])
        self.assertEqual(refresh_schema["default"], "cache")

    def test_openapi_spec_includes_limit_and_debug(self):
        create_endpoint_with_version(
            name="fields-test",
            team=self.team,
            query=self.sample_hogql_query,
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/fields-test/openapi.json/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        props = spec["components"]["schemas"]["EndpointRunRequest"]["properties"]
        self.assertIn("limit", props)
        self.assertEqual(props["limit"]["type"], "integer")
        self.assertIn("debug", props)
        self.assertEqual(props["debug"]["type"], "boolean")

    def test_openapi_spec_dashboard_filter_schema(self):
        """Test that DashboardFilter schema includes date_from and date_to."""
        create_endpoint_with_version(
            name="filter-test-endpoint",
            team=self.team,
            query=self.sample_hogql_query,
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/filter-test-endpoint/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        # Check DashboardFilter schema
        self.assertIn("DashboardFilter", spec["components"]["schemas"])
        filter_schema = spec["components"]["schemas"]["DashboardFilter"]
        self.assertIn("date_from", filter_schema["properties"])
        self.assertIn("date_to", filter_schema["properties"])
        self.assertIn("properties", filter_schema["properties"])

    def test_openapi_spec_not_found(self):
        """Test that requesting spec for non-existent endpoint returns 404."""
        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/nonexistent/openapi.json/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_openapi_spec_security_scheme(self):
        """Test that the spec includes proper security scheme."""
        create_endpoint_with_version(
            name="secure-endpoint",
            team=self.team,
            query=self.sample_hogql_query,
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/secure-endpoint/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        self.assertIn("components", spec)
        self.assertIn("securitySchemes", spec["components"])
        self.assertIn("PersonalAPIKey", spec["components"]["securitySchemes"])
        self.assertEqual(spec["components"]["securitySchemes"]["PersonalAPIKey"]["type"], "http")
        self.assertEqual(spec["components"]["securitySchemes"]["PersonalAPIKey"]["scheme"], "bearer")

    def test_openapi_spec_version_reflects_endpoint_version(self):
        """Test that the spec version matches the endpoint's current version."""
        create_endpoint_with_version(
            name="versioned-endpoint",
            team=self.team,
            query=self.sample_hogql_query,
            created_by=self.user,
            is_active=True,
            current_version=3,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/versioned-endpoint/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()
        self.assertEqual(spec["info"]["version"], "3")

    def test_openapi_spec_insight_endpoint_with_date_variables(self):
        """Test that non-materialized insight endpoints include date variables in spec."""
        create_endpoint_with_version(
            name="trends-endpoint",
            team=self.team,
            query=TrendsQuery(series=[EventsNode(event="$pageview")]).model_dump(),
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/trends-endpoint/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        # Check that EndpointRunRequest schema has variables reference
        endpoint_schema = spec["components"]["schemas"]["EndpointRunRequest"]
        self.assertIn("variables", endpoint_schema["properties"])

        # Check Variables schema is defined with date variables
        self.assertIn("Variables", spec["components"]["schemas"])
        variables_schema = spec["components"]["schemas"]["Variables"]
        self.assertEqual(variables_schema["type"], "object")
        self.assertIn("date_from", variables_schema["properties"])
        self.assertIn("date_to", variables_schema["properties"])

    def test_openapi_spec_insight_endpoint_with_breakdown(self):
        """Test that insight endpoints with breakdown include breakdown property in spec."""
        create_endpoint_with_version(
            name="trends-breakdown",
            team=self.team,
            query=TrendsQuery(
                series=[EventsNode(event="$pageview")],
                breakdownFilter=BreakdownFilter(breakdowns=[Breakdown(property="$browser", type=BreakdownType.EVENT)]),
            ).model_dump(),
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/trends-breakdown/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        # Check Variables schema includes breakdown property
        self.assertIn("Variables", spec["components"]["schemas"])
        variables_schema = spec["components"]["schemas"]["Variables"]
        self.assertIn("$browser", variables_schema["properties"])
        # Non-materialized should also have date variables
        self.assertIn("date_from", variables_schema["properties"])
        self.assertIn("date_to", variables_schema["properties"])

    def test_openapi_spec_hogql_without_variables(self):
        """Test that HogQL endpoints without variables don't include Variables schema."""
        create_endpoint_with_version(
            name="simple-hogql",
            team=self.team,
            query={"kind": "HogQLQuery", "query": "SELECT 1"},
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/simple-hogql/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()

        # Should not have Variables schema since no variables defined
        self.assertNotIn("Variables", spec["components"]["schemas"])

    def test_openapi_spec_materialized_hogql_marks_variables_as_required(self):
        variable = InsightVariable.objects.create(
            team=self.team,
            name="Event Name",
            code_name="event_name",
            type=InsightVariable.Type.STRING,
            default_value="$pageview",
        )

        endpoint = create_endpoint_with_version(
            name="materialized-hogql-vars",
            team=self.team,
            query={
                "kind": "HogQLQuery",
                "query": "SELECT count() FROM events WHERE event = {variables.event_name}",
                "variables": {
                    str(variable.id): {
                        "variableId": str(variable.id),
                        "code_name": "event_name",
                        "value": "$pageview",
                    }
                },
            },
            created_by=self.user,
            is_active=True,
        )
        self._materialize_endpoint(endpoint)

        response = self.client.get(f"/api/environments/{self.team.id}/endpoints/{endpoint.name}/openapi.json/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()
        post_op = spec["paths"][f"/api/environments/{self.team.id}/endpoints/{endpoint.name}/run"]["post"]
        self.assertTrue(post_op["requestBody"]["required"])
        self.assertEqual(spec["components"]["schemas"]["EndpointRunRequest"]["required"], ["variables"])
        self.assertEqual(spec["components"]["schemas"]["Variables"]["required"], ["event_name"])

    def test_openapi_spec_non_materialized_hogql_keeps_variables_optional(self):
        variable = InsightVariable.objects.create(
            team=self.team,
            name="Event Name",
            code_name="event_name_optional",
            type=InsightVariable.Type.STRING,
            default_value="$pageview",
        )

        create_endpoint_with_version(
            name="non-materialized-hogql-vars",
            team=self.team,
            query={
                "kind": "HogQLQuery",
                "query": "SELECT count() FROM events WHERE event = {variables.event_name_optional}",
                "variables": {
                    str(variable.id): {
                        "variableId": str(variable.id),
                        "code_name": "event_name_optional",
                        "value": "$pageview",
                    }
                },
            },
            created_by=self.user,
            is_active=True,
        )

        response = self.client.get(
            f"/api/environments/{self.team.id}/endpoints/non-materialized-hogql-vars/openapi.json/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        spec = response.json()
        post_op = spec["paths"][f"/api/environments/{self.team.id}/endpoints/non-materialized-hogql-vars/run"]["post"]
        self.assertFalse(post_op["requestBody"]["required"])
        self.assertNotIn("required", spec["components"]["schemas"]["EndpointRunRequest"])
        self.assertNotIn("required", spec["components"]["schemas"]["Variables"])
