import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../css/ModalesHerramientasPremium.css";

const ACTIVIDADES = [
  "Documentación previa",
  "Sede notarial",
  "Sede con protocolo",
  "Liquidación impuestos",
  "Tramitación inscripción",
  "Defectos registrales",
  "Liquidación y cierre",
];
const EJEMPLOS = [
  { expediente: "2026480925", oficina: "5316", alta: "12/09/2026", solicitante: "MOLSAN SERVICIOS", nif: "B12345678", contrato: "CT-2026-01842", finca: "Finca 1842 · Registro 3", actividad: "Documentación previa" },
  { expediente: "2026481041", oficina: "5316", alta: "15/09/2026", solicitante: "GESTIÓN PATRIMONIAL SL", nif: "B87654321", contrato: "CT-2026-01857", finca: "Finca 507 · Registro 1", actividad: "Sede notarial" },
  { expediente: "2026481168", oficina: "5316", alta: "19/09/2026", solicitante: "SERVICIOS FINANCIEROS SA", nif: "A12345674", contrato: "CT-2026-01863", finca: "Finca 921 · Registro 2", actividad: "Tramitación inscripción" },
  { expediente: "2026481204", oficina: "5316", alta: "22/09/2026", solicitante: "MOLSAN SERVICIOS", nif: "B12345678", contrato: "CT-2026-01871", finca: "Finca 116 · Registro 4", actividad: "Liquidación impuestos" },
];

