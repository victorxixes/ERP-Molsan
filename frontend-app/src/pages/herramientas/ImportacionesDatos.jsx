import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { Link } from "react-router-dom";
import MolsanIcon from "../../components/ui/MolsanIcon";
const IMPORTADORES = [
  { titulo: "Importar CTN", detalle: "Carga de información de notarías desde Excel.", icono: "landmark", ruta: "/herramientas/importar-ctn", grupo: "Datos notariales" },
  { titulo: "ABSIS · Pre Firma", detalle: "Importación de expedientes desde el Excel matriz ABSIS.", icono: "folder", ruta: "/herramientas/importador-absis", grupo: "Expedientes" },
  { titulo: "ABSIS · Post Firma", detalle: "Carga histórica de gastos y facturación, validación y consulta de registros.", icono: "receipt", ruta: "/herramientas/importador-absis/postfirma", grupo: "Datos económicos" },
  { titulo: "Entidades bancarias", detalle: "Importación y actualización del catálogo de entidades.", icono: "bank", ruta: "/herramientas/entidades-bancarias?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Municipios", detalle: "Importación de municipios y sus códigos territoriales.", icono: "pin", ruta: "/herramientas/municipios?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Registros de la propiedad", detalle: "Importación y actualización de registros.", icono: "courthouse", ruta: "/herramientas/registros-propiedad?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Oficinas liquidadoras", detalle: "Importación de oficinas y datos asociados.", icono: "building", ruta: "/herramientas/oficinas-liquidadoras?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Catálogo de oficinas", detalle: "Importación validada de las 13 columnas del catálogo.", icono: "file", ruta: "/catalogos/oficinas?importar=1", grupo: "Datos territoriales y entidades" },
  { titulo: "Acciones de expediente", detalle: "Importación del catálogo de acciones de expediente.", icono: "settings", ruta: "/herramientas/acciones-expediente?importar=1", grupo: "Catálogos operativos" },
];

export default function ImportacionesDatos() {
  const grupos = [...new Set(IMPORTADORES.map((item) => item.grupo))];
  return (
    <main className="molsan-page molsan-page-stack importaciones-datos-premium">
      <MolsanPageHeader
        mark={<MolsanIcon name="download" size={42} bare />}
        title="Importaciones y datos"
        description="Centro único de acceso a los procesos de carga, validación y actualización de información del ERP."
      />

      <section className="importaciones-datos-notice">
        <strong>Antes de importar</strong>
        <p>Selecciona el proceso adecuado y revisa siempre la previsualización, los avisos y el resultado antes de confirmar una carga.</p>
      </section>

      {grupos.map((grupo) => (
        <section className="space-y-3" key={grupo}>
          <h2 className="molsan-section-header__title">{grupo}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {IMPORTADORES.filter((item) => item.grupo === grupo).map((item) => (
              <Link key={item.ruta} to={item.ruta} className="erp-card importaciones-datos-card group">
                <span className="importaciones-datos-card__icon"><MolsanIcon name={item.icono} size={44} /></span>
                <span className="min-w-0 flex-1">
                  <strong>{item.titulo}</strong>
                  <span>{item.detalle}</span>
                </span>
                <span className="importaciones-datos-card__arrow" aria-hidden="true"><MolsanIcon name="arrowRight" size={16} bare /></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
