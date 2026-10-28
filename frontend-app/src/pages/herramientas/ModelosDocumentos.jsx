import { useState } from "react";
import { Link } from "react-router-dom";

const documentos = [
  {
    id: "liquidacion",
    titulo: "Hoja de liquidación",
    subtitulo: "Cierre del expediente",
    estado: "Plantilla base implementada",
    color: "emerald",
    descripcion: "Resumen de los datos identificativos y económicos del expediente. Se genera automáticamente al preparar el cierre documental digital.",
    campos: ["Número de expediente", "Titular y NIF/CIF", "Notario", "Fecha de liquidación", "Provisión inicial", "Saldo real", "Saldo disponible", "Estado del expediente"],
  },
  {
    id: "provision",
    titulo: "Hoja de provisión de fondos",
    subtitulo: "Provisiones de fondos",
    estado: "Plantilla existente",
    color: "blue",
    descripcion: "La generación actual de provisiones y sus cálculos siguen en el módulo de Provisiones de fondos.",
    campos: ["Datos del cliente", "Oficina de origen", "Garantías y conceptos", "Importes calculados", "Observaciones"],
    link: "/provisiones-fondos",
  },
  {
    id: "factura",
    titulo: "Factura de honorarios de gestoría",
    subtitulo: "Facturación de honorarios",
    estado: "Diseño pendiente de completar",
    color: "amber",
    descripcion: "El diseño definitivo de la factura oficial y su ajuste al modelo Word se terminarán en la siguiente sesión. Se conserva la numeración oficial existente.",
    campos: ["Número de factura", "Expediente", "Datos fiscales del cliente", "Base imponible e impuestos", "Totales"],
    link: "/herramientas/honorarios-gestoria",
  },
];

export default function ModelosDocumentos() {
  const [seleccionado, setSeleccionado] = useState("liquidacion");
  const actual = documentos.find((d) => d.id === seleccionado) || documentos[0];

  return (
    <main className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl">📑</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">MOLSAN ERP · UTILIDADES</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Modelos documentos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Punto central para revisar las plantillas documentales. Esta herramienta centraliza el diseño; los catálogos económicos y las reglas de cálculo permanecen en sus módulos actuales.</p>
          </div>
          <Link to="/herramientas/utilidades" className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">← Utilidades</Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {documentos.map((doc) => (
          <button key={doc.id} type="button" onClick={() => setSeleccionado(doc.id)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${seleccionado === doc.id ? "border-blue-300 bg-blue-50/70 shadow-md" : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="text-2xl">{doc.id === "liquidacion" ? "🧾" : doc.id === "provision" ? "💶" : "📄"}</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${doc.color === "emerald" ? "bg-emerald-100 text-emerald-800" : doc.color === "blue" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>{doc.estado}</span>
            </div>
            <h2 className="mt-3 font-bold text-slate-900">{doc.titulo}</h2>
            <p className="mt-1 text-xs text-slate-500">{doc.subtitulo}</p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Modelo seleccionado</p><h2 className="mt-1 text-xl font-bold text-slate-900">{actual.titulo}</h2></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{actual.subtitulo}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{actual.descripcion}</p>
          <h3 className="mt-5 text-sm font-bold text-slate-800">Contenido previsto de la plantilla</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {actual.campos.map((campo) => <li key={campo} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm text-slate-700"><span className="text-emerald-600">✓</span><span>{campo}</span></li>)}
          </ul>
          {actual.link && <Link to={actual.link} className="mt-5 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Abrir módulo actual →</Link>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4 sm:p-5">
          <div className="mx-auto max-w-[440px] border border-slate-200 bg-white p-6 shadow-md sm:p-8">
            <div className="border-b-2 border-slate-900 pb-4">
              <p className="text-[10px] font-bold tracking-[0.22em] text-blue-800">MOLSAN</p>
              <h3 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900">{actual.id === "liquidacion" ? "HOJA DE LIQUIDACIÓN" : actual.titulo.toUpperCase()}</h3>
              <p className="mt-1 text-xs text-slate-500">Documento de gestión de expediente</p>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Expediente</p><p className="mt-1 text-sm font-bold text-slate-800">[Número de expediente]</p></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-100 p-3"><p className="text-[9px] font-bold uppercase text-slate-500">Titular</p><p className="mt-1 text-xs font-semibold text-slate-700">[Nombre del titular]</p></div>
                <div className="rounded-lg border border-slate-100 p-3"><p className="text-[9px] font-bold uppercase text-slate-500">NIF / CIF</p><p className="mt-1 text-xs font-semibold text-slate-700">[Identificación]</p></div>
              </div>
              <p className="pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Resumen económico</p>
              {["Provisión inicial", "Saldo real", "Saldo disponible"].map((campo) => <div key={campo} className="flex items-center justify-between border-b border-slate-100 py-2 text-xs"><span className="text-slate-600">{campo}</span><strong className="text-slate-900">[Importe] €</strong></div>)}
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-blue-800">Estado del expediente</p><p className="mt-1 text-xs font-semibold text-slate-800">[Estado actual]</p></div>
              <div className="pt-4 text-[9px] leading-4 text-slate-400">Vista esquemática de la plantilla. Los datos se rellenarán con la información guardada del expediente al generar el PDF.</div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">Vista orientativa del diseño; no es un PDF real ni modifica expedientes.</p>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950">
        <strong>Importante:</strong> esta primera entrega centraliza el acceso y deja definida la estructura visual de la Hoja de liquidación. La edición avanzada de plantillas y la adaptación definitiva de la factura se continuarán mañana. Las tarifas, tramos, importes y cálculos existentes no se mueven ni se modifican.
      </div>
    </main>
  );
}
