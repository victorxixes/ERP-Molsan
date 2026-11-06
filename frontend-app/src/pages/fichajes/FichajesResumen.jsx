import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

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

  return <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <article className="p-5">
      <p>Horas trabajadas · {horas?.anio || new Date().getFullYear()}</p>
      <p className="mt-2">{horas?.horas_trabajadas ?? "—"} h</p>
      <p className="mt-1">Jornadas incompletas: {horas?.jornadas_incompletas ?? "—"}</p>
      {horas?.aviso && <p className="mt-2">{horas.aviso}</p>}
    </article>

    <article className="p-5">
      <p>Vacaciones · {vacaciones?.anio || new Date().getFullYear()}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div><p>Asignados</p><p>{vacaciones?.dias_asignados ?? "—"}</p></div>
        <div><p>Disfrutados</p><p>{vacaciones?.dias_disfrutados ?? 0}</p></div>
        <div><p>Reservados</p><p>{vacaciones?.dias_reservados ?? 0}</p></div>
        <div><p>Disponibles</p><p>{vacaciones?.dias_restantes ?? "Pendiente"}</p></div>
      </div>
      {vacaciones?.aviso && <p className="mt-2">{vacaciones.aviso}</p>}
      {vacaciones?.registros?.length > 0 && <div className="mt-3 space-y-1">{vacaciones.registros.map((v) => <p key={v.id} className="p-2">{v.fecha_inicio} – {v.fecha_fin} · {v.dias} días · {v.estado}</p>)}</div>}
    </article>

    <article className="p-5">
      <p>Solicitar vacaciones</p>
      <form className="mt-3 space-y-2" onSubmit={solicitar}>
        <label className="block">Desde<input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 w-full p-2" /></label>
        <label className="block">Hasta<input required type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 w-full p-2" /></label>
        <button type="submit" disabled={guardando || cargando} className="w-full px-3 py-2">{guardando ? "Enviando…" : "Enviar solicitud"}</button>
      </form>
      {cargando && <p className="mt-2">Actualizando datos…</p>}
    </article>

    {(error || mensaje) && <div className={error ? "md:col-span-3 p-3" : "md:col-span-3 p-3"}>{error || mensaje}</div>}
  </section>;
}
