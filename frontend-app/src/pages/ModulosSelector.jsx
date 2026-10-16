
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const MODULOS = {
  apoderagest: {
    nombre: "ApoderaGest",
    descripcion: "Gestión de encargos, firmas y actividad del apoderado.",
    ruta: "/apoderagest",
    simbolo: "ApoderaGest",
  },
  cancelagest: {
    nombre: "CancelaGest",
    descripcion: "Gestión de cancelaciones hipotecarias.",
    ruta: "/cancelagest",
    simbolo: "CancelaGest",
  },
  notargest: {
    nombre: "Notargest",
    descripcion: "Gestión del entorno de notaría.",
    ruta: "/notargest",
    simbolo: "NotarGest",
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

    const esDirector = rol.includes("director");
    const esApoderado = rol.includes("apoderado");

    const visibles = Array.isArray(empleado.modulos_visibles_list)
      ? empleado.modulos_visibles_list.map(normalizar)
      : Array.isArray(empleado.modulos_visibles)
        ? empleado.modulos_visibles.map(normalizar)
        : [];

    const permisos =
      empleado.permisos_modulo_dict ||
      empleado.permisos_modulo ||
      {};

    let candidatos;

    if (esDirector) {
      candidatos = ["apoderagest", "cancelagest", "notargest"];
    } else if (esApoderado) {
      candidatos = ["apoderagest", "cancelagest"];
    } else {
      // Para roles con otro nombre, manda la configuración explícita
      // de módulos visibles del empleado.
      candidatos = Object.keys(MODULOS);
    }

    return candidatos
      .filter((clave) => visibles.includes(clave))
      .filter((clave) => tienePermisoVer(permisos, clave))
      .map((clave) => ({ clave, ...MODULOS[clave] }));
  }, [empleado]);

  if (!empleado) {
    return <p className="p-8 text-slate-600">Cargando sesión…</p>;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
          MOLSAN ERP
        </p>
        <h1 className="text-3xl font-bold text-slate-900">
          Selecciona un módulo
        </h1>
        <p className="mt-2 text-slate-500">
          Hola, {empleado.nombre || empleado.usuario}.
        </p>
      </header>

      {modulosDisponibles.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="font-bold">No se han encontrado módulos autorizados</h2>
          <p className="mt-2 text-sm">
            Revisa los módulos visibles y el permiso «ver» de este empleado.
            No se han modificado sus permisos.
          </p>
          <p className="mt-3 text-xs">
            Rol detectado: {empleado.rol_nombre || empleado.rol?.nombre || "No informado"}
          </p>
          <p className="mt-1 break-all text-xs">
            Módulos visibles: {JSON.stringify(empleado.modulos_visibles_list || empleado.modulos_visibles || [])}
          </p>
          <p className="mt-1 break-all text-xs">
            Permisos: {JSON.stringify(empleado.permisos_modulo_dict || empleado.permisos_modulo || {})}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-5 rounded-xl bg-slate-800 px-4 py-2 text-white"
          >
            Volver al Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modulosDisponibles.map((modulo) => (
            <button
              key={modulo.clave}
              type="button"
              onClick={() => navigate(modulo.ruta)}
              className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-extrabold text-blue-700">
                {modulo.simbolo}
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {modulo.nombre}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {modulo.descripcion}
              </p>
              <div className="mt-6 border-t border-slate-100 pt-4 font-semibold text-blue-700">
                Entrar al módulo →
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
