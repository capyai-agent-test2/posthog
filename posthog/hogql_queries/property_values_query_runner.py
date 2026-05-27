import json
import uuid
from datetime import datetime
from typing import Any, Optional, cast

from posthog.schema import (
    CachedPropertyValuesQueryResponse,
    PropertyType,
    PropertyValueItem,
    PropertyValuesQuery,
    PropertyValuesQueryResponse,
)

from posthog.hogql import ast
from posthog.hogql.query import execute_hogql_query

from posthog.caching.utils import (
    ThresholdMode,
    cache_target_age as _cache_target_age,
)
from posthog.hogql_queries.query_runner import AnalyticsQueryRunner
from posthog.utils import convert_property_value, flatten, relative_date_parse


class PropertyValuesQueryRunner(AnalyticsQueryRunner[PropertyValuesQueryResponse]):
    query: PropertyValuesQuery
    cached_response: CachedPropertyValuesQueryResponse

    def cache_target_age(self, last_refresh: Optional[datetime], lazy: bool = False) -> Optional[datetime]:
        # Property values don't change frequently — treat as daily-interval data (6h staleness).
        # On cache miss the first request blocks; on stale cache the old results are returned immediately
        # and a background refresh is enqueued via RECENT_CACHE_CALCULATE_ASYNC_IF_STALE_AND_BLOCKING_ON_MISS.
        if last_refresh is None:
            return None
        mode = ThresholdMode.LAZY if lazy else ThresholdMode.DEFAULT
        return _cache_target_age("day", last_refresh=last_refresh, mode=mode)

    def to_query(self) -> ast.SelectQuery:
        if self.query.property_type == PropertyType.EVENT:
            return self._event_query()
        # Person queries use raw SQL for speed (4s vs 30s) — move here when HogQL persons table gets faster
        raise NotImplementedError("Person property values use raw SQL via _calculate_person()")

    def _calculate(self) -> PropertyValuesQueryResponse:
        if self.query.property_type == PropertyType.PERSON:
            return self._calculate_person()
        return self._calculate_event()

    def _calculate_event(self) -> PropertyValuesQueryResponse:
        result = execute_hogql_query(
            self._event_query(),
            team=self.team,
            timings=self.timings,
            modifiers=self.modifiers,
            limit_context=self.limit_context,
        )
        return PropertyValuesQueryResponse(
            results=self._format_event_results(result.results),
            timings=self.timings.to_list(),
            hogql=result.hogql,
            modifiers=self.modifiers,
        )

    def _calculate_person(self) -> PropertyValuesQueryResponse:
        # Use the raw SQL person query — the HogQL persons virtual table does full argMax dedup
        # which is correct but much slower (30s vs 4s on large teams). The raw SQL approximates
        # dedup with uniq(id) - uniqIf(id, is_deleted != 0) and caps at 100k rows, which is
        # fast enough and good enough for autocomplete.
        from posthog.queries.property_values import get_person_property_values_for_key

        rows = cast(
            list, get_person_property_values_for_key(self.query.property_key, self.team, self.query.search_value)
        )
        return PropertyValuesQueryResponse(
            results=self._format_person_results(rows),
            timings=self.timings.to_list(),
            modifiers=self.modifiers,
        )

    def _event_query(self) -> ast.SelectQuery:
        from django.utils import timezone

        key = self.query.property_key
        is_virtual = key.startswith("$virt_")
        chain: list[str | int] = [key] if (self.query.is_column or is_virtual) else ["properties", key]
        field_expr = ast.Field(chain=chain)
        value_expr = self._event_value_expr(field_expr)
        search_value = self._event_search_value()

        date_from = relative_date_parse("-7d", self.team.timezone_info).strftime("%Y-%m-%d 00:00:00")
        date_to = timezone.now().astimezone(self.team.timezone_info).strftime("%Y-%m-%d 23:59:59")

        conditions: list[ast.Expr] = [
            ast.CompareOperation(
                op=ast.CompareOperationOp.GtEq,
                left=ast.Field(chain=["timestamp"]),
                right=ast.Constant(value=date_from),
            ),
            ast.CompareOperation(
                op=ast.CompareOperationOp.LtEq,
                left=ast.Field(chain=["timestamp"]),
                right=ast.Constant(value=date_to),
            ),
            ast.CompareOperation(
                op=ast.CompareOperationOp.NotEq,
                left=field_expr,
                right=ast.Constant(value=None),
            ),
        ]

        if self.query.event_names:
            event_conditions: list[ast.Expr] = [
                ast.CompareOperation(
                    op=ast.CompareOperationOp.Eq,
                    left=ast.Field(chain=["event"]),
                    right=ast.Constant(value=name),
                )
                for name in self.query.event_names
            ]
            conditions.append(ast.Or(exprs=event_conditions) if len(event_conditions) > 1 else event_conditions[0])

        if search_value:
            escaped = search_value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            conditions.append(
                ast.CompareOperation(
                    op=ast.CompareOperationOp.ILike,
                    left=ast.Call(name="toString", args=[value_expr]),
                    right=ast.Constant(value=f"%{escaped}%"),
                )
            )

        order_by: list[ast.OrderExpr] = (
            [
                ast.OrderExpr(
                    expr=ast.Call(name="length", args=[ast.Call(name="toString", args=[value_expr])]),
                    order="ASC",
                )
            ]
            if search_value
            else []
        )

        return ast.SelectQuery(
            select=[value_expr],
            distinct=True,
            select_from=ast.JoinExpr(table=ast.Field(chain=["events"])),
            where=ast.And(exprs=conditions),
            order_by=order_by,
            limit=ast.Constant(value=10),
        )

    def _event_value_expr(self, field_expr: ast.Expr) -> ast.Expr:
        if not self._should_normalize_pageview_current_urls():
            return field_expr

        return ast.Call(
            name="replaceRegexpAll",
            args=[
                ast.Call(name="ifNull", args=[field_expr, ast.Constant(value="")]),
                ast.Constant(value="(.)/$"),
                ast.Constant(value="\\1"),
            ],
        )

    def _event_search_value(self) -> str | None:
        search_value = self.query.search_value
        if (
            search_value
            and self._should_normalize_pageview_current_urls()
            and len(search_value) > 1
            and search_value.endswith("/")
        ):
            return search_value[:-1]
        return search_value

    def _should_normalize_pageview_current_urls(self) -> bool:
        return (
            self.query.property_key == "$current_url"
            and bool(self.query.event_names)
            and all(event_name == "$pageview" for event_name in self.query.event_names)
        )

    def _format_event_results(self, rows: list) -> list[PropertyValueItem]:
        values: list[Any] = []
        for row in rows:
            raw = row[0]
            if isinstance(raw, float | int | bool | uuid.UUID):
                values.append(raw)
            else:
                # ClickHouse strips outer quotes from string values but leaves inner \" escapes,
                # so '["a","b"]' comes back as [\"a\",\"b\"] — unescape before parsing.
                cleaned = raw.replace('\\"', '"') if isinstance(raw, str) else raw
                try:
                    values.append(json.loads(cleaned))
                except (json.JSONDecodeError, TypeError):
                    values.append(cleaned)
        return [PropertyValueItem(name=convert_property_value(v)) for v in flatten(values)]

    def _format_person_results(self, rows: list) -> list[PropertyValueItem]:
        results = []
        for row in rows:
            raw_value, count = row[0], row[1]
            try:
                name = convert_property_value(json.loads(raw_value))
            except (json.JSONDecodeError, TypeError):
                name = convert_property_value(raw_value)
            results.append(PropertyValueItem(name=name, count=int(count)))
        return results
