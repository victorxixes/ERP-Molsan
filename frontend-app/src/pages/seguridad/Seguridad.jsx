import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSeguridad } from "../../hooks/useSeguridad";

const Icono = ({ name, className = "h-5 w-5" }) => (
  <svg className={`${className} shrink-0`} aria-hidden="true">
    <use href={`/icons/icons.svg#${name}`} />
  </svg>
);

function listaSegura(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function texto(value, fallback = "") {
  if (value === null || typeof value === "undefined") return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function Indicador({ icon, label, value, detail }) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="uppercase">{label}</p>
          <p className="mt-2">{value}</p>
          <p className="mt-1">{detail}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Icono name={icon} />
        </span>
      </div>
    </div>
  );
}

function Acceso({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="seguridad-acceso group"
    >
      <span className="seguridad-acceso-icon">
        <Icono name={icon} className="h-5 w-5" />
      </span>
      <span className="seguridad-acceso-body">
        <span className="seguridad-acceso-title">
          {title}
          <span className="seguridad-acceso-arrow">→</span>
        </span>
        <span className="seguridad-acceso-description">{description}</span>
      </span>
    </Link>
  );
}

export default function Seguridad() {
  const {
    roles = [],
    permisos = [],
    empleados = [],
    auditoria = [],
    logs = [],
    cargarTodo,
    loading,
  } = useSeguridad();

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const rolesList = useMemo(() => listaSegura(roles), [roles]);
  const permisosList = useMemo(() => listaSegura(permisos), [permisos]);
  const empleadosList = useMemo(() => listaSegura(empleados), [empleados]);
  const auditoriaList = useMemo(() => listaSegura(auditoria), [auditoria]);
  const logsList = useMemo(() => listaSegura(logs), [logs]);

  const empleadosActivos = useMemo(
    () => empleadosList.filter((item) => item.activo === true || item.activo === 1).length,
    [empleadosList]
  );

  const actividadReciente = useMemo(() => {
    return [...auditoriaList]
      .sort((a, b) => {
        const fechaA = new Date(a?.fecha || a?.created_at || 0).getTime();
        const fechaB = new Date(b?.fecha || b?.created_at || 0).getTime();
        return (Number.isFinite(fechaB) ? fechaB : 0) - (Number.isFinite(fechaA) ? fechaA : 0);
      })
      .slice(0, 5);
  }, [auditoriaList]);

  return (
    <div className="erp-page space-y-6">
      <MolsanPageHeader mark="SE" title="Centro de seguridad" description="Resumen general y accesos a la administración de seguridad de Molsan ERP." />
      <div className="flex justify-end"><span className="molsan-panel inline-flex items-center gap-2 px-3 py-2">Panel de administración</span></div>

      <section aria-labelledby="seguridad-resumen-title" className="space-y-3">
        <div>
          <h2 id="seguridad-resumen-title">Resumen</h2>
          <p className="mt-0.5">Indicadores informativos; no sustituyen la revisión de incidencias.</p>
        </div>
        {loading ? (
          <div className="p-8">
            Cargando información de seguridad…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Indicador icon="user-group" label="Empleados" value={empleadosList.length} detail="Registros disponibles" />
            <Indicador icon="user-group" label="Activos" value={empleadosActivos} detail="Empleados marcados como activos" />
            <Indicador icon="shield" label="Roles" value={rolesList.length} detail="Roles registrados" />
            <Indicador icon="shield" label="Permisos" value={permisosList.length} detail="Permisos registrados" />
            <Indicador icon="clipboard-list" label="Auditoría" value={auditoriaList.length} detail="Eventos disponibles" />
          </div>
        )}
      </section>

      <section aria-labelledby="seguridad-accesos-title" className="space-y-3">
        <div>
          <h2 id="seguridad-accesos-title">Administración de seguridad</h2>
          <p className="mt-0.5">Cada función tiene su propia pantalla para evitar formularios y listados duplicados.</p>
        </div>
        <div className="seguridad-accesos-grid">
          <Acceso to="/seguridad/usuarios" icon="user-group" title="Empleados y permisos" description="Selecciona empleados y gestiona su acceso según los permisos de tu perfil." />
          <Acceso to="/seguridad/roles/editor" icon="shield" title="Roles" description="Crea, edita y administra los perfiles de seguridad que se asignan a los empleados." />
          <Acceso to="/seguridad/modulos" icon="folder" title="Módulos y permisos" description="Consulta los módulos del ERP y la configuración de acceso disponible." />
          <Acceso to="/auditoria" icon="clipboard-list" title="Auditoría" description="Consulta las operaciones y los eventos registrados en el sistema." />
        </div>
      </section>

      <section aria-labelledby="seguridad-actividad-title" className="overflow-hidden">
        <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="seguridad-actividad-title">Actividad reciente</h2>
            <p className="mt-0.5">Últimos eventos disponibles en los datos de auditoría cargados.</p>
          </div>
          <Link to="/auditoria">Ver auditoría →</Link>
        </div>
        {actividadReciente.length === 0 ? (
          <p className="px-5 py-8">No hay eventos de auditoría disponibles para mostrar.</p>
        ) : (
          <ul>
            {actividadReciente.map((item, index) => {
              const usuario = texto(item?.usuario || item?.empleado || item?.nombre_usuario, "Sistema");
              const accion = texto(item?.accion || item?.evento, "Actividad");
              const detalle = texto(item?.descripcion || item?.detalle || item?.modulo, "Sin descripción");
              const fecha = texto(item?.fecha || item?.created_at, "Fecha no disponible");
              return (
                <li key={item?.id ?? `auditoria-${index}`} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
                    <Icono name="clipboard" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{usuario} · {accion}</span>
                    <span className="mt-0.5 block">{detalle}</span>
                    <span className="mt-1 block">{fecha}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icono name="shield" className="mt-0.5 h-5 w-5" />
          <div>
            <p>Supervisión técnica</p>
            <p className="mt-0.5">{logsList.length} registros técnicos cargados. Consulta los logs para revisar errores y advertencias.</p>
          </div>
        </div>
        <Link to="/seguridad/logs" className="shrink-0">Ver logs técnicos →</Link>
      </section>
    </div>
  );
}
