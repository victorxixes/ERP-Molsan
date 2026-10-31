import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMaestros,
  crearMaestro,
  editarMaestro,
  eliminarMaestro,
} from "../../api/maestros";


/**
 * ============================================================
 * MAESTROS
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
    <div className="erp-page min-w-0 space-y-6">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <MolsanPageHeader mark="MA" title="Maestros" description="Gestión de departamentos, secciones y cargos." />
      <div className="flex justify-end"><span className="molsan-panel inline-flex items-center gap-2 px-3 py-2">Gestión de datos maestros</span></div>


      {/* ======================================================
          PANEL PRINCIPAL
      ====================================================== */}

      <section
        className="overflow-hidden"
      >

        {/* ====================================================
            SELECTORES
        ==================================================== */}

        <div
          className="px-6
 py-5"
        >

          <div
            className="flex
 flex-wrap
 gap-2"
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
                  className={`inline-flex
 items-center
 gap-2
 px-4
 py-2.5
 
 
 
 
 
 

 `}
                >

                  <svg
                    className={`w-4
 h-4
 ${
 activo
 ? ""
 : ""
 }`}
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
              className="mb-5
 p-4"
            >
              {mensaje}
            </div>

          )}


          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <div
              className="mb-5
 p-4"
            >
              {error}
            </div>

          )}


          {/* ==================================================
              CABECERA LISTADO
          ================================================== */}

          <div
            className="flex
 flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between
 gap-3
 mb-4"
          >

            <div>

              <h2
               
              >
                {tipoActual.label}
              </h2>

              <p
                className="mt-1"
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
              className="inline-flex
 items-center
 justify-center
 gap-2
 px-4
 py-2.5"
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
              className="mb-5
 p-5"
            >

              <div
                className="flex
 flex-col
 lg:flex-row
 lg:items-end
 gap-4"
              >

                <div className="flex-1">

                  <label
                    htmlFor="maestro-nombre"
                    className="block
 
 
 
 mb-2"
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
                    className="w-full
 px-4
 py-2.5"
                  />

                </div>


                <div
                  className="flex
 items-center
 gap-2"
                >

                  <button
                    type="submit"
                    disabled={
                      guardando ||
                      !nombre.trim()
                    }
                    className="inline-flex
 items-center
 justify-center
 gap-2
 px-4
 py-2.5"
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
                    className="px-4
 py-2.5"
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
              className="py-16
 flex
 flex-col
 items-center
 justify-center"
            >

              <div
                className="w-8
 h-8
 
 
 
 
 
 mb-4"
              />

              <p
               
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
                className="py-16
 
 
 
 
 
 flex
 flex-col
 items-center
 justify-center
 
 px-6"
              >

                <div
                  className="w-14
 h-14
 
 
 
 
 
 flex
 items-center
 justify-center
 mb-4"
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
                 
                >
                  No hay registros
                </h3>

                <p
                  className="mt-2
 max-w-md"
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
                className="overflow-hidden"
              >

                <div className="overflow-x-auto">

                  <table
                    className="w-full"
                  >

                    <thead>

                      <tr
                       
                      >

                        <th
                          className="py-3
 px-4
 
 
 
 uppercase
 
 
 w-24"
                        >
                          ID
                        </th>

                        <th
                          className="py-3
 px-4
 
 
 
 uppercase"
                        >
                          Nombre
                        </th>

                        <th
                          className="py-3
 px-4
 
 
 
 uppercase
 
 
 w-48"
                        >
                          Acciones
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {datos.map((registro) => (

                        <tr
                          key={registro.id}
                         
                        >

                          <td
                            className="py-3
 px-4"
                          >
                            {registro.id}
                          </td>


                          <td
                            className="py-3
 px-4"
                          >
                            {registro.nombre || "—"}
                          </td>


                          <td
                            className="py-3
 px-4"
                          >

                            <div
                              className="flex
 items-center
 justify-end
 gap-2"
                            >

                              <button
                                type="button"
                                onClick={() =>
                                  abrirEditar(registro)
                                }
                                disabled={guardando}
                                className="inline-flex
 items-center
 gap-1.5
 px-3
 py-2"
                              >

                                <svg
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                >
                                  <use
                                    href="/icons/icons.svg#edit"
                                  />
                                </svg>

                                Editar

                              </button>


                              <button
                                type="button"
                                onClick={() =>
                                  eliminar(registro)
                                }
                                disabled={guardando}
                                className="inline-flex
 items-center
 gap-1.5
 px-3
 py-2"
                              >

                                <svg
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                >
                                  <use
                                    href="/icons/icons.svg#trash"
                                  />
                                </svg>

                                Eliminar

                              </button>

                            </div>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            )}

        </div>

      </section>

    </div>
  );
}
