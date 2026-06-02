from posthog.hogql import ast
from posthog.hogql.functions.core import compare_types
from posthog.hogql.functions.mapping import HOGQL_CLICKHOUSE_FUNCTIONS


def test_to_date_accepts_date_arguments() -> None:
    function = HOGQL_CLICKHOUSE_FUNCTIONS["toDate"]

    assert function.signatures is not None
    assert any(
        compare_types([ast.DateType()], signature_arg_types)
        and isinstance(signature_return_type, ast.DateType)
        for signature_arg_types, signature_return_type in function.signatures
    )
