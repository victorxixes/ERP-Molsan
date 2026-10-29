"""Pruebas de protección frente a celdas vacías del importador ABSIS."""
import unittest
from types import SimpleNamespace

import pandas as pd

from backend.app.Utilidades.importadores.expedientes_importer import (
    _asignar_si_informado,
    vincular_catalogos_expediente,
)


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

    def test_signature_type_comes_from_ctn_not_excel(self):
        expediente = SimpleNamespace(notario_id=None, tipo_firma="Presencial")
        notario = SimpleNamespace(
            id=8, nif="12345678Z", nombre="Notaria", apellidos="Ejemplo", vc="SI"
        )
        fila = pd.Series({
            "NOMBRENOTARIO": "Notaria Ejemplo",
            "NIFNOTARIO": "12345678Z",
            "TIPOFIRMA": "Presencial",
        })

        vincular_catalogos_expediente(expediente, fila, [notario], [])
        self.assertEqual(expediente.notario_id, 8)
        self.assertEqual(expediente.tipo_firma, "Videoconferencia")

    def test_existing_ctn_link_updates_signature_without_excel_notary_fields(self):
        expediente = SimpleNamespace(notario_id=8, tipo_firma="Anterior")
        notario = SimpleNamespace(
            id=8, nif="12345678Z", nombre="Notaria", apellidos="Ejemplo", vc="NO"
        )
        fila = pd.Series({"TIPOFIRMA": "Videoconferencia"})
        vincular_catalogos_expediente(expediente, fila, [notario], [])
        self.assertEqual(expediente.tipo_firma, "Presencial")


if __name__ == "__main__":
    unittest.main()
