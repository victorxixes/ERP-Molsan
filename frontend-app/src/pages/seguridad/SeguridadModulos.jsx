import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

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
      <div className="erp-page w-full space-y-4">
        <MolsanPageHeader
          mark="SE"
          title="Módulos visibles"
          description="Configura los módulos que puede visualizar cada empleado."
        />
        <section className="molsan-panel p-10">
          <p className="font-semibold">Selecciona un empleado</p>
          <p className="mt-1">La configuración de módulos aparecerá aquí.</p>
        </section>
      </div>
    );
  }


  return (
    <div
      className="erp-page w-full space-y-4"
    >

      <MolsanPageHeader
        mark="SE"
        title="Módulos visibles"
        description="Configura los módulos que puede visualizar este empleado."
      />

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
 
 `}
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
