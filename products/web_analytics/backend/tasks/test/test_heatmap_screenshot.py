import ipaddress

from posthog.test.base import APIBaseTest
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from products.web_analytics.backend.models import HeatmapSnapshot, SavedHeatmap
from products.web_analytics.backend.tasks.heatmap_screenshot import (
    _block_internal_requests,
    generate_heatmap_screenshot,
    validate_heatmap_screenshot_url,
)


class TestHeatmapScreenshotSecurity(SimpleTestCase):
    @override_settings(CLOUD_DEPLOYMENT=None)
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed")
    def test_self_hosted_skips_ssrf_url_validation(self, mock_is_url_allowed: MagicMock) -> None:
        assert validate_heatmap_screenshot_url("http://localhost:3000") == (True, None)
        mock_is_url_allowed.assert_not_called()

    @override_settings(CLOUD_DEPLOYMENT="US")
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed", return_value=(False, "blocked"))
    def test_cloud_keeps_ssrf_url_validation(self, mock_is_url_allowed: MagicMock) -> None:
        assert validate_heatmap_screenshot_url("http://localhost:3000") == (False, "blocked")
        mock_is_url_allowed.assert_called_once_with("http://localhost:3000")

    @override_settings(CLOUD_DEPLOYMENT=None)
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed")
    def test_self_hosted_still_blocks_metadata_hosts(self, mock_is_url_allowed: MagicMock) -> None:
        assert validate_heatmap_screenshot_url("http://169.254.169.254/latest/meta-data") == (
            False,
            "Local/metadata host",
        )
        mock_is_url_allowed.assert_not_called()

    @override_settings(CLOUD_DEPLOYMENT=None)
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed")
    def test_self_hosted_still_blocks_metadata_hosts_with_trailing_dot(self, mock_is_url_allowed: MagicMock) -> None:
        assert validate_heatmap_screenshot_url("http://169.254.169.254./latest/meta-data") == (
            False,
            "Local/metadata host",
        )
        mock_is_url_allowed.assert_not_called()

    @override_settings(CLOUD_DEPLOYMENT=None)
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed")
    def test_self_hosted_still_blocks_non_http_schemes(self, mock_is_url_allowed: MagicMock) -> None:
        assert validate_heatmap_screenshot_url("file:///etc/passwd") == (False, "Disallowed scheme")
        mock_is_url_allowed.assert_not_called()

    @override_settings(CLOUD_DEPLOYMENT=None)
    @patch(
        "products.web_analytics.backend.tasks.heatmap_screenshot.resolve_host_ips",
        return_value={ipaddress.ip_address("169.254.169.254")},
    )
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed")
    def test_self_hosted_blocks_metadata_host_aliases(
        self, mock_is_url_allowed: MagicMock, _mock_resolve_host_ips: MagicMock
    ) -> None:
        assert validate_heatmap_screenshot_url("http://metadata-alias.internal/latest/meta-data") == (
            False,
            "Local/metadata host",
        )
        mock_is_url_allowed.assert_not_called()

    @override_settings(CLOUD_DEPLOYMENT=None)
    def test_self_hosted_skips_runtime_request_blocking(self) -> None:
        page = MagicMock()

        _block_internal_requests(page)

        page.route.assert_called_once()

    @override_settings(CLOUD_DEPLOYMENT="US")
    def test_cloud_keeps_runtime_request_blocking(self) -> None:
        page = MagicMock()

        _block_internal_requests(page)

        page.route.assert_called_once()

    @override_settings(CLOUD_DEPLOYMENT=None)
    def test_self_hosted_runtime_request_blocking_blocks_metadata_hosts(self) -> None:
        page = MagicMock()

        _block_internal_requests(page)

        route_handler = page.route.call_args.args[1]
        blocked_route = MagicMock()
        blocked_route.request.url = "http://169.254.169.254/latest/meta-data"

        route_handler(blocked_route)

        blocked_route.abort.assert_called_once()
        blocked_route.continue_.assert_not_called()

    @override_settings(CLOUD_DEPLOYMENT=None)
    def test_self_hosted_runtime_request_blocking_allows_localhost(self) -> None:
        page = MagicMock()

        _block_internal_requests(page)

        route_handler = page.route.call_args.args[1]
        allowed_route = MagicMock()
        allowed_route.request.url = "http://localhost:3000/static/app.js"

        route_handler(allowed_route)

        allowed_route.continue_.assert_called_once()
        allowed_route.abort.assert_not_called()

    @override_settings(CLOUD_DEPLOYMENT=None)
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot._generate_screenshots")
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed")
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.SavedHeatmap")
    def test_self_hosted_generates_internal_target_screenshots(
        self,
        mock_saved_heatmap: MagicMock,
        mock_is_url_allowed: MagicMock,
        mock_generate_screenshots: MagicMock,
    ) -> None:
        screenshot = MagicMock(
            id="test-id",
            team_id=1,
            url="http://localhost:3000",
            status=SavedHeatmap.Status.PROCESSING,
        )
        mock_saved_heatmap.objects.select_related.return_value.get.return_value = screenshot

        generate_heatmap_screenshot("test-id")

        mock_is_url_allowed.assert_not_called()
        mock_generate_screenshots.assert_called_once_with(screenshot)
        assert screenshot.status == mock_saved_heatmap.Status.COMPLETED
        screenshot.save.assert_called()

    @override_settings(CLOUD_DEPLOYMENT="US")
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot._generate_screenshots")
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed", return_value=(False, "blocked"))
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.SavedHeatmap")
    def test_cloud_still_blocks_internal_target_screenshots(
        self,
        mock_saved_heatmap: MagicMock,
        mock_is_url_allowed: MagicMock,
        mock_generate_screenshots: MagicMock,
    ) -> None:
        screenshot = MagicMock(
            id="test-id",
            team_id=1,
            url="http://localhost:3000",
            status=SavedHeatmap.Status.PROCESSING,
        )
        mock_saved_heatmap.objects.select_related.return_value.get.return_value = screenshot

        generate_heatmap_screenshot("test-id")

        mock_is_url_allowed.assert_called_once_with("http://localhost:3000")
        mock_generate_screenshots.assert_not_called()
        assert screenshot.status == mock_saved_heatmap.Status.FAILED
        assert screenshot.exception == "SSRF blocked: blocked"
        screenshot.save.assert_called_once()


