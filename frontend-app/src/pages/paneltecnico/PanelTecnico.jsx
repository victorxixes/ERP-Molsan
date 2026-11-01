import { useMemo } from "react";
import "./PanelTecnico.css";
import { useAuthStore } from "../../store/authStore";
import EmpleadosModulo2026 from "../empleados/EmpleadosModulo2026";
import MonitorSistema from "./MonitorSistema";
import AuditoriaAvanzada from "./AuditoriaAvanzada";
import LogsAvanzados from "./LogsAvanzados";
import { puedeVerModulo } from "../../utils/permisos";

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

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <section
        className="molsan-page-header"
      >

        {/* Decoración superior */}

        <div
          className="
            absolute
            inset-x-0
            top-0
            h-1
            bg-gradient-to-r
            from-[var(--erp-primary)]
            via-blue-400
            to-cyan-400
          "
        />

        <div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5"
        >

          {/* TÍTULO */}

          <div>

            <div
              className="
                flex
                items-center
                gap-3
                mb-2
              "
            >

              <div
                className="molsan-page-header__mark"
              >
                <svg className="w-5 h-5" aria-hidden="true">
                  <use href="/icons/icons.svg#shield" />
                </svg>
              </div>

              <div>

                <h1
                  className="molsan-page-header__title"
                >
                  Panel Técnico
                </h1>

                <p
                  className="molsan-page-header__description"
                >
                  Administración, diagnóstico y supervisión del sistema
                </p>

              </div>

            </div>

          </div>


          {/* ESTADO */}

          <div
            className="
              inline-flex
              items-center
              gap-2
              w-fit
              px-3
              py-2
              rounded-xl
              border
              border-emerald-200
              bg-emerald-50
              text-emerald-700
              text-xs
              font-semibold
            "
          >

            <span
              className="
                w-2
                h-2
                rounded-full
                bg-emerald-500
                animate-pulse
              "
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


          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              shadow-sm
            "
          >

            <div
              className="
                px-6
                py-4
                border-b
                border-[var(--erp-border)]
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-[var(--erp-primary-soft)]
                  text-[var(--erp-primary)]
                  flex
                  items-center
                  justify-center
                "
              >
                <svg className="w-4 h-4" aria-hidden="true">
                  <use href="/icons/icons.svg#user-group" />
                </svg>
              </div>

              <div>

                <h3
                  className="
                    text-sm
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Empleados 2026
                </h3>

                <p
                  className="
                    text-xs
                    text-[var(--erp-text-soft)]
                    mt-0.5
                  "
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
