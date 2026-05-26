## Problem

Replay comments were inconsistent across two code paths.
The recordings filter only searched legacy `recording`-scoped comments, so newer `Replay` comments were missed.
Separately, editing a replay comment from the player overlay dropped the original timestamp payload and could move the comment instead of updating it in place.

## Changes

- include both `recording` and `Replay` scopes when resolving recording IDs from comment filters
- preserve the existing replay comment timestamp fields when opening the edit overlay
- extend the recording comment filter fixture to cover a `Replay`-scoped comment
- add a focused frontend regression test for replay comment edits

## How did you test this code?

Agent-authored.

- `TEST=1 uv run python -m py_compile posthog/session_recordings/session_recording_api.py posthog/session_recordings/test/test_session_recordings_comment_filters.py`
- `node` smoke check against `frontend/src/scenes/session-recordings/player/commenting/playerFrameCommentOverlayLogic.ts` to confirm the edit handler now copies `timeInRecording`, `timestampInRecording`, and `dateForTimestamp`

Attempted but blocked in this VM:

- `./bin/hogli test posthog/session_recordings/test/test_session_recordings_comment_filters.py` failed because Postgres is not running locally
- `pnpm exec jest src/scenes/session-recordings/player/commenting/playerFrameCommentOverlayLogic.test.ts --runInBand` failed in the existing frontend test environment because Jest could not resolve `@posthog/quill`

## Publish to changelog?

no

## Docs update

no docs update needed

## 🤖 Agent context

Authored with Capy.

I kept the fix narrow to the concrete regressions visible in this fork instead of refactoring the wider replay comment flow.
I chose to patch the backend filter helper and the replay edit overlay directly because both failures were localized and already had nearby test surfaces.
I added a small fixture change for mixed comment scopes and a focused frontend regression test, but the available local test environment could not run the full backend/frontend tests cleanly, so the PR notes the exact blockers instead of pretending otherwise.
