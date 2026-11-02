"""El contrato de ApoderaGest solo expone campos aprobados para el apoderado."""

import unittest
from types import SimpleNamespace

from backend.app.apoderagest.encargos.service import _expediente_a_dict


class ApoderaGestPayloadSecurityTests(unittest.TestCase):
    def test_payload_omits_internal_finance_and_billing_fields(self):
        expediente = SimpleNamespace(
            id=1,
            id_expediente="EXP-1",
            estado_expediente="EN CURSO",
            oficina="Barcelona",
            capital=120000,
            importe=450,
            saldo_real=900,
            saldo_disponible=300,
            origen_bankia="dato interno",
            producto_gtg="producto interno",
            id_provision="PROV-1",
            tipo_provision="interna",
            observaciones="Nota interna",
            facturacion_nombre="Cliente",
            facturacion_dni_nif="12345678Z",
            facturacion_direccion="Dirección privada",
            fecha_envio="2026-11-01",
            documentos_escritura=[],
            nombre_solicitante="Titular",
            nif_solicitante="87654321X",
        )

        payload = _expediente_a_dict(expediente)

        for campo in (
            "saldo_real",
            "origen_bankia",
            "producto_gtg",
            "id_provision",
            "tipo_provision",
            "observaciones",
            "facturacion",
            "facturacion_dni_nif",
            "facturacion_direccion",
        ):
            self.assertNotIn(campo, payload, campo)

        self.assertEqual(payload["saldo_disponible"], 300)
        self.assertEqual(payload["fecha_envio"], "2026-11-01")
        self.assertEqual(payload["nif_solicitante"], "87654321X")


if __name__ == "__main__":
    unittest.main()
