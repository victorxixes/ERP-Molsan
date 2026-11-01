import MolsanDataTable from "../../components/ui/MolsanDataTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import "../../css/ModalesHerramientasPremium.css";
import "../../css/CatalogosMaestrosPremium.css";
import { formatEuro as euros } from "../../utils/formatters";

const hoy = () => new Date().toLocaleDateString("sv-SE");

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

  return <div className="molsan-page-stack herramienta-operativa-premium herramientas-subpagina-premium min-h-full">
    <header className="molsan-page-header">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><Link to="/herramientas/utilidades" className="text-xs font-bold text-blue-700 hover:underline">← Volver a Utilidades</Link><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Complementos de saldo</h1><p className="mt-1 text-sm text-slate-500">Control de solicitudes, importes y estado de cada complemento.</p></div>
        <button type="button" onClick={cargar} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">↻ Actualizar</button>
      </div>
    </header>

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metrica titulo="Peticiones de complemento" valor={metricas.total} detalle="Solicitudes según los filtros" icono="▤" />
      <Metrica titulo="Importe total solicitado" valor={euros(metricas.importe)} detalle="Suma de los complementos" icono="€" />
      <Metrica titulo="Pendientes" valor={metricas.pendientes} detalle={`Importe abierto: ${euros(metricas.importePendiente)}`} icono="◷" alerta />
      <Metrica titulo="Compensados" valor={metricas.cerrados} detalle="Solicitudes regularizadas" icono="✓" verde />
    </section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <label className="min-w-0 flex-1"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Buscar expediente</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="N.º de expediente…" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
        <label className="w-full xl:w-48"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Estado</span><select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"><option value="">Todos</option><option value="Pendiente">Pendiente</option><option value="Compensado">Compensado</option></select></label>
        <label className="w-full xl:w-56"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Oficina</span><input value={oficinaFiltro} onChange={(e) => setOficinaFiltro(e.target.value)} placeholder="Todas las oficinas" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm" /></label>
        <button type="button" onClick={exportarExcel} disabled={exportando} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">{exportando ? "Preparando…" : "↓ Descargar Excel"}</button>
      </div></div>

      {error && <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      <MolsanDataTable
        rows={items}
          pagination
          pageSize={25}

        rowKey="id"
        minWidth="1350px"
        initialSort={{ key: "fecha_solicitud", direction: "desc" }}
        emptyText={cargando ? "Cargando solicitudes…" : "No hay solicitudes que mostrar. Cuando se solicite un complemento desde la ficha de un expediente, aparecerá aquí."}
        columns={[
          { key: "numero_expediente", header: "Expediente", accessor: "numero_expediente", sortType: "text", render: (value, item) => <Link to={item.expediente_id ? `/expedientes/${item.expediente_id}` : "/expedientes"} className="font-extrabold text-blue-700 hover:underline">{value}</Link> },
          { key: "provisionado", header: "Provisionado", accessor: "provisionado", sortType: "currency", align: "right", render: (value) => euros(value) },
          { key: "saldo_disponible", header: "Saldo disponible", accessor: "saldo_disponible", sortType: "currency", align: "right", render: (value) => euros(value) },
          { key: "fecha_solicitud", header: "Fecha de petición", accessor: "fecha_solicitud", sortType: "date", render: (value) => fecha(value) },
          { key: "importe", header: "Saldo a solicitar", accessor: "importe", sortType: "currency", align: "right", render: (value) => <strong className="tabular-nums">{euros(value)}</strong> },
          { key: "motivo", header: "Motivo", accessor: (item) => item.motivo || item.observaciones, sortType: "text", render: (value) => value || "—" },
          { key: "acciones", header: "Acciones", sortable: false, accessor: (item) => item.id, render: (_, item) => { const cerrado = ["compensado", "cerrado"].includes(String(item.estado).toLowerCase()); return <button type="button" disabled={cerrado} onClick={() => cambiarEstado(item)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${cerrado ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>{cerrado ? "Regularizado" : "Compensar"}</button>; } },
          { key: "estado", header: "Estado", accessor: (item) => ["compensado", "cerrado"].includes(String(item.estado).toLowerCase()) ? "Compensado" : "Pendiente", sortType: "text", render: (value) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${value === "Compensado" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{value}</span> },
        ]}
      />
      <footer className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{items.length} solicitud(es) en el resultado actual</span><span>Los indicadores se actualizan con los filtros aplicados.</span></footer>
    </section>
  </div>;
}

function Metrica({ titulo, valor, detalle, icono, alerta = false, verde = false }) {
  return <div className={`rounded-2xl border p-4 shadow-sm ${alerta ? "border-amber-200 bg-amber-50/70" : verde ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
    <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-lg font-extrabold text-slate-600 shadow-sm">{icono}</span></div><p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{valor}</p><p className="mt-1 text-xs text-slate-500">{detalle}</p>
  </div>;
}
