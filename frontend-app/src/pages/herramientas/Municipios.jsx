import { useEffect, useMemo, useState } from "react";

/**
 * MUNICIPIOS — MOLSAN ERP PREMIUM 2027
 *
 * Gestión completa:
 * - Buscar
 * - Filtrar por CCAA
 * - Filtrar por provincia
 * - Alta
 * - Edición
 * - Eliminación
 * - Paginación
 */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://agenda-intranet-b.onrender.com/api";

const POR_PAGINA = 50;


/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function Municipios() {

  const [municipios, setMunicipios] = useState([]);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [ccaaFiltro, setCcaaFiltro] = useState("");

  const [provinciaFiltro, setProvinciaFiltro] = useState("");

  const [pagina, setPagina] = useState(1);

  const [modalAbierto, setModalAbierto] = useState(false);

  const [modoModal, setModoModal] = useState("crear");

  const [municipioSeleccionado, setMunicipioSeleccionado] =
    useState(null);

  const [guardando, setGuardando] = useState(false);

  const [eliminando, setEliminando] = useState(null);


  /* =======================================================
     CARGAR MUNICIPIOS
  ======================================================= */

  useEffect(() => {

    cargarMunicipios();

  }, []);


  async function cargarMunicipios() {

    try {

      setCargando(true);
      setError("");

      const respuesta = await fetch(
        `${API_BASE}/municipios`
      );

      if (!respuesta.ok) {
        throw new Error(
          `Error HTTP ${respuesta.status}`
        );
      }

      const datos = await respuesta.json();

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
        "No se han podido cargar los municipios."
      );

    } finally {

      setCargando(false);

    }

  }


  /* =======================================================
     CCAA DISPONIBLES
  ======================================================= */

  const ccaas = useMemo(() => {

    return [
      ...new Set(
        municipios
          .map((item) => item.ccaa)
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

  }, [municipios]);


  /* =======================================================
     PROVINCIAS DISPONIBLES
  ======================================================= */

  const provincias = useMemo(() => {

    let datos = municipios;

    if (ccaaFiltro) {

      datos = datos.filter(
        (item) =>
          item.ccaa === ccaaFiltro
      );

    }

    return [
      ...new Set(
        datos
          .map((item) => item.provincia)
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

  }, [
    municipios,
    ccaaFiltro,
  ]);


  /* =======================================================
     FILTRADO
  ======================================================= */

  const municipiosFiltrados = useMemo(() => {

    const texto =
      busqueda
        .trim()
        .toLocaleLowerCase(
          "es"
        );

    return municipios.filter(
      (item) => {

        const coincideTexto =
          !texto ||
          [
            item.ccaa,
            item.provincia,
            item.municipio,
          ]
            .filter(Boolean)
            .some(
              (valor) =>
                String(valor)
                  .toLocaleLowerCase(
                    "es"
                  )
                  .includes(texto)
            );

        const coincideCcaa =
          !ccaaFiltro ||
          item.ccaa === ccaaFiltro;

        const coincideProvincia =
          !provinciaFiltro ||
          item.provincia ===
            provinciaFiltro;

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
    provinciaFiltro,
  ]);


  /* =======================================================
     PAGINACIÓN
  ======================================================= */

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      municipiosFiltrados.length /
        POR_PAGINA
    )
  );


  const paginaSegura = Math.min(
    pagina,
    totalPaginas
  );


  const inicio =
    (paginaSegura - 1) *
    POR_PAGINA;


  const municipiosPagina =
    municipiosFiltrados.slice(
      inicio,
      inicio + POR_PAGINA
    );


  /* =======================================================
     CAMBIAR FILTROS
  ======================================================= */

  function cambiarCcaa(valor) {

    setCcaaFiltro(valor);

    setProvinciaFiltro("");

    setPagina(1);

  }


  function cambiarProvincia(valor) {

    setProvinciaFiltro(valor);

    setPagina(1);

  }


  function cambiarBusqueda(valor) {

    setBusqueda(valor);

    setPagina(1);

  }


  function limpiarFiltros() {

    setBusqueda("");

    setCcaaFiltro("");

    setProvinciaFiltro("");

    setPagina(1);

  }


  /* =======================================================
     ABRIR CREAR
  ======================================================= */

  function abrirCrear() {

    setModoModal("crear");

    setMunicipioSeleccionado({
      ccaa: "",
      provincia: "",
      municipio: "",
    });

    setModalAbierto(true);

  }


  /* =======================================================
     ABRIR EDITAR
  ======================================================= */

  function abrirEditar(municipio) {

    setModoModal("editar");

    setMunicipioSeleccionado({
      ...municipio,
    });

    setModalAbierto(true);

  }


  /* =======================================================
     CERRAR MODAL
  ======================================================= */

  function cerrarModal() {

    if (guardando) {
      return;
    }

    setModalAbierto(false);

    setMunicipioSeleccionado(
      null
    );

  }


  /* =======================================================
     GUARDAR
  ======================================================= */

  async function guardarMunicipio(datos) {

    try {

      setGuardando(true);

      setError("");

      const esEdicion =
        modoModal === "editar";

      const url = esEdicion
        ? `${API_BASE}/municipios/${datos.id}`
        : `${API_BASE}/municipios`;

      const metodo = esEdicion
        ? "PUT"
        : "POST";

      const respuesta = await fetch(
        url,
        {
          method: metodo,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ccaa: datos.ccaa.trim(),
            provincia:
              datos.provincia.trim(),
            municipio:
              datos.municipio.trim(),
          }),
        }
      );

      const resultado =
        await respuesta.json()
          .catch(() => null);

      if (!respuesta.ok) {

        throw new Error(
          resultado?.detail ||
            "No se ha podido guardar el municipio."
        );

      }

      setModalAbierto(false);

      setMunicipioSeleccionado(
        null
      );

      await cargarMunicipios();

    } catch (e) {

      console.error(
        "Error guardando municipio:",
        e
      );

      setError(
        e.message ||
          "No se ha podido guardar el municipio."
      );

    } finally {

      setGuardando(false);

    }

  }


  /* =======================================================
     ELIMINAR
  ======================================================= */

  async function eliminarMunicipio(
    municipio
  ) {

    const confirmar =
      window.confirm(
        `¿Seguro que quieres eliminar el municipio "${municipio.municipio}"?`
      );

    if (!confirmar) {
      return;
    }

    try {

      setEliminando(
        municipio.id
      );

      setError("");

      const respuesta =
        await fetch(
          `${API_BASE}/municipios/${municipio.id}`,
          {
            method: "DELETE",
          }
        );

      const resultado =
        await respuesta.json()
          .catch(() => null);

      if (!respuesta.ok) {

        throw new Error(
          resultado?.detail ||
            "No se ha podido eliminar el municipio."
        );

      }

      await cargarMunicipios();

    } catch (e) {

      console.error(
        "Error eliminando municipio:",
        e
      );

      setError(
        e.message ||
          "No se ha podido eliminar el municipio."
      );

    } finally {

      setEliminando(null);

    }

  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">


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
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-5
          "
        >

          <div className="flex items-center gap-4">

            <div
              className="
                flex h-12 w-12 shrink-0
                items-center justify-center
                rounded-2xl
                bg-blue-50
                border border-blue-100
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

              <p className="mt-1 text-sm text-slate-500">
                Gestión de comunidades autónomas,
                provincias y municipios.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={abrirCrear}
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
              shadow-sm
              transition-all
              hover:bg-blue-700
              hover:-translate-y-0.5
              hover:shadow-md
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


      {/* =====================================================
          ERROR
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
          <div className="flex items-start gap-3">

            <span className="text-lg">
              ⚠️
            </span>

            <div>

              <div className="font-semibold">
                Se ha producido un error
              </div>

              <div className="mt-1">
                {error}
              </div>

            </div>

          </div>
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
            xl:grid-cols-4
            gap-4
          "
        >

          {/* BUSCAR */}

          <div className="xl:col-span-2">

            <label
              className="
                block
                mb-1.5
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
                placeholder="Buscar municipio, provincia o CCAA..."
                className="
                  w-full
                  rounded-xl
                  border border-slate-200
                  bg-white
                  pl-10
                  pr-4
                  py-2.5
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              />

            </div>

          </div>


          {/* CCAA */}

          <div>

            <label
              className="
                block
                mb-1.5
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
                focus:border-blue-400
                focus:ring-4
                focus:ring-blue-500/10
              "
            >

              <option value="">
                Todas las comunidades
              </option>

              {ccaas.map((ccaa) => (

                <option
                  key={ccaa}
                  value={ccaa}
                >
                  {ccaa}
                </option>

              ))}

            </select>

          </div>


          {/* PROVINCIA */}

          <div>

            <label
              className="
                block
                mb-1.5
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
                focus:border-blue-400
                focus:ring-4
                focus:ring-blue-500/10
              "
            >

              <option value="">
                Todas las provincias
              </option>

              {provincias.map(
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

        </div>


        {/* PIE FILTROS */}

        <div
          className="
            mt-4
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
          "
        >

          <div className="text-sm text-slate-500">

            Mostrando{" "}

            <span className="font-semibold text-slate-700">
              {municipiosFiltrados.length.toLocaleString(
                "es-ES"
              )}
            </span>

            {" "}municipios

          </div>


          {(busqueda ||
            ccaaFiltro ||
            provinciaFiltro) && (

            <button
              type="button"
              onClick={limpiarFiltros}
              className="
                text-sm
                font-medium
                text-blue-600
                hover:text-blue-700
                transition
              "
            >
              Limpiar filtros
            </button>

          )}

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
          bg-white/80
          backdrop-blur-xl
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
              text-slate-500
            "
          >

            <div className="flex items-center gap-3">

              <div
                className="
                  h-5 w-5
                  animate-spin
                  rounded-full
                  border-2
                  border-slate-200
                  border-t-blue-600
                "
              />

              <span className="text-sm">
                Cargando municipios...
              </span>

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

            <div className="text-4xl">
              🏘️
            </div>

            <h3
              className="
                mt-4
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
                text-slate-500
              "
            >
              Prueba a modificar los filtros de búsqueda.
            </p>

          </div>

        ) : (

          <>

            <div className="overflow-x-auto">

              <table
                className="
                  w-full
                  min-w-[850px]
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
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-500
                      "
                    >
                      CCAA
                    </th>

                    <th
                      className="
                        px-5
                        py-3.5
                        text-left
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
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
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-500
                      "
                    >
                      Municipio
                    </th>

                    <th
                      className="
                        px-5
                        py-3.5
                        text-right
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
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
                          border-b
                          border-slate-100
                          last:border-b-0
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
                            font-medium
                            text-slate-700
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
                            text-slate-800
                          "
                        >
                          {municipio.municipio}
                        </td>


                        <td
                          className="
                            px-5
                            py-3.5
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
                                  municipio
                                )
                              }
                              className="
                                rounded-lg
                                border
                                border-slate-200
                                bg-white
                                px-3
                                py-1.5
                                text-xs
                                font-semibold
                                text-slate-600
                                transition
                                hover:border-blue-200
                                hover:bg-blue-50
                                hover:text-blue-600
                              "
                            >
                              ✏️ Editar
                            </button>


                            <button
                              type="button"
                              onClick={() =>
                                eliminarMunicipio(
                                  municipio
                                )
                              }
                              disabled={
                                eliminando ===
                                municipio.id
                              }
                              className="
                                rounded-lg
                                border
                                border-red-100
                                bg-white
                                px-3
                                py-1.5
                                text-xs
                                font-semibold
                                text-red-500
                                transition
                                hover:border-red-200
                                hover:bg-red-50
                                hover:text-red-600
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                            >

                              {eliminando ===
                              municipio.id
                                ? "Eliminando..."
                                : "🗑️ Eliminar"}

                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>


            {/* =================================================
                PAGINACIÓN
            ================================================= */}

            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                sm:justify-between
                gap-3
                border-t
                border-slate-200
                px-5
                py-4
              "
            >

              <div
                className="
                  text-xs
                  text-slate-500
                "
              >

                Página{" "}

                <span className="font-semibold text-slate-700">
                  {paginaSegura}
                </span>

                {" "}de{" "}

                <span className="font-semibold text-slate-700">
                  {totalPaginas}
                </span>

              </div>


              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <button
                  type="button"
                  disabled={
                    paginaSegura <= 1
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
                    hover:border-blue-200
                    hover:bg-blue-50
                    hover:text-blue-600
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  ← Anterior
                </button>


                <button
                  type="button"
                  disabled={
                    paginaSegura >=
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
                    hover:border-blue-200
                    hover:bg-blue-50
                    hover:text-blue-600
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  Siguiente →
                </button>

              </div>

            </div>

          </>

        )}

      </div>


      {/* =====================================================
          MODAL
      ===================================================== */}

      {modalAbierto &&
        municipioSeleccionado && (

          <ModalMunicipio
            modo={modoModal}
            municipio={
              municipioSeleccionado
            }
            guardando={guardando}
            onCerrar={
              cerrarModal
            }
            onGuardar={
              guardarMunicipio
            }
          />

        )}

    </div>

  );

}


/* =========================================================
   MODAL MUNICIPIO
========================================================= */

function ModalMunicipio({
  modo,
  municipio,
  guardando,
  onCerrar,
  onGuardar,
}) {

  const [formulario, setFormulario] =
    useState({
      id: municipio.id,
      ccaa: municipio.ccaa || "",
      provincia:
        municipio.provincia || "",
      municipio:
        municipio.municipio || "",
    });


  const [error, setError] =
    useState("");


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


  function enviar(e) {

    e.preventDefault();

    const ccaa =
      formulario.ccaa.trim();

    const provincia =
      formulario.provincia.trim();

    const nombreMunicipio =
      formulario.municipio.trim();


    if (!ccaa) {

      setError(
        "La comunidad autónoma es obligatoria."
      );

      return;

    }


    if (!provincia) {

      setError(
        "La provincia es obligatoria."
      );

      return;

    }


    if (!nombreMunicipio) {

      setError(
        "El municipio es obligatorio."
      );

      return;

    }


    setError("");


    onGuardar({
      ...formulario,
      ccaa,
      provincia,
      municipio:
        nombreMunicipio,
    });

  }


  return (

    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-slate-900/40
        px-4
        py-6
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
          shadow-[0_25px_80px_rgba(15,23,42,0.22)]
        "
      >

        {/* CABECERA */}

        <div
          className="
            border-b
            border-slate-200
            bg-slate-50/80
            px-6
            py-5
          "
        >

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-50
                  border
                  border-blue-100
                  text-lg
                "
              >
                {modo === "crear"
                  ? "➕"
                  : "✏️"}
              </div>

              <div>

                <h2
                  className="
                    text-lg
                    font-bold
                    text-slate-800
                  "
                >
                  {modo === "crear"
                    ? "Nuevo municipio"
                    : "Editar municipio"}
                </h2>

                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  {modo === "crear"
                    ? "Añade un nuevo municipio al maestro."
                    : "Modifica los datos del municipio."}
                </p>

              </div>

            </div>


            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
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
                hover:text-slate-600
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
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-slate-500
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
                placeholder="Ej. País Vasco"
                disabled={guardando}
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
                  placeholder:text-slate-400
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-500/10
                  disabled:bg-slate-50
                "
              />

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
                placeholder="Ej. Araba/Álava"
                disabled={guardando}
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
                  placeholder:text-slate-400
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-500/10
                  disabled:bg-slate-50
                "
              />

            </div>


            {/* MUNICIPIO */}

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
                placeholder="Ej. Alegría-Dulantzi"
                disabled={guardando}
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
                  placeholder:text-slate-400
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-500/10
                  disabled:bg-slate-50
                "
              />

            </div>

          </div>


          {/* ERROR */}

          {error && (

            <div
              className="
                mt-4
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >
              {error}
            </div>

          )}


          {/* BOTONES */}

          <div
            className="
              mt-6
              flex
              justify-end
              gap-3
            "
          >

            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                px-5
                py-2.5
                text-sm
                font-semibold
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
                hover:shadow-md
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
                : modo === "crear"
                  ? "Crear municipio"
                  : "Guardar cambios"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}
