import MolsanIcon from "../../components/ui/MolsanIcon";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { Link } from "react-router-dom";

export default function LecturaCancelaI() {
  return (
    <main className="herramienta-operativa-premium herramientas-subpagina-premium min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <MolsanPageHeader mark="CI" title="Lectura Cancela I" description="Pantalla inicial del módulo para la lectura de información procedente de Cancela I." actions={<Link to="/herramientas/utilidades" className="text-xs font-bold text-blue-700 hover:underline"><MolsanIcon name="arrowLeft" size={13} bare /> Volver a Utilidades</Link>}/>
      <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span aria-hidden="true"><MolsanIcon name="tools" size={32} tone="ocean" /></span>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--molsan-primary)]">Integración pendiente</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--molsan-text-secondary)]">El acceso ya está habilitado, pero todavía no se ha implementado la lectura real de Cancela I. Queda pendiente definir y conectar el origen de los datos, el procesamiento y la presentación de resultados. Esta pantalla no consulta ni modifica datos reales.</p>
            <p className="mt-3 text-xs font-semibold text-amber-800">Próximamente: conexión con la fuente de Cancela I y registro de los resultados de lectura.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
