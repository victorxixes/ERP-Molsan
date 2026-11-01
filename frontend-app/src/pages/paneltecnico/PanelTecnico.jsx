import { useMemo } from "react";
import "./PanelTecnico.css";
import { useAuthStore } from "../../store/authStore";
import EmpleadosModulo2026 from "../empleados/EmpleadosModulo2026";
import MonitorSistema from "./MonitorSistema";
import AuditoriaAvanzada from "./AuditoriaAvanzada";
import LogsAvanzados from "./LogsAvanzados";
import { puedeVerModulo } from "../../utils/permisos";

export default function PanelTecnico() {
  const usuario = useAuthStore((s) => s.user);
  const puedeVerEmpleados = useMemo(() => puedeVerModulo("empleados"), []);

  return (
    <div className="molsan-page-stack panel-tecnico-premium w-full animate-fade-in">
      <header className="molsan-page-header panel-tecnico-header">
        <div className="panel-tecnico-header__identity">
          <span className="panel-tecnico-operativo"><span aria-hidden="true" />Sistema operativo</span>
          <div className="molsan-page-header__mark" aria-hidden="true">
            <svg className="w-5 h-5"><use href="/icons/icons.svg#shield" /></svg>
          </div>
          <div>
            <h1 className="molsan-page-header__title">Monitor del Sistema</h1>
            <p className="molsan-page-header__description">Supervisión técnica, WebSocket y diagnóstico de base de datos</p>
          </div>
        </div>
      </header>

      <MonitorSistema />

      <section className="panel-tecnico-seccion">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--erp-text)]">Auditoría</h2>
          <p className="mt-1 text-sm text-[var(--erp-text-soft)]">Registro y análisis de las operaciones realizadas en el ERP.</p>
        </div>
        <AuditoriaAvanzada />
      </section>

      <section className="panel-tecnico-seccion">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--erp-text)]">Logs técnicos</h2>
          <p className="mt-1 text-sm text-[var(--erp-text-soft)]">Información técnica y eventos registrados por el sistema.</p>
        </div>
        <LogsAvanzados />
      </section>

      {puedeVerEmpleados && (
        <section className="panel-tecnico-seccion">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--erp-text)]">Gestión de empleados</h2>
            <p className="mt-1 text-sm text-[var(--erp-text-soft)]">Administración y supervisión de los empleados del ERP.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] shadow-sm">
            <div className="flex items-center gap-3 border-b border-[var(--erp-border)] px-6 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--erp-primary-soft)] text-[var(--erp-primary)]">
                <svg className="h-4 w-4" aria-hidden="true"><use href="/icons/icons.svg#user-group" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--erp-text)]">Empleados 2026</h3>
                <p className="mt-0.5 text-xs text-[var(--erp-text-soft)]">Gestión de usuarios y empleados</p>
              </div>
            </div>
            <div className="p-6"><EmpleadosModulo2026 usuario={usuario} /></div>
          </div>
        </section>
      )}
    </div>
  );
}
