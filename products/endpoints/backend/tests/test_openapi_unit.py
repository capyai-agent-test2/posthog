from types import SimpleNamespace

from unittest.mock import MagicMock, patch

from products.endpoints.backend.openapi import generate_openapi_spec


def _build_hogql_version(*, is_materialized: bool) -> SimpleNamespace:
    return SimpleNamespace(
        description="",
        version=1,
        query={
            "kind": "HogQLQuery",
            "query": "SELECT count() FROM events WHERE event = {variables.event_name}",
            "variables": {
                "123": {
                    "code_name": "event_name",
                    "value": "$pageview",
                }
            },
        },
        is_materialized=is_materialized,
        saved_query=object() if is_materialized else None,
        bucket_overrides=None,
    )


def test_generate_openapi_spec_marks_materialized_variables_as_required() -> None:
    endpoint = SimpleNamespace(name="demo-endpoint", current_version=1)
    request = MagicMock()
    version = _build_hogql_version(is_materialized=True)

    with (
        patch("products.endpoints.backend.openapi.InsightVariable.objects.filter") as filter_mock,
        patch("products.endpoints.backend.openapi.analyze_variables_for_materialization") as analyzer_mock,
    ):
        filter_mock.return_value.values_list.return_value = [("123", "string")]
        analyzer_mock.return_value = (True, "", [SimpleNamespace(code_name="event_name")])

        spec = generate_openapi_spec(endpoint, 1, request, version)

    post_op = spec["paths"]["/api/environments/1/endpoints/demo-endpoint/run"]["post"]
    assert post_op["requestBody"]["required"] is True
    assert spec["components"]["schemas"]["EndpointRunRequest"]["required"] == ["variables"]
    assert spec["components"]["schemas"]["Variables"]["required"] == ["event_name"]


def test_generate_openapi_spec_keeps_non_materialized_variables_optional() -> None:
    endpoint = SimpleNamespace(name="demo-endpoint", current_version=1)
    request = MagicMock()
    version = _build_hogql_version(is_materialized=False)

    with patch("products.endpoints.backend.openapi.InsightVariable.objects.filter") as filter_mock:
        filter_mock.return_value.values_list.return_value = [("123", "string")]

        spec = generate_openapi_spec(endpoint, 1, request, version)

    post_op = spec["paths"]["/api/environments/1/endpoints/demo-endpoint/run"]["post"]
    assert post_op["requestBody"]["required"] is False
    assert "required" not in spec["components"]["schemas"]["EndpointRunRequest"]
    assert "required" not in spec["components"]["schemas"]["Variables"]
