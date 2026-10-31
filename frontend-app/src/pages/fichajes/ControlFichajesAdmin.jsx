import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "../../api/axios";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

const TIPOS = [
  ["ENTRADA", "Entrada a trabajar"], ["PAUSA_DESAYUNO_INICIO", "Pausa desayuno"], ["PAUSA_DESAYUNO_FIN", "Regreso desayuno"],
  ["PAUSA_COMIDA_INICIO", "Pausa comida"], ["PAUSA_COMIDA_FIN", "Regreso comida"], ["PAUSA_CIGARRILLO_INICIO", "Pausa cigarrillo"],
  ["PAUSA_CIGARRILLO_FIN", "Regreso cigarrillo"], ["AUSENCIA", "Ausencia histórica (pausa)"], ["AUSENCIA_PUNTUAL", "Registrar ausencia"],
  ["SALIDA", "Salida del trabajo"], ["PAUSA_CAFE_INICIO", "Pausa café (histórica)"], ["RETORNO_AUSENCIA", "Regreso de ausencia (histórico)"]
];
const PAD = (n) => String(n).padStart(2, "0");
const ISO = (d) => d.getFullYear() + "-" + PAD(d.getMonth() + 1) + "-" + PAD(d.getDate());
const DESPLAZAR_DIA = (valor, cantidad) => {
  if (!valor) return valor;
  const [y, m, d] = valor.split("-").map(Number);
  return ISO(new Date(y, m - 1, d + cantidad));
};
const NOW_INPUT = () => { const d = new Date(); return ISO(d) + "T" + PAD(d.getHours()) + ":" + PAD(d.getMinutes()); };
const INPUT_DATE = (v) => { if (!v) return ""; const d = new Date(v); return ISO(d) + "T" + PAD(d.getHours()) + ":" + PAD(d.getMinutes()); };
const HUMAN_DATE = (v) => v ? new Date(v).toLocaleDateString("es-ES") : "—";
const HUMAN_TIME = (v) => v ? new Date(v).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—";
const LABEL = (v) => TIPOS.find((t) => t[0] === v)?.[1] || v || "—";

