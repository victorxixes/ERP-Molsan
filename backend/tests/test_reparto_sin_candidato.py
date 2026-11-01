"""Regresión del reparto cuando no hay reglas compatibles.

Ejecutar desde la raíz con:
    python -m unittest backend.tests.test_reparto_sin_candidato
"""
import unittest

from backend.app.expedientes.reparto import (
    asignar_gestor_automaticamente,
    expediente_cumple_reglas_empleado,
)

class _QueryVacia:
    def __init__(self, modelo):
        self.modelo = modelo

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return []


class _DBSinCandidatos:
    def __init__(self):
        self.historial = []

    def query(self, modelo):
        return _QueryVacia(modelo)

    def execute(self, sentencia, parametros=None):
        self.historial.append(parametros or {})


class _Expediente:
    id_expediente = "TEST-REPARTO-001"
    provincia = None

    def __init__(self, gestor_asignado_id=None):
        self.gestor_asignado_id = gestor_asignado_id


class _Empleado:
    id = 27
    reparto_actividades_json = []


class RepartoSinCandidatoTests(unittest.TestCase):
    def test_gestor_con_asignacion_provisional_conserva_acceso_al_expediente(self):
        expediente = _Expediente(gestor_asignado_id=27)

        visible = expediente_cumple_reglas_empleado(
            db=None,
            empleado=_Empleado(),
            expediente=expediente,
            asignaciones_provisionales={"TEST-REPARTO-001"},
        )

        self.assertTrue(visible)

    def test_asignacion_no_provisional_no_elude_las_reglas_de_acceso(self):
        expediente = _Expediente(gestor_asignado_id=27)

        visible = expediente_cumple_reglas_empleado(
            db=None,
            empleado=_Empleado(),
            expediente=expediente,
            asignaciones_provisionales=set(),
        )

        self.assertFalse(visible)

    def test_conserva_gestor_y_registra_incidencia_si_no_hay_candidato(self):
        db = _DBSinCandidatos()
        expediente = _Expediente(gestor_asignado_id=27)

        resultado = asignar_gestor_automaticamente(
            db, expediente, "tramitacion-inscripcion"
        )

        self.assertIsNone(resultado)  # No se asignó un gestor nuevo.
        self.assertEqual(expediente.gestor_asignado_id, 27)
        self.assertEqual(len(db.historial), 1)
        self.assertEqual(
            db.historial[0]["motivo"],
            "sin_regla_reparto_gestor_conservado",
        )
        self.assertEqual(db.historial[0]["gestor_id"], 27)
        self.assertEqual(db.historial[0]["anterior_id"], 27)

    def test_trata_cero_como_sin_gestor_y_no_lo_guarda_como_fk(self):
        db = _DBSinCandidatos()
        expediente = _Expediente(gestor_asignado_id=0)

        resultado = asignar_gestor_automaticamente(
            db, expediente, "tramitacion-inscripcion"
        )

        self.assertIsNone(resultado)
        self.assertEqual(expediente.gestor_asignado_id, 0)
        self.assertEqual(db.historial[0]["motivo"], "sin_regla_reparto_sin_gestor")
        self.assertIsNone(db.historial[0]["gestor_id"])
        self.assertIsNone(db.historial[0]["anterior_id"])

    def test_registra_sin_gestor_si_no_hay_candidato_ni_asignacion_previa(self):
        db = _DBSinCandidatos()
        expediente = _Expediente()

        resultado = asignar_gestor_automaticamente(
            db, expediente, "tramitacion-inscripcion"
        )

        self.assertIsNone(resultado)
        self.assertIsNone(expediente.gestor_asignado_id)
        self.assertEqual(len(db.historial), 1)
        self.assertEqual(
            db.historial[0]["motivo"],
            "sin_regla_reparto_sin_gestor",
        )
        self.assertIsNone(db.historial[0]["gestor_id"])
        self.assertIsNone(db.historial[0]["anterior_id"])


if __name__ == "__main__":
    unittest.main()
