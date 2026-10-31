import { Fragment, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";
import { API_BASE } from "../../api/config";
import Chart from "chart.js/auto";
import SelectSJ from "../../components/ui/SelectSJ";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

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
                #ffffff;

              color:
                #18364b;
            }


            .card {

              background:
                white;

              padding:
                28px;

              border-radius:
                18px;

              border:
                1px solid #d8e4ec;

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
                #064675;
            }


            h2 {

              font-size:
                17px;

              margin-top:
                0;

              color:
                #617789;
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
                #eaf2f8;

              padding:
                11px;

              border-bottom:
                2px solid #d8e4ec;

              text-align:
                left;

              color:
                #064675;
            }


            td {

              padding:
                9px;

              border-bottom:
                1px solid #d8e4ec;
            }


            tr:nth-child(even) {

              background:
                #f2f7fb;
            }


            .totales {

              margin-top:
                30px;

              font-size:
                15px;

              font-weight:
                600;

              color:
                #064675;
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
      "#617789";

    const colorGrid =
      "rgba(97, 119, 137, 0.13)";


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
                "rgba(6, 70, 117, 0.78)",

              borderColor:
                "#064675",

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
                  "#d8e4ec",
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
                  "#d8e4ec",
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
                "rgba(6, 70, 117, 0.78)",

              borderColor:
                "#064675",

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
                  "#d8e4ec",
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
                  "#d8e4ec",
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
                "#064675",

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
                "#064675",

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
                  "#d8e4ec",
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
                  "#d8e4ec",
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
      className="informes-premium-page
 min-h-screen
 
 
 
 
 
 p-4
 md:p-6
 space-y-6"
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div
        className="relative
 overflow-hidden
 
 
 
 
 p-6"
      >

        <div
          className="absolute
 -top-24
 -right-24
 w-64
 h-64
 
 
 
 pointer-events-none"
        />

        <div
          className="absolute
 -bottom-24
 -left-24
 w-64
 h-64
 
 
 
 pointer-events-none"
        />


        <div
          className="relative
 flex
 flex-col
 md:flex-row
 md:items-center
 md:justify-between
 gap-5"
        >

          <div>

            <div
              className="flex
 items-center
 gap-3"
            >

              <div
                className="w-12
 h-12
 
 
 
 flex
 items-center
 justify-center"
              >
                📊
              </div>


              <div>

                <h1
                 
                >
                  Informes de Apoderados
                </h1>


                <p
                  className="mt-1"
                >
                  Estadísticas de actividad,
                  presencialidad y desplazamientos.
                </p>

              </div>

            </div>


            <div
              className="mt-4
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

              Periodo:

              <strong
               
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
        className="p-6"
      >

        <div
          className="flex
 items-center
 gap-3
 mb-5"
        >

          <div
            className="w-9
 h-9
 
 
 
 flex
 items-center
 justify-center"
          >
            ⚙
          </div>


          <div>

            <h2
             
            >
              Filtros del informe
            </h2>

            <p
             
            >
              Selecciona el periodo y filtra los resultados.
            </p>

          </div>

        </div>


        <div
          className="grid
 grid-cols-1
 md:grid-cols-12
 gap-5
 items-end"
        >

          {/* MES */}

          <div
            className="md:col-span-3
 flex
 flex-col"
          >

            <label
              className="uppercase
 
 mb-2"
            >
              Mes
            </label>


            <div
             
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
            className="md:col-span-2
 flex
 flex-col"
          >

            <label
              className="uppercase
 
 mb-2"
            >
              Año
            </label>


            <input
              type="number"
              className="w-full
 
 
 
 px-3
 py-2.5"
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
            className="md:col-span-7
 flex
 flex-col"
          >

            <label
              className="uppercase
 
 mb-2"
            >
              Buscar apoderado
            </label>


            <div
              className="relative"
            >

              <span
                className="absolute
 left-3
 top-1/2"
              >
                🔎
              </span>


              <input
                type="text"
                className="w-full
 
 
 
 pl-10
 pr-4
 py-2.5
 
 placeholder-slate-400"
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
        className="grid
 grid-cols-1
 sm:grid-cols-2
 lg:grid-cols-5
 gap-4"
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
        className="flex
 flex-col
 sm:flex-row
 sm:items-center
 justify-between
 gap-4
 
 
 
 
 p-4"
      >

        <div>

          <div
           
          >
            Exportar informe
          </div>


          <div
            className="mt-1"
          >
            Descarga los datos del periodo seleccionado.
          </div>

        </div>


        <div
          className="flex
 gap-3
 flex-wrap"
        >

          <button type="button"
            onClick={exportarExcel}
           
          >
            <span className="molsan-export-excel__icon" aria-hidden="true">📗</span>
            Exportar a Excel
          </button>


          <button type="button"
            onClick={exportarPDF}
            className="px-4
 py-2.5
 
 
 
 
 
 
 
 
 
 
 flex
 items-center
 gap-2"
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
        className="overflow-hidden"
      >

        <div
          className="px-6
 py-5
 
 flex
 items-center
 justify-between
 gap-4"
        >

          <div>

            <h2
             
            >
              Detalle por apoderado
            </h2>


            <p
              className="mt-1"
            >
              {filtrada.length} registros encontrados
            </p>

          </div>


          <div
            className="px-3
 py-1.5"
          >
            {mesActual} {año}
          </div>

        </div>


        <div
          className="overflow-x-auto"
        >

          <table
            className="w-full"
          >

            <thead
             
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
                    className="py-12"
                  >

                    <div
                      className="mb-2"
                    >
                      📭
                    </div>


                    <div
                     
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
                      className="group"
                    >

                      {/* APODERADO */}

                      <td
                        className="py-3.5
 px-6"
                      >

                        <div
                          className="flex
 items-center
 gap-3"
                        >

                          <div
                            className="w-8
 h-8
 
 
 
 flex
 items-center
 justify-center"
                          >
                            {index + 1}
                          </div>


                          <span
                           
                          >
                            {row.nombre ||
                              "Sin nombre"}
                          </span>

                        </div>

                      </td>


                      {/* VC */}

                      <td
                        className="py-3.5
 px-6"
                      >

                        <span
                          className="inline-flex
 min-w-[42px]
 justify-center
 px-2.5
 py-1"
                        >
                          {row.vc}
                        </span>

                      </td>


                      {/* PRESENCIAL */}

                      <td
                        className="py-3.5
 px-6"
                      >

                        <span
                          className="inline-flex
 min-w-[42px]
 justify-center
 px-2.5
 py-1"
                        >
                          {row.presencial}
                        </span>

                      </td>


                      {/* KM */}

                      <td
                        className="py-3.5
 px-6"
                      >

                        <span
                          className="inline-flex
 min-w-[60px]
 justify-center
 px-2.5
 py-1"
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
          className="mb-4
 flex
 items-center
 gap-3"
        >

          <div
            className="w-10
 h-10
 
 
 
 flex
 items-center
 justify-center"
          >
            📊
          </div>


          <div>

            <h2
             
            >
              Análisis gráfico
            </h2>


            <p
              className="mt-1"
            >
              Comparativa visual de la actividad del periodo.
            </p>

          </div>

        </div>


        <div
          className="grid
 grid-cols-1
 lg:grid-cols-3
 gap-5"
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

  const fondoCorporativo = "bg-[var(--molsan-panel)] border-[var(--molsan-border)]";
  const colorCorporativo = "text-[var(--molsan-blue)]";
  const fondos = Object.fromEntries(["blue", "green", "red", "purple", "orange"].map((key) => [key, fondoCorporativo]));
  const colores = Object.fromEntries(["blue", "green", "red", "purple", "orange"].map((key) => [key, colorCorporativo]));


  return (

    <div
      className={`relative
 overflow-hidden
 
 
 p-5
 
 
 
 
 ${fondos[clase]}`}
    >

      <div
        className="flex
 items-center
 justify-between
 gap-3"
      >

        <div>

          <p
            className="uppercase"
          >
            {titulo}
          </p>


          <div
            className="mt-2"
          >
            {valor}
          </div>


          <p
            className="mt-1"
          >
            {subtitulo}
          </p>

        </div>


        <div
          className={`w-11
 h-11
 
 
 
 
 flex
 items-center
 justify-center
 
 
 ${colores[clase]}`}
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
      className={`py-3.5
 px-6
 
 
 
 
 
 
 ${
 align === "center"
 ? ""
 : ""
 }`}
      onClick={() =>
        ordenar(campo)
      }
    >

      <span
        className="inline-flex
 items-center
 gap-2"
      >

        {titulo}


        <span
          className={`${
 activo
 ? ""
 : ""
 }`}
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
      className="overflow-hidden"
    >

      <div
        className="px-5
 py-4"
      >

        <div
          className="flex
 items-center
 gap-3"
        >

          <div
            className="w-9
 h-9
 
 
 
 flex
 items-center
 justify-center"
          >
            {icono}
          </div>


          <div>

            <h3
             
            >
              {titulo}
            </h3>


            <p
              className="mt-0.5"
            >
              {descripcion}
            </p>

          </div>

        </div>

      </div>


      <div
        className="h-[300px]
 p-5"
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
    key: "sla",
    titulo: "Informe SLA’s",
    descripcion: "Control de plazos por actividad y grupo de cancelación.",
    icono: "⏱️",
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
    @page{size:landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#18364b;padding:12px}h1{color:#064675;margin:0 0 4px}p{color:#617789;margin:0 0 18px;font-size:12px}table{border-collapse:collapse;width:100%;font-size:9px}th{background:#eaf2f8;color:#064675;text-align:left}th,td{border:1px solid #d8e4ec;padding:6px;vertical-align:top}tr:nth-child(even){background:#f2f7fb}
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
      <span className="mb-1.5 block uppercase">{label}</span>
      <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5" />
    </label>
  );
}

function SelectFiltroInforme({ label, value, onChange, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block uppercase">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5">{children}</select>
    </label>
  );
}

function InformeKpi({ titulo, valor, subtitulo, icono }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="uppercase">{titulo}</div>
          <div className="mt-2">{valor}</div>
          {subtitulo && <div className="mt-1">{subtitulo}</div>}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center">{icono}</span>
      </div>
    </div>
  );
}

