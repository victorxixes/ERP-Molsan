import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { useIntranetStore } from "../store/intranetStore";

const AUTH_CLOSE_CODES = new Set([4001, 4002, 4003, 4004, 4005, 4006, 4401, 4403]);
const MAX_RECONNECT_DELAY = 30000;

function reconnectDelay(attempt) {
  return Math.min(2000 * (2 ** Math.min(attempt, 4)), MAX_RECONNECT_DELAY);
}

/**
 * WebSocket autenticado de Intranet.
 * Mantiene la actualización en tiempo real y recupera cortes transitorios
 * sin abrir conexiones anónimas ni reintentar rechazos de autenticación.
 */
export const useIntranetWS = () => {
  const cargarDocumentos = useIntranetStore((state) => state.cargarDocumentos);
  const cargarNoticias = useIntranetStore((state) => state.cargarNoticias);
  const token = useAuthStore((state) => state.token);
  const authReady = useAuthStore((state) => state.authReady);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!authReady || !token) return undefined;

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
        console.warn("WS Intranet: falta la URL del servicio realtime.");
        return;
      }

      let ws;
      try {
        ws = new WebSocket(
          `${wsBase}/ws/intranet?token=${encodeURIComponent(token)}`
        );
      } catch (error) {
        console.warn("WS Intranet: no se pudo crear la conexión.", error);
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
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!data?.tipo) return;
        const tipo = String(data.tipo).toLowerCase();
        if (tipo.includes("documento")) cargarDocumentos();
        if (tipo.includes("noticia")) cargarNoticias();
      };

      ws.onerror = () => {
        console.warn("WS Intranet: error de conexión.");
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
  }, [authReady, token, cargarDocumentos, cargarNoticias]);

  return wsRef;
};
