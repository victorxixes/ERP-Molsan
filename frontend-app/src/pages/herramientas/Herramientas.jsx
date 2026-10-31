import { Link } from "react-router-dom";

import "../../css/ComponentesOperativosPremium.css";

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
    <div className="herramientas-home-premium min-h-full p-4 sm:p-6 lg:p-8 space-y-6">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div
        className="relative overflow-hidden
 
 
 
 
 
 p-6 sm:p-7"
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
        />

        <div className="relative flex items-center gap-4">

          <div
            className="flex h-12 w-12 shrink-0
 items-center justify-center"
          >
            🛠️
          </div>

          <div>
            <h1 className="">
              Herramientas
            </h1>

            <p className="mt-1">
              Herramientas y procesos auxiliares del sistema.
            </p>
          </div>

        </div>
      </div>


      {/* =====================================================
          TARJETAS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

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
      className={`
        group relative overflow-hidden
        rounded-[22px]
        border
        bg-white/80
        backdrop-blur-xl
        p-5
        shadow-[0_12px_35px_rgba(15,23,42,0.07)]
        transition-all duration-300
        hover:-translate-y-1
        hover:shadow-[0_20px_45px_rgba(15,23,42,0.11)]
        active:scale-[0.98]

        ${
          destacado
            ? ""
            : ""
        }
      `}
    >

      {/* Línea superior */}

      <div
        className={`
          absolute inset-x-0 top-0 h-px
          transition-opacity
          ${
            destacado
              ? ""
              : ""
          }
        `}
      />

      <div className="flex items-start gap-4">

        {/* ICONO */}

        <div
          className={`
            flex h-12 w-12 shrink-0
            items-center justify-center
            rounded-2xl
            border
            text-xl
            transition-all duration-300
            group-hover:scale-105
            ${
              destacado
                ? ""
                : ""
            }
          `}
        >
          {icon}
        </div>


        {/* CONTENIDO */}

        <div className="min-w-0 flex-1">

          <h2 className="">
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
