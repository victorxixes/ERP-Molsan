import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";

/**
 * ============================================================
 * ENTIDADES BANCARIAS
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


  const [
    ordenColumna,
    setOrdenColumna
  ] = useState("nombre");


  const [
    ordenAscendente,
    setOrdenAscendente
  ] = useState(true);


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
              entidades.find((e) => Number(e.id) === Number(entidad.entidad_actual_id))?.nombre,
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


  function nombreEntidadActual(entidad) {
    if (!entidad?.entidad_actual_id) return "";
    return entidades.find((e) => Number(e.id) === Number(entidad.entidad_actual_id))?.nombre || "";
  }


  const entidadesOrdenadas = useMemo(() => {
    const copia = [...entidadesFiltradas];
    copia.sort((a, b) => {
      const valorA = ordenColumna === "entidad_actual"
        ? nombreEntidadActual(a)
        : (a[ordenColumna] ?? "");
      const valorB = ordenColumna === "entidad_actual"
        ? nombreEntidadActual(b)
        : (b[ordenColumna] ?? "");
      const comparacion = String(valorA).localeCompare(String(valorB), "es", {
        numeric: true,
        sensitivity: "base",
      });
      return ordenAscendente ? comparacion : -comparacion;
    });
    return copia;
  }, [entidadesFiltradas, ordenColumna, ordenAscendente, entidades]);


  function ordenarPor(columna) {
    if (ordenColumna === columna) {
      setOrdenAscendente((actual) => !actual);
    } else {
      setOrdenColumna(columna);
      setOrdenAscendente(true);
    }
    setPagina(1);
  }


  function descargarExcel() {
    const escapar = (valor) => String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const filas = entidadesOrdenadas.map((entidad) => [
      entidad.codigo_europeo,
      entidad.lei,
      entidad.nombre,
      entidad.categoria,
      nombreEntidadActual(entidad) || "Sin cambio",
      entidad.direccion,
    ]);

    const cabeceras = [
      "Código Europeo",
      "LEI",
      "Nombre",
      "Categoría",
      "Entidad actual",
      "Dirección",
    ];

    const tabla = [
      "<table><thead><tr>",
      ...cabeceras.map((valor) => `<th>${escapar(valor)}</th>`),
      "</tr></thead><tbody>",
      ...filas.map((fila) => `<tr>${fila.map((valor) => `<td>${escapar(valor)}</td>`).join("")}</tr>`),
      "</tbody></table>",
    ].join("");

    // Excel abre este libro HTML como hoja de cálculo .xls, sin depender de librerías externas.
    const contenido = `<html><head><meta charset="UTF-8"></head><body>${tabla}</body></html>`;
    const blob = new Blob(["\uFEFF", contenido], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "catalogo_entidades_bancarias.xls";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }


  const entidadesPagina =
    entidadesOrdenadas.slice(
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
      entidad_actual_id: "",
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
                  codigo || null,

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

                entidad_actual_id:
                  datos.entidad_actual_id
                    ? Number(datos.entidad_actual_id)
                    : null,
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


      if (esNuevo) {
        setBusqueda(codigo);
        setCategoriaFiltro("");
        setPagina(1);
      }

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
      className="erp-page min-w-0 space-y-6"
    >

      <MolsanPageHeader mark="EB" title="Entidades bancarias" description="Maestro de entidades de crédito, instituciones financieras y datos bancarios." />
      <div className="molsan-filter-bar flex flex-wrap justify-end gap-2 p-3">
        <button type="button" onClick={abrirImportacionExcel} className="molsan-btn molsan-btn--secondary">📊 Importar Excel</button>
        <button type="button" onClick={descargarExcel} disabled={cargando || entidadesOrdenadas.length === 0} title="Descargar el catálogo filtrado en Excel" className="molsan-btn molsan-btn--secondary"><span className="molsan-export-excel__icon" aria-hidden="true">📗</span> Exportar a Excel</button>
        <button type="button" onClick={abrirNuevo} className="molsan-btn molsan-btn--primary">＋ Nueva entidad</button>
      </div>

          MENSAJE
      ===================================================== */}

      {mensaje && (

        <div
          className={`erp-alert px-4
 py-3
 
 
 ${
 tipoMensaje === "error"
 ? ""
 : ""
 }`}
        >
          {mensaje}
        </div>

      )}


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (

        <div
          className="erp-alert erp-alert-danger px-5
 py-4"
        >
          {error}
        </div>

      )}


      {/* =====================================================
          FILTROS
      ===================================================== */}

      <div
        className="molsan-filter-bar p-5"
      >

        <div
          className="grid
 grid-cols-1
 gap-4
 md:grid-cols-2
 xl:grid-cols-[minmax(320px,1fr)_300px_auto]
 xl:items-end"
        >

          {/* BUSCADOR */}

          <div>

            <label
              className="mb-1.5
 block
 
 
 uppercase"
            >
              Buscar
            </label>


            <div className="relative">

              <span
                className="pointer-events-none
 absolute
 left-3
 top-1/2"
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
                className="w-full
 
 
 
 
 py-2.5
 pl-10
 pr-4"
              />

            </div>

          </div>


          {/* CATEGORÍA */}

          <div>

            <label
              className="mb-1.5
 block
 
 
 uppercase"
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
              className="w-full
 
 
 
 
 px-3
 py-2.5"
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
            className="px-4
 py-2.5"
          >
            Limpiar filtros
          </button>

        </div>

      </div>


      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div
        className="flex
 flex-col
 gap-2
 sm:flex-row
 sm:items-center
 sm:justify-between"
      >

        <div
         
        >

          Mostrando{" "}

          <span
           
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
               
              >
                {entidades.length.toLocaleString(
                  "es-ES"
                )}
              </span>
            </>

          )}

        </div>


        <div
         
        >
          Página {pagina} de {totalPaginas}
        </div>

      </div>


      {/* =====================================================
          TABLA
      ===================================================== */}

      <div
        className="overflow-hidden"
      >

        {cargando ? (

          <div
            className="flex
 min-h-[300px]
 items-center
 justify-center"
          >

            <div>

              <div
                className="mx-auto
 mb-3
 h-8
 w-8"
              />

              Cargando entidades bancarias...

            </div>

          </div>

        ) : entidadesPagina.length === 0 ? (

          <div
            className="flex
 min-h-[300px]
 flex-col
 items-center
 justify-center
 px-6"
          >

            <div
              className="mb-3
 flex
 h-14
 w-14
 items-center
 justify-center"
            >
              🏦
            </div>


            <h3
             
            >
              No se han encontrado entidades
            </h3>


            <p
              className="mt-1"
            >
              Prueba con otro texto o limpia los filtros.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table
              className="w-full
 min-w-[1250px]"
            >

              <thead>

                <tr
                 
                >

                  <th
                    className="w-[140px]
 px-5
 py-3.5
 
 
 
 uppercase"
                  >
                    <button type="button" onClick={() => ordenarPor("codigo_europeo")} className="inline-flex items-center gap-1.5" title="Ordenar por Código Europeo">
                      Código Europeo
                      <span aria-hidden="true">{ordenColumna === "codigo_europeo" ? (ordenAscendente ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>


                  <th
                    className="w-[220px]
 px-5
 py-3.5
 
 
 
 uppercase"
                  >
                    <button type="button" onClick={() => ordenarPor("lei")} className="inline-flex items-center gap-1.5" title="Ordenar por LEI">
                      LEI
                      <span aria-hidden="true">{ordenColumna === "lei" ? (ordenAscendente ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>


                  <th
                    className="min-w-[280px]
 px-5
 py-3.5
 
 
 
 uppercase"
                  >
                    <button type="button" onClick={() => ordenarPor("nombre")} className="inline-flex items-center gap-1.5" title="Ordenar por Nombre">
                      Nombre
                      <span aria-hidden="true">{ordenColumna === "nombre" ? (ordenAscendente ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>


                  <th
                    className="w-[190px]
 px-5
 py-3.5
 
 
 
 uppercase"
                  >
                    <button type="button" onClick={() => ordenarPor("categoria")} className="inline-flex items-center gap-1.5" title="Ordenar por Categoría">
                      Categoría
                      <span aria-hidden="true">{ordenColumna === "categoria" ? (ordenAscendente ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>


                  <th
                    className="min-w-[220px]
 px-5
 py-3.5
 
 
 
 uppercase"
                  >
                    <button type="button" onClick={() => ordenarPor("entidad_actual")} className="inline-flex items-center gap-1.5" title="Ordenar por Entidad actual">
                      Entidad actual
                      <span aria-hidden="true">{ordenColumna === "entidad_actual" ? (ordenAscendente ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>

                  <th
                    className="min-w-[350px]
 px-5
 py-3.5
 
 
 
 uppercase"
                  >
                    <button type="button" onClick={() => ordenarPor("direccion")} className="inline-flex items-center gap-1.5" title="Ordenar por Dirección">
                      Dirección
                      <span aria-hidden="true">{ordenColumna === "direccion" ? (ordenAscendente ? "↑" : "↓") : "↕"}</span>
                    </button>
                  </th>


                  <th
                    className="w-[130px]
 px-5
 py-3.5
 
 
 
 uppercase"
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
                      className="group"
                    >

                      {/* CÓDIGO */}

                      <td
                        className="px-5
 py-3.5
 align-top"
                      >

                        <span
                          className="inline-flex
 
 
 
 
 px-2.5
 py-1"
                        >
                          {entidad.codigo_europeo}
                        </span>

                      </td>


                      {/* LEI */}

                      <td
                        className="px-5
 py-3.5
 align-top"
                      >

                        {entidad.lei ? (

                          <span
                           
                          >
                            {entidad.lei}
                          </span>

                        ) : (

                          <span
                           
                          >
                            Sin LEI
                          </span>

                        )}

                      </td>


                      {/* NOMBRE */}

                      <td
                        className="px-5
 py-3.5
 align-top"
                      >

                        <div
                         
                        >
                          {entidad.nombre}
                        </div>

                      </td>


                      {/* CATEGORÍA */}

                      <td
                        className="px-5
 py-3.5
 align-top"
                      >

                        <span
                          className="inline-flex
 
 
 
 
 px-3
 py-1"
                        >
                          {entidad.categoria}
                        </span>

                      </td>


                      {/* ENTIDAD ACTUAL */}

                      <td
                        className="px-5 py-3.5 align-top"
                      >
                        {entidad.entidad_actual_id
                          ? (nombreEntidadActual(entidad) || "Entidad no disponible")
                          : <span>Sin cambio</span>}
                      </td>


                      {/* DIRECCIÓN */}

                      <td
                        className="px-5
 py-3.5
 align-top"
                      >

                        {entidad.direccion || (

                          <span
                           
                          >
                            Sin dirección
                          </span>

                        )}

                      </td>


                      {/* ACCIONES */}

                      <td
                        className="px-5
 py-3.5
 align-top"
                      >

                        <div
                          className="flex
 justify-end
 gap-2"
                        >

                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                entidad
                              )
                            }
                            title="Editar entidad bancaria"
                            className="flex
 h-9
 w-9
 items-center
 justify-center"
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
                            className="flex
 h-9
 w-9
 items-center
 justify-center"
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
          className="flex
 items-center
 justify-between
 
 
 
 
 px-4
 py-3"
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
            className="px-3
 py-2"
          >
            ← Anterior
          </button>


          <span
           
          >

            Página{" "}

            <strong
             
            >
              {pagina}
            </strong>

            {" "}de{" "}

            <strong
             
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
            className="px-3
 py-2"
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
          entidades={entidades}
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
  const dialogRef = useRef(null);
  useAccessibleDialog({
    open: true,
    onClose: () => { if (!importando) onCerrar?.(); },
    dialogRef,
  });

  return (

    <div
      className="panel-modal-premium
 fixed
 inset-0
 z-50
 flex
 items-center
 justify-center
 
 p-4"
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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Importar entidades bancarias desde Excel"
        className="w-full
 max-w-2xl
 overflow-hidden"
      >

        {/* CABECERA */}

        <div
          className="px-6
 py-5"
        >

          <div
            className="flex
 items-center
 justify-between"
          >

            <div
              className="flex
 items-center
 gap-3"
            >

              <div
                className="flex
 h-11
 w-11
 items-center
 justify-center"
              >
                📊
              </div>


              <div>

                <h2
                 
                >
                  Importar entidades bancarias desde Excel
                </h2>


                <p
                  className="mt-1"
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
              className="flex
 h-9
 w-9
 items-center
 justify-center"
            >
              ✕
            </button>

          </div>

        </div>


        {/* CONTENIDO */}

        <div className="p-6">

          {/* INFORMACIÓN */}

          <div
            className="px-4
 py-4"
          >

            <div
              className="flex
 gap-3"
            >

              <div>
                ℹ️
              </div>


              <div>

                <p
                 
                >
                  Formato esperado
                </p>


                <p
                  className="mt-1"
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
              className="mb-2
 block"
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
              className="w-full
 
 
 
 
 
 px-6
 py-8"
            >

              <div
                className="mx-auto
 flex
 h-14
 w-14
 items-center
 justify-center"
              >
                📁
              </div>


              <p
                className="mt-3"
              >
                Haz clic para seleccionar el Excel
              </p>


              <p
                className="mt-1"
              >
                Formatos admitidos: .xlsx y .xls
              </p>

            </button>

          </div>


          {/* ARCHIVO */}

          {archivo && (

            <div
              className="mt-4
 flex
 items-center
 justify-between
 gap-4
 
 
 
 
 px-4
 py-3"
            >

              <div
                className="flex
 min-w-0
 items-center
 gap-3"
              >

                <div
                  className="flex
 h-10
 w-10
 shrink-0
 items-center
 justify-center"
                >
                  📄
                </div>


                <div
                  className="min-w-0"
                >

                  <p
                    className="truncate"
                  >
                    {archivo.name}
                  </p>


                  <p
                    className="mt-0.5"
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
                  className="shrink-0
 
 px-2
 py-1"
                >
                  Quitar
                </button>

              )}

            </div>

          )}

        </div>


        {/* BOTONES */}

        <div
          className="flex
 justify-end
 gap-3
 
 
 px-6
 py-5"
        >

          <button
            type="button"
            disabled={
              importando
            }
            onClick={
              onCerrar
            }
            className="px-5
 py-2.5"
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
            className="inline-flex
 min-w-[190px]
 items-center
 justify-center
 gap-2
 
 
 px-5
 py-2.5"
          >

            {importando && (

              <span
                className="h-4
 w-4"
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
  entidades = [],
  modo,
  entidad,
  guardando,
  onCerrar,
  onGuardar
}) {
  const dialogRef = useRef(null);
  useAccessibleDialog({
    open: true,
    onClose: () => { if (!guardando) onCerrar?.(); },
    dialogRef,
  });

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

    entidad_actual_id:
      entidad?.entidad_actual_id
        ? String(entidad.entidad_actual_id)
        : "",
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
      className="panel-modal-premium
 fixed
 inset-0
 z-50
 flex
 items-center
 justify-center
 
 p-4"
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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={modo === "nuevo" ? "Nueva entidad bancaria" : "Editar entidad bancaria"}
        className="w-full
 max-w-2xl
 overflow-hidden"
      >

        {/* CABECERA */}

        <div
          className="px-6
 py-5"
        >

          <div
            className="flex
 items-center
 justify-between"
          >

            <div>

              <h2
               
              >
                {modo ===
                "nuevo"
                  ? "Nueva entidad bancaria"
                  : "Editar entidad bancaria"}
              </h2>


              <p
                className="mt-1"
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
              className="flex
 h-9
 w-9
 items-center
 justify-center"
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
              className="grid
 grid-cols-1
 gap-4
 sm:grid-cols-2"
            >

              {/* CÓDIGO EUROPEO */}

              <div>

                <label
                  className="mb-1.5
 block"
                >
                  Código Europeo (opcional)
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
                  placeholder="Puedes dejarlo vacío"
                  maxLength={50}
                  autoFocus
                  className="w-full
 
 
 
 
 px-4
 py-2.5"
                />

              </div>


              {/* LEI */}

              <div>

                <label
                  className="mb-1.5
 block"
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
                  className="w-full
 
 
 
 
 px-4
 py-2.5"
                />

              </div>

            </div>


            {/* NOMBRE */}

            <div>

              <label
                className="mb-1.5
 block"
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
                className="w-full
 
 
 
 
 px-4
 py-2.5"
              />

            </div>


            {/* CATEGORÍA */}

            <div>

              <label
                className="mb-1.5
 block"
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
                className="w-full
 
 
 
 
 px-4
 py-2.5"
              />


              <datalist
                id="categorias-entidades-bancarias"
              >

                <option value="Entidad de crédito" />
                <option value="Otra institución" />

              </datalist>

            </div>


            {/* ENTIDAD ACTUAL */}

            <div>
              <label className="mb-1.5 block">
                Entidad actual
              </label>
              <select
                value={formulario.entidad_actual_id}
                onChange={(e) => cambiarCampo("entidad_actual_id", e.target.value)}
                className="w-full px-4 py-2.5"
              >
                <option value="">La misma entidad / no especificada</option>
                {entidades
                  .filter((e) => Number(e.id) !== Number(formulario.id))
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
              </select>
              <p className="mt-1">Si esta entidad fue absorbida o cambió de nombre, selecciona aquí la entidad sucesora.</p>
            </div>


            {/* DIRECCIÓN */}

            <div>

              <label
                className="mb-1.5
 block"
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
                className="w-full
 resize-none
 
 
 
 
 px-4
 py-2.5"
              />

            </div>

          </div>


          {/* BOTONES */}

          <div
            className="mt-7
 flex
 justify-end
 gap-3
 
 
 pt-5"
          >

            <button
              type="button"
              disabled={
                guardando
              }
              onClick={
                onCerrar
              }
              className="px-4
 py-2.5"
            >
              Cancelar
            </button>


            <button
              type="submit"
              disabled={
                guardando
              }
              className="inline-flex
 min-w-[150px]
 items-center
 justify-center
 gap-2
 
 
 px-5
 py-2.5"
            >

              {guardando && (

                <span
                  className="h-4
 w-4"
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
