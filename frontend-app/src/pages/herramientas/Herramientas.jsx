import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { Link } from "react-router-dom";

/**
 * HERRAMIENTAS — MOLSAN ERP PREMIUM 2027
 *
 * Panel principal de herramientas.
 * Diseño coherente con el resto del ERP:
 * - Glass Luxe claro
 * - Cards premium
 * - Iconos
 * - Hover suave
 * - Responsive
 */

export default function Herramientas() {
  return (
    <div className="herramientas-home-premium min-h-full p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader mark="HT" title="Herramientas" description="Herramientas y procesos auxiliares del sistema." />

      {/* =====================================================
          TARJETAS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

        <Card
          icon="download"
          titulo="Importar CTN"
          descripcion="Importar fichero Excel con información de notarías."
          link="/herramientas/importar-ctn"
        />

        <Card
          icon="newspaper"
          titulo="Crear noticia"
          descripcion="Publicar una nueva noticia en la intranet."
          link="/herramientas/utilidades/crear-noticia"
        />

        <Card
          icon="file"
          titulo="Subir documento"
          descripcion="Subir documentos y archivos a la intranet."
          link="/herramientas/utilidades/subir-documento"
        />

        <Card
          icon="chart"
          titulo="Informes"
          descripcion="Consultar listados y estadísticas de apoderados."
          link="/herramientas/informes"
        />

        <Card
          icon="archive"
          titulo="Importador ABSIS"
          descripcion="Importar expedientes desde el Excel matriz ABSIS."
          link="/herramientas/importador-absis"
          destacado
        />

      </div>

    </div>
  );
}


/* =========================================================
   CARD
========================================================= */

function Card({
  icon,
  titulo,
  descripcion,
  link,
  destacado = false,
}) {
  return (
    <Link
      to={link}
      className={`workspace-app-card ${destacado ? "workspace-tone-cyan" : "workspace-tone-ocean"} group`}
    >
      <span className="workspace-card-accent" aria-hidden="true" />
      <span className="workspace-card-topline">
        <MolsanIcon className="workspace-app-icon" name={icon || "file"} size={58} tone="ocean" />
        <span className="workspace-card-open" aria-hidden="true">
          <MolsanIcon name="arrowRight" size={16} bare />
        </span>
      </span>
      <span className="workspace-app-category">
        {destacado ? "HERRAMIENTA DESTACADA" : "HERRAMIENTA ERP"}
      </span>
      <span className="workspace-app-title">{titulo}</span>
      <span className="workspace-app-description">{descripcion}</span>
      <span className="workspace-card-footer">
        <span>Abrir herramienta</span>
        <MolsanIcon name="arrowRight" size={18} bare />
      </span>
    </Link>
  );
}
