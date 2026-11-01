import { useEffect, useMemo, useState } from "react";
import "./SeguridadSubpaginasPremium.css";

import { useSeguridad } from "../../hooks/useSeguridad";


/**
 * ============================================================
 * SEGURIDAD — AUDITORÍA
 * MOLSAN ERP SAAS PREMIUM 2027
 * ============================================================
 *
 * Módulo completo de consulta de auditoría.
 *
 * Utiliza:
 *
 *     useSeguridad()
 *
 * y por tanto reutiliza la carga global existente.
 *
 * No necesita API adicional.
 * No necesita store adicional.
 * No necesita modificar el histórico.
 *
 * ============================================================
 */


/**
 * ============================================================
 * ICONO
 * ============================================================
 */

const Icono = ({
  name,
  className = "w-5 h-5",
}) => (
  <svg
    className={`${className} flex-shrink-0`}
    aria-hidden="true"
  >
    <use
      href={`/icons/icons.svg#${name}`}
    />
  </svg>
);


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function arraySeguro(valor) {
  return Array.isArray(valor)
    ? valor
    : [];
}


function textoSeguro(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor);
}


function normalizarTexto(valor) {
  return textoSeguro(valor)
    .trim()
    .toLowerCase();
}


function formatearFecha(valor) {
  if (!valor) {
    return "-";
  }

  try {
    const fecha = new Date(valor);

    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return textoSeguro(valor);
    }

    return fecha.toLocaleString(
      "es-ES",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );

  } catch {
    return textoSeguro(valor);
  }
}


function fechaSolo(valor) {
  if (!valor) {
    return "";
  }

  try {
    const fecha = new Date(valor);

    if (
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      return "";
    }

    const año =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, "0");

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, "0");

    return `${año}-${mes}-${dia}`;

  } catch {
    return "";
  }
}


/**
 * ============================================================
 * BADGE ACCIÓN
 * ============================================================
 */

function BadgeAccion({
  accion,
}) {

  const valor =
    normalizarTexto(
      accion
    );


  let clases =
    "bg-[var(--erp-primary-soft)] text-[var(--erp-primary)] border-[var(--erp-primary)]";


  if (
    valor === "login" ||
    valor === "login_success" ||
    valor === "acceso"
  ) {

    clases =
      "bg-emerald-50 text-emerald-700 border-emerald-200";

  } else if (
    valor === "login_error" ||
    valor === "error" ||
    valor.includes("fall")
  ) {

    clases =
      "bg-red-50 text-red-700 border-red-200";

  } else if (
    valor.includes("delete") ||
    valor.includes("elimin") ||
    valor.includes("borr")
  ) {

    clases =
      "bg-red-50 text-red-700 border-red-200";

  } else if (
    valor.includes("update") ||
    valor.includes("actualiz") ||
    valor.includes("editar")
  ) {

    clases =
      "bg-amber-50 text-amber-700 border-amber-200";

  } else if (
    valor.includes("create") ||
    valor.includes("crear") ||
    valor.includes("alta")
  ) {

    clases =
      "bg-blue-50 text-blue-700 border-blue-200";
  }


  return (
    <span
      className={`
        inline-flex
        items-center
        px-2.5
        py-1
        rounded-lg
        border
        text-[11px]
        font-semibold
        whitespace-nowrap
        ${clases}
      `}
    >
      {textoSeguro(accion) || "Actividad"}
    </span>
  );
}


/**
 * ============================================================
 * KPI
 * ============================================================
 */

