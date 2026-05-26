from posthog.hogql.database.models import UUIDDatabaseField

from products.data_modeling.backend.models.datawarehouse_saved_query import DataWarehouseSavedQuery
from products.warehouse_sources.backend.models.util import CLICKHOUSE_HOGQL_MAPPING, postgres_column_to_dwh_column


def test_clickhouse_uuid_maps_to_uuid_database_field() -> None:
    assert CLICKHOUSE_HOGQL_MAPPING["UUID"] is UUIDDatabaseField


def test_postgres_uuid_columns_preserve_uuid_type() -> None:
    assert postgres_column_to_dwh_column("id", "uuid", False) == {
        "clickhouse": "UUID",
        "hogql": "uuid",
        "valid": True,
    }


def test_saved_query_uuid_columns_compile_as_uuid_fields() -> None:
    saved_query = DataWarehouseSavedQuery(
        name="one_person",
        query={"kind": "HogQLQuery", "query": "SELECT person.id FROM events LIMIT 1"},
        columns={"id": {"clickhouse": "UUID", "hogql": "UUIDDatabaseField", "valid": True}},
    )

    definition = saved_query.hogql_definition()

    assert isinstance(definition.fields["id"], UUIDDatabaseField)
