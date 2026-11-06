/**
 * Configuración única de conexión con el backend MOLSAN.
 * Cada entorno debe declarar VITE_API_URL; nunca se permite un fallback
 * silencioso a Producción ni a un servicio histórico.
 */
const API_BASE_CONFIGURADA = String(import.meta.env.VITE_API_URL || "").trim();

if (!API_BASE_CONFIGURADA) {
  throw new Error(
    "Configuración incompleta: define VITE_API_URL para este entorno antes de iniciar o compilar."
  );
}

let apiUrl;
try {
  apiUrl = new URL(API_BASE_CONFIGURADA);
} catch {
  throw new Error("VITE_API_URL debe ser una URL absoluta válida del backend.");
}

if (!["http:", "https:"].includes(apiUrl.protocol)) {
  throw new Error("VITE_API_URL debe utilizar HTTP o HTTPS.");
}

export const API_BASE = API_BASE_CONFIGURADA.replace(/\/+$/, "");

export function getApiOrigin() {
  return new URL(API_BASE).origin;
}

export function getWebSocketBase() {
  const configured = String(import.meta.env.VITE_WS_URL || "").trim().replace(/\/+$/, "");
  if (configured) {
    const wsUrl = new URL(configured);
    if (!["ws:", "wss:"].includes(wsUrl.protocol)) {
      throw new Error("VITE_WS_URL debe utilizar WS o WSS.");
    }
    return configured;
  }
  return getApiOrigin().replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
}
