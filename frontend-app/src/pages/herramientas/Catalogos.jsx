import { Link } from "react-router-dom";
import "../../css/HerramientasPremium.css";

/**
 * CENTRAL DE CATÁLOGOS — MOLSAN ERP PREMIUM 2027 · GLASS LUXE
 * Reúne las pantallas de mantenimiento de datos maestros existentes.
 * Cada tarjeta conserva la ruta y el origen de datos de su catálogo.
 */
const CATALOGOS = [
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
    icon: "🗂️",
    titulo: "Maestros generales",
    descripcion: "Acceso al catálogo general de datos maestros del ERP.",
    ruta: "/maestros",
    grupo: "Catálogos operativos",
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
  "Datos territoriales y entidades",
  "Catálogos económicos",
  "Catálogos operativos",
];

export default function Catalogos() {
  return (
    <main className="catalogos-premium-page min-h-full space-y-7 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl shadow-sm">▦</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">MOLSAN ERP PREMIUM 2027</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Catálogos</h1>
            <p className="mt-1 text-sm text-slate-500">Centraliza los datos maestros que utilizan los módulos y procesos de la gestoría.</p>
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
                  className={`group relative overflow-hidden rounded-[22px] border p-5 shadow-[0_12px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.11)] active:scale-[0.98] ${item.destacado ? "border-blue-200/80 bg-blue-50/70" : "border-slate-200/80 bg-white/85"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${item.destacado ? "border-blue-200 bg-blue-100" : "border-slate-200 bg-slate-50"}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-800">{item.titulo}</h3>
                      <p className="mt-1.5 text-sm leading-5 text-slate-500">{item.descripcion}</p>
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
