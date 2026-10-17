import axios from "axios";
import { useAuthStore } from "../store/authStore";

// Cliente aislado de EncargaGest: la sesión externa no sustituye el JWT general del ERP.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});

let modoSesion = localStorage.getItem("encargagest_mode") === "externo" ? "externo" : "interno";

export function configurarSesionEncargaGest(modo, token) {
  modoSesion = modo;
  if (modo === "externo") {
    if (token) localStorage.setItem("encargagest_token", token);
    localStorage.setItem("encargagest_mode", "externo");
  } else {
    localStorage.removeItem("encargagest_token");
    localStorage.removeItem("encargagest_mode");
  }
}

export function limpiarSesionEncargaGest() {
  localStorage.removeItem("encargagest_token");
  localStorage.removeItem("encargagest_mode");
  modoSesion = "interno";
}

client.interceptors.request.use((config) => {
  const token = modoSesion === "externo"
    ? localStorage.getItem("encargagest_token")
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
