import { useState, useEffect } from "react";
import axios from "../../api/axios";



/**
 * ============================================================
 * INFORME APODERADO
 * ============================================================
 *
 * Versión:
 * - Compatible con interfaz clara
 * - Sin text-white sobre fondos claros
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
 
 
 
 
 p-8"
      >

        <div
          className="flex
 items-center
 justify-center
 gap-3
 py-10"
        >

          <span
            className="h-5
 w-5"
          />

          <span
           
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
        className="p-8"
      >

        <div
          className="flex
 items-center
 gap-4"
        >

          <div
            className="flex
 h-11
 w-11
 shrink-0
 items-center
 justify-center"
          >
            !
          </div>


          <div>

            <h3
             
            >
              No se ha podido cargar el informe
            </h3>


            <p
              className="mt-1"
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
      className="relative
 overflow-hidden
 
 
 
 
 p-5
 
 
 sm:p-6
 lg:p-7"
    >


      {/* ======================================================
          DECORACIÓN SUPERIOR
      ====================================================== */}

      <div
        className="pointer-events-none
 absolute
 left-0
 right-0
 top-0
 h-px"
      />


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="flex
 flex-col
 gap-5
 
 
 pb-6
 md:flex-row
 md:items-center
 md:justify-between"
      >

        {/* TITULO */}

        <div
          className="flex
 items-center
 gap-4"
        >

          <div
            className="flex
 h-14
 w-14
 shrink-0
 items-center
 justify-center"
          >
            📊
          </div>


          <div>

            <h2
             
            >
              Informe del apoderado
            </h2>


            <p
              className="mt-1"
            >
              Resumen de actividad y rendimiento
            </p>

          </div>

        </div>


        {/* SELECTOR */}

        <div
          className="flex
 items-center
 gap-3"
        >

          <span
            className="uppercase"
          >
            Periodo
          </span>


          <select
            value={periodo}
            onChange={(e) =>
              setPeriodo(e.target.value)
            }
            className="min-w-[150px]
 
 
 
 
 px-4
 py-2.5"
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
        className="mt-6
 grid
 grid-cols-1
 gap-4
 sm:grid-cols-2
 xl:grid-cols-4"
      >

        <Kpi
          icon="🤝"
          titulo="Citas presenciales"
          valor={
            data.total_presencial ?? 0
          }

        />


        <Kpi
          icon="💻"
          titulo="Citas VC"
          valor={
            data.total_vc ?? 0
          }

        />


        <Kpi
          icon="🚗"
          titulo="Km recorridos"
          valor={`${numero(
            data.km_totales,
            1
          )} km`}

        />


        <Kpi
          icon="⏱️"
          titulo="Tiempo medio"
          valor={`${numero(
            data.tiempo_medio_dias,
            1
          )} días`}

        />

      </div>


      {/* ======================================================
          RANKING
      ====================================================== */}

      <section
        className="mt-6
 overflow-hidden"
      >

        {/* CABECERA */}

        <div
          className="flex
 flex-col
 gap-2
 
 
 
 px-5
 py-4
 sm:flex-row
 sm:items-center
 sm:justify-between"
        >

          <div
            className="flex
 items-center
 gap-3"
          >

            <div
              className="flex
 h-10
 w-10
 items-center
 justify-center"
            >
              🏆
            </div>


            <div>

              <h3
               
              >
                Ranking de apoderados
              </h3>

              <p
               
              >
                Actividad acumulada durante el periodo
              </p>

            </div>

          </div>


          <span
            className="w-fit
 
 
 px-3
 py-1"
          >
            {ranking.length} registros
          </span>

        </div>


        {/* LISTADO */}

        <div className="p-4">

          {ranking.length === 0 ? (

            <div
              className="px-5
 py-8"
            >

              <div
               
              >
                🏆
              </div>

              <p
                className="mt-2"
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
                  className="flex
 items-center
 gap-3
 
 
 
 
 p-3"
                >

                  {/* POSICIÓN */}

                  <div
                    className={`flex
 h-9
 w-9
 shrink-0
 items-center
 justify-center
 
 
 

 ${
 i === 0
 ? ""
 : i === 1
 ? ""
 : i === 2
 ? ""
 : ""
 }`}
                  >
                    {i + 1}
                  </div>


                  {/* NOMBRE */}

                  <div className="min-w-0 flex-1">

                    <div
                      className="truncate"
                    >
                      {r.nombre ||
                        r.nombre_apoderado ||
                        `Apoderado ${r.apoderado_id ?? ""}`}
                    </div>


                    <div
                      className="mt-0.5"
                    >
                      {r.total_citas ?? 0} citas
                    </div>

                  </div>


                  {/* DISTANCIA */}

                  <div
                    className="shrink-0"
                  >

                    <div
                     
                    >
                      {numero(r.km, 1)} km
                    </div>


                    <div
                      className="uppercase"
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

}) {

  return (

    <div
      className="p-5"
    >

      <div
        className="flex
 items-center
 justify-between"
      >

        <div
          className="flex h-10 w-10 items-center justify-center"
        >
          {icon}
        </div>


        <span
          className="uppercase"
        >
          KPI
        </span>

      </div>


      <div
        className="mt-4"
      >
        {valor}
      </div>


      <div
        className="mt-1"
      >
        {titulo}
      </div>

    </div>

  );

} 
