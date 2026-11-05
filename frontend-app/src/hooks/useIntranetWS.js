import { useEffect, useRef } from "react";
import { useIntranetStore } from "../store/intranetStore";
import { getWebSocketBase } from "../api/config";

/**
 * WebSocket autenticado de Intranet.
 * Reutiliza el JWT de sesión y mantiene la actualización en tiempo real
 * de documentos y noticias. Si no hay token, no abre una conexión anónima.
 */
export const useIntranetWS = () => {
  const cargarDocumentos = useIntranetStore((s) => s.cargarDocumentos);
  const cargarNoticias = useIntranetStore((s) => s.cargarNoticias);
  const wsRef = useRef(null);

  useEffect(() => {
    if (wsRef.current) return undefined;

    let token = null;
    try {
      token = window.localStorage.getItem("token");
    } catch {
      token = null;
    }
    if (!token) return undefined;

    const wsBase = getWebSocketBase();
    if (!wsBase) return undefined;

    const ws = new WebSocket(`${wsBase}/ws/intranet?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (!event.data) return;
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data?.tipo) return;
      if (String(data.tipo).toLowerCase().includes("documento")) cargarDocumentos();
      if (String(data.tipo).toLowerCase().includes("noticia")) cargarNoticias();
    };

    ws.onerror = () => {
      console.warn("WS Intranet: conexión no disponible.");
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };

    return () => {
      try {
        ws.close();
      } catch {
        // La conexión puede haberse cerrado ya.
      }
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [cargarDocumentos, cargarNoticias]);
};
