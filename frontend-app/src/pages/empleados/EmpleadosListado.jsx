import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";

import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import AuthenticatedPhoto from "../../components/AuthenticatedPhoto";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";

import {
  buscarEmpleados,
} from "../../api/empleados";

import {
  useEmpleadosWS,
} from "../../hooks/useEmpleadosWS";

import {
  API_BASE,
} from "../../api/config";


/* ============================================================
   HELPERS
============================================================ */

const safeText = (
  value
) => {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value === "object"
  ) {
    return "—";
  }

  return String(value);
};


const safeId = (
  value
) => {

  const id =
    Number(value);

  return Number.isFinite(id)
    ? id
    : null;
};


/* ============================================================
   FORMULARIO NUEVO EMPLEADO
============================================================ */

const FORMULARIO_INICIAL = {
  nombre: "",
  apellidos: "",
  dni: "",
  usuario: "",
  password: "",
  telefono: "",
  email_personal: "",
  email_empresa: "",
  extension: "",
};


/* ============================================================
   MENSAJE DE ERROR API
============================================================ */

const obtenerMensajeError = (
  responseData,
  mensajeDefecto
) => {

  if (
    typeof responseData?.detail ===
    "string"
  ) {

    return responseData.detail;

  }


  if (
    Array.isArray(
      responseData?.detail
    )
  ) {

    const mensajes =
      responseData.detail
        .map((item) => {

          if (
            typeof item ===
            "string"
          ) {
            return item;
          }

          if (
            typeof item?.msg ===
            "string"
          ) {
            return item.msg;
          }

          return null;

        })
        .filter(Boolean);


    if (
      mensajes.length > 0
    ) {

      return mensajes.join(". ");

    }

  }


  if (
    typeof responseData?.message ===
    "string"
  ) {

    return responseData.message;

  }


  return mensajeDefecto;
};


/* ============================================================
   URL FOTO
============================================================ */

const prepararFotoUrl = (
  foto
) => {

  if (
    !foto ||
    foto === "-"
  ) {

    return "/no-foto.png";

  }


  const valor =
    String(foto)
      .trim();


  if (!valor) {

    return "/no-foto.png";

  }


  if (
    valor.startsWith(
      "http://"
    ) ||
    valor.startsWith(
      "https://"
    )
  ) {

    return valor;

  }


  const apiBase =
    String(
      API_BASE || ""
    ).replace(
      /\/+$/,
      ""
    );


  if (
    valor.startsWith(
      "/api/"
    )
  ) {

    const origen =
      apiBase.replace(
        /\/api$/i,
        ""
      );

    return (
      `${origen}${valor}`
    );

  }


  if (
    valor.startsWith(
      "/fotos/"
    )
  ) {

    return (
      `${apiBase}${valor}`
    );

  }


  if (
    valor.startsWith(
      "/static/fotos/"
    )
  ) {

    const origen =
      apiBase.replace(
        /\/api$/i,
        ""
      );

    return (
      `${origen}${valor}`
    );

  }


  if (
    valor.startsWith(
      "/empleados/"
    )
  ) {

    return (
      `${apiBase}/fotos${valor}`
    );

  }


  return (
    `${apiBase}/fotos/empleados/${valor.replace(
      /^\/+/,
      ""
    )}`
  );

};


/* ============================================================
   COMPONENTE
============================================================ */

