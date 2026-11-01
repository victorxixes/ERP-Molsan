import { useNavigate } from "react-router-dom";


export default function ModuloPendiente({ nombre }) {
  const navigate = useNavigate();
  const nombreNormalizado = String(nombre || "").trim().toLowerCase();
  const esEncargaGest = nombreNormalizado === "encargagest";
  const esFichajes = nombreNormalizado === "fichajes";

  return (
    <section className="erp-page modulo-pendiente min-w-0 space-y-6">
      <div className="erp-card overflow-hidden">
        <div className="h-1.5 bg-[var(--molsan-blue)]" />

        <div className="p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center">
                {esEncargaGest ? "EG" : esFichajes ? "FI" : "M"}
              </div>
              <div>
                <p>
                  MOLSAN ERP
                </p>
                <h1 className="mt-2">
                  {nombre}
                </h1>
                <p className="mt-2">
                  {esEncargaGest
                    ? "Portal de encargos para notarías externas"
                    : esFichajes
                      ? "Control horario y registro de jornada de empleados"
                      : "Módulo en preparación"}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center px-3 py-1.5 uppercase">
              Próximamente
            </span>
          </div>

          {esFichajes ? (
            <div className="erp-card mt-8 p-5 sm:p-6">
              <h2>Estamos preparando Fichajes</h2>
              <p className="mt-2">
                Este módulo permitirá registrar la jornada laboral de los empleados y consultar sus entradas y salidas. La funcionalidad de fichaje todavía no está activa.
              </p>
            </div>
          ) : esEncargaGest ? (
            <>
              <div className="mt-8 p-5 sm:p-6">
                <h2>
                  Estamos preparando EncargaGest
                </h2>
                <p className="mt-2">
                  Este será el canal para que las notarías que no forman parte de NotarGest
                  puedan encargar a MOLSAN la gestión de cancelaciones hipotecarias y consultar
                  el estado de sus solicitudes desde un único espacio.
                </p>
                <p className="mt-3">
                  Tu notaría encarga. MOLSAN gestiona.
                </p>
              </div>

              <div className="mt-7">
                <p>
                  FUNCIONALIDADES PREVISTAS
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      numero: "01",
                      titulo: "Crear un encargo",
                      detalle: "Rellenar una plantilla con los datos necesarios para iniciar la gestión.",
                    },
                    {
                      numero: "02",
                      titulo: "Documentación",
                      detalle: "Adjuntar los documentos requeridos y consultar los archivos enviados.",
                    },
                    {
                      numero: "03",
                      titulo: "Seguimiento e incidencias",
                      detalle: "Consultar el estado del encargo y recibir avisos si falta información o hay incidencias.",
                    },
                    {
                      numero: "04",
                      titulo: "Validación de gestoría",
                      detalle: "Control interno de revisión, documentación pendiente y validación por parte de MOLSAN.",
                    },
                  ].map((item) => (
                    <div
                      key={item.numero}
                      className="erp-data-item flex gap-3 p-4"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center">
                        {item.numero}
                      </span>
                      <div>
                        <h3>{item.titulo}</h3>
                        <p className="mt-1">{item.detalle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="erp-alert erp-alert-info mt-6 px-4 py-3">
                <p>
                  <strong>Módulo independiente:</strong> EncargaGest tendrá su propio acceso y
                  flujo de trabajo. No dependerá de NotarGest, ApoderaGest ni CancelaGest.
                  Su vinculación funcional será con el CTN para identificar y gestionar la
                  relación con las notarías.
                </p>
              </div>
            </>
          ) : (
            <p className="mt-6">
              La ruta de este módulo está preparada, pero su pantalla operativa todavía debe integrarse.
            </p>
          )}

          <div className="erp-action-bar mt-8 flex flex-wrap items-center gap-3 pt-6">
            <button
              type="button"
              onClick={() => navigate("/modulos")}
              className="molsan-btn molsan-btn--secondary px-5 py-3"
            >
              Volver al selector
            </button>
            <span>
              {esEncargaGest || esFichajes
                ? "La pantalla operativa se incorporará en una siguiente fase."
                : "MOLSAN ERP"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