class TestHeatmapScreenshotTask(APIBaseTest):
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.sync_playwright")
    def test_generates_multiple_width_snapshots_and_marks_completed(self, mock_sync_playwright: MagicMock) -> None:
        # Arrange Playwright mocks
        mock_p = MagicMock()
        mock_browser = MagicMock()
        mock_context = MagicMock()
        mock_page = MagicMock()

        # playwright context manager
        mock_sync_playwright.return_value.__enter__.return_value = mock_p
        mock_p.chromium.launch.return_value = mock_browser
        # context -> page
        mock_browser.new_context.return_value = mock_context
        mock_context.new_page.return_value = mock_page

        # mock page behavior
        mock_page.evaluate.return_value = 1200  # total page height
        # Return different bytes per screenshot call to verify width mapping
        mock_page.screenshot.side_effect = [b"jpeg320", b"jpeg768", b"jpeg1024"]

        heatmap = SavedHeatmap.objects.create(
            team=self.team,
            url="https://example.com",
            created_by=self.user,
            target_widths=[320, 768, 1024],
            status=SavedHeatmap.Status.PROCESSING,
        )

        # Act
        generate_heatmap_screenshot(heatmap.id)

        # Assert status and snapshots
        heatmap.refresh_from_db()
        assert heatmap.status == SavedHeatmap.Status.COMPLETED

        snaps = list(HeatmapSnapshot.objects.filter(heatmap=heatmap).order_by("width"))
        assert [s.width for s in snaps] == [320, 768, 1024]
        assert snaps[0].content == b"jpeg320"
        assert snaps[1].content == b"jpeg768"
        assert snaps[2].content == b"jpeg1024"

        # Ensure we cleaned up the browser
        mock_browser.close.assert_called_once()

    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.sync_playwright")
    def test_failure_marks_failed_and_records_exception(self, mock_sync_playwright: MagicMock) -> None:
        # Arrange: make playwright crash when entering context
        mock_sync_playwright.return_value.__enter__.side_effect = RuntimeError("boom")

        heatmap = SavedHeatmap.objects.create(
            team=self.team,
            url="https://example.com",
            created_by=self.user,
            target_widths=[320],
            status=SavedHeatmap.Status.PROCESSING,
        )

        # Act
        try:
            generate_heatmap_screenshot(heatmap.id)
        except RuntimeError:
            pass

        # Assert
        heatmap.refresh_from_db()
        assert heatmap.status == SavedHeatmap.Status.FAILED
        assert "boom" in (heatmap.exception or "")

    @override_settings(CLOUD_DEPLOYMENT="US")
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.is_url_allowed", return_value=(False, "blocked"))
    @patch("products.web_analytics.backend.tasks.heatmap_screenshot.sync_playwright")
    def test_cloud_blocks_internal_targets(
        self, mock_sync_playwright: MagicMock, mock_is_url_allowed: MagicMock
    ) -> None:
        heatmap = SavedHeatmap.objects.create(
            team=self.team,
            url="http://localhost:3000",
            created_by=self.user,
            target_widths=[1024],
            status=SavedHeatmap.Status.PROCESSING,
        )

        generate_heatmap_screenshot(heatmap.id)

        heatmap.refresh_from_db()
        assert heatmap.status == SavedHeatmap.Status.FAILED
        assert heatmap.exception == "SSRF blocked: blocked"
        mock_is_url_allowed.assert_called_once_with("http://localhost:3000")
        mock_sync_playwright.assert_not_called()
