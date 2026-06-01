from types import SimpleNamespace

import pytest
from posthog.test.base import BaseTest
from unittest.mock import MagicMock, patch

from posthog.schema import ErrorTrackingIssueFilter, PropertyOperator

from posthog.models.property import Property
from posthog.models.property.util import prop_filter_json_extract, property_to_django_filter


@patch("posthog.models.property.util.get_materialized_column_for_property")
def test_icontains_casts_materialized_property_to_string(mock_get_materialized_column_for_property):
    mock_get_materialized_column_for_property.return_value = SimpleNamespace(name="mat_prop", is_nullable=False)

    query, params = prop_filter_json_extract(
        Property(key="score", value="12", operator="icontains", type="person"),
        0,
        prepend="test",
    )

    assert query == ' AND toString("mat_prop") ILIKE %(vtest_0)s'
    assert params == {"ktest_0": "score", "vtest_0": "%12%"}


@patch("posthog.models.property.util.get_materialized_column_for_property")
def test_not_icontains_casts_materialized_property_to_string(mock_get_materialized_column_for_property):
    mock_get_materialized_column_for_property.return_value = SimpleNamespace(name="mat_prop", is_nullable=False)

    query, params = prop_filter_json_extract(
        Property(key="score", value="12", operator="not_icontains", type="person"),
        0,
        prepend="test",
    )

    assert query == ' AND NOT (toString("mat_prop") ILIKE %(vtest_0)s)'
    assert params == {"ktest_0": "score", "vtest_0": "%12%"}


class TestPropertyUtil(BaseTest):
    def test_property_to_django_filtering(self):
        qs = MagicMock()
        qs.filter = MagicMock()
        qs.exclude = MagicMock()

        # does not filter falsey exact matches
        property_to_django_filter(qs, ErrorTrackingIssueFilter(key="name", value=None, operator=PropertyOperator.EXACT))
        qs.filter.assert_not_called()
        property_to_django_filter(qs, ErrorTrackingIssueFilter(key="name", value=[], operator=PropertyOperator.EXACT))
        qs.filter.assert_not_called()

        # array based options
        property_to_django_filter(
            qs, ErrorTrackingIssueFilter(key="name", value=["value"], operator=PropertyOperator.EXACT)
        )
        qs.filter.assert_called_once_with(name__in=["value"])
        qs.filter.reset_mock()

        # default options
        property_to_django_filter(
            qs, ErrorTrackingIssueFilter(key="name", value="value", operator=PropertyOperator.ICONTAINS)
        )
        qs.filter.assert_called_once_with(name__icontains="value")
        qs.filter.reset_mock()

        # negated filtering
        property_to_django_filter(
            qs, ErrorTrackingIssueFilter(key="name", value=["value"], operator=PropertyOperator.IS_NOT)
        )
        qs.exclude.assert_called_once_with(name__in=["value"])

    def test_issue_description_mapping(self):
        qs = MagicMock()
        qs.filter = MagicMock()

        property_to_django_filter(
            qs,
            ErrorTrackingIssueFilter(key="issue_description", value=["description"], operator=PropertyOperator.EXACT),
        )
        qs.filter.assert_called_once_with(description__in=["description"])
        qs.filter.reset_mock()

    def test_rejects_orm_traversal_keys(self):
        qs = MagicMock()

        with pytest.raises(ValueError, match="Unsupported error tracking filter key"):
            property_to_django_filter(
                qs,
                ErrorTrackingIssueFilter(
                    key="assignment__user__password", value="x", operator=PropertyOperator.ICONTAINS
                ),
            )

        with pytest.raises(ValueError, match="Unsupported error tracking filter key"):
            property_to_django_filter(
                qs,
                ErrorTrackingIssueFilter(key="team__api_token", value="x", operator=PropertyOperator.ICONTAINS),
            )

        qs.filter.assert_not_called()

    def test_unimplemented_filter_types_raise(self):
        qs = MagicMock()

        with pytest.raises(NotImplementedError):
            property_to_django_filter(
                qs,
                ErrorTrackingIssueFilter(
                    key="issue_description", value=["description"], operator=PropertyOperator.BETWEEN
                ),
            )
