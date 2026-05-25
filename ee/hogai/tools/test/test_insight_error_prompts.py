from ee.hogai.tools.insight_error_prompts import (
    INSIGHT_TOOL_FAILURE_SYSTEM_REMINDER_PROMPT,
    INSIGHT_TOOL_HANDLED_FAILURE_PROMPT,
    INSIGHT_TOOL_UNHANDLED_FAILURE_PROMPT,
)


def test_failure_system_reminder_blocks_hallucinated_insight_links() -> None:
    assert "NO INSIGHT WAS CREATED" in INSIGHT_TOOL_FAILURE_SYSTEM_REMINDER_PROMPT
    assert "does NOT exist" in INSIGHT_TOOL_FAILURE_SYSTEM_REMINDER_PROMPT
    assert "Do NOT provide any insight names, IDs, short_ids, or URLs." in INSIGHT_TOOL_FAILURE_SYSTEM_REMINDER_PROMPT
    assert (
        "NEVER fabricate, hallucinate, or make up insight names, IDs, short_ids, or URLs."
        in INSIGHT_TOOL_FAILURE_SYSTEM_REMINDER_PROMPT
    )


def test_handled_failure_prompt_includes_system_reminder_placeholder() -> None:
    assert "{{{system_reminder}}}" in INSIGHT_TOOL_HANDLED_FAILURE_PROMPT
    assert "{{{output}}}" in INSIGHT_TOOL_HANDLED_FAILURE_PROMPT
    assert "{{{error_message}}}" in INSIGHT_TOOL_HANDLED_FAILURE_PROMPT


def test_unhandled_failure_prompt_uses_unexpected_error_language() -> None:
    assert "unexpected error" in INSIGHT_TOOL_UNHANDLED_FAILURE_PROMPT
    assert "{{{system_reminder}}}" in INSIGHT_TOOL_UNHANDLED_FAILURE_PROMPT
