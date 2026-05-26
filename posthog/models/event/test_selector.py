import re

from posthog.models.event.event import Selector
from posthog.models.property.util import build_selector_regex


def test_selector_with_data_attribute_only() -> None:
    selector = Selector('[data-attr="save-button"]', escape_slashes=False)

    assert selector.parts[0].data == {"attributes__attr__data-attr": "save-button"}
    assert re.search(build_selector_regex(selector), 'button:data-attr="save-button"')


def test_selector_with_class_and_data_attribute() -> None:
    selector = Selector('button.foo[data-attr="save-button"]', escape_slashes=False)

    assert selector.parts[0].data == {
        "attributes__attr__data-attr": "save-button",
        "attr_class__contains": ["foo"],
        "tag_name": "button",
    }
    assert re.search(build_selector_regex(selector), 'button.foo:data-attr="save-button"')


def test_selector_with_multiple_attributes() -> None:
    selector = Selector('[data-attr="save-button"][href="/save"]', escape_slashes=False)

    assert selector.parts[0].data == {
        "attributes__attr__data-attr": "save-button",
        "attributes__attr__href": "/save",
    }
    assert re.search(build_selector_regex(selector), 'a:data-attr="save-button"href="/save"')


def test_selector_with_unquoted_data_attribute_value() -> None:
    selector = Selector("[data-attr=save-button]", escape_slashes=False)

    assert selector.parts[0].data == {"attributes__attr__data-attr": "save-button"}
    assert re.search(build_selector_regex(selector), 'button:data-attr="save-button"')
