"""Pruebas de protección frente a celdas vacías del importador ABSIS."""
import unittest
from types import SimpleNamespace

from backend.app.Utilidades.importadores.expedientes_importer import _asignar_si_informado


class ImportadorABSISPreservacionTests(unittest.TestCase):
    def test_empty_value_preserves_existing_field(self):
        expediente = SimpleNamespace(protocolo="123/2024")
        _asignar_si_informado(expediente, "protocolo", None)
        self.assertEqual(expediente.protocolo, "123/2024")

    def test_non_empty_value_updates_existing_field(self):
        expediente = SimpleNamespace(protocolo="123/2024")
        _asignar_si_informado(expediente, "protocolo", "456/2025")
        self.assertEqual(expediente.protocolo, "456/2025")

    def test_zero_and_false_are_valid_values_not_empty_cells(self):
        expediente = SimpleNamespace(importe=100, activo=True)
        _asignar_si_informado(expediente, "importe", 0)
        _asignar_si_informado(expediente, "activo", False)
        self.assertEqual(expediente.importe, 0)
        self.assertIs(expediente.activo, False)


if __name__ == "__main__":
    unittest.main()
