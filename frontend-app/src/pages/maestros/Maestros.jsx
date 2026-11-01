import MolsanDataTable from "../../components/ui/MolsanDataTable";
import MolsanButton from "../../components/ui/MolsanButton";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./Maestros.css";

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
 * Backend:
 * /api/maestros/departamentos
 * /api/maestros/secciones
 * /api/maestros/cargos
 *
 * CRUD:
 * GET
 * POST
 * PUT
 * DELETE
 * ============================================================
 */


/* ============================================================
   CONFIGURACIÓN
============================================================ */

const TIPOS_MAESTRO = [
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
   COMPONENTE
============================================================ */

export default function Maestros() {

  /* ----------------------------------------------------------
     ESTADO
  ---------------------------------------------------------- */

  const [tipoActivo, setTipoActivo] =
    useState("departamentos");

  const [datos, setDatos] =
    useState([]);

  const [cargando, setCargando] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [mensaje, setMensaje] =
    useState(null);

  const [modoFormulario, setModoFormulario] =
    useState(null);

  const [registroEditando, setRegistroEditando] =
    useState(null);

  const [nombre, setNombre] =
    useState("");


  /* ----------------------------------------------------------
     CONFIGURACIÓN ACTIVA
  ---------------------------------------------------------- */

  const tipoActual = useMemo(
    () =>
      TIPOS_MAESTRO.find(
        (tipo) => tipo.key === tipoActivo
      ) || TIPOS_MAESTRO[0],
    [tipoActivo]
  );


  /* ----------------------------------------------------------
     CARGAR DATOS
  ---------------------------------------------------------- */

  const cargarDatos = useCallback(
    async () => {

      setCargando(true);
      setError(null);

      try {

        const res =
          await getMaestros(tipoActivo);

        setDatos(
          Array.isArray(res.data)
            ? res.data
            : []
        );

      } catch (err) {

        console.error("Maestros: error cargando datos:", "Error interno");

        setDatos([]);

        setError(
          err?.response?.data?.detail ||
          `No se han podido cargar los ${tipoActual.label.toLowerCase()}.`
        );

      } finally {

        setCargando(false);

      }

    },
    [tipoActivo, tipoActual.label]
  );


  /* ----------------------------------------------------------
     CAMBIO DE TIPO
  ---------------------------------------------------------- */

  useEffect(() => {

    setMensaje(null);
    setError(null);

    setModoFormulario(null);
    setRegistroEditando(null);
    setNombre("");

    cargarDatos();

  }, [
    tipoActivo,
    cargarDatos,
  ]);


  /* ----------------------------------------------------------
     ABRIR CREAR
  ---------------------------------------------------------- */

  const abrirCrear = () => {

    setModoFormulario("crear");
    setRegistroEditando(null);
    setNombre("");
    setError(null);
    setMensaje(null);

  };


  /* ----------------------------------------------------------
     ABRIR EDITAR
  ---------------------------------------------------------- */

  const abrirEditar = (registro) => {

    setModoFormulario("editar");
    setRegistroEditando(registro);
    setNombre(registro?.nombre || "");
    setError(null);
    setMensaje(null);

  };


  /* ----------------------------------------------------------
     CANCELAR FORMULARIO
  ---------------------------------------------------------- */

  const cancelarFormulario = () => {

    if (guardando) {
      return;
    }

    setModoFormulario(null);
    setRegistroEditando(null);
    setNombre("");
    setError(null);

  };


  /* ----------------------------------------------------------
     GUARDAR
  ---------------------------------------------------------- */

  const guardar = async (event) => {

    event.preventDefault();

    const nombreLimpio =
      nombre.trim();

    if (!nombreLimpio) {

      setError(
        `Debes introducir un nombre de ${tipoActual.singular.toLowerCase()}.`
      );

      return;

    }

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {

      if (modoFormulario === "crear") {

        await crearMaestro(
          tipoActivo,
          nombreLimpio
        );

        setMensaje(
          `${tipoActual.singular} creado correctamente.`
        );

      } else if (
        modoFormulario === "editar" &&
        registroEditando?.id
      ) {

        await editarMaestro(
          tipoActivo,
          registroEditando.id,
          nombreLimpio
        );

        setMensaje(
          `${tipoActual.singular} actualizado correctamente.`
        );

      }

      setModoFormulario(null);
      setRegistroEditando(null);
      setNombre("");

      await cargarDatos();

    } catch (err) {

      console.error("Maestros: error guardando:", "Error interno");

      setError(
        err?.response?.data?.detail ||
        `No se ha podido guardar el ${tipoActual.singular.toLowerCase()}.`
      );

    } finally {

      setGuardando(false);

    }

  };


  /* ----------------------------------------------------------
     ELIMINAR
  ---------------------------------------------------------- */

  const eliminar = async (registro) => {

    if (!registro?.id) {
      return;
    }

    const confirmado =
      window.confirm(
        `¿Seguro que quieres eliminar el ${tipoActual.singular.toLowerCase()} "${registro.nombre}"?`
      );

    if (!confirmado) {
      return;
    }

    setError(null);
    setMensaje(null);
    setGuardando(true);

    try {

      await eliminarMaestro(
        tipoActivo,
        registro.id
      );

      setMensaje(
        `${tipoActual.singular} eliminado correctamente.`
      );

      await cargarDatos();

    } catch (err) {

      console.error("Maestros: error eliminando:", "Error interno");

      setError(
        err?.response?.data?.detail ||
        `No se ha podido eliminar el ${tipoActual.singular.toLowerCase()}.`
      );

    } finally {

      setGuardando(false);

    }

  };


  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  return (
    <div className="molsan-page-stack catalogos-premium-page maestros-premium-page animate-fade-in">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <header className="molsan-page-header">

        <div>

          <div
            className="molsan-page-header__identity"
          >

            <div
              className="molsan-page-header__mark"
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


            <div>

              <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
              <h1 className="molsan-page-header__title">Maestros</h1>

              <p className="molsan-page-header__description">Gestión de departamentos, secciones y cargos</p>

            </div>

          </div>

        </div>


        <div
          className="molsan-page-header__actions"
        >

          <span
            className="
              w-2
              h-2
              rounded-full
              bg-emerald-500
            "
          />

          Gestión de datos maestros

        </div>

      </header>


      {/* ======================================================
          PANEL PRINCIPAL
      ====================================================== */}

      <section
        className="erp-card overflow-hidden"
      >

        {/* ====================================================
            SELECTORES
        ==================================================== */}

        <div
          className="
            px-6
            py-5
            border-b
            border-[var(--erp-border)]
            bg-[var(--erp-surface-soft)]
          "
        >

          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >

            {TIPOS_MAESTRO.map((tipo) => {

              const activo =
                tipo.key === tipoActivo;

              return (

                <button
                  key={tipo.key}
                  type="button"
                  onClick={() =>
                    setTipoActivo(tipo.key)
                  }
                  className={`
                    inline-flex
                    items-center
                    gap-2
                    px-4
                    py-2.5
                    rounded-xl
                    border
                    text-sm
                    font-semibold
                    transition-all
                    duration-200

                    ${
                      activo
                        ? `
                          bg-[var(--erp-primary)]
                          border-[var(--erp-primary)]
                          text-white
                          shadow-sm
                        `
                        : `
                          bg-[var(--erp-surface)]
                          border-[var(--erp-border)]
                          text-[var(--erp-text)]
                          hover:bg-[var(--erp-primary-soft)]
                        `
                    }
                  `}
                >

                  <svg
                    className={`
                      w-4
                      h-4
                      ${
                        activo
                          ? "text-white"
                          : "text-[var(--erp-primary)]"
                      }
                    `}
                    aria-hidden="true"
                  >

                    <use
                      href={`/icons/icons.svg#${tipo.icon}`}
                    />

                  </svg>

                  {tipo.label}

                </button>

              );

            })}

          </div>

        </div>


        {/* ====================================================
            CONTENIDO
        ==================================================== */}

        <div className="p-6">

          {/* ==================================================
              MENSAJE OK
          ================================================== */}

          {mensaje && (

            <div
              className="
                mb-5
                p-4
                rounded-xl
                bg-emerald-50
                border
                border-emerald-200
                text-emerald-700
                text-sm
                font-medium
              "
            >
              {mensaje}
            </div>

          )}


          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <div
              className="
                mb-5
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


          {/* ==================================================
              CABECERA LISTADO
          ================================================== */}

          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-3
              mb-4
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
                {datos.length}{" "}
                {datos.length === 1
                  ? "registro"
                  : "registros"}
              </p>

            </div>


            <button
              type="button"
              onClick={abrirCrear}
              disabled={guardando}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                px-4
                py-2.5
                rounded-xl
                bg-[var(--erp-primary)]
                border
                border-[var(--erp-primary)]
                text-white
                text-sm
                font-semibold
                shadow-sm
                hover:opacity-90
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
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


          {/* ==================================================
              FORMULARIO
          ================================================== */}

          {modoFormulario && (

            <form
              onSubmit={guardar}
              className="
                mb-5
                p-5
                rounded-2xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface-soft)]
              "
            >

              <div
                className="
                  flex
                  flex-col
                  lg:flex-row
                  lg:items-end
                  gap-4
                "
              >

                <div className="flex-1">

                  <label
                    htmlFor="maestro-nombre"
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
                    id="maestro-nombre"
                    type="text"
                    value={nombre}
                    onChange={(event) =>
                      setNombre(event.target.value)
                    }
                    disabled={guardando}
                    autoFocus
                    maxLength={255}
                    placeholder={
                      `Nombre del ${tipoActual.singular.toLowerCase()}`
                    }
                    className="
                      w-full
                      px-4
                      py-2.5
                      rounded-xl
                      border
                      border-[var(--erp-border)]
                      bg-[var(--erp-surface)]
                      text-[var(--erp-text)]
                      outline-none
                      focus:ring-2
                      focus:ring-[var(--erp-primary)]
                      disabled:opacity-50
                    "
                  />

                </div>


                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >

                  <button
                    type="submit"
                    disabled={
                      guardando ||
                      !nombre.trim()
                    }
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      px-4
                      py-2.5
                      rounded-xl
                      bg-[var(--erp-primary)]
                      border
                      border-[var(--erp-primary)]
                      text-white
                      text-sm
                      font-semibold
                      hover:opacity-90
                      transition
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                    "
                  >

                    {guardando
                      ? "Guardando..."
                      : modoFormulario === "crear"
                        ? "Crear"
                        : "Guardar cambios"}

                  </button>


                  <button
                    type="button"
                    onClick={cancelarFormulario}
                    disabled={guardando}
                    className="
                      px-4
                      py-2.5
                      rounded-xl
                      border
                      border-[var(--erp-border)]
                      bg-[var(--erp-surface)]
                      text-[var(--erp-text)]
                      text-sm
                      font-semibold
                      hover:bg-[var(--erp-primary-soft)]
                      transition
                      disabled:opacity-50
                    "
                  >
                    Cancelar
                  </button>

                </div>

              </div>

            </form>

          )}


          {/* ==================================================
              CARGANDO
          ================================================== */}

          {cargando && (

            <div
              className="
                py-16
                flex
                flex-col
                items-center
                justify-center
                text-center
              "
            >

              <div
                className="
                  w-8
                  h-8
                  rounded-full
                  border-2
                  border-[var(--erp-border)]
                  border-t-[var(--erp-primary)]
                  animate-spin
                  mb-4
                "
              />

              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                "
              >
                Cargando {tipoActual.label.toLowerCase()}...
              </p>

            </div>

          )}


          {/* ==================================================
              LISTADO VACÍO
          ================================================== */}

          {!cargando &&
            datos.length === 0 && (
              <div
                className="
                  py-16
                  rounded-2xl
                  border
                  border-dashed
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface-soft)]
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                  px-6
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
                    text-lg
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
                    mt-2
                    max-w-md
                  "
                >
                  Todavía no existen{" "}
                  {tipoActual.label.toLowerCase()}.
                  Puedes crear el primero utilizando el botón
                  superior.
                </p>

              </div>
            )}


          {/* ==================================================
              TABLA
          ================================================== */}

          {!cargando &&
            datos.length > 0 && (

              <div
                className="
                  rounded-2xl
                  border
                  border-[var(--erp-border)]
                  overflow-hidden
                  bg-[var(--erp-surface-soft)]
                "
              >

                <MolsanDataTable
                  rows={datos}
                  rowKey="id"
                  pagination
                  pageSize={25}
                  searchable
                  initialSort={{ key: "nombre", direction: "asc" }}
                  emptyText="No hay registros en este catálogo."
                  columns={[
                    { key: "id", header: "ID", accessor: "id", sortType: "number", align: "center" },
                    { key: "nombre", header: "Nombre", accessor: "nombre", sortType: "text", render: (value) => <strong>{value || "—"}</strong> },
                    { key: "acciones", header: "Acciones", sortable: false, accessor: (item) => item.id, align: "right", render: (_, registro) => <div className="flex items-center justify-end gap-2"><MolsanButton type="button" variant="secondary" icon="pencil" className="molsan-btn--compact" disabled={guardando} onClick={() => abrirEditar(registro)}>Editar</MolsanButton><MolsanButton type="button" variant="danger" icon="trash-2" className="molsan-btn--compact" disabled={guardando} onClick={() => eliminar(registro)}>Eliminar</MolsanButton></div> },
                  ]}
                />

              </div>

            )}

        </div>

      </section>

    </div>
  );
}
