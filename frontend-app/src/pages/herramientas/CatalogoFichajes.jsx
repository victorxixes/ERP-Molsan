import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

export default function CatalogoFichajes() {
  const [tipos, setTipos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [requiereJustificante, setRequiereJustificante] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const r = await axios.get("/fichajes/catalogo-ausencias"); setTipos(Array.isArray(r.data) ? r.data : []); setError(""); }
    catch (e) { setError(e?.response?.data?.detail || "No se pudo cargar el catálogo."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setMensaje("");
    try {
      const data = new FormData(); data.append("nombre", nombre.trim()); data.append("requiere_justificante", String(requiereJustificante));
      await axios.post("/fichajes/catalogo-ausencias", data);
      setNombre(""); setRequiereJustificante(false); setMensaje("Tipo de ausencia añadido al catálogo."); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo guardar el tipo de ausencia."); }
    finally { setGuardando(false); }
  };
  return <main className="erp-page min-w-0 space-y-6">
    <MolsanPageHeader mark="FI" title="Tipos de ausencia" description="Mantén los motivos disponibles en Fichajes y define si requieren justificante." />
    {error && <div role="alert" className="p-3">{error}</div>}
    {mensaje && <div role="status" className="p-3">{mensaje}</div>}
    <section className="erp-card p-5">
      <h2>Añadir tipo de ausencia</h2>
      <form onSubmit={guardar} className="molsan-form mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <label>Nombre del tipo
          <input required maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Acompañamiento médico" className="mt-1 w-full px-3 py-2.5" />
        </label>
        <label className="flex items-center gap-2 pb-3"><input type="checkbox" checked={requiereJustificante} onChange={(e) => setRequiereJustificante(e.target.checked)} /> Requiere justificante</label>
        <button disabled={guardando} className="px-5 py-3">{guardando ? "Guardando…" : "Añadir al catálogo"}</button>
      </form>
    </section>
    <section className="erp-card overflow-hidden">
      <div className="px-5 py-4"><h2>Tipos disponibles</h2><p>{tipos.length} tipos configurados</p></div>
      {cargando ? <p className="p-5">Cargando catálogo…</p> : <div className="overflow-x-auto"><table className="w-full"><thead className="uppercase"><tr><th className="px-5 py-3">Tipo de ausencia</th><th className="px-5 py-3">Justificante</th></tr></thead><tbody>{tipos.map((t) => <tr key={t.id}><td className="px-5 py-3">{t.nombre}</td><td className="px-5 py-3">{t.requiere_justificante ? <span className="px-2.5 py-1">Sí</span> : <span>No</span>}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
