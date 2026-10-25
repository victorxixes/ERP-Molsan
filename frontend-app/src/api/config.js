/**
 * Base común de API para llamadas Axios y recursos del backend.
 * La variable de Render prevalece; el valor por defecto evita que, si falta,
 * el navegador intente resolver rutas /api sobre el dominio del frontend.
 */
const API_BASE_CONFIGURADA = import.meta.env.VITE_API_URL;
export const API_BASE = String(
  API_BASE_CONFIGURADA || "https://agenda-intranet-b.onrender.com/api"
).replace(/\/+$/, "");
