import { useEffect, useState } from "react";
import { useSeguridad } from "../../hooks/useSeguridad";
import ModalEmpleado from "../../components/empleados/ModalEmpleado";
import { useAuthStore } from "../../store/authStore";

/**
 * Panel administrativo de empleado reutilizado desde Utilidades.
 * La ficha ordinaria conserva los datos propios del empleado; las herramientas
 * de configuración se abren aquí y requieren permisos de administrador.
 */
export default function AdministracionEmpleadoConfig({ seccion = "visibilidad-tablas" }) {
  const { empleados, cargarTodo, loading } = useSeguridad();
  const usuarioSesion = useAuthStore((state) => state.empleado);
  const rol = String(usuarioSesion?.rol_nombre || usuarioSesion?.rol?.nombre || usuarioSesion?.rol || "").toLowerCase();
  const esAdministrador = Number(usuarioSesion?.rol_id ?? usuarioSesion?.rol?.id) === 0
    || String(usuarioSesion?.usuario || "").trim().toLowerCase() === "admin"
    || /admin|administrador|superusuario|superuser|root/.test(rol);
  const [empleadoId, setEmpleadoId] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    if (esAdministrador) cargarTodo();
  }, [cargarTodo, esAdministrador]);

  const titulo = seccion === "asignaciones" ? "Asignaciones de empleados" : "Visibilidad de tablas";
  const descripcion = seccion === "asignaciones"
    ? "Selecciona un empleado y administra las reglas de reparto y asignación desde este panel central."
    : "Selecciona un empleado para configurar las columnas y la visibilidad asociadas a sus actividades.";

  const empleadosSeguros = Array.isArray(empleados) ? empleados.filter((e) => e && e.id != null) : [];

  if (!esAdministrador) {
    return (
      <div className="p-6">
        <section className="max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-bold text-amber-900">Acceso restringido</h1>
          <p className="mt-2 text-sm text-amber-800">Solo un administrador puede gestionar la visibilidad de tablas y las asignaciones de empleados.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">Utilidades · Administración de empleados</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{titulo}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">{descripcion}</p>
      </header>

      <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="empleado-configuracion" className="block text-sm font-semibold text-slate-800">Empleado</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <select
            id="empleado-configuracion"
            value={empleadoId}
            onChange={(event) => { setEmpleadoId(event.target.value); setModalAbierto(false); }}
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800"
          >
            <option value="">{loading ? "Cargando empleados…" : "Seleccionar empleado…"}</option>
            {empleadosSeguros.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {[
                  [empleado.nombre, empleado.apellidos].filter(Boolean).join(" ").trim(),
                  empleado.usuario ? "(" + empleado.usuario + ")" : "",
                  "ID " + empleado.id,
                ].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!empleadoId}
            onClick={() => setModalAbierto(true)}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Abrir configuración
          </button>
        </div>
        {!loading && empleadosSeguros.length === 0 && (
          <p className="mt-3 text-sm text-amber-700">No se ha recibido el listado de empleados. Comprueba los permisos de administración y vuelve a cargar la página.</p>
        )}
      </section>

      {modalAbierto && empleadoId && (
        <ModalEmpleado
          open={true}
          empleadoId={Number(empleadoId)}
          modoAdministracion={true}
          pestanaInicial={seccion}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
