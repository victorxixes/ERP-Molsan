import axios from "./axios";

/**
 * ============================================================
 * API MONITOR REALTIME — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Gestiona:
 * - Listado de tablas
 * - Descripción de tabla
 * - Contenido de tabla
 * - Construcción de URL WebSocket realtime
 * ============================================================
 */


/* ---------------------------------------------------------
   LISTAR TABLAS
--------------------------------------------------------- */

export const listarTablas = () =>
  axios.get("/debug/tablas");


/* ---------------------------------------------------------
   DESCRIBIR TABLA
--------------------------------------------------------- */

export const describirTabla = (tabla) =>
  axios.get(`/debug/describe/${tabla}`);


/* ---------------------------------------------------------
   OBTENER CONTENIDO DE TABLA
--------------------------------------------------------- */

export const obtenerContenidoTabla = (tabla) =>
  axios.get(`/debug/contenido/${tabla}`);


/* ---------------------------------------------------------
   CONSTRUIR URL WEBSOCKET REALTIME
--------------------------------------------------------- */

export const buildRealtimeWsUrl = (params = {}) => {

  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error(
      "VITE_API_URL no está configurada."
    );
  }

  /*
   * Axios utiliza:
   *
   * https://agenda-intranet-b.onrender.com/api
   *
   * Pero WebSocket está definido en:
   *
   * /ws/realtime/
   *
   * Por tanto eliminamos /api.
   */

  const baseUrl = apiUrl
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

  /*
   * HTTPS -> WSS
   * HTTP  -> WS
   */

  let wsBaseUrl;

  if (baseUrl.startsWith("https://")) {

    wsBaseUrl =
      "wss://" +
      baseUrl.substring("https://".length);

  } else if (baseUrl.startsWith("http://")) {

    wsBaseUrl =
      "ws://" +
      baseUrl.substring("http://".length);

  } else if (
    baseUrl.startsWith("wss://") ||
    baseUrl.startsWith("ws://")
  ) {

    wsBaseUrl = baseUrl;

  } else {

    throw new Error(
      `VITE_API_URL no tiene un formato válido: ${apiUrl}`
    );

  }

  const query = new URLSearchParams(
    params
  ).toString();

  return `${wsBaseUrl}/ws/realtime/${
    query ? `?${query}` : ""
  }`;
};
