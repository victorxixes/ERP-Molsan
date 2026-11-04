import { useEffect, useMemo, useState } from "react";
import { useSeguridad } from "../../hooks/useSeguridad";
import ModalEmpleado from "../../components/empleados/ModalEmpleado";
import { useAuthStore } from "../../store/authStore";

/**
 * Administración centralizada de visibilidad de tablas y asignaciones.
 * Presenta a los empleados en un listado y permite abrir su ficha o
 * acceder directamente a la configuración de la sección actual.
 */
export default function AdministracionEmpleadoConfig({ seccion = "visibilidad-tablas" }) {
  const { empleados, cargarTodo, loading } = useSeguridad();
  const usuarioSesion = useAuthStore((state) => state.empleado);
  const rol = String(usuarioSesion?.rol_nombre || usuarioSesion?.rol?.nombre || usuarioSesion?.rol || "").toLowerCase();
  const esAdministrador = Number(usuarioSesion?.rol_id ?? usuarioSesion?.rol?.id) === 0
    || String(usuarioSesion?.usuario || "").trim().toLowerCase() === "admin"
    || /admin|administrador|superusuario|superuser|root/.test(rol);
  const [busqueda, setBusqueda] = useState("");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState("configuracion");

  useEffect(() => {
    if (esAdministrador) cargarTodo();
  }, [cargarTodo, esAdministrador]);

  const esAsignaciones = seccion === "asignaciones";
  const titulo = esAsignaciones ? "Asignaciones de empleados" : "Visibilidad de tablas";
  const descripcion = esAsignaciones
    ? "Localiza a un empleado y accede directamente a sus reglas de reparto y asignación."
    : "Localiza a un empleado y configura las columnas y la visibilidad asociadas a sus actividades.";

  const empleadosSeguros = useMemo(
    () => (Array.isArray(empleados) ? empleados.filter((e) => e && e.id != null) : []),
    [empleados]
  );
  const empleadosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    if (!termino) return empleadosSeguros;
    return empleadosSeguros.filter((empleado) => [
      empleado.nombre, empleado.apellidos, empleado.usuario, empleado.dni,
      empleado.email_empresa, empleado.departamento, empleado.departamento_nombre,
      empleado.cargo, empleado.cargo_nombre, empleado.id,
    ].filter((valor) => valor !== null && valor !== undefined)
      .join(" ").toLocaleLowerCase("es").includes(termino));
  }, [empleadosSeguros, busqueda]);

  const abrirModal = (empleado, modo) => {
    setEmpleadoSeleccionado(empleado);
    setModoModal(modo);
    setModalAbierto(true);
  };

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
    <div className="molsan-page-stack min-h-full">
      <header className="molsan-page-header">
        <p className="molsan-page-header__eyebrow">Utilidades · Administración de empleados</p>
        <h1 className="molsan-page-header__title">{titulo}</h1>
        <p className="molsan-page-header__description">{descripcion}</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Listado de empleados</h2>
            <p className="mt-1 text-xs text-slate-500">
              {loading ? "Cargando empleados…" : `${empleadosFiltrados.length} de ${empleadosSeguros.length} empleados`}
            </p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Buscar empleado</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, usuario, DNI…"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {loading && empleadosSeguros.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Cargando listado de empleados…</div>
        ) : empleadosSeguros.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-700">No hay empleados para mostrar.</p>
            <p className="mt-1 text-sm text-slate-500">Comprueba los permisos de administración y vuelve a cargar la página.</p>
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No hay empleados que coincidan con la búsqueda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                  <th className="border-r border-slate-200 px-4 py-3 font-bold">ID</th>
                  <th className="border-r border-slate-200 px-4 py-3 font-bold">Empleado</th>
                  <th className="border-r border-slate-200 px-4 py-3 font-bold">Usuario</th>
                  <th className="border-r border-slate-200 px-4 py-3 font-bold">Departamento</th>
                  <th className="border-r border-slate-200 px-4 py-3 font-bold">Cargo</th>
                  <th className="border-r border-slate-200 px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleadosFiltrados.map((empleado, indice) => {
                  const nombre = [empleado.nombre, empleado.apellidos].filter(Boolean).join(" ").trim() || "Empleado sin nombre";
                  const departamento = empleado.departamento_nombre || empleado.departamento || empleado.nombre_departamento || "—";
                  const cargo = empleado.cargo_nombre || empleado.cargo || empleado.puesto || "—";
                  const activo = empleado.activo !== false;
                  return (
                    <tr key={empleado.id} className={`border-b border-slate-200 last:border-b-0 transition-colors hover:bg-blue-50/60 ${indice % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="border-r border-slate-100 px-4 py-3 font-mono text-xs text-slate-500">{empleado.id}</td>
                      <td className="border-r border-slate-100 px-4 py-3">
                        <div className="font-semibold text-slate-800">{nombre}</div>
                        {empleado.email_empresa && <div className="mt-0.5 text-xs text-slate-500">{empleado.email_empresa}</div>}
                      </td>
                      <td className="border-r border-slate-100 px-4 py-3 text-slate-600">{empleado.usuario || "—"}</td>
                      <td className="border-r border-slate-100 px-4 py-3 text-slate-600">{departamento}</td>
                      <td className="border-r border-slate-100 px-4 py-3 text-slate-600">{cargo}</td>
                      <td className="border-r border-slate-100 px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${activo ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => abrirModal(empleado, "ficha")} className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                            Abrir ficha
                          </button>
                          <button type="button" onClick={() => abrirModal(empleado, "configuracion")} className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700">
                            Ir a configuración
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Puedes abrir la ficha o ir directamente a la configuración de {esAsignaciones ? "asignaciones" : "visibilidad de tablas"} desde cada fila.
        </div>
      </section>

      {modalAbierto && empleadoSeleccionado && (
        <ModalEmpleado
          open={true}
          empleadoId={Number(empleadoSeleccionado.id)}
          modoAdministracion={modoModal === "configuracion"}
          pestanaInicial={modoModal === "configuracion" ? seccion : "basicos"}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
}
