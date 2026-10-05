import React from "react";

/**
 * ============================================================
 * FUSIONES
 * MÓDULO EN CONSTRUCCIÓN
 * ============================================================
 *
 * Estructura preparada para el futuro módulo de Fusiones.
 *
 * Diseño:
 * - Compatible con el estilo visual del ERP
 * - Glass / Premium
 * - Responsive
 * - Sin dependencias externas
 * - Preparado para incorporar posteriormente los datos reales
 * ============================================================
 */


/**
 * ============================================================
 * ICONOS
 * ============================================================
 */

const IconoFusion = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-7 h-7"
    aria-hidden="true"
  >
    <path d="M8 7h4a3 3 0 0 1 3 3v1" />
    <path d="M16 17h-4a3 3 0 0 1-3-3v-1" />
    <path d="M12 7h4" />
    <path d="M8 17H4" />
    <path d="m15 8 2-2 2 2" />
    <path d="m9 16-2 2-2-2" />
  </svg>
);


const IconoConstruccion = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-9 h-9"
    aria-hidden="true"
  >
    <path d="m14.5 6.5 3 3" />
    <path d="m13 5 1.5-1.5a2.1 2.1 0 0 1 3 0l3 3a2.1 2.1 0 0 1 0 3L19 11" />
    <path d="m11 19-6 2 2-6 8.5-8.5 4 4z" />
    <path d="m9 17 4 4" />
  </svg>
);


const IconoPendiente = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);


const IconoProceso = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    aria-hidden="true"
  >
    <path d="M4 12a8 8 0 0 1 13.5-5.8" />
    <path d="M18 4v4h-4" />
    <path d="M20 12a8 8 0 0 1-13.5 5.8" />
    <path d="M6 20v-4h4" />
  </svg>
);


const IconoCompletada = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.5 2.5L16 9" />
  </svg>
);


const IconoIncidencia = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    aria-hidden="true"
  >
    <path d="M12 3 2.8 19h18.4z" />
    <path d="M12 9v4" />
    <path d="M12 16h.01" />
  </svg>
);


const IconoBusqueda = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);


/**
 * ============================================================
 * TARJETA DE ESTADO
 * ============================================================
 */

const EstadoCard = ({
  icon,
  titulo,
  descripcion,
  valor,
  clase
}) => {

  return (
    <div
      className="
        group
        rounded-2xl
        border
        border-[var(--erp-border)]
        bg-white
        p-4
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
      "
    >

      <div className="flex items-center gap-3">

        <div
          className={`
            w-10
            h-10
            rounded-xl
            flex
            items-center
            justify-center
            ${clase}
          `}
        >
          {icon}
        </div>


        <div className="min-w-0 flex-1">

          <div
            className="
              text-sm
              font-semibold
              text-[var(--erp-text)]
            "
          >
            {titulo}
          </div>

          <div
            className="
              mt-0.5
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            {descripcion}
          </div>

        </div>


        <div
          className="
            min-w-[34px]
            h-8
            px-2
            rounded-full
            flex
            items-center
            justify-center
            bg-[var(--erp-primary-soft)]
            text-[var(--erp-primary)]
            text-xs
            font-bold
          "
        >
          {valor}
        </div>

      </div>

    </div>
  );
};


/**
 * ============================================================
 * FUSIONES
 * ============================================================
 */

