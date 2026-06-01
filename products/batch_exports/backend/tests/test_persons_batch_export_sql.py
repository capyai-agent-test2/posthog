from products.batch_exports.backend.temporal.sql import (
    EXPORT_TO_S3_FROM_PERSONS,
    EXPORT_TO_S3_FROM_PERSONS_BACKFILL,
    SELECT_FROM_PERSONS,
    SELECT_FROM_PERSONS_BACKFILL,
)


def test_person_batch_export_created_at_is_exported_as_datetime64() -> None:
    expected_casts = (
        "toDateTime64(persons.created_at, 6, 'UTC') AS created_at",
        "toDateTime64(p.created_at, 6, 'UTC') AS created_at",
        "argMax(toDateTime64(created_at, 6, 'UTC'), person.version) AS created_at",
    )

    assert expected_casts[0] in SELECT_FROM_PERSONS
    assert expected_casts[1] in SELECT_FROM_PERSONS
    assert expected_casts[1] in SELECT_FROM_PERSONS_BACKFILL
    assert expected_casts[2] in SELECT_FROM_PERSONS_BACKFILL
    assert expected_casts[0] in EXPORT_TO_S3_FROM_PERSONS.template
    assert expected_casts[1] in EXPORT_TO_S3_FROM_PERSONS.template
    assert expected_casts[1] in EXPORT_TO_S3_FROM_PERSONS_BACKFILL.template
    assert expected_casts[2] in EXPORT_TO_S3_FROM_PERSONS_BACKFILL.template
