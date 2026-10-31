import React, { useState } from "react";

/**
 * Login de los portales profesionales.
 * Componente de acceso de los portales externos de MOLSAN ERP,
 * manteniendo independientes las credenciales y la autenticación de cada portal.
 */
export default function PortalLogin({
  variant = "notargest",
  title,
  subtitle,
  usernameLabel,
  usernamePlaceholder,
  passwordPlaceholder,
  footnote,
  username,
  setUsername,
  password,
  setPassword,
  onSubmit,
  loading,
  error,
  submitLabel = "Iniciar sesión",
}) {
  const [mostrarPass, setMostrarPass] = useState(false);
  const idUsuario = variant + "-usuario";
  const idPassword = variant + "-password";

  return (
    <div className="portal-login relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="relative z-10 w-full max-w-[430px]">
        <div className="relative w-full p-7 sm:p-9">

          <div className="relative mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative p-2">
                <img src="/img/logo.jpg" alt="Molsan" className="h-20 w-auto object-contain sm:h-24" />
              </div>
            </div>
            <h1 className="">{title}</h1>
            <p className="mt-2">{subtitle}</p>
          </div>

          {error ? (
            <div role="alert" className="mb-5 px-4 py-3 text-center">
              <p className="text-sm">{error}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor={idUsuario} className="mb-2 block">{usernameLabel}</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true">👤</span>
                <input
                  id={idUsuario}
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoFocus
                  autoComplete="username"
                  disabled={loading}
                  placeholder={usernamePlaceholder}
                  required
                  className="w-full px-4 py-3.5 pl-11 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor={idPassword} className="mb-2 block">Contraseña</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true">🔒</span>
                <input
                  id={idPassword}
                  type={mostrarPass ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder={passwordPlaceholder}
                  required
                  className="w-full px-4 py-3.5 pl-11 pr-12 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPass((valor) => !valor)}
                  disabled={loading}
                  aria-label={mostrarPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center disabled:opacity-30"
                >
                  {mostrarPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin" />
                    Accediendo...
                  </>
                ) : submitLabel}
              </span>
            </button>
          </form>

          <div className="mt-8 border-t pt-5 text-center">
            <p className="text-xs">{footnote}</p>
                      </div>
        </div>
      </div>
    </div>
  );
}
