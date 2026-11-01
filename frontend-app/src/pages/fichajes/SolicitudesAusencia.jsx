import MolsanDataTable from "../../components/ui/MolsanDataTable";
import MolsanButton from "../../components/ui/MolsanButton";
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

  const label = "block text-xs font-bold text-slate-600";
  const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal";
  return <div className="p-4 sm:p-6">
    <div className="mb-4"><h2 className="text-lg font-extrabold">{admin ? "Solicitudes de ausencias y permisos" : "Solicitar ausencia o permiso"}</h2><p className="mt-1 text-sm text-[var(--erp-text-soft)]">{admin ? "Revisa las peticiones, registra el motivo de cada decisión y evita solapamientos." : "Envía una solicitud para que administración la revise. Registrar una solicitud no equivale a su aprobación."}</p></div>
    {!admin && <form onSubmit={enviar} className="mb-6 grid gap-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 sm:grid-cols-2">
      <label className={label}>Tipo de ausencia<select required value={tipo} onChange={(e) => setTipo(e.target.value)} className={input}><option value="">Selecciona…</option>{tipos.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}{t.requiere_justificante ? " · requiere justificante" : ""}</option>)}</select></label>
      <label className={label}>Fecha desde<input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={input} /></label>
      <label className={label}>Fecha hasta<input required type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className={input} /></label>
      <label className={label}>Motivo / observaciones<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={500} rows={2} className={input} placeholder="Añade información útil para administración…" /></label>
      <div className="sm:col-span-2"><button disabled={guardando || !tipo} className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Enviando…" : "Enviar solicitud"}</button></div>
    </form>}
    {admin && <div className="mb-4 grid gap-3 sm:grid-cols-3"><label className={label}>Empleado<select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} className={input}><option value="">Toda la plantilla</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label><label className={label}>Estado<select value={estado} onChange={(e) => setEstado(e.target.value)} className={input}><option value="">Todos</option><option value="SOLICITADO">Pendientes</option><option value="APROBADO">Aprobadas</option><option value="RECHAZADO">Rechazadas</option></select></label><div className="flex items-end"><button type="button" onClick={cargar} className="w-full rounded-xl border bg-white px-4 py-3 text-sm font-bold">Actualizar solicitudes</button></div></div>}
    {error && <div role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {mensaje && <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>}
    <MolsanDataTable
      rows={solicitudes}
      rowKey="id"
      minWidth={admin ? "1200px" : "900px"}
      pagination
      pageSize={25}
      searchable
      initialSort={{ key: "fecha_inicio", direction: "desc" }}
      emptyText={cargando ? "Cargando solicitudes…" : "No hay solicitudes para mostrar."}
      columns={[
        ...(admin ? [{ key: "empleado", header: "Empleado", accessor: "empleado_nombre", sortType: "text" }] : []),
        { key: "tipo", header: "Tipo", accessor: "tipo_ausencia", sortType: "text" },
        { key: "desde", header: "Desde", accessor: "fecha_inicio", sortType: "date", render: (value) => FECHA(value) },
        { key: "hasta", header: "Hasta", accessor: "fecha_fin", sortType: "date", render: (value) => FECHA(value) },
        { key: "estado", header: "Estado", accessor: "estado", sortType: "text", render: (value) => <span className={"rounded-lg px-2 py-1 text-xs font-bold " + (value === "SOLICITADO" ? "bg-amber-100 text-amber-900" : value === "APROBADO" ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900")}>{ESTADO(value)}</span> },
        { key: "observaciones", header: "Observaciones / resolución", accessor: (item) => [item.observaciones, item.motivo_resolucion].filter(Boolean).join(" · "), sortType: "text", render: (_, item) => <>{item.observaciones || "—"}{item.motivo_resolucion && <p className="mt-1 text-xs text-slate-500">Resolución: {item.motivo_resolucion}</p>}</> },
        ...(admin ? [{ key: "acciones", header: "Acciones", sortable: false, accessor: (item) => item.id, render: (_, item) => item.estado === "SOLICITADO" ? <div className="min-w-[260px] space-y-2"><input value={motivos[item.id] || ""} onChange={(e) => setMotivos({ ...motivos, [item.id]: e.target.value })} maxLength={500} placeholder="Motivo obligatorio…" className="w-full rounded-lg border px-2 py-2 text-xs" /><div className="flex gap-2"><MolsanButton type="button" variant="success" icon="check" loading={guardando} className="molsan-btn--compact" onClick={() => resolver(item, "APROBADO")}>Aprobar</MolsanButton><MolsanButton type="button" variant="danger" icon="close" loading={guardando} className="molsan-btn--compact" onClick={() => resolver(item, "RECHAZADO")}>Rechazar</MolsanButton></div></div> : "Resuelta" }] : []),
      ]}
    />
  </div>;
}
