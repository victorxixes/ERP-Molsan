import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";

const hoy = () => new Date().toLocaleDateString("sv-SE");
const euros = (v) => Number(v || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const fecha = (v) => v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—";

export default function ComplementosSaldo() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [oficinaFiltro, setOficinaFiltro] = useState("");
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const params = {};
      if (busqueda.trim()) params.q = busqueda.trim();
      if (estadoFiltro) params.estado = estadoFiltro;
      if (oficinaFiltro.trim()) params.oficina = oficinaFiltro.trim();
      const { data } = await axios.get("/complementos-saldo", { params });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudieron cargar las solicitudes de complemento de saldo.");
    } finally { setCargando(false); }
  }, [busqueda, estadoFiltro, oficinaFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  const metricas = useMemo(() => ({
    total: items.length,
    importe: items.reduce((s, x) => s + Number(x.importe || 0), 0),
    pendientes: items.filter((x) => String(x.estado).toLowerCase() !== "cerrado").length,
    cerrados: items.filter((x) => ["compensado", "cerrado"].includes(String(x.estado).toLowerCase())).length,
    importePendiente: items.filter((x) => !["compensado", "cerrado"].includes(String(x.estado).toLowerCase())).reduce((s, x) => s + Number(x.importe || 0), 0),
  }), [items]);

  async function cambiarEstado(item) {
    const estado = ["compensado", "cerrado"].includes(String(item.estado).toLowerCase()) ? "Pendiente" : "Compensado";
    try {
      await axios.patch(`/complementos-saldo/${item.id}/estado`, null, { params: { estado } });
      await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo actualizar el estado."); }
  }

  async function exportarExcel() {
    setExportando(true); setError("");
    try {
      const params = {};
      if (busqueda.trim()) params.q = busqueda.trim();
      if (estadoFiltro) params.estado = estadoFiltro;
      if (oficinaFiltro.trim()) params.oficina = oficinaFiltro.trim();
      const response = await axios.get("/complementos-saldo/exportar/excel", { params, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const enlace = document.createElement("a");
      enlace.href = url; enlace.download = `complementos_saldo_${hoy()}.xlsx`;
      document.body.appendChild(enlace); enlace.click(); enlace.remove(); URL.revokeObjectURL(url);
    } catch { setError("No se pudo descargar el Excel de complementos de saldo."); }
    finally { setExportando(false); }
  }

  return <div className="erp-page min-w-0 space-y-6">
    <MolsanPageHeader mark="CS" title="Complementos de saldo" description="Control de solicitudes, importes y estado de cada complemento." />
    <div className="molsan-filter-bar flex flex-wrap items-center justify-between gap-3 p-3"><Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link><button type="button" onClick={cargar} className="molsan-btn molsan-btn--secondary">↻ Actualizar</button></div>

    <section className="molsan-stat-grid">
      <Metrica titulo="Peticiones de complemento" valor={metricas.total} detalle="Solicitudes según los filtros" icono="▤" />
      <Metrica titulo="Importe total solicitado" valor={euros(metricas.importe)} detalle="Suma de los complementos" icono="€" />
      <Metrica titulo="Pendientes" valor={metricas.pendientes} detalle={`Importe abierto: ${euros(metricas.importePendiente)}`} icono="◷" alerta />
      <Metrica titulo="Compensados" valor={metricas.cerrados} detalle="Solicitudes regularizadas" icono="✓" verde />
    </section>

    <section className="erp-card overflow-hidden">
      <div className="molsan-filter-bar p-4 sm:p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <label className="min-w-0 flex-1"><span className="mb-1.5 block uppercase">Buscar expediente</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="N.º de expediente…" className="w-full px-3.5 py-2.5" /></label>
        <label className="w-full xl:w-48"><span className="mb-1.5 block uppercase">Estado</span><select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-full px-3.5 py-2.5"><option value="">Todos</option><option value="Pendiente">Pendiente</option><option value="Compensado">Compensado</option></select></label>
        <label className="w-full xl:w-56"><span className="mb-1.5 block uppercase">Oficina</span><input value={oficinaFiltro} onChange={(e) => setOficinaFiltro(e.target.value)} placeholder="Todas las oficinas" className="w-full px-3.5 py-2.5" /></label>
        <button type="button" onClick={exportarExcel} disabled={exportando} className="px-4 py-2.5">{exportando ? "Preparando…" : "↓ Descargar Excel"}</button>
      </div></div>

      {error && <div role="alert" className="m-4 px-4 py-3">{error}</div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[1250px]">
        <thead className="uppercase"><tr>{["Expediente", "Provisionado", "Saldo disponible", "Fecha de petición", "Saldo a solicitar", "Motivo", "Acciones", "Estado"].map((n) => <th key={n} className="px-4 py-3.5">{n}</th>)}</tr></thead>
        <tbody>{cargando ? <tr><td colSpan={8} className="px-5 py-14">Cargando solicitudes…</td></tr>
          : items.length === 0 ? <tr><td colSpan={8} className="px-5 py-14"><div>📋</div><p className="mt-2">No hay solicitudes que mostrar</p><p className="mt-1">Cuando se solicite un complemento desde la ficha de un expediente, aparecerá aquí.</p></td></tr>
          : items.map((item) => { const cerrado = ["compensado", "cerrado"].includes(String(item.estado).toLowerCase()); return <tr key={item.id}>
            <td className="px-4 py-3.5"><Link to={item.expediente_id ? `/expedientes/${item.expediente_id}` : "/expedientes"}>{item.numero_expediente}</Link></td>
            <td className="whitespace-nowrap px-4 py-3.5">{euros(item.provisionado)}</td><td className="whitespace-nowrap px-4 py-3.5">{euros(item.saldo_disponible)}</td><td className="whitespace-nowrap px-4 py-3.5">{fecha(item.fecha_solicitud)}</td><td className="whitespace-nowrap px-4 py-3.5 tabular-nums">{euros(item.importe)}</td><td className="max-w-[280px] whitespace-normal px-4 py-3.5">{item.motivo || item.observaciones || "—"}</td>
                        <td className="px-4 py-3.5"><button type="button" disabled={cerrado} onClick={() => cambiarEstado(item)} className={`px-3 py-2 ${cerrado ? "" : ""}`}>{cerrado ? "Regularizado" : "Compensar"}</button></td>
            <td className="px-4 py-3.5"><span className={`inline-flex px-2.5 py-1 ${cerrado ? "" : ""}`}>{cerrado ? "Compensado" : "Pendiente"}</span></td>
          </tr>; })}</tbody>
      </table></div>
      <footer className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span>{items.length} solicitud(es) en el resultado actual</span><span>Los indicadores se actualizan con los filtros aplicados.</span></footer>
    </section>
  </div>;
}

function Metrica({ titulo, valor, detalle, icono, alerta = false, verde = false }) {
  return <div className={`molsan-stat-card p-4 ${alerta ? "" : verde ? "" : ""}`}>
    <div className="flex items-start justify-between gap-2"><p className="uppercase">{titulo}</p><span className="flex h-9 w-9 items-center justify-center">{icono}</span></div><p className="mt-3">{valor}</p><p className="mt-1">{detalle}</p>
  </div>;
}
