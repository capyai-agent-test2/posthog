from posthog.clickhouse.client.connection import NodeRole
from posthog.clickhouse.client.migration_tools import run_sql_with_exceptions
from posthog.models.person.sql import KAFKA_PERSONS_TABLE_SQL, PERSONS_TABLE, PERSONS_TABLE_MV_SQL

operations = [
    run_sql_with_exceptions("DROP TABLE IF EXISTS person_mv"),
    run_sql_with_exceptions("DROP TABLE IF EXISTS kafka_person"),
    run_sql_with_exceptions(
        "ALTER TABLE person ADD COLUMN IF NOT EXISTS is_deleted Int8 DEFAULT 0",
        node_roles=[NodeRole.DATA],
        sharded=False,
        is_alter_on_replicated_table=True,
    ),
    run_sql_with_exceptions(KAFKA_PERSONS_TABLE_SQL(on_cluster=False)),
    run_sql_with_exceptions(PERSONS_TABLE_MV_SQL(on_cluster=False, target_table=PERSONS_TABLE)),
]
