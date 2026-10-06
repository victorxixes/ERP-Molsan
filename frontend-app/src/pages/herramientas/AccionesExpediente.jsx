import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";


// ============================================================
// ACCIONES DEL EXPEDIENTE
// MOLSAN ERP PREMIUM 2027
// ============================================================


// ============================================================
// API
// ============================================================

const API_ORIGEN =
  "https://agenda-intranet-b.onrender.com";

const API_BASE =
  `${API_ORIGEN}/api/acciones-expediente`;

const API_IMPORTAR_EXCEL =
  `${API_BASE}/importar-excel`;


// ============================================================
// CATÁLOGOS DESPLEGABLES
// ============================================================
//
// AQUÍ AÑADIRÁS POSTERIORMENTE LOS VALORES.
//
// Ejemplo:
//
// const DEPARTAMENTOS = [
//   "Administración",
//   "Gestoría",
//   "Registral",
// ];
//
// const SECCIONES = [
//   "Expedientes",
//   "Facturación",
//   "Registro",
// ];
//
// const ACTIVIDADES = [
//   "Firma",
//   "Inscripción",
//   "Cierre",
// ];
//
// Por ahora se dejan vacíos porque todavía
// no nos has dado el catálogo real.
// ============================================================

const DEPARTAMENTOS = [
  // AÑADIR AQUÍ LOS DEPARTAMENTOS
];


const SECCIONES = [
  // AÑADIR AQUÍ LAS SECCIONES
];


const ACTIVIDADES = [
  // AÑADIR AQUÍ LAS ACTIVIDADES
];


// ============================================================
// UTILIDADES
// ============================================================

async function leerRespuestaServidor(
  response
) {
  const texto =
    await response.text();

  let datos = null;

  try {
    datos = texto
      ? JSON.parse(texto)
      : null;
  } catch {
    datos = null;
  }

  if (!response.ok) {

    throw new Error(
      datos?.detail ||
      datos?.mensaje ||
      texto ||
      `Error HTTP ${response.status}`
    );
  }

  return datos;
}


// ============================================================
// ICONO
// ============================================================

function Icono({
  name,
  className = "w-5 h-5",
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
    >
      <use
        href={`/icons/icons.svg#${name}`}
      />
    </svg>
  );
}


// ============================================================
// BADGE
// ============================================================