function KPI({
  icon,
  titulo,
  valor,
  descripcion,
  accent = "primary",
}) {

  const estilos = {

    primary: {
      bg: "bg-[var(--erp-primary-soft)]",
      color: "text-[var(--erp-primary)]",
    },

    success: {
      bg: "bg-emerald-50",
      color: "text-emerald-600",
    },

    warning: {
      bg: "bg-amber-50",
      color: "text-amber-600",
    },

    danger: {
      bg: "bg-red-50",
      color: "text-red-600",
    },

  };


  const estilo =
    estilos[accent] ||
    estilos.primary;


  return (
    <div
      className="
        bg-[var(--erp-surface)]
        border
        border-[var(--erp-border)]
        rounded-2xl
        shadow-sm
        p-5
      "
    >

      <div
        className="
          flex
          items-start
          justify-between
          gap-4
        "
      >

        <div className="min-w-0">

          <p
            className="
              text-xs
              uppercase
              tracking-wide
              font-medium
              text-[var(--erp-text-soft)]
            "
          >
            {titulo}
          </p>

          <p
            className="
              text-2xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {valor}
          </p>

          <p
            className="
              text-xs
              text-[var(--erp-text-soft)]
              mt-1
            "
          >
            {descripcion}
          </p>

        </div>


        <div
          className={`
            w-10
            h-10
            rounded-xl
            flex
            items-center
            justify-center
            flex-shrink-0
            ${estilo.bg}
            ${estilo.color}
          `}
        >

          <Icono
            name={icon}
            className="w-5 h-5"
          />

        </div>

      </div>

    </div>
  );
}


/**
 * ============================================================
 * FILA DETALLE
 * ============================================================
 */

function RegistroAuditoria({
  registro,
  onSeleccionar,
}) {

  const usuario =
    textoSeguro(
      registro?.usuario
    ) || "Sistema";


  const modulo =
    textoSeguro(
      registro?.modulo
    ) || "Sistema";


  const descripcion =
    textoSeguro(
      registro?.descripcion
    ) || "Sin descripción";


  return (
    <button
      type="button"
      onClick={() =>
        onSeleccionar(
          registro
        )
      }
      className="
        w-full
        text-left
        px-5
        py-4
        border-b
        border-[var(--erp-border)]
        hover:bg-[var(--erp-primary-soft)]
        transition
        focus:outline-none
        focus:bg-[var(--erp-primary-soft)]
      "
    >

      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-[170px_140px_140px_minmax(0,1fr)_150px]
          gap-3
          lg:items-center
        "
      >

        {/* USUARIO */}

        <div className="min-w-0">

          <p
            className="
              text-sm
              font-semibold
              text-[var(--erp-text)]
              truncate
            "
            title={usuario}
          >
            {usuario}
          </p>

          <p
            className="
              text-[11px]
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Usuario
          </p>

        </div>


        {/* MÓDULO */}

        <div className="min-w-0">

          <p
            className="
              text-sm
              text-[var(--erp-text)]
              truncate
            "
            title={modulo}
          >
            {modulo}
          </p>

          <p
            className="
              text-[11px]
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Módulo
          </p>

        </div>


        {/* ACCIÓN */}

        <div>

          <BadgeAccion
            accion={
              registro?.accion
            }
          />

        </div>


        {/* DESCRIPCIÓN */}

        <div className="min-w-0">

          <p
            className="
              text-sm
              text-[var(--erp-text)]
              truncate
            "
            title={descripcion}
          >
            {descripcion}
          </p>

          <p
            className="
              text-[11px]
              text-[var(--erp-text-soft)]
              mt-0.5
              truncate
            "
          >
            IP:{" "}
            {textoSeguro(
              registro?.ip
            ) || "-"}
          </p>

        </div>


        {/* FECHA */}

        <div className="lg:text-right">

          <p
            className="
              text-sm
              text-[var(--erp-text)]
              whitespace-nowrap
            "
          >
            {formatearFecha(
              registro?.fecha
            )}
          </p>

          <p
            className="
              text-[11px]
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Registro #
            {registro?.id ?? "-"}
          </p>

        </div>

      </div>

    </button>
  );
}


/**
 * ============================================================
 * DETALLE
 * ============================================================
 */

