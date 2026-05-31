import re
import copy
import json

from django.http import HttpRequest, HttpResponse, JsonResponse

from posthog.api.utils import on_permitted_recording_domain
from posthog.models.remote_config import RemoteConfig

TOKEN_REGEX = re.compile(r"^[a-zA-Z0-9_-]+$")


def _config_cache_headers() -> dict[str, str]:
    return {"Cache-Control": "public, max-age=300", "Vary": "Origin, Referer"}


def _validate_token(token: str) -> HttpResponse | None:
    if not token:
        return HttpResponse("empty token", status=401)
    if len(token) > 200 or not TOKEN_REGEX.match(token):
        return HttpResponse("invalid token", status=400)
    return None


def _get_config(token: str) -> dict | None:
    config = RemoteConfig.get_hypercache().get_from_cache(token)
    if config is None:
        return None
    return copy.deepcopy(config)


def _sanitize_config_for_client(config: dict, request: HttpRequest) -> None:
    config.pop("siteAppsJS", None)

    session_recording = config.get("sessionRecording")
    if not isinstance(session_recording, dict):
        return

    domains = session_recording.pop("domains", None)
    if isinstance(domains, list) and domains and not on_permitted_recording_domain(domains, request):
        config["sessionRecording"] = False


def config_endpoint(request: HttpRequest, token: str) -> HttpResponse:
    if request.method == "OPTIONS":
        return HttpResponse(status=204, headers={"Allow": "GET, OPTIONS, HEAD"})
    if request.method not in ("GET", "HEAD"):
        return HttpResponse(status=405, headers={"Allow": "GET, OPTIONS, HEAD"})

    invalid_response = _validate_token(token)
    if invalid_response is not None:
        return invalid_response

    config = _get_config(token)
    if config is None:
        return HttpResponse(status=404)

    _sanitize_config_for_client(config, request)
    return JsonResponse(config, headers=_config_cache_headers())


def config_js_endpoint(request: HttpRequest, token: str) -> HttpResponse:
    if request.method == "OPTIONS":
        return HttpResponse(status=204, headers={"Allow": "GET, OPTIONS, HEAD"})
    if request.method not in ("GET", "HEAD"):
        return HttpResponse(status=405, headers={"Allow": "GET, OPTIONS, HEAD"})

    invalid_response = _validate_token(token)
    if invalid_response is not None:
        return invalid_response

    config = _get_config(token)
    if config is None:
        return HttpResponse(status=404)

    site_apps_js = config.pop("siteAppsJS", [])
    if not isinstance(site_apps_js, list):
        site_apps_js = []
    site_apps_js = [site_app_js for site_app_js in site_apps_js if isinstance(site_app_js, str)]

    config.pop("siteApps", None)
    _sanitize_config_for_client(config, request)

    js_content = (
        "(function() {\n"
        "  window._POSTHOG_REMOTE_CONFIG = window._POSTHOG_REMOTE_CONFIG || {};\n"
        f"  window._POSTHOG_REMOTE_CONFIG['{token}'] = {{\n"
        f"    config: {json.dumps(config, separators=(',', ':'))},\n"
        f"    siteApps: [{','.join(site_apps_js)}]\n"
        "  }\n"
        "}());"
    )
    return HttpResponse(
        js_content,
        content_type="application/javascript",
        headers=_config_cache_headers(),
    )
