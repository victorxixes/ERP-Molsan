import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useMemo } from "react";
import { useAuthStore } from "../../store/authStore";
import EmpleadosModulo2026 from "../empleados/EmpleadosModulo2026";
import MonitorSistema from "./MonitorSistema";
import AuditoriaAvanzada from "./AuditoriaAvanzada";
import LogsAvanzados from "./LogsAvanzados";
import { puedeVerModulo } from "../../utils/permisos";

/**
 * ============================================================
 * PANEL TÉCNICO
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
    <div className="erp-page w-full space-y-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <MolsanPageHeader mark="PT" title="Panel Técnico" description="Administración, diagnóstico y supervisión del sistema." />
      <div className="flex justify-end"><span className="molsan-panel inline-flex items-center gap-2 px-3 py-2">● Sistema operativo</span></div>


      {/* ======================================================
          MONITOR DEL SISTEMA
          ====================================================== */}

      <section>

        <div className="mb-4">

          <h2
           
          >
            Monitor del sistema
          </h2>

          <p
            className="mt-1"
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
           
          >
            Auditoría
          </h2>

          <p
            className="mt-1"
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
           
          >
            Logs técnicos
          </h2>

          <p
            className="mt-1"
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
             
            >
              Gestión de empleados
            </h2>

            <p
              className="mt-1"
            >
              Administración y supervisión de los empleados del ERP.
            </p>

          </div>


          <div
            className="overflow-hidden"
          >

            <div
              className="px-6
 py-4
 
 
 flex
 items-center
 gap-3"
            >

              <div
                className="w-9
 h-9
 
 
 
 flex
 items-center
 justify-center"
              >
                <svg className="w-4 h-4" aria-hidden="true">
                  <use href="/icons/icons.svg#user-group" />
                </svg>
              </div>

              <div>

                <h3
                 
                >
                  Empleados 2026
                </h3>

                <p
                  className="mt-0.5"
                >
                  Gestión de usuarios y empleados
                </p>

              </div>

            </div>


            <div className="p-6">

              <EmpleadosModulo2026
                usuario={usuario}
              />

            </div>

          </div>

        </section>

      )}

    </div>
  );
}
