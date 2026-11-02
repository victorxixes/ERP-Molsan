"""Regresión de aislamiento por notaría en NotarGest."""

import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.notargest.router import _expediente_autorizado


class FakeQuery:
    def __init__(self, row):
        self.row = row

    def filter(self, *args, **kwargs):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self.row


class FakeDB:
    def __init__(self, row):
        self.row = row

    def query(self, model):
        return FakeQuery(self.row)


class NotarGestTenantIsolationTests(unittest.TestCase):
    def setUp(self):
        self.expediente = SimpleNamespace(
            id_expediente="EXP-TEST-1",
            notario_id=12,
            fecha_envio_notario=None,
            notargest_estado="firma",
            nombre_notario="Notaría de prueba",
            nif_notario="12345678Z",
        )
        self.db = FakeDB(self.expediente)

    def test_external_notary_can_access_own_expedient(self):
        notaria = SimpleNamespace(id=12, nombre="Notaría", apellidos="de prueba", nif="12345678Z")
        self.assertIs(_expediente_autorizado("EXP-TEST-1", notaria, self.db), self.expediente)

    def test_external_notary_cannot_access_another_notary_expedient(self):
        notaria = SimpleNamespace(id=99, nombre="Otra", apellidos="Notaría", nif="87654321X")
        with self.assertRaises(HTTPException) as error:
            _expediente_autorizado("EXP-TEST-1", notaria, self.db)
        self.assertEqual(error.exception.status_code, 403)

    def test_legacy_expedient_is_matched_by_nif_when_notary_id_is_missing(self):
        self.expediente.notario_id = None
        notaria = SimpleNamespace(id=12, nombre="Otra", apellidos="Notaría", nif="12345678Z")
        self.assertIs(_expediente_autorizado("EXP-TEST-1", notaria, self.db), self.expediente)


if __name__ == "__main__":
    unittest.main()
