import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import MODULOS_ERP from "../config/modulos";
import { API_BASE } from "../api/config";
import { configurarSesionEncargaGest } from "../api/encargagest";
import "../css/ModalesHerramientasPremium.css";

const CATALOGO_MODULOS = Object.fromEntries(
  MODULOS_ERP.map((modulo) => [modulo.key, modulo])
);

// El catálogo central conserva las claves, etiquetas y rutas.
// Aquí solo se mantiene el contenido editorial propio de cada tarjeta.
const MODULOS = {
  apoderagest: {
    descripcion: "Encargos, firmas y actividad del apoderado.",
    siglas: "AG",
    categoria: "GESTIÓN DE APODERADOS",
    estilo: "ag",
  },
  cancelagest: {
    descripcion: "Gestión y seguimiento de cancelaciones hipotecarias.",
    siglas: "CG",
    categoria: "GESTIÓN DE CANCELACIONES",
    estilo: "cg",
  },
  notargest: {
    descripcion: "Herramientas y operaciones del entorno de notaría.",
    siglas: "NG",
    categoria: "ENTORNO NOTARIAL",
    estilo: "ng",
  },
  encargagest: {
    descripcion: "Portal para que notarías externas envíen y consulten encargos a MOLSAN.",
    siglas: "EG",
    categoria: "PORTAL DE ENCARGOS EXTERNOS",
    estilo: "eg",
  },
  "mensajeria-gestion": {
    descripcion: "Solicitudes, pedidos al proveedor, incidencias, albaranes y facturas de mensajería.",
    siglas: "MG",
    categoria: "GESTIÓN DE MENSAJERÍA",
    estilo: "mg",
  },
  fichajes: {
    descripcion: "Registra tu jornada, pausas, ausencias y consulta tu calendario y justificantes.",
    siglas: "FI",
    categoria: "CONTROL HORARIO DE EMPLEADOS",
    estilo: "fi",
  },
};

