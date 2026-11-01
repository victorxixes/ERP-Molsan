import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

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
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="AB" title="Cambios de actividad ABSIS" description="Demostración de búsqueda y solicitud de cambio de actividad. No modifica datos reales ni conecta con ABSIS." />
      <div className="molsan-filter-bar flex flex-wrap items-center justify-between gap-3 p-3"><Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link><span className="molsan-status-pill">Demostración · datos ficticios</span></div>

      <section className="erp-card p-5 sm:p-6">
        <h2>1. Buscar expediente</h2>
        <p className="mt-1">Busca por número de expediente, solicitante, NIF o contrato. Los resultados que aparecen ahora son de ejemplo.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setSeleccionado(null); setActividadDeseada(""); setMensaje(""); setError(""); }} placeholder="Escribe el número de expediente, solicitante, NIF o contrato…" className="min-w-0 flex-1 px-4 py-3" />
          <button type="button" onClick={() => { setError(""); setMensaje(""); if (!busqueda.trim()) setError("Introduce un criterio de búsqueda."); else if (resultados.length === 0) setError("No hay coincidencias en los expedientes ficticios disponibles."); }} className="px-5 py-3">Buscar</button>
        </div>
        {resultados.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="uppercase"><tr><th className="px-4 py-3">Expediente</th><th className="px-4 py-3">Solicitante</th><th className="px-4 py-3">Contrato</th><th className="px-4 py-3">Actividad actual</th><th className="px-4 py-3">Acción</th></tr></thead>
              <tbody>{resultados.map((item) => <tr key={item.expediente}><td className="px-4 py-3">{item.expediente}</td><td className="px-4 py-3">{item.solicitante}</td><td className="px-4 py-3">{item.contrato}</td><td className="px-4 py-3">{item.actividad}</td><td className="px-4 py-3"><button type="button" onClick={() => seleccionar(item)} className="px-3 py-2">Seleccionar</button></td></tr>)}</tbody>
            </table>
          </div>
        )}
        <p className="mt-3">Aviso: esta búsqueda es local y solo consulta una lista de demostración; no consulta la base de datos real.</p>
      </section>

      {seleccionado && (
        <section className="erp-card overflow-hidden">
          <div className="p-5">
            <h2>2. Revisar y solicitar cambio de actividad</h2>
            <p className="mt-1">Revisa los datos del expediente y selecciona la nueva actividad antes de enviar la solicitud de demostración.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px]">
              <thead className="uppercase"><tr>
                {["Expediente", "Oficina", "Fecha Alta", "Solicitante", "NIF", "Contrato", "Finca", "Actividad Actual", "Actividad deseada", "Fecha de inicio", "Estado", "Fecha consolidado en ABSIS"].map((col) => <th key={col} className="px-3 py-3">{col}</th>)}
              </tr></thead>
              <tbody><tr className="align-top">
                <td className="px-3 py-4">{seleccionado.expediente}</td>
                <td className="px-3 py-4">{seleccionado.oficina}</td>
                <td className="px-3 py-4 whitespace-nowrap">{seleccionado.alta}</td>
                <td className="px-3 py-4">{seleccionado.solicitante}</td>
                <td className="px-3 py-4">{seleccionado.nif}</td>
                <td className="px-3 py-4">{seleccionado.contrato}</td>
                <td className="px-3 py-4">{seleccionado.finca}</td>
                <td className="px-3 py-4">{seleccionado.actividad}</td>
                <td className="px-3 py-4 min-w-[200px]"><select value={actividadDeseada} onChange={(e) => setActividadDeseada(e.target.value)} className="w-full px-3 py-2"><option value="">Selecciona actividad…</option>{ACTIVIDADES.filter((a) => a !== seleccionado.actividad).map((a) => <option key={a} value={a}>{a}</option>)}</select></td>
                <td className="px-3 py-4 whitespace-nowrap">{solicitudes[seleccionado.expediente]?.fechaInicio || "—"}</td>
                <td className="px-3 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 ${solicitudes[seleccionado.expediente]?.estado === "Consolidado en ABSIS" ? "" : solicitudes[seleccionado.expediente]?.estado === "Iniciado" ? "" : ""}`}>{solicitudes[seleccionado.expediente]?.estado || "Pendiente"}</span></td>
                <td className="px-3 py-4 whitespace-nowrap">{fechaHoy(solicitudes[seleccionado.expediente]?.fechaConsolidacion)}</td>
              </tr></tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl px-4 py-3"><strong>Aviso para informática:</strong> el botón debe conectarse a la API/script de ABSIS. Al enviar, registrar la fecha de inicio y el estado «Iniciado»; solo al recibir confirmación real de ABSIS cambiar a «Consolidado en ABSIS» y guardar la fecha de confirmación. En esta maqueta no se envía ninguna petición real.</div>
            <button type="button" onClick={enviar} disabled={!actividadDeseada} className="shrink-0 px-6 py-3">Enviar a ABSIS</button>
          </div>
        </section>
      )}

      {error && <div role="alert" className="px-4 py-3">{error}</div>}
      {mensaje && <div role="status" className="px-4 py-3">{mensaje}</div>}
      <section className="px-5 py-4">
        <strong>Nota de implementación:</strong> la búsqueda, los expedientes, la fecha y los estados son ficticios y se guardan solo en memoria mientras la página está abierta. Informática deberá conectar la consulta con el origen real de expedientes ABSIS y desarrollar el envío y la confirmación para actualizar el estado automáticamente.
      </section>
    </main>
  );
}
