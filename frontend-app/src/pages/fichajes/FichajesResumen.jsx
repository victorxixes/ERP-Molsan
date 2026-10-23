import { useEffect, useState } from "react";
import axios from "../../api/axios";

export default function FichajesResumen({ recargar }) {
  const [vacaciones, setVacaciones] = useState(null);
  const [horas, setHoras] = useState(null);
  const [desde, setDesde] = useState(new Date().toLocaleDateString("en-CA"));
  const [hasta, setHasta] = useState(new Date().toLocaleDateString("en-CA"));
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const cargar = async () => {
    setCargando(true);
    try {
      const [v, h] = await Promise.all([
        axios.get("/fichajes/vacaciones"),
        axios.get("/fichajes/resumen-horas", { params: { anio: new Date().getFullYear() } }),
      ]);
      setVacaciones(v.data);
      setHoras(h.data);
    } catch (e) { setError(e?.response?.data?.detail || "No se pudieron cargar los resúmenes."); }
    finally { setCargando(false); }
  };
  useEffect(() => { cargar(); }, []);
  const solicitar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setMensaje("");
    try {
      const data = new FormData(); data.append("fecha_inicio", desde); data.append("fecha_fin", hasta);
      await axios.post("/fichajes/vacaciones", data);
      setMensaje("Solicitud de vacaciones registrada y pendiente de aprobación.");
      await cargar(); if (recargar) await recargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo registrar la solicitud."); }
    finally { setGuardando(false); }
  };
  return <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
      <p className="text-sm font-semibold text-blue-800">Horas trabajadas · {horas?.anio || new Date().getFullYear()}</p>
      <p className="mt-2 text-3xl font-extrabold text-slate-900">{horas?.horas_trabajadas ?? "—"} h</p>
      <p className="mt-1 text-xs text-slate-500">Jornadas incompletas: {horas?.jornadas_incompletas ?? "—"}</p>
      {horas?.aviso && <p className="mt-2 text-xs text-slate-600">{horas.aviso}</p>}
    </article>
    <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
      <p className="text-sm font-semibold text-emerald-800">Vacaciones · {vacaciones?.anio || new Date().getFullYear()}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-xs text-slate-500">Asignados</p><p className="text-xl font-bold">{vacaciones?.dias_asignados ?? "—"}</p></div>
        <div><p className="text-xs text-slate-500">Disfrutados</p><p className="text-xl font-bold">{vacaciones?.dias_disfrutados ?? 0}</p></div>
        <div><p className="text-xs text-slate-500">Restantes</p><p className="text-xl font-bold">{vacaciones?.dias_restantes ?? "Pendiente"}</p></div>
      </div>
      {vacaciones?.aviso && <p className="mt-2 text-xs text-slate-600">{vacaciones.aviso}</p>}
      {vacaciones?.registros?.length > 0 && <div className="mt-3 space-y-1 text-xs">{vacaciones.registros.map((v) => <p key={v.id} className="rounded-lg bg-white/70 p-2">{v.fecha_inicio} – {v.fecha_fin} · {v.dias} días · {v.estado}</p>)}</div>}
    </article>
    <article className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
      <p className="text-sm font-semibold text-violet-800">Solicitar vacaciones</p>
      <form className="mt-3 space-y-2" onSubmit={solicitar}>
        <label className="block text-xs">Desde<input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="block text-xs">Hasta<input required type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <button disabled={guardando} className="w-full rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Enviando…" : "Enviar solicitud"}</button>
      </form>
      {cargando && <p className="mt-2 text-xs text-slate-500">Actualizando datos…</p>}
    </article>
    {(error || mensaje) && <div className={error ? "md:col-span-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" : "md:col-span-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"}>{error || mensaje}</div>}
  </section>;
}
