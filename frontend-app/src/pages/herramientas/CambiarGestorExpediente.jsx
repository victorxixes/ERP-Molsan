import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
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
    <div className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="GE" title="Cambiar gestor de expediente" description="Busca el expediente y reasígnalo manualmente. El cambio quedará registrado en el historial de gestores." />
      <div className="flex justify-end"><Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link></div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <form onSubmit={consultar} className="erp-card molsan-form p-6">
          <h2>1. Buscar expediente</h2>
          <p className="mt-1">Introduce el número exactamente como aparece en la ficha del expediente.</p>
          <label className="mt-5 block" htmlFor="numero-expediente">Número de expediente</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input id="numero-expediente" value={numero} onChange={(e) => { setNumero(e.target.value); setExpediente(null); setMensaje(""); }} placeholder="Ej. 2026/000123" className="min-w-0 flex-1 px-4 py-3" />
            <button type="submit" disabled={consultando} className="px-5 py-3">{consultando ? "Buscando…" : "Consultar"}</button>
          </div>
          {expediente && <div className="mt-5 p-4">
            <p className="uppercase">Expediente encontrado</p>
            <p className="mt-1">{expediente.numero_expediente}</p>
            <p className="mt-2">Actividad actual: <span>{expediente.actividad_actual || "Sin actividad indicada"}</span></p>
            <p className="mt-1">Gestor actual: <span>{expediente.gestor_nombre || "Sin asignar"}</span></p>
          </div>}
        </form>

        <form onSubmit={guardar} className="erp-card molsan-form p-6">
          <h2>2. Seleccionar nuevo gestor</h2>
          <p className="mt-1">La reasignación afecta al gestor responsable del expediente; no cambia el apoderado ni el notario.</p>
          <label className="mt-5 block" htmlFor="gestor-destino">Gestor de destino</label>
          <select id="gestor-destino" value={gestorId} onChange={(e) => setGestorId(e.target.value)} disabled={cargandoGestores || !expediente} className="mt-2 w-full px-4 py-3">
            <option value="">{cargandoGestores ? "Cargando gestores…" : "Selecciona un gestor"}</option>
            {gestores.map((gestor) => <option key={gestor.id} value={gestor.id}>{gestor.nombre}{gestor.usuario ? ` · ${gestor.usuario}` : ""}</option>)}
          </select>
          <button type="submit" disabled={guardando || !expediente || !gestorId} className="mt-5 w-full px-5 py-3">{guardando ? "Guardando cambio…" : "Confirmar reasignación"}</button>
          <p className="mt-3">Antes de confirmar, revisa el número de expediente y el gestor seleccionado. El cambio se guarda de forma inmediata.</p>
        </form>
      </section>

      {error && <div role="alert" className="px-4 py-3">{error}</div>}
      {mensaje && <div role="status" className="px-4 py-3">{mensaje}</div>}
    </div>
  );
}
