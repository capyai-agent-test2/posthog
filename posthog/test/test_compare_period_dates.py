from datetime import datetime

from django.test import SimpleTestCase

from posthog.utils import get_compare_period_dates


class TestComparePeriodDates(SimpleTestCase):
    def test_week_based_relative_compare_range_does_not_overlap_current_period(self) -> None:
        assert get_compare_period_dates(
            date_from=datetime(2020, 1, 28, 0, 0),
            date_to=datetime(2020, 2, 4, 23, 59, 59, 999999),
            date_from_delta_mapping={"days": 7},
            date_to_delta_mapping=None,
            interval="day",
        ) == (datetime(2020, 1, 21, 0, 0), datetime(2020, 1, 27, 23, 59, 59, 999999))
