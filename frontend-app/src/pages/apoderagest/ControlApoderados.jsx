import { useCallback, useEffect, useRef, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const moverMes = (periodo, delta) => { const [y, m] = periodo.split("-").map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const euros = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v || 0));
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
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: Boolean(firmasAbiertas), onClose: () => setFirmasAbiertas(null), dialogRef });
  const ordenColaboradores = useSortableData(colaboradores);
  const itemsOrdenables = useMemo(() => items.map((x) => ({ ...x, _baseNetaOrden: Number(x.base_neta ?? x.honorarios ?? 0), _totalOrden: Number(x.total ?? (Number(x.base_neta ?? x.honorarios ?? 0) + Number(x.iva || 0))), _protocolosOrden: Number(x.protocolos_firmados ?? x.expedientes?.length ?? 0) })), [items]);
  const ordenItems = useSortableData(itemsOrdenables);
  const ordenFirmasAdmin = useSortableData(firmasAbiertas?.expedientes || []);
  const ordenFirmasColaborador = useSortableData(item?.expedientes || []);
  const ordenHistorial = useSortableData(historial);

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

  return <div className="erp-page min-w-0 space-y-6">
    <MolsanPageHeader mark="AP" title={admin ? "Control de apoderados" : "Mi actividad y liquidaciones"} description={admin ? "Gestiona colaboradores, relaciones mensuales y revisión de facturas." : "Revisa las firmas reales del mes, valida la relación y presenta tu factura."} />
    <div className="molsan-filter-bar flex flex-wrap items-center justify-end gap-3 p-3">
      {!admin && <label className="flex items-center gap-2">Periodo <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} /> </label>}
      <button type="button" className="molsan-btn molsan-btn--secondary" onClick={cargar} disabled={cargando}>↻ Actualizar</button>
    </div>
    {error && <div role="alert" className="p-4">{error}</div>}
    {mensaje && <div role="status" className="p-4">{mensaje}</div>}
    {cargando && <p>Cargando información…</p>}
    {admin ? <>
      <section className="erp-card p-5">
        <div className="mb-4">
          <h2>Colaboradores habilitados</h2>
          <p className="mt-1">Activa aquí el acceso a «Mi liquidación» para cada empleado. El cambio se guarda en su ficha y determina quién puede validar firmas y presentar facturas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead><tr className="uppercase"><MolsanSortableTh label="Empleado" sortKey="nombre" sortConfig={ordenColaboradores.sortConfig} onSort={ordenColaboradores.requestSort} className="p-3" /><MolsanSortableTh label="Estado laboral" sortKey="activo" sortConfig={ordenColaboradores.sortConfig} onSort={ordenColaboradores.requestSort} className="p-3" /><MolsanSortableTh label="Acceso a liquidaciones" sortKey="es_colaborador" sortConfig={ordenColaboradores.sortConfig} onSort={ordenColaboradores.requestSort} className="p-3" /></tr></thead>
            <tbody>{ordenColaboradores.items.map((e) => <tr key={e.id}>
              <td className="p-3">{e.nombre}</td>
              <td className="p-3">{e.activo ? "Activo" : "Inactivo"}</td>
              <td className="p-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={Boolean(e.es_colaborador)} disabled={cargando || !e.activo} onChange={(ev) => cambiarColaborador(e, ev.target.checked)} className="h-4 w-4" />{e.es_colaborador ? "Habilitado" : "No habilitado"}</label></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2>Liquidación mensual de colaboradores</h2>
            <p className="mt-1">Periodo natural completo: del día 1 al último día del mes. Un protocolo cuenta una sola vez por colaborador, notario y número de protocolo.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Mes anterior" onClick={() => setPeriodo(moverMes(periodo, -1))} className="px-3 py-2">←</button>
            <label>Mes
              <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="ml-2 px-3 py-2" />
            </label>
            <button type="button" aria-label="Mes siguiente" onClick={() => setPeriodo(moverMes(periodo, 1))} className="px-3 py-2">→</button>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="p-5"><p>Protocolos firmados</p><p className="mt-2">{items.reduce((s, x) => s + Number(x.protocolos_firmados ?? x.expedientes?.length ?? 0), 0)}</p><p className="mt-1">Protocolos únicos, no número de expedientes</p></div>
        <div className="p-5"><p>Cancelaciones sin provisión</p><p className="mt-2">{items.reduce((s, x) => s + Number(x.cancelaciones_sin_provision || 0), 0)}</p></div>
        <div className="p-5"><p>Cancelaciones con provisión</p><p className="mt-2">{items.reduce((s, x) => s + Number(x.cancelaciones_con_provision || 0), 0)}</p></div>
        <div className="p-5"><p>Facturación neta total</p><p className="mt-2">{euros(items.reduce((s, x) => s + Number(x.base_neta ?? x.honorarios ?? 0), 0))}</p></div>
        <div className="p-5"><p>IVA total (21%)</p><p className="mt-2">{euros(items.reduce((s, x) => s + Number(x.iva || 0), 0))}</p></div>
        <div className="p-5"><p>Total facturación</p><p className="mt-2">{euros(items.reduce((s, x) => s + Number(x.total ?? (Number(x.base_neta || 0) + Number(x.iva || 0))), 0))}</p></div>
      </section>
      <section className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2>Relación del mes · {periodo}</h2><p className="mt-1">Las firmas se obtienen de la fecha de firma real en FichaExpediente. La factura solo se puede validar tras revisar la relación mensual.</p></div><span className="px-3 py-1">{items.length} colaboradores</span></div>
        {items.length === 0 ? <p className="p-5">No hay colaboradores habilitados ni relaciones para este periodo.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1250px]">
          <thead><tr className="uppercase">
            <MolsanSortableTh label="Colaborador" sortKey="colaborador" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Cancelaciones sin provisión" sortKey="cancelaciones_sin_provision" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Cancelaciones con provisión" sortKey="cancelaciones_con_provision" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Honorarios" sortKey="honorarios_unitarios" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Base neta" sortKey="_baseNetaOrden" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Total" sortKey="_totalOrden" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Ver factura" sortKey="tiene_factura" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Justificante" sortKey="justificante_nombre" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Validar" sortKey="estado_relacion" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" /><MolsanSortableTh label="Ver firmas" sortKey="_protocolosOrden" sortConfig={ordenItems.sortConfig} onSort={ordenItems.requestSort} className="p-3" />
          </tr></thead>
          <tbody>{ordenItems.items.map((x) => <tr key={x.id}>
            <td className="p-3"><p>{x.colaborador}</p><p className="mt-1">{x.protocolos_firmados ?? x.expedientes?.length ?? 0} protocolo(s) · {estado(x.estado_relacion)}</p><p className="mt-1">Factura: {estado(x.estado_factura)}</p></td>
            <td className="p-3">{x.cancelaciones_sin_provision ?? 0}</td><td className="p-3">{x.cancelaciones_con_provision ?? 0}</td>
            <td className="p-3">{euros(x.honorarios_unitarios)}</td><td className="p-3">{euros(x.base_neta ?? x.honorarios)}</td><td className="p-3">{euros(x.total ?? (Number(x.base_neta || 0) + Number(x.iva || 0)))}</td>
            <td className="p-3">{x.tiene_factura ? <button type="button" onClick={() => descargar(x)} className="px-3 py-2">Ver factura</button> : <span>Pendiente</span>}</td>
            <td className="p-3">{x.justificante_nombre ? <button type="button" onClick={() => descargarJustificante(x)} className="px-3 py-2">Ver justificante</button> : <span>No aportado</span>}</td>
            <td className="p-3"><div className="flex min-w-[190px] flex-col gap-2">
              <textarea value={observaciones[x.id] || ""} onChange={(ev) => setObservaciones((prev) => ({ ...prev, [x.id]: ev.target.value }))} maxLength={2000} placeholder="Observaciones de factura…" className="min-h-16 p-2" aria-label={`Observaciones de factura de ${x.colaborador}`} />
              {x.tiene_factura && <button type="button" onClick={() => revisar(x, "aceptada")} className="px-3 py-2">Aceptar factura</button>}
              {x.tiene_factura && <button type="button" onClick={() => revisar(x, "correccion_solicitada")} className="px-3 py-2">Solicitar corrección</button>}
              {x.tiene_factura && <button type="button" onClick={() => revisar(x, "rechazada")} className="px-3 py-2">Rechazar factura</button>}
              <textarea value={observaciones[`rel-${x.id}`] || ""} onChange={(ev) => setObservaciones((prev) => ({ ...prev, [`rel-${x.id}`]: ev.target.value }))} maxLength={2000} placeholder="Observaciones de relación…" className="min-h-16 p-2" aria-label={`Observaciones de relación de ${x.colaborador}`} />
              <button type="button" onClick={() => revisarRelacion(x, "aceptada")} disabled={!x.validado_en} className="px-3 py-2">Aceptar relación</button>
              <button type="button" onClick={() => revisarRelacion(x, "correccion_solicitada")} disabled={!x.validado_en} className="px-3 py-2">Solicitar corrección de relación</button>
              <button type="button" onClick={() => revisarRelacion(x, "rechazada")} disabled={!x.validado_en} className="px-3 py-2">Rechazar relación</button>
            </div></td>
            <td className="p-3"><button type="button" onClick={() => setFirmasAbiertas(x)} className="px-3 py-2">Ver firmas ({x.expedientes?.length || 0})</button></td>
          </tr>)}</tbody>
        </table></div>}
      </section>
      {firmasAbiertas && <div className="molsan-modal-overlay panel-modal-premium fixed inset-0 z-[12000] flex items-center justify-center p-4">
        <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Listado de firmas" className="molsan-modal__panel flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden">
          <header className="molsan-modal__header flex items-start justify-between gap-4"><div><p className="uppercase">Control Apoderados · {periodo}</p><h2 className="mt-1">Firmas de {firmasAbiertas.colaborador}</h2><p className="mt-1">{firmasAbiertas.protocolos_firmados ?? firmasAbiertas.expedientes?.length ?? 0} protocolos únicos · {firmasAbiertas.expedientes?.length || 0} expedientes</p></div><button type="button" onClick={() => setFirmasAbiertas(null)} className="px-3 py-2">Cerrar ✕</button></header>
          <div className="molsan-modal__body min-h-0 flex-1 overflow-auto p-5">{(firmasAbiertas.expedientes || []).length ? <table className="w-full"><thead><tr><MolsanSortableTh label="Expediente" sortKey="id_expediente" sortConfig={ordenFirmasAdmin.sortConfig} onSort={ordenFirmasAdmin.requestSort} className="p-3" /><MolsanSortableTh label="Fecha firma" sortKey="fecha_firma" sortConfig={ordenFirmasAdmin.sortConfig} onSort={ordenFirmasAdmin.requestSort} className="p-3" /><MolsanSortableTh label="Notario" sortKey="notario" sortConfig={ordenFirmasAdmin.sortConfig} onSort={ordenFirmasAdmin.requestSort} className="p-3" /><MolsanSortableTh label="Protocolo" sortKey="protocolo" sortConfig={ordenFirmasAdmin.sortConfig} onSort={ordenFirmasAdmin.requestSort} className="p-3" /><MolsanSortableTh label="Operación" sortKey="tipo_operacion" sortConfig={ordenFirmasAdmin.sortConfig} onSort={ordenFirmasAdmin.requestSort} className="p-3" /></tr></thead><tbody>{ordenFirmasAdmin.items.map((e) => <tr key={e.expediente_id}><td className="p-3">{e.id_expediente}</td><td className="p-3">{fecha(e.fecha_firma)}</td><td className="p-3">{e.notario || "—"}</td><td className="p-3">{e.protocolo || "Sin protocolo"}</td><td className="p-3">{e.tipo_operacion || "—"}</td></tr>)}</tbody></table> : <p className="p-5">No hay firmas registradas en este periodo.</p>}</div>
        </section>
      </div>}
    </> : item ? <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="p-5"><p>Protocolos firmados</p><p className="mt-2">{item.protocolos_firmados ?? item.expedientes?.length ?? 0}</p><p className="mt-1">Un protocolo se cuenta una sola vez por notario</p></div>
        <div className="p-5"><p>Cancelaciones sin provisión</p><p className="mt-2">{item.cancelaciones_sin_provision ?? 0}</p></div>
        <div className="p-5"><p>Cancelaciones con provisión</p><p className="mt-2">{item.cancelaciones_con_provision ?? 0}</p></div>
        <div className="p-5"><p>Honorarios netos</p><p className="mt-2">{euros(item.honorarios)}</p><p className="mt-1">{euros(item.honorarios_unitarios)} por protocolo</p></div>
        <div className="p-5"><p>IVA (21%)</p><p className="mt-2">{euros(item.iva)}</p></div>
        <div className="p-5"><p>Total</p><p className="mt-2">{euros(item.total)}</p></div>
      </section>
      <section className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2>Relación de expedientes firmados</h2><p className="mt-1">Solo se incluyen expedientes cuya fecha de firma real pertenece al mes seleccionado y cuya ficha identifica este colaborador como apoderado.</p></div><span className="px-3 py-1">{item.protocolos_firmados ?? item.expedientes?.length ?? 0} protocolos</span></div>
        {item.expedientes?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full"><thead><tr><MolsanSortableTh label="Expediente" sortKey="id_expediente" sortConfig={ordenFirmasColaborador.sortConfig} onSort={ordenFirmasColaborador.requestSort} className="p-3" /><MolsanSortableTh label="Fecha firma" sortKey="fecha_firma" sortConfig={ordenFirmasColaborador.sortConfig} onSort={ordenFirmasColaborador.requestSort} className="p-3" /><MolsanSortableTh label="Protocolo" sortKey="protocolo" sortConfig={ordenFirmasColaborador.sortConfig} onSort={ordenFirmasColaborador.requestSort} className="p-3" /><MolsanSortableTh label="Notario" sortKey="notario" sortConfig={ordenFirmasColaborador.sortConfig} onSort={ordenFirmasColaborador.requestSort} className="p-3" /></tr></thead><tbody>{ordenFirmasColaborador.items.map((e) => <tr key={e.expediente_id}><td className="p-3">{e.id_expediente}</td><td className="p-3">{fecha(e.fecha_firma)}</td><td className="p-3">{e.protocolo || "—"}</td><td className="p-3">{e.notario || "—"}</td></tr>)}</tbody></table></div> : <p className="mt-4 p-5">No constan firmas reales a tu nombre en este periodo.</p>}
        <div className="mt-5 p-4"><p>Estado: {estado(item.estado_relacion)}</p>{item.validado_en && <p className="mt-1">Validada el {fecha(item.validado_en)} · versión {item.validado_version}</p>}
          {item.estado_relacion !== "validada" ? <><label className="mt-4 block">Observaciones o discrepancias (opcional)<textarea value={discrepancia} onChange={(e) => setDiscrepancia(e.target.value)} maxLength={2000} className="mt-1 min-h-24 w-full p-3" placeholder="Indica si falta una firma o hay algún dato incorrecto…" /></label><button type="button" onClick={validar} disabled={cargando} className="mt-3 px-5 py-3">Validar relación mensual</button></> : <p className="mt-2">Relación validada. Ya puedes presentar la factura del periodo.</p>}
        </div>
      </section>
      <section className="p-5"><h2>Presentar factura mensual</h2><p className="mt-1">Se habilita únicamente después de validar la relación. Formatos admitidos: PDF, XML, JPG o PNG; máximo 10 MB.</p>
        {item.factura_nombre && <p className="mt-3">Archivo presentado: <strong>{item.factura_nombre}</strong> · {estado(item.estado_factura)}</p>}
        {item.estado_relacion === "validada" ? <div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="max-w-full" /><button type="button" onClick={subir} disabled={!archivo || cargando} className="px-5 py-3">{item.factura_nombre ? "Sustituir factura" : "Enviar factura"}</button></div> : <p className="mt-3 p-3">Primero valida la relación de expedientes.</p>}
        {item.factura_observaciones && <p className="mt-3 p-3">Observaciones de Molsan: {item.factura_observaciones}</p>}
        <div className="mt-5 p-4">
          <h3>Justificante</h3>
          <p className="mt-1">{item.justificante_nombre ? `Adjuntado: ${item.justificante_nombre}` : "Adjunta el justificante correspondiente a esta liquidación."} Formatos PDF, XML, JPG o PNG; máximo 10 MB.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3"><input type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={(e) => setJustificanteArchivo(e.target.files?.[0] || null)} className="max-w-full" /><button type="button" onClick={subirJustificante} disabled={!justificanteArchivo || cargando} className="px-4 py-2">{item.justificante_nombre ? "Sustituir justificante" : "Subir justificante"}</button></div>
        </div>
      </section>
      <section className="p-5">
        <h2>Histórico de liquidaciones</h2>
        <p className="mb-3 mt-1">Consulta el estado de las relaciones y facturas de otros meses.</p>
        {historial.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr><MolsanSortableTh label="Periodo" sortKey="periodo" sortConfig={ordenHistorial.sortConfig} onSort={ordenHistorial.requestSort} className="p-3" /><MolsanSortableTh label="Firmas" sortKey="protocolos_firmados" sortConfig={ordenHistorial.sortConfig} onSort={ordenHistorial.requestSort} className="p-3" /><MolsanSortableTh label="Relación" sortKey="estado_relacion" sortConfig={ordenHistorial.sortConfig} onSort={ordenHistorial.requestSort} className="p-3" /><MolsanSortableTh label="Factura" sortKey="estado_factura" sortConfig={ordenHistorial.sortConfig} onSort={ordenHistorial.requestSort} className="p-3" /><th className="p-3">Consulta</th></tr></thead><tbody>{ordenHistorial.items.map((h) => <tr key={h.id}><td className="p-3">{h.periodo}</td><td className="p-3">{h.protocolos_firmados ?? h.expedientes?.length ?? 0}</td><td className="p-3">{estado(h.estado_relacion)}</td><td className="p-3">{estado(h.estado_factura)}</td><td className="p-3"><button type="button" onClick={() => setPeriodo(h.periodo)}>Abrir mes</button></td></tr>)}</tbody></table></div> : <p className="p-4">Todavía no hay otros periodos registrados.</p>}
      </section>
    </> : !cargando && <section className="p-6">No se ha podido cargar la relación mensual. Si eres colaborador, solicita que habiliten tu ficha desde Utilidades → Control Apoderados.</section>}
    <div><button type="button" onClick={() => navigate(admin ? "/herramientas/utilidades" : "/apoderagest")}>← Volver</button></div>
  </div>;
}
