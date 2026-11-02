"""El portal externo de NotarGest solo recibe notas visibles para la notaría."""
import unittest

from backend.app.notargest.router import _filtrar_campos_sensibles_notario_externo


class NotarGestExternalPayloadTests(unittest.TestCase):
    def test_internal_finance_fields_notes_and_employee_ids_are_removed(self):
        payload = {
            "saldo_real": 1000,
            "saldo_disponible": 500,
            "origen_bankia": "interno",
            "producto_gtg": "producto interno",
            "tipo_provision": "provisión interna",
            "id_provision": 99,
            "apoderado_empleado_id": 4,
            "observaciones": "Nota interna no visible a la notaría",
            "bloqueado": True,
            "motivo_bloqueo_efectivo": "Texto interno del bloqueo",
            "capital": 120000,
            "importe": 450,
            "fecha_firma": "2026-10-20",
        }

        result = _filtrar_campos_sensibles_notario_externo(payload)

        for field in (
            "saldo_real", "saldo_disponible", "origen_bankia", "producto_gtg",
            "tipo_provision", "id_provision", "apoderado_empleado_id", "observaciones",
        ):
            self.assertNotIn(field, result)
        self.assertEqual(
            result["motivo_bloqueo_efectivo"],
            "Expediente bloqueado temporalmente. Contacta con MOLSAN para continuar.",
        )
        self.assertEqual(result["capital"], 120000)
        self.assertEqual(result["importe"], 450)
        self.assertEqual(result["fecha_firma"], "2026-10-20")

    def test_unblocked_expedient_does_not_receive_a_block_reason(self):
        payload = {"bloqueado": False, "motivo_bloqueo_efectivo": "motivo privado"}
        result = _filtrar_campos_sensibles_notario_externo(payload)
        self.assertNotIn("motivo_bloqueo_efectivo", result)


if __name__ == "__main__":
    unittest.main()
