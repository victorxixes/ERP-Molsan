import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const ISO = (d) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const FECHA = (v) => v ? new Date(v + "T12:00:00").toLocaleDateString("es-ES") : "—";
const ESTADO = (v) => v === "SOLICITADO" ? "Pendiente" : v === "APROBADO" ? "Aprobada" : "Rechazada";

export default function SolicitudesAusencia({ modo = "empleado", empleados = [] }) {
  const hoy = new Date();
  const [desde, setDesde] = useState(ISO(hoy));
  const [hasta, setHasta] = useState(ISO(hoy));
  const [tipo, setTipo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tipos, setTipos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [empleadoId, setEmpleadoId] = useState("");
  const [estado, setEstado] = useState("SOLICITADO");
  const [motivos, setMotivos] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const admin = modo === "admin";

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      if (admin) {
        const r = await axios.get("/fichajes/admin/solicitudes-ausencia", { params: { estado: estado || undefined, empleado_id: empleadoId || undefined } });
        setSolicitudes(Array.isArray(r.data) ? r.data : []);
      } else {
        const [r, t] = await Promise.all([axios.get("/fichajes/solicitudes-ausencia"), axios.get("/fichajes/catalogo-ausencias")]);
        setSolicitudes(Array.isArray(r.data) ? r.data : []);
        setTipos(Array.isArray(t.data) ? t.data : []);
        if (!tipo && Array.isArray(t.data) && t.data.length) setTipo(t.data[0].nombre);
      }
    } catch (e) { setError(e?.response?.data?.detail || "No se pudieron cargar las solicitudes de ausencia."); }
    finally { setCargando(false); }
  }, [admin, estado, empleadoId, tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const enviar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setMensaje("");
    try {
      const d = new FormData(); d.append("fecha_inicio", desde); d.append("fecha_fin", hasta); d.append("tipo_ausencia", tipo); d.append("observaciones", observaciones);
      await axios.post("/fichajes/solicitudes-ausencia", d);
      setMensaje("Solicitud de ausencia enviada a Control de Fichajes.");
      setObservaciones(""); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo enviar la solicitud."); }
    finally { setGuardando(false); }
  };

  const resolver = async (s, nuevoEstado) => {
    const motivo = (motivos[s.id] || "").trim();
    if (motivo.length < 5) { setError("Escribe el motivo de la resolución (mínimo cinco caracteres) para la solicitud seleccionada."); return; }
    setGuardando(true); setError(""); setMensaje("");
    try {
      const d = new FormData(); d.append("estado", nuevoEstado); d.append("motivo", motivo);
      await axios.patch("/fichajes/admin/solicitudes-ausencia/" + s.id, d);
      setMensaje("Solicitud " + (nuevoEstado === "APROBADO" ? "aprobada." : "rechazada.") + " La resolución ha quedado registrada.");
      await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo resolver la solicitud."); }
    finally { setGuardando(false); }
  };

  const label = "block";
  const input = "mt-1 w-full px-3 py-2.5";
  return <div className="w-full min-w-0">
    <div className="mb-4"><h2>{admin ? "Solicitudes de ausencias y permisos" : "Solicitar ausencia o permiso"}</h2><p className="mt-1">{admin ? "Revisa las peticiones, registra el motivo de cada decisión y evita solapamientos." : "Envía una solicitud para que administración la revise. Registrar una solicitud no equivale a su aprobación."}</p></div>
    {!admin && <form onSubmit={enviar} className="mb-6 grid gap-3 p-4 sm:grid-cols-2">
      <label className={label}>Tipo de ausencia<select required value={tipo} onChange={(e) => setTipo(e.target.value)} className={input}><option value="">Selecciona…</option>{tipos.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}{t.requiere_justificante ? " · requiere justificante" : ""}</option>)}</select></label>
      <label className={label}>Fecha desde<input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={input} /></label>
      <label className={label}>Fecha hasta<input required type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className={input} /></label>
      <label className={label}>Motivo / observaciones<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={500} rows={2} className={input} placeholder="Añade información útil para administración…" /></label>
      <div className="sm:col-span-2"><button type="submit" disabled={guardando || !tipo} className="px-5 py-3">{guardando ? "Enviando…" : "Enviar solicitud"}</button></div>
    </form>}
    {admin && <div className="mb-4 grid gap-3 sm:grid-cols-3"><label className={label}>Empleado<select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} className={input}><option value="">Toda la plantilla</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label><label className={label}>Estado<select value={estado} onChange={(e) => setEstado(e.target.value)} className={input}><option value="">Todos</option><option value="SOLICITADO">Pendientes</option><option value="APROBADO">Aprobadas</option><option value="RECHAZADO">Rechazadas</option></select></label><div className="flex items-end"><button type="button" onClick={cargar} className="w-full px-4 py-3">Actualizar solicitudes</button></div></div>}
    {error && <div role="alert" className="mb-3 p-3">{error}</div>}
    {mensaje && <div role="status" className="mb-3 p-3">{mensaje}</div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[850px]"><thead><tr className="uppercase">{admin && <th className="p-3">Empleado</th>}<th className="p-3">Tipo</th><th className="p-3">Desde</th><th className="p-3">Hasta</th><th className="p-3">Estado</th><th className="p-3">Observaciones / resolución</th>{admin && <th className="p-3">Acciones</th>}</tr></thead><tbody>{solicitudes.map((s) => <tr key={s.id} className="align-top">{admin && <td className="p-3">{s.empleado_nombre}</td>}<td className="p-3">{s.tipo_ausencia}</td><td className="p-3">{FECHA(s.fecha_inicio)}</td><td className="p-3">{FECHA(s.fecha_fin)}</td><td className="p-3"><span className={"px-2 py-1" + (s.estado === "SOLICITADO" ? "" : s.estado === "APROBADO" ? "" : "")}>{ESTADO(s.estado)}</span></td><td className="max-w-[260px] p-3">{s.observaciones || "—"}{s.motivo_resolucion && <p className="mt-1">Resolución: {s.motivo_resolucion}</p>}</td>{admin && <td className="min-w-[260px] p-3">{s.estado === "SOLICITADO" ? <div className="space-y-2"><input value={motivos[s.id] || ""} onChange={(e) => setMotivos({ ...motivos, [s.id]: e.target.value })} maxLength={500} placeholder="Motivo obligatorio…" className="w-full px-2 py-2" /><div className="flex gap-2"><button type="button" disabled={guardando} onClick={() => resolver(s, "APROBADO")} className="px-3 py-2">Aprobar</button><button type="button" disabled={guardando} onClick={() => resolver(s, "RECHAZADO")} className="px-3 py-2">Rechazar</button></div></div> : "Resuelta"}</td>}</tr>)}{!solicitudes.length && <tr><td colSpan={admin ? 7 : 5} className="p-10">{cargando ? "Cargando…" : "No hay solicitudes para mostrar."}</td></tr>}</tbody></table></div>
  </div>;
}
