import { useMemo } from "react";
import "./Notificaciones.css";
import { useNotificacionesStore } from "../../store/notificacionesStore";

/**
 * ============================================================
 * NOTIFICACIONES — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Tema claro Premium
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

  const estilosTipo = {

    error: {
      borde: "border-red-200",
      fondo: "bg-red-50",
      icono: "bg-red-50 border-red-200 text-red-600",
      barra: "bg-red-500",
    },

    security: {
      borde: "border-purple-200",
      fondo: "bg-purple-50",
      icono: "bg-purple-50 border-purple-200 text-purple-600",
      barra: "bg-purple-500",
    },

    warning: {
      borde: "border-amber-200",
      fondo: "bg-amber-50",
      icono: "bg-amber-50 border-amber-200 text-amber-600",
      barra: "bg-amber-500",
    },

    success: {
      borde: "border-emerald-200",
      fondo: "bg-emerald-50",
      icono: "bg-emerald-50 border-emerald-200 text-emerald-600",
      barra: "bg-emerald-500",
    },

    noticia: {
      borde: "border-blue-200",
      fondo: "bg-blue-50",
      icono: "bg-blue-50 border-blue-200 text-blue-600",
      barra: "bg-blue-500",
    },

    sistema: {
      borde: "border-cyan-200",
      fondo: "bg-cyan-50",
      icono: "bg-cyan-50 border-cyan-200 text-cyan-600",
      barra: "bg-cyan-500",
    },

    info: {
      borde: "border-sky-200",
      fondo: "bg-sky-50",
      icono: "bg-sky-50 border-sky-200 text-sky-600",
      barra: "bg-sky-500",
    },

    default: {
      borde: "border-[var(--erp-border)]",
      fondo: "bg-white",
      icono: "bg-[var(--erp-primary-soft)] border-[var(--erp-border)] text-[var(--erp-primary)]",
      barra: "bg-[var(--erp-primary)]",
    },

  };

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


  const obtenerEstilo = (tipo) => {

    const tipoNormalizado = obtenerTipo(tipo);

    return (
      estilosTipo[tipoNormalizado] ||
      estilosTipo.default
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
      className="
        notificaciones-premium-page
        p-4
        md:p-6
        space-y-6
        text-[var(--erp-text)]
        animate-fade-in
      "
    >

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="molsan-page-header"
      >

        <div
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >

          {/* ==================================================
              TÍTULO
              ================================================== */}

          <div
            className="molsan-page-header__identity"
          >

            <div
              className="molsan-page-header__mark"
            >
              🔔
            </div>


            <div>

              <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
              <h1 className="molsan-page-header__title">Notificaciones</h1>

              <p className="molsan-page-header__description">Actividad y avisos en tiempo real del ERP.</p>

            </div>

          </div>


          {/* ==================================================
              ACCIONES
              ================================================== */}

          <div
            className="molsan-page-header__actions"
          >

            {/* CONTADOR */}

            <div
              className="
                px-4
                py-2
                rounded-xl
                bg-[var(--erp-background)]
                border
                border-[var(--erp-border)]
                text-center
                min-w-[90px]
              "
            >

              <div
                className="
                  text-xl
                  font-bold
                  text-[var(--erp-text)]
                "
              >
                {lista.length}
              </div>

              <div
                className="
                  text-[10px]
                  uppercase
                  tracking-wider
                  text-[var(--erp-text-soft)]
                "
              >
                Avisos
              </div>

            </div>


            {/* LIMPIAR */}

            <button
              type="button"
              onClick={clearNotificaciones}
              disabled={lista.length === 0}
              className="
                px-4
                py-2.5
                rounded-xl
                bg-red-50
                border
                border-red-200
                text-red-600
                text-sm
                font-medium
                transition-all
                duration-200
                hover:bg-red-100
                hover:border-red-300
                active:scale-[0.97]
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >
              🗑️ Limpiar
            </button>

          </div>

        </div>

      </div>


      {/* ======================================================
          ESTADO VACÍO
          ====================================================== */}

      {lista.length === 0 ? (

        <div
          className="
            min-h-[320px]
            flex
            flex-col
            items-center
            justify-center
            text-center
            bg-white
            border
            border-[var(--erp-border)]
            rounded-2xl
            shadow-sm
            px-6
          "
        >

          <div
            className="
              w-20
              h-20
              rounded-2xl
              bg-[var(--erp-primary-soft)]
              border
              border-[var(--erp-border)]
              flex
              items-center
              justify-center
              text-4xl
              shadow-sm
              mb-5
            "
          >
            🔕
          </div>


          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            No hay notificaciones
          </h2>


          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-2
              max-w-md
            "
          >
            Cuando se produzca una nueva actividad
            o evento del sistema, aparecerá
            automáticamente aquí.
          </p>


          <div
            className="
              mt-5
              inline-flex
              items-center
              gap-2
              px-3
              py-1.5
              rounded-full
              bg-emerald-50
              border
              border-emerald-200
              text-emerald-600
              text-xs
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

            Conexión en tiempo real activa

          </div>

        </div>

      ) : (

        /* ====================================================
           LISTA
           ==================================================== */

        <div
          className="
            space-y-3
          "
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
                className={`
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  ${estilo.borde}
                  ${estilo.fondo}
                  p-4
                  md:p-5
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-y-[1px]
                  hover:shadow-md
                  animate-fade-in
                `}
              >

                {/* ==================================================
                    BARRA LATERAL
                    ================================================== */}

                <div
                  className={`
                    absolute
                    left-0
                    top-4
                    bottom-4
                    w-[3px]
                    rounded-r-full
                    ${estilo.barra}
                  `}
                />


                <div
                  className="
                    flex
                    gap-4
                  "
                >

                  {/* ==================================================
                      ICONO
                      ================================================== */}

                  <div
                    className={`
                      flex-shrink-0
                      w-11
                      h-11
                      rounded-xl
                      ${estilo.icono}
                      border
                      flex
                      items-center
                      justify-center
                      text-xl
                      shadow-sm
                    `}
                  >
                    {icono}
                  </div>


                  {/* ==================================================
                      CONTENIDO
                      ================================================== */}

                  <div
                    className="
                      flex-1
                      min-w-0
                    "
                  >

                    <div
                      className="
                        flex
                        flex-col
                        md:flex-row
                        md:items-start
                        md:justify-between
                        gap-2
                      "
                    >

                      <div
                        className="
                          min-w-0
                        "
                      >

                        <h2
                          className="
                            text-base
                            md:text-lg
                            font-semibold
                            text-[var(--erp-text)]
                            break-words
                          "
                        >
                          {n.titulo || "Notificación"}
                        </h2>

                      </div>


                      <span
                        className="
                          flex-shrink-0
                          text-xs
                          text-[var(--erp-text-soft)]
                          whitespace-nowrap
                        "
                      >
                        {formatearFecha(n.fecha)}
                      </span>

                    </div>


                    {/* ==================================================
                        DESCRIPCIÓN
                        ================================================== */}

                    {n.descripcion && (

                      <p
                        className="
                          mt-2
                          text-sm
                          leading-relaxed
                          text-[var(--erp-text-soft)]
                          break-words
                        "
                      >
                        {n.descripcion}
                      </p>

                    )}


                    {/* ==================================================
                        FOOTER
                        ================================================== */}

                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                        mt-4
                      "
                    >

                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                          px-2.5
                          py-1
                          rounded-lg
                          bg-white
                          border
                          border-[var(--erp-border)]
                          text-[11px]
                          text-[var(--erp-text-soft)]
                        "
                      >

                        <span
                          className="
                            text-[10px]
                          "
                        >
                          🏷️
                        </span>

                        {n.tipo || "general"}

                      </span>


                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1.5
                          px-2.5
                          py-1
                          rounded-lg
                          bg-emerald-50
                          border
                          border-emerald-200
                          text-[11px]
                          text-emerald-600
                        "
                      >

                        <span
                          className="
                            w-1.5
                            h-1.5
                            rounded-full
                            bg-emerald-500
                          "
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
