import { useState, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";


/**
 * Acceso al ERP Molsan
 *
 * Diseño:
 * - Fondo claro corporativo
 * - Coherente con el resto del ERP
 * - Responsive
 * - Animaciones suaves
 * - Sin dependencias adicionales
 *
 * Lógica:
 * - Mantiene Zustand
 * - Mantiene iniciarSesion()
 * - Mantiene navegación a /dashboard
 * - Mantiene validaciones
 * - Mantiene estado de carga
 */

export default function LoginPage() {
  const navigate = useNavigate();

  const iniciarSesion = useAuthStore(
    (state) => state.iniciarSesion
  );

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  // =========================================================
  // LOGIN
  // =========================================================

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (cargando) {
        return;
      }

      setError(null);

      if (!usuario.trim()) {
        setError("Introduce tu usuario.");
        return;
      }

      if (!password) {
        setError("Introduce tu contraseña.");
        return;
      }

      try {
        setCargando(true);

        const ok = await iniciarSesion(
          usuario.trim(),
          password
        );

        if (ok) {
          navigate("/modulos");
          return;
        }

        setError(
          "Usuario o contraseña incorrectos."
        );
      } catch (err) {
        console.error("No se ha podido completar el inicio de sesión.");

        setError(
          "No se ha podido iniciar sesión."
        );
      } finally {
        setCargando(false);
      }
    },
    [
      usuario,
      password,
      cargando,
      iniciarSesion,
      navigate,
    ]
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="login-principal relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <section className="login-card relative z-10 w-full max-w-[430px] p-7 sm:p-9">
        <header className="mb-8">
          <div className="mb-6 flex justify-center">
            <img src="/img/logo.jpg" alt="Molsan" className="h-20 w-auto object-contain sm:h-24" />
          </div>
          <h1>Molsan ERP</h1>
          <p className="mt-2">Plataforma de gestión empresarial</p>
        </header>

        {error && (
          <div role="alert" className="mb-5 px-4 py-3">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="usuario" className="mb-2 block">Usuario</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2" aria-hidden="true">👤</span>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
                autoComplete="username"
                disabled={cargando}
                placeholder="Introduce tu usuario"
                className="w-full px-4 py-3.5 pl-11"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block">Contraseña</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2" aria-hidden="true">🔒</span>
              <input
                id="password"
                type={mostrarPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={cargando}
                placeholder="Introduce tu contraseña"
                className="w-full px-4 py-3.5 pl-11 pr-12"
              />
              <button
                type="button"
                onClick={() => setMostrarPass((valor) => !valor)}
                disabled={cargando}
                aria-label={mostrarPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 flex h-9 w-9 items-center justify-center"
              >
                {mostrarPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="molsan-btn molsan-btn--primary w-full py-3.5"
          >
            <span className="flex items-center justify-center gap-2">
              {cargando ? (
                <>
                  <span className="h-4 w-4" />
                  Accediendo...
                </>
              ) : "Entrar en Molsan ERP"}
            </span>
          </button>
        </form>

        <footer className="mt-8 pt-5">
          <p>Molsan ERP · Plataforma empresarial</p>
        </footer>
      </section>
    </main>
  );
}
