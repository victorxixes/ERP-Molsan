import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import "./Seguridad.css";

import SeguridadRoles from "./SeguridadRoles";
import SeguridadPermisos from "./SeguridadPermisos";
import SeguridadModulos from "./SeguridadModulos";
import SeguridadFicha from "./SeguridadFicha";


/**
 * ============================================================
 * SEGURIDAD — MOLSAN ERP SAAS PREMIUM 2027
 * CENTRO DE CONTROL DE SEGURIDAD
 * ============================================================
 *
 * ARQUITECTURA
 *
 * Seguridad.jsx
 *      │
 *      ├── cargarTodo()
 *      │
 *      ├── selección de empleado
 *      │
 *      ├── SeguridadFicha
 *      │
 *      ├── SeguridadRoles
 *      │
 *      ├── SeguridadPermisos
 *      │
 *      └── SeguridadModulos
 *
 * IMPORTANTE:
 *
 * - Este componente es el único que ejecuta cargarTodo().
 * - Los hijos NO deben ejecutar cargarTodo().
 * - SeguridadFicha carga la ficha del empleado seleccionado.
 * - La ficha se conserva en el store mediante useSeguridad().
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
    <use href={`/icons/icons.svg#${name}`} />
  </svg>
);


/**
 * ============================================================
 * UTILIDADES
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
    typeof valor === "undefined"
  ) {
    return "";
  }

  return String(valor);
}


/**
 * ============================================================
 * INDICADOR
 * ============================================================
 */

