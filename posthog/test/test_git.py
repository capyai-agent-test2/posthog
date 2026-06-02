from unittest.mock import patch

from posthog.git import get_git_commit_short


def test_get_git_commit_short_uses_commit_hash_environment_variable() -> None:
    with patch("posthog.git._git_commit_baked_in", None), patch.dict(
        "os.environ", {"COMMIT_HASH": "1234567890abcdef"}, clear=True
    ):
        assert get_git_commit_short() == "1234567890"


def test_get_git_commit_short_uses_github_sha_environment_variable() -> None:
    with patch("posthog.git._git_commit_baked_in", None), patch.dict(
        "os.environ", {"GITHUB_SHA": "abcdef1234567890"}, clear=True
    ):
        assert get_git_commit_short() == "abcdef1234"
