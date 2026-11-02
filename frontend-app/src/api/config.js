/**
 * Base común de API para llamadas Axios y recursos del backend.
 *
 * Cada entorno debe declarar VITE_API_URL explícitamente. Nunca se permite
 * que una Preview o una compilación local caiga silenciosamente en Producción.
 */
const API_BASE_CONFIGURADA = String(import.meta.env.VITE_API_URL || "").trim();

if (!API_BASE_CONFIGURADA && import.meta.env.PROD) {
  throw new Error(
    "Configuración incompleta: define VITE_API_URL para este entorno antes de compilar."
  );
}

export const API_BASE = String(API_BASE_CONFIGURADA || "/api").replace(/\/+$/, "");
