import { create } from "zustand";
import * as api from "../api/ctn";

export const useCtnStore = create((set, get) => ({
  // ============================================================
  // ESTADO GENERAL
  // ============================================================

  items: [],
  total: 0,
  page: 1,
  page_size: 15,

  notaria: null,

  // Estadísticas antiguas de agenda.
  // No representan firmas realmente realizadas.
  firmas: null,

  // Histórico real obtenido desde los expedientes.
  historicoFirmas: [],
  resumenHistoricoFirmas: {
    total: 0,
    total_vc: 0,
    total_presencial: 0,
    total_sin_clasificar: 0,
  },

  // Asociaciones recíprocas entre notarios.
  notariasAsociadas: [],

  loading: false,
  loadingListado: false,
  loadingHistoricoFirmas: false,
  loadingAsociadas: false,

  error: null,

  // ============================================================
  // LISTADO DE NOTARIOS
  // ============================================================

  cargarNotarias: async (
    filtros = {},
    page = 1,
    page_size = 15,
  ) => {
    set({
      loading: true,
      loadingListado: true,
      error: null,
    });

    try {
      const res = await api.listarNotarias({
        ...filtros,
        page,
        page_size,
      });

      const data = res.data || {};

      set({
        items: data.items || [],
        total: data.total || 0,
        page: data.page || page,
        page_size: data.page_size || page_size,
        loading: false,
        loadingListado: false,
      });

      return data;
    } catch (error) {
      set({
        loading: false,
        loadingListado: false,
        error:
          error?.response?.data?.detail ||
          error?.message ||
          "No se ha podido cargar el listado de notarías.",
      });

      throw error;
    }
  },

  // ============================================================
  // FICHA DE NOTARIO
  // ============================================================

  cargarNotaria: async (id) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const res = await api.obtenerNotaria(id);
      const data = res.data || {};

      set({
        notaria: data,
        notariasAsociadas: data.notarios_asociados || [],
        loading: false,
      });

      return data;
    } catch (error) {
      set({
        notaria: null,
        notariasAsociadas: [],
        loading: false,
        error:
          error?.response?.data?.detail ||
          error?.message ||
          "No se ha podido cargar la ficha del notario.",
      });

      throw error;
    }
  },

  // ============================================================
  // ESTADÍSTICAS DE AGENDA EXISTENTES
  // ============================================================

  cargarFirmasNotaria: async (id) => {
    try {
      const res = await api.obtenerFirmasNotaria(id);

      set({
        firmas: res.data || null,
      });

      return res.data;
    } catch (error) {
      set({ firmas: null });
      throw error;
    }
  },

  // ============================================================
  // HISTÓRICO REAL DE FIRMAS
  // ============================================================

  cargarHistoricoFirmasNotaria: async (
    id,
    filtros = {},
  ) => {
    set({
      loadingHistoricoFirmas: true,
      error: null,
    });

    try {
      const res = await api.obtenerHistoricoFirmasNotaria(
        id,
        filtros,
      );

      const data = res.data || {};
      const items = data.items || [];

      set({
        historicoFirmas: items,
        resumenHistoricoFirmas: {
          total: data.total ?? items.length,
          total_vc: data.total_vc ?? 0,
          total_presencial: data.total_presencial ?? 0,
          total_sin_clasificar:
            data.total_sin_clasificar ?? 0,
        },
        loadingHistoricoFirmas: false,
      });

      return data;
    } catch (error) {
      set({
        historicoFirmas: [],
        resumenHistoricoFirmas: {
          total: 0,
          total_vc: 0,
          total_presencial: 0,
          total_sin_clasificar: 0,
        },
        loadingHistoricoFirmas: false,
        error:
          error?.response?.data?.detail ||
          error?.message ||
          "No se ha podido cargar el histórico de firmas.",
      });

      throw error;
    }
  },

  // ============================================================
  // LISTADO DE NOTARIOS ASOCIADOS
  // ============================================================

  cargarNotariasAsociadas: async (id) => {
    set({
      loadingAsociadas: true,
      error: null,
    });

    try {
      const res = await api.listarNotariasAsociadas(id);
      const data = res.data || {};
      const items = data.items || [];

      set({
        notariasAsociadas: items,
        loadingAsociadas: false,
      });

      return items;
    } catch (error) {
      set({
        notariasAsociadas: [],
        loadingAsociadas: false,
        error:
          error?.response?.data?.detail ||
          error?.message ||
          "No se han podido cargar los notarios asociados.",
      });

      throw error;
    }
  },

  // ============================================================
  // ASOCIAR DOS NOTARIOS
  // La API debe guardar la relación en ambos sentidos.
  // ============================================================

  asociarNotarios: async (notariaId, asociadaId) => {
    if (!notariaId || !asociadaId) {
      throw new Error("Debes seleccionar los dos notarios.");
    }

    if (Number(notariaId) === Number(asociadaId)) {
      throw new Error(
        "Un notario no puede asociarse consigo mismo.",
      );
    }

    try {
      await api.asociarNotarios(notariaId, asociadaId);

      // Recargamos las relaciones de la ficha actual.
      await get().cargarNotariasAsociadas(notariaId);

      // Actualizamos también la ficha si está cargada.
      const fichaActual = get().notaria;

      if (
        fichaActual &&
        Number(fichaActual.id) === Number(notariaId)
      ) {
        set({
          notaria: {
            ...fichaActual,
            notarios_asociados: get().notariasAsociadas,
          },
        });
      }

      return true;
    } catch (error) {
      set({
        error:
          error?.response?.data?.detail ||
          error?.message ||
          "No se ha podido asociar a los notarios.",
      });

      throw error;
    }
  },

  // ============================================================
  // DESASOCIAR DOS NOTARIOS
  // La API debe eliminar la relación en ambos sentidos.
  // ============================================================

  desasociarNotarios: async (notariaId, asociadaId) => {
    try {
      await api.desasociarNotarios(notariaId, asociadaId);

      await get().cargarNotariasAsociadas(notariaId);

      const fichaActual = get().notaria;

      if (
        fichaActual &&
        Number(fichaActual.id) === Number(notariaId)
      ) {
        set({
          notaria: {
            ...fichaActual,
            notarios_asociados: get().notariasAsociadas,
          },
        });
      }

      return true;
    } catch (error) {
      set({
        error:
          error?.response?.data?.detail ||
          error?.message ||
          "No se ha podido eliminar la asociación.",
      });

      throw error;
    }
  },

  // ============================================================
  // LIMPIEZA DEL ESTADO DE CTN
  // ============================================================

  limpiarHistoricoFirmas: () => {
    set({
      historicoFirmas: [],
      resumenHistoricoFirmas: {
        total: 0,
        total_vc: 0,
        total_presencial: 0,
        total_sin_clasificar: 0,
      },
    });
  },

  limpiarFichaNotaria: () => {
    set({
      notaria: null,
      firmas: null,
      historicoFirmas: [],
      resumenHistoricoFirmas: {
        total: 0,
        total_vc: 0,
        total_presencial: 0,
        total_sin_clasificar: 0,
      },
      notariasAsociadas: [],
      error: null,
    });
  },
}));

