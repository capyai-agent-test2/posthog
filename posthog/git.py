import os
import subprocess
from pathlib import Path
from typing import Optional

_git_commit_baked_in: Optional[str] = None


def _read_commit_file() -> Optional[str]:
    # Docker containers should have a commit.txt file in the base directory with the git
    # commit hash used to generate them.
    for path in (Path("commit.txt"), Path("/code/commit.txt")):
        try:
            commit = path.read_text().strip()
        except FileNotFoundError:
            continue
        if commit:
            return commit
    return None


_git_commit_baked_in = _read_commit_file()


def get_git_commit_short() -> Optional[str]:
    """Return the short hash of the last commit.

    Example: get_git_commit_short() => "86a3c3b529"
    """
    if _git_commit_baked_in:
        return _git_commit_baked_in[:10]  # 10 characters is almost guaranteed to identify a commit uniquely

    for environment_variable in ("COMMIT_HASH", "GITHUB_SHA"):
        commit = os.environ.get(environment_variable)
        if commit:
            return commit[:10]

    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"]).decode("utf-8").strip()
    except Exception:
        return None


def get_git_branch() -> Optional[str]:
    """Returns the symbolic name of the current active branch. Will return None in case of failure.

    Example: get_git_branch() => "master"
    """

    try:
        return (
            subprocess.check_output(["git", "rev-parse", "--symbolic-full-name", "--abbrev-ref", "HEAD"])
            .decode("utf-8")
            .strip()
        )
    except Exception:
        return None
