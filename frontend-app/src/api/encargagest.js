import axios from "axios";
import { API_BASE } from "./config";
import { useAuthStore } from "../store/authStore";

const TOKEN_SOPORTE_KEY = "encargagest_soporte_token";
const MODO_SESION_KEY = "encargagest_mode";

// El modo pertenece a la pestaña: localStorage compartía el estado entre
// sesiones internas y externas abiertas simultáneamente.
let modoSesion = sessionStorage.getItem(MODO_SESION_KEY) === "externo" ? "externo" : "interno";

export function configurarSesionEncargaGest(modo, token) {
  modoSesion = modo === "externo" ? "externo" : "interno";
  if (modoSesion === "externo") {
    if (token) {
      sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
      localStorage.setItem("encargagest_token", token);
    }
    sessionStorage.setItem(MODO_SESION_KEY, "externo");
  } else {
    // No borrar el token externo de localStorage: puede pertenecer a otra
    // pestaña que mantiene una sesión notarial independiente.
    sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
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
  localStorage.removeItem("encargagest_token");
  localStorage.removeItem("encargagest_mode"); // Limpieza de la clave heredada.
  sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
  sessionStorage.removeItem(MODO_SESION_KEY);
  modoSesion = "interno";
}

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });
api.interceptors.request.use((config) => {
  const token = modoSesion === "externo"
    ? (sessionStorage.getItem(TOKEN_SOPORTE_KEY) || localStorage.getItem("encargagest_token"))
    : (useAuthStore.getState().token || localStorage.getItem("token"));
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export default api;
