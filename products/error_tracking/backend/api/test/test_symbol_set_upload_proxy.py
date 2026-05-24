from unittest.mock import patch

from django.core import signing
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, SimpleTestCase

from rest_framework import status
from rest_framework.test import APIRequestFactory

from products.error_tracking.backend.api.symbol_sets import (
    SYMBOL_SET_UPLOAD_PROXY_TOKEN_SALT,
    maybe_proxy_symbol_set_upload,
    proxy_symbol_set_upload,
)


class TestSymbolSetUploadProxy(SimpleTestCase):
    def test_private_uploads_are_rewritten_to_instance_proxy(self) -> None:
        request = RequestFactory().post("/api/environments/1/error_tracking/symbol_sets/bulk_start_upload/")

        proxied_upload = maybe_proxy_symbol_set_upload(
            request,
            {
                "url": "http://objectstorage:19000/posthog",
                "fields": {
                    "key": "symbolsets/test-key",
                    "policy": "presigned-policy",
                },
            },
        )

        assert proxied_upload["url"].startswith(
            "http://testserver/api/environments/1/error_tracking/symbol_sets/proxy_upload/?token="
        )
        assert proxied_upload["fields"] == {"key": "symbolsets/test-key"}

    @patch("products.error_tracking.backend.api.symbol_sets.object_storage.write_stream")
    def test_proxy_upload_writes_file_for_valid_signed_token(self, mock_write_stream) -> None:
        token = signing.dumps({"key": "symbolsets/test-key"}, salt=SYMBOL_SET_UPLOAD_PROXY_TOKEN_SALT)
        request = APIRequestFactory().post(
            f"/api/environments/1/error_tracking/symbol_sets/proxy_upload/?token={token}",
            data={
                "key": "symbolsets/test-key",
                "file": SimpleUploadedFile("chunk.js.map", b"source-map-bytes"),
            },
            format="multipart",
        )

        response = proxy_symbol_set_upload(request, team_id=1)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        mock_write_stream.assert_called_once()
        assert mock_write_stream.call_args.args[0] == "symbolsets/test-key"
        assert mock_write_stream.call_args.args[1].read() == b"source-map-bytes"

    def test_proxy_upload_rejects_invalid_token(self) -> None:
        request = APIRequestFactory().post(
            "/api/environments/1/error_tracking/symbol_sets/proxy_upload/?token=bad-token",
            data={
                "key": "symbolsets/test-key",
                "file": SimpleUploadedFile("chunk.js.map", b"source-map-bytes"),
            },
            format="multipart",
        )

        response = proxy_symbol_set_upload(request, team_id=1)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data == {"detail": "Invalid or expired upload token."}
