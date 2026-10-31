import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import {
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";


/**
 * ============================================================
 * SEGURIDAD ROLES
 * ============================================================
 *
 * - No realiza cargarTodo()
 * - Consume exclusivamente el estado del hook
 * - Diseño claro ERP
 * - Roles en acordeón
 * - Mantiene búsqueda y ordenación
 *
 * ============================================================
 */


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


function numeroSeguro(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}


function estadoRol(rol) {
  const activo =
    rol?.activo !== false &&
    rol?.habilitado !== false;

  return activo
    ? {
        texto: "Activo",

      }
    : {
        texto: "Inactivo",

      };
}


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


function TarjetaMetrica({
  titulo,
  valor,
  descripcion,
  icono,
}) {

  return (
    <div
      className="p-4"
    >

      <div
        className="flex
 items-center
 justify-between
 gap-3"
      >

        <div className="min-w-0">

          <p
            className="uppercase"
          >
            {titulo}
          </p>

          <p
            className="mt-1"
          >
            {valor}
          </p>

          <p
            className="mt-0.5"
          >
            {descripcion}
          </p>

        </div>


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

      </div>

    </div>
  );
}


export default function SeguridadRoles() {

  const {
    roles = [],
    empleados = [],
    permisos = [],
  } = useSeguridad();


  const [busqueda, setBusqueda] =
    useState("");


  const [orden, setOrden] =
    useState({
      campo: "nombre",
      asc: true,
    });


  const [rolAbierto, setRolAbierto] =
    useState(null);


  /**
   * ============================================================
   * DATOS SEGUROS
   * ============================================================
   */

  const rolesSeguros = useMemo(
    () =>
      arraySeguro(roles).filter(
        (rol) =>
          rol &&
          typeof rol === "object" &&
          typeof rol.id !== "undefined"
      ),
    [roles]
  );


  const empleadosSeguros = useMemo(
    () =>
      arraySeguro(empleados).filter(
        (empleado) =>
          empleado &&
          typeof empleado === "object"
      ),
    [empleados]
  );


  const permisosSeguros = useMemo(
    () =>
      arraySeguro(permisos).filter(
        (permiso) =>
          permiso &&
          typeof permiso === "object" &&
          typeof permiso.modulo === "string" &&
          typeof permiso.permiso === "string"
      ),
    [permisos]
  );


  /**
   * ============================================================
   * EMPLEADOS POR ROL
   * ============================================================
   */

  const empleadosPorRol = useMemo(() => {

    const mapa = {};

    empleadosSeguros.forEach(
      (empleado) => {

        const rol =
          empleado.rol &&
          typeof empleado.rol === "object"
            ? empleado.rol
            : null;

        const rolId =
          empleado.rol_id ??
          empleado.id_rol ??
          rol?.id ??
          null;

        if (
          rolId === null ||
          typeof rolId === "undefined"
        ) {
          return;
        }

        const clave =
          String(rolId);

        if (!mapa[clave]) {
          mapa[clave] = [];
        }

        mapa[clave].push(
          empleado
        );

      }
    );

    return mapa;

  }, [empleadosSeguros]);


  /**
   * ============================================================
   * PERMISOS POR MÓDULO
   * ============================================================
   */

  const permisosPorModulo = useMemo(() => {

    const mapa = {};

    permisosSeguros.forEach(
      (permiso) => {

        const modulo =
          permiso.modulo.trim();

        const nombre =
          permiso.permiso.trim();

        if (
          !modulo ||
          !nombre
        ) {
          return;
        }

        if (!mapa[modulo]) {
          mapa[modulo] = [];
        }

        if (
          !mapa[modulo].includes(nombre)
        ) {
          mapa[modulo].push(nombre);
        }

      }
    );

    return mapa;

  }, [permisosSeguros]);


  /**
   * ============================================================
   * ROLES ENRIQUECIDOS
   * ============================================================
   */

  const rolesEnriquecidos = useMemo(
    () =>
      rolesSeguros.map(
        (rol) => {

          const usuarios =
            empleadosPorRol[
              String(rol.id)
            ] || [];


          const permisosRol =
            Array.isArray(
              rol.permisos
            )
              ? rol.permisos
              : Array.isArray(
                  rol.permisos_ids
                )
                ? rol.permisos_ids
                : [];


          const modulosRol =
            Array.isArray(
              rol.modulos
            )
              ? rol.modulos
              : Array.isArray(
                  rol.modulos_visibles
                )
                ? rol.modulos_visibles
                : [];


          const usuariosCount =
            Number.isFinite(
              Number(
                rol.usuarios_count
              )
            )
              ? Number(
                  rol.usuarios_count
                )
              : usuarios.length;


          const permisosCount =
            Number.isFinite(
              Number(
                rol.permisos_count
              )
            )
              ? Number(
                  rol.permisos_count
                )
              : permisosRol.length;


          const modulosCount =
            Number.isFinite(
              Number(
                rol.modulos_count
              )
            )
              ? Number(
                  rol.modulos_count
                )
              : modulosRol.length;


          return {
            ...rol,
            usuarios,
            usuariosCount,
            permisosCount,
            modulosCount,
            permisosRol,
            modulosRol,
          };

        }
      ),
    [
      rolesSeguros,
      empleadosPorRol,
    ]
  );


  /**
   * ============================================================
   * FILTRAR
   * ============================================================
   */

  const rolesFiltrados = useMemo(() => {

    const texto =
      busqueda
        .trim()
        .toLowerCase();

    if (!texto) {
      return rolesEnriquecidos;
    }

    return rolesEnriquecidos.filter(
      (rol) => {

        const contenido = [
          rol.id,
          rol.nombre,
          rol.descripcion,
          rol.codigo,
        ]
          .map(
            (valor) =>
              textoSeguro(valor)
                .toLowerCase()
          )
          .join(" ");

        return contenido.includes(
          texto
        );

      }
    );

  }, [
    rolesEnriquecidos,
    busqueda,
  ]);


  /**
   * ============================================================
   * ORDENAR
   * ============================================================
   */

  const rolesOrdenados = useMemo(() => {

    const copia =
      [...rolesFiltrados];

    const {
      campo,
      asc,
    } = orden;

    const direccion =
      asc ? 1 : -1;

    return copia.sort(
      (a, b) => {

        const va =
          a?.[campo];

        const vb =
          b?.[campo];

        if (
          typeof va === "number" &&
          typeof vb === "number"
        ) {
          return (
            (va - vb) *
            direccion
          );
        }

        const sa =
          textoSeguro(va)
            .toLowerCase();

        const sb =
          textoSeguro(vb)
            .toLowerCase();

        return (
          sa.localeCompare(
            sb,
            "es",
            {
              sensitivity: "base",
            }
          ) *
          direccion
        );

      }
    );

  }, [
    rolesFiltrados,
    orden,
  ]);


  /**
   * ============================================================
   * ESTADÍSTICAS
   * ============================================================
   */

  const estadisticas = useMemo(() => {

    const total =
      rolesEnriquecidos.length;

    const activos =
      rolesEnriquecidos.filter(
        (rol) =>
          rol.activo !== false &&
          rol.habilitado !== false
      ).length;

    const usuariosAsignados =
      rolesEnriquecidos.reduce(
        (
          acumulado,
          rol
        ) =>
          acumulado +
          numeroSeguro(
            rol.usuariosCount
          ),
        0
      );

    const rolesConPermisos =
      rolesEnriquecidos.filter(
        (rol) =>
          numeroSeguro(
            rol.permisosCount
          ) > 0
      ).length;

    return {
      total,
      activos,
      usuariosAsignados,
      rolesConPermisos,
    };

  }, [
    rolesEnriquecidos,
  ]);


  /**
   * ============================================================
   * TOGGLE ORDEN
   * ============================================================
   */

  const cambiarOrden =
    (campo) => {

      setOrden(
        (actual) => ({
          campo,
          asc:
            actual.campo === campo
              ? !actual.asc
              : true,
        })
      );

    };


  /**
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      className="erp-page w-full space-y-4"
    >

      <MolsanPageHeader mark="SE" title="Roles de seguridad" description="Perfiles y niveles de acceso." />
      <div className="flex justify-end"><Chip tone="primary">{estadisticas.total} roles</Chip></div>

      {/* KPIS */}

      <div
        className="grid
 grid-cols-1
 gap-3
 sm:grid-cols-2
 xl:grid-cols-4"
      >

        <TarjetaMetrica
          titulo="Total"
          valor={estadisticas.total}
          descripcion="Perfiles definidos"
          icono="🛡️"
        />

        <TarjetaMetrica
          titulo="Activos"
          valor={estadisticas.activos}
          descripcion="Disponibles para uso"
          icono="🟢"
        />

        <TarjetaMetrica
          titulo="Usuarios"
          valor={estadisticas.usuariosAsignados}
          descripcion="Usuarios asignados"
          icono="👤"
        />

        <TarjetaMetrica
          titulo="Con permisos"
          valor={estadisticas.rolesConPermisos}
          descripcion="Con configuración"
          icono="🔐"
        />

      </div>


      {/* FILTROS */}

      <div
        className="p-4"
      >

        <div
          className="flex
 flex-col
 gap-3
 lg:flex-row
 lg:items-center"
        >

          <input
            type="text"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
            placeholder="Buscar rol..."
            className="min-w-0
 flex-1
 
 
 
 
 px-4
 py-2.5"
          />


          <div
            className="flex
 flex-wrap
 gap-2"
          >

            <button
              type="button"
              onClick={() =>
                cambiarOrden("nombre")
              }
              className="px-3
 py-2.5"
            >
              Nombre{" "}
              {orden.campo === "nombre"
                ? orden.asc
                  ? "↑"
                  : "↓"
                : ""}
            </button>


            <button
              type="button"
              onClick={() =>
                cambiarOrden(
                  "usuariosCount"
                )
              }
              className="px-3
 py-2.5"
            >
              Usuarios{" "}
              {orden.campo ===
                "usuariosCount"
                ? orden.asc
                  ? "↑"
                  : "↓"
                : ""}
            </button>

          </div>

        </div>

      </div>


      {/* ROLES */}

      <div className="space-y-3">

        {rolesOrdenados.map(
          (rol) => {

            const abierto =
              String(
                rolAbierto
              ) ===
              String(
                rol.id
              );

            const estado =
              estadoRol(rol);


            return (
              <section
                key={String(rol.id)}
                className="overflow-hidden"
              >

                {/* CABECERA */}

                <button
                  type="button"
                  onClick={() =>
                    setRolAbierto(
                      abierto
                        ? null
                        : rol.id
                    )
                  }
                  className="flex
 w-full
 items-center
 justify-between
 gap-4
 px-4
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
                      🛡️
                    </div>


                    <div
                      className="min-w-0"
                    >

                      <div
                        className="flex
 flex-wrap
 items-center
 gap-2"
                      >

                        <h3
                          className="truncate"
                        >
                          {textoSeguro(
                            rol.nombre
                          ) ||
                            "Rol sin nombre"}
                        </h3>

                        <Chip
                          tone={
                            rol.activo !== false &&
                            rol.habilitado !== false
                              ? "success"
                              : "neutral"
                          }
                        >
                          {estado.texto}
                        </Chip>

                      </div>


                      <p
                        className="mt-1
 truncate"
                      >
                        {textoSeguro(
                          rol.descripcion
                        ) ||
                          textoSeguro(
                            rol.codigo
                          ) ||
                          `ID #${rol.id}`}
                      </p>

                    </div>

                  </div>


                  <div
                    className="flex
 shrink-0
 items-center
 gap-2"
                  >

                    <span className="hidden sm:inline-flex">
                      <Chip>
                        {rol.usuariosCount} usuarios
                      </Chip>
                    </span>

                    <Chip>
                      {rol.modulosCount} módulos
                    </Chip>

                    <Chip>
                      {rol.permisosCount} permisos
                    </Chip>

                    <span
                      className="ml-1"
                    >
                      {abierto ? "▲" : "▼"}
                    </span>

                  </div>

                </button>


                {/* DETALLE */}

                {abierto && (
                  <div
                    className="p-4"
                  >

                    <div
                      className="grid
 grid-cols-1
 gap-3
 md:grid-cols-3"
                    >

                      <TarjetaMetrica
                        titulo="Usuarios"
                        valor={
                          rol.usuariosCount
                        }
                        descripcion="Asignados al rol"
                        icono="👤"
                      />

                      <TarjetaMetrica
                        titulo="Módulos"
                        valor={
                          rol.modulosCount
                        }
                        descripcion="Áreas disponibles"
                        icono="📦"
                      />

                      <TarjetaMetrica
                        titulo="Permisos"
                        valor={
                          rol.permisosCount
                        }
                        descripcion="Autorizaciones"
                        icono="🔐"
                      />

                    </div>


                    <div
                      className="mt-4
 grid
 grid-cols-1
 gap-4
 lg:grid-cols-2"
                    >

                      {/* USUARIOS */}

                      <div
                        className="p-4"
                      >

                        <div
                          className="flex
 items-center
 justify-between
 gap-3"
                        >

                          <div>

                            <h4
                             
                            >
                              👥 Usuarios asignados
                            </h4>

                            <p
                              className="mt-0.5"
                            >
                              Empleados vinculados a este rol.
                            </p>

                          </div>

                          <Chip>
                            {rol.usuariosCount}
                          </Chip>

                        </div>


                        <div className="mt-3 space-y-2">

                          {rol.usuarios
                            .slice(0, 8)
                            .map(
                              (empleado) => (
                                <div
                                  key={String(
                                    empleado.id
                                  )}
                                  className="flex
 items-center
 justify-between
 gap-3
 
 
 
 
 px-3
 py-2.5"
                                >

                                  <div className="min-w-0">

                                    <p
                                      className="truncate"
                                    >
                                      {textoSeguro(
                                        empleado.nombre
                                      ) ||
                                        `Empleado #${empleado.id}`}
                                    </p>

                                    <p
                                      className="truncate"
                                    >
                                      {textoSeguro(
                                        empleado.usuario
                                      ) ||
                                        `ID ${empleado.id}`}
                                    </p>

                                  </div>

                                  <span
                                    className={`h-2
 w-2
 shrink-0
 
 ${
 empleado.activo
 ? ""
 : ""
 }`}
                                  />

                                </div>
                              )
                            )}


                          {rol.usuarios.length ===
                            0 && (
                            <div
                              className="p-4"
                            >
                              No hay usuarios vinculados.
                            </div>
                          )}


                          {rol.usuarios.length >
                            8 && (
                            <p
                             
                            >
                              Mostrando los primeros 8 usuarios.
                            </p>
                          )}

                        </div>

                      </div>


                      {/* CONFIGURACIÓN */}

                      <div
                        className="p-4"
                      >

                        <h4
                         
                        >
                          🔐 Configuración del rol
                        </h4>

                        <p
                          className="mt-0.5"
                        >
                          Módulos y permisos asociados.
                        </p>


                        <div className="mt-4">

                          <p
                            className="mb-2
 
 
 uppercase"
                          >
                            Módulos
                          </p>

                          <div
                            className="flex
 flex-wrap
 gap-2"
                          >

                            {rol.modulosRol
                              .slice(0, 20)
                              .map(
                                (modulo, index) => (
                                  <Chip
                                    key={`${modulo}-${index}`}
                                    tone="primary"
                                  >
                                    {String(
                                      modulo
                                    )}
                                  </Chip>
                                )
                              )}

                            {rol.modulosRol.length ===
                              0 && (
                              <span
                               
                              >
                                Sin módulos específicos.
                              </span>
                            )}

                          </div>

                        </div>


                        <div className="mt-4">

                          <p
                            className="mb-2
 
 
 uppercase"
                          >
                            Permisos
                          </p>

                          <div
                            className="flex
 flex-wrap
 gap-2"
                          >

                            {rol.permisosRol
                              .slice(0, 20)
                              .map(
                                (permiso, index) => (
                                  <Chip
                                    key={`${permiso}-${index}`}
                                    tone="purple"
                                  >
                                    {String(
                                      permiso
                                    )}
                                  </Chip>
                                )
                              )}

                            {rol.permisosRol.length ===
                              0 && (
                              <span
                               
                              >
                                Sin permisos específicos.
                              </span>
                            )}

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>
                )}

              </section>
            );

          }
        )}


        {rolesOrdenados.length === 0 && (
          <div
            className="p-10"
          >

            <div>
              🛡️
            </div>

            <p
              className="mt-3"
            >
              No hay roles
            </p>

            <p
              className="mt-1"
            >
              No se han encontrado perfiles que coincidan con la búsqueda.
            </p>

          </div>
        )}

      </div>

    </div>
  );
}
