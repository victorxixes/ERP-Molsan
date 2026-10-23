import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore";

/**
 * ============================================================
 * useEmpleadosWS
 * MOLSAN ERP — WebSocket Empleados Premium 2027
 * ============================================================
 *
 * El callback se mantiene actualizado mediante ref para evitar
 * desmontar y volver a montar el WebSocket cada vez que cambia
 * un filtro del listado.
 * ============================================================
 */

export function useEmpleadosWS(onEvento) {
  const wsRef = useRef(null);
  const callbackRef = useRef(onEvento);

  const { token, authReady, user } = useAuthStore();

  useEffect(() => {
    callbackRef.current = onEvento;
  }, [onEvento]);

  useEffect(() => {
    if (!authReady || !token || !user?.id) {
      return;
    }

    if (wsRef.current) {
      return;
    }

    const wsUrl =
      `${import.meta.env.VITE_WS_URL}/ws/empleados/${encodeURIComponent(user.id)}?token=${encodeURIComponent(token)}`;

    let ws;

    try {
      ws = new WebSocket(wsUrl);
    } catch (error) {
      console.warn(
        "WS Empleados: no se pudo crear la conexión.",
        error
      );
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      console.log(
        "WS Empleados conectado"
      );

      try {
        ws.send(
          JSON.stringify({
            tipo: "ping",
          })
        );
      } catch (error) {
        console.warn(
          "WS Empleados: error enviando ping.",
          error
        );
      }
    };

    ws.onmessage = (event) => {
      if (!event?.data) {
        return;
      }

      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        data?.tipo &&
        callbackRef.current
      ) {
        callbackRef.current(data);
      }
    };

    ws.onerror = (error) => {
      console.warn(
        "WS Empleados error.",
        error
      );
    };

    ws.onclose = () => {
      console.warn(
        "WS Empleados cerrado."
      );

      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    return () => {
      try {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {
        // No hacemos nada.
      }

      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [token, authReady, user?.id]);
}
