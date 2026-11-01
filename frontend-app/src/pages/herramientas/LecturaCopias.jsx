import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../css/ModalesHerramientasPremium.css";

const EJEMPLOS = [
  { expediente: "2026480925", fecha: "24/10/2026", contrato: "CT-2026-01842", finca: "Finca 1842 · Registro 3", observaciones: "Copia recibida; pendiente de validación" },
  { expediente: "2026481041", fecha: "24/10/2026", contrato: "CT-2026-01857", finca: "Finca 507 · Registro 1", observaciones: "Documento de ejemplo detectado" },
  { expediente: "2026481168", fecha: "24/10/2026", contrato: "CT-2026-01863", finca: "Finca 921 · Registro 2", observaciones: "Revisar datos antes de integrar" },
  { expediente: "2026481204", fecha: "24/10/2026", contrato: "CT-2026-01871", finca: "Finca 116 · Registro 4", observaciones: "Copia de demostración procesada" },
];

export default function LecturaCopias() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [procesado, setProcesado] = useState(false);
  const [ficherosEmails, setFicherosEmails] = useState("12");
  const [filas, setFilas] = useState([]);
  const timer = useRef(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const procesar = () => {
    if (!fecha || procesando) return;
    if (timer.current) window.clearInterval(timer.current);
    setProcesando(true);
    setProcesado(false);
    setProgreso(0);
    setFilas([]);
    let actual = 0;
    timer.current = window.setInterval(() => {
      actual = Math.min(actual + 10, 100);
      setProgreso(actual);
      if (actual >= 100) {
        window.clearInterval(timer.current);
        timer.current = null;
        setProcesando(false);
        setProcesado(true);
        setFilas(EJEMPLOS.map((fila) => ({ ...fila, fecha: fecha.split("-").reverse().join("/") })));
      }
    }, 180);
  };

  return (
    <main className="herramienta-operativa-premium herramientas-subpagina-premium min-h-full space-y-6">
      <header className="molsan-page-header">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <Link to="/herramientas/utilidades" className="text-xs font-bold text-blue-700 hover:underline">← Volver a Utilidades</Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Lectura copias</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Demostración · datos ficticios</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">Selecciona la fecha de recepción y ejecuta el procesamiento de ejemplo para visualizar el progreso y el resultado esperado de la futura integración.</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold text-slate-900">Parámetros de procesamiento</h2>
          <p className="mt-1 text-sm text-slate-500">Elige el día que se utilizaría para buscar las copias recibidas.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Fecha de recepción</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={procesando} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" />
            </label>
            <button type="button" onClick={procesar} disabled={!fecha || procesando} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {procesando ? "Procesando…" : "▶ Procesar"}
            </button>
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-700">{procesando ? "Procesando ficheros y correos…" : procesado ? "Procesamiento de demostración completado" : "Estado del proceso"}</span>
              <span className="text-sm font-extrabold tabular-nums text-blue-700">{progreso}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-200" style={{ width: `${progreso}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{procesando ? "Simulación visual del avance. No se conecta a ningún buzón, API ni script." : procesado ? "Se han mostrado registros de ejemplo para ilustrar la futura salida." : "Pulsa «Procesar» para iniciar una simulación del progreso."}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold text-slate-900">Volumen de entrada</h2>
          <p className="mt-1 text-sm text-slate-500">Número de ficheros / emails que se revisarían.</p>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">N.º de ficheros / emails</span>
            <input type="number" min="0" value={ficherosEmails} onChange={(e) => setFicherosEmails(e.target.value)} disabled={procesando} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-2xl font-extrabold tabular-nums text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" />
          </label>
          <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-3">
            <p className="text-xs font-semibold text-indigo-700">Valor ficticio para la maqueta</p>
            <p className="mt-1 text-xs text-indigo-600">El script real deberá informar del número detectado y procesado.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">Resultado</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Copias recibidas</h2>
            <p className="mt-1 text-xs text-slate-500">La tabla muestra datos de ejemplo; no son expedientes obtenidos del sistema.</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{filas.length} registros de ejemplo</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                {["Expediente", "Fecha recibida", "Contrato", "Finca", "Observaciones"].map((columna) => <th key={columna} className="border-b border-slate-200 px-4 py-3 font-extrabold">{columna}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center"><div className="text-3xl">📄</div><p className="mt-2 font-bold text-slate-700">{procesando ? "Preparando resultados de ejemplo…" : "Todavía no hay resultados"}</p><p className="mt-1 text-xs text-slate-500">Selecciona una fecha y pulsa «Procesar» para ver la maqueta.</p></td></tr>
              ) : filas.map((fila, index) => (
                <tr key={fila.expediente} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-4 font-extrabold text-blue-700">{fila.expediente}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{fila.fecha}</td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{fila.contrato}</td>
                  <td className="px-4 py-4 text-slate-600">{fila.finca}</td>
                  <td className="min-w-[260px] px-4 py-4 text-slate-600">{fila.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">Pantalla de demostración: la lectura real, la API y el script de integración quedan pendientes de implementación.</footer>
      </section>
    </main>
  );
}