function ModalDetalle({
  registro,
  onCerrar,
}) {

  if (!registro) {
    return null;
  }


  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        p-4
        bg-black/30
        backdrop-blur-sm
      "
      onMouseDown={(
        event
      ) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          onCerrar();
        }

      }}
    >

      <div
        className="
          w-full
          max-w-2xl
          max-h-[90vh]
          overflow-auto
          bg-[var(--erp-surface)]
          border
          border-[var(--erp-border)]
          rounded-2xl
          shadow-2xl
        "
      >

        {/* CABECERA */}

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
                flex
                items-center
                justify-center
              "
            >

              <Icono
                name="clipboard"
                className="w-5 h-5"
              />

            </div>


            <div>

              <h2
                className="
                  text-lg
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                Detalle de auditoría
              </h2>

              <p
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-0.5
                "
              >
                Registro #{registro.id ?? "-"}
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={onCerrar}
            className="
              w-9
              h-9
              rounded-xl
              border
              border-[var(--erp-border)]
              text-[var(--erp-text-soft)]
              hover:text-[var(--erp-text)]
              hover:bg-[var(--erp-bg)]
              transition
            "
            aria-label="Cerrar"
          >
            ×
          </button>

        </div>


        {/* CONTENIDO */}

        <div
          className="
            p-6
            space-y-5
          "
        >

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              gap-4
            "
          >

            <div
              className="
                p-4
                rounded-xl
                bg-[var(--erp-bg)]
                border
                border-[var(--erp-border)]
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Usuario
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                {textoSeguro(
                  registro.usuario
                ) || "Sistema"}
              </p>

            </div>


            <div
              className="
                p-4
                rounded-xl
                bg-[var(--erp-bg)]
                border
                border-[var(--erp-border)]
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Módulo
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                {textoSeguro(
                  registro.modulo
                ) || "Sistema"}
              </p>

            </div>


            <div
              className="
                p-4
                rounded-xl
                bg-[var(--erp-bg)]
                border
                border-[var(--erp-border)]
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Acción
              </p>

              <div className="mt-2">

                <BadgeAccion
                  accion={
                    registro.accion
                  }
                />

              </div>

            </div>


            <div
              className="
                p-4
                rounded-xl
                bg-[var(--erp-bg)]
                border
                border-[var(--erp-border)]
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Fecha
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                {formatearFecha(
                  registro.fecha
                )}
              </p>

            </div>

          </div>


          <div
            className="
              p-4
              rounded-xl
              bg-[var(--erp-bg)]
              border
              border-[var(--erp-border)]
            "
          >

            <p
              className="
                text-[11px]
                uppercase
                tracking-wide
                text-[var(--erp-text-soft)]
              "
            >
              Descripción
            </p>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-[var(--erp-text)]
                whitespace-pre-wrap
              "
            >
              {textoSeguro(
                registro.descripcion
              ) || "Sin descripción"}
            </p>

          </div>


          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              gap-4
            "
          >

            <div
              className="
                p-4
                rounded-xl
                bg-[var(--erp-bg)]
                border
                border-[var(--erp-border)]
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Dirección IP
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-mono
                  text-[var(--erp-text)]
                "
              >
                {textoSeguro(
                  registro.ip
                ) || "-"}
              </p>

            </div>


            <div
              className="
                p-4
                rounded-xl
                bg-[var(--erp-bg)]
                border
                border-[var(--erp-border)]
              "
            >

              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wide
                  text-[var(--erp-text-soft)]
                "
              >
                Identificador
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  font-mono
                  text-[var(--erp-text)]
                "
              >
                #{registro.id ?? "-"}
              </p>

            </div>

          </div>

        </div>


        {/* PIE */}

        <div
          className="
            px-6
            py-4
            border-t
            border-[var(--erp-border)]
            flex
            justify-end
          "
        >

          <button
            type="button"
            onClick={onCerrar}
            className="
              px-4
              py-2
              rounded-xl
              bg-[var(--erp-primary)]
              text-white
              text-sm
              font-medium
              hover:opacity-90
              transition
            "
          >
            Cerrar
          </button>

        </div>

      </div>

    </div>
  );
}


