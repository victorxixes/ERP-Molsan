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


export default function SeguridadModulos() {

  const {
    permisos = [],
    ficha,
    asignarModulos,
  } = useSeguridad();


  const [busqueda, setBusqueda] =
    useState("");


  const empleado =
    ficha &&
    typeof ficha === "object"
      ? ficha.empleado || {}
      : {};


  /**
   * ============================================================
   * MÓDULOS VISIBLES
   * ============================================================
   */

  const modulosVisibles = useMemo(() => {

    const lista =
      Array.isArray(
        empleado.modulos_visibles_list
      )
        ? empleado.modulos_visibles_list
        : Array.isArray(
            ficha?.modulos_visibles
          )
          ? ficha.modulos_visibles
          : [];


    return lista.filter(
      (modulo) =>
        typeof modulo === "string"
    );

  }, [
    empleado,
    ficha,
  ]);


  /**
   * ============================================================
   * MÓDULOS GLOBALES
   * ============================================================
   */

 const modulosGlobales = useMemo(() => {

  const conjunto = new Set();

  // ----------------------------------------------------------
  // CATÁLOGO CENTRAL DEL ERP
  // ----------------------------------------------------------

  arraySeguro(MODULOS_ERP).forEach((modulo) => {

    if (
      modulo &&
      typeof modulo === "object" &&
      typeof modulo.key === "string"
    ) {
      conjunto.add(
        modulo.key.trim()
      );
    }

  });


  // ----------------------------------------------------------
  // COMPATIBILIDAD CON MÓDULOS ANTIGUOS
  // ----------------------------------------------------------
  //
  // Si existe un módulo en permisos que todavía no está
  // registrado en el catálogo, no lo perdemos.
  //

  arraySeguro(permisos).forEach((permiso) => {

    if (
      permiso &&
      typeof permiso === "object" &&
      typeof permiso.modulo === "string"
    ) {
      conjunto.add(
        permiso.modulo.trim()
      );
    }

  });


  // ----------------------------------------------------------
  // COMPATIBILIDAD CON MÓDULOS YA ASIGNADOS
  // ----------------------------------------------------------

  modulosVisibles.forEach((modulo) => {

    if (
      typeof modulo === "string" &&
      modulo.trim()
    ) {
      conjunto.add(
        modulo.trim()
      );
    }

  });


  return Array.from(conjunto)
    .filter(Boolean)
    .sort(
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
  permisos,
  modulosVisibles,
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


      if (!texto) {
        return modulosGlobales;
      }


      return modulosGlobales.filter(
        (modulo) =>
          modulo
            .toLowerCase()
            .includes(
              texto
            )
      );

    }, [
      modulosGlobales,
      busqueda,
    ]);


  /**
   * ============================================================
   * CAMBIAR MÓDULO
   * ============================================================
   */

  const cambiarModulo =
    useCallback(
      async (modulo) => {

        if (
          typeof modulo !== "string" ||
          !empleado?.id
        ) {
          return;
        }


        const nuevo =
          modulosVisibles.includes(
            modulo
          )
            ? modulosVisibles.filter(
                (item) =>
                  item !== modulo
              )
            : [
                ...modulosVisibles,
                modulo,
              ];


        try {

          await asignarModulos(
            empleado.id,
            nuevo
          );

        } catch (error) {

          console.error(
            "Error asignando módulo:",
            error
          );

        }

      },
      [
        modulosVisibles,
        asignarModulos,
        empleado?.id,
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
          📦
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
          La configuración de módulos aparecerá aquí.
        </p>

      </div>
    );
  }


  return (
    <div
      className="
        w-full
        space-y-4
      "
    >

      {/* CABECERA */}

      <div
        className="
          flex
          flex-col
          gap-4
          rounded-2xl
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          p-5
          shadow-sm
          md:flex-row
          md:items-center
          md:justify-between
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
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-xl
            "
          >
            📦
          </div>

          <div>

            <h2
              className="
                text-xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              Módulos visibles
            </h2>

            <p
              className="
                mt-0.5
                text-sm
                text-[var(--erp-text-soft)]
              "
            >
              Configura los módulos que puede visualizar este empleado.
            </p>

          </div>

        </div>


        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >

          <span
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-blue-200
              bg-blue-50
              px-3
              py-1.5
              text-xs
              font-semibold
              text-blue-700
            "
          >
            {modulosGlobales.length} disponibles
          </span>

          <span
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-emerald-200
              bg-emerald-50
              px-3
              py-1.5
              text-xs
              font-semibold
              text-emerald-700
            "
          >
            {modulosVisibles.length} visibles
          </span>

        </div>

      </div>


      {/* FILTRO */}

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

        <input
          type="text"
          value={busqueda}
          onChange={(event) =>
            setBusqueda(
              event.target.value
            )
          }
          placeholder="Buscar módulo..."
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
            placeholder:text-[var(--erp-text-soft)]
            focus:border-[var(--erp-primary)]
            focus:ring-2
            focus:ring-[var(--erp-primary-soft)]
          "
        />

      </div>


      {/* LISTADO */}

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
            mb-3
            flex
            items-center
            justify-between
            gap-3
          "
        >

          <div>

            <h3
              className="
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Módulos del sistema
            </h3>

            <p
              className="
                mt-0.5
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              Activa o desactiva el acceso visual.
            </p>

          </div>

          <span
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            {modulosFiltrados.length} mostrados
          </span>

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
            No hay módulos que coincidan con la búsqueda.
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-1
              gap-2.5
              md:grid-cols-2
              xl:grid-cols-3
            "
          >

            {modulosFiltrados.map(
              (modulo) => {

                const activo =
                  modulosVisibles.includes(
                    modulo
                  );


                return (
                  <label
                    key={modulo}
                    className={`
                      group
                      flex
                      cursor-pointer
                      items-center
                      justify-between
                      gap-3
                      rounded-xl
                      border
                      px-4
                      py-3
                      transition
                      ${
                        activo
                          ? `
                            border-blue-200
                            bg-blue-50
                            hover:bg-blue-100/70
                          `
                          : `
                            border-[var(--erp-border)]
                            bg-[var(--erp-bg)]
                            hover:border-blue-200
                            hover:bg-blue-50/40
                          `
                      }
                    `}
                  >

                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-3
                      "
                    >

                      <span
                        className={`
                          h-2.5
                          w-2.5
                          shrink-0
                          rounded-full
                          ${
                            activo
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          }
                        `}
                      />

                      <span
                        className={`
                          truncate
                          text-sm
                          font-semibold
                          ${
                            activo
                              ? "text-blue-800"
                              : "text-[var(--erp-text)]"
                          }
                        `}
                      >
                        {modulo}
                      </span>

                    </div>


                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={() =>
                        cambiarModulo(
                          modulo
                        )
                      }
                      className="
                        h-4
                        w-4
                        shrink-0
                        cursor-pointer
                        accent-blue-500
                      "
                    />

                  </label>
                );

              }
            )}

          </div>
        )}

      </div>

    </div>
  );
}
