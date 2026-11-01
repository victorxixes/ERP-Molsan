import {
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import MolsanIcon from "../../components/ui/MolsanIcon";
import "./SeguridadSubpaginasPremium.css";


/**
 * ============================================================
 * SEGURIDAD ROLES — MOLSAN ERP SAAS PREMIUM 2027
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
        clase:
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        punto: "bg-emerald-500",
      }
    : {
        texto: "Inactivo",
        clase:
          "border-red-200 bg-red-50 text-red-700",
        punto: "bg-red-500",
      };
}


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


function TarjetaMetrica({
  titulo,
  valor,
  descripcion,
  icono,
}) {

  return (
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
          items-center
          justify-between
          gap-3
        "
      >

        <div className="min-w-0">

          <p
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.08em]
              text-[var(--erp-text-soft)]
            "
          >
            {titulo}
          </p>

          <p
            className="
              mt-1
              text-2xl
              font-bold
              tracking-tight
              text-[var(--erp-text)]
            "
          >
            {valor}
          </p>

          <p
            className="
              mt-0.5
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            {descripcion}
          </p>

        </div>


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
          <MolsanIcon name={icono} size={34} />
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
      className="seguridad-subpagina-premium seguridad-roles-premium w-full space-y-4"
    >

      {/* CABECERA */}

      <div className="molsan-page-header">

        <div className="molsan-page-header__identity">

          <div className="molsan-page-header__mark">
            <MolsanIcon name="shield" size={42} bare />
          </div>

          <div>

            <p className="molsan-page-header__eyebrow">SEGURIDAD · ADMINISTRACIÓN</p>
            <h2 className="molsan-page-header__title">Roles de seguridad</h2>

            <p className="molsan-page-header__description">Perfiles y niveles de acceso.</p>

          </div>

        </div>


        <Chip tone="primary">
          {estadisticas.total} roles
        </Chip>

      </div>


      {/* KPIS */}

      <div
        className="
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
          xl:grid-cols-4
        "
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
            lg:flex-row
            lg:items-center
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
            placeholder="Buscar rol..."
            className="
              min-w-0
              flex-1
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-bg)]
              px-4
              py-2.5
              text-sm
              text-[var(--erp-text)]
              outline-none
              placeholder:text-[var(--erp-text-soft)]
              focus:border-[var(--erp-primary)]
              focus:ring-2
              focus:ring-[var(--erp-primary-soft)]
            "
          />


          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >

            <button
              type="button"
              onClick={() =>
                cambiarOrden("nombre")
              }
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                px-3
                py-2.5
                text-xs
                font-semibold
                text-[var(--erp-text-soft)]
                hover:text-[var(--erp-primary)]
              "
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
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-bg)]
                px-3
                py-2.5
                text-xs
                font-semibold
                text-[var(--erp-text-soft)]
                hover:text-[var(--erp-primary)]
              "
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
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface)]
                  shadow-sm
                "
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
                  className="
                    flex
                    w-full
                    items-center
                    justify-between
                    gap-4
                    px-4
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
                      <MolsanIcon name="shield" size={42} />
                    </div>


                    <div
                      className="
                        min-w-0
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

                        <h3
                          className="
                            truncate
                            font-semibold
                            text-[var(--erp-text)]
                          "
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
                          <span
                            className={`
                              mr-1.5
                              h-1.5
                              w-1.5
                              rounded-full
                              ${estado.punto}
                            `}
                          />
                          {estado.texto}
                        </Chip>

                      </div>


                      <p
                        className="
                          mt-1
                          truncate
                          text-xs
                          text-[var(--erp-text-soft)]
                        "
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
                    className="
                      flex
                      shrink-0
                      items-center
                      gap-2
                    "
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
                      className="
                        ml-1
                        text-sm
                        text-[var(--erp-text-soft)]
                      "
                    >
                      {abierto ? "▲" : "▼"}
                    </span>

                  </div>

                </button>


                {/* DETALLE */}

                {abierto && (
                  <div
                    className="
                      border-t
                      border-[var(--erp-border)]
                      bg-[var(--erp-bg)]
                      p-4
                    "
                  >

                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-3
                        md:grid-cols-3
                      "
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
                      className="
                        mt-4
                        grid
                        grid-cols-1
                        gap-4
                        lg:grid-cols-2
                      "
                    >

                      {/* USUARIOS */}

                      <div
                        className="
                          rounded-2xl
                          border
                          border-[var(--erp-border)]
                          bg-[var(--erp-surface)]
                          p-4
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

                            <h4
                              className="
                                font-semibold
                                text-[var(--erp-text)]
                              "
                            >
                              👥 Usuarios asignados
                            </h4>

                            <p
                              className="
                                mt-0.5
                                text-xs
                                text-[var(--erp-text-soft)]
                              "
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
                                  className="
                                    flex
                                    items-center
                                    justify-between
                                    gap-3
                                    rounded-xl
                                    border
                                    border-[var(--erp-border)]
                                    bg-[var(--erp-bg)]
                                    px-3
                                    py-2.5
                                  "
                                >

                                  <div className="min-w-0">

                                    <p
                                      className="
                                        truncate
                                        text-sm
                                        font-medium
                                        text-[var(--erp-text)]
                                      "
                                    >
                                      {textoSeguro(
                                        empleado.nombre
                                      ) ||
                                        `Empleado #${empleado.id}`}
                                    </p>

                                    <p
                                      className="
                                        truncate
                                        text-xs
                                        text-[var(--erp-text-soft)]
                                      "
                                    >
                                      {textoSeguro(
                                        empleado.usuario
                                      ) ||
                                        `ID ${empleado.id}`}
                                    </p>

                                  </div>

                                  <span
                                    className={`
                                      h-2
                                      w-2
                                      shrink-0
                                      rounded-full
                                      ${
                                        empleado.activo
                                          ? "bg-emerald-500"
                                          : "bg-red-500"
                                      }
                                    `}
                                  />

                                </div>
                              )
                            )}


                          {rol.usuarios.length ===
                            0 && (
                            <div
                              className="
                                rounded-xl
                                border
                                border-dashed
                                border-[var(--erp-border)]
                                p-4
                                text-center
                                text-xs
                                text-[var(--erp-text-soft)]
                              "
                            >
                              No hay usuarios vinculados.
                            </div>
                          )}


                          {rol.usuarios.length >
                            8 && (
                            <p
                              className="
                                text-xs
                                text-[var(--erp-text-soft)]
                              "
                            >
                              Mostrando los primeros 8 usuarios.
                            </p>
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
                        "
                      >

                        <h4
                          className="
                            font-semibold
                            text-[var(--erp-text)]
                          "
                        >
                          <MolsanIcon name="lock" size={20} /> Configuración del rol
                        </h4>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            text-[var(--erp-text-soft)]
                          "
                        >
                          Módulos y permisos asociados.
                        </p>


                        <div className="mt-4">

                          <p
                            className="
                              mb-2
                              text-xs
                              font-semibold
                              uppercase
                              tracking-wide
                              text-[var(--erp-text-soft)]
                            "
                          >
                            Módulos
                          </p>

                          <div
                            className="
                              flex
                              flex-wrap
                              gap-2
                            "
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
                                className="
                                  text-xs
                                  text-[var(--erp-text-soft)]
                                "
                              >
                                Sin módulos específicos.
                              </span>
                            )}

                          </div>

                        </div>


                        <div className="mt-4">

                          <p
                            className="
                              mb-2
                              text-xs
                              font-semibold
                              uppercase
                              tracking-wide
                              text-[var(--erp-text-soft)]
                            "
                          >
                            Permisos
                          </p>

                          <div
                            className="
                              flex
                              flex-wrap
                              gap-2
                            "
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
                                className="
                                  text-xs
                                  text-[var(--erp-text-soft)]
                                "
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
            className="
              rounded-2xl
              border
              border-dashed
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              p-10
              text-center
            "
          >

            <div className="text-3xl">
              🛡️
            </div>

            <p
              className="
                mt-3
                font-semibold
                text-[var(--erp-text)]
              "
            >
              No hay roles
            </p>

            <p
              className="
                mt-1
                text-sm
                text-[var(--erp-text-soft)]
              "
            >
              No se han encontrado perfiles que coincidan con la búsqueda.
            </p>

          </div>
        )}

      </div>

    </div>
  );
}
