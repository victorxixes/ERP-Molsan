import { Link } from "react-router-dom";

export default function LecturaCancelaI() {
  return (
    <main className="herramienta-operativa-premium herramientas-subpagina-premium min-h-full space-y-6">
      <header className="molsan-page-header">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <Link to="/herramientas/utilidades" className="text-xs font-bold text-blue-700 hover:underline">← Volver a Utilidades</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl">📁</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Lectura Cancela I</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">En construcción</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Pantalla inicial del módulo para la lectura de información procedente de Cancela I.</p>
          </div>
        </div>
      </header>
      <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="text-3xl" aria-hidden="true">🚧</span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Integración pendiente</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">El acceso ya está habilitado, pero todavía no se ha implementado la lectura real de Cancela I. Queda pendiente definir y conectar el origen de los datos, el procesamiento y la presentación de resultados. Esta pantalla no consulta ni modifica datos reales.</p>
            <p className="mt-3 text-xs font-semibold text-amber-800">Próximamente: conexión con la fuente de Cancela I y registro de los resultados de lectura.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
