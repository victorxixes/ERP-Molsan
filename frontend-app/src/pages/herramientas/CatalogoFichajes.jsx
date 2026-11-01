import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import "../../css/HerramientasPremium.css";

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
  return <main className="catalogos-premium-page min-h-full space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
    <header className="molsan-page-header relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">MOLSAN ERP PREMIUM 2027 · CATÁLOGOS</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-800 sm:text-3xl">Fichajes · Tipos de ausencia</h1>
      <p className="mt-2 text-sm text-slate-500">Mantén los motivos disponibles en Fichaje Molsan y define si requieren justificante.</p>
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Añadir tipo de ausencia</h2>
      <form onSubmit={guardar} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
        <label className="text-sm font-semibold text-slate-600">Nombre del tipo
          <input required maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Acompañamiento médico" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-800" />
        </label>
        <label className="flex items-center gap-2 pb-3 text-sm text-slate-700"><input type="checkbox" checked={requiereJustificante} onChange={(e) => setRequiereJustificante(e.target.checked)} /> Requiere justificante</label>
        <button disabled={guardando} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Añadir al catálogo"}</button>
      </form>
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-800">Tipos disponibles</h2><p className="text-sm text-slate-500">{tipos.length} tipos configurados</p></div>
      {cargando ? <p className="p-5 text-sm text-slate-500">Cargando catálogo…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Tipo de ausencia</th><th className="px-5 py-3">Justificante</th></tr></thead><tbody>{tipos.map((t) => <tr key={t.id} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold text-slate-800">{t.nombre}</td><td className="px-5 py-3">{t.requiere_justificante ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Sí</span> : <span className="text-slate-500">No</span>}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
