"""Pruebas del resumen de supervisión del reparto con SQLite aislado."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from backend.app.encargagest.router import obtener_estado_reparto_gestores


class EstadoRepartoPanelTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        self.db = sessionmaker(bind=self.engine)()
        self.db.execute(text("""
            CREATE TABLE expedientes (
                id_expediente TEXT PRIMARY KEY,
                actividad_actual TEXT,
                gestor_asignado_id INTEGER,
                estado_actividad TEXT
            )
        """))
        self.db.execute(text("""
            CREATE TABLE empleados (
                id INTEGER PRIMARY KEY,
                nombre TEXT,
                apellidos TEXT
            )
        """))
        self.db.execute(text("""
            CREATE TABLE expediente_gestor_historial (
                id INTEGER PRIMARY KEY,
                expediente_id TEXT NOT NULL,
                gestor_id INTEGER,
                gestor_anterior_id INTEGER,
                motivo TEXT NOT NULL,
                fecha TEXT
            )
        """))
        self.db.execute(text("INSERT INTO empleados (id, nombre, apellidos) VALUES (1, 'Ana', 'Gestora')"))
        self.db.execute(text("""
            INSERT INTO expedientes (id_expediente, actividad_actual, gestor_asignado_id, estado_actividad)
            VALUES
                ('E-001', 'Tramitación inscripción', 1, 'Abierta'),
                ('E-002', 'Gestión económica', NULL, 'Abierta'),
                ('E-003', 'Cierre', NULL, 'Cerrada'),
                ('E-004', 'Documentación previa', 1, 'Cerrada')
        """))
        self.db.execute(text("""
            INSERT INTO expediente_gestor_historial
                (id, expediente_id, gestor_id, gestor_anterior_id, motivo, fecha)
            VALUES
                (1, 'E-001', 1, 1, 'sin_regla_reparto_gestor_conservado', '2026-10-29T10:00:00'),
                (2, 'E-002', NULL, NULL, 'sin_regla_reparto_sin_gestor', '2026-10-29T11:00:00')
        """))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_resumen_muestra_incidentes_y_excluye_expedientes_cerrados(self):
        usuario_admin = SimpleNamespace(usuario="admin", rol=None)
        with patch("backend.app.encargagest.router._autorizar"):
            resultado = obtener_estado_reparto_gestores(self.db, usuario_admin)

        self.assertEqual(resultado["resumen"]["expedientes_sin_gestor"], 1)
        self.assertEqual(resultado["resumen"]["asignaciones_provisionales"], 1)
        self.assertTrue(resultado["resumen"]["historial_disponible"])
        self.assertEqual(
            {fila["id_expediente"] for fila in resultado["incidencias"]},
            {"E-001", "E-002"},
        )
        self.assertEqual(len(resultado["carga_por_gestor_actividad"]), 1)
        carga = resultado["carga_por_gestor_actividad"][0]
        self.assertEqual(carga["gestor_nombre"], "Ana Gestora")
        self.assertEqual(carga["expedientes_pendientes"], 1)


if __name__ == "__main__":
    unittest.main()
