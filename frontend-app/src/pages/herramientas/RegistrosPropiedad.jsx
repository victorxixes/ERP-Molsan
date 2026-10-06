import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * ============================================================
 * REGISTROS DE LA PROPIEDAD — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Maestro de Registros de la Propiedad.
 *
 * FUNCIONES:
 *
 * - Carga desde backend
 * - Búsqueda instantánea
 * - Filtro por provincia
 * - Filtro por población
 * - Filtro por Oficina Liquidadora
 * - Nuevo registro
 * - Editar registro
 * - Eliminar registro
 * - Importación directa desde Excel
 * - Contador de resultados
 * - Paginación
 *
 * BACKEND:
 *
 * GET    /api/registros-propiedad
 * POST   /api/registros-propiedad
 * PUT    /api/registros-propiedad/:id
 * DELETE /api/registros-propiedad/:id
 *
 * IMPORTACIÓN:
 *
 * POST   /api/registros-propiedad/importar-excel
 *
 * FormData:
 *
 * fichero = archivo Excel
 *
 * COLUMNAS EXCEL:
 *
 * Registro de la propiedad
 * Nombre Registrador
 * Dirección
 * Codigo Postal
 * Población
 * Província
 * Teléfono
 * Teléfono 2
 * Fax
 * WhatsApp
 * Email 1
 * Email 2
 * IBAN
 * Comentarios
 * Tiene Of. Liq
 *
 * ============================================================
 */


/* ============================================================
   BACKEND
============================================================ */

const API_ORIGEN =
  "https://agenda-intranet-b.onrender.com";

const API_BASE =
  `${API_ORIGEN}/api/registros-propiedad`;

const API_IMPORTAR_EXCEL =
  `${API_BASE}/importar-excel`;

const FILAS_POR_PAGINA = 20;


