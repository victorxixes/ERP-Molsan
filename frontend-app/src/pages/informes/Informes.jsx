import MolsanDataTable from "../../components/ui/MolsanDataTable";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { Fragment, useState, useEffect, useMemo } from "react";
import { sortRows } from "../../utils/sortRows";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../../api/axios";
import { API_BASE } from "../../api/config";
import Chart from "chart.js/auto";
import SelectSJ from "../../components/ui/SelectSJ";
import "../../css/ModalesHerramientasPremium.css";
import { formatEuro as euros } from "../../utils/formatters";

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
      className="informes-report-content informes-report-content--apoderados space-y-5"
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

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
                <MolsanIcon name="search" size={20} />
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

          
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Fecha desde<input className={campo} type="date" value={filtros.fecha_desde} onChange={(e) => cambiar("fecha_desde", e.target.value)} /></label>
          <label className="text-xs font-semibold text-slate-600">Fecha hasta<input className={campo} type="date" value={filtros.fecha_hasta} onChange={(e) => cambiar("fecha_hasta", e.target.value)} /></label>
        </div>
        <p className="mt-2 text-xs text-slate-500">Por defecto se muestran todos los registros Post Firma importados. Puedes limitar el informe a un periodo seleccionando las fechas; las tarjetas se actualizarán automáticamente.</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        {renderTarjetas(grupos[0])}
        {renderTarjetas(grupos[1])}
      </div>

      <section className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Seguimiento por estado ABSIS</h3>
            <p className="mt-1 text-sm text-slate-500">Desglose de las filas Post Firma que cumplen el concepto y beneficiario seleccionados, agrupadas por el ESTADO original del Excel.</p>
          </div>
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{loadingTarjetas ? "Actualizando…" : numeroInforme(datosTarjetas.length) + " registros analizados"}</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ESTADOS_ABSIS_INFORME.map((estadoInfo) => {
            const filasEstado = datosTarjetas.filter((fila) => String(fila.estado ?? "").trim().toUpperCase().replace(/\s+/g, " ") === estadoInfo.codigo);
            const importeEstado = filasEstado.reduce((total, fila) => total + (Number(fila.imp_gasto) || 0), 0);
            const acento = estadoInfo.color === "emerald" ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
              : estadoInfo.color === "rose" ? "border-rose-200 bg-rose-50/70 text-rose-800"
              : estadoInfo.color === "amber" ? "border-amber-200 bg-amber-50/70 text-amber-800"
              : estadoInfo.color === "blue" ? "border-blue-200 bg-blue-50/70 text-blue-800"
              : "border-slate-200 bg-slate-50 text-slate-800";
            return (
              </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Fichero importado<select value={cargaSeleccionada} onChange={(e)=>{setCargaSeleccionada(e.target.value);setOffset(0);}} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700" disabled={cargandoCargas||!cargas.length}>{!cargas.length&&<option value="">No hay cargas disponibles</option>}{cargas.map((c)=><option key={c.id} value={String(c.id)}>{c.nombre_archivo} · carga #{c.id} · {c.filas_guardadas} filas</option>)}</select></label><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Filas Excel</p><p className="mt-1 text-xl font-bold text-slate-800">{cargaActual?.filas_excel??"—"}</p></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Filas guardadas</p><p className="mt-1 text-xl font-bold text-slate-800">{cargaActual?.filas_guardadas??"—"}</p></div></div>
      {cargaActual&&<p className="break-all text-xs text-slate-500">Fecha de carga: {cargaActual.fecha_carga||"—"} · SHA-256: {cargaActual.sha256||"—"}</p>}{error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><h3 className="font-bold text-slate-800">Filas originales</h3><p className="text-xs text-slate-500">Columnas dinámicas del Excel, incluida TIPOCONCEPTO cuando exista.</p></div><span className="text-sm font-semibold text-slate-600">{total.toLocaleString("es-ES")} filas</span></div>
      {cargandoCargas||cargandoFilas?<p className="p-8 text-center text-sm text-slate-500">Cargando histórico…</p>:!cargaSeleccionada?<p className="p-8 text-center text-sm text-slate-500">Todavía no hay ficheros Post Firma importados.</p>:<div className="max-h-[58vh] overflow-auto"><table className="min-w-max w-full text-left text-xs"><thead className="sticky top-0 z-10 bg-slate-100 text-slate-600"><tr><th className="whitespace-nowrap px-3 py-3 font-bold">Fila Excel</th>{columnas.map((c,i)=><th key={String(c)+"-"+i} className="whitespace-nowrap px-3 py-3 font-bold">{c||"(columna sin título)"}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{registros.map((fila)=><tr key={fila.id} className="hover:bg-blue-50/50"><td className="whitespace-nowrap px-3 py-2 text-slate-500">{fila.numero_fila}</td>{columnas.map((c,i)=><td key={String(c)+"-"+i} className="max-w-xs whitespace-nowrap px-3 py-2">{mostrarValor(fila.datos?.[c])}</td>)}</tr>)}{!registros.length&&<tr><td colSpan={Math.max(columnas.length+1,1)} className="px-4 py-8 text-center text-slate-500">Esta carga no contiene filas con datos.</td></tr>}</tbody></table></div>}
      {cargaSeleccionada&&<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3"><p className="text-xs text-slate-500">Mostrando {total?offset+1:0}–{Math.min(offset+registros.length,total)} de {total.toLocaleString("es-ES")}</p><div className="flex gap-2"><button type="button" disabled={offset===0||cargandoFilas} onClick={()=>setOffset((v)=>Math.max(0,v-limite))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Anterior</button><button type="button" disabled={offset+limite>=total||cargandoFilas} onClick={()=>setOffset((v)=>v+limite)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40">Siguiente</button></div></div>}
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
    <div className="erp-page w-full molsan-page molsan-page-stack informes-premium-page herramientas-subpagina-premium">
      <header className="molsan-page-header">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="molsan-page-header__identity flex items-center gap-3">
            <div className="molsan-page-header__mark"><MolsanIcon name="chart" size={42} tone="ocean" /></div>
            <div>
              <div className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</div>
              <h1 className="molsan-page-header__title">{apartadoSeleccionado ? apartadoSeleccionado.titulo : "Informes"}</h1>
              {!apartadoSeleccionado && <p className="molsan-page-header__description">Selecciona el tipo de informe que quieres consultar.</p>}
              {claveApartado && <button type="button" onClick={() => navigate("/informes")} className="molsan-btn molsan-btn--secondary mt-3">← Volver a Informes</button>}
            </div>
          </div>
        </div>
      </header>

      {!claveApartado ? (
        <nav aria-label="Apartados de informes" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {APARTADOS_INFORMES.map((apartado) => (
            <button
              key={apartado.key}
              type="button"
              onClick={() => navigate(`/informes/${apartado.key}`)}
              className="group erp-card flex min-h-[150px] items-start gap-4 p-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <MolsanIcon name={apartado.icono} size={48} tone="ocean" className="transition-transform group-hover:-translate-y-1" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-slate-800">{apartado.titulo}</span>
                <span className="mt-2 block text-sm leading-relaxed text-slate-500">{apartado.descripcion}</span>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700">Abrir informe <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
              </span>
            </button>
          ))}
        </nav>
      ) : apartadoSeleccionado ? (
        renderInforme()
      ) : (
        <section className="erp-card p-8 text-center">
          <div className="flex justify-center"><MolsanIcon name="chart" size={42} /></div>
          <h2 className="mt-3 text-lg font-bold text-slate-800">Informe no encontrado</h2>
          <p className="mt-1 text-sm text-slate-500">El apartado solicitado no existe.</p>
          <button type="button" onClick={() => navigate("/informes")} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Ver los cinco informes</button>
        </section>
      )}
    </div>
  );
}
