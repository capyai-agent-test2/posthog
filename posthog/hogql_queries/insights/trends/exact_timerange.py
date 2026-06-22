from datetime import datetime

from posthog.schema import ChartDisplayType, TrendsQuery

from posthog.hogql_queries.utils.query_date_range import QueryDateRange
from posthog.models import Team


def should_use_exact_timerange(
    trends_query: TrendsQuery,
    team: Team,
    display_type: ChartDisplayType | None,
    *,
    now: datetime | None = None,
) -> bool:
    if trends_query.dateRange and trends_query.dateRange.explicitDate:
        return True

    if display_type not in (ChartDisplayType.ACTIONS_BAR, ChartDisplayType.ACTIONS_UNSTACKED_BAR):
        return False

    preview_date_range = QueryDateRange(
        date_range=trends_query.dateRange,
        team=team,
        interval=trends_query.interval,
        now=now or datetime.now(),
    )

    return preview_date_range.align_with_interval(
        preview_date_range.date_from()
    ) == preview_date_range.align_with_interval(preview_date_range.date_to())
