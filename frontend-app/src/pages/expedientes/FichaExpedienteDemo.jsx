import React, { useRef, useState } from "react";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanIcon from "../../components/ui/MolsanIcon";

/**
 * FichaExpediente de demostración.
 * Reproduce la organización funcional de la ficha operativa con campos vacíos
 * y estado local. No consulta API, no crea expedientes y no escribe en BD.
 */
const ACTIVIDADES = [
  { key: "documentacion-previa", label: "Documentación previa", icon: "file" },
  { key: "sede-notarial", label: "Sede notarial", icon: "courthouse" },
  { key: "sede-notarial-protocolo", label: "Sede notarial con protocolo", icon: "scroll" },
  { key: "gestion-economica", label: "Gestión económica", icon: "briefcase" },
  { key: "liquidacion-impuestos", label: "Liquidación de impuestos", icon: "euro" },
  { key: "tramitacion-inscripcion", label: "Tramitación inscripción", icon: "building" },
  { key: "defectos-registrales", label: "Defectos registrales", icon: "alert" },
  { key: "facturacion-cierre", label: "Facturación y cierre", icon: "receipt" },
];

const CAMPOS = {
  "documentacion-previa": [
    ["fecha_inicio_actividad", "Inicio actividad", "date"],
    ["fecha_fin_actividad", "Fin actividad", "date"],
    ["estado_documentacion", "Estado de documentación", "select"],
    ["certificado_saldo", 'Certificado saldo "0" erróneo SI/NO', "select"],
    ["observaciones", "Observaciones", "textarea"],
  ],
  "sede-notarial": [
    ["nombre_notario", "Nombre notario"],
    ["nif_notario", "NIF notario"],
    ["fecha_envio_notaria", "Fecha de envío", "date"],
    ["fecha_cita", "Fecha prevista de firma", "date"],
    ["observaciones", "Observaciones", "textarea"],
  ],
  "sede-notarial-protocolo": [
    ["nombre_notario", "Nombre notario"],
    ["nif_notario", "NIF notario"],
    ["tipo_gestoria", "Tipo gestoría", "select"],
    ["fecha_firma", "Fecha de firma", "date"],
    ["tipo_documento", "Tipo de documento"],
    ["apoderado", "Apoderado"],
    ["poblacion_firma", "Población"],
    ["provincia_firma", "Provincia"],
    ["numero_protocolo", "Número de protocolo"],
    ["asiento_presentacion", "Asiento presentación"],
    ["libro_diario", "Libro diario"],
    ["fecha_presentacion", "Fecha presentación", "date"],
    ["numero_entrada", "Número de entrada"],
    ["fecha_recogida", "Fecha recogida / presentación telemática", "date"],
  ],
  "liquidacion-impuestos": [
    ["fecha_inicio_actividad", "Inicio actividad", "date"],
    ["fecha_presentacion_impuestos", "Fecha presentación", "date"],
    ["fecha_liquidacion_tributaria", "Fecha liquidación", "date"],
    ["oficina_liquidadora", "Oficina liquidadora"],
    ["comunidad_autonoma", "Comunidad autónoma"],
    ["base_imponible", "Base imponible (€)", "number"],
    ["tipo_tributacion", "Tipo de tributación", "select"],
    ["tipo_impuesto", "Impuesto AJD / ITP", "select"],
    ["justificante_impuestos", "Justificante AJD / ITP"],
    ["observaciones", "Observaciones", "textarea"],
  ],
  "tramitacion-inscripcion": [
    ["fecha_inicio_actividad", "Inicio actividad", "date"],
    ["registro", "Registro de la Propiedad"],
    ["fecha_presentacion_registro", "Fecha presentación", "date"],
    ["fecha_vencimiento_presentacion_registro", "Vencimiento presentación", "date"],
    ["fecha_inscripcion", "Fecha inscripción", "date"],
    ["hoja_inscripcion", "Hoja de inscripción"],
    ["nota_registradores", "Nota / factura Registradores"],
    ["observaciones", "Observaciones", "textarea"],
  ],
  "defectos-registrales": [
    ["tipo_documento", "Tipo de documento"],
    ["motivo_defecto", "Motivo del defecto", "textarea"],
    ["fecha_calificacion", "Fecha calificación", "date"],
    ["fecha_notificacion_registro", "Fecha notificación", "date"],
    ["fecha_vencimiento_presentacion_registro", "Vencimiento presentación", "date"],
    ["fecha_entrada_subsanacion", "Fecha entrada subsanación", "date"],
    ["observaciones_registro", "Observaciones Registro", "textarea"],
  ],
  "facturacion-cierre": [
    ["fecha_fin_actividad", "Fecha de cierre", "date"],
    ["estado_facturacion", "Estado facturación", "select"],
    ["factura_gestoria", "Factura gestoría"],
    ["expediente_digital", "Expediente digital completo", "select"],
    ["observaciones", "Observaciones", "textarea"],
  ],
};

