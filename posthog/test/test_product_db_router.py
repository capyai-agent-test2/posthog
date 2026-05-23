from pathlib import Path

from django.test import SimpleTestCase, override_settings

from posthog.product_db_router import check_product_db_routes, get_product_db_routes


class TestProductDBRouteChecks(SimpleTestCase):
    @override_settings(BASE_DIR=Path(__file__).resolve().parents[2])
    def test_check_passes_for_valid_route_config(self) -> None:
        get_product_db_routes.cache_clear()
        self.addCleanup(get_product_db_routes.cache_clear)

        self.assertEqual(check_product_db_routes(None), [])
