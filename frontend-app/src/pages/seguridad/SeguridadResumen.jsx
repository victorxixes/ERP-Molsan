import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import "./SeguridadSubpaginasPremium.css";

export default function SeguridadResumen({ empleadoId }) {
  const {
    ficha,
    cargarFicha,
    bloquear,
    desbloquear,
    resetPassword,
    asignarRol,
    asignarPermisos,
    asignarModulos,
    permisos = [],
    logs = [],
    auditoria = [],
  } = useSeguridad();

  const [nuevaPassword, setNuevaPassword] = useState("");
  const [nuevoRol, setNuevoRol] = useState("");

  // ============================================================
  // CARGAR FICHA
  // ============================================================

  useEffect(() => {
    if (empleadoId) {
      cargarFicha(empleadoId);
    }
  }, [empleadoId, cargarFicha]);

  // ============================================================
  // BLINDAR FICHA
  // ============================================================

  const fichaSegura = useMemo(() => {
    if (!ficha || typeof ficha !== "object") {
      return null;
    }

    if (
      !ficha.empleado ||
      typeof ficha.empleado !== "object"
    ) {
      return null;
    }

    return ficha;
  }, [ficha]);

  // ============================================================
  // BLINDAR MÓDULOS
  // ============================================================

  const modulosVisibles = useMemo(() => {
    if (
      !fichaSegura?.empleado ||
      !Array.isArray(
        fichaSegura.empleado.modulos_visibles_list
      )
    ) {
      return [];
    }

    return fichaSegura.empleado.modulos_visibles_list.filter(
      (modulo) => typeof modulo === "string"
    );
  }, [fichaSegura]);

  // ============================================================
  // BLINDAR PERMISOS DEL EMPLEADO
  // ============================================================

  const permisosEmpleado = useMemo(() => {
    const dict =
      fichaSegura?.permisos_modulo_dict || {};

    if (!dict || typeof dict !== "object") {
      return {};
    }

    const limpio = {};

    Object.entries(dict).forEach(
      ([modulo, lista]) => {
        if (
          typeof modulo === "string" &&
          Array.isArray(lista)
        ) {
          limpio[modulo] = lista.filter(
            (permiso) =>
              typeof permiso === "string"
          );
        }
      }
    );

    return limpio;
  }, [fichaSegura]);

  // ============================================================
  // PERMISOS GLOBALES
  // ============================================================

  const permisosGlobales = useMemo(() => {
    if (!Array.isArray(permisos)) {
      return {};
    }

    return permisos
      .filter(
        (permiso) =>
          permiso &&
          typeof permiso === "object" &&
          typeof permiso.modulo === "string" &&
          typeof permiso.permiso === "string"
      )
      .reduce((acc, permiso) => {
        if (!acc[permiso.modulo]) {
          acc[permiso.modulo] = [];
        }

        acc[permiso.modulo].push(
          permiso.permiso
        );

        return acc;
      }, {});
  }, [permisos]);

  // ============================================================
  // CAMBIAR PERMISO
  // ============================================================

  const cambiarPermiso = useCallback(
    (modulo, permiso) => {
      if (
        typeof modulo !== "string" ||
        typeof permiso !== "string"
      ) {
        return;
      }

      const nuevo = {
        ...permisosEmpleado,
      };

      if (!Array.isArray(nuevo[modulo])) {
        nuevo[modulo] = [];
      }

      if (nuevo[modulo].includes(permiso)) {
        nuevo[modulo] = nuevo[modulo].filter(
          (item) => item !== permiso
        );
      } else {
        nuevo[modulo] = [
          ...nuevo[modulo],
          permiso,
        ];
      }

      asignarPermisos(
        fichaSegura.empleado.id,
        nuevo
      );
    },
    [
      permisosEmpleado,
      asignarPermisos,
      fichaSegura,
    ]
  );

  // ============================================================
  // CAMBIAR MÓDULO
  // ============================================================

  const cambiarModulo = useCallback(
    (modulo) => {
      if (typeof modulo !== "string") {
        return;
      }

      let nuevo;

      if (modulosVisibles.includes(modulo)) {
        nuevo = modulosVisibles.filter(
          (item) => item !== modulo
        );
      } else {
        nuevo = [
          ...modulosVisibles,
          modulo,
        ];
      }

      asignarModulos(
        fichaSegura.empleado.id,
        nuevo
      );
    },
    [
      modulosVisibles,
      asignarModulos,
      fichaSegura,
    ]
  );

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
        typeof item === "object" &&
        typeof item.fecha === "string" &&
        typeof item.accion === "string"
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
        typeof log === "object" &&
        typeof log.fecha === "string" &&
        typeof log.tipo === "string" &&
        typeof log.mensaje === "string"
    );
  }, [logs]);

  // ============================================================
  // ESTADO
  // ============================================================

  if (!fichaSegura) {
    return (
      <div className="erp-page seguridad-subpagina-premium seguridad-resumen-premium">

        <div className="molsan-page-header">

          <div className="molsan-page-header__identity">
            <div className="molsan-page-header__mark" aria-hidden="true">SG</div>
            <div className="min-w-0">
              <p className="molsan-page-header__eyebrow">MOLSAN ERP · SEGURIDAD</p>
              <h1 className="molsan-page-header__title">Resumen de seguridad</h1>
              <p className="molsan-page-header__description">Información, permisos y actividad del usuario.</p>
            </div>
          </div>

        </div>

        <div className="erp-card">

          <div className="erp-card-body">

            <div className="erp-empty-state">

              <div className="erp-empty-state-icon">
                🔐
              </div>

              <div>
                <h2 className="erp-empty-state-title">
                  Cargando resumen…
                </h2>

                <p className="erp-empty-state-description">
                  Estamos obteniendo la información
                  de seguridad del usuario.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    );
  }

  const empleado = fichaSegura.empleado;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="erp-page seguridad-subpagina-premium seguridad-resumen-premium">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div className="molsan-page-header">

        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true">SG</div>
          <div>
          <p className="molsan-page-header__eyebrow">
            SEGURIDAD · USUARIO
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <h1 className="molsan-page-header__title">
              Resumen de seguridad
            </h1>

            <span
              className={
                empleado.activo
                  ? "erp-badge erp-badge-success"
                  : "erp-badge erp-badge-danger"
              }
            >
              {empleado.activo
                ? "Activo"
                : "Bloqueado"}
            </span>

          </div>

          <p className="molsan-page-header__description">
            {empleado.nombre || "-"}{" "}
            {empleado.apellidos || ""}
            {" · "}
            usuario{" "}
            <strong>
              {empleado.usuario || "-"}
            </strong>
          </p>

        </div>

        <div className="molsan-page-header__actions">

          {empleado.rol_nombre && (
            <span className="erp-badge erp-badge-primary">
              {empleado.rol_nombre}
            </span>
          )}

        </div>

      </div>

      {/* ======================================================
          DATOS BÁSICOS
      ====================================================== */}

      <div className="erp-card">

        <div className="erp-card-header">

          <div>
            <h2 className="erp-card-title">
              Datos básicos
            </h2>

            <p className="erp-card-description">
              Información principal de la cuenta de usuario.
            </p>
          </div>

          <span className="erp-badge erp-badge-neutral">
            ID {String(empleado.id)}
          </span>

        </div>

        <div className="erp-card-body">

          <div className="flex flex-col md:flex-row gap-6">

            {/* FOTO */}

            <div className="shrink-0">

              <img
                src={
                  typeof empleado.foto === "string" &&
                  empleado.foto
                    ? empleado.foto
                    : "/no-foto.png"
                }
                alt="Foto empleado"
                className="
                  w-28 h-28
                  rounded-2xl
                  object-cover
                  border
                  border-[var(--erp-border)]
                  shadow-sm
                "
              />

            </div>

            {/* DATOS */}

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

              <div className="erp-data-item">
                <span className="erp-data-label">
                  ID
                </span>

                <span className="erp-data-value">
                  {String(empleado.id)}
                </span>
              </div>

              <div className="erp-data-item">
                <span className="erp-data-label">
                  Usuario
                </span>

                <span className="erp-data-value">
                  {empleado.usuario || "-"}
                </span>
              </div>

              <div className="erp-data-item">
                <span className="erp-data-label">
                  Nombre
                </span>

                <span className="erp-data-value">
                  {empleado.nombre || "-"}
                </span>
              </div>

              <div className="erp-data-item">
                <span className="erp-data-label">
                  Apellidos
                </span>

                <span className="erp-data-value">
                  {empleado.apellidos || "-"}
                </span>
              </div>

              <div className="erp-data-item">
                <span className="erp-data-label">
                  DNI
                </span>

                <span className="erp-data-value">
                  {empleado.dni || "-"}
                </span>
              </div>

              <div className="erp-data-item">
                <span className="erp-data-label">
                  Email
                </span>

                <span className="erp-data-value break-all">
                  {empleado.email_empresa || "-"}
                </span>
              </div>

              <div className="erp-data-item">
                <span className="erp-data-label">
                  Estado
                </span>

                <span
                  className={
                    empleado.activo
                      ? "erp-badge erp-badge-success"
                      : "erp-badge erp-badge-danger"
                  }
                >
                  {empleado.activo
                    ? "Activo"
                    : "Inactivo"}
                </span>
              </div>

              <div className="erp-data-item">
                <span className="erp-data-label">
                  Rol
                </span>

                <span className="erp-data-value">
                  {empleado.rol_nombre || "-"}
                </span>
              </div>

            </div>

          </div>

          {/* ACCIÓN ESTADO */}

          <div className="erp-action-bar mt-6">

            <div>
              <div className="erp-section-title">
                Estado de acceso
              </div>

              <div className="erp-section-description">
                Controla el acceso de esta cuenta al ERP.
              </div>
            </div>

            <div>

              {empleado.activo ? (

                <button
                  type="button"
                  className="erp-btn erp-btn-danger"
                  onClick={() =>
                    bloquear(empleado.id)
                  }
                >
                  Bloquear usuario
                </button>

              ) : (

                <button
                  type="button"
                  className="erp-btn erp-btn-success"
                  onClick={() =>
                    desbloquear(empleado.id)
                  }
                >
                  Desbloquear usuario
                </button>

              )}

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          ESTADÍSTICAS
      ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="erp-stat-card">
          <span className="erp-stat-label">
            Módulos visibles
          </span>

          <strong className="erp-stat-value">
            {modulosVisibles.length}
          </strong>
        </div>

        <div className="erp-stat-card">
          <span className="erp-stat-label">
            Módulos disponibles
          </span>

          <strong className="erp-stat-value">
            {Object.keys(permisosGlobales).length}
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

      {/* ======================================================
          ACCIONES RÁPIDAS
      ====================================================== */}

      <div className="erp-card">

        <div className="erp-card-header">

          <div>
            <h2 className="erp-card-title">
              Acciones rápidas
            </h2>

            <p className="erp-card-description">
              Operaciones administrativas sobre la cuenta.
            </p>
          </div>

        </div>

        <div className="erp-card-body">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* RESET PASSWORD */}

            <div className="erp-form-section">

              <div className="erp-section-title">
                Restablecer contraseña
              </div>

              <div className="erp-section-description">
                Define una nueva contraseña para el usuario.
              </div>

              <div className="mt-4">

                <label className="erp-form-label">
                  Nueva contraseña
                </label>

                <input
                  type="password"
                  className="erp-input"
                  value={nuevaPassword}
                  onChange={(event) =>
                    setNuevaPassword(
                      event.target.value
                    )
                  }
                  placeholder="Introducir nueva contraseña"
                />

                <button
                  type="button"
                  className="erp-btn erp-btn-primary mt-3"
                  disabled={!nuevaPassword.trim()}
                  onClick={() => {

                    resetPassword(
                      empleado.id,
                      nuevaPassword
                    );

                    setNuevaPassword("");

                  }}
                >
                  Restablecer contraseña
                </button>

              </div>

            </div>

            {/* ASIGNAR ROL */}

            <div className="erp-form-section">

              <div className="erp-section-title">
                Asignar rol
              </div>

              <div className="erp-section-description">
                Asigna un rol mediante su identificador.
              </div>

              <div className="mt-4">

                <label className="erp-form-label">
                  ID del rol
                </label>

                <input
                  type="number"
                  className="erp-input"
                  value={nuevoRol}
                  onChange={(event) =>
                    setNuevoRol(
                      event.target.value
                    )
                  }
                  placeholder="Ej. 1"
                />

                <button
                  type="button"
                  className="erp-btn erp-btn-primary mt-3"
                  disabled={!nuevoRol}
                  onClick={() => {

                    const idRol =
                      Number(nuevoRol);

                    if (!Number.isFinite(idRol)) {
                      return;
                    }

                    asignarRol(
                      empleado.id,
                      idRol
                    );

                    setNuevoRol("");

                  }}
                >
                  Asignar rol
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          MÓDULOS Y PERMISOS
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ====================================================
            MÓDULOS VISIBLES
        ==================================================== */}

        <div className="erp-card">

          <div className="erp-card-header">

            <div>
              <h2 className="erp-card-title">
                Módulos visibles
              </h2>

              <p className="erp-card-description">
                Controla qué módulos puede visualizar el usuario.
              </p>
            </div>

            <span className="erp-badge erp-badge-primary">
              {modulosVisibles.length}
            </span>

          </div>

          <div className="erp-card-body">

            <div className="space-y-2">

              {Object.keys(permisosGlobales)
                .filter(
                  (modulo) =>
                    typeof modulo === "string"
                )
                .map((modulo) => {

                  const activo =
                    modulosVisibles.includes(
                      modulo
                    );

                  return (
                    <label
                      key={modulo}
                      className="
                        flex items-center justify-between
                        gap-4
                        p-3
                        rounded-xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface-soft)]
                        hover:bg-[var(--erp-primary-soft)]
                        transition
                        cursor-pointer
                      "
                    >

                      <div className="min-w-0">

                        <div className="font-semibold text-[var(--erp-text)]">
                          {modulo}
                        </div>

                        <div className="text-xs text-[var(--erp-muted)] mt-0.5">
                          {activo
                            ? "Visible para el usuario"
                            : "No visible para el usuario"}
                        </div>

                      </div>

                      <input
                        type="checkbox"
                        checked={activo}
                        onChange={() =>
                          cambiarModulo(
                            modulo
                          )
                        }
                        className="
                          h-5 w-5
                          accent-blue-600
                          cursor-pointer
                          shrink-0
                        "
                      />

                    </label>
                  );
                })}

            </div>

          </div>

        </div>

        {/* ====================================================
            PERMISOS
        ==================================================== */}

        <div className="erp-card">

          <div className="erp-card-header">

            <div>
              <h2 className="erp-card-title">
                Permisos por módulo
              </h2>

              <p className="erp-card-description">
                Gestiona los permisos disponibles para cada módulo.
              </p>
            </div>

            <span className="erp-badge erp-badge-purple">
              {permisos.length}
            </span>

          </div>

          <div className="erp-card-body">

            <div className="space-y-6">

              {Object.entries(permisosGlobales)
                .filter(
                  ([modulo, lista]) =>
                    typeof modulo === "string" &&
                    Array.isArray(lista)
                )
                .map(
                  ([modulo, permisosDisponibles]) => {

                    return (
                      <div
                        key={modulo}
                        className="
                          border
                          border-[var(--erp-border)]
                          rounded-2xl
                          overflow-hidden
                        "
                      >

                        <div className="
                          px-4 py-3
                          bg-[var(--erp-surface-soft)]
                          border-b
                          border-[var(--erp-border)]
                          flex
                          items-center
                          justify-between
                          gap-3
                        ">

                          <strong className="text-[var(--erp-text)]">
                            {modulo}
                          </strong>

                          <span className="erp-badge erp-badge-neutral">
                            {permisosDisponibles.length}
                          </span>

                        </div>

                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">

                          {permisosDisponibles
                            .filter(
                              (permiso) =>
                                typeof permiso ===
                                "string"
                            )
                            .map((permiso) => {

                              const activo =
                                Array.isArray(
                                  permisosEmpleado[
                                    modulo
                                  ]
                                ) &&
                                permisosEmpleado[
                                  modulo
                                ].includes(
                                  permiso
                                );

                              return (
                                <label
                                  key={`${modulo}-${permiso}`}
                                  className="
                                    flex
                                    items-center
                                    gap-3
                                    rounded-xl
                                    border
                                    border-[var(--erp-border)]
                                    px-3
                                    py-2.5
                                    cursor-pointer
                                    hover:bg-[var(--erp-primary-soft)]
                                    transition
                                  "
                                >

                                  <input
                                    type="checkbox"
                                    checked={activo}
                                    onChange={() =>
                                      cambiarPermiso(
                                        modulo,
                                        permiso
                                      )
                                    }
                                    className="
                                      h-4 w-4
                                      accent-purple-600
                                      cursor-pointer
                                      shrink-0
                                    "
                                  />

                                  <span className="
                                    text-sm
                                    text-[var(--erp-text)]
                                    break-words
                                  ">
                                    {permiso}
                                  </span>

                                </label>
                              );
                            })}

                        </div>

                      </div>
                    );
                  }
                )}

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          AUDITORÍA Y LOGS
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ====================================================
            AUDITORÍA
        ==================================================== */}

        <div className="erp-card">

          <div className="erp-card-header">

            <div>
              <h2 className="erp-card-title">
                Auditoría reciente
              </h2>

              <p className="erp-card-description">
                Últimas acciones registradas sobre seguridad.
              </p>
            </div>

            <span className="erp-badge erp-badge-neutral">
              {auditoriaSegura.length}
            </span>

          </div>

          <div className="erp-card-body">

            <div className="space-y-3 max-h-96 overflow-y-auto">

              {auditoriaSegura.length > 0 ? (

                auditoriaSegura
                  .slice(0, 20)
                  .map((item, index) => (

                    <div
                      key={
                        item.id ??
                        `${item.fecha}-${item.accion}-${item.usuario}-${index}`
                      }
                      className="erp-activity-item"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <div className="font-semibold text-[var(--erp-text)]">
                            {item.accion}
                          </div>

                          {typeof item.modulo === "string" &&
                            item.modulo && (
                              <span className="erp-badge erp-badge-primary mt-1">
                                {item.modulo}
                              </span>
                            )}

                        </div>

                        {item.usuario && (
                          <span className="erp-badge erp-badge-neutral">
                            {item.usuario}
                          </span>
                        )}

                      </div>

                      {item.descripcion && (
                        <div className="text-sm text-[var(--erp-muted)] mt-2">
                          {item.descripcion}
                        </div>
                      )}

                      <div className="text-xs text-[var(--erp-muted)] mt-2">
                        {item.fecha}
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

        {/* ====================================================
            LOGS
        ==================================================== */}

        <div className="erp-card">

          <div className="erp-card-header">

            <div>
              <h2 className="erp-card-title">
                Logs recientes
              </h2>

              <p className="erp-card-description">
                Actividad técnica registrada por el sistema.
              </p>
            </div>

            <span className="erp-badge erp-badge-neutral">
              {logsSeguros.length}
            </span>

          </div>

          <div className="erp-card-body">

            <div className="space-y-3 max-h-96 overflow-y-auto">

              {logsSeguros.length > 0 ? (

                logsSeguros
                  .slice(0, 20)
                  .map((log, index) => (

                    <div
                      key={
                        log.id ??
                        `${log.fecha}-${log.tipo}-${log.mensaje}-${index}`
                      }
                      className="erp-activity-item"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <div className="font-semibold text-[var(--erp-text)]">
                            {log.tipo}
                          </div>

                          {typeof log.origen === "string" &&
                            log.origen && (
                              <span className="erp-badge erp-badge-neutral mt-1">
                                {log.origen}
                              </span>
                            )}

                        </div>

                      </div>

                      <div className="text-sm text-[var(--erp-muted)] mt-2 break-words">
                        {log.mensaje}
                      </div>

                      <div className="text-xs text-[var(--erp-muted)] mt-2">
                        {log.fecha}
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
  );
}
