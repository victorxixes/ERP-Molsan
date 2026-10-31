// ============================================================
// ERP MOLSAN — Punto de entrada principal
// ============================================================

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { useAuthStore } from "./store/authStore";

// Añade JWT a llamadas fetch antiguas al backend; Axios ya lo hace solo.
import "./api/fetchAuth";

// Base de utilidades y estructura. Se retiran las capas visuales antiguas.
import "./css/index.css";

// Componentes y módulos funcionales.
import App from "./App";

// Neutralización visual global, cargada después de los estilos de los módulos.
// El sidebar queda expresamente excluido.
import "./css/NeutralizarPresentacion.css";
import "./css/MolsanFase3.css";
import "./css/MolsanFase3Portales.css";

// ============================================================
// Root — Inicialización del ERP
// ============================================================

function Root() {
  useEffect(() => {
    let activo = true;

    const inicializarSesion = async () => {
      try {
        await useAuthStore.getState().init();
      } catch (error) {
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

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
