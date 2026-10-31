import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const caja = "px-3 py-2.5";
const boton = "px-4 py-2.5";

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

  return <section className="w-full min-w-0 space-y-5">
    <header><h2>Festivos y compensaciones</h2>
      <p className="mt-1 max-w-3xl">{admin ? "Valida los festivos trabajados, resuelve solicitudes y consulta el saldo individual. Cada cambio queda auditado." : "Consulta los días u horas generados por festivos trabajados y solicita disfrutarlos en otra fecha. Este saldo es independiente de las vacaciones ordinarias."}</p>
    </header>
    {mensaje && <div role="status" className="p-3">{mensaje}</div>}
    {error && <div role="alert" className="p-3">{error}</div>}
    {cargando ? <div className="p-8">Cargando compensaciones…</div> : admin ? <>
      <form onSubmit={registrarFestivo} className="p-4">
        <h3>Registrar festivo trabajado</h3>
        <p className="mt-1">El registro queda pendiente hasta que administración valide el tiempo compensable. No se genera saldo automáticamente.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>Empleado<select required value={empleadoId} onChange={e => setEmpleadoId(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="">Selecciona…</option>{empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
          <label>Fecha del festivo<input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label>Horas trabajadas<input required type="number" min="0.25" max="24" step="0.25" value={horas} onChange={e => setHoras(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label>Observaciones<input maxLength="500" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Turno, autorización…" className={`mt-1 w-full ${caja}`} /></label>
        </div>
        <button type="submit" disabled={guardando || !empleadoId} className={`mt-3 ${boton}`}>Registrar para validar</button>
      </form>

      <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(); d.append("fecha", fecha); d.append("nombre", nombreFestivo); d.append("ambito", ambitoFestivo); return ejecutar(() => axios.post("/fichajes/admin/compensaciones/calendario", d)); }} className="p-4">
        <h3>Calendario laboral de festivos</h3>
        <p className="mt-1">Configura las fechas que el empleado podrá reportar como festivo trabajado. Introduce los festivos estatales, autonómicos, locales y de empresa aplicables.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>Fecha<input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label>Nombre del festivo<input required maxLength="160" value={nombreFestivo} onChange={e => setNombreFestivo(e.target.value)} placeholder="Ej. Fiesta local" className={`mt-1 w-full ${caja}`} /></label>
          <label>Ámbito<select value={ambitoFestivo} onChange={e => setAmbitoFestivo(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="ESTATAL">Estatal</option><option value="AUTONOMICO">Autonómico</option><option value="LOCAL">Local</option><option value="EMPRESA">Empresa</option></select></label>
          <div className="flex items-end"><button type="submit" disabled={guardando} className={`w-full ${boton}`}>Añadir al calendario</button></div>
        </div>
      </form>
      <div className="overflow-x-auto">
        <h3 className="p-4">Festivos configurados</h3>
        <table className="w-full min-w-[600px]"><thead><tr className="uppercase"><th className="p-3">Fecha</th><th className="p-3">Festivo</th><th className="p-3">Ámbito</th><th className="p-3">Estado</th></tr></thead><tbody>{calendarioFestivos.map(f => <tr key={f.id}><td className="p-3">{fechaBonita(f.fecha)}</td><td className="p-3">{f.nombre}</td><td className="p-3">{f.ambito}</td><td className="p-3">{f.activo ? "Activo" : "Inactivo"}</td></tr>)}{!calendarioFestivos.length && <tr><td colSpan="4" className="p-8">Todavía no se ha configurado ningún festivo.</td></tr>}</tbody></table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-4"><p>Festivos pendientes</p><p className="mt-2">{festivos.filter(f => f.estado === "PENDIENTE").length}</p></div>
        <div className="p-4"><p>Solicitudes pendientes</p><p className="mt-2">{solicitudes.filter(s => s.estado === "SOLICITADO").length}</p></div>
        <div className="p-4"><p>Empleados con saldo en días</p><p className="mt-2">{saldos.filter(s => s.saldo_dias > 0).length}</p></div>
        <div className="p-4"><p>Empleados con saldo en horas</p><p className="mt-2">{saldos.filter(s => s.saldo_horas > 0).length}</p></div>
      </div>

      <div className="overflow-x-auto">
        <h3 className="p-4">Festivos trabajados · validación</h3>
        <table className="w-full min-w-[850px]"><thead><tr className="uppercase"><th className="p-3">Empleado</th><th className="p-3">Fecha</th><th className="p-3">Horas</th><th className="p-3">Estado</th><th className="p-3">Compensación</th><th className="p-3">Acciones</th></tr></thead><tbody>{festivos.map(f => <tr key={f.id}><td className="p-3">{f.empleado_nombre}</td><td className="p-3">{fechaBonita(f.fecha)}</td><td className="p-3">{f.horas_trabajadas}</td><td className="p-3">{estado(f.estado)}</td><td className="p-3">{f.cantidad_compensable == null ? "—" : `${f.cantidad_compensable} ${f.unidad_compensable}`}</td><td className="p-3">{f.estado === "PENDIENTE" ? <div className="flex gap-2"><button type="submit" disabled={guardando} onClick={() => validarFestivo(f, "VALIDADO")} className="px-3 py-2">Validar</button><button type="submit" disabled={guardando} onClick={() => validarFestivo(f, "RECHAZADO")} className="px-3 py-2">Rechazar</button></div> : "Resuelto"}</td></tr>)}{!festivos.length && <tr><td colSpan="6" className="p-8">No hay festivos registrados.</td></tr>}</tbody></table>
      </div>

      <div className="overflow-x-auto">
        <h3 className="p-4">Solicitudes de disfrute</h3>
        <table className="w-full min-w-[850px]"><thead><tr className="uppercase"><th className="p-3">Empleado</th><th className="p-3">Fecha de disfrute</th><th className="p-3">Cantidad</th><th className="p-3">Estado</th><th className="p-3">Observaciones</th><th className="p-3">Acciones</th></tr></thead><tbody>{solicitudes.map(s => <tr key={s.id}><td className="p-3">{s.empleado_nombre}</td><td className="p-3">{fechaBonita(s.fecha_disfrute)}</td><td className="p-3">{s.cantidad} {s.unidad}</td><td className="p-3">{estado(s.estado)}</td><td className="p-3">{s.observaciones || "—"}</td><td className="p-3">{s.estado === "SOLICITADO" ? <div className="flex gap-2"><button type="submit" disabled={guardando} onClick={() => resolverSolicitud(s, "APROBADO")} className="px-3 py-2">Aprobar</button><button type="submit" disabled={guardando} onClick={() => resolverSolicitud(s, "RECHAZADO")} className="px-3 py-2">Rechazar</button></div> : "Resuelta"}</td></tr>)}{!solicitudes.length && <tr><td colSpan="6" className="p-8">No hay solicitudes.</td></tr>}</tbody></table>
      </div>

      <div className="overflow-x-auto">
        <h3 className="p-4">Saldos de compensación por empleado</h3>
        <table className="w-full min-w-[520px]"><thead><tr className="uppercase"><th className="p-3">Empleado</th><th className="p-3">Días disponibles</th><th className="p-3">Horas disponibles</th></tr></thead><tbody>{saldos.map(s => <tr key={s.empleado_id}><td className="p-3">{s.empleado_nombre}</td><td className="p-3">{s.saldo_dias}</td><td className="p-3">{s.saldo_horas}</td></tr>)}</tbody></table>
      </div>
      <div className="overflow-x-auto">
        <h3 className="p-4">Auditoría de cambios</h3>
        <table className="w-full min-w-[780px]"><thead><tr className="uppercase"><th className="p-3">Fecha y hora</th><th className="p-3">Empleado</th><th className="p-3">Acción</th><th className="p-3">Estado</th><th className="p-3">Detalle</th></tr></thead><tbody>{auditoria.map(a => <tr key={a.id}><td className="p-3">{a.creado_en ? new Date(a.creado_en).toLocaleString("es-ES") : "—"}</td><td className="p-3">{a.empleado_nombre}</td><td className="p-3">{a.entidad} · {a.accion}</td><td className="p-3">{a.estado_anterior || "—"} → {a.estado_nuevo || "—"}</td><td className="p-3">{a.detalle || "—"}</td></tr>)}{!auditoria.length && <tr><td colSpan="5" className="p-8">No hay cambios auditados.</td></tr>}</tbody></table>
      </div>
    </> : <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-5"><p>Saldo disponible · días</p><p className="mt-2">{Number(resumen.saldo_dias || 0).toLocaleString("es-ES")}</p></div>
        <div className="p-5"><p>Saldo disponible · horas</p><p className="mt-2">{Number(resumen.saldo_horas || 0).toLocaleString("es-ES")}</p></div>
      </div>
      <form onSubmit={solicitar} className="p-4">
        <h3>Solicitar un día u horas de compensación</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>Fecha de disfrute<input required type="date" min={hoy()} value={fecha} onChange={e => setFecha(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label>Cantidad<input required type="number" min="0.25" max="100" step="0.25" value={cantidad} onChange={e => setCantidad(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label>Unidad<select value={unidad} onChange={e => setUnidad(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="DIAS">Días</option><option value="HORAS">Horas</option></select></label>
          <label>Observaciones<input maxLength="500" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Motivo opcional…" className={`mt-1 w-full ${caja}`} /></label>
        </div>
        <button type="submit" disabled={guardando} className={`mt-3 ${boton}`}>Enviar solicitud</button>
      </form>
      <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(); d.append("fecha", fechaFestivoTrabajado); d.append("horas_trabajadas", horas); d.append("observaciones", observaciones); return ejecutar(() => axios.post("/fichajes/compensaciones/mis-festivos", d)); }} className="p-4">
        <h3>Comunicar un festivo trabajado</h3>
        <p className="mt-1">Selecciona una fecha del calendario laboral que ya hayas trabajado. La solicitud quedará pendiente de validación y no generará saldo hasta que administración la apruebe.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>Festivo<select required value={fechaFestivoTrabajado} onChange={e => setFechaFestivoTrabajado(e.target.value)} className={`mt-1 w-full ${caja}`}><option value="">Selecciona un festivo…</option>{(resumen.calendario_festivos || []).filter(f => f.fecha <= hoy()).map(f => <option key={f.id} value={f.fecha}>{fechaBonita(f.fecha)} · {f.nombre}</option>)}</select></label>
          <label>Horas trabajadas<input required type="number" min="0.25" max="24" step="0.25" value={horas} onChange={e => setHoras(e.target.value)} className={`mt-1 w-full ${caja}`} /></label>
          <label>Observaciones<input maxLength="500" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Turno, autorización…" className={`mt-1 w-full ${caja}`} /></label>
          <div className="flex items-end"><button type="submit" disabled={guardando || !(resumen.calendario_festivos || []).some(f => f.fecha === fechaFestivoTrabajado && f.fecha <= hoy())} className={`w-full ${boton}`}>Enviar para validar</button></div>
        </div>
        {!(resumen.calendario_festivos || []).length && <p className="mt-3">No hay festivos configurados todavía. Contacta con administración para que los añada al calendario laboral.</p>}
      </form>
      <div className="overflow-x-auto">
        <h3 className="p-4">Festivos trabajados</h3>
        <table className="w-full min-w-[650px]"><thead><tr className="uppercase"><th className="p-3">Fecha</th><th className="p-3">Horas</th><th className="p-3">Estado</th><th className="p-3">Saldo generado</th><th className="p-3">Observaciones</th></tr></thead><tbody>{(resumen.festivos || []).map(f => <tr key={f.id}><td className="p-3">{fechaBonita(f.fecha)}</td><td className="p-3">{f.horas_trabajadas}</td><td className="p-3">{estado(f.estado)}</td><td className="p-3">{f.cantidad_compensable == null ? "—" : `${f.cantidad_compensable} ${f.unidad_compensable}`}</td><td className="p-3">{f.observaciones || "—"}</td></tr>)}{!(resumen.festivos || []).length && <tr><td colSpan="5" className="p-8">Aún no hay festivos registrados por administración.</td></tr>}</tbody></table>
      </div>
      <div className="overflow-x-auto">
        <h3 className="p-4">Solicitudes e historial de disfrute</h3>
        <table className="w-full min-w-[650px]"><thead><tr className="uppercase"><th className="p-3">Fecha</th><th className="p-3">Cantidad</th><th className="p-3">Estado</th><th className="p-3">Observaciones</th></tr></thead><tbody>{(resumen.solicitudes || []).map(s => <tr key={s.id}><td className="p-3">{fechaBonita(s.fecha_disfrute)}</td><td className="p-3">{s.cantidad} {s.unidad}</td><td className="p-3">{estado(s.estado)}</td><td className="p-3">{s.observaciones || "—"}</td></tr>)}{!(resumen.solicitudes || []).length && <tr><td colSpan="4" className="p-8">Todavía no has solicitado compensaciones.</td></tr>}</tbody></table>
      </div>
      <div className="overflow-x-auto">
        <h3 className="p-4">Libro de movimientos</h3>
        <table className="w-full min-w-[620px]"><thead><tr className="uppercase"><th className="p-3">Fecha</th><th className="p-3">Movimiento</th><th className="p-3">Cantidad</th><th className="p-3">Detalle</th></tr></thead><tbody>{(resumen.movimientos || []).map(m => <tr key={m.id}><td className="p-3">{fechaBonita(m.fecha)}</td><td className="p-3">{m.tipo === "ABONO" ? "Saldo generado" : m.tipo === "CONSUMO" ? "Compensación utilizada" : "Ajuste"} </td><td className="p-3">{m.tipo === "CONSUMO" ? "−" : "+"}{m.cantidad} {m.unidad}</td><td className="p-3">{m.observaciones || "—"}</td></tr>)}{!(resumen.movimientos || []).length && <tr><td colSpan="4" className="p-8">Sin movimientos todavía.</td></tr>}</tbody></table>
      </div>
    </>}
  </section>;
}
