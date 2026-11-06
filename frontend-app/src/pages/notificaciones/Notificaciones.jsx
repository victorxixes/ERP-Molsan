import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useMemo } from "react";
import { useNotificacionesStore } from "../../store/notificacionesStore";

/**
 * ============================================================
 * NOTIFICACIONES
 * ============================================================
 *
 * 
 * WebSocket realtime
 * Contador de notificaciones
 * Estados visuales por tipo
 * Estado vacío
 * Diseño responsive
 * ============================================================
 */

export default function Notificaciones() {

  const {
    notificaciones,
    clearNotificaciones,
  } = useNotificacionesStore();

  // ==========================================================
  // LISTA ESTABLE
  // ==========================================================

  const lista = useMemo(
    () =>
      Array.isArray(notificaciones)
        ? notificaciones
        : [],
    [notificaciones]
  );

  // ==========================================================
  // ICONOS POR TIPO
  // ==========================================================

  const iconosTipo = {
    error: "⛔",
    security: "🔐",
    warning: "⚠️",
    success: "✅",
    info: "ℹ️",
    noticia: "📰",
    sistema: "⚙️",
    default: "🔔",
  };

  // ==========================================================
  // ESTILOS POR TIPO
  // ==========================================================

  // ==========================================================
  // HELPERS
  // ==========================================================

  const obtenerTipo = (tipo) => {

    if (!tipo) {
      return "default";
    }

    const valor = String(tipo).toLowerCase();

    return estilosTipo[valor]
      ? valor
      : "default";
  };


  const obtenerIcono = (tipo) => {

    const tipoNormalizado = obtenerTipo(tipo);

    return (
      iconosTipo[tipoNormalizado] ||
      iconosTipo.default
    );
  };



  const formatearFecha = (fecha) => {

    if (!fecha) {
      return "Fecha no disponible";
    }

    try {

      const fechaObj = new Date(fecha);

      if (
        Number.isNaN(
          fechaObj.getTime()
        )
      ) {
        return String(fecha);
      }

      return fechaObj.toLocaleString(
        "es-ES",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    } catch {

      return String(fecha);

    }

  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="erp-page notificaciones-premium-page min-w-0 space-y-6"
    >

      <MolsanPageHeader mark="NO" title="Notificaciones" description="Actividad y avisos en tiempo real del ERP." />
      <div className="molsan-filter-bar flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="molsan-stat-card"><span className="molsan-stat-label">Avisos disponibles</span><strong className="block text-xl">{lista.length}</strong></div>
        <button type="button" className="molsan-btn molsan-btn--secondary" onClick={clearNotificaciones} disabled={lista.length === 0}>Limpiar notificaciones</button>
      </div>

      {/* ======================================================
          ESTADO VACÍO
          ====================================================== */}

      {lista.length === 0 ? (

        <div
          className="erp-empty-state min-h-[320px]
 flex
 flex-col
 items-center
 justify-center
 
 
 
 
 
 
 px-6"
        >

          <div
            className="w-20
 h-20
 
 
 
 
 flex
 items-center
 justify-center
 
 
 mb-5"
          >
            🔕
          </div>


          <h2
           
          >
            No hay notificaciones
          </h2>


          <p
            className="mt-2
 max-w-md"
          >
            Cuando se produzca una nueva actividad
            o evento del sistema, aparecerá
            automáticamente aquí.
          </p>


          <div
            className="mt-5
 inline-flex
 items-center
 gap-2
 px-3
 py-1.5"
          >

            <span
              className="w-2
 h-2"
            />

            Conexión en tiempo real activa

          </div>

        </div>

      ) : (

        /* ====================================================
           LISTA
           ==================================================== */

        <div
          className="space-y-3"
        >

          {lista.map((n, index) => {

            const tipo =
              obtenerTipo(n.tipo);

            const estilo =
              obtenerEstilo(n.tipo);

            const icono =
              obtenerIcono(n.tipo);

            return (

              <div
                key={
                  n.id ??
                  `notificacion-${index}`
                }
                className={`erp-card group
 relative
 overflow-hidden
 
 
 
 
 p-4
 md:p-5`}
              >

                {/* ==================================================
                    BARRA LATERAL
                    ================================================== */}

                <div
                  className={`absolute
 left-0
 top-4
 bottom-4
 w-[3px]
 
 `}
                />


                <div
                  className="flex
 gap-4"
                >

                  {/* ==================================================
                      ICONO
                      ================================================== */}

                  <div
                    className={`flex-shrink-0
 w-11
 h-11
 
 
 
 flex
 items-center
 justify-center`}
                  >
                    {icono}
                  </div>


                  {/* ==================================================
                      CONTENIDO
                      ================================================== */}

                  <div
                    className="flex-1
 min-w-0"
                  >

                    <div
                      className="flex
 flex-col
 md:flex-row
 md:items-start
 md:justify-between
 gap-2"
                    >

                      <div
                        className="min-w-0"
                      >

                        <h2
                          className="break-words"
                        >
                          {n.titulo || "Notificación"}
                        </h2>

                      </div>


                      <span
                        className="flex-shrink-0
 
 
 whitespace-nowrap"
                      >
                        {formatearFecha(n.fecha)}
                      </span>

                    </div>


                    {/* ==================================================
                        DESCRIPCIÓN
                        ================================================== */}

                    {n.descripcion && (

                      <p
                        className="mt-2
 
 
 
 break-words"
                      >
                        {n.descripcion}
                      </p>

                    )}


                    {/* ==================================================
                        FOOTER
                        ================================================== */}

                    <div
                      className="flex
 flex-wrap
 items-center
 gap-2
 mt-4"
                    >

                      <span
                        className="inline-flex
 items-center
 gap-1.5
 px-2.5
 py-1"
                      >

                        <span
                         
                        >
                          🏷️
                        </span>

                        {n.tipo || "general"}

                      </span>


                      <span
                        className="inline-flex
 items-center
 gap-1.5
 px-2.5
 py-1"
                      >

                        <span
                          className="w-1.5
 h-1.5"
                        />

                        Tiempo real

                      </span>

                    </div>

                  </div>

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>

  );

}
