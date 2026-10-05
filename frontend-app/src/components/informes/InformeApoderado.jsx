import { useState, useEffect } from "react";
import axios from "../../api/axios";


/**
 * ============================================================
 * INFORME APODERADO — MOLSAN ERP SAAS PREMIUM 2027
 * ============================================================
 *
 * Versión:
 * - Compatible con interfaz clara
 * - Sin text-white sobre fondos claros
 * - Glass Luxe claro
 * - Contraste correcto
 * - KPIs claros
 * - Ranking mejorado
 * - Autenticación mediante instancia Axios ERP
 * - Fechas enviadas como YYYY-MM-DD
 * - Responsive
 * ============================================================
 */


/* ============================================================
   FECHA YYYY-MM-DD
============================================================ */

function formatearFechaAPI(fecha) {

  const year = fecha.getFullYear();

  const month = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    fecha.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


/* ============================================================
   FORMATO NÚMERO
============================================================ */

function numero(valor, decimales = 1) {

  const n = Number(valor);

  if (!Number.isFinite(n)) {
    return decimales === 0
      ? "0"
      : "0.0";
  }

  return n.toLocaleString(
    "es-ES",
    {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }
  );
}


/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */

export default function InformeApoderado({
  apoderadoId,
}) {

  const [data, setData] = useState(null);

  const [ranking, setRanking] = useState([]);

  const [periodo, setPeriodo] =
    useState("mensual");

  const [error, setError] =
    useState(null);


  /* ==========================================================
     CARGAR INFORME
  ========================================================== */

  useEffect(() => {

    if (!apoderadoId) {
      return;
    }


    const hoy = new Date();


    let desde;


    if (periodo === "mensual") {

      desde = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        1
      );

    } else {

      desde = new Date(
        hoy.getFullYear(),
        0,
        1
      );

    }


    const hasta = hoy;


    const cargar = async () => {

      try {

        setError(null);


        const fechaDesde =
          formatearFechaAPI(desde);

        const fechaHasta =
          formatearFechaAPI(hasta);


        /* ====================================================
           INFORME DEL APODERADO
        ==================================================== */

        const res =
          await axios.get(
            `/informes/apoderados/${apoderadoId}`,
            {
              params: {
                desde: fechaDesde,
                hasta: fechaHasta,
              },
            }
          );


        /* ====================================================
           RANKING
        ==================================================== */

        const rank =
          await axios.get(
            "/informes/apoderados/ranking",
            {
              params: {
                desde: fechaDesde,
                hasta: fechaHasta,
              },
            }
          );


        /* ====================================================
           NORMALIZAR INFORME
        ==================================================== */

        setData({

          ...res.data,

          km_totales:
            res.data?.km_totales ??
            res.data?.distancia_km ??
            0,

        });


        /* ====================================================
           NORMALIZAR RANKING
        ==================================================== */

        setRanking(

          Array.isArray(rank.data)

            ? rank.data.map((r) => ({

                ...r,

                km:
                  r.km ??
                  r.distancia_km ??
                  0,

              }))

            : []

        );


      } catch (error) {

        console.error(
          "Error cargando informe de apoderado:",
          error
        );


        setError(
          "No se ha podido cargar el informe."
        );

      }

    };


    cargar();

  }, [
    apoderadoId,
    periodo,
  ]);


  /* ==========================================================
     CARGANDO
  ========================================================== */

  if (!data && !error) {

    return (

      <div
        className="
          rounded-[28px]
          border
          border-slate-200
          bg-white
          p-8
          shadow-[0_18px_55px_rgba(15,23,42,0.08)]
        "
      >

        <div
          className="
            flex
            items-center
            justify-center
            gap-3
            py-10
          "
        >

          <span
            className="
              h-5
              w-5
              rounded-full
              border-2
              border-blue-100
              border-t-blue-500
              animate-spin
            "
          />

          <span
            className="
              text-sm
              font-medium
              text-slate-500
            "
          >
            Cargando informe…
          </span>

        </div>

      </div>

    );

  }


  /* ==========================================================
     ERROR
  ========================================================== */

  if (error) {

    return (

      <div
        className="
          rounded-[28px]
          border
          border-red-200
          bg-white
          p-8
          shadow-[0_18px_55px_rgba(15,23,42,0.08)]
        "
      >

        <div
          className="
            flex
            items-center
            gap-4
          "
        >

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-red-100
              bg-red-50
              text-red-500
              font-bold
            "
          >
            !
          </div>


          <div>

            <h3
              className="
                text-base
                font-bold
                text-slate-800
              "
            >
              No se ha podido cargar el informe
            </h3>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {error}
            </p>

          </div>

        </div>

      </div>

    );

  }


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div
      className="
        relative
        overflow-hidden
        rounded-[30px]
        border
        border-slate-200/80
        bg-white/80
        p-5
        shadow-[0_20px_60px_rgba(15,23,42,0.08)]
        backdrop-blur-2xl
        sm:p-6
        lg:p-7
      "
    >


      {/* ======================================================
          DECORACIÓN SUPERIOR
      ====================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          left-0
          right-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-blue-400/60
          to-transparent
        "
      />


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="
          flex
          flex-col
          gap-5
          border-b
          border-slate-200
          pb-6
          md:flex-row
          md:items-center
          md:justify-between
        "
      >

        {/* TITULO */}

        <div
          className="
            flex
            items-center
            gap-4
          "
        >

          <div
            className="
              flex
              h-14
              w-14
              shrink-0
              items-center
              justify-center
              rounded-2xl
              border
              border-blue-100
              bg-blue-50
              text-2xl
              shadow-sm
            "
          >
            📊
          </div>


          <div>

            <h2
              className="
                text-xl
                font-bold
                tracking-tight
                text-slate-800
                sm:text-2xl
              "
            >
              Informe del apoderado
            </h2>


            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Resumen de actividad y rendimiento
            </p>

          </div>

        </div>


        {/* SELECTOR */}

        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <span
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            Periodo
          </span>


          <select
            value={periodo}
            onChange={(e) =>
              setPeriodo(e.target.value)
            }
            className="
              min-w-[150px]
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-medium
              text-slate-700
              shadow-sm
              outline-none
              transition
              focus:border-blue-400
              focus:ring-4
              focus:ring-blue-100
            "
          >

            <option value="mensual">
              Mensual
            </option>

            <option value="anual">
              Anual
            </option>

          </select>

        </div>

      </div>


      {/* ======================================================
          KPIs
      ====================================================== */}

      <div
        className="
          mt-6
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >

        <Kpi
          icon="🤝"
          titulo="Citas presenciales"
          valor={
            data.total_presencial ?? 0
          }
          fondo="bg-emerald-50"
          borde="border-emerald-100"
          icono="text-emerald-600"
        />


        <Kpi
          icon="💻"
          titulo="Citas VC"
          valor={
            data.total_vc ?? 0
          }
          fondo="bg-blue-50"
          borde="border-blue-100"
          icono="text-blue-600"
        />


        <Kpi
          icon="🚗"
          titulo="Km recorridos"
          valor={`${numero(
            data.km_totales,
            1
          )} km`}
          fondo="bg-rose-50"
          borde="border-rose-100"
          icono="text-rose-600"
        />


        <Kpi
          icon="⏱️"
          titulo="Tiempo medio"
          valor={`${numero(
            data.tiempo_medio_dias,
            1
          )} días`}
          fondo="bg-violet-50"
          borde="border-violet-100"
          icono="text-violet-600"
        />

      </div>


      {/* ======================================================
          RANKING
      ====================================================== */}

      <section
        className="
          mt-6
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
        "
      >

        {/* CABECERA */}

        <div
          className="
            flex
            flex-col
            gap-2
            border-b
            border-slate-200
            bg-slate-50/80
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-amber-100
                bg-amber-50
                text-lg
              "
            >
              🏆
            </div>


            <div>

              <h3
                className="
                  text-base
                  font-bold
                  text-slate-800
                "
              >
                Ranking de apoderados
              </h3>

              <p
                className="
                  text-xs
                  text-slate-400
                "
              >
                Actividad acumulada durante el periodo
              </p>

            </div>

          </div>


          <span
            className="
              w-fit
              rounded-full
              bg-slate-100
              px-3
              py-1
              text-xs
              font-semibold
              text-slate-500
            "
          >
            {ranking.length} registros
          </span>

        </div>


        {/* LISTADO */}

        <div className="p-4">

          {ranking.length === 0 ? (

            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-200
                bg-slate-50
                px-5
                py-8
                text-center
              "
            >

              <div
                className="
                  text-2xl
                "
              >
                🏆
              </div>

              <p
                className="
                  mt-2
                  text-sm
                  font-medium
                  text-slate-600
                "
              >
                No hay datos de ranking.
              </p>

            </div>

          ) : (

            <div className="space-y-2">

              {ranking.map((r, i) => (

                <div
                  key={
                    r.apoderado_id ??
                    `ranking-${i}`
                  }
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    p-3
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-blue-200
                    hover:bg-blue-50/30
                    hover:shadow-sm
                  "
                >

                  {/* POSICIÓN */}

                  <div
                    className={`
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      text-sm
                      font-bold

                      ${
                        i === 0
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : i === 1
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : i === 2
                          ? "bg-orange-50 text-orange-600 border border-orange-100"
                          : "bg-blue-50 text-blue-600 border border-blue-100"
                      }
                    `}
                  >
                    {i + 1}
                  </div>


                  {/* NOMBRE */}

                  <div className="min-w-0 flex-1">

                    <div
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-slate-800
                      "
                    >
                      {r.nombre ||
                        r.nombre_apoderado ||
                        `Apoderado ${r.apoderado_id ?? ""}`}
                    </div>


                    <div
                      className="
                        mt-0.5
                        text-xs
                        text-slate-400
                      "
                    >
                      {r.total_citas ?? 0} citas
                    </div>

                  </div>


                  {/* DISTANCIA */}

                  <div
                    className="
                      shrink-0
                      text-right
                    "
                  >

                    <div
                      className="
                        text-sm
                        font-bold
                        text-slate-700
                      "
                    >
                      {numero(r.km, 1)} km
                    </div>


                    <div
                      className="
                        text-[10px]
                        uppercase
                        tracking-wider
                        text-slate-400
                      "
                    >
                      distancia
                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>

    </div>

  );

}


/* ============================================================
   KPI
============================================================ */

function Kpi({
  icon,
  titulo,
  valor,
  fondo,
  borde,
  icono,
}) {

  return (

    <div
      className={`
        rounded-2xl
        border
        ${borde}
        ${fondo}
        p-5
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
      `}
    >

      <div
        className="
          flex
          items-center
          justify-between
        "
      >

        <div
          className={`
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            bg-white/80
            border
            border-white
            text-lg
            ${icono}
            shadow-sm
          `}
        >
          {icon}
        </div>


        <span
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.12em]
            text-slate-400
          "
        >
          KPI
        </span>

      </div>


      <div
        className="
          mt-4
          text-2xl
          font-bold
          tracking-tight
          text-slate-800
          sm:text-3xl
        "
      >
        {valor}
      </div>


      <div
        className="
          mt-1
          text-xs
          font-medium
          text-slate-500
        "
      >
        {titulo}
      </div>

    </div>

  );

} 
