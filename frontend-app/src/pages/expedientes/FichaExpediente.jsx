```jsx
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  obtenerExpediente,
} from "../../api/expedientes";

import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";


// ============================================================
// FORMATEADORES
// ============================================================

function valorVisible(valor) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  return String(valor);
}


function formatearFecha(valor) {

  if (!valor) {
    return "—";
  }

  const fecha =
    String(valor);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      fecha
    )
  ) {

    const [
      year,
      month,
      day,
    ] =
      fecha.split("-");

    return `${day}/${month}/${year}`;
  }

  return fecha;
}


function formatearNumero(valor) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  const numero =
    Number(valor);

  if (
    Number.isNaN(numero)
  ) {
    return String(valor);
  }

  return new Intl.NumberFormat(
    "es-ES",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(numero);
}


// ============================================================
// NORMALIZAR ACTIVIDAD
// ============================================================

function normalizarActividad(valor) {

  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


// ============================================================
// ICONO SECCIÓN
// ============================================================

function IconoSeccion({
  tipo = "default",
}) {

  const iconos = {

    estado: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path
          d="m9 12 2 2 4-4"
        />
      </>
    ),

    identificacion: (
      <>
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
        />
        <path
          d="M8 9h8"
        />
        <path
          d="M8 13h5"
        />
        <path
          d="M8 17h3"
        />
      </>
    ),

    titular: (
      <>
        <circle
          cx="12"
          cy="8"
          r="3"
        />
        <path
          d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"
        />
      </>
    ),

    solicitante: (
      <>
        <circle
          cx="9"
          cy="8"
          r="3"
        />
        <path
          d="M3.5 20c.5-3.4 2.7-5.5 5.5-5.5"
        />
        <path
          d="M16 12v6"
        />
        <path
          d="M13 15h6"
        />
      </>
    ),

    facturacion: (
      <>
        <rect
          x="4"
          y="5"
          width="16"
          height="14"
          rx="2"
        />
        <path
          d="M8 9h8"
        />
        <path
          d="M8 13h5"
        />
        <path
          d="M15 13h1"
        />
      </>
    ),

    credito: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path
          d="M12 7v10"
        />
        <path
          d="M15 9.5c0-1.2-1.1-2-3-2s-3 .8-3 2 1.1 2 3 2 3 .8 3 2-1.1 2-3 2-3-.8-3-2"
        />
      </>
    ),

    notario: (
      <>
        <path
          d="M4 20h16"
        />
        <path
          d="M6 20V9l6-4 6 4v11"
        />
        <path
          d="M9 20v-6h6v6"
        />
      </>
    ),

    oficina: (
      <>
        <path
          d="M4 20h16"
        />
        <path
          d="M6 20V8h12v12"
        />
        <path
          d="M8 5h8"
        />
        <path
          d="M9 11h1"
        />
        <path
          d="M14 11h1"
        />
        <path
          d="M9 15h1"
        />
        <path
          d="M14 15h1"
        />
      </>
    ),

    fechas: (
      <>
        <rect
          x="4"
          y="5"
          width="16"
          height="15"
          rx="2"
        />
        <path
          d="M8 3v4"
        />
        <path
          d="M16 3v4"
        />
        <path
          d="M4 10h16"
        />
      </>
    ),

    actividad: (
      <>
        <path
          d="M5 12h14"
        />
        <path
          d="m13 6 6 6-6 6"
        />
      </>
    ),

    provision: (
      <>
        <rect
          x="5"
          y="5"
          width="14"
          height="14"
          rx="2"
        />
        <path
          d="M9 9h6"
        />
        <path
          d="M9 13h6"
        />
      </>
    ),

    finca: (
      <>
        <path
          d="M4 20h16"
        />
        <path
          d="m6 20 2-10 4-3 4 3 2 10"
        />
        <path
          d="M9 15h6"
        />
      </>
    ),

    defectos: (
      <>
        <path
          d="M12 4 3.5 19h17z"
        />
        <path
          d="M12 9v4"
        />
        <path
          d="M12 16h.01"
        />
      </>
    ),

    cgn: (
      <>
        <path
          d="M6 4h12v16H6z"
        />
        <path
          d="M9 8h6"
        />
        <path
          d="M9 12h6"
        />
        <path
          d="M9 16h4"
        />
      </>
    ),

    bankia: (
      <>
        <path
          d="M4 9h16"
        />
        <path
          d="m6 9 6-5 6 5"
        />
        <path
          d="M6 19h12"
        />
        <path
          d="M8 12v5"
        />
        <path
          d="M12 12v5"
        />
        <path
          d="M16 12v5"
        />
      </>
    ),

    otros: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path
          d="M12 8v8"
        />
        <path
          d="M8 12h8"
        />
      </>
    ),

    default: (
      <>
        <rect
          x="5"
          y="4"
          width="14"
          height="16"
          rx="2"
        />
        <path
          d="M9 8h6"
        />
        <path
          d="M9 12h6"
        />
        <path
          d="M9 16h4"
        />
      </>
    ),

  };

  return (
    <svg
      className="
        h-4
        w-4
      "
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconos[tipo] || iconos.default}
    </svg>
  );
}


// ============================================================
// BADGE DE ESTADO
// ============================================================

function EstadoBadge({
  valor,
}) {

  const texto =
    valorVisible(valor);

  if (
    texto === "—"
  ) {

    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-slate-200
          bg-slate-50
          px-2.5
          py-1
          text-[11px]
          font-medium
          text-slate-400
        "
      >
        —
      </span>
    );
  }


  return (
    <span
      className="
        inline-flex
        max-w-full
        items-center
        rounded-full
        border
        border-blue-100
        bg-blue-50
        px-2.5
        py-1
        text-[11px]
        font-semibold
        text-blue-600
      "
    >
      <span
        className="
          mr-1.5
          h-1.5
          w-1.5
          rounded-full
          bg-blue-500
        "
      />

      <span className="truncate">
        {texto}
      </span>
    </span>
  );
}


// ============================================================
// DATO
// ============================================================

function Dato({
  campo,
  valor,
  tipo = "texto",
  destaque = false,
  estado = false,
}) {

  let contenido =
    valorVisible(valor);


  if (
    tipo === "fecha"
  ) {

    contenido =
      formatearFecha(valor);

  }


  if (
    tipo === "numero"
  ) {

    contenido =
      formatearNumero(valor);

  }


  return (
    <div
      className={`
        group
        min-w-0
        rounded-2xl
        border
        p-3.5
        transition-all
        duration-200

        ${
          destaque
            ? `
              border-blue-100
              bg-blue-50/55
            `
            : `
              border-slate-200/80
              bg-white/70
              hover:border-blue-100
              hover:bg-white
              hover:shadow-sm
            `
        }
      `}
    >

      <p
        className="
          mb-1.5
          truncate
          text-[10px]
          font-semibold
          uppercase
          tracking-[0.08em]
          text-slate-400
        "
      >
        {campo}
      </p>


      {estado ? (

        <EstadoBadge
          valor={valor}
        />

      ) : (

        <p
          className={`
            break-words
            text-sm
            leading-5
            ${
              destaque
                ? `
                  font-bold
                  text-blue-700
                `
                : `
                  font-medium
                  text-slate-700
                `
            }
          `}
        >
          {contenido}
        </p>

      )}

    </div>
  );
}


// ============================================================
// SECCIÓN
// ============================================================

function Seccion({
  titulo,
  subtitulo,
  icono = "default",
  children,
  columnas = 3,
}) {

  const gridClass =
    columnas === 4
      ? "xl:grid-cols-4"
      : columnas === 2
        ? "xl:grid-cols-2"
        : "xl:grid-cols-3";


  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/80
        bg-white/78
        p-5
        shadow-[0_16px_45px_rgba(15,23,42,0.06)]
        backdrop-blur-2xl
        sm:p-6
      "
    >

      {/* Línea premium */}

      <div
        className="
          absolute
          left-0
          right-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-blue-400/45
          to-transparent
        "
      />


      {/* CABECERA */}

      <div
        className="
          mb-5
          flex
          items-start
          gap-3
        "
      >

        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-blue-100
            bg-blue-50
            text-blue-600
          "
        >
          <IconoSeccion
            tipo={icono}
          />
        </div>


        <div
          className="
            min-w-0
            flex-1
          "
        >

          <h2
            className="
              text-base
              font-bold
              tracking-tight
              text-slate-800
            "
          >
            {titulo}
          </h2>

          {subtitulo && (

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-slate-400
              "
            >
              {subtitulo}
            </p>

          )}

        </div>

      </div>


      {/* DATOS */}

      <div
        className={`
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
          ${gridClass}
        `}
      >
        {children}
      </div>

    </section>
  );
}


// ============================================================
// OBSERVACIONES
// ============================================================

function Observaciones({
  valor,
}) {

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/80
        bg-white/78
        p-5
        shadow-[0_16px_45px_rgba(15,23,42,0.06)]
        backdrop-blur-2xl
        sm:p-6
      "
    >

      <div
        className="
          absolute
          left-0
          right-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-blue-400/45
          to-transparent
        "
      />


      <div
        className="
          mb-5
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
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-slate-200
            bg-slate-50
            text-slate-500
          "
        >
          <IconoSeccion
            tipo="default"
          />
        </div>


        <div>

          <h2
            className="
              text-base
              font-bold
              tracking-tight
              text-slate-800
            "
          >
            Observaciones
          </h2>

          <p
            className="
              mt-1
              text-xs
              text-slate-400
            "
          >
            Información adicional del expediente
          </p>

        </div>

      </div>


      <div
        className="
          min-h-[120px]
          rounded-2xl
          border
          border-slate-200/80
          bg-slate-50/75
          p-4
          text-sm
          leading-6
          text-slate-600
          shadow-inner
          whitespace-pre-wrap
          break-words
        "
      >
        {valorVisible(valor)}
      </div>

    </section>
  );
}


// ============================================================
// FICHA
// ============================================================

export default function FichaExpediente() {

  const { id } =
    useParams();


  const [
    expediente,
    setExpediente,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // ==========================================================
  // MODAL ENVÍO A NOTARIO
  // ==========================================================

  const [
    mostrarEnviarANotario,
    setMostrarEnviarANotario,
  ] = useState(false);


  // ==========================================================
  // CARGAR EXPEDIENTE
  // ==========================================================

  useEffect(() => {

    let activo = true;


    async function cargar() {

      setLoading(true);
      setError("");


      try {

        const data =
          await obtenerExpediente(
            id
          );


        if (activo) {

          setExpediente(
            data
          );

        }

      } catch (err) {

        console.error(
          "Error cargando expediente:",
          err
        );


        if (activo) {

          setError(
            err?.response?.data?.detail ||
            "No se ha podido cargar el expediente."
          );

          setExpediente(
            null
          );

        }

      } finally {

        if (activo) {

          setLoading(
            false
          );

        }

      }

    }


    cargar();


    return () => {

      activo = false;

    };

  }, [
    id,
  ]);


  // ==========================================================
  // ACTIVIDAD — DOCUMENTACIÓN PREVIA
  // ==========================================================

  const esDocumentacionPrevia =
    useMemo(
      () =>
        normalizarActividad(
          expediente?.actividad_actual
        ) === "documentacion previa",
      [
        expediente?.actividad_actual,
      ]
    );


  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  const cerrarEnviarANotario =
    () => {

      setMostrarEnviarANotario(
        false
      );

    };


  // ==========================================================
  // GUARDAR ENVÍO A NOTARIO
  // ==========================================================

  const guardarEnviarANotario =
    async (payload) => {

      console.log(
        "ENVÍO A NOTARIO — PAYLOAD:",
        payload
      );

      setMostrarEnviarANotario(
        false
      );

    };


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <div
        className="
          relative
          min-h-full
          overflow-hidden
          px-4
          py-4
          sm:px-6
          sm:py-6
        "
      >

        <div
          className="
            w-full
          "
        >

          <div
            className="
              flex
              min-h-[420px]
              items-center
              justify-center
            "
          >

            <div
              className="
                rounded-2xl
                border
                border-white/80
                bg-white/78
                px-6
                py-5
                text-center
                shadow-[0_16px_45px_rgba(15,23,42,0.06)]
                backdrop-blur-2xl
              "
            >

              <div
                className="
                  mx-auto
                  mb-3
                  h-8
                  w-8
                  animate-spin
                  rounded-full
                  border-2
                  border-blue-100
                  border-t-blue-500
                "
              />

              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-600
                "
              >
                Cargando expediente…
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                Obteniendo información del expediente
              </p>

            </div>

          </div>

        </div>

      </div>

    );

  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {

    return (

      <div
        className="
          relative
          min-h-full
          overflow-hidden
          px-4
          py-4
          sm:px-6
          sm:py-6
        "
      >

        <div
          className="
            w-full
          "
        >

          <Link
            to="/expedientes"
            className="
              inline-flex
              items-center
              rounded-xl
              border
              border-slate-200
              bg-white/80
              px-3
              py-2
              text-sm
              font-medium
              text-slate-500
              shadow-sm
              backdrop-blur-xl
              transition
              hover:border-blue-200
              hover:bg-blue-50
              hover:text-blue-600
            "
          >
            ← Volver a expedientes
          </Link>


          <div
            className="
              mt-5
              overflow-hidden
              rounded-[24px]
              border
              border-red-200
              bg-red-50/80
              p-5
              shadow-[0_16px_45px_rgba(127,29,29,0.06)]
              backdrop-blur-2xl
            "
          >

            <div
              className="
                flex
                items-start
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-100
                  text-red-600
                "
              >
                !
              </div>


              <div>

                <h2
                  className="
                    text-base
                    font-bold
                    text-red-700
                  "
                >
                  No se ha podido cargar el expediente
                </h2>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-red-600/80
                  "
                >
                  {error}
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    );

  }


  // ==========================================================
  // NO ENCONTRADO
  // ==========================================================

  if (!expediente) {

    return (

      <div
        className="
          px-4
          py-6
          sm:px-6
        "
      >

        <div
          className="
            w-full
            rounded-[24px]
            border
            border-slate-200
            bg-white/80
            p-8
            text-center
            shadow-sm
            backdrop-blur-xl
          "
        >

          <div
            className="
              mx-auto
              mb-4
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-slate-100
              text-2xl
            "
          >
            📁
          </div>

          <h2
            className="
              text-lg
              font-bold
              text-slate-700
            "
          >
            Expediente no encontrado
          </h2>

          <p
            className="
              mt-1
              text-sm
              text-slate-400
            "
          >
            No se ha encontrado información para este expediente.
          </p>

          <Link
            to="/expedientes"
            className="
              mt-5
              inline-flex
              rounded-xl
              bg-blue-600
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-blue-700
            "
          >
            Volver a expedientes
          </Link>

        </div>

      </div>

    );

  }


  // ==========================================================
  // RESUMEN CABECERA
  // ==========================================================

  const numeroExpediente =
    valorVisible(
      expediente.id_expediente
    );


  const estadoPrincipal =
    expediente.estado_expediente;


  const actividadPrincipal =
    expediente.actividad_actual;


  const importePrincipal =
    formatearNumero(
      expediente.importe
    );


  const tieneDefectos =
    expediente.tiene_defectos_abiertos;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="
        relative
        min-h-full
        overflow-hidden
        px-4
        py-4
        sm:px-6
        sm:py-6
        animate-fadeIn
      "
    >

      {/* =====================================================
          FONDO PREMIUM ERP
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >

        <div
          className="
            absolute
            -left-52
            -top-52
            h-[560px]
            w-[560px]
            rounded-full
            bg-blue-400/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -bottom-56
            -right-56
            h-[620px]
            w-[620px]
            rounded-full
            bg-cyan-300/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[760px]
            w-[760px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white/70
            blur-3xl
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-br
            from-white/75
            via-transparent
            to-blue-50/70
          "
        />

      </div>


      {/* =====================================================
          CONTENIDO
      ===================================================== */}

      <div
        className="
          relative
          z-10
          w-full
          space-y-5
        "
      >

        {/* ===================================================
            CABECERA
        =================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-white/80
            bg-white/80
            p-5
            shadow-[0_20px_60px_rgba(15,23,42,0.08)]
            backdrop-blur-2xl
            sm:p-6
          "
        >

          <div
            className="
              absolute
              left-0
              right-0
              top-0
              h-px
              bg-gradient-to-r
              from-transparent
              via-blue-400/55
              to-transparent
            "
          />


          <div
            className="
              flex
              flex-col
              gap-5
              xl:flex-row
              xl:items-center
              xl:justify-between
            "
          >

            <div
              className="
                min-w-0
              "
            >

              <Link
                to="/expedientes"
                className="
                  inline-flex
                  items-center
                  rounded-lg
                  text-xs
                  font-semibold
                  text-blue-600
                  transition
                  hover:text-blue-700
                "
              >
                ← Volver a expedientes
              </Link>


              <div
                className="
                  mt-3
                  flex
                  items-start
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
                    text-blue-600
                    shadow-sm
                  "
                >

                  <svg
                    className="
                      h-6
                      w-6
                    "
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M4 6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"
                    />
                    <path
                      d="M4 9h16"
                    />
                  </svg>

                </div>


                <div
                  className="
                    min-w-0
                  "
                >

                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Ficha de expediente
                  </p>


                  <h1
                    className="
                      mt-1
                      break-words
                      text-2xl
                      font-bold
                      tracking-tight
                      text-slate-800
                      sm:text-3xl
                    "
                  >
                    {numeroExpediente}
                  </h1>


                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-400
                    "
                  >
                    Información completa del expediente
                  </p>

                </div>

              </div>

            </div>


            {/* RESUMEN */}

            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-3
                xl:min-w-[560px]
              "
            >

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200/80
                  bg-white/70
                  px-4
                  py-3
                "
              >

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  Estado
                </p>

                <div
                  className="
                    mt-2
                  "
                >
                  <EstadoBadge
                    valor={
                      estadoPrincipal
                    }
                  />
                </div>

              </div>


              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200/80
                  bg-white/70
                  px-4
                  py-3
                "
              >

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  Actividad actual
                </p>

                <p
                  className="
                    mt-2
                    truncate
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  {valorVisible(
                    actividadPrincipal
                  )}
                </p>

              </div>


              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200/80
                  bg-white/70
                  px-4
                  py-3
                "
              >

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  Importe
                </p>

                <p
                  className="
                    mt-2
                    text-lg
                    font-bold
                    tracking-tight
                    text-slate-800
                  "
                >
                  {importePrincipal}
                </p>

              </div>

            </div>

          </div>


          {/* =================================================
              ENVIAR A NOTARIO
          ================================================= */}

          {esDocumentacionPrevia && (

            <div
              className="
                mt-5
                flex
                flex-col
                gap-3
                rounded-2xl
                border
                border-blue-100
                bg-gradient-to-r
                from-blue-50/80
                via-white/80
                to-cyan-50/70
                p-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >

              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-blue-200
                    bg-white
                    text-lg
                    shadow-sm
                  "
                >
                  🏛️
                </div>


                <div
                  className="
                    min-w-0
                  "
                >

                  <p
                    className="
                      text-sm
                      font-bold
                      text-slate-800
                    "
                  >
                    Envío a notario
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-slate-500
                    "
                  >
                    El expediente está en Documentación previa y
                    puede prepararse su envío a notario.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setMostrarEnviarANotario(
                    true
                  )
                }
                className="
                  inline-flex
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[var(--erp-primary)]
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:opacity-90
                  hover:shadow-md
                  focus:outline-none
                  focus:ring-2
                  focus:ring-[var(--erp-primary)]
                  focus:ring-offset-2
                "
              >
                <span
                  aria-hidden="true"
                >
                  🏛️
                </span>

                Enviar a notario
              </button>

            </div>

          )}

        </section>


        {/* ===================================================
            ESTADO
        =================================================== */}

        <Seccion
          titulo="Estado del expediente"
          subtitulo="Situación actual y estados operativos"
          icono="estado"
          columnas={3}
        >

          <Dato
            campo="Estado expediente"
            valor={
              expediente.estado_expediente
            }
            estado
          />

          <Dato
            campo="Estado ANCERT"
            valor={
              expediente.estado_expediente_ancert
            }
            estado
          />

          <Dato
            campo="Estado actividad"
            valor={
              expediente.estado_actividad
            }
            estado
          />

          <Dato
            campo="Actividad actual"
            valor={
              expediente.actividad_actual
            }
            destaque
          />

          <Dato
            campo="Tiene defectos abiertos"
            valor={
              expediente.tiene_defectos_abiertos
            }
            destaque={
              Boolean(tieneDefectos)
            }
          />

          <Dato
            campo="Estado facturación"
            valor={
              expediente.facturacion_estado
            }
            estado
          />

          <Dato
            campo="Estado registral"
            valor={
              expediente.registral_estado
            }
            estado
          />

        </Seccion>


        {/* ===================================================
            IDENTIFICACIÓN
        =================================================== */}

        <Seccion
          titulo="Identificación"
          subtitulo="Datos principales de identificación del expediente"
          icono="identificacion"
          columnas={3}
        >

          <Dato
            campo="ID expediente"
            valor={
              expediente.id_expediente
            }
            destaque
          />

          <Dato
            campo="ID interno"
            valor={
              expediente.id
            }
            tipo="numero"
          />

          <Dato
            campo="ID cliente"
            valor={
              expediente.cliente_id
            }
            tipo="numero"
          />

          <Dato
            campo="Contrato"
            valor={
              expediente.contrato
            }
          />

          <Dato
            campo="Tipo operación"
            valor={
              expediente.tipo_operacion
            }
          />

          <Dato
            campo="Subtipo operación"
            valor={
              expediente.subtipo_operacion
            }
          />

          <Dato
            campo="Nº solicitud SIA"
            valor={
              expediente.num_solicitud_sia
            }
          />

          <Dato
            campo="Nº solicitud PNC"
            valor={
              expediente.num_solicitud_pnc
            }
            destaque
          />

          <Dato
            campo="VincCanc"
            valor={
              expediente.vinccanc
            }
          />

          <Dato
            campo="Protocolo"
            valor={
              expediente.protocolo
            }
          />

          <Dato
            campo="Tipo acta"
            valor={
              expediente.tipo_acta
            }
          />

        </Seccion>


        {/* ===================================================
            TITULARES
        =================================================== */}

        <Seccion
          titulo="Titulares"
          subtitulo="Personas titulares vinculadas al expediente"
          icono="titular"
          columnas={3}
        >

          <Dato
            campo="Nombre titular"
            valor={
              expediente.nombre_titular
            }
            destaque
          />

          <Dato
            campo="NIF titular"
            valor={
              expediente.nif_titular
            }
          />

          <Dato
            campo="ID cliente"
            valor={
              expediente.cliente_id
            }
            tipo="numero"
          />

        </Seccion>


        {/* ===================================================
            SOLICITANTES
        =================================================== */}

        <Seccion
          titulo="Solicitantes"
          subtitulo="Datos del solicitante y representación"
          icono="solicitante"
          columnas={3}
        >

          <Dato
            campo="Nombre solicitante"
            valor={
              expediente.nombre_solicitante
            }
            destaque
          />

          <Dato
            campo="NIF solicitante"
            valor={
              expediente.nif_solicitante
            }
          />

          <Dato
            campo="Apoderado"
            valor={
              expediente.apoderado
            }
            destaque
          />

        </Seccion>


        {/* ===================================================
            NOTARIO
        =================================================== */}

        <Seccion
          titulo="Notario"
          subtitulo="Información del notario asociado"
          icono="notario"
          columnas={3}
        >

          <Dato
            campo="Nombre notario"
            valor={
              expediente.nombre_notario
            }
            destaque
          />

          <Dato
            campo="NIF notario"
            valor={
              expediente.nif_notario
            }
          />

          <Dato
            campo="Notario"
            valor={
              expediente.notario
            }
          />

        </Seccion>


        {/* ===================================================
            OFICINA
        =================================================== */}

        <Seccion
          titulo="Oficina"
          subtitulo="Datos de oficina y canal de alta"
          icono="oficina"
          columnas={3}
        >

          <Dato
            campo="Oficina"
            valor={
              expediente.oficina
            }
            destaque
          />

          <Dato
            campo="DAN"
            valor={
              expediente.dan
            }
          />

          <Dato
            campo="Oficina alta"
            valor={
              expediente.oficina_alta
            }
          />

        </Seccion>


        {/* ===================================================
            FECHAS
        =================================================== */}

        <Seccion
          titulo="Fechas"
          subtitulo="Cronología completa del expediente"
          icono="fechas"
          columnas={4}
        >

          <Dato
            campo="Fecha alta"
            valor={
              expediente.fecha_alta
            }
            tipo="fecha"
            destaque
          />

          <Dato
            campo="Fecha firma"
            valor={
              expediente.fecha_firma
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha inscripción"
            valor={
              expediente.fecha_inscripcion
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha entregado cliente"
            valor={
              expediente.fecha_entregado_cliente
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha solicitud"
            valor={
              expediente.fecha_solicitud
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha prevista firma"
            valor={
              expediente.fecha_prevista_firma
            }
            tipo="fecha"
          />

          {expediente.fecha_prevista_firma && (

            <div
              className="
                rounded-2xl
                border
                border-blue-100
                bg-blue-50/55
                p-3.5
                transition-all
                duration-200
                hover:border-blue-200
                hover:bg-blue-50
              "
            >

              <p
                className="
                  mb-1.5
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
              >
                Agenda
              </p>

              <Link
                to="/agenda"
                state={{
                  crearCita: true,
                  fecha:
                    expediente.fecha_prevista_firma,
                  expedienteId:
                    expediente.id_expediente,
                  expediente:
                    expediente.id_expediente,
                  nombreTitular:
                    expediente.nombre_titular || "",
                  nombreNotario:
                    expediente.nombre_notario || "",
                  notarioId:
                    expediente.notario_id || null,
                }}
                className="
                  inline-flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-blue-200
                  bg-white
                  px-3
                  py-2.5
                  text-xs
                  font-bold
                  text-blue-600
                  shadow-sm
                  transition
                  hover:border-blue-300
                  hover:bg-blue-600
                  hover:text-white
                "
              >
                <span aria-hidden="true">
                  📅
                </span>

                Crear cita en agenda
              </Link>

            </div>

          )}

          <Dato
            campo="Fecha vencimiento"
            valor={
              expediente.fecha_vencimiento
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha solicitud CGN"
            valor={
              expediente.fecha_sol_cgn
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha firma prevista validación"
            valor={
              expediente.fecha_firma_prev_val
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha firma prevista cliente"
            valor={
              expediente.fecha_firma_prev_cli
            }
            tipo="fecha"
          />

          <Dato
            campo="Inicio actividad"
            valor={
              expediente.fecha_inicio_actividad
            }
            tipo="fecha"
          />

          <Dato
            campo="Fin actividad"
            valor={
              expediente.fecha_fin_actividad
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha cierre defecto"
            valor={
              expediente.fcierre_defecto
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha facturación"
            valor={
              expediente.facturacion_fecha
            }
            tipo="fecha"
          />

          <Dato
            campo="Fecha registral"
            valor={
              expediente.registral_fecha
            }
            tipo="fecha"
          />

        </Seccion>


        {/* ===================================================
            ACTIVIDAD
        =================================================== */}

        <Seccion
          titulo="Actividad"
          subtitulo="Estado y evolución de la actividad"
          icono="actividad"
          columnas={4}
        >

          <Dato
            campo="Actividad actual"
            valor={
              expediente.actividad_actual
            }
            destaque
          />

          <Dato
            campo="Estado actividad"
            valor={
              expediente.estado_actividad
            }
            estado
          />

          <Dato
            campo="Inicio actividad"
            valor={
              expediente.fecha_inicio_actividad
            }
            tipo="fecha"
          />

          <Dato
            campo="Fin actividad"
            valor={
              expediente.fecha_fin_actividad
            }
            tipo="fecha"
          />

        </Seccion>


        {/* ===================================================
            INFORMACIÓN CREDITICIA
        =================================================== */}

        <Seccion
          titulo="Información crediticia"
          subtitulo="Capital, importe y situación económica del expediente"
          icono="credito"
          columnas={4}
        >

          <Dato
            campo="Capital"
            valor={
              expediente.capital
            }
            tipo="numero"
            destaque
          />

          <Dato
            campo="Importe"
            valor={
              expediente.importe
            }
            tipo="numero"
            destaque
          />

          <Dato
            campo="Saldo real"
            valor={
              expediente.saldo_real
            }
            tipo="numero"
          />

          <Dato
            campo="Saldo disponible"
            valor={
              expediente.saldo_disponible
            }
            tipo="numero"
          />

        </Seccion>


        {/* ===================================================
            FACTURACIÓN
        =================================================== */}

        <Seccion
          titulo="Facturación"
          subtitulo="Información relacionada con la facturación del expediente"
          icono="facturacion"
          columnas={3}
        >

          <Dato
            campo="Estado facturación"
            valor={
              expediente.facturacion_estado
            }
            estado
            destaque
          />

          <Dato
            campo="Fecha facturación"
            valor={
              expediente.facturacion_fecha
            }
            tipo="fecha"
          />

          <Dato
            campo="Importe"
            valor={
              expediente.importe
            }
            tipo="numero"
          />

        </Seccion>


        {/* ===================================================
            PROVISIÓN
        =================================================== */}

        <Seccion
          titulo="Provisión"
          subtitulo="Información de provisión"
          icono="provision"
          columnas={2}
        >

          <Dato
            campo="ID provisión"
            valor={
              expediente.id_provision
            }
          />

          <Dato
            campo="Tipo provisión"
            valor={
              expediente.tipo_provision
            }
          />

        </Seccion>


        {/* ===================================================
            FINCA
        =================================================== */}

        <Seccion
          titulo="Finca"
          subtitulo="Información de la finca vinculada"
          icono="finca"
          columnas={2}
        >

          <Dato
            campo="Finca"
            valor={
              expediente.finca
            }
            destaque
          />

        </Seccion>


        {/* ===================================================
            DEFECTOS
        =================================================== */}

        <Seccion
          titulo="Defectos"
          subtitulo="Incidencias y defectos detectados"
          icono="defectos"
          columnas={3}
        >

          <Dato
            campo="Tiene defectos abiertos"
            valor={
              expediente.tiene_defectos_abiertos
            }
            destaque={
              Boolean(
                expediente.tiene_defectos_abiertos
              )
            }
          />

          <Dato
            campo="Tipo error"
            valor={
              expediente.tipo_error
            }
          />

          <Dato
            campo="Descripción error"
            valor={
              expediente.descripcion_error
            }
          />

          <Dato
            campo="Falta / defecto"
            valor={
              expediente.falta_defecto
            }
          />

          <Dato
            campo="Fecha cierre defecto"
            valor={
              expediente.fcierre_defecto
            }
            tipo="fecha"
          />

        </Seccion>


        {/* ===================================================
            CGN
        =================================================== */}

        <Seccion
          titulo="CGN"
          subtitulo="Información del expediente CGN"
          icono="cgn"
          columnas={2}
        >

          <Dato
            campo="ID expediente CGN"
            valor={
              expediente.id_expediente_cgn
            }
            destaque
          />

          <Dato
            campo="Fecha solicitud CGN"
            valor={
              expediente.fecha_sol_cgn
            }
            tipo="fecha"
          />

        </Seccion>


        {/* ===================================================
            GTG / BANKIA
        =================================================== */}

        <Seccion
          titulo="GTG / Bankia"
          subtitulo="Datos procedentes del entorno GTG / Bankia"
          icono="bankia"
          columnas={3}
        >

          <Dato
            campo="Origen Bankia"
            valor={
              expediente.origen_bankia
            }
          />

          <Dato
            campo="Producto GTG"
            valor={
              expediente.producto_gtg
            }
          />

          <Dato
            campo="DT"
            valor={
              expediente.dt
            }
          />

        </Seccion>


        {/* ===================================================
            OTROS
        =================================================== */}

        <Seccion
          titulo="Otros"
          subtitulo="Información adicional"
          icono="otros"
          columnas={2}
        >

          <Dato
            campo="Lucy"
            valor={
              expediente.lucy
            }
          />

          <Dato
            campo="Indicador TT"
            valor={
              expediente.indicador_tt
            }
          />

        </Seccion>


        {/* ===================================================
            OBSERVACIONES
        =================================================== */}

        <Observaciones
          valor={
            expediente.observaciones
          }
        />


        {/* ===================================================
            PIE
        =================================================== */}

        <div
          className="
            flex
            flex-col
            gap-3
            pb-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >

          <p
            className="
              text-[11px]
              text-slate-400
            "
          >
            Expediente ID interno:{" "}

            <span
              className="
                font-semibold
                text-slate-500
              "
            >
              {valorVisible(
                expediente.id
              )}
            </span>
          </p>


          <Link
            to="/expedientes"
            className="
              inline-flex
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white/80
              px-4
              py-2.5
              text-xs
              font-semibold
              text-slate-500
              shadow-sm
              backdrop-blur-xl
              transition
              hover:border-blue-200
              hover:bg-blue-50
              hover:text-blue-600
            "
          >
            ← Volver al listado
          </Link>

        </div>

      </div>


      {/* =====================================================
          MODAL — ENVÍO A NOTARIO
      ===================================================== */}

      {mostrarEnviarANotario &&
        esDocumentacionPrevia && (

        <EnviarANotarioModal
          expediente={
            expediente
          }
          onClose={
            cerrarEnviarANotario
          }
          onGuardar={
            guardarEnviarANotario
          }
        />

      )}

    </div>

  );
}
```
