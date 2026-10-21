import { Link } from "react-router-dom";

export default function Verifacti() {
  return (
    <div className="min-h-full space-y-7 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl shadow-sm">🧾</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Verifacti · Panel de control</h1>
            <p className="mt-1 text-sm text-slate-500">Integración de MOLSAN ERP con la plataforma Verifacti.</p>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">En construcción</span>
          <span className="text-sm text-slate-400">Integración pendiente</span>
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-800">Próximamente, el control de Verifacti desde el ERP</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Estamos preparando este espacio para centralizar el acceso a Verifacti y, en una siguiente fase, consultar el estado de la integración y los registros de facturación. Todavía no hay conexión API activa desde MOLSAN ERP.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-2xl">🔗</div>
            <h3 className="mt-2 text-sm font-semibold text-slate-800">Conexión con Verifacti</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Pendiente de configurar las credenciales de acceso de forma segura.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-2xl">📑</div>
            <h3 className="mt-2 text-sm font-semibold text-slate-800">Registros de facturación</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Espacio previsto para consultar facturas, estados y respuestas.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="text-2xl">🛡️</div>
            <h3 className="mt-2 text-sm font-semibold text-slate-800">Control de integración</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Preparado para incorporar avisos y seguimiento cuando se active la conexión.</p>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <a href="https://www.verifacti.com/docs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            Abrir documentación API de Verifacti <span aria-hidden="true">↗</span>
          </a>
          <Link to="/herramientas/utilidades" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Volver a Utilidades
          </Link>
        </div>
      </section>
    </div>
  );
}
