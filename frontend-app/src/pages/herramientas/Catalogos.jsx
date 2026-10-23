import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../css/HerramientasPremium.css";

/**
 * Central de catálogos.
 * Los enlaces apuntan a los mantenedores existentes: no crea duplicados ni
 * cambia sus datos, rutas o reglas de negocio.
 */
const CATALOGOS = [
  {
    icon: "🏦",
    titulo: "Entidades bancarias",
    descripcion: "Entidades, códigos europeos, LEI, categorías y direcciones.",
    ruta: "/herramientas/entidades-bancarias",
    grupo: "Entidades y territorio",
    palabrasClave: "bancos entidades financieras sucesiones LEI",
  },
  {
    icon: "🏘️",
    titulo: "Municipios",
    descripcion: "Comunidades autónomas, provincias y municipios.",
    ruta: "/herramientas/municipios",
    grupo: "Entidades y territorio",
    palabrasClave: "comunidades autonomas provincias poblaciones localidades",
  },
  {
    icon: "🏛️",
    titulo: "Registros de la propiedad",
    descripcion: "Datos y mantenimiento de los registros de la propiedad.",
    ruta: "/herramientas/registros-propiedad",
    grupo: "Entidades y territorio",
    palabrasClave: "registro registradores fincas",
  },
  {
    icon: "🏢",
    titulo: "Oficinas liquidadoras",
    descripcion: "Oficinas liquidadoras y sus datos asociados.",
    ruta: "/herramientas/oficinas-liquidadoras",
    grupo: "Entidades y territorio",
    palabrasClave: "oficinas liquidacion impuestos ubicacion contacto",
  },
  {
    icon: "💶",
    titulo: "Honorarios de gestoría",
    descripcion: "Tarifas, base imponible, IVA o IGIC y total calculado.",
    ruta: "/herramientas/honorarios-gestoria",
    grupo: "Economía y gastos",
    destacado: true,
    palabrasClave: "precios tarifas honorarios iva igic importes provisiones",
  },
  {
    icon: "🏠",
    titulo: "Tipos de carga hipotecaria",
    descripcion: "Tipos de carga utilizados en la información hipotecaria.",
    ruta: "/herramientas/tipos-carga-hipotecaria",
    grupo: "Economía y gastos",
    palabrasClave: "hipoteca cargas gravamen finca",
  },
  {
    icon: "🧾",
    titulo: "Tipos de conceptos de gastos",
    descripcion: "Conceptos disponibles para clasificar gastos.",
    ruta: "/herramientas/tipos-concepto-gastos",
    grupo: "Economía y gastos",
    palabrasClave: "gastos conceptos facturas costes",
  },
  {
    icon: "📋",
    titulo: "Acciones del expediente",
    descripcion: "Acciones y actividades utilizadas en el circuito de expedientes.",
    ruta: "/herramientas/acciones-expediente",
    grupo: "Gestión de expedientes",
    palabrasClave: "actividades acciones departamentos secciones flujo",
  },
  {
    icon: "🗂️",
    titulo: "Maestros generales",
    descripcion: "Departamentos, secciones y cargos de la organización.",
    ruta: "/maestros",
    grupo: "Organización interna",
    palabrasClave: "organizacion empleados departamentos secciones cargos",
  },
];

const GRUPOS = [
  {
    nombre: "Entidades y territorio",
    descripcion: "Datos de referencia para entidades y ubicaciones.",
    icon: "🌍",
  },
  {
    nombre: "Economía y gastos",
    descripcion: "Tarifas y clasificaciones económicas.",
    icon: "💼",
  },
  {
    nombre: "Gestión de expedientes",
    descripcion: "Listas auxiliares que se usan en el trabajo diario.",
    icon: "📁",
  },
  {
    nombre: "Organización interna",
    descripcion: "Estructura organizativa de la gestoría.",
    icon: "👥",
  },
];

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export default function Catalogos() {
  const [busqueda, setBusqueda] = useState("");

  const catalogosFiltrados = useMemo(() => {
    const consulta = normalizar(busqueda);
    if (!consulta) return CATALOGOS;
    return CATALOGOS.filter((item) =>
      normalizar(
        [item.titulo, item.descripcion, item.grupo, item.palabrasClave].join(" ")
      ).includes(consulta)
    );
  }, [busqueda]);

  return (
    <main className="catalogos-premium-page min-h-full space-y-7 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl shadow-sm">
              ▦
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                MOLSAN ERP · DATOS MAESTROS
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
                Catálogos
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Todos los mantenedores en un único lugar, organizados por área y preparados para crecer a medida que incorpores nuevos catálogos.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm">🗃️</span>
            <div>
              <p className="text-2xl font-bold leading-none text-slate-800">{catalogosFiltrados.length}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {busqueda ? "resultados" : "catálogos disponibles"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="buscar-catalogo" className="mb-2 block text-sm font-semibold text-slate-700">
          Buscar un catálogo
        </label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span>
          <input
            id="buscar-catalogo"
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Busca por nombre, área o palabra clave…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="absolute inset-y-0 right-3 my-auto text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Limpiar
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          La búsqueda no modifica datos: solo filtra los accesos que aparecen en esta pantalla.
        </p>
      </section>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
        Cada acceso conserva su pantalla, permisos y datos actuales. Los nuevos catálogos se podrán añadir aquí dentro de su área correspondiente, sin duplicar mantenedores.
      </div>

      {GRUPOS.map((grupo) => {
        const items = catalogosFiltrados.filter((item) => item.grupo === grupo.nombre);
        if (!items.length) return null;

        return (
          <section key={grupo.nombre} className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm">
                {grupo.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-slate-800">{grupo.nombre}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                    {items.length}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{grupo.descripcion}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.ruta}
                  to={item.ruta}
                  className={`group relative flex min-h-36 overflow-hidden rounded-[20px] border p-5 shadow-[0_8px_25px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_16px_35px_rgba(15,23,42,0.10)] focus:outline-none focus:ring-4 focus:ring-indigo-100 active:scale-[0.99] ${item.destacado ? "border-blue-200/80 bg-blue-50/70" : "border-slate-200/80 bg-white"}`}
                >
                  <div className="flex w-full items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${item.destacado ? "border-blue-200 bg-blue-100" : "border-slate-200 bg-slate-50"}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-800 group-hover:text-indigo-700">{item.titulo}</h3>
                      <p className="mt-1.5 text-sm leading-5 text-slate-500">{item.descripcion}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                        Abrir catálogo <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {catalogosFiltrados.length === 0 && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="text-3xl" aria-hidden="true">🔎</div>
          <h2 className="mt-3 text-lg font-semibold text-slate-800">No hay catálogos que coincidan</h2>
          <p className="mt-1 text-sm text-slate-500">Prueba con otro nombre o palabra clave.</p>
          <button
            type="button"
            onClick={() => setBusqueda("")}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Mostrar todos
          </button>
        </section>
      )}
    </main>
  );
}
