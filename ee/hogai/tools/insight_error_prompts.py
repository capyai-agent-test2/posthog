INSIGHT_TOOL_FAILURE_SYSTEM_REMINDER_PROMPT = """
<system_reminder>
INSIGHT CREATION FAILED - NO INSIGHT WAS CREATED.
The attempted insight does NOT exist.
Inform the user that insight creation failed.
Do NOT provide any insight names, IDs, short_ids, or URLs.
NEVER fabricate, hallucinate, or make up insight names, IDs, short_ids, or URLs.
If the user wants to try again, first explain that the previous attempt failed and then create a new insight from scratch.
Terminate if the error persists.
</system_reminder>
""".strip()


INSIGHT_TOOL_HANDLED_FAILURE_PROMPT = """
The agent encountered an error while creating an insight.

Generated output:
```
{{{output}}}
```

Error message:
```
{{{error_message}}}
```

{{{system_reminder}}}
""".strip()


INSIGHT_TOOL_UNHANDLED_FAILURE_PROMPT = """
The tool encountered an unexpected error while creating an insight.
{{{system_reminder}}}
""".strip()
