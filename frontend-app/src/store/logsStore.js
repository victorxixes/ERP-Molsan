import { create } from "zustand";

import * as api from "../api/logs";


/**
 * ============================================================
 * STORE DE LOGS
 * MOLSAN ERP SAAS PREMIUM 2027
 * ============================================================
 *
 * Gestiona:
 *
 * - listado de logs
 * - estado de carga
 * - errores
 * - recarga de información
 *
 * ============================================================
 */

export const useLogsStore = create((set) => ({

  /* ==========================================================
     ESTADO
  ========================================================== */

  logs: [],

  loading: false,

  error: null,


  /* ==========================================================
     CARGAR LOGS
  ========================================================== */

  cargarLogs: async (filtros = {}) => {

    set({
      loading: true,
      error: null,
    });

    try {

      const response = await api.listarLogs(
        filtros
      );

      const datos =
        Array.isArray(response?.data)
          ? response.data
          : [];

      set({
        logs: datos,
        loading: false,
        error: null,
      });

    } catch (error) {

      console.error("No se han podido cargar los registros del sistema.");

      set({
        logs: [],
        loading: false,
        error: "No se han podido cargar los logs.",
      });

    }

  },

}));
