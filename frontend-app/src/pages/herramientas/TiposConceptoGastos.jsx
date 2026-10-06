import React, {
  useEffect,
  useMemo,
  useState,
} from "react";


// ============================================================
// TIPOS DE CONCEPTO DE GASTOS
// MOLSAN ERP — PREMIUM 2027
// ============================================================


// ============================================================
// CONFIGURACIÓN API
// ============================================================

const API_ORIGEN =
  "https://agenda-intranet-b.onrender.com";

const API_BASE =
  `${API_ORIGEN}/api/tipos-concepto-gastos`;


// ============================================================
// CATÁLOGO INICIAL
// ============================================================

const CONCEPTOS_INICIALES = [
  "registro de la propiedad",
  "factura notario",
  "honorarios gestoría",
  "factura gestoría externa (no gtg)",
  "devolucion exceso prov.fondos",
  "registro de la propiedad iprc's-svh",
  "factura notaria-comisión otras entidades",
  "gastos circuito gestoría otra entidad",
  "impuestos",
  "traductor",
  "registro mercantil",
];


// ============================================================
// UTILIDADES
// ============================================================

function normalizarNombre(valor) {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}


async function leerRespuestaServidor(response) {
  const texto = await response.text();

  let datos = null;

  try {
    datos = texto
      ? JSON.parse(texto)
      : null;
  } catch {
    datos = null;
  }

  if (!response.ok) {
    const detalle =
      datos?.detail ||
      datos?.mensaje ||
      texto ||
      `Error HTTP ${response.status}`;

    throw new Error(detalle);
  }

  return datos;
}


// ============================================================
// COMPONENTE
// ============================================================

