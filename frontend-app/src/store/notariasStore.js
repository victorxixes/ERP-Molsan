import { create } from "zustand";
import { obtenerNotarios } from "../api/agenda";

/**
 * Store de Notarías — Versión SJ‑2026 Premium
 * Gestiona:
 * - Listado de notarios/notarías
 * - Estado de carga
 * - Manejo de errores
 */

export const useNotariasStore = create((set) => ({
  notarias: [],
  cargando: false,
  error: null,

  // ---------------------------------------------------------
  // CARGAR NOTARÍAS
  // ---------------------------------------------------------
  cargarNotarias: async () => {
    try {
      set({ cargando: true, error: null });

      const res = await obtenerNotarios();
      const lista = Array.isArray(res.data) ? res.data : [];

      set({
        notarias: lista,
        cargando: false,
        error: null,
      });
    } catch (err) {
      console.error("Error cargando notarías:", "Error interno");
      set({
        cargando: false,
        error: err.message || "Error cargando notarías",
      });
    }
  },
}));
