import { create } from "zustand";

import {
  listarEmpleados,
  obtenerEmpleado,
  crearEmpleado,
  editarEmpleado,
  eliminarEmpleado,
  listarApoderados,
  buscarEmpleados,
} from "../api/empleados";


/* ============================================================
   HELPERS
============================================================ */

const safe = (valor) => {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "-";
  }

  if (
    typeof valor === "object"
  ) {
    try {
      return JSON.stringify(valor);
    } catch {
      return "-";
    }
  }

  return String(valor);
};


const safeId = (valor) => {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
};


const safeEmpleado = (empleado) => {
  if (!empleado) {
    return null;
  }

  return {
    ...empleado,

    id: safeId(
      empleado.id
    ),

    nombre: safe(
      empleado.nombre
    ),

    apellidos: safe(
      empleado.apellidos
    ),

    dni: safe(
      empleado.dni
    ),

    telefono: safe(
      empleado.telefono
    ),

    email_personal: safe(
      empleado.email_personal
    ),

    email_empresa: safe(
      empleado.email_empresa
    ),

    extension: safe(
      empleado.extension
    ),

    activo: Boolean(
      empleado.activo
    ),

    departamento_nombre:
      safe(
        empleado.departamento_nombre
      ),

    seccion_nombre:
      safe(
        empleado.seccion_nombre
      ),

    cargo_nombre:
      safe(
        empleado.cargo_nombre
      ),

    foto:
      typeof empleado.foto === "string"
        ? empleado.foto
        : "-",

    usuario: safe(
      empleado.usuario
    ),
  };
};


/* ============================================================
   STORE
============================================================ */

export const useEmpleadosStore = create(
  (set, get) => ({

    empleados: [],

    apoderados: [],

    empleadoActual: null,

    cargando: false,

    error: null,


    /* ========================================================
       CARGAR EMPLEADOS
    ======================================================== */

    cargarEmpleados: async () => {

      try {

        set({
          cargando: true,
          error: null,
        });

        const res =
          await listarEmpleados();

        const origen =
          Array.isArray(res?.data)
            ? res.data
            : Array.isArray(
                res?.data?.empleados
              )
              ? res.data.empleados
              : [];

        const lista =
          origen
            .map(safeEmpleado)
            .filter(
              Boolean
            );

        set({
          empleados: lista,
          cargando: false,
        });

        return lista;

      } catch (err) {

        console.error(
          "Error cargando empleados:",
          "Error interno");

        set({
          cargando: false,
          error:
            err?.response?.data?.detail ||
            err?.message ||
            "Error cargando empleados",
        });

        return [];
      }
    },


    /* ========================================================
       CARGAR APODERADOS
    ======================================================== */

    cargarApoderados: async () => {

      try {

        set({
          cargando: true,
          error: null,
        });

        const res =
          await listarApoderados();

        const origen =
          Array.isArray(res?.data)
            ? res.data
            : Array.isArray(
                res?.data?.empleados
              )
              ? res.data.empleados
              : [];

        const lista =
          origen
            .map(safeEmpleado)
            .filter(
              Boolean
            );

        set({
          apoderados: lista,
          cargando: false,
        });

        return lista;

      } catch (err) {

        console.error(
          "Error cargando apoderados:",
          "Error interno");

        set({
          cargando: false,
          error:
            err?.response?.data?.detail ||
            err?.message ||
            "Error cargando apoderados",
        });

        return [];
      }
    },


    /* ========================================================
       BUSCAR
    ======================================================== */

    buscar: async (
      params = {}
    ) => {

      try {

        set({
          cargando: true,
          error: null,
        });

        const res =
          await buscarEmpleados(
            params
          );

        const origen =
          Array.isArray(res?.data)
            ? res.data
            : Array.isArray(
                res?.data?.empleados
              )
              ? res.data.empleados
              : [];

        const lista =
          origen
            .map(safeEmpleado)
            .filter(
              Boolean
            );

        set({
          empleados: lista,
          cargando: false,
        });

        return lista;

      } catch (err) {

        console.error(
          "Error buscando empleados:",
          "Error interno");

        set({
          cargando: false,
          error:
            err?.response?.data?.detail ||
            err?.message ||
            "Error buscando empleados",
        });

        return [];
      }
    },


    /* ========================================================
       OBTENER
    ======================================================== */

    obtener: async (
      id
    ) => {

      const idNum =
        safeId(id);

      if (!idNum) {
        return null;
      }

      try {

        const res =
          await obtenerEmpleado(
            idNum
          );

        const empleado =
          res?.data
            ? safeEmpleado(
                res.data
              )
            : null;

        set({
          empleadoActual:
            empleado,
        });

        return empleado;

      } catch (err) {

        console.error(
          "Error obteniendo empleado:",
          "Error interno");

        set({
          empleadoActual:
            null,
          error:
            err?.response?.data?.detail ||
            err?.message ||
            "Error obteniendo empleado",
        });

        return null;
      }
    },


    /* ========================================================
       CREAR
    ======================================================== */

    crear: async (
      payload
    ) => {

      try {

        set({
          cargando: true,
          error: null,
        });

        const res =
          await crearEmpleado(
            payload
          );

        await get()
          .cargarEmpleados();

        set({
          cargando: false,
        });

        return res?.data
          ? safeEmpleado(
              res.data
            )
          : null;

      } catch (err) {

        console.error(
          "Error creando empleado:",
          "Error interno");

        set({
          cargando: false,
          error:
            err?.response?.data?.detail ||
            err?.message ||
            "Error creando empleado",
        });

        throw err;
      }
    },


    /* ========================================================
       EDITAR
    ======================================================== */

    editar: async (
      id,
      payload
    ) => {

      const idNum =
        safeId(id);

      if (!idNum) {
        throw new Error(
          "ID de empleado inválido."
        );
      }

      try {

        set({
          cargando: true,
          error: null,
        });

        const res =
          await editarEmpleado(
            idNum,
            payload
          );

        await get()
          .cargarEmpleados();

        const empleado =
          res?.data
            ? safeEmpleado(
                res.data
              )
            : null;

        set({
          empleadoActual:
            empleado,
          cargando: false,
        });

        return empleado;

      } catch (err) {

        console.error(
          "Error editando empleado:",
          "Error interno");

        set({
          cargando: false,
          error:
            err?.response?.data?.detail ||
            err?.message ||
            "Error editando empleado",
        });

        throw err;
      }
    },


    /* ========================================================
       ELIMINAR
    ======================================================== */

    eliminar: async (
      id
    ) => {

      const idNum =
        safeId(id);

      if (!idNum) {
        throw new Error(
          "ID de empleado inválido."
        );
      }

      try {

        set({
          cargando: true,
          error: null,
        });

        await eliminarEmpleado(
          idNum
        );

        await get()
          .cargarEmpleados();

        set({
          empleadoActual:
            null,
          cargando: false,
        });

      } catch (err) {

        console.error(
          "Error eliminando empleado:",
          "Error interno");

        set({
          cargando: false,
          error:
            err?.response?.data?.detail ||
            err?.message ||
            "Error eliminando empleado",
        });

        throw err;
      }
    },


    /* ========================================================
       LIMPIAR EMPLEADO ACTUAL
    ======================================================== */

    limpiarEmpleadoActual: () => {

      set({
        empleadoActual: null,
      });

    },

  })
);
