import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";


// ============================================================
// OFICINAS LIQUIDADORAS — MOLSAN ERP PREMIUM 2027
// ============================================================
//
// - Catálogo completo
// - Buscador
// - Filtros
// - Paginación
// - Alta
// - Edición
// - Eliminación
// - Importación Excel
// - Diseño integrado con ERP
// - Sin estilos inline
// ============================================================


// ============================================================
// CONFIGURACIÓN API
// ============================================================

const API_ORIGEN =
  "https://agenda-intranet-b.onrender.com";

const API_BASE =
  `${API_ORIGEN}/api/oficinas-liquidadoras`;

const API_IMPORTAR_EXCEL =
  `${API_BASE}/importar-excel`;


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
    const detalle =
      datos?.detail ||
      datos?.mensaje ||
      texto ||
      `Error HTTP ${response.status}`;

    throw new Error(
      detalle
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
// CAMPO DE FORMULARIO
// ============================================================

function Campo({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  full = false,
}) {
  return (
    <label
      className={`
        flex
        flex-col
        gap-1.5

        ${full ? "md:col-span-2" : ""}
      `}
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

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
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
      />
    </label>
  );
}


// ============================================================
// BADGE ACTIVO
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
          h-1.5
          w-1.5
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
// COMPONENTE
// ============================================================

export default function OficinasLiquidadoras() {

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    oficinas,
    setOficinas,
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
    filtroProvincia,
    setFiltroProvincia,
  ] = useState("");

  const [
    filtroPoblacion,
    setFiltroPoblacion,
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
    oficinaEditando,
    setOficinaEditando,
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
    oficina_liquidadora: "",
    direccion: "",
    codigo_postal: "",
    poblacion: "",
    provincia: "",
    telefono: "",
    email: "",
    horario: "",
    activo: true,
  });


  const POR_PAGINA = 20;


  // ==========================================================
  // CARGAR OFICINAS
  // ==========================================================

  const cargarOficinas =
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
            filtroProvincia.trim()
          ) {
            params.set(
              "provincia",
              filtroProvincia.trim()
            );
          }

          if (
            filtroPoblacion.trim()
          ) {
            params.set(
              "poblacion",
              filtroPoblacion.trim()
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


          setOficinas(
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
              "No se han podido cargar las Oficinas Liquidadoras."
          );

        } finally {

          setLoading(false);

        }

      },
      [
        busqueda,
        filtroProvincia,
        filtroPoblacion,
        filtroActivo,
      ]
    );


  useEffect(() => {

    cargarOficinas();

  }, [
    cargarOficinas,
  ]);


  // ==========================================================
  // LIMPIAR MENSAJES
  // ==========================================================

  useEffect(() => {

    if (
      !mensaje &&
      !error
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setMensaje("");
          setError("");
        },
        7000
      );

    return () =>
      window.clearTimeout(
        timer
      );

  }, [
    mensaje,
    error,
  ]);


  // ==========================================================
  // OPCIONES DE PROVINCIAS
  // ==========================================================

  const provincias =
    useMemo(() => {

      return [
        ...new Set(
          oficinas
            .map(
              (item) =>
                item.provincia
                  ?.trim()
            )
            .filter(Boolean)
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
      oficinas,
    ]);


  // ==========================================================
  // OPCIONES DE POBLACIÓN
  // ==========================================================

  const poblaciones =
    useMemo(() => {

      return [
        ...new Set(
          oficinas
            .map(
              (item) =>
                item.poblacion
                  ?.trim()
            )
            .filter(Boolean)
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
      oficinas,
    ]);


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        oficinas.length /
          POR_PAGINA
      )
    );


  const oficinasPagina =
    oficinas.slice(
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

  const totalOficinas =
    oficinas.length;

  const oficinasActivas =
    oficinas.filter(
      (item) =>
        item.activo !==
        false
    ).length;

  const oficinasConContacto =
    oficinas.filter(
      (item) =>
        item.telefono ||
        item.email
    ).length;


  // ==========================================================
  // NUEVA OFICINA
  // ==========================================================

  function abrirNueva() {

    setModoEdicion(false);

    setOficinaEditando(
      null
    );

    setFormulario({
      oficina_liquidadora:
        "",
      direccion: "",
      codigo_postal:
        "",
      poblacion: "",
      provincia: "",
      telefono: "",
      email: "",
      horario: "",
      activo: true,
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
    oficina
  ) {

    setModoEdicion(true);

    setOficinaEditando(
      oficina
    );

    setFormulario({
      oficina_liquidadora:
        oficina.oficina_liquidadora ||
        "",

      direccion:
        oficina.direccion ||
        "",

      codigo_postal:
        oficina.codigo_postal ||
        "",

      poblacion:
        oficina.poblacion ||
        "",

      provincia:
        oficina.provincia ||
        "",

      telefono:
        oficina.telefono ||
        "",

      email:
        oficina.email ||
        "",

      horario:
        oficina.horario ||
        "",

      activo:
        oficina.activo !==
        false,
    });

    setMostrarModal(
      true
    );

    setError("");
  }


  // ==========================================================
  // CERRAR MODAL
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

    setOficinaEditando(
      null
    );

  }


  // ==========================================================
  // CAMBIAR CAMPO
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

  async function guardarOficina(
    event
  ) {

    event.preventDefault();

    const nombre =
      formulario.oficina_liquidadora.trim();

    if (!nombre) {

      setError(
        "La Oficina Liquidadora es obligatoria."
      );

      return;
    }


    setLoading(true);
    setError("");


    try {

      const url =
        modoEdicion
          ? `${API_BASE}/${oficinaEditando.id}`
          : API_BASE;

      const method =
        modoEdicion
          ? "PUT"
          : "POST";


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
                {
                  ...formulario,
                  oficina_liquidadora:
                    nombre,
                }
              ),
          }
        );


      await leerRespuestaServidor(
        response
      );


      setMensaje(
        modoEdicion
          ? "Oficina Liquidadora actualizada correctamente."
          : "Oficina Liquidadora creada correctamente."
      );


      setMostrarModal(
        false
      );


      setModoEdicion(
        false
      );


      setOficinaEditando(
        null
      );


      await cargarOficinas();

    } catch (err) {

      setError(
        err?.message ||
          "No se ha podido guardar la Oficina Liquidadora."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==========================================================
  // ELIMINAR
  // ==========================================================

  async function eliminarOficina(
    oficina
  ) {

    const confirmado =
      window.confirm(
        `¿Deseas eliminar la Oficina Liquidadora "${oficina.oficina_liquidadora}"?`
      );


    if (!confirmado) {
      return;
    }


    setLoading(true);
    setError("");


    try {

      const response =
        await fetch(
          `${API_BASE}/${oficina.id}`,
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
        "Oficina Liquidadora eliminada correctamente."
      );


      await cargarOficinas();

    } catch (err) {

      setError(
        err?.message ||
          "No se ha podido eliminar la Oficina Liquidadora."
      );

    } finally {

      setLoading(false);

    }
  }


  // ==========================================================
  // IMPORTAR EXCEL
  // ==========================================================

  function abrirImportacion() {

    setArchivo(null);

    setMostrarImportar(
      true
    );

    setError("");
  }


  function cerrarImportacion() {

    if (importando) {
      return;
    }

    setMostrarImportar(
      false
    );

    setArchivo(null);
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


    setImportando(true);
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


      await cargarOficinas();

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
              name="database"
              className="w-6 h-6"
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
              Oficinas Liquidadoras
            </h1>

            <p
              className="
                text-sm
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              Gestión y consulta del catálogo
              de Oficinas Liquidadoras
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
              abrirImportacion
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
              className="w-4 h-4"
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

            Nueva oficina
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
          sm:grid-cols-2
          lg:grid-cols-3
          gap-4
        "
      >

        <div
          className="
            erp-card
            p-5
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-xs
                  font-medium
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Total oficinas
              </p>

              <p
                className="
                  text-3xl
                  font-bold
                  text-[var(--erp-text)]
                  mt-1
                "
              >
                {totalOficinas}
              </p>

            </div>


            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                flex
                items-center
                justify-center
              "
            >
              <Icono
                name="database"
                className="w-5 h-5"
              />
            </div>

          </div>

        </div>


        <div
          className="
            erp-card
            p-5
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-xs
                  font-medium
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Oficinas activas
              </p>

              <p
                className="
                  text-3xl
                  font-bold
                  text-[var(--erp-text)]
                  mt-1
                "
              >
                {oficinasActivas}
              </p>

            </div>


            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-green-50
                text-green-600
                flex
                items-center
                justify-center
              "
            >
              <span
                className="
                  w-2.5
                  h-2.5
                  rounded-full
                  bg-green-500
                "
              />
            </div>

          </div>

        </div>


        <div
          className="
            erp-card
            p-5
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >

            <div>

              <p
                className="
                  text-xs
                  font-medium
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Con datos de contacto
              </p>

              <p
                className="
                  text-3xl
                  font-bold
                  text-[var(--erp-text)]
                  mt-1
                "
              >
                {oficinasConContacto}
              </p>

            </div>


            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                flex
                items-center
                justify-center
              "
            >
              <span
                className="
                  text-lg
                  font-bold
                "
              >
                @
              </span>
            </div>

          </div>

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
          shadow-sm
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
              Localiza rápidamente una Oficina
              Liquidadora
            </p>

          </div>


          <button
            type="button"
            onClick={() => {

              setBusqueda("");
              setFiltroProvincia("");
              setFiltroPoblacion("");
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
            xl:grid-cols-4
            gap-3
          "
        >

          <label
            className="
              md:col-span-2
              xl:col-span-1
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
              Buscar
            </span>

            <input
              value={busqueda}
              onChange={(event) =>
                setBusqueda(
                  event.target.value
                )
              }
              placeholder="
                Oficina, dirección, población,
                teléfono, email...
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
                text-[var(--erp-text)]
                outline-none
                transition

                focus:border-[var(--erp-primary)]
                focus:ring-2
                focus:ring-[var(--erp-primary-soft)]
              "
            />

          </label>


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
              Provincia
            </span>

            <select
              value={
                filtroProvincia
              }
              onChange={(event) =>
                setFiltroProvincia(
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
                Todas las provincias
              </option>

              {provincias.map(
                (provincia) => (

                  <option
                    key={
                      provincia
                    }
                    value={
                      provincia
                    }
                  >
                    {provincia}
                  </option>

                )
              )}

            </select>

          </label>


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
              Población
            </span>

            <select
              value={
                filtroPoblacion
              }
              onChange={(event) =>
                setFiltroPoblacion(
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
                Todas las poblaciones
              </option>

              {poblaciones.map(
                (poblacion) => (

                  <option
                    key={
                      poblacion
                    }
                    value={
                      poblacion
                    }
                  >
                    {poblacion}
                  </option>

                )
              )}

            </select>

          </label>


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
              Estado
            </span>

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

          </label>

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
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Oficinas Liquidadoras
            </h2>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              {totalOficinas} registros
            </p>

          </div>


          <div
            className="
              inline-flex
              items-center
              gap-2
              px-3
              py-1.5
              rounded-xl
              bg-[var(--erp-primary-soft)]
              border
              border-[var(--erp-border)]
              text-xs
              font-semibold
              text-[var(--erp-primary)]
              w-fit
            "
          >

            <span
              className="
                w-2
                h-2
                rounded-full
                bg-[var(--erp-primary)]
              "
            />

            Catálogo activo

          </div>

        </div>


        <div className="overflow-x-auto">

          <table
            className="
              w-full
              min-w-[1250px]
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

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Oficina Liquidadora
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Dirección
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    text-center
                    whitespace-nowrap
                  "
                >
                  Código Postal
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Población
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Provincia
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Teléfono
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Email
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    whitespace-nowrap
                  "
                >
                  Horario
                </th>

                <th
                  className="
                    px-4
                    py-3
                    font-semibold
                    text-center
                    whitespace-nowrap
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
                    whitespace-nowrap
                  "
                >
                  Acciones
                </th>

              </tr>

            </thead>


            <tbody>

              {loading &&
              oficinasPagina.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="10"
                    className="
                      px-4
                      py-14
                      text-center
                      text-[var(--erp-text-soft)]
                    "
                  >

                    <div
                      className="
                        inline-flex
                        items-center
                        gap-2
                      "
                    >

                      <span
                        className="
                          w-2
                          h-2
                          rounded-full
                          bg-[var(--erp-primary)]
                          animate-pulse
                        "
                      />

                      Cargando oficinas…

                    </div>

                  </td>

                </tr>

              ) : oficinasPagina.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="10"
                    className="
                      px-4
                      py-14
                      text-center
                      text-[var(--erp-text-soft)]
                    "
                  >

                    No hay Oficinas Liquidadoras
                    que coincidan con los filtros.

                  </td>

                </tr>

              ) : (

                oficinasPagina.map(
                  (oficina) => (

                    <tr
                      key={
                        oficina.id
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
                          font-semibold
                        "
                      >
                        {
                          oficina.oficina_liquidadora
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          text-[var(--erp-text-soft)]
                        "
                      >
                        {
                          oficina.direccion ||
                          "—"
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          text-center
                          tabular-nums
                        "
                      >
                        {
                          oficina.codigo_postal ||
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
                          oficina.poblacion ||
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
                          oficina.provincia ||
                          "—"
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          whitespace-nowrap
                        "
                      >
                        {
                          oficina.telefono ||
                          "—"
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          text-[var(--erp-text-soft)]
                        "
                      >
                        {
                          oficina.email ||
                          "—"
                        }
                      </td>


                      <td
                        className="
                          px-4
                          py-3.5
                          max-w-[220px]
                        "
                      >
                        <span
                          className="
                            line-clamp-2
                          "
                        >
                          {
                            oficina.horario ||
                            "—"
                          }
                        </span>
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
                            oficina.activo !==
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
                                oficina
                              )
                            }
                            title="Editar"
                            className="
                              w-9
                              h-9
                              rounded-xl
                              bg-white
                              border
                              border-[var(--erp-border)]
                              text-[var(--erp-primary)]
                              flex
                              items-center
                              justify-center
                              hover:bg-[var(--erp-primary-soft)]
                              hover:border-[var(--erp-primary)]
                              transition
                            "
                          >
                            ✎
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              eliminarOficina(
                                oficina
                              )
                            }
                            title="Eliminar"
                            className="
                              w-9
                              h-9
                              rounded-xl
                              bg-white
                              border
                              border-red-200
                              text-red-600
                              flex
                              items-center
                              justify-center
                              hover:bg-red-50
                              transition
                            "
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
              {oficinasPagina.length}
            </strong>{" "}
            de{" "}
            <strong
              className="
                text-[var(--erp-text)]
              "
            >
              {totalOficinas}
            </strong>{" "}
            registros
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
                pagina <= 1 ||
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
                text-[var(--erp-text)]
                text-sm
                font-medium
                hover:bg-[var(--erp-surface-soft)]
                transition
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >
              Anterior
            </button>


            <span
              className="
                px-3
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
                text-[var(--erp-text)]
                text-sm
                font-medium
                hover:bg-[var(--erp-surface-soft)]
                transition
                disabled:opacity-40
                disabled:cursor-not-allowed
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
              max-w-4xl
              max-h-[92vh]
              overflow-y-auto
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
                gap-4
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
                    ? "Editar Oficina Liquidadora"
                    : "Nueva Oficina Liquidadora"}
                </h2>

                <p
                  className="
                    text-xs
                    text-[var(--erp-text-soft)]
                    mt-1
                  "
                >
                  Completa los datos del catálogo
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
                  hover:text-[var(--erp-text)]
                  transition
                "
              >
                ×
              </button>

            </div>


            <form
              onSubmit={
                guardarOficina
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

                <Campo
                  label="Oficina Liquidadora *"
                  value={
                    formulario.oficina_liquidadora
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "oficina_liquidadora",
                      valor
                    )
                  }
                  placeholder="Ej. Alcalá de Henares"
                  full
                />


                <Campo
                  label="Dirección"
                  value={
                    formulario.direccion
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "direccion",
                      valor
                    )
                  }
                  placeholder="Dirección postal"
                  full
                />


                <Campo
                  label="Código Postal"
                  value={
                    formulario.codigo_postal
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "codigo_postal",
                      valor
                    )
                  }
                  placeholder="28000"
                />


                <Campo
                  label="Población"
                  value={
                    formulario.poblacion
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "poblacion",
                      valor
                    )
                  }
                  placeholder="Población"
                />


                <Campo
                  label="Provincia"
                  value={
                    formulario.provincia
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "provincia",
                      valor
                    )
                  }
                  placeholder="Provincia"
                />


                <Campo
                  label="Teléfono"
                  value={
                    formulario.telefono
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "telefono",
                      valor
                    )
                  }
                  placeholder="Teléfono"
                />


                <Campo
                  label="Email"
                  value={
                    formulario.email
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "email",
                      valor
                    )
                  }
                  placeholder="correo@ejemplo.es"
                  type="email"
                />


                <Campo
                  label="Horario"
                  value={
                    formulario.horario
                  }
                  onChange={(valor) =>
                    cambiarCampo(
                      "horario",
                      valor
                    )
                  }
                  placeholder="Ej. L-V 09:00-14:00"
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
                    className="
                      w-4
                      h-4
                      accent-[var(--erp-primary)]
                    "
                  />

                  <div>

                    <div
                      className="
                        text-sm
                        font-semibold
                        text-[var(--erp-text)]
                      "
                    >
                      Oficina activa
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
                  disabled={loading}
                  className="
                    px-4
                    py-2.5
                    rounded-xl
                    bg-white
                    border
                    border-[var(--erp-border)]
                    text-[var(--erp-text)]
                    text-sm
                    font-semibold
                    hover:bg-[var(--erp-surface-soft)]
                    transition
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={loading}
                  className="
                    px-4
                    py-2.5
                    rounded-xl
                    bg-[var(--erp-primary)]
                    text-white
                    text-sm
                    font-semibold
                    shadow-sm
                    hover:brightness-95
                    transition
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
                gap-4
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
                  Importar Oficinas Liquidadoras
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
                  cerrarImportacion
                }
                disabled={
                  importando
                }
                className="
                  w-9
                  h-9
                  rounded-xl
                  bg-[var(--erp-surface-soft)]
                  border
                  border-[var(--erp-border)]
                  text-[var(--erp-text-soft)]
                  hover:text-[var(--erp-text)]
                  transition
                  disabled:opacity-50
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
                      text-[var(--erp-text)]
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
                      gap-2
                      px-4
                      py-2.5
                      rounded-xl
                      bg-white
                      border
                      border-[var(--erp-border)]
                      text-sm
                      font-semibold
                      text-[var(--erp-text)]
                      hover:bg-[var(--erp-primary-soft)]
                      transition
                    "
                  >

                    Elegir archivo

                    <input
                      type="file"
                      accept=".xlsx,.xls,.xlsm"
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
                        text-sm
                        text-[var(--erp-text)]
                      "
                    >

                      <div
                        className="
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
                  El Excel debe contener:
                  <strong
                    className="
                      text-[var(--erp-text)]
                    "
                  >
                    {" "}
                    Oficina Liquidadora,
                    Dirección, Código Postal,
                    Población, Província,
                    Teléfono, Email y Horario.
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
                    cerrarImportacion
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
                    text-[var(--erp-text)]
                    text-sm
                    font-semibold
                    hover:bg-[var(--erp-surface-soft)]
                    transition
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    importando ||
                    !archivo
                  }
                  className="
                    px-4
                    py-2.5
                    rounded-xl
                    bg-[var(--erp-primary)]
                    text-white
                    text-sm
                    font-semibold
                    shadow-sm
                    hover:brightness-95
                    transition
                    disabled:opacity-50
                    disabled:cursor-not-allowed
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