function BadgeActivo({
  activo,
}) {

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-lg
        border
        px-2.5
        py-1
        text-xs
        font-semibold

        ${
          activo
            ? `
              border-green-200
              bg-green-50
              text-green-700
            `
            : `
              border-red-200
              bg-red-50
              text-red-700
            `
        }
      `}
    >

      <span
        className={`
          w-1.5
          h-1.5
          rounded-full

          ${
            activo
              ? "bg-green-500"
              : "bg-red-500"
          }
        `}
      />

      {activo
        ? "Activa"
        : "Inactiva"}

    </span>
  );
}


// ============================================================
// SELECT
// ============================================================

function CampoSelect({
  label,
  value,
  onChange,
  opciones,
}) {

  return (
    <label
      className="
        flex
        flex-col
        gap-1.5
      "
    >

      <span
        className="
          text-xs
          font-semibold
          text-[var(--erp-text)]
        "
      >
        {label}
      </span>


      <select
        value={
          value || ""
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="
          w-full
          rounded-xl
          border
          border-[var(--erp-border)]
          bg-white
          px-3
          py-2.5
          text-sm
          text-[var(--erp-text)]
          outline-none
          transition

          focus:border-[var(--erp-primary)]
          focus:ring-2
          focus:ring-[var(--erp-primary-soft)]
        "
      >

        <option value="">
          Seleccionar...
        </option>

        {opciones.map(
          (opcion) => (

            <option
              key={opcion}
              value={opcion}
            >
              {opcion}
            </option>

          )
        )}

      </select>

    </label>
  );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function AccionesExpediente() {

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    acciones,
    setAcciones,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroDepartamento,
    setFiltroDepartamento,
  ] = useState("");

  const [
    filtroSeccion,
    setFiltroSeccion,
  ] = useState("");

  const [
    filtroActividad,
    setFiltroActividad,
  ] = useState("");

  const [
    filtroActivo,
    setFiltroActivo,
  ] = useState("true");

  const [
    pagina,
    setPagina,
  ] = useState(1);

  const [
    mostrarModal,
    setMostrarModal,
  ] = useState(false);

  const [
    mostrarImportar,
    setMostrarImportar,
  ] = useState(false);

  const [
    modoEdicion,
    setModoEdicion,
  ] = useState(false);

  const [
    accionEditando,
    setAccionEditando,
  ] = useState(null);

  const [
    archivo,
    setArchivo,
  ] = useState(null);

  const [
    importando,
    setImportando,
  ] = useState(false);


  const [
    formulario,
    setFormulario,
  ] = useState({

    departamento:
      "",

    seccion:
      "",

    actividad:
      "",

    descripcion:
      "",

    activo:
      true,
  });


  const POR_PAGINA = 20;


  // ==========================================================
  // OPCIONES DESPLEGABLES
  // ==========================================================
  //
  // Unimos:
  //
  // 1. Las opciones que tú añadas manualmente.
  // 2. Los valores que ya existan en la base de datos.
  //
  // Esto hace que el módulo siga funcionando aunque
  // todavía no hayas rellenado los catálogos.
  // ==========================================================

  const opcionesDepartamento =
    useMemo(() => {

      return [
        ...new Set(
          [
            ...DEPARTAMENTOS,
            ...acciones.map(
              (item) =>
                item.departamento
            ),
          ]
            .filter(Boolean)
            .map(
              (item) =>
                item.trim()
            )
        ),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es",
            {
              sensitivity:
                "base",
            }
          )
      );

    }, [
      acciones,
    ]);


  const opcionesSeccion =
    useMemo(() => {

      return [
        ...new Set(
          [
            ...SECCIONES,
            ...acciones.map(
              (item) =>
                item.seccion
            ),
          ]
            .filter(Boolean)
            .map(
              (item) =>
                item.trim()
            )
        ),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es",
            {
              sensitivity:
                "base",
            }
          )
      );

    }, [
      acciones,
    ]);


  const opcionesActividad =
    useMemo(() => {

      return [
        ...new Set(
          [
            ...ACTIVIDADES,
            ...acciones.map(
              (item) =>
                item.actividad
            ),
          ]
            .filter(Boolean)
            .map(
              (item) =>
                item.trim()
            )
        ),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es",
            {
              sensitivity:
                "base",
            }
          )
      );

    }, [
      acciones,
    ]);


  // ==========================================================
  // CARGAR
  // ==========================================================

  const cargarAcciones =
    useCallback(
      async () => {

        setLoading(true);
        setError("");

        try {

          const params =
            new URLSearchParams();


          if (
            busqueda.trim()
          ) {

            params.set(
              "q",
              busqueda.trim()
            );

          }


          if (
            filtroDepartamento.trim()
          ) {

            params.set(
              "departamento",
              filtroDepartamento.trim()
            );

          }


          if (
            filtroSeccion.trim()
          ) {

            params.set(
              "seccion",
              filtroSeccion.trim()
            );

          }


          if (
            filtroActividad.trim()
          ) {

            params.set(
              "actividad",
              filtroActividad.trim()
            );

          }


          if (
            filtroActivo ===
            "true"
          ) {

            params.set(
              "activo",
              "true"
            );

          }


          if (
            filtroActivo ===
            "false"
          ) {

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
            await fetch(
              url,
              {
                headers: {
                  Accept:
                    "application/json",
                },
              }
            );


          const datos =
            await leerRespuestaServidor(
              response
            );


          setAcciones(
            Array.isArray(
              datos
            )
              ? datos
              : []
          );


          setPagina(1);

        } catch (err) {

          setError(
            err?.message ||
              "No se han podido cargar las acciones del expediente."
          );

        } finally {

          setLoading(false);

        }

      },
      [
        busqueda,
        filtroDepartamento,
        filtroSeccion,
        filtroActividad,
        filtroActivo,
      ]
    );


  useEffect(() => {

    cargarAcciones();

  }, [
    cargarAcciones,
  ]);


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        acciones.length /
          POR_PAGINA
      )
    );


  const accionesPagina =
    acciones.slice(
      (pagina - 1) *
        POR_PAGINA,
      pagina *
        POR_PAGINA
    );


  useEffect(() => {

    if (
      pagina >
      totalPaginas
    ) {

      setPagina(
        totalPaginas
      );

    }

  }, [
    pagina,
    totalPaginas,
  ]);


  // ==========================================================
  // ESTADÍSTICAS
  // ==========================================================

  const totalAcciones =
    acciones.length;

  const accionesActivas =
    acciones.filter(
      (item) =>
        item.activo !==
        false
    ).length;

  const accionesConActividad =
    acciones.filter(
      (item) =>
        Boolean(
          item.actividad
        )
    ).length;


  // ==========================================================
  // NUEVA ACCIÓN
  // ==========================================================

  function abrirNueva() {

    setModoEdicion(
      false
    );

    setAccionEditando(
      null
    );

    setFormulario({

      departamento:
        "",

      seccion:
        "",

      actividad:
        "",

      descripcion:
        "",

      activo:
        true,

    });

    setMostrarModal(
      true
    );

    setError("");
  }


  // ==========================================================
  // EDITAR
  // ==========================================================

  function abrirEditar(
    accion
  ) {

    setModoEdicion(
      true
    );

    setAccionEditando(
      accion
    );

    setFormulario({

      departamento:
        accion.departamento ||
        "",

      seccion:
        accion.seccion ||
        "",

      actividad:
        accion.actividad ||
        "",

      descripcion:
        accion.descripcion ||
        "",

      activo:
        accion.activo !==
        false,

    });

    setMostrarModal(
      true
    );

    setError("");
  }


  // ==========================================================
  // CERRAR
  // ==========================================================

  function cerrarModal() {

    if (loading) {
      return;
    }

    setMostrarModal(
      false
    );

    setModoEdicion(
      false
    );

    setAccionEditando(
      null
    );

  }


  // ==========================================================
  // CAMPO
  // ==========================================================

  function cambiarCampo(
    campo,
    valor
  ) {

    setFormulario(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    );

  }


  // ==========================================================
  // GUARDAR
  // ==========================================================

  async function guardarAccion(
    event
  ) {

    event.preventDefault();


    if (
      !formulario.descripcion.trim()
    ) {

      setError(
        "La descripción es obligatoria."
      );

      return;
    }


    setLoading(
      true
    );

    setError("");


    try {

      const url =
        modoEdicion
          ? `${API_BASE}/${accionEditando.id}`
          : API_BASE;


      const method =
        modoEdicion
          ? "PUT"
          : "POST";


      const payload = {

        departamento:
          formulario.departamento
            .trim() ||
          null,

        seccion:
          formulario.seccion
            .trim() ||
          null,

        actividad:
          formulario.actividad
            .trim() ||
          null,

        descripcion:
          formulario.descripcion
            .trim(),

        activo:
          formulario.activo,

      };


      const response =
        await fetch(
          url,
          {
            method,

            headers: {

              Accept:
                "application/json",

              "Content-Type":
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
        modoEdicion
          ? "Acción del expediente actualizada correctamente."
          : "Acción del expediente creada correctamente."
      );


      setMostrarModal(
        false
      );


      await cargarAcciones();

    } catch (err) {

      setError(
        err?.message ||
          "No se ha podido guardar la acción."
      );

    } finally {

      setLoading(
        false
      );

    }
  }


  // ==========================================================
  // ELIMINAR
  // ==========================================================

  async function eliminarAccion(
    accion
  ) {

    const confirmado =
      window.confirm(
        `¿Deseas eliminar la acción "${accion.descripcion}"?`
      );


    if (!confirmado) {
      return;
    }


    setLoading(
      true
    );

    setError("");


    try {

      const response =
        await fetch(
          `${API_BASE}/${accion.id}`,
          {
            method:
              "DELETE",

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
        "Acción del expediente eliminada correctamente."
      );


      await cargarAcciones();

    } catch (err) {

      setError(
        err?.message ||
          "No se ha podido eliminar la acción."
      );

    } finally {

      setLoading(
        false
      );

    }
  }


  // ==========================================================
  // IMPORTAR
  // ==========================================================

  function abrirImportar() {

    setArchivo(
      null
    );

    setMostrarImportar(
      true
    );

    setError("");
  }


  function cerrarImportar() {

    if (importando) {
      return;
    }

    setMostrarImportar(
      false
    );

    setArchivo(
      null
    );

  }


  async function importarExcel(
    event
  ) {

    event.preventDefault();


    if (!archivo) {

      setError(
        "Selecciona un fichero Excel."
      );

      return;
    }


    setImportando(
      true
    );

    setError("");


    try {

      const formData =
        new FormData();


      formData.append(
        "fichero",
        archivo
      );


      const response =
        await fetch(
          API_IMPORTAR_EXCEL,
          {

            method:
              "POST",

            headers: {
              Accept:
                "application/json",
            },

            body:
              formData,

          }
        );


      const resultado =
        await leerRespuestaServidor(
          response
        );


      setMostrarImportar(
        false
      );


      setArchivo(
        null
      );


      setMensaje(
        `${resultado.mensaje} ` +
        `Excel: ${
          resultado.total_excel ??
          0
        } · ` +
        `Procesados: ${
          resultado.procesados ??
          0
        } · ` +
        `Creados: ${
          resultado.creados ??
          0
        } · ` +
        `Actualizados: ${
          resultado.actualizados ??
          0
        } · ` +
        `Sin cambios: ${
          resultado.sin_cambios ??
          0
        } · ` +
        `Omitidos: ${
          resultado.omitidos ??
          0
        } · ` +
        `Errores: ${
          resultado.errores ??
          0
        }`
      );


      await cargarAcciones();

    } catch (err) {

      setError(
        err?.message ||
          "No se ha podido importar el Excel."
      );

    } finally {

      setImportando(
        false
      );

    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

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

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div
        className="
          max-w-[1700px]
          mx-auto
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-5
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
              w-12
              h-12
              rounded-2xl
              bg-[var(--erp-primary-soft)]
              text-[var(--erp-primary)]
              border
              border-[var(--erp-border)]
              flex
              items-center
              justify-center
              shrink-0
            "
          >

            <Icono
              name="clipboard"
              className="
                w-6
                h-6
              "
            />

          </div>


          <div>

            <h1
              className="
                text-2xl
                sm:text-3xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              Acciones del expediente
            </h1>

            <p
              className="
                text-sm
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              Catálogo de acciones y actividades
              disponibles para los expedientes
            </p>

          </div>

        </div>


        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >

          <button
            type="button"
            onClick={
              abrirImportar
            }
            className="
              inline-flex
              items-center
              gap-2
              px-4
              py-2.5
              rounded-xl
              bg-white
              border
              border-[var(--erp-border)]
              text-[var(--erp-text)]
              text-sm
              font-semibold
              shadow-sm
              hover:bg-[var(--erp-primary-soft)]
              hover:text-[var(--erp-primary)]
              hover:border-[var(--erp-primary)]
              transition-all
              duration-200
            "
          >

            <Icono
              name="database"
              className="
                w-4
                h-4
              "
            />

            Importar Excel

          </button>


          <button
            type="button"
            onClick={
              abrirNueva
            }
            className="
              inline-flex
              items-center
              gap-2
              px-4
              py-2.5
              rounded-xl
              bg-[var(--erp-primary)]
              hover:brightness-95
              text-white
              text-sm
              font-semibold
              shadow-sm
              transition
            "
          >

            <span
              className="
                text-lg
                leading-none
              "
            >
              +
            </span>

            Nueva acción

          </button>

        </div>

      </div>


      {/* =====================================================
          MENSAJES
      ===================================================== */}

      {mensaje && (

        <div
          className="
            max-w-[1700px]
            mx-auto
            rounded-xl
            border
            border-green-200
            bg-green-50
            px-4
            py-3
            text-sm
            text-green-700
          "
        >
          {mensaje}
        </div>

      )}


      {error && (

        <div
          className="
            max-w-[1700px]
            mx-auto
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-700
          "
        >
          {error}
        </div>

      )}


      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <section
        className="
          max-w-[1700px]
          mx-auto
          grid
          grid-cols-1
          sm:grid-cols-3
          gap-4
        "
      >

        <div
          className="
            erp-card
            p-5
          "
        >

          <p
            className="
              text-xs
              font-medium
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
            "
          >
            Total acciones
          </p>

          <p
            className="
              text-3xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {totalAcciones}
          </p>

        </div>


        <div
          className="
            erp-card
            p-5
          "
        >

          <p
            className="
              text-xs
              font-medium
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
            "
          >
            Acciones activas
          </p>

          <p
            className="
              text-3xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {accionesActivas}
          </p>

        </div>


        <div
          className="
            erp-card
            p-5
          "
        >

          <p
            className="
              text-xs
              font-medium
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
            "
          >
            Con actividad asignada
          </p>

          <p
            className="
              text-3xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {accionesConActividad}
          </p>

        </div>

      </section>


      {/* =====================================================
          FILTROS
      ===================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          p-4
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            mb-4
          "
        >

          <div>

            <h2
              className="
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Buscar y filtrar
            </h2>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              Filtra el catálogo de acciones
            </p>

          </div>


          <button
            type="button"
            onClick={() => {

              setBusqueda("");
              setFiltroDepartamento("");
              setFiltroSeccion("");
              setFiltroActividad("");
              setFiltroActivo("true");
              setPagina(1);

            }}
            className="
              text-xs
              font-semibold
              text-[var(--erp-primary)]
              hover:underline
            "
          >
            Limpiar filtros
          </button>

        </div>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-5
            gap-3
          "
        >

          <input
            value={
              busqueda
            }
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            placeholder="
              Buscar descripción...
            "
            className="
              w-full
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-white
              px-3
              py-2.5
              text-sm
              outline-none

              focus:border-[var(--erp-primary)]
              focus:ring-2
              focus:ring-[var(--erp-primary-soft)]
            "
          />


          <select
            value={
              filtroDepartamento
            }
            onChange={(event) =>
              setFiltroDepartamento(
                event.target.value
              )
            }
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-white
              px-3
              py-2.5
              text-sm
              outline-none
            "
          >

            <option value="">
              Todos los departamentos
            </option>

            {opcionesDepartamento.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}

          </select>


          <select
            value={
              filtroSeccion
            }
            onChange={(event) =>
              setFiltroSeccion(
                event.target.value
              )
            }
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-white
              px-3
              py-2.5
              text-sm
              outline-none
            "
          >

            <option value="">
              Todas las secciones
            </option>

            {opcionesSeccion.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}

          </select>


          <select
            value={
              filtroActividad
            }
            onChange={(event) =>
              setFiltroActividad(
                event.target.value
              )
            }
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-white
              px-3
              py-2.5
              text-sm
              outline-none
            "
          >

            <option value="">
              Todas las actividades
            </option>

            {opcionesActividad.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}

          </select>


          <select
            value={
              filtroActivo
            }
            onChange={(event) =>
              setFiltroActivo(
                event.target.value
              )
            }
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-white
              px-3
              py-2.5
              text-sm
              outline-none
            "
          >

            <option value="true">
              Activas
            </option>

            <option value="false">
              Inactivas
            </option>

            <option value="">
              Todas
            </option>

          </select>

        </div>

      </section>


      {/* =====================================================
          TABLA
      ===================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >

        <div
          className="
            px-5
            py-4
            border-b
            border-[var(--erp-border)]
            flex
            items-center
            justify-between
            gap-4
          "
        >

          <div>

            <h2
              className="
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Acciones disponibles
            </h2>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              {totalAcciones}
              {" "}
              registros
            </p>

          </div>

        </div>


        <div className="overflow-x-auto">

          <table
            className="
              w-full
              min-w-[1100px]
              text-sm
              text-[var(--erp-text)]
            "
          >

            <thead>

              <tr
                className="
                  bg-[var(--erp-primary)]
                  text-white
                  text-left
                "
              >

                <th className="px-4 py-3 font-semibold">
                  Departamento
                </th>

                <th className="px-4 py-3 font-semibold">
                  Sección
                </th>

                <th className="px-4 py-3 font-semibold">
                  Actividad
                </th>

                <th className="px-4 py-3 font-semibold">
                  Descripción
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    text-center
                  "
                >
                  Estado
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    text-center
                  "
                >
                  Acciones
                </th>

              </tr>

            </thead>


            <tbody>

              {loading &&
              accionesPagina.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="6"
                    className="
                      px-4
                      py-14
                      text-center
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Cargando acciones…
                  </td>

                </tr>

              ) : accionesPagina.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="6"
                    className="
                      px-4
                      py-14
                      text-center
                      text-[var(--erp-text-soft)]
                    "
                  >
                    No hay acciones del expediente.
                  </td>

                </tr>

              ) : (

                accionesPagina.map(
                  (accion) => (

                    <tr
                      key={
                        accion.id
                      }
                      className="
                        border-b
                        border-[var(--erp-border)]
                        hover:bg-[var(--erp-primary-soft)]
                        transition-colors
                      "
                    >

                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        {
                          accion.departamento ||
                          "—"
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >
                        {
                          accion.seccion ||
                          "—"
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          font-medium
                        "
                      >
                        {
                          accion.actividad ||
                          "—"
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          max-w-[520px]
                        "
                      >
                        {
                          accion.descripcion
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          text-center
                        "
                      >
                        <BadgeActivo
                          activo={
                            accion.activo !==
                            false
                          }
                        />
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                        "
                      >

                        <div
                          className="
                            flex
                            items-center
                            justify-center
                            gap-2
                          "
                        >

                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                accion
                              )
                            }
                            className="
                              w-9
                              h-9
                              rounded-xl
                              bg-white
                              border
                              border-[var(--erp-border)]
                              text-[var(--erp-primary)]
                              hover:bg-[var(--erp-primary-soft)]
                              hover:border-[var(--erp-primary)]
                              transition
                            "
                            title="Editar"
                          >
                            ✎
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              eliminarAccion(
                                accion
                              )
                            }
                            className="
                              w-9
                              h-9
                              rounded-xl
                              bg-white
                              border
                              border-red-200
                              text-red-600
                              hover:bg-red-50
                              transition
                            "
                            title="Eliminar"
                          >
                            ×
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


        {/* ===================================================
            PAGINACIÓN
        =================================================== */}

        <div
          className="
            px-5
            py-4
            border-t
            border-[var(--erp-border)]
            flex
            flex-col
            sm:flex-row
            items-center
            justify-between
            gap-4
          "
        >

          <div
            className="
              text-sm
              text-[var(--erp-text-soft)]
            "
          >
            Mostrando{" "}

            <strong
              className="
                text-[var(--erp-text)]
              "
            >
              {
                accionesPagina.length
              }
            </strong>

            {" "}de{" "}

            <strong
              className="
                text-[var(--erp-text)]
              "
            >
              {totalAcciones}
            </strong>

            {" "}registros
          </div>


          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <button
              type="button"
              disabled={
                pagina <=
                  1 ||
                loading
              }
              onClick={() =>
                setPagina(
                  (actual) =>
                    Math.max(
                      1,
                      actual - 1
                    )
                )
              }
              className="
                px-4
                py-2
                rounded-xl
                bg-white
                border
                border-[var(--erp-border)]
                text-sm
                hover:bg-[var(--erp-surface-soft)]
                transition
                disabled:opacity-40
              "
            >
              Anterior
            </button>


            <span
              className="
                px-2
                text-sm
                text-[var(--erp-text-soft)]
              "
            >
              Página{" "}

              <strong
                className="
                  text-[var(--erp-text)]
                "
              >
                {pagina}
              </strong>

              {" "}de{" "}

              <strong
                className="
                  text-[var(--erp-text)]
                "
              >
                {totalPaginas}
              </strong>

            </span>


            <button
              type="button"
              disabled={
                pagina >=
                  totalPaginas ||
                loading
              }
              onClick={() =>
                setPagina(
                  (actual) =>
                    Math.min(
                      totalPaginas,
                      actual + 1
                    )
                )
              }
              className="
                px-4
                py-2
                rounded-xl
                bg-white
                border
                border-[var(--erp-border)]
                text-sm
                hover:bg-[var(--erp-surface-soft)]
                transition
                disabled:opacity-40
              "
            >
              Siguiente
            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          MODAL CREAR / EDITAR
      ===================================================== */}

      {mostrarModal && (

        <div
          className="
            fixed
            inset-0
            z-[200]
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
            backdrop-blur-sm
          "
        >

          <div
            className="
              w-full
              max-w-3xl
              rounded-2xl
              bg-[var(--erp-surface)]
              border
              border-[var(--erp-border)]
              shadow-2xl
            "
          >

            <div
              className="
                px-5
                py-4
                border-b
                border-[var(--erp-border)]
                flex
                items-center
                justify-between
              "
            >

              <div>

                <h2
                  className="
                    text-lg
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  {modoEdicion
                    ? "Editar acción del expediente"
                    : "Nueva acción del expediente"}
                </h2>

                <p
                  className="
                    text-xs
                    text-[var(--erp-text-soft)]
                    mt-1
                  "
                >
                  Selecciona los valores del catálogo
                </p>

              </div>


              <button
                type="button"
                onClick={
                  cerrarModal
                }
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-[var(--erp-surface-soft)]
                  border
                  border-[var(--erp-border)]
                  text-[var(--erp-text-soft)]
                "
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                guardarAccion
              }
            >

              <div
                className="
                  p-5
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-4
                "
              >

                <CampoSelect
                  label="Departamento"
                  value={
                    formulario.departamento
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "departamento",
                      valor
                    )
                  }
                  opciones={
                    opcionesDepartamento
                  }
                />


                <CampoSelect
                  label="Sección"
                  value={
                    formulario.seccion
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "seccion",
                      valor
                    )
                  }
                  opciones={
                    opcionesSeccion
                  }
                />


                <CampoSelect
                  label="Actividad"
                  value={
                    formulario.actividad
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "actividad",
                      valor
                    )
                  }
                  opciones={
                    opcionesActividad
                  }
                />


                <label
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    border
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface-soft)]
                    px-4
                    py-3
                    cursor-pointer
                  "
                >

                  <input
                    type="checkbox"
                    checked={
                      formulario.activo
                    }
                    onChange={(event) =>
                      cambiarCampo(
                        "activo",
                        event.target.checked
                      )
                    }
                  />

                  <div>

                    <div
                      className="
                        text-sm
                        font-semibold
                      "
                    >
                      Acción activa
                    </div>

                    <div
                      className="
                        text-xs
                        text-[var(--erp-text-soft)]
                      "
                    >
                      Disponible en el catálogo
                    </div>

                  </div>

                </label>


                <label
                  className="
                    md:col-span-2
                    flex
                    flex-col
                    gap-1.5
                  "
                >

                  <span
                    className="
                      text-xs
                      font-semibold
                    "
                  >
                    Descripción *
                  </span>

                  <textarea
                    value={
                      formulario.descripcion
                    }
                    onChange={(event) =>
                      cambiarCampo(
                        "descripcion",
                        event.target.value
                      )
                    }
                    rows="4"
                    placeholder="
                      Ej. ABSIS GTG - ACTUALIZADO
                    "
                    className="
                      w-full
                      rounded-xl
                      border
                      border-[var(--erp-border)]
                      bg-white
                      px-3
                      py-2.5
                      text-sm
                      outline-none
                      resize-y

                      focus:border-[var(--erp-primary)]
                      focus:ring-2
                      focus:ring-[var(--erp-primary-soft)]
                    "
                  />

                </label>

              </div>


              <div
                className="
                  px-5
                  py-4
                  border-t
                  border-[var(--erp-border)]
                  flex
                  justify-end
                  gap-2
                "
              >

                <button
                  type="button"
                  onClick={
                    cerrarModal
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-xl
                    bg-white
                    border
                    border-[var(--erp-border)]
                    text-sm
                    font-semibold
                  "
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-xl
                    bg-[var(--erp-primary)]
                    text-white
                    text-sm
                    font-semibold
                    disabled:opacity-50
                  "
                >
                  {loading
                    ? "Guardando..."
                    : "Guardar"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          MODAL IMPORTAR EXCEL
      ===================================================== */}

      {mostrarImportar && (

        <div
          className="
            fixed
            inset-0
            z-[210]
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
            backdrop-blur-sm
          "
        >

          <div
            className="
              w-full
              max-w-xl
              rounded-2xl
              bg-[var(--erp-surface)]
              border
              border-[var(--erp-border)]
              shadow-2xl
            "
          >

            <div
              className="
                px-5
                py-4
                border-b
                border-[var(--erp-border)]
                flex
                items-center
                justify-between
              "
            >

              <div>

                <h2
                  className="
                    text-lg
                    font-semibold
                  "
                >
                  Importar Acciones del expediente
                </h2>

                <p
                  className="
                    text-xs
                    text-[var(--erp-text-soft)]
                    mt-1
                  "
                >
                  Carga el catálogo desde Excel
                </p>

              </div>


              <button
                type="button"
                onClick={
                  cerrarImportar
                }
                disabled={
                  importando
                }
                className="
                  w-9
                  h-9
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                "
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                importarExcel
              }
            >

              <div
                className="
                  p-5
                  space-y-4
                "
              >

                <div
                  className="
                    rounded-2xl
                    border-2
                    border-dashed
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface-soft)]
                    p-7
                    text-center
                  "
                >

                  <div
                    className="
                      mx-auto
                      w-12
                      h-12
                      rounded-2xl
                      bg-[var(--erp-primary)]
                      text-white
                      flex
                      items-center
                      justify-center
                      mb-4
                    "
                  >
                    <Icono
                      name="database"
                      className="w-6 h-6"
                    />
                  </div>


                  <p
                    className="
                      text-sm
                      font-semibold
                    "
                  >
                    Selecciona el fichero Excel
                  </p>


                  <p
                    className="
                      text-xs
                      text-[var(--erp-text-soft)]
                      mt-1
                    "
                  >
                    .xlsx, .xls o .xlsm
                  </p>


                  <label
                    className="
                      mt-4
                      inline-flex
                      cursor-pointer
                      items-center
                      justify-center
                      px-4
                      py-2.5
                      rounded-xl
                      bg-white
                      border
                      border-[var(--erp-border)]
                      text-sm
                      font-semibold
                      hover:bg-[var(--erp-primary-soft)]
                    "
                  >
                    Elegir archivo

                    <input
                      type="file"
                      accept="
                        .xlsx,
                        .xls,
                        .xlsm
                      "
                      className="hidden"
                      disabled={
                        importando
                      }
                      onChange={(
                        event
                      ) =>
                        setArchivo(
                          event.target
                            .files?.[0] ||
                            null
                        )
                      }
                    />

                  </label>


                  {archivo && (

                    <div
                      className="
                        mt-4
                        rounded-xl
                        border
                        border-[var(--erp-border)]
                        bg-white
                        px-4
                        py-3
                        text-left
                      "
                    >

                      <div
                        className="
                          text-sm
                          font-semibold
                        "
                      >
                        {archivo.name}
                      </div>

                      <div
                        className="
                          text-xs
                          text-[var(--erp-text-soft)]
                          mt-0.5
                        "
                      >
                        Archivo seleccionado
                      </div>

                    </div>

                  )}

                </div>


                <div
                  className="
                    rounded-xl
                    border
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface-soft)]
                    px-4
                    py-3
                    text-xs
                    text-[var(--erp-text-soft)]
                  "
                >
                  Columnas esperadas:
                  <strong
                    className="
                      text-[var(--erp-text)]
                    "
                  >
                    {" "}
                    Departamento, Sección,
                    Actividad y Descripción.
                  </strong>
                </div>

              </div>


              <div
                className="
                  px-5
                  py-4
                  border-t
                  border-[var(--erp-border)]
                  flex
                  justify-end
                  gap-2
                "
              >

                <button
                  type="button"
                  onClick={
                    cerrarImportar
                  }
                  disabled={
                    importando
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-xl
                    bg-white
                    border
                    border-[var(--erp-border)]
                    text-sm
                    font-semibold
                  "
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    !archivo ||
                    importando
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-xl
                    bg-[var(--erp-primary)]
                    text-white
                    text-sm
                    font-semibold
                    disabled:opacity-50
                  "
                >
                  {importando
                    ? "Importando..."
                    : "Importar Excel"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}
