// ============================================================
// ERP SJ-2026 — Punto de entrada principal
// ============================================================

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { useAuthStore } from "./store/authStore";

// Añade JWT a llamadas fetch antiguas al backend; Axios ya lo hace solo.
import "./api/fetchAuth";

// Estilos globales SJ-2026
import "./css/index.css";
// Design system compartido MOLSAN: clases opt-in para migración progresiva.
import "./css/molsan-design-system.css";
// Sistema visual compartido por familias: tokens, layout, tablas, controles,
// overlays y movimiento. Las hojas heredadas se migrarán progresivamente.
import "./css/molsan-tokens.css";
import "./css/molsan-layout.css";
import "./css/molsan-tables.css";
import "./css/molsan-controls.css";
import "./css/molsan-overlays.css";
import "./css/molsan-motion.css";

// ============================================================
// Root — Inicialización del ERP SJ-2026
// ============================================================

function Root() {
  useEffect(() => {
    let activo = true;

    const inicializarSesion = async () => {
      try {
        await useAuthStore.getState().init();
      } catch (error) {
        // Última protección: si init falla fuera de su control interno,
        // mostrar el login en lugar de dejar el ERP en carga indefinida.
        console.error("Fallo inesperado al inicializar la sesión.", error);

        try {
          localStorage.removeItem("token");
          localStorage.removeItem("empleado");
        } catch (storageError) {
          console.warn("No se pudo limpiar la sesión local.", storageError);
        }

        if (activo) {
          useAuthStore.setState({
            token: null,
            empleado: null,
            loading: false,
            authReady: true,
          });
        }
      }
    };

    void inicializarSesion();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="animate-fade-in min-h-screen bg-sj-gradient-blanco">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </div>
  );
}

// ============================================================
// Render principal
// ============================================================

ReactDOM.createRoot(document.getElementById("root")).render(
  <Root />
);
