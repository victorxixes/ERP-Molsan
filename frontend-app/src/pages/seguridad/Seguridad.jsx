import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanStatCard from "../../components/ui/MolsanStatCard";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSeguridad } from "../../hooks/useSeguridad";
function listaSegura(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function texto(value, fallback = "") {
  if (value === null || typeof value === "undefined") return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function Indicador({ icon, label, value, detail, tone = "ocean" }) {
  return <MolsanStatCard title={label} value={value} description={detail} icon={icon} tone={tone} />;
}

function Acceso({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="seguridad-acceso group"
    >
      <span className="seguridad-acceso-icon">
        <MolsanIcon name={icon} size={21} />
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
    <div className="seguridad-premium-page animate-fade-in space-y-6">
      <MolsanPageHeader
        mark="SG"
        title="Centro de seguridad"
        description="Resumen general y accesos a la administración de seguridad de Molsan ERP."
        actions={<span className="molsan-status molsan-status--info">Panel de administración</span>}
      />

      <section aria-labelledby="seguridad-resumen-title" className="space-y-3">
        <div>
          <h2 id="seguridad-resumen-title" className="text-lg font-semibold text-[var(--erp-text)]">Resumen</h2>
          <p className="mt-0.5 text-sm text-[var(--erp-text-soft)]">Indicadores informativos; no sustituyen la revisión de incidencias.</p>
        </div>
        {loading ? (
          <div className="rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-8 text-center text-sm text-[var(--erp-text-soft)]">
            Cargando información de seguridad…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Indicador icon="users" label="Empleados" value={empleadosList.length} detail="Registros disponibles" tone="ocean" />
            <Indicador icon="userCheck" label="Activos" value={empleadosActivos} detail="Empleados marcados como activos" tone="emerald" />
            <Indicador icon="shield" label="Roles" value={rolesList.length} detail="Roles registrados" tone="cyan" />
            <Indicador icon="key" label="Permisos" value={permisosList.length} detail="Permisos registrados" tone="violet" />
            <Indicador icon="clipboard" label="Auditoría" value={auditoriaList.length} detail="Eventos disponibles" tone="amber" />
          </div>
        )}
      </section>

      <section aria-labelledby="seguridad-accesos-title" className="space-y-3">
        <div>
          <h2 id="seguridad-accesos-title" className="text-lg font-semibold text-[var(--erp-text)]">Administración de seguridad</h2>
          <p className="mt-0.5 text-sm text-[var(--erp-text-soft)]">Cada función tiene su propia pantalla para evitar formularios y listados duplicados.</p>
        </div>
        <div className="seguridad-accesos-grid">
          <Acceso to="/seguridad/usuarios" icon="user-group" title="Empleados y permisos" description="Selecciona empleados y gestiona su acceso según los permisos de tu perfil." />
          <Acceso to="/seguridad/roles/editor" icon="shield" title="Roles" description="Crea, edita y administra los perfiles de seguridad que se asignan a los empleados." />
          <Acceso to="/seguridad/modulos" icon="folder" title="Módulos y permisos" description="Consulta los módulos del ERP y la configuración de acceso disponible." />
          <Acceso to="/auditoria" icon="clipboard-list" title="Auditoría" description="Consulta las operaciones y los eventos registrados en el sistema." />
        </div>
      </section>

      <section aria-labelledby="seguridad-actividad-title" className="overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
        <div className="flex flex-col gap-1 border-b border-[var(--erp-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="seguridad-actividad-title" className="font-semibold text-[var(--erp-text)]">Actividad reciente</h2>
            <p className="mt-0.5 text-xs text-[var(--erp-text-soft)]">Últimos eventos disponibles en los datos de auditoría cargados.</p>
          </div>
          <Link to="/auditoria" className="text-sm font-medium text-[var(--erp-primary)] hover:underline">Ver auditoría →</Link>
        </div>
        {actividadReciente.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--erp-text-soft)]">No hay eventos de auditoría disponibles para mostrar.</p>
        ) : (
          <ul className="divide-y divide-[var(--erp-border)]">
            {actividadReciente.map((item, index) => {
              const usuario = texto(item?.usuario || item?.empleado || item?.nombre_usuario, "Sistema");
              const accion = texto(item?.accion || item?.evento, "Actividad");
              const detalle = texto(item?.descripcion || item?.detalle || item?.modulo, "Sin descripción");
              const fecha = texto(item?.fecha || item?.created_at, "Fecha no disponible");
              return (
                <li key={item?.id ?? `auditoria-${index}`} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--erp-primary-soft)] text-[var(--erp-primary)]">
                    <MolsanIcon name="clipboard" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--erp-text)]">{usuario} · {accion}</span>
                    <span className="mt-0.5 block text-sm text-[var(--erp-text-soft)]">{detalle}</span>
                    <span className="mt-1 block text-xs text-[var(--erp-text-soft)]">{fecha}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MolsanIcon name="shield" size={21} tone="ocean" />
          <div>
            <p className="text-sm font-medium text-[var(--erp-text)]">Supervisión técnica</p>
            <p className="mt-0.5 text-xs text-[var(--erp-text-soft)]">{logsList.length} registros técnicos cargados. Consulta los logs para revisar errores y advertencias.</p>
          </div>
        </div>
        <Link to="/seguridad/logs" className="shrink-0 text-sm font-medium text-[var(--erp-primary)] hover:underline">Ver logs técnicos →</Link>
      </section>
    </div>
  );
}
