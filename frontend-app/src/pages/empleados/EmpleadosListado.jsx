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
   FOTO — NORMALIZAR URL
============================================================ */

const prepararFotoEmpleado = (
  foto
) => {

  if (
    foto === null ||
    foto === undefined ||
    foto === "" ||
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


  /* ----------------------------------------------------------
     URL ABSOLUTA
  ---------------------------------------------------------- */

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


  /*
   * API_BASE del proyecto apunta a:
   *
   * https://agenda-intranet-b.onrender.com/api
   *
   * Por tanto construimos siempre las fotos
   * debajo de /api/fotos.
   */

  const apiBase =
    String(
      API_BASE || ""
    ).replace(
      /\/+$/,
      ""
    );


  /*
   * ----------------------------------------------------------
   * /api/fotos/...
   * ----------------------------------------------------------
   */

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


  /*
   * ----------------------------------------------------------
   * /fotos/...
   * ----------------------------------------------------------
   */

  if (
    valor.startsWith(
      "/fotos/"
    )
  ) {
    return (
      `${apiBase}${valor}`
    );
  }


  /*
   * ----------------------------------------------------------
   * /static/fotos/...
   * ----------------------------------------------------------
   */

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


  /*
   * ----------------------------------------------------------
   * /empleados/...
   * ----------------------------------------------------------
   */

  if (
    valor.startsWith(
      "/empleados/"
    )
  ) {

    return (
      `${apiBase}/fotos${valor}`
    );
  }


  /*
   * ----------------------------------------------------------
   * SOLO NOMBRE DE ARCHIVO
   *
   * empleado_1.png
   *
   * Resultado:
   *
   * /api/fotos/empleados/empleado_1.png
   * ----------------------------------------------------------
   */

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
              .map((empleado) => ({

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
                  typeof empleado.foto === "string"
                    ? empleado.foto
                    : "-",

                usuario:
                  safeText(
                    empleado.usuario
                  ),

              }))
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

  }, [cargar]);


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
      [cargar]
    );


  useEmpleadosWS(
    handleWS
  );


  const empleadosMemo =
    useMemo(
      () =>
        Array.isArray(
          empleados
        )
          ? empleados
          : [],
      [empleados]
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
          lg:flex-row
          gap-3
        ">

          <div className="
            relative
            flex-1
          ">

            <span className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-[var(--erp-text-soft)]
              pointer-events-none
            ">
              ⌕
            </span>

            <input
              className="
                w-full
                h-11
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                text-[var(--erp-text)]
                pl-11
                pr-4
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
              onChange={(e) =>
                setQ(
                  e.target.value
                )
              }
            />

          </div>


          <select
            className="
              h-11
              lg:w-48
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              text-[var(--erp-text)]
              px-4
              outline-none
              transition
              focus:border-[var(--erp-primary)]
            "
            value={
              activo === null
                ? ""
                : String(
                    activo
                  )
            }
            onChange={(e) =>
              setActivo(
                e.target.value === ""
                  ? null
                  : e.target.value === "true"
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
          flex
          items-center
          justify-between
          mt-3
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
              text-xs
              text-[var(--erp-primary)]
              animate-pulse
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
          text-red-700
          px-4
          py-3
          text-sm
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
          md:grid-cols-2
          xl:grid-cols-3
          gap-5
        ">

          {[1, 2, 3, 4, 5, 6].map(
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
            text-4xl
            mb-3
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
          md:grid-cols-2
          xl:grid-cols-3
          gap-5
        ">

          {empleadosMemo.map(
            (empleado) => {

              const foto =
                prepararFotoEmpleado(
                  empleado.foto
                );


              return (

                <button
                  type="button"
                  key={empleado.id}
                  onClick={() =>
                    onSeleccionar(
                      empleado.id
                    )
                  }
                  className="
                    text-left
                    group
                    rounded-2xl
                    border
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface)]
                    p-5
                    shadow-sm
                    hover:shadow-xl
                    hover:-translate-y-0.5
                    transition-all
                    duration-200
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
                      items-center
                      gap-4
                      min-w-0
                    ">

                      <div className="
                        w-16
                        h-16
                        rounded-2xl
                        overflow-hidden
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface-soft)]
                        shrink-0
                      ">

                        <img
                          src={foto}
                          alt="Foto empleado"
                          onError={(event) => {

                            /*
                             * Evitamos un bucle si
                             * incluso la imagen por
                             * defecto no pudiera cargarse.
                             */

                            event.currentTarget.onerror =
                              null;

                            event.currentTarget.src =
                              "/no-foto.png";
                          }}
                          className="
                            w-full
                            h-full
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
                          font-semibold
                          text-[var(--erp-text)]
                          truncate
                        ">
                          {empleado.nombre}{" "}
                          {empleado.apellidos}
                        </div>

                        <div className="
                          text-xs
                          text-[var(--erp-text-soft)]
                          mt-1
                        ">
                          ID #{empleado.id}
                        </div>

                      </div>

                    </div>


                    <span
                      className={`
                        shrink-0
                        px-2.5
                        py-1
                        rounded-lg
                        text-[11px]
                        font-semibold
                        border
                        ${
                          empleado.activo
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      `}
                    >
                      {empleado.activo
                        ? "Activo"
                        : "Inactivo"}
                    </span>

                  </div>


                  {/* DATOS */}

                  <div className="
                    mt-5
                    pt-4
                    border-t
                    border-[var(--erp-border)]
                    space-y-2
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
                      text-[var(--erp-primary)]
                      text-lg
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
        text-[var(--erp-text-soft)]
        shrink-0
      ">
        {label}
      </span>

      <span className="
        text-[var(--erp-text)]
        font-medium
        text-right
        truncate
      ">
        {value}
      </span>

    </div>
  );
}
