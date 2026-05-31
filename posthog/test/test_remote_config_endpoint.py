from unittest.mock import Mock, patch

from django.test import SimpleTestCase


class TestRemoteConfigEndpoint(SimpleTestCase):
    def test_config_endpoint_returns_cached_remote_config(self) -> None:
        hypercache = Mock()
        hypercache.get_from_cache.return_value = {
            "token": "phc_12345",
            "siteAppsJS": ["function() {}"],
            "sessionRecording": {"endpoint": "/s/", "domains": ["https://example.com"]},
        }

        with patch("posthog.remote_config.RemoteConfig.get_hypercache", return_value=hypercache):
            response = self.client.get("/array/phc_12345/config", headers={"origin": "https://example.com"})

        assert response.status_code == 200
        assert response.headers["Cache-Control"] == "public, max-age=300"
        assert response.json() == {"token": "phc_12345", "sessionRecording": {"endpoint": "/s/"}}

    def test_config_js_endpoint_returns_js_wrapper(self) -> None:
        hypercache = Mock()
        hypercache.get_from_cache.return_value = {
            "token": "phc_12345",
            "siteApps": [{"id": "legacy"}],
            "siteAppsJS": ["function() { return 1; }"],
            "sessionRecording": {"endpoint": "/s/", "domains": ["https://example.com"]},
        }

        with patch("posthog.remote_config.RemoteConfig.get_hypercache", return_value=hypercache):
            response = self.client.get("/array/phc_12345/config.js", headers={"origin": "https://example.com"})

        assert response.status_code == 200
        assert response.headers["Content-Type"] == "application/javascript"
        content = response.content.decode("utf-8")
        assert "window._POSTHOG_REMOTE_CONFIG['phc_12345']" in content
        assert '"token":"phc_12345"' in content
        assert "function() { return 1; }" in content
        assert "siteAppsJS" not in content
        assert '"siteApps"' not in content

    def test_config_endpoint_returns_404_for_unknown_token(self) -> None:
        hypercache = Mock()
        hypercache.get_from_cache.return_value = None

        with patch("posthog.remote_config.RemoteConfig.get_hypercache", return_value=hypercache):
            response = self.client.get("/array/phc_unknown/config")

        assert response.status_code == 404