export default function CambiosActividadAbsis() {
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [actividadDeseada, setActividadDeseada] = useState("");
  const [solicitudes, setSolicitudes] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [soloEjemplos, setSoloEjemplos] = useState(true);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return EJEMPLOS.filter((item) => [item.expediente, item.solicitante, item.nif, item.contrato].some((v) => v.toLowerCase().includes(q)));
  }, [busqueda]);

  const seleccionar = (expediente) => {
    setSeleccionado(expediente);
    setActividadDeseada("");
    setMensaje("");
    setError("");
  };

  const enviar = () => {
    setError("");
    setMensaje("");
    if (!seleccionado) { setError("Busca y selecciona primero un expediente."); return; }
    if (!actividadDeseada) { setError("Selecciona la actividad deseada."); return; }
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-ES");
    setSolicitudes((prev) => ({
      ...prev,
      [seleccionado.expediente]: {
        actividad: actividadDeseada,
        fechaInicio: fecha,
        estado: "Iniciado",
        fechaConsolidacion: "",
      },
    }));
    setMensaje("Solicitud ficticia registrada en esta pantalla. No se ha enviado a ABSIS: falta implementar la API/script y el mecanismo de confirmación.");
  };

  const fechaHoy = (fecha) => fecha || "—";

  return (
    <main className="molsan-page-stack herramienta-operativa-premium herramientas-subpagina-premium min-h-full">
      <header className="molsan-page-header">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <Link to="/herramientas/utilidades" className="text-xs font-bold text-blue-700 hover:underline">← Volver a Utilidades</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl">🔀</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Cambios de actividad ABSIS</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Demostración · datos ficticios</span>
            </div>
            <p className="mt-2 max-w-4xl text-sm text-slate-500">Busca un expediente, selecciona la actividad de destino y registra la solicitud. La conexión y la confirmación de ABSIS se implementarán más adelante por informática.</p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-extrabold text-slate-900">1. Buscar expediente</h2>
        <p className="mt-1 text-sm text-slate-500">Busca por número de expediente, solicitante, NIF o contrato. Los resultados que aparecen ahora son de ejemplo.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setSeleccionado(null); setActividadDeseada(""); setMensaje(""); setError(""); }} placeholder="Escribe el número de expediente, solicitante, NIF o contrato…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          <button type="button" onClick={() => { setError(""); setMensaje(""); if (!busqueda.trim()) setError("Introduce un criterio de búsqueda."); else if (resultados.length === 0) setError("No hay coincidencias en los expedientes ficticios disponibles."); }} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">Buscar</button>
        </div>
        {resultados.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Expediente</th><th className="px-4 py-3">Solicitante</th><th className="px-4 py-3">Contrato</th><th className="px-4 py-3">Actividad actual</th><th className="px-4 py-3">Acción</th></tr></thead>
              <tbody>{resultados.map((item) => <tr key={item.expediente} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-blue-700">{item.expediente}</td><td className="px-4 py-3 text-slate-700">{item.solicitante}</td><td className="px-4 py-3 text-slate-700">{item.contrato}</td><td className="px-4 py-3 text-slate-600">{item.actividad}</td><td className="px-4 py-3"><button type="button" onClick={() => seleccionar(item)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Seleccionar</button></td></tr>)}</tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">Aviso: esta búsqueda es local y solo consulta una lista de demostración; no consulta la base de datos real.</p>
      </section>

      {seleccionado && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 p-5">
            <h2 className="text-base font-extrabold text-slate-900">2. Revisar y solicitar cambio de actividad</h2>
            <p className="mt-1 text-sm text-slate-500">Revisa los datos del expediente y selecciona la nueva actividad antes de enviar la solicitud de demostración.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-xs">
              <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500"><tr>
                {["Expediente", "Oficina", "Fecha Alta", "Solicitante", "NIF", "Contrato", "Finca", "Actividad Actual", "Actividad deseada", "Fecha de inicio", "Estado", "Fecha consolidado en ABSIS"].map((col) => <th key={col} className="border-b border-slate-200 px-3 py-3 font-extrabold">{col}</th>)}
              </tr></thead>
              <tbody><tr className="align-top">
                <td className="border-b border-slate-100 px-3 py-4 font-extrabold text-blue-700">{seleccionado.expediente}</td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700">{seleccionado.oficina}</td>
                <td className="border-b border-slate-100 px-3 py-4 whitespace-nowrap text-slate-700">{seleccionado.alta}</td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700">{seleccionado.solicitante}</td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700">{seleccionado.nif}</td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700">{seleccionado.contrato}</td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700">{seleccionado.finca}</td>
                <td className="border-b border-slate-100 px-3 py-4 text-slate-700">{seleccionado.actividad}</td>
                <td className="border-b border-slate-100 px-3 py-4 min-w-[200px]"><select value={actividadDeseada} onChange={(e) => setActividadDeseada(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"><option value="">Selecciona actividad…</option>{ACTIVIDADES.filter((a) => a !== seleccionado.actividad).map((a) => <option key={a} value={a}>{a}</option>)}</select></td>
                <td className="border-b border-slate-100 px-3 py-4 whitespace-nowrap text-slate-700">{solicitudes[seleccionado.expediente]?.fechaInicio || "—"}</td>
                <td className="border-b border-slate-100 px-3 py-4 whitespace-nowrap"><span className={`inline-flex rounded-full border px-2 py-1 font-bold ${solicitudes[seleccionado.expediente]?.estado === "Consolidado en ABSIS" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : solicitudes[seleccionado.expediente]?.estado === "Iniciado" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{solicitudes[seleccionado.expediente]?.estado || "Pendiente"}</span></td>
                <td className="border-b border-slate-100 px-3 py-4 whitespace-nowrap text-slate-700">{fechaHoy(solicitudes[seleccionado.expediente]?.fechaConsolidacion)}</td>
              </tr></tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800"><strong>Aviso para informática:</strong> el botón debe conectarse a la API/script de ABSIS. Al enviar, registrar la fecha de inicio y el estado «Iniciado»; solo al recibir confirmación real de ABSIS cambiar a «Consolidado en ABSIS» y guardar la fecha de confirmación. En esta maqueta no se envía ninguna petición real.</div>
            <button type="button" onClick={enviar} disabled={!actividadDeseada} className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Enviar a ABSIS</button>
          </div>
        </section>
      )}

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {mensaje && <div role="status" className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{mensaje}</div>}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-600">
        <strong>Nota de implementación:</strong> la búsqueda, los expedientes, la fecha y los estados son ficticios y se guardan solo en memoria mientras la página está abierta. Informática deberá conectar la consulta con el origen real de expedientes ABSIS y desarrollar el envío y la confirmación para actualizar el estado automáticamente.
      </section>
    </main>
  );
}
