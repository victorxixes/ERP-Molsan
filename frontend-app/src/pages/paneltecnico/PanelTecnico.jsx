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
    <div className="w-full space-y-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <section
        className="relative
 overflow-hidden"
      >

        {/* Decoración superior */}

        <div
          className="absolute
 inset-x-0
 top-0
 h-1"
        />

        <div
          className="relative
 px-6
 py-6
 lg:px-8
 lg:py-7
 flex
 flex-col
 lg:flex-row
 lg:items-center
 lg:justify-between
 gap-5"
        >

          {/* TÍTULO */}

          <div>

            <div
              className="flex
 items-center
 gap-3
 mb-2"
            >

              <div
                className="w-11
 h-11
 
 
 
 flex
 items-center
 justify-center"
              >
                <svg className="w-5 h-5" aria-hidden="true">
                  <use href="/icons/icons.svg#shield" />
                </svg>
              </div>

              <div>

                <h1
                  className=""
                >
                  Panel Técnico
                </h1>

                <p
                  className="mt-0.5"
                >
                  Administración, diagnóstico y supervisión del sistema
                </p>

              </div>

            </div>

          </div>


          {/* ESTADO */}

          <div
            className="inline-flex
 items-center
 gap-2
 w-fit
 px-3
 py-2"
          >

            <span
              className="w-2
 h-2"
            />

            Sistema operativo

          </div>

        </div>

      </section>


      {/* ======================================================
          MONITOR DEL SISTEMA
          ====================================================== */}

      <section>

        <div className="mb-4">

          <h2
            className=""
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
            className=""
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
            className=""
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
              className=""
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
                  className=""
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
