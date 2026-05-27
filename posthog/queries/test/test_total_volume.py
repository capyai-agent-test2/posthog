from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from posthog.models.entity import Entity
from posthog.models.filters import Filter
from posthog.models.team import Team
from posthog.queries.trends.total_volume import TrendsTotalVolume


class TestTrendsTotalVolume(SimpleTestCase):
    @patch("posthog.models.team.team.get_instance_setting", return_value=False)
    @patch("posthog.queries.trends.total_volume.TrendsEventQuery")
    @patch("posthog.queries.trends.total_volume.process_math")
    def test_smoothing_query_preserves_fractional_counts(
        self, mock_process_math, mock_trends_event_query, _mock_get_instance_setting
    ):
        mock_process_math.return_value = ("count()", "", {})

        mock_query = MagicMock()
        mock_query.get_query_base.return_value = ("FROM events e WHERE team_id = %(team_id)s", {})
        mock_query.active_user_params = {}
        mock_trends_event_query.return_value = mock_query

        entity = Entity({"id": "$pageview", "name": "$pageview", "type": "events", "math": "total"})
        filter = Filter(
            data={
                "events": [{"id": "$pageview", "type": "events", "math": "total"}],
                "interval": "day",
                "display": "ActionsLineGraph",
                "smoothing_intervals": 7,
            }
        )
        team = Team(timezone="UTC")

        query, _params, _parse = TrendsTotalVolume()._total_volume_query(entity, filter, team)

        assert "AVG(SUM(total))" in query
        assert "groupArray(count) AS total" in query
        assert "groupArray(floor(count))" not in query
