import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

/**
 * ============================================================
 * MUNICIPIOS
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
 * Campo multipart:
 *
 * fichero = archivo Excel
 *
 * ============================================================
 */


/* ============================================================
   BACKEND
   IMPORTANTE:
   El frontend y el backend están en servicios Render distintos.
============================================================ */

const API_BASE = `${(import.meta.env.VITE_API_URL || "https://agenda-intranet-b.onrender.com/api").replace(/\/+$/, "")}/municipios`;

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
     JSON normal
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
        "El servidor devolvió una respuesta JSON no válida."
      );

    }

  }


  /* ----------------------------------------------------------
     Intentar JSON aunque el servidor no haya enviado
     correctamente el Content-Type.
  ---------------------------------------------------------- */

  try {

    return JSON.parse(
      contenido
    );

  } catch {

    /* --------------------------------------------------------
       Detectar HTML
    -------------------------------------------------------- */

    if (
      contenido.trimStart().startsWith(
        "<"
      )
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

export default function Municipios() {


  // ==========================================================
  // DATOS
  // ==========================================================

  const [municipios, setMunicipios] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");


  // ==========================================================
  // FILTROS
  // ==========================================================

  const [busqueda, setBusqueda] =
    useState("");

  const [ccaaFiltro, setCcaaFiltro] =
    useState("");

  const [provinciaFiltro, setProvinciaFiltro] =
    useState("");


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const [pagina, setPagina] =
    useState(1);


  // ==========================================================
  // MODAL MUNICIPIO
  // ==========================================================

  const [modalAbierto, setModalAbierto] =
    useState(false);

  const [modoModal, setModoModal] =
    useState("nuevo");

  const [municipioSeleccionado, setMunicipioSeleccionado] =
    useState(null);


  // ==========================================================
  // MENSAJES
  // ==========================================================

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [tipoMensaje, setTipoMensaje] =
    useState("ok");


  // ==========================================================
  // IMPORTACIÓN EXCEL
  // ==========================================================

  const [modalImportacionAbierto, setModalImportacionAbierto] =
    useState(false);

  const [archivoExcel, setArchivoExcel] =
    useState(null);

  const [importandoExcel, setImportandoExcel] =
    useState(false);

  const [importandoCodigosNacionales, setImportandoCodigosNacionales] =
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
        await fetch(
          API_BASE,
          {
            method: "GET",
            headers: {
              Accept: "application/json"
            }
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


      setMunicipios(
        lista
      );

    } catch (e) {

      console.error(
        "Error cargando municipios:",
        e
      );

      setMunicipios([]);

      setError(
        e?.message ||
        "No se pudieron cargar los municipios."
      );

    } finally {

      setCargando(false);

    }

  }


  async function cargarCodigosPostalesNacionales() {
    const confirmado = window.confirm(
      "Se consultará el catálogo nacional derivado de datos abiertos del INE y se añadirán códigos postales a los municipios existentes. Los códigos principales ya definidos se conservarán. ¿Continuar?"
    );
    if (!confirmado) return;

    try {
      setImportandoCodigosNacionales(true);
      setError("");
      const respuesta = await fetch(API_BASE + "/importar-codigos-postales", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const resultado = await leerRespuestaServidor(respuesta);
      if (!respuesta.ok) {
        throw new Error(resultado?.detail || `Error HTTP ${respuesta.status}`);
      }
      mostrarMensaje(
        `Carga completada: ${resultado.relaciones_nuevas || 0} códigos postales añadidos en ${resultado.municipios_actualizados || 0} municipios. Filas consultadas: ${resultado.filas_fuente || 0}.`,
        "ok"
      );
      await cargarMunicipios();
    } catch (e) {
      mostrarMensaje(e?.message || "No se pudo cargar el catálogo nacional de códigos postales.", "error");
    } finally {
      setImportandoCodigosNacionales(false);
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
    useMemo(
      () => {

        return [
          ...new Set(
            municipios
              .map(
                (m) =>
                  m.ccaa
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

      },
      [
        municipios
      ]
    );


  // ==========================================================
  // LISTA DE PROVINCIAS
  // ==========================================================

  const provinciasDisponibles =
    useMemo(
      () => {

        let datos =
          municipios;


        if (ccaaFiltro) {

          datos =
            datos.filter(
              (m) =>
                m.ccaa ===
                ccaaFiltro
            );

        }


        return [
          ...new Set(
            datos
              .map(
                (m) =>
                  m.provincia
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

      },
      [
        municipios,
        ccaaFiltro
      ]
    );


  // ==========================================================
  // BÚSQUEDA + FILTROS
  // ==========================================================

  const municipiosFiltrados =
    useMemo(
      () => {

        const texto =
          busqueda
            .trim()
            .toLocaleLowerCase(
              "es"
            );


        return municipios.filter(
          (municipio) => {

            const coincideTexto =
              !texto ||
              [
                municipio.ccaa,
                municipio.provincia,
                municipio.municipio,
                ...(municipio.codigos_postales || [])
              ]
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


            const coincideCcaa =
              !ccaaFiltro ||
              municipio.ccaa ===
                ccaaFiltro;


            const coincideProvincia =
              !provinciaFiltro ||
              municipio.provincia ===
                provinciaFiltro;


            return (
              coincideTexto &&
              coincideCcaa &&
              coincideProvincia
            );

          }
        );

      },
      [
        municipios,
        busqueda,
        ccaaFiltro,
        provinciaFiltro
      ]
    );


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const municipiosOrdenables = useMemo(
    () => municipiosFiltrados.map((municipio) => ({
      ...municipio,
      _codigosPostalesOrden: municipio.codigo_postal_principal || municipio.codigos_postales?.[0] || "",
    })),
    [municipiosFiltrados]
  );
  const ordenMunicipios = useSortableData(municipiosOrdenables);

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        municipiosFiltrados.length /
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
    totalPaginas
  ]);


  const municipiosPagina =
    ordenMunicipios.items.slice(
      (pagina - 1) *
        FILAS_POR_PAGINA,

      pagina *
        FILAS_POR_PAGINA
    );


  // ==========================================================
  // CAMBIAR BÚSQUEDA
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
  // CAMBIAR CCAA
  // ==========================================================

  function cambiarCcaa(
    valor
  ) {

    setCcaaFiltro(
      valor
    );

    setProvinciaFiltro(
      ""
    );

    setPagina(
      1
    );

  }


  // ==========================================================
  // CAMBIAR PROVINCIA
  // ==========================================================

  function cambiarProvincia(
    valor
  ) {

    setProvinciaFiltro(
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
    municipio
  ) {

    setMunicipioSeleccionado({
      ...municipio
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

    setMunicipioSeleccionado(
      null
    );

  }


  // ==========================================================
  // GUARDAR MUNICIPIO
  // ==========================================================

  async function guardarMunicipio(
    datos
  ) {

    if (
      !datos.ccaa?.trim()
    ) {

      mostrarMensaje(
        "La comunidad autónoma es obligatoria.",
        "error"
      );

      return;

    }


    if (
      !datos.provincia?.trim()
    ) {

      mostrarMensaje(
        "La provincia es obligatoria.",
        "error"
      );

      return;

    }


    if (
      !datos.municipio?.trim()
    ) {

      mostrarMensaje(
        "El municipio es obligatorio.",
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
                "application/json"
            },

            body:
              JSON.stringify({
                ccaa: datos.ccaa.trim(),
                provincia: datos.provincia.trim(),
                municipio: datos.municipio.trim(),
                codigos_postales: datos.codigos_postales || [],
                codigo_postal_principal: datos.codigo_postal_principal || null
              })
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
            ? "Municipio creado correctamente."
            : "Municipio actualizado correctamente."
        ),
        "ok"
      );


      setModalAbierto(
        false
      );

      setMunicipioSeleccionado(
        null
      );


      await cargarMunicipios();

    } catch (e) {

      console.error(
        "Error guardando municipio:",
        e
      );

      mostrarMensaje(
        e?.message ||
        "No se pudo guardar el municipio.",
        "error"
      );

    } finally {

      setGuardando(
        false
      );

    }

  }


  // ==========================================================
  // ELIMINAR MUNICIPIO
  // ==========================================================

  async function eliminarMunicipio(
    municipio
  ) {

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
            method: "DELETE",
            headers: {
              Accept:
                "application/json"
            }
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
        e?.message ||
        "No se pudo eliminar el municipio.",
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
  // QUITAR EXCEL SELECCIONADO
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
            body: formulario,
            headers: {
              Accept:
                "application/json"
            }
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


      /* ------------------------------------------------------
         CONTADORES DEL BACKEND
      ------------------------------------------------------ */

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


      /* ------------------------------------------------------
         MENSAJE DE RESULTADO
      ------------------------------------------------------ */

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


      /* ------------------------------------------------------
         RECARGAR CATÁLOGO
      ------------------------------------------------------ */

      await cargarMunicipios();


      /* ------------------------------------------------------
         CERRAR MODAL
      ------------------------------------------------------ */

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
        "Error importando municipios desde Excel:",
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
      "GB"
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

      <MolsanPageHeader mark="MU" title="Municipios" description="Maestro de comunidades autónomas, provincias y municipios." />
      <div className="molsan-filter-bar flex flex-wrap justify-end gap-2 p-3">
        <button type="button" className="molsan-btn molsan-btn--secondary" onClick={cargarCodigosPostalesNacionales} disabled={importandoCodigosNacionales} title="Cargar códigos postales desde datos abiertos derivados del INE">{importandoCodigosNacionales ? "Cargando códigos…" : "📮 Cargar códigos postales de España"}</button>
        <button type="button" className="molsan-btn molsan-btn--secondary" onClick={abrirImportacionExcel}>📊 Importar Excel</button>
        <button type="button" className="molsan-btn molsan-btn--primary" onClick={abrirNuevo}>＋ Nuevo municipio</button>
      </div>


      {mensaje && (

        <div
          className={`px-4 py-3
 
 
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
          ERROR CARGA
      ===================================================== */}

      {error && (

        <div
          className="px-5 py-4"
        >
          {error}
        </div>

      )}


      {/* =====================================================
          FILTROS
      ===================================================== */}

      <div
        className="p-5"
      >

        <div
          className="grid
 grid-cols-1
 md:grid-cols-2
 xl:grid-cols-[minmax(280px,1fr)_240px_240px_auto]
 gap-4
 items-end"
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
                placeholder="Municipio, provincia o CCAA..."
                className="w-full
 
 
 
 py-2.5
 pl-10
 pr-4"
              />

            </div>

          </div>


          {/* CCAA */}

          <div>

            <label
              className="mb-1.5
 block
 
 
 uppercase"
            >
              Comunidad autónoma
            </label>


            <select
              value={
                ccaaFiltro
              }
              onChange={(e) =>
                cambiarCcaa(
                  e.target.value
                )
              }
              className="w-full
 
 
 
 px-3
 py-2.5"
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
              className="mb-1.5
 block
 
 
 uppercase"
            >
              Provincia
            </label>


            <select
              value={
                provinciaFiltro
              }
              onChange={(e) =>
                cambiarProvincia(
                  e.target.value
                )
              }
              className="w-full
 
 
 
 px-3
 py-2.5"
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
               
              >
                {municipios.length.toLocaleString(
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

              Cargando municipios...

            </div>

          </div>

        ) : municipiosPagina.length === 0 ? (

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
              🔎
            </div>


            <h3
             
            >
              No se han encontrado municipios
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
 min-w-[800px]"
            >

              <thead><tr>
              <MolsanSortableTh label="Comunidad autónoma" sortKey="ccaa" sortConfig={ordenMunicipios.sortConfig} onSort={ordenMunicipios.requestSort} className="px-5 py-3.5 uppercase" />


                  <MolsanSortableTh label="Provincia" sortKey="provincia" sortConfig={ordenMunicipios.sortConfig} onSort={ordenMunicipios.requestSort} className="px-5
 py-3.5
 
 
 
 uppercase" />


                  <MolsanSortableTh label="Municipio" sortKey="municipio" sortConfig={ordenMunicipios.sortConfig} onSort={ordenMunicipios.requestSort} className="px-5
 py-3.5
 
 
 
 uppercase" />

                  <MolsanSortableTh label="Códigos postales" sortKey="_codigosPostalesOrden" sortConfig={ordenMunicipios.sortConfig} onSort={ordenMunicipios.requestSort} className="px-5 py-3.5 uppercase" />

                  <th
                    className="w-[150px]
 px-5
 py-3.5
 
 
 
 uppercase"
                  >
                    Acciones
                  </th>

                </tr>

              </thead>


              <tbody>

                {municipiosPagina.map(
                  (municipio) => (

                    <tr
                      key={
                        municipio.id
                      }
                      className="group"
                    >

                      <td
                        className="px-5
 py-3.5"
                      >
                        {municipio.ccaa}
                      </td>


                      <td
                        className="px-5
 py-3.5"
                      >
                        {municipio.provincia}
                      </td>


                      <td
                        className="px-5
 py-3.5"
                      >
                        {municipio.municipio}
                      </td>

                      <td className="px-5 py-3.5">
                        {(municipio.codigos_postales || []).length ? (
                          <span title={"Códigos: " + municipio.codigos_postales.join(", ")}>
                            <strong>{municipio.codigo_postal_principal || municipio.codigos_postales[0]}</strong>
                            {(municipio.codigos_postales.length > 1) && <span className="ml-2">+{municipio.codigos_postales.length - 1}</span>}
                          </span>
                        ) : <span>Sin asignar</span>}
                      </td>

                      <td
                        className="px-5
 py-3.5"
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
                                municipio
                              )
                            }
                            title="Editar municipio"
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
                              eliminarMunicipio(
                                municipio
                              )
                            }
                            title="Eliminar municipio"
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
        municipiosFiltrados.length > 0 && (

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
          MODAL MUNICIPIO
      ===================================================== */}

      {modalAbierto && (

        <ModalMunicipio
          modo={
            modoModal
          }
          municipio={
            municipioSeleccionado
          }
          guardando={
            guardando
          }
          onCerrar={
            cerrarModal
          }
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
  useAccessibleDialog({ open: true, onClose: () => { if (!importando) onCerrar?.(); }, dialogRef });

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
        aria-label="Importar municipios desde Excel"
        className="w-full
 max-w-2xl
 overflow-hidden"
      >

        {/* =================================================
            CABECERA
        ================================================= */}

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
                  Importar municipios desde Excel
                </h2>


                <p
                  className="mt-1"
                >
                  Carga masiva del catálogo territorial.
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


        {/* =================================================
            CONTENIDO
        ================================================= */}

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


          {/* ARCHIVO SELECCIONADO */}

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


        {/* =================================================
            BOTONES
        ================================================= */}

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
 min-w-[180px]
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
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: true, onClose: () => { if (!guardando) onCerrar?.(); }, dialogRef });

  const [formulario, setFormulario] =
    useState({
      id:
        municipio?.id,

      ccaa:
        municipio?.ccaa ||
        "",

      provincia:
        municipio?.provincia ||
        "",

      municipio:
        municipio?.municipio ||
        "",

      codigos_postales_texto:
        (municipio?.codigos_postales || []).join(", "),

      codigo_postal_principal:
        municipio?.codigo_postal_principal ||
        municipio?.codigos_postales?.[0] ||
        ""
    });


  function cambiarCampo(
    campo,
    valor
  ) {

    setFormulario(
      (actual) => ({
        ...actual,
        [campo]:
          valor
      })
    );

  }


  function enviar(e) {

    e.preventDefault();

    const codigos = (formulario.codigos_postales_texto || "")
      .split(/[;,\s]+/)
      .map((cp) => cp.trim())
      .filter(Boolean);
    const invalidos = codigos.filter((cp) => !/^\d{5}$/.test(cp));
    if (invalidos.length) {
      window.alert("Cada código postal debe tener exactamente 5 dígitos. Revisa: " + invalidos.join(", "));
      return;
    }
    onGuardar({
      ...formulario,
      codigos_postales: codigos,
      codigo_postal_principal: codigos.includes(formulario.codigo_postal_principal)
        ? formulario.codigo_postal_principal
        : (codigos[0] || null),
    });

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
        aria-label={modo === "nuevo" ? "Nuevo municipio" : "Editar municipio"}
        className="w-full
 max-w-xl
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
                  ? "Nuevo municipio"
                  : "Editar municipio"}
              </h2>


              <p
                className="mt-1"
              >
                Datos territoriales del municipio.
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

            {/* CCAA */}

            <div>

              <label
                className="mb-1.5
 block"
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
                className="w-full
 
 
 
 px-4
 py-2.5"
              />

            </div>


            {/* PROVINCIA */}

            <div>

              <label
                className="mb-1.5
 block"
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
                className="w-full
 
 
 
 px-4
 py-2.5"
              />

            </div>


            {/* MUNICIPIO */}

            <div>

              <label
                className="mb-1.5
 block"
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
                className="w-full
 
 
 
 px-4
 py-2.5"
              />

            </div>

            {/* CÓDIGOS POSTALES */}
            <div>
              <label className="mb-1.5 block">
                Códigos postales
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formulario.codigos_postales_texto}
                onChange={(e) => {
                  const texto = e.target.value;
                  const codigos = texto.split(/[;,\s]+/).map((cp) => cp.trim()).filter(Boolean);
                  cambiarCampo("codigos_postales_texto", texto);
                  if (!codigos.includes(formulario.codigo_postal_principal)) {
                    cambiarCampo("codigo_postal_principal", codigos[0] || "");
                  }
                }}
                placeholder="Ej. 08001, 08002, 08003"
                className="w-full px-4 py-2.5"
              />
              <p className="mt-1">Introduce códigos de 5 dígitos separados por comas o espacios. Se guardan como texto para conservar ceros iniciales.</p>
              <label className="mb-1.5 mt-3 block">
                Código postal principal
              </label>
              <select
                value={formulario.codigo_postal_principal}
                onChange={(e) => cambiarCampo("codigo_postal_principal", e.target.value)}
                className="w-full px-4 py-2.5"
              >
                <option value="">Sin código postal principal</option>
                {(formulario.codigos_postales_texto || "").split(/[;,\s]+/).map((cp) => cp.trim()).filter((cp, i, lista) => cp && lista.indexOf(cp) === i && /^\d{5}$/.test(cp)).map((cp) => <option key={cp} value={cp}>{cp}</option>)}
              </select>
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
 min-w-[130px]
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
