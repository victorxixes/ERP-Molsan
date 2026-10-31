import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import axios from "../../api/axios";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";


// ============================================================
// TIPOS DE CONCEPTO DE GASTOS
// MOLSAN ERP
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
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: mostrarModal, onClose: cerrarModal, dialogRef });

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [tipoEditando, setTipoEditando] =
    useState(null);

  const [nombre, setNombre] =
    useState("");

  const [activo, setActivo] =
    useState(true);

  const [plantillaFactura, setPlantillaFactura] = useState(null);
  const [archivoPlantillaFactura, setArchivoPlantillaFactura] = useState(null);
  const [subiendoPlantillaFactura, setSubiendoPlantillaFactura] = useState(false);
  const [descargandoPlantillaFactura, setDescargandoPlantillaFactura] = useState(false);
  const [errorPlantillaFactura, setErrorPlantillaFactura] = useState("");
  const [mensajePlantillaFactura, setMensajePlantillaFactura] = useState("");


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

  useEffect(() => {
    cargarEstadoPlantillaFactura();
  }, []);

  async function cargarEstadoPlantillaFactura() {
    try {
      const { data } = await axios.get("/utilidades/conceptos-gastos/6/plantilla-factura/estado");
      setPlantillaFactura(data);
      setErrorPlantillaFactura("");
    } catch (err) {
      setPlantillaFactura(null);
      setErrorPlantillaFactura(err?.response?.data?.detail || "No se pudo comprobar la plantilla vinculada al concepto «honorarios gestoría».");
    }
  }

  async function subirPlantillaFactura() {
    if (!archivoPlantillaFactura || subiendoPlantillaFactura) return;
    const form = new FormData();
    form.append("fichero", archivoPlantillaFactura);
    setSubiendoPlantillaFactura(true);
    setErrorPlantillaFactura("");
    setMensajePlantillaFactura("");
    try {
      const { data } = await axios.post("/utilidades/conceptos-gastos/6/plantilla-factura", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPlantillaFactura({ plantilla_cargada: true, factura_nombre: data.factura_nombre, factura_tipo: data.factura_tipo, concepto_gasto_id: data.concepto_gasto_id, concepto_gasto: data.concepto_gasto });
      setArchivoPlantillaFactura(null);
      setMensajePlantillaFactura("Plantilla guardada y vinculada al concepto «honorarios gestoría».");
    } catch (err) {
      setErrorPlantillaFactura(err?.response?.data?.detail || "No se pudo guardar la plantilla Word.");
    } finally {
      setSubiendoPlantillaFactura(false);
    }
  }

  async function descargarPlantillaFactura() {
    setDescargandoPlantillaFactura(true);
    setErrorPlantillaFactura("");
    try {
      const { data } = await axios.get("/utilidades/conceptos-gastos/6/plantilla-factura", { responseType: "blob" });
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = plantillaFactura?.factura_nombre || "plantilla-factura.docx";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorPlantillaFactura(err?.response?.data?.detail || "No se pudo descargar la plantilla Word.");
    } finally {
      setDescargandoPlantillaFactura(false);
    }
  }


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
      className="herramientas-subpagina-premium erp-page min-w-0 space-y-6"
    >

      <div
        className="min-w-0"
      >

        <MolsanPageHeader mark="CG" title="Tipos de concepto de gastos" description="Catálogo de conceptos utilizados para clasificar los gastos de los expedientes." />
        <div className="molsan-filter-bar flex justify-end p-3"><button type="button" onClick={abrirNuevo} className="molsan-btn molsan-btn--primary">＋ Nuevo concepto</button></div>

        <section className="mb-6 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="uppercase">Plantilla documental vinculada</p>
              <h2 className="mt-1">Factura de honorarios · Concepto ID 6</h2>
              <p className="mt-1">La plantilla Word se asocia exclusivamente al registro «honorarios gestoría» del catálogo. Se utiliza al pulsar «Guardar y facturar» en la FichaExpediente y nunca se adjunta a los emails.</p>
              {plantillaFactura?.plantilla_cargada && <p className="mt-3 break-all">✓ Plantilla actual: {plantillaFactura.factura_nombre}</p>}
              {plantillaFactura && <p className="mt-1">Vinculación confirmada: ID {plantillaFactura.concepto_gasto_id} · {plantillaFactura.concepto_gasto}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {plantillaFactura?.plantilla_cargada && <button type="button" onClick={descargarPlantillaFactura} disabled={descargandoPlantillaFactura} className="px-4 py-2.5">{descargandoPlantillaFactura ? "Descargando…" : "Descargar plantilla"}</button>}
            </div>
          </div>
          {errorPlantillaFactura && <p role="alert" className="mt-3 p-3">{errorPlantillaFactura}</p>}
          {mensajePlantillaFactura && <p role="status" className="mt-3 p-3">{mensajePlantillaFactura}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block uppercase">{plantillaFactura?.plantilla_cargada ? "Sustituir plantilla oficial (.docx)" : "Cargar plantilla oficial (.docx)"}</span>
              <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setArchivoPlantillaFactura(e.target.files?.[0] || null)} className="w-full px-3 py-2.5" />
            </label>
            <button type="button" onClick={subirPlantillaFactura} disabled={!archivoPlantillaFactura || subiendoPlantillaFactura} className="px-5 py-2.5">{subiendoPlantillaFactura ? "Guardando…" : "Vincular plantilla a honorarios gestoría"}</button>
          </div>
        </section>

        {/* ==================================================
            TARJETAS RESUMEN
        ================================================== */}

        <div
          className="mb-6
 grid
 grid-cols-1
 gap-4
 sm:grid-cols-3"
        >

          {/* TOTAL */}

          <div
            className="p-5"
          >

            <div
              className="flex
 items-center
 justify-between"
            >

              <div>

                <p
                  className="uppercase"
                >
                  Total
                </p>

                <p
                  className="mt-2"
                >
                  {estadisticas.total}
                </p>

              </div>

              <div
                className="flex
 h-11
 w-11
 items-center
 justify-center"
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
            className="p-5"
          >

            <div
              className="flex
 items-center
 justify-between"
            >

              <div>

                <p
                  className="uppercase"
                >
                  Activos
                </p>

                <p
                  className="mt-2"
                >
                  {estadisticas.activos}
                </p>

              </div>

              <div
                className="flex
 h-11
 w-11
 items-center
 justify-center"
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
            className="p-5"
          >

            <div
              className="flex
 items-center
 justify-between"
            >

              <div>

                <p
                  className="uppercase"
                >
                  Inactivos
                </p>

                <p
                  className="mt-2"
                >
                  {estadisticas.inactivos}
                </p>

              </div>

              <div
                className="flex
 h-11
 w-11
 items-center
 justify-center"
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
          className="mb-6
 
 
 
 
 p-4
 
 md:p-5"
        >

          <div
            className="grid
 grid-cols-1
 gap-4
 lg:grid-cols-[1fr_auto]
 lg:items-end"
          >

            {/* BUSCADOR */}

            <div>

              <label
                className="mb-2
 block
 
 
 uppercase"
              >
                Buscar concepto
              </label>

              <div
                className="relative"
              >

                <div
                  className="pointer-events-none
 absolute
 inset-y-0
 left-0
 flex
 items-center
 pl-3"
                >

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4
 w-4"
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
                  className="w-full
 
 
 
 
 py-3
 pl-10
 pr-4"
                />

              </div>

            </div>


            {/* ESTADO */}

            <div>

              <label
                className="mb-2
 block
 
 
 uppercase"
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
                className="min-w-[180px]
 
 
 
 
 px-4
 py-3"
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
            className="mb-6
 flex
 items-center
 gap-3
 
 
 
 
 px-4
 py-3"
          >

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5
 w-5
 shrink-0"
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
            className="mb-6
 flex
 items-start
 gap-3
 
 
 
 
 px-4
 py-3"
          >

            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5
 w-5
 shrink-0"
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
          className="overflow-hidden"
        >

          <div
            className="flex
 items-center
 justify-between
 
 
 px-5
 py-4"
          >

            <div>

              <h2
               
              >
                Catálogo
              </h2>

              <p
                className="mt-1"
              >
                {tipos.length === 1
                  ? "1 concepto"
                  : `${tipos.length} conceptos`}
              </p>

            </div>

            {cargando && (

              <div
                className="flex
 items-center
 gap-2"
              >

                <span
                  className="h-4
 w-4"
                />

                Cargando...

              </div>

            )}

          </div>


          <div
            className="overflow-x-auto"
          >

            <table
              className="min-w-full"
            >

              <thead
               
              >

                <tr>

                  <th
                    className="px-5
 py-4
 
 
 
 uppercase"
                  >
                    #
                  </th>

                  <th
                    className="px-5
 py-4
 
 
 
 uppercase"
                  >
                    Tipo concepto de gastos
                  </th>

                  <th
                    className="px-5
 py-4
 
 
 
 uppercase"
                  >
                    Estado
                  </th>

                  <th
                    className="px-5
 py-4
 
 
 
 uppercase"
                  >
                    Acciones
                  </th>

                </tr>

              </thead>


              <tbody
               
              >

                {!cargando &&
                tipos.length === 0 ? (

                  <tr>

                    <td
                      colSpan="4"
                      className="px-5
 py-16"
                    >

                      <div
                        className="mx-auto
 flex
 max-w-sm
 flex-col
 items-center"
                      >

                        <div
                          className="flex
 h-14
 w-14
 items-center
 justify-center"
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
                          className="mt-4"
                        >
                          No se encontraron conceptos
                        </p>

                        <p
                          className="mt-1"
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
                       
                      >

                        {/* NÚMERO */}

                        <td
                          className="whitespace-nowrap
 px-5
 py-4"
                        >
                          {index + 1}
                        </td>


                        {/* NOMBRE */}

                        <td
                          className="px-5
 py-4"
                        >

                          <div
                            className="flex
 items-center
 gap-3"
                          >

                            <div
                              className="flex
 h-9
 w-9
 shrink-0
 items-center
 justify-center"
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
                               
                              >
                                {tipo.nombre}
                              </p>

                              <p
                                className="mt-0.5"
                              >
                                ID {tipo.id}
                              </p>

                            </div>

                          </div>

                        </td>


                        {/* ESTADO */}

                        <td
                          className="px-5
 py-4"
                        >

                          <span
                            className={`inline-flex
 items-center
 gap-2
 
 px-3
 py-1.5
 
 
 `}
                          >

                            <span
                              className={`h-2
 w-2
 
 ${
 tipo.activo
 ? ""
 : ""
 }`}
                            />

                            {tipo.activo
                              ? "Activo"
                              : "Inactivo"}

                          </span>

                        </td>


                        {/* ACCIONES */}

                        <td
                          className="px-5
 py-4"
                        >

                          <div
                            className="flex
 justify-end
 gap-2"
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
                              className="inline-flex
 items-center
 justify-center
 
 
 
 
 p-2"
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
                              className={`inline-flex
 items-center
 justify-center
 
 
 p-2
 
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
                              className="inline-flex
 items-center
 justify-center
 
 
 
 
 p-2"
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
          className="mt-4"
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
          className="panel-modal-premium
 fixed
 inset-0
 z-50
 flex
 items-center
 justify-center
 
 p-4"
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
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={modoEdicion ? "Editar tipo de concepto de gasto" : "Nuevo tipo de concepto de gasto"}
            className="w-full
 max-w-lg
 overflow-hidden"
          >

            {/* CABECERA MODAL */}

            <div
              className="flex
 items-start
 justify-between
 
 
 px-6
 py-5"
            >

              <div>

                <p
                  className="uppercase"
                >
                  Catálogo de gastos
                </p>

                <h2
                  className="mt-1"
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
                className="p-2"
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
              className="p-6"
            >

              {error && (

                <div
                  className="mb-5
 
 
 
 
 px-4
 py-3"
                >
                  {error}
                </div>

              )}


              {/* NOMBRE */}

              <div>

                <label
                  className="mb-2
 block"
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
                  className="w-full
 
 
 
 
 px-4
 py-3"
                />

                <p
                  className="mt-2"
                >
                  Se guardará automáticamente
                  en minúsculas.
                </p>

              </div>


              {/* ACTIVO */}

              <div
                className="mt-5
 flex
 items-center
 justify-between
 
 
 
 
 px-4
 py-3"
              >

                <div>

                  <p
                   
                  >
                    Concepto activo
                  </p>

                  <p
                    className="mt-0.5"
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
                  className={`relative
 h-7
 w-12
 
 
 ${
 activo
 ? ""
 : ""
 }`}
                >

                  <span
                    className={`absolute
 top-1
 h-5
 w-5
 
 
 
 
 ${
 activo
 ? "left-6"
 : "left-1"
 }`}
                  />

                </button>

              </div>


              {/* BOTONES */}

              <div
                className="mt-7
 flex
 flex-col-reverse
 gap-3
 sm:flex-row
 sm:justify-end"
              >

                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="px-5
 py-3"
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
                  className="inline-flex
 items-center
 justify-center
 gap-2
 
 
 px-5
 py-3"
                >

                  {guardando && (

                    <span
                      className="h-4
 w-4"
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
