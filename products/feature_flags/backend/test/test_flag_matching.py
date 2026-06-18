from unittest.mock import MagicMock, PropertyMock, patch

from django.test import SimpleTestCase

from parameterized import parameterized

from products.feature_flags.backend.flag_matching import FeatureFlagMatcher, FeatureFlagMatchReason


def _make_matcher(query_conditions: dict[str, bool]) -> FeatureFlagMatcher:
    matcher = FeatureFlagMatcher(
        team_id=1,
        project_id=1,
        feature_flags=[],
        distinct_id="test",
    )
    return matcher


def _make_flag(pk: int = 42, key: str = "test-flag") -> MagicMock:
    flag = MagicMock()
    flag.pk = pk
    flag.key = key
    flag.conditions = []
    flag.variants = []
    flag.filters = {}
    flag.has_feature_enrollment = False
    flag.aggregation_group_type_index = None
    return flag


class TestIsFeatureEnrollmentMatch(SimpleTestCase):
    @parameterized.expand(
        [
            (
                "enrollment_is_set_true_and_matches",
                {"flag_42_enrollment_is_set": True, "flag_42_enrollment": True},
                (True, True, FeatureFlagMatchReason.SUPER_CONDITION_VALUE),
            ),
            (
                "enrollment_is_set_true_but_not_matching",
                {"flag_42_enrollment_is_set": True, "flag_42_enrollment": False},
                (True, False, FeatureFlagMatchReason.SUPER_CONDITION_VALUE),
            ),
            (
                "enrollment_is_set_false",
                {"flag_42_enrollment_is_set": False, "flag_42_enrollment": False},
                (False, False, FeatureFlagMatchReason.NO_CONDITION_MATCH),
            ),
            (
                "enrollment_query_missing",
                {},
                (False, False, FeatureFlagMatchReason.NO_CONDITION_MATCH),
            ),
        ],
    )
    def test_is_feature_enrollment_match(
        self,
        _name: str,
        query_conditions: dict[str, bool],
        expected: tuple[bool, bool, FeatureFlagMatchReason],
    ):
        matcher = _make_matcher(query_conditions)
        flag = _make_flag()
        with patch.object(type(matcher), "query_conditions", new_callable=PropertyMock, return_value=query_conditions):
            result = matcher.is_feature_enrollment_match(flag)
        assert result == expected


class TestGetMatch(SimpleTestCase):
    def test_stops_at_first_condition_that_matches_properties_but_fails_rollout(self):
        matcher = _make_matcher({})
        flag = _make_flag()
        flag.conditions = [
            {"properties": [], "rollout_percentage": 0},
            {"properties": [], "rollout_percentage": 100},
        ]

        with patch.object(matcher, "get_hash", return_value=0.5):
            result = matcher.get_match(flag)

        assert result.match is False
        assert result.reason == FeatureFlagMatchReason.OUT_OF_ROLLOUT_BOUND
        assert result.condition_index == 0
