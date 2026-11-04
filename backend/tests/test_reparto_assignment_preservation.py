import unittest
from types import SimpleNamespace

from backend.app.empleados.models import Empleado
from backend.app.maestros.models import Departamento
from backend.app.expedientes.reparto import asignar_gestor_automaticamente


class QuerySinResultados:
    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return []


class DBSinCandidatos:
    def __init__(self):
        self.execute_calls = 0

    def query(self, modelo):
        if modelo in (Empleado, Departamento):
            return QuerySinResultados()
        raise AssertionError(f"Modelo inesperado: {modelo}")

    def execute(self, *args, **kwargs):
        self.execute_calls += 1
        raise AssertionError("No debe escribirse historial si no se modifica la asignación")


class RepartoSeguroTests(unittest.TestCase):
    def test_conserva_gestor_existente_si_no_hay_reglas_compatibles(self):
        db = DBSinCandidatos()
        expediente = SimpleNamespace(
            gestor_asignado_id=17,
            provincia="Barcelona",
            oficina_alta="",
            oficina="",
            apoderado_empleado_id=None,
            producto_gtg=None,
            tipo_operacion=None,
            estado_expediente="En trámite",
        )

        resultado = asignar_gestor_automaticamente(
            db, expediente, "gestion-economica"
        )

        self.assertEqual(resultado, 17)
        self.assertEqual(expediente.gestor_asignado_id, 17)
        self.assertEqual(db.execute_calls, 0)

    def test_no_inventa_asignacion_si_no_hay_candidatos_ni_gestor_previo(self):
        db = DBSinCandidatos()
        expediente = SimpleNamespace(
            gestor_asignado_id=None,
            provincia="Barcelona",
            oficina_alta="",
            oficina="",
            apoderado_empleado_id=None,
            producto_gtg=None,
            tipo_operacion=None,
            estado_expediente="En trámite",
        )

        resultado = asignar_gestor_automaticamente(
            db, expediente, "gestion-economica"
        )

        self.assertIsNone(resultado)
        self.assertIsNone(expediente.gestor_asignado_id)
        self.assertEqual(db.execute_calls, 0)


if __name__ == "__main__":
    unittest.main()