export default function EmpleadosListado({
  onSeleccionar = () => {},
  incluirOcultos = false,
}) {

  const [
    empleados,
    setEmpleados,
  ] = useState([]);


  const [
    q,
    setQ,
  ] = useState("");


  const [
    activo,
    setActivo,
  ] = useState(null);

  // En Seguridad (solo accesible a administradores autorizados), mostrar ocultos por defecto.
  const [mostrarOcultos, setMostrarOcultos] = useState(incluirOcultos);


  const [
    cargando,
    setCargando,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    mensaje,
    setMensaje,
  ] = useState("");


  /* ==========================================================
     NUEVO EMPLEADO
  ========================================================== */

  const [
    mostrarNuevo,
    setMostrarNuevo,
  ] = useState(false);


  const [
    formularioNuevo,
    setFormularioNuevo,
  ] = useState(
    FORMULARIO_INICIAL
  );


  const [
    guardandoNuevo,
    setGuardandoNuevo,
  ] = useState(false);


  const [
    errorNuevo,
    setErrorNuevo,
  ] = useState("");


  /* ==========================================================
     CARGAR
  ========================================================== */

  const cargar =
    useCallback(
      async () => {

        setCargando(
          true
        );

        setError("");

        try {

          const res =
            await buscarEmpleados({
              q:
                q.trim()
                  ? q.trim()
                  : undefined,

              activo,
            });


          const lista =
            Array.isArray(
              res?.data
            )
              ? res.data
              : Array.isArray(
                  res?.data?.empleados
                )
                ? res.data.empleados
                : [];


          const listaSegura =
            lista
              .map(
                (empleado) => ({

                  id:
                    safeId(
                      empleado.id
                    ),

                  nombre:
                    safeText(
                      empleado.nombre
                    ),

                  apellidos:
                    safeText(
                      empleado.apellidos
                    ),

                  dni:
                    safeText(
                      empleado.dni
                    ),

                  telefono:
                    safeText(
                      empleado.telefono
                    ),

                  email_empresa:
                    safeText(
                      empleado.email_empresa
                    ),

                  extension:
                    safeText(
                      empleado.extension
                    ),

                  activo:
                    Boolean(
                      empleado.activo
                    ),

                  visible_en_listado:
                    empleado.visible_en_listado !== false,

                  departamento_nombre:
                    safeText(
                      empleado.departamento_nombre
                    ),

                  seccion_nombre:
                    safeText(
                      empleado.seccion_nombre
                    ),

                  cargo_nombre:
                    safeText(
                      empleado.cargo_nombre
                    ),

                  foto:
                    typeof empleado.foto ===
                    "string"
                      ? empleado.foto
                      : "-",

                  usuario:
                    safeText(
                      empleado.usuario
                    ),

                })
              )
              .filter(
                (empleado) =>
                  Number.isFinite(
                    empleado.id
                  )
              );


          setEmpleados(
            listaSegura
          );

        } catch (err) {

          console.error(
            "Error cargando empleados:",
            err
          );

          setError(
            err?.response?.data?.detail ||
            err?.message ||
            "No se ha podido cargar el listado."
          );

        } finally {

          setCargando(
            false
          );

        }

      },
      [
        q,
        activo,
      ]
    );


  useEffect(() => {

    const timer =
      setTimeout(
        () => {
          cargar();
        },
        250
      );


    return () =>
      clearTimeout(
        timer
      );

  }, [
    cargar,
  ]);


  /* ==========================================================
     WEBSOCKET
  ========================================================== */

  const handleWS =
    useCallback(
      (evento) => {

        if (
          evento?.tipo ===
          "empleado_actualizado"
        ) {

          cargar();

        }

      },
      [
        cargar,
      ]
    );


  useEmpleadosWS(
    handleWS
  );


  /* ==========================================================
     EMPLEADOS MEMO
  ========================================================== */

  const empleadosMemo =
    useMemo(
      () =>
        Array.isArray(empleados)
          ? (incluirOcultos
              ? (mostrarOcultos ? empleados : empleados.filter((empleado) => empleado.visible_en_listado !== false))
              : empleados.filter((empleado) => empleado.visible_en_listado !== false))
          : [],
      [
        empleados,
        incluirOcultos,
        mostrarOcultos,
      ]
    );


  /* ==========================================================
     ABRIR NUEVO
  ========================================================== */

  const abrirNuevo =
    useCallback(
      () => {

        setFormularioNuevo(
          FORMULARIO_INICIAL
        );

        setErrorNuevo("");

        setMostrarNuevo(
          true
        );

      },
      []
    );


  /* ==========================================================
     CERRAR NUEVO
  ========================================================== */

  const cerrarNuevo =
    useCallback(
      () => {

        if (
          guardandoNuevo
        ) {
          return;
        }

        setMostrarNuevo(
          false
        );

        setFormularioNuevo(
          FORMULARIO_INICIAL
        );

        setErrorNuevo("");

      },
      [
        guardandoNuevo,
      ]
    );

  const nuevoEmpleadoDialogRef = useRef(null);
  useAccessibleDialog({ open: mostrarNuevo, onClose: cerrarNuevo, dialogRef: nuevoEmpleadoDialogRef });


  /* ==========================================================
     CAMBIAR CAMPO
  ========================================================== */

  const cambiarCampoNuevo =
    useCallback(
      (
        campo,
        valor
      ) => {

        setFormularioNuevo(
          (anterior) => ({

            ...anterior,

            [campo]:
              valor,

          })
        );

        setErrorNuevo("");

      },
      []
    );


  /* ==========================================================
     CREAR EMPLEADO
  ========================================================== */

  const guardarNuevoEmpleado =
    useCallback(
      async (
        event
      ) => {

        event.preventDefault();


        const nombre =
          formularioNuevo.nombre
            .trim();

        const apellidos =
          formularioNuevo.apellidos
            .trim();

        const dni =
          formularioNuevo.dni
            .trim();

        const usuario =
          formularioNuevo.usuario
            .trim();

        const password =
          formularioNuevo.password
            .trim();

        const telefono =
          formularioNuevo.telefono
            .trim();

        const emailPersonal =
          formularioNuevo.email_personal
            .trim();

        const emailEmpresa =
          formularioNuevo.email_empresa
            .trim();

        const extension =
          formularioNuevo.extension
            .trim();


        /* ------------------------------------------------------
           VALIDACIONES
        ------------------------------------------------------ */

        if (!nombre) {

          setErrorNuevo(
            "El nombre es obligatorio."
          );

          return;

        }


        if (!apellidos) {

          setErrorNuevo(
            "Los apellidos son obligatorios."
          );

          return;

        }


        if (!usuario) {

          setErrorNuevo(
            "El usuario es obligatorio."
          );

          return;

        }


        if (!password) {

          setErrorNuevo(
            "La contraseña es obligatoria."
          );

          return;

        }


        setGuardandoNuevo(
          true
        );

        setErrorNuevo("");

        setError("");

        setMensaje("");


        try {

          const token =
            localStorage.getItem(
              "token"
            );


          const response =
            await fetch(
              `${API_BASE}/empleados/`,
              {
                method:
                  "POST",

                headers: {

                  Accept:
                    "application/json",

                  "Content-Type":
                    "application/json",

                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),

                },

                body:
                  JSON.stringify({

                    nombre,

                    apellidos,

                    dni,

                    usuario,

                    password,

                    telefono,

                    email_personal:
                      emailPersonal,

                    email_empresa:
                      emailEmpresa,

                    extension,

                  }),

              }
            );


          const data =
            await response
              .json()
              .catch(
                () => ({})
              );


          if (
            !response.ok
          ) {

            throw new Error(
              obtenerMensajeError(
                data,
                "No se ha podido crear el empleado."
              )
            );

          }


          /* ----------------------------------------------------
             CREACIÓN CORRECTA
          ---------------------------------------------------- */

          setMostrarNuevo(
            false
          );

          setFormularioNuevo(
            FORMULARIO_INICIAL
          );

          setMensaje(
            "Empleado creado correctamente."
          );


          /* ----------------------------------------------------
             RECARGAR LISTADO
          ---------------------------------------------------- */

          await cargar();


        } catch (err) {

          console.error(
            "Error creando empleado:",
            err
          );


          setErrorNuevo(
            err?.message ||
            "No se ha podido crear el empleado."
          );

        } finally {

          setGuardandoNuevo(
            false
          );

        }

      },
      [
        formularioNuevo,
        cargar,
      ]
    );


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div className="erp-page space-y-5" aria-busy={cargando}>

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <MolsanPageHeader mark="EM" title="Empleados" description="Gestión y administración de empleados." />
      <div className="flex justify-end">
        <button type="button" onClick={abrirNuevo} className="molsan-btn molsan-btn--primary inline-flex items-center justify-center gap-2 px-5 py-2.5">
          <span>＋</span><span>Nuevo empleado</span>
        </button>
      </div>

      {/* ======================================================
          MENSAJE ÉXITO
      ====================================================== */}

      {mensaje && (

        <div className="px-4
 py-3">
          {mensaje}
        </div>

      )}


      {incluirOcultos && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <div>Visibilidad de usuarios</div>
            <p>Los usuarios ocultos no aparecen en los listados habituales, pero se pueden recuperar desde Seguridad.</p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={mostrarOcultos} onChange={(event) => setMostrarOcultos(event.target.checked)} />
            Mostrar usuarios ocultos
          </label>
        </div>
      )}

      {/* ======================================================
          FILTROS
      ====================================================== */}

      <div className="erp-card p-4">

        <div className="molsan-filter-bar flex
 flex-col
 gap-3">

          <div className="empleados-filtros-busqueda
 relative
 flex-1">

            <span className="pointer-events-none
 absolute
 left-4
 top-1/2">
              ⌕
            </span>

            <input
              className="h-11
 w-full
 
 
 
 
 pl-11
 pr-4"
              placeholder="
                Buscar por nombre, apellidos o DNI...
              "
              value={q}
              onChange={(
                e
              ) =>
                setQ(
                  e.target.value
                )
              }
            />

          </div>


          <select
            className="h-11
 
 
 
 
 px-4
 
 
 
 
 lg:w-48"
            value={
              activo === null
                ? ""
                : String(
                    activo
                  )
            }
            onChange={(
              e
            ) =>
              setActivo(
                e.target.value === ""
                  ? null
                  : e.target.value ===
                    "true"
              )
            }
          >

            <option value="">
              Todos los empleados
            </option>

            <option value="true">
              Activos
            </option>

            <option value="false">
              Inactivos
            </option>

          </select>

        </div>


        <div className="mt-3
 flex
 items-center
 justify-between
 px-1">

          <span>
            {empleadosMemo.length} empleados
          </span>

          {cargando && (

            <span>
              Actualizando…
            </span>

          )}

        </div>

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="px-4
 py-3">
          {error}
        </div>

      )}


      {/* ======================================================
          CARGANDO
      ====================================================== */}

      {cargando &&
        empleadosMemo.length === 0 && (

        <div className="grid
 grid-cols-1
 gap-5
 md:grid-cols-2
 xl:grid-cols-3">

          {[
            1,
            2,
            3,
            4,
            5,
            6,
          ].map(
            (item) => (

              <div
                key={item}
                className="h-56"
              />

            )
          )}

        </div>

      )}


      {/* ======================================================
          SIN RESULTADOS
      ====================================================== */}

      {!cargando &&
        empleadosMemo.length === 0 &&
        !error && (

        <div className="py-16">

          <div className="mb-3">
            👤
          </div>

          <div>
            No se han encontrado empleados
          </div>

          <div className="mt-1">
            Prueba a cambiar los filtros de búsqueda.
          </div>

        </div>

      )}


      {/* ======================================================
          TARJETAS
      ====================================================== */}

      {empleadosMemo.length > 0 && (

        <div className="grid
 grid-cols-1
 gap-5
 md:grid-cols-2
 xl:grid-cols-3">

          {empleadosMemo.map(
            (empleado) => {

              const foto =
                prepararFotoUrl(
                  empleado.foto
                );


              return (
                <button
                  type="button"
                  key={empleado.id}
                  onClick={() => onSeleccionar(empleado.id)}
                  className={`molsan-employee-card group flex w-full min-w-0 items-center gap-3
 
 px-3 py-3`}
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden">
                    <AuthenticatedPhoto
                      src={foto}
                      alt={`Foto de ${empleado.nombre || "empleado"}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      {empleado.nombre} {empleado.apellidos}
                    </div>
                    <div className="mt-0.5">
                      ID #{empleado.id}
                    </div>
                    <div className="mt-1 truncate" title={`Cargo: ${empleado.cargo_nombre || "Sin cargo asignado"}`}>
                      Cargo: {empleado.cargo_nombre || "Sin cargo asignado"}
                    </div>
                  </div>
                  <span
                    className={`molsan-status-pill shrink-0 px-2.5 py-1 ${empleado.activo ? "is-active" : "is-inactive"}`}
                  >
                    {empleado.activo ? "Activo" : "Inactivo"}
                  </span>
                </button>

              );

            }
          )}

        </div>

      )}


      {/* ======================================================
          MODAL — NUEVO EMPLEADO
      ====================================================== */}

      {mostrarNuevo && (

        <div
          className="empleado-operativo-modal molsan-modal-overlay
 fixed
 inset-0
 z-[100]
 flex
 items-center
 justify-center
 
 p-4"
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              cerrarNuevo();

            }

          }}
        >

          <div
            ref={nuevoEmpleadoDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo empleado"
            className="molsan-modal__panel w-full
 max-w-4xl
 overflow-hidden"
          >

            {/* ================================================
                CABECERA MODAL
            ================================================= */}

            <div className="molsan-modal__header px-6
 py-5">

              <div className="flex
 items-center
 justify-between
 gap-4">

                <div>

                  <div className="flex
 items-center
 gap-3">

                    <div className="flex
 h-10
 w-10
 items-center
 justify-center">
                      👤
                    </div>

                    <div>

                      <h2>
                        Nuevo empleado
                      </h2>

                      <p className="mt-0.5">
                        Alta de un nuevo empleado en el ERP
                      </p>

                    </div>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={
                    cerrarNuevo
                  }
                  disabled={
                    guardandoNuevo
                  }
                  className="molsan-btn molsan-btn--ghost molsan-btn--icon flex
 h-9
 w-9
 items-center
 justify-center"
                  title="Cerrar"
                >
                  ×
                </button>

              </div>

            </div>


            {/* ================================================
                FORMULARIO
            ================================================= */}

            <form
              onSubmit={
                guardarNuevoEmpleado
              }
            >

              <div className="molsan-modal__body max-h-[70vh]
 overflow-y-auto
 px-6
 py-6">

                {/* ==========================================
                    DATOS PERSONALES
                ========================================== */}

                <div className="mb-6">

                  <div className="mb-4">

                    <h3>
                      Datos personales
                    </h3>

                    <p className="mt-1">
                      Información básica del empleado.
                    </p>

                  </div>


                  <div className="grid
 grid-cols-1
 gap-4
 md:grid-cols-2">

                    <CampoNuevoEmpleado
                      label="Nombre"
                      name="nombre"
                      value={
                        formularioNuevo.nombre
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      required
                      disabled={
                        guardandoNuevo
                      }
                      autoFocus
                    />


                    <CampoNuevoEmpleado
                      label="Apellidos"
                      name="apellidos"
                      value={
                        formularioNuevo.apellidos
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      required
                      disabled={
                        guardandoNuevo
                      }
                    />


                    <CampoNuevoEmpleado
                      label="DNI"
                      name="dni"
                      value={
                        formularioNuevo.dni
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      disabled={
                        guardandoNuevo
                      }
                    />


                    <CampoNuevoEmpleado
                      label="Teléfono"
                      name="telefono"
                      value={
                        formularioNuevo.telefono
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      disabled={
                        guardandoNuevo
                      }
                    />

                  </div>

                </div>


                {/* ==========================================
                    ACCESO
                ========================================== */}

                <div className="mb-6">

                  <div className="mb-4">

                    <h3>
                      Acceso al ERP
                    </h3>

                    <p className="mt-1">
                      Credenciales para iniciar sesión.
                    </p>

                  </div>


                  <div className="grid
 grid-cols-1
 gap-4
 md:grid-cols-2">

                    <CampoNuevoEmpleado
                      label="Usuario"
                      name="usuario"
                      value={
                        formularioNuevo.usuario
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      required
                      disabled={
                        guardandoNuevo
                      }
                    />


                    <CampoNuevoEmpleado
                      label="Contraseña"
                      name="password"
                      type="password"
                      value={
                        formularioNuevo.password
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      required
                      disabled={
                        guardandoNuevo
                      }
                    />

                  </div>

                </div>


                {/* ==========================================
                    CONTACTO CORPORATIVO
                ========================================== */}

                <div>

                  <div className="mb-4">

                    <h3>
                      Datos corporativos
                    </h3>

                    <p className="mt-1">
                      Información de contacto y empresa.
                    </p>

                  </div>


                  <div className="grid
 grid-cols-1
 gap-4
 md:grid-cols-2">

                    <CampoNuevoEmpleado
                      label="Email personal"
                      name="email_personal"
                      type="email"
                      value={
                        formularioNuevo.email_personal
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      disabled={
                        guardandoNuevo
                      }
                    />


                    <CampoNuevoEmpleado
                      label="Email empresa"
                      name="email_empresa"
                      type="email"
                      value={
                        formularioNuevo.email_empresa
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      disabled={
                        guardandoNuevo
                      }
                    />


                    <CampoNuevoEmpleado
                      label="Extensión"
                      name="extension"
                      value={
                        formularioNuevo.extension
                      }
                      onChange={
                        cambiarCampoNuevo
                      }
                      disabled={
                        guardandoNuevo
                      }
                    />

                  </div>

                </div>


                {/* ==========================================
                    ERROR MODAL
                ========================================== */}

                {errorNuevo && (

                  <div className="mt-6
 
 
 
 
 px-4
 py-3">
                    {errorNuevo}
                  </div>

                )}

              </div>


              {/* ==============================================
                  FOOTER MODAL
              ============================================== */}

              <div className="molsan-modal__footer flex
 flex-col-reverse
 gap-3
 
 
 
 px-6
 py-4
 sm:flex-row
 sm:justify-end">

                <button
                  type="button"
                  onClick={
                    cerrarNuevo
                  }
                  disabled={
                    guardandoNuevo
                  }
                  className="molsan-btn molsan-btn--secondary px-5
 py-2.5"
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    guardandoNuevo
                  }
                  className="molsan-btn molsan-btn--primary px-5
 py-2.5"
                >
                  {guardandoNuevo
                    ? "Creando empleado…"
                    : "Crear empleado"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


/* ============================================================
   CAMPO FORMULARIO NUEVO EMPLEADO
============================================================ */

function CampoNuevoEmpleado({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  disabled = false,
  autoFocus = false,
}) {

  return (

    <div>

      <label className="mb-1.5
 block">

        {label}

        {required && (
          <span className="ml-1">
            *
          </span>
        )}

      </label>


      <input
        type={type}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) =>
          onChange(
            name,
            event.target.value
          )
        }
        className="h-11
 w-full
 
 
 
 
 px-4"
      />

    </div>
  );
}


/* ============================================================
   INFO
============================================================ */

function Info({
  label,
  value,
}) {

  return (

    <div className="flex
 items-start
 justify-between
 gap-4">

      <span className="shrink-0">
        {label}
      </span>


      <span className="truncate">
        {value}
      </span>

    </div>
  );
}
