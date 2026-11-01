import MolsanDataTable from "../../components/ui/MolsanDataTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./Intranet.css";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";

const MAX_BYTES = 20 * 1024 * 1024;
const EXT = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".png", ".jpg", ".jpeg"];
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const primary = "inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";
const secondary = "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50";
const danger = "inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100";
const errorText = (e, fallback) => e?.response?.data?.detail || e?.response?.data?.error || fallback;
const prettyDate = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "—";
const dateKey = (value) => { if (!value || Number.isNaN(new Date(value).getTime())) return ""; const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

export default function Intranet() {
  const { token, authReady, empleado } = useAuthStore();
  const rol = String(empleado?.rol?.nombre || empleado?.rol_nombre || empleado?.rol || "").toLowerCase();
  const esAdmin = rol === "admin" || rol === "administrador";
  const permisos = empleado?.permisos_modulo_dict || empleado?.permisos_modulo || {};
  const puede = useCallback((accion) => esAdmin ||
    (Array.isArray(permisos.intranet) && permisos.intranet.includes(accion)) ||
    (Array.isArray(permisos["intranet.*"]) && permisos["intranet.*"].includes(accion)) ||
    (Array.isArray(permisos["*"]) && permisos["*"].includes(accion)), [esAdmin, permisos]);

  const [noticias, setNoticias] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [noticiaId, setNoticiaId] = useState(null);
  const [tituloNoticia, setTituloNoticia] = useState("");
  const [textoNoticia, setTextoNoticia] = useState("");
  const [guardandoNoticia, setGuardandoNoticia] = useState(false);
  const [documentoId, setDocumentoId] = useState(null);
  const [tituloDocumento, setTituloDocumento] = useState("");
  const [conceptoDocumento, setConceptoDocumento] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [guardandoDocumento, setGuardandoDocumento] = useState(false);

  const cargar = useCallback(async (mostrar = false) => {
    if (!authReady || !token) return;
    if (mostrar) setLoading(true);
    try {
      const peticiones = [axios.get("/noticias"), axios.get("/documentos")];
      if (puede("editar")) peticiones.push(axios.get("/intranet/auditoria", { params: { limite: 25 } }));
      const r = await Promise.all(peticiones);
      setNoticias(Array.isArray(r[0].data) ? r[0].data : []);
      setDocumentos(Array.isArray(r[1].data) ? r[1].data : []);
      if (puede("editar")) setAuditoria(Array.isArray(r[2]?.data) ? r[2].data : []);
      setError("");
    } catch (e) {
      console.error("No se ha podido cargar la Intranet.");
      setError(errorText(e, "No se ha podido cargar la Intranet. Comprueba los permisos."));
    } finally { if (mostrar) setLoading(false); }
  }, [authReady, token, puede]);

  useEffect(() => {
    if (!authReady || !token) return;
    cargar(true);
    const timer = window.setInterval(() => cargar(false), 15000);
    return () => window.clearInterval(timer);
  }, [authReady, token, cargar]);

  const filtrar = (lista, campo) => lista.filter((x) => {
    const term = buscar.trim().toLocaleLowerCase("es");
    const text = `${x.titulo || ""} ${x[campo] || ""}`.toLocaleLowerCase("es");
    const fecha = dateKey(x.fecha_publicacion);
    return (!term || text.includes(term)) && (!desde || (fecha && fecha >= desde)) && (!hasta || (fecha && fecha <= hasta));
  });
  const noticiasFiltradas = useMemo(() => filtrar(noticias, "descripcion"), [noticias, buscar, desde, hasta]);
  const documentosFiltrados = useMemo(() => filtrar(documentos, "concepto"), [documentos, buscar, desde, hasta]);

  function resetNoticia() { setNoticiaId(null); setTituloNoticia(""); setTextoNoticia(""); }
  function editarNoticia(n) { setNoticiaId(n.id); setTituloNoticia(n.titulo || ""); setTextoNoticia(n.descripcion || ""); setMensaje(""); }
  async function guardarNoticia(e) {
    e.preventDefault();
    if (!tituloNoticia.trim() || !textoNoticia.trim()) { setMensaje("Completa el título y el contenido de la noticia."); return; }
    setGuardandoNoticia(true); setMensaje("");
    try {
      const payload = { titulo: tituloNoticia.trim(), descripcion: textoNoticia.trim() };
      if (noticiaId) { await axios.put(`/noticias/${noticiaId}`, payload); setMensaje("Noticia actualizada."); }
      else { await axios.post("/noticias", payload); setMensaje("Noticia publicada."); }
      resetNoticia(); await cargar();
    } catch (e) { setMensaje(errorText(e, "No se ha podido guardar la noticia.")); }
    finally { setGuardandoNoticia(false); }
  }
  async function borrarNoticia(n) {
    if (!puede("eliminar") || !window.confirm(`¿Eliminar la noticia «${n.titulo}»?`)) return;
    try { await axios.delete(`/noticias/${n.id}`); setMensaje("Noticia eliminada."); await cargar(); }
    catch (e) { setMensaje(errorText(e, "No se ha podido eliminar la noticia.")); }
  }

  function resetDocumento() {
    setDocumentoId(null); setTituloDocumento(""); setConceptoDocumento(""); setArchivo(null);
    const el = document.getElementById("intranet-file"); if (el) el.value = "";
  }
  function editarDocumento(d) { setDocumentoId(d.id); setTituloDocumento(d.titulo || ""); setConceptoDocumento(d.concepto || ""); setArchivo(null); setMensaje(""); }
  function elegirArchivo(e) {
    const file = e.target.files?.[0] || null;
    if (!file) { setArchivo(null); return; }
    const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    if (!EXT.includes(ext)) { setMensaje("Tipo no permitido. Usa PDF, Office, TXT, CSV, PNG o JPG."); e.target.value = ""; setArchivo(null); return; }
    if (file.size > MAX_BYTES) { setMensaje("El archivo supera el límite de 20 MB."); e.target.value = ""; setArchivo(null); return; }
    setArchivo(file); setMensaje("");
  }
  async function guardarDocumento(e) {
    e.preventDefault();
    if (!tituloDocumento.trim()) { setMensaje("El título del documento es obligatorio."); return; }
    if (!documentoId && !archivo) { setMensaje("Selecciona el archivo que quieres publicar."); return; }
    setGuardandoDocumento(true); setMensaje("");
    try {
      const data = new FormData(); data.append("titulo", tituloDocumento.trim()); data.append("concepto", conceptoDocumento.trim());
      if (archivo && !documentoId) data.append("fichero", archivo);
      if (documentoId) { await axios.put(`/documentos/${documentoId}`, data); setMensaje("Documento actualizado."); }
      else { await axios.post("/documentos", data); setMensaje("Documento publicado."); }
      resetDocumento(); await cargar();
    } catch (e) { setMensaje(errorText(e, "No se ha podido guardar el documento.")); }
    finally { setGuardandoDocumento(false); }
  }
  async function borrarDocumento(d) {
    if (!puede("eliminar") || !window.confirm(`¿Eliminar el documento «${d.titulo}»?`)) return;
    try { await axios.delete(`/documentos/${d.id}`); setMensaje("Documento eliminado."); await cargar(); }
    catch (e) { setMensaje(errorText(e, "No se ha podido eliminar el documento.")); }
  }
  async function descargar(d) {
    try {
      const r = await axios.get(`/documentos/descargar/${d.id}`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data); const link = document.createElement("a");
      link.href = url; link.download = `documento-${d.id}`; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setMensaje(errorText(e, "No se ha podido descargar el documento.")); }
  }

  if (!authReady || loading) return <div role="status" aria-live="polite" className="flex min-h-[360px] items-center justify-center"><div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">Cargando Intranet…</div></div>;
  if (error && !noticias.length && !documentos.length) return <div role="alert" aria-live="assertive" className="rounded-3xl border border-red-200 bg-white p-8 text-sm text-red-700 shadow-sm"><b>No se ha podido cargar la Intranet</b><p className="mt-2">{error}</p><button className={`${secondary} mt-4`} onClick={() => cargar(true)}>Reintentar</button></div>;

  return <div className="molsan-page-stack molsan-intranet-page relative animate-fadeIn">
    <header className="molsan-page-header">
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">🏢</div>
        <div className="min-w-0">
          <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
          <h1 className="molsan-page-header__title">Intranet</h1>
          <p className="molsan-page-header__description">Noticias, documentación y actividad interna de Molsan</p>
        </div>
      </div>
      <div className="molsan-page-header__actions">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-4 py-2 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Actualización automática activa</span>
      </div>
    </header>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="erp-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Noticias publicadas</p><p className="mt-1 text-2xl font-bold text-slate-800">{noticias.length}</p></div>
      <div className="erp-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Documentos internos</p><p className="mt-1 text-2xl font-bold text-slate-800">{documentos.length}</p></div>
      <div className="erp-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sesión</p><p className="mt-1 truncate font-bold text-slate-800">{empleado?.nombre || empleado?.username || empleado?.email || "Empleado conectado"}</p></div>
    </div>

    {(mensaje || error) && <div role="status" className={`rounded-2xl border px-4 py-3 text-sm ${error || /no se ha podido|no permitido|supera|selecciona|obligatorio|completa/i.test(mensaje) ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{mensaje || error}</div>}

    <section className="erp-card rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm"><div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto] md:items-end"><label className="block text-xs font-semibold text-slate-500">Buscar noticias y documentos<input className={input} value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Título, contenido o concepto…" /></label><label className="block text-xs font-semibold text-slate-500">Publicado desde<input type="date" className={input} value={desde} onChange={(e) => setDesde(e.target.value)} /></label><label className="block text-xs font-semibold text-slate-500">Publicado hasta<input type="date" className={input} value={hasta} onChange={(e) => setHasta(e.target.value)} /></label><button className={secondary} onClick={() => { setBuscar(""); setDesde(""); setHasta(""); }}>Limpiar filtros</button></div></section>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="rounded-[26px] border border-white bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-xl">📰</div><div><h2 className="text-lg font-bold text-slate-800">Noticias internas</h2><p className="text-xs text-slate-400">Publicaciones y avisos de empresa</p></div></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{noticiasFiltradas.length}</span></div>
        {(puede("crear") || noticiaId) && <form onSubmit={guardarNoticia} className="mb-5 space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><div className="flex justify-between gap-3"><h3 className="text-sm font-bold text-slate-700">{noticiaId ? "Editar noticia" : "Publicar noticia"}</h3>{noticiaId && <button type="button" className="text-xs text-slate-500" onClick={resetNoticia}>Cancelar</button>}</div><label className="block text-xs font-semibold text-slate-500">Título<input className={input} required maxLength={300} value={tituloNoticia} onChange={(e) => setTituloNoticia(e.target.value)} /></label><label className="block text-xs font-semibold text-slate-500">Contenido<textarea className={input} required rows={4} maxLength={20000} value={textoNoticia} onChange={(e) => setTextoNoticia(e.target.value)} /></label><div className="flex justify-end"><button className={primary} disabled={guardandoNoticia}>{guardandoNoticia ? "Guardando…" : noticiaId ? "Guardar cambios" : "Publicar noticia"}</button></div></form>}
        <div className="space-y-3">{noticiasFiltradas.length ? noticiasFiltradas.map((n) => <article key={n.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-blue-200"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-800">{n.titulo}</h3><span className="shrink-0 text-right text-[11px] text-slate-400">{prettyDate(n.fecha_publicacion)}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{n.descripcion}</p>{(puede("editar") || puede("eliminar")) && <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">{puede("editar") && <button className={secondary} onClick={() => editarNoticia(n)}>Editar</button>}{puede("eliminar") && <button className={danger} onClick={() => borrarNoticia(n)}>Eliminar</button>}</div>}</article>) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No hay noticias para estos filtros.</p>}</div>
      </section>

      <section className="rounded-[26px] border border-white bg-white/85 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-xl">📁</div><div><h2 className="text-lg font-bold text-slate-800">Documentación interna</h2><p className="text-xs text-slate-400">Archivos protegidos con autenticación</p></div></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{documentosFiltrados.length}</span></div>
        {(puede("crear") || documentoId) && <form onSubmit={guardarDocumento} className="mb-5 space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4"><div className="flex justify-between gap-3"><h3 className="text-sm font-bold text-slate-700">{documentoId ? "Editar ficha del documento" : "Publicar documento"}</h3>{documentoId && <button type="button" className="text-xs text-slate-500" onClick={resetDocumento}>Cancelar</button>}</div><label className="block text-xs font-semibold text-slate-500">Título<input className={input} required maxLength={300} value={tituloDocumento} onChange={(e) => setTituloDocumento(e.target.value)} /></label><label className="block text-xs font-semibold text-slate-500">Concepto<textarea className={input} rows={2} maxLength={2000} value={conceptoDocumento} onChange={(e) => setConceptoDocumento(e.target.value)} /></label>{!documentoId && <label className="block text-xs font-semibold text-slate-500">Archivo (máximo 20 MB)<input id="intranet-file" className={input} type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg" onChange={elegirArchivo} /><span className="mt-1 block font-normal text-slate-400">PDF, Office, TXT, CSV, PNG o JPG.</span></label>}<div className="flex justify-end"><button className={primary} disabled={guardandoDocumento}>{guardandoDocumento ? "Guardando…" : documentoId ? "Guardar cambios" : "Publicar documento"}</button></div></form>}
        <div className="space-y-3">{documentosFiltrados.length ? documentosFiltrados.map((d) => <article key={d.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-cyan-200"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-lg">📄</div><div className="min-w-0 flex-1"><h3 className="break-words font-bold text-slate-800">{d.titulo}</h3>{d.concepto && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">{d.concepto}</p>}<p className="mt-2 text-[11px] text-slate-400">Publicado: {prettyDate(d.fecha_publicacion)}</p></div></div><div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button className={primary} onClick={() => descargar(d)}>Descargar</button>{puede("editar") && <button className={secondary} onClick={() => editarDocumento(d)}>Editar</button>}{puede("eliminar") && <button className={danger} onClick={() => borrarDocumento(d)}>Eliminar</button>}</div></article>) : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No hay documentos para estos filtros.</p>}</div>
      </section>
    </div>

    {puede("editar") && <section className="rounded-[26px] border border-slate-200/80 bg-white/85 p-5 shadow-sm sm:p-6"><div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold text-slate-800">🔐 Seguridad y mantenimiento</h2><p className="mt-1 text-sm text-slate-500">Historial de publicaciones, modificaciones y eliminaciones por empleado.</p></div><button className={secondary} onClick={() => cargar()}>Actualizar registro</button></div>{auditoria.length ? <div className="overflow-x-auto"><MolsanDataTable
          rows={auditoria}
          rowKey="id"
          minWidth="850px"
          pagination
          pageSize={25}
          searchable
          initialSort={{ key: "fecha", direction: "desc" }}
          emptyText="Todavía no hay acciones registradas."
          columns={[
            { key: "fecha", header: "Fecha", accessor: "fecha", sortType: "date", render: (value) => prettyDate(value) },
            { key: "empleado", header: "Empleado", accessor: "usuario_nombre", sortType: "text", render: (value) => <strong>{value}</strong> },
            { key: "accion", header: "Acción", accessor: "accion", sortType: "text", render: (value) => <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{value}</span> },
            { key: "area", header: "Área", accessor: (item) => item.recurso === "NOTICIA" ? "Noticia" : "Documento", sortType: "text" },
            { key: "detalle", header: "Detalle", accessor: "detalle", sortType: "text", render: (value) => <span className="block max-w-[280px] truncate" title={value || ""}>{value || "—"}</span> },
          ]}
        /></div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay acciones registradas.</p>}</section>}
    <footer className="flex flex-col justify-between gap-2 px-1 text-xs text-slate-400 sm:flex-row"><span>Intranet Molsan · Actualización automática cada 15 segundos.</span><span>Las descargas utilizan la sesión autenticada del empleado.</span></footer>
  </div>;
}
