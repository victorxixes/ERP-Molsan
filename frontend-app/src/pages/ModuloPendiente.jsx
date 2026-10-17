import { useNavigate } from "react-router-dom";

export default function ModuloPendiente({ nombre }) {
  const navigate = useNavigate();
  const esEncargaGest = String(nombre || "").toLowerCase() === "encargagest";

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(31,48,79,0.08)]">
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200" />

        <div className="p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100 text-sm font-black tracking-wide text-amber-800">
                {esEncargaGest ? "EG" : "M"}
              </div>
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.2em] text-amber-700">
                  MOLSAN ERP · PREMIUM 2027
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {nombre}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {esEncargaGest
                    ? "Portal de encargos para notarías externas"
                    : "Módulo en preparación"}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Próximamente
            </span>
          </div>

          {esEncargaGest ? (
            <>
              <div className="mt-8 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white p-5 sm:p-6">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Estamos preparando EncargaGest
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Este será el canal para que las notarías que no forman parte de NotarGest
                  puedan encargar a MOLSAN la gestión de cancelaciones hipotecarias y consultar
                  el estado de sus solicitudes desde un único espacio.
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                  Tu notaría encarga. MOLSAN gestiona.
                </p>
              </div>

              <div className="mt-7">
                <p className="text-[10px] font-extrabold tracking-[0.17em] text-slate-400">
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
                      className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-extrabold text-slate-600">
                        {item.numero}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{item.titulo}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.detalle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                <p className="text-xs leading-6 text-blue-900">
                  <strong>Módulo independiente:</strong> EncargaGest tendrá su propio acceso y
                  flujo de trabajo. No dependerá de NotarGest, ApoderaGest ni CancelaGest.
                  Su vinculación funcional será con el CTN para identificar y gestionar la
                  relación con las notarías.
                </p>
              </div>
            </>
          ) : (
            <p className="mt-6 leading-7 text-slate-600">
              La ruta de este módulo está preparada, pero su pantalla operativa todavía debe integrarse.
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => navigate("/modulos")}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Volver al selector
            </button>
            <span className="text-xs text-slate-400">
              {esEncargaGest
                ? "La pantalla operativa se incorporará en una siguiente fase."
                : "MOLSAN ERP"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
