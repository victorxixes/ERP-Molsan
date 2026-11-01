import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

const AUTH_CLOSE_CODES = new Set([4401, 4403]);
const MAX_RECONNECT_DELAY = 30000;

function reconnectDelay(attempt) {
  return Math.min(2000 * (2 ** Math.min(attempt, 4)), MAX_RECONNECT_DELAY);
}

/**
 * WebSocket de empleados autenticado.
 * Usa el empleado real de authStore y recupera la conexión tras cortes
 * transitorios, sin reintentar ante rechazos definitivos de sesión/permisos.
 */
export function useEmpleadosWS(onEvento) {
  const wsRef = useRef(null);
  const callbackRef = useRef(onEvento);

  const token = useAuthStore((state) => state.token);
  const authReady = useAuthStore((state) => state.authReady);
  const empleadoId = useAuthStore((state) =>
    state.empleado?.id ?? state.empleado?.empleado_id ?? null
  );

  useEffect(() => {
    callbackRef.current = onEvento;
  }, [onEvento]);

  useEffect(() => {
    if (!authReady || !token || !empleadoId) return undefined;

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

      const configuredWs = String(import.meta.env.VITE_WS_URL || "").replace(/\/+$/, "");
      const configuredApi = String(
        import.meta.env.VITE_API_URL || "https://agenda-intranet-b.onrender.com"
      ).replace(/\/+$/, "");
      const wsBase = configuredWs ||
        configuredApi.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");

      if (!wsBase) {
        console.warn("WS Empleados: falta la URL del servicio realtime.");
        return;
      }

      let ws;
      try {
        ws = new WebSocket(
          `${wsBase}/ws/empleados/${encodeURIComponent(empleadoId)}?token=${encodeURIComponent(token)}`
        );
      } catch (error) {
        console.warn("WS Empleados: no se pudo crear la conexión.", error);
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
        if (!event?.data) return;
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data?.tipo && callbackRef.current) {
          callbackRef.current(data);
        }
      };

      ws.onerror = () => {
        console.warn("WS Empleados: error de conexión.");
      };

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
      try {
        ws?.close();
      } catch {
        // La conexión puede haberse cerrado previamente.
      }
    };
  }, [authReady, token, empleadoId]);

  return wsRef;
}
