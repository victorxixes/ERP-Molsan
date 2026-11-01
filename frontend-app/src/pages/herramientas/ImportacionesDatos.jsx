import { Link } from "react-router-dom";
import MolsanIcon from "../../components/ui/MolsanIcon";
import "../../css/ImportacionesDatos.css";

const IMPORTADORES = [
  { titulo: "Importar CTN", detalle: "Carga de información de notarías desde Excel.", icono: "🏛️", ruta: "/herramientas/importar-ctn", grupo: "Datos notariales" },
  { titulo: "ABSIS · Pre Firma", detalle: "Importación de expedientes desde el Excel matriz ABSIS.", icono: "📂", ruta: "/herramientas/importador-absis", grupo: "Expedientes" },
  { titulo: "ABSIS · Post Firma", detalle: "Carga histórica de gastos y facturación, validación y consulta de registros.", icono: "🧾", ruta: "/herramientas/importador-absis/postfirma", grupo: "Datos económicos" },
  { titulo: "Entidades bancarias", detalle: "Importación y actualización del catálogo de entidades.", icono: "🏦", ruta: "/herramientas/entidades-bancarias?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Municipios", detalle: "Importación de municipios y sus códigos territoriales.", icono: "🏘️", ruta: "/herramientas/municipios?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Registros de la propiedad", detalle: "Importación y actualización de registros.", icono: "🏛️", ruta: "/herramientas/registros-propiedad?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Oficinas liquidadoras", detalle: "Importación de oficinas y datos asociados.", icono: "🏢", ruta: "/herramientas/oficinas-liquidadoras?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Catálogo de oficinas", detalle: "Importación validada de las 13 columnas del catálogo.", icono: "📑", ruta: "/catalogos/oficinas?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Acciones de expediente", detalle: "Importación del catálogo de acciones de expediente.", icono: "⚙️", ruta: "/herramientas/acciones-expediente?importar=1", grupo: "Catálogos operativos" },
];

export default function ImportacionesDatos() {
  const grupos = [...new Set(IMPORTADORES.map((item) => item.grupo))];
  return (
    <main className="molsan-page molsan-page-stack importaciones-datos-premium">
      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark"><MolsanIcon name="download" size={42} bare /></div>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · CENTRO DE DATOS</p>
            <h1 className="molsan-page-header__title">Importaciones y datos</h1>
            <p className="molsan-page-header__description">Centro único de acceso a los procesos de carga, validación y actualización de información del ERP.</p>
          </div>
        </div>
      </header>

      <section className="importaciones-datos-notice">
        <strong>Antes de importar</strong>
        <p>Selecciona el proceso adecuado y revisa siempre la previsualización, los avisos y el resultado antes de confirmar una carga.</p>
      </section>

      {grupos.map((grupo) => (
        <section className="space-y-3" key={grupo}>
          <h2 className="molsan-section-header__title">{grupo}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {IMPORTADORES.filter((item) => item.grupo === grupo).map((item) => (
              <Link key={item.ruta} to={item.ruta} className="importaciones-datos-card group">
                <span className="importaciones-datos-card__icon"><MolsanIcon name={item.icono} size={44} /></span>
                <span className="min-w-0 flex-1">
                  <strong>{item.titulo}</strong>
                  <span>{item.detalle}</span>
                </span>
                <span className="importaciones-datos-card__arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
