import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

/**
 * RequireAuth
 * Protege rutas privadas del ERP.
 * - Redirige al login si no hay token
 * - Evita pantallas en blanco y renders prematuros
 */

export default function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  const loading = useAuthStore((s) => s.loading);
  const authReady = useAuthStore((s) => s.authReady);

  /**
   * Estado de carga
   * Evita pantallas en blanco mientras Zustand hidrata.
   */
  if (!authReady || loading) {
    return (
      <div
        className="w-full h-screen flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-4">
          {/* Indicador de carga */}
          <div
            className="w-12 h-12"
          />

          <p>
            Cargando sesión…
          </p>
        </div>
      </div>
    );
  }

  /**
   * Si no hay token → redirigir al login
   */
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  /**
   * Si todo está OK → mostrar contenido protegido
   */
  return children;
}