function IndicadorSeguridad({
  icon,
  titulo,
  valor,
  descripcion,
  accent = "primary",
}) {

  const accentClasses = {

    primary: {
      iconBg:
        "bg-[var(--erp-primary-soft)]",

      iconColor:
        "text-[var(--erp-primary)]",
    },

    success: {
      iconBg:
        "bg-emerald-50",

      iconColor:
        "text-emerald-600",
    },

    warning: {
      iconBg:
        "bg-amber-50",

      iconColor:
        "text-amber-600",
    },

    danger: {
      iconBg:
        "bg-red-50",

      iconColor:
        "text-red-600",
    },

  };

  const styles =
    accentClasses[accent] ||
    accentClasses.primary;


  return (
    <div
      className="
        group
        bg-[var(--erp-surface)]
        border
        border-[var(--erp-border)]
        rounded-2xl
        shadow-sm
        p-5
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
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
              text-[11px]
              uppercase
              tracking-[0.08em]
              font-semibold
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
              tracking-tight
            "
          >
            {valor}
          </p>

          {descripcion && (
            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
                leading-5
              "
            >
              {descripcion}
            </p>
          )}

        </div>


        <div
          className={`
            w-10
            h-10
            rounded-xl
            ${styles.iconBg}
            ${styles.iconColor}
            flex
            items-center
            justify-center
            flex-shrink-0
            transition-transform
            duration-200
            group-hover:scale-105
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
 * ACCESO RÁPIDO
 * ============================================================
 */

function TarjetaAcceso({
  to,
  icon,
  titulo,
  descripcion,
  accent = "primary",
}) {

  const accentClasses = {

    primary: {
      iconBg:
        "bg-[var(--erp-primary-soft)]",

      iconColor:
        "text-[var(--erp-primary)]",
    },

    warning: {
      iconBg:
        "bg-amber-50",

      iconColor:
        "text-amber-600",
    },

    success: {
      iconBg:
        "bg-emerald-50",

      iconColor:
        "text-emerald-600",
    },

    danger: {
      iconBg:
        "bg-red-50",

      iconColor:
        "text-red-600",
    },

  };

  const styles =
    accentClasses[accent] ||
    accentClasses.primary;


  return (
    <a
      href={to}
      className="
        group
        flex
        items-center
        gap-4
        p-5
        rounded-2xl
        bg-[var(--erp-surface)]
        border
        border-[var(--erp-border)]
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-md
        hover:border-[var(--erp-primary)]
      "
    >

      <div
        className={`
          w-11
          h-11
          rounded-xl
          ${styles.iconBg}
          ${styles.iconColor}
          flex
          items-center
          justify-center
          flex-shrink-0
          transition-transform
          duration-200
          group-hover:scale-105
        `}
      >

        <Icono
          name={icon}
          className="w-5 h-5"
        />

      </div>


      <div className="min-w-0 flex-1">

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
          "
        >

          <h3
            className="
              text-base
              font-semibold
              text-[var(--erp-text)]
            "
          >
            {titulo}
          </h3>

          <span
            className="
              text-[var(--erp-text-soft)]
              transition-all
              duration-200
              group-hover:text-[var(--erp-primary)]
              group-hover:translate-x-0.5
            "
          >
            →
          </span>

        </div>


        <p
          className="
            mt-1
            text-sm
            leading-5
            text-[var(--erp-text-soft)]
          "
        >
          {descripcion}
        </p>

      </div>

    </a>
  );
}


/**
 * ============================================================
 * ACTIVIDAD RECIENTE
 * ============================================================
 */

function ActividadReciente({
  auditoria,
}) {

  const registros = useMemo(
    () =>
      arraySeguro(auditoria)
        .filter(Boolean)
        .slice(0, 6),
    [auditoria]
  );


  return (
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

      <div
        className="
          px-5
          py-4
          border-b
          border-[var(--erp-border)]
        "
      >

        <h2
          className="
            text-base
            font-semibold
            text-[var(--erp-text)]
          "
        >
          Actividad reciente
        </h2>

        <p
          className="
            text-xs
            text-[var(--erp-text-soft)]
            mt-0.5
          "
        >
          Últimas operaciones registradas
        </p>

      </div>


      <div className="divide-y divide-[var(--erp-border)]">

        {registros.length === 0 ? (

          <div
            className="
              px-5
              py-10
              text-center
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
                mx-auto
                mb-3
              "
            >

              <Icono
                name="clipboard"
                className="w-5 h-5"
              />

            </div>


            <p
              className="
                text-sm
                font-medium
                text-[var(--erp-text)]
              "
            >
              Sin actividad registrada
            </p>


            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              No hay operaciones disponibles para mostrar.
            </p>

          </div>

        ) : (

          registros.map((item, index) => {

            const usuario =
              textoSeguro(item?.usuario) ||
              "Sistema";

            const accion =
              textoSeguro(item?.accion) ||
              "Actividad";

            const descripcion =
              textoSeguro(item?.descripcion) ||
              "Sin descripción";

            const modulo =
              textoSeguro(item?.modulo) ||
              "Sistema";

            const fecha =
              textoSeguro(item?.fecha) ||
              "-";


            return (
              <div
                key={
                  item?.id ??
                  `actividad-${index}`
                }
                className="
                  px-5
                  py-3.5
                  flex
                  items-start
                  gap-3
                  hover:bg-[var(--erp-primary-soft)]
                  transition
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
                    name="clipboard"
                    className="w-4 h-4"
                  />

                </div>


                <div className="min-w-0 flex-1">

                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-x-2
                      gap-y-1
                    "
                  >

                    <span
                      className="
                        text-sm
                        font-medium
                        text-[var(--erp-text)]
                      "
                    >
                      {usuario}
                    </span>

                    <span
                      className="
                        text-xs
                        text-[var(--erp-text-soft)]
                      "
                    >
                      ·
                    </span>

                    <span
                      className="
                        text-xs
                        text-[var(--erp-primary)]
                      "
                    >
                      {accion}
                    </span>

                  </div>


                  <p
                    className="
                      text-sm
                      text-[var(--erp-text-soft)]
                      mt-0.5
                      truncate
                    "
                    title={descripcion}
                  >
                    {descripcion}
                  </p>


                  <div
                    className="
                      flex
                      flex-wrap
                      gap-2
                      mt-1
                      text-[11px]
                      text-[var(--erp-text-soft)]
                    "
                  >

                    <span>
                      {modulo}
                    </span>

                    <span>
                      ·
                    </span>

                    <span>
                      {fecha}
                    </span>

                  </div>

                </div>

              </div>
            );

          })

        )}

      </div>

    </section>
  );
}


/**
 * ============================================================
 * ESTADO DE SEGURIDAD
 * ============================================================
 */

function PanelEstado({
  auditoria,
  logs,
}) {

  const auditoriaSegura =
    arraySeguro(auditoria);

  const logsSeguros =
    arraySeguro(logs);


  const intentosFallidos =
    auditoriaSegura.filter(
      (item) =>
        textoSeguro(item?.accion)
          .toLowerCase() === "login_error"
    ).length;


  const erroresTecnicos =
    logsSeguros.filter(
      (item) =>
        textoSeguro(item?.evento)
          .toLowerCase() === "error"
    ).length;


  const advertencias =
    logsSeguros.filter(
      (item) =>
        textoSeguro(item?.evento)
          .toLowerCase() === "warning"
    ).length;


  const sistemaProtegido =
    intentosFallidos === 0 &&
    erroresTecnicos === 0 &&
    advertencias === 0;


  const estado =
    sistemaProtegido
      ? "Sistema protegido"
      : "Revisión recomendada";


  const estadoClasses =
    sistemaProtegido
      ? {
          badge:
            "bg-emerald-50 border-emerald-100 text-emerald-700",
          dot:
            "bg-emerald-500",
        }
      : {
          badge:
            "bg-amber-50 border-amber-100 text-amber-700",
          dot:
            "bg-amber-500",
        };


  return (
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

      <div
        className="
          px-5
          py-4
          border-b
          border-[var(--erp-border)]
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
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
              Estado de seguridad
            </h2>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              Supervisión de actividad y eventos
            </p>

          </div>


          <span
            className={`
              inline-flex
              items-center
              gap-2
              px-3
              py-1.5
              rounded-lg
              border
              text-xs
              font-medium
              ${estadoClasses.badge}
            `}
          >

            <span
              className={`
                w-1.5
                h-1.5
                rounded-full
                ${estadoClasses.dot}
              `}
            />

            {estado}

          </span>

        </div>

      </div>


      <div
        className="
          p-5
          grid
          grid-cols-1
          sm:grid-cols-3
          gap-4
        "
      >

        <div>

          <p
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Intentos fallidos
          </p>

          <p
            className="
              text-xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {intentosFallidos}
          </p>

        </div>


        <div>

          <p
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Errores técnicos
          </p>

          <p
            className="
              text-xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {erroresTecnicos}
          </p>

        </div>


        <div>

          <p
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Advertencias
          </p>

          <p
            className="
              text-xl
              font-bold
              text-[var(--erp-text)]
              mt-1
            "
          >
            {advertencias}
          </p>

        </div>

      </div>

    </section>
  );
}


/**
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

export default function Seguridad() {

  const {
    roles = [],
    permisos = [],
    empleados = [],
    auditoria = [],
    logs = [],
    cargarTodo,
    loading,
  } = useSeguridad();


  /**
   * ==========================================================
   * EMPLEADO SELECCIONADO
   * ==========================================================
   *
   * SeguridadFicha necesita un empleado concreto.
   *
   * No hacemos una petición adicional aquí.
   * Solamente seleccionamos el empleado que ya viene
   * dentro de empleados después de cargarTodo().
   *
   * ==========================================================
   */

  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] =
    useState(null);


  /**
   * ==========================================================
   * CARGA GLOBAL
   * ==========================================================
   *
   * SOLO ESTE COMPONENTE CARGA TODO.
   *
   * ==========================================================
   */

  useEffect(() => {

    cargarTodo();

  }, [cargarTodo]);


  /**
   * ==========================================================
   * DATOS SEGUROS
   * ==========================================================
   */

  const rolesSeguros = useMemo(
    () => arraySeguro(roles),
    [roles]
  );


  const permisosSeguros = useMemo(
    () => arraySeguro(permisos),
    [permisos]
  );


  const empleadosSeguros = useMemo(
    () => arraySeguro(empleados),
    [empleados]
  );


  const auditoriaSegura = useMemo(
    () => arraySeguro(auditoria),
    [auditoria]
  );


  const logsSeguros = useMemo(
    () => arraySeguro(logs),
    [logs]
  );


  /**
   * ==========================================================
   * NORMALIZAR EMPLEADO SELECCIONADO
   * ==========================================================
   */

  useEffect(() => {

    if (!empleadosSeguros.length) {

      setEmpleadoSeleccionadoId(null);

      return;
    }


    const existe =
      empleadosSeguros.some(
        (empleado) =>
          String(empleado?.id) ===
          String(empleadoSeleccionadoId)
      );


    if (!existe) {

      const primerEmpleado =
        empleadosSeguros[0];

      if (
        primerEmpleado &&
        primerEmpleado.id !== null &&
        typeof primerEmpleado.id !== "undefined"
      ) {

        setEmpleadoSeleccionadoId(
          primerEmpleado.id
        );

      }

    }

  }, [
    empleadosSeguros,
    empleadoSeleccionadoId,
  ]);


  /**
   * ==========================================================
   * EMPLEADO SELECCIONADO
   * ==========================================================
   */

  const empleadoSeleccionado =
    useMemo(
      () =>
        empleadosSeguros.find(
          (empleado) =>
            String(empleado?.id) ===
            String(empleadoSeleccionadoId)
        ) || null,
      [
        empleadosSeguros,
        empleadoSeleccionadoId,
      ]
    );


  /**
   * ==========================================================
   * INDICADORES
   * ==========================================================
   */

  const usuariosActivos = useMemo(
    () =>
      empleadosSeguros.filter(
        (empleado) =>
          empleado &&
          (
            empleado.activo === true ||
            empleado.activo === 1
          )
      ).length,
    [empleadosSeguros]
  );


  /**
   * ==========================================================
   * LOADING
   * ==========================================================
   */

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
            Cargando seguridad…
          </span>

        </div>

      </div>
    );
  }


  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="
        seguridad-premium-page
        space-y-6
        animate-fade-in
      "
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <section
        className="
          bg-[var(--erp-surface)]
          border
          border-[var(--erp-border)]
          rounded-2xl
          shadow-sm
          px-6
          py-5
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

          <div
            className="
              flex
              items-center
              gap-4
              min-w-0
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
                flex-shrink-0
              "
            >

              <Icono
                name="shield"
                className="w-6 h-6"
              />

            </div>


            <div className="min-w-0">

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >

                <h1
                  className="
                    text-2xl
                    font-bold
                    tracking-tight
                    text-[var(--erp-text)]
                  "
                >
                  Centro de seguridad
                </h1>


                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    px-2.5
                    py-1
                    rounded-lg
                    bg-emerald-50
                    border
                    border-emerald-100
                    text-emerald-700
                    text-[11px]
                    font-medium
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

                  Monitor activo

                </span>

              </div>


              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                  mt-1
                "
              >
                Centro de control y supervisión de seguridad de Molsan ERP
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

            <Icono
              name="shield"
              className="w-4 h-4 text-[var(--erp-primary)]"
            />

            Control centralizado

          </div>

        </div>

      </section>


      {/* ======================================================
          RESUMEN
      ====================================================== */}

      <section>

        <div className="mb-3">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Resumen de seguridad
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Estado actual de usuarios, configuración y actividad
          </p>

        </div>


        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-5
            gap-4
          "
        >

          <IndicadorSeguridad
            icon="user-group"
            titulo="Usuarios"
            valor={empleadosSeguros.length}
            descripcion="Usuarios disponibles"
          />


          <IndicadorSeguridad
            icon="user-group"
            titulo="Activos"
            valor={usuariosActivos}
            descripcion="Usuarios activos"
            accent="success"
          />


          <IndicadorSeguridad
            icon="shield"
            titulo="Roles"
            valor={rolesSeguros.length}
            descripcion="Roles configurados"
          />


          <IndicadorSeguridad
            icon="shield"
            titulo="Permisos"
            valor={permisosSeguros.length}
            descripcion="Permisos registrados"
          />


          <IndicadorSeguridad
            icon="clipboard"
            titulo="Auditoría"
            valor={auditoriaSegura.length}
            descripcion="Registros disponibles"
            accent={
              auditoriaSegura.length
                ? "primary"
                : "success"
            }
          />

        </div>

      </section>


      {/* ======================================================
          MONITOR
      ====================================================== */}

      <section>

        <div className="mb-3">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Monitor de seguridad
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Supervisión de actividad e incidencias del sistema
          </p>

        </div>


        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-2
            gap-5
          "
        >

          <ActividadReciente
            auditoria={auditoriaSegura}
          />


          <PanelEstado
            auditoria={auditoriaSegura}
            logs={logsSeguros}
          />

        </div>

      </section>


      {/* ======================================================
          EMPLEADO / FICHA
      ====================================================== */}

      <section>

        <div className="mb-3">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Gestión individual de seguridad
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Selecciona un empleado para consultar y gestionar su configuración de seguridad.
          </p>

        </div>


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
              flex-col
              gap-2
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div>

              <label
                htmlFor="seguridad-empleado"
                className="
                  block
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.08em]
                  text-[var(--erp-text-soft)]
                "
              >
                Empleado
              </label>

              <p
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-1
                "
              >
                La ficha se actualizará al cambiar de empleado.
              </p>

            </div>


            <select
              id="seguridad-empleado"
              value={
                empleadoSeleccionadoId ?? ""
              }
              onChange={(event) => {

                const valor =
                  event.target.value;

                setEmpleadoSeleccionadoId(
                  valor === ""
                    ? null
                    : Number(valor)
                );

              }}
              className="
                w-full
                sm:w-[320px]
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                px-3
                py-2.5
                text-sm
                text-[var(--erp-text)]
                outline-none
                transition
                focus:border-[var(--erp-primary)]
                focus:ring-2
                focus:ring-[var(--erp-primary-soft)]
              "
            >

              <option value="">
                Selecciona un empleado
              </option>

              {empleadosSeguros.map(
                (empleado) => {

                  const nombre =
                    [
                      empleado?.nombre,
                      empleado?.apellidos,
                    ]
                      .filter(Boolean)
                      .join(" ")
                      .trim();

                  const usuario =
                    textoSeguro(
                      empleado?.usuario
                    );

                  return (
                    <option
                      key={empleado.id}
                      value={empleado.id}
                    >
                      {nombre ||
                        usuario ||
                        `Empleado ${empleado.id}`}
                      {usuario &&
                      nombre
                        ? ` · ${usuario}`
                        : ""}
                    </option>
                  );

                }
              )}

            </select>

          </div>

        </div>

      </section>


      {empleadoSeleccionadoId && (
        <section>

          <div
            className="
              bg-[var(--erp-surface)]
              border
              border-[var(--erp-border)]
              rounded-2xl
              shadow-sm
              overflow-hidden
            "
          >

            <div
              className="
                px-5
                py-4
                border-b
                border-[var(--erp-border)]
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
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                "
              >

                <Icono
                  name="user-group"
                  className="w-4 h-4"
                />

              </div>


              <div className="min-w-0">

                <h3
                  className="
                    text-base
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Ficha de seguridad
                </h3>

                <p
                  className="
                    text-xs
                    mt-0.5
                    text-[var(--erp-text-soft)]
                  "
                >
                  {empleadoSeleccionado
                    ? [
                        empleadoSeleccionado.nombre,
                        empleadoSeleccionado.apellidos,
                      ]
                        .filter(Boolean)
                        .join(" ")
                        .trim() ||
                      empleadoSeleccionado.usuario ||
                      `Empleado ${empleadoSeleccionado.id}`
                    : "Empleado seleccionado"}
                </p>

              </div>

            </div>


            <div className="p-5">

              <SeguridadFicha
                empleadoId={
                  empleadoSeleccionadoId
                }
              />

            </div>

          </div>

        </section>
      )}


      {/* ======================================================
          CONTROL Y SUPERVISIÓN
      ====================================================== */}

      <section>

        <div className="mb-3">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Control y supervisión
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Acceso directo a los registros y controles de seguridad
          </p>

        </div>


        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-4
          "
        >

          <TarjetaAcceso
            to="/seguridad/auditoria"
            icon="clipboard"
            titulo="Auditoría"
            descripcion="Consulta las acciones registradas y la actividad de los usuarios."
            accent="primary"
          />


          <TarjetaAcceso
            to="/seguridad/logs"
            icon="clipboard"
            titulo="Logs técnicos"
            descripcion="Revisa eventos técnicos, errores, incidencias y registros del sistema."
            accent="warning"
          />

        </div>

      </section>


      {/* ======================================================
          CONFIGURACIÓN DE ACCESO
      ====================================================== */}

      <section>

        <div className="mb-3">

          <h2
            className="
              text-lg
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Configuración de acceso
          </h2>

          <p
            className="
              text-sm
              text-[var(--erp-text-soft)]
              mt-0.5
            "
          >
            Gestiona quién puede acceder y qué puede visualizar dentro del ERP
          </p>

        </div>


        <div
          className="
            space-y-5
          "
        >

          {/* ROLES */}

          <div
            className="
              bg-[var(--erp-surface)]
              border
              border-[var(--erp-border)]
              rounded-2xl
              shadow-sm
              overflow-hidden
            "
          >

            <div
              className="
                px-5
                py-4
                border-b
                border-[var(--erp-border)]
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
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                "
              >

                <Icono
                  name="user-group"
                  className="w-4 h-4"
                />

              </div>


              <div className="min-w-0">

                <h3
                  className="
                    text-base
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Roles del sistema
                </h3>

                <p
                  className="
                    text-xs
                    mt-0.5
                    text-[var(--erp-text-soft)]
                  "
                >
                  Perfiles y niveles de acceso
                </p>

              </div>

            </div>


            <div className="p-5">

              <SeguridadRoles />

            </div>

          </div>


          {/* PERMISOS */}

          <div
            className="
              bg-[var(--erp-surface)]
              border
              border-[var(--erp-border)]
              rounded-2xl
              shadow-sm
              overflow-hidden
            "
          >

            <div
              className="
                px-5
                py-4
                border-b
                border-[var(--erp-border)]
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


              <div className="min-w-0">

                <h3
                  className="
                    text-base
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Permisos globales
                </h3>

                <p
                  className="
                    text-xs
                    mt-0.5
                    text-[var(--erp-text-soft)]
                  "
                >
                  Autorizaciones disponibles
                </p>

              </div>

            </div>


            <div className="p-5">

              <SeguridadPermisos />

            </div>

          </div>


          {/* MÓDULOS */}

          <div
            className="
              bg-[var(--erp-surface)]
              border
              border-[var(--erp-border)]
              rounded-2xl
              shadow-sm
              overflow-hidden
            "
          >

            <div
              className="
                px-5
                py-4
                border-b
                border-[var(--erp-border)]
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
                  flex
                  items-center
                  justify-center
                  flex-shrink-0
                "
              >

                <Icono
                  name="folder"
                  className="w-4 h-4"
                />

              </div>


              <div className="min-w-0">

                <h3
                  className="
                    text-base
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Módulos visibles
                </h3>

                <p
                  className="
                    text-xs
                    mt-0.5
                    text-[var(--erp-text-soft)]
                  "
                >
                  Control de acceso a las diferentes áreas del ERP
                </p>

              </div>

            </div>


            <div className="p-5">

              <SeguridadModulos />

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          PIE INFORMATIVO
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
                Seguridad centralizada
              </p>

              <p
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-0.5
                "
              >
                Roles, permisos, módulos, auditoría y registros técnicos desde un único centro.
              </p>

            </div>

          </div>


          <div
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Molsan ERP · Seguridad
          </div>

        </div>

      </section>

    </div>
  );
}
