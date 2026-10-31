import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

import MODULOS_ERP from "../../config/modulos";
import { editarEmpleado } from "../../api/empleados";


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
}) {

  return (
    <span
      className={`inline-flex
 items-center
 
 
 px-2.5
 py-1
 
 
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
      className="overflow-hidden"
    >

      <button
        type="button"
        onClick={onToggle}
        className="flex
 w-full
 items-center
 justify-between
 gap-4
 px-5
 py-4"
      >

        <div
          className="flex
 min-w-0
 items-center
 gap-3"
        >

          <div
            className="flex
 h-10
 w-10
 shrink-0
 items-center
 justify-center"
          >
            {icono}
          </div>

          <div className="min-w-0">

            <h2
              className="truncate"
            >
              {titulo}
            </h2>

            <p
              className="mt-0.5
 truncate"
            >
              {descripcion}
            </p>

          </div>

        </div>


        <div
          className="flex
 shrink-0
 items-center
 gap-2"
        >

          {typeof contador !== "undefined" && (
            <Chip>
              {contador}
            </Chip>
          )}

          <span
           
            aria-hidden="true"
          >
            {abierto ? "▲" : "▼"}
          </span>

        </div>

      </button>


      {abierto && (
        <div
          className="p-4"
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
    roles,
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
    guardandoVisibilidad,
    setGuardandoVisibilidad,
  ] = useState(false);


  const [
    mensajeVisibilidad,
    setMensajeVisibilidad,
  ] = useState("");


  const [
    nuevoRol,
    setNuevoRol,
  ] = useState("");

  const [guardandoRol, setGuardandoRol] = useState(false);
  const [mensajeRol, setMensajeRol] = useState("");


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


  const cambiarVisibilidadEmpleado = useCallback(async () => {
    if (!empleadoValido || empleadoIdSeguro === null || guardandoVisibilidad) return;

    const nuevoValor = empleado?.visible_en_listado === false;
    try {
      setGuardandoVisibilidad(true);
      setMensajeVisibilidad("");
      await editarEmpleado(empleadoIdSeguro, { visible_en_listado: nuevoValor });
      await cargarFicha(empleadoIdSeguro);
      setMensajeVisibilidad(
        nuevoValor
          ? "Empleado visible en las tarjetas del módulo Empleados."
          : "Empleado oculto en las tarjetas del módulo Empleados."
      );
    } catch (error) {
      setMensajeVisibilidad(
        error?.response?.data?.detail ||
        "No se ha podido actualizar la visibilidad del empleado."
      );
    } finally {
      setGuardandoVisibilidad(false);
    }
  }, [empleadoValido, empleadoIdSeguro, guardandoVisibilidad, empleado?.visible_en_listado, cargarFicha]);


  /* ============================================================
     ROL
  ============================================================ */

  const rolActualId = idSeguro(
    empleado?.rol_id ?? empleado?.rol?.id ?? ficha?.rol?.id
  );

  const nombreRol = textoSeguro(
    empleado?.rol?.nombre ??
    empleado?.rol_nombre ??
    ficha?.rol?.nombre ??
    roles.find((rol) => idSeguro(rol?.id) === rolActualId)?.nombre ??
    ""
  ).trim() || "Sin rol asignado";


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


        if (guardandoRol) {
          return;
        }

        try {
          setGuardandoRol(true);
          setMensajeRol("");

          await asignarRol(
            empleadoIdSeguro,
            rolId
          );

          await cargarFicha(
            empleadoIdSeguro
          );

          setNuevoRol("");
          setMensajeRol(
            rolId === rolActualId
              ? "El empleado ya tenía ese rol; se ha verificado la asignación."
              : "Rol guardado correctamente."
          );
        } catch (error) {
          console.error(
            "Error asignando rol:",
            error
          );
          setMensajeRol(
            error?.response?.data?.detail ||
            error?.message ||
            "No se ha podido guardar el rol. Revisa los permisos y vuelve a intentarlo."
          );
        } finally {
          setGuardandoRol(false);
        }

      },
      [
        empleadoValido,
        empleadoIdSeguro,
        nuevoRol,
        rolActualId,
        guardandoRol,
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
        className="p-10"
      >

        <div
         
        >

          <div
            className="mx-auto
 h-10
 w-10"
          />

          <div
            className="mx-auto
 mt-4
 h-4
 w-56"
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
        className="p-8"
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
      className="erp-page w-full space-y-4"
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <MolsanPageHeader
        mark="SE"
        title={`${textoSeguro(empleado.nombre)}${empleado.apellidos ? ` ${empleado.apellidos}` : ""}`}
        description={`Ficha individual de seguridad · @${empleado.usuario || "-"}`}
      />

      <section
        className="molsan-panel p-5"
      >

        <div
          className="flex
 flex-col
 gap-5
 xl:flex-row
 xl:items-center
 xl:justify-between"
        >

          <div
            className="flex
 min-w-0
 items-center
 gap-4"
          >

            <div
              className="relative
 shrink-0"
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
                className="h-20
 w-20
 
 
 
 
 object-cover"
              />

              <span
                className={`absolute
 -bottom-2
 -right-2
 
 
 
 px-2
 py-0.5
 
 
 ${
 empleado.activo
 ? ""
 : ""
 }`}
              >
                {empleado.activo
                  ? "ACTIVO"
                  : "BLOQUEADO"}
              </span>

            </div>


            <div className="min-w-0">
              <p className="font-semibold">@{empleado.usuario || "-"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip tone="primary">ID #{empleadoIdSeguro}</Chip>
                <Chip tone="purple">{nombreRol}</Chip>
                <Chip tone={empleado.activo ? "success" : "danger"}>
                  {empleado.activo ? "Cuenta activa" : "Cuenta bloqueada"}
                </Chip>
              </div>
            </div>

          </div>


          <div
            className="grid
 grid-cols-2
 gap-2
 sm:grid-cols-4
 xl:w-[520px]"
          >

            <div
              className="p-3"
            >
              <p className="uppercase">
                Módulos
              </p>

              <p className="mt-1">
                {modulosVisibles.length}
              </p>
            </div>


            <div
              className="p-3"
            >
              <p className="uppercase">
                Permisos
              </p>

              <p className="mt-1">
                {totalPermisos}
              </p>
            </div>


            <div
              className="p-3"
            >
              <p className="uppercase">
                Auditoría
              </p>

              <p className="mt-1">
                {auditoriaFiltrada.length}
              </p>
            </div>


            <div
              className="p-3"
            >
              <p className="uppercase">
                Logs
              </p>

              <p className="mt-1">
                {logsFiltrados.length}
              </p>
            </div>

          </div>

        </div>


        <div
          className="mt-5
 flex
 flex-wrap
 gap-2
 
 
 pt-4"
        >

          <button
            type="button"
            onClick={cambiarVisibilidadEmpleado}
            disabled={guardandoVisibilidad}
            className={`px-4 py-2.5 ${empleado.visible_en_listado === false ? "" : ""}`}
          >
            {guardandoVisibilidad
              ? "Guardando…"
              : empleado.visible_en_listado === false
                ? "👁️ Mostrar en Empleados"
                : "🙈 Ocultar de Empleados"}
          </button>

          {empleado.activo ? (

            <button
              type="button"
              onClick={() =>
                bloquear(
                  empleadoIdSeguro
                )
              }
              className="px-4
 py-2.5"
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
              className="px-4
 py-2.5"
            >
              🔓 Desbloquear usuario
            </button>

          )}

          {mensajeVisibilidad && (
            <p className="mt-2 w-full" role="status">{mensajeVisibilidad}</p>
          )}
        </div>

      </section>


      {/* ======================================================
          DATOS
      ====================================================== */}

      <section
        className="p-4"
      >

        <div
          className="grid
 grid-cols-1
 gap-2
 sm:grid-cols-2
 lg:grid-cols-4"
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
                className="px-3
 py-2.5"
              >

                <p
                  className="uppercase"
                >
                  {item[0]}
                </p>

                <p
                  className="mt-1
 truncate"
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
        className="p-4"
      >

        <div className="mb-3">

          <h2
           
          >
            🔐 Credenciales y acceso
          </h2>

          <p
            className="mt-0.5"
          >
            Operaciones sensibles sobre la cuenta.
          </p>

        </div>


        <div
          className="grid
 grid-cols-1
 gap-3
 xl:grid-cols-2"
        >

          {/* RESET PASSWORD */}

          <div
            className="p-4"
          >

            <h3
             
            >
              🔑 Restablecer contraseña
            </h3>

            <p
              className="mt-0.5"
            >
              Establece una nueva contraseña.
            </p>


            <div
              className="mt-3
 flex
 flex-col
 gap-2
 sm:flex-row"
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
                className="min-w-0
 flex-1
 
 
 
 
 px-3
 py-2.5"
              />

              <button
                type="button"
                onClick={
                  ejecutarResetPassword
                }
                disabled={
                  !nuevaPassword.trim()
                }
                className="px-4
 py-2.5"
              >
                Resetear
              </button>

            </div>

          </div>


          {/* ASIGNAR ROL */}

          <div
            className="p-4"
          >

            <h3
             
            >
              👤 Asignar rol
            </h3>

            <p
              className="mt-0.5"
            >
              Rol actual:{" "}

              <span>
                {nombreRol}
              </span>
            </p>


            <div
              className="mt-3
 flex
 flex-col
 gap-2
 sm:flex-row"
            >

              <select
                value={nuevoRol}
                onChange={(event) => setNuevoRol(event.target.value)}
                className="min-w-0
 flex-1
 
 
 
 
 px-3
 py-2.5"
                aria-label="Seleccionar nuevo rol"
              >
                <option value="">Selecciona un rol…</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={String(rol.id)}>
                    {rol.nombre}{rol.descripcion ? ` — ${rol.descripcion}` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={
                  ejecutarAsignarRol
                }
                disabled={
                  !empleadoValido ||
                  guardandoRol ||
                  idSeguro(nuevoRol) === null
                }
                className="px-4
 py-2.5"
              >
                {guardandoRol ? "Guardando rol…" : "Guardar rol"}
              </button>

            </div>

            {mensajeRol && (
              <p
                role="status"
                className={`mt-3 ${mensajeRol === "Rol guardado correctamente." ? "" : ""}`}
              >
                {mensajeRol}
              </p>
            )}

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
          className="grid
 grid-cols-1
 gap-2
 md:grid-cols-2
 xl:grid-cols-3"
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
                  className={`flex
 
 items-center
 justify-between
 gap-3
 
 
 px-3
 py-2.5
 ${
 visible
 ? ""
 : ""
 }`}
                >

                  <span
                    className={`truncate
 
 
 ${
 visible
 ? ""
 : ""
 }`}
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
                    className="h-4
 w-4"
                  />

                </label>
              );

            }
          )}

        </div>


        {modulosDisponibles.length === 0 && (
          <div
            className="p-6"
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
                  className="overflow-hidden"
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
                    className="flex
 w-full
 items-center
 justify-between
 gap-3
 px-4
 py-3"
                  >

                    <div className="min-w-0">

                      <p
                        className="truncate"
                      >
                        {modulo}
                      </p>

                      <p
                        className="mt-0.5"
                      >
                        {activos} de{" "}
                        {disponibles.length}{" "}
                        activos
                      </p>

                    </div>


                    <div
                      className="flex
 items-center
 gap-2"
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
                      className="grid
 grid-cols-1
 gap-2
 
 
 
 p-3
 sm:grid-cols-2
 lg:grid-cols-4"
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
                              className={`flex
 
 items-center
 gap-2
 
 
 px-3
 py-2.5
 
 ${
 checked
 ? ""
 : ""
 }`}
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
                                className="h-4
 w-4"
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
              className="p-6"
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
            className="flex
 flex-col
 gap-2
 lg:flex-row"
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
              className="min-w-0
 flex-1
 
 
 
 
 px-3
 py-2.5"
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
              className="px-3
 py-2.5"
            />


            <button
              type="button"
              onClick={
                descargarAuditoria
              }
              className="px-4
 py-2.5"
            >
              📊 Exportar
            </button>

          </div>


          {auditoriaPaginada.length === 0 ? (

            <div
              className="p-8"
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
                    className="p-3"
                  >

                    <div
                      className="flex
 flex-col
 gap-1
 sm:flex-row
 sm:items-center
 sm:justify-between"
                    >

                      <div
                        className="flex
 min-w-0
 flex-wrap
 items-center
 gap-2"
                      >

                        <Chip tone="primary">
                          {item.accion ||
                            "Actividad"}
                        </Chip>

                        <span
                         
                        >
                          {item.modulo ||
                            "Sistema"}
                        </span>

                      </div>


                      <span
                       
                      >
                        {item.fecha || "-"}
                      </span>

                    </div>


                    <p
                      className="mt-2"
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
            className="flex
 items-center
 justify-between
 gap-3
 pt-1"
          >

            <span
             
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
                className="px-3
 py-1.5"
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
                className="px-3
 py-1.5"
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
            className="flex
 flex-col
 gap-2
 lg:flex-row"
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
              className="min-w-0
 flex-1
 
 
 
 
 px-3
 py-2.5"
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
              className="px-3
 py-2.5"
            />


            <button
              type="button"
              onClick={
                descargarLogs
              }
              className="px-4
 py-2.5"
            >
              📝 Exportar
            </button>

          </div>


          {logsPaginados.length === 0 ? (

            <div
              className="p-8"
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
                      className="p-3"
                    >

                      <div
                        className="flex
 flex-col
 gap-1
 sm:flex-row
 sm:items-center
 sm:justify-between"
                      >

                        <div
                          className="flex
 flex-wrap
 items-center
 gap-2"
                        >

                          <Chip tone={tono}>
                            {item.evento ||
                              "Evento"}
                          </Chip>


                          {item.ip && (
                            <span
                             
                            >
                              IP {item.ip}
                            </span>
                          )}

                        </div>


                        <span
                         
                        >
                          {item.fecha || "-"}
                        </span>

                      </div>


                      <p
                        className="mt-2"
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
            className="flex
 items-center
 justify-between
 gap-3
 pt-1"
          >

            <span
             
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
                className="px-3
 py-1.5"
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
                className="px-3
 py-1.5"
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
