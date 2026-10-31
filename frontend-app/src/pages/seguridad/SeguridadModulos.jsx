import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import "./SeguridadSubpaginasPremium.css";

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
        className="p-10"
      >

        <div className="">
          📦
        </div>

        <p
          className="mt-3"
        >
          Selecciona un empleado
        </p>

        <p
          className="mt-1"
        >
          La configuración de módulos aparecerá aquí.
        </p>

      </div>
    );
  }


  return (
    <div
      className="seguridad-subpagina-premium seguridad-modulos-premium w-full space-y-4"
    >

      {/* CABECERA */}

      <div
        className="flex
 flex-col
 gap-4
 
 
 
 
 p-5
 
 md:flex-row
 md:items-center
 md:justify-between"
      >

        <div
          className="flex
 items-center
 gap-3"
        >

          <div
            className="flex
 h-11
 w-11
 shrink-0
 items-center
 justify-center"
          >
            📦
          </div>

          <div>

            <h2
              className=""
            >
              Módulos visibles
            </h2>

            <p
              className="mt-0.5"
            >
              Configura los módulos que puede visualizar este empleado.
            </p>

          </div>

        </div>


        <div
          className="flex
 flex-wrap
 items-center
 gap-2"
        >

          <span
            className="inline-flex
 items-center
 
 
 
 
 px-3
 py-1.5"
          >
            {modulosGlobales.length} disponibles
          </span>

          <span
            className="inline-flex
 items-center
 
 
 
 
 px-3
 py-1.5"
          >
            {modulosVisibles.length} visibles
          </span>

        </div>

      </div>


      {/* FILTRO */}

      <div
        className="p-4"
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
          className="w-full
 
 
 
 
 px-4
 py-2.5"
        />

      </div>


      {/* LISTADO */}

      <div
        className="p-4"
      >

        <div
          className="mb-3
 flex
 items-center
 justify-between
 gap-3"
        >

          <div>

            <h3
              className=""
            >
              Módulos del sistema
            </h3>

            <p
              className="mt-0.5"
            >
              Activa o desactiva el acceso visual.
            </p>

          </div>

          <span
            className=""
          >
            {modulosFiltrados.length} mostrados
          </span>

        </div>


        {modulosFiltrados.length ===
          0 ? (
          <div
            className="p-8"
          >
            No hay módulos que coincidan con la búsqueda.
          </div>
        ) : (
          <div
            className="grid
 grid-cols-1
 gap-2.5
 md:grid-cols-2
 xl:grid-cols-3"
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
                    className={`group
 flex
 
 items-center
 justify-between
 gap-3
 
 
 px-4
 py-3
 
 ${
 activo
 ?`
                            border-blue-200
                            bg-blue-50
                            hover:bg-blue-100/70
                          `:`
                            border-[var(--erp-border)]
                            bg-[var(--erp-bg)]
                            hover:border-blue-200
                            hover:bg-blue-50/40
                          `}`}
                  >

                    <div
                      className="flex
 min-w-0
 items-center
 gap-3"
                    >

                      <span
                        className={`h-2.5
 w-2.5
 shrink-0
 
 ${
 activo
 ? ""
 : ""
 }`}
                      />

                      <span
                        className={`truncate
 
 
 ${
 activo
 ? ""
 : ""
 }`}
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
                      className="h-4
 w-4
 shrink-0"
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
