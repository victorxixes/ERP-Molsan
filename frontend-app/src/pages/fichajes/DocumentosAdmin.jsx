import { useState } from "react";
import axios from "../../api/axios";

export default function DocumentosAdmin({ documentos = [], descargar, recargar, guardando, setGuardando, setError, setMensaje }) {
  const [motivos, setMotivos] = useState({});
  const [ocupado, setOcupado] = useState(null);
  const revisar = async (doc, estado) => {
    const motivo = (motivos[doc.id] || "").trim();
    if (motivo.length < 5) { setError("Indica el motivo de la revisión (mínimo cinco caracteres)."); return; }
    setGuardando(true); setOcupado(doc.id); setError(""); setMensaje("");
    try {
      const d = new FormData(); d.append("estado", estado); d.append("motivo", motivo);
      await axios.patch("/fichajes/admin/documentos/" + doc.id + "/revision", d);
      setMensaje(estado === "APROBADO" ? "Justificante aprobado y decisión auditada." : "Justificante rechazado y decisión auditada.");
      await recargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo guardar la revisión del justificante."); }
    finally { setGuardando(false); setOcupado(null); }
  };
  const input = "w-full rounded-lg border border-slate-200 px-2 py-2 text-xs";
  return <div className="p-4 sm:p-6">
    <div className="mb-4"><h2 className="text-lg font-extrabold">Documentos y justificantes</h2><p className="text-sm text-[var(--erp-text-soft)]">Descarga cada documento y aprueba o rechaza su revisión dejando un motivo registrado.</p></div>
    <div className="overflow-x-auto rounded-2xl border border-[var(--erp-border)]"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Empleado</th><th className="p-3">Tipo</th><th className="p-3">Fecha</th><th className="p-3">Archivo</th><th className="p-3">Subido</th><th className="p-3">Revisión y acciones</th></tr></thead><tbody>{documentos.map((d) => <tr key={d.id} className="border-b last:border-0 align-top"><td className="p-3 font-semibold">{d.empleado_nombre}</td><td className="p-3">{d.tipo_justificante}</td><td className="p-3">{d.fecha_documento}</td><td className="max-w-[240px] truncate p-3">{d.nombre_archivo}<button type="button" onClick={() => descargar(d)} className="ml-2 rounded-lg border px-2 py-1 text-xs font-bold">Descargar</button></td><td className="p-3">{d.subido_en ? new Date(d.subido_en).toLocaleDateString("es-ES") : "—"}</td><td className="min-w-[300px] p-3"><span className={"rounded-lg px-2 py-1 text-xs font-bold " + (d.revision_estado === "APROBADO" ? "bg-emerald-100 text-emerald-900" : d.revision_estado === "RECHAZADO" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900")}>{d.revision_estado === "APROBADO" ? "Aprobado" : d.revision_estado === "RECHAZADO" ? "Rechazado" : "Pendiente de revisión"}</span>{d.revision_motivo && <p className="mt-1 text-xs text-slate-500">Última decisión: {d.revision_motivo}</p>}<input value={motivos[d.id] || ""} onChange={(e) => setMotivos({ ...motivos, [d.id]: e.target.value })} maxLength={500} placeholder="Motivo obligatorio para decidir…" className={input + " mt-2"} /><div className="mt-2 flex gap-2"><button type="button" disabled={guardando || (motivos[d.id] || "").trim().length < 5 || ocupado === d.id} onClick={() => revisar(d, "APROBADO")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Aprobar</button><button type="button" disabled={guardando || (motivos[d.id] || "").trim().length < 5 || ocupado === d.id} onClick={() => revisar(d, "RECHAZADO")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-40">Rechazar</button></div></td></tr>)}{!documentos.length && <tr><td colSpan="6" className="p-10 text-center text-slate-400">No hay documentos para los filtros seleccionados.</td></tr>}</tbody></table></div>
  </div>;
}
