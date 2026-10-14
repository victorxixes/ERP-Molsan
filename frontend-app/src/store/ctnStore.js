import { create } from "zustand";
import {
  listarNotarias,
  obtenerNotaria,
  obtenerFirmasNotaria,
  obtenerHistoricoFirmasNotaria,
  listarNotariasAsociadas,
  asociarNotarios as apiAsociarNotarios,
  desasociarNotarios as apiDesasociarNotarios,
} from "../api/ctn";

const mensajeError = (error, defecto) =>
  error?.response?.data?.detail || error?.message || defecto;

export const useCtnStore = create((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  page_size: 15,
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
  loading: false,
  loadingListado: false,
  loadingDetalle: false,
  loadingHistoricoFirmas: false,
  loadingAsociadas: false,
  error: null,

  cargarNotarias: async (filtros = {}, pagina = 1, pageSize = 15) => {
    set({ loading: true, loadingListado: true, error: null });
    try {
      const response = await listarNotarias({
        ...filtros,
        page: pagina,
        page_size: pageSize,
      });
      const data = response?.data ?? response ?? {};
      set({
        items: Array.isArray(data.items) ? data.items : [],
        total: Number(data.total || 0),
        page: Number(data.page || pagina),
        page_size: Number(data.page_size || pageSize),
        loading: false,
        loadingListado: false,
      });
      return data;
    } catch (error) {
      set({ loading: false, loadingListado: false, error: mensajeError(error, "No se pudo cargar el listado CTN") });
      throw error;
    }
  },

  cargarNotaria: async (id) => {
    set({ loading: true, loadingDetalle: true, error: null });
    try {
      const response = await obtenerNotaria(id);
      const data = response?.data ?? response;
      set({ notaria: data, loading: false, loadingDetalle: false });
      return data;
    } catch (error) {
      set({ loading: false, loadingDetalle: false, error: mensajeError(error, "No se pudo cargar la ficha del notario") });
      throw error;
    }
  },

  cargarFirmasNotaria: async (id) => {
    try {
      const response = await obtenerFirmasNotaria(id);
      const data = response?.data ?? response;
      set({ firmas: data });
      return data;
    } catch (error) {
      set({ error: mensajeError(error, "No se pudo cargar el resumen de agenda") });
      throw error;
    }
  },

  cargarHistoricoFirmasNotaria: async (id, filtros = {}) => {
    set({ loadingHistoricoFirmas: true, error: null });
    try {
      const response = await obtenerHistoricoFirmasNotaria(id, filtros);
      const data = response?.data ?? response ?? {};
      set({
        historicoFirmas: Array.isArray(data.items) ? data.items : [],
        resumenHistoricoFirmas: {
          total: Number(data.total || 0),
          total_vc: Number(data.total_vc || 0),
          total_presencial: Number(data.total_presencial || 0),
          total_sin_clasificar: Number(data.total_sin_clasificar || 0),
        },
        loadingHistoricoFirmas: false,
      });
      return data;
    } catch (error) {
      set({ loadingHistoricoFirmas: false, error: mensajeError(error, "No se pudo cargar el histórico de firmas") });
      throw error;
    }
  },

  cargarNotariasAsociadas: async (id) => {
    set({ loadingAsociadas: true, error: null });
    try {
      const response = await listarNotariasAsociadas(id);
      const data = response?.data ?? response ?? {};
      const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      set({ notariasAsociadas: items, loadingAsociadas: false });
      return items;
    } catch (error) {
      set({ loadingAsociadas: false, error: mensajeError(error, "No se pudieron cargar los notarios asociados") });
      throw error;
    }
  },

  asociarNotarios: async (notariaId, asociadaId) => {
    const response = await apiAsociarNotarios(notariaId, asociadaId);
    await Promise.all([
      get().cargarNotariasAsociadas(notariaId),
      get().cargarNotaria(notariaId),
    ]);
    return response?.data ?? response;
  },

  desasociarNotarios: async (notariaId, asociadaId) => {
    const response = await apiDesasociarNotarios(notariaId, asociadaId);
    await Promise.all([
      get().cargarNotariasAsociadas(notariaId),
      get().cargarNotaria(notariaId),
    ]);
    return response?.data ?? response;
  },

  limpiarHistoricoFirmas: () => set({
    historicoFirmas: [],
    resumenHistoricoFirmas: { total: 0, total_vc: 0, total_presencial: 0, total_sin_clasificar: 0 },
  }),

  limpiarFichaNotaria: () => set({
    notaria: null,
    firmas: null,
    historicoFirmas: [],
    resumenHistoricoFirmas: { total: 0, total_vc: 0, total_presencial: 0, total_sin_clasificar: 0 },
    notariasAsociadas: [],
    error: null,
  }),
}));
