import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";


// ============================================================
// CONFIGURACIÓN API
// ============================================================

const API_ORIGEN =
  "https://agenda-intranet-b.onrender.com";

const API_BASE =
  `${API_ORIGEN}/api/tipos-carga-hipotecaria`;


// ============================================================
// UTILIDADES
// ============================================================

async function leerRespuestaServidor(response) {

  const texto =
    await response.text();

  let datos = null;

  try {

    datos =
      texto
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
// NORMALIZAR
// ============================================================

function normalizarNombre(valor) {

  return String(
    valor || ""
  )
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}


// ============================================================
// COMPONENTE
// ============================================================

export default function TiposCargaHipotecaria() {

  const [
    tipos,
    setTipos,
  ] = useState([]);
  const ordenTipos = useSortableData(tipos);

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
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
    filtroActivo,
    setFiltroActivo,
  ] = useState("true");

  const [
    mostrarModal,
    setMostrarModal,
  ] = useState(false);

  const [
    modoEdicion,
    setModoEdicion,
  ] = useState(false);

  const [
    tipoEditando,
    setTipoEditando,
  ] = useState(null);

  const [
    nombre,
    setNombre,
  ] = useState("");

  const [
    activo,
    setActivo,
  ] = useState(true);


  // ==========================================================
  // CARGAR
  // ==========================================================

  async function cargarTipos() {

    try {

      setCargando(true);

      setError("");

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
        filtroActivo === "true"
      ) {

        params.set(
          "activo",
          "true"
        );
      }

      if (
        filtroActivo === "false"
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

      setTipos(
        Array.isArray(datos)
          ? datos
          : []
      );

    } catch (err) {

      console.error(
        "Error cargando tipos de carga hipotecaria:",
        err
      );

      setError(
        err.message ||
        "No se pudieron cargar los tipos de carga hipotecaria."
      );

    } finally {

      setCargando(false);
    }
  }


  useEffect(() => {

    cargarTipos();

  }, [
    busqueda,
    filtroActivo,
  ]);


  // ==========================================================
  // RESUMEN
  // ==========================================================

  const totalActivos =
    useMemo(
      () =>
        tipos.filter(
          (item) =>
            item.activo
        ).length,
      [tipos]
    );


  const totalInactivos =
    useMemo(
      () =>
        tipos.filter(
          (item) =>
            !item.activo
        ).length,
      [tipos]
    );


  // ==========================================================
  // NUEVO
  // ==========================================================

  function abrirNuevo() {

    setModoEdicion(false);

    setTipoEditando(null);

    setNombre("");

    setActivo(true);

    setMostrarModal(true);

    setError("");

    setMensaje("");
  }


  // ==========================================================
  // EDITAR
  // ==========================================================

  function abrirEditar(tipo) {

    setModoEdicion(true);

    setTipoEditando(tipo);

    setNombre(
      tipo.nombre || ""
    );

    setActivo(
      Boolean(tipo.activo)
    );

    setMostrarModal(true);

    setError("");

    setMensaje("");
  }


  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  function cerrarModal() {

    if (guardando) {
      return;
    }

    setMostrarModal(false);

    setTipoEditando(null);

    setNombre("");

    setActivo(true);
  }


  const dialogRef = useRef(null);
  useAccessibleDialog({ open: mostrarModal, onClose: cerrarModal, dialogRef });

  // ==========================================================
  // GUARDAR
  // ==========================================================

  async function guardar() {

    const nombreNormalizado =
      normalizarNombre(
        nombre
      );

    if (!nombreNormalizado) {

      setError(
        "Debes introducir un tipo de carga hipotecaria."
      );

      return;
    }

    try {

      setGuardando(true);

      setError("");

      setMensaje("");

      const datos = {
        nombre:
          nombreNormalizado,
        activo,
      };

      const url =
        modoEdicion
          ? `${API_BASE}/${tipoEditando.id}`
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
                datos
              ),
          }
        );

      const resultado =
        await leerRespuestaServidor(
          response
        );

      if (modoEdicion) {

        setMensaje(
          "Tipo de carga hipotecaria actualizado correctamente."
        );

      } else {

        setMensaje(
          "Tipo de carga hipotecaria creado correctamente."
        );
      }

      setMostrarModal(false);

      setNombre("");

      setActivo(true);

      setTipoEditando(null);

      await cargarTipos();

      void resultado;

    } catch (err) {

      console.error(
        "Error guardando tipo de carga:",
        err
      );

      setError(
        err.message ||
        "No se pudo guardar el tipo de carga hipotecaria."
      );

    } finally {

      setGuardando(false);
    }
  }


  // ==========================================================
  // ELIMINAR
  // ==========================================================

  async function eliminar(tipo) {

    const confirmado =
      window.confirm(
        `¿Quieres eliminar "${tipo.nombre}"?`
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
            method:
              "DELETE",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const resultado =
        await leerRespuestaServidor(
          response
        );

      setMensaje(
        resultado?.mensaje ||
        "Tipo de carga hipotecaria eliminado correctamente."
      );

      await cargarTipos();

    } catch (err) {

      console.error(
        "Error eliminando tipo de carga:",
        err
      );

      setError(
        err.message ||
        "No se pudo eliminar el tipo de carga hipotecaria."
      );
    }
  }


  // ==========================================================
  // TOGGLE ACTIVO
  // ==========================================================

  async function cambiarEstado(tipo) {

    try {

      setError("");

      setMensaje("");

      const response =
        await fetch(
          `${API_BASE}/${tipo.id}`,
          {
            method:
              "PUT",
            headers: {
              Accept:
                "application/json",
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                nombre:
                  normalizarNombre(
                    tipo.nombre
                  ),
                activo:
                  !tipo.activo,
              }),
          }
        );

      await leerRespuestaServidor(
        response
      );

      setMensaje(
        tipo.activo
          ? "Tipo de carga desactivado."
          : "Tipo de carga activado."
      );

      await cargarTipos();

    } catch (err) {

      console.error(
        "Error cambiando estado:",
        err
      );

      setError(
        err.message ||
        "No se pudo cambiar el estado."
      );
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="herramientas-subpagina-premium erp-page min-w-0 space-y-5"
    >

      <MolsanPageHeader mark="CH" title="Tipos de carga hipotecaria" description="Catálogo de tipos de carga hipotecaria utilizados en los expedientes." />
      <div className="molsan-filter-bar flex justify-end p-3"><button type="button" onClick={abrirNuevo} className="molsan-btn molsan-btn--primary">＋ Nuevo tipo de carga</button></div>


      {mensaje && (

        <div
          className="max-w-[1700px]
 mx-auto
 
 
 
 
 
 px-4
 py-3"
        >
          {mensaje}
        </div>

      )}


      {error && (

        <div
          className="max-w-[1700px]
 mx-auto
 
 
 
 
 
 px-4
 py-3"
        >
          {error}
        </div>

      )}


      {/* ====================================================
          RESUMEN
      ==================================================== */}

      <section
        className="max-w-[1700px]
 mx-auto
 grid
 grid-cols-1
 sm:grid-cols-3
 gap-4"
      >

        <div
          className="erp-card
 p-5"
        >

          <div
            className="uppercase"
          >
            Total
          </div>

          <div
            className="mt-1"
          >
            {tipos.length}
          </div>

        </div>


        <div
          className="erp-card
 p-5"
        >

          <div
            className="uppercase"
          >
            Activos
          </div>

          <div
            className="mt-1"
          >
            {totalActivos}
          </div>

        </div>


        <div
          className="erp-card
 p-5"
        >

          <div
            className="uppercase"
          >
            Inactivos
          </div>

          <div
            className="mt-1"
          >
            {totalInactivos}
          </div>

        </div>

      </section>


      {/* ====================================================
          FILTROS
      ==================================================== */}

      <section
        className="erp-card
 max-w-[1700px]
 mx-auto
 p-5"
      >

        <div
          className="grid
 grid-cols-1
 md:grid-cols-[1fr_220px]
 gap-3"
        >

          <input
            type="text"
            value={busqueda}
            onChange={(e) =>
              setBusqueda(
                e.target.value
              )
            }
            placeholder="Buscar tipo de carga..."
            className="w-full
 
 
 
 
 px-4
 py-3"
          />


          <select
            value={filtroActivo}
            onChange={(e) =>
              setFiltroActivo(
                e.target.value
              )
            }
            className="px-4
 py-3"
          >

            <option value="true">
              Solo activos
            </option>

            <option value="false">
              Solo inactivos
            </option>

            <option value="">
              Todos
            </option>

          </select>

        </div>

      </section>


      {/* ====================================================
          TABLA
      ==================================================== */}

      <section
        className="erp-card
 max-w-[1700px]
 mx-auto
 overflow-hidden"
      >

        <div
          className="overflow-x-auto"
        >

          <table
            className="w-full"
          >

            <thead>

              <tr
               
              >

                <MolsanSortableTh label="Tipo de carga" sortKey="nombre" sortConfig={ordenTipos.sortConfig} onSort={ordenTipos.requestSort} className="px-5 py-3" />

                <MolsanSortableTh label="Estado" sortKey="activo" sortConfig={ordenTipos.sortConfig} onSort={ordenTipos.requestSort} className="px-5 py-3" />

                <th
                  className="px-5
 py-3"
                >
                  Acciones
                </th>

              </tr>

            </thead>


            <tbody>

              {cargando ? (

                <tr>

                  <td
                    colSpan={3}
                    className="px-5
 py-12"
                  >
                    Cargando catálogo…
                  </td>

                </tr>

              ) : tipos.length === 0 ? (

                <tr>

                  <td
                    colSpan={3}
                    className="px-5
 py-12"
                  >
                    No hay tipos de carga para los filtros seleccionados.
                  </td>

                </tr>

              ) : (

                ordenTipos.items.map(
                  (tipo) => (

                    <tr
                      key={tipo.id}
                     
                    >

                      <td
                        className="px-5
 py-4"
                      >
                        {tipo.nombre}
                      </td>


                      <td
                        className="px-5
 py-4"
                      >

                        <button
                          type="button"
                          onClick={() =>
                            cambiarEstado(
                              tipo
                            )
                          }
                          className="inline-flex
 items-center
 
 px-3
 py-1"
                          title="Cambiar estado"
                        >

                          {tipo.activo ? (

                            <span
                              className="px-3
 py-1"
                            >
                              Activo
                            </span>

                          ) : (

                            <span
                              className="px-3
 py-1"
                            >
                              Inactivo
                            </span>

                          )}

                        </button>

                      </td>


                      <td
                        className="px-5
 py-4"
                      >

                        <div
                          className="inline-flex
 items-center
 gap-2"
                        >

                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                tipo
                              )
                            }
                            className="px-3
 py-2"
                          >
                            Editar
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              eliminar(
                                tipo
                              )
                            }
                            className="px-3
 py-2"
                          >
                            Eliminar
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

      </section>


      {/* ====================================================
          MODAL
      ==================================================== */}

      {mostrarModal && (

        <div
          className="panel-modal-premium
 fixed
 inset-0
 z-[100]
 flex
 items-center
 justify-center
 
 p-4"
        >

          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={modoEdicion ? "Editar tipo de carga hipotecaria" : "Nuevo tipo de carga hipotecaria"}
            className="w-full
 max-w-xl"
          >

            <div
              className="px-6
 py-5
 
 
 flex
 items-center
 justify-between"
            >

              <div>

                <h2
                 
                >
                  {modoEdicion
                    ? "Editar tipo de carga hipotecaria"
                    : "Nuevo tipo de carga hipotecaria"}
                </h2>

                <p
                  className="mt-1"
                >
                  El nombre se guardará automáticamente en minúsculas.
                </p>

              </div>


              <button
                type="button"
                onClick={cerrarModal}
                className="w-9
 h-9"
              >
                ×
              </button>

            </div>


            <div
              className="p-6
 space-y-5"
            >

              <div>

                <label
                  className="block
 
 
 
 mb-2"
                >
                  Tipo de carga
                </label>

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) =>
                    setNombre(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter"
                    ) {

                      e.preventDefault();

                      guardar();
                    }

                  }}
                  placeholder="Ejemplo: prestamo hipotecario"
                  autoFocus
                  className="w-full
 
 
 
 px-4
 py-3"
                />

              </div>


              <label
                className="flex
 items-center
 gap-3"
              >

                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) =>
                    setActivo(
                      e.target.checked
                    )
                  }
                  className="w-4
 h-4"
                />

                <span
                 
                >
                  Tipo de carga activo
                </span>

              </label>

            </div>


            <div
              className="px-6
 py-4
 
 
 flex
 justify-end
 gap-3"
            >

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="px-4
 py-2.5"
              >
                Cancelar
              </button>


              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="px-5
 py-2.5"
              >
                {guardando
                  ? "Guardando…"
                  : "Guardar"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
