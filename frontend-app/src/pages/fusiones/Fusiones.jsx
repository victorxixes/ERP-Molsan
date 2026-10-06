import { useMemo, useState } from "react";

/**
 * ============================================================
 * FUSIONES — MOLSAN ERP
 * Panel de gestión de fusiones
 * ============================================================
 *
 * Diseño:
 * - Adaptado al estilo Premium del ERP
 * - Sin dependencias externas
 * - Responsive
 * - Preparado para conectar posteriormente con API
 * ============================================================
 */


/**
 * ============================================================
 * ICONOS
 * ============================================================
 */

const Icon = ({ type, size = 20 }) => {

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (type) {

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case "warning":
      return (
        <svg {...common}>
          <path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 16h.01" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-15.5-3" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 3" />
          <path d="M20 20v-5h-5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "merge":
      return (
        <svg {...common}>
          <path d="M7 3v5c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V3" />
          <path d="M7 21v-5c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v5" />
          <path d="M4 3h6" />
          <path d="M14 21h6" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
};


/**
 * ============================================================
 * BADGE
 * ============================================================
 */

function Badge({ children, variant = "neutral" }) {

  const variants = {

    blue:
      "bg-blue-50 text-blue-700 border-blue-200",

    green:
      "bg-emerald-50 text-emerald-700 border-emerald-200",

    amber:
      "bg-amber-50 text-amber-700 border-amber-200",

    red:
      "bg-red-50 text-red-700 border-red-200",

    neutral:
      "bg-slate-50 text-slate-600 border-slate-200",

  };

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        min-w-[28px]
        px-2
        py-0.5
        rounded-full
        border
        text-[11px]
        font-bold
        ${variants[variant] || variants.neutral}
      `}
    >
      {children}
    </span>
  );
}


/**
 * ============================================================
 * KPI
 * ============================================================
 */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  variant = "blue",
}) {

  const styles = {

    blue: {
      icon: "bg-blue-50 text-blue-600",
      value: "text-slate-900",
    },

    green: {
      icon: "bg-emerald-50 text-emerald-600",
      value: "text-emerald-700",
    },

    amber: {
      icon: "bg-amber-50 text-amber-600",
      value: "text-amber-700",
    },

    red: {
      icon: "bg-red-50 text-red-600",
      value: "text-red-700",
    },

  };

  const style = styles[variant] || styles.blue;

  return (
    <div
      className="
        bg-white
        border
        border-[var(--erp-border)]
        rounded-2xl
        shadow-sm
        p-5
        transition-all
        duration-200
        hover:shadow-md
      "
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <div
            className="
              text-xs
              font-semibold
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
            "
          >
            {title}
          </div>

          <div
            className={`
              mt-2
              text-3xl
              font-bold
              tracking-tight
              ${style.value}
            `}
          >
            {value}
          </div>

          {subtitle && (
            <div
              className="
                mt-1
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              {subtitle}
            </div>
          )}

        </div>

        <div
          className={`
            w-11
            h-11
            rounded-xl
            flex
            items-center
            justify-center
            flex-shrink-0
            ${style.icon}
          `}
        >
          <Icon type={icon} size={21} />
        </div>

      </div>

    </div>
  );
}


/**
 * ============================================================
 * DATOS INICIALES
 *
 * Posteriormente se sustituirán por API.
 * ============================================================
 */

const fusionesIniciales = [
  {
    id: 1,
    expedienteOrigen: "EXP-2026-001245",
    expedienteDestino: "EXP-2026-001876",
    tipo: "Expediente → Expediente",
    fecha: "05/10/2026",
    usuario: "Administrador",
    estado: "Pendiente",
  },
  {
    id: 2,
    expedienteOrigen: "EXP-2026-001112",
    expedienteDestino: "EXP-2026-001542",
    tipo: "Expediente → Expediente",
    fecha: "04/10/2026",
    usuario: "Administrador",
    estado: "Completada",
  },
  {
    id: 3,
    expedienteOrigen: "EXP-2026-000987",
    expedienteDestino: "EXP-2026-001321",
    tipo: "Expediente → Expediente",
    fecha: "03/10/2026",
    usuario: "Administrador",
    estado: "Completada",
  },
  {
    id: 4,
    expedienteOrigen: "EXP-2026-000765",
    expedienteDestino: "EXP-2026-001002",
    tipo: "Expediente → Expediente",
    fecha: "01/10/2026",
    usuario: "Administrador",
    estado: "Incidencia",
  },
];


/**
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

export default function Fusiones() {

  const [busqueda, setBusqueda] = useState("");

  const [estado, setEstado] = useState("Todos");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [expedienteOrigen, setExpedienteOrigen] =
    useState("");

  const [expedienteDestino, setExpedienteDestino] =
    useState("");

  const [fusiones] =
    useState(fusionesIniciales);


  /**
   * ==========================================================
   * FILTRADO
   * ==========================================================
   */

  const fusionesFiltradas = useMemo(() => {

    const texto = busqueda
      .trim()
      .toLowerCase();

    return fusiones.filter((fusion) => {

      const coincideTexto =
        !texto ||
        fusion.expedienteOrigen
          .toLowerCase()
          .includes(texto) ||
        fusion.expedienteDestino
          .toLowerCase()
          .includes(texto) ||
        fusion.usuario
          .toLowerCase()
          .includes(texto);

      const coincideEstado =
        estado === "Todos" ||
        fusion.estado === estado;

      return (
        coincideTexto &&
        coincideEstado
      );

    });

  }, [
    fusiones,
    busqueda,
    estado,
  ]);


  /**
   * ==========================================================
   * ESTADÍSTICAS
   * ==========================================================
   */

  const total = fusiones.length;

  const pendientes = fusiones.filter(
    (f) => f.estado === "Pendiente"
  ).length;

  const completadas = fusiones.filter(
    (f) => f.estado === "Completada"
  ).length;

  const incidencias = fusiones.filter(
    (f) => f.estado === "Incidencia"
  ).length;


  /**
   * ==========================================================
   * CREAR FUSIÓN
   * ==========================================================
   */

  const crearFusion = (event) => {

    event.preventDefault();

    if (
      !expedienteOrigen.trim() ||
      !expedienteDestino.trim()
    ) {
      return;
    }

    /*
     * Aquí conectaremos posteriormente
     * con el endpoint real de fusiones.
     */

    setMostrarFormulario(false);
    setExpedienteOrigen("");
    setExpedienteDestino("");

  };


  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (

    <div
      className="
        w-full
        max-w-[1800px]
        mx-auto
        px-4
        lg:px-6
        py-6
      "
    >

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-4
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
              "
            >
              <Icon
                type="merge"
                size={23}
              />
            </div>

            <div>

              <h1
                className="
                  text-2xl
                  font-bold
                  text-[var(--erp-text)]
                "
              >
                Fusiones - En Construcción
              </h1>

              <p
                className="
                  mt-0.5
                  text-sm
                  text-[var(--erp-text-soft)]
                "
              >
                Gestión y seguimiento de fusiones de expedientes
              </p>

            </div>

          </div>

        </div>


        <button
          type="button"
          onClick={() =>
            setMostrarFormulario(
              (valor) => !valor
            )
          }
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            px-4
            py-2.5
            rounded-xl
            bg-[var(--erp-primary)]
            text-white
            text-sm
            font-semibold
            shadow-sm
            hover:opacity-90
            transition
            active:scale-[0.98]
          "
        >

          <Icon
            type="merge"
            size={17}
          />

          Nueva fusión

        </button>

      </div>


      {/* ======================================================
          KPIs
          ====================================================== */}

      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-4
          mb-6
        "
      >

        <KpiCard
          title="Total fusiones"
          value={total}
          subtitle="Registradas"
          icon="merge"
          variant="blue"
        />

        <KpiCard
          title="Pendientes"
          value={pendientes}
          subtitle="Pendientes de procesar"
          icon="clock"
          variant="amber"
        />

        <KpiCard
          title="Completadas"
          value={completadas}
          subtitle="Procesadas correctamente"
          icon="check"
          variant="green"
        />

        <KpiCard
          title="Incidencias"
          value={incidencias}
          subtitle="Requieren revisión"
          icon="warning"
          variant="red"
        />

      </div>


      {/* ======================================================
          NUEVA FUSIÓN
          ====================================================== */}

      {mostrarFormulario && (

        <div
          className="
            bg-white
            border
            border-[var(--erp-border)]
            rounded-2xl
            shadow-sm
            p-5
            mb-6
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              mb-5
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
              <Icon
                type="merge"
                size={18}
              />
            </div>

            <div>

              <h2
                className="
                  text-base
                  font-bold
                  text-[var(--erp-text)]
                "
              >
                Nueva fusión
              </h2>

              <p
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                "
              >
                Selecciona el expediente origen y el expediente destino
              </p>

            </div>

          </div>


          <form
            onSubmit={crearFusion}
            className="
              grid
              grid-cols-1
              lg:grid-cols-[1fr_auto_1fr_auto]
              gap-4
              items-end
            "
          >

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
                Expediente origen
              </label>

              <input
                type="text"
                value={expedienteOrigen}
                onChange={(event) =>
                  setExpedienteOrigen(
                    event.target.value
                  )
                }
                placeholder="Nº de expediente"
                className="
                  w-full
                  h-10
                  px-3
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-white
                  text-sm
                  outline-none
                  focus:border-[var(--erp-primary)]
                  focus:ring-2
                  focus:ring-[var(--erp-primary-soft)]
                "
              />

            </div>


            <div
              className="
                hidden
                lg:flex
                items-center
                justify-center
                h-10
                text-[var(--erp-primary)]
              "
            >
              <Icon
                type="arrow"
                size={20}
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
                Expediente destino
              </label>

              <input
                type="text"
                value={expedienteDestino}
                onChange={(event) =>
                  setExpedienteDestino(
                    event.target.value
                  )
                }
                placeholder="Nº de expediente"
                className="
                  w-full
                  h-10
                  px-3
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-white
                  text-sm
                  outline-none
                  focus:border-[var(--erp-primary)]
                  focus:ring-2
                  focus:ring-[var(--erp-primary-soft)]
                "
              />

            </div>


            <button
              type="submit"
              className="
                h-10
                px-5
                rounded-xl
                bg-[var(--erp-primary)]
                text-white
                text-sm
                font-semibold
                hover:opacity-90
                transition
              "
            >
              Crear fusión
            </button>

          </form>

        </div>

      )}


      {/* ======================================================
          PANEL PRINCIPAL
          ====================================================== */}

      <div
        className="
          bg-white
          border
          border-[var(--erp-border)]
          rounded-2xl
          shadow-sm
          overflow-hidden
        "
      >

        {/* ====================================================
            CABECERA PANEL
            ==================================================== */}

        <div
          className="
            px-5
            py-4
            border-b
            border-[var(--erp-border)]
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-4
          "
        >

          <div>

            <h2
              className="
                text-base
                font-bold
                text-[var(--erp-text)]
              "
            >
              Histórico de fusiones
            </h2>

            <p
              className="
                text-xs
                mt-0.5
                text-[var(--erp-text-soft)]
              "
            >
              Consulta las operaciones realizadas en el sistema
            </p>

          </div>


          <div
            className="
              flex
              flex-col
              sm:flex-row
              gap-2
            "
          >

            {/* BUSCADOR */}

            <div className="relative">

              <Icon
                type="search"
                size={16}
              />

              <input
                type="text"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(
                    event.target.value
                  )
                }
                placeholder="Buscar expediente..."
                className="
                  w-full
                  sm:w-[230px]
                  h-9
                  pl-9
                  pr-3
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-white
                  text-xs
                  outline-none
                  focus:border-[var(--erp-primary)]
                "
              />

            </div>


            {/* ESTADO */}

            <select
              value={estado}
              onChange={(event) =>
                setEstado(event.target.value)
              }
              className="
                h-9
                px-3
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-white
                text-xs
                text-[var(--erp-text)]
                outline-none
                focus:border-[var(--erp-primary)]
              "
            >

              <option value="Todos">
                Todos los estados
              </option>

              <option value="Pendiente">
                Pendientes
              </option>

              <option value="Completada">
                Completadas
              </option>

              <option value="Incidencia">
                Incidencias
              </option>

            </select>


            <button
              type="button"
              title="Actualizar"
              className="
                w-9
                h-9
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-white
                text-[var(--erp-text)]
                flex
                items-center
                justify-center
                hover:bg-[var(--erp-primary-soft)]
                hover:text-[var(--erp-primary)]
                transition
              "
            >

              <Icon
                type="refresh"
                size={16}
              />

            </button>

          </div>

        </div>


        {/* ====================================================
            TABLA
            ==================================================== */}

        <div className="overflow-x-auto">

          <table
            className="
              w-full
              min-w-[850px]
              text-sm
            "
          >

            <thead>

              <tr
                className="
                  bg-slate-50
                  border-b
                  border-[var(--erp-border)]
                "
              >

                <th
                  className="
                    px-5
                    py-3
                    text-left
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-[var(--erp-text-soft)]
                  "
                >
                  Expediente origen
                </th>

                <th
                  className="
                    px-5
                    py-3
                    text-left
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-[var(--erp-text-soft)]
                  "
                >
                  Expediente destino
                </th>

                <th
                  className="
                    px-5
                    py-3
                    text-left
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-[var(--erp-text-soft)]
                  "
                >
                  Fecha
                </th>

                <th
                  className="
                    px-5
                    py-3
                    text-left
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-[var(--erp-text-soft)]
                  "
                >
                  Usuario
                </th>

                <th
                  className="
                    px-5
                    py-3
                    text-center
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-[var(--erp-text-soft)]
                  "
                >
                  Estado
                </th>

              </tr>

            </thead>


            <tbody>

              {fusionesFiltradas.map(
                (fusion) => (

                  <tr
                    key={fusion.id}
                    className="
                      border-b
                      border-[var(--erp-border)]
                      last:border-b-0
                      hover:bg-slate-50
                      transition
                    "
                  >

                    <td className="px-5 py-4">

                      <div
                        className="
                          flex
                          items-center
                          gap-2.5
                        "
                      >

                        <div
                          className="
                            w-8
                            h-8
                            rounded-lg
                            bg-blue-50
                            text-blue-600
                            flex
                            items-center
                            justify-center
                          "
                        >
                          <Icon
                            type="file"
                            size={15}
                          />
                        </div>

                        <span
                          className="
                            font-semibold
                            text-[var(--erp-text)]
                          "
                        >
                          {fusion.expedienteOrigen}
                        </span>

                      </div>

                    </td>


                    <td className="px-5 py-4">

                      <div
                        className="
                          flex
                          items-center
                          gap-2.5
                        "
                      >

                        <div
                          className="
                            w-8
                            h-8
                            rounded-lg
                            bg-emerald-50
                            text-emerald-600
                            flex
                            items-center
                            justify-center
                          "
                        >
                          <Icon
                            type="file"
                            size={15}
                          />
                        </div>

                        <span
                          className="
                            font-semibold
                            text-[var(--erp-text)]
                          "
                        >
                          {fusion.expedienteDestino}
                        </span>

                      </div>

                    </td>


                    <td
                      className="
                        px-5
                        py-4
                        text-[var(--erp-text-soft)]
                      "
                    >
                      {fusion.fecha}
                    </td>


                    <td
                      className="
                        px-5
                        py-4
                        text-[var(--erp-text)]
                      "
                    >
                      {fusion.usuario}
                    </td>


                    <td
                      className="
                        px-5
                        py-4
                        text-center
                      "
                    >

                      {fusion.estado ===
                        "Completada" && (
                        <Badge variant="green">
                          Completada
                        </Badge>
                      )}

                      {fusion.estado ===
                        "Pendiente" && (
                        <Badge variant="amber">
                          Pendiente
                        </Badge>
                      )}

                      {fusion.estado ===
                        "Incidencia" && (
                        <Badge variant="red">
                          Incidencia
                        </Badge>
                      )}

                    </td>

                  </tr>

                )
              )}


              {fusionesFiltradas.length ===
                0 && (

                <tr>

                  <td
                    colSpan="5"
                    className="
                      px-5
                      py-12
                      text-center
                    "
                  >

                    <div
                      className="
                        flex
                        flex-col
                        items-center
                        justify-center
                        text-[var(--erp-text-soft)]
                      "
                    >

                      <div
                        className="
                          w-12
                          h-12
                          rounded-2xl
                          bg-slate-100
                          flex
                          items-center
                          justify-center
                          mb-3
                        "
                      >
                        <Icon
                          type="search"
                          size={22}
                        />
                      </div>

                      <div
                        className="
                          text-sm
                          font-semibold
                          text-[var(--erp-text)]
                        "
                      >
                        No se encontraron fusiones
                      </div>

                      <div
                        className="
                          text-xs
                          mt-1
                        "
                      >
                        Prueba con otros criterios de búsqueda.
                      </div>

                    </div>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        {/* ====================================================
            PIE
            ==================================================== */}

        <div
          className="
            px-5
            py-3
            bg-slate-50
            border-t
            border-[var(--erp-border)]
            flex
            items-center
            justify-between
            text-xs
            text-[var(--erp-text-soft)]
          "
        >

          <span>
            Mostrando{" "}
            <strong className="text-[var(--erp-text)]">
              {fusionesFiltradas.length}
            </strong>{" "}
            de{" "}
            <strong className="text-[var(--erp-text)]">
              {fusiones.length}
            </strong>{" "}
            fusiones
          </span>

          <span>
            Molsan ERP
          </span>

        </div>

      </div>

    </div>

  );
}
