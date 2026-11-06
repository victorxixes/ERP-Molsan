import React, { useRef, useState } from "react";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanIcon from "../../components/ui/MolsanIcon";
import "./FichaExpedientePremium.css";

/**
 * Demostración aislada de FichaExpediente.
 * Replica la jerarquía de la ficha operativa: resumen superior, banda de ficha,
 * selector horizontal de actividades, documentación dentro de la actividad,
 * y bloques inferiores de fincas/observaciones. Todos los cambios son locales.
 */
const ACTIVIDADES = [
  { key: "documentacion-previa", label: "Documentación previa", icon: "file" },
  { key: "sede-notarial", label: "Sede notarial", icon: "courthouse" },
  { key: "sede-notarial-protocolo", label: "Sede notarial con protocolo", icon: "scroll" },
  { key: "liquidacion-impuestos", label: "Liquidación de impuestos", icon: "euro" },
  { key: "tramitacion-inscripcion", label: "Tramitación inscripción", icon: "building" },
  { key: "defectos-registrales", label: "Defectos registrales", icon: "alert" },
  { key: "facturacion-cierre", label: "Cierre del expediente", icon: "receipt" },
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
    ["nombre_notario", "Nombre notario"], ["nif_notario", "NIF notario"],
    ["tipo_gestoria", "Tipo gestoría", "select"], ["fecha_firma", "Fecha de firma", "date"],
    ["tipo_documento", "Tipo de documento"], ["apoderado", "Apoderado"],
    ["poblacion_firma", "Población"], ["provincia_firma", "Provincia"],
    ["numero_protocolo", "Número de protocolo"], ["asiento_presentacion", "Asiento presentación"],
    ["libro_diario", "Libro diario"], ["fecha_presentacion", "Fecha presentación", "date"],
    ["numero_entrada", "Número de entrada"], ["fecha_recogida", "Fecha recogida / presentación telemática", "date"],
  ],
  "liquidacion-impuestos": [
    ["fecha_inicio_actividad", "Inicio actividad", "date"],
    ["fecha_presentacion_impuestos", "Fecha presentación", "date"],
    ["fecha_liquidacion_tributaria", "Fecha liquidación", "date"],
    ["oficina_liquidadora", "Oficina liquidadora"], ["comunidad_autonoma", "Comunidad autónoma"],
    ["base_imponible", "Base imponible (€)", "number"], ["tipo_tributacion", "Tipo de tributación", "select"],
    ["tipo_impuesto", "Impuesto AJD / ITP", "select"], ["justificante_impuestos", "Justificante AJD / ITP"],
    ["observaciones", "Observaciones", "textarea"],
  ],
  "tramitacion-inscripcion": [
    ["fecha_inicio_actividad", "Inicio actividad", "date"], ["registro", "Registro de la Propiedad"],
    ["fecha_presentacion_registro", "Fecha presentación", "date"],
    ["fecha_vencimiento_presentacion_registro", "Vencimiento presentación", "date"],
    ["fecha_inscripcion", "Fecha inscripción", "date"], ["hoja_inscripcion", "Hoja de inscripción"],
    ["nota_registradores", "Nota / factura Registradores"], ["observaciones", "Observaciones", "textarea"],
  ],
  "defectos-registrales": [
    ["tipo_documento", "Tipo de documento"], ["motivo_defecto", "Motivo del defecto", "textarea"],
    ["fecha_calificacion", "Fecha calificación", "date"], ["fecha_notificacion_registro", "Fecha notificación", "date"],
    ["fecha_vencimiento_presentacion_registro", "Vencimiento presentación", "date"],
    ["fecha_entrada_subsanacion", "Fecha entrada subsanación", "date"],
    ["observaciones_registro", "Observaciones Registro", "textarea"],
  ],
  "facturacion-cierre": [
    ["fecha_fin_actividad", "Fecha de cierre", "date"], ["estado_facturacion", "Estado facturación", "select"],
    ["factura_gestoria", "Factura gestoría"], ["expediente_digital", "Expediente digital completo", "select"],
    ["observaciones", "Observaciones", "textarea"],
  ],
};

const DOCUMENTOS = {
  "documentacion-previa": ["Hoja de solicitud / encargo", "Justificante de cancelación", "Nota simple"],
  "sede-notarial": ["Documentación remitida a notaría", "Confirmación de cita"],
  "sede-notarial-protocolo": ["Copia simple", "Escritura con protocolo", "Justificante de presentación"],
  "liquidacion-impuestos": ["Justificante AJD / ITP"],
  "tramitacion-inscripcion": ["Hoja de inscripción", "Nota / factura Registradores"],
  "defectos-registrales": ["Calificación registral", "Documento de subsanación"],
  "facturacion-cierre": ["Factura gestoría", "Expediente digital completo"],
};