export default function TiposConceptoGastos() {

  // ----------------------------------------------------------
  // ESTADO
  // ----------------------------------------------------------

  const [tipos, setTipos] = useState([]);

  const [cargando, setCargando] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroActivo, setFiltroActivo] =
    useState("todos");

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [tipoEditando, setTipoEditando] =
    useState(null);

  const [nombre, setNombre] =
    useState("");

  const [activo, setActivo] =
    useState(true);


  // ==========================================================
  // CARGAR DATOS
  // ==========================================================

  async function cargarTipos() {

    try {

      setCargando(true);
      setError("");

      const params =
        new URLSearchParams();

      if (busqueda.trim()) {

        params.set(
          "q",
          busqueda.trim()
        );

      }

      if (filtroActivo === "activos") {

        params.set(
          "activo",
          "true"
        );

      }

      if (filtroActivo === "inactivos") {

        params.set(
          "activo",
          "false"
        );

      }

      const url =
        params.toString()
          ? `${API_BASE}?${params.toString()}`
          : API_BASE;

      const response =
        await fetch(url, {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        });

      const datos =
        await leerRespuestaServidor(
          response
        );

      const lista =
        Array.isArray(datos)
          ? datos
          : [];

      setTipos(lista);

    } catch (err) {

      console.error(
        "ERROR CARGANDO TIPOS DE CONCEPTO DE GASTOS:",
        err
      );

      setTipos([]);

      setError(
        err?.message ||
          "No se pudieron cargar los tipos de concepto de gastos."
      );

    } finally {

      setCargando(false);

    }
  }


  // ==========================================================
  // CARGA INICIAL
  // ==========================================================

  useEffect(() => {

    cargarTipos();

  }, [
    busqueda,
    filtroActivo,
  ]);


  // ==========================================================
  // ESTADÍSTICAS
  // ==========================================================

  const estadisticas =
    useMemo(() => {

      const total =
        tipos.length;

      const activos =
        tipos.filter(
          (tipo) => tipo.activo
        ).length;

      const inactivos =
        tipos.filter(
          (tipo) => !tipo.activo
        ).length;

      return {
        total,
        activos,
        inactivos,
      };

    }, [tipos]);


  // ==========================================================
  // ABRIR NUEVO
  // ==========================================================

  function abrirNuevo() {

    setModoEdicion(false);

    setTipoEditando(null);

    setNombre("");

    setActivo(true);

    setError("");

    setMensaje("");

    setMostrarModal(true);
  }


  // ==========================================================
  // ABRIR EDICIÓN
  // ==========================================================

  function abrirEditar(tipo) {

    setModoEdicion(true);

    setTipoEditando(tipo);

    setNombre(
      normalizarNombre(
        tipo?.nombre
      )
    );

    setActivo(
      tipo?.activo !== false
    );

    setError("");

    setMensaje("");

    setMostrarModal(true);
  }


  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  function cerrarModal() {

    if (guardando) {
      return;
    }

    setMostrarModal(false);

    setModoEdicion(false);

    setTipoEditando(null);

    setNombre("");

    setActivo(true);

    setError("");
  }


  // ==========================================================
  // GUARDAR
  // ==========================================================

  async function guardarTipo(event) {

    event?.preventDefault();

    if (guardando) {
      return;
    }

    const nombreNormalizado =
      normalizarNombre(nombre);

    if (!nombreNormalizado) {

      setError(
        "El nombre es obligatorio."
      );

      return;
    }

    try {

      setGuardando(true);

      setError("");

      setMensaje("");

      const payload = {
        nombre:
          nombreNormalizado,
        activo,
      };

      let response;

      if (
        modoEdicion &&
        tipoEditando?.id
      ) {

        response =
          await fetch(
            `${API_BASE}/${tipoEditando.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body:
                JSON.stringify(
                  payload
                ),
            }
          );

      } else {

        response =
          await fetch(
            API_BASE,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Accept:
                  "application/json",
              },
              body:
                JSON.stringify(
                  payload
                ),
            }
          );
      }

      await leerRespuestaServidor(
        response
      );

      setMensaje(
        modoEdicion
          ? "Tipo de concepto actualizado correctamente."
          : "Tipo de concepto creado correctamente."
      );

      cerrarModal();

      await cargarTipos();

    } catch (err) {

      console.error(
        "ERROR GUARDANDO TIPO DE CONCEPTO:",
        err
      );

      setError(
        err?.message ||
          "No se pudo guardar el tipo de concepto."
      );

    } finally {

      setGuardando(false);

    }
  }


  // ==========================================================
  // ACTIVAR / DESACTIVAR
  // ==========================================================

  async function cambiarEstado(tipo) {

    if (!tipo?.id) {
      return;
    }

    const nuevoEstado =
      !Boolean(tipo.activo);

    try {

      setError("");

      setMensaje("");

      const payload = {
        nombre:
          normalizarNombre(
            tipo.nombre
          ),
        activo:
          nuevoEstado,
      };

      const response =
        await fetch(
          `${API_BASE}/${tipo.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body:
              JSON.stringify(
                payload
              ),
          }
        );

      await leerRespuestaServidor(
        response
      );

      setMensaje(
        nuevoEstado
          ? "Tipo activado correctamente."
          : "Tipo desactivado correctamente."
      );

      await cargarTipos();

    } catch (err) {

      console.error(
        "ERROR CAMBIANDO ESTADO:",
        err
      );

      setError(
        err?.message ||
          "No se pudo cambiar el estado."
      );
    }
  }


  // ==========================================================
  // ELIMINAR
  // ==========================================================

  async function eliminarTipo(tipo) {

    if (!tipo?.id) {
      return;
    }

    const confirmado =
      window.confirm(
        `¿Seguro que quieres eliminar "${tipo.nombre}"?`
      );

    if (!confirmado) {
      return;
    }

    try {

      setError("");

      setMensaje("");

      const response =
        await fetch(
          `${API_BASE}/${tipo.id}`,
          {
            method: "DELETE",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      await leerRespuestaServidor(
        response
      );

      setMensaje(
        "Tipo de concepto eliminado correctamente."
      );

      await cargarTipos();

    } catch (err) {

      console.error(
        "ERROR ELIMINANDO TIPO:",
        err
      );

      setError(
        err?.message ||
          "No se pudo eliminar el tipo de concepto."
      );
    }
  }


  // ==========================================================
  // INSERTAR CATALOGADOS QUE PUEDAN FALTAR
  // ==========================================================

  const conceptosFaltantes =
    useMemo(() => {

      const existentes = new Set(
        tipos.map(
          (tipo) =>
            normalizarNombre(
              tipo.nombre
            )
        )
      );

      return CONCEPTOS_INICIALES.filter(
        (nombreInicial) =>
          !existentes.has(
            normalizarNombre(
              nombreInicial
            )
          )
      );

    }, [tipos]);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-50
        p-4
        md:p-6
        lg:p-8
      "
    >

      <div
        className="
          mx-auto
          max-w-7xl
        "
      >

        {/* ==================================================
            CABECERA
        ================================================== */}

        <div
          className="
            mb-6
            flex
            flex-col
            gap-4
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >

          <div>

            <div
              className="
                mb-2
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-blue-600
                  text-white
                  shadow-lg
                  shadow-blue-600/20
                "
              >

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="
                    h-5
                    w-5
                  "
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M4 6.5
                      A2.5 2.5 0 0 1 6.5 4
                      h11
                      A2.5 2.5 0 0 1 20 6.5
                      v11
                      A2.5 2.5 0 0 1 17.5 20
                      h-11
                      A2.5 2.5 0 0 1 4 17.5
                      v-11Z
                    "
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M8 8.5
                      h8
                    "
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M8 12
                      h8
                    "
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M8 15.5
                      h5
                    "
                  />
                </svg>

              </div>

              <div>

                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-blue-600
                  "
                >
                  Herramientas
                </p>

                <h1
                  className="
                    text-2xl
                    font-bold
                    tracking-tight
                    text-slate-800
                    md:text-3xl
                  "
                >
                  Tipos de Concepto de Gastos
                </h1>

              </div>

            </div>

            <p
              className="
                max-w-3xl
                text-sm
                leading-6
                text-slate-500
              "
            >
              Catálogo de conceptos utilizados
              para clasificar los gastos de los
              expedientes.
            </p>

          </div>


          {/* =================================================
              BOTÓN NUEVO
          ================================================= */}

          <button
            type="button"
            onClick={abrirNuevo}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-blue-600
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              shadow-lg
              shadow-blue-600/20
              transition-all
              duration-200
              hover:bg-blue-700
              hover:-translate-y-0.5
              active:translate-y-0
            "
          >

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="
                h-4
                w-4
              "
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="
                  M12 5
                  v14
                "
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="
                  M5 12
                  h14
                "
              />
            </svg>

            Nuevo concepto

          </button>

        </div>


        {/* ==================================================
            TARJETAS RESUMEN
        ================================================== */}

        <div
          className="
            mb-6
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-3
          "
        >

          {/* TOTAL */}

          <div
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  Total
                </p>

                <p
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    text-slate-800
                  "
                >
                  {estadisticas.total}
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
                  bg-slate-100
                  text-slate-600
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M5 5.5
                      A1.5 1.5 0 0 1 6.5 4
                      h11
                      A1.5 1.5 0 0 1 19 5.5
                      v13
                      A1.5 1.5 0 0 1 17.5 20
                      h-11
                      A1.5 1.5 0 0 1 5 18.5
                      v-13Z
                    "
                  />
                </svg>
              </div>

            </div>

          </div>


          {/* ACTIVOS */}

          <div
            className="
              rounded-2xl
              border
              border-emerald-200
              bg-white
              p-5
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-emerald-600
                  "
                >
                  Activos
                </p>

                <p
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    text-slate-800
                  "
                >
                  {estadisticas.activos}
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
                  bg-emerald-50
                  text-emerald-600
                "
              >

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      m5 12.5
                      4.2 4.2
                      L19 7
                    "
                  />
                </svg>

              </div>

            </div>

          </div>


          {/* INACTIVOS */}

          <div
            className="
              rounded-2xl
              border
              border-amber-200
              bg-white
              p-5
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:shadow-md
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wider
                    text-amber-600
                  "
                >
                  Inactivos
                </p>

                <p
                  className="
                    mt-2
                    text-3xl
                    font-bold
                    text-slate-800
                  "
                >
                  {estadisticas.inactivos}
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
                  bg-amber-50
                  text-amber-600
                "
              >

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M12 9
                      v4
                    "
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M12 16.5
                      v.01
                    "
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M10.25 4.75
                      3.5 16
                      A2 2 0 0 0 5.2 19
                      h13.6
                      A2 2 0 0 0 20.5 16
                      l-6.75-11.25
                      A2 2 0 0 0 10.25 4.75Z
                    "
                  />
                </svg>

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            FILTROS
        ================================================== */}

        <div
          className="
            mb-6
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-sm
            md:p-5
          "
        >

          <div
            className="
              grid
              grid-cols-1
              gap-4
              lg:grid-cols-[1fr_auto]
              lg:items-end
            "
          >

            {/* BUSCADOR */}

            <div>

              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-slate-500
                "
              >
                Buscar concepto
              </label>

              <div
                className="
                  relative
                "
              >

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-y-0
                    left-0
                    flex
                    items-center
                    pl-3
                    text-slate-400
                  "
                >

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="
                      h-4
                      w-4
                    "
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                    />

                    <path
                      strokeLinecap="round"
                      d="
                        m16.5 16.5
                        4 4
                      "
                    />
                  </svg>

                </div>

                <input
                  type="text"
                  value={busqueda}
                  onChange={(event) =>
                    setBusqueda(
                      event.target.value
                    )
                  }
                  placeholder="Escribe para buscar..."
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    py-3
                    pl-10
                    pr-4
                    text-sm
                    text-slate-700
                    outline-none
                    transition-all
                    focus:border-blue-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />

              </div>

            </div>


            {/* ESTADO */}

            <div>

              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wider
                  text-slate-500
                "
              >
                Estado
              </label>

              <select
                value={filtroActivo}
                onChange={(event) =>
                  setFiltroActivo(
                    event.target.value
                  )
                }
                className="
                  min-w-[180px]
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                  text-sm
                  text-slate-700
                  outline-none
                  transition-all
                  focus:border-blue-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              >

                <option value="todos">
                  Todos
                </option>

                <option value="activos">
                  Activos
                </option>

                <option value="inactivos">
                  Inactivos
                </option>

              </select>

            </div>

          </div>

        </div>


        {/* ==================================================
            MENSAJES
        ================================================== */}

        {mensaje && (

          <div
            className="
              mb-6
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-emerald-200
              bg-emerald-50
              px-4
              py-3
              text-sm
              font-medium
              text-emerald-700
            "
          >

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="
                h-5
                w-5
                shrink-0
              "
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="
                  m5 12
                  4 4
                  10-10
                "
              />
            </svg>

            <span>
              {mensaje}
            </span>

          </div>

        )}


        {error && (

          <div
            className="
              mb-6
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              font-medium
              text-red-700
            "
          >

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="
                h-5
                w-5
                shrink-0
              "
            >
              <circle
                cx="12"
                cy="12"
                r="8"
              />

              <path
                strokeLinecap="round"
                d="
                  M12 8
                  v4
                "
              />

              <path
                strokeLinecap="round"
                d="
                  M12 15.5
                  v.01
                "
              />
            </svg>

            <span>
              {error}
            </span>

          </div>

        )}


        {/* ==================================================
            TABLA
        ================================================== */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              px-5
              py-4
            "
          >

            <div>

              <h2
                className="
                  text-base
                  font-bold
                  text-slate-800
                "
              >
                Catálogo
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                {tipos.length === 1
                  ? "1 concepto"
                  : `${tipos.length} conceptos`}
              </p>

            </div>

            {cargando && (

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-medium
                  text-slate-400
                "
              >

                <span
                  className="
                    h-4
                    w-4
                    animate-spin
                    rounded-full
                    border-2
                    border-slate-200
                    border-t-blue-600
                  "
                />

                Cargando...

              </div>

            )}

          </div>


          <div
            className="
              overflow-x-auto
            "
          >

            <table
              className="
                min-w-full
                divide-y
                divide-slate-200
              "
            >

              <thead
                className="
                  bg-slate-50
                "
              >

                <tr>

                  <th
                    className="
                      px-5
                      py-4
                      text-left
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                    "
                  >
                    #
                  </th>

                  <th
                    className="
                      px-5
                      py-4
                      text-left
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                    "
                  >
                    Tipo concepto de gastos
                  </th>

                  <th
                    className="
                      px-5
                      py-4
                      text-center
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                    "
                  >
                    Estado
                  </th>

                  <th
                    className="
                      px-5
                      py-4
                      text-right
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                    "
                  >
                    Acciones
                  </th>

                </tr>

              </thead>


              <tbody
                className="
                  divide-y
                  divide-slate-100
                "
              >

                {!cargando &&
                tipos.length === 0 ? (

                  <tr>

                    <td
                      colSpan="4"
                      className="
                        px-5
                        py-16
                        text-center
                      "
                    >

                      <div
                        className="
                          mx-auto
                          flex
                          max-w-sm
                          flex-col
                          items-center
                        "
                      >

                        <div
                          className="
                            flex
                            h-14
                            w-14
                            items-center
                            justify-center
                            rounded-2xl
                            bg-slate-100
                            text-slate-400
                          "
                        >

                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-6 w-6"
                          >
                            <circle
                              cx="11"
                              cy="11"
                              r="7"
                            />

                            <path
                              strokeLinecap="round"
                              d="
                                m16.5 16.5
                                4 4
                              "
                            />
                          </svg>

                        </div>

                        <p
                          className="
                            mt-4
                            text-sm
                            font-semibold
                            text-slate-700
                          "
                        >
                          No se encontraron conceptos
                        </p>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-slate-400
                          "
                        >
                          Prueba con otro texto
                          de búsqueda o cambia
                          el filtro de estado.
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : (

                  tipos.map(
                    (tipo, index) => (

                      <tr
                        key={
                          tipo.id
                        }
                        className="
                          transition-all
                          duration-150
                          hover:bg-blue-50/40
                        "
                      >

                        {/* NÚMERO */}

                        <td
                          className="
                            whitespace-nowrap
                            px-5
                            py-4
                            text-sm
                            font-semibold
                            text-slate-400
                          "
                        >
                          {index + 1}
                        </td>


                        {/* NOMBRE */}

                        <td
                          className="
                            px-5
                            py-4
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
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-600
                              "
                            >

                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M6 4.5
                                    h12
                                    A1.5 1.5 0 0 1
                                    19.5 6
                                    v12
                                    A1.5 1.5 0 0 1
                                    18 19.5
                                    h-12
                                    A1.5 1.5 0 0 1
                                    4.5 18
                                    v-12
                                    A1.5 1.5 0 0 1
                                    6 4.5Z
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  d="
                                    M8 9
                                    h8
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  d="
                                    M8 12
                                    h8
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  d="
                                    M8 15
                                    h5
                                  "
                                />
                              </svg>

                            </div>

                            <div>

                              <p
                                className="
                                  text-sm
                                  font-semibold
                                  text-slate-700
                                "
                              >
                                {tipo.nombre}
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  text-xs
                                  text-slate-400
                                "
                              >
                                ID {tipo.id}
                              </p>

                            </div>

                          </div>

                        </td>


                        {/* ESTADO */}

                        <td
                          className="
                            px-5
                            py-4
                            text-center
                          "
                        >

                          <span
                            className={`
                              inline-flex
                              items-center
                              gap-2
                              rounded-full
                              px-3
                              py-1.5
                              text-xs
                              font-semibold
                              ${
                                tipo.activo
                                  ? `
                                    bg-emerald-50
                                    text-emerald-700
                                  `
                                  : `
                                    bg-slate-100
                                    text-slate-500
                                  `
                              }
                            `}
                          >

                            <span
                              className={`
                                h-2
                                w-2
                                rounded-full
                                ${
                                  tipo.activo
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }
                              `}
                            />

                            {tipo.activo
                              ? "Activo"
                              : "Inactivo"}

                          </span>

                        </td>


                        {/* ACCIONES */}

                        <td
                          className="
                            px-5
                            py-4
                          "
                        >

                          <div
                            className="
                              flex
                              justify-end
                              gap-2
                            "
                          >

                            {/* EDITAR */}

                            <button
                              type="button"
                              onClick={() =>
                                abrirEditar(
                                  tipo
                                )
                              }
                              title="Editar"
                              className="
                                inline-flex
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-200
                                bg-white
                                p-2
                                text-slate-500
                                transition-all
                                hover:border-blue-200
                                hover:bg-blue-50
                                hover:text-blue-600
                              "
                            >

                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M12 20
                                    h9
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M16.5 3.5
                                    a2.12 2.12 0 0 1
                                    3 3
                                    L8 18
                                    l-4 1
                                    1-4
                                    12.5-11.5Z
                                  "
                                />
                              </svg>

                            </button>


                            {/* ACTIVAR / DESACTIVAR */}

                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstado(
                                  tipo
                                )
                              }
                              title={
                                tipo.activo
                                  ? "Desactivar"
                                  : "Activar"
                              }
                              className={`
                                inline-flex
                                items-center
                                justify-center
                                rounded-lg
                                border
                                p-2
                                transition-all
                                ${
                                  tipo.activo
                                    ? `
                                      border-amber-200
                                      bg-amber-50
                                      text-amber-600
                                      hover:bg-amber-100
                                    `
                                    : `
                                      border-emerald-200
                                      bg-emerald-50
                                      text-emerald-600
                                      hover:bg-emerald-100
                                    `
                                }
                              `}
                            >

                              {tipo.activo ? (

                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  className="h-4 w-4"
                                >
                                  <rect
                                    x="5"
                                    y="5"
                                    width="14"
                                    height="14"
                                    rx="2"
                                  />

                                  <path
                                    strokeLinecap="round"
                                    d="
                                      M9 9
                                      v6
                                    "
                                  />

                                  <path
                                    strokeLinecap="round"
                                    d="
                                      M15 9
                                      v6
                                    "
                                  />
                                </svg>

                              ) : (

                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  className="h-4 w-4"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="7"
                                  />

                                  <path
                                    strokeLinecap="round"
                                    d="
                                      M12 8
                                      v8
                                    "
                                  />

                                  <path
                                    strokeLinecap="round"
                                    d="
                                      M8 12
                                      h8
                                    "
                                  />
                                </svg>

                              )}

                            </button>


                            {/* ELIMINAR */}

                            <button
                              type="button"
                              onClick={() =>
                                eliminarTipo(
                                  tipo
                                )
                              }
                              title="Eliminar"
                              className="
                                inline-flex
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-red-200
                                bg-red-50
                                p-2
                                text-red-600
                                transition-all
                                hover:bg-red-100
                              "
                            >

                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M4 7
                                    h16
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M10 11
                                    v6
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M14 11
                                    v6
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M6 7
                                    l1 13
                                    h10
                                    l1-13
                                  "
                                />

                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="
                                    M9 7
                                    V4
                                    h6
                                    v3
                                  "
                                />
                              </svg>

                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>


        {/* ==================================================
            INFORMACIÓN
        ================================================== */}

        <div
          className="
            mt-4
            text-center
            text-xs
            text-slate-400
          "
        >
          Los conceptos se almacenan siempre
          en minúsculas.
        </div>

      </div>


      {/* ====================================================
          MODAL
      ==================================================== */}

      {mostrarModal && (

        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-slate-900/40
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              cerrarModal();
            }

          }}
        >

          <div
            className="
              w-full
              max-w-lg
              overflow-hidden
              rounded-3xl
              border
              border-white/70
              bg-white
              shadow-2xl
            "
          >

            {/* CABECERA MODAL */}

            <div
              className="
                flex
                items-start
                justify-between
                border-b
                border-slate-100
                px-6
                py-5
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-blue-600
                  "
                >
                  Catálogo de gastos
                </p>

                <h2
                  className="
                    mt-1
                    text-xl
                    font-bold
                    text-slate-800
                  "
                >
                  {modoEdicion
                    ? "Editar concepto"
                    : "Nuevo concepto"}
                </h2>

              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="
                  rounded-xl
                  p-2
                  text-slate-400
                  transition-all
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    d="
                      M6 6
                      l12 12
                    "
                  />

                  <path
                    strokeLinecap="round"
                    d="
                      M18 6
                      L6 18
                    "
                  />
                </svg>

              </button>

            </div>


            {/* FORMULARIO */}

            <form
              onSubmit={guardarTipo}
              className="
                p-6
              "
            >

              {error && (

                <div
                  className="
                    mb-5
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-red-700
                  "
                >
                  {error}
                </div>

              )}


              {/* NOMBRE */}

              <div>

                <label
                  className="
                    mb-2
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Tipo concepto de gastos
                </label>

                <input
                  autoFocus
                  type="text"
                  value={nombre}
                  onChange={(event) =>
                    setNombre(
                      event.target.value
                    )
                  }
                  placeholder="Escribe el concepto..."
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-sm
                    text-slate-700
                    outline-none
                    transition-all
                    focus:border-blue-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />

                <p
                  className="
                    mt-2
                    text-xs
                    text-slate-400
                  "
                >
                  Se guardará automáticamente
                  en minúsculas.
                </p>

              </div>


              {/* ACTIVO */}

              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                "
              >

                <div>

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Concepto activo
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-slate-400
                    "
                  >
                    Permitido para su utilización
                    en los expedientes.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setActivo(
                      (actual) =>
                        !actual
                    )
                  }
                  className={`
                    relative
                    h-7
                    w-12
                    rounded-full
                    transition-all
                    ${
                      activo
                        ? "bg-blue-600"
                        : "bg-slate-300"
                    }
                  `}
                >

                  <span
                    className={`
                      absolute
                      top-1
                      h-5
                      w-5
                      rounded-full
                      bg-white
                      shadow-sm
                      transition-all
                      ${
                        activo
                          ? "left-6"
                          : "left-1"
                      }
                    `}
                  />

                </button>

              </div>


              {/* BOTONES */}

              <div
                className="
                  mt-7
                  flex
                  flex-col-reverse
                  gap-3
                  sm:flex-row
                  sm:justify-end
                "
              >

                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-slate-600
                    transition-all
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    guardando ||
                    !normalizarNombre(
                      nombre
                    )
                  }
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-blue-600
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-white
                    shadow-lg
                    shadow-blue-600/20
                    transition-all
                    hover:bg-blue-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  {guardando && (

                    <span
                      className="
                        h-4
                        w-4
                        animate-spin
                        rounded-full
                        border-2
                        border-white/30
                        border-t-white
                      "
                    />

                  )}

                  {modoEdicion
                    ? "Guardar cambios"
                    : "Crear concepto"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}