/* ============================================================
   LEER RESPUESTA DEL SERVIDOR
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

export default function RegistrosPropiedad() {


  // ==========================================================
  // DATOS
  // ==========================================================

  const [
    registros,
    setRegistros
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
    provinciaFiltro,
    setProvinciaFiltro
  ] = useState("");


  const [
    poblacionFiltro,
    setPoblacionFiltro
  ] = useState("");


  const [
    liquidadoraFiltro,
    setLiquidadoraFiltro
  ] = useState("");


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const [
    pagina,
    setPagina
  ] = useState(1);


  // ==========================================================
  // MODAL REGISTRO
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
    registroSeleccionado,
    setRegistroSeleccionado
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
  // CARGAR REGISTROS
  // ==========================================================

  async function cargarRegistros() {

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
                "application/json"
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


      setRegistros(
        lista
      );

    } catch (e) {

      console.error(
        "Error cargando registros de la propiedad:",
        e
      );

      setRegistros([]);

      setError(
        e?.message ||
        "No se pudieron cargar los Registros de la Propiedad."
      );

    } finally {

      setCargando(false);

    }

  }


  // ==========================================================
  // CARGA INICIAL
  // ==========================================================

  useEffect(() => {

    cargarRegistros();

  }, []);


  // ==========================================================
  // PROVINCIAS
  // ==========================================================

  const provinciasDisponibles =
    useMemo(
      () => {

        return [
          ...new Set(
            registros
              .map(
                (registro) =>
                  registro.provincia
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
        registros
      ]
    );


  // ==========================================================
  // POBLACIONES
  // ==========================================================

  const poblacionesDisponibles =
    useMemo(
      () => {

        let datos =
          registros;


        if (
          provinciaFiltro
        ) {

          datos =
            datos.filter(
              (registro) =>
                registro.provincia ===
                provinciaFiltro
            );

        }


        return [
          ...new Set(
            datos
              .map(
                (registro) =>
                  registro.poblacion
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
        registros,
        provinciaFiltro
      ]
    );


  // ==========================================================
  // FILTRO GENERAL
  // ==========================================================

  const registrosFiltrados =
    useMemo(
      () => {

        const texto =
          busqueda
            .trim()
            .toLocaleLowerCase(
              "es"
            );


        return registros.filter(
          (registro) => {

            const valores = [
              registro.registro_propiedad,
              registro.nombre_registrador,
              registro.direccion,
              registro.codigo_postal,
              registro.poblacion,
              registro.provincia,
              registro.telefono,
              registro.telefono_2,
              registro.fax,
              registro.whatsapp,
              registro.email_1,
              registro.email_2,
              registro.iban,
              registro.comentarios
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


            const coincideProvincia =
              !provinciaFiltro ||
              registro.provincia ===
                provinciaFiltro;


            const coincidePoblacion =
              !poblacionFiltro ||
              registro.poblacion ===
                poblacionFiltro;


            const coincideLiquidadora =
              !liquidadoraFiltro ||
              (
                liquidadoraFiltro === "si"
                  ? registro.tiene_of_liq === true
                  : registro.tiene_of_liq !== true
              );


            return (
              coincideTexto &&
              coincideProvincia &&
              coincidePoblacion &&
              coincideLiquidadora
            );

          }
        );

      },
      [
        registros,
        busqueda,
        provinciaFiltro,
        poblacionFiltro,
        liquidadoraFiltro
      ]
    );


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        registrosFiltrados.length /
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


  const registrosPagina =
    registrosFiltrados.slice(
      (
        pagina - 1
      ) *
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
  // CAMBIAR PROVINCIA
  // ==========================================================

  function cambiarProvincia(
    valor
  ) {

    setProvinciaFiltro(
      valor
    );

    setPoblacionFiltro(
      ""
    );

    setPagina(
      1
    );

  }


  // ==========================================================
  // CAMBIAR POBLACIÓN
  // ==========================================================

  function cambiarPoblacion(
    valor
  ) {

    setPoblacionFiltro(
      valor
    );

    setPagina(
      1
    );

  }


  // ==========================================================
  // CAMBIAR OFICINA LIQUIDADORA
  // ==========================================================

  function cambiarLiquidadora(
    valor
  ) {

    setLiquidadoraFiltro(
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

    setProvinciaFiltro("");

    setPoblacionFiltro("");

    setLiquidadoraFiltro("");

    setPagina(1);

  }


  // ==========================================================
  // ABRIR NUEVO
  // ==========================================================

  function abrirNuevo() {

    setRegistroSeleccionado({

      registro_propiedad: "",

      nombre_registrador: "",

      direccion: "",

      codigo_postal: "",

      poblacion: "",

      provincia: "",

      telefono: "",

      telefono_2: "",

      fax: "",

      whatsapp: "",

      email_1: "",

      email_2: "",

      iban: "",

      comentarios: "",

      tiene_of_liq: false

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
    registro
  ) {

    setRegistroSeleccionado({
      ...registro
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

    setRegistroSeleccionado(
      null
    );

  }


  // ==========================================================
  // GUARDAR REGISTRO
  // ==========================================================

  async function guardarRegistro(
    datos
  ) {

    const registro_propiedad =
      datos.registro_propiedad
        ?.trim() ||
      "";


    const nombre_registrador =
      datos.nombre_registrador
        ?.trim() ||
      "";


    const direccion =
      datos.direccion
        ?.trim() ||
      "";


    const codigo_postal =
      datos.codigo_postal
        ?.trim() ||
      "";


    const poblacion =
      datos.poblacion
        ?.trim() ||
      "";


    const provincia =
      datos.provincia
        ?.trim() ||
      "";


    const telefono =
      datos.telefono
        ?.trim() ||
      "";


    const telefono_2 =
      datos.telefono_2
        ?.trim() ||
      "";


    const fax =
      datos.fax
        ?.trim() ||
      "";


    const whatsapp =
      datos.whatsapp
        ?.trim() ||
      "";


    const email_1 =
      datos.email_1
        ?.trim() ||
      "";


    const email_2 =
      datos.email_2
        ?.trim() ||
      "";


    const iban =
      datos.iban
        ?.trim() ||
      "";


    const comentarios =
      datos.comentarios
        ?.trim() ||
      "";


    if (!registro_propiedad) {

      mostrarMensaje(
        "El Registro de la Propiedad es obligatorio.",
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

                registro_propiedad,

                nombre_registrador:
                  nombre_registrador ||
                  null,

                direccion:
                  direccion ||
                  null,

                codigo_postal:
                  codigo_postal ||
                  null,

                poblacion:
                  poblacion ||
                  null,

                provincia:
                  provincia ||
                  null,

                telefono:
                  telefono ||
                  null,

                telefono_2:
                  telefono_2 ||
                  null,

                fax:
                  fax ||
                  null,

                whatsapp:
                  whatsapp ||
                  null,

                email_1:
                  email_1 ||
                  null,

                email_2:
                  email_2 ||
                  null,

                iban:
                  iban ||
                  null,

                comentarios:
                  comentarios ||
                  null,

                tiene_of_liq:
                  datos.tiene_of_liq === true

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
            ? "Registro creado correctamente."
            : "Registro actualizado correctamente."
        ),
        "ok"
      );


      setModalAbierto(
        false
      );

      setRegistroSeleccionado(
        null
      );


      await cargarRegistros();

    } catch (e) {

      console.error(
        "Error guardando Registro de la Propiedad:",
        e
      );

      mostrarMensaje(
        e?.message ||
        "No se pudo guardar el registro.",
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

  async function eliminarRegistro(
    registro
  ) {

    const confirmar =
      window.confirm(
        `¿Seguro que quieres eliminar "${registro.registro_propiedad}"?\n\nEl registro quedará inactivo en el catálogo.`
      );


    if (!confirmar) {
      return;
    }


    try {

      const respuesta =
        await fetch(
          `${API_BASE}/${registro.id}`,
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
        "Registro eliminado correctamente.",
        "ok"
      );


      await cargarRegistros();

    } catch (e) {

      console.error(
        "Error eliminando Registro de la Propiedad:",
        e
      );

      mostrarMensaje(
        e?.message ||
        "No se pudo eliminar el registro.",
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
  // QUITAR ARCHIVO
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
                "application/json"
            },

            body:
              formulario
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


      await cargarRegistros();


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
        "Error importando Registros de la Propiedad:",
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
              🏛️
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
                Registros de la Propiedad
              </h1>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Maestro de registros, registradores,
                oficinas y datos de contacto.
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

              Nuevo registro

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
            xl:grid-cols-[minmax(320px,1fr)_230px_230px_210px_auto]
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
                placeholder="Registro, registrador, población, provincia, teléfono, email..."
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
              value={
                provinciaFiltro
              }
              onChange={(e) =>
                cambiarProvincia(
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
                Todas las provincias
              </option>


              {provinciasDisponibles.map(
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

          </div>


          {/* POBLACIÓN */}

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
              Población
            </label>


            <select
              value={
                poblacionFiltro
              }
              onChange={(e) =>
                cambiarPoblacion(
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
                Todas las poblaciones
              </option>


              {poblacionesDisponibles.map(
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

          </div>


          {/* OFICINA LIQUIDADORA */}

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
              Oficina liquidadora
            </label>


            <select
              value={
                liquidadoraFiltro
              }
              onChange={(e) =>
                cambiarLiquidadora(
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
                Todas
              </option>

              <option value="si">
                Sí
              </option>

              <option value="no">
                No
              </option>

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
            {registrosFiltrados.length.toLocaleString(
              "es-ES"
            )}
          </span>

          {" "}registros


          {registrosFiltrados.length !==
            registros.length && (

            <>
              {" "}de{" "}

              <span
                className="
                  font-semibold
                  text-slate-700
                "
              >
                {registros.length.toLocaleString(
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

              Cargando Registros de la Propiedad...

            </div>

          </div>

        ) : registrosPagina.length === 0 ? (

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
              🏛️
            </div>


            <h3
              className="
                text-base
                font-semibold
                text-slate-700
              "
            >
              No se han encontrado registros
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
                min-w-[1500px]
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
                      min-w-[220px]
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
                    Registro
                  </th>


                  <th
                    className="
                      min-w-[190px]
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
                    Registrador
                  </th>


                  <th
                    className="
                      min-w-[300px]
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
                      w-[100px]
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
                    C.P.
                  </th>


                  <th
                    className="
                      w-[170px]
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
                    Población
                  </th>


                  <th
                    className="
                      w-[150px]
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
                      w-[150px]
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
                    Teléfono
                  </th>


                  <th
                    className="
                      w-[160px]
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
                    Email
                  </th>


                  <th
                    className="
                      w-[150px]
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
                    Of. Liq.
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

                {registrosPagina.map(
                  (registro) => (

                    <tr
                      key={
                        registro.id
                      }
                      className="
                        group
                        border-b
                        border-slate-100
                        transition-colors
                        hover:bg-blue-50/40
                      "
                    >

                      {/* REGISTRO */}

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
                          {
                            registro.registro_propiedad
                          }
                        </div>

                      </td>


                      {/* REGISTRADOR */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          text-sm
                          text-slate-600
                        "
                      >
                        {
                          registro.nombre_registrador ||
                          (
                            <span
                              className="
                                italic
                                text-slate-300
                              "
                            >
                              Sin registrar
                            </span>
                          )
                        }
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
                        {
                          registro.direccion ||
                          (
                            <span
                              className="
                                italic
                                text-slate-300
                              "
                            >
                              Sin dirección
                            </span>
                          )
                        }
                      </td>


                      {/* C.P. */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          font-mono
                          text-sm
                          text-slate-600
                        "
                      >
                        {
                          registro.codigo_postal ||
                          "—"
                        }
                      </td>


                      {/* POBLACIÓN */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          text-sm
                          text-slate-600
                        "
                      >
                        {
                          registro.poblacion ||
                          "—"
                        }
                      </td>


                      {/* PROVINCIA */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          text-sm
                          text-slate-600
                        "
                      >
                        {
                          registro.provincia ||
                          "—"
                        }
                      </td>


                      {/* TELÉFONO */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          text-sm
                          text-slate-600
                        "
                      >
                        {
                          registro.telefono ||
                          "—"
                        }
                      </td>


                      {/* EMAIL */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                          text-xs
                          text-slate-500
                        "
                      >

                        {
                          registro.email_1 ||
                          registro.email_2 ||
                          "—"
                        }

                      </td>


                      {/* OFICINA */}

                      <td
                        className="
                          px-5
                          py-3.5
                          align-top
                        "
                      >

                        {registro.tiene_of_liq ? (

                          <span
                            className="
                              inline-flex
                              rounded-full
                              border
                              border-emerald-200
                              bg-emerald-50
                              px-3
                              py-1
                              text-xs
                              font-semibold
                              text-emerald-700
                            "
                          >
                            Sí
                          </span>

                        ) : (

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
                              text-slate-500
                            "
                          >
                            No
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
                                registro
                              )
                            }
                            title="Editar registro"
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
                              eliminarRegistro(
                                registro
                              )
                            }
                            title="Eliminar registro"
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
        registrosFiltrados.length > 0 && (

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
          MODAL REGISTRO
      ===================================================== */}

      {modalAbierto && (

        <ModalRegistroPropiedad
          modo={
            modoModal
          }
          registro={
            registroSeleccionado
          }
          guardando={
            guardando
          }
          onCerrar={
            cerrarModal
          }
          onGuardar={
            guardarRegistro
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
          max-w-3xl
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
                  Importar Registros de la Propiedad
                </h2>


                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Carga masiva del catálogo registral.
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
                  <strong> Registro de la propiedad</strong>,
                  <strong> Nombre Registrador</strong>,
                  <strong> Dirección</strong>,
                  <strong> Codigo Postal</strong>,
                  <strong> Población</strong>,
                  <strong> Província</strong>,
                  <strong> Teléfono</strong>,
                  <strong> Teléfono 2</strong>,
                  <strong> Fax</strong>,
                  <strong> WhatsApp</strong>,
                  <strong> Email 1</strong>,
                  <strong> Email 2</strong>,
                  <strong> IBAN</strong>,
                  <strong> Comentarios</strong> y
                  <strong> Tiene Of. Liq</strong>.
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
              min-w-[210px]
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
              : "Importar registros"}

          </button>

        </div>

      </div>

    </div>

  );

}


/* ============================================================
   MODAL REGISTRO DE LA PROPIEDAD
============================================================ */

function ModalRegistroPropiedad({
  modo,
  registro,
  guardando,
  onCerrar,
  onGuardar
}) {

  const [
    formulario,
    setFormulario
  ] = useState({
    id:
      registro?.id,

    registro_propiedad:
      registro?.registro_propiedad ||
      "",

    nombre_registrador:
      registro?.nombre_registrador ||
      "",

    direccion:
      registro?.direccion ||
      "",

    codigo_postal:
      registro?.codigo_postal ||
      "",

    poblacion:
      registro?.poblacion ||
      "",

    provincia:
      registro?.provincia ||
      "",

    telefono:
      registro?.telefono ||
      "",

    telefono_2:
      registro?.telefono_2 ||
      "",

    fax:
      registro?.fax ||
      "",

    whatsapp:
      registro?.whatsapp ||
      "",

    email_1:
      registro?.email_1 ||
      "",

    email_2:
      registro?.email_2 ||
      "",

    iban:
      registro?.iban ||
      "",

    comentarios:
      registro?.comentarios ||
      "",

    tiene_of_liq:
      registro?.tiene_of_liq === true

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


  function cambiarBooleano(
    valor
  ) {

    setFormulario(
      (actual) => ({
        ...actual,
        tiene_of_liq:
          valor
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
          max-h-[94vh]
          w-full
          max-w-4xl
          overflow-y-auto
          overflow-x-hidden
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
            sticky
            top-0
            z-10
            border-b
            border-slate-100
            bg-slate-50/95
            px-6
            py-5
            backdrop-blur
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
                  ? "Nuevo Registro de la Propiedad"
                  : "Editar Registro de la Propiedad"}
              </h2>


              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Datos registrales, contacto y oficina liquidadora.
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

          <div className="space-y-5">

            {/* DATOS PRINCIPALES */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50/50
                p-4
              "
            >

              <div
                className="
                  mb-4
                  text-xs
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                "
              >
                Datos principales
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  md:grid-cols-2
                "
              >

                {/* REGISTRO */}

                <div
                  className="md:col-span-2"
                >

                  <label
                    className="
                      mb-1.5
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Registro de la Propiedad *
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.registro_propiedad
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "registro_propiedad",
                        e.target.value
                      )
                    }
                    placeholder="Ej. Barcelona 1"
                    maxLength={250}
                    autoFocus
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


                {/* REGISTRADOR */}

                <div
                  className="md:col-span-2"
                >

                  <label
                    className="
                      mb-1.5
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Nombre Registrador
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.nombre_registrador
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "nombre_registrador",
                        e.target.value
                      )
                    }
                    placeholder="Nombre del registrador"
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


                {/* DIRECCIÓN */}

                <div
                  className="md:col-span-2"
                >

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
                    rows={2}
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


                {/* C.P. */}

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
                    Código Postal
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.codigo_postal
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "codigo_postal",
                        e.target.value
                      )
                    }
                    placeholder="08038"
                    maxLength={10}
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


                {/* POBLACIÓN */}

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
                    Población
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.poblacion
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "poblacion",
                        e.target.value
                      )
                    }
                    placeholder="Barcelona"
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
                    placeholder="Barcelona"
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

                </div>

              </div>

            </div>


            {/* CONTACTO */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50/50
                p-4
              "
            >

              <div
                className="
                  mb-4
                  text-xs
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                "
              >
                Contacto
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  md:grid-cols-2
                "
              >

                {/* TELÉFONO */}

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
                    Teléfono
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.telefono
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "telefono",
                        e.target.value
                      )
                    }
                    placeholder="932250843"
                    maxLength={50}
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


                {/* TELÉFONO 2 */}

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
                    Teléfono 2
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.telefono_2
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "telefono_2",
                        e.target.value
                      )
                    }
                    placeholder="Teléfono secundario"
                    maxLength={50}
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


                {/* FAX */}

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
                    Fax
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.fax
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "fax",
                        e.target.value
                      )
                    }
                    placeholder="932250932"
                    maxLength={50}
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


                {/* WHATSAPP */}

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
                    WhatsApp
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.whatsapp
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "whatsapp",
                        e.target.value
                      )
                    }
                    placeholder="Número WhatsApp"
                    maxLength={50}
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


                {/* EMAIL 1 */}

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
                    Email 1
                  </label>


                  <input
                    type="email"
                    value={
                      formulario.email_1
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "email_1",
                        e.target.value
                      )
                    }
                    placeholder="registro@ejemplo.org"
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


                {/* EMAIL 2 */}

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
                    Email 2
                  </label>


                  <input
                    type="email"
                    value={
                      formulario.email_2
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "email_2",
                        e.target.value
                      )
                    }
                    placeholder="correo2@ejemplo.org"
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

              </div>

            </div>


            {/* DATOS ADICIONALES */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50/50
                p-4
              "
            >

              <div
                className="
                  mb-4
                  text-xs
                  font-bold
                  uppercase
                  tracking-wider
                  text-slate-400
                "
              >
                Datos adicionales
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  md:grid-cols-2
                "
              >

                {/* IBAN */}

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
                    IBAN
                  </label>


                  <input
                    type="text"
                    value={
                      formulario.iban
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "iban",
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    maxLength={100}
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


                {/* OFICINA LIQUIDADORA */}

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
                    Oficina Liquidadora
                  </label>


                  <div
                    className="
                      flex
                      gap-2
                    "
                  >

                    <button
                      type="button"
                      onClick={() =>
                        cambiarBooleano(
                          true
                        )
                      }
                      className={`
                        flex-1
                        rounded-xl
                        border
                        px-4
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                        ${
                          formulario.tiene_of_liq
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }
                      `}
                    >
                      Sí
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        cambiarBooleano(
                          false
                        )
                      }
                      className={`
                        flex-1
                        rounded-xl
                        border
                        px-4
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                        ${
                          !formulario.tiene_of_liq
                            ? "border-slate-300 bg-slate-100 text-slate-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }
                      `}
                    >
                      No
                    </button>

                  </div>

                </div>


                {/* COMENTARIOS */}

                <div
                  className="md:col-span-2"
                >

                  <label
                    className="
                      mb-1.5
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Comentarios
                  </label>


                  <textarea
                    value={
                      formulario.comentarios
                    }
                    onChange={(e) =>
                      cambiarCampo(
                        "comentarios",
                        e.target.value
                      )
                    }
                    placeholder="Observaciones o comentarios..."
                    rows={4}
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
                min-w-[160px]
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
                  ? "Crear registro"
                  : "Guardar cambios"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}
