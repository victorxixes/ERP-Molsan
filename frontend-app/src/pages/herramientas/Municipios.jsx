import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ============================================================
 * MUNICIPIOS — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Maestro de municipios
 *
 * FUNCIONES:
 *
 * - Carga de municipios desde backend
 * - Búsqueda instantánea
 * - Filtro por CCAA
 * - Filtro por provincia
 * - Nuevo municipio
 * - Editar municipio
 * - Eliminar municipio
 * - Importación directa desde Excel
 * - Contador de resultados
 * - Paginación
 *
 * BACKEND:
 *
 * GET    /api/municipios
 * POST   /api/municipios
 * PUT    /api/municipios/:id
 * DELETE /api/municipios/:id
 *
 * IMPORTACIÓN:
 *
 * POST   /api/municipios/importar-excel
 *
 * El fichero se envía mediante FormData:
 *
 * fichero = archivo Excel
 *
 * ============================================================
 */

const API_BASE = "/api/municipios";

const API_IMPORTAR_EXCEL =
  `${API_BASE}/importar-excel`;

const FILAS_POR_PAGINA = 25;


/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */

export default function Municipios() {

  // ----------------------------------------------------------
  // DATOS
  // ----------------------------------------------------------

  const [municipios, setMunicipios] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");


  // ----------------------------------------------------------
  // FILTROS
  // ----------------------------------------------------------

  const [busqueda, setBusqueda] =
    useState("");

  const [ccaaFiltro, setCcaaFiltro] =
    useState("");

  const [provinciaFiltro, setProvinciaFiltro] =
    useState("");


  // ----------------------------------------------------------
  // PAGINACIÓN
  // ----------------------------------------------------------

  const [pagina, setPagina] =
    useState(1);


  // ----------------------------------------------------------
  // MODAL MUNICIPIO
  // ----------------------------------------------------------

  const [modalAbierto, setModalAbierto] =
    useState(false);

  const [modoModal, setModoModal] =
    useState("nuevo");

  const [municipioSeleccionado, setMunicipioSeleccionado] =
    useState(null);


  // ----------------------------------------------------------
  // MENSAJES
  // ----------------------------------------------------------

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [tipoMensaje, setTipoMensaje] =
    useState("ok");


  // ----------------------------------------------------------
  // IMPORTACIÓN EXCEL
  // ----------------------------------------------------------

  const [modalImportacionAbierto, setModalImportacionAbierto] =
    useState(false);

  const [archivoExcel, setArchivoExcel] =
    useState(null);

  const [importandoExcel, setImportandoExcel] =
    useState(false);

  const inputExcelRef =
    useRef(null);


  // ==========================================================
  // CARGAR MUNICIPIOS
  // ==========================================================

  async function cargarMunicipios() {

    try {

      setCargando(true);

      setError("");

      const respuesta =
        await fetch(API_BASE);


      if (!respuesta.ok) {

        throw new Error(
          `Error HTTP ${respuesta.status}`
        );

      }


      const datos =
        await respuesta.json();


      setMunicipios(
        Array.isArray(datos)
          ? datos
          : []
      );

    } catch (e) {

      console.error(
        "Error cargando municipios:",
        e
      );

      setError(
        "No se pudieron cargar los municipios."
      );

    } finally {

      setCargando(false);

    }

  }


  // ==========================================================
  // CARGA INICIAL
  // ==========================================================

  useEffect(() => {

    cargarMunicipios();

  }, []);


  // ==========================================================
  // LISTA DE CCAA
  // ==========================================================

  const ccaaDisponibles =
    useMemo(() => {

      return [
        ...new Set(
          municipios
            .map(
              (m) => m.ccaa
            )
            .filter(Boolean)
        )
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es",
            {
              sensitivity: "base"
            }
          )
      );

    }, [municipios]);


  // ==========================================================
  // LISTA DE PROVINCIAS
  // ==========================================================

  const provinciasDisponibles =
    useMemo(() => {

      let datos = municipios;


      if (ccaaFiltro) {

        datos =
          datos.filter(
            (m) =>
              m.ccaa === ccaaFiltro
          );

      }


      return [
        ...new Set(
          datos
            .map(
              (m) => m.provincia
            )
            .filter(Boolean)
        )
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es",
            {
              sensitivity: "base"
            }
          )
      );

    }, [
      municipios,
      ccaaFiltro
    ]);


  // ==========================================================
  // BÚSQUEDA + FILTROS
  // ==========================================================

  const municipiosFiltrados =
    useMemo(() => {

      const texto =
        busqueda
          .trim()
          .toLocaleLowerCase("es");


      return municipios.filter(
        (municipio) => {

          const coincideTexto =
            !texto ||
            [
              municipio.ccaa,
              municipio.provincia,
              municipio.municipio
            ]
              .filter(Boolean)
              .some(
                (valor) =>
                  String(valor)
                    .toLocaleLowerCase("es")
                    .includes(texto)
              );


          const coincideCcaa =
            !ccaaFiltro ||
            municipio.ccaa === ccaaFiltro;


          const coincideProvincia =
            !provinciaFiltro ||
            municipio.provincia === provinciaFiltro;


          return (
            coincideTexto &&
            coincideCcaa &&
            coincideProvincia
          );

        }
      );

    }, [
      municipios,
      busqueda,
      ccaaFiltro,
      provinciaFiltro
    ]);


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        municipiosFiltrados.length /
        FILAS_POR_PAGINA
      )
    );


  useEffect(() => {

    if (pagina > totalPaginas) {

      setPagina(
        totalPaginas
      );

    }

  }, [
    pagina,
    totalPaginas
  ]);


  const municipiosPagina =
    municipiosFiltrados.slice(
      (pagina - 1) *
        FILAS_POR_PAGINA,

      pagina *
        FILAS_POR_PAGINA
    );


  // ==========================================================
  // CAMBIAR BÚSQUEDA
  // ==========================================================

  function cambiarBusqueda(valor) {

    setBusqueda(valor);

    setPagina(1);

  }


  // ==========================================================
  // CAMBIAR CCAA
  // ==========================================================

  function cambiarCcaa(valor) {

    setCcaaFiltro(valor);

    setProvinciaFiltro("");

    setPagina(1);

  }


  // ==========================================================
  // CAMBIAR PROVINCIA
  // ==========================================================

  function cambiarProvincia(valor) {

    setProvinciaFiltro(valor);

    setPagina(1);

  }


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  function limpiarFiltros() {

    setBusqueda("");

    setCcaaFiltro("");

    setProvinciaFiltro("");

    setPagina(1);

  }


  // ==========================================================
  // ABRIR NUEVO
  // ==========================================================

  function abrirNuevo() {

    setMunicipioSeleccionado({
      ccaa: "",
      provincia: "",
      municipio: ""
    });

    setModoModal("nuevo");

    setModalAbierto(true);

    setMensaje("");

  }


  // ==========================================================
  // ABRIR EDITAR
  // ==========================================================

  function abrirEditar(municipio) {

    setMunicipioSeleccionado({
      ...municipio
    });

    setModoModal("editar");

    setModalAbierto(true);

    setMensaje("");

  }


  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  function cerrarModal() {

    if (guardando) {
      return;
    }

    setModalAbierto(false);

    setMunicipioSeleccionado(null);

  }


  // ==========================================================
  // GUARDAR MUNICIPIO
  // ==========================================================

  async function guardarMunicipio(datos) {

    if (!datos.ccaa?.trim()) {

      mostrarMensaje(
        "La comunidad autónoma es obligatoria.",
        "error"
      );

      return;

    }


    if (!datos.provincia?.trim()) {

      mostrarMensaje(
        "La provincia es obligatoria.",
        "error"
      );

      return;

    }


    if (!datos.municipio?.trim()) {

      mostrarMensaje(
        "El municipio es obligatorio.",
        "error"
      );

      return;

    }


    try {

      setGuardando(true);


      const esNuevo =
        modoModal === "nuevo";


      const url =
        esNuevo
          ? API_BASE
          : `${API_BASE}/${datos.id}`;


      const respuesta =
        await fetch(
          url,
          {
            method:
              esNuevo
                ? "POST"
                : "PUT",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                ccaa:
                  datos.ccaa.trim(),

                provincia:
                  datos.provincia.trim(),

                municipio:
                  datos.municipio.trim()
              })
          }
        );


      const resultado =
        await respuesta.json();


      if (!respuesta.ok) {

        throw new Error(
          resultado.detail ||
          "No se pudo guardar el municipio."
        );

      }


      mostrarMensaje(
        esNuevo
          ? "Municipio creado correctamente."
          : "Municipio actualizado correctamente.",
        "ok"
      );


      setModalAbierto(false);

      setMunicipioSeleccionado(null);


      await cargarMunicipios();

    } catch (e) {

      console.error(
        "Error guardando municipio:",
        e
      );

      mostrarMensaje(
        e.message ||
        "No se pudo guardar el municipio.",
        "error"
      );

    } finally {

      setGuardando(false);

    }

  }


  // ==========================================================
  // ELIMINAR MUNICIPIO
  // ==========================================================

  async function eliminarMunicipio(municipio) {

    const confirmar =
      window.confirm(
        `¿Seguro que quieres eliminar el municipio "${municipio.municipio}"?\n\nEsta acción no se puede deshacer.`
      );


    if (!confirmar) {
      return;
    }


    try {

      const respuesta =
        await fetch(
          `${API_BASE}/${municipio.id}`,
          {
            method: "DELETE"
          }
        );


      const resultado =
        await respuesta.json();


      if (!respuesta.ok) {

        throw new Error(
          resultado.detail ||
          "No se pudo eliminar el municipio."
        );

      }


      mostrarMensaje(
        "Municipio eliminado correctamente.",
        "ok"
      );


      await cargarMunicipios();

    } catch (e) {

      console.error(
        "Error eliminando municipio:",
        e
      );

      mostrarMensaje(
        e.message ||
        "No se pudo eliminar el municipio.",
        "error"
      );

    }

  }


  // ==========================================================
  // ABRIR IMPORTACIÓN
  // ==========================================================

  function abrirImportacionExcel() {

    setArchivoExcel(null);

    setMensaje("");

    setModalImportacionAbierto(true);

  }


  // ==========================================================
  // CERRAR IMPORTACIÓN
  // ==========================================================

  function cerrarImportacionExcel() {

    if (importandoExcel) {
      return;
    }

    setModalImportacionAbierto(false);

    setArchivoExcel(null);


    if (inputExcelRef.current) {

      inputExcelRef.current.value = "";

    }

  }


  // ==========================================================
  // SELECCIONAR EXCEL
  // ==========================================================

  function seleccionarExcel(event) {

    const archivo =
      event.target.files?.[0];


    if (!archivo) {

      setArchivoExcel(null);

      return;

    }


    const nombre =
      archivo.name.toLocaleLowerCase(
        "es"
      );


    const extensionValida =
      nombre.endsWith(".xlsx") ||
      nombre.endsWith(".xls");


    if (!extensionValida) {

      mostrarMensaje(
        "Selecciona un archivo Excel válido (.xlsx o .xls).",
        "error"
      );


      event.target.value = "";

      setArchivoExcel(null);

      return;

    }


    setArchivoExcel(archivo);

  }


  // ==========================================================
  // IMPORTAR EXCEL
  // ==========================================================

  async function importarExcel() {

    if (!archivoExcel) {

      mostrarMensaje(
        "Selecciona primero un archivo Excel.",
        "error"
      );

      return;

    }


    try {

      setImportandoExcel(true);

      setMensaje("");


      const formulario =
        new FormData();


      formulario.append(
        "fichero",
        archivoExcel
      );


      const respuesta =
        await fetch(
          API_IMPORTAR_EXCEL,
          {
            method: "POST",
            body: formulario
          }
        );


      let resultado = null;


      try {

        resultado =
          await respuesta.json();

      } catch {

        resultado = null;

      }


      if (!respuesta.ok) {

        throw new Error(
          resultado?.detail ||
          resultado?.message ||
          `Error HTTP ${respuesta.status} al importar el Excel.`
        );

      }


      /*
       * El backend puede devolver distintos
       * nombres para los contadores.
       *
       * Intentamos mostrar todos los formatos
       * habituales sin romper la interfaz.
       */

      const creados =
        resultado?.creados ??
        resultado?.insertados ??
        resultado?.importados ??
        0;


      const actualizados =
        resultado?.actualizados ??
        resultado?.modificados ??
        0;


      const errores =
        resultado?.errores ??
        0;


      const procesados =
        resultado?.procesados ??
        resultado?.total ??
        resultado?.filas_procesadas ??
        null;


      let textoResultado =
        "Excel importado correctamente.";


      if (
        procesados !== null ||
        creados ||
        actualizados ||
        errores
      ) {

        textoResultado =
          [
            "Excel importado correctamente.",

            procesados !== null
              ? `Procesados: ${Number(procesados).toLocaleString("es-ES")}.`
              : null,

            `Creados: ${Number(creados).toLocaleString("es-ES")}.`,

            `Actualizados: ${Number(actualizados).toLocaleString("es-ES")}.`,

            errores
              ? `Errores: ${Number(errores).toLocaleString("es-ES")}.`
              : null
          ]
            .filter(Boolean)
            .join(" ");

      }


      mostrarMensaje(
        textoResultado,
        "ok"
      );


      /*
       * Recargamos inmediatamente
       * el maestro de municipios.
       */

      await cargarMunicipios();


      /*
       * Cerramos el modal después de
       * actualizar los datos.
       */

      setModalImportacionAbierto(false);

      setArchivoExcel(null);


      if (inputExcelRef.current) {

        inputExcelRef.current.value = "";

      }

    } catch (e) {

      console.error(
        "Error importando municipios desde Excel:",
        e
      );


      mostrarMensaje(
        e.message ||
        "No se pudo importar el archivo Excel.",
        "error"
      );

    } finally {

      setImportandoExcel(false);

    }

  }


  // ==========================================================
  // FORMATEAR TAMAÑO
  // ==========================================================

  function formatearTamanoArchivo(bytes) {

    if (!bytes) {
      return "0 KB";
    }


    const unidades = [
      "B",
      "KB",
      "MB",
      "GB"
    ];


    const indice =
      Math.min(
        Math.floor(
          Math.log(bytes) /
          Math.log(1024)
        ),
        unidades.length - 1
      );


    const valor =
      bytes /
      Math.pow(
        1024,
        indice
      );


    return `${valor.toLocaleString(
      "es-ES",
      {
        maximumFractionDigits: 2
      }
    )} ${unidades[indice]}`;

  }


  // ==========================================================
  // MENSAJE
  // ==========================================================

  function mostrarMensaje(
    texto,
    tipo = "ok"
  ) {

    setMensaje(texto);

    setTipoMensaje(tipo);


    window.setTimeout(
      () => {

        setMensaje("");

      },
      5000
    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="
        min-h-full
        p-4 sm:p-6 lg:p-8
        space-y-6
        animate-fadeIn
      "
    >

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div
        className="
          relative overflow-hidden
          rounded-[24px]
          border border-slate-200/80
          bg-white/80
          backdrop-blur-xl
          shadow-[0_18px_50px_rgba(15,23,42,0.08)]
          p-6 sm:p-7
        "
      >

        <div
          className="
            absolute inset-x-0 top-0 h-px
            bg-gradient-to-r
            from-transparent
            via-blue-400/60
            to-transparent
          "
        />


        <div
          className="
            relative
            flex flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          <div
            className="
              flex items-center gap-4
            "
          >

            <div
              className="
                flex h-14 w-14 shrink-0
                items-center justify-center
                rounded-2xl
                bg-indigo-50
                border border-indigo-100
                text-2xl
                shadow-sm
              "
            >
              🏘️
            </div>


            <div>

              <h1
                className="
                  text-2xl sm:text-3xl
                  font-bold
                  tracking-tight
                  text-slate-800
                "
              >
                Municipios
              </h1>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Maestro de comunidades autónomas,
                provincias y municipios.
              </p>

            </div>

          </div>


          {/* =================================================
              BOTONES CABECERA
          ================================================= */}

          <div
            className="
              flex
              flex-col
              sm:flex-row
              gap-2
            "
          >

            {/* IMPORTAR EXCEL */}

            <button
              type="button"
              onClick={abrirImportacionExcel}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border border-emerald-200
                bg-emerald-50
                px-5
                py-2.5
                text-sm
                font-semibold
                text-emerald-700
                shadow-sm
                transition-all
                hover:border-emerald-300
                hover:bg-emerald-100
                hover:-translate-y-0.5
                active:scale-[0.98]
              "
            >

              <span className="text-lg">
                📊
              </span>

              Importar Excel

            </button>


            {/* NUEVO MUNICIPIO */}

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
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-[0_8px_20px_rgba(37,99,235,0.20)]
                transition-all
                hover:bg-blue-700
                hover:-translate-y-0.5
                active:scale-[0.98]
              "
            >

              <span className="text-lg">
                +
              </span>

              Nuevo municipio

            </button>

          </div>

        </div>

      </div>


      {/* =====================================================
          MENSAJE
      ===================================================== */}

      {mensaje && (

        <div
          className={`
            rounded-2xl
            border
            px-4 py-3
            text-sm
            font-medium
            ${
              tipoMensaje === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }
          `}
        >
          {mensaje}
        </div>

      )}


      {/* =====================================================
          ERROR CARGA
      ===================================================== */}

      {error && (

        <div
          className="
            rounded-2xl
            border border-red-200
            bg-red-50
            px-5 py-4
            text-sm
            text-red-700
          "
        >
          {error}
        </div>

      )}


      {/* =====================================================
          FILTROS
      ===================================================== */}

      <div
        className="
          rounded-[22px]
          border border-slate-200/80
          bg-white/80
          backdrop-blur-xl
          shadow-[0_12px_35px_rgba(15,23,42,0.06)]
          p-5
        "
      >

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-[minmax(280px,1fr)_240px_240px_auto]
            gap-4
            items-end
          "
        >

          {/* BUSCADOR */}

          <div>

            <label
              className="
                mb-1.5
                block
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              Buscar
            </label>


            <div className="relative">

              <span
                className="
                  pointer-events-none
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
                value={busqueda}
                onChange={(e) =>
                  cambiarBusqueda(
                    e.target.value
                  )
                }
                placeholder="Municipio, provincia o CCAA..."
                className="
                  w-full
                  rounded-xl
                  border border-slate-200
                  bg-white
                  py-2.5
                  pl-10
                  pr-4
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-100
                "
              />

            </div>

          </div>


          {/* CCAA */}

          <div>

            <label
              className="
                mb-1.5
                block
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              Comunidad autónoma
            </label>


            <select
              value={ccaaFiltro}
              onChange={(e) =>
                cambiarCcaa(
                  e.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border border-slate-200
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-700
                outline-none
                transition
                focus:border-blue-400
                focus:ring-4
                focus:ring-blue-100
              "
            >

              <option value="">
                Todas las comunidades
              </option>


              {ccaaDisponibles.map(
                (ccaa) => (

                  <option
                    key={ccaa}
                    value={ccaa}
                  >
                    {ccaa}
                  </option>

                )
              )}

            </select>

          </div>


          {/* PROVINCIA */}

          <div>

            <label
              className="
                mb-1.5
                block
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              "
            >
              Provincia
            </label>


            <select
              value={provinciaFiltro}
              onChange={(e) =>
                cambiarProvincia(
                  e.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border border-slate-200
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-700
                outline-none
                transition
                focus:border-blue-400
                focus:ring-4
                focus:ring-blue-100
              "
            >

              <option value="">
                Todas las provincias
              </option>


              {provinciasDisponibles.map(
                (provincia) => (

                  <option
                    key={provincia}
                    value={provincia}
                  >
                    {provincia}
                  </option>

                )
              )}

            </select>

          </div>


          {/* LIMPIAR */}

          <button
            type="button"
            onClick={limpiarFiltros}
            className="
              rounded-xl
              border border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-medium
              text-slate-600
              transition
              hover:border-slate-300
              hover:bg-slate-50
            "
          >
            Limpiar filtros
          </button>

        </div>

      </div>


      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div
        className="
          flex
          flex-col
          gap-2
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >

        <div
          className="
            text-sm
            text-slate-500
          "
        >

          Mostrando{" "}

          <span
            className="
              font-semibold
              text-slate-700
            "
          >
            {municipiosFiltrados.length.toLocaleString(
              "es-ES"
            )}
          </span>

          {" "}municipios


          {municipiosFiltrados.length !==
            municipios.length && (

            <>
              {" "}de{" "}

              <span
                className="
                  font-semibold
                  text-slate-700
                "
              >
                {municipios.length.toLocaleString(
                  "es-ES"
                )}
              </span>
            </>

          )}

        </div>


        <div
          className="
            text-xs
            text-slate-400
          "
        >
          Página {pagina} de {totalPaginas}
        </div>

      </div>


      {/* =====================================================
          TABLA
      ===================================================== */}

      <div
        className="
          overflow-hidden
          rounded-[22px]
          border border-slate-200/80
          bg-white/90
          shadow-[0_12px_35px_rgba(15,23,42,0.06)]
        "
      >

        {cargando ? (

          <div
            className="
              flex
              min-h-[300px]
              items-center
              justify-center
              text-sm
              text-slate-400
            "
          >

            <div className="text-center">

              <div
                className="
                  mx-auto
                  mb-3
                  h-8
                  w-8
                  animate-spin
                  rounded-full
                  border-2
                  border-slate-200
                  border-t-blue-500
                "
              />

              Cargando municipios...

            </div>

          </div>

        ) : municipiosPagina.length === 0 ? (

          <div
            className="
              flex
              min-h-[300px]
              flex-col
              items-center
              justify-center
              px-6
              text-center
            "
          >

            <div
              className="
                mb-3
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-slate-50
                text-2xl
              "
            >
              🔎
            </div>


            <h3
              className="
                text-base
                font-semibold
                text-slate-700
              "
            >
              No se han encontrado municipios
            </h3>


            <p
              className="
                mt-1
                text-sm
                text-slate-400
              "
            >
              Prueba con otro texto o limpia los filtros.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table
              className="
                w-full
                min-w-[800px]
                border-collapse
              "
            >

              <thead>

                <tr
                  className="
                    border-b
                    border-slate-200
                    bg-slate-50/80
                  "
                >

                  <th
                    className="
                      px-5
                      py-3.5
                      text-left
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                    "
                  >
                    Comunidad autónoma
                  </th>


                  <th
                    className="
                      px-5
                      py-3.5
                      text-left
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                    "
                  >
                    Provincia
                  </th>


                  <th
                    className="
                      px-5
                      py-3.5
                      text-left
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-500
                    "
                  >
                    Municipio
                  </th>


                  <th
                    className="
                      w-[150px]
                      px-5
                      py-3.5
                      text-right
                      text-[11px]
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


              <tbody>

                {municipiosPagina.map(
                  (municipio) => (

                    <tr
                      key={municipio.id}
                      className="
                        group
                        border-b
                        border-slate-100
                        transition-colors
                        hover:bg-blue-50/40
                      "
                    >

                      <td
                        className="
                          px-5
                          py-3.5
                          text-sm
                          text-slate-600
                        "
                      >
                        {municipio.ccaa}
                      </td>


                      <td
                        className="
                          px-5
                          py-3.5
                          text-sm
                          text-slate-600
                        "
                      >
                        {municipio.provincia}
                      </td>


                      <td
                        className="
                          px-5
                          py-3.5
                          text-sm
                          font-semibold
                          text-slate-700
                        "
                      >
                        {municipio.municipio}
                      </td>


                      <td
                        className="
                          px-5
                          py-3.5
                        "
                      >

                        <div
                          className="
                            flex
                            justify-end
                            gap-2
                          "
                        >

                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                municipio
                              )
                            }
                            title="Editar municipio"
                            className="
                              flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-slate-200
                              bg-white
                              text-slate-500
                              transition
                              hover:border-blue-200
                              hover:bg-blue-50
                              hover:text-blue-600
                            "
                          >
                            ✏️
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              eliminarMunicipio(
                                municipio
                              )
                            }
                            title="Eliminar municipio"
                            className="
                              flex
                              h-9
                              w-9
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-slate-200
                              bg-white
                              text-slate-500
                              transition
                              hover:border-red-200
                              hover:bg-red-50
                              hover:text-red-600
                            "
                          >
                            🗑️
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* =====================================================
          PAGINACIÓN
      ===================================================== */}

      {!cargando &&
        municipiosFiltrados.length > 0 && (

        <div
          className="
            flex
            items-center
            justify-between
            rounded-[18px]
            border
            border-slate-200/80
            bg-white/70
            px-4
            py-3
          "
        >

          <button
            type="button"
            disabled={pagina <= 1}
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
              rounded-lg
              border border-slate-200
              bg-white
              px-3
              py-2
              text-sm
              font-medium
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            ← Anterior
          </button>


          <span
            className="
              text-sm
              text-slate-500
            "
          >
            Página{" "}

            <strong
              className="text-slate-700"
            >
              {pagina}
            </strong>

            {" "}de{" "}

            <strong
              className="text-slate-700"
            >
              {totalPaginas}
            </strong>
          </span>


          <button
            type="button"
            disabled={
              pagina >= totalPaginas
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
              rounded-lg
              border border-slate-200
              bg-white
              px-3
              py-2
              text-sm
              font-medium
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            Siguiente →
          </button>

        </div>

      )}


      {/* =====================================================
          MODAL MUNICIPIO
      ===================================================== */}

      {modalAbierto && (

        <ModalMunicipio
          modo={modoModal}
          municipio={
            municipioSeleccionado
          }
          guardando={guardando}
          onCerrar={cerrarModal}
          onGuardar={
            guardarMunicipio
          }
        />

      )}


      {/* =====================================================
          MODAL IMPORTAR EXCEL
      ===================================================== */}

      {modalImportacionAbierto && (

        <ModalImportarExcel
          archivo={archivoExcel}
          inputExcelRef={inputExcelRef}
          importando={importandoExcel}
          onSeleccionar={
            seleccionarExcel
          }
          onImportar={
            importarExcel
          }
          onCerrar={
            cerrarImportacionExcel
          }
          formatearTamano={
            formatearTamanoArchivo
          }
        />

      )}

    </div>

  );

}


/* ============================================================
   MODAL IMPORTAR EXCEL
============================================================ */

function ModalImportarExcel({
  archivo,
  inputExcelRef,
  importando,
  onSeleccionar,
  onImportar,
  onCerrar,
  formatearTamano
}) {

  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-slate-950/40
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(e) => {

        if (
          e.target === e.currentTarget &&
          !importando
        ) {

          onCerrar();

        }

      }}
    >

      <div
        className="
          w-full
          max-w-2xl
          overflow-hidden
          rounded-[26px]
          border
          border-slate-200
          bg-white
          shadow-[0_30px_80px_rgba(15,23,42,0.22)]
        "
      >

        {/* =================================================
            CABECERA
        ================================================= */}

        <div
          className="
            border-b
            border-slate-100
            bg-slate-50/80
            px-6
            py-5
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
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
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-emerald-50
                  text-xl
                  border
                  border-emerald-100
                "
              >
                📊
              </div>


              <div>

                <h2
                  className="
                    text-lg
                    font-bold
                    text-slate-800
                  "
                >
                  Importar municipios desde Excel
                </h2>


                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Carga masiva del catálogo territorial.
                </p>

              </div>

            </div>


            <button
              type="button"
              disabled={importando}
              onClick={onCerrar}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              ✕
            </button>

          </div>

        </div>


        {/* =================================================
            CONTENIDO
        ================================================= */}

        <div className="p-6">

          {/* INFORMACIÓN */}

          <div
            className="
              rounded-2xl
              border
              border-blue-100
              bg-blue-50/70
              px-4
              py-4
            "
          >

            <div
              className="
                flex
                gap-3
              "
            >

              <div
                className="
                  text-lg
                "
              >
                ℹ️
              </div>


              <div>

                <p
                  className="
                    text-sm
                    font-semibold
                    text-blue-800
                  "
                >
                  Formato esperado
                </p>


                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-blue-700
                  "
                >
                  El Excel debe contener las columnas
                  <strong> CCAA</strong>,
                  <strong> PROVINCIA</strong> y
                  <strong> MUNICIPIO</strong>.
                  El sistema procesará el fichero y
                  actualizará el catálogo.
                </p>

              </div>

            </div>

          </div>


          {/* SELECTOR */}

          <div className="mt-5">

            <label
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-slate-700
              "
            >
              Archivo Excel
            </label>


            <input
              ref={inputExcelRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={
                onSeleccionar
              }
              disabled={importando}
              className="hidden"
            />


            <button
              type="button"
              disabled={importando}
              onClick={() =>
                inputExcelRef.current?.click()
              }
              className="
                w-full
                rounded-2xl
                border-2
                border-dashed
                border-slate-200
                bg-slate-50/70
                px-6
                py-8
                text-center
                transition
                hover:border-emerald-300
                hover:bg-emerald-50/40
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              <div
                className="
                  mx-auto
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white
                  text-2xl
                  shadow-sm
                "
              >
                📁
              </div>


              <p
                className="
                  mt-3
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Haz clic para seleccionar el Excel
              </p>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                Formatos admitidos: .xlsx y .xls
              </p>

            </button>

          </div>


          {/* ARCHIVO SELECCIONADO */}

          {archivo && (

            <div
              className="
                mt-4
                flex
                items-center
                justify-between
                gap-4
                rounded-2xl
                border
                border-emerald-200
                bg-emerald-50/70
                px-4
                py-3
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
                    bg-white
                    text-lg
                    shadow-sm
                  "
                >
                  📄
                </div>


                <div className="min-w-0">

                  <p
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-emerald-800
                    "
                  >
                    {archivo.name}
                  </p>


                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-emerald-600
                    "
                  >
                    {formatearTamano(
                      archivo.size
                    )}
                  </p>

                </div>

              </div>


              {!importando && (

                <button
                  type="button"
                  onClick={() =>
                    onSeleccionar({
                      target: {
                        files: []
                      }
                    })
                  }
                  className="
                    shrink-0
                    rounded-lg
                    px-2
                    py-1
                    text-xs
                    font-medium
                    text-slate-500
                    hover:bg-white
                    hover:text-red-600
                  "
                >
                  Quitar
                </button>

              )}

            </div>

          )}

        </div>


        {/* =================================================
            BOTONES
        ================================================= */}

        <div
          className="
            flex
            justify-end
            gap-3
            border-t
            border-slate-100
            px-6
            py-5
          "
        >

          <button
            type="button"
            disabled={importando}
            onClick={onCerrar}
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              px-5
              py-2.5
              text-sm
              font-medium
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Cancelar
          </button>


          <button
            type="button"
            disabled={
              !archivo ||
              importando
            }
            onClick={onImportar}
            className="
              inline-flex
              min-w-[180px]
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-emerald-600
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-[0_8px_20px_rgba(5,150,105,0.18)]
              transition
              hover:bg-emerald-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >

            {importando && (

              <span
                className="
                  h-4
                  w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/40
                  border-t-white
                "
              />

            )}


            {importando
              ? "Importando..."
              : "Importar municipios"}

          </button>

        </div>

      </div>

    </div>

  );

}


/* ============================================================
   MODAL MUNICIPIO
============================================================ */

function ModalMunicipio({
  modo,
  municipio,
  guardando,
  onCerrar,
  onGuardar
}) {

  const [formulario, setFormulario] =
    useState({
      id:
        municipio?.id,

      ccaa:
        municipio?.ccaa || "",

      provincia:
        municipio?.provincia || "",

      municipio:
        municipio?.municipio || ""
    });


  function cambiarCampo(
    campo,
    valor
  ) {

    setFormulario(
      (actual) => ({
        ...actual,
        [campo]: valor
      })
    );

  }


  function enviar(e) {

    e.preventDefault();

    onGuardar(
      formulario
    );

  }


  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-slate-950/40
        p-4
        backdrop-blur-sm
      "
      onMouseDown={(e) => {

        if (
          e.target === e.currentTarget &&
          !guardando
        ) {

          onCerrar();

        }

      }}
    >

      <div
        className="
          w-full
          max-w-xl
          overflow-hidden
          rounded-[24px]
          border
          border-slate-200
          bg-white
          shadow-[0_30px_80px_rgba(15,23,42,0.22)]
        "
      >

        {/* CABECERA */}

        <div
          className="
            border-b
            border-slate-100
            bg-slate-50/70
            px-6
            py-5
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

              <h2
                className="
                  text-lg
                  font-bold
                  text-slate-800
                "
              >
                {modo === "nuevo"
                  ? "Nuevo municipio"
                  : "Editar municipio"}
              </h2>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Datos territoriales del municipio.
              </p>

            </div>


            <button
              type="button"
              disabled={guardando}
              onClick={onCerrar}
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
              "
            >
              ✕
            </button>

          </div>

        </div>


        {/* FORMULARIO */}

        <form
          onSubmit={enviar}
          className="p-6"
        >

          <div className="space-y-4">

            {/* CCAA */}

            <div>

              <label
                className="
                  mb-1.5
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Comunidad autónoma
              </label>


              <input
                type="text"
                value={
                  formulario.ccaa
                }
                onChange={(e) =>
                  cambiarCampo(
                    "ccaa",
                    e.target.value
                  )
                }
                placeholder="Ej. Cataluña"
                autoFocus
                className="
                  w-full
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-100
                "
              />

            </div>


            {/* PROVINCIA */}

            <div>

              <label
                className="
                  mb-1.5
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Provincia
              </label>


              <input
                type="text"
                value={
                  formulario.provincia
                }
                onChange={(e) =>
                  cambiarCampo(
                    "provincia",
                    e.target.value
                  )
                }
                placeholder="Ej. Barcelona"
                className="
                  w-full
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-100
                "
              />

            </div>


            {/* MUNICIPIO */}

            <div>

              <label
                className="
                  mb-1.5
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Municipio
              </label>


              <input
                type="text"
                value={
                  formulario.municipio
                }
                onChange={(e) =>
                  cambiarCampo(
                    "municipio",
                    e.target.value
                  )
                }
                placeholder="Ej. Barcelona"
                className="
                  w-full
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-100
                "
              />

            </div>

          </div>


          {/* BOTONES */}

          <div
            className="
              mt-7
              flex
              justify-end
              gap-3
              border-t
              border-slate-100
              pt-5
            "
          >

            <button
              type="button"
              disabled={guardando}
              onClick={onCerrar}
              className="
                rounded-xl
                border border-slate-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-medium
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              Cancelar
            </button>


            <button
              type="submit"
              disabled={guardando}
              className="
                inline-flex
                min-w-[130px]
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-60
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
                    border-white/40
                    border-t-white
                  "
                />

              )}


              {guardando
                ? "Guardando..."
                : modo === "nuevo"
                  ? "Crear municipio"
                  : "Guardar cambios"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}
