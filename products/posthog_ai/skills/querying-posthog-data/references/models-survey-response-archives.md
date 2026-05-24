# Survey response archive (`system.survey_response_archives`)

Archived survey responses live in Postgres, not on the `events` rows themselves.
Use this table to exclude archived responses from HogQL or SQL insights that query `survey sent` events.

### Columns

Column | Type | Nullable | Description
`id` | uuid | NOT NULL | Primary key for the archive record
`team_id` | integer | NOT NULL | Project / team ID
`survey_id` | uuid | NOT NULL | Survey ID from `system.surveys.id`
`response_uuid` | uuid | NOT NULL | Event UUID for the archived `survey sent` response
`archived_at` | timestamp with tz | NOT NULL | When the response was archived

### Common usage

Exclude archived responses from a survey query:

```sql
SELECT
    e.uuid,
    e.timestamp,
    getSurveyResponse(0, 'QUESTION_ID') AS response
FROM events AS e
LEFT JOIN system.survey_response_archives AS a
    ON a.response_uuid = e.uuid
WHERE
    e.event = 'survey sent'
    AND JSONExtractString(e.properties, '$survey_id') = 'SURVEY_ID'
    AND a.id IS NULL
ORDER BY e.timestamp DESC
LIMIT 100
```

### Key relationships

- **Survey**: `survey_id` joins to `system.surveys.id`
- **Events**: `response_uuid` joins to `events.uuid`

### Important notes

- Archival state is tracked separately from the event payload, so there is no `$survey_response_archived` event property to filter on.
- The table is team-scoped, so you only see archive rows for the current project.
