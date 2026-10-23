import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

const mesActual = () => new Date().toISOString().slice(0, 7);
const fecha = (v) => v ? new Date(v).toLocaleDateString("es-ES") : "—";
const estado = (v) => ({ pendiente: "Pendiente de validar", validada: "Relación validada", sin_factura: "Sin factura", pendiente_revision: "Factura pendiente", aceptada: "Factura aceptada", rechazada: "Factura rechazada", correccion_solicitada: "Corrección solicitada" }[v] || v || "—");

export default function ControlApoderados({ modo = "colaborador" }) {
  const admin = modo === "admin";
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState(mesActual());
  const [item, setItem] = useState(null);
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [discrepancia, setDiscrepancia] = useState("");
  const [observaciones, setObservaciones] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setError(""); setMensaje("");
    try {
      if (admin) {
        const [rel, col] = await Promise.all([
          axios.get("/apoderagest/liquidaciones/admin", { params: { periodo } }),
          axios.get("/apoderagest/liquidaciones/admin/colaboradores"),
        ]);
        setItems(Array.isArray(rel.data) ? rel.data : []);
        setColaboradores(Array.isArray(col.data) ? col.data : []);
      } else {
        const res = await axios.get("/apoderagest/liquidaciones/mi", { params: { periodo } });
        setItem(res.data);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "No se han podido cargar las liquidaciones. Comprueba tus permisos y que tu ficha esté habilitada como colaborador.");
    } finally { setCargando(false); }
  }, [admin, periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const validar = async () => {
    if (!item) return;
    setCargando(true); setError("");
    try {
      const data = new FormData(); data.append("discrepancia", discrepancia);
      await axios.post(`/apoderagest/liquidaciones/mi/${item.id}/validar`, data);
      setMensaje("Relación mensual validada. Ya puedes presentar tu factura.");
      setDiscrepancia(""); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido validar la relación."); }
    finally { setCargando(false); }
  };

  const subir = async () => {
    if (!item || !archivo) return;
    setCargando(true); setError("");
    try {
      const data = new FormData(); data.append("archivo", archivo);
      await axios.post(`/apoderagest/liquidaciones/mi/${item.id}/factura`, data);
      setArchivo(null); setMensaje("Factura enviada para revisión por Molsan."); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido subir la factura."); }
    finally { setCargando(false); }
  };

  const marcar = async (col, valor) => {
    try {
      await axios.patch(`/apoderagest/liquidaciones/admin/colaboradores/${col.id}`, null, { params: { es_colaborador: valor } });
      setColaboradores((prev) => prev.map((x) => x.id === col.id ? { ...x, es_colaborador: valor } : x));
      setMensaje(`Ficha de ${col.nombre} actualizada.`);
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido actualizar el colaborador."); }
  };

  const revisar = async (x, decision) => {
    try {
      const data = new FormData(); data.append("decision", decision); data.append("observaciones", observaciones[x.id] || "");
      await axios.post(`/apoderagest/liquidaciones/admin/${x.id}/factura/revisar`, data);
      setMensaje("Revisión de factura guardada."); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido guardar la revisión."); }
  };

  const descargar = async (x) => {
    try {
      const res = await axios.get(`/apoderagest/liquidaciones/admin/${x.id}/factura`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data); const a = document.createElement("a");
      a.href = url; a.download = x.factura_nombre || "factura"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido descargar la factura."); }
  };

  return <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · APODERAGEST</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">{admin ? "Control Apoderados" : "Mi actividad y liquidaciones"}</h1>
          <p className="mt-2 text-sm text-slate-500">{admin ? "Gestiona colaboradores, relaciones mensuales y revisión de facturas." : "Revisa las firmas reales del mes, valida la relación y presenta tu factura."}</p>
        </div>
        <div className="flex items-center gap-3"><label className="text-sm font-medium text-slate-600">Periodo <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="ml-2 rounded-xl border border-slate-300 px-3 py-2" /></label>
        <button onClick={cargar} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50" disabled={cargando}>↻ Actualizar</button></div>
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</div>}
    {cargando && <p className="animate-pulse text-sm text-slate-500">Cargando información…</p>}
    {admin ? <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Colaboradores habilitados</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">Activa el circuito en la ficha de empleado correspondiente; no se crean fichas duplicadas.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Empleado</th><th className="p-3">Estado</th><th className="p-3">Colaborador</th></tr></thead><tbody>{colaboradores.map((c) => <tr key={c.id} className="border-b last:border-0"><td className="p-3 font-medium text-slate-800">{c.nombre} <span className="text-slate-400">#{c.id}</span></td><td className="p-3">{c.activo ? "Activo" : "Inactivo"}</td><td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={c.es_colaborador} onChange={(e) => marcar(c, e.target.checked)} /> Habilitado</label></td></tr>)}</tbody></table></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Relaciones mensuales y facturas</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">Se muestran las relaciones guardadas para el periodo seleccionado. La instantánea validada por el colaborador se conserva para auditoría.</p>
        {items.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Todavía no hay relaciones guardadas para este periodo. El colaborador debe acceder a su liquidación para generar y revisar su relación.</p> : <div className="space-y-4">{items.map((x) => <article key={x.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800">{x.colaborador}</h3><p className="text-sm text-slate-500">{x.periodo} · {x.expedientes?.length || 0} firmas · {estado(x.estado_relacion)}</p><p className="mt-1 text-sm text-slate-500">Factura: {estado(x.estado_factura)} {x.factura_nombre ? `· ${x.factura_nombre}` : ""}</p></div>{x.tiene_factura && <button onClick={() => descargar(x)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Descargar factura</button>}</div>
          <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-indigo-700">Ver expedientes incluidos ({x.expedientes?.length || 0})</summary><div className="mt-2 overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Expediente</th><th className="p-2 text-left">Fecha firma</th><th className="p-2 text-left">Protocolo</th></tr></thead><tbody>{(x.expedientes || []).map((e) => <tr key={e.expediente_id}><td className="p-2">{e.id_expediente}</td><td className="p-2">{fecha(e.fecha_firma)}</td><td className="p-2">{e.protocolo || "—"}</td></tr>)}</tbody></table></div></details>
          {x.tiene_factura && <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><textarea value={observaciones[x.id] ?? x.factura_observaciones ?? ""} onChange={(e) => setObservaciones((p) => ({ ...p, [x.id]: e.target.value }))} placeholder="Observaciones para el colaborador…" className="min-h-20 rounded-xl border border-slate-300 p-3 text-sm" /><div className="flex flex-wrap gap-2"><button onClick={() => revisar(x, "aceptada")} className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Aceptar</button><button onClick={() => revisar(x, "correccion_solicitada")} className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800">Pedir corrección</button><button onClick={() => revisar(x, "rechazada")} className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">Rechazar</button></div></div>}
        </article>)}</div>}
      </section>
    </> : item ? <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-800">Relación de expedientes firmados</h2><p className="mt-1 text-sm text-slate-500">Solo se incluyen expedientes cuya fecha de firma real pertenece al mes seleccionado y cuya ficha identifica este colaborador como apoderado.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{item.expedientes?.length || 0} firmas</span></div>
        {item.expedientes?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Expediente</th><th className="p-3">Fecha firma</th><th className="p-3">Protocolo</th><th className="p-3">Notario</th></tr></thead><tbody>{item.expedientes.map((e) => <tr key={e.expediente_id} className="border-b last:border-0"><td className="p-3 font-semibold">{e.id_expediente}</td><td className="p-3">{fecha(e.fecha_firma)}</td><td className="p-3">{e.protocolo || "—"}</td><td className="p-3">{e.notario || "—"}</td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No constan firmas reales a tu nombre en este periodo.</p>}
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Estado: {estado(item.estado_relacion)}</p>{item.validado_en && <p className="mt-1 text-sm text-slate-500">Validada el {fecha(item.validado_en)} · versión {item.validado_version}</p>}
          {item.estado_relacion !== "validada" ? <><label className="mt-4 block text-sm font-medium text-slate-700">Observaciones o discrepancias (opcional)<textarea value={discrepancia} onChange={(e) => setDiscrepancia(e.target.value)} maxLength={2000} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Indica si falta una firma o hay algún dato incorrecto…" /></label><button onClick={validar} disabled={cargando} className="mt-3 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Validar relación mensual</button></> : <p className="mt-2 text-sm text-emerald-700">Relación validada. Ya puedes presentar la factura del periodo.</p>}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Presentar factura mensual</h2><p className="mt-1 text-sm text-slate-500">Se habilita únicamente después de validar la relación. Formatos admitidos: PDF, XML, JPG o PNG; máximo 10 MB.</p>
        {item.factura_nombre && <p className="mt-3 text-sm">Archivo presentado: <strong>{item.factura_nombre}</strong> · {estado(item.estado_factura)}</p>}
        {item.estado_relacion === "validada" ? <div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="max-w-full text-sm" /><button onClick={subir} disabled={!archivo || cargando} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{item.factura_nombre ? "Sustituir factura" : "Enviar factura"}</button></div> : <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Primero valida la relación de expedientes.</p>}
        {item.factura_observaciones && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Observaciones de Molsan: {item.factura_observaciones}</p>}
      </section>
    </> : !cargando && <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No se ha podido cargar la relación mensual. Si eres colaborador, solicita que habiliten tu ficha desde Utilidades → Control Apoderados.</section>}
    <div><button onClick={() => navigate(admin ? "/herramientas/utilidades" : "/apoderagest")} className="text-sm font-semibold text-indigo-700 hover:underline">← Volver</button></div>
  </div>;
}
