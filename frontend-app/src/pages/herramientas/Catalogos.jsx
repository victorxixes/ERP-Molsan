import { Link } from "react-router-dom";
import "../../css/HerramientasPremium.css";

/**
 * CENTRAL DE CATÁLOGOS — MOLSAN ERP PREMIUM 2027 · GLASS LUXE
 * Reúne las pantallas de mantenimiento de datos maestros existentes.
 * Cada tarjeta conserva la ruta y el origen de datos de su catálogo.
 */
const CATALOGOS = [
  {
    icon: "🖋️",
    titulo: "Firmas y plantillas de email",
    descripcion: "Configura el pie corporativo y la firma automática vinculada a la ficha del empleado.",
    ruta: "/catalogos/firmas-email",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "✉️",
    titulo: "Correspondencia tipificada",
    descripcion: "Crea plantillas de email por proceso y genera mensajes con datos reales de la ficha del expediente.",
    ruta: "/catalogos/correspondencia-tipificada",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "🔗",
    titulo: "Catálogo ABSIS",
    descripcion: "Estados de expediente, productos GTG, actividades, operaciones y defectos.",
    ruta: "/catalogos/absis",
    grupo: "Integraciones y catálogos técnicos",
    destacado: true,
  },
  {
    icon: "🏦",
    titulo: "Entidades bancarias",
    descripcion: "Entidades, códigos europeos, LEI, categorías y direcciones.",
    ruta: "/herramientas/entidades-bancarias",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏘️",
    titulo: "Municipios",
    descripcion: "Comunidades autónomas, provincias y municipios.",
    ruta: "/herramientas/municipios",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏛️",
    titulo: "Registros de la propiedad",
    descripcion: "Datos y mantenimiento de los registros de la propiedad.",
    ruta: "/herramientas/registros-propiedad",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏢",
    titulo: "Oficinas liquidadoras",
    descripcion: "Oficinas liquidadoras y sus datos asociados.",
    ruta: "/herramientas/oficinas-liquidadoras",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏢",
    titulo: "Catálogo de oficinas",
    descripcion: "Busca oficinas e importa y actualiza sus datos desde tu Excel.",
    ruta: "/catalogos/oficinas",
    grupo: "Datos territoriales y entidades",
    destacado: true,
  },
  {
    icon: "🧾",
    titulo: "Tabla Provisiones de fondos",
    descripcion: "Configura importes de referencia y criterios iniciales de impuestos por operación y territorio.",
    ruta: "/catalogos/provisiones-fondos",
    grupo: "Catálogos económicos",
    destacado: true,
  },
  {
    icon: "🧮",
    titulo: "Tipos impositivos",
    descripcion: "Gestiona tipos de IVA, IGIC y retenciones; crea, edita y desactiva porcentajes utilizados por las órdenes de pago.",
    ruta: "/catalogos/tipos-impositivos",
    grupo: "Catálogos económicos",
    destacado: true,
  },
  {
    icon: "💶",
    titulo: "Honorarios de gestoría",
    descripcion: "Tarifas con base imponible, IVA o IGIC y total calculado.",
    ruta: "/herramientas/honorarios-gestoria",
    grupo: "Catálogos económicos",
    destacado: true,
  },
  {
    icon: "🏠",
    titulo: "Tipos de carga hipotecaria",
    descripcion: "Catálogo de tipos de carga hipotecaria.",
    ruta: "/herramientas/tipos-carga-hipotecaria",
    grupo: "Catálogos económicos",
  },
  {
    icon: "🧾",
    titulo: "Tipos de conceptos de gastos",
    descripcion: "Conceptos disponibles para clasificar gastos.",
    ruta: "/herramientas/tipos-concepto-gastos",
    grupo: "Catálogos económicos",
  },
  {
    icon: "🚚",
    titulo: "Mensajería · Servicios y tarifas",
    descripcion: "Mantén el catálogo interno de servicios, tarifas, suplementos e impuestos de mensajería.",
    ruta: "/catalogos/mensajeria-servicios",
    grupo: "Catálogos económicos",
    destacado: true,
    avisoConstruccion: true,
  },
  {
    icon: "🕒",
    titulo: "Fichajes · Tipos de ausencia",
    descripcion: "Configura los motivos de ausencia y si cada uno requiere justificante.",
    ruta: "/catalogos/fichajes",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "🗂️",
    titulo: "Maestros generales",
    descripcion: "Acceso al catálogo general de datos maestros del ERP.",
    ruta: "/maestros",
    grupo: "Catálogos operativos",
  },
  {
    icon: "🗃️",
    titulo: "Tipos de expediente",
    descripcion: "Mantén los tipos de expediente, incluidos los tipos históricos de provisiones fuera del circuito GTG.",
    ruta: "/herramientas/tipos-expediente",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "📋",
    titulo: "Acciones del expediente",
    descripcion: "Acciones y actividades utilizadas en el circuito de expedientes.",
    ruta: "/herramientas/acciones-expediente",
    grupo: "Catálogos operativos",
  },
];

const GRUPOS = [
  "Integraciones y catálogos técnicos",
  "Datos territoriales y entidades",
  "Catálogos económicos",
  "Catálogos operativos",
];

export default function Catalogos() {
  return (
    <main className="molsan-page-stack catalogos-premium-page min-h-full animate-fadeIn">
      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true">▦</div>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
            <h1 className="molsan-page-header__title">Catálogos</h1>
            <p className="molsan-page-header__description">Centraliza los datos maestros que utilizan los módulos y procesos de la gestoría.</p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
        Los catálogos conservan sus datos y pantallas actuales. Esta sección los reúne en un único acceso para facilitar su mantenimiento.
      </div>

      {GRUPOS.map((grupo) => {
        const items = CATALOGOS.filter((item) => item.grupo === grupo);
        return (
          <section key={grupo} className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-slate-800">{grupo}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.ruta}
                  to={item.ruta}
                  className="group erp-card relative overflow-hidden p-5 transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${item.destacado ? "border-blue-200 bg-blue-100" : "border-slate-200 bg-slate-50"}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-800">{item.titulo}</h3>
                      <p className="mt-1.5 text-sm leading-5 text-slate-500">{item.descripcion}</p>
                      {item.avisoConstruccion && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                            En construcción
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            Acceso disponible
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-500">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
