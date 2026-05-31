from unittest import TestCase

from posthog.hogql.constants import BREAKDOWN_VALUES_LIMIT_MAX

from posthog.models import Filter


class TestBreakdownLimit(TestCase):
    def test_breakdown_limit_is_capped(self) -> None:
        insight_filter = Filter(data={"breakdown": "username", "breakdown_limit": BREAKDOWN_VALUES_LIMIT_MAX + 1})

        self.assertEqual(insight_filter.breakdown_limit_or_default, BREAKDOWN_VALUES_LIMIT_MAX)
        self.assertEqual(insight_filter.to_dict()["breakdown_limit"], BREAKDOWN_VALUES_LIMIT_MAX)
