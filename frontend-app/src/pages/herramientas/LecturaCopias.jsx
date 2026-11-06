import MolsanIcon from "../../components/ui/MolsanIcon";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
    <main className="herramienta-operativa-premium herramientas-subpagina-premium min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <MolsanPageHeader mark="LC" title="Lectura copias" description="Selecciona la fecha de recepción y ejecuta el procesamiento de ejemplo para visualizar el progreso y el resultado esperado de la futura integración." actions={<Link to="/herramientas/utilidades" className="text-xs font-bold text-[var(--molsan-primary)] hover:underline">← Volver a Utilidades</Link>}/>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
        <div className="rounded-3xl border border-[var(--molsan-border)] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold text-[var(--molsan-primary)]">Parámetros de procesamiento</h2>
          <p className="mt-1 text-sm text-[var(--molsan-text-secondary)]">Elige el día que se utilizaría para buscar las copias recibidas.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Fecha de recepción</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={procesando} className="w-full rounded-xl border border-[var(--molsan-border-strong)] bg-white px-3.5 py-3 text-sm font-semibold text-[var(--molsan-text)] outline-none focus:border-[var(--molsan-border-strong)] focus:ring-4 focus:ring-[var(--molsan-primary-soft)] disabled:bg-[var(--molsan-table-head)]" />
            </label>
            <button type="button" onClick={procesar} disabled={!fecha || procesando} className="rounded-xl bg-[var(--molsan-primary)] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[var(--molsan-primary)] disabled:cursor-not-allowed disabled:opacity-50">
              {procesando ? "Procesando…" : <><MolsanIcon name="play" size={14} tone="inherit" /> Procesar</>}
            </button>
          </div>
          <div className="mt-6 rounded-2xl border border-[var(--molsan-border)] bg-[var(--molsan-surface-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[var(--molsan-text)]">{procesando ? "Procesando ficheros y correos…" : procesado ? "Procesamiento de demostración completado" : "Estado del proceso"}</span>
              <span className="text-sm font-extrabold tabular-nums text-[var(--molsan-primary)]">{progreso}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-200" style={{ width: `${progreso}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--molsan-text-secondary)]">{procesando ? "Simulación visual del avance. No se conecta a ningún buzón, API ni script." : procesado ? "Se han mostrado registros de ejemplo para ilustrar la futura salida." : "Pulsa «Procesar» para iniciar una simulación del progreso."}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--molsan-border)] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold text-[var(--molsan-primary)]">Volumen de entrada</h2>
          <p className="mt-1 text-sm text-[var(--molsan-text-secondary)]">Número de ficheros / emails que se revisarían.</p>
          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">N.º de ficheros / emails</span>
            <input type="number" min="0" value={ficherosEmails} onChange={(e) => setFicherosEmails(e.target.value)} disabled={procesando} className="w-full rounded-xl border border-[var(--molsan-border-strong)] bg-white px-3.5 py-3 text-2xl font-extrabold tabular-nums text-[var(--molsan-primary)] outline-none focus:border-[var(--molsan-border-strong)] focus:ring-4 focus:ring-[var(--molsan-primary-soft)] disabled:bg-[var(--molsan-table-head)]" />
          </label>
          <div className="mt-4 rounded-xl bg-[var(--molsan-primary-soft)] px-4 py-3">
            <p className="text-xs font-semibold text-[var(--molsan-primary)]">Valor ficticio para la maqueta</p>
            <p className="mt-1 text-xs text-[var(--molsan-primary)]">El script real deberá informar del número detectado y procesado.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--molsan-border)] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[var(--molsan-border)] bg-[var(--molsan-surface-soft)] p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--molsan-primary)]">Resultado</p>
            <h2 className="mt-1 text-lg font-extrabold text-[var(--molsan-primary)]">Copias recibidas</h2>
            <p className="mt-1 text-xs text-[var(--molsan-text-secondary)]">La tabla muestra datos de ejemplo; no son expedientes obtenidos del sistema.</p>
          </div>
          <span className="inline-flex w-fit rounded-full border border-[var(--molsan-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--molsan-text-secondary)]">{filas.length} registros de ejemplo</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-white text-[10px] uppercase tracking-wide text-[var(--molsan-text-secondary)]">
              <tr>
                {["Expediente", "Fecha recibida", "Contrato", "Finca", "Observaciones"].map((columna) => <th key={columna} className="border-b border-[var(--molsan-border)] px-4 py-3 font-extrabold">{columna}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center"><div><MolsanIcon name="file" size={32} tone="ocean" /></div><p className="mt-2 font-bold text-[var(--molsan-text)]">{procesando ? "Preparando resultados de ejemplo…" : "Todavía no hay resultados"}</p><p className="mt-1 text-xs text-[var(--molsan-text-secondary)]">Selecciona una fecha y pulsa «Procesar» para ver la maqueta.</p></td></tr>
              ) : filas.map((fila, index) => (
                <tr key={fila.expediente} className="border-b border-[var(--molsan-border-light)] align-top last:border-0 hover:bg-[var(--molsan-surface-soft)]">
                  <td className="whitespace-nowrap px-4 py-4 font-extrabold text-[var(--molsan-primary)]">{fila.expediente}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-[var(--molsan-text-secondary)]">{fila.fecha}</td>
                  <td className="px-4 py-4 font-semibold text-[var(--molsan-text)]">{fila.contrato}</td>
                  <td className="px-4 py-4 text-[var(--molsan-text-secondary)]">{fila.finca}</td>
                  <td className="min-w-[260px] px-4 py-4 text-[var(--molsan-text-secondary)]">{fila.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-[var(--molsan-border)] bg-[var(--molsan-surface-soft)] px-4 py-3 text-xs text-[var(--molsan-text-secondary)]">Pantalla de demostración: la lectura real, la API y el script de integración quedan pendientes de implementación.</footer>
      </section>
    </main>
  );
}
