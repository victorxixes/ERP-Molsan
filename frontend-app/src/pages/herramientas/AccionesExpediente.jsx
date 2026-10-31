import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";


// ============================================================
// ACCIONES DEL EXPEDIENTE

// ============================================================


// ============================================================
// API
// ============================================================

const API_ORIGEN = String(
  import.meta.env.VITE_API_URL || "https://agenda-intranet-b.onrender.com/api"
).replace(/\/api\/?$/, "");

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
  "Pre firma",
  "Post firma",
];


const SECCIONES = [
  "Notaria",
  "Registro propiedad",
  "Apoderado",
  "Gestor",
  "Dirección",
];


const ACTIVIDADES = [
  "Documentación previa",
  "Sede notarial sin protocolo",
  "Sede notarial con protocolo",
  "Gestión económica",
  "Liquidación impuestos",
  "Tramitación inscripción",
  "Defectos Registrales",
  "Facturación y Cierre",
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
      className={`inline-flex
 items-center
 gap-1.5
 
 
 px-2.5
 py-1
 
 

 `}
    >

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
      className="flex
 flex-col
 gap-1.5"
    >

      <span
       
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
        className="w-full
 
 
 
 
 px-3
 py-2.5"
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


  const ordenAcciones = useSortableData(acciones);
  const accionesPagina =
    ordenAcciones.items.slice(
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

  const accionDialogRef = useRef(null);
  const importarDialogRef = useRef(null);
  useAccessibleDialog({ open: mostrarModal, onClose: cerrarModal, dialogRef: accionDialogRef });
  useAccessibleDialog({ open: mostrarImportar, onClose: cerrarImportar, dialogRef: importarDialogRef });


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
      className="erp-page min-w-0 space-y-6"
    >

      <MolsanPageHeader mark="AE" title="Acciones del expediente" description="Catálogo de acciones y actividades disponibles para los expedientes." />
      <div className="molsan-filter-bar flex flex-wrap justify-end gap-2 p-3">
        <button type="button" onClick={abrirImportar} className="molsan-btn molsan-btn--secondary"><span aria-hidden="true">🗂️</span> Importar Excel</button>
        <button type="button" onClick={abrirNueva} className="molsan-btn molsan-btn--primary">＋ Nueva acción</button>
      </div>


      {mensaje && (

        <div
          className="px-4
 py-3"
        >
          {mensaje}
        </div>

      )}


      {error && (

        <div
          className="px-4
 py-3"
        >
          {error}
        </div>

      )}


      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <section
        className="grid
 grid-cols-1
 sm:grid-cols-3
 gap-4"
      >

        <div
          className="erp-card
 p-5"
        >

          <p
            className="uppercase"
          >
            Total acciones
          </p>

          <p
            className="mt-1"
          >
            {totalAcciones}
          </p>

        </div>


        <div
          className="erp-card
 p-5"
        >

          <p
            className="uppercase"
          >
            Acciones activas
          </p>

          <p
            className="mt-1"
          >
            {accionesActivas}
          </p>

        </div>


        <div
          className="erp-card
 p-5"
        >

          <p
            className="uppercase"
          >
            Con actividad asignada
          </p>

          <p
            className="mt-1"
          >
            {accionesConActividad}
          </p>

        </div>

      </section>


      {/* =====================================================
          FILTROS
      ===================================================== */}

      <section
        className="erp-card
 p-4"
      >

        <div
          className="flex
 items-center
 justify-between
 gap-3
 mb-4"
        >

          <div>

            <h2
             
            >
              Buscar y filtrar
            </h2>

            <p
              className="mt-1"
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
           
          >
            Limpiar filtros
          </button>

        </div>


        <div
          className="grid
 grid-cols-1
 md:grid-cols-2
 xl:grid-cols-5
 gap-3"
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
            className="w-full
 
 
 
 
 px-3
 py-2.5"
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
            className="px-3
 py-2.5"
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
            className="px-3
 py-2.5"
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
            className="px-3
 py-2.5"
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
            className="px-3
 py-2.5"
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
        className="erp-card
 overflow-hidden"
      >

        <div
          className="px-5
 py-4
 
 
 flex
 items-center
 justify-between
 gap-4"
        >

          <div>

            <h2
             
            >
              Acciones disponibles
            </h2>

            <p
              className="mt-1"
            >
              {totalAcciones}
              {" "}
              registros
            </p>

          </div>

        </div>


        <div className="overflow-x-auto">

          <table
            className="w-full
 min-w-[1100px]"
          >

            <thead>

              <tr
               
              >

                <MolsanSortableTh label="Departamento" sortKey="departamento" sortConfig={ordenAcciones.sortConfig} onSort={ordenAcciones.requestSort} className="px-4 py-3" />

                <MolsanSortableTh label="Sección" sortKey="seccion" sortConfig={ordenAcciones.sortConfig} onSort={ordenAcciones.requestSort} className="px-4 py-3" />

                <MolsanSortableTh label="Actividad" sortKey="actividad" sortConfig={ordenAcciones.sortConfig} onSort={ordenAcciones.requestSort} className="px-4 py-3" />

                <MolsanSortableTh label="Descripción" sortKey="descripcion" sortConfig={ordenAcciones.sortConfig} onSort={ordenAcciones.requestSort} className="px-4 py-3" />

                <MolsanSortableTh label="Estado" sortKey="activo" sortConfig={ordenAcciones.sortConfig} onSort={ordenAcciones.requestSort} className="px-4 py-3" />

                <th
                  className="px-4
 py-3"
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
                    className="px-4
 py-14"
                  >
                    Cargando acciones…
                  </td>

                </tr>

              ) : accionesPagina.length ===
                0 ? (

                <tr>

                  <td
                    colSpan="6"
                    className="px-4
 py-14"
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
                     
                    >

                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          accion.departamento ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          accion.seccion ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          accion.actividad ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5
 max-w-[520px]"
                      >
                        {
                          accion.descripcion
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        <BadgeActivo
                          activo={
                            accion.activo !==
                            false
                          }
                        />
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >

                        <div
                          className="flex
 items-center
 justify-center
 gap-2"
                        >

                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                accion
                              )
                            }
                            className="w-9
 h-9"
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
                            className="w-9
 h-9"
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
          className="px-5
 py-4
 
 
 flex
 flex-col
 sm:flex-row
 items-center
 justify-between
 gap-4"
        >

          <div
           
          >
            Mostrando{" "}

            <strong
             
            >
              {
                accionesPagina.length
              }
            </strong>

            {" "}de{" "}

            <strong
             
            >
              {totalAcciones}
            </strong>

            {" "}registros
          </div>


          <div
            className="flex
 items-center
 gap-2"
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
              className="px-4
 py-2"
            >
              Anterior
            </button>


            <span
              className="px-2"
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
              className="px-4
 py-2"
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
          className="panel-modal-premium
 fixed
 inset-0
 z-[200]
 flex
 items-center
 justify-center
 
 p-4"
        >

          <div
            ref={accionDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={modoEdicion ? "Editar acción del expediente" : "Nueva acción del expediente"}
            className="w-full
 max-w-3xl"
          >

            <div
              className="px-5
 py-4
 
 
 flex
 items-center
 justify-between"
            >

              <div>

                <h2
                 
                >
                  {modoEdicion
                    ? "Editar acción del expediente"
                    : "Nueva acción del expediente"}
                </h2>

                <p
                  className="mt-1"
                >
                  Selecciona los valores del catálogo
                </p>

              </div>


              <button
                type="button"
                onClick={
                  cerrarModal
                }
                className="w-9
 h-9"
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
                className="p-5
 grid
 grid-cols-1
 md:grid-cols-2
 gap-4"
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
                  className="flex
 items-center
 gap-3
 
 
 
 
 px-4
 py-3"
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
                     
                    >
                      Acción activa
                    </div>

                    <div
                     
                    >
                      Disponible en el catálogo
                    </div>

                  </div>

                </label>


                <label
                  className="md:col-span-2
 flex
 flex-col
 gap-1.5"
                >

                  <span
                   
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
                    className="w-full
 
 
 
 
 px-3
 py-2.5
 
 
 resize-y"
                  />

                </label>

              </div>


              <div
                className="px-5
 py-4
 
 
 flex
 justify-end
 gap-2"
              >

                <button
                  type="button"
                  onClick={
                    cerrarModal
                  }
                  className="px-4
 py-2.5"
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="px-4
 py-2.5"
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
          className="panel-modal-premium
 fixed
 inset-0
 z-[210]
 flex
 items-center
 justify-center
 
 p-4"
        >

          <div
            ref={importarDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Importar acciones del expediente"
            className="w-full
 max-w-xl"
          >

            <div
              className="px-5
 py-4
 
 
 flex
 items-center
 justify-between"
            >

              <div>

                <h2
                 
                >
                  Importar Acciones del expediente
                </h2>

                <p
                  className="mt-1"
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
                className="w-9
 h-9"
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
                className="p-5
 space-y-4"
              >

                <div
                  className="p-7"
                >

                  <div
                    className="mx-auto
 w-12
 h-12
 
 
 
 flex
 items-center
 justify-center
 mb-4"
                  >
                    <Icono
                      name="database"
                      className="w-6 h-6"
                    />
                  </div>


                  <p
                   
                  >
                    Selecciona el fichero Excel
                  </p>


                  <p
                    className="mt-1"
                  >
                    .xlsx, .xls o .xlsm
                  </p>


                  <label
                    className="mt-4
 inline-flex
 
 items-center
 justify-center
 px-4
 py-2.5"
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
                      className="mt-4
 
 
 
 
 px-4
 py-3"
                    >

                      <div
                       
                      >
                        {archivo.name}
                      </div>

                      <div
                        className="mt-0.5"
                      >
                        Archivo seleccionado
                      </div>

                    </div>

                  )}

                </div>


                <div
                  className="px-4
 py-3"
                >
                  Columnas esperadas:
                  <strong
                   
                  >
                    {" "}
                    Departamento, Sección,
                    Actividad y Descripción.
                  </strong>
                </div>

              </div>


              <div
                className="px-5
 py-4
 
 
 flex
 justify-end
 gap-2"
              >

                <button
                  type="button"
                  onClick={
                    cerrarImportar
                  }
                  disabled={
                    importando
                  }
                  className="px-4
 py-2.5"
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    !archivo ||
                    importando
                  }
                  className="px-4
 py-2.5"
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
