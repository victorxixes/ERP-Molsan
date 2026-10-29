import { useCallback, useEffect, useMemo, useState } from "react";
import { useSeguridad } from "../../hooks/useSeguridad";
import ModalEmpleado from "../../components/empleados/ModalEmpleado";
import { obtenerEstadoRepartoGestores } from "../../api/empleados";
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
  const [estadoReparto, setEstadoReparto] = useState(null);
  const [errorEstadoReparto, setErrorEstadoReparto] = useState("");
  const [cargandoEstadoReparto, setCargandoEstadoReparto] = useState(false);

  useEffect(() => {
    if (esAdministrador) cargarTodo();
  }, [cargarTodo, esAdministrador]);

  const esAsignaciones = seccion === "asignaciones";
  const titulo = esAsignaciones ? "Asignaciones de empleados" : "Visibilidad de tablas";
  const descripcion = esAsignaciones
    ? "Supervisa incidencias y carga del reparto, y accede a las reglas de cada empleado."
    : "Localiza a un empleado y configura las columnas y la visibilidad asociadas a sus actividades.";

  const cargarEstadoReparto = useCallback(async () => {
    if (!esAdministrador || !esAsignaciones) return;
    setCargandoEstadoReparto(true);
    setErrorEstadoReparto("");
    try {
      const { data } = await obtenerEstadoRepartoGestores();
      setEstadoReparto(data || { resumen: {}, incidencias: [], carga_por_gestor_actividad: [] });
    } catch (error) {
      setErrorEstadoReparto(
        error?.response?.data?.detail ||
        error?.message ||
        "No se ha podido cargar el estado del reparto."
      );
    } finally {
      setCargandoEstadoReparto(false);
    }
  }, [esAdministrador, esAsignaciones]);

  useEffect(() => {
    if (esAsignaciones) cargarEstadoReparto();
  }, [esAsignaciones, cargarEstadoReparto]);

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
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">Utilidades · Administración de empleados</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{titulo}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">{descripcion}</p>
      </header>

      {esAsignaciones && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Supervisión · Reparto automático</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Estado de asignaciones</h2>
              <p className="mt-1 text-sm text-slate-500">Vista de solo lectura. Las reglas se siguen editando en la ficha del empleado; aquí no se reasignan expedientes.</p>
            </div>
            <button
              type="button"
              onClick={cargarEstadoReparto}
              disabled={cargandoEstadoReparto}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {cargandoEstadoReparto ? "Actualizando…" : "Actualizar estado"}
            </button>
          </div>

          {errorEstadoReparto && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorEstadoReparto}</p>
          )}
          {estadoReparto?.resumen?.historial_disponible === false && (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">El historial de reparto todavía no está disponible. Se muestran los expedientes sin gestor que se hayan podido consultar.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Expedientes sin gestor</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{estadoReparto?.resumen?.expedientes_sin_gestor ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-800">Asignaciones provisionales</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-amber-900">{estadoReparto?.resumen?.asignaciones_provisionales ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Pendientes de asignar o revisar (máx. 200)</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{estadoReparto?.resumen?.incidencias_mostradas ?? "—"}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-800">Expedientes que requieren revisión</h3>
            </div>
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5 font-bold">Expediente</th>
                  <th className="px-3 py-2.5 font-bold">Actividad</th>
                  <th className="px-3 py-2.5 font-bold">Gestor conservado</th>
                  <th className="px-3 py-2.5 font-bold">Motivo</th>
                  <th className="px-3 py-2.5 font-bold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(estadoReparto?.incidencias || []).map((item) => {
                  const motivo = item.motivo === "sin_regla_reparto_gestor_conservado"
                    ? "Sin regla compatible · asignación provisional"
                    : item.motivo === "sin_regla_reparto_sin_gestor"
                      ? "Sin regla compatible · sin gestor"
                      : "Sin gestor asignado";
                  return (
                    <tr key={item.id_expediente} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{item.id_expediente}</td>
                      <td className="px-3 py-2.5 text-slate-600">{item.actividad || "Sin actividad"}</td>
                      <td className="px-3 py-2.5 text-slate-600">{item.gestor_nombre || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{motivo}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{item.fecha ? new Date(item.fecha).toLocaleString("es-ES") : "—"}</td>
                    </tr>
                  );
                })}
                {!cargandoEstadoReparto && (estadoReparto?.incidencias || []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">No hay expedientes pendientes de asignación o revisión.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-800">Carga pendiente por gestor y actividad</h3>
            </div>
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5 font-bold">Gestor</th>
                  <th className="px-3 py-2.5 font-bold">Actividad</th>
                  <th className="px-3 py-2.5 text-right font-bold">Expedientes pendientes</th>
                </tr>
              </thead>
              <tbody>
                {(estadoReparto?.carga_por_gestor_actividad || []).map((item) => (
                  <tr key={`${item.gestor_id}-${item.actividad}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{item.gestor_nombre}</td>
                    <td className="px-3 py-2.5 text-slate-600">{item.actividad}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-800">{item.expedientes_pendientes}</td>
                  </tr>
                ))}
                {!cargandoEstadoReparto && (estadoReparto?.carga_por_gestor_actividad || []).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">No hay carga pendiente que mostrar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
