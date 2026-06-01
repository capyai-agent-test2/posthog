from typing import Any

from posthog.hogql.context import HogQLContext
from posthog.hogql.database.database import Database
from posthog.hogql.parser import parse_expr
from posthog.hogql.printer import print_prepared_ast
from posthog.hogql.resolver import resolve_types


def _print_expr(query: str) -> tuple[str, dict[str, Any]]:
    context = HogQLContext(database=Database(include_posthog_tables=False), restricted_properties=set())
    node = resolve_types(parse_expr(query), context, dialect="clickhouse")
    return print_prepared_ast(node, context=context, dialect="clickhouse"), context.values


def test_date_sub_accepts_clickhouse_interval_argument() -> None:
    sql, values = _print_expr("dateSub(toDate('2018-01-01'), interval 7 day)")
    assert sql == ("dateSub(toDateOrNull(%(hogql_val_0)s), toIntervalDay(7))")
    assert values == {"hogql_val_0": "2018-01-01"}


def test_date_sub_accepts_bare_clickhouse_unit_argument() -> None:
    sql, values = _print_expr("dateSub(DAY, 7, toDate('2018-01-01'))")
    assert sql == ("dateSub(%(hogql_val_0)s, 7, toDateOrNull(%(hogql_val_1)s))")
    assert values == {"hogql_val_0": "day", "hogql_val_1": "2018-01-01"}
