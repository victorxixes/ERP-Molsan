// ============================================================
// MOLSAN ERP PREMIUM 2027 — Punto de entrada principal
// ============================================================

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { useAuthStore } from "./store/authStore";

// Añade JWT a llamadas fetch antiguas al backend; Axios ya lo hace solo.
import "./api/fetchAuth";

// Base heredada y utilidades globales; se mantiene mientras existan componentes legacy.
import "./css/index.css";
// Tokens primero; las reglas del design system los consumen después.
import "./css/molsan-tokens.css";
// Capa opt-in consolidada: estructura, tablas, controles y componentes.
import "./css/molsan-design-system.css";
// La shell y sus dependencias se evalúan antes de las capas globales finales.
import App from "./App";
// Estilos transversales ligeros de compatibilidad Fase 3, sin hoja monolítica de overrides.
import "./css/MolsanFase3.css";
// Estilos funcionales de módulos y páginas.
import "./css/molsan-module-styles.css";
// Estilos propios de los portales: estructura y particularidades funcionales.
import "./css/ApoderaGest.css";
import "./css/EncargaGest.css";
import "./css/NotarGest.css";
// Compatibilidad heredada y presentación de Espacios de trabajo.

import "./css/MolsanRedesign2027.css";
import "./css/MolsanPremium2027.css";
// Tarjetas semánticas y excepciones específicas de módulos (sin inferir tarjetas Tailwind).
import "./css/MolsanCardsPremium2027.css";
// Normalización específica de portales y capas globales compartidas.
import "./css/PortalProfesionalPremium2027.css";
import "./css/MolsanGlobalConsistency2027.css";
import "./css/MolsanGlassLuxeUnified2027.css";
// Última capa visual canónica: cabeceras, tarjetas semánticas y geometría Dashboard.
import "./css/MolsanCanonicalVisual2027.css";


// ============================================================
// Root — Inicialización y recuperación de sesión
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
// Montaje de la aplicación
// ============================================================

ReactDOM.createRoot(document.getElementById("root")).render(
  <Root />
);
