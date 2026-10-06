import { Link } from "react-router-dom";

/**
 * UTILIDADES — MOLSAN ERP PREMIUM 2027
 */

export default function Utilidades() {
  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div
        className="
          relative overflow-hidden
          rounded-[24px]
          border border-slate-200/80
          bg-white/80
          backdrop-blur-xl
          shadow-[0_18px_50px_rgba(15,23,42,0.08)]
          p-6 sm:p-7
        "
      >

        <div
          className="
            absolute inset-x-0 top-0 h-px
            bg-gradient-to-r
            from-transparent
            via-blue-400/60
            to-transparent
          "
        />

        <div className="relative flex items-center gap-4">

          <div
            className="
              flex h-12 w-12 shrink-0
              items-center justify-center
              rounded-2xl
              bg-indigo-50
              border border-indigo-100
              text-2xl
              shadow-sm
            "
          >
            ⚙️
          </div>

          <div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">
              Utilidades del sistema
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Procesos auxiliares, maestros, importaciones, documentos e informes.
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* ===================================================
            MUNICIPIOS
        =================================================== */}

        <Card
          icon="🏘️"
          titulo="Municipios"
          descripcion="Gestionar comunidades autónomas, provincias y municipios."
          link="/herramientas/municipios"
        />

        {/* ===================================================
            ENTIDADES BANCARIAS
        =================================================== */}

        <Card
          icon="🏦"
          titulo="Entidades Bancarias"
          descripcion="Gestión de entidades bancarias reguladas en España"
          link="/herramientas/EntidadesBancarias"
        />

        {/* ===================================================
            OFICINAS LIQUIDADORAS
        =================================================== */}

        <Card
          icon="🏛️"
          titulo="Oficinas Liquidadoras"
          descripcion="Gestionar las oficinas liquidadoras y sus datos asociados."
          link="/herramientas/oficinas-liquidadoras"
        />


        {/* ===================================================
            REGISTROS DE LA PROPIEDAD
        =================================================== */}

        <Card
          icon="📚"
          titulo="Registros de la Propiedad"
          descripcion="Gestionar registros de la propiedad y su información."
          link="/herramientas/utilidades/registros-propiedad"
        />


        {/* ===================================================
            IMPORTAR CTN
        =================================================== */}

        <Card
          icon="📥"
          titulo="Importar CTN"
          descripcion="Importar fichero Excel con información de notarías."
          link="/herramientas/importar-ctn"
        />


        {/* ===================================================
            CREAR NOTICIA
        =================================================== */}

        <Card
          icon="📰"
          titulo="Crear noticia"
          descripcion="Publicar una noticia en la intranet."
          link="/herramientas/utilidades/crear-noticia"
        />


        {/* ===================================================
            SUBIR DOCUMENTO
        =================================================== */}

        <Card
          icon="📄"
          titulo="Subir documento"
          descripcion="Subir documentos a la intranet."
          link="/herramientas/utilidades/subir-documento"
        />


        {/* ===================================================
            INFORMES
        =================================================== */}

        <Card
          icon="📊"
          titulo="Informes"
          descripcion="Listados y estadísticas de apoderados."
          link="/herramientas/informes"
        />


        {/* ===================================================
            IMPORTADOR ABSIS
        =================================================== */}

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
            ? "border-blue-200/80 bg-blue-50/50"
            : "border-slate-200/80"
        }
      `}
    >

      {/* Línea superior */}

      <div
        className="
          absolute inset-x-0 top-0 h-px
          bg-gradient-to-r
          from-transparent
          via-blue-400/50
          to-transparent
          opacity-0
          group-hover:opacity-100
          transition-opacity
        "
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
                ? "bg-blue-100 border-blue-200"
                : "bg-slate-50 border-slate-200"
            }
          `}
        >
          {icon}
        </div>


        {/* TEXTO */}

        <div className="flex-1 min-w-0">

          <h2 className="text-base font-semibold text-slate-800">
            {titulo}
          </h2>

          <p className="mt-1.5 text-sm leading-5 text-slate-500">
            {descripcion}
          </p>

        </div>


        {/* FLECHA */}

        <span
          className="
            text-slate-300
            group-hover:text-blue-500
            group-hover:translate-x-1
            transition-all
          "
        >
          →
        </span>

      </div>

    </Link>
  );
}
