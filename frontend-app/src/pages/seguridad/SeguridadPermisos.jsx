import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import MODULOS_ERP from "../../config/modulos";
import "./SeguridadSubpaginasPremium.css";


function arraySeguro(valor) {
  return Array.isArray(valor) ? valor : [];
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


const ETIQUETAS_MODULOS = {
  noticias: "Noticias",
  "mensajeria-gestion": "Mensajería Gestión",
  "control-fichajes": "Control de Fichajes",
};


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


export default function SeguridadPermisos() {

  const {
    permisos = [],
    ficha,
    asignarPermisos,
    cargarFicha,
  } = useSeguridad();


  const [busqueda, setBusqueda] =
    useState("");


  const [moduloSeleccionado, setModuloSeleccionado] =
    useState("todos");


  const [procesando, setProcesando] =
    useState(false);


  const [modulosAbiertos, setModulosAbiertos] =
    useState(() => new Set());


  /**
   * ============================================================
   * EMPLEADO
   * ============================================================
   */

  const empleado = useMemo(() => {

    if (
      !ficha ||
      typeof ficha !== "object"
    ) {
      return null;
    }

    if (
      !ficha.empleado ||
      typeof ficha.empleado !== "object"
    ) {
      return null;
    }

    return ficha.empleado;

  }, [ficha]);


  const empleadoId = useMemo(() => {

    const id =
      Number(
        empleado?.id
      );

    return Number.isFinite(id) &&
      id > 0
      ? id
      : null;

  }, [empleado]);


  /**
   * ============================================================
   * PERMISOS EMPLEADO
   * ============================================================
   */

  const permisosEmpleado = useMemo(() => {

    if (
      !ficha ||
      typeof ficha !== "object"
    ) {
      return {};
    }

    if (
      !ficha.permisos_modulo_dict ||
      typeof ficha.permisos_modulo_dict !==
        "object" ||
      Array.isArray(
        ficha.permisos_modulo_dict
      )
    ) {
      return {};
    }

    return ficha.permisos_modulo_dict;

  }, [ficha]);


  /**
   * ============================================================
   * PERMISOS GLOBALES
   * ============================================================
   */

  const permisosGlobales = useMemo(() => {
    // Catálogo canónico: cada módulo tiene siempre las cuatro acciones
    // posibles. Este catálogo solo dibuja las casillas; no concede permisos.
    const accionesBase = ["ver", "crear", "editar", "eliminar"];
    const resultado = {};

    arraySeguro(MODULOS_ERP).forEach((item) => {
      if (item && typeof item.key === "string" && item.key.trim()) {
        resultado[item.key.trim()] = [...accionesBase];
      }
    });

    // Compatibilidad: no ocultar claves antiguas ya guardadas en BD.
    Object.keys(permisosEmpleado || {}).forEach((modulo) => {
      if (typeof modulo === "string" && modulo.trim() && !resultado[modulo.trim()]) {
        resultado[modulo.trim()] = [...accionesBase];
      }
    });

    return resultado;
  }, [permisosEmpleado]);

  /**
   * ============================================================
   * MÓDULOS
   *
   * Unión del catálogo de permisos y de los módulos visibles.
   *
   * Esto evita volver a mostrar 14 aquí mientras el empleado
   * tiene 18 módulos visibles.
   * ============================================================
   */

  const modulos = useMemo(() => {

    const conjunto =
      new Set();

    Object.keys(
      permisosGlobales
    ).forEach(
      (modulo) =>
        conjunto.add(modulo)
    );


    const modulosVisibles =
      Array.isArray(
        empleado?.modulos_visibles_list
      )
        ? empleado.modulos_visibles_list
        : Array.isArray(
            ficha?.modulos_visibles
          )
          ? ficha.modulos_visibles
          : [];


    modulosVisibles.forEach(
      (modulo) => {

        if (
          typeof modulo === "string" &&
          modulo.trim()
        ) {
          conjunto.add(
            modulo.trim()
          );
        }

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
            sensitivity: "base",
          }
        )
    );

  }, [
    permisosGlobales,
    empleado,
    ficha,
  ]);


  /**
   * ============================================================
   * FILTRO
   * ============================================================
   */

  const modulosFiltrados =
    useMemo(() => {

      const texto =
        busqueda
          .trim()
          .toLowerCase();


      return modulos.filter(
        (modulo) => {

          if (
            moduloSeleccionado !==
              "todos" &&
            modulo !==
              moduloSeleccionado
          ) {
            return false;
          }


          if (!texto) {
            return true;
          }


          const coincideModulo =
            modulo
              .toLowerCase()
              .includes(
                texto
              );


          const coincidePermiso =
            arraySeguro(
              permisosGlobales[
                modulo
              ]
            ).some(
              (permiso) =>
                permiso
                  .toLowerCase()
                  .includes(
                    texto
                  )
            );


          return (
            coincideModulo ||
            coincidePermiso
          );

        }
      );

    }, [
      modulos,
      busqueda,
      moduloSeleccionado,
      permisosGlobales,
    ]);


  /**
   * ============================================================
   * TOTAL PERMISOS DEL CATÁLOGO
   * ============================================================
   */

  const totalPermisos =
    useMemo(
      () =>
        Object.values(
          permisosGlobales
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
        ),
      [permisosGlobales]
    );


  /**
   * ============================================================
   * PERMISOS ASIGNADOS VÁLIDOS
   *
   * Solo contamos permisos que existen realmente en el catálogo.
   * Así evitamos coberturas superiores al 100%.
   * ============================================================
   */

  const permisosAsignados =
    useMemo(() => {

      let total = 0;


      Object.entries(
        permisosGlobales
      ).forEach(
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


          actuales.forEach(
            (permiso) => {

              if (
                disponibles.includes(
                  permiso
                )
              ) {
                total += 1;
              }

            }
          );

        }
      );


      return total;

    }, [
      permisosGlobales,
      permisosEmpleado,
    ]);


  const porcentajeAsignado =
    totalPermisos > 0
      ? Math.min(
          100,
          Math.round(
            (
              permisosAsignados /
              totalPermisos
            ) *
              100
          )
        )
      : 0;


  /**
   * ============================================================
   * TOGGLE MÓDULO
   * ============================================================
   */

  const toggleModulo =
    useCallback(
      (modulo) => {

        setModulosAbiertos(
          (actual) => {

            const siguiente =
              new Set(actual);

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
        );

      },
      []
    );


  /**
   * ============================================================
   * CAMBIAR PERMISO
   * ============================================================
   */

  const cambiarPermiso =
    useCallback(
      async (
        modulo,
        permiso
      ) => {

        if (
          !empleadoId ||
          typeof modulo !==
            "string" ||
          typeof permiso !==
            "string"
        ) {
          return;
        }


        const nuevo = {
          ...(permisosEmpleado || {}),
        };


        const actuales =
          arraySeguro(
            nuevo[modulo]
          );


        nuevo[modulo] =
          actuales.includes(
            permiso
          )
            ? actuales.filter(
                (item) =>
                  item !==
                  permiso
              )
            : [
                ...actuales,
                permiso,
              ];


        try {

          setProcesando(true);

          await asignarPermisos(
            empleadoId,
            nuevo
          );

          if (
            typeof cargarFicha ===
            "function"
          ) {
            await cargarFicha(
              empleadoId
            );
          }

        } catch (error) {

          console.error(
            "Error asignando permiso:",
            error
          );

        } finally {

          setProcesando(false);

        }

      },
      [
        empleadoId,
        permisosEmpleado,
        asignarPermisos,
        cargarFicha,
      ]
    );


  /**
   * ============================================================
   * CAMBIAR TODOS
   * ============================================================
   */

  const cambiarTodosModulo =
    useCallback(
      async (
        modulo
      ) => {

        if (
          !empleadoId ||
          typeof modulo !==
            "string"
        ) {
          return;
        }


        const disponibles =
          arraySeguro(
            permisosGlobales[
              modulo
            ]
          );


        if (
          disponibles.length === 0
        ) {
          return;
        }


        const actuales =
          arraySeguro(
            permisosEmpleado[
              modulo
            ]
          );


        const todosActivos =
          disponibles.every(
            (permiso) =>
              actuales.includes(
                permiso
              )
          );


        const nuevo = {
          ...(permisosEmpleado || {}),
        };


        nuevo[modulo] =
          todosActivos
            ? []
            : [...disponibles];


        try {

          setProcesando(true);

          await asignarPermisos(
            empleadoId,
            nuevo
          );

          if (
            typeof cargarFicha ===
            "function"
          ) {
            await cargarFicha(
              empleadoId
            );
          }

        } catch (error) {

          console.error(
            "Error actualizando permisos del módulo:",
            error
          );

        } finally {

          setProcesando(false);

        }

      },
      [
        empleadoId,
        permisosEmpleado,
        permisosGlobales,
        asignarPermisos,
        cargarFicha,
      ]
    );


  /**
   * ============================================================
   * SIN FICHA
   * ============================================================
   */

  if (
    !ficha ||
    typeof ficha !== "object"
  ) {
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
        <div className="text-3xl">
          🔑
        </div>

        <p
          className="
            mt-3
            font-semibold
            text-[var(--erp-text)]
          "
        >
          Selecciona un empleado
        </p>

        <p
          className="
            mt-1
            text-sm
            text-[var(--erp-text-soft)]
          "
        >
          La configuración de permisos aparecerá aquí.
        </p>

      </div>
    );
  }


  return (
    <div
      className="seguridad-subpagina-premium seguridad-permisos-premium w-full space-y-4"
    >

      {/* CABECERA */}

      <div className="molsan-page-header">

        <div className="molsan-page-header__identity">

          <div className="molsan-page-header__mark">
            🔑
          </div>

          <div>

            <p className="molsan-page-header__eyebrow">SEGURIDAD · ADMINISTRACIÓN</p>

            <h2 className="molsan-page-header__title">Permisos por módulo</h2>

            <p className="molsan-page-header__description">{empleado?.nombre || "Empleado"}</p>

          </div>

        </div>


        <Chip tone="primary">
          {porcentajeAsignado}% cobertura
        </Chip>

      </div>


      {/* RESUMEN */}

      <div
        className="
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >

        <div
          className="
            rounded-2xl
            border
            border-[var(--erp-border)]
            bg-[var(--erp-surface)]
            p-4
            shadow-sm
          "
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--erp-text-soft)]">
            Módulos
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--erp-text)]">
            {modulos.length}
          </p>
          <p className="text-xs text-[var(--erp-text-soft)]">
            catálogo completo
          </p>
        </div>


        <div
          className="
            rounded-2xl
            border
            border-blue-200
            bg-blue-50
            p-4
          "
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
            Disponibles
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {totalPermisos}
          </p>
          <p className="text-xs text-blue-600">
            permisos del catálogo
          </p>
        </div>


        <div
          className="
            rounded-2xl
            border
            border-emerald-200
            bg-emerald-50
            p-4
          "
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
            Asignados
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {permisosAsignados}
          </p>
          <p className="text-xs text-emerald-600">
            permisos válidos
          </p>
        </div>


        <div
          className="
            rounded-2xl
            border
            border-purple-200
            bg-purple-50
            p-4
          "
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
            Cobertura
          </p>

          <div className="mt-1 flex items-center justify-between">
            <p className="text-2xl font-bold text-purple-700">
              {porcentajeAsignado}%
            </p>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-purple-100">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{
                width: `${porcentajeAsignado}%`,
              }}
            />
          </div>

        </div>

      </div>


      {/* FILTROS */}

      <div
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
            flex
            flex-col
            gap-3
          "
        >

          <input
            type="text"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            placeholder="Buscar módulo o permiso..."
            className="
              block
              h-11
              w-full
              min-w-0
              rounded-xl
              border
              border-slate-300
              bg-white
              px-4
              py-2.5
              text-sm
              text-slate-800
              shadow-sm
              outline-none
              placeholder:text-slate-500
              focus:border-[var(--erp-primary)]
              focus:ring-2
              focus:ring-[var(--erp-primary-soft)]
            "
          />


          <select
            value={moduloSeleccionado}
            onChange={(event) =>
              setModuloSeleccionado(
                event.target.value
              )
            }
            className="
              w-full
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-bg)]
              px-4
              py-2.5
              text-sm
              text-[var(--erp-text)]
              outline-none
              lg:w-64
            "
          >

            <option value="todos">
              Todos los módulos
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


          {(busqueda ||
            moduloSeleccionado !==
              "todos") && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setModuloSeleccionado(
                  "todos"
                );
              }}
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                px-4
                py-2.5
                text-sm
                font-semibold
                text-[var(--erp-text-soft)]
                hover:text-[var(--erp-primary)]
              "
            >
              Limpiar
            </button>
          )}

        </div>

      </div>


      {/* CONFIGURACIÓN */}

      <div
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

          <h3
            className="
              text-base
              font-semibold
              text-[var(--erp-text)]
            "
          >
            Configuración de permisos
          </h3>

          <p
            className="
              mt-0.5
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Abre únicamente el módulo que quieras editar.
          </p>

        </div>


        {modulosFiltrados.length ===
          0 ? (
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
            No se han encontrado módulos o permisos.
          </div>
        ) : (
          <div className="space-y-2">

            {modulosFiltrados.map(
              (modulo) => {

                const disponibles =
                  arraySeguro(
                    permisosGlobales[
                      modulo
                    ]
                  );

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

                const completo =
                  disponibles.length >
                    0 &&
                  activos ===
                    disponibles.length;

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
                      bg-[var(--erp-bg)]
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        px-4
                        py-3
                      "
                    >

                      <button
                        type="button"
                        onClick={() =>
                          toggleModulo(
                            modulo
                          )
                        }
                        className="
                          flex
                          min-w-0
                          flex-1
                          items-center
                          gap-3
                          text-left
                        "
                      >

                        <span
                          className={`
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            text-sm
                            font-bold
                            ${
                              completo
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-[var(--erp-primary-soft)] text-[var(--erp-primary)]"
                            }
                          `}
                        >
                          {completo
                            ? "✓"
                            : "🔑"}
                        </span>


                        <span className="min-w-0">

                          <span
                            className="
                              block
                              truncate
                              text-sm
                              font-semibold
                              text-[var(--erp-text)]
                            "
                          >
                            {ETIQUETAS_MODULOS[modulo] || modulo}
                          </span>

                          <span
                            className="
                              block
                              text-xs
                              text-[var(--erp-text-soft)]
                            "
                          >
                            {activos} de{" "}
                            {disponibles.length}{" "}
                            permisos activos
                          </span>

                        </span>

                      </button>


                      <div
                        className="
                          flex
                          shrink-0
                          items-center
                          gap-2
                        "
                      >

                        {completo && (
                          <Chip tone="success">
                            Completo
                          </Chip>
                        )}


                        {disponibles.length >
                          0 && (
                          <button
                            type="button"
                            disabled={
                              procesando
                            }
                            onClick={() =>
                              cambiarTodosModulo(
                                modulo
                              )
                            }
                            className="
                              hidden
                              rounded-lg
                              border
                              border-[var(--erp-border)]
                              bg-[var(--erp-surface)]
                              px-2.5
                              py-1.5
                              text-[11px]
                              font-semibold
                              text-[var(--erp-text-soft)]
                              hover:text-[var(--erp-primary)]
                              disabled:opacity-40
                              sm:inline-flex
                            "
                          >
                            {completo
                              ? "Desactivar todos"
                              : "Activar todos"}
                          </button>
                        )}


                        <span
                          className="
                            text-xs
                            text-[var(--erp-text-soft)]
                          "
                        >
                          {abierto
                            ? "▲"
                            : "▼"}
                        </span>

                      </div>

                    </div>


                    {abierto && (
                      <div
                        className="
                          border-t
                          border-[var(--erp-border)]
                          p-3
                        "
                      >

                        {disponibles.length ===
                        0 ? (
                          <div
                            className="
                              rounded-lg
                              border
                              border-dashed
                              border-[var(--erp-border)]
                              p-4
                              text-center
                              text-xs
                              text-[var(--erp-text-soft)]
                            "
                          >
                            Este módulo no tiene permisos definidos en el catálogo global.
                          </div>
                        ) : (
                          <div
                            className="
                              grid
                              grid-cols-1
                              gap-2
                              sm:grid-cols-2
                              lg:grid-cols-4
                            "
                          >

                            {disponibles.map(
                              (permiso) => {

                                const activo =
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
                                      gap-3
                                      rounded-lg
                                      border
                                      px-3
                                      py-2.5
                                      transition
                                      ${
                                        activo
                                          ? "border-emerald-200 bg-emerald-50"
                                          : "border-[var(--erp-border)] bg-[var(--erp-surface)] hover:bg-[var(--erp-bg)]"
                                      }
                                    `}
                                  >

                                    <input
                                      type="checkbox"
                                      checked={
                                        activo
                                      }
                                      disabled={
                                        procesando
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
                                        accent-emerald-500
                                      "
                                    />

                                    <span
                                      className={`
                                        truncate
                                        text-sm
                                        font-medium
                                        ${
                                          activo
                                            ? "text-emerald-700"
                                            : "text-[var(--erp-text)]"
                                        }
                                      `}
                                    >
                                      {permiso}
                                    </span>

                                  </label>
                                );

                              }
                            )}

                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );

              }
            )}

          </div>
        )}

      </div>

    </div>
  );
}
