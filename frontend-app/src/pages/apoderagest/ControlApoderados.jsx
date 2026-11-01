import MolsanDataTable from "../../components/ui/MolsanDataTable";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import { formatEuro as euros } from "../../utils/formatters";

const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const moverMes = (periodo, delta) => { const [y, m] = periodo.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

const fecha = (v) => v ? new Date(v).toLocaleDateString("es-ES") : "—";
const estado = (v) => ({ pendiente: "Pendiente de validar", validada: "Relación validada", sin_factura: "Sin factura", pendiente_revision: "Factura pendiente", aceptada: "Factura aceptada", rechazada: "Factura rechazada", correccion_solicitada: "Corrección solicitada" }[v] || v || "—");

export default function ControlApoderados({ modo = "colaborador" }) {
  const admin = modo === "admin";
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState(mesActual());
  const [item, setItem] = useState(null);
  const [items, setItems] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [archivo, setArchivo] = useState(null);
  const [justificanteArchivo, setJustificanteArchivo] = useState(null);
  const [discrepancia, setDiscrepancia] = useState("");
  const [observaciones, setObservaciones] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [firmasAbiertas, setFirmasAbiertas] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true); setError(""); setMensaje("");
    try {
      if (admin) {
        const [rel, colabs] = await Promise.all([
          axios.get("/apoderagest/liquidaciones/admin", { params: { periodo } }),
          axios.get("/apoderagest/liquidaciones/admin/colaboradores"),
        ]);
        setItems(Array.isArray(rel.data) ? rel.data : []);
        setColaboradores(Array.isArray(colabs.data) ? colabs.data : []);
      } else {
        const [res, hist] = await Promise.all([
          axios.get("/apoderagest/liquidaciones/mi", { params: { periodo } }),
          axios.get("/apoderagest/liquidaciones/mis-periodos"),
        ]);
        setItem(res.data);
        setHistorial(Array.isArray(hist.data) ? hist.data : []);
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

  const subirJustificante = async () => {
    if (!item || !justificanteArchivo) return;
    setCargando(true); setError("");
    try {
      const data = new FormData(); data.append("archivo", justificanteArchivo);
      await axios.post(`/apoderagest/liquidaciones/mi/${item.id}/justificante`, data);
      setJustificanteArchivo(null); setMensaje("Justificante adjuntado a la liquidación mensual."); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido subir el justificante."); }
    finally { setCargando(false); }
  };

  const cambiarColaborador = async (empleado, habilitar) => {
    setCargando(true); setError(""); setMensaje("");
    try {
      await axios.patch(`/apoderagest/liquidaciones/admin/colaboradores/${empleado.id}`, null, {
        params: { es_colaborador: habilitar },
      });
      setColaboradores((actuales) => actuales.map((e) =>
        e.id === empleado.id ? { ...e, es_colaborador: habilitar } : e
      ));
      setMensaje(`Se ha ${habilitar ? "habilitado" : "deshabilitado"} a ${empleado.nombre} como colaborador.`);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido actualizar el permiso de colaborador.");
    } finally { setCargando(false); }
  };

  const revisar = async (x, decision) => {
    try {
      const data = new FormData(); data.append("decision", decision); data.append("observaciones", observaciones[x.id] || "");
      await axios.post(`/apoderagest/liquidaciones/admin/${x.id}/factura/revisar`, data);
      setMensaje("Revisión de factura guardada."); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido guardar la revisión."); }
  };

  const revisarRelacion = async (x, decision) => {
    try {
      const data = new FormData();
      data.append("decision", decision);
      data.append("observaciones", observaciones[`rel-${x.id}`] || "");
      await axios.post(`/apoderagest/liquidaciones/admin/${x.id}/relacion/revisar`, data);
      setMensaje("Revisión de la relación mensual guardada.");
      await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido guardar la revisión de la relación."); }
  };

  const descargarJustificante = async (x) => {
    try {
      const res = await axios.get(`/apoderagest/liquidaciones/admin/${x.id}/justificante`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data); const a = document.createElement("a");
      a.href = url; a.download = x.justificante_nombre || "justificante"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido descargar el justificante."); }
  };

  const descargar = async (x) => {
    try {
      const res = await axios.get(`/apoderagest/liquidaciones/admin/${x.id}/factura`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data); const a = document.createElement("a");
      a.href = url; a.download = x.factura_nombre || "factura"; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido descargar la factura."); }
  };

  return <div className="molsan-page-stack control-apoderados-page min-h-full">
    <header className="molsan-page-header">
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">AG</div>
        <div className="min-w-0">
          <p className="molsan-page-header__eyebrow">MOLSAN ERP · APODERAGEST</p>
          <h1 className="molsan-page-header__title">{admin ? "Control Apoderados" : "Mi actividad y liquidaciones"}</h1>
          <p className="molsan-page-header__description">{admin ? "Gestiona colaboradores, relaciones mensuales y revisión de facturas." : "Revisa las firmas reales del mes, valida la relación y presenta tu factura."}</p>
        </div>
      </div>
      <div className="molsan-page-header__actions">{!admin && <label className="text-sm font-medium text-slate-600">Periodo <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="ml-2 rounded-xl border border-slate-300 px-3 py-2" /></label>}<button onClick={cargar} className="molsan-btn molsan-btn--secondary" disabled={cargando}>↻ Actualizar</button></div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{mensaje}</div>}
    {cargando && <p className="animate-pulse text-sm text-slate-500">Cargando información…</p>}
    {admin ? <>
      <section className="erp-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">Colaboradores habilitados</h2>
          <p className="mt-1 text-sm text-slate-500">Activa aquí el acceso a «Mi liquidación» para cada empleado. El cambio se guarda en su ficha y determina quién puede validar firmas y presentar facturas.</p>
        </div>
        <MolsanDataTable
          rows={colaboradores}
          searchable
          pagination
          pageSize={25}

          rowKey="id"
          initialSort={{ key: "nombre", direction: "asc" }}
          emptyText="No hay empleados en el catálogo."
          columns={[
            { key: "nombre", header: "Empleado", accessor: "nombre", sortType: "text", render: (value) => <strong className="text-slate-800">{value}</strong> },
            { key: "activo", header: "Estado laboral", accessor: "activo", sortType: "boolean", render: (value) => value ? "Activo" : "Inactivo" },
            { key: "es_colaborador", header: "Acceso a liquidaciones", accessor: (item) => Boolean(item.es_colaborador), sortType: "boolean", render: (value, item) => <label className="inline-flex items-center gap-2 font-medium"><input type="checkbox" checked={value} disabled={cargando || !item.activo} onChange={(ev) => cambiarColaborador(item, ev.target.checked)} className="h-4 w-4 rounded border-slate-300" />{value ? "Habilitado" : "No habilitado"}</label> },
          ]}
        />
      </section>
      <section className="erp-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Liquidación mensual de colaboradores</h2>
            <p className="mt-1 text-sm text-slate-500">Periodo natural completo: del día 1 al último día del mes. Un protocolo cuenta una sola vez por colaborador, notario y número de protocolo.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Mes anterior" onClick={() => setPeriodo(moverMes(periodo, -1))} className="rounded-xl border border-slate-300 px-3 py-2 font-bold hover:bg-slate-50">←</button>
            <label className="text-sm font-semibold text-slate-600">Mes
              <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="ml-2 rounded-xl border border-slate-300 px-3 py-2" />
            </label>
            <button type="button" aria-label="Mes siguiente" onClick={() => setPeriodo(moverMes(periodo, 1))} className="rounded-xl border border-slate-300 px-3 py-2 font-bold hover:bg-slate-50">→</button>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5"><p className="text-sm font-semibold text-indigo-700">Protocolos firmados</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{items.reduce((s, x) => s + Number(x.protocolos_firmados ?? x.expedientes?.length ?? 0), 0)}</p><p className="mt-1 text-xs text-slate-500">Protocolos únicos, no número de expedientes</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Cancelaciones sin provisión</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{items.reduce((s, x) => s + Number(x.cancelaciones_sin_provision || 0), 0)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Cancelaciones con provisión</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{items.reduce((s, x) => s + Number(x.cancelaciones_con_provision || 0), 0)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Facturación neta total</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{euros(items.reduce((s, x) => s + Number(x.base_neta ?? x.honorarios ?? 0), 0))}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">IVA total (21%)</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{euros(items.reduce((s, x) => s + Number(x.iva || 0), 0))}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"><p className="text-sm font-semibold text-emerald-800">Total facturación</p><p className="mt-2 text-2xl font-extrabold text-emerald-950">{euros(items.reduce((s, x) => s + Number(x.total ?? (Number(x.base_neta || 0) + Number(x.iva || 0))), 0))}</p></div>
      </section>
      <section className="erp-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-800">Relación del mes · {periodo}</h2><p className="mt-1 text-sm text-slate-500">Las firmas se obtienen de la fecha de firma real en FichaExpediente. La factura solo se puede validar tras revisar la relación mensual.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{items.length} colaboradores</span></div>
        {items.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay colaboradores habilitados ni relaciones para este periodo.</p> : <div className="mt-4">
          <MolsanDataTable
            rows={items}
          searchable
          pagination
          pageSize={25}

            rowKey="id"
            minWidth="1500px"
            initialSort={{ key: "colaborador", direction: "asc" }}
            columns={[
              { key: "colaborador", header: "Colaborador", accessor: "colaborador", sortType: "text", render: (value, item) => <><p className="font-bold text-slate-800">{value}</p><p className="mt-1 text-xs text-slate-500">{item.protocolos_firmados ?? item.expedientes?.length ?? 0} protocolo(s) · {estado(item.estado_relacion)}</p><p className="mt-1 text-xs text-slate-500">Factura: {estado(item.estado_factura)}</p></> },
              { key: "cancelaciones_sin_provision", header: "Cancelaciones sin provisión", accessor: "cancelaciones_sin_provision", sortType: "number", align: "right", render: (value) => value ?? 0 },
              { key: "cancelaciones_con_provision", header: "Cancelaciones con provisión", accessor: "cancelaciones_con_provision", sortType: "number", align: "right", render: (value) => value ?? 0 },
              { key: "honorarios", header: "Honorarios", accessor: "honorarios_unitarios", sortType: "currency", align: "right", render: (value) => euros(value) },
              { key: "base_neta", header: "Base neta", accessor: (item) => item.base_neta ?? item.honorarios, sortType: "currency", align: "right", render: (value) => euros(value) },
              { key: "total", header: "Total", accessor: (item) => item.total ?? (Number(item.base_neta || 0) + Number(item.iva || 0)), sortType: "currency", align: "right", render: (value) => <strong>{euros(value)}</strong> },
              { key: "factura", header: "Ver factura", sortable: false, accessor: (item) => item.id, render: (_, item) => item.tiene_factura ? <button type="button" onClick={() => descargar(item)} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Ver factura</button> : <span className="text-slate-400">Pendiente</span> },
              { key: "justificante", header: "Justificante", sortable: false, accessor: (item) => item.id, render: (_, item) => item.justificante_nombre ? <button type="button" onClick={() => descargarJustificante(item)} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">Ver justificante</button> : <span className="text-slate-400">No aportado</span> },
              { key: "validar", header: "Validar", sortable: false, accessor: (item) => item.id, render: (_, item) => <div className="flex min-w-[190px] flex-col gap-2"><textarea value={observaciones[item.id] || ""} onChange={(ev) => setObservaciones((prev) => ({ ...prev, [item.id]: ev.target.value }))} maxLength={2000} placeholder="Observaciones de factura…" className="min-h-16 rounded-lg border border-slate-300 p-2 text-xs" aria-label={`Observaciones de factura de ${item.colaborador}`} />{item.tiene_factura && <button type="button" onClick={() => revisar(item, "aceptada")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Aceptar factura</button>}{item.tiene_factura && <button type="button" onClick={() => revisar(item, "correccion_solicitada")} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800">Solicitar corrección</button>}{item.tiene_factura && <button type="button" onClick={() => revisar(item, "rechazada")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Rechazar factura</button>}<textarea value={observaciones[`rel-${item.id}`] || ""} onChange={(ev) => setObservaciones((prev) => ({ ...prev, [`rel-${item.id}`]: ev.target.value }))} maxLength={2000} placeholder="Observaciones de relación…" className="min-h-16 rounded-lg border border-slate-300 p-2 text-xs" aria-label={`Observaciones de relación de ${item.colaborador}`} /><button type="button" onClick={() => revisarRelacion(item, "aceptada")} disabled={!item.validado_en} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-40">Aceptar relación</button><button type="button" onClick={() => revisarRelacion(item, "correccion_solicitada")} disabled={!item.validado_en} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-40">Solicitar corrección de relación</button><button type="button" onClick={() => revisarRelacion(item, "rechazada")} disabled={!item.validado_en} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">Rechazar relación</button></div> },
              { key: "firmas", header: "Ver firmas", sortable: false, accessor: (item) => item.id, render: (_, item) => <button type="button" onClick={() => setFirmasAbiertas(item)} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Ver firmas ({item.expedientes?.length || 0})</button> },
            ]}
          />
        </div>}
      </section>
      {firmasAbiertas && <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Listado de firmas">
        <section className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Control Apoderados · {periodo}</p><h2 className="mt-1 text-xl font-bold text-slate-900">Firmas de {firmasAbiertas.colaborador}</h2><p className="mt-1 text-sm text-slate-500">{firmasAbiertas.protocolos_firmados ?? firmasAbiertas.expedientes?.length ?? 0} protocolos únicos · {firmasAbiertas.expedientes?.length || 0} expedientes</p></div><button type="button" onClick={() => setFirmasAbiertas(null)} className="rounded-xl border px-3 py-2 font-semibold">Cerrar ✕</button></header>
          <div className="max-h-[65vh] overflow-auto p-5"><MolsanDataTable
            rows={firmasAbiertas.expedientes || []}
          searchable
          pagination
          pageSize={25}

            rowKey="expediente_id"
            initialSort={{ key: "fecha_firma", direction: "desc" }}
            emptyText="No hay firmas registradas en este periodo."
            columns={[
              { key: "id_expediente", header: "Expediente", accessor: "id_expediente", sortType: "text" },
              { key: "fecha_firma", header: "Fecha firma", accessor: "fecha_firma", sortType: "date", render: (value) => fecha(value) },
              { key: "notario", header: "Notario", accessor: "notario", sortType: "text", render: (value) => value || "—" },
              { key: "protocolo", header: "Protocolo", accessor: "protocolo", sortType: "text", render: (value) => value || "Sin protocolo" },
              { key: "tipo_operacion", header: "Operación", accessor: "tipo_operacion", sortType: "text", render: (value) => value || "—" },
            ]}
          /></div>
        </section>
      </div>}
    </> : item ? <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5"><p className="text-sm font-semibold text-indigo-700">Protocolos firmados</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{item.protocolos_firmados ?? item.expedientes?.length ?? 0}</p><p className="mt-1 text-xs text-slate-500">Un protocolo se cuenta una sola vez por notario</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Cancelaciones sin provisión</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{item.cancelaciones_sin_provision ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Cancelaciones con provisión</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{item.cancelaciones_con_provision ?? 0}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Honorarios netos</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{euros(item.honorarios)}</p><p className="mt-1 text-xs text-slate-500">{euros(item.honorarios_unitarios)} por protocolo</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">IVA (21%)</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{euros(item.iva)}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"><p className="text-sm font-semibold text-emerald-800">Total</p><p className="mt-2 text-2xl font-extrabold text-emerald-950">{euros(item.total)}</p></div>
      </section>
      <section className="erp-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-800">Relación de expedientes firmados</h2><p className="mt-1 text-sm text-slate-500">Solo se incluyen expedientes cuya fecha de firma real pertenece al mes seleccionado y cuya ficha identifica este colaborador como apoderado.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{item.protocolos_firmados ?? item.expedientes?.length ?? 0} protocolos</span></div>
        <div className="mt-4"><MolsanDataTable
          rows={item.expedientes || []}
          searchable
          pagination
          pageSize={25}

          rowKey="expediente_id"
          initialSort={{ key: "fecha_firma", direction: "desc" }}
          emptyText="No constan firmas reales a tu nombre en este periodo."
          columns={[
            { key: "id_expediente", header: "Expediente", accessor: "id_expediente", sortType: "text" },
            { key: "fecha_firma", header: "Fecha firma", accessor: "fecha_firma", sortType: "date", render: (value) => fecha(value) },
            { key: "protocolo", header: "Protocolo", accessor: "protocolo", sortType: "text", render: (value) => value || "—" },
            { key: "notario", header: "Notario", accessor: "notario", sortType: "text", render: (value) => value || "—" },
          ]}
        /></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Estado: {estado(item.estado_relacion)}</p>{item.validado_en && <p className="mt-1 text-sm text-slate-500">Validada el {fecha(item.validado_en)} · versión {item.validado_version}</p>}
          {item.estado_relacion !== "validada" ? <><label className="mt-4 block text-sm font-medium text-slate-700">Observaciones o discrepancias (opcional)<textarea value={discrepancia} onChange={(e) => setDiscrepancia(e.target.value)} maxLength={2000} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3" placeholder="Indica si falta una firma o hay algún dato incorrecto…" /></label><button onClick={validar} disabled={cargando} className="mt-3 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Validar relación mensual</button></> : <p className="mt-2 text-sm text-emerald-700">Relación validada. Ya puedes presentar la factura del periodo.</p>}
        </div>
      </section>
      <section className="erp-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-800">Presentar factura mensual</h2><p className="mt-1 text-sm text-slate-500">Se habilita únicamente después de validar la relación. Formatos admitidos: PDF, XML, JPG o PNG; máximo 10 MB.</p>
        {item.factura_nombre && <p className="mt-3 text-sm">Archivo presentado: <strong>{item.factura_nombre}</strong> · {estado(item.estado_factura)}</p>}
        {item.estado_relacion === "validada" ? <div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="max-w-full text-sm" /><button onClick={subir} disabled={!archivo || cargando} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{item.factura_nombre ? "Sustituir factura" : "Enviar factura"}</button></div> : <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Primero valida la relación de expedientes.</p>}
        {item.factura_observaciones && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Observaciones de Molsan: {item.factura_observaciones}</p>}
        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800">Justificante</h3>
          <p className="mt-1 text-sm text-slate-500">{item.justificante_nombre ? `Adjuntado: ${item.justificante_nombre}` : "Adjunta el justificante correspondiente a esta liquidación."} Formatos PDF, XML, JPG o PNG; máximo 10 MB.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3"><input type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={(e) => setJustificanteArchivo(e.target.files?.[0] || null)} className="max-w-full text-sm" /><button type="button" onClick={subirJustificante} disabled={!justificanteArchivo || cargando} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-50">{item.justificante_nombre ? "Sustituir justificante" : "Subir justificante"}</button></div>
        </div>
      </section>
      <section className="erp-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Histórico de liquidaciones</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">Consulta el estado de las relaciones y facturas de otros meses.</p>
        {historial.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Periodo</th><th className="p-3">Firmas</th><th className="p-3">Relación</th><th className="p-3">Factura</th><th className="p-3">Consulta</th></tr></thead><tbody>{historial.map((h) => <tr key={h.id} className="border-b last:border-0"><td className="p-3 font-semibold">{h.periodo}</td><td className="p-3">{h.protocolos_firmados ?? h.expedientes?.length ?? 0}</td><td className="p-3">{estado(h.estado_relacion)}</td><td className="p-3">{estado(h.estado_factura)}</td><td className="p-3"><button onClick={() => setPeriodo(h.periodo)} className="font-semibold text-indigo-700 hover:underline">Abrir mes</button></td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay otros periodos registrados.</p>}
      </section>
    </> : !cargando && <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No se ha podido cargar la relación mensual. Si eres colaborador, solicita que habiliten tu ficha desde Utilidades → Control Apoderados.</section>}
    <div><button onClick={() => navigate(admin ? "/herramientas/utilidades" : "/apoderagest")} className="text-sm font-semibold text-indigo-700 hover:underline">← Volver</button></div>
  </div>;
}
