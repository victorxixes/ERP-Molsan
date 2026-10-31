import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { Link } from "react-router-dom";


/**
 * HERRAMIENTAS
 *
 * Panel principal de herramientas.
 * Diseño coherente con el resto del ERP:
 * - Iconos
 * - Hover suave
 * - Responsive
 */

export default function Herramientas() {
  return (
    <div className="erp-page w-full space-y-6">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader mark="HE" title="Herramientas" description="Herramientas y procesos auxiliares del sistema." />


      {/* =====================================================
          TARJETAS
      ===================================================== */}

      <div className="molsan-tool-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

        <Card
          icon="📥"
          titulo="Importar CTN"
          descripcion="Importar fichero Excel con información de notarías."
          link="/herramientas/importar-ctn"
        />

        <Card
          icon="📰"
          titulo="Crear noticia"
          descripcion="Publicar una nueva noticia en la intranet."
          link="/herramientas/utilidades/crear-noticia"
        />

        <Card
          icon="📄"
          titulo="Subir documento"
          descripcion="Subir documentos y archivos a la intranet."
          link="/herramientas/utilidades/subir-documento"
        />

        <Card
          icon="📊"
          titulo="Informes"
          descripcion="Consultar listados y estadísticas de apoderados."
          link="/herramientas/informes"
        />

        <Card
          icon="📦"
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
      className={`molsan-tool-card group relative overflow-hidden
 
 
 
 
 p-5
 
 
 
 
 

 ${
 destacado
 ? ""
 : ""
 }`}
    >

      {/* Línea superior */}

      <div
        className={`absolute inset-x-0 top-0 h-px
 
 ${
 destacado
 ? ""
 : ""
 }`}
      />

      <div className="flex items-start gap-4">

        {/* ICONO */}

        <div
          className={`molsan-tool-icon flex h-12 w-12 shrink-0
 items-center justify-center
 
 
 
 
 
 ${
 destacado
 ? ""
 : ""
 }`}
        >
          {icon}
        </div>


        {/* CONTENIDO */}

        <div className="min-w-0 flex-1">

          <h2>
            {titulo}
          </h2>

          <p className="mt-1.5">
            {descripcion}
          </p>

        </div>


        {/* FLECHA */}

        <div
          className="mt-1"
        >
          →
        </div>

      </div>

    </Link>
  );
}