const obtenerModuloCatalogo = (clave) => CATALOGO_MODULOS[clave] || null;

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function ModulosSelector() {
  const navigate = useNavigate();
  const empleado = useAuthStore((state) => state.empleado);
  const authReady = useAuthStore((state) => state.authReady);
  const loading = useAuthStore((state) => state.loading);
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const [modalSoporte, setModalSoporte] = useState(null);
  const [notariasSoporte, setNotariasSoporte] = useState([]);
  const [busquedaSoporte, setBusquedaSoporte] = useState("");
  const [cargandoSoporte, setCargandoSoporte] = useState(false);
  const [abriendoNotaria, setAbriendoNotaria] = useState(null);
  const [errorSoporte, setErrorSoporte] = useState("");

  const modulosDisponibles = useMemo(() => {
    if (!empleado) return [];

    // La API puede entregar ambos campos y dejar uno vacío/desactualizado.
    // Unimos los dos para no ocultar módulos asignados como Fichajes.
    const visibles = [
      ...(Array.isArray(empleado.modulos_visibles_list) ? empleado.modulos_visibles_list : []),
      ...(Array.isArray(empleado.modulos_visibles) ? empleado.modulos_visibles : []),
    ].map(normalizar);

    // La sesión puede exponer el rol como texto, como objeto o mediante
    // indicadores booleanos. El saludo "Hola, admin" también puede proceder
    // del nombre mostrado, aunque el campo usuario tenga otro valor.
    const rol = normalizar(
      empleado.rol?.nombre ||
      empleado.rol_nombre ||
      empleado.nombre_rol ||
      empleado.role?.name ||
      (typeof empleado.rol === "string" ? empleado.rol : "")
    ).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    const usuario = normalizar(empleado.usuario);
    // Mantener el mismo criterio estricto que usa la API. Roles operativos
    // como "gestor" o "manager" no deben recibir privilegios administrativos
    // por una coincidencia parcial del nombre del rol.
    const rolesAdministradores = new Set([
      "admin", "administrador", "administradora", "superadmin",
      "super admin", "superadministrador", "super administradora",
      "superuser", "super usuario", "superusuario", "administrador general",
    ]);
    const esAdmin =
      empleado.es_admin === true ||
      empleado.is_admin === true ||
      Number(empleado.rol_id ?? empleado.rol?.id) === 0 ||
      usuario === "admin" ||
      rolesAdministradores.has(rol);

    // El administrador gestiona los fichajes de la plantilla desde Control
    // de Fichajes; no necesita la tarjeta de marcaje personal en este panel.
    const disponibles = Object.keys(MODULOS)
      .filter((clave) => visibles.includes(clave) && !(esAdmin && clave === "fichajes"))
      .map((clave) => {
        const catalogo = obtenerModuloCatalogo(clave);
        if (!catalogo?.route) return null;
        return {
          clave,
          nombre: catalogo.label,
          ruta: catalogo.route,
          ...MODULOS[clave],
        };
      })
      .filter(Boolean);
    // Mensajería Gestión es el espacio administrativo de este módulo:
    // debe aparecer a los administradores aunque no figure en sus módulos
    // personales visibles de la ficha de empleado.
    if (esAdmin && !disponibles.some((modulo) => modulo.clave === "mensajeria-gestion")) {
      disponibles.push({
        clave: "mensajeria-gestion",
        nombre: obtenerModuloCatalogo("mensajeria-gestion")?.label || "Mensajería Gestión",
        descripcion: "Administra solicitudes, pedidos, incidencias, albaranes y facturas de mensajería.",
        ruta: obtenerModuloCatalogo("mensajeria-gestion")?.route,
        siglas: "MG",
        categoria: "GESTIÓN DE MENSAJERÍA",
        estilo: "mg",
      });
    }
    if (esAdmin && visibles.includes("control-fichajes")) {
      disponibles.push({
        clave: "control-fichajes",
        nombre: obtenerModuloCatalogo("control-fichajes")?.label || "Control de Fichajes",
        descripcion: "Supervisión de marcajes de la plantilla y consulta por empleado y periodo.",
        ruta: obtenerModuloCatalogo("control-fichajes")?.route,
        siglas: "CF",
        categoria: "ADMINISTRACIÓN DE JORNADA",
        estilo: "fi",
      });
    }
    if (esAdmin && visibles.includes("notargest")) {
      disponibles.push({ clave: "notargest_notario", nombre: obtenerModuloCatalogo("notargestweb")?.label || "NotarGest Notarios", descripcion: "Acceso de soporte al portal de una notaría habilitada.", siglas: "NN", categoria: "SOPORTE A NOTARÍAS", estilo: "ng", portalSoporte: "notargest" });
    }
    if (esAdmin && visibles.includes("encargagest")) {
      disponibles.push({ clave: "encargagest_notario", nombre: obtenerModuloCatalogo("encargagestweb")?.label || "EncargaGest Notarios", descripcion: "Acceso de soporte al portal de una notaría habilitada.", siglas: "EN", categoria: "SOPORTE A NOTARÍAS", estilo: "eg", portalSoporte: "encargagest" });
    }
    return disponibles;
  }, [empleado]);


  const abrirSelectorSoporte = async (portal) => {
    setModalSoporte(portal);
    setNotariasSoporte([]);
    setBusquedaSoporte("");
    setErrorSoporte("");
    setCargandoSoporte(true);
    try {
      const response = await fetch(API_BASE + "/" + portal + "/seleccion/notarias", {
        headers: { Accept: "application/json", Authorization: "Bearer " + token },
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || "No se ha podido cargar el listado de notarías habilitadas.");
      setNotariasSoporte(Array.isArray(data) ? data : data.items || []);
    } catch (e) {
      setErrorSoporte(e.message || "No se ha podido cargar el listado de notarías.");
    } finally {
      setCargandoSoporte(false);
    }
  };

  const entrarComoNotaria = async (notaria) => {
    if (!modalSoporte || !notaria?.id) return;
    const portal = modalSoporte;
    setAbriendoNotaria(notaria.id);
    setErrorSoporte("");
    try {
      const response = await fetch(API_BASE + "/" + portal + "/seleccion/notaria/" + encodeURIComponent(notaria.id), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + token },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token) throw new Error(data?.detail || "No se ha podido abrir el portal de la notaría.");
      if (portal === "notargest") {
        sessionStorage.setItem("notargest_soporte_token", data.token);
        sessionStorage.setItem("notargest_soporte_notaria", JSON.stringify(data.notaria || notaria));
        setModalSoporte(null);
        navigate("/notargest?modo_soporte=1");
      } else {
        configurarSesionEncargaGest("externo", data.token);
        setModalSoporte(null);
        navigate("/encargagest/notario");
      }
    } catch (e) {
      setErrorSoporte(e.message || "No se ha podido abrir el portal de la notaría.");
    } finally {
      setAbriendoNotaria(null);
    }
  };

  const notariasFiltradas = notariasSoporte.filter((n) => {
    const q = busquedaSoporte.trim().toLocaleLowerCase("es");
    if (!q) return true;
    return [n.nombre, n.nombre_completo, n.nif, n.municipio, n.provincia, n.codigo]
      .some((valor) => String(valor || "").toLocaleLowerCase("es").includes(q));
  });

  if (!authReady || loading) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-sm text-slate-500" role="status">
        Cargando sesión…
      </div>
    );
  }

  if (!empleado) {
    return <Navigate to="/login" replace />;
  }

  const iconosModulo = {
    apoderagest: <><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="8"/></>,
    cancelagest: <><path d="M4 7h16M7 4v6m10-6v6M5 11h14v9H5z"/><path d="m9 15 2 2 4-4"/></>,
    notargest: <><path d="M4 21h16M6 21V8l6-4 6 4v13"/><path d="M9 12h6M9 16h6"/></>,
    encargagest: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5M8 17h3"/><path d="m15 16 2 2 4-4"/></>,
    "mensajeria-gestion": <><path d="M4 5h16v12H9l-5 4z"/><path d="M8 9h8M8 13h5"/></>,
    fichajes: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    "control-fichajes": <><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></>,
    notargest_notario: <><path d="M4 21h16M6 21V8l6-4 6 4v13"/><path d="M9 12h6M9 16h6"/></>,
    encargagest_notario: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></>,
  };
  const coloresModulo = {
    apoderagest: "ocean", cancelagest: "emerald", notargest: "violet",
    encargagest: "amber", "mensajeria-gestion": "cyan", fichajes: "indigo",
    "control-fichajes": "indigo", notargest_notario: "violet", encargagest_notario: "amber",
  };

  return (
    <main className="selector-modulos-premium workspace-premium">
      <section className="workspace-hero">
        <div className="workspace-hero-orb workspace-hero-orb-one" aria-hidden="true" />
        <div className="workspace-hero-orb workspace-hero-orb-two" aria-hidden="true" />
        <div className="workspace-hero-content">
          <div className="workspace-brand-lockup">
            <span className="workspace-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48"><path d="M8 36V12l16 14L40 12v24M8 12l16 14 16-14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span><strong>MOLSAN</strong><small>ERP · PREMIUM 2027</small></span>
          </div>
          <p className="workspace-eyebrow">CENTRO DE OPERACIONES</p>
          <h1>Tu espacio de trabajo</h1>
          <p className="workspace-welcome">Hola, {empleado.nombre || empleado.usuario}. Aquí tienes tus aplicaciones y herramientas de trabajo.</p>
          <div className="workspace-hero-meta">
            <span className="workspace-live-dot" />
            Sesión iniciada
            <span className="workspace-meta-divider" />
            {modulosDisponibles.length} {modulosDisponibles.length === 1 ? "aplicación disponible" : "aplicaciones disponibles"}
          </div>
        </div>
        <div className="workspace-hero-actions">
          <div className="workspace-user-chip">
            <span className="workspace-user-avatar">{String(empleado.nombre || empleado.usuario || "U").trim().charAt(0).toLocaleUpperCase("es")}</span>
            <span><strong>{empleado.nombre || empleado.usuario}</strong><small>Área de trabajo</small></span>
          </div>
          <button type="button" onClick={() => { logout(); navigate("/login", { replace: true }); }} className="workspace-logout">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m9 8h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-7" /></svg>
            Cerrar sesión
          </button>
        </div>
      </section>

      <section className="workspace-apps-section" aria-labelledby="workspace-apps-title">
        <div className="workspace-section-heading">
          <div>
            <span className="workspace-section-kicker">ACCESO APLICACIONES</span>
            <h2 id="workspace-apps-title">Tus aplicaciones</h2>
            <p>Selecciona un espacio para continuar con tu trabajo.</p>
          </div>
          <span className="workspace-app-count">{modulosDisponibles.length} disponibles</span>
        </div>

        {modulosDisponibles.length === 0 ? (
          <section className="workspace-empty-state">
            <span className="workspace-empty-icon"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg></span>
            <h2>No hay aplicaciones asignadas</h2>
            <p>Para mostrar una aplicación, actívala en «Módulos visibles» dentro de la ficha del empleado. Los permisos para consultar, crear, editar o eliminar se configuran por separado.</p>
            <small>Rol detectado: {empleado.rol_nombre || empleado.rol?.nombre || "No informado"}</small>
          </section>
        ) : (
          <div className="workspace-app-grid">
            {modulosDisponibles.map((modulo) => {
              const color = coloresModulo[modulo.clave] || "ocean";
              return (
                <button key={modulo.clave} type="button"
                  onClick={() => modulo.portalSoporte ? abrirSelectorSoporte(modulo.portalSoporte) : navigate(modulo.ruta)}
                  className={`workspace-app-card workspace-tone-${color}`}>
                  <span className="workspace-card-accent" aria-hidden="true" />
                  <span className="workspace-card-topline">
                    <span className="workspace-app-icon molsan-icon-3d" aria-hidden="true">
                      <svg viewBox="0 0 24 24">{iconosModulo[modulo.clave] || iconosModulo.apoderagest}</svg>
                    </span>
                    <span className="workspace-card-open" aria-hidden="true">
                      <svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg>
                    </span>
                  </span>
                  <span className="workspace-app-category">{modulo.categoria}</span>
                  <span className="workspace-app-title">{modulo.nombre}</span>
                  <span className="workspace-app-description">{modulo.descripcion}</span>
                  <span className="workspace-card-footer">
                    <span>Abrir aplicación</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      <footer className="workspace-footer">
        <span className="workspace-footer-mark">M</span>
        <span>MOLSAN ERP</span>
        <span className="workspace-footer-separator">·</span>
        <span>Entorno corporativo de gestión</span>
      </footer>

      {modalSoporte && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !abriendoNotaria) setModalSoporte(null); }}>
          <section className="flex max-h-[min(86vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="soporte-notaria-titulo">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] text-blue-700">ACCESO DE SOPORTE</p>
                <h2 id="soporte-notaria-titulo" className="mt-1 text-xl font-extrabold text-slate-900">{modalSoporte === "notargest" ? "NotarGest – Notarios" : "EncargaGest – Notarios"}</h2>
                <p className="mt-1 text-sm text-slate-500">Solo aparecen notarías con el acceso a este portal habilitado.</p>
              </div>
              <button type="button" onClick={() => setModalSoporte(null)} disabled={Boolean(abriendoNotaria)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Cerrar">✕</button>
            </header>
            <div className="border-b border-slate-100 p-5">
              <label className="relative block">
                <span className="sr-only">Buscar notaría</span>
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
                <input value={busquedaSoporte} onChange={(e) => setBusquedaSoporte(e.target.value)} autoFocus placeholder="Buscar por nombre, NIF, municipio o provincia…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {cargandoSoporte ? (
                <p className="p-8 text-center text-sm text-slate-500">Cargando notarías habilitadas…</p>
              ) : errorSoporte ? (
                <div className="m-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{errorSoporte}</div>
              ) : notariasFiltradas.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">{notariasSoporte.length ? "No hay coincidencias con la búsqueda." : "No hay notarías habilitadas para este portal."}</p>
              ) : (
                <ul className="space-y-2">
                  {notariasFiltradas.map((n) => (
                    <li key={n.id}>
                      <button type="button" disabled={Boolean(abriendoNotaria)} onClick={() => entrarComoNotaria(n)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/60 disabled:cursor-wait disabled:opacity-60">
                        <span className={"grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-black " + (modalSoporte === "notargest" ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800")}>{modalSoporte === "notargest" ? "NG" : "EG"}</span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm text-slate-900">{n.nombre || n.nombre_completo || ("Notaría " + n.id)}</strong>
                          <span className="mt-1 block text-xs text-slate-500">{[n.nif, n.municipio, n.provincia].filter(Boolean).join(" · ") || "Datos adicionales no disponibles"}</span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-blue-700">{abriendoNotaria === n.id ? "Abriendo…" : "Acceder →"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <footer className="flex justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <span className="self-center text-xs text-slate-500">{notariasSoporte.length} notarías habilitadas</span>
              <button type="button" onClick={() => setModalSoporte(null)} disabled={Boolean(abriendoNotaria)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
