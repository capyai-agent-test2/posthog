from types import SimpleNamespace

from posthog.hogql.context import HogQLContext
from posthog.hogql.database.database import Database
from posthog.hogql.parser import parse_select
from posthog.hogql.printer import prepare_ast_for_printing, print_prepared_ast
from posthog.hogql.transforms.property_types import PropertySwapper


def _prepare_without_database_lookups(monkeypatch) -> HogQLContext:
    import posthog.hogql.printer.base as printer_base
    import posthog.hogql.printer.utils as printer_utils

    monkeypatch.setattr(printer_utils, "get_restricted_properties_for_team", lambda team_id, user=None: {})
    monkeypatch.setattr(printer_base, "get_materialized_column_for_property", lambda *args, **kwargs: None)

    def fake_build_property_swapper(node, context: HogQLContext) -> None:
        context.property_swapper = PropertySwapper(
            timezone=context.database.get_timezone() if context.database else "UTC",
            event_properties={},
            person_properties={},
            group_properties={},
            context=context,
            setTimeZones=True,
        )

    monkeypatch.setattr(printer_utils, "build_property_swapper", fake_build_property_swapper)

    organization = SimpleNamespace(id="1", created_at="2020-01-01")
    team = SimpleNamespace(
        pk=1,
        id=1,
        uuid="team-1",
        organization=organization,
        organization_id="1",
        timezone="UTC",
        week_start_day=None,
    )

    context = HogQLContext(team_id=1, enable_select_queries=True, team=team)
    context.database = Database(timezone="UTC")
    return context


def test_clickhouse_array_join_is_printed_before_lazy_joins(monkeypatch) -> None:
    context = _prepare_without_database_lookups(monkeypatch)
    query = parse_select(
        """
        select distinct_id, person.properties.name,
        JSONExtractString(answered_question, 'prefix') as prefix
        from events
        array join JSONExtractArrayRaw(properties.quizResults.answers ?? '[]') as answered_question
        where event = 'Quiz Finished'
        """
    )

    prepared = prepare_ast_for_printing(query, context=context, dialect="clickhouse", stack=[query])
    sql = print_prepared_ast(prepared, context=context, dialect="clickhouse", stack=[])

    assert "FROM events ARRAY JOIN" in sql
    assert "ARRAY JOIN" in sql
    assert "INNER JOIN (SELECT tupleElement(argMax(tuple(person_distinct_id2.person_id)" in sql
    assert "LEFT JOIN (SELECT tupleElement(argMax(tuple(replaceRegexpAll(" in sql
    assert sql.index("ARRAY JOIN") < sql.index("INNER JOIN")
    assert sql.index("ARRAY JOIN") < sql.index("LEFT JOIN")
