import { useEffect, useMemo, useState } from "react";
import { useSeguridad } from "../../hooks/useSeguridad";
import ModalEmpleado from "../../components/empleados/ModalEmpleado";
import { useAuthStore } from "../../store/authStore";
import "../../css/ComponentesOperativosPremium.css";

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
        <section className="max-w-2xl p-6">
          <h1 className="">Acceso restringido</h1>
          <p className="mt-2">Solo un administrador puede gestionar la visibilidad de tablas y las asignaciones de empleados.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="administracion-empleados-config-premium min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="p-6">
        <p className="uppercase">Utilidades · Administración de empleados</p>
        <h1 className="mt-2">{titulo}</h1>
        <p className="mt-2 max-w-3xl">{descripcion}</p>
      </header>

      <section className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="">Listado de empleados</h2>
            <p className="mt-1">
              {loading ? "Cargando empleados…" : `${empleadosFiltrados.length} de ${empleadosSeguros.length} empleados`}
            </p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Buscar empleado</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">⌕</span>
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, usuario, DNI…"
              className="h-10 w-full pl-9 pr-3"
            />
          </label>
        </div>

        {loading && empleadosSeguros.length === 0 ? (
          <div className="p-10">Cargando listado de empleados…</div>
        ) : empleadosSeguros.length === 0 ? (
          <div className="p-10">
            <p className="">No hay empleados para mostrar.</p>
            <p className="mt-1">Comprueba los permisos de administración y vuelve a cargar la página.</p>
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className="p-10">No hay empleados que coincidan con la búsqueda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="uppercase">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Departamento</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleadosFiltrados.map((empleado, indice) => {
                  const nombre = [empleado.nombre, empleado.apellidos].filter(Boolean).join(" ").trim() || "Empleado sin nombre";
                  const departamento = empleado.departamento_nombre || empleado.departamento || empleado.nombre_departamento || "—";
                  const cargo = empleado.cargo_nombre || empleado.cargo || empleado.puesto || "—";
                  const activo = empleado.activo !== false;
                  return (
                    <tr key={empleado.id} className={`border-b border-slate-200 last:border-b-0 transition-colors hover:bg-blue-50/60 ${indice % 2 === 0 ? "" : ""}`}>
                      <td className="px-4 py-3">{empleado.id}</td>
                      <td className="px-4 py-3">
                        <div className="">{nombre}</div>
                        {empleado.email_empresa && <div className="mt-0.5">{empleado.email_empresa}</div>}
                      </td>
                      <td className="px-4 py-3">{empleado.usuario || "—"}</td>
                      <td className="px-4 py-3">{departamento}</td>
                      <td className="px-4 py-3">{cargo}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${activo ? "" : ""}`}>
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => abrirModal(empleado, "ficha")} className="whitespace-nowrap px-3 py-2">
                            Abrir ficha
                          </button>
                          <button type="button" onClick={() => abrirModal(empleado, "configuracion")} className="whitespace-nowrap px-3 py-2">
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
        <div className="px-4 py-3">
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
