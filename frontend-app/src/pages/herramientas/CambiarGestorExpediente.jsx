import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";

export default function CambiarGestorExpediente() {
  const [numero, setNumero] = useState("");
  const [gestorId, setGestorId] = useState("");
  const [gestores, setGestores] = useState([]);
  const [expediente, setExpediente] = useState(null);
  const [cargandoGestores, setCargandoGestores] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;
    axios.get("/utilidades/gestores-asignacion")
      .then(({ data }) => { if (activo) setGestores(Array.isArray(data) ? data : []); })
      .catch((e) => { if (activo) setError(e.response?.data?.detail || "No se pudieron cargar los gestores."); })
      .finally(() => { if (activo) setCargandoGestores(false); });
    return () => { activo = false; };
  }, []);

  async function consultar(e) {
    e?.preventDefault();
    setError(""); setMensaje(""); setExpediente(null);
    const valor = numero.trim();
    if (!valor) { setError("Introduce el número de expediente."); return; }
    setConsultando(true);
    try {
      const { data } = await axios.get("/utilidades/expediente-gestor", { params: { numero_expediente: valor } });
      setExpediente(data);
      setGestorId(data.gestor_id ? String(data.gestor_id) : "");
    } catch (err) {
      setError(err.response?.data?.detail || "No se ha podido consultar el expediente.");
    } finally { setConsultando(false); }
  }

  async function guardar(e) {
    e.preventDefault();
    setError(""); setMensaje("");
    if (!expediente) { setError("Consulta primero el expediente."); return; }
    if (!gestorId) { setError("Selecciona el gestor de destino."); return; }
    setGuardando(true);
    try {
      const { data } = await axios.post("/utilidades/reasignar-gestor", {
        numero_expediente: expediente.numero_expediente,
        gestor_id: Number(gestorId),
      });
      setMensaje(data.mensaje || "Asignación actualizada.");
      setExpediente((actual) => actual ? { ...actual, gestor_id: data.gestor_id, gestor_nombre: data.gestor_nombre } : actual);
    } catch (err) {
      setError(err.response?.data?.detail || "No se ha podido guardar la reasignación.");
    } finally { setGuardando(false); }
  }

  return (
    <div className="cambiar-gestor-premium herramientas-subpagina-premium min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <MolsanPageHeader mark="UT" title="Cambiar gestor de expediente" description="Busca el expediente y reasígnalo manualmente. El cambio quedará registrado en el historial de gestores." actions={<Link to="/herramientas/utilidades" className="rounded-xl border border-[var(--molsan-border)] px-4 py-2 text-sm font-semibold text-[var(--molsan-text-secondary)] hover:bg-[var(--molsan-surface-soft)]"><MolsanIcon name="arrowLeft" size={13} bare /> Volver a Utilidades</Link>}/>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <form onSubmit={consultar} className="rounded-3xl border border-[var(--molsan-border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--molsan-primary)]">1. Buscar expediente</h2>
          <p className="mt-1 text-sm text-[var(--molsan-text-secondary)]">Introduce el número exactamente como aparece en la ficha del expediente.</p>
          <label className="mt-5 block text-sm font-semibold text-[var(--molsan-text)]" htmlFor="numero-expediente">Número de expediente</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input id="numero-expediente" value={numero} onChange={(e) => { setNumero(e.target.value); setExpediente(null); setMensaje(""); }} placeholder="Ej. 2026/000123" className="min-w-0 flex-1 rounded-xl border border-[var(--molsan-border-strong)] px-4 py-3 text-sm outline-none focus:border-[var(--molsan-primary)] focus:ring-2 focus:ring-[var(--molsan-primary-soft)]" />
            <button type="submit" disabled={consultando} className="rounded-xl bg-[var(--molsan-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{consultando ? "Buscando…" : "Consultar"}</button>
          </div>
          {expediente && <div className="mt-5 rounded-2xl border border-[var(--molsan-border)] bg-[var(--molsan-primary-soft)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--molsan-primary)]">Expediente encontrado</p>
            <p className="mt-1 font-bold text-[var(--molsan-primary)]">{expediente.numero_expediente}</p>
            <p className="mt-2 text-sm text-[var(--molsan-text-secondary)]">Actividad actual: <span className="font-semibold">{expediente.actividad_actual || "Sin actividad indicada"}</span></p>
            <p className="mt-1 text-sm text-[var(--molsan-text-secondary)]">Gestor actual: <span className="font-semibold">{expediente.gestor_nombre || "Sin asignar"}</span></p>
          </div>}
        </form>

        <form onSubmit={guardar} className="rounded-3xl border border-[var(--molsan-border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--molsan-primary)]">2. Seleccionar nuevo gestor</h2>
          <p className="mt-1 text-sm text-[var(--molsan-text-secondary)]">La reasignación afecta al gestor responsable del expediente; no cambia el apoderado ni el notario.</p>
          <label className="mt-5 block text-sm font-semibold text-[var(--molsan-text)]" htmlFor="gestor-destino">Gestor de destino</label>
          <select id="gestor-destino" value={gestorId} onChange={(e) => setGestorId(e.target.value)} disabled={cargandoGestores || !expediente} className="mt-2 w-full rounded-xl border border-[var(--molsan-border-strong)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--molsan-primary)] focus:ring-2 focus:ring-[var(--molsan-primary-soft)] disabled:bg-[var(--molsan-table-head)]">
            <option value="">{cargandoGestores ? "Cargando gestores…" : "Selecciona un gestor"}</option>
            {gestores.map((gestor) => <option key={gestor.id} value={gestor.id}>{gestor.nombre}{gestor.usuario ? ` · ${gestor.usuario}` : ""}</option>)}
          </select>
          <button type="submit" disabled={guardando || !expediente || !gestorId} className="mt-5 w-full rounded-xl bg-[var(--molsan-primary)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--molsan-primary)] disabled:cursor-not-allowed disabled:opacity-50">{guardando ? "Guardando cambio…" : "Confirmar reasignación"}</button>
          <p className="mt-3 text-xs leading-5 text-[var(--molsan-text-secondary)]">Antes de confirmar, revisa el número de expediente y el gestor seleccionado. El cambio se guarda de forma inmediata.</p>
        </form>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
      {mensaje && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{mensaje}</div>}
    </div>
  );
}
