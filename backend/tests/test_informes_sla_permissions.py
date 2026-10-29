"""Pruebas de permisos del informe SLA."""
import unittest
from types import SimpleNamespace

from fastapi import HTTPException
from starlette.requests import Request

from backend.app.informes.sla_router import _autorizar_sla


def request_for(method):
    return Request({
        "type": "http",
        "method": method,
        "path": "/api/informes-sla",
        "headers": [],
        "query_string": b"",
    })


class InformeSLAPermissionsTests(unittest.TestCase):
    def test_read_requires_utilidades_view(self):
        usuario = SimpleNamespace(permisos_modulo_dict={"utilidades": ["ver"]})
        self.assertIs(_autorizar_sla(request_for("GET"), usuario), usuario)

    def test_write_requires_utilidades_edit_in_addition_to_view(self):
        solo_lectura = SimpleNamespace(permisos_modulo_dict={"utilidades": ["ver"]})
        with self.assertRaises(HTTPException):
            _autorizar_sla(request_for("PUT"), solo_lectura)

        editor = SimpleNamespace(permisos_modulo_dict={"utilidades": ["ver", "editar"]})
        self.assertIs(_autorizar_sla(request_for("PUT"), editor), editor)


if __name__ == "__main__":
    unittest.main()
