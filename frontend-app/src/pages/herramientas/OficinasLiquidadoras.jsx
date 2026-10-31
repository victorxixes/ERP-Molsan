import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";


// ============================================================
// OFICINAS LIQUIDADORAS
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
      className={`flex
 flex-col
 gap-1.5

 ${full ? "md:col-span-2" : ""}`}
    >
      <span
       
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
        className="w-full
 
 
 
 
 px-3
 py-2.5"
      />
    </label>
  );
}


// ============================================================
// BADGE ACTIVO
// ============================================================

function BadgeActivo({ activo }) {
  return <span>{activo ? "Activa" : "Inactiva"}</span>;
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

  const ordenOficinas = useSortableData(oficinas);

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        oficinas.length /
          POR_PAGINA
      )
    );


  const oficinasPagina =
    ordenOficinas.items.slice(
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

  const oficinaDialogRef = useRef(null);
  const importarDialogRef = useRef(null);
  useAccessibleDialog({ open: mostrarModal, onClose: cerrarModal, dialogRef: oficinaDialogRef });
  useAccessibleDialog({ open: mostrarImportar, onClose: cerrarImportacion, dialogRef: importarDialogRef });



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
      className="herramientas-subpagina-premium erp-page min-w-0 space-y-6"
    >

      <MolsanPageHeader mark="OL" title="Oficinas liquidadoras" description="Gestión y consulta del catálogo de oficinas liquidadoras." />
      <div className="molsan-filter-bar flex flex-wrap justify-end gap-2 p-3">
        <button type="button" onClick={abrirImportacion} className="molsan-btn molsan-btn--secondary"><span aria-hidden="true">🗂️</span> Importar Excel</button>
        <button type="button" onClick={abrirNueva} className="molsan-btn molsan-btn--primary">＋ Nueva oficina</button>
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
 sm:grid-cols-2
 lg:grid-cols-3
 gap-4"
      >

        <div
          className="erp-card
 p-5"
        >

          <div
            className="flex
 items-center
 justify-between
 gap-4"
          >

            <div>

              <p
                className="uppercase"
              >
                Total oficinas
              </p>

              <p
                className="mt-1"
              >
                {totalOficinas}
              </p>

            </div>


            <div
              className="w-11
 h-11
 
 
 
 flex
 items-center
 justify-center"
            >
              <Icono
                name="database"
                className="w-5 h-5"
              />
            </div>

          </div>

        </div>


        <div
          className="erp-card
 p-5"
        >

          <div
            className="flex
 items-center
 justify-between
 gap-4"
          >

            <div>

              <p
                className="uppercase"
              >
                Oficinas activas
              </p>

              <p
                className="mt-1"
              >
                {oficinasActivas}
              </p>

            </div>


            <div
              className="w-11
 h-11
 
 
 
 flex
 items-center
 justify-center"
            >
              <span
                className="w-2.5
 h-2.5"
              />
            </div>

          </div>

        </div>


        <div
          className="erp-card
 p-5"
        >

          <div
            className="flex
 items-center
 justify-between
 gap-4"
          >

            <div>

              <p
                className="uppercase"
              >
                Con datos de contacto
              </p>

              <p
                className="mt-1"
              >
                {oficinasConContacto}
              </p>

            </div>


            <div
              className="w-11
 h-11
 
 
 
 flex
 items-center
 justify-center"
            >
              <span
               
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
           
          >
            Limpiar filtros
          </button>

        </div>


        <div
          className="grid
 grid-cols-1
 md:grid-cols-2
 xl:grid-cols-4
 gap-3"
        >

          <label
            className="md:col-span-2
 xl:col-span-1
 flex
 flex-col
 gap-1.5"
          >

            <span
             
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
              className="w-full
 
 
 
 
 px-3
 py-2.5"
            />

          </label>


          <label
            className="flex
 flex-col
 gap-1.5"
          >

            <span
             
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
              className="w-full
 
 
 
 
 px-3
 py-2.5"
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
            className="flex
 flex-col
 gap-1.5"
          >

            <span
             
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
              className="w-full
 
 
 
 
 px-3
 py-2.5"
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
            className="flex
 flex-col
 gap-1.5"
          >

            <span
             
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
              className="w-full
 
 
 
 
 px-3
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

          </label>

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
 flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between
 gap-3"
        >

          <div>

            <h2
             
            >
              Oficinas Liquidadoras
            </h2>

            <p
              className="mt-1"
            >
              {totalOficinas} registros
            </p>

          </div>


          <div
            className="inline-flex
 items-center
 gap-2
 px-3
 py-1.5
 
 
 
 
 
 
 
 w-fit"
          >

            <span
              className="w-2
 h-2"
            />

            Catálogo activo

          </div>

        </div>


        <div className="overflow-x-auto">

          <table
            className="w-full
 min-w-[1250px]"
          >

            <thead><tr>
            <MolsanSortableTh label="Oficina Liquidadora" sortKey="oficina_liquidadora" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="" />

                <MolsanSortableTh label="Dirección" sortKey="direccion" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 whitespace-nowrap" />

                <MolsanSortableTh label="Código Postal" sortKey="codigo_postal" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 
 whitespace-nowrap" />

                <MolsanSortableTh label="Población" sortKey="poblacion" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 whitespace-nowrap" />

                <MolsanSortableTh label="Provincia" sortKey="provincia" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 whitespace-nowrap" />

                <MolsanSortableTh label="Teléfono" sortKey="telefono" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 whitespace-nowrap" />

                <MolsanSortableTh label="Email" sortKey="email" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 whitespace-nowrap" />

                <MolsanSortableTh label="Horario" sortKey="horario" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 whitespace-nowrap" />

                <MolsanSortableTh label="Estado" sortKey="activo" sortConfig={ordenOficinas.sortConfig} onSort={ordenOficinas.requestSort} className="px-4
 py-3
 
 
 whitespace-nowrap" />

                <th
                  className="px-4
 py-3
 
 
 whitespace-nowrap"
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
                    className="px-4
 py-14"
                  >

                    <div
                      className="inline-flex
 items-center
 gap-2"
                    >

                      <span
                        className="w-2
 h-2"
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
                    className="px-4
 py-14"
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
                     
                    >

                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          oficina.oficina_liquidadora
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          oficina.direccion ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5
 
 tabular-nums"
                      >
                        {
                          oficina.codigo_postal ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          oficina.poblacion ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          oficina.provincia ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5
 whitespace-nowrap"
                      >
                        {
                          oficina.telefono ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        {
                          oficina.email ||
                          "—"
                        }
                      </td>


                      <td
                        className="px-4
 py-3.5
 max-w-[220px]"
                      >
                        <span
                          className="line-clamp-2"
                        >
                          {
                            oficina.horario ||
                            "—"
                          }
                        </span>
                      </td>


                      <td
                        className="px-4
 py-3.5"
                      >
                        <BadgeActivo
                          activo={
                            oficina.activo !==
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
                                oficina
                              )
                            }
                            title="Editar"
                            className="w-9
 h-9
 
 
 
 
 
 flex
 items-center
 justify-center"
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
                            className="w-9
 h-9
 
 
 
 
 
 flex
 items-center
 justify-center"
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
              {oficinasPagina.length}
            </strong>{" "}
            de{" "}
            <strong
             
            >
              {totalOficinas}
            </strong>{" "}
            registros
          </div>


          <div
            className="flex
 items-center
 gap-2"
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
              className="px-4
 py-2"
            >
              Anterior
            </button>


            <span
              className="px-3"
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
            ref={oficinaDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={modoEdicion ? "Editar oficina liquidadora" : "Nueva oficina liquidadora"}
            className="w-full
 max-w-4xl
 max-h-[92vh]
 overflow-y-auto"
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
                  {modoEdicion
                    ? "Editar Oficina Liquidadora"
                    : "Nueva Oficina Liquidadora"}
                </h2>

                <p
                  className="mt-1"
                >
                  Completa los datos del catálogo
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
                guardarOficina
              }
            >

              <div
                className="p-5
 grid
 grid-cols-1
 md:grid-cols-2
 gap-4"
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
                    className="w-4
 h-4"
                  />

                  <div>

                    <div
                     
                    >
                      Oficina activa
                    </div>

                    <div
                     
                    >
                      Disponible en el catálogo
                    </div>

                  </div>

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
                  disabled={loading}
                  className="px-4
 py-2.5"
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={loading}
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
          className="fixed
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
            aria-label="Importar oficinas liquidadoras desde Excel"
            className="w-full
 max-w-xl"
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
                  Importar Oficinas Liquidadoras
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
                  cerrarImportacion
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
 gap-2
 px-4
 py-2.5"
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
                  El Excel debe contener:
                  <strong
                   
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
                className="px-5
 py-4
 
 
 flex
 justify-end
 gap-2"
              >

                <button
                  type="button"
                  onClick={
                    cerrarImportacion
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
                    importando ||
                    !archivo
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
