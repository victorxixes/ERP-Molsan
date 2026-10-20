import { Link } from "react-router-dom";

/**
 * UTILIDADES — MOLSAN ERP PREMIUM 2027
 */

export default function Utilidades() {
  return (
    <div className="min-h-full space-y-7 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl shadow-sm">⚙️</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Utilidades del sistema</h1>
            <p className="mt-1 text-sm text-slate-500">Gestiona los catálogos, importaciones y herramientas de trabajo directamente desde el ERP.</p>
          </div>
        </div>
      </header>

      <Grupo titulo="Maestros y catálogos" descripcion="Datos comunes utilizados por los expedientes y los procesos de la gestoría.">
        <Card icon="🏘️" titulo="Municipios" descripcion="Comunidades autónomas, provincias y municipios." link="/herramientas/municipios" />
        <Card icon="🏦" titulo="Entidades bancarias" descripcion="Entidades, códigos europeos, LEI, categorías y direcciones." link="/herramientas/entidades-bancarias" />
        <Card icon="🏛️" titulo="Oficinas liquidadoras" descripcion="Gestionar oficinas liquidadoras y sus datos asociados." link="/herramientas/oficinas-liquidadoras" />
        <Card icon="📚" titulo="Registros de la propiedad" descripcion="Gestionar registros de la propiedad." link="/herramientas/registros-propiedad" />
        <Card icon="📋" titulo="Acciones del expediente" descripcion="Catálogo de acciones y actividades de los expedientes." link="/herramientas/acciones-expediente" />
        <Card icon="🏠" titulo="Tipos de carga hipotecaria" descripcion="Catálogo de tipos de carga hipotecaria." link="/herramientas/tipos-carga-hipotecaria" />
        <Card icon="🧾" titulo="Tipos de conceptos de gastos" descripcion="Catálogo de conceptos de gastos." link="/herramientas/tipos-concepto-gastos" />
      </Grupo>

      <Grupo titulo="Importaciones y datos" descripcion="Carga información desde los ficheros de trabajo autorizados.">
        <Card icon="📥" titulo="Importar CTN" descripcion="Importar un Excel con información de notarías." link="/herramientas/importar-ctn" />
        <Card icon="📦" titulo="Importador ABSIS" descripcion="Importar expedientes desde el Excel matriz ABSIS." link="/herramientas/importador-absis" destacado />
      </Grupo>

      <Grupo titulo="Gestión de expedientes" descripcion="Acciones manuales y controladas sobre la asignación y el seguimiento de los expedientes.">
        <Card icon="🔁" titulo="Cambiar gestor de expediente" descripcion="Busca un expediente por su número y reasígnalo manualmente a otro gestor, dejando constancia del cambio." link="/herramientas/utilidades/cambiar-gestor" />
      </Grupo>

      <Grupo titulo="Administración, seguridad y supervisión" descripcion="Accesos directos para administrar usuarios y revisar el estado operativo del ERP.">
        <Card icon="🛡️" titulo="Seguridad" descripcion="Administrar usuarios, roles, módulos y permisos." link="/seguridad" />
        <Card icon="🧾" titulo="Auditoría" descripcion="Consultar los eventos de auditoría disponibles para tu perfil." link="/auditoria" />
        <Card icon="📜" titulo="Logs del sistema" descripcion="Revisar registros y errores registrados por la aplicación." link="/logs" />
        <Card icon="🖥️" titulo="Panel técnico" descripcion="Acceder a los paneles de supervisión del sistema y tiempo real." link="/paneltecnico" />
        <Card icon="📈" titulo="Informes" descripcion="Consultar informes y estadísticas operativas." link="/informes" />
      </Grupo>

      <Grupo titulo="Intranet y administración" descripcion="Publicación de información y herramientas de soporte integradas en el ERP.">
        <Card icon="📰" titulo="Crear noticia" descripcion="Publicar noticias para los usuarios de la intranet." link="/herramientas/utilidades/crear-noticia" />
        <Card icon="📄" titulo="Subir documento" descripcion="Publicar documentos en la intranet." link="/herramientas/utilidades/subir-documento" />
        <Card icon="🛠️" titulo="Mantenimiento técnico" descripcion="Diagnóstico de base de datos, revisión de estructura y tareas técnicas controladas desde el ERP. También disponible en el menú Más." link="/herramientas/mantenimiento-tecnico" />
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, descripcion, children }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">{titulo}</h2>
        <p className="text-sm text-slate-500">{descripcion}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
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
