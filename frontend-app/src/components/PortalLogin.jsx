import React from "react";

/**
 * Acceso profesional de los portales notariales.
 * Mantiene el lenguaje visual del login principal de MOLSAN ERP y adapta
 * marca y color de acento según el portal, sin acoplar la autenticación.
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
}) {
  const esEncarga = variant === "encargagest";
  const acento = esEncarga
    ? {
        texto: "text-amber-700",
        brillo: "via-amber-500/40",
        foco: "focus:border-amber-400 focus:ring-amber-400/15",
        boton: "from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300",
        halo: "bg-amber-400/[0.045]",
        rejilla: "from-white via-slate-50/60 to-amber-50/70",
      }
    : {
        texto: "text-blue-700",
        brillo: "via-blue-500/40",
        foco: "focus:border-blue-400 focus:ring-blue-400/15",
        boton: "from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400",
        halo: "bg-blue-400/[0.045]",
        rejilla: "from-white via-slate-50/60 to-blue-50/70",
      };

  const inputBase =
    "w-full rounded-xl border border-slate-200/90 bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-wait disabled:opacity-60 " +
    acento.foco;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 animate-fadeIn">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-56 -top-56 h-[620px] w-[620px] rounded-full bg-blue-400/10 blur-3xl" />
        <div className={"absolute -bottom-56 -right-56 h-[620px] w-[620px] rounded-full " + (esEncarga ? "bg-amber-300/15" : "bg-cyan-300/15") + " blur-3xl"} />
        <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 blur-3xl" />
        <div className={"absolute inset-0 bg-gradient-to-br " + acento.rejilla} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,1)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,1)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.025]" />
      </div>

      <section className="relative z-10 w-full max-w-[450px] animate-slideUp">
        <div className="relative overflow-hidden rounded-[30px] border border-white/90 bg-white/80 p-7 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-9">
          <div className={"absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent " + acento.brillo + " to-transparent"} />
          <div className={"pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl " + acento.halo} />

          <header className="relative mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-[0_14px_35px_rgba(15,23,42,0.10)]">
                <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-blue-500/5" />
                <img src="/img/logo.jpg" alt="Molsan" className="relative h-20 w-auto rounded-[16px] object-contain sm:h-24" />
              </div>
            </div>
            <div className="mb-3 flex justify-center">
              <span className={"inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 text-[9px] font-extrabold tracking-[0.18em] " + acento.texto}>
                <span className={"h-1.5 w-1.5 rounded-full " + (esEncarga ? "bg-amber-500" : "bg-blue-500")} />
                ENTORNO PROFESIONAL · MOLSAN ERP
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-800 sm:text-[34px]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-[15px]">{subtitle}</p>
          </header>

          {error ? (
            <div role="alert" className="mb-5 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-center shadow-sm animate-fadeIn">
              <p className="text-sm font-medium text-red-600">{error}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor={variant + "-usuario"} className="mb-2 block text-sm font-semibold text-slate-700">{usernameLabel}</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">♙</span>
                <input
                  id={variant + "-usuario"}
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoFocus
                  autoComplete="username"
                  disabled={loading}
                  placeholder={usernamePlaceholder}
                  required
                  className={inputBase}
                />
              </div>
            </div>

            <div>
              <label htmlFor={variant + "-password"} className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">●</span>
                <input
                  id={variant + "-password"}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder={passwordPlaceholder}
                  required
                  className={inputBase}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={"mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-3.5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.17)] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60 " + acento.boton}
            >
              {loading ? "Validando acceso…" : "Entrar"}
              {!loading ? <span aria-hidden="true">→</span> : null}
            </button>
          </form>

          <footer className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-[11px] leading-5 text-slate-500">{footnote}</p>
            <p className="mt-3 text-[9px] font-semibold tracking-[0.12em] text-slate-400">MOLSAN ERP · PREMIUM 2027</p>
          </footer>
        </div>
      </section>
    </main>
  );
}
