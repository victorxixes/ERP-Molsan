import "../../css/Fusiones.css";

/**
 * MOLSAN ERP Premium 2027 · Glass Luxe
 * El módulo de Fusiones se encuentra en construcción.
 * Se mantiene una pantalla informativa hasta que el flujo funcional esté terminado.
 */
export default function Fusiones() {
  return (
    <main className="erp-page min-h-full p-4 text-[var(--erp-text)] sm:p-6 lg:p-8">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface,var(--erp-card,#fff))] shadow-sm">
        <div className="h-1 bg-gradient-to-r from-slate-400 via-blue-500 to-slate-300" />
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg,#f8fafc)] text-[var(--erp-primary)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 3v5c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V3" />
                <path d="M7 21v-5c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v5" />
                <path d="M4 3h6M14 21h6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--erp-text-soft)]">MOLSAN ERP · Premium 2027</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--erp-text)] sm:text-3xl">Fusiones</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--erp-text-soft)]">
                Este módulo está en construcción. Estamos preparando su diseño y el flujo de trabajo antes de habilitar las funciones operativas.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              En construcción
            </span>
          </div>

          <div className="mt-8 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg,#f8fafc)] p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[var(--erp-text)]">Módulo en preparación</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--erp-text-soft)]">
              La pantalla de gestión de fusiones todavía no está disponible para uso operativo. Cuando esté terminada, se integrará con el diseño común del ERP y se habilitarán aquí sus funciones.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
