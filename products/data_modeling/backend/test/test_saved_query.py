from django.test import SimpleTestCase

from parameterized import parameterized

from products.data_modeling.backend.models.datawarehouse_saved_query import DataWarehouseSavedQuery


class TestDataWarehouseSavedQueryHogQLDefinition(SimpleTestCase):
    @parameterized.expand(
        [
            ("legacy_column_definition", "Nullable(DateTime64(6))", True),
            (
                "structured_column_definition",
                {"clickhouse": "Nullable(DateTime64(6))", "hogql": "DateTimeDatabaseField"},
                True,
            ),
            ("non_nullable_column", {"clickhouse": "DateTime64(6)", "hogql": "DateTimeDatabaseField"}, False),
        ]
    )
    def test_hogql_definition_preserves_column_nullability(self, _name: str, column_definition: object, expected: bool):
        saved_query = DataWarehouseSavedQuery(
            name="test_saved_query",
            query={"query": "SELECT target_timestamp"},
            columns={"target_timestamp": column_definition},
        )

        field = saved_query.hogql_definition().fields["target_timestamp"]

        self.assertEqual(field.is_nullable(), expected)
