import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

export default function LecturaCancelaI() {
  return (
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="LC" title="Lectura Cancela I" description="Pantalla inicial del módulo para la lectura de información procedente de Cancela I." />
      <div className="flex justify-end"><Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link></div>
      <section className="erp-card p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span aria-hidden="true">🚧</span>
          <div>
            <h2>Integración pendiente</h2>
            <p className="mt-2 max-w-3xl">El acceso ya está habilitado, pero todavía no se ha implementado la lectura real de Cancela I. Queda pendiente definir y conectar el origen de los datos, el procesamiento y la presentación de resultados. Esta pantalla no consulta ni modifica datos reales.</p>
            <p className="mt-3">Próximamente: conexión con la fuente de Cancela I y registro de los resultados de lectura.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
