import { useEffect, useRef } from "react";
import { useAgendaStore } from "../store/agendaStore";

/**
 * WebSocket de Agenda autenticado.
 * La API rechaza conexiones que no lleven un JWT válido y con permiso agenda.ver.
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
    if (wsRef.current) return undefined;

    const token = window.localStorage.getItem("token");
    const wsBase = String(import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
    if (!token) {
      console.warn("WS Agenda: no hay token de sesión.");
      return undefined;
    }
    if (!wsBase) {
      console.warn("WS Agenda: falta VITE_WS_URL.");
      return undefined;
    }

    let ws;
    try {
      ws = new WebSocket(`${wsBase}/ws/agenda?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.warn("WS Agenda no disponible. Modo offline.", error);
      return undefined;
    }

    wsRef.current = ws;
    ws.onopen = () => console.info("WS Agenda conectado.");
    ws.onerror = () => console.warn("WS Agenda error. Modo offline.");
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
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

    return () => {
      if (wsRef.current === ws) wsRef.current = null;
      try {
        ws.close();
      } catch {
        // La sesión puede haberse cerrado ya.
      }
    };
  }, [addCita, updateCita, removeCita, marcarResaltada, notify, refrescarVista]);

  return wsRef;
}
