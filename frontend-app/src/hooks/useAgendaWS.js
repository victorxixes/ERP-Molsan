import { useEffect, useRef } from "react";
import { useAgendaStore } from "../store/agendaStore";

const AUTH_CLOSE_CODES = new Set([4401, 4403]);
const MAX_RECONNECT_DELAY = 30000;

function reconnectDelay(attempt) {
  return Math.min(2000 * (2 ** Math.min(attempt, 4)), MAX_RECONNECT_DELAY);
}

/**
 * WebSocket de Agenda autenticado.
 * Se recupera de cortes de red/redeploy con backoff; no insiste ante rechazos
 * definitivos de autenticación o permisos.
 */
export function useAgendaWS() {
  const wsRef = useRef(null);

  const addCita = useAgendaStore((s) => s.addCita);
  const updateCita = useAgendaStore((s) => s.updateCita);
  const removeCita = useAgendaStore((s) => s.removeCita);
  const marcarResaltada = useAgendaStore((s) => s.marcarResaltada);
  const notify = useAgendaStore((s) => s.notify);
  const refrescarVista = useAgendaStore((s) => s.refrescarVista);

  useEffect(() => {
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

      const token = window.localStorage.getItem("token");
      const wsBase = String(import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
      if (!token || !wsBase) {
        console.warn(!token ? "WS Agenda: no hay token de sesión." : "WS Agenda: falta VITE_WS_URL.");
        return;
      }

      let ws;
      try {
        ws = new WebSocket(`${wsBase}/ws/agenda?token=${encodeURIComponent(token)}`);
      } catch (error) {
        console.warn("WS Agenda: no se pudo crear la conexión.", error);
        scheduleReconnect();
        return;
      }

      wsRef.current = ws;
      ws.onopen = () => {
        if (!mounted || wsRef.current !== ws) return;
        console.info("WS Agenda conectado.");
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(() => {
          attempts = 0;
          stableTimer = null;
        }, 30000);
      };
      ws.onerror = () => console.warn("WS Agenda: error de conexión.");
      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stableTimer) {
          clearTimeout(stableTimer);
          stableTimer = null;
        }
        if (!mounted || AUTH_CLOSE_CODES.has(event.code)) return;
        scheduleReconnect();
      };

      ws.onmessage = async (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (!data?.tipo) return;

          switch (data.tipo) {
            case "crear":
              if (data.cita) {
                addCita(data.cita);
                marcarResaltada(data.cita.id);
                notify(`Nueva cita creada: ${data.cita.tipo_cita} — ${data.cita.hora_inicio}`);
              }
              await refrescarVista();
              break;
            case "editar":
              if (data.cita) {
                updateCita(data.cita);
                notify(`Cita actualizada: ${data.cita.tipo_cita} — ${data.cita.hora_inicio}`);
              }
              await refrescarVista();
              break;
            case "eliminar":
              if (data.id !== undefined && data.id !== null) {
                removeCita(data.id);
                notify("Cita eliminada");
              }
              await refrescarVista();
              break;
            default:
              break;
          }
        } catch (error) {
          console.warn("WS Agenda: mensaje inválido.", error);
        }
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
  }, [addCita, updateCita, removeCita, marcarResaltada, notify, refrescarVista]);

  return wsRef;
}
