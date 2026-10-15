import { useEffect, useRef } from "react";
import { useNotificacionesStore } from "../store/notificacionesStore";

/** WebSocket de notificaciones autenticado con el JWT de sesión. */
export const useNotificacionesWS = (empleadoId) => {
  const wsRef = useRef(null);
  const addNotificacion = useNotificacionesStore((s) => s.addNotificacion);

  useEffect(() => {
    if (!empleadoId || wsRef.current) return undefined;

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("WS Notificaciones: no hay token de sesión; no se abre la conexión.");
      return undefined;
    }

    const wsBase = String(import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
    if (!wsBase) {
      console.warn("WS Notificaciones: falta VITE_WS_URL.");
      return undefined;
    }

    let ws;
    try {
      ws = new WebSocket(
        `${wsBase}/ws/notificaciones/${encodeURIComponent(empleadoId)}?token=${encodeURIComponent(token)}`
      );
    } catch (err) {
      console.warn("WS Notificaciones: no se pudo crear la conexión:", err);
      return undefined;
    }

    wsRef.current = ws;
    ws.onmessage = (event) => {
      if (!event.data) return;
      try {
        const data = JSON.parse(event.data);
        if (data?.tipo) addNotificacion(data);
      } catch {
        // Ignorar mensajes que no sean JSON.
      }
    };
    ws.onerror = () => console.warn("WS Notificaciones: error de conexión.");
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };

    return () => {
      if (wsRef.current === ws) wsRef.current = null;
      try { ws.close(); } catch { /* no-op */ }
    };
  }, [empleadoId, addNotificacion]);

  return wsRef;
};
