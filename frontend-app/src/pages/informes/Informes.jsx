import { Fragment, useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../../api/config";
import Chart from "chart.js/auto";
import SelectSJ from "../../components/ui/SelectSJ";

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
   INFORMES — MOLSAN ERP PREMIUM 2027
   ESTILO GLASS LUXE CLARO
============================================================ */

function InformeCitasApoderados() {

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


  /* ==========================================================
     CARGA
  ========================================================== */

  useEffect(() => {

    cargarTabla();

  }, [mes, año]);


  /* ==========================================================
     GRÁFICOS
  ========================================================== */

  useEffect(() => {

    const timer =
      setTimeout(() => {
        renderGraficos();
      }, 50);

    return () => {

      clearTimeout(timer);

      destruirGraficos();

    };

  }, [tabla]);


  /* ==========================================================
     CARGAR DATOS
  ========================================================== */

  const cargarTabla = async () => {

    try {

      const res =
        await axios.get(
          `${API_BASE}/informes/apoderados/tabla`,
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

          km:
            Number(
              t.km ??
              t.distancia_km ??
              0
            ) || 0,

          vc:
            Number(t.vc || 0),

          presencial:
            Number(
              t.presencial || 0
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

        if (a[campo] < b[campo]) {
          return asc ? -1 : 1;
        }

        if (a[campo] > b[campo]) {
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
      tabla.map((t) => [

        t.nombre,

        t.vc,

        t.presencial,

        Number(t.km || 0)
          .toFixed(2),

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

    link.click();


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
          acc + Number(t.vc || 0),
        0
      );


    const totalPres =
      tabla.reduce(
        (acc, t) =>
          acc +
          Number(
            t.presencial || 0
          ),
        0
      );


    const totalKm =
      tabla.reduce(
        (acc, t) =>
          acc +
          Number(t.km || 0),
        0
      );


    const filas =
      tabla
        .map(
          (t) => `
            <tr>
              <td>${t.nombre || "Sin nombre"}</td>
              <td>${t.vc || 0}</td>
              <td>${t.presencial || 0}</td>
              <td>${Number(t.km || 0).toFixed(2)}</td>
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

            body {
              font-family:
                'Segoe UI',
                Arial,
                sans-serif;

              padding: 40px;

              background:
                #f3f7fc;

              color:
                #24344d;
            }


            .card {

              background:
                white;

              padding:
                28px;

              border-radius:
                18px;

              border:
                1px solid #dbe7f4;

              box-shadow:
                0 10px 30px
                rgba(38, 68, 104, 0.10);
            }


            h1 {

              font-size:
                26px;

              margin-bottom:
                5px;

              color:
                #183b66;
            }


            h2 {

              font-size:
                17px;

              margin-top:
                0;

              color:
                #6f86a3;
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
                #edf4fc;

              padding:
                11px;

              border-bottom:
                2px solid #d4e2f1;

              text-align:
                left;

              color:
                #31577f;
            }


            td {

              padding:
                9px;

              border-bottom:
                1px solid #e4edf6;
            }


            tr:nth-child(even) {

              background:
                #f8fbfe;
            }


            .totales {

              margin-top:
                30px;

              font-size:
                15px;

              font-weight:
                600;

              color:
                #31577f;
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
              Informe de Citas de Apoderados
            </h1>

            <h2>
              ${mes}/${año}
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
                Total VC: ${totalVC}
              </span>

              <span>
                Total Presencial: ${totalPres}
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

    [
      "graficoVC",
      "graficoP",
      "graficoKm",
    ].forEach((id) => {

      const chart =
        Chart.getChart(id);

      if (chart) {
        chart.destroy();
      }

    });

  };


  /* ==========================================================
     GRÁFICOS
  ========================================================== */

  const renderGraficos = () => {

    destruirGraficos();


    const ctx1 =
      document.getElementById(
        "graficoVC"
      );

    const ctx2 =
      document.getElementById(
        "graficoP"
      );

    const ctx3 =
      document.getElementById(
        "graficoKm"
      );


    if (
      !ctx1 ||
      !ctx2 ||
      !ctx3
    ) {
      return;
    }


    const labels =
      tabla.map(
        (t) =>
          t.nombre ||
          "Sin nombre"
      );


    const colorTexto =
      "#7186a3";

    const colorGrid =
      "rgba(102, 135, 170, 0.13)";


    /* --------------------------------------------------------
       VC
    -------------------------------------------------------- */

    new Chart(
      ctx1,
      {

        type:
          "bar",

        data: {

          labels,

          datasets: [

            {

              label:
                "Videoconferencias",

              data:
                tabla.map(
                  (t) =>
                    Number(
                      t.vc || 0
                    )
                ),

              backgroundColor:
                "rgba(96, 165, 250, 0.78)",

              borderColor:
                "#60a5fa",

              borderWidth:
                1,

              borderRadius:
                8,

              maxBarThickness:
                42,

            },

          ],

        },


        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          animation: {
            duration: 500,
          },

          plugins: {

            legend: {

              labels: {

                color:
                  colorTexto,

                font: {
                  size: 11,
                  weight: "600",
                },

              },

            },

          },


          scales: {

            x: {

              ticks: {

                color:
                  colorTexto,

                font: {
                  size: 10,
                },

              },

              grid: {
                color:
                  colorGrid,
              },

              border: {
                color:
                  "#dbe7f4",
              },

            },


            y: {

              beginAtZero:
                true,

              ticks: {

                color:
                  colorTexto,

                font: {
                  size: 10,
                },

              },

              grid: {
                color:
                  colorGrid,
              },

              border: {
                color:
                  "#dbe7f4",
              },

            },

          },

        },

      }
    );


    /* --------------------------------------------------------
       PRESENCIAL
    -------------------------------------------------------- */

    new Chart(
      ctx2,
      {

        type:
          "bar",

        data: {

          labels,

          datasets: [

            {

              label:
                "Presencial",

              data:
                tabla.map(
                  (t) =>
                    Number(
                      t.presencial || 0
                    )
                ),

              backgroundColor:
                "rgba(52, 211, 153, 0.78)",

              borderColor:
                "#34d399",

              borderWidth:
                1,

              borderRadius:
                8,

              maxBarThickness:
                42,

            },

          ],

        },


        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          animation: {
            duration: 500,
          },

          plugins: {

            legend: {

              labels: {

                color:
                  colorTexto,

                font: {
                  size: 11,
                  weight: "600",
                },

              },

            },

          },


          scales: {

            x: {

              ticks: {

                color:
                  colorTexto,

                font: {
                  size: 10,
                },

              },

              grid: {
                color:
                  colorGrid,
              },

              border: {
                color:
                  "#dbe7f4",
              },

            },


            y: {

              beginAtZero:
                true,

              ticks: {

                color:
                  colorTexto,

                font: {
                  size: 10,
                },

              },

              grid: {
                color:
                  colorGrid,
              },

              border: {
                color:
                  "#dbe7f4",
              },

            },

          },

        },

      }
    );


    /* --------------------------------------------------------
       KM
    -------------------------------------------------------- */

    new Chart(
      ctx3,
      {

        type:
          "line",

        data: {

          labels,

          datasets: [

            {

              label:
                "Kilómetros",

              data:
                tabla.map(
                  (t) =>
                    Number(
                      t.km || 0
                    )
                ),

              borderColor:
                "#f43f5e",

              backgroundColor:
                "rgba(244, 63, 94, 0.10)",

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
                "#f43f5e",

              pointBorderColor:
                "#ffffff",

              pointBorderWidth:
                2,

            },

          ],

        },


        options: {

          responsive:
            true,

          maintainAspectRatio:
            false,

          animation: {
            duration: 500,
          },

          plugins: {

            legend: {

              labels: {

                color:
                  colorTexto,

                font: {
                  size: 11,
                  weight: "600",
                },

              },

            },

          },


          scales: {

            x: {

              ticks: {

                color:
                  colorTexto,

                font: {
                  size: 10,
                },

              },

              grid: {
                color:
                  colorGrid,
              },

              border: {
                color:
                  "#dbe7f4",
              },

            },


            y: {

              beginAtZero:
                true,

              ticks: {

                color:
                  colorTexto,

                font: {
                  size: 10,
                },

              },

              grid: {
                color:
                  colorGrid,
              },

              border: {
                color:
                  "#dbe7f4",
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
    tabla.filter(
      (t) =>
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
          t.vc || 0
        ),
      0
    );


  const totalPresencial =
    tabla.reduce(
      (acc, t) =>
        acc +
        Number(
          t.presencial || 0
        ),
      0
    );


  const totalKm =
    tabla.reduce(
      (acc, t) =>
        acc +
        Number(
          t.km || 0
        ),
      0
    );


  const mediaCitas =
    tabla.length > 0
      ? (
          totalVC +
          totalPresencial
        ) / tabla.length
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
        min-h-screen
        bg-gradient-to-br
        from-[#eef5fb]
        via-[#f7faff]
        to-[#eaf2fb]
        text-slate-700
        p-4
        md:p-6
        space-y-6
      "
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div
        className="
          relative
          overflow-hidden
          bg-white/70
          backdrop-blur-xl
          border border-white/80
          rounded-2xl
          p-6
          shadow-[0_10px_35px_rgba(55,85,120,0.10)]
        "
      >

        <div
          className="
            absolute
            -top-24
            -right-24
            w-64
            h-64
            bg-blue-300/20
            rounded-full
            blur-3xl
            pointer-events-none
          "
        />

        <div
          className="
            absolute
            -bottom-24
            -left-24
            w-64
            h-64
            bg-purple-300/15
            rounded-full
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
                gap-3
              "
            >

              <div
                className="
                  w-12
                  h-12
                  rounded-xl
                  bg-blue-100
                  border border-blue-200
                  flex
                  items-center
                  justify-center
                  text-xl
                  shadow-sm
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
                    text-slate-800
                  "
                >
                  Informes de Apoderados
                </h1>


                <p
                  className="
                    text-sm
                    text-slate-500
                    mt-1
                  "
                >
                  Estadísticas de actividad,
                  presencialidad y desplazamientos.
                </p>

              </div>

            </div>


            <div
              className="
                mt-4
                inline-flex
                items-center
                gap-2
                px-3
                py-1.5
                rounded-full
                bg-white/80
                border border-slate-200
                text-slate-500
                text-xs
                shadow-sm
              "
            >

              <span
                className="
                  w-2
                  h-2
                  rounded-full
                  bg-blue-400
                "
              />

              Periodo:

              <strong
                className="
                  text-slate-700
                "
              >
                {mesActual} {año}
              </strong>

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          FILTROS
      ====================================================== */}

      <div
        className="
          bg-white/70
          backdrop-blur-xl
          border border-white/80
          rounded-2xl
          p-6
          shadow-[0_10px_35px_rgba(55,85,120,0.09)]
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
              w-9
              h-9
              rounded-lg
              bg-blue-50
              border border-blue-100
              flex
              items-center
              justify-center
              text-blue-500
            "
          >
            ⚙
          </div>


          <div>

            <h2
              className="
                text-lg
                font-semibold
                text-slate-800
              "
            >
              Filtros del informe
            </h2>

            <p
              className="
                text-xs
                text-slate-400
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
            gap-5
            items-end
          "
        >

          {/* MES */}

          <div
            className="
              md:col-span-3
              flex
              flex-col
            "
          >

            <label
              className="
                text-slate-500
                text-xs
                font-semibold
                uppercase
                tracking-wide
                mb-2
              "
            >
              Mes
            </label>


            <div
              className="
                rounded-xl
                bg-white
                border border-slate-200
                shadow-sm
              "
            >

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

          </div>


          {/* AÑO */}

          <div
            className="
              md:col-span-2
              flex
              flex-col
            "
          >

            <label
              className="
                text-slate-500
                text-xs
                font-semibold
                uppercase
                tracking-wide
                mb-2
              "
            >
              Año
            </label>


            <input
              type="number"
              className="
                w-full
                bg-white
                border border-slate-200
                rounded-xl
                px-3
                py-2.5
                text-slate-700
                outline-none
                transition
                shadow-sm
                focus:border-blue-400
                focus:ring-2
                focus:ring-blue-100
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
              flex
              flex-col
            "
          >

            <label
              className="
                text-slate-500
                text-xs
                font-semibold
                uppercase
                tracking-wide
                mb-2
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
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              >
                🔎
              </span>


              <input
                type="text"
                className="
                  w-full
                  bg-white
                  border border-slate-200
                  rounded-xl
                  pl-10
                  pr-4
                  py-2.5
                  text-slate-700
                  placeholder-slate-400
                  outline-none
                  transition
                  shadow-sm
                  focus:border-blue-400
                  focus:ring-2
                  focus:ring-blue-100
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

      </div>


      {/* ======================================================
          KPIs
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

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-center
          justify-between
          gap-4
          bg-white/65
          backdrop-blur-xl
          border border-white/80
          rounded-2xl
          p-4
          shadow-[0_8px_25px_rgba(55,85,120,0.07)]
        "
      >

        <div>

          <div
            className="
              text-slate-700
              font-semibold
              text-sm
            "
          >
            Exportar informe
          </div>


          <div
            className="
              text-slate-400
              text-xs
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
            onClick={exportarExcel}
            className="
              px-4
              py-2.5
              rounded-xl
              bg-emerald-500
              hover:bg-emerald-600
              border border-emerald-400
              text-white
              text-sm
              font-semibold
              shadow-[0_6px_18px_rgba(16,185,129,0.22)]
              transition
              active:scale-[0.97]
              flex
              items-center
              gap-2
            "
          >
            <span>📗</span>
            Exportar Excel
          </button>


          <button
            onClick={exportarPDF}
            className="
              px-4
              py-2.5
              rounded-xl
              bg-rose-500
              hover:bg-rose-600
              border border-rose-400
              text-white
              text-sm
              font-semibold
              shadow-[0_6px_18px_rgba(244,63,94,0.20)]
              transition
              active:scale-[0.97]
              flex
              items-center
              gap-2
            "
          >
            <span>📄</span>
            Exportar PDF
          </button>

        </div>

      </div>


      {/* ======================================================
          TABLA
      ====================================================== */}

      <div
        className="
          bg-white/72
          backdrop-blur-xl
          border border-white/80
          rounded-2xl
          shadow-[0_10px_35px_rgba(55,85,120,0.09)]
          overflow-hidden
        "
      >

        <div
          className="
            px-6
            py-5
            border-b border-slate-200/80
            flex
            items-center
            justify-between
            gap-4
          "
        >

          <div>

            <h2
              className="
                text-xl
                font-bold
                text-slate-800
              "
            >
              Detalle por apoderado
            </h2>


            <p
              className="
                text-xs
                text-slate-400
                mt-1
              "
            >
              {filtrada.length} registros encontrados
            </p>

          </div>


          <div
            className="
              px-3
              py-1.5
              rounded-lg
              bg-blue-50
              border border-blue-100
              text-xs
              text-blue-600
              font-medium
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
              text-slate-700
              text-sm
            "
          >

            <thead
              className="
                bg-blue-50/70
                border-b border-blue-100
              "
            >

              <tr>

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
                      py-12
                      text-center
                      text-slate-400
                    "
                  >

                    <div
                      className="
                        text-3xl
                        mb-2
                      "
                    >
                      📭
                    </div>


                    <div
                      className="
                        text-sm
                        text-slate-500
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
                        border-slate-100
                        hover:bg-blue-50/45
                        transition
                        group
                      "
                    >

                      {/* APODERADO */}

                      <td
                        className="
                          py-3.5
                          px-6
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
                              w-8
                              h-8
                              rounded-lg
                              bg-blue-50
                              border border-blue-100
                              flex
                              items-center
                              justify-center
                              text-xs
                              text-blue-600
                              font-semibold
                              group-hover:bg-blue-100
                              transition
                            "
                          >
                            {index + 1}
                          </div>


                          <span
                            className="
                              font-semibold
                              text-slate-700
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
                          py-3.5
                          px-6
                          text-center
                        "
                      >

                        <span
                          className="
                            inline-flex
                            min-w-[42px]
                            justify-center
                            px-2.5
                            py-1
                            rounded-lg
                            bg-blue-50
                            border border-blue-200
                            text-blue-700
                            font-semibold
                          "
                        >
                          {row.vc}
                        </span>

                      </td>


                      {/* PRESENCIAL */}

                      <td
                        className="
                          py-3.5
                          px-6
                          text-center
                        "
                      >

                        <span
                          className="
                            inline-flex
                            min-w-[42px]
                            justify-center
                            px-2.5
                            py-1
                            rounded-lg
                            bg-emerald-50
                            border border-emerald-200
                            text-emerald-700
                            font-semibold
                          "
                        >
                          {row.presencial}
                        </span>

                      </td>


                      {/* KM */}

                      <td
                        className="
                          py-3.5
                          px-6
                          text-center
                        "
                      >

                        <span
                          className="
                            inline-flex
                            min-w-[60px]
                            justify-center
                            px-2.5
                            py-1
                            rounded-lg
                            bg-rose-50
                            border border-rose-200
                            text-rose-600
                            font-semibold
                          "
                        >
                          {row.km
                            ? row.km.toFixed(1)
                            : "0.0"}
                        </span>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* ======================================================
          GRÁFICOS
      ====================================================== */}

      <div>

        <div
          className="
            mb-4
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              w-10
              h-10
              rounded-xl
              bg-blue-50
              border border-blue-100
              flex
              items-center
              justify-center
              text-blue-500
            "
          >
            📊
          </div>


          <div>

            <h2
              className="
                text-xl
                font-bold
                text-slate-800
              "
            >
              Análisis gráfico
            </h2>


            <p
              className="
                text-sm
                text-slate-400
                mt-1
              "
            >
              Comparativa visual de la actividad del periodo.
            </p>

          </div>

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
              id="graficoVC"
            />

          </GraficoCard>


          <GraficoCard
            titulo="Presencial"
            descripcion="Citas presenciales por apoderado"
            icono="👤"
          >

            <canvas
              id="graficoP"
            />

          </GraficoCard>


          <GraficoCard
            titulo="Desplazamientos"
            descripcion="Kilómetros presenciales"
            icono="🚗"
          >

            <canvas
              id="graficoKm"
            />

          </GraficoCard>

        </div>

      </div>

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
      "bg-blue-50/80 border-blue-200",

    green:
      "bg-emerald-50/80 border-emerald-200",

    red:
      "bg-rose-50/80 border-rose-200",

    purple:
      "bg-purple-50/80 border-purple-200",

    orange:
      "bg-orange-50/80 border-orange-200",

  };


  const colores = {

    blue:
      "text-blue-700",

    green:
      "text-emerald-700",

    red:
      "text-rose-700",

    purple:
      "text-purple-700",

    orange:
      "text-orange-700",

  };


  return (

    <div
      className={`
        relative
        overflow-hidden
        rounded-2xl
        border
        p-5
        shadow-[0_8px_25px_rgba(55,85,120,0.08)]
        transition
        hover:-translate-y-0.5
        hover:shadow-[0_12px_30px_rgba(55,85,120,0.12)]
        ${fondos[clase]}
      `}
    >

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >

        <div>

          <p
            className="
              text-xs
              uppercase
              tracking-wide
              text-slate-500
              font-semibold
            "
          >
            {titulo}
          </p>


          <div
            className="
              text-3xl
              font-bold
              text-slate-800
              mt-2
            "
          >
            {valor}
          </div>


          <p
            className="
              text-xs
              text-slate-400
              mt-1
            "
          >
            {subtitulo}
          </p>

        </div>


        <div
          className={`
            w-11
            h-11
            rounded-xl
            bg-white/70
            border
            border-white
            flex
            items-center
            justify-center
            text-xl
            shadow-sm
            ${colores[clase]}
          `}
        >
          {icon}
        </div>

      </div>

    </div>

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
        py-3.5
        px-6
        font-semibold
        text-blue-800/80
        cursor-pointer
        select-none
        hover:text-blue-900
        transition
        ${
          align === "center"
            ? "text-center"
            : "text-left"
        }
      `}
      onClick={() =>
        ordenar(campo)
      }
    >

      <span
        className="
          inline-flex
          items-center
          gap-2
        "
      >

        {titulo}


        <span
          className={`
            text-[10px]
            transition
            ${
              activo
                ? "text-blue-500"
                : "text-blue-300"
            }
          `}
        >

          {activo
            ? orden.asc
              ? "▲"
              : "▼"
            : "↕"}

        </span>

      </span>

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
        bg-white/70
        backdrop-blur-xl
        border border-white/80
        rounded-2xl
        shadow-[0_10px_35px_rgba(55,85,120,0.09)]
        overflow-hidden
      "
    >

      <div
        className="
          px-5
          py-4
          border-b border-slate-200/80
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
              w-9
              h-9
              rounded-lg
              bg-blue-50
              border border-blue-100
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
                text-slate-700
              "
            >
              {titulo}
            </h3>


            <p
              className="
                text-xs
                text-slate-400
                mt-0.5
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

// ============================================================
// ERP MOLSAN — CONTENEDOR DEL MÓDULO INFORMES
// Los informes que todavía no tienen backend quedan preparados
// como apartados independientes, sin mostrar datos ficticios.
// ============================================================

const APARTADOS_INFORMES = [
  {
    key: "apoderados",
    titulo: "Informe citas apoderados",
    descripcion: "Citas presenciales, videoconferencias y desplazamientos.",
    icono: "👥",
  },
  {
    key: "firmas",
    titulo: "Informe firmas",
    descripcion: "Seguimiento de las firmas realizadas.",
    icono: "✍️",
  },
  {
    key: "facturacion",
    titulo: "Informes de facturación",
    descripcion: "Resumen de importes, facturas y estados.",
    icono: "🧾",
  },
  {
    key: "notarios",
    titulo: "Informes de notarios",
    descripcion: "Actividad y estadísticas por notario.",
    icono: "🏛️",
  },
];

// ============================================================
// INFORME DE FIRMAS REALES Y INFORME DE NOTARIOS
// Los dos informes consultan Expediente.fecha_firma; no usan citas
// de Agenda como si fueran firmas realizadas.
// ============================================================

function fechaISOInforme(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filtrosInformeIniciales() {
  const hoy = new Date();
  return {
    fecha_desde: fechaISOInforme(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    fecha_hasta: fechaISOInforme(hoy),
    modalidad: "",
    tipo_operacion: "",
    notario: "",
    apoderado: "",
    q: "",
  };
}

function fechaInformeVisible(valor) {
  if (!valor) return "—";
  const texto = String(valor);
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : texto;
}

function numeroInforme(valor, decimales = 0) {
  if (valor === null || valor === undefined || valor === "" || Number.isNaN(Number(valor))) return "—";
  return Number(valor).toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function escaparHTMLInforme(valor) {
  return String(valor ?? "—").replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[caracter]));
}

function imprimirInforme(titulo, periodo, columnas, filas) {
  const ventana = window.open("", "_blank");
  if (!ventana) {
    window.alert("El navegador ha bloqueado la ventana de impresión. Permite las ventanas emergentes para exportar a PDF.");
    return;
  }
  const th = columnas.map((c) => `<th>${escaparHTMLInforme(c.label)}</th>`).join("");
  const trs = filas.map((fila) => `<tr>${columnas.map((c) => `<td>${escaparHTMLInforme(c.render ? c.render(fila) : fila[c.key])}</td>`).join("")}</tr>`).join("");
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${escaparHTMLInforme(titulo)}</title><style>
    @page{size:landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#24344d;padding:12px}h1{color:#183b66;margin:0 0 4px}p{color:#7186a3;margin:0 0 18px;font-size:12px}table{border-collapse:collapse;width:100%;font-size:9px}th{background:#edf4fc;color:#31577f;text-align:left}th,td{border:1px solid #dbe7f4;padding:6px;vertical-align:top}tr:nth-child(even){background:#f8fbfe}
    </style></head><body><h1>${escaparHTMLInforme(titulo)}</h1><p>Periodo: ${escaparHTMLInforme(periodo)} · Registros: ${filas.length}</p><table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`);
  ventana.document.close();
}

function descargarBlobInforme(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function CampoFiltroInforme({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function SelectFiltroInforme({ label, value, onChange, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{children}</select>
    </label>
  );
}

function InformeKpi({ titulo, valor, subtitulo, icono }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_8px_25px_rgba(55,85,120,0.07)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{valor}</div>
          {subtitulo && <div className="mt-1 text-xs text-slate-400">{subtitulo}</div>}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">{icono}</span>
      </div>
    </div>
  );
}

function AvisoInforme({ error }) {
  if (!error) return null;
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
}

function PanelEstadoInforme({ loading, vacio, textoVacio = "No hay registros para los filtros seleccionados." }) {
  if (loading) return <div className="px-5 py-12 text-center text-sm text-slate-500">Consultando datos reales del ERP…</div>;
  if (vacio) return <div className="px-5 py-12 text-center text-sm text-slate-500"><div className="mb-2 text-3xl">📭</div>{textoVacio}</div>;
  return null;
}

async function descargarExcelBackend(url, params, nombre) {
  const respuesta = await axios.get(url, { params, responseType: "blob" });
  descargarBlobInforme(respuesta.data, nombre);
}

// ------------------------------ INFORME DE FIRMAS ------------------------------
function InformeFirmas() {
  const [filtros, setFiltros] = useState(filtrosInformeIniciales);
  const [aplicados, setAplicados] = useState(filtrosInformeIniciales);
  const [datos, setDatos] = useState({ resumen: {}, por_tipo_operacion: [], items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const [editandoId, setEditandoId] = useState("");
  const [edicionFirma, setEdicionFirma] = useState({ modalidad: "SIN_CLASIFICAR", fecha_envio: "" });
  const [guardandoDatosFirma, setGuardandoDatosFirma] = useState(false);
  const [mensajeEdicionFirma, setMensajeEdicionFirma] = useState("");

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setLoading(true);
      setError("");
      try {
        const params = Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v !== "" && v != null));
        const respuesta = await axios.get(`${API_BASE}/informes/firmas`, { params });
        if (activo) setDatos({ resumen: respuesta.data?.resumen || {}, por_tipo_operacion: respuesta.data?.por_tipo_operacion || [], items: respuesta.data?.items || [] });
      } catch (e) {
        if (activo) {
          setDatos({ resumen: {}, por_tipo_operacion: [], items: [] });
          setError(e?.response?.data?.detail || "No se ha podido cargar el informe de firmas. Comprueba que el endpoint de informes esté instalado en el backend.");
        }
      } finally {
        if (activo) setLoading(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [aplicados, recarga]);

  const cambiar = (campo, valor) => setFiltros((actual) => ({ ...actual, [campo]: valor }));
  const aplicar = (e) => {
    e.preventDefault();
    if (filtros.fecha_desde && filtros.fecha_hasta && filtros.fecha_desde > filtros.fecha_hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    setError("");
    setAplicados({ ...filtros });
  };
  const limpiar = () => {
    const inicial = filtrosInformeIniciales();
    setFiltros(inicial);
    setAplicados(inicial);
    setError("");
  };
  const periodo = `${fechaInformeVisible(aplicados.fecha_desde)} – ${fechaInformeVisible(aplicados.fecha_hasta)}`;
  const resumen = datos.resumen || {};
  const filas = datos.items || [];
  const firmasSinClasificar = Number(resumen.sin_clasificar || 0);
  const firmasSinTiempo = Math.max(
    0,
    Number(resumen.total_firmas || 0) - Number(resumen.firmas_con_tiempo_calculable || 0)
  );
  const columnasPDF = [
    { key: "fecha_firma", label: "Fecha firma", render: (f) => fechaInformeVisible(f.fecha_firma) },
    { key: "id_expediente", label: "N.º expediente" },
    { key: "nombre_titular", label: "Titular" },
    { key: "tipo_operacion", label: "Tipo operación" },
    { key: "modalidad", label: "Modalidad", render: (f) => f.modalidad === "VC" ? "Videoconferencia" : f.modalidad === "PRESENCIAL" ? "Presencial" : "Sin clasificar" },
    { key: "nombre_notario", label: "Notario" },
    { key: "apoderado", label: "Apoderado" },
    { key: "fecha_envio", label: "Fecha envío", render: (f) => fechaInformeVisible(f.fecha_envio) },
    { key: "dias_envio_firma", label: "Días envío-firma" },
    { key: "protocolo", label: "Protocolo" },
  ];

  const iniciarEdicionFirma = (fila) => {
    setEditandoId(String(fila.id_expediente || ""));
    setEdicionFirma({
      modalidad: fila.modalidad === "VC" ? "VC" : fila.modalidad === "PRESENCIAL" ? "PRESENCIAL" : "SIN_CLASIFICAR",
      fecha_envio: String(fila.fecha_envio || "").slice(0, 10),
    });
    setMensajeEdicionFirma("");
    setError("");
  };

  const guardarDatosFirma = async (fila) => {
    if (!fila?.id_expediente || guardandoDatosFirma) return;
    setGuardandoDatosFirma(true);
    setError("");
    setMensajeEdicionFirma("");
    try {
      await axios.put(
        `${API_BASE}/informes/firmas/${encodeURIComponent(fila.id_expediente)}/datos`,
        {
          modalidad: edicionFirma.modalidad,
          fecha_envio: edicionFirma.fecha_envio || null,
        }
      );
      setMensajeEdicionFirma(`Datos de la firma del expediente ${fila.id_expediente} guardados correctamente.`);
      setEditandoId("");
      setRecarga((valor) => valor + 1);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : detail?.mensaje || JSON.stringify(detail) || "No se pudieron guardar los datos de la firma.");
    } finally {
      setGuardandoDatosFirma(false);
    }
  };

  const exportarExcel = async () => {
    setExportando(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v !== "" && v != null));
      await descargarExcelBackend(`${API_BASE}/informes/firmas/exportar-excel`, params, `informe_firmas_${aplicados.fecha_desde || "desde_inicio"}_${aplicados.fecha_hasta || "hasta_hoy"}.xlsx`);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo exportar el informe de firmas a Excel.");
    } finally { setExportando(false); }
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_10px_35px_rgba(55,85,120,0.09)] backdrop-blur-xl md:p-6">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xl">✍️</span><div><h2 className="text-xl font-bold text-slate-800">Informe de firmas</h2><p className="mt-1 text-sm text-slate-500">Histórico de firmas reales a partir de expedientes con fecha de firma registrada. Las citas de Agenda no se consideran firmas realizadas.</p></div></div>
      </header>

      <form onSubmit={aplicar} className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-800">Filtros del informe</h3><p className="mt-1 text-xs text-slate-500">El periodo se aplica a la fecha real de firma.</p></div><button type="button" onClick={limpiar} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Restablecer</button></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CampoFiltroInforme label="Fecha firma desde" type="date" value={filtros.fecha_desde} onChange={(v) => cambiar("fecha_desde", v)} />
          <CampoFiltroInforme label="Fecha firma hasta" type="date" value={filtros.fecha_hasta} onChange={(v) => cambiar("fecha_hasta", v)} />
          <SelectFiltroInforme label="Modalidad" value={filtros.modalidad} onChange={(v) => cambiar("modalidad", v)}><option value="">Todas las modalidades</option><option value="VC">Videoconferencia</option><option value="PRESENCIAL">Presencial</option><option value="SIN_CLASIFICAR">Sin clasificar</option></SelectFiltroInforme>
          <CampoFiltroInforme label="Tipo de operación" value={filtros.tipo_operacion} onChange={(v) => cambiar("tipo_operacion", v)} placeholder="Filtrar operación" />
          <CampoFiltroInforme label="Notario" value={filtros.notario} onChange={(v) => cambiar("notario", v)} placeholder="Nombre o NIF" />
          <CampoFiltroInforme label="Apoderado" value={filtros.apoderado} onChange={(v) => cambiar("apoderado", v)} placeholder="Nombre del apoderado" />
          <div className="sm:col-span-2"><CampoFiltroInforme label="Buscar expediente, titular, solicitante o protocolo" value={filtros.q} onChange={(v) => cambiar("q", v)} placeholder="N.º expediente, NIF, titular…" /></div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3"><button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Aplicar filtros</button></div>
      </form>

      <AvisoInforme error={error} />
      {mensajeEdicionFirma && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensajeEdicionFirma}</div>}
      {(firmasSinClasificar > 0 || firmasSinTiempo > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">Hay datos históricos pendientes de completar</p>
          <p className="mt-1">
            {firmasSinClasificar > 0 ? `${numeroInforme(firmasSinClasificar)} firma(s) sin modalidad confirmada. ` : ""}
            {firmasSinTiempo > 0 ? `${numeroInforme(firmasSinTiempo)} firma(s) sin fecha de envío válida. ` : ""}
            Utiliza «Completar datos» en cada fila e introduce solo información verificada. No se deduce la modalidad ni la fecha a partir de las citas de Agenda.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <InformeKpi icono="✍️" titulo="Firmas reales" valor={numeroInforme(resumen.total_firmas)} subtitulo="Expedientes con fecha de firma" />
        <InformeKpi icono="💻" titulo="Videoconferencia" valor={numeroInforme(resumen.videoconferencia)} />
        <InformeKpi icono="🏛️" titulo="Presencial" valor={numeroInforme(resumen.presencial)} />
        <InformeKpi icono="❔" titulo="Sin clasificar" valor={numeroInforme(resumen.sin_clasificar)} />
        <InformeKpi icono="⏱️" titulo="Media envío-firma" valor={resumen.media_dias_envio_firma == null ? "—" : `${numeroInforme(resumen.media_dias_envio_firma, 1)} días`} subtitulo={`${numeroInforme(resumen.firmas_con_tiempo_calculable)} con fechas válidas`} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4"><div><h3 className="font-bold text-slate-800">Resumen por tipo de operación</h3><p className="mt-1 text-xs text-slate-500">Conteo de firmas reales y días medios cuando existen fecha de envío y de firma.</p></div><span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{periodo}</span></div>
        {loading ? <PanelEstadoInforme loading /> : datos.por_tipo_operacion.length === 0 ? <PanelEstadoInforme vacio /> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-blue-50/70 text-xs uppercase tracking-wide text-blue-800/80"><tr><th className="px-5 py-3 text-left">Tipo de operación</th><th className="px-5 py-3 text-right">Firmas</th><th className="px-5 py-3 text-right">VC</th><th className="px-5 py-3 text-right">Presencial</th><th className="px-5 py-3 text-right">Media días</th></tr></thead><tbody>{datos.por_tipo_operacion.map((f, i) => <tr key={`${f.tipo_operacion}-${i}`} className="border-t border-slate-100 hover:bg-blue-50/40"><td className="px-5 py-3 font-medium text-slate-700">{f.tipo_operacion}</td><td className="px-5 py-3 text-right font-semibold">{numeroInforme(f.total_firmas)}</td><td className="px-5 py-3 text-right">{numeroInforme(f.vc)}</td><td className="px-5 py-3 text-right">{numeroInforme(f.presencial)}</td><td className="px-5 py-3 text-right text-blue-700">{f.media_dias == null ? "—" : `${numeroInforme(f.media_dias, 1)} días`}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4"><div><h3 className="font-bold text-slate-800">Detalle de firmas</h3><p className="mt-1 text-xs text-slate-500">{numeroInforme(filas.length)} registros recibidos del backend. Puedes completar modalidad y fecha de envío desde la columna de acciones.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={loading || exportando} onClick={exportarExcel} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{exportando ? "Exportando…" : "📗 Exportar Excel"}</button><button type="button" disabled={loading || filas.length === 0} onClick={() => imprimirInforme("Informe de firmas reales", periodo, columnasPDF, filas)} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">📄 Exportar PDF</button></div></div>
        {loading ? <PanelEstadoInforme loading /> : filas.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay firmas reales para el periodo y los filtros seleccionados." /> : <div className="max-h-[700px] overflow-auto"><table className="w-full min-w-[1420px] text-sm"><thead className="sticky top-0 z-10 bg-blue-50 text-left text-xs uppercase tracking-wide text-blue-800/80"><tr>{columnasPDF.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-3">{c.label}</th>)}<th className="whitespace-nowrap px-4 py-3">Acciones</th></tr></thead><tbody>{filas.map((f, i) => <Fragment key={f.id ?? `${f.id_expediente}-${i}`}>
          <tr className="border-t border-slate-100 hover:bg-blue-50/40">
            <td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_firma)}</td>
            <td className="px-4 py-3 font-semibold text-blue-700">{f.id_expediente || "—"}</td>
            <td className="max-w-[240px] px-4 py-3">{f.nombre_titular || "—"}</td>
            <td className="px-4 py-3">{f.tipo_operacion || "—"}</td>
            <td className="px-4 py-3">{f.modalidad === "VC" ? "Videoconferencia" : f.modalidad === "PRESENCIAL" ? "Presencial" : <span className="font-semibold text-amber-700">Sin clasificar</span>}</td>
            <td className="px-4 py-3">{f.nombre_notario || "—"}</td>
            <td className="px-4 py-3">{f.apoderado || "—"}</td>
            <td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_envio)}</td>
            <td className="px-4 py-3 text-right">{f.dias_envio_firma == null ? "—" : numeroInforme(f.dias_envio_firma)}</td>
            <td className="px-4 py-3">{f.protocolo || "—"}</td>
            <td className="whitespace-nowrap px-4 py-3"><button type="button" onClick={() => String(editandoId) === String(f.id_expediente) ? setEditandoId("") : iniciarEdicionFirma(f)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">{String(editandoId) === String(f.id_expediente) ? "Cancelar" : (f.modalidad === "SIN_CLASIFICAR" || !f.fecha_envio ? "Completar datos" : "Editar datos")}</button></td>
          </tr>
          {String(editandoId) === String(f.id_expediente) && (
            <tr key={`${f.id_expediente}-editar`} className="border-t border-blue-100 bg-blue-50/60">
              <td colSpan={11} className="px-4 py-4">
                <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-blue-100 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]">
                  <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha real de envío al notario</span><input type="date" max={String(f.fecha_firma || "").slice(0, 10)} value={edicionFirma.fecha_envio} disabled={guardandoDatosFirma} onChange={(e) => setEdicionFirma((actual) => ({ ...actual, fecha_envio: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
                  <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Modalidad real de firma</span><select value={edicionFirma.modalidad} disabled={guardandoDatosFirma} onChange={(e) => setEdicionFirma((actual) => ({ ...actual, modalidad: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="SIN_CLASIFICAR">Sin clasificar</option><option value="VC">Videoconferencia</option><option value="PRESENCIAL">Presencial</option></select><span className="mt-1 block text-[11px] text-slate-400">Selecciona solo la modalidad confirmada para esta firma.</span></label>
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={guardandoDatosFirma} onClick={() => guardarDatosFirma(f)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{guardandoDatosFirma ? "Guardando…" : "Guardar datos"}</button><button type="button" disabled={guardandoDatosFirma} onClick={() => setEditandoId("")} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancelar</button></div>
                </div>
              </td>
            </tr>
          )}
        </Fragment>)}</tbody></table></div>}
      </section>
    </section>
  );
}


// ------------------------------ INFORME DE NOTARIOS ------------------------------
function InformeNotarios() {
  const [filtros, setFiltros] = useState(filtrosInformeIniciales);
  const [aplicados, setAplicados] = useState(filtrosInformeIniciales);
  const [datos, setDatos] = useState({ resumen: {}, por_notario: [], items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);
  const [exportandoDetalle, setExportandoDetalle] = useState(false);
  const [claveNotarioSeleccionado, setClaveNotarioSeleccionado] = useState("");

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setLoading(true);
      setError("");
      try {
        const params = Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v !== "" && v != null));
        const respuesta = await axios.get(`${API_BASE}/informes/notarios`, { params });
        if (activo) {
          setDatos({
            resumen: respuesta.data?.resumen || {},
            por_notario: respuesta.data?.por_notario || [],
            items: respuesta.data?.items || [],
          });
        }
      } catch (e) {
        if (activo) {
          setDatos({ resumen: {}, por_notario: [], items: [] });
          setError(e?.response?.data?.detail || "No se ha podido cargar el informe de notarios. Comprueba que el endpoint esté desplegado en el backend.");
        }
      } finally {
        if (activo) setLoading(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [aplicados]);

  const cambiar = (campo, valor) => setFiltros((actual) => ({ ...actual, [campo]: valor }));
  const aplicar = (e) => {
    e.preventDefault();
    if (filtros.fecha_desde && filtros.fecha_hasta && filtros.fecha_desde > filtros.fecha_hasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }
    setError("");
    setClaveNotarioSeleccionado("");
    setAplicados({ ...filtros });
  };
  const limpiar = () => {
    const inicial = filtrosInformeIniciales();
    setFiltros(inicial);
    setAplicados(inicial);
    setClaveNotarioSeleccionado("");
    setError("");
  };

  const resumen = datos.resumen || {};
  const porNotario = datos.por_notario || [];
  const items = datos.items || [];
  const periodo = `${fechaInformeVisible(aplicados.fecha_desde)} – ${fechaInformeVisible(aplicados.fecha_hasta)}`;
  const grupoSeleccionado = porNotario.find((f) => f.clave_notario === claveNotarioSeleccionado);
  const detalle = claveNotarioSeleccionado
    ? items.filter((f) => f.clave_notario === claveNotarioSeleccionado)
    : items;

  const columnasResumen = [
    { key: "nombre_notario", label: "Notario" },
    { key: "nif_notario", label: "NIF" },
    { key: "total_firmas", label: "Firmados" },
    { key: "vc", label: "Videoconferencia" },
    { key: "presencial", label: "Presencial" },
    { key: "sin_clasificar", label: "Sin clasificar" },
    { key: "con_protocolo", label: "Con protocolo" },
    { key: "media_dias_envio_firma", label: "Media envío-firma", render: (f) => f.media_dias_envio_firma == null ? "—" : `${numeroInforme(f.media_dias_envio_firma, 1)} días` },
    { key: "ultima_firma", label: "Última firma", render: (f) => fechaInformeVisible(f.ultima_firma) },
    { key: "tipos_operacion", label: "Tipos de operación", render: (f) => (f.tipos_operacion || []).join(", ") || "—" },
  ];
  const columnasDetalle = [
    { key: "fecha_firma", label: "Fecha firma", render: (f) => fechaInformeVisible(f.fecha_firma) },
    { key: "id_expediente", label: "N.º expediente" },
    { key: "nombre_titular", label: "Titular" },
    { key: "tipo_operacion", label: "Tipo operación" },
    { key: "modalidad", label: "Modalidad", render: (f) => f.modalidad === "VC" ? "Videoconferencia" : f.modalidad === "PRESENCIAL" ? "Presencial" : "Sin clasificar" },
    { key: "apoderado", label: "Apoderado" },
    { key: "fecha_envio", label: "Fecha envío", render: (f) => fechaInformeVisible(f.fecha_envio) },
    { key: "dias_envio_firma", label: "Días envío-firma" },
    { key: "protocolo", label: "Protocolo" },
    { key: "oficina", label: "Oficina" },
  ];

  const exportarExcel = async () => {
    setExportando(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v !== "" && v != null));
      await descargarExcelBackend(`${API_BASE}/informes/notarios/exportar-excel`, params, `informe_notarios_${aplicados.fecha_desde || "desde_inicio"}_${aplicados.fecha_hasta || "hasta_hoy"}.xlsx`);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo exportar el resumen de notarios a Excel.");
    } finally {
      setExportando(false);
    }
  };

  const exportarDetalleExcel = async () => {
    setExportandoDetalle(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v !== "" && v != null));
      if (grupoSeleccionado?.nombre_notario) params.notario = grupoSeleccionado.nombre_notario;
      await descargarExcelBackend(`${API_BASE}/informes/notarios/exportar-detalle-excel`, params, `detalle_firmas_notarios_${aplicados.fecha_desde || "desde_inicio"}_${aplicados.fecha_hasta || "hasta_hoy"}.xlsx`);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo exportar el detalle de firmas a Excel.");
    } finally {
      setExportandoDetalle(false);
    }
  };

  const exportarResumenPDF = () => imprimirInforme("Informe de notarios", periodo, columnasResumen, porNotario);
  const exportarDetallePDF = () => imprimirInforme(
    grupoSeleccionado ? `Firmas de ${grupoSeleccionado.nombre_notario}` : "Detalle de firmas por notario",
    periodo,
    columnasDetalle,
    detalle
  );

  const topNotarios = porNotario.slice(0, 8);
  const maxFirmasNotario = topNotarios.reduce((maximo, fila) => Math.max(maximo, Number(fila.total_firmas || 0)), 1);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_10px_35px_rgba(55,85,120,0.09)] backdrop-blur-xl md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xl">🏛️</span>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Informes de notarios</h2>
            <p className="mt-1 text-sm text-slate-500">Actividad notarial medida por expedientes con fecha de firma real. Se distinguen las firmas por videoconferencia, presenciales y las pendientes de clasificar.</p>
          </div>
        </div>
      </header>

      <form onSubmit={aplicar} className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold text-slate-800">Filtros del informe</h3><p className="mt-1 text-xs text-slate-500">Las fechas se aplican a la firma realizada, no a las citas previstas de Agenda.</p></div>
          <button type="button" onClick={limpiar} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Restablecer</button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CampoFiltroInforme label="Fecha firma desde" type="date" value={filtros.fecha_desde} onChange={(v) => cambiar("fecha_desde", v)} />
          <CampoFiltroInforme label="Fecha firma hasta" type="date" value={filtros.fecha_hasta} onChange={(v) => cambiar("fecha_hasta", v)} />
          <SelectFiltroInforme label="Modalidad de firma" value={filtros.modalidad} onChange={(v) => cambiar("modalidad", v)}><option value="">Todas las modalidades</option><option value="VC">Videoconferencia</option><option value="PRESENCIAL">Presencial</option><option value="SIN_CLASIFICAR">Sin clasificar</option></SelectFiltroInforme>
          <CampoFiltroInforme label="Tipo de operación" value={filtros.tipo_operacion} onChange={(v) => cambiar("tipo_operacion", v)} placeholder="Ej. Cancelación sin provisión" />
          <CampoFiltroInforme label="Notario / NIF" value={filtros.notario} onChange={(v) => cambiar("notario", v)} placeholder="Nombre o NIF del notario" />
          <CampoFiltroInforme label="Apoderado" value={filtros.apoderado} onChange={(v) => cambiar("apoderado", v)} placeholder="Nombre del apoderado" />
          <div className="sm:col-span-2"><CampoFiltroInforme label="Búsqueda general" value={filtros.q} onChange={(v) => cambiar("q", v)} placeholder="Expediente, titular, solicitante, protocolo u oficina" /></div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3"><button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Aplicar filtros</button></div>
      </form>

      <AvisoInforme error={error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <InformeKpi icono="✍️" titulo="Expedientes firmados" valor={numeroInforme(resumen.total_firmas)} subtitulo="Firmas reales en el periodo" />
        <InformeKpi icono="🏛️" titulo="Notarios con actividad" valor={numeroInforme(resumen.total_notarios)} subtitulo="Con al menos una firma" />
        <InformeKpi icono="💻" titulo="Videoconferencia" valor={numeroInforme(resumen.videoconferencia)} />
        <InformeKpi icono="🤝" titulo="Presencial" valor={numeroInforme(resumen.presencial)} />
        <InformeKpi icono="❔" titulo="Sin clasificar" valor={numeroInforme(resumen.sin_clasificar)} subtitulo="Modalidad pendiente de confirmar" />
        <InformeKpi icono="⏱️" titulo="Media envío-firma" valor={resumen.media_dias_envio_firma == null ? "—" : `${numeroInforme(resumen.media_dias_envio_firma, 1)} días`} subtitulo={`${numeroInforme(resumen.firmas_con_tiempo_calculable)} con fechas válidas`} />
      </div>

      {(Number(resumen.sin_clasificar || 0) > 0 || Number(resumen.sin_notario_identificado || 0) > 0 || (Number(resumen.total_firmas || 0) > Number(resumen.firmas_con_tiempo_calculable || 0))) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">Calidad de los datos del histórico</p>
          <p className="mt-1">
            {Number(resumen.sin_clasificar || 0) > 0 ? `${numeroInforme(resumen.sin_clasificar)} firma(s) sin modalidad confirmada. ` : ""}
            {Number(resumen.sin_notario_identificado || 0) > 0 ? `${numeroInforme(resumen.sin_notario_identificado)} grupo(s) sin notario identificado. ` : ""}
            {Number(resumen.total_firmas || 0) > Number(resumen.firmas_con_tiempo_calculable || 0) ? `${numeroInforme(Number(resumen.total_firmas || 0) - Number(resumen.firmas_con_tiempo_calculable || 0))} firma(s) sin fecha de envío válida.` : ""}
          </p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <div><h3 className="font-bold text-slate-800">Ranking de actividad por notario</h3><p className="mt-1 text-xs text-slate-500">Los primeros puestos se ordenan por número de expedientes firmados en el periodo.</p></div>
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{periodo}</span>
        </div>
        {loading ? <PanelEstadoInforme loading /> : topNotarios.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay firmas de notarios para este periodo y filtros." /> : (
          <div className="space-y-4 p-5">
            {topNotarios.map((fila, indice) => (
              <button key={fila.clave_notario} type="button" onClick={() => setClaveNotarioSeleccionado((actual) => actual === fila.clave_notario ? "" : fila.clave_notario)} className={`w-full rounded-xl border p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40 ${claveNotarioSeleccionado === fila.clave_notario ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-white"}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{indice + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{fila.nombre_notario}</span><span className="block text-xs text-slate-400">{fila.nif_notario || "NIF no informado"}</span></span></div>
                  <span className="shrink-0 text-lg font-bold text-slate-800">{numeroInforme(fila.total_firmas)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, (Number(fila.total_firmas || 0) / maxFirmasNotario) * 100))}%` }} /></div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span>VC: <strong className="text-slate-700">{numeroInforme(fila.vc)}</strong></span><span>Presencial: <strong className="text-slate-700">{numeroInforme(fila.presencial)}</strong></span><span>Sin clasificar: <strong className="text-slate-700">{numeroInforme(fila.sin_clasificar)}</strong></span><span>Última firma: <strong className="text-slate-700">{fechaInformeVisible(fila.ultima_firma)}</strong></span></div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <div><h3 className="font-bold text-slate-800">Resumen por notario</h3><p className="mt-1 text-xs text-slate-500">Incluye firmas por modalidad, media entre envío y firma, protocolo y tipos de operación.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={loading || exportando} onClick={exportarExcel} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{exportando ? "Exportando…" : "📗 Excel resumen"}</button>
            <button type="button" disabled={loading || porNotario.length === 0} onClick={exportarResumenPDF} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">📄 PDF resumen</button>
          </div>
        </div>
        {loading ? <PanelEstadoInforme loading /> : porNotario.length === 0 ? <PanelEstadoInforme vacio /> : (
          <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[1400px] text-sm"><thead className="sticky top-0 z-10 bg-blue-50 text-left text-xs uppercase tracking-wide text-blue-800/80"><tr><th className="whitespace-nowrap px-4 py-3">Notario</th><th className="whitespace-nowrap px-4 py-3">NIF</th><th className="whitespace-nowrap px-4 py-3 text-right">Firmados</th><th className="whitespace-nowrap px-4 py-3 text-right">VC</th><th className="whitespace-nowrap px-4 py-3 text-right">Presencial</th><th className="whitespace-nowrap px-4 py-3 text-right">Sin clasificar</th><th className="whitespace-nowrap px-4 py-3 text-right">Con protocolo</th><th className="whitespace-nowrap px-4 py-3 text-right">Media días</th><th className="whitespace-nowrap px-4 py-3">Última firma</th><th className="whitespace-nowrap px-4 py-3">Operaciones</th><th className="whitespace-nowrap px-4 py-3">Detalle</th></tr></thead><tbody>{porNotario.map((f) => <tr key={f.clave_notario} className={`border-t border-slate-100 hover:bg-blue-50/40 ${claveNotarioSeleccionado === f.clave_notario ? "bg-blue-50/70" : ""}`}><td className="px-4 py-3 font-semibold text-slate-800">{f.nombre_notario}</td><td className="whitespace-nowrap px-4 py-3 text-slate-500">{f.nif_notario || "—"}</td><td className="px-4 py-3 text-right font-bold">{numeroInforme(f.total_firmas)}</td><td className="px-4 py-3 text-right text-blue-700">{numeroInforme(f.vc)}</td><td className="px-4 py-3 text-right text-emerald-700">{numeroInforme(f.presencial)}</td><td className="px-4 py-3 text-right text-amber-700">{numeroInforme(f.sin_clasificar)}</td><td className="px-4 py-3 text-right">{numeroInforme(f.con_protocolo)}</td><td className="px-4 py-3 text-right">{f.media_dias_envio_firma == null ? "—" : numeroInforme(f.media_dias_envio_firma, 1)}</td><td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.ultima_firma)}</td><td className="px-4 py-3" title={(f.tipos_operacion || []).join(", ")}>{numeroInforme(f.numero_tipos_operacion)}</td><td className="px-4 py-3"><button type="button" onClick={() => setClaveNotarioSeleccionado((actual) => actual === f.clave_notario ? "" : f.clave_notario)} className="whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">{claveNotarioSeleccionado === f.clave_notario ? "Ocultar" : "Ver firmas"}</button></td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <div><h3 className="font-bold text-slate-800">{grupoSeleccionado ? `Firmas de ${grupoSeleccionado.nombre_notario}` : "Detalle de firmas por notario"}</h3><p className="mt-1 text-xs text-slate-500">{numeroInforme(detalle.length)} expediente(s) con fecha de firma real. {grupoSeleccionado ? "Se ha filtrado el detalle por el notario seleccionado." : "Puedes seleccionar un notario en el ranking o en el resumen para acotar la lista."}</p></div>
          <div className="flex flex-wrap gap-2">
            {claveNotarioSeleccionado && <button type="button" onClick={() => setClaveNotarioSeleccionado("")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Ver todos</button>}
            <button type="button" disabled={loading || exportandoDetalle} onClick={exportarDetalleExcel} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{exportandoDetalle ? "Exportando…" : "📗 Excel detalle"}</button>
            <button type="button" disabled={loading || detalle.length === 0} onClick={exportarDetallePDF} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">📄 PDF detalle</button>
          </div>
        </div>
        {loading ? <PanelEstadoInforme loading /> : detalle.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay firmas reales con los filtros seleccionados." /> : (
          <div className="max-h-[650px] overflow-auto"><table className="w-full min-w-[1250px] text-sm"><thead className="sticky top-0 z-10 bg-blue-50 text-left text-xs uppercase tracking-wide text-blue-800/80"><tr><th className="whitespace-nowrap px-4 py-3">Fecha firma</th><th className="whitespace-nowrap px-4 py-3">N.º expediente</th><th className="whitespace-nowrap px-4 py-3">Titular</th><th className="whitespace-nowrap px-4 py-3">Tipo operación</th><th className="whitespace-nowrap px-4 py-3">Modalidad</th><th className="whitespace-nowrap px-4 py-3">Notario</th><th className="whitespace-nowrap px-4 py-3">Apoderado</th><th className="whitespace-nowrap px-4 py-3">Fecha envío</th><th className="whitespace-nowrap px-4 py-3 text-right">Días envío-firma</th><th className="whitespace-nowrap px-4 py-3">Protocolo</th><th className="whitespace-nowrap px-4 py-3">Oficina</th></tr></thead><tbody>{detalle.map((f, i) => <tr key={f.id ?? `${f.id_expediente}-${i}`} className="border-t border-slate-100 hover:bg-blue-50/40"><td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_firma)}</td><td className="px-4 py-3 font-semibold text-blue-700">{f.id_expediente || "—"}</td><td className="px-4 py-3">{f.nombre_titular || "—"}</td><td className="px-4 py-3">{f.tipo_operacion || "—"}</td><td className="px-4 py-3">{f.modalidad === "VC" ? "Videoconferencia" : f.modalidad === "PRESENCIAL" ? "Presencial" : <span className="font-semibold text-amber-700">Sin clasificar</span>}</td><td className="px-4 py-3">{f.nombre_notario || "—"}</td><td className="px-4 py-3">{f.apoderado || "—"}</td><td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_envio)}</td><td className="px-4 py-3 text-right">{f.dias_envio_firma == null ? "—" : numeroInforme(f.dias_envio_firma)}</td><td className="px-4 py-3">{f.protocolo || "—"}</td><td className="px-4 py-3">{f.oficina || "—"}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </section>
  );
}


function ApartadoInformePendiente({ apartado }) {
  const detalle = {
    firmas: {
      encabezado: "Informe de firmas",
      descripcion:
        "Aquí construiremos el informe de firmas con filtros por periodo y los indicadores acordados antes de conectarlo al backend.",
      indicadores: [
        { titulo: "Firmas realizadas", texto: "Conteo de firmas confirmadas" },
        { titulo: "Modalidad", texto: "Presencial y videoconferencia, si consta" },
        { titulo: "Desglose", texto: "Por fecha, operación y notario" },
      ],
    },
    facturacion: {
      encabezado: "Informes de facturación",
      descripcion:
        "Aquí construiremos los informes económicos a partir de los datos reales de facturación del ERP.",
      indicadores: [
        { titulo: "Importes", texto: "Totales por periodo" },
        { titulo: "Estado", texto: "Facturas y expedientes pendientes o cerrados" },
        { titulo: "Desglose", texto: "Por oficina y expediente, según los datos disponibles" },
      ],
    },
    notarios: {
      encabezado: "Informes de notarios",
      descripcion:
        "Aquí construiremos los indicadores de actividad notarial usando los datos reales del catálogo CTN, las firmas y los expedientes.",
      indicadores: [
        { titulo: "Actividad", texto: "Expedientes gestionados por notario" },
        { titulo: "Firmas", texto: "Desglose según la información registrada" },
        { titulo: "Periodo", texto: "Filtros temporales y posibilidad de exportar" },
      ],
    },
  }[apartado.key];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-[0_10px_35px_rgba(55,85,120,0.09)] backdrop-blur-xl">
      <div className="border-b border-slate-200/80 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xl">
            {apartado.icono}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{detalle.encabezado}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{detalle.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>En preparación.</strong> Este apartado está creado en el menú. Falta definir sus filtros e indicadores y conectar el endpoint correspondiente; no se muestran cifras ficticias.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {detalle.indicadores.map((indicador) => (
            <div key={indicador.titulo} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-bold text-slate-700">{indicador.titulo}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{indicador.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Informes() {
  const [apartadoActivo, setApartadoActivo] = useState("apoderados");
  const apartadoSeleccionado = APARTADOS_INFORMES.find(
    (apartado) => apartado.key === apartadoActivo
  ) || APARTADOS_INFORMES[0];

  return (
    <div className="min-h-screen space-y-5 bg-gradient-to-br from-[#eef5fb] via-[#f7faff] to-[#eaf2fb] p-4 text-slate-700 md:p-6">
      <header className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_10px_35px_rgba(55,85,120,0.09)] backdrop-blur-xl md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-100 text-xl shadow-sm">📊</div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">Informes</h1>
            <p className="mt-1 text-sm text-slate-500">Selecciona el tipo de informe que quieres consultar.</p>
          </div>
        </div>
      </header>

      <nav aria-label="Apartados de informes" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {APARTADOS_INFORMES.map((apartado) => {
          const activo = apartado.key === apartadoActivo;
          return (
            <button
              key={apartado.key}
              type="button"
              onClick={() => setApartadoActivo(apartado.key)}
              aria-pressed={activo}
              className={`flex min-h-[100px] items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                activo
                  ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                  : "border-white/80 bg-white/75 hover:border-blue-200"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-xl">
                {apartado.icono}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-bold ${activo ? "text-blue-800" : "text-slate-800"}`}>
                  {apartado.titulo}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                  {apartado.descripcion}
                </span>
              </span>
              {activo && <span className="mt-1 text-xs font-bold text-blue-600">●</span>}
            </button>
          );
        })}
      </nav>

      {apartadoActivo === "apoderados" ? (
        <InformeCitasApoderados />
      ) : apartadoActivo === "firmas" ? (
        <InformeFirmas />
      ) : apartadoActivo === "notarios" ? (
        <InformeNotarios />
      ) : (
        <ApartadoInformePendiente apartado={apartadoSeleccionado} />
      )}
    </div>
  );
}
