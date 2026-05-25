import os
import importlib

from unittest import mock

from django.test import SimpleTestCase

from posthog.settings import base_variables, temporal


class TestTemporalSettings(SimpleTestCase):
    def tearDown(self) -> None:
        importlib.reload(temporal)

    def test_temporal_task_queue_env_collapses_all_task_queues(self) -> None:
        with mock.patch.object(base_variables, "DEBUG", False), mock.patch.dict(
            os.environ, {"TEMPORAL_TASK_QUEUE": "general-purpose-task-queue"}, clear=False
        ):
            reloaded_temporal = importlib.reload(temporal)

        self.assertEqual(reloaded_temporal.TEMPORAL_TASK_QUEUE, "general-purpose-task-queue")
        self.assertEqual(reloaded_temporal.BATCH_EXPORTS_TASK_QUEUE, "general-purpose-task-queue")
        self.assertEqual(reloaded_temporal.DATA_WAREHOUSE_TASK_QUEUE, "general-purpose-task-queue")

    def test_debug_mode_still_uses_development_task_queue(self) -> None:
        with mock.patch.object(base_variables, "DEBUG", True), mock.patch.dict(
            os.environ, {"TEMPORAL_TASK_QUEUE": "general-purpose-task-queue"}, clear=False
        ):
            reloaded_temporal = importlib.reload(temporal)

        self.assertEqual(reloaded_temporal.TEMPORAL_TASK_QUEUE, "development-task-queue")
        self.assertEqual(reloaded_temporal.BATCH_EXPORTS_TASK_QUEUE, "development-task-queue")
