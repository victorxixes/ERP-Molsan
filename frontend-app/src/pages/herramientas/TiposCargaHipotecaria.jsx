import React, {
  useEffect,
  useMemo,
  useState,
} from "react";


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
      className="
        erp-page
        space-y-5
      "
    >

      {/* ====================================================
          CABECERA
      ==================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          p-5
        "
      >

        <div
          className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-4
          "
        >

          <div>

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-11
                  h-11
                  rounded-xl
                  bg-[var(--erp-primary-soft)]
                  border
                  border-[var(--erp-border)]
                  flex
                  items-center
                  justify-center
                  text-xl
                "
              >
                🏠
              </div>

              <div>

                <h1
                  className="
                    text-2xl
                    font-bold
                    text-[var(--erp-text)]
                  "
                >
                  Tipos de Carga Hipotecaria
                </h1>

                <p
                  className="
                    text-sm
                    text-[var(--erp-text-soft)]
                    mt-0.5
                  "
                >
                  Catálogo de tipos de carga hipotecaria
                </p>

              </div>

            </div>

          </div>


          <button
            type="button"
            onClick={abrirNuevo}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              px-4
              py-2.5
              bg-[var(--erp-primary)]
              text-white
              text-sm
              font-semibold
              shadow-sm
              hover:opacity-90
              transition
            "
          >
            <span className="text-lg">
              ＋
            </span>

            Nuevo tipo de carga

          </button>

        </div>

      </section>


      {/* ====================================================
          MENSAJES
      ==================================================== */}

      {mensaje && (

        <div
          className="
            max-w-[1700px]
            mx-auto
            rounded-xl
            border
            border-green-200
            bg-green-50
            text-green-700
            px-4
            py-3
            text-sm
            font-medium
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
            text-red-700
            px-4
            py-3
            text-sm
            font-medium
          "
        >
          {error}
        </div>

      )}


      {/* ====================================================
          RESUMEN
      ==================================================== */}

      <section
        className="
          max-w-[1700px]
          mx-auto
          grid
          grid-cols-1
          sm:grid-cols-3
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
              text-xs
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
              font-semibold
            "
          >
            Total
          </div>

          <div
            className="
              text-3xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {tipos.length}
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
              text-xs
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
              font-semibold
            "
          >
            Activos
          </div>

          <div
            className="
              text-3xl
              font-bold
              text-green-600
              mt-1
            "
          >
            {totalActivos}
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
              text-xs
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
              font-semibold
            "
          >
            Inactivos
          </div>

          <div
            className="
              text-3xl
              font-bold
              text-slate-500
              mt-1
            "
          >
            {totalInactivos}
          </div>

        </div>

      </section>


      {/* ====================================================
          FILTROS
      ==================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          p-5
        "
      >

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-[1fr_220px]
            gap-3
          "
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
            className="
              w-full
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              px-4
              py-3
              text-sm
              text-[var(--erp-text)]
              outline-none
              focus:ring-2
              focus:ring-[var(--erp-primary)]
            "
          />


          <select
            value={filtroActivo}
            onChange={(e) =>
              setFiltroActivo(
                e.target.value
              )
            }
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              px-4
              py-3
              text-sm
              text-[var(--erp-text)]
              outline-none
            "
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
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >

        <div
          className="
            overflow-x-auto
          "
        >

          <table
            className="
              w-full
              text-sm
            "
          >

            <thead>

              <tr
                className="
                  bg-[var(--erp-primary)]
                  text-white
                "
              >

                <th
                  className="
                    px-5
                    py-3
                    text-left
                    font-semibold
                  "
                >
                  Tipo de carga
                </th>

                <th
                  className="
                    px-5
                    py-3
                    text-center
                    font-semibold
                  "
                >
                  Estado
                </th>

                <th
                  className="
                    px-5
                    py-3
                    text-right
                    font-semibold
                  "
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
                    className="
                      px-5
                      py-12
                      text-center
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Cargando catálogo…
                  </td>

                </tr>

              ) : tipos.length === 0 ? (

                <tr>

                  <td
                    colSpan={3}
                    className="
                      px-5
                      py-12
                      text-center
                      text-[var(--erp-text-soft)]
                    "
                  >
                    No hay tipos de carga para los filtros seleccionados.
                  </td>

                </tr>

              ) : (

                tipos.map(
                  (tipo) => (

                    <tr
                      key={tipo.id}
                      className="
                        border-t
                        border-[var(--erp-border)]
                        hover:bg-[var(--erp-primary-soft)]
                        transition
                      "
                    >

                      <td
                        className="
                          px-5
                          py-4
                          text-[var(--erp-text)]
                          font-medium
                        "
                      >
                        {tipo.nombre}
                      </td>


                      <td
                        className="
                          px-5
                          py-4
                          text-center
                        "
                      >

                        <button
                          type="button"
                          onClick={() =>
                            cambiarEstado(
                              tipo
                            )
                          }
                          className="
                            inline-flex
                            items-center
                            rounded-full
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            transition
                          "
                          title="Cambiar estado"
                        >

                          {tipo.activo ? (

                            <span
                              className="
                                rounded-full
                                bg-green-100
                                text-green-700
                                px-3
                                py-1
                              "
                            >
                              Activo
                            </span>

                          ) : (

                            <span
                              className="
                                rounded-full
                                bg-slate-100
                                text-slate-600
                                px-3
                                py-1
                              "
                            >
                              Inactivo
                            </span>

                          )}

                        </button>

                      </td>


                      <td
                        className="
                          px-5
                          py-4
                          text-right
                        "
                      >

                        <div
                          className="
                            inline-flex
                            items-center
                            gap-2
                          "
                        >

                          <button
                            type="button"
                            onClick={() =>
                              abrirEditar(
                                tipo
                              )
                            }
                            className="
                              rounded-lg
                              border
                              border-[var(--erp-border)]
                              bg-white
                              px-3
                              py-2
                              text-xs
                              font-semibold
                              text-[var(--erp-text)]
                              hover:bg-slate-50
                            "
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
                            className="
                              rounded-lg
                              border
                              border-red-200
                              bg-red-50
                              px-3
                              py-2
                              text-xs
                              font-semibold
                              text-red-600
                              hover:bg-red-100
                            "
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
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/40
            p-4
          "
        >

          <div
            className="
              w-full
              max-w-xl
              rounded-2xl
              bg-white
              shadow-2xl
              border
              border-slate-200
            "
          >

            <div
              className="
                px-6
                py-5
                border-b
                border-slate-200
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
                  {modoEdicion
                    ? "Editar tipo de carga hipotecaria"
                    : "Nuevo tipo de carga hipotecaria"}
                </h2>

                <p
                  className="
                    text-xs
                    text-slate-500
                    mt-1
                  "
                >
                  El nombre se guardará automáticamente en minúsculas.
                </p>

              </div>


              <button
                type="button"
                onClick={cerrarModal}
                className="
                  w-9
                  h-9
                  rounded-lg
                  border
                  border-slate-200
                  text-slate-500
                  hover:bg-slate-50
                "
              >
                ×
              </button>

            </div>


            <div
              className="
                p-6
                space-y-5
              "
            >

              <div>

                <label
                  className="
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                    mb-2
                  "
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
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    px-4
                    py-3
                    text-sm
                    text-slate-800
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                  "
                />

              </div>


              <label
                className="
                  flex
                  items-center
                  gap-3
                  cursor-pointer
                "
              >

                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) =>
                    setActivo(
                      e.target.checked
                    )
                  }
                  className="
                    w-4
                    h-4
                  "
                />

                <span
                  className="
                    text-sm
                    font-medium
                    text-slate-700
                  "
                >
                  Tipo de carga activo
                </span>

              </label>

            </div>


            <div
              className="
                px-6
                py-4
                border-t
                border-slate-200
                flex
                justify-end
                gap-3
              "
            >

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-slate-700
                  hover:bg-slate-50
                "
              >
                Cancelar
              </button>


              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="
                  rounded-xl
                  bg-[var(--erp-primary)]
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  hover:opacity-90
                  disabled:opacity-50
                "
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
