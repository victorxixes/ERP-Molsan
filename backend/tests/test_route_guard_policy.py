"""Regression tests for centralized API authorization policy."""
import hashlib
import unittest

from backend.app.auth.route_guard import (
    _RUTAS_CON_AUTORIZACION_INTERNA,
    _resolver_accion,
    _resolver_modulo,
)
from backend.app.empleados.service import hash_password, verificar_hash_password
from backend.app.seguridad.permisos.permisos_router import MODULOS_BASE
from backend.app.seguridad.router import PLANTILLA_PERMISOS


class RouteGuardPolicyTests(unittest.TestCase):
    def test_existing_resource_post_actions_require_edit_not_create(self):
        for path in (
            "/api/utilidades/asignar-promocion",
            "/api/utilidades/reasignar-gestor",
            "/api/expedientes/provisiones-independientes/123/email",
            "/api/expedientes/4/gastos/12/integracion-absis",
            "/api/utilidades/conceptos-gastos/6/plantilla-factura",
            "/api/utilidades/correspondencia/firma/factura",
            "/api/expedientes/EXP-100/carpeta-digital",
            "/api/expedientes/EXP-100/carpeta-digital/guardar-cierre-documental",
            "/api/expedientes/EXP-100/defectos/3/calificacion",
            "/api/expedientes/4/gastos/12/pagos",
            "/api/expedientes/EXP-100/avanzar-actividad",
            "/api/expediente-observaciones/EXP-100/3/validar",
            "/api/expedientes/EXP-100/ppad/3/compensar",
            "/api/apoderagest/liquidaciones/admin/3/factura/revisar",
        ):
            with self.subTest(path=path):
                self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_absis_expediente_import_uses_utilidades_edit_permission(self):
        path = "/api/utilidades/importador-absis/expedientes"
        self.assertEqual(_resolver_modulo(path, {"POST"}), "utilidades")
        self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_portal_access_routes_use_their_own_dynamic_permissions(self):
        expected = {
            "/api/ctn/accesos-portales/resumen",
            "/api/ctn/notarias/{notaria_id}/accesos-portales",
            "/api/ctn/notarias/{notaria_id}/accesos-portales/{portal}/password",
            "/api/ctn/notarias/{notaria_id}/accesos-portales/{portal}/habilitado",
            "/api/ctn/notarias/{notaria_id}/accesos-portales/{portal}/reset-password",
        }
        self.assertTrue(expected.issubset(set(_RUTAS_CON_AUTORIZACION_INTERNA)))
        self.assertEqual(
            _resolver_accion(
                "/api/ctn/notarias/{notaria_id}/accesos-portales/{portal}/habilitado",
                {"POST"},
            ),
            "editar",
        )

    def test_conditional_internal_authorization_is_not_double_gated(self):
        self.assertIn(
            "/api/seguridad/empleado/{empleado_id}/ficha-completa",
            _RUTAS_CON_AUTORIZACION_INTERNA,
        )
        self.assertIn(
            "/api/apoderagest/encargos/reparar-asignacion",
            _RUTAS_CON_AUTORIZACION_INTERNA,
        )
        self.assertIn(
            "/api/expedientes/configuracion-visibilidad",
            _RUTAS_CON_AUTORIZACION_INTERNA,
        )

    def test_employee_blocking_uses_employee_module(self):
        for suffix in ("bloquear", "desbloquear"):
            path = f"/api/seguridad/asignar/empleado/17/{suffix}"
            self.assertEqual(_resolver_modulo(path), "empleados")
            self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_security_only_employee_actions_use_security_module(self):
        self.assertEqual(
            _resolver_modulo("/api/empleados/17/colaborador-apoderagest", {"PUT"}),
            "seguridad",
        )
        self.assertEqual(
            _resolver_accion("/api/empleados/17/colaborador-apoderagest", {"PUT"}),
            "editar",
        )

    def test_security_maintenance_routes_use_security_permissions(self):
        paths = (
            "/api/expedientes/gastos/migracion/aplicar",
            "/api/utilidades/add_columna_gestoria_expedientes",
        )
        for path in paths:
            self.assertEqual(_resolver_modulo(path, {"POST"}), "seguridad")
            self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_expediente_admin_operations_use_security_permissions(self):
        for path in (
            "/api/expedientes/migraciones/actividades",
            "/api/expedientes/reparto/asignar-pendientes",
        ):
            self.assertEqual(_resolver_modulo(path, {"POST"}), "seguridad")
            self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_employee_permission_management_remains_security_module(self):
        self.assertEqual(
            _resolver_modulo("/api/empleados/17/permisos"),
            "seguridad",
        )

    def test_other_security_assignment_routes_remain_security_module(self):
        for path in (
            "/api/seguridad/asignar/empleado/17/password",
            "/api/seguridad/asignar/empleado/17/rol/3",
            "/api/seguridad/asignar/empleado/17/permisos",
            "/api/seguridad/asignar/empleado/17/modulos",
        ):
            self.assertEqual(_resolver_modulo(path), "seguridad")
        for path in (
            "/api/seguridad/asignar/empleado/17/password",
            "/api/seguridad/asignar/empleado/17/rol/3",
            "/api/seguridad/asignar/empleado/17/modulos",
            "/api/seguridad/asignar/empleado/17/permisos",
        ):
            self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_delete_is_always_delete_permission(self):
        self.assertEqual(
            _resolver_accion("/api/expedientes/17", {"DELETE"}),
            "eliminar",
        )

    def test_payment_void_is_an_edit_not_a_create(self):
        self.assertEqual(
            _resolver_accion(
                "/api/expedientes/17/gastos/3/pagos/9/anular",
                {"POST"},
            ),
            "editar",
        )

    def test_security_permission_catalog_covers_all_template_modules(self):
        self.assertTrue(set(PLANTILLA_PERMISOS).issubset(set(MODULOS_BASE)))

    def test_messaging_routes_use_messaging_permissions(self):
        self.assertEqual(_resolver_modulo("/api/mensajeria/servicios", {"GET"}), "mensajeria")
        self.assertEqual(_resolver_accion("/api/mensajeria/servicios", {"POST"}), "crear")
        self.assertEqual(_resolver_accion("/api/mensajeria/servicios/4", {"PATCH"}), "editar")

    def test_report_routes_use_their_own_module_permissions(self):
        self.assertEqual(_resolver_modulo("/api/informes", {"GET"}), "informes")
        self.assertEqual(_resolver_modulo("/api/informes-sla", {"GET"}), "informes")
        self.assertEqual(_resolver_modulo("/api/informes-sla/fechas/EXP-1/gestion-economica", {"POST"}), "informes")
        self.assertEqual(_resolver_accion("/api/informes-sla/fechas/EXP-1/gestion-economica", {"POST"}), "editar")

    def test_link_audit_uses_security_edit_permission(self):
        path = "/api/expedientes/auditoria-vinculaciones"
        self.assertEqual(_resolver_modulo(path, {"GET"}), "seguridad")
        self.assertEqual(_resolver_accion(path, {"GET"}), "editar")
        self.assertEqual(
            _resolver_accion(path + "/reparar-vinculos-unicos", {"POST"}),
            "editar",
        )

    def test_security_maintenance_posts_use_edit_permission(self):
        for path in (
            "/api/seguridad/permisos/crear-base",
            "/api/seguridad/roles",
            "/api/admin/install-unaccent",
            "/api/mantenimiento-defectos/migrar",
        ):
            self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_fichajes_routes_use_the_correct_permission_modules(self):
        self.assertEqual(_resolver_modulo("/api/fichajes/marcajes", {"GET"}), "fichajes")
        self.assertEqual(_resolver_modulo("/api/fichajes/admin/marcajes", {"GET"}), "control-fichajes")
        self.assertEqual(_resolver_modulo("/api/fichajes/catalogo-ausencias", {"GET"}), "fichajes")
        self.assertEqual(_resolver_modulo("/api/fichajes/catalogo-ausencias", {"POST"}), "control-fichajes")
        self.assertEqual(_resolver_accion("/api/fichajes/admin/periodos", {"POST"}), "editar")

    def test_unknown_api_path_is_not_silently_mapped(self):
        self.assertIsNone(_resolver_modulo("/api/new-unclassified-module"))

    def test_shared_ctn_notary_catalog_routes_use_their_own_permission_check(self):
        self.assertIn("/api/ctn/notarias", _RUTAS_CON_AUTORIZACION_INTERNA)
        self.assertIn("/api/ctn/notarias/{notaria_id}", _RUTAS_CON_AUTORIZACION_INTERNA)
        self.assertEqual(_resolver_modulo("/api/ctn/notarias", {"GET"}), "ctn")

    def test_shared_bank_catalog_routes_use_their_own_permission_check(self):
        for path in (
            "/api/entidades-bancarias",
            "/api/entidades-bancarias/auditoria-sucesiones",
            "/api/entidades-bancarias/importar-excel",
            "/api/entidades-bancarias/{entidad_id}",
        ):
            self.assertIn(path, _RUTAS_CON_AUTORIZACION_INTERNA)

    def test_catalogs_and_mergers_are_in_the_permission_template(self):
        self.assertIn("catalogos", PLANTILLA_PERMISOS)
        self.assertIn("fusiones", PLANTILLA_PERMISOS)
        self.assertTrue(set(PLANTILLA_PERMISOS).issubset(set(MODULOS_BASE)))

    def test_absis_catalog_uses_the_catalogos_module(self):
        self.assertEqual(_resolver_modulo("/api/catalogos-absis", {"GET"}), "catalogos")

    def test_new_password_hash_uses_pbkdf2_and_round_trips(self):
        hashed = hash_password("Prueba-segura-123!")
        self.assertTrue(hashed.startswith("pbkdf2_sha256$"))
        self.assertTrue(verificar_hash_password("Prueba-segura-123!", hashed))
        self.assertFalse(verificar_hash_password("otra-clave", hashed))

    def test_legacy_sha256_hash_remains_verifiable_for_login_migration(self):
        legacy = hashlib.sha256("Clave-antigua-123!".encode("utf-8")).hexdigest()
        self.assertTrue(verificar_hash_password("Clave-antigua-123!", legacy))
        self.assertFalse(verificar_hash_password("incorrecta", legacy))


if __name__ == "__main__":
    unittest.main()
