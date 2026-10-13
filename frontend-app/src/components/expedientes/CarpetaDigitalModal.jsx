import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const CATEGORIAS = [
  "Documentos Absis",
  "Hoja de Encargo firmada",
  "Justificante de cancelación",
  "Nota simple registral",
  "Mails de la Oficina",
  "Escrituras/borradores",
  "Presentación Registro",
  "AJD/ITP",
  "Otra documentación",
  "Factura notarial",
  "Factura Registral",
  "Hoja de Inscripción",
  "Escritura digital final",
];

const BASE = (id) => `/expedientes/${encodeURIComponent(id)}/carpeta-digital`;

const CATEGORIAS_DOCUMENTACION_PREVIA = [
  { etiqueta: "Documentos Absis", categoria: "Documentos Absis" },
  { etiqueta: "Hoja de Encargo firmada", categoria: "Hoja de Encargo firmada" },
  { etiqueta: "Justificante de cancelación", categoria: "Justificante de cancelación" },
  { etiqueta: "Nota simple registral", categoria: "Nota simple registral" },
  // Se mantiene el nombre de categoría que ya acepta el backend.
  { etiqueta: "Borradores de escrituras", categoria: "Escrituras/borradores" },
];

export default function CarpetaDigitalModal({ expedienteId, onClose, modoActividad = false, onDocumentosChange }) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState(CATEGORIAS[0]);

  const cargar = useCallback(async () => {
    if (!expedienteId) {
      setError("No se ha encontrado el identificador del expediente.");
      setCargando(false);
      return;
    }
    try {
      setCargando(true);
      setError("");
      const res = await axios.get(BASE(expedienteId));
      const lista = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setDocumentos(lista);
      onDocumentosChange?.(lista);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudieron cargar los documentos.");
    } finally {
      setCargando(false);
    }
  }, [expedienteId, onDocumentosChange]);

  useEffect(() => { cargar(); }, [cargar]);

  async function subir(event, categoria) {
    const archivos = Array.from(event.target.files || []);
    event.target.value = "";
    if (!archivos.length) return;
    setSubiendo(categoria);
    setError("");
    try {
      for (const archivo of archivos) {
        const data = new FormData();
        data.append("archivo", archivo);
        data.append("categoria", categoria);
        await axios.post(BASE(expedienteId), data);
      }
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar uno de los archivos.");
    } finally {
      setSubiendo("");
    }
  }

  async function descargar(doc, abrir = false) {
    try {
      const res = await axios.get(`${BASE(expedienteId)}/${doc.id}/descargar`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      if (abrir) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url; a.download = doc.nombre_original || "documento"; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo abrir o descargar el documento.");
    }
  }

  async function eliminar(doc) {
    if (!window.confirm(`¿Eliminar el archivo «${doc.nombre_original}»?`)) return;
    try {
      await axios.delete(`${BASE(expedienteId)}/${doc.id}`);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo eliminar el documento.");
    }
  }

  const porCategoria = (categoria) => documentos.filter((d) => d.categoria === categoria);
  const bytes = (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

  if (modoActividad) {
    return (
      <section className="space-y-3" aria-label="Carpeta digital de Documentación previa">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">📁 Carpeta digital de Documentación previa</h4>
            <p className="mt-1 text-xs text-slate-500">Los archivos se consultan y guardan en la Carpeta Digital existente.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{documentos.length} archivo(s)</span>
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {cargando ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Cargando documentos…</p> : (
          <div className="grid gap-3 xl:grid-cols-2">
            {CATEGORIAS_DOCUMENTACION_PREVIA.map(({ etiqueta, categoria }) => {
              const lista = documentos.filter((d) => d.categoria === categoria || (etiqueta === "Borradores de escrituras" && d.categoria === "Borradores de escrituras"));
              return (
                <article key={categoria} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-extrabold text-slate-800">{etiqueta}</h5>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${lista.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{lista.length} archivo(s)</span>
                  </div>
                  <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50/40 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                    {subiendo === categoria ? "Guardando archivo…" : "＋ Adjuntar archivo(s)"}
                    <input className="hidden" type="file" multiple onChange={(e) => subir(e, categoria)} disabled={!!subiendo} />
                  </label>
                  {lista.length ? <ul className="mt-2 divide-y divide-slate-100">{lista.map((doc) => (
                    <li key={doc.id} className="flex min-w-0 items-center gap-2 py-2">
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-700" title={doc.nombre_original}>{doc.nombre_original}</p><p className="text-[10px] text-slate-400">{bytes(doc.tamano_bytes || 0)} · {doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleString("es-ES") : ""}</p></div>
                      <button type="button" onClick={() => descargar(doc, true)} className="rounded-md px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Ver</button>
                      <button type="button" onClick={() => descargar(doc, false)} className="rounded-md px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100" title="Descargar">↓</button>
                      <button type="button" onClick={() => eliminar(doc)} className="rounded-md px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50" title="Eliminar">✕</button>
                    </li>
                  ))}</ul> : <p className="mt-2 text-xs text-slate-400">No hay archivos subidos.</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Carpeta digital del expediente" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · Documentación</p><h2 className="mt-1 text-lg font-bold text-slate-900">📁 Carpeta digital</h2><p className="text-xs text-slate-500">Expediente {expedienteId || "—"} · {documentos.length} archivo(s)</p></div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">✕ Cerrar</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {cargando ? <p className="py-12 text-center text-sm text-slate-500">Cargando carpeta digital…</p> : <div className="grid gap-3 lg:grid-cols-2">
            {CATEGORIAS.map((categoria) => {
              const lista = porCategoria(categoria);
              return <article key={categoria} className={`min-w-0 rounded-xl border p-4 ${categoriaActiva === categoria ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-bold text-slate-800">{categoria}</h3><p className="mt-1 text-xs text-slate-500">{lista.length} archivo(s)</p></div><span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-700">{lista.length}</span></div>
                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-white px-3 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50">{subiendo === categoria ? "Guardando archivos…" : "＋ Adjuntar archivo(s)"}<input className="hidden" type="file" multiple onChange={(e) => subir(e, categoria)} disabled={!!subiendo} /></label>
                {lista.length > 0 && <ul className="mt-3 divide-y divide-slate-100">{lista.map((doc) => <li key={doc.id} className="flex min-w-0 items-center gap-2 py-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-700" title={doc.nombre_original}>{doc.nombre_original}</p><p className="text-[10px] text-slate-400">{bytes(doc.tamano_bytes || 0)} · {doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleString("es-ES") : ""}</p></div><button type="button" onClick={() => descargar(doc, true)} title="Abrir" className="rounded-md px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Ver</button><button type="button" onClick={() => descargar(doc, false)} title="Descargar" className="rounded-md px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100">↓</button><button type="button" onClick={() => eliminar(doc)} title="Eliminar" className="rounded-md px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">✕</button></li>)}</ul>}
              </article>;
            })}
          </div>}
        </div>
        <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3"><button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700">Terminar</button></footer>
      </section>
    </div>
  );
}
