
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const MODULOS = {
  apoderagest: {
    nombre: "ApoderaGest",
    descripcion: "Gestión de encargos, firmas y actividad del apoderado.",
    ruta: "/apoderagest",
    simbolo: "AG",
  },
  cancelagest: {
    nombre: "CancelaGest",
    descripcion: "Gestión de cancelaciones hipotecarias.",
    ruta: "/cancelagest",
    simbolo: "CG",
  },
  notargest: {
    nombre: "Notargest",
    descripcion: "Gestión del entorno de notaría.",
    ruta: "/notargest",
    simbolo: "NG",
  },
};

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function tienePermisoVer(permisos, clave) {
  const permiso = permisos?.[clave];

  if (Array.isArray(permiso)) {
    return permiso.some(
      (accion) => normalizarTexto(accion) === "ver"
    );
  }

  if (permiso && typeof permiso === "object") {
    return permiso.ver === true;
  }

  return false;
}

export default function ModulosSelector() {
  const navigate = useNavigate();
  const empleado = useAuthStore((state) => state.empleado);

  const modulosDisponibles = useMemo(() => {
    if (!empleado) return [];

    const rol = normalizarTexto(empleado.rol_nombre);
    const esApoderado = rol.includes("apoderado");
    const esDirector = rol.includes("director");

    let permitidosPorPerfil = [];

    if (esDirector) {
      permitidosPorPerfil = [
        "apoderagest",
        "cancelagest",
        "notargest",
      ];
    } else if (esApoderado) {
      permitidosPorPerfil = [
        "apoderagest",
        "cancelagest",
      ];
    } else {
      return [];
    }

    const visibles = empleado.modulos_visibles_list;
    const permisos = empleado.permisos_modulo_dict;

    if (!Array.isArray(visibles)) return [];

    return permitidosPorPerfil
      .filter((clave) => visibles.includes(clave))
      .filter((clave) => tienePermisoVer(permisos, clave))
      .map((clave) => ({
        clave,
        ...MODULOS[clave],
      }));
  }, [empleado]);

  useEffect(() => {
    if (!empleado) return;

    if (modulosDisponibles.length === 0) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (modulosDisponibles.length === 1) {
      navigate(modulosDisponibles[0].ruta, { replace: true });
    }
  }, [empleado, modulosDisponibles, navigate]);

  if (!empleado || modulosDisponibles.length <= 1) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Preparando tus módulos…
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-9">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
          MOLSAN ERP
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Selecciona un módulo
        </h1>

        <p className="mt-2 text-slate-500">
          Hola, {empleado.nombre || empleado.usuario}. Selecciona el
          espacio de trabajo al que quieres acceder.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {modulosDisponibles.map((modulo) => (
          <button
            key={modulo.clave}
            type="button"
            onClick={() => navigate(modulo.ruta)}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-extrabold text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
              {modulo.simbolo}
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              {modulo.nombre}
            </h2>

            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
              {modulo.descripcion}
            </p>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700">
              <span>Entrar al módulo</span>
              <span aria-hidden="true" className="text-lg transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
