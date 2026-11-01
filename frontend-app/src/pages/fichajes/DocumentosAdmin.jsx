import MolsanDataTable from "../../components/ui/MolsanDataTable";
import MolsanButton from "../../components/ui/MolsanButton";
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
    <MolsanDataTable
      rows={documentos}
      rowKey="id"
      minWidth="1200px"
      pagination
      pageSize={25}
      searchable
      initialSort={{ key: "subido_en", direction: "desc" }}
      emptyText="No hay documentos para los filtros seleccionados."
      columns={[
        { key: "empleado", header: "Empleado", accessor: "empleado_nombre", sortType: "text" },
        { key: "tipo", header: "Tipo", accessor: "tipo_justificante", sortType: "text" },
        { key: "fecha_documento", header: "Fecha", accessor: "fecha_documento", sortType: "date" },
        { key: "archivo", header: "Archivo", accessor: "nombre_archivo", sortType: "text", render: (value, doc) => <><span className="block max-w-[240px] truncate">{value}</span><MolsanButton type="button" variant="secondary" icon="download" className="molsan-btn--compact mt-2" onClick={() => descargar(doc)}>Descargar</MolsanButton></> },
        { key: "subido_en", header: "Subido", accessor: "subido_en", sortType: "date", render: (value) => value ? new Date(value).toLocaleDateString("es-ES") : "—" },
        { key: "revision", header: "Revisión y acciones", sortable: false, accessor: (doc) => doc.id, render: (_, doc) => <div className="min-w-[300px]"><span className={"rounded-lg px-2 py-1 text-xs font-bold " + (doc.revision_estado === "APROBADO" ? "bg-emerald-100 text-emerald-900" : doc.revision_estado === "RECHAZADO" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900")}>{doc.revision_estado === "APROBADO" ? "Aprobado" : doc.revision_estado === "RECHAZADO" ? "Rechazado" : "Pendiente de revisión"}</span>{doc.revision_motivo && <p className="mt-1 text-xs text-slate-500">Última decisión: {doc.revision_motivo}</p>}<input value={motivos[doc.id] || ""} onChange={(e) => setMotivos({ ...motivos, [doc.id]: e.target.value })} maxLength={500} placeholder="Motivo obligatorio para decidir…" className={input + " mt-2"} /><div className="mt-2 flex gap-2"><MolsanButton type="button" variant="success" icon="check" loading={guardando && ocupado === doc.id} disabled={guardando || (motivos[doc.id] || "").trim().length < 5 || ocupado === doc.id} className="molsan-btn--compact" onClick={() => revisar(doc, "APROBADO")}>Aprobar</MolsanButton><MolsanButton type="button" variant="danger" icon="close" loading={guardando && ocupado === doc.id} disabled={guardando || (motivos[doc.id] || "").trim().length < 5 || ocupado === doc.id} className="molsan-btn--compact" onClick={() => revisar(doc, "RECHAZADO")}>Rechazar</MolsanButton></div></div> },
      ]}
    />
  </div>;
}
