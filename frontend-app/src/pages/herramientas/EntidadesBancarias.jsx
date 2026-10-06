import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * ============================================================
 * ENTIDADES BANCARIAS — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Maestro de entidades bancarias.
 *
 * FUNCIONES:
 *
 * - Carga desde backend
 * - Búsqueda instantánea
 * - Filtro por categoría
 * - Nuevo registro
 * - Editar registro
 * - Eliminar registro
 * - Importación directa desde Excel
 * - Contador de resultados
 * - Paginación
 *
 * BACKEND:
 *
 * GET    /api/entidades-bancarias
 * POST   /api/entidades-bancarias
 * PUT    /api/entidades-bancarias/:id
 * DELETE /api/entidades-bancarias/:id
 *
 * IMPORTACIÓN:
 *
 * POST   /api/entidades-bancarias/importar-excel
 *
 * FormData:
 *
 * fichero = archivo Excel
 *
 * COLUMNAS EXCEL:
 *
 * Codigo Europeo
 * LEI
 * Nombre
 * Categoria
 * Dirección
 *
 * ============================================================
 */


/* ============================================================
   BACKEND
============================================================ */

const API_ORIGEN =
  "https://agenda-intranet-b.onrender.com";

const API_BASE =
  `${API_ORIGEN}/api/entidades-bancarias`;

const API_IMPORTAR_EXCEL =
  `${API_BASE}/importar-excel`;

const FILAS_POR_PAGINA = 25;


/* ============================================================
   LEER RESPUESTAS DEL BACKEND
============================================================ */

async function leerRespuestaServidor(
  respuesta
) {

  const contenido =
    await respuesta.text();

  if (!contenido) {
    return null;
  }

  const contentType =
    (
      respuesta.headers.get(
        "content-type"
      ) || ""
    ).toLowerCase();


  /* ----------------------------------------------------------
     JSON
  ---------------------------------------------------------- */

  if (
    contentType.includes(
      "application/json"
    )
  ) {

    try {

      return JSON.parse(
        contenido
      );

    } catch {

      throw new Error(
        "El servidor devolvió un JSON no válido."
      );

    }

  }


  /* ----------------------------------------------------------
     Intento adicional de JSON
  ---------------------------------------------------------- */

  try {

    return JSON.parse(
      contenido
    );

  } catch {

    if (
      contenido
        .trimStart()
        .startsWith("<")
    ) {

      throw new Error(
        `El servidor devolvió HTML en lugar de JSON. URL: ${respuesta.url}`
      );

    }

    throw new Error(
      contenido.substring(
        0,
        300
      ) ||
      "El servidor devolvió una respuesta no válida."
    );

  }

}


/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */

