import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

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
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="LC" title="Lectura copias" description="Demostración de procesamiento de copias recibidas con datos ficticios. No consulta buzones ni modifica expedientes." />
      <div className="molsan-filter-bar flex flex-wrap items-center justify-between gap-3 p-3"><Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link><span className="molsan-status-pill">Demostración · datos ficticios</span></div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
        <div className="erp-card p-5 sm:p-6">
          <h2>Parámetros de procesamiento</h2>
          <p className="mt-1">Elige el día que se utilizaría para buscar las copias recibidas.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block uppercase">Fecha de recepción</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={procesando} className="w-full px-3.5 py-3" />
            </label>
            <button type="button" onClick={procesar} disabled={!fecha || procesando} className="px-6 py-3">
              {procesando ? "Procesando…" : "▶ Procesar"}
            </button>
          </div>
          <div className="mt-6 p-4">
            <div className="flex items-center justify-between gap-3">
              <span>{procesando ? "Procesando ficheros y correos…" : procesado ? "Procesamiento de demostración completado" : "Estado del proceso"}</span>
              <span className="tabular-nums">{progreso}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden">
              <div className="h-full" style={{ width: `${progreso}%` }} />
            </div>
            <p className="mt-2">{procesando ? "Simulación visual del avance. No se conecta a ningún buzón, API ni script." : procesado ? "Se han mostrado registros de ejemplo para ilustrar la futura salida." : "Pulsa «Procesar» para iniciar una simulación del progreso."}</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h2>Volumen de entrada</h2>
          <p className="mt-1">Número de ficheros / emails que se revisarían.</p>
          <label className="mt-5 block">
            <span className="mb-1.5 block uppercase">N.º de ficheros / emails</span>
            <input type="number" min="0" value={ficherosEmails} onChange={(e) => setFicherosEmails(e.target.value)} disabled={procesando} className="w-full px-3.5 py-3 tabular-nums" />
          </label>
          <div className="mt-4 px-4 py-3">
            <p>Valor ficticio para la maqueta</p>
            <p className="mt-1">El script real deberá informar del número detectado y procesado.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden">
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="uppercase">Resultado</p>
            <h2 className="mt-1">Copias recibidas</h2>
            <p className="mt-1">La tabla muestra datos de ejemplo; no son expedientes obtenidos del sistema.</p>
          </div>
          <span className="inline-flex w-fit px-3 py-1.5">{filas.length} registros de ejemplo</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="uppercase">
              <tr>
                {["Expediente", "Fecha recibida", "Contrato", "Finca", "Observaciones"].map((columna) => <th key={columna} className="px-4 py-3">{columna}</th>)}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-14"><div>📄</div><p className="mt-2">{procesando ? "Preparando resultados de ejemplo…" : "Todavía no hay resultados"}</p><p className="mt-1">Selecciona una fecha y pulsa «Procesar» para ver la maqueta.</p></td></tr>
              ) : filas.map((fila, index) => (
                <tr key={fila.expediente} className="align-top">
                  <td className="whitespace-nowrap px-4 py-4">{fila.expediente}</td>
                  <td className="whitespace-nowrap px-4 py-4">{fila.fecha}</td>
                  <td className="px-4 py-4">{fila.contrato}</td>
                  <td className="px-4 py-4">{fila.finca}</td>
                  <td className="min-w-[260px] px-4 py-4">{fila.observaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="px-4 py-3">Pantalla de demostración: la lectura real, la API y el script de integración quedan pendientes de implementación.</footer>
      </section>
    </main>
  );
}
