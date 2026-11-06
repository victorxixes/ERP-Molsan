import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { puedeVerModulo } from "../../utils/permisos";

/**
 * Comprueba la visibilidad del módulo con el mismo catálogo central
 * utilizado por Sidebar. RequireAuth debe envolver este guard para
 * garantizar que la sesión ya está hidratada.
 */
export default function RequireModule({ module, children }) {
  const empleado = useAuthStore((state) => state.empleado);

  if (!empleado) {
    return <Navigate to="/login" replace />;
  }

  if (!puedeVerModulo(module)) {
    return <Navigate to="/modulos" replace />;
  }

  return children;
}
