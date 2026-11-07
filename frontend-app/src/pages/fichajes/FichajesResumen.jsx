import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import MolsanPremiumCard from "../../components/ui/MolsanPremiumCard";
import MolsanStatCard from "../../components/ui/MolsanStatCard";

const fechaISOlocal = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function FichajesResumen({ recargar }) {
  const [vacaciones, setVacaciones] = useState(null);
  const [horas, setHoras] = useState(null);
  const [desde, setDesde] = useState(() => fechaISOlocal(new Date()));
  const [hasta, setHasta] = useState(() => fechaISOlocal(new Date()));
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [v, h] = await Promise.all([
        axios.get("/fichajes/vacaciones"),
        axios.get("/fichajes/resumen-horas", { params: { anio: new Date().getFullYear() } }),
      ]);
      setVacaciones(v.data);
      setHoras(h.data);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudieron cargar los resúmenes.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const solicitar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const data = new FormData();
      data.append("fecha_inicio", desde);
      data.append("fecha_fin", hasta);
      await axios.post("/fichajes/vacaciones", data);
      setMensaje("Solicitud de vacaciones registrada y pendiente de aprobación.");
      await cargar();
      if (recargar) await recargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo registrar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  return <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-label="Resumen de fichajes">
    <MolsanStatCard
      title={`Horas trabajadas · ${horas?.anio || new Date().getFullYear()}`}
      value={`${horas?.horas_trabajadas ?? "—"} h`}
      description={`Jornadas incompletas: ${horas?.jornadas_incompletas ?? "—"}${horas?.aviso ? ` · ${horas.aviso}` : ""}`}
      icon="clock"
      tone="ocean"
      className="fichajes-horas-card"
    />

    <MolsanPremiumCard icon="calendar" title={`Vacaciones · ${vacaciones?.anio || new Date().getFullYear()}`} className="fichajes-vacaciones-card">
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div><p className="text-xs text-[var(--molsan-text-secondary)]">Asignados</p><p className="text-xl font-bold">{vacaciones?.dias_asignados ?? "—"}</p></div>
        <div><p className="text-xs text-[var(--molsan-text-secondary)]">Disfrutados</p><p className="text-xl font-bold">{vacaciones?.dias_disfrutados ?? 0}</p></div>
        <div><p className="text-xs text-[var(--molsan-text-secondary)]">Reservados</p><p className="text-xl font-bold">{vacaciones?.dias_reservados ?? 0}</p></div>
        <div><p className="text-xs text-[var(--molsan-text-secondary)]">Disponibles</p><p className="text-xl font-bold">{vacaciones?.dias_restantes ?? "Pendiente"}</p></div>
      </div>
      {vacaciones?.aviso && <p className="mt-2 text-xs text-[var(--molsan-text-secondary)]">{vacaciones.aviso}</p>}
      {vacaciones?.registros?.length > 0 && <div className="mt-3 space-y-1 text-xs">{vacaciones.registros.map((v) => <p key={v.id} className="rounded-lg bg-[var(--molsan-surface-soft)] p-2">{v.fecha_inicio} – {v.fecha_fin} · {v.dias} días · {v.estado}</p>)}</div>}
    </MolsanPremiumCard>

    <MolsanPremiumCard icon="calendar" title="Solicitar vacaciones" description="Selecciona el periodo y envía la solicitud para su aprobación." className="fichajes-solicitud-card">
      <form className="space-y-2" onSubmit={solicitar}>
        <label className="block text-xs">Desde<input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="block text-xs">Hasta<input required type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <button disabled={guardando || cargando} className="w-full rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Enviando…" : "Enviar solicitud"}</button>
      </form>
      {cargando && <p className="mt-2 text-xs text-[var(--molsan-text-secondary)]">Actualizando datos…</p>}
    </MolsanPremiumCard>

    {(error || mensaje) && <div className="md:col-span-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role={error ? "alert" : "status"}>{error || mensaje}</div>}
  </section>;
}
