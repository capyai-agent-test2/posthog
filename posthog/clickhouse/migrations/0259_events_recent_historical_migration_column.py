from posthog.clickhouse.client.connection import NodeRole
from posthog.clickhouse.client.migration_tools import run_sql_with_exceptions

ADD_HISTORICAL_MIGRATION_COLUMN_EVENTS_RECENT = """
ALTER TABLE IF EXISTS {table}
ADD COLUMN IF NOT EXISTS historical_migration Bool
"""

operations = [
    run_sql_with_exceptions(
        ADD_HISTORICAL_MIGRATION_COLUMN_EVENTS_RECENT.format(table="sharded_events_recent"),
        node_roles=[NodeRole.DATA],
        sharded=True,
        is_alter_on_replicated_table=True,
    ),
    run_sql_with_exceptions(
        ADD_HISTORICAL_MIGRATION_COLUMN_EVENTS_RECENT.format(table="events_recent"),
        node_roles=[NodeRole.DATA],
        sharded=False,
        is_alter_on_replicated_table=True,
    ),
]
