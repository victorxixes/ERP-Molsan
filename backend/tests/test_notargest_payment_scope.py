"""Pruebas de aislamiento de pagos por notaría en NotarGest."""
import unittest
from types import SimpleNamespace

from backend.app.notargest.router import _pago_corresponde_a_notario


class NotarGestPaymentScopeTests(unittest.TestCase):
    def setUp(self):
        self.notaria = SimpleNamespace(
            id=12,
            nombre="Notaría Ejemplo",
            apellidos="Barcelona",
            nif="A12345678",
        )
        self.expediente = SimpleNamespace(
            nif_notario="A12345678",
            nombre_notario="Notaría Ejemplo Barcelona",
        )

    def test_matching_notary_identity_is_accepted(self):
        gasto = SimpleNamespace(
            nif_notario="A-12345678",
            nombre_notario="Notaría Ejemplo Barcelona",
        )
        self.assertTrue(_pago_corresponde_a_notario(self.notaria, gasto, self.expediente))

    def test_conflicting_tax_id_is_rejected_even_if_name_matches(self):
        gasto = SimpleNamespace(
            nif_notario="B87654321",
            nombre_notario="Notaría Ejemplo Barcelona",
        )
        self.assertFalse(_pago_corresponde_a_notario(self.notaria, gasto, self.expediente))

    def test_conflicting_name_is_rejected_even_if_tax_id_matches(self):
        gasto = SimpleNamespace(
            nif_notario="A12345678",
            nombre_notario="Otra Notaría",
        )
        self.assertFalse(_pago_corresponde_a_notario(self.notaria, gasto, self.expediente))

    def test_missing_expense_identity_can_use_the_authorized_expedient_scope(self):
        gasto = SimpleNamespace(nif_notario=None, nombre_notario=None)
        self.assertTrue(_pago_corresponde_a_notario(self.notaria, gasto, self.expediente))


if __name__ == "__main__":
    unittest.main()