export default function Fusiones() {

  return (

    <div
      className="
        min-h-full
        w-full
        px-4
        py-5
        lg:px-6
        lg:py-6
      "
    >

      <div
        className="
          max-w-[1800px]
          mx-auto
        "
      >


        {/* ====================================================
            CABECERA
            ==================================================== */}

        <div
          className="
            flex
            flex-col
            gap-4
            lg:flex-row
            lg:items-center
            lg:justify-between
            mb-6
          "
        >

          <div>

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-11
                  h-11
                  rounded-2xl
                  bg-[var(--erp-primary-soft)]
                  text-[var(--erp-primary)]
                  flex
                  items-center
                  justify-center
                  border
                  border-[var(--erp-border)]
                "
              >
                <IconoFusion />
              </div>


              <div>

                <h1
                  className="
                    text-2xl
                    font-bold
                    tracking-tight
                    text-[var(--erp-text)]
                  "
                >
                  Fusiones
                </h1>

                <p
                  className="
                    mt-0.5
                    text-sm
                    text-[var(--erp-text-soft)]
                  "
                >
                  Gestión y seguimiento de fusiones
                </p>

              </div>

            </div>

          </div>


          <div
            className="
              inline-flex
              items-center
              gap-2
              px-3
              py-2
              rounded-xl
              bg-white
              border
              border-[var(--erp-border)]
              shadow-sm
              text-xs
              font-medium
              text-[var(--erp-text-soft)]
            "
          >

            <span
              className="
                w-2
                h-2
                rounded-full
                bg-amber-400
              "
            />

            Módulo en desarrollo

          </div>

        </div>


        {/* ====================================================
            AVISO CONSTRUCCIÓN
            ==================================================== */}

        <div
          className="
            mb-6
            rounded-3xl
            border
            border-[var(--erp-border)]
            bg-white
            shadow-sm
            overflow-hidden
          "
        >

          <div
            className="
              p-8
              lg:p-12
              flex
              flex-col
              items-center
              text-center
            "
          >

            <div
              className="
                w-20
                h-20
                rounded-3xl
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                border
                border-[var(--erp-border)]
                flex
                items-center
                justify-center
                mb-5
              "
            >

              <IconoConstruccion />

            </div>


            <h2
              className="
                text-xl
                lg:text-2xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              Módulo en construcción
            </h2>


            <p
              className="
                max-w-xl
                mt-2
                text-sm
                lg:text-base
                leading-6
                text-[var(--erp-text-soft)]
              "
            >
              Estamos preparando el módulo de Fusiones
              para integrarlo completamente con la gestión
              de expedientes y el resto del ERP.
            </p>


            <div
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-xl
                bg-[var(--erp-surface)]
                border
                border-[var(--erp-border)]
                text-xs
                text-[var(--erp-text-soft)]
              "
            >

              <span
                className="
                  w-2
                  h-2
                  rounded-full
                  bg-[var(--erp-primary)]
                "
              />

              Próximamente disponible

            </div>

          </div>

        </div>


        {/* ====================================================
            CONTENIDO PREPARADO
            ==================================================== */}

        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-[minmax(0,1fr)_380px]
            gap-6
          "
        >


          {/* ==================================================
              ESTADOS
              ================================================== */}

          <div>

            <div
              className="
                rounded-2xl
                border
                border-[var(--erp-border)]
                bg-white
                shadow-sm
                overflow-hidden
              "
            >

              <div
                className="
                  px-5
                  py-4
                  border-b
                  border-[var(--erp-border)]
                  flex
                  items-center
                  justify-between
                "
              >

                <div>

                  <h3
                    className="
                      text-sm
                      font-bold
                      text-[var(--erp-text)]
                    "
                  >
                    Estado de las fusiones
                  </h3>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Resumen del estado de gestión
                  </p>

                </div>


                <div
                  className="
                    w-8
                    h-8
                    rounded-xl
                    bg-[var(--erp-primary-soft)]
                    text-[var(--erp-primary)]
                    flex
                    items-center
                    justify-center
                  "
                >
                  <IconoFusion />
                </div>

              </div>


              <div
                className="
                  p-4
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-3
                "
              >

                <EstadoCard
                  icon={<IconoPendiente />}
                  titulo="Pendientes"
                  descripcion="Fusiones pendientes de gestión"
                  valor="0"
                  clase="
                    bg-amber-50
                    text-amber-600
                  "
                />


                <EstadoCard
                  icon={<IconoProceso />}
                  titulo="En proceso"
                  descripcion="Fusiones actualmente en curso"
                  valor="0"
                  clase="
                    bg-blue-50
                    text-blue-600
                  "
                />


                <EstadoCard
                  icon={<IconoCompletada />}
                  titulo="Completadas"
                  descripcion="Fusiones finalizadas correctamente"
                  valor="0"
                  clase="
                    bg-emerald-50
                    text-emerald-600
                  "
                />


                <EstadoCard
                  icon={<IconoIncidencia />}
                  titulo="Incidencias"
                  descripcion="Fusiones que requieren atención"
                  valor="0"
                  clase="
                    bg-red-50
                    text-red-500
                  "
                />

              </div>

            </div>

          </div>


          {/* ==================================================
              BÚSQUEDA
              ================================================== */}

          <div>

            <div
              className="
                rounded-2xl
                border
                border-[var(--erp-border)]
                bg-white
                shadow-sm
                overflow-hidden
              "
            >

              <div
                className="
                  px-5
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
                  <IconoBusqueda />
                </div>


                <div>

                  <h3
                    className="
                      text-sm
                      font-bold
                      text-[var(--erp-text)]
                    "
                  >
                    Buscar fusiones
                  </h3>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Localiza una fusión
                  </p>

                </div>

              </div>


              <div className="p-5">

                <div className="space-y-4">

                  <div>

                    <label
                      className="
                        block
                        mb-1.5
                        text-xs
                        font-semibold
                        text-[var(--erp-text)]
                      "
                    >
                      ID
                    </label>

                    <input
                      type="text"
                      placeholder="ID de fusión"
                      disabled
                      className="
                        w-full
                        h-10
                        px-3
                        rounded-xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface)]
                        text-sm
                        text-[var(--erp-text)]
                        placeholder:text-[var(--erp-text-soft)]
                        opacity-70
                        outline-none
                      "
                    />

                  </div>


                  <div>

                    <label
                      className="
                        block
                        mb-1.5
                        text-xs
                        font-semibold
                        text-[var(--erp-text)]
                      "
                    >
                      Expediente
                    </label>

                    <input
                      type="text"
                      placeholder="Número de expediente"
                      disabled
                      className="
                        w-full
                        h-10
                        px-3
                        rounded-xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface)]
                        text-sm
                        text-[var(--erp-text)]
                        placeholder:text-[var(--erp-text-soft)]
                        opacity-70
                        outline-none
                      "
                    />

                  </div>


                  <div>

                    <label
                      className="
                        block
                        mb-1.5
                        text-xs
                        font-semibold
                        text-[var(--erp-text)]
                      "
                    >
                      Estado
                    </label>

                    <select
                      disabled
                      className="
                        w-full
                        h-10
                        px-3
                        rounded-xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface)]
                        text-sm
                        text-[var(--erp-text-soft)]
                        opacity-70
                        outline-none
                      "
                    >
                      <option>
                        Todos los estados
                      </option>
                    </select>

                  </div>


                  <button
                    type="button"
                    disabled
                    className="
                      w-full
                      h-10
                      rounded-xl
                      bg-[var(--erp-primary)]
                      text-white
                      text-sm
                      font-semibold
                      opacity-50
                      cursor-not-allowed
                    "
                  >
                    Buscar
                  </button>

                </div>


                <div
                  className="
                    mt-5
                    pt-4
                    border-t
                    border-[var(--erp-border)]
                    text-center
                    text-[11px]
                    text-[var(--erp-text-soft)]
                  "
                >
                  La búsqueda estará disponible cuando
                  finalice el desarrollo del módulo.

                </div>

              </div>

            </div>

          </div>

        </div>


      </div>

    </div>

  );
}
