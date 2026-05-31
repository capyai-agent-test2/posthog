from posthog.settings.web import static_varies_origin


def test_static_headers_allow_cross_origin_loading() -> None:
    headers: dict[str, str] = {}

    static_varies_origin(headers, "/home/posthog/frontend/dist/array.js", "/static/array.js")

    assert headers["Access-Control-Allow-Origin"] == "*"
    assert headers["Vary"] == "Accept-Encoding, Origin"
