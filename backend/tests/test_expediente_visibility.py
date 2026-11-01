"""Pruebas de la decisión de acceso al expediente por ámbito de reparto."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

from backend.app.expedientes.reparto import (
    validar_acceso_candidatos_expediente,
    validar_candidatos_visibles,
)
from backend.app.empleados.models import Empleado
from backend.app.maestros.models import Departamento


class FakeQuery:
    def __init__(self, first_value=None, all_values=None):
        self.first_value = first_value
        self.all_values = all_values or []

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self.first_value

    def all(self):
        return self.all_values


class FakeDB:
    def __init__(self, empleado, departamentos):
        self.queries = [
            FakeQuery(first_value=empleado),
            FakeQuery(all_values=departamentos),
        ]

    def query(self, _model):
        return self.queries.pop(0)


class ExpedienteVisibilityTests(unittest.TestCase):
    def test_admin_short_circuits_without_database_queries(self):
        db = SimpleNamespace(query=lambda *_: self.fail("Admin no debería consultar la BD"))
        with patch(
            "backend.app.expedientes.reparto.usuario_admin_expedientes",
            return_value=True,
        ):
            validar_acceso_candidatos_expediente(
                db,
                SimpleNamespace(id=1),
                [SimpleNamespace(id=10)],
            )

    def test_employee_scope_checks_only_requested_expedientes(self):
        empleado = SimpleNamespace(id=1, departamento_id=2)
        db = FakeDB(empleado, [SimpleNamespace(id=2, nombre="Gestoría")])
        expediente = SimpleNamespace(id=10)
        with (
            patch(
                "backend.app.expedientes.reparto.usuario_admin_expedientes",
                return_value=False,
            ),
            patch(
                "backend.app.expedientes.reparto.expediente_cumple_reglas_empleado",
                return_value=True,
            ) as cumple,
        ):
            validar_acceso_candidatos_expediente(db, SimpleNamespace(id=1), [expediente])
        cumple.assert_called_once_with(db, empleado, expediente, {2: "Gestoría"}, set())

    def test_employee_outside_scope_gets_not_found(self):
        empleado = SimpleNamespace(id=1, departamento_id=2)
        db = FakeDB(empleado, [])
        with (
            patch(
                "backend.app.expedientes.reparto.usuario_admin_expedientes",
                return_value=False,
            ),
            patch(
                "backend.app.expedientes.reparto.expediente_cumple_reglas_empleado",
                return_value=False,
            ),
        ):
            with self.assertRaises(HTTPException) as caught:
                validar_acceso_candidatos_expediente(
                    db,
                    SimpleNamespace(id=1),
                    [SimpleNamespace(id=99)],
                )
        self.assertEqual(caught.exception.status_code, 404)

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
