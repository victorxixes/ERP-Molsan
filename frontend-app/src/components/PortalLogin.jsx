import React, { useState } from "react";
import MolsanIcon from "./ui/MolsanIcon";

import "../css/LayoutPortalesPremium.css";
/**
 * Login de los portales profesionales.
 * Replica el formato visual del login principal de MOLSAN ERP,
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
    <div className="portal-login-premium min-h-screen relative flex items-center justify-center overflow-hidden px-4 py-8 bg-slate-50 animate-fadeIn">
      {/* Fondo Premium: misma composición que el login de CancelaGest */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-56 -left-56 w-[620px] h-[620px] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute -bottom-56 -right-56 w-[620px] h-[620px] rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[760px] h-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/60 to-blue-50/70" />
        <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(rgba(15,23,42,1)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,1)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative z-10 w-full max-w-[430px] animate-slideUp">
        <div className="relative overflow-hidden rounded-[30px] border border-white/90 bg-white/80 backdrop-blur-2xl shadow-[0_30px_100px_rgba(15,23,42,0.12)] p-7 sm:p-9">
          {/* Brillo superior */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
          <div className="absolute -top-24 left-1/2 w-64 h-64 -translate-x-1/2 rounded-full bg-blue-400/[0.035] blur-3xl pointer-events-none" />

          <div className="relative text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative p-2 rounded-[22px] bg-white border border-slate-200/80 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
                <div className="absolute inset-0 rounded-[22px] ring-1 ring-blue-500/5 pointer-events-none" />
                <img src="/img/logo.jpg" alt="Molsan" className="relative h-20 sm:h-24 w-auto rounded-[16px] object-contain" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-[34px] font-bold tracking-[-0.03em] text-slate-800">{title}</h1>
            <p className="mt-2 text-sm sm:text-[15px] text-slate-500">{subtitle}</p>
          </div>

          {error ? (
            <div role="alert" className="mb-5 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-center shadow-sm animate-fadeIn">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor={idUsuario} className="block mb-2 text-sm font-semibold text-slate-700">{usernameLabel}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors" aria-hidden="true"><MolsanIcon name="person" size={20} bare /></span>
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
                  className="w-full rounded-2xl border border-slate-200 bg-white/75 px-4 py-3.5 pl-11 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 shadow-[0_4px_15px_rgba(15,23,42,0.03)] hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor={idPassword} className="block mb-2 text-sm font-semibold text-slate-700">Contraseña</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true"><MolsanIcon name="lock" size={20} bare /></span>
                <input
                  id={idPassword}
                  type={mostrarPass ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder={passwordPlaceholder}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white/75 px-4 py-3.5 pl-11 pr-12 text-[15px] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 shadow-[0_4px_15px_rgba(15,23,42,0.03)] hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPass((valor) => !valor)}
                  disabled={loading}
                  aria-label={mostrarPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-30"
                >
                  <MolsanIcon name={mostrarPass ? "eyeOff" : "eye"} size={20} bare />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.20)] transition-all duration-200 hover:from-blue-500 hover:to-cyan-400 hover:shadow-[0_16px_40px_rgba(37,99,235,0.28)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Accediendo...
                  </>
                ) : submitLabel}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-slate-200/80 text-center">
            <p className="text-xs font-medium text-slate-400">{footnote}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-slate-300">Premium 2027</p>
          </div>
        </div>
      </div>
    </div>
  );
}
