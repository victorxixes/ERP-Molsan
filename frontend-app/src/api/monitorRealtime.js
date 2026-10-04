import axios from "./axios";

/**
 * ============================================================
 * API MONITOR REALTIME — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Gestiona:
 *
 * - Listado de tablas
 * - Descripción de tabla
 * - Contenido de tabla
 * - Construcción de URL WebSocket realtime
 *
 * IMPORTANTE
 * ============================================================
 *
 * La API principal utiliza:
 *
 *   https://agenda-intranet-b.onrender.com/api
 *
 * Pero las rutas técnicas /debug están publicadas en:
 *
 *   /debug/tablas
 *   /debug/describe/{tabla}
 *   /debug/contenido/{tabla}
 *
 * Por tanto:
 *
 *   Axios normal  -> /api/...
 *   Debug técnico -> /debug/...
 *   WebSocket     -> /ws/realtime/...
 *
 * ============================================================
 */


/* ============================================================
   BASE URL DEL BACKEND
============================================================ */

const getBackendBaseUrl = () => {

  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error(
      "VITE_API_URL no está configurada."
    );
  }

  return apiUrl
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
};


/* ============================================================
   LISTAR TABLAS
============================================================ */

/**
 * Obtiene el listado de tablas disponibles
 * para el diagnóstico técnico.
 *
 * IMPORTANTE:
 * Esta ruta NO utiliza /api.
 *
 * GET:
 *
 *   /debug/tablas
 */
export const listarTablas = () => {

  const baseUrl = getBackendBaseUrl();

  return axios.get(
    `${baseUrl}/debug/tablas`
  );
};


/* ============================================================
   DESCRIBIR TABLA
============================================================ */

/**
 * Obtiene la estructura de una tabla.
 *
 * GET:
 *
 *   /debug/describe/{tabla}
 */
export const describirTabla = (tabla) => {

  if (!tabla) {
    return Promise.reject(
      new Error(
        "No se ha indicado ninguna tabla."
      )
    );
  }

  const baseUrl = getBackendBaseUrl();

  return axios.get(
    `${baseUrl}/debug/describe/${encodeURIComponent(tabla)}`
  );
};


/* ============================================================
   OBTENER CONTENIDO DE TABLA
============================================================ */

/**
 * Obtiene el contenido de una tabla.
 *
 * GET:
 *
 *   /debug/contenido/{tabla}
 */
export const obtenerContenidoTabla = (tabla) => {

  if (!tabla) {
    return Promise.reject(
      new Error(
        "No se ha indicado ninguna tabla."
      )
    );
  }

  const baseUrl = getBackendBaseUrl();

  return axios.get(
    `${baseUrl}/debug/contenido/${encodeURIComponent(tabla)}`
  );
};


/* ============================================================
   CONSTRUIR URL WEBSOCKET REALTIME
============================================================ */

/**
 * Construye la URL del WebSocket realtime.
 *
 * Axios utiliza:
 *
 *   https://agenda-intranet-b.onrender.com/api
 *
 * Pero WebSocket está definido en:
 *
 *   /ws/realtime/
 *
 * Por tanto eliminamos /api.
 *
 * Ejemplo:
 *
 * VITE_API_URL:
 *
 *   https://agenda-intranet-b.onrender.com/api
 *
 * Resultado:
 *
 *   wss://agenda-intranet-b.onrender.com/ws/realtime/
 *
 * ============================================================
 */
export const buildRealtimeWsUrl = (params = {}) => {

  const baseUrl = getBackendBaseUrl();

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
      `VITE_API_URL no tiene un formato válido: ${import.meta.env.VITE_API_URL}`
    );

  }

  const query = new URLSearchParams(
    params
  ).toString();

  return (
    `${wsBaseUrl}/ws/realtime/` +
    (query ? `?${query}` : "")
  );
};
