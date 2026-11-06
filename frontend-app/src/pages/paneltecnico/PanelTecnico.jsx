import { useMemo } from "react";
import { useAuthStore } from "../../store/authStore";
import EmpleadosModulo2026 from "../empleados/EmpleadosModulo2026";
import MonitorSistema from "./MonitorSistema";
import AuditoriaAvanzada from "./AuditoriaAvanzada";
import LogsAvanzados from "./LogsAvanzados";
import { puedeVerModulo } from "../../utils/permisos";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanPremiumCard from "../../components/ui/MolsanPremiumCard";

/**
 * ============================================================
 * PANEL TÉCNICO — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Contenedor principal del área técnica.
 *
 * Mantiene:
 * - Monitor del sistema
 * - Auditoría avanzada
 * - Logs técnicos
 * - Módulo de empleados
 *
 * Solo se modifica la presentación visual.
 * La lógica de los módulos hijos permanece intacta.
 * ============================================================
 */

export default function PanelTecnico() {
  const usuario = useAuthStore((s) => s.user);

  const puedeVerEmpleados = useMemo(
    () => puedeVerModulo("empleados"),
    []
  );

  return (
    <div className="panel-tecnico-premium w-full space-y-8 animate-fade-in">

      <MolsanPageHeader
        mark="PT"
        title="Panel Técnico"
        description="Administración, diagnóstico y supervisión del sistema."
        className="panel-tecnico-page-header"
        actions={
          <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sistema operativo
          </span>
        }
      />


      {/* ======================================================
          MONITOR DEL SISTEMA
          ====================================================== */}

      <section>

        <div className="mb-4">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Monitor del sistema
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-1
            "
          >
            Supervisión de conexiones, WebSockets y estado de la base de datos.
          </p>

        </div>

        <MonitorSistema />

      </section>


      {/* ======================================================
          AUDITORÍA
          ====================================================== */}

      <section>

        <div className="mb-4">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Auditoría
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-1
            "
          >
            Registro y análisis de las operaciones realizadas en el ERP.
          </p>

        </div>

        <AuditoriaAvanzada />

      </section>


      {/* ======================================================
          LOGS TÉCNICOS
          ====================================================== */}

      <section>

        <div className="mb-4">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Logs técnicos
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-1
            "
          >
            Información técnica y eventos registrados por el sistema.
          </p>

        </div>

        <LogsAvanzados />

      </section>


      {/* ======================================================
          EMPLEADOS
          ====================================================== */}

      {puedeVerEmpleados && (

        <section>

          <div className="mb-4">

            <h2
              className="
                text-lg
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Gestión de empleados
            </h2>

            <p
              className="
                text-sm
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              Administración y supervisión de los empleados del ERP.
            </p>

          </div>


          <MolsanPremiumCard
            icon="users"
            title="Empleados 2026"
            description="Gestión de usuarios y empleados"
            className="panel-tecnico-empleados-card"
          >
            <div className="p-2">
              <EmpleadosModulo2026 usuario={usuario} />
            </div>
          </MolsanPremiumCard>

        </section>

      )}

    </div>
  );
}
