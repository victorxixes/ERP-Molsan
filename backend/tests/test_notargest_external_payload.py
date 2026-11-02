"""El portal externo de NotarGest solo recibe notas visibles para la notaría."""
import unittest

from backend.app.notargest.router import (
    _filtrar_campos_sensibles_notario_externo,
    _es_gestor_asignado,
    _documento_visible_notargest_externo,
    _url_documento_segura_notargest,
    _observacion_ctn_visible_notargest,
    _categoria_documental_permitida_notargest,
    _expediente_autorizado,
    _pago_corresponde_a_notario,
    Expediente,
)


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

    def test_notary_can_only_address_the_manager_assigned_to_the_expedient(self):
        expediente = type("Expediente", (), {"gestor_asignado_id": 27})()
        self.assertTrue(_es_gestor_asignado(expediente, 27))
        self.assertFalse(_es_gestor_asignado(expediente, 28))
        self.assertFalse(_es_gestor_asignado(expediente, None))

    def test_unassigned_expedient_has_no_valid_comment_recipient(self):
        expediente = type("Expediente", (), {"gestor_asignado_id": None})()
        self.assertFalse(_es_gestor_asignado(expediente, 27))

    def test_external_document_allowlist_includes_notarial_documents(self):
        for category in (
            "Documentos ABSIS",
            "Hoja de encargo firmada",
            "Factura notarial",
            "Presentación Registro",
            "Copia simple",
            "Justificante de pago",
        ):
            self.assertTrue(_documento_visible_notargest_externo(category), category)

    def test_external_document_allowlist_hides_internal_economic_documents(self):
        for category in (
            "Factura registral",
            "Honorarios gestoría",
            "Otros impuestos",
            "Liquidación interna",
            "Otros",
        ):
            self.assertFalse(_documento_visible_notargest_externo(category), category)

    def test_payment_proof_url_allows_https_and_safe_relative_paths(self):
        self.assertEqual(
            _url_documento_segura_notargest("https://files.example.com/proof.pdf"),
            "https://files.example.com/proof.pdf",
        )
        self.assertEqual(
            _url_documento_segura_notargest("/api/documentos/123"),
            "/api/documentos/123",
        )

    def test_payment_proof_url_rejects_active_and_insecure_schemes(self):
        for url in ("javascript:alert(1)", "http://files.example.com/proof.pdf", "//evil.example/x"):
            self.assertIsNone(_url_documento_segura_notargest(url), url)

    def test_internal_ctn_observations_are_hidden_from_external_notaries(self):
        notaria = type("Notaria", (), {
            "observacion": "Nota interna",
            "_notargest_sesion_soporte": False,
        })()
        self.assertIsNone(_observacion_ctn_visible_notargest(notaria, "notario"))

    def test_ctn_observations_remain_visible_to_internal_support(self):
        notaria = type("Notaria", (), {
            "observacion": "Nota interna",
            "_notargest_sesion_soporte": True,
        })()
        self.assertEqual(_observacion_ctn_visible_notargest(notaria, "notario"), "Nota interna")

    def test_notary_cannot_open_another_notarys_expedient(self):
        expediente = type("Expediente", (), {
            "id_expediente": "EXP-1",
            "notario_id": 12,
            "fecha_envio_notario": "2026-10-01",
            "notargest_estado": "recepcion",
        })()

        class Query:
            def filter(self, *args, **kwargs):
                return self
            def first(self):
                return expediente

        class DB:
            def query(self, model):
                if model is not Expediente:
                    raise AssertionError("Consulta inesperada")
                return Query()

        notaria_correcta = type("Notaria", (), {"id": 12, "nif": "12345678Z", "nombre": "Notaría", "apellidos": "Uno"})()
        notaria_ajena = type("Notaria", (), {"id": 13, "nif": "87654321X", "nombre": "Notaría", "apellidos": "Dos"})()
        self.assertIs(_expediente_autorizado("EXP-1", notaria_correcta, DB()), expediente)
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as error:
            _expediente_autorizado("EXP-1", notaria_ajena, DB())
        self.assertEqual(error.exception.status_code, 403)

    def test_external_notary_only_sees_payments_explicitly_assigned_to_it(self):
        notaria = type("Notaria", (), {"id": 12, "nif": "12345678Z", "nombre": "Notaría", "apellidos": "Uno"})()
        expediente = type("Expediente", (), {"nif_notario": "12345678Z", "nombre_notario": "Notaría Uno"})()
        gasto_correcto = type("Gasto", (), {"nif_notario": "12345678Z", "nombre_notario": "Notaría Uno"})()
        gasto_otro_nif = type("Gasto", (), {"nif_notario": "87654321X", "nombre_notario": "Notaría Uno"})()
        gasto_sin_destinatario = type("Gasto", (), {"nif_notario": None, "nombre_notario": None})()
        self.assertTrue(_pago_corresponde_a_notario(notaria, gasto_correcto, expediente))
        self.assertFalse(_pago_corresponde_a_notario(notaria, gasto_otro_nif, expediente))
        self.assertFalse(_pago_corresponde_a_notario(notaria, gasto_sin_destinatario, expediente))

    def test_workflow_documents_are_restricted_to_their_current_stage(self):
        self.assertFalse(_categoria_documental_permitida_notargest("factura", "factura"))
        self.assertTrue(_categoria_documental_permitida_notargest("presentacion", "registro"))
        self.assertTrue(_categoria_documental_permitida_notargest("copia", "copia"))
        self.assertTrue(_categoria_documental_permitida_notargest("defecto", "inscripcion"))
        self.assertFalse(_categoria_documental_permitida_notargest("copia", "recepcion"))
        self.assertFalse(_categoria_documental_permitida_notargest("factura", "firma"))
        self.assertFalse(_categoria_documental_permitida_notargest("ajd", "inscripcion"))


if __name__ == "__main__":
    unittest.main()
