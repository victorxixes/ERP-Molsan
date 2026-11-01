import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import MODULOS_ERP from "../../config/modulos";


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
        className="p-10"
      >
        <div>
          🔑
        </div>

        <p
          className="mt-3"
        >
          Selecciona un empleado
        </p>

        <p
          className="mt-1"
        >
          La configuración de permisos aparecerá aquí.
        </p>

      </div>
    );
  }


  return (
    <div
      className="erp-page w-full space-y-4"
    >

      <MolsanPageHeader
        mark="SE"
        title="Permisos por módulo"
        description={empleado?.nombre || "Empleado"}
      />
      <div className="flex justify-end"><Chip tone="primary">{porcentajeAsignado}% cobertura</Chip></div>

      {/* RESUMEN */}

      <div
        className="grid
 grid-cols-1
 gap-3
 sm:grid-cols-2
 xl:grid-cols-4"
      >

        <div
          className="p-4"
        >
          <p className="uppercase">
            Módulos
          </p>
          <p className="mt-1">
            {modulos.length}
          </p>
          <p>
            catálogo completo
          </p>
        </div>


        <div
          className="p-4"
        >
          <p className="uppercase">
            Disponibles
          </p>
          <p className="mt-1">
            {totalPermisos}
          </p>
          <p>
            permisos del catálogo
          </p>
        </div>


        <div
          className="p-4"
        >
          <p className="uppercase">
            Asignados
          </p>
          <p className="mt-1">
            {permisosAsignados}
          </p>
          <p>
            permisos válidos
          </p>
        </div>


        <div
          className="p-4"
        >
          <p className="uppercase">
            Cobertura
          </p>

          <div className="mt-1 flex items-center justify-between">
            <p>
              {porcentajeAsignado}%
            </p>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${porcentajeAsignado}%` }}
            />
          </div>

        </div>

      </div>


      {/* FILTROS */}

      <div
        className="p-4"
      >

        <div
          className="flex
 flex-col
 gap-3"
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
            className="block
 h-11
 w-full
 min-w-0
 
 
 
 
 px-4
 py-2.5"
          />


          <select
            value={moduloSeleccionado}
            onChange={(event) =>
              setModuloSeleccionado(
                event.target.value
              )
            }
            className="w-full
 
 
 
 
 px-4
 py-2.5
 
 
 
 lg:w-64"
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
              className="px-4
 py-2.5"
            >
              Limpiar
            </button>
          )}

        </div>

      </div>


      {/* CONFIGURACIÓN */}

      <div
        className="p-4"
      >

        <div className="mb-3">

          <h3
           
          >
            Configuración de permisos
          </h3>

          <p
            className="mt-0.5"
          >
            Abre únicamente el módulo que quieras editar.
          </p>

        </div>


        {modulosFiltrados.length ===
          0 ? (
          <div
            className="p-8"
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
                    className="overflow-hidden"
                  >

                    <div
                      className="flex
 items-center
 justify-between
 gap-3
 px-4
 py-3"
                    >

                      <button
                        type="button"
                        onClick={() =>
                          toggleModulo(
                            modulo
                          )
                        }
                        className="flex
 min-w-0
 flex-1
 items-center
 gap-3"
                      >

                        <span
                          className={`flex
 h-9
 w-9
 shrink-0
 items-center
 justify-center
 
 
 
 ${
 completo
 ? ""
 : ""
 }`}
                        >
                          {completo
                            ? "✓"
                            : "🔑"}
                        </span>


                        <span className="min-w-0">

                          <span
                            className="block
 truncate"
                          >
                            {ETIQUETAS_MODULOS[modulo] || modulo}
                          </span>

                          <span
                            className="block"
                          >
                            {activos} de{" "}
                            {disponibles.length}{" "}
                            permisos activos
                          </span>

                        </span>

                      </button>


                      <div
                        className="flex
 shrink-0
 items-center
 gap-2"
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
                            className="hidden
 
 
 
 
 px-2.5
 py-1.5
 
 
 
 
 
 sm:inline-flex"
                          >
                            {completo
                              ? "Desactivar todos"
                              : "Activar todos"}
                          </button>
                        )}


                        <span
                         
                        >
                          {abierto
                            ? "▲"
                            : "▼"}
                        </span>

                      </div>

                    </div>


                    {abierto && (
                      <div
                        className="p-3"
                      >

                        {disponibles.length ===
                        0 ? (
                          <div
                            className="p-4"
                          >
                            Este módulo no tiene permisos definidos en el catálogo global.
                          </div>
                        ) : (
                          <div
                            className="grid
 grid-cols-1
 gap-2
 sm:grid-cols-2
 lg:grid-cols-4"
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
                                    className={`flex
 
 items-center
 gap-3
 
 
 px-3
 py-2.5
 
 ${
 activo
 ? ""
 : ""
 }`}
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
                                      className="h-4
 w-4"
                                    />

                                    <span
                                      className={`truncate
 
 
 ${
 activo
 ? ""
 : ""
 }`}
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