export default function EntidadesBancarias() {


  // ==========================================================
  // DATOS
  // ==========================================================

  const [
    entidades,
    setEntidades
  ] = useState([]);


  const [
    cargando,
    setCargando
  ] = useState(true);


  const [
    error,
    setError
  ] = useState("");


  // ==========================================================
  // FILTROS
  // ==========================================================

  const [
    busqueda,
    setBusqueda
  ] = useState("");


  const [
    categoriaFiltro,
    setCategoriaFiltro
  ] = useState("");


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const [
    pagina,
    setPagina
  ] = useState(1);


  // ==========================================================
  // MODAL ENTIDAD
  // ==========================================================

  const [
    modalAbierto,
    setModalAbierto
  ] = useState(false);


  const [
    modoModal,
    setModoModal
  ] = useState("nuevo");


  const [
    entidadSeleccionada,
    setEntidadSeleccionada
  ] = useState(null);


  // ==========================================================
  // GUARDADO / MENSAJES
  // ==========================================================

  const [
    guardando,
    setGuardando
  ] = useState(false);


  const [
    mensaje,
    setMensaje
  ] = useState("");


  const [
    tipoMensaje,
    setTipoMensaje
  ] = useState("ok");


  // ==========================================================
  // IMPORTACIÓN EXCEL
  // ==========================================================

  const [
    modalImportacionAbierto,
    setModalImportacionAbierto
  ] = useState(false);


  const [
    archivoExcel,
    setArchivoExcel
  ] = useState(null);


  const [
    importandoExcel,
    setImportandoExcel
  ] = useState(false);


  const inputExcelRef =
    useRef(null);


  // ==========================================================
  // CARGAR ENTIDADES
  // ==========================================================

  async function cargarEntidadesBancarias() {

    try {

      setCargando(true);

      setError("");

      const respuesta =
        await fetch(
          API_BASE,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",
            },
          }
        );


      const datos =
        await leerRespuestaServidor(
          respuesta
        );


      if (!respuesta.ok) {

        throw new Error(
          datos?.detail ||
          datos?.message ||
          `Error HTTP ${respuesta.status}`
        );

      }


      const lista =
        Array.isArray(
          datos
        )
          ? datos
          : [];


      setEntidades(
        lista
      );

    } catch (e) {

      console.error(
        "Error cargando entidades bancarias:",
        e
      );

      setEntidades([]);

      setError(
        e?.message ||
        "No se pudieron cargar las entidades bancarias."
      );

    } finally {

      setCargando(false);

    }

  }


  // ==========================================================
  // CARGA INICIAL
  // ==========================================================

  useEffect(() => {

    cargarEntidadesBancarias();

  }, []);


  // ==========================================================
  // CATEGORÍAS DISPONIBLES
  // ==========================================================

  const categoriasDisponibles =
    useMemo(
      () => {

        return [
          ...new Set(
            entidades
              .map(
                (entidad) =>
                  entidad.categoria
              )
              .filter(Boolean)
          ),
        ].sort(
          (a, b) =>
            a.localeCompare(
              b,
              "es",
              {
                sensitivity: "base",
              }
            )
        );

      },
      [
        entidades,
      ]
    );


  // ==========================================================
  // FILTRO GENERAL
  // ==========================================================

  const entidadesFiltradas =
    useMemo(
      () => {

        const texto =
          busqueda
            .trim()
            .toLocaleLowerCase(
              "es"
            );


        return entidades.filter(
          (entidad) => {

            const valores = [
              entidad.codigo_europeo,
              entidad.lei,
              entidad.nombre,
              entidad.categoria,
              entidad.direccion,
            ];


            const coincideTexto =
              !texto ||
              valores
                .filter(Boolean)
                .some(
                  (valor) =>
                    String(valor)
                      .toLocaleLowerCase(
                        "es"
                      )
                      .includes(
                        texto
                      )
                );


            const coincideCategoria =
              !categoriaFiltro ||
              entidad.categoria ===
                categoriaFiltro;


            return (
              coincideTexto &&
              coincideCategoria
            );

          }
        );

      },
      [
        entidades,
        busqueda,
        categoriaFiltro,
      ]
    );


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        entidadesFiltradas.length /
        FILAS_POR_PAGINA
      )
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


  const entidadesPagina =
    entidadesFiltradas.slice(
      (
        pagina - 1
      ) *
      FILAS_POR_PAGINA,

      pagina *
      FILAS_POR_PAGINA
    );


  // ==========================================================
  // BÚSQUEDA
  // ==========================================================

  function cambiarBusqueda(
    valor
  ) {

    setBusqueda(
      valor
    );

    setPagina(
      1
    );

  }


  // ==========================================================
  // CATEGORÍA
  // ==========================================================

  function cambiarCategoria(
    valor
  ) {

    setCategoriaFiltro(
      valor
    );

    setPagina(
      1
    );

  }


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  function limpiarFiltros() {

    setBusqueda("");

    setCategoriaFiltro("");

    setPagina(1);

  }


  // ==========================================================
  // ABRIR NUEVO
  // ==========================================================

  function abrirNuevo() {

    setEntidadSeleccionada({
      codigo_europeo: "",
      lei: "",
      nombre: "",
      categoria: "",
      direccion: "",
    });

    setModoModal(
      "nuevo"
    );

    setModalAbierto(
      true
    );

    setMensaje("");

  }


  // ==========================================================
  // ABRIR EDITAR
  // ==========================================================

  function abrirEditar(
    entidad
  ) {

    setEntidadSeleccionada({
      ...entidad,
    });

    setModoModal(
      "editar"
    );

    setModalAbierto(
      true
    );

    setMensaje("");

  }


  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  function cerrarModal() {

    if (guardando) {
      return;
    }

    setModalAbierto(
      false
    );

    setEntidadSeleccionada(
      null
    );

  }


  // ==========================================================
  // GUARDAR
  // ==========================================================

  async function guardarEntidad(
    datos
  ) {

    const codigo =
      datos.codigo_europeo
        ?.trim()
        .toUpperCase() ||
      "";


    const lei =
      datos.lei
        ?.trim()
        .toUpperCase() ||
      "";


    const nombre =
      datos.nombre
        ?.trim() ||
      "";


    const categoria =
      datos.categoria
        ?.trim() ||
      "";


    const direccion =
      datos.direccion
        ?.trim() ||
      "";


    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------

    if (!codigo) {

      mostrarMensaje(
        "El Código Europeo es obligatorio.",
        "error"
      );

      return;

    }


    if (!nombre) {

      mostrarMensaje(
        "El nombre de la entidad es obligatorio.",
        "error"
      );

      return;

    }


    if (!categoria) {

      mostrarMensaje(
        "La categoría es obligatoria.",
        "error"
      );

      return;

    }


    try {

      setGuardando(
        true
      );


      const esNuevo =
        modoModal ===
        "nuevo";


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
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                codigo_europeo:
                  codigo,

                lei:
                  lei ||
                  null,

                nombre:
                  nombre,

                categoria:
                  categoria,

                direccion:
                  direccion ||
                  null,
              }),
          }
        );


      const resultado =
        await leerRespuestaServidor(
          respuesta
        );


      if (!respuesta.ok) {

        throw new Error(
          resultado?.detail ||
          resultado?.message ||
          `Error HTTP ${respuesta.status}`
        );

      }


      mostrarMensaje(
        resultado?.mensaje ||
        (
          esNuevo
            ? "Entidad bancaria creada correctamente."
            : "Entidad bancaria actualizada correctamente."
        ),
        "ok"
      );


      setModalAbierto(
        false
      );

      setEntidadSeleccionada(
        null
      );


      await cargarEntidadesBancarias();

    } catch (e) {

      console.error(
        "Error guardando entidad bancaria:",
        e
      );

      mostrarMensaje(
        e?.message ||
        "No se pudo guardar la entidad bancaria.",
        "error"
      );

    } finally {

      setGuardando(
        false
      );

    }

  }


  // ==========================================================
  // ELIMINAR
  // ==========================================================

  async function eliminarEntidad(
    entidad
  ) {

    const confirmar =
      window.confirm(
        `¿Seguro que quieres eliminar la entidad "${entidad.nombre}"?\n\nLa entidad quedará inactiva en el catálogo.`
      );


    if (!confirmar) {
      return;
    }


    try {

      const respuesta =
        await fetch(
          `${API_BASE}/${entidad.id}`,
          {
            method: "DELETE",

            headers: {
              Accept:
                "application/json",
            },
          }
        );


      const resultado =
        await leerRespuestaServidor(
          respuesta
        );


      if (!respuesta.ok) {

        throw new Error(
          resultado?.detail ||
          resultado?.message ||
          `Error HTTP ${respuesta.status}`
        );

      }


      mostrarMensaje(
        resultado?.mensaje ||
        "Entidad bancaria eliminada correctamente.",
        "ok"
      );


      await cargarEntidadesBancarias();

    } catch (e) {

      console.error(
        "Error eliminando entidad bancaria:",
        e
      );

      mostrarMensaje(
        e?.message ||
        "No se pudo eliminar la entidad bancaria.",
        "error"
      );

    }

  }


  // ==========================================================
  // ABRIR IMPORTACIÓN
  // ==========================================================

  function abrirImportacionExcel() {

    setArchivoExcel(
      null
    );

    setMensaje(
      ""
    );

    setModalImportacionAbierto(
      true
    );

  }


  // ==========================================================
  // CERRAR IMPORTACIÓN
  // ==========================================================

  function cerrarImportacionExcel() {

    if (importandoExcel) {
      return;
    }

    setModalImportacionAbierto(
      false
    );

    setArchivoExcel(
      null
    );


    if (
      inputExcelRef.current
    ) {

      inputExcelRef.current.value =
        "";

    }

  }


  // ==========================================================
  // SELECCIONAR EXCEL
  // ==========================================================

  function seleccionarExcel(
    event
  ) {

    const archivo =
      event.target.files?.[0];


    if (!archivo) {

      setArchivoExcel(
        null
      );

      return;

    }


    const nombre =
      archivo.name.toLocaleLowerCase(
        "es"
      );


    const extensionValida =
      nombre.endsWith(
        ".xlsx"
      ) ||
      nombre.endsWith(
        ".xls"
      );


    if (!extensionValida) {

      mostrarMensaje(
        "Selecciona un archivo Excel válido (.xlsx o .xls).",
        "error"
      );


      event.target.value =
        "";

      setArchivoExcel(
        null
      );

      return;

    }


    setArchivoExcel(
      archivo
    );

  }


  // ==========================================================
  // QUITAR EXCEL
  // ==========================================================

  function quitarArchivoExcel() {

    if (importandoExcel) {
      return;
    }

    setArchivoExcel(
      null
    );


    if (
      inputExcelRef.current
    ) {

      inputExcelRef.current.value =
        "";

    }

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

      setImportandoExcel(
        true
      );

      setMensaje(
        ""
      );


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

            headers: {
              Accept:
                "application/json",
            },

            body:
              formulario,
          }
        );


      const resultado =
        await leerRespuestaServidor(
          respuesta
        );


      if (!respuesta.ok) {

        throw new Error(
          resultado?.detail ||
          resultado?.message ||
          `Error HTTP ${respuesta.status} al importar el Excel.`
        );

      }


      const totalExcel =
        resultado?.total_excel ??
        null;


      const procesados =
        resultado?.procesados ??
        0;


      const creados =
        resultado?.creados ??
        0;


      const actualizados =
        resultado?.actualizados ??
        0;


      const sinCambios =
        resultado?.sin_cambios ??
        0;


      const omitidos =
        resultado?.omitidos ??
        0;


      const errores =
        resultado?.errores ??
        0;


      const partes = [];


      partes.push(
        resultado?.mensaje ||
        "Excel importado correctamente."
      );


      if (
        totalExcel !== null
      ) {

        partes.push(
          `Filas Excel: ${Number(
            totalExcel
          ).toLocaleString(
            "es-ES"
          )}.`
        );

      }


      partes.push(
        `Procesados: ${Number(
          procesados
        ).toLocaleString(
          "es-ES"
        )}.`
      );


      partes.push(
        `Creados: ${Number(
          creados
        ).toLocaleString(
          "es-ES"
        )}.`
      );


      partes.push(
        `Actualizados: ${Number(
          actualizados
        ).toLocaleString(
          "es-ES"
        )}.`
      );


      if (
        sinCambios > 0
      ) {

        partes.push(
          `Sin cambios: ${Number(
            sinCambios
          ).toLocaleString(
            "es-ES"
          )}.`
        );

      }


      if (
        omitidos > 0
      ) {

        partes.push(
          `Omitidos: ${Number(
            omitidos
          ).toLocaleString(
            "es-ES"
          )}.`
        );

      }


      if (
        errores > 0
      ) {

        partes.push(
          `Errores: ${Number(
            errores
          ).toLocaleString(
            "es-ES"
          )}.`
        );

      }


      mostrarMensaje(
        partes.join(
          " "
        ),
        errores > 0
          ? "error"
          : "ok"
      );


      // ------------------------------------------------------
      // RECARGAR DATOS
      // ------------------------------------------------------

      await cargarEntidadesBancarias();


      // ------------------------------------------------------
      // CERRAR MODAL
      // ------------------------------------------------------

      setModalImportacionAbierto(
        false
      );

      setArchivoExcel(
        null
      );


      if (
        inputExcelRef.current
      ) {

        inputExcelRef.current.value =
          "";

      }

    } catch (e) {

      console.error(
        "Error importando entidades bancarias:",
        e
      );

      mostrarMensaje(
        e?.message ||
        "No se pudo importar el archivo Excel.",
        "error"
      );

    } finally {

      setImportandoExcel(
        false
      );

    }

  }


  // ==========================================================
  // FORMATEAR TAMAÑO
  // ==========================================================

  function formatearTamanoArchivo(
    bytes
  ) {

    if (!bytes) {
      return "0 KB";
    }


    const unidades = [
      "B",
      "KB",
      "MB",
      "GB",
    ];


    const indice =
      Math.min(
        Math.floor(
          Math.log(
            bytes
          ) /
          Math.log(
            1024
          )
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
        maximumFractionDigits: 2,
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

    setMensaje(
      texto
    );

    setTipoMensaje(
      tipo
    );


    window.setTimeout(
      () => {

        setMensaje(
          ""
        );

      },
      7000
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
          relative
          overflow-hidden
          rounded-[24px]
          border
          border-slate-200/80
          bg-white/80
          p-6 sm:p-7
          shadow-[0_18px_50px_rgba(15,23,42,0.08)]
          backdrop-blur-xl
        "
      >

        <div
          className="
            absolute
            inset-x-0
            top-0
            h-px
            bg-gradient-to-r
            from-transparent
            via-blue-400/60
            to-transparent
          "
        />


        <div
          className="
            relative
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
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
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-indigo-100
                bg-indigo-50
                text-2xl
                shadow-sm
              "
            >
              🏦
            </div>


            <div>

              <h1
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  text-slate-800
                  sm:text-3xl
                "
              >
                Entidades Bancarias
              </h1>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Maestro de entidades de crédito,
                instituciones financieras y datos bancarios.
              </p>

            </div>

          </div>


          {/* =================================================
              BOTONES
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-2
              sm:flex-row
            "
          >

            <button
              type="button"
              onClick={
                abrirImportacionExcel
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-5
                py-2.5
                text-sm
                font-semibold
                text-emerald-700
                shadow-sm
                transition-all
                hover:-translate-y-0.5
                hover:border-emerald-300
                hover:bg-emerald-100
                active:scale-[0.98]
              "
            >

              <span className="text-lg">
                📊
              </span>

              Importar Excel

            </button>


            <button
              type="button"
              onClick={
                abrirNuevo
              }
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
                hover:-translate-y-0.5
                hover:bg-blue-700
                active:scale-[0.98]
              "
            >

              <span className="text-lg">
                +
              </span>

              Nueva entidad

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
            px-4
            py-3
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
          ERROR
      ===================================================== */}

      {error && (

        <div
          className="
            rounded-2xl
            border
            border-red-200
            bg-red-50
            px-5
            py-4
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
          border
          border-slate-200/80
          bg-white/80
          p-5
          shadow-[0_12px_35px_rgba(15,23,42,0.06)]
          backdrop-blur-xl
        "
      >

        <div
          className="
            grid
            grid-cols-1
            gap-4
            md:grid-cols-2
            xl:grid-cols-[minmax(320px,1fr)_300px_auto]
            xl:items-end
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
                value={
                  busqueda
                }
                onChange={(e) =>
                  cambiarBusqueda(
                    e.target.value
                  )
                }
                placeholder="Código, LEI, nombre, categoría o dirección..."
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
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


          {/* CATEGORÍA */}

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
              Categoría
            </label>


            <select
              value={
                categoriaFiltro
              }
              onChange={(e) =>
                cambiarCategoria(
                  e.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border
                border-slate-200
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
                Todas las categorías
              </option>


              {categoriasDisponibles.map(
                (categoria) => (

                  <option
                    key={
                      categoria
                    }
                    value={
                      categoria
                    }
                  >
                    {categoria}
                  </option>

                )
              )}

            </select>

          </div>


          {/* LIMPIAR */}

          <button
            type="button"
            onClick={
              limpiarFiltros
            }
            className="
              rounded-xl
              border
              border-slate-200
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
            {entidadesFiltradas.length.toLocaleString(
              "es-ES"
            )}
          </span>

          {" "}entidades


          {entidadesFiltradas.length !==
            entidades.length && (

            <>
              {" "}de{" "}

              <span
                className="
                  font-semibold
                  text-slate-700
                "
              >
                {entidades.length.toLocaleString(
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
          border
          border-slate-200/80
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

              Cargando entidades bancarias...

            </div>

          </div>

        ) : entidadesPagina.length === 0 ? (

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
              🏦
            </div>


            <h3
              className="
                text-base
                font-semibold
                text-slate-700
              "
            >
              No se han encontrado entidades
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
                min-w-[1250px]
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
                      w-[140px]
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
                    Código Europeo
                  </th>


                  <th
                    className="
                      w-[220px]
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
                    LEI
                  </th>


                  <th
                    className="
                      min-w-[280px]
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
                    Nombre
                  </th>


                  <th
                    className="
                      w-[190px]
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
                    Categoría
                  </th>


                  <th
                    className="
                      min-w-[350px]
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
                    Dirección
                  </th>


                  <th
                    className="
                      w-[130px]
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

                {entidadesPagina.map(
                  (entidad) => (

                    <tr
                      key={
                        entidad.id
                      }
                      className="
                        group
                        border-b
                        border-slate-100
                        transition-colors
                        hover:bg-blue-50/40
                      "
                    >

                      {/* CÓDIGO */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                        "
                      >

                        <span
                          className="
                            inline-flex
                            rounded-lg
                            border
                            border-indigo-100
                            bg-indigo-50
                            px-2.5
                            py-1
                            font-mono
                            text-xs
                            font-semibold
                            text-indigo-700
                          "
                        >
                          {entidad.codigo_europeo}
                        </span>

                      </td>


                      {/* LEI */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          text-xs
                          text-slate-500
                        "
                      >

                        {entidad.lei ? (

                          <span
                            className="
                              font-mono
                            "
                          >
                            {entidad.lei}
                          </span>

                        ) : (

                          <span
                            className="
                              italic
                              text-slate-300
                            "
                          >
                            Sin LEI
                          </span>

                        )}

                      </td>


                      {/* NOMBRE */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                        "
                      >

                        <div
                          className="
                            text-sm
                            font-semibold
                            leading-5
                            text-slate-700
                          "
                        >
                          {entidad.nombre}
                        </div>

                      </td>


                      {/* CATEGORÍA */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                        "
                      >

                        <span
                          className="
                            inline-flex
                            rounded-full
                            border
                            border-slate-200
                            bg-slate-50
                            px-3
                            py-1
                            text-xs
                            font-medium
                            text-slate-600
                          "
                        >
                          {entidad.categoria}
                        </span>

                      </td>


                      {/* DIRECCIÓN */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          text-sm
                          leading-5
                          text-slate-500
                        "
                      >

                        {entidad.direccion || (

                          <span
                            className="
                              italic
                              text-slate-300
                            "
                          >
                            Sin dirección
                          </span>

                        )}

                      </td>


                      {/* ACCIONES */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
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
                                entidad
                              )
                            }
                            title="Editar entidad bancaria"
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
                              eliminarEntidad(
                                entidad
                              )
                            }
                            title="Eliminar entidad bancaria"
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
        entidadesFiltradas.length > 0 && (

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
            disabled={
              pagina <= 1
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
              rounded-lg
              border
              border-slate-200
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
              pagina >=
              totalPaginas
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
              border
              border-slate-200
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
          MODAL ENTIDAD
      ===================================================== */}

      {modalAbierto && (

        <ModalEntidadBancaria
          modo={
            modoModal
          }
          entidad={
            entidadSeleccionada
          }
          guardando={
            guardando
          }
          onCerrar={
            cerrarModal
          }
          onGuardar={
            guardarEntidad
          }
        />

      )}


      {/* =====================================================
          MODAL IMPORTACIÓN
      ===================================================== */}

      {modalImportacionAbierto && (

        <ModalImportarExcel
          archivo={
            archivoExcel
          }
          inputExcelRef={
            inputExcelRef
          }
          importando={
            importandoExcel
          }
          onSeleccionar={
            seleccionarExcel
          }
          onQuitar={
            quitarArchivoExcel
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
  onQuitar,
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
          e.target ===
            e.currentTarget &&
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

        {/* CABECERA */}

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
                  border
                  border-emerald-100
                  bg-emerald-50
                  text-xl
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
                  Importar entidades bancarias desde Excel
                </h2>


                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Carga masiva del catálogo financiero.
                </p>

              </div>

            </div>


            <button
              type="button"
              disabled={
                importando
              }
              onClick={
                onCerrar
              }
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


        {/* CONTENIDO */}

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

              <div className="text-lg">
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
                  <strong> Código Europeo</strong>,
                  <strong> LEI</strong>,
                  <strong> Nombre</strong>,
                  <strong> Categoría</strong> y
                  <strong> Dirección</strong>.
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
              ref={
                inputExcelRef
              }
              type="file"
              accept="
                .xlsx,
                .xls,
                application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
                application/vnd.ms-excel
              "
              onChange={
                onSeleccionar
              }
              disabled={
                importando
              }
              className="hidden"
            />


            <button
              type="button"
              disabled={
                importando
              }
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


          {/* ARCHIVO */}

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


                <div
                  className="
                    min-w-0
                  "
                >

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
                  onClick={
                    onQuitar
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


        {/* BOTONES */}

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
            disabled={
              importando
            }
            onClick={
              onCerrar
            }
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
            onClick={
              onImportar
            }
            className="
              inline-flex
              min-w-[190px]
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
              : "Importar entidades"}

          </button>

        </div>

      </div>

    </div>

  );

}


/* ============================================================
   MODAL ENTIDAD BANCARIA
============================================================ */

function ModalEntidadBancaria({
  modo,
  entidad,
  guardando,
  onCerrar,
  onGuardar
}) {

  const [
    formulario,
    setFormulario
  ] = useState({
    id:
      entidad?.id,

    codigo_europeo:
      entidad?.codigo_europeo ||
      "",

    lei:
      entidad?.lei ||
      "",

    nombre:
      entidad?.nombre ||
      "",

    categoria:
      entidad?.categoria ||
      "",

    direccion:
      entidad?.direccion ||
      "",
  });


  function cambiarCampo(
    campo,
    valor
  ) {

    setFormulario(
      (actual) => ({
        ...actual,
        [campo]:
          valor,
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
          e.target ===
            e.currentTarget &&
          !guardando
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
                {modo ===
                "nuevo"
                  ? "Nueva entidad bancaria"
                  : "Editar entidad bancaria"}
              </h2>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Datos identificativos y financieros de la entidad.
              </p>

            </div>


            <button
              type="button"
              disabled={
                guardando
              }
              onClick={
                onCerrar
              }
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
                disabled:opacity-50
              "
            >
              ✕
            </button>

          </div>

        </div>


        {/* FORMULARIO */}

        <form
          onSubmit={
            enviar
          }
          className="p-6"
        >

          <div className="space-y-4">

            {/* FILA 1 */}

            <div
              className="
                grid
                grid-cols-1
                gap-4
                sm:grid-cols-2
              "
            >

              {/* CÓDIGO EUROPEO */}

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
                  Código Europeo *
                </label>


                <input
                  type="text"
                  value={
                    formulario.codigo_europeo
                  }
                  onChange={(e) =>
                    cambiarCampo(
                      "codigo_europeo",
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="Ej. ES0241"
                  maxLength={50}
                  autoFocus
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-2.5
                    font-mono
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


              {/* LEI */}

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
                  LEI
                </label>


                <input
                  type="text"
                  value={
                    formulario.lei
                  }
                  onChange={(e) =>
                    cambiarCampo(
                      "lei",
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="Código LEI"
                  maxLength={50}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-2.5
                    font-mono
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


            {/* NOMBRE */}

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
                Nombre *
              </label>


              <input
                type="text"
                value={
                  formulario.nombre
                }
                onChange={(e) =>
                  cambiarCampo(
                    "nombre",
                    e.target.value
                  )
                }
                placeholder="Nombre completo de la entidad"
                maxLength={250}
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
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


            {/* CATEGORÍA */}

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
                Categoría *
              </label>


              <input
                type="text"
                list="categorias-entidades-bancarias"
                value={
                  formulario.categoria
                }
                onChange={(e) =>
                  cambiarCampo(
                    "categoria",
                    e.target.value
                  )
                }
                placeholder="Ej. Entidad de crédito"
                maxLength={150}
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
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


              <datalist
                id="categorias-entidades-bancarias"
              >

                <option value="Entidad de crédito" />
                <option value="Otra institución" />

              </datalist>

            </div>


            {/* DIRECCIÓN */}

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
                Dirección
              </label>


              <textarea
                value={
                  formulario.direccion
                }
                onChange={(e) =>
                  cambiarCampo(
                    "direccion",
                    e.target.value
                  )
                }
                placeholder="Dirección completa"
                maxLength={400}
                rows={3}
                className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  leading-5
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
              disabled={
                guardando
              }
              onClick={
                onCerrar
              }
              className="
                rounded-xl
                border
                border-slate-200
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
              disabled={
                guardando
              }
              className="
                inline-flex
                min-w-[150px]
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
                : modo ===
                  "nuevo"
                  ? "Crear entidad"
                  : "Guardar cambios"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}
