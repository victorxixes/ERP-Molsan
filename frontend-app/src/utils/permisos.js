import { useAuthStore } from "../store/authStore";

/**
 * ============================================================
 * PERMISOS — SJ-2026 PREMIUM
 * ============================================================
 *
 * Utilidades centralizadas para:
 *
 * - Verificar módulos visibles
 * - Verificar permisos por acción
 * - Basado en authStore (empleado)
 *
 * ============================================================
 */

/**
 * ============================================================
 * MÓDULOS DISPONIBLES
 * ============================================================
 *
 * Fusiones está en construcción, pero queremos que aparezca
 * en la navegación mientras desarrollamos el módulo.
 *
 * ============================================================
 */

const MODULOS_EN_CONSTRUCCION = [
];


/**
 * ============================================================
 * VERIFICAR VISIBILIDAD DE MÓDULO
 * ============================================================
 */

export function puedeVerModulo(modulo) {

  const empleado =
    useAuthStore.getState().empleado;

  if (!empleado) {
    return false;
  }


  /**
   * Fusiones queda visible durante su desarrollo.
   *
   * Más adelante, cuando creemos el sistema de permisos
   * definitivo para este módulo, podemos eliminar esta
   * excepción y gestionarlo desde modulos_visibles.
   */

  if (
    MODULOS_EN_CONSTRUCCION.includes(modulo)
  ) {
    return true;
  }


  const normalizar = (valor) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .trim()
      .toLowerCase();

  const modulos = [
    ...(Array.isArray(empleado.modulos_visibles_list) ? empleado.modulos_visibles_list : []),
    ...(Array.isArray(empleado.modulos_visibles) ? empleado.modulos_visibles : []),
  ].map(normalizar);

  return modulos.includes(normalizar(modulo));
}


/**
 * ============================================================
 * VERIFICAR PERMISO DE ACCIÓN
 * ============================================================
 */

export function tienePermiso(
  modulo,
  accion
) {

  const empleado =
    useAuthStore.getState().empleado;

  if (!empleado) {
    return false;
  }


  const permisos =
    empleado.permisos_modulo || {};

  const acciones =
    permisos[modulo] || [];


  return acciones.includes(
    accion
  );
}
