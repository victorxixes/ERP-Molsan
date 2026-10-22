// ============================================================
// ERP SJ-2026 — Punto de entrada principal
// ============================================================

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { useAuthStore } from "./store/authStore";

// Añade JWT a llamadas fetch antiguas al backend; Axios ya lo hace solo.
import "./api/fetchAuth";

// Estilos heredados y utilidades globales SJ-2026.
import "./css/index.css";
// Tokens primero; las reglas del design system los consumen después.
import "./css/molsan-tokens.css";
// Capa opt-in consolidada: estructura, tablas, controles y componentes.
import "./css/molsan-design-system.css";
import "./css/molsan-tables.css";
import "./css/molsan-controls.css";
import "./css/molsan-overlays.css";
import "./css/molsan-motion.css";
// Armonización visual transversal de módulos ya migrados.
import "./css/MolsanRedesign2027.css";

// La app se importa después de la base global para que los estilos específicos
// de cada página/portal puedan prevalecer sobre los estilos compartidos.
import App from "./App";

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
        console.error("Fallo inesperado al inicializar la sesión.");

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
