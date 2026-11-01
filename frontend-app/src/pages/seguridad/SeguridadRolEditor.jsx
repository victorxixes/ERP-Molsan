import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";


const API_URL = String(
  import.meta.env.VITE_API_URL || "https://agenda-intranet-b.onrender.com/api"
).replace(/\/api\/?$/, "");


export default function SeguridadRolEditor() {

  const {
    roles = [],
    cargarTodo,
  } = useSeguridad();


  const [modo, setModo] =
    useState("lista");

  const [rolEditando, setRolEditando] =
    useState(null);

  const [nombreRol, setNombreRol] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [eliminandoId, setEliminandoId] =
    useState(null);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");


  // ============================================================
  // ROLES
  // ============================================================

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);


  const rolesSeguros = useMemo(() => {

    if (!Array.isArray(roles)) {
      return [];
    }

    return roles.filter(
      (rol) =>
        rol &&
        typeof rol === "object" &&
        rol.id !== undefined &&
        rol.id !== null &&
        typeof rol.nombre === "string" &&
        rol.nombre.trim() !== ""
    );

  }, [roles]);


  // ============================================================
  // CREAR
  // ============================================================

  const iniciarCrear = useCallback(() => {

    setModo("crear");
    setRolEditando(null);
    setNombreRol("");
    setMensaje("");
    setError("");

  }, []);


  // ============================================================
  // EDITAR
  // ============================================================

  const iniciarEditar = useCallback(
    (rol) => {

      if (
        !rol ||
        typeof rol.nombre !== "string"
      ) {
        return;
      }

      setModo("editar");
      setRolEditando(rol);
      setNombreRol(rol.nombre);
      setMensaje("");
      setError("");

    },
    []
  );


  // ============================================================
  // CANCELAR
  // ============================================================

  const cancelar = useCallback(() => {

    setModo("lista");
    setRolEditando(null);
    setNombreRol("");
    setMensaje("");
    setError("");

  }, []);


  // ============================================================
  // GUARDAR
  // ============================================================

  const guardarRol = useCallback(
    async () => {

      const nombre =
        nombreRol.trim();

      if (!nombre) {

        setError(
          "Introduce un nombre para el rol."
        );

        return;
      }

      setGuardando(true);
      setMensaje("");
      setError("");

      try {

        let respuesta;

        // ------------------------------------------------------
        // CREAR
        // ------------------------------------------------------

        if (modo === "crear") {

          respuesta =
            await fetch(
              `${API_URL}/api/seguridad/roles`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  nombre,
                }),
              }
            );
        }

        // ------------------------------------------------------
        // EDITAR
        // ------------------------------------------------------

        else if (
          modo === "editar" &&
          rolEditando?.id !== undefined
        ) {

          respuesta =
            await fetch(
              `${API_URL}/api/seguridad/roles/${rolEditando.id}`,
              {
                method: "PUT",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  nombre,
                }),
              }
            );
        }

        else {

          throw new Error(
            "Operación de rol no válida."
          );
        }


        if (!respuesta.ok) {

          let detalle =
            "";

          try {

            const data =
              await respuesta.json();

            detalle =
              data?.detail ||
              data?.message ||
              "";

          } catch {
            // El backend puede no devolver JSON.
          }

          throw new Error(
            detalle ||
            "No se pudo guardar el rol."
          );
        }


        // ------------------------------------------------------
        // RECARGAR STORE
        // ------------------------------------------------------

        await cargarTodo();


        setMensaje(
          modo === "crear"
            ? "Rol creado correctamente."
            : "Rol actualizado correctamente."
        );

        setModo("lista");
        setRolEditando(null);
        setNombreRol("");

      } catch (err) {

        console.error("Error guardando rol:", "Error interno");

        setError(
          err?.message ||
          "No se ha podido guardar el rol."
        );

      } finally {

        setGuardando(false);

      }

    },
    [
      nombreRol,
      modo,
      rolEditando,
      cargarTodo,
    ]
  );


  // ============================================================
  // ELIMINAR
  // ============================================================

  const eliminarRol =
    useCallback(
      async (id) => {

        if (
          id === null ||
          id === undefined
        ) {
          return;
        }


        const confirmado =
          window.confirm(
            "¿Seguro que quieres eliminar este rol?"
          );


        if (!confirmado) {
          return;
        }


        setEliminandoId(id);
        setMensaje("");
        setError("");


        try {

          const respuesta =
            await fetch(
              `${API_URL}/api/seguridad/roles/${id}`,
              {
                method: "DELETE",
              }
            );


          if (!respuesta.ok) {

            let detalle =
              "";

            try {

              const data =
                await respuesta.json();

              detalle =
                data?.detail ||
                data?.message ||
                "";

            } catch {
              // Sin cuerpo JSON.
            }

            throw new Error(
              detalle ||
              "No se pudo eliminar el rol."
            );
          }


          await cargarTodo();


          setMensaje(
            "Rol eliminado correctamente."
          );

        } catch (err) {

          console.error("Error eliminando rol:", "Error interno");

          setError(
            err?.message ||
            "No se ha podido eliminar el rol."
          );

        } finally {

          setEliminandoId(null);

        }

      },
      [cargarTodo]
    );


  // ============================================================
  // TECLADO
  // ============================================================

  const manejarKeyDown =
    useCallback(
      (event) => {

        if (
          event.key === "Enter" &&
          !guardando
        ) {

          event.preventDefault();

          guardarRol();

        }


        if (
          event.key === "Escape" &&
          !guardando
        ) {

          event.preventDefault();

          cancelar();

        }

      },
      [
        guardarRol,
        cancelar,
        guardando,
      ]
    );


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="erp-page space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MolsanPageHeader mark="SE" title="Editor de roles" description="Gestiona los roles disponibles en Molsan ERP." />
        {modo === "lista" && (
          <button type="button" onClick={iniciarCrear} className="erp-btn erp-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5">
            <span>+</span>
            Crear rol
          </button>
        )}
      </div>

      {/* ======================================================
          MENSAJES
      ====================================================== */}

      {mensaje && (

        <div
          className="flex items-center gap-3
 
 
 
 px-4 py-3"
        >

          <span>
            ✓
          </span>

          <span>
            {mensaje}
          </span>

        </div>

      )}


      {error && (

        <div
          className="flex items-center gap-3
 
 
 
 px-4 py-3"
        >

          <span>
            !
          </span>

          <span>
            {error}
          </span>

        </div>

      )}


      {/* ======================================================
          LISTADO
      ====================================================== */}

      {modo === "lista" && (

        <section className="erp-card overflow-hidden">

          <div
            className="flex flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between
 gap-3
 px-6 py-5"
          >

            <div>

              <h2>
                Roles existentes
              </h2>

              <p className="mt-1">

                {rolesSeguros.length}

                {" "}

                {rolesSeguros.length === 1
                  ? "rol disponible"
                  : "roles disponibles"}

              </p>

            </div>


            <div
              className="inline-flex items-center
 px-3 py-1.5"
            >
              Gestión de seguridad
            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[620px]">

              <thead>

                <tr
                 
                >

                  <th
                    className="px-6 py-3
 
 
 
 uppercase"
                  >
                    ID
                  </th>


                  <th
                    className="px-6 py-3
 
 
 
 uppercase"
                  >
                    Nombre
                  </th>


                  <th
                    className="px-6 py-3
 
 
 
 uppercase"
                  >
                    Acciones
                  </th>

                </tr>

              </thead>


              <tbody>

                {rolesSeguros.length === 0 ? (

                  <tr>

                    <td
                      colSpan={3}
                      className="px-6 py-12"
                    >
                      No hay roles disponibles.
                    </td>

                  </tr>

                ) : (

                  rolesSeguros.map(
                    (rol) => {

                      const eliminando =
                        String(
                          eliminandoId
                        ) ===
                        String(
                          rol.id
                        );


                      return (

                        <tr
                          key={String(rol.id)}
                         
                        >

                          <td className="px-6 py-4">

                            <span
                              className="inline-flex
 items-center justify-center
 min-w-9
 px-2.5 py-1"
                            >
                              {String(rol.id)}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <div className="flex
 items-center
 gap-3">

                              <div
                                className="w-9 h-9
 
 flex items-center justify-center"
                              >
                                {rol.nombre
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>


                              <div>

                                <div
                                 
                                >
                                  {rol.nombre}
                                </div>

                                <div
                                  className="mt-0.5"
                                >
                                  Rol de seguridad
                                </div>

                              </div>

                            </div>

                          </td>


                          <td className="px-6 py-4">

                            <div className="flex
 justify-end
 gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  iniciarEditar(rol)
                                }
                                className="inline-flex
 items-center
 gap-1.5
 px-3 py-2"
                              >
                                Editar
                              </button>


                              <button
                                type="button"
                                disabled={eliminando}
                                onClick={() =>
                                  eliminarRol(
                                    rol.id
                                  )
                                }
                                className="inline-flex
 items-center
 gap-1.5
 px-3 py-2"
                              >
                                {eliminando
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </button>

                            </div>

                          </td>

                        </tr>

                      );

                    }
                  )

                )}

              </tbody>

            </table>

          </div>

        </section>

      )}


      {/* ======================================================
          CREAR / EDITAR
      ====================================================== */}

      {(modo === "crear" ||
        modo === "editar") && (

        <section className="erp-card">

          <div
            className="px-6 py-5"
          >

            <div className="flex
 items-center
 gap-3">

              <div
                className="w-10 h-10
 
 
 
 flex
 items-center
 justify-center"
              >
                {modo === "crear"
                  ? "+"
                  : "✎"}
              </div>


              <div>

                <h2>
                  {modo === "crear"
                    ? "Crear nuevo rol"
                    : "Editar rol"}
                </h2>

                <p className="mt-0.5">
                  {modo === "crear"
                    ? "Añade un nuevo rol al sistema."
                    : `Modifica la información del rol #${rolEditando?.id ?? "-"}.`}
                </p>

              </div>

            </div>

          </div>


          <div className="p-6">

            <div className="max-w-2xl">

              <label
                htmlFor="seguridad-nombre-rol"
                className="block
 
 
 
 mb-2"
              >
                Nombre del rol
              </label>


              <input
                id="seguridad-nombre-rol"
                type="text"
                autoFocus
                value={nombreRol}
                disabled={guardando}
                onChange={(event) => {

                  setNombreRol(
                    event.target.value
                  );

                  setError("");

                }}
                onKeyDown={manejarKeyDown}
                placeholder="Ej. Administrador"
                className="w-full
 px-4 py-3"
              />


              <p className="mt-2">
                Utiliza un nombre claro y descriptivo para identificar
                fácilmente las funciones asociadas al rol.
              </p>

            </div>


            <div
              className="flex
 flex-wrap
 gap-3
 mt-6
 pt-5"
            >

              <button
                type="button"
                disabled={
                  guardando ||
                  !nombreRol.trim()
                }
                onClick={guardarRol}
                className="erp-btn erp-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5"
              >

                {guardando ? (

                  <>

                    <span
                      className="w-4 h-4"
                    />

                    Guardando...

                  </>

                ) : (

                  "Guardar rol"

                )}

              </button>


              <button
                type="button"
                disabled={guardando}
                onClick={cancelar}
                className="erp-btn erp-btn-secondary px-5 py-2.5"
              >
                Cancelar
              </button>

            </div>

          </div>

        </section>

      )}

    </div>

  );

}
