import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

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
        Array.isArray(
          empleados
        )
          ? empleados
          : [],
      [
        empleados,
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

    <div className="
      space-y-5
      animate-fade-in
    ">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div className="
        rounded-2xl
        border
        border-[var(--erp-border)]
        bg-[var(--erp-surface)]
        px-5
        py-5
        shadow-sm
      ">

        <div className="
          flex
          flex-col
          gap-4
          lg:flex-row
          lg:items-center
          lg:justify-between
        ">

          <div>

            <div className="
              flex
              items-center
              gap-3
            ">

              <div className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                shadow-sm
              ">
                👥
              </div>


              <div>

                <h1 className="
                  text-xl
                  font-bold
                  tracking-tight
                  text-[var(--erp-text)]
                ">
                  Empleados
                </h1>

                <p className="
                  mt-0.5
                  text-sm
                  text-[var(--erp-text-soft)]
                ">
                  Gestión y administración de empleados
                </p>

              </div>

            </div>

          </div>


          <button
            type="button"
            onClick={
              abrirNuevo
            }
            className="
              inline-flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[var(--erp-primary)]
              px-5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition-all
              duration-200
              hover:brightness-95
              hover:shadow-md
              active:scale-[0.98]
            "
          >

            <span className="
              text-lg
              leading-none
            ">
              +
            </span>

            <span>
              Nuevo empleado
            </span>

          </button>

        </div>

      </div>


      {/* ======================================================
          MENSAJE ÉXITO
      ====================================================== */}

      {mensaje && (

        <div className="
          rounded-xl
          border
          border-emerald-200
          bg-emerald-50
          px-4
          py-3
          text-sm
          font-medium
          text-emerald-700
        ">
          {mensaje}
        </div>

      )}


      {/* ======================================================
          FILTROS
      ====================================================== */}

      <div className="
        rounded-2xl
        border
        border-[var(--erp-border)]
        bg-[var(--erp-surface-soft)]
        p-4
      ">

        <div className="
          flex
          flex-col
          gap-3
          lg:flex-row
        ">

          <div className="
            relative
            flex-1
          ">

            <span className="
              pointer-events-none
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-[var(--erp-text-soft)]
            ">
              ⌕
            </span>

            <input
              className="
                h-11
                w-full
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                pl-11
                pr-4
                text-[var(--erp-text)]
                outline-none
                transition
                focus:border-[var(--erp-primary)]
                focus:ring-2
                focus:ring-[var(--erp-primary-soft)]
              "
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
            className="
              h-11
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              px-4
              text-[var(--erp-text)]
              outline-none
              transition
              focus:border-[var(--erp-primary)]
              lg:w-48
            "
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


        <div className="
          mt-3
          flex
          items-center
          justify-between
          px-1
        ">

          <span className="
            text-xs
            text-[var(--erp-text-soft)]
          ">
            {empleadosMemo.length} empleados
          </span>

          {cargando && (

            <span className="
              animate-pulse
              text-xs
              text-[var(--erp-primary)]
            ">
              Actualizando…
            </span>

          )}

        </div>

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="
          rounded-xl
          border
          border-red-200
          bg-red-50
          px-4
          py-3
          text-sm
          text-red-700
        ">
          {error}
        </div>

      )}


      {/* ======================================================
          CARGANDO
      ====================================================== */}

      {cargando &&
        empleadosMemo.length === 0 && (

        <div className="
          grid
          grid-cols-1
          gap-5
          md:grid-cols-2
          xl:grid-cols-3
        ">

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
                className="
                  h-56
                  rounded-2xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface-soft)]
                  animate-pulse
                "
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

        <div className="
          rounded-2xl
          border
          border-dashed
          border-[var(--erp-border)]
          py-16
          text-center
        ">

          <div className="
            mb-3
            text-4xl
          ">
            👤
          </div>

          <div className="
            text-base
            font-semibold
            text-[var(--erp-text)]
          ">
            No se han encontrado empleados
          </div>

          <div className="
            mt-1
            text-sm
            text-[var(--erp-text-soft)]
          ">
            Prueba a cambiar los filtros de búsqueda.
          </div>

        </div>

      )}


      {/* ======================================================
          TARJETAS
      ====================================================== */}

      {empleadosMemo.length > 0 && (

        <div className="
          grid
          grid-cols-1
          gap-5
          md:grid-cols-2
          xl:grid-cols-3
        ">

          {empleadosMemo.map(
            (empleado) => {

              const foto =
                prepararFotoUrl(
                  empleado.foto
                );


              return (

                <button
                  type="button"
                  key={
                    empleado.id
                  }
                  onClick={() =>
                    onSeleccionar(
                      empleado.id
                    )
                  }
                  className="
                    group
                    rounded-2xl
                    border
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface)]
                    p-5
                    text-left
                    shadow-sm
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:shadow-xl
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[var(--erp-primary)]
                  "
                >

                  {/* CABECERA TARJETA */}

                  <div className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  ">

                    <div className="
                      flex
                      min-w-0
                      items-center
                      gap-4
                    ">

                      <div className="
                        h-16
                        w-16
                        shrink-0
                        overflow-hidden
                        rounded-2xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface-soft)]
                      ">

                        <img
                          src={foto}
                          alt="Foto empleado"
                          className="
                            h-full
                            w-full
                            object-cover
                            transition-transform
                            duration-300
                            group-hover:scale-105
                          "
                        />

                      </div>


                      <div className="
                        min-w-0
                      ">

                        <div className="
                          truncate
                          font-semibold
                          text-[var(--erp-text)]
                        ">
                          {
                            empleado.nombre
                          }{" "}
                          {
                            empleado.apellidos
                          }
                        </div>

                        <div className="
                          mt-1
                          text-xs
                          text-[var(--erp-text-soft)]
                        ">
                          ID #{
                            empleado.id
                          }
                        </div>

                      </div>

                    </div>


                    <span
                      className={`
                        shrink-0
                        rounded-lg
                        border
                        px-2.5
                        py-1
                        text-[11px]
                        font-semibold

                        ${
                          empleado.activo
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }
                      `}
                    >
                      {
                        empleado.activo
                          ? "Activo"
                          : "Inactivo"
                      }
                    </span>

                  </div>


                  {/* DATOS */}

                  <div className="
                    mt-5
                    space-y-2
                    border-t
                    border-[var(--erp-border)]
                    pt-4
                  ">

                    <Info
                      label="Teléfono"
                      value={
                        empleado.telefono
                      }
                    />

                    <Info
                      label="Email"
                      value={
                        empleado.email_empresa
                      }
                    />

                    <Info
                      label="Extensión"
                      value={
                        empleado.extension
                      }
                    />

                    <Info
                      label="Departamento"
                      value={
                        empleado.departamento_nombre
                      }
                    />

                    <Info
                      label="Sección"
                      value={
                        empleado.seccion_nombre
                      }
                    />

                    <Info
                      label="Cargo"
                      value={
                        empleado.cargo_nombre
                      }
                    />

                  </div>


                  {/* FOOTER */}

                  <div className="
                    mt-5
                    flex
                    items-center
                    justify-between
                  ">

                    <span className="
                      text-xs
                      text-[var(--erp-text-soft)]
                    ">
                      Ver ficha
                    </span>

                    <span className="
                      text-lg
                      text-[var(--erp-primary)]
                      transition-transform
                      group-hover:translate-x-1
                    ">
                      →
                    </span>

                  </div>

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
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-slate-950/35
            p-4
            backdrop-blur-sm
          "
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
            className="
              w-full
              max-w-4xl
              overflow-hidden
              rounded-[24px]
              border
              border-white/80
              bg-white/95
              shadow-[0_25px_80px_rgba(15,23,42,0.22)]
            "
          >

            {/* ================================================
                CABECERA MODAL
            ================================================= */}

            <div className="
              border-b
              border-slate-200
              px-6
              py-5
            ">

              <div className="
                flex
                items-center
                justify-between
                gap-4
              ">

                <div>

                  <div className="
                    flex
                    items-center
                    gap-3
                  ">

                    <div className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-50
                      text-blue-600
                    ">
                      👤
                    </div>

                    <div>

                      <h2 className="
                        text-lg
                        font-bold
                        tracking-tight
                        text-slate-800
                      ">
                        Nuevo empleado
                      </h2>

                      <p className="
                        mt-0.5
                        text-xs
                        text-slate-400
                      ">
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
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    text-lg
                    text-slate-400
                    transition
                    hover:border-slate-300
                    hover:bg-slate-50
                    hover:text-slate-600
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
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

              <div className="
                max-h-[70vh]
                overflow-y-auto
                px-6
                py-6
              ">

                {/* ==========================================
                    DATOS PERSONALES
                ========================================== */}

                <div className="
                  mb-6
                ">

                  <div className="
                    mb-4
                  ">

                    <h3 className="
                      text-sm
                      font-bold
                      text-slate-800
                    ">
                      Datos personales
                    </h3>

                    <p className="
                      mt-1
                      text-xs
                      text-slate-400
                    ">
                      Información básica del empleado.
                    </p>

                  </div>


                  <div className="
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                  ">

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

                <div className="
                  mb-6
                ">

                  <div className="
                    mb-4
                  ">

                    <h3 className="
                      text-sm
                      font-bold
                      text-slate-800
                    ">
                      Acceso al ERP
                    </h3>

                    <p className="
                      mt-1
                      text-xs
                      text-slate-400
                    ">
                      Credenciales para iniciar sesión.
                    </p>

                  </div>


                  <div className="
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                  ">

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

                  <div className="
                    mb-4
                  ">

                    <h3 className="
                      text-sm
                      font-bold
                      text-slate-800
                    ">
                      Datos corporativos
                    </h3>

                    <p className="
                      mt-1
                      text-xs
                      text-slate-400
                    ">
                      Información de contacto y empresa.
                    </p>

                  </div>


                  <div className="
                    grid
                    grid-cols-1
                    gap-4
                    md:grid-cols-2
                  ">

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

                  <div className="
                    mt-6
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    text-red-700
                  ">
                    {errorNuevo}
                  </div>

                )}

              </div>


              {/* ==============================================
                  FOOTER MODAL
              ============================================== */}

              <div className="
                flex
                flex-col-reverse
                gap-3
                border-t
                border-slate-200
                bg-slate-50/80
                px-6
                py-4
                sm:flex-row
                sm:justify-end
              ">

                <button
                  type="button"
                  onClick={
                    cerrarNuevo
                  }
                  disabled={
                    guardandoNuevo
                  }
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
                    shadow-sm
                    transition
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  disabled={
                    guardandoNuevo
                  }
                  className="
                    rounded-xl
                    bg-[var(--erp-primary)]
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition-all
                    hover:brightness-95
                    hover:shadow-md
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
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

      <label className="
        mb-1.5
        block
        text-xs
        font-semibold
        text-slate-600
      ">

        {label}

        {required && (
          <span className="
            ml-1
            text-red-500
          ">
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
        className="
          h-11
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          text-sm
          text-slate-700
          outline-none
          transition
          placeholder:text-slate-300
          focus:border-blue-400
          focus:ring-4
          focus:ring-blue-500/10
          disabled:cursor-not-allowed
          disabled:bg-slate-50
          disabled:opacity-70
        "
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

    <div className="
      flex
      items-start
      justify-between
      gap-4
      text-sm
    ">

      <span className="
        shrink-0
        text-[var(--erp-text-soft)]
      ">
        {label}
      </span>


      <span className="
        truncate
        text-right
        font-medium
        text-[var(--erp-text)]
      ">
        {value}
      </span>

    </div>
  );
}