const GRUPOS_DATOS = [
  { title: "Datos generales del expediente", icon: "folder", fields: ["N.º expediente", "Estado expediente", "Estado actividad", "Fecha de alta", "Actividad actual", "Oficina"] },
  { title: "Titulares y solicitantes", icon: "users", fields: ["Nombre titular", "NIF titular", "Nombre solicitante", "NIF solicitante", "Teléfono", "Correo electrónico"] },
  { title: "Información crediticia y operación", icon: "landmark", fields: ["Entidad", "Capital", "Importe", "Saldo real", "Saldo disponible", "Contrato", "Tipo operación", "Subtipo operación"] },
  { title: "Notaría y firma", icon: "scroll", fields: ["Notario", "NIF notario", "Apoderado", "Fecha de firma", "Número de protocolo", "Población / provincia"] },
  { title: "Finca y Registro", icon: "building", fields: ["Registro de la Propiedad", "Finca", "CRU / IDUFIR", "Población", "Provincia", "Entidad original"] },
];

function Field({ label, type = "text", value, onChange, placeholder = "Pendiente de completar", wide = false }) {
  return <label className={`block min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--molsan-secondary-text,#617789)" }}>{label}</span>
    {type === "textarea" ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }} /> :
      type === "select" ? <select value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}><option value="">— Seleccionar —</option>{(label.includes("AJD") ? ["AJD", "ITP"] : label.includes("tributación") ? ["Sujeto", "Exento", "No sujeto"] : label.includes("documentación") ? ["Pendiente", "Incompleta", "Completa"] : label.includes("saldo") ? ["Sí", "No"] : ["Pendiente", "En curso", "Completado"]).map(v => <option key={v}>{v}</option>)}</select> :
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }} />}
  </label>;
}

function SectionHeading({ icon, title, subtitle, action }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}>
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border" style={{ color: "var(--molsan-blue,#064675)", background: "var(--molsan-panel,#F2F7FB)", borderColor: "var(--molsan-border,#D8E4EC)" }}><MolsanIcon name={icon} size={21} tone="ocean" bare /></span>
      <div className="min-w-0"><h2 className="font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>{title}</h2>{subtitle && <p className="mt-0.5 text-xs" style={{ color: "var(--molsan-secondary-text,#617789)" }}>{subtitle}</p>}</div>
    </div>
    {action}
  </div>;
}

export default function FichaExpedienteDemo() {
  const [actividad, setActividad] = useState("documentacion-previa");
  const [modal, setModal] = useState("");
  const [tabDocumentos, setTabDocumentos] = useState("documentos");
  const [tabEconomia, setTabEconomia] = useState("resumen");
  const [valores, setValores] = useState({});
  const [observaciones, setObservaciones] = useState("");
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: Boolean(modal), onClose: () => setModal(""), dialogRef });
  const actual = ACTIVIDADES.find(a => a.key === actividad);
  const setField = (key, value) => setValores(prev => ({ ...prev, [key]: value }));
  const value = key => valores[key] || "";
  const documentos = actividad === "documentacion-previa"
    ? ["Hoja de solicitud / encargo", "Justificante de cancelación", "Nota simple"]
    : actividad === "liquidacion-impuestos"
      ? ["Justificante AJD / ITP"]
      : actividad === "tramitacion-inscripcion"
        ? ["Hoja de inscripción", "Nota / factura Registradores"]
        : actividad === "defectos-registrales"
          ? ["Calificación registral", "Documento de subsanación"]
          : ["Copia simple", "Hoja de presentación", "Documentación de la actividad"];
  const cards = [
    ["Provisión de fondos", "—"], ["Obligaciones / gastos", "—"], ["Pagos confirmados", "—"], ["Saldo disponible", "—"],
  ];

  return <main className="ficha-expediente-premium erp-page space-y-5">
    <MolsanPageHeader mark="EXP" title="Ficha de expediente" description="Demostración de la ficha original · MOLSAN ERP PREMIUM 2027" />
    <div className="flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm" style={{ background: "var(--molsan-table-head,#EAF2F8)", borderColor: "var(--molsan-border,#D8E4EC)", color: "var(--molsan-blue,#064675)" }}>
      <MolsanIcon name="eye" size={18} tone="ocean" bare />
      <div className="min-w-0 flex-1"><strong>MODO DEMOSTRACIÓN · SIN EXPEDIENTE REAL</strong><p className="mt-0.5 text-xs" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Vista navegable con campos vacíos y datos de muestra no persistentes. No consulta la API, no crea registros y no modifica la base de datos.</p></div>
      <span className="rounded-full border bg-white px-3 py-1 text-[11px] font-bold" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}>SOLO VISUAL</span>
    </div>

    <section className="molsan-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Identificación</p><h2 className="mt-1 text-xl font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>Ficha de expediente · Ejemplo de estructura</h2><p className="mt-1 text-sm" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Los datos reales se incorporarán cuando se realice la importación pre-firma.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => setModal("Editar datos generales")}><MolsanIcon name="edit" size={14} tone="inherit" bare /> Editar ficha</button><button type="button" className="molsan-btn" onClick={() => setModal("Observaciones")}><MolsanIcon name="messageSquare" size={14} tone="inherit" bare /> Observaciones</button></div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 px-5 pb-5 sm:grid-cols-3 xl:grid-cols-6">
        {["N.º expediente", "Estado expediente", "Actividad actual", "Titular", "Entidad", "Importe"].map(label => <div className="ficha-dato" key={label}><p className="ficha-dato__label">{label}</p><div className="ficha-dato__value">—</div></div>)}
      </div>
    </section>

    <section className="molsan-card overflow-hidden">
      <SectionHeading icon="contact" title="Datos principales" subtitle="Información general, titulares, operación, notaría y finca" action={<button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => setModal("Editar datos principales")}>Editar datos</button>} />
      <div className="space-y-5 p-5">
        {GRUPOS_DATOS.map(group => <div key={group.title}>
          <div className="mb-2 flex items-center gap-2"><MolsanIcon name={group.icon} size={16} tone="ocean" bare /><h3 className="text-sm font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>{group.title}</h3></div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 rounded-xl border p-4 sm:grid-cols-2 xl:grid-cols-3" style={{ borderColor: "var(--molsan-border,#D8E4EC)", background: "var(--molsan-panel,#F2F7FB)" }}>
            {group.fields.map(label => <div className="ficha-dato" key={label}><p className="ficha-dato__label">{label}</p><div className="ficha-dato__value">—</div></div>)}
          </div>
        </div>)}
      </div>
    </section>

    <section className="molsan-card overflow-hidden">
      <SectionHeading icon="workflow" title="Actividades del expediente" subtitle="Selecciona una fase para consultar y completar sus campos específicos" action={<button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => setModal("Datos de actividad")}>Editar datos de actividad</button>} />
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIVIDADES.map((item, index) => <button key={item.key} type="button" aria-pressed={actividad === item.key} onClick={() => setActividad(item.key)} className="group relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-xl border bg-white p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: actividad === item.key ? "var(--molsan-blue,#064675)" : "var(--molsan-border,#D8E4EC)", background: actividad === item.key ? "var(--molsan-panel,#F2F7FB)" : "#fff" }}>
          <span className="absolute inset-x-0 top-0 h-[3px] transition-all group-hover:h-1" style={{ background: actividad === item.key ? "var(--molsan-blue,#064675)" : "#B8D1E2" }} />
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ color: "var(--molsan-blue,#064675)", background: "var(--molsan-panel,#F2F7FB)" }}><MolsanIcon name={item.icon} size={21} tone="ocean" bare /></span>
          <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold" style={{ color: "var(--molsan-secondary-text,#617789)" }}>FASE {String(index + 1).padStart(2,"0")}</span><span className="mt-0.5 block text-sm font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>{item.label}</span></span>
          {actividad === item.key && <MolsanIcon name="checkCircle" size={17} tone="ocean" bare />}
        </button>)}
      </div>
      <div className="border-t p-5" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--molsan-panel,#F2F7FB)", color: "var(--molsan-blue,#064675)" }}><MolsanIcon name={actual.icon} size={21} tone="ocean" bare /></span><div><h3 className="font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>{actual.label}</h3><p className="text-xs" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Campos propios de la actividad · demostración local</p></div></div><span className="rounded-full border bg-white px-3 py-1 text-[11px] font-semibold" style={{ borderColor: "var(--molsan-border,#D8E4EC)", color: "var(--molsan-secondary-text,#617789)" }}>Sin guardar</span></div>
        {actividad === "gestion-economica" ? <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label, amount]) => <div className="molsan-data-point" key={label}><p className="ficha-dato__label">{label}</p><p className="mt-1 text-xl font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>{amount}</p></div>)}</div>
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}><h4 className="mb-3 text-sm font-semibold">Libro de gastos y pagos</h4><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead style={{ background: "var(--molsan-table-head,#EAF2F8)" }}><tr>{["Concepto", "Tipo documento", "Fecha", "Importe", "Estado"].map(h => <th className="px-3 py-3 text-xs font-bold" key={h}>{h}</th>)}</tr></thead><tbody><tr><td className="px-3 py-4" colSpan={5} style={{ color: "var(--molsan-secondary-text,#617789)" }}>Sin líneas en la demostración. Aquí se mostrarán provisiones, facturas, gastos y pagos.</td></tr></tbody></table></div></div>
          <div className="rounded-xl border px-4 py-3 text-xs" style={{ background: "var(--molsan-panel,#F2F7FB)", borderColor: "var(--molsan-border,#D8E4EC)", color: "var(--molsan-secondary-text,#617789)" }}>Regla funcional: el saldo solo se reduce con pagos confirmados. Adjuntar una factura o justificante no equivale a registrar un pago. La gestión económica es independiente del orden de las actividades.</div>
          <div className="flex flex-wrap gap-2"><button className="molsan-btn molsan-btn--primary" onClick={() => setModal("Registrar pago")} type="button">Registrar pago (demo)</button><button className="molsan-btn" onClick={() => setModal("Añadir gasto / provisión")} type="button">Añadir gasto / provisión</button><button className="molsan-btn" onClick={() => setModal("Liquidar expediente")} type="button">Liquidar expediente</button></div>
        </div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(CAMPOS[actividad] || [["fecha_inicio_actividad","Inicio actividad","date"],["fecha_fin_actividad","Fin actividad","date"],["observaciones","Observaciones","textarea"]]).map(([key,label,type]) => <Field key={key} label={label} type={type || "text"} value={value(key)} onChange={v => setField(key,v)} wide={type === "textarea"} />)}
        </div>}
        {["documentacion-previa","sede-notarial","sede-notarial-protocolo","liquidacion-impuestos","tramitacion-inscripcion","defectos-registrales"].includes(actividad) && <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--molsan-border,#D8E4EC)", background: "var(--molsan-panel,#F2F7FB)" }}>
          <h4 className="mb-2 text-sm font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>Documentación vinculada a esta actividad</h4><div className="flex flex-wrap gap-2">{documentos.map(doc => <span key={doc} className="rounded-lg border bg-white px-3 py-2 text-xs" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}><MolsanIcon name="fileText" size={13} tone="ocean" bare /> <span className="ml-1">{doc}</span></span>)}</div>
          <p className="mt-3 text-xs" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Los documentos se revisan y vinculan; no completan automáticamente una actividad ni generan movimientos económicos.</p>
        </div>}
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className="molsan-btn" onClick={() => setModal("Vista previa de actividad")}>Vista previa</button><button type="button" className="molsan-btn molsan-btn--primary" onClick={() => setModal("Guardar datos de actividad")}>Guardar (deshabilitado en demo)</button></div>
      </div>
    </section>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <section className="molsan-card overflow-hidden">
        <SectionHeading icon="folderOpen" title="Carpeta digital y documentación" subtitle="Documentos del expediente, actividad e histórico" />
        <div className="p-5"><div className="mb-4 flex flex-wrap gap-2"><button type="button" className={`molsan-btn ${tabDocumentos === "documentos" ? "molsan-btn--primary" : ""}`} onClick={() => setTabDocumentos("documentos")}>Documentos</button><button type="button" className={`molsan-btn ${tabDocumentos === "historial" ? "molsan-btn--primary" : ""}`} onClick={() => setTabDocumentos("historial")}>Historial documental</button></div>
          {tabDocumentos === "documentos" ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead style={{ background: "var(--molsan-table-head,#EAF2F8)" }}><tr>{["Documento", "Actividad", "Estado", "Fecha", "Acciones"].map(h => <th key={h} className="px-3 py-3 text-xs font-bold">{h}</th>)}</tr></thead><tbody><tr><td colSpan={5} className="px-3 py-5 text-center text-xs" style={{ color: "var(--molsan-secondary-text,#617789)" }}>La carpeta aparecerá aquí después de la importación y carga documental.</td></tr></tbody></table></div> : <div className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "var(--molsan-border,#D8E4EC)", color: "var(--molsan-secondary-text,#617789)" }}>Todavía no existe histórico documental en esta demostración.</div>}
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" className="molsan-btn molsan-btn--primary" onClick={() => setModal("Añadir documento")}>Añadir documento (demo)</button><button type="button" className="molsan-btn" onClick={() => setModal("Carpeta digital")}>Abrir carpeta digital</button></div>
        </div>
      </section>
      <section className="molsan-card overflow-hidden">
        <SectionHeading icon="wallet" title="Gestión económica" subtitle="Provisiones, obligaciones, pagos y saldo" />
        <div className="p-5"><div className="mb-4 flex flex-wrap gap-2"><button type="button" className="molsan-btn molsan-btn--primary" onClick={() => setTabEconomia("resumen")}>Resumen</button><button type="button" className="molsan-btn" onClick={() => setTabEconomia("movimientos")}>Movimientos</button></div>
          {tabEconomia === "resumen" ? <div className="grid grid-cols-2 gap-3">{cards.map(([label, amount]) => <div key={label} className="molsan-data-point"><p className="ficha-dato__label">{label}</p><p className="mt-1 text-lg font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>{amount}</p></div>)}</div> : <div className="rounded-xl border border-dashed p-5 text-sm" style={{ borderColor: "var(--molsan-border,#D8E4EC)", color: "var(--molsan-secondary-text,#617789)" }}>No hay movimientos en la demostración.</div>}
          <div className="mt-4 rounded-xl border p-3 text-xs" style={{ background: "var(--molsan-panel,#F2F7FB)", borderColor: "var(--molsan-border,#D8E4EC)", color: "var(--molsan-secondary-text,#617789)" }}>Los pagos pendientes no reducen el saldo. Solo lo hacen los pagos confirmados.</div>
        </div>
      </section>
    </div>

    <section className="molsan-card overflow-hidden">
      <SectionHeading icon="clipboardCheck" title="Checklist de cierre" subtitle="Comprobaciones antes de finalizar y entregar el expediente digital" />
      <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2 xl:grid-cols-3">{["Documentación previa completa", "Firma y protocolo", "Liquidación AJD / ITP", "Hoja de inscripción y Registradores", "Defectos registrales subsanados", "Facturación y expediente digital completo"].map(label => <div key={label} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}><span className="h-4 w-4 rounded border" style={{ borderColor: "var(--molsan-border-strong,#B8C9D5)" }} /><span className="text-sm">{label}</span><span className="ml-auto text-[10px] font-semibold" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Pendiente</span></div>)}</div>
    </section>

    <section className="molsan-card overflow-hidden">
      <SectionHeading icon="messagesSquare" title="Observaciones e histórico de acciones" subtitle="Comentarios, destinatarios y trazabilidad del expediente" action={<button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => setModal("Nueva observación")}>Nueva observación</button>} />
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold">Observaciones</h3><textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={3} placeholder="Escribe una observación de prueba…" className="w-full rounded-xl border bg-white p-3 text-sm" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }} /><p className="mt-1 text-[11px]" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Texto local de demostración; no se guarda.</p></div><div><h3 className="mb-2 text-sm font-semibold">Histórico de acciones</h3><div className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: "var(--molsan-border,#D8E4EC)", color: "var(--molsan-secondary-text,#617789)" }}>Las acciones y comentarios aparecerán aquí cuando exista un expediente importado.</div></div></div>
    </section>

    {modal && <div className="expediente-operativo-modal fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(18,42,60,.38)" }} onMouseDown={e => { if (e.target === e.currentTarget) setModal(""); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={modal} className="expediente-operativo-modal-panel w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--molsan-border,#D8E4EC)" }}><div><h2 className="font-semibold" style={{ color: "var(--molsan-blue,#064675)" }}>{modal}</h2><p className="mt-1 text-xs" style={{ color: "var(--molsan-secondary-text,#617789)" }}>Previsualización · no se guardará ninguna información</p></div><button type="button" className="molsan-btn" onClick={() => setModal("")}>Cerrar</button></div>
        <div className="space-y-4 p-5"><div className="rounded-xl border p-3 text-sm" style={{ background: "var(--molsan-panel,#F2F7FB)", borderColor: "var(--molsan-border,#D8E4EC)" }}>Esta acción solo permite revisar la estructura de la ficha. La conexión con expedientes reales se realizará después de la importación.</div><Field label="Observaciones de demostración" type="textarea" value={value("modal_observaciones")} onChange={v => setField("modal_observaciones",v)} placeholder="Campo de ejemplo" /><div className="flex justify-end"><button type="button" className="molsan-btn molsan-btn--primary" onClick={() => setModal("")}>Cerrar demostración</button></div></div>
      </div>
    </div>}
  </main>;
}
