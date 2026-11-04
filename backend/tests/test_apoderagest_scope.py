"""Regresiones de aislamiento de citas entre apoderados."""
import unittest

from sqlalchemy.dialects import postgresql

from backend.app.agenda.models import Cita
from backend.app.apoderagest.agenda.service import _filtro_asignacion_apoderado


class ApoderaGestScopeTests(unittest.TestCase):
    def _sql(self, expresion):
        return str(
            expresion.compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            )
        )

    def test_employee_id_is_authoritative_and_name_only_matches_legacy_rows(self):
        filtro = _filtro_asignacion_apoderado(
            Cita.apoderado_id,
            Cita.apoderado,
            17,
            "María Pérez",
        )
        sql = self._sql(filtro)
        self.assertIn("apoderado_id = 17", sql)
        self.assertIn("apoderado_id IS NULL", sql)
        self.assertIn("translate", sql)

    def test_name_fallback_is_used_only_when_no_employee_id_exists(self):
        filtro = _filtro_asignacion_apoderado(
            Cita.apoderado_id,
            Cita.apoderado,
            None,
            "María Pérez",
        )
        sql = self._sql(filtro)
        self.assertNotIn("apoderado_id =", sql)
        self.assertIn("translate", sql)

    def test_no_identity_returns_no_filter(self):
        self.assertIsNone(
            _filtro_asignacion_apoderado(
                Cita.apoderado_id,
                Cita.apoderado,
                None,
                "",
            )
        )


if __name__ == "__main__":
    unittest.main()
