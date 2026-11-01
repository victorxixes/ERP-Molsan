import MolsanDataTable from "../../components/ui/MolsanDataTable";
import MolsanButton from "../../components/ui/MolsanButton";
import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const caja = "rounded-xl border border-[var(--erp-border)] bg-white px-3 py-2.5 text-sm";
const boton = "rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50";

export default function FestivosCompensaciones({ modo = "empleado", onUpdated }) {
  const admin = modo === "admin";
  const [resumen, setResumen] = useState({ saldo_dias: 0, saldo_horas: 0, festivos: [], solicitudes: [], movimientos: [], calendario_festivos: [] });
  const [empleados, setEmpleados] = useState([]);
  const [festivos, setFestivos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [calendarioFestivos, setCalendarioFestivos] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [nombreFestivo, setNombreFestivo] = useState("");
  const [ambitoFestivo, setAmbitoFestivo] = useState("EMPRESA");
  const [empleadoId, setEmpleadoId] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [fechaFestivoTrabajado, setFechaFestivoTrabajado] = useState("");
  const [horas, setHoras] = useState("8");
  const [observaciones, setObservaciones] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [unidad, setUnidad] = useState("DIAS");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (admin) {
      const [e, f, s, b, cf, au] = await Promise.all([
        axios.get("/fichajes/admin/empleados"),
        axios.get("/fichajes/admin/compensaciones/festivos"),
        axios.get("/fichajes/admin/compensaciones/solicitudes"),
        axios.get("/fichajes/admin/compensaciones/saldos"),
        axios.get("/fichajes/admin/compensaciones/calendario"),
        axios.get("/fichajes/admin/compensaciones/auditoria"),
      ]);
      setEmpleados(Array.isArray(e.data) ? e.data : []);
      setFestivos(Array.isArray(f.data) ? f.data : []);
      setSolicitudes(Array.isArray(s.data) ? s.data : []);
      setSaldos(Array.isArray(b.data) ? b.data : []);
      setCalendarioFestivos(Array.isArray(cf.data) ? cf.data : []);
      setAuditoria(Array.isArray(au.data) ? au.data : []);
      if (!empleadoId && e.data?.length) setEmpleadoId(String(e.data[0].id));
    } else {
      const r = await axios.get("/fichajes/compensaciones/resumen");
      setResumen(r.data || {});
    }
  }, [admin, empleadoId]);

  useEffect(() => {
    let vivo = true;
    setCargando(true); setError("");
    cargar().catch((e) => { if (vivo) setError(e?.response?.data?.detail || "No se han podido cargar las compensaciones."); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [cargar]);

  const ejecutar = async (accion) => {
    setGuardando(true); setError(""); setMensaje("");
    try {
      await accion();
      await cargar();
      if (onUpdated) await onUpdated();
      setObservaciones("");
      setMensaje("Operación guardada correctamente. El saldo y el historial se han actualizado.");
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido completar la operación.");
    } finally { setGuardando(false); }
  };

  const registrarFestivo = (e) => {
    e.preventDefault();
    const d = new FormData();
    d.append("empleado_id", empleadoId); d.append("fecha", fecha);
    d.append("horas_trabajadas", horas); d.append("observaciones", observaciones);
    return ejecutar(() => axios.post("/fichajes/admin/compensaciones/festivos", d));
  };
  const validarFestivo = (f, estado) => {
    let cantidadValidar = cantidad;
    let unidadValidar = unidad;
    if (estado === "VALIDADO") {
      const entrada = window.prompt("¿Cuánto tiempo compensable corresponde? Introduce una cantidad positiva (por ejemplo, 1 día o 8 horas).", "1");
      if (entrada === null) return;
      cantidadValidar = entrada;
      const u = window.prompt("Escribe DIAS u HORAS.", "DIAS");
      if (u === null) return;
      unidadValidar = u.trim().toUpperCase();
      if (!["DIAS", "HORAS"].includes(unidadValidar) || !Number.isFinite(Number(cantidadValidar)) || Number(cantidadValidar) <= 0) {
        setError("Cantidad o unidad no válida."); return;
      }
    }
    const d = new FormData();
    d.append("estado", estado); d.append("cantidad_compensable", cantidadValidar);
    d.append("unidad_compensable", unidadValidar); d.append("observaciones", "");
    return ejecutar(() => axios.patch(`/fichajes/admin/compensaciones/festivos/${f.id}`, d));
  };
  const resolverSolicitud = (s, estado) => {
    const d = new FormData(); d.append("estado", estado); d.append("observaciones", "");
    return ejecutar(() => axios.patch(`/fichajes/admin/compensaciones/solicitudes/${s.id}`, d));
  };
  const solicitar = (e) => {
    e.preventDefault();
    const d = new FormData(); d.append("fecha_disfrute", fecha); d.append("cantidad", cantidad);
    d.append("unidad", unidad); d.append("observaciones", observaciones);
    return ejecutar(() => axios.post("/fichajes/compensaciones/solicitudes", d));
  };
  const fechaBonita = (v) => v ? new Date(`${v}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const estado = (v) => ({ PENDIENTE: "Pendiente de validar", VALIDADO: "Validado", RECHAZADO: "Rechazado", SOLICITADO: "Pendiente de aprobación", APROBADO: "Aprobada", DISFRUTADO: "Disfrutada", CONSUMIDO: "Disfrutada" }[v] || v);

  return <section className="space-y-5 p-4 sm:p-6">
    <header><h2 className="text-xl font-extrabold">Festivos y compensaciones</h2>
      <p className="mt-1 max-w-3xl text-sm text-[var(--erp-text-soft)]">{admin ? "Valida los festivos trabajados, resuelve solicitudes y consulta el saldo individual. Cada cambio queda auditado." : "Consulta los días u horas generados por festivos trabajados y solicita disfrutarlos en otra fecha. Este saldo es independiente de las vacaciones ordinarias."}</p>
    </header>
    {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {cargando ? <div className="rounded-xl border p-8 text-sm text-slate-500">Cargando compensaciones…</div> : admin ? <>
      <form onSubmit={registrarFestivo} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <h3 className="font-bold">Registrar festivo trabajado</h3>
        <p className="mt-1 text-xs text-slate-600">El registro queda pendiente hasta que administración valide el tiempo compensable. No se genera saldo automáticamente.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Empleado<select required value={empleadoId} onChange={e => setEmpleadoId(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="">Selecciona…</option>{empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">Fecha del festivo<input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label className="text-xs font-bold text-slate-600">Horas trabajadas<input required type="number" min="0.25" max="24" step="0.25" value={horas} onChange={e => setHoras(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label className="text-xs font-bold text-slate-600">Observaciones<input maxLength="500" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Turno, autorización…" className={`mt-1 w-full ${caja}`} /></label>
        </div>
        <button disabled={guardando || !empleadoId} className={`mt-3 ${boton}`}>Registrar para validar</button>
      </form>

      <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(); d.append("fecha", fecha); d.append("nombre", nombreFestivo); d.append("ambito", ambitoFestivo); return ejecutar(() => axios.post("/fichajes/admin/compensaciones/calendario", d)); }} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <h3 className="font-bold">Calendario laboral de festivos</h3>
        <p className="mt-1 text-xs text-slate-600">Configura las fechas que el empleado podrá reportar como festivo trabajado. Introduce los festivos estatales, autonómicos, locales y de empresa aplicables.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Fecha<input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label className="text-xs font-bold text-slate-600">Nombre del festivo<input required maxLength="160" value={nombreFestivo} onChange={e => setNombreFestivo(e.target.value)} placeholder="Ej. Fiesta local" className={`mt-1 w-full ${caja}`} /></label>
          <label className="text-xs font-bold text-slate-600">Ámbito<select value={ambitoFestivo} onChange={e => setAmbitoFestivo(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="ESTATAL">Estatal</option><option value="AUTONOMICO">Autonómico</option><option value="LOCAL">Local</option><option value="EMPRESA">Empresa</option></select></label>
          <div className="flex items-end"><button disabled={guardando} className={`w-full ${boton}`}>Añadir al calendario</button></div>
        </div>
      </form>
      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Festivos configurados</h3>
        <MolsanDataTable
          rows={calendarioFestivos}
          rowKey="id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "fecha", direction: "asc" }}
          emptyText="Todavía no se ha configurado ningún festivo."
          columns={[
            { key: "fecha", header: "Fecha", accessor: "fecha", sortType: "date", render: (value) => fechaBonita(value) },
            { key: "nombre", header: "Festivo", accessor: "nombre", sortType: "text" },
            { key: "ambito", header: "Ámbito", accessor: "ambito", sortType: "text" },
            { key: "activo", header: "Estado", accessor: (item) => item.activo ? "Activo" : "Inactivo", sortType: "text" },
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border p-4"><p className="text-xs font-bold text-slate-500">Festivos pendientes</p><p className="mt-2 text-3xl font-extrabold">{festivos.filter(f => f.estado === "PENDIENTE").length}</p></div>
        <div className="rounded-2xl border p-4"><p className="text-xs font-bold text-slate-500">Solicitudes pendientes</p><p className="mt-2 text-3xl font-extrabold">{solicitudes.filter(s => s.estado === "SOLICITADO").length}</p></div>
        <div className="rounded-2xl border p-4"><p className="text-xs font-bold text-slate-500">Empleados con saldo en días</p><p className="mt-2 text-3xl font-extrabold">{saldos.filter(s => s.saldo_dias > 0).length}</p></div>
        <div className="rounded-2xl border p-4"><p className="text-xs font-bold text-slate-500">Empleados con saldo en horas</p><p className="mt-2 text-3xl font-extrabold">{saldos.filter(s => s.saldo_horas > 0).length}</p></div>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Festivos trabajados · validación</h3>
        <MolsanDataTable
          rows={festivos}
          rowKey="id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "fecha", direction: "desc" }}
          emptyText="No hay festivos registrados."
          columns={[
            { key: "empleado", header: "Empleado", accessor: "empleado_nombre", sortType: "text" },
            { key: "fecha", header: "Fecha", accessor: "fecha", sortType: "date", render: (value) => fechaBonita(value) },
            { key: "horas", header: "Horas", accessor: "horas_trabajadas", sortType: "number", align: "right" },
            { key: "estado", header: "Estado", accessor: "estado", sortType: "text", render: (value) => estado(value) },
            { key: "compensacion", header: "Compensación", accessor: (item) => item.cantidad_compensable == null ? "" : `${item.cantidad_compensable} ${item.unidad_compensable}`, sortType: "text", render: (value) => value || "—" },
            { key: "acciones", header: "Acciones", sortable: false, accessor: (item) => item.id, render: (_, item) => item.estado === "PENDIENTE" ? <div className="flex gap-2"><MolsanButton type="button" variant="success" icon="check" loading={guardando} className="molsan-btn--compact" onClick={() => validarFestivo(item, "VALIDADO")}>Validar</MolsanButton><MolsanButton type="button" variant="danger" icon="close" loading={guardando} className="molsan-btn--compact" onClick={() => validarFestivo(item, "RECHAZADO")}>Rechazar</MolsanButton></div> : "Resuelto" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Solicitudes de disfrute</h3>
        <MolsanDataTable
          rows={solicitudes}
          rowKey="id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "fecha_disfrute", direction: "desc" }}
          emptyText="No hay solicitudes."
          columns={[
            { key: "empleado", header: "Empleado", accessor: "empleado_nombre", sortType: "text" },
            { key: "fecha_disfrute", header: "Fecha de disfrute", accessor: "fecha_disfrute", sortType: "date", render: (value) => fechaBonita(value) },
            { key: "cantidad", header: "Cantidad", accessor: (item) => Number(item.cantidad || 0), sortType: "number", render: (_, item) => `${item.cantidad} ${item.unidad}` },
            { key: "estado", header: "Estado", accessor: "estado", sortType: "text", render: (value) => estado(value) },
            { key: "observaciones", header: "Observaciones", accessor: "observaciones", sortType: "text", render: (value) => value || "—" },
            { key: "acciones", header: "Acciones", sortable: false, accessor: (item) => item.id, render: (_, item) => item.estado === "SOLICITADO" ? <div className="flex gap-2"><MolsanButton type="button" variant="success" icon="check" loading={guardando} className="molsan-btn--compact" onClick={() => resolverSolicitud(item, "APROBADO")}>Aprobar</MolsanButton><MolsanButton type="button" variant="danger" icon="close" loading={guardando} className="molsan-btn--compact" onClick={() => resolverSolicitud(item, "RECHAZADO")}>Rechazar</MolsanButton></div> : "Resuelta" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Saldos de compensación por empleado</h3>
        <MolsanDataTable
          rows={saldos}
          rowKey="empleado_id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "empleado_nombre", direction: "asc" }}
          emptyText="No hay saldos de compensación."
          columns={[
            { key: "empleado_nombre", header: "Empleado", accessor: "empleado_nombre", sortType: "text" },
            { key: "saldo_dias", header: "Días disponibles", accessor: "saldo_dias", sortType: "number", align: "right" },
            { key: "saldo_horas", header: "Horas disponibles", accessor: "saldo_horas", sortType: "number", align: "right" },
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Auditoría de cambios</h3>
        <MolsanDataTable
          rows={auditoria}
          rowKey="id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "creado_en", direction: "desc" }}
          emptyText="No hay cambios auditados."
          columns={[
            { key: "creado_en", header: "Fecha y hora", accessor: "creado_en", sortType: "date", render: (value) => value ? new Date(value).toLocaleString("es-ES") : "—" },
            { key: "empleado", header: "Empleado", accessor: "empleado_nombre", sortType: "text" },
            { key: "accion", header: "Acción", accessor: (item) => `${item.entidad} · ${item.accion}`, sortType: "text" },
            { key: "estado", header: "Estado", accessor: (item) => `${item.estado_anterior || "—"} → ${item.estado_nuevo || "—"}`, sortType: "text" },
            { key: "detalle", header: "Detalle", accessor: "detalle", sortType: "text", render: (value) => value || "—" },
          ]}
        />
      </div>
    </> : <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"><p className="text-sm font-bold text-emerald-900">Saldo disponible · días</p><p className="mt-2 text-4xl font-extrabold text-emerald-900">{Number(resumen.saldo_dias || 0).toLocaleString("es-ES")}</p></div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5"><p className="text-sm font-bold text-sky-900">Saldo disponible · horas</p><p className="mt-2 text-4xl font-extrabold text-sky-900">{Number(resumen.saldo_horas || 0).toLocaleString("es-ES")}</p></div>
      </div>
      <form onSubmit={solicitar} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <h3 className="font-bold">Solicitar un día u horas de compensación</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Fecha de disfrute<input required type="date" min={hoy()} value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label className="text-xs font-bold text-slate-600">Cantidad<input required type="number" min="0.25" max="100" step="0.25" value={cantidad} onChange={e => setCantidad(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label className="text-xs font-bold text-slate-600">Unidad<select value={unidad} onChange={e => setUnidad(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="DIAS">Días</option><option value="HORAS">Horas</option></select></label>
          <label className="text-xs font-bold text-slate-600">Observaciones<input maxLength="500" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Motivo opcional…" className={`mt-1 w-full ${caja}`} /></label>
        </div>
        <button disabled={guardando} className={`mt-3 ${boton}`}>Enviar solicitud</button>
      </form>
      <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(); d.append("fecha", fechaFestivoTrabajado); d.append("horas_trabajadas", horas); d.append("observaciones", observaciones); return ejecutar(() => axios.post("/fichajes/compensaciones/mis-festivos", d)); }} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
        <h3 className="font-bold">Comunicar un festivo trabajado</h3>
        <p className="mt-1 text-xs text-slate-600">Selecciona una fecha del calendario laboral que ya hayas trabajado. La solicitud quedará pendiente de validación y no generará saldo hasta que administración la apruebe.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Festivo<select required value={fechaFestivoTrabajado} onChange={e => setFechaFestivoTrabajado(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="">Selecciona un festivo…</option>{(resumen.calendario_festivos || []).filter(f => f.fecha <= hoy()).map(f => <option key={f.id} value={f.fecha}>{fechaBonita(f.fecha)} · {f.nombre}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">Horas trabajadas<input required type="number" min="0.25" max="24" step="0.25" value={horas} onChange={e => setHoras(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label className="text-xs font-bold text-slate-600">Observaciones<input maxLength="500" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Turno, autorización…" className={`mt-1 w-full ${caja}`} /></label>
          <div className="flex items-end"><button disabled={guardando || !(resumen.calendario_festivos || []).some(f => f.fecha === fechaFestivoTrabajado && f.fecha <= hoy())} className={`w-full ${boton}`}>Enviar para validar</button></div>
        </div>
        {!(resumen.calendario_festivos || []).length && <p className="mt-3 text-xs text-amber-800">No hay festivos configurados todavía. Contacta con administración para que los añada al calendario laboral.</p>}
      </form>
      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Festivos trabajados</h3>
        <MolsanDataTable
          rows={resumen.festivos || []}
          rowKey="id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "fecha", direction: "desc" }}
          emptyText="Aún no hay festivos registrados por administración."
          columns={[
            { key: "fecha", header: "Fecha", accessor: "fecha", sortType: "date", render: (value) => fechaBonita(value) },
            { key: "horas", header: "Horas", accessor: "horas_trabajadas", sortType: "number", align: "right" },
            { key: "estado", header: "Estado", accessor: "estado", sortType: "text", render: (value) => estado(value) },
            { key: "saldo", header: "Saldo generado", accessor: (item) => item.cantidad_compensable == null ? "" : `${item.cantidad_compensable} ${item.unidad_compensable}`, sortType: "text", render: (value) => value || "—" },
            { key: "observaciones", header: "Observaciones", accessor: "observaciones", sortType: "text", render: (value) => value || "—" },
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Solicitudes e historial de disfrute</h3>
        <MolsanDataTable
          rows={resumen.solicitudes || []}
          rowKey="id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "fecha_disfrute", direction: "desc" }}
          emptyText="Todavía no has solicitado compensaciones."
          columns={[
            { key: "fecha_disfrute", header: "Fecha", accessor: "fecha_disfrute", sortType: "date", render: (value) => fechaBonita(value) },
            { key: "cantidad", header: "Cantidad", accessor: (item) => Number(item.cantidad || 0), sortType: "number", render: (_, item) => `${item.cantidad} ${item.unidad}` },
            { key: "estado", header: "Estado", accessor: "estado", sortType: "text", render: (value) => estado(value) },
            { key: "observaciones", header: "Observaciones", accessor: "observaciones", sortType: "text", render: (value) => value || "—" },
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-2xl border">
        <h3 className="p-4 font-bold">Libro de movimientos</h3>
        <MolsanDataTable
          rows={resumen.movimientos || []}
          rowKey="id"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "fecha", direction: "desc" }}
          emptyText="Sin movimientos todavía."
          columns={[
            { key: "fecha", header: "Fecha", accessor: "fecha", sortType: "date", render: (value) => fechaBonita(value) },
            { key: "tipo", header: "Movimiento", accessor: (item) => item.tipo === "ABONO" ? "Saldo generado" : item.tipo === "CONSUMO" ? "Compensación utilizada" : "Ajuste", sortType: "text" },
            { key: "cantidad", header: "Cantidad", accessor: (item) => Number(item.cantidad || 0), sortType: "number", render: (_, item) => `${item.tipo === "CONSUMO" ? "−" : "+"}${item.cantidad} ${item.unidad}` },
            { key: "detalle", header: "Detalle", accessor: "observaciones", sortType: "text", render: (value) => value || "—" },
          ]}
        />
      </div>
    </>}
  </section>;
}
