import { useDashboard } from "../../hooks/useDashboard";


/* ============================================================
   DASHBOARD — EXPEDIENTES
   MOLSAN ERP SAAS PREMIUM 2027
============================================================ */


/* ============================================================
   ACTIVIDADES
============================================================ */

const ACTIVIDADES = [
  {
    key: "documentacion_previa",
    nombre: "Documentación previa",
    icono: "📄",
  },
  {
    key: "sede_notarial",
    nombre: "Sede notarial",
    icono: "🏛️",
  },
  {
    key: "sede_notarial_con_protocolo",
    nombre: "Sede notarial con protocolo",
    icono: "📜",
  },
  {
    key: "liquidacion_impuestos",
    nombre: "Liquidación de impuestos",
    icono: "💶",
  },
  {
    key: "tramitacion_inscripcion",
    nombre: "Tramitación inscripción",
    icono: "🏢",
  },
  {
    key: "defectos_registrales",
    nombre: "Defectos registrales",
    icono: "⚠️",
  },
  {
    key: "facturacion_cierre",
    nombre: "Facturación y cierre",
    icono: "✅",
  },
];


/* ============================================================
   FORMATEAR NÚMERO
============================================================ */

function formatearNumero(valor) {

  return new Intl.NumberFormat(
    "es-ES"
  ).format(
    Number(valor || 0)
  );

}


/* ============================================================
   FORMATEAR DÍAS
============================================================ */

function formatearDias(valor) {

  if (
    valor === null ||
    valor === undefined ||
    Number.isNaN(Number(valor))
  ) {

    return "—";

  }


  return new Intl.NumberFormat(
    "es-ES",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }
  ).format(
    Number(valor)
  ) + " días";

}


/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */

