from unittest.mock import patch

from django.test import SimpleTestCase

from posthog.hogql.hogql import HogQLContext
from posthog.queries.breakdown_props import _to_bucketing_expression, _to_value_expression
from posthog.queries.trends.sql import HISTOGRAM_ELEMENTS_ARRAY_OF_KEY_SQL, TOP_ELEMENTS_ARRAY_OF_KEY_SQL


class TestBreakdownProps(SimpleTestCase):
    @patch("posthog.models.property.util.get_materialized_column_for_property", return_value=None)
    def test_event_property_named_value_uses_non_conflicting_alias(self, _mock_get_materialized_column):
        expression, params = _to_value_expression(
            breakdown_type=None,
            breakdown="value",
            breakdown_group_type_index=None,
            hogql_context=HogQLContext(),
        )

        self.assertEqual(params, {"breakdown_param_1": "value"})
        self.assertTrue(expression.endswith(" AS breakdown_value"))
        self.assertNotIn(" AS value", expression)

    def test_breakdown_value_alias_is_used_consistently_in_templates(self):
        self.assertIn("GROUP BY breakdown_value", TOP_ELEMENTS_ARRAY_OF_KEY_SQL)
        self.assertIn("ORDER BY count DESC, breakdown_value DESC", TOP_ELEMENTS_ARRAY_OF_KEY_SQL)
        self.assertIn("GROUP BY breakdown_value", HISTOGRAM_ELEMENTS_ARRAY_OF_KEY_SQL)
        self.assertIn("quantiles(0,1)(breakdown_value)", _to_bucketing_expression(1))
