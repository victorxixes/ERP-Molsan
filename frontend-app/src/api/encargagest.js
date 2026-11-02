import axios from "axios";
import { API_BASE } from "./config";
import { useAuthStore } from "../store/authStore";

const TOKEN_EXTERNO_KEY = "encargagest_token";
const TOKEN_SOPORTE_KEY = "encargagest_soporte_token";
const MODO_SESION_KEY = "encargagest_mode";

// Migración de compatibilidad: el token antiguo vivía en localStorage y se
// compartía entre pestañas. Se traslada a sessionStorage para aislar cada tab.
if (!sessionStorage.getItem(TOKEN_EXTERNO_KEY)) {
  const tokenHeredado = localStorage.getItem(TOKEN_EXTERNO_KEY);
  if (tokenHeredado) sessionStorage.setItem(TOKEN_EXTERNO_KEY, tokenHeredado);
}
localStorage.removeItem(TOKEN_EXTERNO_KEY);
localStorage.removeItem("encargagest_mode");

let modoSesion = sessionStorage.getItem(MODO_SESION_KEY) === "externo" ? "externo" : "interno";

export function configurarSesionEncargaGest(modo, token) {
  modoSesion = modo === "externo" ? "externo" : "interno";
  if (modoSesion === "externo") {
    if (token) {
      sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
      sessionStorage.setItem(TOKEN_EXTERNO_KEY, token);
    }
    sessionStorage.setItem(MODO_SESION_KEY, "externo");
  } else {
    // El token externo también es por pestaña: al cambiar a sesión interna
    // se limpia únicamente el contexto de esta pestaña.
    sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
    sessionStorage.removeItem(TOKEN_EXTERNO_KEY);
    sessionStorage.removeItem(MODO_SESION_KEY);
  }
}

export function configurarSesionSoporteEncargaGest(tokenSoporte) {
  modoSesion = "externo";
  sessionStorage.setItem(MODO_SESION_KEY, "externo");
  if (tokenSoporte) sessionStorage.setItem(TOKEN_SOPORTE_KEY, tokenSoporte);
  else sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
}

export function limpiarSesionEncargaGest() {
  localStorage.removeItem("encargagest_token"); // Limpieza de sesiones heredadas.
  localStorage.removeItem("encargagest_mode");
  sessionStorage.removeItem(TOKEN_EXTERNO_KEY);
  sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
  sessionStorage.removeItem(MODO_SESION_KEY);
  modoSesion = "interno";
}

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });
api.interceptors.request.use((config) => {
  const token = modoSesion === "externo"
    ? (sessionStorage.getItem(TOKEN_SOPORTE_KEY) || sessionStorage.getItem(TOKEN_EXTERNO_KEY))
    : (useAuthStore.getState().token || localStorage.getItem("token"));
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default api;
