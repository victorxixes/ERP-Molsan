import { useState } from "react";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";
import axios from "../../api/axios";

export default function DocumentosAdmin({ documentos = [], descargar, recargar, guardando, setGuardando, setError, setMensaje }) {
  const ordenDocumentos = useSortableData(documentos);
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
  const input = "w-full px-2 py-2";
  return <div className="w-full min-w-0">
    <div className="mb-4"><h2>Documentos y justificantes</h2><p>Descarga cada documento y aprueba o rechaza su revisión dejando un motivo registrado.</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1000px]"><thead><tr className="uppercase"><MolsanSortableTh label="Empleado" sortKey="empleado_nombre" sortConfig={ordenDocumentos.sortConfig} onSort={ordenDocumentos.requestSort} className="p-3" /><MolsanSortableTh label="Tipo" sortKey="tipo_justificante" sortConfig={ordenDocumentos.sortConfig} onSort={ordenDocumentos.requestSort} className="p-3" /><MolsanSortableTh label="Fecha" sortKey="fecha_documento" sortConfig={ordenDocumentos.sortConfig} onSort={ordenDocumentos.requestSort} className="p-3" /><MolsanSortableTh label="Archivo" sortKey="nombre_archivo" sortConfig={ordenDocumentos.sortConfig} onSort={ordenDocumentos.requestSort} className="p-3" /><MolsanSortableTh label="Subido" sortKey="subido_en" sortConfig={ordenDocumentos.sortConfig} onSort={ordenDocumentos.requestSort} className="p-3" /><MolsanSortableTh label="Revisión y acciones" sortKey="revision_estado" sortConfig={ordenDocumentos.sortConfig} onSort={ordenDocumentos.requestSort} className="p-3" /></tr></thead><tbody>{ordenDocumentos.items.map((d) => <tr key={d.id} className="align-top"><td className="p-3">{d.empleado_nombre}</td><td className="p-3">{d.tipo_justificante}</td><td className="p-3">{d.fecha_documento}</td><td className="max-w-[240px] truncate p-3">{d.nombre_archivo}<button type="button" onClick={() => descargar(d)} className="ml-2 px-2 py-1">Descargar</button></td><td className="p-3">{d.subido_en ? new Date(d.subido_en).toLocaleDateString("es-ES") : "—"}</td><td className="min-w-[300px] p-3"><span className={"px-2 py-1" + (d.revision_estado === "APROBADO" ? "" : d.revision_estado === "RECHAZADO" ? "" : "")}>{d.revision_estado === "APROBADO" ? "Aprobado" : d.revision_estado === "RECHAZADO" ? "Rechazado" : "Pendiente de revisión"}</span>{d.revision_motivo && <p className="mt-1">Última decisión: {d.revision_motivo}</p>}<input value={motivos[d.id] || ""} onChange={(e) => setMotivos({ ...motivos, [d.id]: e.target.value })} maxLength={500} placeholder="Motivo obligatorio para decidir…" className={input + "mt-2"} /><div className="mt-2 flex gap-2"><button type="button" disabled={guardando || (motivos[d.id] || "").trim().length < 5 || ocupado === d.id} onClick={() => revisar(d, "APROBADO")} className="px-3 py-2">Aprobar</button><button type="button" disabled={guardando || (motivos[d.id] || "").trim().length < 5 || ocupado === d.id} onClick={() => revisar(d, "RECHAZADO")} className="px-3 py-2">Rechazar</button></div></td></tr>)}{!documentos.length && <tr><td colSpan="6" className="p-10">No hay documentos para los filtros seleccionados.</td></tr>}</tbody></table></div>
  </div>;
}
