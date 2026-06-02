from posthog.hogql import ast
from posthog.hogql.context import HogQLContext
from posthog.hogql.database.models import DateTimeDatabaseField, LazyTable, LazyTableToAdd
from posthog.hogql.database.schema.util.where_clause_extractor import WhereClauseExtractor
from posthog.hogql.parser import parse_expr
from posthog.hogql.visitor import clone_expr


def _created_at_field(lazy_table: LazyTable) -> ast.Field:
    return ast.Field(
        chain=["persons", "created_at"],
        type=ast.FieldType(name="created_at", table_type=ast.LazyTableType(table=lazy_table)),
    )


def test_where_clause_extractor_keeps_constant_interval_arithmetic() -> None:
    lazy_table = LazyTable(fields={"created_at": DateTimeDatabaseField(name="created_at")})
    extractor = WhereClauseExtractor(HogQLContext())
    extractor.add_local_tables(LazyTableToAdd(lazy_table=lazy_table))

    actual = extractor.visit(
        ast.CompareOperation(
            op=ast.CompareOperationOp.Lt,
            left=_created_at_field(lazy_table),
            right=parse_expr("toDateTime('2024-10-25') + interval 1 day"),
        )
    )

    assert clone_expr(actual, clear_types=True, clear_locations=True) == clone_expr(
        parse_expr("created_at < toDateTime('2024-10-25') + interval 1 day"),
        clear_types=True,
        clear_locations=True,
    )


def test_where_clause_extractor_drops_unsupported_arithmetic() -> None:
    lazy_table = LazyTable(fields={"created_at": DateTimeDatabaseField(name="created_at")})
    extractor = WhereClauseExtractor(HogQLContext())
    extractor.add_local_tables(LazyTableToAdd(lazy_table=lazy_table))

    actual = extractor.visit(
        ast.CompareOperation(
            op=ast.CompareOperationOp.Lt,
            left=ast.ArithmeticOperation(
                op=ast.ArithmeticOperationOp.Add,
                left=_created_at_field(lazy_table),
                right=ast.Field(chain=["unknown"]),
            ),
            right=parse_expr("toDateTime('2024-10-25')"),
        )
    )

    assert actual == ast.Constant(value=extractor.tombstone_string)
