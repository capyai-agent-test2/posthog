from __future__ import annotations


def hogql_functions() -> list[str]:
    """Return sorted list of all public HogQL function names.

    Excludes underscore-prefixed internals, UDFs, *If combinator variants
    (e.g. countIf, sumIf) where the base function also exists, and a small set
    of known-invalid ClickHouse aliases that PostHog AI should not suggest.
    """
    from posthog.hogql.functions.aggregations import HOGQL_AGGREGATIONS
    from posthog.hogql.functions.mapping import HOGQL_CLICKHOUSE_FUNCTIONS
    from posthog.hogql.functions.udfs import UDFS

    excluded_aliases = {
        "cardinality",
        "lag",
        "lead",
        "split",
        "toDateTime64",
        "toFloat64",
        "toFloat64OrNull",
    }

    all_names: set[str] = set()
    for name in HOGQL_CLICKHOUSE_FUNCTIONS:
        if not name.startswith("_") and name not in UDFS and name not in excluded_aliases:
            all_names.add(name)
    for name in HOGQL_AGGREGATIONS:
        if not name.startswith("_") and name not in excluded_aliases:
            all_names.add(name)

    def _is_if_combinator(name: str) -> bool:
        return name.endswith("If") and name[:-2] in all_names

    return sorted((n for n in all_names if not _is_if_combinator(n)), key=str.lower)
