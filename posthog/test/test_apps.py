from unittest.mock import call, patch

from django.db.utils import OperationalError
from django.test import SimpleTestCase

from posthog.apps import (
    ASYNC_MIGRATIONS_SETUP_MAX_ATTEMPTS,
    ASYNC_MIGRATIONS_SETUP_RETRY_SECONDS,
    run_startup_async_migrations_setup,
)


class TestRunStartupAsyncMigrationsSetup(SimpleTestCase):
    @patch("posthog.apps.time.sleep")
    @patch("posthog.apps.logger.warning")
    @patch("posthog.async_migrations.setup.setup_async_migrations")
    def test_retries_transient_database_errors(
        self,
        mock_setup_async_migrations,
        mock_logger_warning,
        mock_sleep,
    ) -> None:
        mock_setup_async_migrations.side_effect = [
            OperationalError("Temporary failure in name resolution"),
            OperationalError("Temporary failure in name resolution"),
            None,
        ]

        run_startup_async_migrations_setup()

        assert mock_setup_async_migrations.call_count == 3
        mock_sleep.assert_has_calls(
            [
                call(ASYNC_MIGRATIONS_SETUP_RETRY_SECONDS),
                call(ASYNC_MIGRATIONS_SETUP_RETRY_SECONDS),
            ]
        )
        mock_logger_warning.assert_has_calls(
            [
                call(
                    "async_migrations_setup_retrying_after_database_error",
                    attempt=1,
                    max_attempts=ASYNC_MIGRATIONS_SETUP_MAX_ATTEMPTS,
                    retry_in_seconds=ASYNC_MIGRATIONS_SETUP_RETRY_SECONDS,
                    exc_info=True,
                ),
                call(
                    "async_migrations_setup_retrying_after_database_error",
                    attempt=2,
                    max_attempts=ASYNC_MIGRATIONS_SETUP_MAX_ATTEMPTS,
                    retry_in_seconds=ASYNC_MIGRATIONS_SETUP_RETRY_SECONDS,
                    exc_info=True,
                ),
            ]
        )

    @patch("posthog.apps.time.sleep")
    @patch("posthog.apps.logger.warning")
    @patch("posthog.async_migrations.setup.setup_async_migrations")
    def test_reraises_after_exhausting_retries(
        self,
        mock_setup_async_migrations,
        _mock_logger_warning,
        mock_sleep,
    ) -> None:
        mock_setup_async_migrations.side_effect = OperationalError("Temporary failure in name resolution")

        with self.assertRaises(OperationalError):
            run_startup_async_migrations_setup()

        assert mock_setup_async_migrations.call_count == ASYNC_MIGRATIONS_SETUP_MAX_ATTEMPTS
        assert mock_sleep.call_count == ASYNC_MIGRATIONS_SETUP_MAX_ATTEMPTS - 1
