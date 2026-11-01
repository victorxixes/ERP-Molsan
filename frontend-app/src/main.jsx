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
// Componentes y módulos funcionales.
import App from "./App";
// Estilos de módulos y páginas antes de las capas globales compartidas.
import "./css/molsan-module-styles.css";
// Capa de armonización general.
import "./css/MolsanRedesign2027.css";
import "./css/MolsanPremium2027.css";

// Última capa: neutraliza diferencias visuales propias de los módulos.

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
          console.warn("No se pudo limpiar la sesión local.");
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
    <div className="min-h-screen">
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