function Field({ label, type = "text", value, onChange, wide = false }) {
  const options = label.includes("AJD") ? ["AJD", "ITP"] :
    label.includes("tributación") ? ["Sujeto", "Exento", "No sujeto"] :
    label.includes("documentación") ? ["Pendiente", "Incompleta", "Completa"] :
    label.includes("saldo") ? ["Sí", "No"] : ["Pendiente", "En curso", "Completado"];
  return <label className={`block min-w-0 ${wide ? "sm:col-span-2 xl:col-span-3" : ""}`}>
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">{label}</span>
    {type === "textarea" ? <textarea rows={3} value={value || ""} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--molsan-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--molsan-border-strong)] focus:ring-2 focus:ring-[var(--molsan-primary-soft)]" /> :
      type === "select" ? <select value={value || ""} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--molsan-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--molsan-border-strong)]"><option value="">— Seleccionar —</option>{options.map(x => <option key={x}>{x}</option>)}</select> :
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--molsan-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--molsan-border-strong)] focus:ring-2 focus:ring-[var(--molsan-primary-soft)]" />}
  </label>;
}

function Section({ title, subtitle, icon, children, className = "", action, id }) {
  return <section id={id} className={`molsan-card min-w-0 overflow-hidden ${className}`}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--molsan-border)] bg-[linear-gradient(110deg,#F2F7FB,#FFFFFF)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#D8E4EC] bg-white text-[#064675]"><MolsanIcon name={icon} size={19} tone="ocean" bare /></span>
        <div className="min-w-0"><h2 className="text-sm font-bold text-[#064675]">{title}</h2><p className="mt-0.5 text-[10px] text-[#617789]">{subtitle}</p></div>
      </div>{action}
    </header>
    <div className="p-3 sm:p-4">{children}</div>
  </section>;
}

function SummarySection({ title, subtitle, icon, children, open, onToggle, className = "" }) {
  return <section className={`molsan-card h-full min-w-0 overflow-hidden ${className}`}>
    <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[#F2F7FB]">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F2F7FB] text-[#064675]"><MolsanIcon name={icon} size={17} tone="ocean" bare /></span>
        <span className="min-w-0"><b className="block text-xs text-[#064675]">{title}</b><small className="block text-[10px] text-[#617789]">{subtitle}</small></span>
      </span><MolsanIcon name={open ? "chevronUp" : "chevronDown"} size={16} tone="muted" bare />
    </button>
    {open && <div className="border-t border-[#D8E4EC] px-3 pb-3 pt-2">{children}</div>}
  </section>;
}

function DataPoint({ label }) {
  return <div className="min-w-0 rounded-lg border border-[var(--molsan-border-light)] bg-[var(--molsan-surface-soft)] p-2"><p className="text-[9px] font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">{label}</p><p className="mt-1 break-words text-xs font-semibold text-[var(--molsan-text)]">—</p></div>;
}

export default function FichaExpedienteDemo() {
  const [actividad, setActividad] = useState("documentacion-previa");
  const [tabEconomia, setTabEconomia] = useState("resumen");
  const [controlCalidad, setControlCalidad] = useState(false);
  const [modal, setModal] = useState("");
  const [valores, setValores] = useState({});
  const [promocion, setPromocion] = useState("");
  const [relacionados, setRelacionados] = useState([]);
  const [nuevoRelacionado, setNuevoRelacionado] = useState("");
  const [abiertos, setAbiertos] = useState({ titulares: false, notario: false, credito: false });
  const [observaciones, setObservaciones] = useState("");
  const [finca, setFinca] = useState({});
  const [pagoDemo, setPagoDemo] = useState({ concepto: "", importe: "" });
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: Boolean(modal), onClose: () => setModal(""), dialogRef });

  const actual = ACTIVIDADES.find(a => a.key === actividad) || ACTIVIDADES[0];
  const setField = (key, value) => setValores(p => ({ ...p, [key]: value }));
  const value = key => valores[key] || "";
  const docs = DOCUMENTOS[actividad] || [];
  const visibleRelacionados = relacionados.slice(0, 2);
  const addRelacionado = () => {
    const v = nuevoRelacionado.trim();
    if (v && !relacionados.includes(v)) setRelacionados(p => [...p, v]);
    setNuevoRelacionado("");
  };
  const openModal = name => setModal(name);
  const closeModal = () => setModal("");
  const renderFields = (keys = CAMPOS[actividad] || []) => <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {keys.map(([key, label, type]) => <Field key={key} label={label} type={type || "text"} value={value(key)} onChange={v => setField(key, v)} wide={type === "textarea"} />)}
  </div>;

  const modalTitle = modal === "relacionados" ? "Expedientes relacionados" :
    modal === "carpeta" ? "Carpeta digital del expediente" :
    modal === "datosActividad" ? "Datos de actividad" :
    modal === "ppad" ? "PPAD · Conceptos y compensaciones" :
    modal === "acciones" ? "Acciones del expediente" :
    modal === "finca" ? "Fincas y Registros" :
    modal === "observaciones" ? "Observaciones · Historial completo" :
    modal === "defecto" ? "Alta de defecto registral" :
    modal === "control" ? "Control del expediente" :
    modal === "emails" ? "Emails del expediente" :
    modal === "clientes" ? "Área de clientes" :
    modal === "preview" ? "Vista previa de actividad" :
    modal === "pago" ? "Registrar pago · Demostración" : "Demostración de ficha";

  return <main className="ficha-expediente-premium erp-page space-y-4 pb-8">
    <div className="mb-1"><MolsanPageHeader mark="EXP" title="2026483148" description="Ficha completa del expediente · Datos, documentación y seguimiento" actions={<button type="button" onClick={() => openModal("control")} className="molsan-btn molsan-btn--secondary"><MolsanIcon name="shield" size={15} tone="ocean" bare /> Control del expediente</button>} /></div>

    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[#D8E4EC] bg-[#EAF2F8] px-4 py-3 text-xs text-[#064675]">
      <MolsanIcon name="eye" size={18} tone="ocean" bare />
      <div className="min-w-0 flex-1"><b>MODO DEMOSTRACIÓN · SIN EXPEDIENTE REAL</b><p className="mt-1 text-[11px] text-[#617789]">Estructura y ventanas de muestra. Los campos y acciones funcionan solo en esta pantalla: no consulta API, no guarda datos ni modifica expedientes.</p></div>
      <span className="rounded-full border border-[#D8E4EC] bg-white px-3 py-1 text-[10px] font-bold">SOLO PREVIEW</span>
    </div>

    {/* BLOQUES SUPERIORES: misma distribución que la ficha operativa */}
    <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-12">
      <SummarySection className="xl:col-span-4" title="Titulares y solicitantes" subtitle="Datos independientes de titulares y solicitantes del expediente" icon="users" open={abiertos.titulares} onToggle={() => setAbiertos(p => ({...p,titulares:!p.titulares}))}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--molsan-border-light)] bg-[var(--molsan-surface-soft)] p-2"><p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Titulares</p><div className="grid gap-2"><DataPoint label="Nombre titular" /><DataPoint label="NIF titular" /></div></div>
          <div className="rounded-lg border border-[var(--molsan-border-light)] bg-[var(--molsan-surface-soft)] p-2"><p className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Solicitantes</p><div className="grid gap-2"><DataPoint label="Nombre solicitante" /><DataPoint label="NIF solicitante" /></div></div>
        </div>
      </SummarySection>
      <SummarySection className="xl:col-span-4" title="Notario" subtitle="Información del notario asociado" icon="courthouse" open={abiertos.notario} onToggle={() => setAbiertos(p => ({...p,notario:!p.notario}))}>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{["Nombre notario","NIF notario","Apoderado","Tipo de firma"].map(x => <DataPoint key={x} label={x} />)}</div>
      </SummarySection>
      <SummarySection className="xl:col-span-4" title="Información crediticia" subtitle="Resumen económico y contractual" icon="briefcase" open={abiertos.credito} onToggle={() => setAbiertos(p => ({...p,credito:!p.credito}))}>
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{["Contrato","Capital","Importe","Finca","Tipo operación","Subtipo operación","N.º solicitud SIA","Observaciones"].map(x => <DataPoint key={x} label={x} />)}</div>
      </SummarySection>
    </div>

    {/* BANDA DE IDENTIFICACIÓN Y ACCIONES: debajo de los tres bloques */}
    <section className="molsan-card overflow-hidden">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 bg-[var(--molsan-surface-soft)]/80 px-3 py-2.5">
        <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg border border-[var(--molsan-border)] bg-white px-2.5 py-2">
          <MolsanIcon name="folder" size={19} tone="ocean" bare />
          <div><small className="block text-[9px] font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Expediente</small><b className="text-sm text-[#064675]">2026483148</b></div>
        </div>
        <label className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--molsan-border)] bg-white px-2.5 py-2"><span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Promoción</span><input value={promocion} onChange={e => setPromocion(e.target.value)} placeholder="Sin asignar" className="w-32 min-w-0 rounded-md border border-[var(--molsan-border)] bg-[var(--molsan-surface-soft)] px-2 py-1.5 text-xs outline-none focus:border-[var(--molsan-border-strong)]" /></label>
        <button type="button" onClick={() => openModal("relacionados")} className="molsan-btn molsan-btn--secondary text-[11px]"><MolsanIcon name="plus" size={14} tone="ocean" bare /> Agregar expediente relacionado</button>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button type="button" onClick={() => openModal("defecto")} className="molsan-btn text-[10px]">Alta defecto</button>
          <button type="button" onClick={() => openModal("control")} className="molsan-btn text-[10px]">Control y bloqueo</button>
          <button type="button" onClick={() => openModal("emails")} className="molsan-btn text-[10px]">Emails</button>
          <button type="button" onClick={() => openModal("clientes")} className="molsan-btn text-[10px]">Área de clientes</button>
        </div>
        {relacionados.length > 0 && <div className="flex basis-full flex-wrap items-center gap-2 border-t border-[var(--molsan-border)] pt-2 text-[10px]"><b className="uppercase tracking-wide text-[var(--molsan-text-muted)]">Relacionados</b>{visibleRelacionados.map(x => <span key={x} className="rounded-md border border-[var(--molsan-border)] bg-white px-2.5 py-1.5 font-semibold text-[var(--molsan-text)]">{x}</span>)}{relacionados.length > 2 && <button type="button" onClick={() => openModal("relacionados")} className="font-bold text-amber-700">+{relacionados.length-2} · Ver más</button>}</div>}
      </div>
    </section>

    {/* SELECTOR HORIZONTAL DE ACTIVIDADES Y CONTROL DE CALIDAD */}
    <section id="ficha-actividades" className="molsan-card min-w-0 overflow-hidden p-3 sm:p-4">
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-2">
        {ACTIVIDADES.map((item,index) => <React.Fragment key={item.key}>
          {index === ACTIVIDADES.length - 1 && <button type="button" onClick={() => setControlCalidad(true)} className={`group relative flex h-[84px] w-[190px] min-w-[190px] shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${controlCalidad ? "border-violet-300 bg-[var(--molsan-primary-soft)]" : "border-[var(--molsan-border)] bg-white hover:bg-[var(--molsan-primary-soft)]"}`}><span className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-violet-300 transition-all group-hover:h-1" /><span className="flex items-center gap-2 pt-1 text-xs font-bold text-[var(--molsan-primary)]"><MolsanIcon name="shield" size={18} tone="violet" bare /> Control de calidad</span><span className="mt-2 text-[9px] font-semibold text-[var(--molsan-text-secondary)]">Revisión independiente</span></button>}
          <button type="button" onClick={() => {setControlCalidad(false);setActividad(item.key);}} aria-pressed={!controlCalidad && actividad === item.key} className={`group relative flex h-[84px] w-[190px] min-w-[190px] shrink-0 flex-col justify-start rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${!controlCalidad && actividad === item.key ? "border-blue-300 bg-[var(--molsan-primary-soft)] shadow-sm" : "border-[var(--molsan-border)] bg-white"}`}>
            <span className={`absolute inset-x-0 top-0 h-[3px] rounded-t-xl transition-all group-hover:h-1 ${!controlCalidad && actividad === item.key ? "bg-[#064675]" : "bg-[#B8D1E2]"}`} />
            <span className="flex min-w-0 items-start gap-2 pt-1"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F2F7FB] text-[#064675]"><MolsanIcon name={item.icon} size={18} tone="ocean" bare /></span><span className="min-w-0"><small className="block text-[9px] font-bold text-[var(--molsan-text-secondary)]">ACTIVIDAD {String(index+1).padStart(2,"0")}</small><b className="mt-1 block text-[11px] leading-tight text-[var(--molsan-primary)]">{item.label}</b></span></span>
            {!controlCalidad && actividad === item.key && <span className="mt-1.5 text-[9px] font-bold text-emerald-700">● Actividad seleccionada</span>}
          </button>
        </React.Fragment>)}
      </div>

      {controlCalidad ? <div className="mt-2 rounded-xl border border-[var(--molsan-border)] bg-[var(--molsan-primary-soft)]/40 p-4">
        <div className="mb-3 flex items-center gap-2"><MolsanIcon name="shield" size={20} tone="violet" bare /><div><h3 className="text-sm font-extrabold text-[var(--molsan-primary)]">Control de calidad del expediente</h3><p className="text-[10px] text-[var(--molsan-primary)]">Revisión transversal e independiente de las actividades</p></div></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{["Hoja de solicitud / encargo firmada","Justificante de cancelación","Nota simple registral","Firma y protocolo notarial","Justificante AJD / ITP","Hoja de inscripción","Nota / factura Registradores","Defectos registrales subsanados","Factura y expediente digital completo"].map(x => <label key={x} className="flex items-start gap-2 rounded-lg border border-[var(--molsan-border)] bg-white p-3 text-xs text-[var(--molsan-text)]"><input type="checkbox" className="mt-0.5 accent-[#064675]" />{x}</label>)}</div>
      </div> : <div className="mt-2 min-w-0 rounded-xl border border-[var(--molsan-border)] bg-[var(--molsan-surface-soft)] p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--molsan-border)] bg-white text-[#064675]"><MolsanIcon name={actual.icon} size={19} tone="ocean" bare /></span><div><h3 className="text-sm font-extrabold text-[#064675]">{actual.label}</h3><p className="mt-0.5 text-[10px] text-[var(--molsan-text-secondary)]">Estado actividad: — <span className="px-1">·</span> Oficina: — <span className="px-1">·</span> Fecha alta: —</p></div></div>
          <span className="rounded-full border border-[var(--molsan-border)] bg-white px-3 py-1 text-[9px] font-bold text-[var(--molsan-text-secondary)]">DEMOSTRACIÓN · SIN GUARDAR</span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => openModal("datosActividad")} className="molsan-btn text-[11px]"><MolsanIcon name="clipboardList" size={15} tone="ocean" bare /> Datos de actividad</button>
          <button type="button" onClick={() => openModal("ppad")} className="molsan-btn text-[11px]"><MolsanIcon name="euro" size={15} tone="ocean" bare /> PPAD</button>
          <button type="button" onClick={() => openModal("acciones")} className="molsan-btn text-[11px]"><MolsanIcon name="zap" size={15} tone="ocean" bare /> Acciones</button>
          <span className="ml-auto text-[10px] font-semibold text-[var(--molsan-text-secondary)]">Campos propios de la actividad seleccionada</span>
        </div>

        {/* LA CARPETA DIGITAL PERTENECE A LA ACTIVIDAD; NO ES UN BLOQUE SUELTO AL FINAL */}
        <section className="mb-4 overflow-hidden rounded-xl border border-[var(--molsan-border)] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--molsan-border)] bg-white px-3 py-2.5">
            <div className="flex items-center gap-2"><MolsanIcon name="folderOpen" size={17} tone="ocean" bare /><div><h4 className="text-xs font-extrabold text-[var(--molsan-primary)]">Carpeta digital · {actual.label}</h4><p className="text-[9px] text-[var(--molsan-text-secondary)]">Documentación asociada a esta actividad y su histórico</p></div></div>
            <button type="button" onClick={() => openModal("carpeta")} className="molsan-btn molsan-btn--secondary text-[10px]">Abrir carpeta digital</button>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[10px]"><thead className="bg-[#EAF2F8] text-[var(--molsan-text-secondary)]"><tr>{["Documento requerido","Actividad","Estado","Fecha","Acción"].map(x => <th key={x} className="px-3 py-2 font-bold">{x}</th>)}</tr></thead>
              <tbody>{docs.map((doc,i) => <tr key={doc} className="border-t border-[var(--molsan-border-light)]"><td className="px-3 py-2.5 font-semibold text-[var(--molsan-text)]">{doc}</td><td className="px-3 py-2.5 text-[var(--molsan-text-secondary)]">{actual.label}</td><td className="px-3 py-2.5"><span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700">Pendiente</span></td><td className="px-3 py-2.5 text-[var(--molsan-text-muted)]">—</td><td className="px-3 py-2.5"><button type="button" onClick={() => openModal("carpeta")} className="font-bold text-[var(--molsan-primary)] hover:underline">Ver documento</button></td></tr>)}
              {docs.length === 0 && <tr><td colSpan={5} className="px-3 py-5 text-center text-[var(--molsan-text-secondary)]">No hay documentos configurados para esta actividad.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        {renderFields()}
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--molsan-border)] pt-3">
          <button type="button" onClick={() => openModal("preview")} className="molsan-btn">Vista previa</button>
          <button type="button" onClick={() => openModal("datosActividad")} className="molsan-btn molsan-btn--secondary">Consultar datos de actividad</button>
          <button type="button" onClick={() => openModal("confirmarDemo")} className="molsan-btn molsan-btn--primary">Guardar datos · Demo</button>
        </div>
      </div>}
    </section>

    {/* BLOQUES INFERIORES EN LA POSICIÓN ORIGINAL: FINCAS Y OBSERVACIONES EN PARALELO */}
    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
      <Section id="ficha-fincas" title="Fincas y Registros" subtitle="Datos registrales del expediente" icon="building" action={<button type="button" onClick={() => openModal("finca")} className="molsan-btn molsan-btn--secondary text-[10px]">＋ Nueva finca</button>}>
        <article className="rounded-xl border border-[var(--molsan-border)] bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-[var(--molsan-primary)]">Finca —</h3><p className="mt-1 text-[10px] text-[var(--molsan-text-secondary)]">Registro: — <span className="px-1">·</span> Sección: — <span className="px-1">·</span> Población: — <span className="px-1">·</span> Provincia: —</p></div><div className="flex gap-2"><button type="button" onClick={() => openModal("finca")} className="molsan-btn text-[10px]">Editar</button><button type="button" onClick={() => openModal("finca")} className="molsan-btn text-[10px]">Registro</button></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{["CRU/Idufir","Cuantía","Inscripción","Contrato"].map(x => <DataPoint key={x} label={x} />)}</div>
        </article>
      </Section>
      <Section id="ficha-observaciones" title="Observaciones" subtitle="Última observación · historial y validaciones" icon="message" action={<button type="button" onClick={() => openModal("observaciones")} className="molsan-btn molsan-btn--secondary text-[10px]">Ver historial</button>}>
        {observaciones ? <article className="rounded-xl border border-[var(--molsan-border)] bg-white p-3 text-xs text-[var(--molsan-text)]">{observaciones}</article> : <p className="rounded-xl border border-dashed border-[var(--molsan-border)] bg-white px-3 py-4 text-xs text-[var(--molsan-text-secondary)]">Todavía no hay observaciones añadidas.</p>}
        <button type="button" onClick={() => openModal("observaciones")} className="mt-3 w-full rounded-xl border border-[var(--molsan-border-strong)] bg-[var(--molsan-primary-soft)] px-3 py-2.5 text-xs font-bold text-[var(--molsan-primary)] hover:bg-blue-100"><MolsanIcon name="message" size={15} tone="ocean" bare /> Ver historial y gestionar observaciones</button>
      </Section>
    </div>

    {/* GESTIÓN ECONÓMICA COMO BLOQUE INDEPENDIENTE, NO COMO CARPETA NI ACTIVIDAD DOCUMENTAL */}
    <Section title="Gestión económica" subtitle="Provisiones, obligaciones, pagos, PPAD y saldo del expediente" icon="briefcase">
      <div className="mb-3 flex flex-wrap gap-2 border-b border-[var(--molsan-border)] pb-3">
        {[["resumen","Resumen"],["movimientos","Libro de gastos y pagos"],["ppad","PPAD"]].map(([key,label]) => <button key={key} type="button" onClick={() => setTabEconomia(key)} className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition ${tabEconomia === key ? "border-[#064675] bg-[#EAF2F8] text-[#064675]" : "border-[var(--molsan-border)] bg-white text-[var(--molsan-text-secondary)] hover:bg-[var(--molsan-surface-soft)]"}`}>{label}</button>)}
      </div>
      {tabEconomia === "resumen" && <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{["Provisión inicial","Obligaciones / gastos","Pagos confirmados","Saldo disponible"].map(x => <DataPoint key={x} label={x} />)}</div>}
      {tabEconomia === "movimientos" && <div className="overflow-x-auto rounded-xl border border-[var(--molsan-border)] bg-white"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-[#EAF2F8]"><tr>{["Fecha","Concepto","Tipo","Importe","Estado"].map(x => <th key={x} className="px-3 py-2.5">{x}</th>)}</tr></thead><tbody><tr><td colSpan={5} className="p-5 text-center text-[var(--molsan-text-secondary)]">No hay movimientos en esta demostración.</td></tr></tbody></table><div className="flex justify-end p-3"><button type="button" onClick={() => openModal("pago")} className="molsan-btn molsan-btn--primary text-[11px]">＋ Registrar pago · Demo</button></div></div>}
      {tabEconomia === "ppad" && <div className="rounded-xl border border-dashed border-[var(--molsan-border)] bg-white p-4"><p className="text-xs text-[var(--molsan-text-secondary)]">Sin registros PPAD en esta demostración.</p><button type="button" onClick={() => openModal("ppad")} className="molsan-btn molsan-btn--secondary mt-3 text-[11px]">Abrir PPAD</button></div>}
      <p className="mt-3 rounded-lg border border-[#D8E4EC] bg-[#F2F7FB] p-3 text-[10px] text-[#617789]">Regla económica: adjuntar una factura o registrar un gasto no reduce el saldo. Solo los pagos confirmados descuentan saldo disponible.</p>
    </Section>

    {/* VENTANAS MODALES DE DEMOSTRACIÓN */}
    {modal && <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={e => {if(e.target === e.currentTarget) closeModal();}}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ficha-demo-modal-title" className="my-auto max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#D8E4EC] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--molsan-border)] bg-[linear-gradient(110deg,#F2F7FB,#FFFFFF)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#D8E4EC] bg-white text-[#064675]"><MolsanIcon name="file" size={18} tone="ocean" bare /></span><div className="min-w-0"><h2 id="ficha-demo-modal-title" className="text-sm font-extrabold text-[#064675]">{modalTitle}</h2><p className="text-[10px] text-[#617789]">Expediente 2026483148 · Entorno de demostración</p></div></div>
          <button type="button" onClick={closeModal} aria-label="Cerrar ventana" className="rounded-lg border border-[var(--molsan-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--molsan-text-secondary)] hover:bg-[var(--molsan-surface-soft)]"><MolsanIcon name="x" size={14} tone="muted" bare /> Cerrar</button>
        </header>
        <div className="max-h-[calc(92vh-70px)] overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 rounded-lg border border-[#D8E4EC] bg-[#F2F7FB] p-3 text-[10px] text-[#617789]">Esta ventana reproduce la interacción y distribución de la ficha. Los botones de confirmación son demostrativos: no se envían datos ni se ejecutan operaciones reales.</div>

          {modal === "relacionados" && <div className="space-y-3"><div className="flex flex-wrap gap-2"><input value={nuevoRelacionado} onChange={e => setNuevoRelacionado(e.target.value)} onKeyDown={e => e.key === "Enter" && addRelacionado()} placeholder="Número de expediente" className="min-w-0 flex-1 rounded-lg border border-[var(--molsan-border)] px-3 py-2 text-sm" /><button type="button" onClick={addRelacionado} className="molsan-btn molsan-btn--primary">＋ Agregar</button></div><div className="overflow-hidden rounded-xl border border-[var(--molsan-border)]"><table className="w-full text-left text-xs"><thead className="bg-[#EAF2F8]"><tr><th className="px-3 py-2.5">Expediente relacionado</th><th className="px-3 py-2.5">Relación</th><th className="px-3 py-2.5">Acción</th></tr></thead><tbody>{relacionados.map(x => <tr key={x} className="border-t border-[var(--molsan-border-light)]"><td className="px-3 py-2.5 font-bold">{x}</td><td className="px-3 py-2.5">Añadido manualmente</td><td className="px-3 py-2.5"><button type="button" onClick={() => setRelacionados(p => p.filter(v => v !== x))} className="font-bold text-red-700">Quitar</button></td></tr>)}{relacionados.length === 0 && <tr><td colSpan={3} className="p-5 text-center text-[var(--molsan-text-secondary)]">No hay expedientes relacionados en la demostración.</td></tr>}</tbody></table></div></div>}

          {modal === "carpeta" && <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-[var(--molsan-primary)]">Documentación · {actual.label}</h3><p className="text-[10px] text-[var(--molsan-text-secondary)]">Vista de documentos de la actividad seleccionada</p></div><button type="button" className="molsan-btn molsan-btn--secondary text-[10px]" onClick={() => setModal("preview")}>Vista previa</button></div><div className="overflow-x-auto rounded-xl border border-[var(--molsan-border)]"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-[#EAF2F8]"><tr>{["Documento","Categoría","Estado","Fecha","Acciones"].map(x => <th key={x} className="px-3 py-2.5">{x}</th>)}</tr></thead><tbody>{docs.map(x => <tr key={x} className="border-t border-[var(--molsan-border-light)]"><td className="px-3 py-3 font-semibold">{x}</td><td className="px-3 py-3">{actual.label}</td><td className="px-3 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Pendiente</span></td><td className="px-3 py-3">—</td><td className="px-3 py-3"><button type="button" onClick={() => setModal("preview")} className="font-bold text-[var(--molsan-primary)]">Abrir</button></td></tr>)}</tbody></table></div><button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => setModal("subirDocumento")}>＋ Añadir documento · Demo</button></div>}

          {modal === "datosActividad" && <><div className="mb-3 text-xs font-bold text-[var(--molsan-text)]">{actual.label} · Datos complementarios</div>{renderFields([["fecha_inicio_actividad","Inicio actividad","date"],["fecha_fin_actividad","Fin actividad","date"],["fecha_envio_absis","Fecha de envío / integración","date"],["observaciones_actividad","Observaciones","textarea"]])}<div className="mt-4 flex justify-end"><button type="button" onClick={closeModal} className="molsan-btn molsan-btn--primary">Aceptar</button></div></>}

          {modal === "ppad" && <div className="space-y-3"><div className="overflow-hidden rounded-xl border border-[var(--molsan-border)]"><table className="w-full text-left text-xs"><thead className="bg-[#EAF2F8]"><tr>{["Concepto","Importe","Imputable a","Estado"].map(x => <th key={x} className="px-3 py-2.5">{x}</th>)}</tr></thead><tbody><tr><td colSpan={4} className="p-5 text-center text-[var(--molsan-text-secondary)]">Todavía no hay conceptos PPAD añadidos.</td></tr></tbody></table></div><button type="button" onClick={() => setValores(p => ({...p,ppadDemoNuevo:!p.ppadDemoNuevo}))} className="molsan-btn molsan-btn--secondary">＋ Añadir concepto PPAD</button>{valores.ppadDemoNuevo && <div className="grid gap-3 rounded-xl border border-[var(--molsan-border)] p-3 sm:grid-cols-2"><Field label="Concepto" value={value("ppadConcepto")} onChange={v => setField("ppadConcepto",v)} /><Field label="Importe (€)" type="number" value={value("ppadImporte")} onChange={v => setField("ppadImporte",v)} /></div>}</div>}

          {modal === "acciones" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Acción" value={value("accionDemo")} onChange={v => setField("accionDemo",v)} /><Field label="Fecha" type="date" value={value("accionFecha")} onChange={v => setField("accionFecha",v)} /><Field label="Comentarios" type="textarea" value={value("accionComentario")} onChange={v => setField("accionComentario",v)} wide /></div>}

          {modal === "finca" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Número de finca" value={finca.numero || ""} onChange={v => setFinca(p => ({...p,numero:v}))} /><Field label="Registro de la Propiedad" value={finca.registro || ""} onChange={v => setFinca(p => ({...p,registro:v}))} /><Field label="CRU / Idufir" value={finca.cru || ""} onChange={v => setFinca(p => ({...p,cru:v}))} /><Field label="Población" value={finca.poblacion || ""} onChange={v => setFinca(p => ({...p,poblacion:v}))} /><Field label="Provincia" value={finca.provincia || ""} onChange={v => setFinca(p => ({...p,provincia:v}))} /><Field label="Inscripción" value={finca.inscripcion || ""} onChange={v => setFinca(p => ({...p,inscripcion:v}))} /></div>}

          {modal === "observaciones" && <div className="space-y-3"><Field label="Nueva observación" type="textarea" value={observaciones} onChange={setObservaciones} /><div className="rounded-xl border border-dashed border-[var(--molsan-border)] p-4 text-xs text-[var(--molsan-text-secondary)]">{observaciones ? "La observación se muestra en el bloque de la ficha mientras permanezca abierta esta demostración." : "No hay observaciones guardadas en esta demostración."}</div></div>}

          {modal === "defecto" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Tipo de documento" value={value("defectoTipo")} onChange={v => setField("defectoTipo",v)} /><Field label="Fecha de calificación" type="date" value={value("defectoFecha")} onChange={v => setField("defectoFecha",v)} /><Field label="Motivo del defecto" type="textarea" value={value("defectoMotivo")} onChange={v => setField("defectoMotivo",v)} wide /></div>}

          {modal === "control" && <div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2">{["Retención sin tramitar","Cambio de gestoría","Bloqueo manual","Expediente liquidado sin tramitar"].map(x => <label key={x} className="flex items-center gap-2 rounded-lg border border-[var(--molsan-border)] p-3 text-xs"><input type="checkbox" className="accent-[#064675]" />{x}</label>)}</div><Field label="Motivo / observaciones del control" type="textarea" value={value("controlMotivo")} onChange={v => setField("controlMotivo",v)} /></div>}

          {modal === "emails" && <div className="rounded-xl border border-dashed border-[var(--molsan-border)] p-5 text-center text-xs text-[var(--molsan-text-secondary)]">La correspondencia y el histórico de emails aparecerán aquí en el expediente operativo.</div>}
          {modal === "clientes" && <div className="rounded-xl border border-dashed border-[var(--molsan-border)] p-5 text-center text-xs text-[var(--molsan-text-secondary)]">Vista de demostración del acceso al área de clientes vinculada al expediente.</div>}
          {modal === "preview" && <div className="rounded-xl border border-[var(--molsan-border)] bg-white p-5"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--molsan-text-muted)]">MOLSAN ERP · Expediente 2026483148</p><h3 className="mt-2 text-lg font-extrabold text-[var(--molsan-primary)]">{actual.label}</h3><p className="mt-1 text-xs text-[var(--molsan-text-secondary)]">Vista previa de los datos y documentos de la actividad.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{(CAMPOS[actividad] || []).slice(0,8).map(([key,label]) => <DataPoint key={key} label={label} />)}</div></div>}
          {modal === "pago" && <div className="grid gap-3 sm:grid-cols-2"><Field label="Concepto del pago" value={pagoDemo.concepto} onChange={v => setPagoDemo(p => ({...p,concepto:v}))} /><Field label="Importe (€)" type="number" value={pagoDemo.importe} onChange={v => setPagoDemo(p => ({...p,importe:v}))} /></div>}
          {(modal === "confirmarDemo" || modal === "subirDocumento") && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">{modal === "subirDocumento" ? "La carga documental real se realiza desde la carpeta digital operativa. Esta demostración no adjunta archivos." : "La ficha de demostración no persiste cambios. La validación y el guardado reales permanecen en la ficha operativa."}</div>}

          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[var(--molsan-border)] pt-3"><button type="button" onClick={closeModal} className="molsan-btn">Cerrar</button>{["datosActividad","acciones","finca","defecto","control","observaciones","pago"].includes(modal) && <button type="button" onClick={closeModal} className="molsan-btn molsan-btn--primary">Aceptar · Demo</button>}</div>
        </div>
      </section>
    </div>}
  </main>;
}
