import { useState, useEffect, useRef } from "react";
import api from "../../api/axios";
import Chart from "chart.js/auto";
import SelectSJ from "../../components/ui/SelectSJ";

/* ============================================================
   MESES
============================================================ */

const MESES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];


/* ============================================================
   INFORMES
============================================================ */

export default function Informes() {

  const hoy = new Date();

  const [mes, setMes] =
    useState(hoy.getMonth() + 1);

  const [año, setAño] =
    useState(hoy.getFullYear());

  const [tabla, setTabla] =
    useState([]);

  const [filtroNombre, setFiltroNombre] =
    useState("");

  const [orden, setOrden] =
    useState({
      campo: "nombre",
      asc: true,
    });

  const canvasVC = useRef(null);
  const canvasPresencial = useRef(null);
  const canvasKm = useRef(null);

  const chartVC = useRef(null);
  const chartPresencial = useRef(null);
  const chartKm = useRef(null);


  /* ==========================================================
     CARGAR DATOS
  ========================================================== */

  useEffect(() => {

    cargarTabla();

  }, [mes, año]);


  /* ==========================================================
     GRÁFICOS
  ========================================================== */

  useEffect(() => {

    renderGraficos();

    return () => {
      destruirGraficos();
    };

  }, [tabla]);


  /* ==========================================================
     CARGAR TABLA
  ========================================================== */

  const cargarTabla = async () => {

    try {

      const res =
        await api.get(
          "/informes/apoderados/tabla",
          {
            params: {
              mes,
              año,
            },
          }
        );


      const lista =
        (res.data || []).map((t) => ({

          ...t,

          vc:
            Number(t.vc ?? 0),

          presencial:
            Number(t.presencial ?? 0),

          km:
            Number(
              t.km ??
              t.distancia_km ??
              0
            ),

        }));


      setTabla(lista);

    }

    catch (err) {

      console.error(
        "Error cargando informe:",
        err
      );

      setTabla([]);

    }

  };


  /* ==========================================================
     ORDENACIÓN
  ========================================================== */

  const ordenar = (campo) => {

    const asc =
      orden.campo === campo
        ? !orden.asc
        : true;


    setOrden({
      campo,
      asc,
    });


    const ordenada =
      [...tabla].sort((a, b) => {

        const valorA =
          a[campo] ?? "";

        const valorB =
          b[campo] ?? "";


        if (valorA < valorB) {
          return asc ? -1 : 1;
        }


        if (valorA > valorB) {
          return asc ? 1 : -1;
        }


        return 0;

      });


    setTabla(ordenada);

  };


  /* ==========================================================
     EXPORTAR EXCEL / CSV
  ========================================================== */

  const exportarExcel = () => {

    const encabezados = [
      "Apoderado",
      "VC",
      "Presencial",
      "Km",
    ];


    const filas =
      filtrada.map((t) => [

        t.nombre || "Sin nombre",

        t.vc ?? 0,

        t.presencial ?? 0,

        Number(
          t.km ?? 0
        ).toFixed(2),

      ]);


    let contenido =
      encabezados.join(",") +
      "\n";


    contenido +=
      filas
        .map((f) =>
          f.join(",")
        )
        .join("\n");


    const blob =
      new Blob(
        [contenido],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      `informe_${mes}_${año}.csv`;


    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );


    URL.revokeObjectURL(
      url
    );

  };


  /* ==========================================================
     EXPORTAR PDF
  ========================================================== */

  const exportarPDF = () => {

    const ventana =
      window.open(
        "",
        "_blank"
      );


    if (!ventana) {
      return;
    }


    const totalVC =
      tabla.reduce(
        (acc, t) =>
          acc +
          Number(t.vc ?? 0),
        0
      );


    const totalPres =
      tabla.reduce(
        (acc, t) =>
          acc +
          Number(
            t.presencial ?? 0
          ),
        0
      );


    const totalKm =
      tabla.reduce(
        (acc, t) =>
          acc +
          Number(t.km ?? 0),
        0
      );


    const filas =
      filtrada
        .map(
          (t) => `
            <tr>
              <td>${t.nombre || "Sin nombre"}</td>
              <td>${t.vc ?? 0}</td>
              <td>${t.presencial ?? 0}</td>
              <td>${Number(t.km ?? 0).toFixed(2)}</td>
            </tr>
          `
        )
        .join("");


    ventana.document.write(`

      <html>

        <head>

          <title>
            Informe ${mes}/${año}
          </title>


          <style>

            * {
              box-sizing: border-box;
            }


            body {

              font-family:
                "Segoe UI",
                Arial,
                sans-serif;

              padding: 40px;

              background:
                #f5f7fb;

              color:
                #172033;

            }


            h1 {

              margin:
                0 0 6px;

              font-size:
                28px;

            }


            h2 {

              margin:
                0;

              color:
                #64748b;

              font-size:
                16px;

            }


            .card {

              background:
                white;

              padding:
                28px;

              border-radius:
                16px;

              box-shadow:
                0 8px 30px
                rgba(
                  15,
                  23,
                  42,
                  0.08
                );

            }


            table {

              width:
                100%;

              border-collapse:
                collapse;

              margin-top:
                25px;

              font-size:
                14px;

            }


            th {

              background:
                #eef2f7;

              padding:
                12px;

              text-align:
                left;

              border-bottom:
                2px solid
                #d7dee9;

            }


            td {

              padding:
                10px 12px;

              border-bottom:
                1px solid
                #e5eaf1;

            }


            tr:nth-child(even) {

              background:
                #f8fafc;

            }


            .totales {

              margin-top:
                30px;

              padding-top:
                20px;

              border-top:
                1px solid
                #e2e8f0;

              font-weight:
                600;

            }


            .totales span {

              display:
                block;

              margin-bottom:
                6px;

            }

          </style>

        </head>


        <body>

          <div class="card">

            <h1>
              Informe de Apoderados
            </h1>

            <h2>
              ${mesActual} ${año}
            </h2>


            <table>

              <thead>

                <tr>

                  <th>
                    Apoderado
                  </th>

                  <th>
                    VC
                  </th>

                  <th>
                    Presencial
                  </th>

                  <th>
                    Km
                  </th>

                </tr>

              </thead>


              <tbody>

                ${filas}

              </tbody>

            </table>


            <div class="totales">

              <span>
                Total VC:
                ${totalVC}
              </span>

              <span>
                Total Presencial:
                ${totalPres}
              </span>

              <span>
                Total Km:
                ${totalKm.toFixed(2)}
              </span>

            </div>

          </div>

        </body>

      </html>

    `);


    ventana.document.close();

    ventana.print();

  };


  /* ==========================================================
     DESTRUIR GRÁFICOS
  ========================================================== */

  const destruirGraficos = () => {

    if (chartVC.current) {

      chartVC.current.destroy();

      chartVC.current = null;

    }


    if (chartPresencial.current) {

      chartPresencial.current.destroy();

      chartPresencial.current = null;

    }


    if (chartKm.current) {

      chartKm.current.destroy();

      chartKm.current = null;

    }

  };


  /* ==========================================================
     GRÁFICOS
  ========================================================== */

  const renderGraficos = () => {

    destruirGraficos();


    if (
      !canvasVC.current ||
      !canvasPresencial.current ||
      !canvasKm.current
    ) {

      return;

    }


    const nombres =
      tabla.map(
        (t) =>
          t.nombre ||
          "Sin nombre"
      );


    /* --------------------------------------------------------
       VC
    -------------------------------------------------------- */

    chartVC.current =
      new Chart(
        canvasVC.current,
        {

          type: "bar",

          data: {

            labels:
              nombres,

            datasets: [

              {

                label:
                  "Videoconferencias",

                data:
                  tabla.map(
                    (t) =>
                      Number(
                        t.vc ?? 0
                      )
                  ),

                backgroundColor:
                  "rgba(96,165,250,0.80)",

                borderColor:
                  "#60a5fa",

                borderWidth:
                  1,

                borderRadius:
                  8,

                maxBarThickness:
                  44,

              },

            ],

          },


          options: {

            responsive:
              true,

            maintainAspectRatio:
              false,

            plugins: {

              legend: {

                labels: {

                  color:
                    "#e2e8f0",

                },

              },

            },


            scales: {

              x: {

                ticks: {

                  color:
                    "#cbd5e1",

                  maxRotation:
                    35,

                  minRotation:
                    0,

                },

                grid: {

                  color:
                    "rgba(148,163,184,0.10)",

                },

              },


              y: {

                beginAtZero:
                  true,

                ticks: {

                  color:
                    "#cbd5e1",

                  precision:
                    0,

                },

                grid: {

                  color:
                    "rgba(148,163,184,0.10)",

                },

              },

            },

          },

        }
      );


    /* --------------------------------------------------------
       PRESENCIAL
    -------------------------------------------------------- */

    chartPresencial.current =
      new Chart(
        canvasPresencial.current,
        {

          type: "bar",

          data: {

            labels:
              nombres,

            datasets: [

              {

                label:
                  "Presencial",

                data:
                  tabla.map(
                    (t) =>
                      Number(
                        t.presencial ?? 0
                      )
                  ),

                backgroundColor:
                  "rgba(52,211,153,0.80)",

                borderColor:
                  "#34d399",

                borderWidth:
                  1,

                borderRadius:
                  8,

                maxBarThickness:
                  44,

              },

            ],

          },


          options: {

            responsive:
              true,

            maintainAspectRatio:
              false,

            plugins: {

              legend: {

                labels: {

                  color:
                    "#e2e8f0",

                },

              },

            },


            scales: {

              x: {

                ticks: {

                  color:
                    "#cbd5e1",

                  maxRotation:
                    35,

                },

                grid: {

                  color:
                    "rgba(148,163,184,0.10)",

                },

              },


              y: {

                beginAtZero:
                  true,

                ticks: {

                  color:
                    "#cbd5e1",

                  precision:
                    0,

                },

                grid: {

                  color:
                    "rgba(148,163,184,0.10)",

                },

              },

            },

          },

        }
      );


    /* --------------------------------------------------------
       KM
    -------------------------------------------------------- */

    chartKm.current =
      new Chart(
        canvasKm.current,
        {

          type: "line",

          data: {

            labels:
              nombres,

            datasets: [

              {

                label:
                  "Kilómetros",

                data:
                  tabla.map(
                    (t) =>
                      Number(
                        t.km ?? 0
                      )
                  ),

                borderColor:
                  "#fb7185",

                backgroundColor:
                  "rgba(251,113,133,0.16)",

                borderWidth:
                  3,

                tension:
                  0.35,

                fill:
                  true,

                pointRadius:
                  4,

                pointHoverRadius:
                  6,

                pointBackgroundColor:
                  "#fb7185",

                pointBorderColor:
                  "#ffe4e6",

              },

            ],

          },


          options: {

            responsive:
              true,

            maintainAspectRatio:
              false,

            plugins: {

              legend: {

                labels: {

                  color:
                    "#e2e8f0",

                },

              },

            },


            scales: {

              x: {

                ticks: {

                  color:
                    "#cbd5e1",

                  maxRotation:
                    35,

                },

                grid: {

                  color:
                    "rgba(148,163,184,0.10)",

                },

              },


              y: {

                beginAtZero:
                  true,

                ticks: {

                  color:
                    "#cbd5e1",

                },

                grid: {

                  color:
                    "rgba(148,163,184,0.10)",

                },

              },

            },

          },

        }
      );

  };


  /* ==========================================================
     FILTRO
  ========================================================== */

  const filtrada =
    tabla.filter((t) =>

      String(
        t.nombre || ""
      )
        .toLowerCase()
        .includes(
          filtroNombre
            .toLowerCase()
        )

    );


  /* ==========================================================
     TOTALES
  ========================================================== */

  const totalVC =
    tabla.reduce(
      (acc, t) =>
        acc +
        Number(
          t.vc ?? 0
        ),
      0
    );


  const totalPresencial =
    tabla.reduce(
      (acc, t) =>
        acc +
        Number(
          t.presencial ?? 0
        ),
      0
    );


  const totalKm =
    tabla.reduce(
      (acc, t) =>
        acc +
        Number(
          t.km ?? 0
        ),
      0
    );


  const mediaCitas =
    tabla.length > 0
      ? (
          totalVC +
          totalPresencial
        ) /
        tabla.length
      : 0;


  const mediaKm =
    tabla.length > 0
      ? totalKm /
        tabla.length
      : 0;


  const mesActual =
    MESES.find(
      (m) =>
        m.value === mes
    )?.label || "";


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div
      className="
        min-h-full
        w-full
        rounded-3xl
        bg-gradient-to-br
        from-slate-950
        via-slate-900
        to-slate-950
        text-slate-100
        p-4
        md:p-6
        space-y-6
        overflow-x-hidden
      "
    >


      {/* ======================================================
          CABECERA
      ====================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-3xl
          border
          border-white/10
          bg-slate-900/80
          shadow-2xl
          shadow-black/30
          p-6
          md:p-7
        "
      >

        <div
          className="
            absolute
            -top-24
            -right-24
            h-64
            w-64
            rounded-full
            bg-blue-500/10
            blur-3xl
            pointer-events-none
          "
        />


        <div
          className="
            absolute
            -bottom-24
            -left-24
            h-64
            w-64
            rounded-full
            bg-purple-500/10
            blur-3xl
            pointer-events-none
          "
        />


        <div
          className="
            relative
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-5
          "
        >

          <div>

            <div
              className="
                flex
                items-center
                gap-4
              "
            >

              <div
                className="
                  w-12
                  h-12
                  rounded-2xl
                  bg-blue-500/15
                  border border-blue-400/20
                  flex
                  items-center
                  justify-center
                  text-2xl
                  shadow-lg
                "
              >
                📊
              </div>


              <div>

                <h1
                  className="
                    text-2xl
                    md:text-3xl
                    font-bold
                    text-white
                    tracking-tight
                  "
                >
                  Informes de Apoderados
                </h1>


                <p
                  className="
                    mt-1
                    text-sm
                    text-slate-400
                  "
                >
                  Estadísticas de actividad,
                  presencialidad y desplazamientos.
                </p>

              </div>

            </div>


            <div
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border border-white/10
                bg-white/[0.04]
                px-3
                py-1.5
                text-xs
                text-slate-400
              "
            >

              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-blue-400
                  shadow-[0_0_10px_rgba(96,165,250,0.8)]
                "
              />

              Periodo:

              <strong
                className="
                  font-semibold
                  text-slate-200
                "
              >
                {mesActual} {año}
              </strong>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          FILTROS
      ====================================================== */}

      <section
        className="
          rounded-3xl
          border border-white/10
          bg-slate-900/80
          shadow-xl
          shadow-black/20
          p-5
          md:p-6
        "
      >

        <div
          className="
            flex
            items-center
            gap-3
            mb-5
          "
        >

          <div
            className="
              h-9
              w-9
              rounded-xl
              bg-blue-500/10
              border border-blue-400/20
              flex
              items-center
              justify-center
              text-blue-300
            "
          >
            ⚙
          </div>


          <div>

            <h2
              className="
                text-lg
                font-semibold
                text-white
              "
            >
              Filtros del informe
            </h2>


            <p
              className="
                text-xs
                text-slate-500
              "
            >
              Selecciona el periodo y filtra los resultados.
            </p>

          </div>

        </div>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-12
            gap-4
            items-end
          "
        >

          {/* MES */}

          <div
            className="
              md:col-span-3
            "
          >

            <label
              className="
                block
                mb-2
                text-[11px]
                font-semibold
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Mes
            </label>


            <SelectSJ
              value={mes}
              onChange={(v) =>
                setMes(
                  Number(v)
                )
              }
              options={MESES}
              placeholder="Mes"
            />

          </div>


          {/* AÑO */}

          <div
            className="
              md:col-span-2
            "
          >

            <label
              className="
                block
                mb-2
                text-[11px]
                font-semibold
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Año
            </label>


            <input
              type="number"
              className="
                w-full
                rounded-xl
                border border-white/10
                bg-slate-800/80
                px-4
                py-3
                text-slate-100
                outline-none
                transition
                placeholder:text-slate-600
                focus:border-blue-400/50
                focus:ring-2
                focus:ring-blue-500/10
              "
              value={año}
              onChange={(e) =>
                setAño(
                  Number(
                    e.target.value
                  )
                )
              }
            />

          </div>


          {/* BUSCADOR */}

          <div
            className="
              md:col-span-7
            "
          >

            <label
              className="
                block
                mb-2
                text-[11px]
                font-semibold
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Buscar apoderado
            </label>


            <div
              className="
                relative
              "
            >

              <span
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-slate-500
                "
              >
                🔎
              </span>


              <input
                type="text"
                className="
                  w-full
                  rounded-xl
                  border border-white/10
                  bg-slate-800/80
                  pl-11
                  pr-4
                  py-3
                  text-slate-100
                  outline-none
                  transition
                  placeholder:text-slate-500
                  focus:border-blue-400/50
                  focus:ring-2
                  focus:ring-blue-500/10
                "
                placeholder="Buscar por nombre..."
                value={filtroNombre}
                onChange={(e) =>
                  setFiltroNombre(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          KPIS
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-5
          gap-4
        "
      >

        <KpiCard
          icon="💻"
          titulo="Total VC"
          valor={totalVC}
          subtitulo="Videoconferencias"
          clase="blue"
        />


        <KpiCard
          icon="👤"
          titulo="Total Presencial"
          valor={totalPresencial}
          subtitulo="Citas presenciales"
          clase="green"
        />


        <KpiCard
          icon="🚗"
          titulo="Km Totales"
          valor={totalKm.toFixed(1)}
          subtitulo="Kilómetros"
          clase="red"
        />


        <KpiCard
          icon="📈"
          titulo="Media Citas"
          valor={mediaCitas.toFixed(1)}
          subtitulo="Por apoderado"
          clase="purple"
        />


        <KpiCard
          icon="📍"
          titulo="Media Km"
          valor={mediaKm.toFixed(1)}
          subtitulo="Por apoderado"
          clase="orange"
        />

      </div>


      {/* ======================================================
          EXPORTACIONES
      ====================================================== */}

      <section
        className="
          rounded-2xl
          border border-white/10
          bg-slate-900/60
          px-5
          py-4
          flex
          flex-col
          sm:flex-row
          sm:items-center
          sm:justify-between
          gap-4
        "
      >

        <div>

          <div
            className="
              font-semibold
              text-sm
              text-slate-200
            "
          >
            Exportar informe
          </div>


          <div
            className="
              text-xs
              text-slate-500
              mt-1
            "
          >
            Descarga los datos del periodo seleccionado.
          </div>

        </div>


        <div
          className="
            flex
            gap-3
            flex-wrap
          "
        >

          <button
            type="button"
            onClick={exportarExcel}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border border-emerald-400/20
              bg-emerald-500/80
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-lg
              shadow-emerald-950/20
              transition
              hover:bg-emerald-500
              active:scale-[0.98]
            "
          >
            📗
            Exportar Excel
          </button>


          <button
            type="button"
            onClick={exportarPDF}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border border-red-400/20
              bg-red-500/80
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-lg
              shadow-red-950/20
              transition
              hover:bg-red-500
              active:scale-[0.98]
            "
          >
            📄
            Exportar PDF
          </button>

        </div>

      </section>


      {/* ======================================================
          TABLA
      ====================================================== */}

      <section
        className="
          overflow-hidden
          rounded-3xl
          border border-white/10
          bg-slate-900/80
          shadow-xl
          shadow-black/20
        "
      >

        <div
          className="
            px-5
            md:px-6
            py-5
            border-b border-white/10
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
          "
        >

          <div>

            <h2
              className="
                text-xl
                font-semibold
                text-white
              "
            >
              Detalle por apoderado
            </h2>


            <p
              className="
                text-xs
                text-slate-500
                mt-1
              "
            >
              {filtrada.length} registros encontrados
            </p>

          </div>


          <div
            className="
              inline-flex
              w-fit
              rounded-lg
              border border-white/10
              bg-slate-800/70
              px-3
              py-1.5
              text-xs
              text-slate-400
            "
          >
            {mesActual} {año}
          </div>

        </div>


        <div
          className="
            overflow-x-auto
          "
        >

          <table
            className="
              w-full
              min-w-[700px]
              text-sm
            "
          >

            <thead>

              <tr
                className="
                  border-b
                  border-white/10
                  bg-slate-800/70
                "
              >

                <ThOrden
                  titulo="Apoderado"
                  campo="nombre"
                  orden={orden}
                  ordenar={ordenar}
                  align="left"
                />


                <ThOrden
                  titulo="VC"
                  campo="vc"
                  orden={orden}
                  ordenar={ordenar}
                  align="center"
                />


                <ThOrden
                  titulo="Presencial"
                  campo="presencial"
                  orden={orden}
                  ordenar={ordenar}
                  align="center"
                />


                <ThOrden
                  titulo="Km Presenciales"
                  campo="km"
                  orden={orden}
                  ordenar={ordenar}
                  align="center"
                />

              </tr>

            </thead>


            <tbody>

              {filtrada.length === 0 ? (

                <tr>

                  <td
                    colSpan={4}
                    className="
                      py-14
                      text-center
                    "
                  >

                    <div
                      className="
                        text-4xl
                        mb-3
                      "
                    >
                      📭
                    </div>


                    <div
                      className="
                        text-sm
                        text-slate-400
                      "
                    >
                      No hay datos para los filtros seleccionados.
                    </div>

                  </td>

                </tr>

              ) : (

                filtrada.map(
                  (row, index) => (

                    <tr
                      key={
                        row.apoderado_id ??
                        `${row.nombre}-${index}`
                      }
                      className="
                        border-b
                        border-white/[0.06]
                        text-slate-200
                        transition
                        hover:bg-white/[0.035]
                      "
                    >

                      {/* APODERADO */}

                      <td
                        className="
                          px-5
                          md:px-6
                          py-4
                          text-left
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
                              h-9
                              w-9
                              shrink-0
                              rounded-xl
                              bg-slate-800
                              border border-white/10
                              flex
                              items-center
                              justify-center
                              text-xs
                              font-semibold
                              text-slate-400
                            "
                          >
                            {index + 1}
                          </div>


                          <span
                            className="
                              font-medium
                              text-slate-200
                            "
                          >
                            {row.nombre ||
                              "Sin nombre"}
                          </span>

                        </div>

                      </td>


                      {/* VC */}

                      <td
                        className="
                          px-5
                          md:px-6
                          py-4
                          text-center
                        "
                      >

                        <Badge
                          value={
                            row.vc ?? 0
                          }
                          clase="blue"
                        />

                      </td>


                      {/* PRESENCIAL */}

                      <td
                        className="
                          px-5
                          md:px-6
                          py-4
                          text-center
                        "
                      >

                        <Badge
                          value={
                            row.presencial ?? 0
                          }
                          clase="green"
                        />

                      </td>


                      {/* KM */}

                      <td
                        className="
                          px-5
                          md:px-6
                          py-4
                          text-center
                        "
                      >

                        <Badge
                          value={
                            Number(
                              row.km ?? 0
                            ).toFixed(1)
                          }
                          clase="red"
                        />

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          GRÁFICOS
      ====================================================== */}

      <section>

        <div
          className="
            mb-4
          "
        >

          <h2
            className="
              text-xl
              font-semibold
              text-white
            "
          >
            Análisis gráfico
          </h2>


          <p
            className="
              mt-1
              text-sm
              text-slate-500
            "
          >
            Comparativa visual de la actividad del periodo.
          </p>

        </div>


        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-3
            gap-5
          "
        >

          <GraficoCard
            titulo="Videoconferencias"
            descripcion="VC por apoderado"
            icono="💻"
          >

            <canvas
              ref={canvasVC}
            />

          </GraficoCard>


          <GraficoCard
            titulo="Presencial"
            descripcion="Citas presenciales por apoderado"
            icono="👤"
          >

            <canvas
              ref={canvasPresencial}
            />

          </GraficoCard>


          <GraficoCard
            titulo="Desplazamientos"
            descripcion="Kilómetros presenciales"
            icono="🚗"
          >

            <canvas
              ref={canvasKm}
            />

          </GraficoCard>

        </div>

      </section>

    </div>

  );
}


/* ============================================================
   KPI
============================================================ */

function KpiCard({
  icon,
  titulo,
  valor,
  subtitulo,
  clase,
}) {

  const fondos = {

    blue:
      "bg-blue-500/[0.08] border-blue-400/20",

    green:
      "bg-emerald-500/[0.08] border-emerald-400/20",

    red:
      "bg-rose-500/[0.08] border-rose-400/20",

    purple:
      "bg-purple-500/[0.08] border-purple-400/20",

    orange:
      "bg-orange-500/[0.08] border-orange-400/20",

  };


  return (

    <div
      className={`
        relative
        overflow-hidden
        rounded-2xl
        border
        p-5
        bg-slate-900/80
        shadow-lg
        shadow-black/10
        transition
        hover:-translate-y-0.5
        hover:shadow-xl
        ${fondos[clase]}
      `}
    >

      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >

        <div>

          <p
            className="
              text-[11px]
              uppercase
              tracking-wider
              font-semibold
              text-slate-400
            "
          >
            {titulo}
          </p>


          <div
            className="
              mt-2
              text-3xl
              font-bold
              tracking-tight
              text-white
            "
          >
            {valor}
          </div>


          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            {subtitulo}
          </p>

        </div>


        <div
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-slate-800/80
            border border-white/10
            text-xl
          "
        >
          {icon}
        </div>

      </div>

    </div>

  );
}


/* ============================================================
   BADGE
============================================================ */

function Badge({
  value,
  clase,
}) {

  const estilos = {

    blue:
      "bg-blue-500/10 border-blue-400/20 text-blue-300",

    green:
      "bg-emerald-500/10 border-emerald-400/20 text-emerald-300",

    red:
      "bg-rose-500/10 border-rose-400/20 text-rose-300",

  };


  return (

    <span
      className={`
        inline-flex
        min-w-[48px]
        justify-center
        rounded-lg
        border
        px-3
        py-1.5
        font-semibold
        ${estilos[clase]}
      `}
    >
      {value}
    </span>

  );
}


/* ============================================================
   CABECERA TABLA
============================================================ */

function ThOrden({
  titulo,
  campo,
  orden,
  ordenar,
  align = "left",
}) {

  const activo =
    orden.campo === campo;


  return (

    <th
      className={`
        px-5
        md:px-6
        py-4
        font-semibold
        text-slate-300
        ${align === "center"
          ? "text-center"
          : "text-left"}
      `}
    >

      <button
        type="button"
        onClick={() =>
          ordenar(campo)
        }
        className="
          inline-flex
          items-center
          gap-2
          transition
          hover:text-white
        "
      >

        {titulo}


        <span
          className={`
            text-[10px]
            ${
              activo
                ? "text-blue-400"
                : "text-slate-600"
            }
          `}
        >
          {activo
            ? orden.asc
              ? "▲"
              : "▼"
            : "↕"}
        </span>

      </button>

    </th>

  );
}


/* ============================================================
   TARJETA GRÁFICO
============================================================ */

function GraficoCard({
  titulo,
  descripcion,
  icono,
  children,
}) {

  return (

    <div
      className="
        overflow-hidden
        rounded-3xl
        border border-white/10
        bg-slate-900/80
        shadow-xl
        shadow-black/20
      "
    >

      <div
        className="
          px-5
          py-4
          border-b border-white/10
          bg-slate-800/30
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
              h-10
              w-10
              rounded-xl
              bg-slate-800
              border border-white/10
              flex
              items-center
              justify-center
            "
          >
            {icono}
          </div>


          <div>

            <h3
              className="
                text-sm
                font-semibold
                text-slate-200
              "
            >
              {titulo}
            </h3>


            <p
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              {descripcion}
            </p>

          </div>

        </div>

      </div>


      <div
        className="
          h-[300px]
          p-5
        "
      >

        {children}

      </div>

    </div>

  );

}
