import { Link } from "react-router-dom";
import MolsanIcon from "../../components/ui/MolsanIcon";

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
    <div className="molsan-page-stack herramientas-home-premium min-h-full animate-fadeIn">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark"><MolsanIcon name="tools" size={42} bare /></div>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
            <h1 className="molsan-page-header__title">Herramientas</h1>
            <p className="molsan-page-header__description">Herramientas y procesos auxiliares del sistema.</p>
          </div>
        </div>
      </header>


      {/* =====================================================
          TARJETAS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

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
            ? "border-blue-200/80 bg-blue-50/50"
            : "border-slate-200/80"
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
              ? "bg-gradient-to-r from-transparent via-blue-500/70 to-transparent opacity-100"
              : "bg-gradient-to-r from-transparent via-blue-400/40 to-transparent opacity-0 group-hover:opacity-100"
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
                ? "bg-blue-100 border-blue-200 text-blue-700"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }
          `}
        >
          <MolsanIcon name={icon} size={46} />
        </div>


        {/* CONTENIDO */}

        <div className="min-w-0 flex-1">

          <h2 className="text-base font-semibold text-slate-800">
            {titulo}
          </h2>

          <p className="mt-1.5 text-sm leading-5 text-slate-500">
            {descripcion}
          </p>

        </div>


        {/* FLECHA */}

        <div
          className="
            mt-1
            text-slate-300
            transition-all duration-300
            group-hover:translate-x-1
            group-hover:text-blue-500
          "
        >
          →
        </div>

      </div>

    </Link>
  );
}
