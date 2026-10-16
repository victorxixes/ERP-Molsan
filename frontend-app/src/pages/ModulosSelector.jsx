
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

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
};

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function tienePermisoVer(permisos, clave) {
  const permiso = permisos?.[clave] ?? permisos?.["*"];

  if (Array.isArray(permiso)) {
    return permiso.some((accion) => normalizar(accion) === "ver");
  }

  if (permiso && typeof permiso === "object") {
    return (
      permiso.ver === true ||
      permiso.ver === 1 ||
      normalizar(permiso.ver) === "true"
    );
  }

  if (typeof permiso === "string") {
    return normalizar(permiso) === "ver";
  }

  return false;
}

export default function ModulosSelector() {
  const navigate = useNavigate();
  const empleado = useAuthStore((state) => state.empleado);

  const modulosDisponibles = useMemo(() => {
    if (!empleado) return [];

    const rol = normalizar(
      empleado.rol_nombre || empleado.rol?.nombre
    );

    const visiblesRaw =
      empleado.modulos_visibles_list ?? empleado.modulos_visibles;

    const visibles = Array.isArray(visiblesRaw)
      ? visiblesRaw.map(normalizar)
      : [];

    const permisos =
      empleado.permisos_modulo_dict ||
      empleado.permisos_modulo ||
      {};

    let candidatos;

    if (rol.includes("director")) {
      candidatos = ["apoderagest", "cancelagest", "notargest"];
    } else if (rol.includes("apoderado")) {
      candidatos = ["apoderagest", "cancelagest"];
    } else {
      candidatos = Object.keys(MODULOS);
    }

    return candidatos
      .filter((clave) => visibles.includes(clave))
      .filter((clave) => tienePermisoVer(permisos, clave))
      .map((clave) => ({ clave, ...MODULOS[clave] }));
  }, [empleado]);

  if (!empleado) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-sm text-slate-500">
        Cargando sesión…
      </div>
    );
  }

  return (
    <main className="relative isolate min-h-[calc(100vh-110px)] overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/70 px-5 py-8 text-slate-800 shadow-sm sm:px-8 sm:py-10">
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

        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sesión activa
        </span>
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
            Comprueba en la ficha del empleado los módulos visibles y que el permiso «ver» esté activado.
          </p>
          <p className="mt-3 break-all text-xs text-amber-800">
            Rol detectado: {empleado.rol_nombre || empleado.rol?.nombre || "No informado"}
          </p>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modulosDisponibles.map((modulo) => (
              <button
                key={modulo.clave}
                type="button"
                onClick={() => navigate(modulo.ruta)}
                className="group relative flex min-h-[235px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 p-6 text-left shadow-[0_8px_26px_rgba(31,48,79,0.045)] transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_38px_rgba(31,48,79,0.11)] focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1 ${
                    modulo.estilo === "ag"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-400"
                      : modulo.estilo === "cg"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-400"
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
    </main>
  );
}
