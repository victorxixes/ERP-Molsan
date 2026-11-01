import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { API_BASE } from "../api/config";
import { configurarSesionEncargaGest } from "../api/encargagest";
import "../css/ModalesHerramientasPremium.css";

const MODULOS = {
  apoderagest: {
    nombre: "ApoderaGest",
    descripcion: "Encargos, firmas y actividad del apoderado.",
    ruta: "/apoderagest",
    siglas: "AG",
    categoria: "GESTIÓN DE APODERADOS",
    estilo: "ag",
  },
  cancelagest: {
    nombre: "CancelaGest",
    descripcion: "Gestión y seguimiento de cancelaciones hipotecarias.",
    ruta: "/cancelagest",
    siglas: "CG",
    categoria: "GESTIÓN DE CANCELACIONES",
    estilo: "cg",
  },
  notargest: {
    nombre: "Notargest",
    descripcion: "Herramientas y operaciones del entorno de notaría.",
    ruta: "/notargest",
    siglas: "NG",
    categoria: "ENTORNO NOTARIAL",
    estilo: "ng",
  },
  encargagest: {
    nombre: "EncargaGest",
    descripcion: "Portal para que notarías externas envíen y consulten encargos a MOLSAN.",
    ruta: "/encargagest",
    siglas: "EG",
    categoria: "PORTAL DE ENCARGOS EXTERNOS",
    estilo: "eg",
  },
  "mensajeria-gestion": {
    nombre: "Mensajería Gestión",
    descripcion: "Solicitudes, pedidos al proveedor, incidencias, albaranes y facturas de mensajería.",
    ruta: "/mensajeria-gestion",
    siglas: "MG",
    categoria: "GESTIÓN DE MENSAJERÍA",
    estilo: "mg",
  },
  fichajes: {
    nombre: "Fichajes",
    descripcion: "Registra tu jornada, pausas, ausencias y consulta tu calendario y justificantes.",
    ruta: "/fichajes",
    siglas: "FI",
    categoria: "CONTROL HORARIO DE EMPLEADOS",
    estilo: "fi",
  },
};

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
      usuario === "admin" ||
      rolesAdministradores.has(rol);

    // El administrador gestiona los fichajes de la plantilla desde Control
    // de Fichajes; no necesita la tarjeta de marcaje personal en este panel.
    const disponibles = Object.keys(MODULOS)
      .filter((clave) => visibles.includes(clave) && !(esAdmin && clave === "fichajes"))
      .map((clave) => ({ clave, ...MODULOS[clave] }));
    // Mensajería Gestión es el espacio administrativo de este módulo:
    // debe aparecer a los administradores aunque no figure en sus módulos
    // personales visibles de la ficha de empleado.
    if (esAdmin && !disponibles.some((modulo) => modulo.clave === "mensajeria-gestion")) {
      disponibles.push({
        clave: "mensajeria-gestion",
        nombre: "Mensajería Gestión",
        descripcion: "Administra solicitudes, pedidos, incidencias, albaranes y facturas de mensajería.",
        ruta: "/mensajeria-gestion",
        siglas: "MG",
        categoria: "GESTIÓN DE MENSAJERÍA",
        estilo: "mg",
      });
    }
    if (esAdmin && visibles.includes("control-fichajes")) {
      disponibles.push({
        clave: "control-fichajes",
        nombre: "Control de Fichajes",
        descripcion: "Supervisión de marcajes de la plantilla y consulta por empleado y periodo.",
        ruta: "/control-fichajes",
        siglas: "CF",
        categoria: "ADMINISTRACIÓN DE JORNADA",
        estilo: "fi",
      });
    }
    if (esAdmin && visibles.includes("notargest")) {
      disponibles.push({ clave: "notargest_notario", nombre: "NotarGest – Notarios", descripcion: "Acceso de soporte al portal de una notaría habilitada.", siglas: "NN", categoria: "SOPORTE A NOTARÍAS", estilo: "ng", portalSoporte: "notargest" });
    }
    if (esAdmin && visibles.includes("encargagest")) {
      disponibles.push({ clave: "encargagest_notario", nombre: "EncargaGest – Notarios", descripcion: "Acceso de soporte al portal de una notaría habilitada.", siglas: "EN", categoria: "SOPORTE A NOTARÍAS", estilo: "eg", portalSoporte: "encargagest" });
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

  return (
    <main className="selector-modulos-premium herramientas-subpagina-premium relative isolate min-h-[calc(100vh-110px)] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/70 px-5 py-8 text-slate-800 shadow-sm sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border border-blue-100/70"
      />

      <header className="mb-9 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white bg-gradient-to-br from-blue-600 to-indigo-800 text-sm font-black tracking-wide text-white shadow-lg shadow-blue-900/15">
            M
          </div>
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-blue-700">
              MOLSAN ERP · PREMIUM 2027
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Espacio de trabajo
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Hola, {empleado.nombre || empleado.usuario}. Selecciona el módulo al que quieres acceder.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sesión activa
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-extrabold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-rose-100"
          >
            <span aria-hidden="true">↪</span>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mb-5">
        <p className="text-[10px] font-extrabold tracking-[0.17em] text-slate-400">
          TUS APLICACIONES
        </p>
        <div className="mt-3 h-px bg-gradient-to-r from-blue-200 via-slate-200 to-transparent" />
      </div>

      {modulosDisponibles.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6">
          <h2 className="font-bold text-amber-950">
            No hay módulos disponibles para esta cuenta
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Para mostrar una aplicación, márcala en «Módulos visibles» dentro de la ficha del empleado. Los permisos para consultar, crear, editar o eliminar se configuran por separado.
          </p>
          <p className="mt-3 break-all text-xs text-amber-800">
            Rol detectado: {empleado.rol_nombre || empleado.rol?.nombre || "No informado"}
          </p>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {modulosDisponibles.map((modulo) => (
              <button
                key={modulo.clave}
                type="button"
                onClick={() => modulo.portalSoporte ? abrirSelectorSoporte(modulo.portalSoporte) : navigate(modulo.ruta)}
                className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-6 text-left shadow-[0_8px_26px_rgba(31,48,79,0.045)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_38px_rgba(31,48,79,0.11)] focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1 ${
                    modulo.estilo === "ag"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-400"
                      : modulo.estilo === "cg"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-400"
                        : modulo.estilo === "eg"
                          ? "bg-gradient-to-r from-amber-500 to-yellow-300"
                          : "bg-gradient-to-r from-violet-600 to-fuchsia-400"
                  }`}
                />

                <div className="flex w-full items-start justify-between gap-4">
                  <div
                    className={`grid h-14 w-14 place-items-center rounded-2xl border text-sm font-black tracking-wide transition group-hover:scale-[1.04] ${
                      modulo.estilo === "ag"
                        ? "border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-800"
                        : modulo.estilo === "cg"
                          ? "border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800"
                          : modulo.estilo === "eg"
                            ? "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-800"
                            : "border-violet-100 bg-gradient-to-br from-violet-50 to-fuchsia-100 text-violet-800"
                    }`}
                  >
                    {modulo.siglas}
                  </div>
                  <span className="mt-1 grid h-8 w-8 place-items-center rounded-full border border-slate-100 text-lg text-slate-400 transition group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-700">
                    ↗
                  </span>
                </div>

                <p className="mt-5 text-[9px] font-extrabold tracking-[0.15em] text-slate-400">
                  {modulo.categoria}
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                  {modulo.nombre}
                </h2>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {modulo.descripcion}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[11px] font-extrabold text-blue-700">
                    Abrir aplicación
                  </span>
                  <span className="text-sm text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-7 text-center text-[10px] font-medium tracking-wide text-slate-400">
            MOLSAN ERP · Entorno corporativo de gestión
          </p>
        </>
      )}

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
