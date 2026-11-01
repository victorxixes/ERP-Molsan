import { useEffect, useMemo, useState } from "react";
import { useSeguridad } from "../../hooks/useSeguridad";
import EmpleadosListado from "../empleados/EmpleadosListado";
import { API_BASE } from "../../api/config";
import { editarEmpleado } from "../../api/empleados";
import ModalEmpleado from "../../components/empleados/ModalEmpleado.jsx";
import SeguridadModulos from "./SeguridadModulos.jsx";
import SeguridadPermisos from "./SeguridadPermisos.jsx";
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
    asignarRol,
    bloquear,
    desbloquear,
    actualizarColaboradorApoderaGest,
  } = useSeguridad();

  const [empleadoIdSeleccionado, setEmpleadoIdSeleccionado] = useState(null);
  const [pestanaActiva, setPestanaActiva] = useState("resumen");
  const [guardandoRol, setGuardandoRol] = useState(false);
  const [mensajeRol, setMensajeRol] = useState("");
  const [guardandoColaborador, setGuardandoColaborador] = useState(false);
  const [mensajeColaborador, setMensajeColaborador] = useState("");
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [guardandoVisibilidad, setGuardandoVisibilidad] = useState(false);
  const [mensajeVisibilidad, setMensajeVisibilidad] = useState("");
  const [versionListado, setVersionListado] = useState(0);

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
      es_colaborador: Boolean(empleadoBasico.es_colaborador),
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
    fichaSegura?.empleado?.activo ??
    fichaSegura?.activo ??
    empleadoBasicoSeguro?.activo ??
    false;

  const rolActualId = Number(
    fichaSegura?.empleado?.rol_id ??
    fichaSegura?.empleado?.rol?.id ??
    fichaSegura?.rol_id ??
    empleadoBasico?.rol_id ??
    0
  );

  const auditoriaEmpleado = useMemo(() => {
    const registros = Array.isArray(fichaSegura?.auditoria)
      ? fichaSegura.auditoria
      : [];
    return registros
      .filter((item) => item && typeof item === "object")
      .slice()
      .sort((a, b) => {
        const fechaA = new Date(a.fecha || 0).getTime() || 0;
        const fechaB = new Date(b.fecha || 0).getTime() || 0;
        return fechaB - fechaA;
      });
  }, [fichaSegura]);

  const fechaSeguridad = useMemo(() => {
    const directa =
      fichaSegura?.fecha_actualizacion_seguridad ??
      fichaSegura?.ultima_actualizacion_seguridad ??
      fichaSegura?.fecha_modificacion_seguridad ??
      fichaSegura?.empleado?.fecha_actualizacion_seguridad;
    if (directa) return directa;
    return auditoriaEmpleado[0]?.fecha || null;
  }, [fichaSegura, auditoriaEmpleado]);

  const fechaSeguridadTexto = useMemo(() => {
    if (!fechaSeguridad) return "Sin registro disponible";
    const fecha = new Date(fechaSeguridad);
    if (Number.isNaN(fecha.getTime())) return String(fechaSeguridad);
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(fecha);
  }, [fechaSeguridad]);

  const cambiarColaboradorApoderaGest = async () => {
    if (!empleadoIdSeleccionado || guardandoColaborador || !empleadoBasico) return;
    const nuevoEstado = !Boolean(empleadoBasico.es_colaborador);
    setGuardandoColaborador(true);
    setMensajeColaborador("");
    try {
      await actualizarColaboradorApoderaGest(empleadoIdSeleccionado, nuevoEstado);
      setMensajeColaborador(
        nuevoEstado
          ? "Colaborador de ApoderaGest habilitado correctamente."
          : "Colaborador de ApoderaGest deshabilitado correctamente."
      );
    } catch {
      setMensajeColaborador("No se pudo guardar el cambio. Comprueba tus permisos e inténtalo de nuevo.");
    } finally {
      setGuardandoColaborador(false);
    }
  };

  const cambiarVisibilidadListado = async () => {
    if (!empleadoIdSeleccionado || !empleadoBasico || guardandoVisibilidad) return;
    const nuevoValor = empleadoBasico.visible_en_listado === false;
    setGuardandoVisibilidad(true);
    setMensajeVisibilidad("");
    try {
      await editarEmpleado(empleadoIdSeleccionado, { visible_en_listado: nuevoValor });
      setMensajeVisibilidad(nuevoValor
        ? "Usuario visible de nuevo en los listados."
        : "Usuario ocultado de los listados. Seguirá disponible en Seguridad.");
      setVersionListado((v) => v + 1);
      await cargarTodo();
      await cargarFicha(empleadoIdSeleccionado);
    } catch (error) {
      setMensajeVisibilidad(error?.response?.data?.detail || error?.message || "No se pudo cambiar la visibilidad del usuario.");
    } finally {
      setGuardandoVisibilidad(false);
    }
  };

  const asignarRolSeleccionado = async (rolId) => {
    if (!empleadoIdSeleccionado || !rolId || guardandoRol) return;
    setGuardandoRol(true);
    setMensajeRol("");
    try {
      await asignarRol(empleadoIdSeleccionado, rolId);
      setMensajeRol("Rol asignado y ficha actualizada.");
    } catch {
      setMensajeRol("No se pudo asignar el rol. Comprueba tus permisos e inténtalo de nuevo.");
    } finally {
      setGuardandoRol(false);
    }
  };

  return (
    <div className="erp-page seguridad-usuarios-premium">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div className="molsan-page-header">

        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__eyebrow">
            SEGURIDAD
          </div>

          <h1 className="molsan-page-header__title">
            Usuarios y seguridad
          </h1>

          <p className="molsan-page-header__description">
            Gestión de usuarios, permisos, estado de acceso,
            auditoría y actividad de seguridad.
          </p>
        </div>

        <div className="molsan-page-header__actions">
          <span className="erp-badge erp-badge-primary">
            Centro de Seguridad
          </span>
        </div>

      </div>

      {/* ======================================================
          CONTENIDO PRINCIPAL
      ====================================================== */}

      <div className="seguridad-usuarios-layout grid grid-cols-1 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,2fr)] gap-6">

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
              key={versionListado}
              incluirOcultos
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

                      <button type="button" onClick={() => setMostrarModalEdicion(true)} className="erp-btn erp-btn-primary">Editar datos del usuario</button>
                      <button type="button" onClick={cambiarVisibilidadListado} disabled={guardandoVisibilidad || loading} className="erp-btn erp-btn-secondary">
                        {guardandoVisibilidad ? "Guardando…" : empleadoBasico?.visible_en_listado === false ? "Mostrar en listados" : "Ocultar de los listados"}
                      </button>
                      {mensajeVisibilidad && <p className="w-full text-sm text-[var(--erp-muted)]" role="status">{mensajeVisibilidad}</p>}

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

                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] px-3 py-2">
                        <span className="text-sm font-semibold text-[var(--erp-text)]">
                          Colaborador de ApoderaGest
                        </span>
                        <span className={empleadoBasicoSeguro.es_colaborador ? "erp-badge erp-badge-success" : "erp-badge erp-badge-neutral"}>
                          {empleadoBasicoSeguro.es_colaborador ? "Sí" : "No"}
                        </span>
                        <button
                          type="button"
                          onClick={cambiarColaboradorApoderaGest}
                          disabled={guardandoColaborador || loading}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${empleadoBasicoSeguro.es_colaborador
                            ? "border-[var(--erp-border)] text-[var(--erp-text)] hover:bg-[var(--erp-bg)]"
                            : "border-[var(--erp-primary)] bg-[var(--erp-primary)] text-white hover:opacity-90"}`}
                        >
                          {guardandoColaborador
                            ? "Guardando…"
                            : empleadoBasicoSeguro.es_colaborador
                              ? "Deshabilitar"
                              : "Habilitar"}
                        </button>
                      </div>
                      {mensajeColaborador && (
                        <p className="w-full text-sm text-[var(--erp-muted)]" role="status">
                          {mensajeColaborador}
                        </p>
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

          {/* Navegación de la ficha integral de seguridad */}
          {empleadoBasicoSeguro && (
            <div className="erp-card">
              <div className="erp-card-body">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de seguridad del empleado">
                  {[
                    { id: "resumen", label: "Resumen", icon: "◈" },
                    { id: "modulos", label: "Módulos", icon: "▦" },
                    { id: "permisos", label: "Permisos", icon: "⚿" },
                    { id: "roles", label: "Roles", icon: "♙" },
                    { id: "auditoria", label: "Auditoría", icon: "◷" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={pestanaActiva === tab.id}
                      onClick={() => setPestanaActiva(tab.id)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${pestanaActiva === tab.id
                        ? "border-[var(--erp-primary)] bg-[var(--erp-primary-soft)] text-[var(--erp-primary)] shadow-sm"
                        : "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-text-soft)] hover:bg-[var(--erp-bg)]"}`}
                    >
                      <span className="mr-2" aria-hidden="true">{tab.icon}</span>{tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="erp-data-item">
                    <span className="erp-data-label">Fecha de seguridad · último cambio registrado</span>
                    <span className="erp-data-value">{fechaSeguridadTexto}</span>
                  </div>
                  <div className="erp-data-item">
                    <span className="erp-data-label">Estado de la cuenta</span>
                    <span className={usuarioActivo ? "erp-badge erp-badge-success w-fit" : "erp-badge erp-badge-danger w-fit"}>
                      {usuarioActivo ? "Acceso activo" : "Acceso inactivo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {pestanaActiva === "resumen" && (
            <>
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

                        {(() => {
                          const rolesFicha = Array.isArray(fichaSegura.roles)
                            ? fichaSegura.roles
                            : [];
                          const rolId = fichaSegura?.empleado?.rol_id ?? fichaSegura?.rol_id;
                          const rolNombre = fichaSegura?.empleado?.rol_nombre ?? fichaSegura?.empleado?.rol?.nombre ?? fichaSegura?.rol_nombre;
                          const rolesMostrar = rolesFicha.length
                            ? rolesFicha
                            : (rolId != null || (typeof rolNombre === "string" && rolNombre.trim()))
                              ? [{ id: rolId ?? "rol-actual", nombre: rolNombre || `Rol #${rolId}` }]
                              : [];
                          return rolesMostrar.length > 0
                            ? rolesMostrar.map((rol, index) => (
                                <span
                                  key={rol?.id ?? rol?.nombre ?? index}
                                  className="erp-badge erp-badge-primary"
                                >
                                  {typeof rol?.nombre === "string" && rol.nombre.trim()
                                    ? rol.nombre
                                    : rol?.id != null ? `Rol #${rol.id}` : "Rol"}
                                </span>
                              ))
                            : <span className="erp-text-muted">Sin roles asignados</span>;
                        })()}

                      </div>

                    </div>

                    {/* PERMISOS */}

                    <div>

                      <div className="erp-section-title">
                        Permisos asignados
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">

                        {(() => {
                          const permisosFicha = Array.isArray(fichaSegura.permisos)
                            ? fichaSegura.permisos
                            : [];
                          const permisosDict = fichaSegura.permisos_modulo_dict ?? fichaSegura.permisos_modulo;
                          const permisosDesdeModulos = permisosDict && typeof permisosDict === "object" && !Array.isArray(permisosDict)
                            ? Object.entries(permisosDict).flatMap(([modulo, acciones]) =>
                                Array.isArray(acciones)
                                  ? acciones.map((accion) => ({ modulo, nombre: accion }))
                                  : []
                              )
                            : [];
                          const permisosMostrar = permisosFicha.length ? permisosFicha : permisosDesdeModulos;
                          return permisosMostrar.length > 0
                            ? permisosMostrar.map((permiso, index) => (
                                <span
                                  key={permiso?.id ?? permiso?.codigo ?? `${permiso?.modulo ?? "modulo"}-${permiso?.nombre ?? permiso?.permiso ?? index}`}
                                  className="erp-badge erp-badge-purple"
                                >
                                  {[
                                    typeof permiso?.modulo === "string" ? permiso.modulo : "",
                                    typeof permiso?.nombre === "string" ? permiso.nombre : typeof permiso?.permiso === "string" ? permiso.permiso : typeof permiso?.codigo === "string" ? permiso.codigo : ""
                                  ].filter(Boolean).join(" · ") || "Permiso"}
                                </span>
                              ))
                            : <span className="erp-text-muted">No hay permisos individuales devueltos por la ficha.</span>;
                        })()}

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
                {Array.isArray(fichaSegura?.roles) && fichaSegura.roles.length
                  ? fichaSegura.roles.length
                  : (fichaSegura?.empleado?.rol_id ?? fichaSegura?.rol_id ?? null) !== null ||
                    Boolean(fichaSegura?.empleado?.rol_nombre ?? fichaSegura?.empleado?.rol?.nombre ?? fichaSegura?.rol_nombre)
                    ? 1
                    : 0}
              </strong>
            </div>

            <div className="erp-stat-card">
              <span className="erp-stat-label">
                Permisos
              </span>

              <strong className="erp-stat-value">
                {Array.isArray(fichaSegura?.permisos) && fichaSegura.permisos.length
                  ? fichaSegura.permisos.length
                  : Object.values(fichaSegura?.permisos_modulo_dict ?? fichaSegura?.permisos_modulo ?? {}).reduce(
                      (total, acciones) => total + (Array.isArray(acciones) ? acciones.length : 0),
                      0
                    )}
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
            </>
          )}

          {pestanaActiva === "modulos" && (
            <div className="erp-card">
              <div className="erp-card-body">
                <SeguridadModulos />
              </div>
            </div>
          )}

          {pestanaActiva === "permisos" && (
            <div className="erp-card">
              <div className="erp-card-body">
                <SeguridadPermisos />
              </div>
            </div>
          )}

          {pestanaActiva === "roles" && (
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Roles del empleado</h2>
                  <p className="erp-card-description">Asigna el rol de acceso que corresponda. El cambio se guarda en el backend y actualiza esta ficha.</p>
                </div>
                <span className="erp-badge erp-badge-neutral">{rolesSeguros.length} roles disponibles</span>
              </div>
              <div className="erp-card-body space-y-4">
                {mensajeRol && (
                  <div className={mensajeRol.startsWith("Rol asignado") ? "erp-alert erp-alert-success" : "erp-alert erp-alert-danger"} role="status">
                    {mensajeRol}
                  </div>
                )}
                <div className="erp-alert erp-alert-info">
                  Rol actual: <strong>{rolesSeguros.find((rol) => Number(rol.id) === rolActualId)?.nombre || fichaSegura?.empleado?.rol_nombre || "Sin rol asignado"}</strong>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rolesSeguros.map((rol) => {
                    const asignado = Number(rol.id) === rolActualId;
                    return (
                      <div key={rol.id ?? rol.nombre} className="rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--erp-text)]">{rol.nombre}</div>
                          <p className="mt-1 text-sm text-[var(--erp-text-soft)]">{typeof rol.descripcion === "string" && rol.descripcion ? rol.descripcion : "Perfil de acceso de ERP-Molsan."}</p>
                          {asignado && <span className="mt-2 inline-flex erp-badge erp-badge-success">Asignado actualmente</span>}
                        </div>
                        <button type="button" className={asignado ? "erp-btn erp-btn-secondary" : "erp-btn erp-btn-primary"} disabled={asignado || guardandoRol || !empleadoIdSeleccionado || !rol.id} onClick={() => asignarRolSeleccionado(rol.id)}>
                          {guardandoRol ? "Guardando…" : asignado ? "Asignado" : "Asignar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {rolesSeguros.length === 0 && <div className="erp-empty-inline">No hay roles disponibles para asignar.</div>}
                <p className="text-xs text-[var(--erp-text-soft)]">Los permisos específicos por módulo se configuran en la pestaña Permisos. La asignación de rol no sustituye las comprobaciones de permisos del backend.</p>
              </div>
            </div>
          )}

          {pestanaActiva === "auditoria" && (
            <div className="erp-card">
              <div className="erp-card-header">
                <div>
                  <h2 className="erp-card-title">Auditoría del empleado</h2>
                  <p className="erp-card-description">Historial de seguridad que devuelve la ficha del empleado.</p>
                </div>
                <span className="erp-badge erp-badge-neutral">{auditoriaEmpleado.length}</span>
              </div>
              <div className="erp-card-body">
                {auditoriaEmpleado.length > 0 ? (
                  <div className="space-y-3">
                    {auditoriaEmpleado.map((item, index) => (
                      <div key={item.id ?? `${item.fecha}-${item.accion}-${index}`} className="erp-activity-item">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--erp-text)]">{item.accion || item.evento || "Evento de seguridad"}</div>
                            <p className="mt-1 text-sm text-[var(--erp-text-soft)] break-words">{item.descripcion || item.detalle || "Sin descripción adicional"}</p>
                            {item.modulo && <span className="mt-2 inline-flex erp-badge erp-badge-neutral">{item.modulo}</span>}
                          </div>
                          <span className="text-xs text-[var(--erp-text-soft)]">{item.fecha || "Fecha no disponible"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="erp-empty-state">
                    <div className="erp-empty-state-icon">◷</div>
                    <div>
                      <h3 className="erp-empty-state-title">Sin eventos de auditoría en la ficha</h3>
                      <p className="erp-empty-state-description">Cuando el backend devuelva eventos asociados a este empleado, aparecerán aquí. No se muestran eventos de otros usuarios para evitar mezclar historiales.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {mostrarModalEdicion && empleadoIdSeleccionado != null && (
        <ModalEmpleado
          open={mostrarModalEdicion}
          empleadoId={empleadoIdSeleccionado}
          onClose={() => { setMostrarModalEdicion(false); setVersionListado((v) => v + 1); cargarTodo(); cargarFicha(empleadoIdSeleccionado); }}
        />
      )}
    </div>
  );
}
