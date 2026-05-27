from pathlib import Path

from django.test import SimpleTestCase


class TestIndexTemplateTheme(SimpleTestCase):
    def template_source(self) -> str:
        return (Path(__file__).resolve().parents[2] / "frontend" / "src" / "index.html").read_text()

    def test_dark_theme_is_applied_to_body_before_app_mount(self):
        rendered = self.template_source()

        assert (
            "<body{% if initial_theme_mode and initial_theme_mode != 'system' %} theme=\"{{ initial_theme_mode }}\"{% endif %}>"
            in rendered
        )

    def test_system_theme_resolves_before_app_mount(self):
        rendered = self.template_source()

        assert "{% if initial_theme_mode == 'system' %}" in rendered
        assert "document.body.setAttribute(" in rendered
        assert "prefers-color-scheme: dark" in rendered
