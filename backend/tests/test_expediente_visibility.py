"""Pruebas de la decisión de acceso al expediente por ámbito de reparto."""
import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.expedientes.reparto import validar_candidatos_visibles


class ExpedienteVisibilityTests(unittest.TestCase):
    def test_admin_or_unrestricted_scope_accepts_all_candidates(self):
        validar_candidatos_visibles(
            [SimpleNamespace(id=10), SimpleNamespace(id=20)],
            None,
        )

    def test_visible_expediente_is_allowed(self):
        validar_candidatos_visibles([SimpleNamespace(id=10)], [10, 20])

    def test_hidden_expediente_returns_not_found(self):
        with self.assertRaises(HTTPException) as caught:
            validar_candidatos_visibles([SimpleNamespace(id=30)], [10, 20])
        self.assertEqual(caught.exception.status_code, 404)

    def test_ambiguous_identifier_is_denied_if_any_match_is_hidden(self):
        with self.assertRaises(HTTPException) as caught:
            validar_candidatos_visibles(
                [SimpleNamespace(id=10), SimpleNamespace(id=30)],
                [10, 20],
            )
        self.assertEqual(caught.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
