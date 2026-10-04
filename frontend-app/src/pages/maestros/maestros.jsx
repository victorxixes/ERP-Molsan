import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMaestros,
  crearMaestro,
  editarMaestro,
  eliminarMaestro,
} from "../../api/maestros";

/**
 * ============================================================
 * MAESTROS — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Gestiona:
 * - Departamentos
 * - Secciones
 * - Cargos
 *
 * CRUD completo conectado con:
 * /api/maestros/*
 *
 * Visual:
 * - Premium ERP
 * - Variables --erp-*
 * - Responsive
 * - Buscador
 * - Contadores
 * - Modal crear / editar
 * - Confirmación eliminar
 * ============================================================
 */

const TIPOS = [
  {
    key: "departamentos",
    label: "Departamentos",
    singular: "Departamento",
    icon: "building",
  },
  {
    key: "secciones",
    label: "Secciones",
    singular: "Sección",
    icon: "layers",
  },
  {
    key: "cargos",
    label: "Cargos",
    singular: "Cargo",
    icon: "briefcase",
  },
];

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

export default function Maestros() {

  // ==========================================================
  // ESTADO
  // ==========================================================

  const [tipoActivo, setTipoActivo] = useState(
    "departamentos"
  );

  const [datos, setDatos] = useState([]);

  const [cargando, setCargando] = useState(false);

  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);

  const [modoModal, setModoModal] = useState("crear");

  const [registroEditar, setRegistroEditar] =
    useState(null);

  const [nombre, setNombre] = useState("");

  const [guardando, setGuardando] = useState(false);

  const [errorFormulario, setErrorFormulario] =
    useState(null);

  // ==========================================================
  // CONFIGURACIÓN ACTUAL
  // ==========================================================

  const tipoActual = useMemo(
    () =>
      TIPOS.find(
        (tipo) =>
          tipo.key === tipoActivo
      ) || TIPOS[0],
    [tipoActivo]
  );

  // ==========================================================
  // CARGAR DATOS
  // ==========================================================

  const cargarDatos = useCallback(
    async () => {

      setCargando(true);
      setError(null);

      try {

        const response =
          await getMaestros(
            tipoActivo
          );

        setDatos(
          Array.isArray(response?.data)
            ? response.data
            : []
        );

      } catch (err) {

        console.error(
          "Error cargando maestro:",
          err
        );

        setDatos([]);

        setError(
          err?.response?.data?.detail ||
          `No se ha podido cargar ${tipoActual.label.toLowerCase()}.`
        );

      } finally {

        setCargando(false);

      }

    },
    [tipoActivo, tipoActual.label]
  );

  // ==========================================================
  // CAMBIO DE TIPO
  // ==========================================================

  useEffect(() => {

    setBusqueda("");

    cargarDatos();

  }, [cargarDatos]);

  // ==========================================================
  // FILTRADO
  // ==========================================================

  const datosFiltrados = useMemo(() => {

    const texto =
      busqueda
        .trim()
        .toLowerCase();

    if (!texto) {
      return datos;
    }

    return datos.filter(
      (registro) =>
        String(
          registro?.nombre ?? ""
        )
          .toLowerCase()
          .includes(texto)
    );

  }, [datos, busqueda]);

  // ==========================================================
  // ABRIR CREAR
  // ==========================================================

  const abrirCrear = () => {

    setModoModal("crear");

    setRegistroEditar(null);

    setNombre("");

    setErrorFormulario(null);

    setModalAbierto(true);

  };

  // ==========================================================
  // ABRIR EDITAR
  // ==========================================================

  const abrirEditar = (registro) => {

    setModoModal("editar");

    setRegistroEditar(registro);

    setNombre(
      registro?.nombre ?? ""
    );

    setErrorFormulario(null);

    setModalAbierto(true);

  };

  // ==========================================================
  // CERRAR MODAL
  // ==========================================================

  const cerrarModal = () => {

    if (guardando) {
      return;
    }

    setModalAbierto(false);

    setModoModal("crear");

    setRegistroEditar(null);

    setNombre("");

    setErrorFormulario(null);

  };

  // ==========================================================
  // GUARDAR
  // ==========================================================

  const guardar = async (event) => {

    event.preventDefault();

    const nombreLimpio =
      nombre.trim();

    if (!nombreLimpio) {

      setErrorFormulario(
        `Introduce el nombre del ${tipoActual.singular.toLowerCase()}.`
      );

      return;

    }

    setGuardando(true);

    setErrorFormulario(null);

    try {

      if (
        modoModal === "editar" &&
        registroEditar?.id
      ) {

        await editarMaestro(
          tipoActivo,
          registroEditar.id,
          nombreLimpio
        );

      } else {

        await crearMaestro(
          tipoActivo,
          nombreLimpio
        );

      }

      cerrarModal();

      await cargarDatos();

    } catch (err) {

      console.error(
        "Error guardando maestro:",
        err
      );

      setErrorFormulario(
        err?.response?.data?.detail ||
        "No se ha podido guardar el registro."
      );

    } finally {

      setGuardando(false);

    }

  };

  // ==========================================================
  // ELIMINAR
  // ==========================================================

  const eliminar = async (registro) => {

    if (!registro?.id) {
      return;
    }

    const confirmado =
      window.confirm(
        `¿Seguro que quieres eliminar "${registro.nombre}"?`
      );

    if (!confirmado) {
      return;
    }

    try {

      setError(null);

      await eliminarMaestro(
        tipoActivo,
        registro.id
      );

      await cargarDatos();

    } catch (err) {

      console.error(
        "Error eliminando maestro:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        "No se ha podido eliminar el registro."
      );

    }

  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        space-y-6
        animate-fade-in
      "
    >

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-[24px]
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          shadow-sm
          p-5
          sm:p-6
        "
      >

        <div
          className="
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-5
          "
        >

          {/* TÍTULO */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-2xl
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                border
                border-[var(--erp-border)]
                flex
                items-center
                justify-center
                shadow-sm
              "
            >

              <svg
                className="w-6 h-6"
                aria-hidden="true"
              >
                <use
                  href="/icons/icons.svg#settings"
                />
              </svg>

            </div>

            <div>

              <h1
                className="
                  text-2xl
                  font-bold
                  text-[var(--erp-text)]
                "
              >
                Maestros
              </h1>

              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                  mt-0.5
                "
              >
                Gestión de departamentos, secciones y cargos
              </p>

            </div>

          </div>


          {/* CONTADOR */}

          <div
            className="
              inline-flex
              items-center
              gap-2
              px-4
              py-2.5
              rounded-xl
              bg-[var(--erp-surface-soft)]
              border
              border-[var(--erp-border)]
              text-sm
              text-[var(--erp-text-soft)]
              w-fit
            "
          >

            <span
              className="
                w-2
                h-2
                rounded-full
                bg-[var(--erp-primary)]
              "
            />

            <span>
              {datos.length}{" "}
              {datos.length === 1
                ? tipoActual.singular.toLowerCase()
                : tipoActual.label.toLowerCase()}
            </span>

          </div>

        </div>

      </section>


      {/* ======================================================
          SELECTOR DE MAESTRO
          ====================================================== */}

      <section
        className="
          rounded-[24px]
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          shadow-sm
          p-4
        "
      >

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-3
          "
        >

          {TIPOS.map((tipo) => {

            const activo =
              tipo.key === tipoActivo;

            const cantidad =
              tipo.key === tipoActivo
                ? datos.length
                : null;

            return (
              <button
                key={tipo.key}
                type="button"
                onClick={() =>
                  setTipoActivo(
                    tipo.key
                  )
                }
                className={`
                  group
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  p-4
                  text-left
                  transition-all
                  duration-200

                  ${
                    activo
                      ? `
                        bg-[var(--erp-primary)]
                        border-[var(--erp-primary)]
                        text-white
                        shadow-md
                      `
                      : `
                        bg-[var(--erp-surface-soft)]
                        border-[var(--erp-border)]
                        text-[var(--erp-text)]
                        hover:bg-[var(--erp-primary-soft)]
                      `
                  }
                `}
              >

                <div
                  className={`
                    w-10
                    h-10
                    rounded-xl
                    flex
                    items-center
                    justify-center
                    border

                    ${
                      activo
                        ? `
                          bg-white/15
                          border-white/20
                          text-white
                        `
                        : `
                          bg-[var(--erp-surface)]
                          border-[var(--erp-border)]
                          text-[var(--erp-primary)]
                        `
                    }
                  `}
                >

                  <svg
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <use
                      href={`/icons/icons.svg#${tipo.icon}`}
                    />
                  </svg>

                </div>


                <div className="min-w-0">

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <span
                      className="
                        font-semibold
                        truncate
                      "
                    >
                      {tipo.label}
                    </span>

                    {activo && (
                      <span
                        className="
                          text-[10px]
                          uppercase
                          tracking-wide
                          opacity-75
                        "
                      >
                        Activo
                      </span>
                    )}

                  </div>

                  <div
                    className={`
                      text-xs
                      mt-0.5

                      ${
                        activo
                          ? "text-white/75"
                          : "text-[var(--erp-text-soft)]"
                      }
                    `}
                  >
                    {cantidad !== null
                      ? `${cantidad} registros`
                      : "Gestionar maestro"}
                  </div>

                </div>

              </button>
            );

          })}

        </div>

      </section>


      {/* ======================================================
          LISTADO
          ====================================================== */}

      <section
        className="
          rounded-[24px]
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          shadow-sm
          overflow-hidden
        "
      >

        {/* CABECERA */}

        <div
          className="
            px-5
            sm:px-6
            py-5
            border-b
            border-[var(--erp-border)]
          "
        >

          <div
            className="
              flex
              flex-col
              xl:flex-row
              xl:items-center
              xl:justify-between
              gap-4
            "
          >

            <div>

              <h2
                className="
                  text-lg
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                {tipoActual.label}
              </h2>

              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                  mt-1
                "
              >
                Administra los registros disponibles
                en el sistema.
              </p>

            </div>


            <div
              className="
                flex
                flex-col
                sm:flex-row
                gap-3
                w-full
                xl:w-auto
              "
            >

              {/* BUSCADOR */}

              <div
                className="
                  relative
                  w-full
                  sm:w-72
                "
              >

                <svg
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    w-4
                    h-4
                    text-[var(--erp-text-soft)]
                  "
                  aria-hidden="true"
                >
                  <use
                    href="/icons/icons.svg#search"
                  />
                </svg>

                <input
                  type="text"
                  value={busqueda}
                  onChange={(event) =>
                    setBusqueda(
                      event.target.value
                    )
                  }
                  placeholder={`Buscar ${tipoActual.label.toLowerCase()}...`}
                  className="
                    w-full
                    h-11
                    pl-10
                    pr-4
                    rounded-xl
                    border
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface-soft)]
                    text-sm
                    text-[var(--erp-text)]
                    outline-none
                    transition
                    focus:border-[var(--erp-primary)]
                    focus:ring-2
                    focus:ring-[var(--erp-primary-soft)]
                  "
                />

              </div>


              {/* NUEVO */}

              <button
                type="button"
                onClick={abrirCrear}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  h-11
                  px-4
                  rounded-xl
                  bg-[var(--erp-primary)]
                  text-white
                  text-sm
                  font-semibold
                  shadow-sm
                  transition
                  hover:opacity-90
                  active:scale-[0.98]
                "
              >

                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <use
                    href="/icons/icons.svg#plus"
                  />
                </svg>

                Nuevo {tipoActual.singular}

              </button>

            </div>

          </div>

        </div>


        {/* ERROR */}

        {error && (

          <div
            className="
              mx-5
              sm:mx-6
              mt-5
              p-4
              rounded-xl
              bg-red-50
              border
              border-red-200
              text-red-700
              text-sm
            "
          >
            {error}
          </div>

        )}


        {/* TABLA */}

        <div className="p-5 sm:p-6">

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              overflow-hidden
            "
          >

            <div className="overflow-x-auto">

              <table
                className="
                  w-full
                  text-sm
                "
              >

                <thead>

                  <tr
                    className="
                      bg-[var(--erp-surface-soft)]
                      border-b
                      border-[var(--erp-border)]
                    "
                  >

                    <th
                      className="
                        py-3
                        px-4
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-[var(--erp-text-soft)]
                        w-24
                      "
                    >
                      ID
                    </th>

                    <th
                      className="
                        py-3
                        px-4
                        text-left
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-[var(--erp-text-soft)]
                      "
                    >
                      Nombre
                    </th>

                    <th
                      className="
                        py-3
                        px-4
                        text-right
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-[var(--erp-text-soft)]
                        w-40
                      "
                    >
                      Acciones
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {/* CARGANDO */}

                  {cargando && (

                    <tr>

                      <td
                        colSpan={3}
                        className="
                          py-14
                          text-center
                        "
                      >

                        <div
                          className="
                            flex
                            flex-col
                            items-center
                            justify-center
                          "
                        >

                          <div
                            className="
                              w-7
                              h-7
                              rounded-full
                              border-2
                              border-[var(--erp-border)]
                              border-t-[var(--erp-primary)]
                              animate-spin
                              mb-3
                            "
                          />

                          <span
                            className="
                              text-sm
                              text-[var(--erp-text-soft)]
                            "
                          >
                            Cargando registros...
                          </span>

                        </div>

                      </td>

                    </tr>

                  )}


                  {/* SIN DATOS */}

                  {!cargando &&
                    datosFiltrados.length === 0 && (

                      <tr>

                        <td
                          colSpan={3}
                          className="
                            py-14
                            text-center
                          "
                        >

                          <div
                            className="
                              flex
                              flex-col
                              items-center
                              justify-center
                            "
                          >

                            <div
                              className="
                                w-14
                                h-14
                                rounded-2xl
                                bg-[var(--erp-primary-soft)]
                                border
                                border-[var(--erp-border)]
                                text-[var(--erp-primary)]
                                flex
                                items-center
                                justify-center
                                mb-4
                              "
                            >

                              <svg
                                className="w-6 h-6"
                                aria-hidden="true"
                              >
                                <use
                                  href="/icons/icons.svg#database"
                                />
                              </svg>

                            </div>

                            <h3
                              className="
                                text-base
                                font-semibold
                                text-[var(--erp-text)]
                              "
                            >
                              No hay registros
                            </h3>

                            <p
                              className="
                                text-sm
                                text-[var(--erp-text-soft)]
                                mt-1
                              "
                            >
                              {busqueda
                                ? "No se encontraron registros con la búsqueda actual."
                                : `Todavía no hay ${tipoActual.label.toLowerCase()} registrados.`}
                            </p>

                          </div>

                        </td>

                      </tr>

                    )}


                  {/* REGISTROS */}

                  {!cargando &&
                    datosFiltrados.map(
                      (registro) => (

                        <tr
                          key={registro.id}
                          className="
                            border-b
                            border-[var(--erp-border)]
                            last:border-b-0
                            transition-all
                            duration-150
                            hover:bg-[var(--erp-primary-soft)]
                          "
                        >

                          <td
                            className="
                              py-3.5
                              px-4
                              text-[var(--erp-text-soft)]
                              font-medium
                            "
                          >
                            #{registro.id}
                          </td>


                          <td
                            className="
                              py-3.5
                              px-4
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
                                  w-9
                                  h-9
                                  rounded-xl
                                  bg-[var(--erp-primary-soft)]
                                  text-[var(--erp-primary)]
                                  border
                                  border-[var(--erp-border)]
                                  flex
                                  items-center
                                  justify-center
                                  flex-shrink-0
                                "
                              >

                                <svg
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                >
                                  <use
                                    href={`/icons/icons.svg#${tipoActual.icon}`}
                                  />
                                </svg>

                              </div>

                              <span
                                className="
                                  font-semibold
                                  text-[var(--erp-text)]
                                "
                              >
                                {registro.nombre ||
                                  "Sin nombre"}
                              </span>

                            </div>

                          </td>


                          <td
                            className="
                              py-3.5
                              px-4
                            "
                          >

                            <div
                              className="
                                flex
                                items-center
                                justify-end
                                gap-2
                              "
                            >

                              {/* EDITAR */}

                              <button
                                type="button"
                                onClick={() =>
                                  abrirEditar(
                                    registro
                                  )
                                }
                                title="Editar"
                                className="
                                  w-9
                                  h-9
                                  rounded-xl
                                  border
                                  border-[var(--erp-border)]
                                  bg-[var(--erp-surface)]
                                  text-[var(--erp-primary)]
                                  flex
                                  items-center
                                  justify-center
                                  transition
                                  hover:bg-[var(--erp-primary-soft)]
                                "
                              >

                                <svg
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                >
                                  <use
                                    href="/icons/icons.svg#edit"
                                  />
                                </svg>

                              </button>


                              {/* ELIMINAR */}

                              <button
                                type="button"
                                onClick={() =>
                                  eliminar(
                                    registro
                                  )
                                }
                                title="Eliminar"
                                className="
                                  w-9
                                  h-9
                                  rounded-xl
                                  border
                                  border-red-200
                                  bg-red-50
                                  text-red-600
                                  flex
                                  items-center
                                  justify-center
                                  transition
                                  hover:bg-red-100
                                "
                              >

                                <svg
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                >
                                  <use
                                    href="/icons/icons.svg#trash"
                                  />
                                </svg>

                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          MODAL
          ====================================================== */}

      {modalAbierto && (

        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            p-4
            bg-slate-950/40
            backdrop-blur-sm
          "
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              cerrarModal();
            }

          }}
        >

          <div
            className="
              w-full
              max-w-lg
              rounded-[24px]
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              shadow-2xl
              overflow-hidden
            "
          >

            {/* CABECERA MODAL */}

            <div
              className="
                px-6
                py-5
                border-b
                border-[var(--erp-border)]
                flex
                items-center
                justify-between
                gap-4
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
                    w-10
                    h-10
                    rounded-xl
                    bg-[var(--erp-primary-soft)]
                    text-[var(--erp-primary)]
                    border
                    border-[var(--erp-border)]
                    flex
                    items-center
                    justify-center
                  "
                >

                  <svg
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <use
                      href={`/icons/icons.svg#${tipoActual.icon}`}
                    />
                  </svg>

                </div>

                <div>

                  <h3
                    className="
                      text-lg
                      font-semibold
                      text-[var(--erp-text)]
                    "
                  >
                    {modoModal === "editar"
                      ? `Editar ${tipoActual.singular}`
                      : `Nuevo ${tipoActual.singular}`}
                  </h3>

                  <p
                    className="
                      text-xs
                      text-[var(--erp-text-soft)]
                      mt-0.5
                    "
                  >
                    {tipoActual.label}
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="
                  w-9
                  h-9
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface-soft)]
                  text-[var(--erp-text-soft)]
                  flex
                  items-center
                  justify-center
                  hover:text-[var(--erp-text)]
                  transition
                "
                title="Cerrar"
              >

                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <use
                    href="/icons/icons.svg#x"
                  />
                </svg>

              </button>

            </div>


            {/* FORMULARIO */}

            <form
              onSubmit={guardar}
              className="p-6"
            >

              <label
                className="
                  block
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                  mb-2
                "
              >
                Nombre
              </label>

              <input
                type="text"
                value={nombre}
                onChange={(event) =>
                  setNombre(
                    event.target.value
                  )
                }
                autoFocus
                disabled={guardando}
                placeholder={`Nombre del ${tipoActual.singular.toLowerCase()}`}
                className="
                  w-full
                  h-12
                  px-4
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface-soft)]
                  text-[var(--erp-text)]
                  outline-none
                  transition
                  focus:border-[var(--erp-primary)]
                  focus:ring-2
                  focus:ring-[var(--erp-primary-soft)]
                  disabled:opacity-60
                "
              />


              {errorFormulario && (

                <div
                  className="
                    mt-3
                    p-3
                    rounded-xl
                    bg-red-50
                    border
                    border-red-200
                    text-red-700
                    text-sm
                  "
                >
                  {errorFormulario}
                </div>

              )}


              {/* ACCIONES */}

              <div
                className="
                  flex
                  flex-col-reverse
                  sm:flex-row
                  sm:justify-end
                  gap-3
                  mt-6
                "
              >

                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="
                    h-11
                    px-5
                    rounded-xl
                    border
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface-soft)]
                    text-[var(--erp-text)]
                    text-sm
                    font-semibold
                    transition
                    hover:bg-[var(--erp-surface)]
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={guardando}
                  className="
                    h-11
                    px-5
                    rounded-xl
                    bg-[var(--erp-primary)]
                    text-white
                    text-sm
                    font-semibold
                    shadow-sm
                    transition
                    hover:opacity-90
                    disabled:opacity-60
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                  "
                >

                  {guardando && (

                    <span
                      className="
                        w-4
                        h-4
                        rounded-full
                        border-2
                        border-white/40
                        border-t-white
                        animate-spin
                      "
                    />

                  )}

                  {guardando
                    ? "Guardando..."
                    : modoModal === "editar"
                      ? "Guardar cambios"
                      : "Crear registro"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}
