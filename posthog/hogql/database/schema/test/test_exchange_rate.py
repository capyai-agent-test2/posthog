from types import SimpleNamespace
from typing import cast

from posthog.schema import RevenueAnalyticsEventItem, RevenueCurrencyPropertyConfig

from posthog.hogql.database.schema.exchange_rate import currency_expression_for_events

from posthog.models.team.team import Team


def test_currency_expression_casts_dynamic_currency_properties_to_string() -> None:
    team = cast(Team, SimpleNamespace(base_currency="USD"))
    event_config = RevenueAnalyticsEventItem(
        eventName="purchase",
        revenueProperty="amount",
        revenueCurrencyProperty=RevenueCurrencyPropertyConfig(property="amount"),
    )

    expr = currency_expression_for_events(team, event_config)

    assert expr.to_hogql() == "upper(toString(events.properties.amount))"
