import axios from "axios";
import { useAuthStore } from "../store/authStore";

// Cliente aislado de EncargaGest: la sesión externa no sustituye el JWT general del ERP.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});

const TOKEN_SOPORTE_KEY = "encargagest_soporte_token";
let modoSesion = localStorage.getItem("encargagest_mode") === "externo" ? "externo" : "interno";

export function configurarSesionEncargaGest(modo, token) {
  modoSesion = modo;
  if (modo === "externo") {
    if (token) {
      sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
      localStorage.setItem("encargagest_token", token);
    }
    localStorage.setItem("encargagest_mode", "externo");
  } else {
    localStorage.removeItem("encargagest_token");
    sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
    localStorage.removeItem("encargagest_mode");
  }
}

export function configurarSesionSoporteEncargaGest(tokenSoporte) {
  modoSesion = "externo";
  localStorage.setItem("encargagest_mode", "externo");
  localStorage.removeItem("encargagest_token");
  if (tokenSoporte) sessionStorage.setItem(TOKEN_SOPORTE_KEY, tokenSoporte);
  else sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
}

export function limpiarSesionEncargaGest() {
  localStorage.removeItem("encargagest_token");
  sessionStorage.removeItem(TOKEN_SOPORTE_KEY);
  localStorage.removeItem("encargagest_mode");
  modoSesion = "interno";
}

client.interceptors.request.use((config) => {
  const token = modoSesion === "externo"
    ? (sessionStorage.getItem(TOKEN_SOPORTE_KEY) || localStorage.getItem("encargagest_token"))
    : (useAuthStore.getState().token || localStorage.getItem("token"));

  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

export default client;