function mensajeErrorInforme(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    const mensajes = error.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.msg || item.message || JSON.stringify(item);
      return String(item);
    }).filter(Boolean);
    return mensajes.join(" · ");
  }
  if (typeof error === "object") return error.msg || error.message || error.detail || JSON.stringify(error);
  return String(error);
}

function AvisoInforme({ error }) {
  const mensaje = mensajeErrorInforme(error);
  if (!mensaje) return null;
  return <div role="alert" className="px-4 py-3">{mensaje}</div>;
}

function PanelEstadoInforme({ loading, vacio, textoVacio = "No hay registros para los filtros seleccionados." }) {
  if (loading) return <div className="px-5 py-12">Consultando datos reales del ERP…</div>;
  if (vacio) return <div className="px-5 py-12"><div className="mb-2">📭</div>{textoVacio}</div>;
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
  const ordenTiposOperacion = useSortableData(datos.por_tipo_operacion);
  const ordenFilasFirmas = useSortableData(filas);
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
      <header className="p-5 md:p-6">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center">✍️</span><div><h2>Informe de firmas</h2><p className="mt-1">Histórico de firmas reales a partir de expedientes con fecha de firma registrada. Las citas de Agenda no se consideran firmas realizadas.</p></div></div>
      </header>

      <form onSubmit={aplicar} className="p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3>Filtros del informe</h3><p className="mt-1">El periodo se aplica a la fecha real de firma.</p></div><button type="button" onClick={limpiar} className="px-3 py-2">Restablecer</button></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CampoFiltroInforme label="Fecha firma desde" type="date" value={filtros.fecha_desde} onChange={(v) => cambiar("fecha_desde", v)} />
          <CampoFiltroInforme label="Fecha firma hasta" type="date" value={filtros.fecha_hasta} onChange={(v) => cambiar("fecha_hasta", v)} />
          <SelectFiltroInforme label="Modalidad" value={filtros.modalidad} onChange={(v) => cambiar("modalidad", v)}><option value="">Todas las modalidades</option><option value="VC">Videoconferencia</option><option value="PRESENCIAL">Presencial</option><option value="SIN_CLASIFICAR">Sin clasificar</option></SelectFiltroInforme>
          <CampoFiltroInforme label="Tipo de operación" value={filtros.tipo_operacion} onChange={(v) => cambiar("tipo_operacion", v)} placeholder="Filtrar operación" />
          <CampoFiltroInforme label="Notario" value={filtros.notario} onChange={(v) => cambiar("notario", v)} placeholder="Nombre o NIF" />
          <CampoFiltroInforme label="Apoderado" value={filtros.apoderado} onChange={(v) => cambiar("apoderado", v)} placeholder="Nombre del apoderado" />
          <div className="sm:col-span-2"><CampoFiltroInforme label="Buscar expediente, titular, solicitante o protocolo" value={filtros.q} onChange={(v) => cambiar("q", v)} placeholder="N.º expediente, NIF, titular…" /></div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3"><button type="submit" className="px-5 py-2.5">Aplicar filtros</button></div>
      </form>

      <AvisoInforme error={error} />
      {mensajeEdicionFirma && <div role="status" className="px-4 py-3">{mensajeEdicionFirma}</div>}
      {(firmasSinClasificar > 0 || firmasSinTiempo > 0) && (
        <div className="px-4 py-3">
          <p>Hay datos históricos pendientes de completar</p>
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

      <section className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><h3>Resumen por tipo de operación</h3><p className="mt-1">Conteo de firmas reales y días medios cuando existen fecha de envío y de firma.</p></div><span className="px-3 py-1.5">{periodo}</span></div>
        {loading ? <PanelEstadoInforme loading /> : datos.por_tipo_operacion.length === 0 ? <PanelEstadoInforme vacio /> : <div className="overflow-x-auto"><table className="w-full min-w-[650px]"><thead className="uppercase"><tr><MolsanSortableTh label="Tipo de operación" sortKey="tipo_operacion" sortConfig={ordenTiposOperacion.sortConfig} onSort={ordenTiposOperacion.requestSort} className="px-5 py-3" /><MolsanSortableTh label="Firmas" sortKey="total_firmas" sortConfig={ordenTiposOperacion.sortConfig} onSort={ordenTiposOperacion.requestSort} className="px-5 py-3" /><MolsanSortableTh label="VC" sortKey="vc" sortConfig={ordenTiposOperacion.sortConfig} onSort={ordenTiposOperacion.requestSort} className="px-5 py-3" /><MolsanSortableTh label="Presencial" sortKey="presencial" sortConfig={ordenTiposOperacion.sortConfig} onSort={ordenTiposOperacion.requestSort} className="px-5 py-3" /><MolsanSortableTh label="Media días" sortKey="media_dias" sortConfig={ordenTiposOperacion.sortConfig} onSort={ordenTiposOperacion.requestSort} className="px-5 py-3" /></tr></thead><tbody>{ordenTiposOperacion.items.map((f, i) => <tr key={`${f.tipo_operacion}-${i}`}><td className="px-5 py-3">{f.tipo_operacion}</td><td className="px-5 py-3">{numeroInforme(f.total_firmas)}</td><td className="px-5 py-3">{numeroInforme(f.vc)}</td><td className="px-5 py-3">{numeroInforme(f.presencial)}</td><td className="px-5 py-3">{f.media_dias == null ? "—" : `${numeroInforme(f.media_dias, 1)} días`}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><h3>Detalle de firmas</h3><p className="mt-1">{numeroInforme(filas.length)} registros recibidos del backend. Puedes completar modalidad y fecha de envío desde la columna de acciones.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={loading || exportando} onClick={exportarExcel} className="molsan-export-excel">{exportando ? "Exportando…" : "📗 Exportar Excel"}</button><button type="button" disabled={loading || filas.length === 0} onClick={() => imprimirInforme("Informe de firmas reales", periodo, columnasPDF, filas)} className="px-3 py-2">📄 Exportar PDF</button></div></div>
        {loading ? <PanelEstadoInforme loading /> : filas.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay firmas reales para el periodo y los filtros seleccionados." /> : <div className="max-h-[700px] overflow-auto"><table className="w-full min-w-[1420px]"><thead className="sticky top-0 z-10 uppercase"><tr>{columnasPDF.map((c) => <MolsanSortableTh key={c.key} label={c.label} sortKey={c.key} sortConfig={ordenFilasFirmas.sortConfig} onSort={ordenFilasFirmas.requestSort} className="whitespace-nowrap px-4 py-3" />)}<th className="whitespace-nowrap px-4 py-3">Acciones</th></tr></thead><tbody>{ordenFilasFirmas.items.map((f, i) => <Fragment key={f.id ?? `${f.id_expediente}-${i}`}>
          <tr>
            <td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_firma)}</td>
            <td className="px-4 py-3">{f.id_expediente || "—"}</td>
            <td className="max-w-[240px] px-4 py-3">{f.nombre_titular || "—"}</td>
            <td className="px-4 py-3">{f.tipo_operacion || "—"}</td>
            <td className="px-4 py-3">{f.modalidad === "VC" ? "Videoconferencia" : f.modalidad === "PRESENCIAL" ? "Presencial" : <span>Sin clasificar</span>}</td>
            <td className="px-4 py-3">{f.nombre_notario || "—"}</td>
            <td className="px-4 py-3">{f.apoderado || "—"}</td>
            <td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_envio)}</td>
            <td className="px-4 py-3">{f.dias_envio_firma == null ? "—" : numeroInforme(f.dias_envio_firma)}</td>
            <td className="px-4 py-3">{f.protocolo || "—"}</td>
            <td className="whitespace-nowrap px-4 py-3"><button type="button" onClick={() => String(editandoId) === String(f.id_expediente) ? setEditandoId("") : iniciarEdicionFirma(f)} className="px-3 py-2">{String(editandoId) === String(f.id_expediente) ? "Cancelar" : (f.modalidad === "SIN_CLASIFICAR" || !f.fecha_envio ? "Completar datos" : "Editar datos")}</button></td>
          </tr>
          {String(editandoId) === String(f.id_expediente) && (
            <tr key={`${f.id_expediente}-editar`}>
              <td colSpan={11} className="px-4 py-4">
                <div className="grid grid-cols-1 items-end gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto]">
                  <label className="block min-w-0"><span className="mb-1.5 block uppercase">Fecha real de envío al notario</span><input type="date" max={String(f.fecha_firma || "").slice(0, 10)} value={edicionFirma.fecha_envio} disabled={guardandoDatosFirma} onChange={(e) => setEdicionFirma((actual) => ({ ...actual, fecha_envio: e.target.value }))} className="w-full px-3 py-2.5" /></label>
                  <label className="block min-w-0"><span className="mb-1.5 block uppercase">Modalidad real de firma</span><select value={edicionFirma.modalidad} disabled={guardandoDatosFirma} onChange={(e) => setEdicionFirma((actual) => ({ ...actual, modalidad: e.target.value }))} className="w-full px-3 py-2.5"><option value="SIN_CLASIFICAR">Sin clasificar</option><option value="VC">Videoconferencia</option><option value="PRESENCIAL">Presencial</option></select><span className="mt-1 block">Selecciona solo la modalidad confirmada para esta firma.</span></label>
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={guardandoDatosFirma} onClick={() => guardarDatosFirma(f)} className="px-4 py-2.5">{guardandoDatosFirma ? "Guardando…" : "Guardar datos"}</button><button type="button" disabled={guardandoDatosFirma} onClick={() => setEditandoId("")} className="px-4 py-2.5">Cancelar</button></div>
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
  const ordenResumenNotarios = useSortableData(porNotario);
  const ordenDetalleNotarios = useSortableData(detalle);

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
      <header className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center">🏛️</span>
          <div>
            <h2>Informes de notarios</h2>
            <p className="mt-1">Actividad notarial medida por expedientes con fecha de firma real. Se distinguen las firmas por videoconferencia, presenciales y las pendientes de clasificar.</p>
          </div>
        </div>
      </header>

      <form onSubmit={aplicar} className="p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3>Filtros del informe</h3><p className="mt-1">Las fechas se aplican a la firma realizada, no a las citas previstas de Agenda.</p></div>
          <button type="button" onClick={limpiar} className="px-3 py-2">Restablecer</button>
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
        <div className="mt-4 flex flex-wrap justify-end gap-3"><button type="submit" className="px-5 py-2.5">Aplicar filtros</button></div>
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
        <div className="px-4 py-3">
          <p>Calidad de los datos del histórico</p>
          <p className="mt-1">
            {Number(resumen.sin_clasificar || 0) > 0 ? `${numeroInforme(resumen.sin_clasificar)} firma(s) sin modalidad confirmada. ` : ""}
            {Number(resumen.sin_notario_identificado || 0) > 0 ? `${numeroInforme(resumen.sin_notario_identificado)} grupo(s) sin notario identificado. ` : ""}
            {Number(resumen.total_firmas || 0) > Number(resumen.firmas_con_tiempo_calculable || 0) ? `${numeroInforme(Number(resumen.total_firmas || 0) - Number(resumen.firmas_con_tiempo_calculable || 0))} firma(s) sin fecha de envío válida.` : ""}
          </p>
        </div>
      )}

      <section className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><h3>Ranking de actividad por notario</h3><p className="mt-1">Los primeros puestos se ordenan por número de expedientes firmados en el periodo.</p></div>
          <span className="px-3 py-1.5">{periodo}</span>
        </div>
        {loading ? <PanelEstadoInforme loading /> : topNotarios.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay firmas de notarios para este periodo y filtros." /> : (
          <div className="space-y-4 p-5">
            {topNotarios.map((fila, indice) => (
              <button key={fila.clave_notario} type="button" onClick={() => setClaveNotarioSeleccionado((actual) => actual === fila.clave_notario ? "" : fila.clave_notario)} className={`w-full p-3 ${claveNotarioSeleccionado === fila.clave_notario ? "" : ""}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center">{indice + 1}</span><span className="min-w-0"><span className="block truncate">{fila.nombre_notario}</span><span className="block">{fila.nif_notario || "NIF no informado"}</span></span></div>
                  <span className="shrink-0">{numeroInforme(fila.total_firmas)}</span>
                </div>
                <div className="h-2 overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, Math.max(0, (Number(fila.total_firmas || 0) / maxFirmasNotario) * 100))}%` }} /></div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><span>VC: <strong>{numeroInforme(fila.vc)}</strong></span><span>Presencial: <strong>{numeroInforme(fila.presencial)}</strong></span><span>Sin clasificar: <strong>{numeroInforme(fila.sin_clasificar)}</strong></span><span>Última firma: <strong>{fechaInformeVisible(fila.ultima_firma)}</strong></span></div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><h3>Resumen por notario</h3><p className="mt-1">Incluye firmas por modalidad, media entre envío y firma, protocolo y tipos de operación.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={loading || exportando} onClick={exportarExcel} className="molsan-export-excel">{exportando ? "Exportando…" : "📗 Excel resumen"}</button>
            <button type="button" disabled={loading || porNotario.length === 0} onClick={exportarResumenPDF} className="px-3 py-2">📄 PDF resumen</button>
          </div>
        </div>
        {loading ? <PanelEstadoInforme loading /> : porNotario.length === 0 ? <PanelEstadoInforme vacio /> : (
          <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[1400px]"><thead className="sticky top-0 z-10 uppercase"><tr><MolsanSortableTh label="Notario" sortKey="nombre_notario" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="NIF" sortKey="nif_notario" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Firmados" sortKey="total_firmas" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="VC" sortKey="vc" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Presencial" sortKey="presencial" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Sin clasificar" sortKey="sin_clasificar" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Con protocolo" sortKey="con_protocolo" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Media días" sortKey="media_dias_envio_firma" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Última firma" sortKey="ultima_firma" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Operaciones" sortKey="numero_tipos_operacion" sortConfig={ordenResumenNotarios.sortConfig} onSort={ordenResumenNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><th className="whitespace-nowrap px-4 py-3">Detalle</th></tr></thead><tbody>{ordenResumenNotarios.items.map((f) => <tr key={f.clave_notario} className={`${claveNotarioSeleccionado === f.clave_notario ? "" : ""}`}><td className="px-4 py-3">{f.nombre_notario}</td><td className="whitespace-nowrap px-4 py-3">{f.nif_notario || "—"}</td><td className="px-4 py-3">{numeroInforme(f.total_firmas)}</td><td className="px-4 py-3">{numeroInforme(f.vc)}</td><td className="px-4 py-3">{numeroInforme(f.presencial)}</td><td className="px-4 py-3">{numeroInforme(f.sin_clasificar)}</td><td className="px-4 py-3">{numeroInforme(f.con_protocolo)}</td><td className="px-4 py-3">{f.media_dias_envio_firma == null ? "—" : numeroInforme(f.media_dias_envio_firma, 1)}</td><td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.ultima_firma)}</td><td className="px-4 py-3" title={(f.tipos_operacion || []).join(", ")}>{numeroInforme(f.numero_tipos_operacion)}</td><td className="px-4 py-3"><button type="button" onClick={() => setClaveNotarioSeleccionado((actual) => actual === f.clave_notario ? "" : f.clave_notario)} className="whitespace-nowrap px-3 py-2">{claveNotarioSeleccionado === f.clave_notario ? "Ocultar" : "Ver firmas"}</button></td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div><h3>{grupoSeleccionado ? `Firmas de ${grupoSeleccionado.nombre_notario}` : "Detalle de firmas por notario"}</h3><p className="mt-1">{numeroInforme(detalle.length)} expediente(s) con fecha de firma real. {grupoSeleccionado ? "Se ha filtrado el detalle por el notario seleccionado." : "Puedes seleccionar un notario en el ranking o en el resumen para acotar la lista."}</p></div>
          <div className="flex flex-wrap gap-2">
            {claveNotarioSeleccionado && <button type="button" onClick={() => setClaveNotarioSeleccionado("")} className="px-3 py-2">Ver todos</button>}
            <button type="button" disabled={loading || exportandoDetalle} onClick={exportarDetalleExcel} className="molsan-export-excel">{exportandoDetalle ? "Exportando…" : "📗 Excel detalle"}</button>
            <button type="button" disabled={loading || detalle.length === 0} onClick={exportarDetallePDF} className="px-3 py-2">📄 PDF detalle</button>
          </div>
        </div>
        {loading ? <PanelEstadoInforme loading /> : detalle.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay firmas reales con los filtros seleccionados." /> : (
          <div className="max-h-[650px] overflow-auto"><table className="w-full min-w-[1250px]"><thead className="sticky top-0 z-10 uppercase"><tr><MolsanSortableTh label="Fecha firma" sortKey="fecha_firma" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="N.º expediente" sortKey="id_expediente" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Titular" sortKey="nombre_titular" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Tipo operación" sortKey="tipo_operacion" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Modalidad" sortKey="modalidad" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Notario" sortKey="nombre_notario" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Apoderado" sortKey="apoderado" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Fecha envío" sortKey="fecha_envio" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Días envío-firma" sortKey="dias_envio_firma" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Protocolo" sortKey="protocolo" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /><MolsanSortableTh label="Oficina" sortKey="oficina" sortConfig={ordenDetalleNotarios.sortConfig} onSort={ordenDetalleNotarios.requestSort} className="whitespace-nowrap px-4 py-3" /></tr></thead><tbody>{ordenDetalleNotarios.items.map((f, i) => <tr key={f.id ?? `${f.id_expediente}-${i}`}><td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_firma)}</td><td className="px-4 py-3">{f.id_expediente || "—"}</td><td className="px-4 py-3">{f.nombre_titular || "—"}</td><td className="px-4 py-3">{f.tipo_operacion || "—"}</td><td className="px-4 py-3">{f.modalidad === "VC" ? "Videoconferencia" : f.modalidad === "PRESENCIAL" ? "Presencial" : <span>Sin clasificar</span>}</td><td className="px-4 py-3">{f.nombre_notario || "—"}</td><td className="px-4 py-3">{f.apoderado || "—"}</td><td className="whitespace-nowrap px-4 py-3">{fechaInformeVisible(f.fecha_envio)}</td><td className="px-4 py-3">{f.dias_envio_firma == null ? "—" : numeroInforme(f.dias_envio_firma)}</td><td className="px-4 py-3">{f.protocolo || "—"}</td><td className="px-4 py-3">{f.oficina || "—"}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </section>
  );
}


function InformeSLA() {
  const [datos, setDatos] = useState({ items: [], actividades: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [grupo, setGrupo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    setError("");
    axios.get(`${API_BASE}/informes-sla`)
      .then(({ data }) => { if (activo) setDatos({ items: data?.items || [], actividades: data?.actividades || [] }); })
      .catch((e) => { if (activo) setError(e?.response?.data?.detail || "No se ha podido cargar el Informe SLA."); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [recarga]);

  const items = (datos.items || []).filter((item) => {
    const coincideGrupo = grupo === "todos" || (grupo === "con-provision" && item.grupo === "Con provisión") || (grupo === "sin-provision" && item.grupo === "Sin provisión");
    const q = normalizarInformeSLA(busqueda);
    const texto = normalizarInformeSLA(`${item.id_expediente || ""} ${item.titular || ""} ${item.tipo_operacion || ""} ${item.producto_gtg || ""}`);
    return coincideGrupo && (!q || texto.includes(q));
  });
  const actividadesPlanas = items.flatMap((item) => (item.actividades || []).map((actividad) => ({ ...actividad, id_expediente: item.id_expediente, titular: item.titular, grupo: item.grupo, entidad: item.entidad })));
  const conObjetivo = actividadesPlanas.filter((a) => a.objetivo_dias != null && a.dias != null);
  const dentro = conObjetivo.filter((a) => a.estado === "Dentro de plazo").length;
  const fuera = actividadesPlanas.filter((a) => a.estado === "Fuera de plazo").length;
  const cumplimiento = conObjetivo.length ? Math.round((dentro / conObjetivo.length) * 100) : null;
  const globalesEvaluables = items.filter((x) => !x.excluido_global && x.dias_global != null);
  const globalesDentro = globalesEvaluables.filter((x) => x.estado_global === "Dentro de plazo").length;
  const mediaGlobal = globalesEvaluables.length ? globalesEvaluables.reduce((s, x) => s + Number(x.dias_global || 0), 0) / globalesEvaluables.length : null;

  const resumenActividades = (datos.actividades || []).map((actividad) => {
    const filas = actividadesPlanas.filter((a) => a.actividad_key === actividad.key);
    const medidas = filas.filter((a) => a.dias != null);
    const conObjetivoActividad = medidas.filter((a) => a.objetivo_dias != null);
    const cumplen = conObjetivoActividad.filter((a) => a.estado === "Dentro de plazo").length;
    const incumplen = conObjetivoActividad.filter((a) => a.estado === "Fuera de plazo").length;
    return { ...actividad, total: filas.length, medidas: medidas.length, media: medidas.length ? medidas.reduce((s, a) => s + Number(a.dias), 0) / medidas.length : null, cumplen, incumplen };
  });

  const exportar = () => {
    const encabezados = ["Expediente","Titular","Grupo","Entidad","Actividad","Inicio","Fin","Días","Objetivo SLA","Estado"];
    const filas = actividadesPlanas.map((a) => [a.id_expediente,a.titular,a.grupo,a.entidad,a.actividad,a.fecha_inicio,a.fecha_fin,a.dias,a.objetivo_dias,a.estado]);
    const csv = [encabezados, ...filas].map((fila) => fila.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    descargarBlobInforme(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" }), "informe_sla.csv");
  };

  return (
    <section className="space-y-5">
      <header className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center">⏱️</span><div><h2>Informe SLA’s</h2><p className="mt-1">Control de duración y cumplimiento por actividad, grupo de cancelación y entidad.</p></div></div>
          <button type="button" onClick={() => setRecarga((v) => v + 1)} className="px-3 py-2">↻ Actualizar datos</button>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InformeKpi icono="📁" titulo="Expedientes" valor={numeroInforme(items.length)} subtitulo="Según el grupo y la búsqueda" />
        <InformeKpi icono="⏱️" titulo="Duración global media" valor={mediaGlobal == null ? "—" : `${numeroInforme(mediaGlobal, 1)} días`} subtitulo={`${numeroInforme(globalesDentro)} dentro de plazo de ${numeroInforme(globalesEvaluables.length)} evaluables`} />
        <InformeKpi icono="⚠️" titulo="Actividades fuera de plazo" valor={numeroInforme(fuera)} subtitulo={cumplimiento == null ? "Sin datos suficientes para calcular cumplimiento" : `${cumplimiento}% de cumplimiento en actividades con objetivo`} />
      </div>
      <section className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.5fr)]">
          <CampoFiltroInforme label="¿Qué expediente necesitas?" value={busqueda} onChange={setBusqueda} placeholder="Número de expediente, titular, operación o producto GTG" />
          <SelectFiltroInforme label="Grupo de cancelación" value={grupo} onChange={setGrupo}>
            <option value="todos">Todos los grupos</option><option value="con-provision">Cancelaciones con provisión</option><option value="sin-provision">Cancelaciones sin provisión</option>
          </SelectFiltroInforme>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p>{numeroInforme(items.length)} expedientes · días naturales. Los expedientes Hipotecario y Crédito Stock quedan excluidos del SLA global.</p><button type="button" onClick={exportar} disabled={actividadesPlanas.length === 0} className="px-4 py-2.5">📊 Exportar Excel (CSV)</button></div>
      </section>
      <AvisoInforme error={error} />
      <section className="overflow-hidden">
        <div className="px-5 py-4"><h3>SLA global por circuito</h3><p className="mt-1">Desde el inicio registrado de la primera actividad hasta el fin de Cierre del expediente. Gestión económica utiliza el objetivo global como referencia propia.</p></div>
        {loading ? <PanelEstadoInforme loading /> : items.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay expedientes que coincidan con los filtros." /> : <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[1050px]"><thead className="sticky top-0 uppercase"><tr>{["Expediente","Titular","Grupo","Entidad","Días globales","Objetivo","Estado"].map((x) => <th key={x} className="whitespace-nowrap px-4 py-3">{x}</th>)}</tr></thead><tbody>{items.map((item) => <Fragment key={item.id}><tr><td className="px-4 py-3">{item.id_expediente || "—"}</td><td className="px-4 py-3">{item.titular || "—"}</td><td className="px-4 py-3">{item.grupo}</td><td className="px-4 py-3">{item.entidad}</td><td className="px-4 py-3">{item.dias_global == null ? "—" : numeroInforme(item.dias_global)}</td><td className="px-4 py-3">{item.excluido_global ? "Excluido" : `${item.objetivo_global} días`}</td><td className="px-4 py-3"><span className={`px-2.5 py-1 ${item.estado_global === "Dentro de plazo" ? "" : item.estado_global === "Fuera de plazo" ? "" : item.estado_global === "Excluido" ? "" : ""}`}>{item.estado_global}</span><button type="button" onClick={() => setExpandido((v) => v === String(item.id) ? "" : String(item.id))} className="ml-3 px-2.5 py-1.5">{expandido === String(item.id) ? "Ocultar actividades" : "Ver actividades"}</button></td></tr>{expandido === String(item.id) && <tr><td colSpan={7} className="px-4 py-4"><div className="overflow-x-auto"><table className="w-full min-w-[950px]"><thead><tr>{["Actividad","Inicio","Fin","Duración","Objetivo","Estado"].map((x) => <th key={x} className="whitespace-nowrap px-3 py-2.5">{x}</th>)}</tr></thead><tbody>{item.actividades.map((a) => <tr key={a.actividad_key}><td className="px-3 py-2.5">{a.actividad}</td><td className="px-3 py-2.5">{fechaInformeVisible(a.fecha_inicio)}</td><td className="px-3 py-2.5">{fechaInformeVisible(a.fecha_fin)}</td><td className="px-3 py-2.5">{a.dias == null ? "—" : `${a.dias} días`}</td><td className="px-3 py-2.5">{a.objetivo_dias == null ? "Sin objetivo" : `${a.objetivo_dias} días`}</td><td className="px-3 py-2.5">{a.estado}</td></tr>)}</tbody></table></div></td></tr>}</Fragment>)}</tbody></table></div>}
      </section>
      <section className="overflow-hidden">
        <div className="px-5 py-4"><h3>Expedientes por actividad</h3><p className="mt-1">Medias, objetivos y número de incumplimientos por actividad para los expedientes filtrados.</p></div>
        {loading ? <PanelEstadoInforme loading /> : <div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead className="uppercase"><tr>{["Actividad","Objetivo","Con fechas","Duración media","Dentro de plazo","Fuera de plazo"].map((x) => <th key={x} className="whitespace-nowrap px-4 py-3">{x}</th>)}</tr></thead><tbody>{resumenActividades.map((a) => <tr key={a.key}><td className="px-4 py-3">{a.label}</td><td className="px-4 py-3">{a.objetivo === "global" ? "40 / 70 días según grupo" : a.objetivo == null ? "Sin objetivo SLA" : `${a.objetivo} días`}</td><td className="px-4 py-3">{numeroInforme(a.medidas)}</td><td className="px-4 py-3">{a.media == null ? "—" : `${numeroInforme(a.media, 1)} días`}</td><td className="px-4 py-3">{numeroInforme(a.cumplen)}</td><td className="px-4 py-3">{numeroInforme(a.incumplen)}</td></tr>)}</tbody></table></div>}
      </section>
    </section>
  );
}

function normalizarInformeSLA(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Los metadatos internos ERP se separan de las 38 columnas originales de ABSIS.
const COLUMNAS_POSTFIRMA = [
  "ERP · Origen registro", "ERP · Estado consolidación", "ERP · Última sincronización",
  "IDEXPEDIENTE", "FECHAALTA", "ORIGENBANKIA", "ACTIVIDADACTUAL",
  "ESTADOACTIVIDAD", "IDPROVISION", "IMPORTEPROVISION", "TIPOPROVISION",
  "DETALLEOPERACION", "TIPOOPERACION", "SUBTIPOOPERACION", "OFICINA", "DAN",
  "IDGESTORIATRAMITE", "NOMBREGESTORIA", "NOMBREDOCUMENTO", "IDGASTO",
  "CONCEPTOGASTO", "ESTADO", "ESTADOJUSTIFICANTE", "FECHAADJUNTARFACTURA",
  "IMPGASTO", "IMPBASEIMPUESTO", "IMPBASERETENCION", "IMPIMPUESTO",
  "FESTADO", "FPETICION", "FPAGO", "CTAORIGEN", "CTADESTINO", "FFACTURA",
  "FORMAPAGO", "NUMFACTURA", "IDBENEFICIARIO", "BENEFICIARIO",
  "NOMBREPAGADOR", "NIFPAGADOR"
];

function valorColumnaPostFirma(fila, columna) {
  const etiqueta = String(columna || "").trim().toUpperCase();
  const internas = {
    "ERP · ORIGEN REGISTRO": fila.origen_registro,
    "ERP · ESTADO CONSOLIDACIÓN": fila.estado_consolidacion,
    "ERP · ÚLTIMA SINCRONIZACIÓN": fila.fecha_ultima_sincronizacion,
  };
  if (Object.prototype.hasOwnProperty.call(internas, etiqueta)) {
    const valorInterno = internas[etiqueta];
    return valorInterno === undefined || valorInterno === null || valorInterno === "" ? "—" : String(valorInterno);
  }

  const original = fila.datos_absis || {};
  const clave = Object.keys(original).find((k) => k.trim().toUpperCase() === etiqueta);
  let valor = clave ? original[clave] : undefined;
  if (valor === undefined || valor === null || valor === "") {
    const alternativas = {
      IDEXPEDIENTE: fila.id_expediente,
      IDGASTO: fila.id_gasto_absis,
      TIPOOPERACION: fila.tipo_operacion,
      CONCEPTOGASTO: fila.concepto_gasto,
      ESTADO: fila.estado,
      ESTADOJUSTIFICANTE: fila.estado_justificante,
      FECHAADJUNTARFACTURA: fila.fecha_adjuntar_factura,
      IMPGASTO: fila.imp_gasto,
      IMPBASEIMPUESTO: fila.imp_base_impuesto,
      IMPBASERETENCION: fila.imp_base_retencion,
      IMPIMPUESTO: fila.imp_impuesto,
      FESTADO: fila.fecha_estado,
      FPETICION: fila.fecha_peticion,
      FPAGO: fila.fecha_pago,
      FFACTURA: fila.fecha_factura_absis || fila.fecha_factura,
      NUMFACTURA: fila.numero_factura_absis || fila.numero_factura,
    };
    valor = alternativas[etiqueta];
  }
  if (valor === undefined || valor === null || valor === "") return "—";
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

// Clasificación de estados originales ABSIS usada por las tarjetas de facturación.
// Mantener los códigos originales; no equiparar estados internos del ERP.
const ESTADOS_ABSIS_INFORME = [
  { codigo: "PAGADO", etiqueta: "Pagado", descripcion: "Pagado según ABSIS", color: "emerald" },
  { codigo: "PAG_RETRO", etiqueta: "Retrocedido", descripcion: "Pago retrocedido", color: "rose" },
  { codigo: "ANULADO", etiqueta: "Anulado", descripcion: "Gasto anulado", color: "slate" },
  { codigo: "PTE_CONS", etiqueta: "Consolidado", descripcion: "Consolidado según ABSIS", color: "blue" },
  { codigo: "PAG_DENEGADO", etiqueta: "Denegado", descripcion: "Pago denegado", color: "rose" },
  { codigo: "PTE_RESP_FAC", etiqueta: "Pendiente respuesta", descripcion: "Pendiente de respuesta de factura", color: "amber" },
  { codigo: "ENTREGADA", etiqueta: "Entregada", descripcion: "Factura entregada", color: "blue" },
  { codigo: "PTE_EXPORT_FAC", etiqueta: "Pendiente exportar", descripcion: "Pendiente de exportación", color: "amber" },
];

const ESTADOS_FACTURACION_ABSIS = {
  cobrado: ["PAGADO"],
  pendiente_factura: ["PTE_RESP_FAC", "PTE_EXPORT_FAC"],
  incidencia: ["PAG_RETRO", "ANULADO", "PAG_DENEGADO"],
  pendiente_cobro: ["PTE_CONS", "ENTREGADA"],
};

function estadoFacturacionAbsis(fila) {
  const estado = String(fila?.estado ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  for (const [situacion, estados] of Object.entries(ESTADOS_FACTURACION_ABSIS)) {
    if (estados.includes(estado)) return situacion;
  }
  return "sin_clasificar";
}

function resumenFacturacionPorTipo(items) {
  const suma = (campo, situacion = null) => items.reduce((total, fila) => {
    if (situacion && estadoFacturacionAbsis(fila) !== situacion) return total;
    return total + (Number(fila[campo]) || 0);
  }, 0);
  const cuenta = (situacion) => items.filter((fila) => estadoFacturacionAbsis(fila) === situacion).length;
  return {
    registros: items.length, total_gasto: suma("imp_gasto"), base_impuesto: suma("imp_base_impuesto"),
    base_retencion: suma("imp_base_retencion"), total_impuesto: suma("imp_impuesto"),
    cobrado: cuenta("cobrado"), pendiente_cobro: cuenta("pendiente_cobro"),
    pendiente_factura: cuenta("pendiente_factura"), incidencias: cuenta("incidencia"),
    total_cobrado: suma("imp_gasto", "cobrado"), total_pendiente_cobro: suma("imp_gasto", "pendiente_cobro"),
    total_pendiente_factura: suma("imp_gasto", "pendiente_factura"), total_incidencias: suma("imp_gasto", "incidencia"),
  };
}

function InformeFacturacion() {
  const filtrosIniciales = () => ({ ...filtrosInformeIniciales(), fecha_desde: "", fecha_hasta: "", modalidad: "todas", estado: "", estado_justificante: "", situacion: "" });
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [aplicados, setAplicados] = useState(filtrosIniciales);
  const [datos, setDatos] = useState({ resumen: {}, items: [] });
  const [datosTarjetas, setDatosTarjetas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTarjetas, setLoadingTarjetas] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const modalFacturacionRef = useRef(null);
  useAccessibleDialog({ open: modalAbierto, onClose: () => setModalAbierto(false), dialogRef: modalFacturacionRef });

  useEffect(() => {
    let activo = true;
    setLoadingTarjetas(true);
    const paramsTarjetas = Object.fromEntries(Object.entries({
      fecha_desde: aplicados.fecha_desde,
      fecha_hasta: aplicados.fecha_hasta,
      modalidad: "todas",
    }).filter(([, valor]) => valor !== "" && valor != null));
    axios.get(API_BASE + "/informes/facturacion", { params: paramsTarjetas }).then(({ data }) => {
      if (activo) setDatosTarjetas(Array.isArray(data?.items) ? data.items : []);
    }).catch((err) => {
      if (activo) {
        setDatosTarjetas([]);
        setError(err?.response?.data?.detail || "No se pudieron actualizar los indicadores de facturación.");
      }
    }).finally(() => { if (activo) setLoadingTarjetas(false); });
    return () => { activo = false; };
  }, [aplicados.fecha_desde, aplicados.fecha_hasta, recarga]);

  useEffect(() => {
    if (!modalAbierto) return undefined;
    let activo = true;
    setLoading(true);
    setError("");
    const params = Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v !== "" && v != null));
    axios.get(API_BASE + "/informes/facturacion", { params })
      .then(({ data }) => {
        if (activo) setDatos({ resumen: data?.resumen || {}, items: Array.isArray(data?.items) ? data.items : [] });
      })
      .catch((err) => { if (activo) setError(err?.response?.data?.detail || "No se pudo cargar el detalle de facturación."); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, [aplicados, modalAbierto, recarga]);

  const cambiar = (campo, valor) => {
    setFiltros((actual) => ({ ...actual, [campo]: valor }));
    if (campo === "fecha_desde" || campo === "fecha_hasta") {
      setAplicados((actual) => ({ ...actual, [campo]: valor }));
    }
  };
  const aplicar = (e) => { e.preventDefault(); setAplicados({ ...filtros }); };
  const exportar = async () => {
    setExportando(true);
    setError("");
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v != null));
      await descargarExcelBackend(API_BASE + "/informes/facturacion/exportar-excel", params, "informe_postfirma_todas_las_filas.xlsx");
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo exportar el informe.");
    } finally { setExportando(false); }
  };

  const resumen = (modalidad) => resumenFacturacionPorTipo(datosTarjetas.filter((fila) => fila.tipo_cancelacion === modalidad));
  const euros = (v) => Number(v || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const campo = "block w-full rounded-xl border border-[var(--molsan-border)] bg-white px-3 py-2.5 text-sm text-[var(--molsan-text)] outline-none focus:border-[var(--molsan-blue)] focus:ring-2 focus:ring-[var(--molsan-blue-soft)]";
  const grupos = [
    { key: "con_provision", titulo: "Cancelación con provisión", descripcion: "TIPOOPERACION: CANCELACIÓN / CANCELACIÓN CON PROVISIÓN", icono: "🏦", acento: "emerald" },
    { key: "sin_provision", titulo: "Cancelación sin provisión", descripcion: "TIPOOPERACION: CANCELACIÓN SIN PROVISIÓN", icono: "📄", acento: "amber" },
    { key: "otros", titulo: "Otros tipos de operación", descripcion: "Filas importadas cuyo TIPOOPERACION no es una cancelación", icono: "📋", acento: "blue" },
  ];
  const renderTarjetas = (grupo) => {
    const r = resumen(grupo.key);
    return (
    <section key={grupo.key} className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={"flex h-12 w-12 items-center justify-center" + (grupo.acento === "emerald" ? "" : "")}>{grupo.icono}</span>
          <div><h3>{grupo.titulo}</h3><p>{grupo.descripcion}</p></div>
          <div className="ml-auto"><div className="uppercase">Registros del periodo</div><div>{loadingTarjetas ? "…" : numeroInforme(r.registros)}</div></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InformeKpi titulo="Gastos Post Firma" valor={loadingTarjetas ? "…" : euros(r.total_gasto)} subtitulo={numeroInforme(r.registros) + " registros"} icono="🧾" />
          <InformeKpi titulo="Base imponible" valor={loadingTarjetas ? "…" : euros(r.base_impuesto)} subtitulo="Base asociada al impuesto" icono="📑" />
          <InformeKpi titulo="Base de retención" valor={loadingTarjetas ? "…" : euros(r.base_retencion)} subtitulo="Base sujeta a retención" icono="🧮" />
          <InformeKpi titulo="Impuestos" valor={loadingTarjetas ? "…" : euros(r.total_impuesto)} subtitulo="Importe total de impuesto" icono="💶" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="p-4"><div>Cobrado</div><div className="mt-1">{loadingTarjetas ? "…" : euros(r.total_cobrado)}</div><div className="mt-1">{numeroInforme(r.cobrado)} registros</div></div>
          <div className="p-4"><div>Pendiente de cobro</div><div className="mt-1">{loadingTarjetas ? "…" : euros(r.total_pendiente_cobro)}</div><div className="mt-1">{numeroInforme(r.pendiente_cobro)} registros</div></div>
          <div className="p-4"><div>Pendiente de factura</div><div className="mt-1">{loadingTarjetas ? "…" : euros(r.total_pendiente_factura)}</div><div className="mt-1">{numeroInforme(r.pendiente_factura)} registros</div></div>
          <div className="p-4"><div>Importe con incidencias</div><div className="mt-1">{loadingTarjetas ? "…" : euros(r.total_incidencias)}</div><div className="mt-1">{numeroInforme(r.incidencias)} registros</div></div>
        </div>
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => {
              const siguiente = { ...filtros, modalidad: grupo.key };
              setFiltros(siguiente);
              setAplicados(siguiente);
              setModalAbierto(true);
            }}
            className={"inline-flex items-center gap-2 px-6 py-3" + (grupo.acento === "emerald" ? "" : "")}
          >
            📊 Ver detalle y descargar Excel: {grupo.titulo}
          </button>
        </div>
      </section>
    );
  };

  return (
    <>
    <section className="space-y-5">
      <div role="note" className="flex items-start gap-3 px-4 py-3">
        <span aria-hidden="true">ℹ️</span>
        <p><strong>Importante:</strong> para que cada gasto quede correctamente asociado a su expediente en el ERP, debe relacionarse el <strong>IDGASTO</strong> del Excel ABSIS con el expediente correspondiente. Los gastos sin esa relación deben revisarse; este informe no crea el vínculo automáticamente.</p>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2>Informes de facturación</h2><p className="mt-1">Indicadores de Post Firma por tipo de operación y por estado original de ABSIS. El periodo se filtra por FPAGO.</p></div>
          <button type="button" onClick={() => setRecarga((v) => v + 1)} className="px-4 py-2">↻ Actualizar</button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>Fecha desde<input className={campo} type="date" value={filtros.fecha_desde} onChange={(e) => cambiar("fecha_desde", e.target.value)} /></label>
          <label>Fecha hasta<input className={campo} type="date" value={filtros.fecha_hasta} onChange={(e) => cambiar("fecha_hasta", e.target.value)} /></label>
        </div>
        <p className="mt-2">Por defecto se muestran todos los registros Post Firma importados. Puedes limitar el informe a un periodo seleccionando las fechas; las tarjetas se actualizarán automáticamente.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        {renderTarjetas(grupos[0])}
        {renderTarjetas(grupos[1])}
      </div>

      <section className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3>Seguimiento por estado ABSIS</h3>
            <p className="mt-1">Desglose de las filas Post Firma que cumplen el concepto y beneficiario seleccionados, agrupadas por el ESTADO original del Excel.</p>
          </div>
          <span className="px-3 py-1.5">{loadingTarjetas ? "Actualizando…" : numeroInforme(datosTarjetas.length) + " registros analizados"}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ESTADOS_ABSIS_INFORME.map((estadoInfo) => {
            const filasEstado = datosTarjetas.filter((fila) => String(fila.estado ?? "").trim().toUpperCase().replace(/\s+/g, " ") === estadoInfo.codigo);
            const importeEstado = filasEstado.reduce((total, fila) => total + (Number(fila.imp_gasto) || 0), 0);
            const acento = "border-[var(--molsan-border)] bg-[var(--molsan-panel)] text-[var(--molsan-blue)]";
            return (
              <button key={estadoInfo.codigo} type="button" disabled={loadingTarjetas} onClick={() => {
                const siguiente = { ...filtros, modalidad: "todas", estado: estadoInfo.codigo };
                setFiltros(siguiente);
                setAplicados(siguiente);
                setModalAbierto(true);
              }} className={"p-4" + acento}>
                <div className="uppercase">{estadoInfo.etiqueta}</div>
                <div className="mt-2 tabular-nums">{loadingTarjetas ? "…" : numeroInforme(filasEstado.length)}</div>
                <div className="mt-1 tabular-nums">{loadingTarjetas ? "…" : euros(importeEstado)}</div>
                <div className="mt-1">{estadoInfo.descripcion}</div>
                <div className="mt-3 underline-offset-2">Ver registros</div>
              </button>
            );
          })}
        </div>
        {(() => {
          const estados = datosTarjetas.reduce((acumulado, fila) => {
            const estado = String(fila.estado ?? "").trim() || "(vacío)";
            if (!acumulado[estado]) acumulado[estado] = { filas: 0, importe: 0 };
            acumulado[estado].filas += 1;
            acumulado[estado].importe += Number(fila.imp_gasto || 0);
            return acumulado;
          }, {});
          const listaEstados = Object.entries(estados).sort((a, b) => {
            if (a[0] === "(vacío)") return 1;
            if (b[0] === "(vacío)") return -1;
            return a[0].localeCompare(b[0], "es");
          });
          return loadingTarjetas ? (
            <div className="mt-4 p-4">Cargando estados ABSIS…</div>
          ) : listaEstados.length === 0 ? (
            <div className="mt-4 p-4">No hay registros para el periodo seleccionado.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="uppercase"><tr><th className="px-4 py-3">ESTADO (Excel ABSIS)</th><th className="px-4 py-3">Registros</th><th className="px-4 py-3">Importe IMPGASTO</th><th className="px-4 py-3">Consulta</th></tr></thead>
                <tbody>
                  {listaEstados.map(([estado, dato]) => (
                    <tr key={estado}>
                      <td className="px-4 py-3">{estado}</td>
                      <td className="px-4 py-3 tabular-nums">{numeroInforme(dato.filas)}</td>
                      <td className="px-4 py-3 tabular-nums">{euros(dato.importe)}</td>
                      <td className="px-4 py-3">{estado === "(vacío)" ? <span>Sin código</span> : <button type="button" onClick={() => {
                        const siguiente = { ...filtros, modalidad: "todas", estado };
                        setFiltros(siguiente);
                        setAplicados(siguiente);
                        setModalAbierto(true);
                      }} className="px-3 py-1.5">Ver registros</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
        <p className="mt-3">Las tarjetas muestran los ocho códigos acordados de ESTADO. Los códigos originales se conservan; los valores vacíos o desconocidos siguen apareciendo en el desglose inferior. PAG_RETRO no se contabiliza como cobro efectivo. La consulta no modifica datos.</p>
      </section>

      <AvisoInforme error={error} />

      {modalAbierto && (
        <div className="panel-modal-premium fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalAbierto(false); }}>
          <section ref={modalFacturacionRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-facturacion-titulo" className="molsan-modal__panel flex max-h-[96vh] w-full max-w-[1800px] flex-col overflow-hidden">
            <header className="molsan-modal__header flex flex-wrap items-start justify-between gap-3">
              <div><h2 id="modal-facturacion-titulo">Detalle de facturación</h2><p className="mt-1">Tabla Excel con los registros que cumplen los filtros seleccionados.</p></div>
              <button type="button" onClick={() => setModalAbierto(false)} aria-label="Cerrar ventana" className="px-3 py-2">✕ Cerrar</button>
            </header>
            <form onSubmit={aplicar} className="grid grid-cols-1 gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
              <label>Fecha desde<input className={campo} type="date" value={filtros.fecha_desde} onChange={(e) => cambiar("fecha_desde", e.target.value)} /></label>
              <label>Fecha hasta<input className={campo} type="date" value={filtros.fecha_hasta} onChange={(e) => cambiar("fecha_hasta", e.target.value)} /></label>
              <label>Clasificación<select className={campo} value={filtros.modalidad} onChange={(e) => cambiar("modalidad", e.target.value)}><option value="todas">Todas</option><option value="con_provision">Cancelación con provisión</option><option value="sin_provision">Cancelación sin provisión</option><option value="otros">Otros tipos de operación</option></select></label>
              <label>Tipo operación<input className={campo} value={filtros.tipo_operacion || ""} onChange={(e) => cambiar("tipo_operacion", e.target.value)} placeholder="Filtrar operación" /></label>
              <label>Estado ABSIS<input className={campo} value={filtros.estado || ""} onChange={(e) => cambiar("estado", e.target.value)} placeholder="Filtrar estado" /></label>
              <label>Estado justificante<input className={campo} value={filtros.estado_justificante || ""} onChange={(e) => cambiar("estado_justificante", e.target.value)} placeholder="Filtrar justificante" /></label>
              <label>Situación económica<select className={campo} value={filtros.situacion} onChange={(e) => cambiar("situacion", e.target.value)}><option value="">Todas</option><option value="cobrado">Cobrado (estado ABSIS)</option><option value="pendiente_cobro">Pendiente de cobro</option><option value="pendiente_factura">Pendiente de factura</option><option value="incidencia">Con incidencia</option></select></label>
              <label>Buscar expediente / factura<input className={campo} value={filtros.q || ""} onChange={(e) => cambiar("q", e.target.value)} placeholder="Nº expediente, IDGASTO o factura" /></label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4">
                <button type="submit" className="px-4 py-2.5">Aplicar filtros</button>
                <button type="button" onClick={exportar} disabled={exportando} className="molsan-export-excel">{exportando ? "Exportando…" : "↓ Descargar Excel"}</button>
                <span>La selección de fechas también actualiza las tarjetas del informe.</span>
              </div>
            </form>
            <div className="flex-1 overflow-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div>{loading ? "Consultando registros…" : numeroInforme(datos.items.length) + " registros encontrados"}</div><div>Filtro del informe: CONCEPTOGASTO = HONORARIOS GESTORÍA y BENEFICIARIO = *MOLSAN. IDPAGO sigue desconectado.</div></div>
              {loading ? <PanelEstadoInforme loading /> : datos.items.length === 0 ? <PanelEstadoInforme vacio textoVacio="No hay filas Post Firma para los filtros seleccionados." /> : (
                <div className="max-h-[58vh] overflow-auto"><table className="min-w-[2600px] w-full">
                  <thead className="sticky top-0 z-10"><tr>{COLUMNAS_POSTFIRMA.map((h, i) => <th key={h + "-" + i} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
                  <tbody>{datos.items.map((fila, i) => <tr key={(fila.id_gasto_absis || fila.id_expediente || "registro") + "-" + i}>{COLUMNAS_POSTFIRMA.map((h, j) => <td key={h + "-" + j} className="whitespace-nowrap px-3 py-3">{valorColumnaPostFirma(fila, h)}</td>)}</tr>)}</tbody>
                </table></div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
    <InformeHistoricoPostFirma />
    </>
  );
}

// Visor independiente del almacén histórico Post Firma.
function InformeHistoricoPostFirma() {
  const [cargas, setCargas] = useState([]);
  const [cargaSeleccionada, setCargaSeleccionada] = useState("");
  const [registros, setRegistros] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [cargandoCargas, setCargandoCargas] = useState(false);
  const [cargandoFilas, setCargandoFilas] = useState(false);
  const [error, setError] = useState("");
  const limite = 100;
  useEffect(() => {
    let activo = true; setCargandoCargas(true);
    axios.get("/utilidades/importador-absis/postfirma/cargas").then(({data}) => {
      if (!activo) return; const lista = Array.isArray(data?.items) ? data.items : [];
      setCargas(lista); setCargaSeleccionada((actual) => actual || (lista[0] ? String(lista[0].id) : ""));
    }).catch((err) => { if (activo) setError(err?.response?.data?.detail || "No se pudo cargar el histórico Post Firma."); })
      .finally(() => { if (activo) setCargandoCargas(false); });
    return () => { activo = false; };
  }, []);
  useEffect(() => {
    if (!cargaSeleccionada) { setRegistros([]); setColumnas([]); setTotal(0); return undefined; }
    let activo = true; setCargandoFilas(true); setError("");
    axios.get("/utilidades/importador-absis/postfirma/registros", {params:{carga_id:Number(cargaSeleccionada),limit:limite,offset}})
      .then(({data}) => { if (!activo) return; setRegistros(Array.isArray(data?.items)?data.items:[]); setColumnas(Array.isArray(data?.columnas)?data.columnas:[]); setTotal(Number(data?.total||0)); })
      .catch((err) => { if (activo) setError(err?.response?.data?.detail || "No se pudieron consultar las filas originales."); })
      .finally(() => { if (activo) setCargandoFilas(false); });
    return () => { activo = false; };
  }, [cargaSeleccionada, offset]);
  const cargaActual = cargas.find((c) => String(c.id) === String(cargaSeleccionada));
  const mostrarValor = (v) => v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
  const actualizar = async () => {
    setError(""); setCargandoCargas(true);
    try { const {data}=await axios.get("/utilidades/importador-absis/postfirma/cargas"); const lista=Array.isArray(data?.items)?data.items:[]; setCargas(lista); if (!lista.some((c)=>String(c.id)===String(cargaSeleccionada))) {setCargaSeleccionada(lista[0]?String(lista[0].id):"");setOffset(0);} }
    catch(err){setError(err?.response?.data?.detail||"No se pudo actualizar el histórico.");} finally{setCargandoCargas(false);}
  };
  return (
    <section className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2>Histórico bruto Post Firma</h2><p className="mt-1 max-w-3xl">Consulta las filas originales por fichero y mes. No vincula expedientes, no modifica Gestión económica y no consolida movimientos.</p></div><button type="button" onClick={actualizar} disabled={cargandoCargas} className="px-4 py-2">↻ Actualizar cargas</button></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="sm:col-span-2">Fichero importado<select value={cargaSeleccionada} onChange={(e)=>{setCargaSeleccionada(e.target.value);setOffset(0);}} className="mt-1 block w-full px-3 py-2.5" disabled={cargandoCargas||!cargas.length}>{!cargas.length&&<option value="">No hay cargas disponibles</option>}{cargas.map((c)=><option key={c.id} value={String(c.id)}>{c.nombre_archivo} · carga #{c.id} · {c.filas_guardadas} filas</option>)}</select></label><div className="p-3"><p>Filas Excel</p><p className="mt-1">{cargaActual?.filas_excel??"—"}</p></div><div className="p-3"><p>Filas guardadas</p><p className="mt-1">{cargaActual?.filas_guardadas??"—"}</p></div></div>
      {cargaActual&&<p className="break-all">Fecha de carga: {cargaActual.fecha_carga||"—"} · SHA-256: {cargaActual.sha256||"—"}</p>}{error&&<p role="alert" className="p-3">{error}</p>}
      <div className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><h3>Filas originales</h3><p>Columnas dinámicas del Excel, incluida TIPOCONCEPTO cuando exista.</p></div><span>{total.toLocaleString("es-ES")} filas</span></div>
      {cargandoCargas||cargandoFilas?<p className="p-8">Cargando histórico…</p>:!cargaSeleccionada?<p className="p-8">Todavía no hay ficheros Post Firma importados.</p>:<div className="max-h-[58vh] overflow-auto"><table className="min-w-max w-full"><thead className="sticky top-0 z-10"><tr><th className="whitespace-nowrap px-3 py-3">Fila Excel</th>{columnas.map((c,i)=><th key={String(c)+"-"+i} className="whitespace-nowrap px-3 py-3">{c||"(columna sin título)"}</th>)}</tr></thead><tbody>{registros.map((fila)=><tr key={fila.id}><td className="whitespace-nowrap px-3 py-2">{fila.numero_fila}</td>{columnas.map((c,i)=><td key={String(c)+"-"+i} className="max-w-xs whitespace-nowrap px-3 py-2">{mostrarValor(fila.datos?.[c])}</td>)}</tr>)}{!registros.length&&<tr><td colSpan={Math.max(columnas.length+1,1)} className="px-4 py-8">Esta carga no contiene filas con datos.</td></tr>}</tbody></table></div>}
      {cargaSeleccionada&&<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><p>Mostrando {total?offset+1:0}–{Math.min(offset+registros.length,total)} de {total.toLocaleString("es-ES")}</p><div className="flex gap-2"><button type="button" disabled={offset===0||cargandoFilas} onClick={()=>setOffset((v)=>Math.max(0,v-limite))} className="px-3 py-2">Anterior</button><button type="button" disabled={offset+limite>=total||cargandoFilas} onClick={()=>setOffset((v)=>v+limite)} className="px-3 py-2">Siguiente</button></div></div>}
      </div>
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
    <section className="overflow-hidden">
      <div className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            {apartado.icono}
          </div>
          <div>
            <h2>{detalle.encabezado}</h2>
            <p className="mt-1">{detalle.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5 px-4 py-3">
          <strong>En preparación.</strong> Este apartado está creado en el menú. Falta definir sus filtros e indicadores y conectar el endpoint correspondiente; no se muestran cifras ficticias.
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {detalle.indicadores.map((indicador) => (
            <div key={indicador.titulo} className="p-4">
              <div>{indicador.titulo}</div>
              <p className="mt-2">{indicador.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Informes() {
  const navigate = useNavigate();
  const { apartado: claveApartado } = useParams();
  const apartadoSeleccionado = APARTADOS_INFORMES.find(
    (apartado) => apartado.key === claveApartado
  );

  const renderInforme = () => {
    if (claveApartado === "apoderados") return <InformeCitasApoderados />;
    if (claveApartado === "firmas") return <InformeFirmas />;
    if (claveApartado === "sla") return <InformeSLA />;
    if (claveApartado === "notarios") return <InformeNotarios />;
    if (claveApartado === "facturacion") return <InformeFacturacion />;
    return null;
  };

  return (
    <div className="erp-page utilidades-premium-page herramientas-subpagina-premium min-h-full min-w-0 space-y-5">
      <MolsanPageHeader
        mark="IF"
        title={apartadoSeleccionado ? apartadoSeleccionado.titulo : "Informes"}
        description={apartadoSeleccionado ? apartadoSeleccionado.descripcion : "Selecciona el tipo de informe que quieres consultar."}
      />
      {claveApartado && <div className="flex justify-end"><button type="button" onClick={() => navigate("/informes")} className="inline-flex items-center gap-2 px-4 py-2.5">← Volver a Informes</button></div>}

      {!claveApartado ? (
        <nav aria-label="Apartados de informes" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {APARTADOS_INFORMES.map((apartado) => (
            <button
              key={apartado.key}
              type="button"
              onClick={() => navigate(`/informes/${apartado.key}`)}
              className="group flex min-h-[150px] items-start gap-4 p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center">{apartado.icono}</span>
              <span className="min-w-0 flex-1">
                <span className="block">{apartado.titulo}</span>
                <span className="mt-2 block">{apartado.descripcion}</span>
                <span className="mt-5 inline-flex items-center gap-2">Abrir informe <span aria-hidden="true">→</span></span>
              </span>
            </button>
          ))}
        </nav>
      ) : apartadoSeleccionado ? (
        renderInforme()
      ) : (
        <section className="p-8">
          <div>📊</div>
          <h2 className="mt-3">Informe no encontrado</h2>
          <p className="mt-1">El apartado solicitado no existe.</p>
          <button type="button" onClick={() => navigate("/informes")} className="mt-4 px-4 py-2.5">Ver los cinco informes</button>
        </section>
      )}
    </div>
  );
}
