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

// ============================================================
// Root — Inicialización del ERP SJ-2026
// ============================================================

function Root() {
  useEffect(() => {
    // Hidratar auth al arrancar.
    useAuthStore.getState().init();
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
