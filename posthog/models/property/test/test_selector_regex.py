import re

from posthog.models.event.event import Selector
from posthog.models.property.util import build_selector_regex


def test_build_selector_regex_allows_skipped_ancestors_for_descendant_selectors():
    selector = Selector(".main-column .tabs li a", escape_slashes=False)
    regex = build_selector_regex(selector)
    elements_chain = (
        'a:text="Docs";'
        'span.icon:attr__class="icon";'
        'li:attr__data-id="nav-docs";'
        'ul.tabs:attr__class="tabs";'
        'div.wrapper:attr__class="wrapper";'
        'div.main-column:attr__class="main-column"'
    )

    assert regex
    assert selector.parts[1].direct_descendant is False
    assert re.search(regex, elements_chain) is not None


def test_build_selector_regex_keeps_direct_descendants_strict():
    selector = Selector(".main-column > .tabs > li > a", escape_slashes=False)
    regex = build_selector_regex(selector)
    elements_chain = (
        'a:text="Docs";'
        'span.icon:attr__class="icon";'
        'li:attr__data-id="nav-docs";'
        'ul.tabs:attr__class="tabs";'
        'div.wrapper:attr__class="wrapper";'
        'div.main-column:attr__class="main-column"'
    )

    assert regex
    assert selector.parts[1].direct_descendant is True
    assert re.search(regex, elements_chain) is None
