import { useMemo } from "react";
import { useSeguridadStore } from "../store/seguridadStore";

/**
 * ============================================================
 * HOOK SEGURIDAD — MOLSAN ERP SAAS PREMIUM 2027
 * ============================================================
 *
 * Responsabilidad:
 *
 * - Leer el store de Seguridad.
 * - Normalizar los datos recibidos del backend.
 * - No realizar cargas automáticas.
 * - No provocar peticiones duplicadas.
 *
 * IMPORTANTE:
 *
 * La carga general mediante cargarTodo() debe ejecutarse
 * únicamente desde el componente padre de Seguridad.
 *
 * Los módulos hijos:
 *
 * - SeguridadRolEditor
 * - SeguridadLogs
 * - SeguridadPermisos
 * - SeguridadEmpleados
 * - SeguridadAuditoria
 *
 * solamente consumen este hook.
 * ============================================================
 */

export const useSeguridad = () => {

  // ============================================================
  // DATOS
  // ============================================================

  const rolesStore =
    useSeguridadStore(
      (state) => state.roles
    );

  const permisosStore =
    useSeguridadStore(
      (state) => state.permisos
    );

  const empleadosStore =
    useSeguridadStore(
      (state) => state.empleados
    );

  const auditoriaStore =
    useSeguridadStore(
      (state) => state.auditoria
    );

  const logsStore =
    useSeguridadStore(
      (state) => state.logs
    );

  const fichaStore =
    useSeguridadStore(
      (state) => state.ficha
    );

  const loading =
    useSeguridadStore(
      (state) => state.loading
    );

  const loadingFicha =
    useSeguridadStore(
      (state) => state.loadingFicha
    );

  const errorStore =
    useSeguridadStore(
      (state) => state.error
    );


  // ============================================================
  // ACCIONES
  // ============================================================

  const cargarTodo =
    useSeguridadStore(
      (state) => state.cargarTodo
    );

  const cargarFicha =
    useSeguridadStore(
      (state) => state.cargarFicha
    );

  const limpiarFicha =
    useSeguridadStore(
      (state) => state.limpiarFicha
    );

  const asignarRol =
    useSeguridadStore(
      (state) => state.asignarRol
    );

  const asignarPermisos =
    useSeguridadStore(
      (state) => state.asignarPermisos
    );

  const asignarModulos =
    useSeguridadStore(
      (state) => state.asignarModulos
    );

  const resetPassword =
    useSeguridadStore(
      (state) => state.resetPassword
    );

  const bloquear =
    useSeguridadStore(
      (state) => state.bloquear
    );

  const desbloquear =
    useSeguridadStore(
      (state) => state.desbloquear
    );

  const actualizarColaboradorApoderaGest =
    useSeguridadStore(
      (state) => state.actualizarColaboradorApoderaGest
    );


  // ============================================================
  // ROLES
  // ============================================================

  const roles = useMemo(() => {

    if (!Array.isArray(rolesStore)) {
      return [];
    }

    return rolesStore
      .filter(
        (rol) =>
          rol &&
          typeof rol === "object"
      )
      .map(
        (rol) => ({
          ...rol,

          id:
            rol.id !== undefined &&
            rol.id !== null
              ? Number(rol.id)
              : rol.id,

          nombre:
            typeof rol.nombre === "string"
              ? rol.nombre
              : String(
                  rol.nombre ??
                  rol.name ??
                  ""
                ),
        })
      )
      .filter(
        (rol) =>
          rol.nombre.trim() !== ""
      );

  }, [rolesStore]);


  // ============================================================
  // PERMISOS
  // ============================================================

  const permisos = useMemo(() => {

    if (!Array.isArray(permisosStore)) {
      return [];
    }

    return permisosStore
      .filter(
        (permiso) =>
          permiso &&
          typeof permiso === "object"
      )
      .map(
        (permiso) => ({
          ...permiso,

          modulo:
            String(
              permiso.modulo ??
              permiso.module ??
              ""
            ),

          permiso:
            String(
              permiso.permiso ??
              permiso.nombre ??
              permiso.permission ??
              ""
            ),
        })
      )
      .filter(
        (permiso) =>
          permiso.modulo.trim() !== "" ||
          permiso.permiso.trim() !== ""
      );

  }, [permisosStore]);


  // ============================================================
  // EMPLEADOS
  // ============================================================

  const empleados = useMemo(() => {

    if (!Array.isArray(empleadosStore)) {
      return [];
    }

    return empleadosStore
      .filter(
        (empleado) =>
          empleado &&
          typeof empleado === "object"
      )
      .map(
        (empleado) => ({
          ...empleado,

          id:
            empleado.id !== undefined &&
            empleado.id !== null
              ? Number(empleado.id)
              : empleado.id,

          nombre:
            String(
              empleado.nombre ??
              empleado.name ??
              ""
            ),

          usuario:
            String(
              empleado.usuario ??
              empleado.username ??
              ""
            ),

          apellidos:
            String(
              empleado.apellidos ??
              ""
            ),

          dni:
            String(
              empleado.dni ??
              ""
            ),

          email_empresa:
            String(
              empleado.email_empresa ??
              empleado.email ??
              ""
            ),

          activo:
            empleado.activo !== undefined
              ? Boolean(empleado.activo)
              : true,
        })
      );

  }, [empleadosStore]);


  // ============================================================
  // AUDITORÍA
  // ============================================================

  const auditoria = useMemo(() => {

    if (!Array.isArray(auditoriaStore)) {
      return [];
    }

    return auditoriaStore
      .filter(
        (registro) =>
          registro &&
          typeof registro === "object"
      )
      .map(
        (registro) => ({
          ...registro,

          id:
            registro.id,

          fecha:
            String(
              registro.fecha ??
              registro.created_at ??
              registro.fecha_creacion ??
              ""
            ),

          accion:
            String(
              registro.accion ??
              registro.evento ??
              registro.action ??
              ""
            ),

          descripcion:
            String(
              registro.descripcion ??
              registro.detalle ??
              registro.description ??
              ""
            ),

          usuario:
            String(
              registro.usuario ??
              registro.username ??
              registro.usuario_nombre ??
              ""
            ),

          modulo:
            String(
              registro.modulo ??
              registro.module ??
              ""
            ),
        })
      );

  }, [auditoriaStore]);


  // ============================================================
  // LOGS
  // ============================================================

  const logs = useMemo(() => {

    if (!Array.isArray(logsStore)) {
      return [];
    }

    return logsStore
      .filter(
        (log) =>
          log &&
          typeof log === "object"
      )
      .map(
        (log) => ({
          ...log,

          id:
            log.id,

          fecha:
            String(
              log.fecha ??
              log.created_at ??
              log.fecha_creacion ??
              ""
            ),

          evento:
            String(
              log.evento ??
              log.event ??
              log.accion ??
              ""
            ),

          detalle:
            String(
              log.detalle ??
              log.descripcion ??
              log.message ??
              log.mensaje ??
              ""
            ),

          ip:
            String(
              log.ip ??
              log.ip_address ??
              ""
            ),

          usuario:
            String(
              log.usuario ??
              log.username ??
              ""
            ),

          modulo:
            String(
              log.modulo ??
              log.module ??
              ""
            ),

          nivel:
            String(
              log.nivel ??
              log.level ??
              log.severidad ??
              "INFO"
            ).toUpperCase(),
        })
      );

  }, [logsStore]);


  // ============================================================
  // FICHA
  // ============================================================

  const ficha = useMemo(() => {

    if (
      !fichaStore ||
      typeof fichaStore !== "object"
    ) {
      return null;
    }

    const empleadoOriginal =
      fichaStore.empleado;

    if (
      !empleadoOriginal ||
      typeof empleadoOriginal !== "object"
    ) {
      return {
        ...fichaStore,
        empleado: null,
        permisos_modulo_dict: {},
      };
    }

    const permisosModulo =
      fichaStore.permisos_modulo_dict ??
      fichaStore.permisos_modulo ??
      fichaStore.permisos ??
      {};

    const modulosVisibles =
      empleadoOriginal.modulos_visibles_list ??
      empleadoOriginal.modulos_visibles ??
      fichaStore.modulos_visibles ??
      [];

    return {

      ...fichaStore,

      empleado: {

        ...empleadoOriginal,

        id:
          empleadoOriginal.id !== undefined &&
          empleadoOriginal.id !== null
            ? Number(empleadoOriginal.id)
            : empleadoOriginal.id,

        nombre:
          String(
            empleadoOriginal.nombre ??
            ""
          ),

        usuario:
          String(
            empleadoOriginal.usuario ??
            ""
          ),

        apellidos:
          String(
            empleadoOriginal.apellidos ??
            ""
          ),

        dni:
          String(
            empleadoOriginal.dni ??
            ""
          ),

        email_empresa:
          String(
            empleadoOriginal.email_empresa ??
            empleadoOriginal.email ??
            ""
          ),

        activo:
          empleadoOriginal.activo !== undefined
            ? Boolean(
                empleadoOriginal.activo
              )
            : true,

        rol_nombre:
          String(
            empleadoOriginal.rol_nombre ??
            empleadoOriginal.rol ??
            ""
          ),

        foto:
          typeof empleadoOriginal.foto === "string"
            ? empleadoOriginal.foto
            : null,

        modulos_visibles_list:
          Array.isArray(modulosVisibles)
            ? modulosVisibles.filter(
                (modulo) =>
                  typeof modulo === "string"
              )
            : [],
      },

      permisos_modulo_dict:
        permisosModulo &&
        typeof permisosModulo === "object" &&
        !Array.isArray(permisosModulo)

          ? Object.fromEntries(

              Object.entries(
                permisosModulo
              ).map(
                ([modulo, lista]) => [

                  modulo,

                  Array.isArray(lista)
                    ? lista.filter(
                        (permiso) =>
                          typeof permiso === "string"
                      )
                    : [],

                ]
              )

            )

          : {},
    };

  }, [fichaStore]);


  // ============================================================
  // API DEL HOOK
  // ============================================================

  return {

    // ----------------------------------------------------------
    // DATOS
    // ----------------------------------------------------------

    roles,

    permisos,

    empleados,

    auditoria,

    logs,

    ficha,


    // ----------------------------------------------------------
    // ESTADOS
    // ----------------------------------------------------------

    loading,

    loadingFicha,

    error: errorStore,


    // ----------------------------------------------------------
    // CARGAS
    // ----------------------------------------------------------

    cargarTodo,

    cargarFicha,

    limpiarFicha,


    // ----------------------------------------------------------
    // SEGURIDAD
    // ----------------------------------------------------------

    asignarRol,

    asignarPermisos,

    asignarModulos,

    resetPassword,

    bloquear,

    desbloquear,

    actualizarColaboradorApoderaGest,

  };

};
