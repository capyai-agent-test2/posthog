from collections.abc import Callable

from parameterized import parameterized

from posthog.schema import (
    EventsNode,
    ExperimentDataWarehouseNode,
    ExperimentFunnelMetric,
    ExperimentMeanMetric,
    ExperimentMetricMathType,
    ExperimentRatioMetric,
    ExperimentRetentionMetric,
    FunnelConversionWindowTimeUnit,
    StartHandling,
)

from posthog.hogql_queries.experiments.experiment_query_builder import metric_uses_data_warehouse

ExperimentMetric = ExperimentMeanMetric | ExperimentFunnelMetric | ExperimentRatioMetric | ExperimentRetentionMetric
MetricFactory = Callable[["TestDataWarehouseTestAccountFilter"], ExperimentMetric]


class TestDataWarehouseTestAccountFilter:
    def _data_warehouse_node(self) -> ExperimentDataWarehouseNode:
        return ExperimentDataWarehouseNode(
            table_name="external_usage",
            events_join_key="properties.$user_id",
            data_warehouse_join_key="user_id",
            timestamp_field="created_at",
            math=ExperimentMetricMathType.TOTAL,
        )

    @parameterized.expand(
        [
            [
                "mean",
                lambda self: ExperimentMeanMetric(source=self._data_warehouse_node()),
            ],
            [
                "funnel",
                lambda self: ExperimentFunnelMetric(
                    series=[EventsNode(event="$pageview"), self._data_warehouse_node()]
                ),
            ],
            [
                "ratio",
                lambda self: ExperimentRatioMetric(
                    numerator=EventsNode(event="$pageview"),
                    denominator=self._data_warehouse_node(),
                ),
            ],
            [
                "retention",
                lambda self: ExperimentRetentionMetric(
                    start_event=EventsNode(event="$pageview"),
                    completion_event=self._data_warehouse_node(),
                    retention_window_end=1,
                    retention_window_start=0,
                    retention_window_unit=FunnelConversionWindowTimeUnit.DAY,
                    start_handling=StartHandling.FIRST_SEEN,
                ),
            ],
        ]
    )
    def test_metric_uses_data_warehouse(self, _name: str, build_metric: MetricFactory) -> None:
        assert metric_uses_data_warehouse(build_metric(self))

    def test_metric_without_data_warehouse_does_not_use_data_warehouse(self) -> None:
        assert not metric_uses_data_warehouse(ExperimentMeanMetric(source=EventsNode(event="$pageview")))
