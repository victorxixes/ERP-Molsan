import MolsanIcon from "../../components/ui/MolsanIcon";
import { Link } from "react-router-dom";

export default function LecturaCancelaI() {
  return (
    <main className="molsan-page-stack herramienta-operativa-premium herramientas-subpagina-premium min-h-full">
      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true"><MolsanIcon name="folder" size={22} tone="ocean" /></div>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="molsan-page-header__title">Lectura Cancela I</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">En construcción</span>
            </div>
            <p className="molsan-page-header__description">Pantalla inicial del módulo para la lectura de información procedente de Cancela I.</p>
          </div>
        </div>
        <div className="molsan-page-header__actions">
          <Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link>
        </div>
      </header>
      <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="text-3xl" aria-hidden="true"><MolsanIcon name="alert" size={20} /></span>
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