/**
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

export default function SeguridadAuditoria() {

  const {
    auditoria = [],
    cargarTodo,
    loading,
  } = useSeguridad();


  // ==========================================================
  // FILTROS
  // ==========================================================

  const [
    busqueda,
    setBusqueda,
  ] = useState("");


  const [
    filtroModulo,
    setFiltroModulo,
  ] = useState("");


  const [
    filtroAccion,
    setFiltroAccion,
  ] = useState("");


  const [
    fechaDesde,
    setFechaDesde,
  ] = useState("");


  const [
    fechaHasta,
    setFechaHasta,
  ] = useState("");


  const [
    registroSeleccionado,
    setRegistroSeleccionado,
  ] = useState(null);


  // ==========================================================
  // CARGA
  // ==========================================================

  useEffect(() => {

    cargarTodo();

  }, [cargarTodo]);


  // ==========================================================
  // DATOS SEGUROS
  // ==========================================================

  const registros =
    useMemo(
      () =>
        arraySeguro(
          auditoria
        ).filter(Boolean),
      [auditoria]
    );


  // ==========================================================
  // OPCIONES DE MÓDULO
  // ==========================================================

  const modulos =
    useMemo(() => {

      return [
        ...new Set(
          registros
            .map(
              (registro) =>
                textoSeguro(
                  registro?.modulo
                ).trim()
            )
            .filter(Boolean)
        ),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es"
          )
      );

    }, [registros]);


  // ==========================================================
  // OPCIONES DE ACCIÓN
  // ==========================================================

  const acciones =
    useMemo(() => {

      return [
        ...new Set(
          registros
            .map(
              (registro) =>
                textoSeguro(
                  registro?.accion
                ).trim()
            )
            .filter(Boolean)
        ),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es"
          )
      );

    }, [registros]);


  // ==========================================================
  // FILTRADO
  // ==========================================================

  const registrosFiltrados =
    useMemo(() => {

      const termino =
        normalizarTexto(
          busqueda
        );


      return registros.filter(
        (registro) => {

          // ----------------------------------------------
          // BÚSQUEDA
          // ----------------------------------------------

          if (termino) {

            const textoBusqueda = [
              registro?.usuario,
              registro?.modulo,
              registro?.accion,
              registro?.descripcion,
              registro?.ip,
            ]
              .map(
                normalizarTexto
              )
              .join(" ");


            if (
              !textoBusqueda.includes(
                termino
              )
            ) {
              return false;
            }
          }


          // ----------------------------------------------
          // MÓDULO
          // ----------------------------------------------

          if (
            filtroModulo &&
            textoSeguro(
              registro?.modulo
            ) !== filtroModulo
          ) {
            return false;
          }


          // ----------------------------------------------
          // ACCIÓN
          // ----------------------------------------------

          if (
            filtroAccion &&
            textoSeguro(
              registro?.accion
            ) !== filtroAccion
          ) {
            return false;
          }


          // ----------------------------------------------
          // FECHA DESDE
          // ----------------------------------------------

          if (fechaDesde) {

            const fecha =
              fechaSolo(
                registro?.fecha
              );

            if (
              !fecha ||
              fecha < fechaDesde
            ) {
              return false;
            }
          }


          // ----------------------------------------------
          // FECHA HASTA
          // ----------------------------------------------

          if (fechaHasta) {

            const fecha =
              fechaSolo(
                registro?.fecha
              );

            if (
              !fecha ||
              fecha > fechaHasta
            ) {
              return false;
            }
          }


          return true;
        }
      );

    }, [
      registros,
      busqueda,
      filtroModulo,
      filtroAccion,
      fechaDesde,
      fechaHasta,
    ]);


  // ==========================================================
  // MÉTRICAS
  // ==========================================================

  const usuarios =
    useMemo(
      () =>
        new Set(
          registros
            .map(
              (registro) =>
                textoSeguro(
                  registro?.usuario
                ).trim()
            )
            .filter(Boolean)
        ).size,
      [registros]
    );


  const logins =
    useMemo(
      () =>
        registros.filter(
          (registro) =>
            normalizarTexto(
              registro?.accion
            ) === "login"
        ).length,
      [registros]
    );


  const errores =
    useMemo(
      () =>
        registros.filter(
          (registro) => {

            const accion =
              normalizarTexto(
                registro?.accion
              );

            return (
              accion ===
                "login_error" ||
              accion ===
                "error" ||
              accion.includes(
                "fall"
              )
            );
          }
        ).length,
      [registros]
    );


  const modulosUtilizados =
    useMemo(
      () =>
        new Set(
          registros
            .map(
              (registro) =>
                textoSeguro(
                  registro?.modulo
                ).trim()
            )
            .filter(Boolean)
        ).size,
      [registros]
    );


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  const limpiarFiltros = () => {

    setBusqueda("");
    setFiltroModulo("");
    setFiltroAccion("");
    setFechaDesde("");
    setFechaHasta("");

  };


  const hayFiltros =
    Boolean(
      busqueda ||
      filtroModulo ||
      filtroAccion ||
      fechaDesde ||
      fechaHasta
    );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <div
        className="
          min-h-[400px]
          flex
          items-center
          justify-center
        "
      >

        <div
          className="
            flex
            flex-col
            items-center
            gap-3
            text-[var(--erp-text-soft)]
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
            "
          />

          <span className="text-sm">
            Cargando auditoría…
          </span>

        </div>

      </div>
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="seguridad-auditoria-premium space-y-6 animate-fade-in"
    >

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <section className="molsan-page-header">

        <div className="molsan-page-header__mark">

              <Icono
                name="clipboard"
                className="w-6 h-6"
              />

            </div>


            <div>

              <p className="molsan-page-header__eyebrow">MOLSAN ERP · SEGURIDAD</p>
              <h1 className="molsan-page-header__title">Auditoría</h1>

              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                  mt-1
                "
              >
                Registro de actividad y operaciones de seguridad del ERP
              </p>

            </div>

          </div>


          <div
            className="
              flex
              items-center
              gap-2
              px-3
              py-2
              rounded-xl
              bg-[var(--erp-bg)]
              border
              border-[var(--erp-border)]
              text-xs
              text-[var(--erp-text-soft)]
              w-fit
            "
          >

            <span
              className="
                w-1.5
                h-1.5
                rounded-full
                bg-emerald-500
              "
            />

            Histórico protegido

          </div>

        </div>

      </section>


      {/* ======================================================
          KPIs
          ====================================================== */}

      <section>

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-4
            gap-4
          "
        >

          <KPI
            icon="clipboard"
            titulo="Registros"
            valor={
              registros.length
            }
            descripcion="Eventos disponibles"
          />


          <KPI
            icon="user-group"
            titulo="Usuarios"
            valor={usuarios}
            descripcion="Usuarios con actividad"
          />


          <KPI
            icon="shield"
            titulo="Módulos"
            valor={modulosUtilizados}
            descripcion="Módulos con actividad"
            accent="success"
          />


          <KPI
            icon="clipboard"
            titulo="Incidencias"
            valor={errores}
            descripcion="Errores o accesos fallidos"
            accent={
              errores
                ? "danger"
                : "success"
            }
          />

        </div>

      </section>


      {/* ======================================================
          FILTROS
          ====================================================== */}

      <section
        className="
          bg-[var(--erp-surface)]
          border
          border-[var(--erp-border)]
          rounded-2xl
          shadow-sm
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
            mb-4
          "
        >

          <div>

            <h2
              className="
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Filtros
            </h2>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              Localiza rápidamente cualquier operación registrada
            </p>

          </div>


          {hayFiltros && (

            <button
              type="button"
              onClick={
                limpiarFiltros
              }
              className="
                text-xs
                font-medium
                text-[var(--erp-primary)]
                hover:underline
                w-fit
              "
            >
              Limpiar filtros
            </button>

          )}

        </div>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-5
            gap-3
          "
        >

          {/* BÚSQUEDA */}

          <div className="xl:col-span-2">

            <label
              className="
                block
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
                mb-1.5
              "
            >
              Buscar
            </label>

            <div className="relative">

              <Icono
                name="search"
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  w-4
                  h-4
                  text-[var(--erp-text-soft)]
                "
              />

              <input
                type="text"
                value={busqueda}
                onChange={(
                  event
                ) =>
                  setBusqueda(
                    event.target.value
                  )
                }
                placeholder="Usuario, módulo, acción, descripción o IP..."
                className="
                  w-full
                  pl-9
                  pr-3
                  py-2.5
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-bg)]
                  text-sm
                  text-[var(--erp-text)]
                  outline-none
                  focus:border-[var(--erp-primary)]
                  focus:ring-2
                  focus:ring-[var(--erp-primary-soft)]
                "
              />

            </div>

          </div>


          {/* MÓDULO */}

          <div>

            <label
              className="
                block
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
                mb-1.5
              "
            >
              Módulo
            </label>

            <select
              value={filtroModulo}
              onChange={(
                event
              ) =>
                setFiltroModulo(
                  event.target.value
                )
              }
              className="
                w-full
                py-2.5
                px-3
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                text-sm
                text-[var(--erp-text)]
                outline-none
                focus:border-[var(--erp-primary)]
              "
            >

              <option value="">
                Todos
              </option>

              {modulos.map(
                (modulo) => (
                  <option
                    key={modulo}
                    value={modulo}
                  >
                    {modulo}
                  </option>
                )
              )}

            </select>

          </div>


          {/* ACCIÓN */}

          <div>

            <label
              className="
                block
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
                mb-1.5
              "
            >
              Acción
            </label>

            <select
              value={filtroAccion}
              onChange={(
                event
              ) =>
                setFiltroAccion(
                  event.target.value
                )
              }
              className="
                w-full
                py-2.5
                px-3
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                text-sm
                text-[var(--erp-text)]
                outline-none
                focus:border-[var(--erp-primary)]
              "
            >

              <option value="">
                Todas
              </option>

              {acciones.map(
                (accion) => (
                  <option
                    key={accion}
                    value={accion}
                  >
                    {accion}
                  </option>
                )
              )}

            </select>

          </div>


          {/* FECHA DESDE */}

          <div>

            <label
              className="
                block
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
                mb-1.5
              "
            >
              Desde
            </label>

            <input
              type="date"
              value={fechaDesde}
              onChange={(
                event
              ) =>
                setFechaDesde(
                  event.target.value
                )
              }
              className="
                w-full
                py-2.5
                px-3
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                text-sm
                text-[var(--erp-text)]
                outline-none
                focus:border-[var(--erp-primary)]
              "
            />

          </div>


          {/* FECHA HASTA */}

          <div>

            <label
              className="
                block
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
                mb-1.5
              "
            >
              Hasta
            </label>

            <input
              type="date"
              value={fechaHasta}
              onChange={(
                event
              ) =>
                setFechaHasta(
                  event.target.value
                )
              }
              className="
                w-full
                py-2.5
                px-3
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                text-sm
                text-[var(--erp-text)]
                outline-none
                focus:border-[var(--erp-primary)]
              "
            />

          </div>

        </div>

      </section>


      {/* ======================================================
          TABLA
          ====================================================== */}

      <section
        className="
          bg-[var(--erp-surface)]
          border
          border-[var(--erp-border)]
          rounded-2xl
          shadow-sm
          overflow-hidden
        "
      >

        {/* CABECERA */}

        <div
          className="
            px-5
            py-4
            border-b
            border-[var(--erp-border)]
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
          "
        >

          <div>

            <h2
              className="
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Registro de actividad
            </h2>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              {registrosFiltrados.length}{" "}
              {registrosFiltrados.length === 1
                ? "registro"
                : "registros"}{" "}
              encontrados
            </p>

          </div>


          <div
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Mostrando el histórico disponible
          </div>

        </div>


        {/* CABECERA DE TABLA */}

        {registrosFiltrados.length > 0 && (

          <div
            className="
              hidden
              lg:grid
              lg:grid-cols-[170px_140px_140px_minmax(0,1fr)_150px]
              gap-3
              px-5
              py-3
              bg-[var(--erp-bg)]
              border-b
              border-[var(--erp-border)]
              text-[11px]
              uppercase
              tracking-wide
              font-semibold
              text-[var(--erp-text-soft)]
            "
          >

            <div>
              Usuario
            </div>

            <div>
              Módulo
            </div>

            <div>
              Acción
            </div>

            <div>
              Descripción
            </div>

            <div className="text-right">
              Fecha
            </div>

          </div>

        )}


        {/* REGISTROS */}

        {registrosFiltrados.length === 0 ? (

          <div
            className="
              px-6
              py-14
              text-center
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-2xl
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                flex
                items-center
                justify-center
                mx-auto
                mb-4
              "
            >

              <Icono
                name="clipboard"
                className="w-6 h-6"
              />

            </div>


            <h3
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
              "
            >
              {hayFiltros
                ? "No hay resultados"
                : "Sin registros de auditoría"}
            </h3>


            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
                max-w-md
                mx-auto
              "
            >
              {hayFiltros
                ? "No existen registros que coincidan con los filtros seleccionados."
                : "Todavía no existen operaciones disponibles para mostrar."}
            </p>


            {hayFiltros && (

              <button
                type="button"
                onClick={
                  limpiarFiltros
                }
                className="
                  mt-4
                  px-4
                  py-2
                  rounded-xl
                  bg-[var(--erp-primary)]
                  text-white
                  text-xs
                  font-medium
                  hover:opacity-90
                  transition
                "
              >
                Limpiar filtros
              </button>

            )}

          </div>

        ) : (

          <div>

            {registrosFiltrados.map(
              (registro, index) => (

                <RegistroAuditoria
                  key={
                    registro?.id ??
                    `auditoria-${index}`
                  }
                  registro={
                    registro
                  }
                  onSeleccionar={
                    setRegistroSeleccionado
                  }
                />

              )
            )}

          </div>

        )}

      </section>


      {/* ======================================================
          PIE
          ====================================================== */}

      <section
        className="
          bg-[var(--erp-bg)]
          border
          border-[var(--erp-border)]
          rounded-2xl
          px-5
          py-4
        "
      >

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
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
                w-8
                h-8
                rounded-lg
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                flex
                items-center
                justify-center
                flex-shrink-0
              "
            >

              <Icono
                name="shield"
                className="w-4 h-4"
              />

            </div>


            <div>

              <p
                className="
                  text-sm
                  font-medium
                  text-[var(--erp-text)]
                "
              >
                Auditoría centralizada
              </p>

              <p
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-0.5
                "
              >
                Registro de actividad de seguridad de Molsan ERP.
              </p>

            </div>

          </div>


          <div
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Molsan ERP · Seguridad · Auditoría
          </div>

        </div>

      </section>


      {/* ======================================================
          MODAL
          ====================================================== */}

      <ModalDetalle
        registro={
          registroSeleccionado
        }
        onCerrar={() =>
          setRegistroSeleccionado(
            null
          )
        }
      />

    </div>
  );
}
