from django.test import SimpleTestCase

from posthog.queries.person_distinct_id_query import get_team_distinct_ids_query


class TestPersonDistinctIdQuery(SimpleTestCase):
    def test_relevant_events_filter_uses_global_in(self) -> None:
        query = get_team_distinct_ids_query(1, relevant_events_conditions="AND event = %(event)s")

        self.assertIn(
            "distinct_id GLOBAL IN (SELECT distinct_id FROM events WHERE team_id = %(team_id)s AND event = %(event)s)",
            " ".join(query.split()),
        )

    def test_omits_relevant_events_filter_when_conditions_are_empty(self) -> None:
        query = get_team_distinct_ids_query(1)

        self.assertNotIn("GLOBAL IN", query)
