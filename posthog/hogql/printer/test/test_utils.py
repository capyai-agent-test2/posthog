from types import SimpleNamespace

from posthog.hogql import ast
from posthog.hogql.context import HogQLContext
from posthog.hogql.printer import utils


def test_to_printed_hogql_substitutes_generated_values(monkeypatch) -> None:
    def fake_prepare_and_print_ast(
        node: ast.Expr,
        context: HogQLContext,
        dialect: str,
        pretty: bool,
    ) -> tuple[str, None]:
        context.values["hogql_val_0"] = "industry"
        return "SELECT has(events.properties_group_custom, %(hogql_val_0)s)", None

    team = SimpleNamespace(
        pk=1,
        id=1,
        modifiers={},
        person_on_events_mode_flag_based_default=None,
    )

    monkeypatch.setattr(utils, "prepare_and_print_ast", fake_prepare_and_print_ast)

    response = utils.to_printed_hogql(ast.Constant(value=1), team)  # type: ignore[arg-type]

    assert response == "SELECT has(events.properties_group_custom, 'industry')"


def test_to_printed_hogql_hides_generated_sensitive_values(monkeypatch) -> None:
    def fake_prepare_and_print_ast(
        node: ast.Expr,
        context: HogQLContext,
        dialect: str,
        pretty: bool,
    ) -> tuple[str, None]:
        context.values["hogql_val_0_sensitive"] = "secret"
        return "SELECT s3(%(hogql_val_0_sensitive)s)", None

    team = SimpleNamespace(
        pk=1,
        id=1,
        modifiers={},
        person_on_events_mode_flag_based_default=None,
    )

    monkeypatch.setattr(utils, "prepare_and_print_ast", fake_prepare_and_print_ast)

    response = utils.to_printed_hogql(ast.Constant(value=1), team)  # type: ignore[arg-type]

    assert response == "SELECT s3('[HIDDEN]')"
