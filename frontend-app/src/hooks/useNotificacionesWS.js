import { useEffect, useRef } from "react";
import { useNotificacionesStore } from "../store/notificacionesStore";

const AUTH_CLOSE_CODES = new Set([4401, 4403]);
const MAX_RECONNECT_DELAY = 30000;

function reconnectDelay(attempt) {
  return Math.min(2000 * (2 ** Math.min(attempt, 4)), MAX_RECONNECT_DELAY);
}

/** WebSocket de notificaciones autenticado, con reconexión gradual ante cortes. */
export const useNotificacionesWS = (empleadoId) => {
  const wsRef = useRef(null);
  const addNotificacion = useNotificacionesStore((s) => s.addNotificacion);

  useEffect(() => {
    if (!empleadoId) return undefined;

    let mounted = true;
    let reconnectTimer = null;
    let stableTimer = null;
    let attempts = 0;

    const clearTimers = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (stableTimer) {
        clearTimeout(stableTimer);
        stableTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (!mounted || reconnectTimer) return;
      const delay = reconnectDelay(attempts);
      attempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (!mounted) return;
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) return;

      const token = localStorage.getItem("token");
      const wsBase = String(import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
      if (!token || !wsBase) {
        console.warn(!token
          ? "WS Notificaciones: no hay token de sesión."
          : "WS Notificaciones: falta VITE_WS_URL.");
        return;
      }

      let ws;
      try {
        ws = new WebSocket(
          `${wsBase}/ws/notificaciones/${encodeURIComponent(empleadoId)}?token=${encodeURIComponent(token)}`
        );
      } catch (error) {
        console.warn("WS Notificaciones: no se pudo crear la conexión.", error);
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;
      ws.onopen = () => {
        if (!mounted || wsRef.current !== ws) return;
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(() => {
          attempts = 0;
          stableTimer = null;
        }, 30000);
      };
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
      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stableTimer) {
          clearTimeout(stableTimer);
          stableTimer = null;
        }
        if (!mounted || AUTH_CLOSE_CODES.has(event.code)) return;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      mounted = false;
      clearTimers();
      const ws = wsRef.current;
      wsRef.current = null;
      try { ws?.close(); } catch { /* no-op */ }
    };
  }, [empleadoId, addNotificacion]);

  return wsRef;
};
