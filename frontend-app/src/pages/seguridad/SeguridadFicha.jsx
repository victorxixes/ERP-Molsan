import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";

import MODULOS_ERP from "../../config/modulos";


/* ============================================================
   HELPERS
============================================================ */

function arraySeguro(valor) {
  return Array.isArray(valor) ? valor : [];
}


function objetoSeguro(valor) {
  return (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
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


function idSeguro(valor) {
  if (
    valor === null ||
    typeof valor === "undefined" ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}


/* ============================================================
   CHIP
============================================================ */

function Chip({
  children,
  tone = "neutral",
}) {

  const estilos = {
    neutral:
      "border-[var(--erp-border)] bg-[var(--erp-bg)] text-[var(--erp-text-soft)]",

    primary:
      "border-blue-200 bg-blue-50 text-blue-700",

    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    warning:
      "border-amber-200 bg-amber-50 text-amber-700",

    danger:
      "border-red-200 bg-red-50 text-red-700",

    purple:
      "border-purple-200 bg-purple-50 text-purple-700",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[11px]
        font-semibold
        ${estilos[tone] || estilos.neutral}
      `}
    >
      {children}
    </span>
  );
}


/* ============================================================
   SECCIÓN ACORDEÓN
============================================================ */

function SeccionAcordeon({
  titulo,
  descripcion,
  icono,
  abierto,
  onToggle,
  contador,
  children,
}) {

  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-[var(--erp-border)]
        bg-[var(--erp-surface)]
        shadow-sm
      "
    >

      <button
        type="button"
        onClick={onToggle}
        className="
          flex
          w-full
          items-center
          justify-between
          gap-4
          px-5
          py-4
          text-left
          transition
          hover:bg-[var(--erp-bg)]
        "
      >

        <div
          className="
            flex
            min-w-0
            items-center
            gap-3
          "
        >

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[var(--erp-primary-soft)]
              text-lg
            "
          >
            {icono}
          </div>

          <div className="min-w-0">

            <h2
              className="
                truncate
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              {titulo}
            </h2>

            <p
              className="
                mt-0.5
                truncate
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              {descripcion}
            </p>

          </div>

        </div>


        <div
          className="
            flex
            shrink-0
            items-center
            gap-2
          "
        >

          {typeof contador !== "undefined" && (
            <Chip>
              {contador}
            </Chip>
          )}

          <span
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
            aria-hidden="true"
          >
            {abierto ? "▲" : "▼"}
          </span>

        </div>

      </button>


      {abierto && (
        <div
          className="
            border-t
            border-[var(--erp-border)]
            bg-[var(--erp-bg)]
            p-4
          "
        >
          {children}
        </div>
      )}

    </section>
  );
}


/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */

export default function SeguridadFicha({
  empleadoId,
}) {

  const {
    ficha,
    cargarFicha,
    bloquear,
    desbloquear,
    resetPassword,
    asignarRol,
    asignarPermisos,
    asignarModulos,
    permisos,
    logs,
    auditoria,
  } = useSeguridad();


  /* ============================================================
     ESTADOS
  ============================================================ */

  const [
    nuevaPassword,
    setNuevaPassword,
  ] = useState("");


  const [
    nuevoRol,
    setNuevoRol,
  ] = useState("");


  const [
    showModulos,
    setShowModulos,
  ] = useState(false);


  const [
    showPermisos,
    setShowPermisos,
  ] = useState(false);


  const [
    showAuditoria,
    setShowAuditoria,
  ] = useState(false);


  const [
    showLogs,
    setShowLogs,
  ] = useState(false);


  const [
    busquedaAud,
    setBusquedaAud,
  ] = useState("");


  const [
    filtroFechaAud,
    setFiltroFechaAud,
  ] = useState("");


  const [
    paginaAud,
    setPaginaAud,
  ] = useState(0);


  const [
    busquedaLog,
    setBusquedaLog,
  ] = useState("");


  const [
    filtroFechaLog,
    setFiltroFechaLog,
  ] = useState("");


  const [
    paginaLog,
    setPaginaLog,
  ] = useState(0);


  const [
    modulosAbiertos,
    setModulosAbiertos,
  ] = useState(
    () => new Set()
  );


  const pageSize = 10;


  /* ============================================================
     CARGAR FICHA
  ============================================================ */

  useEffect(() => {

    if (
      empleadoId === null ||
      typeof empleadoId === "undefined" ||
      empleadoId === ""
    ) {
      return;
    }

    cargarFicha(
      empleadoId
    );

  }, [
    empleadoId,
    cargarFicha,
  ]);


  /* ============================================================
     RESET AL CAMBIAR DE EMPLEADO
  ============================================================ */

  useEffect(() => {

    setNuevaPassword("");
    setNuevoRol("");

    setBusquedaAud("");
    setFiltroFechaAud("");
    setPaginaAud(0);

    setBusquedaLog("");
    setFiltroFechaLog("");
    setPaginaLog(0);

    setModulosAbiertos(
      new Set()
    );

  }, [
    empleadoId,
  ]);


  /* ============================================================
     EMPLEADO
  ============================================================ */

  const empleado =
    objetoSeguro(ficha) &&
    objetoSeguro(ficha.empleado)
      ? ficha.empleado
      : null;


  const empleadoIdSeguro =
    idSeguro(
      empleado?.id
    );

/* ============================================================
   PERMISOS ESTÁNDAR DE LOS MÓDULOS
============================================================ */

const PERMISOS_ESTANDAR = [
  "ver",
  "crear",
  "editar",
  "eliminar",
];
  
  const empleadoValido =
    empleado !== null &&
    empleadoIdSeguro !== null &&
    textoSeguro(
      empleado.nombre
    ).trim() !== "";


  /* ============================================================
     ROL
  ============================================================ */

  const nombreRol =
    objetoSeguro(
      empleado?.rol
    ) &&
    textoSeguro(
      empleado.rol.nombre
    ).trim() !== ""
      ? textoSeguro(
          empleado.rol.nombre
        )
      : "-";


  /* ============================================================
     MÓDULOS VISIBLES
  ============================================================ */

  const modulosVisibles =
    useMemo(() => {

      if (
        !objetoSeguro(ficha)
      ) {
        return [];
      }


      const lista =
        Array.isArray(
          ficha.modulos_visibles
        )
          ? ficha.modulos_visibles
          : Array.isArray(
              empleado?.modulos_visibles_list
            )
            ? empleado.modulos_visibles_list
            : [];


      return Array.from(
        new Set(
          lista
            .map(
              (modulo) =>
                textoSeguro(
                  modulo
                ).trim()
            )
            .filter(
              Boolean
            )
        )
      );

    }, [
      ficha,
      empleado,
    ]);


  /* ============================================================
     PERMISOS DEL EMPLEADO
  ============================================================ */

  const permisosEmpleado =
    useMemo(() => {

      if (
        !objetoSeguro(ficha) ||
        !objetoSeguro(
          ficha.permisos_modulo
        )
      ) {
        return {};
      }

      return ficha.permisos_modulo;

    }, [
      ficha,
    ]);


  /* ============================================================
     PERMISOS GLOBALES
  ============================================================ */

  /* ============================================================
   PERMISOS GLOBALES
============================================================ */

const permisosGlobales =
  useMemo(() => {

    const resultado = {};


    /* --------------------------------------------------------
       1. PERMISOS EXISTENTES EN BACKEND
    -------------------------------------------------------- */

    arraySeguro(
      permisos
    ).forEach(
      (permiso) => {

        if (
          !objetoSeguro(
            permiso
          )
        ) {
          return;
        }

        const modulo =
          textoSeguro(
            permiso.modulo
          ).trim();

        const nombre =
          textoSeguro(
            permiso.permiso
          ).trim();

        if (
          !modulo ||
          !nombre
        ) {
          return;
        }

        if (
          !Array.isArray(
            resultado[modulo]
          )
        ) {
          resultado[modulo] = [];
        }

        if (
          !resultado[modulo].includes(
            nombre
          )
        ) {
          resultado[modulo].push(
            nombre
          );
        }

      }
    );


    /* --------------------------------------------------------
       2. CATÁLOGO CENTRAL DEL ERP
       
       Todo módulo registrado en MODULOS_ERP debe
       disponer de permisos estándar aunque todavía
       no exista una fila específica en permisos.
    -------------------------------------------------------- */

    arraySeguro(
      MODULOS_ERP
    ).forEach(
      (modulo) => {

        if (
          !modulo ||
          typeof modulo !== "object" ||
          typeof modulo.key !== "string"
        ) {
          return;
        }

        const nombreModulo =
          modulo.key.trim();

        if (
          !nombreModulo
        ) {
          return;
        }

        if (
          !Array.isArray(
            resultado[nombreModulo]
          ) ||
          resultado[nombreModulo].length === 0
        ) {

          resultado[nombreModulo] = [
            ...PERMISOS_ESTANDAR,
          ];

        }

      }
    );


    /* --------------------------------------------------------
       3. ORDENAR PERMISOS
    -------------------------------------------------------- */

    Object.keys(
      resultado
    ).forEach(
      (modulo) => {

        resultado[modulo] = Array.from(
          new Set(
            resultado[modulo]
          )
        ).sort(
          (a, b) =>
            a.localeCompare(
              b,
              "es",
              {
                sensitivity:
                  "base",
              }
            )
        );

      }
    );


    return resultado;

  }, [
    permisos,
  ]);

  /* ============================================================
     MÓDULOS DISPONIBLES
  ============================================================ */

  const modulosDisponibles =
    useMemo(() => {

      const conjunto =
        new Set();


      Object.keys(
        permisosGlobales
      ).forEach(
        (modulo) => {
          conjunto.add(
            modulo
          );
        }
      );


      modulosVisibles.forEach(
        (modulo) => {
          conjunto.add(
            modulo
          );
        }
      );


      return Array.from(
        conjunto
      ).sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es",
            {
              sensitivity:
                "base",
            }
          )
      );

    }, [
      permisosGlobales,
      modulosVisibles,
    ]);


  /* ============================================================
     CAMBIAR MÓDULO
  ============================================================ */

  const cambiarModulo =
    useCallback(
      async (
        modulo
      ) => {

        if (
          !empleadoValido ||
          !textoSeguro(
            modulo
          ).trim()
        ) {
          return;
        }


        const nombreModulo =
          textoSeguro(
            modulo
          ).trim();


        const nuevo =
          modulosVisibles.includes(
            nombreModulo
          )
            ? modulosVisibles.filter(
                (item) =>
                  item !==
                  nombreModulo
              )
            : [
                ...modulosVisibles,
                nombreModulo,
              ];


        try {

          await asignarModulos(
            empleadoIdSeguro,
            nuevo
          );


          await cargarFicha(
            empleadoIdSeguro
          );

        } catch (error) {

          console.error(
            "Error asignando módulo:",
            error
          );

        }

      },
      [
        empleadoValido,
        empleadoIdSeguro,
        modulosVisibles,
        asignarModulos,
        cargarFicha,
      ]
    );


  /* ============================================================
     CAMBIAR PERMISO
  ============================================================ */

  const cambiarPermiso =
    useCallback(
      async (
        modulo,
        permiso
      ) => {

        if (
          !empleadoValido
        ) {
          return;
        }


        const nombreModulo =
          textoSeguro(
            modulo
          ).trim();


        const nombrePermiso =
          textoSeguro(
            permiso
          ).trim();


        if (
          !nombreModulo ||
          !nombrePermiso
        ) {
          return;
        }


        const nuevo = {
          ...(
            objetoSeguro(
              permisosEmpleado
            )
              ? permisosEmpleado
              : {}
          ),
        };


        const actuales =
          arraySeguro(
            nuevo[
              nombreModulo
            ]
          );


        nuevo[
          nombreModulo
        ] =
          actuales.includes(
            nombrePermiso
          )
            ? actuales.filter(
                (item) =>
                  item !==
                  nombrePermiso
              )
            : [
                ...actuales,
                nombrePermiso,
              ];


        try {

          await asignarPermisos(
            empleadoIdSeguro,
            nuevo
          );


          await cargarFicha(
            empleadoIdSeguro
          );

        } catch (error) {

          console.error(
            "Error asignando permiso:",
            error
          );

        }

      },
      [
        empleadoValido,
        empleadoIdSeguro,
        permisosEmpleado,
        asignarPermisos,
        cargarFicha,
      ]
    );


  /* ============================================================
     AUDITORÍA
  ============================================================ */

  const auditoriaSegura =
    useMemo(
      () =>
        arraySeguro(
          auditoria
        ).filter(
          (item) =>
            objetoSeguro(
              item
            )
        ),
      [
        auditoria,
      ]
    );


  const auditoriaFiltrada =
    useMemo(() => {

      const texto =
        busquedaAud
          .trim()
          .toLowerCase();


      return auditoriaSegura.filter(
        (item) => {

          const contenido = [
            item.usuario,
            item.modulo,
            item.accion,
            item.descripcion,
            item.fecha,
          ]
            .map(
              (valor) =>
                textoSeguro(
                  valor
                ).toLowerCase()
            )
            .join(" ");


          const coincideTexto =
            !texto ||
            contenido.includes(
              texto
            );


          const fecha =
            textoSeguro(
              item.fecha
            );


          const coincideFecha =
            !filtroFechaAud ||
            fecha.startsWith(
              filtroFechaAud
            );


          return (
            coincideTexto &&
            coincideFecha
          );

        }
      );

    }, [
      auditoriaSegura,
      busquedaAud,
      filtroFechaAud,
    ]);


  const totalPaginasAuditoria =
    Math.max(
      1,
      Math.ceil(
        auditoriaFiltrada.length /
          pageSize
      )
    );


  const auditoriaPaginada =
    useMemo(() => {

      const inicio =
        paginaAud *
        pageSize;


      return auditoriaFiltrada.slice(
        inicio,
        inicio + pageSize
      );

    }, [
      auditoriaFiltrada,
      paginaAud,
    ]);


  /* ============================================================
     LOGS
  ============================================================ */

  const logsSeguros =
    useMemo(
      () =>
        arraySeguro(
          logs
        ).filter(
          (item) =>
            objetoSeguro(
              item
            )
        ),
      [
        logs,
      ]
    );


  const logsFiltrados =
    useMemo(() => {

      const texto =
        busquedaLog
          .trim()
          .toLowerCase();


      return logsSeguros.filter(
        (item) => {

          const contenido = [
            item.evento,
            item.detalle,
            item.ip,
            item.fecha,
          ]
            .map(
              (valor) =>
                textoSeguro(
                  valor
                ).toLowerCase()
            )
            .join(" ");


          const coincideTexto =
            !texto ||
            contenido.includes(
              texto
            );


          const fecha =
            textoSeguro(
              item.fecha
            );


          const coincideFecha =
            !filtroFechaLog ||
            fecha.startsWith(
              filtroFechaLog
            );


          return (
            coincideTexto &&
            coincideFecha
          );

        }
      );

    }, [
      logsSeguros,
      busquedaLog,
      filtroFechaLog,
    ]);


  const totalPaginasLogs =
    Math.max(
      1,
      Math.ceil(
        logsFiltrados.length /
          pageSize
      )
    );


  const logsPaginados =
    useMemo(() => {

      const inicio =
        paginaLog *
        pageSize;


      return logsFiltrados.slice(
        inicio,
        inicio + pageSize
      );

    }, [
      logsFiltrados,
      paginaLog,
    ]);


  /* ============================================================
     EXPORTAR CSV
  ============================================================ */

  const descargarCsv =
    useCallback(
      (
        filas,
        nombre
      ) => {

        const contenido =
          filas
            .map(
              (fila) =>
                fila
                  .map(
                    (valor) =>
                      `"${String(
                        valor ?? ""
                      ).replace(
                        /"/g,
                        '""'
                      )}"`
                  )
                  .join(";")
            )
            .join("\n");


        const blob =
          new Blob(
            [
              "\ufeff",
              contenido,
            ],
            {
              type:
                "text/csv;charset=utf-8;",
            }
          );


        const url =
          URL.createObjectURL(
            blob
          );


        const enlace =
          document.createElement(
            "a"
          );


        enlace.href =
          url;

        enlace.download =
          nombre;


        document.body.appendChild(
          enlace
        );


        enlace.click();


        enlace.remove();


        setTimeout(
          () => {
            URL.revokeObjectURL(
              url
            );
          },
          100
        );

      },
      []
    );


  const descargarAuditoria =
    useCallback(() => {

      descargarCsv(
        [
          [
            "ID",
            "Usuario",
            "Módulo",
            "Acción",
            "Descripción",
            "Fecha",
          ],

          ...auditoriaFiltrada.map(
            (item) => [
              item.id ?? "",
              item.usuario ?? "",
              item.modulo ?? "",
              item.accion ?? "",
              item.descripcion ?? "",
              item.fecha ?? "",
            ]
          ),
        ],

        `auditoria_${
          empleado?.usuario ||
          empleado?.id ||
          "empleado"
        }.csv`
      );

    }, [
      auditoriaFiltrada,
      descargarCsv,
      empleado,
    ]);


  const descargarLogs =
    useCallback(() => {

      descargarCsv(
        [
          [
            "ID",
            "Fecha",
            "Evento",
            "Detalle",
            "IP",
          ],

          ...logsFiltrados.map(
            (item) => [
              item.id ?? "",
              item.fecha ?? "",
              item.evento ?? "",
              item.detalle ?? "",
              item.ip ?? "",
            ]
          ),
        ],

        `logs_${
          empleado?.usuario ||
          empleado?.id ||
          "empleado"
        }.csv`
      );

    }, [
      logsFiltrados,
      descargarCsv,
      empleado,
    ]);


  /* ============================================================
     RESET PASSWORD
  ============================================================ */

  const ejecutarResetPassword =
    useCallback(
      async () => {

        const password =
          nuevaPassword.trim();


        if (
          !empleadoValido ||
          !password
        ) {
          return;
        }


        try {

          await resetPassword(
            empleadoIdSeguro,
            password
          );


          setNuevaPassword("");

        } catch (error) {

          console.error(
            "Error reseteando contraseña:",
            error
          );

        }

      },
      [
        empleadoValido,
        empleadoIdSeguro,
        nuevaPassword,
        resetPassword,
      ]
    );


  /* ============================================================
     ASIGNAR ROL
  ============================================================ */

  const ejecutarAsignarRol =
    useCallback(
      async () => {

        const rolId =
          idSeguro(
            nuevoRol
          );


        if (
          !empleadoValido ||
          rolId === null
        ) {
          return;
        }


        try {

          await asignarRol(
            empleadoIdSeguro,
            rolId
          );


          setNuevoRol("");


          await cargarFicha(
            empleadoIdSeguro
          );

        } catch (error) {

          console.error(
            "Error asignando rol:",
            error
          );

        }

      },
      [
        empleadoValido,
        empleadoIdSeguro,
        nuevoRol,
        asignarRol,
        cargarFicha,
      ]
    );


  /* ============================================================
     CARGANDO
  ============================================================ */

  if (!ficha) {

    return (
      <div
        className="
          rounded-2xl
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          p-10
          text-center
        "
      >

        <div
          className="
            animate-pulse
          "
        >

          <div
            className="
              mx-auto
              h-10
              w-10
              rounded-xl
              bg-[var(--erp-bg)]
            "
          />

          <div
            className="
              mx-auto
              mt-4
              h-4
              w-56
              rounded
              bg-[var(--erp-bg)]
            "
          />

        </div>

      </div>
    );

  }


  /* ============================================================
     EMPLEADO NO VÁLIDO
  ============================================================ */

  if (!empleadoValido) {

    return (
      <div
        className="
          rounded-2xl
          border
          border-red-200
          bg-red-50
          p-8
          text-center
          text-sm
          text-red-700
        "
      >
        No se han podido cargar los datos de seguridad del empleado.
      </div>
    );

  }


  /* ============================================================
     MÉTRICAS
  ============================================================ */

  const totalPermisos =
    Object.values(
      permisosEmpleado
    ).reduce(
      (
        total,
        lista
      ) =>
        total +
        arraySeguro(
          lista
        ).length,
      0
    );


  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div
      className="
        w-full
        space-y-4
      "
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <section
        className="
          rounded-2xl
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          p-5
          shadow-sm
        "
      >

        <div
          className="
            flex
            flex-col
            gap-5
            xl:flex-row
            xl:items-center
            xl:justify-between
          "
        >

          <div
            className="
              flex
              min-w-0
              items-center
              gap-4
            "
          >

            <div
              className="
                relative
                shrink-0
              "
            >

              <img
                src={
                  typeof empleado.foto === "string" &&
                  empleado.foto.trim() !== "" &&
                  empleado.foto !== "-"
                    ? empleado.foto
                    : "/no-foto.png"
                }
                alt="Foto del empleado"
                onError={(event) => {
                  event.currentTarget.src =
                    "/no-foto.png";
                }}
                className="
                  h-20
                  w-20
                  rounded-2xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-bg)]
                  object-cover
                  shadow-sm
                "
              />

              <span
                className={`
                  absolute
                  -bottom-2
                  -right-2
                  rounded-full
                  border-2
                  border-[var(--erp-surface)]
                  px-2
                  py-0.5
                  text-[9px]
                  font-bold
                  ${
                    empleado.activo
                      ? "bg-emerald-500 text-white"
                      : "bg-red-500 text-white"
                  }
                `}
              >
                {empleado.activo
                  ? "ACTIVO"
                  : "BLOQUEADO"}
              </span>

            </div>


            <div className="min-w-0">

              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-[var(--erp-primary)]
                "
              >
                Centro de seguridad
              </p>

              <h1
                className="
                  mt-1
                  truncate
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[var(--erp-text)]
                "
              >
                {textoSeguro(
                  empleado.nombre
                )}

                {empleado.apellidos
                  ? ` ${empleado.apellidos}`
                  : ""}
              </h1>

              <p
                className="
                  mt-0.5
                  text-sm
                  text-[var(--erp-text-soft)]
                "
              >
                @{empleado.usuario || "-"}
              </p>

              <div
                className="
                  mt-2
                  flex
                  flex-wrap
                  gap-2
                "
              >

                <Chip tone="primary">
                  ID #{empleadoIdSeguro}
                </Chip>

                <Chip tone="purple">
                  {nombreRol}
                </Chip>

                <Chip
                  tone={
                    empleado.activo
                      ? "success"
                      : "danger"
                  }
                >
                  {empleado.activo
                    ? "Cuenta activa"
                    : "Cuenta bloqueada"}
                </Chip>

              </div>

            </div>

          </div>


          <div
            className="
              grid
              grid-cols-2
              gap-2
              sm:grid-cols-4
              xl:w-[520px]
            "
          >

            <div
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                p-3
              "
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--erp-text-soft)]">
                Módulos
              </p>

              <p className="mt-1 text-xl font-bold text-[var(--erp-text)]">
                {modulosVisibles.length}
              </p>
            </div>


            <div
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                p-3
              "
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--erp-text-soft)]">
                Permisos
              </p>

              <p className="mt-1 text-xl font-bold text-[var(--erp-text)]">
                {totalPermisos}
              </p>
            </div>


            <div
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                p-3
              "
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--erp-text-soft)]">
                Auditoría
              </p>

              <p className="mt-1 text-xl font-bold text-[var(--erp-text)]">
                {auditoriaFiltrada.length}
              </p>
            </div>


            <div
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                p-3
              "
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--erp-text-soft)]">
                Logs
              </p>

              <p className="mt-1 text-xl font-bold text-[var(--erp-text)]">
                {logsFiltrados.length}
              </p>
            </div>

          </div>

        </div>


        <div
          className="
            mt-5
            flex
            flex-wrap
            gap-2
            border-t
            border-[var(--erp-border)]
            pt-4
          "
        >

          {empleado.activo ? (

            <button
              type="button"
              onClick={() =>
                bloquear(
                  empleadoIdSeguro
                )
              }
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-2.5
                text-sm
                font-semibold
                text-red-700
                hover:bg-red-100
              "
            >
              🔒 Bloquear usuario
            </button>

          ) : (

            <button
              type="button"
              onClick={() =>
                desbloquear(
                  empleadoIdSeguro
                )
              }
              className="
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-4
                py-2.5
                text-sm
                font-semibold
                text-emerald-700
                hover:bg-emerald-100
              "
            >
              🔓 Desbloquear usuario
            </button>

          )}

        </div>

      </section>


      {/* ======================================================
          DATOS
      ====================================================== */}

      <section
        className="
          rounded-2xl
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          p-4
          shadow-sm
        "
      >

        <div
          className="
            grid
            grid-cols-1
            gap-2
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >

          {[
            [
              "DNI",
              empleado.dni || "-",
            ],
            [
              "Email",
              empleado.email_empresa || "-",
            ],
            [
              "Rol",
              nombreRol,
            ],
            [
              "Estado",
              empleado.activo
                ? "Operativo"
                : "Bloqueado",
            ],
          ].map(
            (item) => (

              <div
                key={item[0]}
                className="
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-bg)]
                  px-3
                  py-2.5
                "
              >

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-[var(--erp-text-soft)]
                  "
                >
                  {item[0]}
                </p>

                <p
                  className="
                    mt-1
                    truncate
                    text-sm
                    font-semibold
                    text-[var(--erp-text)]
                  "
                  title={String(
                    item[1]
                  )}
                >
                  {item[1]}
                </p>

              </div>

            )
          )}

        </div>

      </section>


      {/* ======================================================
          CREDENCIALES
      ====================================================== */}

      <section
        className="
          rounded-2xl
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          p-4
          shadow-sm
        "
      >

        <div className="mb-3">

          <h2
            className="
              text-base
              font-semibold
              text-[var(--erp-text)]
            "
          >
            🔐 Credenciales y acceso
          </h2>

          <p
            className="
              mt-0.5
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Operaciones sensibles sobre la cuenta.
          </p>

        </div>


        <div
          className="
            grid
            grid-cols-1
            gap-3
            xl:grid-cols-2
          "
        >

          {/* RESET PASSWORD */}

          <div
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-bg)]
              p-4
            "
          >

            <h3
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
              "
            >
              🔑 Restablecer contraseña
            </h3>

            <p
              className="
                mt-0.5
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              Establece una nueva contraseña.
            </p>


            <div
              className="
                mt-3
                flex
                flex-col
                gap-2
                sm:flex-row
              "
            >

              <input
                type="password"
                value={nuevaPassword}
                onChange={(event) =>
                  setNuevaPassword(
                    event.target.value
                  )
                }
                placeholder="Nueva contraseña"
                className="
                  min-w-0
                  flex-1
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface)]
                  px-3
                  py-2.5
                  text-sm
                  text-[var(--erp-text)]
                  outline-none
                  placeholder:text-[var(--erp-text-soft)]
                  focus:border-[var(--erp-primary)]
                "
              />

              <button
                type="button"
                onClick={
                  ejecutarResetPassword
                }
                disabled={
                  !nuevaPassword.trim()
                }
                className="
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                Resetear
              </button>

            </div>

          </div>


          {/* ASIGNAR ROL */}

          <div
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-bg)]
              p-4
            "
          >

            <h3
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
              "
            >
              👤 Asignar rol
            </h3>

            <p
              className="
                mt-0.5
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              Rol actual:{" "}

              <span className="font-semibold text-purple-700">
                {nombreRol}
              </span>
            </p>


            <div
              className="
                mt-3
                flex
                flex-col
                gap-2
                sm:flex-row
              "
            >

              <input
                type="number"
                min="1"
                value={nuevoRol}
                onChange={(event) =>
                  setNuevoRol(
                    event.target.value
                  )
                }
                placeholder="ID del nuevo rol"
                className="
                  min-w-0
                  flex-1
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface)]
                  px-3
                  py-2.5
                  text-sm
                  text-[var(--erp-text)]
                  outline-none
                  placeholder:text-[var(--erp-text-soft)]
                  focus:border-[var(--erp-primary)]
                "
              />

              <button
                type="button"
                onClick={
                  ejecutarAsignarRol
                }
                disabled={
                  idSeguro(
                    nuevoRol
                  ) === null
                }
                className="
                  rounded-xl
                  border
                  border-purple-200
                  bg-purple-50
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-purple-700
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                Asignar rol
              </button>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          MÓDULOS
      ====================================================== */}

      <SeccionAcordeon
        titulo="Módulos visibles"
        descripcion="Control de los módulos disponibles para este empleado."
        icono="📦"
        contador={
          modulosVisibles.length
        }
        abierto={showModulos}
        onToggle={() =>
          setShowModulos(
            (actual) =>
              !actual
          )
        }
      >

        <div
          className="
            grid
            grid-cols-1
            gap-2
            md:grid-cols-2
            xl:grid-cols-3
          "
        >

          {modulosDisponibles.map(
            (modulo) => {

              const visible =
                modulosVisibles.includes(
                  modulo
                );


              return (
                <label
                  key={modulo}
                  className={`
                    flex
                    cursor-pointer
                    items-center
                    justify-between
                    gap-3
                    rounded-xl
                    border
                    px-3
                    py-2.5
                    ${
                      visible
                        ? "border-blue-200 bg-blue-50"
                        : "border-[var(--erp-border)] bg-[var(--erp-surface)]"
                    }
                  `}
                >

                  <span
                    className={`
                      truncate
                      text-sm
                      font-medium
                      ${
                        visible
                          ? "text-blue-800"
                          : "text-[var(--erp-text)]"
                      }
                    `}
                  >
                    {modulo}
                  </span>

                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() =>
                      cambiarModulo(
                        modulo
                      )
                    }
                    className="
                      h-4
                      w-4
                      cursor-pointer
                      accent-blue-500
                    "
                  />

                </label>
              );

            }
          )}

        </div>


        {modulosDisponibles.length === 0 && (
          <div
            className="
              rounded-xl
              border
              border-dashed
              border-[var(--erp-border)]
              p-6
              text-center
              text-sm
              text-[var(--erp-text-soft)]
            "
          >
            No hay módulos disponibles.
          </div>
        )}

      </SeccionAcordeon>


      {/* ======================================================
          PERMISOS
      ====================================================== */}

      <SeccionAcordeon
        titulo="Permisos por módulo"
        descripcion="Control granular de las capacidades del empleado."
        icono="🔧"
        abierto={showPermisos}
        onToggle={() =>
          setShowPermisos(
            (actual) =>
              !actual
          )
        }
      >

        <div className="space-y-2">

          {Object.entries(
            permisosGlobales
          ).map(
            ([
              modulo,
              disponibles,
            ]) => {

              const actuales =
                arraySeguro(
                  permisosEmpleado[
                    modulo
                  ]
                );


              const activos =
                disponibles.filter(
                  (permiso) =>
                    actuales.includes(
                      permiso
                    )
                ).length;


              const abierto =
                modulosAbiertos.has(
                  modulo
                );


              return (
                <div
                  key={modulo}
                  className="
                    overflow-hidden
                    rounded-xl
                    border
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface)]
                  "
                >

                  <button
                    type="button"
                    onClick={() =>
                      setModulosAbiertos(
                        (actual) => {

                          const siguiente =
                            new Set(
                              actual
                            );


                          if (
                            siguiente.has(
                              modulo
                            )
                          ) {
                            siguiente.delete(
                              modulo
                            );
                          } else {
                            siguiente.add(
                              modulo
                            );
                          }


                          return siguiente;

                        }
                      )
                    }
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-3
                      px-4
                      py-3
                      text-left
                      hover:bg-[var(--erp-bg)]
                    "
                  >

                    <div className="min-w-0">

                      <p
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-[var(--erp-text)]
                        "
                      >
                        {modulo}
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-xs
                          text-[var(--erp-text-soft)]
                        "
                      >
                        {activos} de{" "}
                        {disponibles.length}{" "}
                        activos
                      </p>

                    </div>


                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <Chip
                        tone={
                          disponibles.length > 0 &&
                          activos ===
                            disponibles.length
                            ? "success"
                            : "purple"
                        }
                      >
                        {activos}
                      </Chip>

                      <span
                        className="
                          text-xs
                          text-[var(--erp-text-soft)]
                        "
                        aria-hidden="true"
                      >
                        {abierto
                          ? "▲"
                          : "▼"}
                      </span>

                    </div>

                  </button>


                  {abierto && (
                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-2
                        border-t
                        border-[var(--erp-border)]
                        bg-[var(--erp-bg)]
                        p-3
                        sm:grid-cols-2
                        lg:grid-cols-4
                      "
                    >

                      {disponibles.map(
                        (permiso) => {

                          const checked =
                            actuales.includes(
                              permiso
                            );


                          return (
                            <label
                              key={`${modulo}-${permiso}`}
                              className={`
                                flex
                                cursor-pointer
                                items-center
                                gap-2
                                rounded-lg
                                border
                                px-3
                                py-2.5
                                text-sm
                                ${
                                  checked
                                    ? "border-purple-200 bg-purple-50 text-purple-700"
                                    : "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-text)]"
                                }
                              `}
                            >

                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={() =>
                                  cambiarPermiso(
                                    modulo,
                                    permiso
                                  )
                                }
                                className="
                                  h-4
                                  w-4
                                  cursor-pointer
                                  accent-purple-500
                                "
                              />

                              <span className="truncate">
                                {permiso}
                              </span>

                            </label>
                          );

                        }
                      )}

                    </div>
                  )}

                </div>
              );

            }
          )}


          {Object.keys(
            permisosGlobales
          ).length === 0 && (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-[var(--erp-border)]
                p-6
                text-center
                text-sm
                text-[var(--erp-text-soft)]
              "
            >
              No hay permisos disponibles.
            </div>
          )}

        </div>

      </SeccionAcordeon>


      {/* ======================================================
          AUDITORÍA
      ====================================================== */}

      <SeccionAcordeon
        titulo="Auditoría del usuario"
        descripcion="Trazabilidad de las acciones realizadas por este empleado."
        icono="📊"
        contador={
          auditoriaFiltrada.length
        }
        abierto={showAuditoria}
        onToggle={() =>
          setShowAuditoria(
            (actual) =>
              !actual
          )
        }
      >

        <div className="space-y-3">

          <div
            className="
              flex
              flex-col
              gap-2
              lg:flex-row
            "
          >

            <input
              type="text"
              value={busquedaAud}
              onChange={(event) => {

                setBusquedaAud(
                  event.target.value
                );

                setPaginaAud(0);

              }}
              placeholder="Buscar módulo, acción o descripción..."
              className="
                min-w-0
                flex-1
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                px-3
                py-2.5
                text-sm
                text-[var(--erp-text)]
                outline-none
                placeholder:text-[var(--erp-text-soft)]
                focus:border-[var(--erp-primary)]
              "
            />


            <input
              type="date"
              value={filtroFechaAud}
              onChange={(event) => {

                setFiltroFechaAud(
                  event.target.value
                );

                setPaginaAud(0);

              }}
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                px-3
                py-2.5
                text-sm
                text-[var(--erp-text)]
                outline-none
              "
            />


            <button
              type="button"
              onClick={
                descargarAuditoria
              }
              className="
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-4
                py-2.5
                text-sm
                font-semibold
                text-emerald-700
              "
            >
              📊 Exportar
            </button>

          </div>


          {auditoriaPaginada.length === 0 ? (

            <div
              className="
                rounded-xl
                border
                border-dashed
                border-[var(--erp-border)]
                p-8
                text-center
                text-sm
                text-[var(--erp-text-soft)]
              "
            >
              No hay registros de auditoría.
            </div>

          ) : (

            <div className="space-y-2">

              {auditoriaPaginada.map(
                (item, index) => (

                  <div
                    key={
                      item.id ??
                      `aud-${index}`
                    }
                    className="
                      rounded-xl
                      border
                      border-[var(--erp-border)]
                      bg-[var(--erp-surface)]
                      p-3
                    "
                  >

                    <div
                      className="
                        flex
                        flex-col
                        gap-1
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >

                      <div
                        className="
                          flex
                          min-w-0
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >

                        <Chip tone="primary">
                          {item.accion ||
                            "Actividad"}
                        </Chip>

                        <span
                          className="
                            text-xs
                            text-[var(--erp-text-soft)]
                          "
                        >
                          {item.modulo ||
                            "Sistema"}
                        </span>

                      </div>


                      <span
                        className="
                          text-xs
                          text-[var(--erp-text-soft)]
                        "
                      >
                        {item.fecha || "-"}
                      </span>

                    </div>


                    <p
                      className="
                        mt-2
                        text-sm
                        text-[var(--erp-text)]
                      "
                    >
                      {item.descripcion ||
                        "Sin descripción"}
                    </p>

                  </div>

                )
              )}

            </div>

          )}


          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              pt-1
            "
          >

            <span
              className="
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              Página{" "}
              {Math.min(
                paginaAud + 1,
                totalPaginasAuditoria
              )}{" "}
              de{" "}
              {totalPaginasAuditoria}
            </span>


            <div className="flex gap-2">

              <button
                type="button"
                disabled={
                  paginaAud === 0
                }
                onClick={() =>
                  setPaginaAud(
                    (actual) =>
                      Math.max(
                        0,
                        actual - 1
                      )
                  )
                }
                className="
                  rounded-lg
                  border
                  border-[var(--erp-border)]
                  px-3
                  py-1.5
                  text-xs
                  disabled:opacity-40
                "
              >
                Anterior
              </button>


              <button
                type="button"
                disabled={
                  paginaAud >=
                  totalPaginasAuditoria - 1
                }
                onClick={() =>
                  setPaginaAud(
                    (actual) =>
                      Math.min(
                        totalPaginasAuditoria - 1,
                        actual + 1
                      )
                  )
                }
                className="
                  rounded-lg
                  border
                  border-[var(--erp-border)]
                  px-3
                  py-1.5
                  text-xs
                  disabled:opacity-40
                "
              >
                Siguiente
              </button>

            </div>

          </div>

        </div>

      </SeccionAcordeon>


      {/* ======================================================
          LOGS
      ====================================================== */}

      <SeccionAcordeon
        titulo="Logs técnicos del usuario"
        descripcion="Eventos técnicos, errores e incidencias."
        icono="📝"
        contador={
          logsFiltrados.length
        }
        abierto={showLogs}
        onToggle={() =>
          setShowLogs(
            (actual) =>
              !actual
          )
        }
      >

        <div className="space-y-3">

          <div
            className="
              flex
              flex-col
              gap-2
              lg:flex-row
            "
          >

            <input
              type="text"
              value={busquedaLog}
              onChange={(event) => {

                setBusquedaLog(
                  event.target.value
                );

                setPaginaLog(0);

              }}
              placeholder="Buscar evento, detalle o IP..."
              className="
                min-w-0
                flex-1
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                px-3
                py-2.5
                text-sm
                text-[var(--erp-text)]
                outline-none
                placeholder:text-[var(--erp-text-soft)]
                focus:border-[var(--erp-primary)]
              "
            />


            <input
              type="date"
              value={filtroFechaLog}
              onChange={(event) => {

                setFiltroFechaLog(
                  event.target.value
                );

                setPaginaLog(0);

              }}
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                px-3
                py-2.5
                text-sm
                text-[var(--erp-text)]
                outline-none
              "
            />


            <button
              type="button"
              onClick={
                descargarLogs
              }
              className="
                rounded-xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-2.5
                text-sm
                font-semibold
                text-amber-700
              "
            >
              📝 Exportar
            </button>

          </div>


          {logsPaginados.length === 0 ? (

            <div
              className="
                rounded-xl
                border
                border-dashed
                border-[var(--erp-border)]
                p-8
                text-center
                text-sm
                text-[var(--erp-text-soft)]
              "
            >
              No hay logs técnicos.
            </div>

          ) : (

            <div className="space-y-2">

              {logsPaginados.map(
                (item, index) => {

                  const evento =
                    textoSeguro(
                      item.evento
                    ).toLowerCase();


                  const tono =
                    evento === "error"
                      ? "danger"
                      : evento === "warning" ||
                        evento === "login_error"
                        ? "warning"
                        : "neutral";


                  return (
                    <div
                      key={
                        item.id ??
                        `log-${index}`
                      }
                      className="
                        rounded-xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface)]
                        p-3
                      "
                    >

                      <div
                        className="
                          flex
                          flex-col
                          gap-1
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                        "
                      >

                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          "
                        >

                          <Chip tone={tono}>
                            {item.evento ||
                              "Evento"}
                          </Chip>


                          {item.ip && (
                            <span
                              className="
                                text-xs
                                text-[var(--erp-text-soft)]
                              "
                            >
                              IP {item.ip}
                            </span>
                          )}

                        </div>


                        <span
                          className="
                            text-xs
                            text-[var(--erp-text-soft)]
                          "
                        >
                          {item.fecha || "-"}
                        </span>

                      </div>


                      <p
                        className="
                          mt-2
                          text-sm
                          text-[var(--erp-text)]
                        "
                      >
                        {item.detalle ||
                          "Sin detalle"}
                      </p>

                    </div>
                  );

                }
              )}

            </div>

          )}


          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              pt-1
            "
          >

            <span
              className="
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              Página{" "}
              {Math.min(
                paginaLog + 1,
                totalPaginasLogs
              )}{" "}
              de{" "}
              {totalPaginasLogs}
            </span>


            <div className="flex gap-2">

              <button
                type="button"
                disabled={
                  paginaLog === 0
                }
                onClick={() =>
                  setPaginaLog(
                    (actual) =>
                      Math.max(
                        0,
                        actual - 1
                      )
                  )
                }
                className="
                  rounded-lg
                  border
                  border-[var(--erp-border)]
                  px-3
                  py-1.5
                  text-xs
                  disabled:opacity-40
                "
              >
                Anterior
              </button>


              <button
                type="button"
                disabled={
                  paginaLog >=
                  totalPaginasLogs - 1
                }
                onClick={() =>
                  setPaginaLog(
                    (actual) =>
                      Math.min(
                        totalPaginasLogs - 1,
                        actual + 1
                      )
                  )
                }
                className="
                  rounded-lg
                  border
                  border-[var(--erp-border)]
                  px-3
                  py-1.5
                  text-xs
                  disabled:opacity-40
                "
              >
                Siguiente
              </button>

            </div>

          </div>

        </div>

      </SeccionAcordeon>

    </div>
  );
}