export default function ControlFichajesAdmin({ empleados = [] }) {
  const d = new Date();
  const [desde, setDesde] = useState(ISO(new Date(d.getFullYear(), d.getMonth(), 1)));
  const [hasta, setHasta] = useState(ISO(d));
  const [empleadoId, setEmpleadoId] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [marcajes, setMarcajes] = useState([]);
  const [marcajesCalculo, setMarcajesCalculo] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editor, setEditor] = useState(null);
  const dialogRef = useRef(null);
  const cerrarEditor = () => { if (!guardando) setEditor(null); };
  useAccessibleDialog({ open: Boolean(editor), onClose: cerrarEditor, dialogRef });
  const [form, setForm] = useState({ empleado_id: "", tipo: "ENTRADA", fecha_hora: NOW_INPUT(), observaciones: "", motivo: "" });
  const [historialId, setHistorialId] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [motivoPeriodo, setMotivoPeriodo] = useState("");
  const [empleadoBolsaId, setEmpleadoBolsaId] = useState("");
  const [diasBolsa, setDiasBolsa] = useState("22");
  const [anioBolsa, setAnioBolsa] = useState(String(new Date().getFullYear()));

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [m, p, all] = await Promise.all([
        axios.get("/fichajes/admin/marcajes", { params: { desde: desde || undefined, hasta: hasta || undefined, empleado_id: empleadoId || undefined, tipo: tipo || undefined, estado: estado || undefined, busqueda: busqueda || undefined } }),
        axios.get("/fichajes/admin/periodos"),
        axios.get("/fichajes/admin/marcajes", { params: { desde: desde ? DESPLAZAR_DIA(desde, -1) : undefined, hasta: hasta ? DESPLAZAR_DIA(hasta, 1) : undefined, empleado_id: empleadoId || undefined } })
      ]);
      setMarcajes(Array.isArray(m.data) ? m.data : []);
      setMarcajesCalculo(Array.isArray(all.data) ? all.data : []);
      setPeriodos(Array.isArray(p.data) ? p.data : []);
    } catch (e) { setError(e?.response?.data?.detail || "No se pudieron cargar los marcajes de administración."); }
    finally { setCargando(false); }
  }, [desde, hasta, empleadoId, tipo, estado, busqueda]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirEditor = (m) => {
    setError(""); setMensaje("");
    setForm(m ? { empleado_id: String(m.empleado_id), tipo: m.tipo, fecha_hora: INPUT_DATE(m.fecha_hora), observaciones: m.observaciones || "", motivo: "" }
      : { empleado_id: empleadoId || "", tipo: "ENTRADA", fecha_hora: NOW_INPUT(), observaciones: "", motivo: "" });
    setEditor(m || { nuevo: true });
  };

  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setMensaje("");
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, String(v ?? "")));
      if (editor.nuevo) await axios.post("/fichajes/admin/marcajes", data);
      else await axios.patch("/fichajes/admin/marcajes/" + editor.id, data);
      setEditor(null);
      setMensaje(editor.nuevo ? "Marcaje añadido por administración y auditado." : "Corrección guardada con su motivo y datos anteriores/posteriores.");
      await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo guardar el marcaje."); }
    finally { setGuardando(false); }
  };

  const verHistorial = async (m) => {
    setHistorialId(m.id); setHistorial([]); setError("");
    try { const r = await axios.get("/fichajes/admin/marcajes/" + m.id + "/auditoria"); setHistorial(Array.isArray(r.data) ? r.data : []); }
    catch (e) { setError(e?.response?.data?.detail || "No se pudo consultar el historial."); }
  };

  const cambiarPeriodo = async (cerrado) => {
    if (!desde) { setError("Selecciona una fecha del mes que quieras gestionar."); return; }
    if (motivoPeriodo.trim().length < 5) { setError("Indica un motivo de al menos cinco caracteres."); return; }
    const data = new FormData();
    data.append("anio", desde.slice(0, 4)); data.append("mes", String(Number(desde.slice(5, 7))));
    data.append("cerrado", cerrado ? "true" : "false"); data.append("motivo", motivoPeriodo.trim());
    setGuardando(true); setError(""); setMensaje("");
    try {
      await axios.post("/fichajes/admin/periodos", data);
      setMensaje(cerrado ? "Mes cerrado. No se permiten cambios en ese periodo." : "Mes reabierto; el motivo ha quedado registrado.");
      setMotivoPeriodo(""); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo actualizar el periodo."); }
    finally { setGuardando(false); }
  };

  const resumenHoras = useMemo(() => {
    const porEmpleado = new Map();
    const pausasInicio = new Set(["PAUSA_CAFE_INICIO", "PAUSA_DESAYUNO_INICIO", "PAUSA_COMIDA_INICIO", "PAUSA_CIGARRILLO_INICIO", "AUSENCIA"]);
    const pausasFin = new Set(["PAUSA_DESAYUNO_FIN", "PAUSA_COMIDA_FIN", "PAUSA_CIGARRILLO_FIN", "RETORNO_AUSENCIA"]);
    const ordenados = [...marcajesCalculo].sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    const estados = new Map();
    const inicioRango = desde ? new Date(desde + "T00:00:00").getTime() : -Infinity;
    const finRango = hasta ? new Date(DESPLAZAR_DIA(hasta, 1) + "T00:00:00").getTime() : Infinity;

    for (const m of ordenados) {
      if (!estados.has(m.empleado_id)) estados.set(m.empleado_id, {
        entrada: null, pausa: null, ultimoInstante: null, segundosJornada: 0,
        totalSeg: 0, incompletas: 0, entradaEnRango: false
      });
      const s = estados.get(m.empleado_id);
      const ts = new Date(m.fecha_hora).getTime();

      // Acumula solo el tiempo efectivamente trabajado y dentro del rango,
      // manteniendo el estado aunque la entrada o la salida caigan fuera del filtro.
      if (s.entrada !== null && s.pausa === null && s.ultimoInstante !== null) {
        const a = Math.max(s.ultimoInstante, inicioRango);
        const b = Math.min(ts, finRango);
        if (b > a) s.segundosJornada += (b - a) / 1000;
      }

      if (m.tipo === "ENTRADA") {
        if (s.entrada !== null && s.entradaEnRango) s.incompletas++;
        s.entrada = ts;
        s.pausa = null;
        s.segundosJornada = 0;
        s.entradaEnRango = ts >= inicioRango && ts < finRango;
      } else if (pausasInicio.has(m.tipo) && s.entrada !== null && s.pausa === null) {
        s.pausa = ts;
      } else if (pausasFin.has(m.tipo) && s.pausa !== null) {
        s.pausa = null;
      } else if (m.tipo === "SALIDA" && s.entrada !== null) {
        if (s.pausa !== null && s.entradaEnRango) s.incompletas++;
        s.totalSeg += Math.max(0, s.segundosJornada);
        s.entrada = null;
        s.pausa = null;
        s.segundosJornada = 0;
        s.entradaEnRango = false;
      }
      s.ultimoInstante = ts;
    }

    for (const [id, s] of estados) {
      if (s.entrada !== null && s.entradaEnRango) s.incompletas++;
      porEmpleado.set(id, {
        horas: Math.round(s.totalSeg / 36) / 100,
        incompletas: s.incompletas
      });
    }
    return porEmpleado;
  }, [marcajesCalculo, desde, hasta]);

  const empleadosConMarcajes = new Set(marcajes.map((m) => m.empleado_id)).size;
  const periodo = periodos.find((p) => p.anio === Number((desde || "").slice(0, 4)) && p.mes === Number((desde || "").slice(5, 7)));
  const input = "mt-1 w-full px-3 py-2.5";
  const filasOrdenables = useMemo(() => marcajes.map((m) => ({ ...m, _tipoOrden: LABEL(m.tipo), _estadoOrden: m.modificado ? (m.ultima_accion || "MODIFICADO") : "ORIGINAL", _horasOrden: resumenHoras.get(m.empleado_id)?.horas ?? "" })), [marcajes, resumenHoras]);
  const ordenMarcajes = useSortableData(filasOrdenables);
  const label = "block";

  return <div className="w-full min-w-0">
    <section className="mb-5 p-4">
      <h2>Asignación anual de vacaciones</h2><p className="mt-1">Configura los días iniciales de cada empleado; las solicitudes aprobadas descuentan el saldo.</p>
      <form className="molsan-form molsan-form-grid mt-3" onSubmit={async (e) => { e.preventDefault(); setGuardando(true); setError(""); setMensaje(""); try { const d = new FormData(); d.append("empleado_id", empleadoBolsaId); d.append("anio", anioBolsa); d.append("dias_asignados", diasBolsa); await axios.post("/fichajes/admin/vacaciones-bolsa", d); setMensaje("Bolsa anual de vacaciones guardada."); } catch (err) { setError(err?.response?.data?.detail || "No se pudo guardar la bolsa de vacaciones."); } finally { setGuardando(false); } }}>
        <label className={label}>Empleado<select required value={empleadoBolsaId} onChange={(e) => setEmpleadoBolsaId(e.target.value)} className={input}><option value="">Selecciona empleado…</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
        <label className={label}>Año<input required type="number" min="2000" max="2100" value={anioBolsa} onChange={(e) => setAnioBolsa(e.target.value)} className={input} /></label>
        <label className={label}>Días asignados<input required type="number" min="0" max="60" value={diasBolsa} onChange={(e) => setDiasBolsa(e.target.value)} className={input} /></label>
        <div className="flex items-end"><button type="submit" disabled={guardando || !empleadoBolsaId} className="w-full px-4 py-3">Guardar asignación</button></div>
      </form>
    </section>

    <div className="molsan-filter-bar">
      <label className={label}>Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={input} /></label>
      <label className={label}>Hasta<input type="date" min={desde} value={hasta} onChange={(e) => setHasta(e.target.value)} className={input} /></label>
      <label className={label}>Empleado<select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} className={input}><option value="">Toda la plantilla</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
      <label className={label}>Buscar empleado / observación<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, usuario, nota…" className={input} /></label>
      <label className={label}>Tipo de movimiento<select value={tipo} onChange={(e) => setTipo(e.target.value)} className={input}><option value="">Todos los tipos</option>{TIPOS.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>
      <label className={label}>Estado del registro<select value={estado} onChange={(e) => setEstado(e.target.value)} className={input}><option value="">Todos</option><option value="ORIGINAL">Sin correcciones</option><option value="MODIFICADO">Con historial administrativo</option></select></label>
      <div className="flex items-end"><button type="button" onClick={cargar} className="w-full px-4 py-3">Actualizar datos</button></div>
      <div className="flex items-end"><button type="button" onClick={() => abrirEditor(null)} className="w-full px-4 py-3">+ Añadir marcaje olvidado</button></div>
    </div>

    <section className="mt-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3>Cierre y protección de periodos</h3><p className="mt-1">Mes seleccionado: {desde ? desde.slice(5,7) + "/" + desde.slice(0,4) : "—"} · {periodo?.cerrado ? "CERRADO" : "Abierto"}</p></div>{periodo?.cerrado && <span className="px-3 py-1.5">Periodo cerrado</span>}</div>
      <p className="mt-1">Los meses cerrados bloquean las altas y correcciones. Reabrirlos requiere un motivo que queda registrado.</p>
      <div className="molsan-form-grid mt-3"><label className={label}>Motivo obligatorio<input value={motivoPeriodo} onChange={(e) => setMotivoPeriodo(e.target.value)} placeholder="Ej. nómina procesada…" className={input} /></label><button type="button" disabled={guardando || !!periodo?.cerrado} onClick={() => cambiarPeriodo(true)} className="self-end px-4 py-3">Cerrar mes</button><button type="button" disabled={guardando || !periodo?.cerrado} onClick={() => cambiarPeriodo(false)} className="self-end px-4 py-3">Reabrir mes</button></div>
      <div className="mt-3 flex flex-wrap gap-2">{periodos.filter((p) => p.cerrado).map((p) => <span key={p.anio + "-" + p.mes} className="px-3 py-1.5">{PAD(p.mes)}/{p.anio} · Cerrado</span>)}</div>
    </section>

    {error && <div role="alert" className="mt-4 p-3">{error}</div>}
    {mensaje && <div role="status" className="mt-4 p-3">{mensaje}</div>}

    <div className="mt-5 grid gap-3 sm:grid-cols-3"><article className="p-4"><p>Marcajes en el periodo</p><p className="mt-2">{marcajes.length}</p></article><article className="p-4"><p>Empleados con marcajes</p><p className="mt-2">{empleadosConMarcajes}</p></article><article className="p-4"><p>Marcajes corregidos / añadidos</p><p className="mt-2">{marcajes.filter((m) => m.modificado).length}</p></article></div>

    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[1250px]"><thead><tr className="uppercase"><MolsanSortableTh label="Empleado" sortKey="empleado_nombre" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="p-3" /><MolsanSortableTh label="Fecha" sortKey="fecha_hora" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="p-3" /><MolsanSortableTh label="Hora" sortKey="fecha_hora" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="p-3" /><MolsanSortableTh label="Tipo" sortKey="_tipoOrden" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="p-3" /><MolsanSortableTh label="Observaciones" sortKey="observaciones" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="p-3" /><MolsanSortableTh label="Estado" sortKey="_estadoOrden" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="p-3" /><MolsanSortableTh label="Horas cerradas periodo" sortKey="_horasOrden" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="p-3" /><th className="p-3">Acciones</th></tr></thead>
        <tbody>{ordenMarcajes.items.map((m) => <tr key={m.id}><td className="p-3">{m.empleado_nombre}</td><td className="p-3">{HUMAN_DATE(m.fecha_hora)}</td><td className="p-3">{HUMAN_TIME(m.fecha_hora)}</td><td className="p-3">{LABEL(m.tipo)}</td><td className="max-w-[220px] p-3">{m.observaciones || "—"}</td><td className="p-3">{m.modificado ? <span className="px-2 py-1">{m.ultima_accion === "ALTA_ADMIN" ? "Añadido por administración" : "Corregido por administración"}</span> : <span>Original</span>}{m.periodo_cerrado && <span className="ml-1 px-2 py-1">Mes cerrado</span>}</td><td className="p-3"><span>{resumenHoras.get(m.empleado_id)?.horas ?? "—"} h</span><span className="block">Incompletas: {resumenHoras.get(m.empleado_id)?.incompletas ?? "—"}</span></td><td className="p-3"><div className="flex gap-2"><button type="button" disabled={m.periodo_cerrado} onClick={() => abrirEditor(m)} className="px-3 py-2">Corregir</button><button type="button" onClick={() => verHistorial(m)} className="px-3 py-2">Historial</button></div></td></tr>)}{!marcajes.length && <tr><td colSpan="8" className="p-10">{cargando ? "Cargando marcajes…" : "No hay marcajes para los filtros seleccionados."}</td></tr>}</tbody>
      </table>
    </div>

    {historialId !== null && <section className="mt-5 p-4"><div className="flex items-center justify-between gap-3"><h3>Historial de auditoría del marcaje #{historialId}</h3><button type="button" onClick={() => setHistorialId(null)} className="px-3 py-2">Cerrar</button></div><div className="mt-3 space-y-3">{historial.map((a) => <article key={a.id} className="p-3"><p>{a.accion === "ALTA_ADMIN" ? "Alta administrativa" : "Corrección administrativa"} · {a.actor_nombre}</p><p className="mt-1">{a.creado_en ? new Date(a.creado_en).toLocaleString("es-ES") : "—"} · Motivo: {a.motivo}</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><div className="p-2"><p>Antes</p><pre className="mt-1 whitespace-pre-wrap">{a.datos_anteriores ? JSON.stringify(a.datos_anteriores, null, 2) : "No existía: alta administrativa."}</pre></div><div className="p-2"><p>Después</p><pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(a.datos_nuevos, null, 2)}</pre></div></div></article>)}{!historial.length && <p>Este registro todavía no tiene cambios administrativos auditados.</p>}</div></section>}

    {editor && <div className="molsan-modal-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4"><form ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={editor.nuevo ? "Añadir marcaje olvidado" : "Corregir marcaje"} onSubmit={guardar} className="molsan-modal__panel flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden"><header className="molsan-modal__header flex items-center justify-between gap-3 px-5 py-4"><h3>{editor.nuevo ? "Añadir marcaje olvidado" : "Corregir marcaje"}</h3><button type="button" onClick={cerrarEditor} disabled={guardando} className="px-3 py-2">Cerrar</button></header><div className="molsan-modal__body min-h-0 flex-1 overflow-y-auto p-5"><p>La corrección guarda una copia inmutable de los datos anteriores y posteriores junto al motivo.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className={label}>Empleado<select required value={form.empleado_id} onChange={(e) => setForm({ ...form, empleado_id: e.target.value })} className={input}><option value="">Selecciona empleado…</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label><label className={label}>Tipo de movimiento<select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={input}>{TIPOS.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label><label className={label + "sm:col-span-2"}>Fecha y hora<input required type="datetime-local" value={form.fecha_hora} onChange={(e) => setForm({ ...form, fecha_hora: e.target.value })} className={input} /></label><label className={label + "sm:col-span-2"}>Observaciones<input maxLength={500} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className={input} placeholder="Opcional" /></label><label className={label + "sm:col-span-2"}>Motivo obligatorio<input required minLength={5} maxLength={500} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={input} placeholder="Ej. el empleado olvidó fichar la entrada" /></label></div></div><footer className="molsan-modal__footer flex justify-end gap-2 px-5 py-4"><button type="button" onClick={() => setEditor(null)} className="molsan-btn molsan-btn--secondary">Cancelar</button><button type="submit" disabled={guardando} className="molsan-btn molsan-btn--primary">{guardando ? "Guardando…" : "Guardar con auditoría"}</button></footer></form></div>}
  </div>;
}
