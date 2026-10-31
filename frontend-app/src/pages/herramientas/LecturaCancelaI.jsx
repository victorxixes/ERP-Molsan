import { Link } from "react-router-dom";

export default function LecturaCancelaI() {
  return (
    <main className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1" />
        <Link to="/herramientas/utilidades">← Volver a Utilidades</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center">📁</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1>Lectura Cancela I</h1>
              <span className="px-2.5 py-1 uppercase">En construcción</span>
            </div>
            <p className="mt-2 max-w-3xl">Pantalla inicial del módulo para la lectura de información procedente de Cancela I.</p>
          </div>
        </div>
      </header>
      <section className="p-6 sm:p-8">
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
