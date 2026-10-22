import { useEffect, useMemo, useState } from "react";
import { useSeguridad } from "../../hooks/useSeguridad";
import EmpleadosListado from "../empleados/EmpleadosListado";
import { API_BASE } from "../../api/config";
import "./SeguridadSubpaginasPremium.css";

export default function SeguridadUsuarios() {
  const {
    roles,
    permisos,
    empleados,
    ficha,
    auditoria,
    logs,
    loading,
    cargarTodo,
    cargarFicha,
    bloquear,
    desbloquear,
  } = useSeguridad();

  const [empleadoIdSeleccionado, setEmpleadoIdSeleccionado] = useState(null);

  // ============================================================
  // CARGA INICIAL
  // ============================================================

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // ============================================================
  // CARGAR FICHA
  // ============================================================

  useEffect(() => {
    if (empleadoIdSeleccionado != null) {
      cargarFicha(empleadoIdSeleccionado);
    }
  }, [empleadoIdSeleccionado, cargarFicha]);

  // ============================================================
  // BLINDAR FICHA
  // ============================================================

  const fichaSegura = useMemo(() => {
    if (!ficha || typeof ficha !== "object") {
      return null;
    }

    return ficha;
  }, [ficha]);

  // ============================================================
  // EMPLEADO BÁSICO
  // ============================================================

  const empleadoBasico = useMemo(() => {
    if (
      empleadoIdSeleccionado == null ||
      !Array.isArray(empleados)
    ) {
      return null;
    }

    return (
      empleados.find(
        (e) => e && e.id === empleadoIdSeleccionado
      ) || null
    );
  }, [empleadoIdSeleccionado, empleados]);

  // ============================================================
  // SANITIZACIÓN TOTAL
  // Evita React error #31
  // ============================================================

  const empleadoBasicoSeguro = useMemo(() => {
    if (!empleadoBasico) {
      return null;
    }

    const safe = (value) => {
      if (value === null || value === undefined) {
        return "-";
      }

      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch {
          return "-";
        }
      }

      return String(value);
    };

    return {
      id: safe(empleadoBasico.id),
      nombre: safe(empleadoBasico.nombre),
      apellidos: safe(empleadoBasico.apellidos),
      telefono: safe(empleadoBasico.telefono),
      email_empresa: safe(empleadoBasico.email_empresa),
      extension: safe(empleadoBasico.extension),
      activo: Boolean(empleadoBasico.activo),
      departamento_nombre: safe(
        empleadoBasico.departamento_nombre
      ),
      seccion_nombre: safe(
        empleadoBasico.seccion_nombre
      ),
      cargo_nombre: safe(
        empleadoBasico.cargo_nombre
      ),
      foto: safe(empleadoBasico.foto),
      usuario: safe(empleadoBasico.usuario),
    };
  }, [empleadoBasico]);

  // ============================================================
  // ROLES
  // ============================================================

  const rolesSeguros = useMemo(() => {
    if (!Array.isArray(roles)) {
      return [];
    }

    return roles.filter(
      (rol) =>
        rol &&
        typeof rol === "object" &&
        typeof rol.nombre === "string"
    );
  }, [roles]);

  // ============================================================
  // PERMISOS
  // ============================================================

  const permisosSeguros = useMemo(() => {
    if (!Array.isArray(permisos)) {
      return [];
    }

    return permisos.filter(
      (permiso) =>
        permiso &&
        typeof permiso === "object"
    );
  }, [permisos]);

  // ============================================================
  // AUDITORÍA
  // ============================================================

  const auditoriaSegura = useMemo(() => {
    if (!Array.isArray(auditoria)) {
      return [];
    }

    return auditoria.filter(
      (item) =>
        item &&
        typeof item === "object"
    );
  }, [auditoria]);

  // ============================================================
  // LOGS
  // ============================================================

  const logsSeguros = useMemo(() => {
    if (!Array.isArray(logs)) {
      return [];
    }

    return logs.filter(
      (log) =>
        log &&
        typeof log === "object"
    );
  }, [logs]);

  // ============================================================
  // ESTADO
  // ============================================================

  const usuarioActivo =
    fichaSegura?.activo ??
    empleadoBasicoSeguro?.activo ??
    false;

  return (
    <div className="erp-page seguridad-usuarios-premium">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div className="erp-page-header">

        <div>
          <div className="erp-eyebrow">
            SEGURIDAD
          </div>

          <h1 className="erp-page-title">
            Usuarios y seguridad
          </h1>

          <p className="erp-page-description">
            Gestión de usuarios, permisos, estado de acceso,
            auditoría y actividad de seguridad.
          </p>
        </div>

        <div className="erp-page-header-status">
          <span className="erp-badge erp-badge-primary">
            Centro de Seguridad
          </span>
        </div>

      </div>

      {/* ======================================================
          CONTENIDO PRINCIPAL
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6">

        {/* ====================================================
            EMPLEADOS
        ==================================================== */}

        <div className="erp-card h-fit">

          <div className="erp-card-header">

            <div>
              <h2 className="erp-card-title">
                Usuarios
              </h2>

              <p className="erp-card-description">
                Selecciona un empleado para administrar
                su seguridad.
              </p>
            </div>

            <span className="erp-badge erp-badge-neutral">
              {Array.isArray(empleados)
                ? empleados.length
                : 0}
            </span>

          </div>

          <div className="erp-card-body p-0">
            <EmpleadosListado
              onSeleccionar={(id) => {
                setEmpleadoIdSeleccionado(id);
              }}
            />
          </div>

        </div>

        {/* ====================================================
            PANEL DERECHO
        ==================================================== */}

        <div className="space-y-6">

          {/* ==================================================
              CABECERA USUARIO
          ================================================== */}

          <div className="erp-card">

            <div className="erp-card-body">

              {loading && (
                <div className="erp-alert erp-alert-info mb-5">
                  Cargando información de seguridad…
                </div>
              )}

              {empleadoBasicoSeguro ? (

                <div className="flex flex-col sm:flex-row sm:items-center gap-5">

                  {/* FOTO */}

                  <div className="shrink-0">

                    <img
                      src={
                        empleadoBasicoSeguro.foto &&
                        empleadoBasicoSeguro.foto !== "-"
                          ? `${API_BASE}${empleadoBasicoSeguro.foto}`
                          : "/no-foto.png"
                      }
                      alt="Foto empleado"
                      className="
                        w-20 h-20
                        rounded-2xl
                        object-cover
                        border
                        border-[var(--erp-border)]
                        shadow-sm
                      "
                    />

                  </div>

                  {/* DATOS */}

                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2 mb-1">

                      <h2 className="text-xl font-bold text-[var(--erp-text)]">
                        {empleadoBasicoSeguro.nombre}{" "}
                        {empleadoBasicoSeguro.apellidos}
                      </h2>

                      <span
                        className={
                          usuarioActivo
                            ? "erp-badge erp-badge-success"
                            : "erp-badge erp-badge-danger"
                        }
                      >
                        {usuarioActivo
                          ? "Activo"
                          : "Inactivo"}
                      </span>

                    </div>

                    <div className="text-sm text-[var(--erp-muted)] mb-3">
                      Usuario:{" "}
                      <strong className="text-[var(--erp-text)]">
                        {empleadoBasicoSeguro.usuario}
                      </strong>
                      {" · "}
                      ID:{" "}
                      <strong className="text-[var(--erp-text)]">
                        {empleadoBasicoSeguro.id}
                      </strong>
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {empleadoBasicoSeguro.departamento_nombre !== "-" && (
                        <span className="erp-badge erp-badge-neutral">
                          {empleadoBasicoSeguro.departamento_nombre}
                        </span>
                      )}

                      {empleadoBasicoSeguro.seccion_nombre !== "-" && (
                        <span className="erp-badge erp-badge-neutral">
                          {empleadoBasicoSeguro.seccion_nombre}
                        </span>
                      )}

                      {empleadoBasicoSeguro.cargo_nombre !== "-" && (
                        <span className="erp-badge erp-badge-primary">
                          {empleadoBasicoSeguro.cargo_nombre}
                        </span>
                      )}

                    </div>

                  </div>

                </div>

              ) : (

                <div className="erp-empty-state">

                  <div className="erp-empty-state-icon">
                    🔐
                  </div>

                  <div>
                    <h3 className="erp-empty-state-title">
                      Selecciona un usuario
                    </h3>

                    <p className="erp-empty-state-description">
                      Selecciona un empleado en la columna
                      izquierda para consultar su ficha
                      de seguridad.
                    </p>
                  </div>

                </div>

              )}

            </div>

          </div>

          {/* ==================================================
              FICHA DE SEGURIDAD
          ================================================== */}

          <div className="erp-card">

            <div className="erp-card-header">

              <div>
                <h2 className="erp-card-title">
                  Ficha de seguridad
                </h2>

                <p className="erp-card-description">
                  Información de acceso y estado de la cuenta.
                </p>
              </div>

              {empleadoBasicoSeguro && (
                <span
                  className={
                    usuarioActivo
                      ? "erp-badge erp-badge-success"
                      : "erp-badge erp-badge-danger"
                  }
                >
                  {usuarioActivo
                    ? "Cuenta activa"
                    : "Cuenta bloqueada"}
                </span>
              )}

            </div>

            <div className="erp-card-body">

              {fichaSegura ? (

                <>

                  {/* DATOS */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="erp-data-item">
                      <span className="erp-data-label">
                        Teléfono
                      </span>

                      <span className="erp-data-value">
                        {fichaSegura.telefono ||
                          empleadoBasicoSeguro?.telefono ||
                          "-"}
                      </span>
                    </div>

                    <div className="erp-data-item">
                      <span className="erp-data-label">
                        Email empresa
                      </span>

                      <span className="erp-data-value">
                        {fichaSegura.email_empresa ||
                          empleadoBasicoSeguro?.email_empresa ||
                          "-"}
                      </span>
                    </div>

                    <div className="erp-data-item">
                      <span className="erp-data-label">
                        Extensión
                      </span>

                      <span className="erp-data-value">
                        {fichaSegura.extension ||
                          empleadoBasicoSeguro?.extension ||
                          "-"}
                      </span>
                    </div>

                    <div className="erp-data-item">
                      <span className="erp-data-label">
                        Estado
                      </span>

                      <span
                        className={
                          usuarioActivo
                            ? "erp-badge erp-badge-success"
                            : "erp-badge erp-badge-danger"
                        }
                      >
                        {usuarioActivo
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </div>

                  </div>

                  {/* ROLES / PERMISOS */}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

                    {/* ROLES */}

                    <div>

                      <div className="erp-section-title">
                        Roles asignados
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">

                        {(
                          Array.isArray(fichaSegura.roles)
                            ? fichaSegura.roles
                            : []
                        ).length > 0 ? (

                          fichaSegura.roles.map((rol) => (

                            <span
                              key={
                                rol?.id ??
                                rol?.nombre ??
                                Math.random()
                              }
                              className="erp-badge erp-badge-primary"
                            >
                              {typeof rol?.nombre === "string"
                                ? rol.nombre
                                : "Rol"}
                            </span>

                          ))

                        ) : (

                          <span className="erp-text-muted">
                            Sin roles asignados
                          </span>

                        )}

                      </div>

                    </div>

                    {/* PERMISOS */}

                    <div>

                      <div className="erp-section-title">
                        Permisos asignados
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">

                        {(
                          Array.isArray(fichaSegura.permisos)
                            ? fichaSegura.permisos
                            : []
                        ).length > 0 ? (

                          fichaSegura.permisos.map((permiso) => (

                            <span
                              key={
                                permiso?.id ??
                                permiso?.codigo ??
                                permiso?.nombre ??
                                Math.random()
                              }
                              className="erp-badge erp-badge-purple"
                            >
                              {typeof permiso?.nombre === "string"
                                ? permiso.nombre
                                : typeof permiso?.codigo === "string"
                                ? permiso.codigo
                                : "Permiso"}
                            </span>

                          ))

                        ) : (

                          <span className="erp-text-muted">
                            Sin permisos asignados
                          </span>

                        )}

                      </div>

                    </div>

                  </div>

                  {/* ACCIONES */}

                  <div className="erp-action-bar mt-6">

                    <div>
                      <div className="erp-section-title">
                        Estado de acceso
                      </div>

                      <div className="erp-section-description">
                        Controla el acceso del usuario al sistema.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">

                      <button
                        type="button"
                        className="erp-btn erp-btn-danger"
                        disabled={!empleadoIdSeleccionado}
                        onClick={() => {
                          if (empleadoIdSeleccionado) {
                            bloquear(
                              empleadoIdSeleccionado
                            );
                          }
                        }}
                      >
                        Bloquear
                      </button>

                      <button
                        type="button"
                        className="erp-btn erp-btn-success"
                        disabled={!empleadoIdSeleccionado}
                        onClick={() => {
                          if (empleadoIdSeleccionado) {
                            desbloquear(
                              empleadoIdSeleccionado
                            );
                          }
                        }}
                      >
                        Desbloquear
                      </button>

                    </div>

                  </div>

                </>

              ) : (

                <div className="erp-empty-state">

                  <div className="erp-empty-state-icon">
                    🛡️
                  </div>

                  <div>
                    <h3 className="erp-empty-state-title">
                      Sin ficha cargada
                    </h3>

                    <p className="erp-empty-state-description">
                      Selecciona un usuario para consultar
                      su información de seguridad.
                    </p>
                  </div>

                </div>

              )}

            </div>

          </div>

          {/* ==================================================
              ESTADÍSTICAS RÁPIDAS
          ================================================== */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <div className="erp-stat-card">
              <span className="erp-stat-label">
                Roles
              </span>

              <strong className="erp-stat-value">
                {Array.isArray(
                  fichaSegura?.roles
                )
                  ? fichaSegura.roles.length
                  : 0}
              </strong>
            </div>

            <div className="erp-stat-card">
              <span className="erp-stat-label">
                Permisos
              </span>

              <strong className="erp-stat-value">
                {Array.isArray(
                  fichaSegura?.permisos
                )
                  ? fichaSegura.permisos.length
                  : 0}
              </strong>
            </div>

            <div className="erp-stat-card">
              <span className="erp-stat-label">
                Auditoría
              </span>

              <strong className="erp-stat-value">
                {auditoriaSegura.length}
              </strong>
            </div>

            <div className="erp-stat-card">
              <span className="erp-stat-label">
                Logs
              </span>

              <strong className="erp-stat-value">
                {logsSeguros.length}
              </strong>
            </div>

          </div>

          {/* ==================================================
              AUDITORÍA / LOGS
          ================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* AUDITORÍA */}

            <div className="erp-card">

              <div className="erp-card-header">

                <div>
                  <h2 className="erp-card-title">
                    Auditoría
                  </h2>

                  <p className="erp-card-description">
                    Actividad reciente relacionada con seguridad.
                  </p>
                </div>

                <span className="erp-badge erp-badge-neutral">
                  {auditoriaSegura.length}
                </span>

              </div>

              <div className="erp-card-body">

                <div className="space-y-3 max-h-80 overflow-y-auto">

                  {auditoriaSegura.length > 0 ? (

                    auditoriaSegura.map((item, index) => (

                      <div
                        key={
                          item.id ??
                          `${item.fecha}-${item.accion}-${item.usuario}-${index}`
                        }
                        className="erp-activity-item"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <div className="font-semibold text-[var(--erp-text)]">
                              {typeof item.accion === "string"
                                ? item.accion
                                : "Acción"}
                            </div>

                            <div className="text-sm text-[var(--erp-muted)] mt-1">
                              {typeof item.descripcion === "string"
                                ? item.descripcion
                                : "-"}
                            </div>

                          </div>

                          <span className="erp-badge erp-badge-neutral shrink-0">
                            {typeof item.usuario === "string"
                              ? item.usuario
                              : "-"}
                          </span>

                        </div>

                        <div className="text-xs text-[var(--erp-muted)] mt-2">
                          {typeof item.fecha === "string"
                            ? item.fecha
                            : ""}
                        </div>

                      </div>

                    ))

                  ) : (

                    <div className="erp-empty-inline">
                      No hay registros de auditoría.
                    </div>

                  )}

                </div>

              </div>

            </div>

            {/* LOGS */}

            <div className="erp-card">

              <div className="erp-card-header">

                <div>
                  <h2 className="erp-card-title">
                    Logs
                  </h2>

                  <p className="erp-card-description">
                    Actividad técnica reciente del usuario.
                  </p>
                </div>

                <span className="erp-badge erp-badge-neutral">
                  {logsSeguros.length}
                </span>

              </div>

              <div className="erp-card-body">

                <div className="space-y-3 max-h-80 overflow-y-auto">

                  {logsSeguros.length > 0 ? (

                    logsSeguros.map((log, index) => (

                      <div
                        key={
                          log.id ??
                          `${log.fecha}-${log.tipo}-${log.mensaje}-${index}`
                        }
                        className="erp-activity-item"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <div className="font-semibold text-[var(--erp-text)]">
                              {typeof log.tipo === "string"
                                ? log.tipo
                                : "Log"}
                            </div>

                            <div className="text-sm text-[var(--erp-muted)] mt-1 break-words">
                              {typeof log.mensaje === "string"
                                ? log.mensaje
                                : "-"}
                            </div>

                          </div>

                          {typeof log.origen === "string" &&
                            log.origen && (
                              <span className="erp-badge erp-badge-neutral shrink-0">
                                {log.origen}
                              </span>
                            )}

                        </div>

                        <div className="text-xs text-[var(--erp-muted)] mt-2">
                          {typeof log.fecha === "string"
                            ? log.fecha
                            : ""}
                        </div>

                      </div>

                    ))

                  ) : (

                    <div className="erp-empty-inline">
                      No hay logs recientes.
                    </div>

                  )}

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