export default function Dashboard() {

  const {
    totalExpedientes,
    expedientesPorActividad,
    mediaFirmaPorTipoOperacion,
    loading,
    error,
    cargarDashboard,
  } = useDashboard();


  /* ==========================================================
     NORMALIZAR ACTIVIDADES
  ========================================================== */

  const actividades = ACTIVIDADES.map(
    (actividad) => {

      const encontrada =
        expedientesPorActividad.find(
          (item) =>
            item?.key ===
            actividad.key
        );


      return {
        ...actividad,

        total:
          Number(
            encontrada?.total || 0
          ),

      };

    }
  );


  /* ==========================================================
     TOTAL ACTIVIDADES
  ========================================================== */

  const totalActividades =
    actividades.reduce(
      (
        total,
        actividad
      ) =>
        total +
        Number(
          actividad.total || 0
        ),
      0
    );


  /* ==========================================================
     MEDIA GENERAL
  ========================================================== */

  const mediasValidas =
    mediaFirmaPorTipoOperacion.filter(
      (item) =>
        item?.media_dias !== null &&
        item?.media_dias !== undefined &&
        !Number.isNaN(
          Number(
            item.media_dias
          )
        )
    );


  let mediaGeneral = null;


  if (
    mediasValidas.length > 0
  ) {

    const suma =
      mediasValidas.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.media_dias
          ),
        0
      );


    mediaGeneral =
      suma /
      mediasValidas.length;

  }


  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    loading &&
    totalExpedientes === 0
  ) {

    return (

      <div
        className="
          erp-page
          min-h-full

          p-4
          sm:p-6
          lg:p-8

          text-[var(--erp-text)]

          space-y-6

          animate-fade-in
        "
      >

        <div
          className="
            erp-card

            p-6

            animate-pulse
          "
        >

          <div
            className="
              h-7
              w-72

              rounded

              bg-[var(--erp-surface-soft)]
            "
          />

          <div
            className="
              mt-3

              h-4
              w-96
              max-w-full

              rounded

              bg-[var(--erp-surface-soft)]
            "
          />

        </div>


        <div
          className="
            grid

            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-4

            gap-4
          "
        >

          {[
            1,
            2,
            3,
            4,
          ].map(
            (item) => (

              <div
                key={item}

                className="
                  h-32

                  rounded-xl

                  bg-[var(--erp-surface-soft)]

                  border
                  border-[var(--erp-border)]

                  animate-pulse
                "
              />

            )
          )}

        </div>


        <div
          className="
            erp-card

            h-96

            animate-pulse
          "
        />

      </div>

    );

  }


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div
      className="
        erp-page
        min-h-full

        p-4
        sm:p-6
        lg:p-8

        text-[var(--erp-text)]

        space-y-6

        animate-fade-in
      "
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div
        className="
          flex
          flex-col

          md:flex-row
          md:items-center
          md:justify-between

          gap-4
        "
      >

        <div>

          <h1
            className="
              text-3xl
              font-bold

              text-[var(--erp-text)]
            "
          >
            Dashboard
          </h1>


          <p
            className="
              text-[var(--erp-text-soft)]

              mt-1
            "
          >
            Visión general del circuito de expedientes
          </p>

        </div>


        <button
          type="button"

          onClick={
            cargarDashboard
          }

          disabled={
            loading
          }

          className="
            px-4
            py-2.5

            rounded-xl

            bg-[var(--erp-primary)]

            text-white

            shadow-sm

            hover:brightness-95

            transition

            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {loading
            ? "Actualizando..."
            : "↻ Actualizar"}
        </button>

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div
          className="
            bg-red-50

            border
            border-red-200

            rounded-xl

            p-4

            text-red-700
          "
        >

          <strong>
            Error:
          </strong>

          {" "}

          {error}

        </div>

      )}


      {/* ======================================================
          KPIs
      ====================================================== */}

      <section
        className="
          grid

          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4

          gap-4
        "
      >

        {/* TOTAL EXPEDIENTES */}

        <div
          className="
            erp-card

            p-5

            shadow-sm

            transition

            hover:shadow-md
          "
        >

          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-sm
                  font-medium

                  text-[var(--erp-text-soft)]
                "
              >
                Total expedientes
              </p>


              <p
                className="
                  mt-2

                  text-3xl
                  font-bold

                  text-[var(--erp-primary)]
                "
              >
                {formatearNumero(
                  totalExpedientes
                )}
              </p>


              <p
                className="
                  mt-1

                  text-xs

                  text-[var(--erp-text-soft)]
                "
              >
                Expedientes registrados
              </p>

            </div>


            <div
              className="
                flex
                h-11
                w-11

                items-center
                justify-center

                rounded-xl

                bg-[var(--erp-primary-soft)]

                text-xl
              "
            >
              📁
            </div>

          </div>

        </div>


        {/* ACTIVIDADES */}

        <div
          className="
            erp-card

            p-5

            shadow-sm

            transition

            hover:shadow-md
          "
        >

          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-sm
                  font-medium

                  text-[var(--erp-text-soft)]
                "
              >
                Actividades
              </p>


              <p
                className="
                  mt-2

                  text-3xl
                  font-bold

                  text-[var(--erp-primary)]
                "
              >
                7
              </p>


              <p
                className="
                  mt-1

                  text-xs

                  text-[var(--erp-text-soft)]
                "
              >
                Etapas del circuito
              </p>

            </div>


            <div
              className="
                flex
                h-11
                w-11

                items-center
                justify-center

                rounded-xl

                bg-[var(--erp-primary-soft)]

                text-xl
              "
            >
              🔄
            </div>

          </div>

        </div>


        {/* EN CIRCUITO */}

        <div
          className="
            erp-card

            p-5

            shadow-sm

            transition

            hover:shadow-md
          "
        >

          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-sm
                  font-medium

                  text-[var(--erp-text-soft)]
                "
              >
                En circuito
              </p>


              <p
                className="
                  mt-2

                  text-3xl
                  font-bold

                  text-[var(--erp-primary)]
                "
              >
                {formatearNumero(
                  totalActividades
                )}
              </p>


              <p
                className="
                  mt-1

                  text-xs

                  text-[var(--erp-text-soft)]
                "
              >
                Distribuidos por actividad
              </p>

            </div>


            <div
              className="
                flex
                h-11
                w-11

                items-center
                justify-center

                rounded-xl

                bg-[var(--erp-primary-soft)]

                text-xl
              "
            >
              📋
            </div>

          </div>

        </div>


        {/* MEDIA FIRMA */}

        <div
          className="
            erp-card

            p-5

            shadow-sm

            transition

            hover:shadow-md
          "
        >

          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-sm
                  font-medium

                  text-[var(--erp-text-soft)]
                "
              >
                Media hasta firma
              </p>


              <p
                className="
                  mt-2

                  text-3xl
                  font-bold

                  text-[var(--erp-primary)]
                "
              >
                {formatearDias(
                  mediaGeneral
                )}
              </p>


              <p
                className="
                  mt-1

                  text-xs

                  text-[var(--erp-text-soft)]
                "
              >
                Inicio actividad → firma
              </p>

            </div>


            <div
              className="
                flex
                h-11
                w-11

                items-center
                justify-center

                rounded-xl

                bg-[var(--erp-primary-soft)]

                text-xl
              "
            >
              ✍️
            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          ACTIVIDADES
      ====================================================== */}

      <section
        className="
          erp-card

          p-4
          sm:p-5

          shadow-sm
        "
      >

        <div
          className="
            flex
            flex-col

            sm:flex-row
            sm:items-center
            sm:justify-between

            gap-2

            mb-4
          "
        >

          <div>

            <h2
              className="
                text-xl
                font-semibold

                text-[var(--erp-text)]
              "
            >
              Actividades de expedientes
            </h2>


            <p
              className="
                text-sm

                text-[var(--erp-text-soft)]

                mt-1
              "
            >
              Número total de expedientes por actividad actual
            </p>

          </div>


          <div
            className="
              text-sm

              text-[var(--erp-text-soft)]
            "
          >

            Total general:{" "}

            <strong
              className="
                text-[var(--erp-text)]
              "
            >
              {formatearNumero(
                totalActividades
              )}
            </strong>

          </div>

        </div>


        <div
          className="
            grid

            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4

            gap-3
          "
        >

          {actividades.map(
            (actividad) => (

              <div
                key={
                  actividad.key
                }

                className="
                  bg-[var(--erp-surface-soft)]

                  border
                  border-[var(--erp-border)]

                  rounded-xl

                  p-4

                  transition

                  hover:border-[#cbd6e6]

                  hover:shadow-sm
                "
              >

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <span
                      className="
                        text-lg
                      "
                    >
                      {actividad.icono}
                    </span>

                    <span
                      className="
                        text-sm
                        font-medium

                        text-[var(--erp-text-soft)]
                      "
                    >
                      {actividad.nombre}
                    </span>

                  </div>

                </div>


                <p
                  className="
                    mt-4

                    text-2xl
                    font-bold

                    text-[var(--erp-primary)]
                  "
                >
                  {formatearNumero(
                    actividad.total
                  )}
                </p>


                <p
                  className="
                    mt-1

                    text-xs

                    text-[var(--erp-text-soft)]
                  "
                >
                  expedientes
                </p>

              </div>

            )
          )}

        </div>

      </section>


      {/* ======================================================
          MEDIA POR TIPO DE OPERACIÓN
      ====================================================== */}

      <section
        className="
          erp-card

          p-4
          sm:p-5

          shadow-sm
        "
      >

        <div
          className="
            flex
            flex-col

            sm:flex-row
            sm:items-center
            sm:justify-between

            gap-2

            mb-4
          "
        >

          <div>

            <h2
              className="
                text-xl
                font-semibold

                text-[var(--erp-text)]
              "
            >
              Media de firma por tipo de operación
            </h2>


            <p
              className="
                text-sm

                text-[var(--erp-text-soft)]

                mt-1
              "
            >
              Tiempo medio entre el inicio de actividad y la fecha de firma
            </p>

          </div>


          <div
            className="
              text-sm

              text-[var(--erp-text-soft)]
            "
          >
            {mediaFirmaPorTipoOperacion.length} tipos
          </div>

        </div>


        {mediaFirmaPorTipoOperacion.length === 0 ? (

          <div
            className="
              rounded-xl

              border
              border-[var(--erp-border)]

              bg-[var(--erp-surface-soft)]

              p-6

              text-center

              text-sm

              text-[var(--erp-text-soft)]
            "
          >
            No hay datos de firma disponibles todavía.
          </div>

        ) : (

          <div
            className="
              overflow-x-auto
            "
          >

            <table
              className="
                w-full

                border-collapse
              "
            >

              <thead>

                <tr
                  className="
                    border-b
                    border-[var(--erp-border)]
                  "
                >

                  <th
                    className="
                      px-4
                      py-3

                      text-left

                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide

                      text-[var(--erp-text-soft)]
                    "
                  >
                    Tipo de operación
                  </th>


                  <th
                    className="
                      px-4
                      py-3

                      text-center

                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide

                      text-[var(--erp-text-soft)]
                    "
                  >
                    Expedientes firmados
                  </th>


                  <th
                    className="
                      px-4
                      py-3

                      text-right

                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide

                      text-[var(--erp-text-soft)]
                    "
                  >
                    Media
                  </th>

                </tr>

              </thead>


              <tbody>

                {mediaFirmaPorTipoOperacion.map(
                  (
                    fila,
                    indice
                  ) => (

                    <tr
                      key={
                        `${fila.tipo_operacion}-${indice}`
                      }

                      className="
                        border-b
                        border-[var(--erp-border)]

                        last:border-b-0

                        hover:bg-[var(--erp-surface-soft)]

                        transition
                      "
                    >

                      <td
                        className="
                          px-4
                          py-3

                          text-sm
                          font-medium

                          text-[var(--erp-text)]
                        "
                      >
                        {fila.tipo_operacion ||
                          "Sin tipo de operación"}
                      </td>


                      <td
                        className="
                          px-4
                          py-3

                          text-center

                          text-sm

                          text-[var(--erp-text)]
                        "
                      >
                        {formatearNumero(
                          fila.expedientes_firmados
                        )}
                      </td>


                      <td
                        className="
                          px-4
                          py-3

                          text-right

                          text-sm
                          font-semibold

                          text-[var(--erp-primary)]
                        "
                      >
                        {formatearDias(
                          fila.media_dias
                        )}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ======================================================
          RESUMEN VISUAL
      ====================================================== */}

      <section
        className="
          erp-card

          p-4
          sm:p-5

          shadow-sm
        "
      >

        <div
          className="
            mb-5
          "
        >

          <h2
            className="
              text-xl
              font-semibold

              text-[var(--erp-text)]
            "
          >
            Distribución del circuito
          </h2>


          <p
            className="
              text-sm

              text-[var(--erp-text-soft)]

              mt-1
            "
          >
            Peso de cada actividad sobre el total de expedientes
          </p>

        </div>


        <div
          className="
            space-y-4
          "
        >

          {actividades.map(
            (actividad) => {

              const porcentaje =
                totalExpedientes > 0
                  ? (
                      Number(
                        actividad.total
                      ) /
                      Number(
                        totalExpedientes
                      )
                    ) *
                    100
                  : 0;


              return (

                <div
                  key={
                    actividad.key
                  }
                >

                  <div
                    className="
                      flex
                      items-center
                      justify-between

                      gap-4

                      mb-1.5
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-2

                        min-w-0
                      "
                    >

                      <span>
                        {actividad.icono}
                      </span>

                      <span
                        className="
                          text-sm
                          font-medium

                          text-[var(--erp-text)]

                          truncate
                        "
                      >
                        {actividad.nombre}
                      </span>

                    </div>


                    <span
                      className="
                        shrink-0

                        text-sm
                        font-semibold

                        text-[var(--erp-text)]
                      "
                    >
                      {formatearNumero(
                        actividad.total
                      )}
                    </span>

                  </div>


                  <div
                    className="
                      h-2.5

                      overflow-hidden

                      rounded-full

                      bg-[var(--erp-surface-soft)]

                      border
                      border-[var(--erp-border)]
                    "
                  >

                    <div
                      className="
                        h-full

                        rounded-full

                        bg-[var(--erp-primary)]

                        transition-all
                        duration-500
                      "

                      style={{
                        width:
                          `${Math.min(
                            100,
                            porcentaje
                          )}%`,
                      }}
                    />

                  </div>


                  <div
                    className="
                      mt-1

                      text-right

                      text-xs

                      text-[var(--erp-text-soft)]
                    "
                  >
                    {porcentaje.toLocaleString(
                      "es-ES",
                      {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      }
                    )}
                    %
                  </div>

                </div>

              );

            }
          )}

        </div>

      </section>


      {/* ======================================================
          PIE
      ====================================================== */}

      <div
        className="
          pb-2

          text-center

          text-xs

          text-[var(--erp-text-soft)]
        "
      >
        Dashboard de Expedientes · MOLSAN ERP
      </div>

    </div>

  );

}
