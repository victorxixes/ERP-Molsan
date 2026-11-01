import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { crearRol, actualizarRol, eliminarRol as borrarRolApi } from "../../api/seguridad";
import "./SeguridadSubpaginasPremium.css";



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

        if (modo === "crear") {
          await crearRol({ nombre });
        } else if (modo === "editar" && rolEditando?.id !== undefined) {
          await actualizarRol(rolEditando.id, { nombre });
        } else {
          throw new Error("Operación de rol no válida.");
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

          await borrarRolApi(id);


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

    <div className="molsan-page-stack erp-page seguridad-subpagina-premium seguridad-rol-editor-premium animate-fade-in">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true">
            <MolsanIcon name="shield" size={42} bare />
          </div>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">SEGURIDAD · ADMINISTRACIÓN</p>
            <h1 className="molsan-page-header__title">
              {modo === "crear" ? "Crear rol" : modo === "editar" ? "Editar rol" : "Roles de seguridad"}
            </h1>
            <p className="molsan-page-header__description">
              {modo === "crear" ? "Define un nuevo perfil de acceso para MOLSAN ERP." : modo === "editar" ? "Actualiza el nombre del perfil de acceso." : "Gestiona los perfiles disponibles en MOLSAN ERP."}
            </p>
          </div>
        </div>
        <div className="molsan-page-header__actions">
          {modo === "lista" ? (
            <button type="button" onClick={iniciarCrear} className="molsan-btn molsan-btn--primary inline-flex items-center gap-2">
              <MolsanIcon name="plus" size={18} bare /> Crear rol
            </button>
          ) : (
            <button type="button" onClick={cancelar} disabled={guardando} className="molsan-btn molsan-btn--secondary inline-flex items-center gap-2">
              <MolsanIcon name="arrowLeft" size={18} bare /> Volver a roles
            </button>
          )}
        </div>
      </header>


      {/* ======================================================
          MENSAJES
      ====================================================== */}

      {mensaje && (

        <div
          className="
            flex items-center gap-3
            rounded-xl
            border border-emerald-200
            bg-emerald-50
            px-4 py-3
            text-sm text-emerald-700
          "
        >

          <MolsanIcon name="check" size={22} bare />

          <span>
            {mensaje}
          </span>

        </div>

      )}


      {error && (

        <div
          className="
            flex items-center gap-3
            rounded-xl
            border border-red-200
            bg-red-50
            px-4 py-3
            text-sm text-red-700
          "
        >

          <MolsanIcon name="alert" size={22} bare />

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
            className="
              flex flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-3
              px-6 py-5
              border-b border-[var(--erp-border)]
            "
          >

            <div>

              <h2 className="
                text-lg
                font-bold
                text-[var(--erp-text)]
              ">
                Roles existentes
              </h2>

              <p className="
                text-sm
                text-[var(--erp-muted)]
                mt-1
              ">

                {rolesSeguros.length}

                {" "}

                {rolesSeguros.length === 1
                  ? "rol disponible"
                  : "roles disponibles"}

              </p>

            </div>


            <div
              className="
                inline-flex items-center
                px-3 py-1.5
                rounded-full
                bg-[var(--erp-accent-soft)]
                text-[var(--erp-accent)]
                text-xs
                font-semibold
              "
            >
              Gestión de seguridad
            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[620px] text-sm">

              <thead>

                <tr
                  className="
                    bg-[var(--erp-surface-soft)]
                    border-b border-[var(--erp-border)]
                  "
                >

                  <th
                    className="
                      px-6 py-3
                      text-left
                      text-xs
                      font-bold
                      uppercase
                      tracking-wide
                      text-[var(--erp-muted)]
                    "
                  >
                    ID
                  </th>


                  <th
                    className="
                      px-6 py-3
                      text-left
                      text-xs
                      font-bold
                      uppercase
                      tracking-wide
                      text-[var(--erp-muted)]
                    "
                  >
                    Nombre
                  </th>


                  <th
                    className="
                      px-6 py-3
                      text-right
                      text-xs
                      font-bold
                      uppercase
                      tracking-wide
                      text-[var(--erp-muted)]
                    "
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
                      className="
                        px-6 py-12
                        text-center
                        text-sm
                        text-[var(--erp-muted)]
                      "
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
                          className="
                            border-b border-[var(--erp-border)]
                            last:border-b-0
                            hover:bg-[var(--erp-surface-soft)]
                            transition
                          "
                        >

                          <td className="px-6 py-4">

                            <span
                              className="
                                inline-flex
                                items-center justify-center
                                min-w-9
                                px-2.5 py-1
                                rounded-lg
                                bg-[var(--erp-surface-soft)]
                                border border-[var(--erp-border)]
                                text-xs
                                font-bold
                                text-[var(--erp-muted)]
                              "
                            >
                              {String(rol.id)}
                            </span>

                          </td>


                          <td className="px-6 py-4">

                            <div className="
                              flex
                              items-center
                              gap-3
                            ">

                              <div
                                className="
                                  w-9 h-9
                                  rounded-xl
                                  flex items-center justify-center
                                  bg-[var(--erp-accent-soft)]
                                  text-[var(--erp-accent)]
                                  font-bold
                                "
                              >
                                {rol.nombre
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>


                              <div>

                                <div
                                  className="
                                    font-semibold
                                    text-[var(--erp-text)]
                                  "
                                >
                                  {rol.nombre}
                                </div>

                                <div
                                  className="
                                    text-xs
                                    text-[var(--erp-muted)]
                                    mt-0.5
                                  "
                                >
                                  Rol de seguridad
                                </div>

                              </div>

                            </div>

                          </td>


                          <td className="px-6 py-4">

                            <div className="
                              flex
                              justify-end
                              gap-2
                            ">

                              <button
                                type="button"
                                onClick={() =>
                                  iniciarEditar(rol)
                                }
                                className="
                                  inline-flex
                                  items-center
                                  gap-1.5
                                  px-3 py-2
                                  rounded-lg
                                  border border-[var(--erp-border)]
                                  bg-white
                                  text-[var(--erp-text)]
                                  text-xs
                                  font-semibold
                                  hover:bg-[var(--erp-surface-soft)]
                                  transition
                                "
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
                                className="
                                  inline-flex
                                  items-center
                                  gap-1.5
                                  px-3 py-2
                                  rounded-lg
                                  border border-red-200
                                  bg-red-50
                                  text-red-600
                                  text-xs
                                  font-semibold
                                  hover:bg-red-100
                                  disabled:opacity-50
                                  disabled:cursor-not-allowed
                                  transition
                                "
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

        <section className="erp-card overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-white shadow-sm">

          <div
            className="
              px-6 py-5
              border-b border-[var(--erp-border)]
            "
          >

            <div className="
              flex
              items-center
              gap-3
            ">

              <div
                className="
                  w-10 h-10
                  rounded-xl
                  bg-[var(--erp-accent-soft)]
                  text-[var(--erp-accent)]
                  flex
                  items-center
                  justify-center
                  font-bold
                "
              >
                <MolsanIcon name={modo === "crear" ? "plus" : "pen"} size={28} bare />
              </div>


              <div>

                <h2 className="
                  text-lg
                  font-bold
                  text-[var(--erp-text)]
                ">
                  {modo === "crear"
                    ? "Crear nuevo rol"
                    : "Editar rol"}
                </h2>

                <p className="
                  text-sm
                  text-[var(--erp-muted)]
                  mt-0.5
                ">
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
                className="
                  block
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                  mb-2
                "
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
                className="
                  w-full
                  px-4 py-3
                  rounded-xl
                  border border-[var(--erp-border)]
                  bg-[var(--erp-input-bg)]
                  text-[var(--erp-text)]
                  placeholder:text-[var(--erp-muted)]
                  outline-none
                  focus:border-[var(--erp-accent)]
                  focus:ring-2
                  focus:ring-[var(--erp-accent-soft)]
                  disabled:opacity-60
                  transition
                "
              />


              <p className="
                mt-2
                text-xs
                text-[var(--erp-muted)]
              ">
                Utiliza un nombre claro y descriptivo para identificar
                fácilmente las funciones asociadas al rol.
              </p>

            </div>


            <div
              className="
                flex
                flex-wrap
                gap-3
                mt-6
                pt-5
                border-t border-[var(--erp-border)]
              "
            >

              <button
                type="button"
                disabled={
                  guardando ||
                  !nombreRol.trim()
                }
                onClick={guardarRol}
                className="molsan-btn molsan-btn--primary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {guardando ? (

                  <>

                    <span
                      className="
                        w-4 h-4
                        rounded-full
                        border-2
                        border-white/40
                        border-t-white
                        animate-spin
                      "
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
                className="molsan-btn molsan-btn--secondary disabled:opacity-50"
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
