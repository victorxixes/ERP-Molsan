"""Regresión de aislamiento de encargos por notaría."""

import unittest
from types import SimpleNamespace

from backend.app.encargagest.router import _notaria_permitida


class EncargaGestTenantIsolationTests(unittest.TestCase):
    def test_external_user_can_access_only_its_notary(self):
        actor = {"tipo": "externo", "notaria_id": 12}
        self.assertTrue(_notaria_permitida(actor, 12))
        self.assertFalse(_notaria_permitida(actor, 99))

    def test_internal_admin_can_access_any_notary(self):
        admin = SimpleNamespace(usuario="admin", rol=None)
        self.assertTrue(_notaria_permitida(admin, 12))
        self.assertTrue(_notaria_permitida(admin, 99))


if __name__ == "__main__":
    unittest.main()
