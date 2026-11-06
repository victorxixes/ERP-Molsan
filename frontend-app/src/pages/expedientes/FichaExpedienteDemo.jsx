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
  { title: "Titulares y solicitantes", icon: "users", fields: ["N.º expediente", "Estado expediente", "Estado actividad", "Fecha de alta", "Actividad actual", "Oficina"] },
  { title: "Titulares y solicitantes", icon: "users", fields: ["Nombre titular", "NIF titular", "Nombre solicitante", "NIF solicitante", "Teléfono", "Correo electrónico"] },
  { title: "Información crediticia", icon: "landmark", fields: ["Entidad", "Capital", "Importe", "Saldo real", "Saldo disponible", "Contrato", "Tipo operación", "Subtipo operación"] },
  { title: "Notario", icon: "scroll", fields: ["Notario", "NIF notario", "Apoderado", "Fecha de firma", "Número de protocolo", "Población / provincia"] },
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
  const [tabEconomia, setTabEconomia] = useState("resumen");
  const [controlCalidad, setControlCalidad] = useState(false);
  const [modal, setModal] = useState("");
  const [valores, setValores] = useState({});
  const [promocion, setPromocion] = useState("");
  const [relacionados, setRelacionados] = useState([]);
  const [nuevoRelacionado, setNuevoRelacionado] = useState("");
  const [abiertos, setAbiertos] = useState({});
  const [observaciones, setObservaciones] = useState("");
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: Boolean(modal), onClose: () => setModal(""), dialogRef });
  const actual = ACTIVIDADES.find(a => a.key === actividad) || ACTIVIDADES[0];
  const setField = (key, value) => setValores(p => ({ ...p, [key]: value }));
  const value = key => valores[key] || "";
  const visibles = ACTIVIDADES.filter(a => a.key !== "gestion-economica");
  const docs = actividad === "documentacion-previa" ? ["Hoja de solicitud / encargo","Justificante de cancelación","Nota simple"] : actividad === "liquidacion-impuestos" ? ["Justificante AJD / ITP"] : actividad === "tramitacion-inscripcion" ? ["Hoja de inscripción","Nota / factura Registradores"] : actividad === "defectos-registrales" ? ["Calificación registral","Documento de subsanación"] : ["Copia simple","Hoja de presentación","Documentación de la actividad"];
  const field = (key,label,type) => <Field key={key} label={label} type={type || "text"} value={value(key)} onChange={v => setField(key,v)} wide={type === "textarea"} />;
  const dato = label => <div className="ficha-dato"><p className="ficha-dato__label">{label}</p><div className="ficha-dato__value">—</div></div>;
  const toggle = key => setAbiertos(p => ({...p,[key]:!p[key]}));
  const summary = (key,title,subtitle,icon,children) => <section className="molsan-card min-w-0 overflow-hidden">
    <button type="button" aria-expanded={!!abiertos[key]} onClick={()=>toggle(key)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[#F2F7FB]">
      <span className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg" style={{background:"var(--molsan-panel,#F2F7FB)",color:"var(--molsan-blue,#064675)"}}><MolsanIcon name={icon} size={17} tone="ocean" bare /></span><span><b className="block text-xs" style={{color:"var(--molsan-blue,#064675)"}}>{title}</b><small style={{color:"var(--molsan-secondary-text,#617789)"}}>{subtitle}</small></span></span><MolsanIcon name={abiertos[key]?"chevronUp":"chevronDown"} size={16} tone="muted" bare />
    </button>{abiertos[key] && <div className="border-t px-3 pb-3 pt-2" style={{borderColor:"var(--molsan-border,#D8E4EC)"}}>{children}</div>}
  </section>;
  const panel = (icon,title,subtitle,children) => <section className="molsan-card overflow-hidden"><div className="flex items-center gap-3 border-b px-4 py-3" style={{borderColor:"var(--molsan-border,#D8E4EC)",background:"linear-gradient(110deg,#F2F7FB,#fff)"}}><span className="grid h-9 w-9 place-items-center rounded-xl" style={{background:"#fff",color:"var(--molsan-blue,#064675)"}}><MolsanIcon name={icon} size={19} tone="ocean" bare /></span><div><h2 className="text-sm font-bold" style={{color:"var(--molsan-blue,#064675)"}}>{title}</h2><p className="text-[11px]" style={{color:"var(--molsan-secondary-text,#617789)"}}>{subtitle}</p></div></div><div className="p-4">{children}</div></section>;

  return <main className="ficha-expediente-premium erp-page space-y-4 pb-8">
    <MolsanPageHeader mark="EXP" title="Ficha de expediente" description="Demostración · estructura original · MOLSAN ERP PREMIUM 2027" />
    <div className="flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-xs" style={{background:"var(--molsan-table-head,#EAF2F8)",borderColor:"var(--molsan-border,#D8E4EC)",color:"var(--molsan-blue,#064675)"}}><MolsanIcon name="eye" size={18} tone="ocean" bare /><div className="min-w-0 flex-1"><b>MODO DEMOSTRACIÓN · SIN EXPEDIENTE REAL</b><p className="mt-1" style={{color:"var(--molsan-secondary-text,#617789)"}}>Campos vacíos y acciones locales. No consulta API, no guarda datos y no modifica la base de datos.</p></div><span className="rounded-full border bg-white px-3 py-1 text-[10px] font-bold">SOLO VISUAL</span></div>

    <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-12">
      <div className="xl:col-span-4">{summary("titulares","Titulares y solicitantes","Datos independientes de titulares y solicitantes","users",<div className="grid gap-2 sm:grid-cols-2"><div className="rounded-lg border bg-[#F2F7FB] p-2"><b className="text-[10px]">TITULARES</b>{dato("Nombre titular")}{dato("NIF titular")}</div><div className="rounded-lg border bg-[#F2F7FB] p-2"><b className="text-[10px]">SOLICITANTES</b>{dato("Nombre solicitante")}{dato("NIF solicitante")}</div></div>)}</div>
      <div className="xl:col-span-4">{summary("notario","Notario","Información del notario asociado","scroll",<div className="grid grid-cols-2 xl:grid-cols-4">{["Nombre notario","NIF notario","Apoderado","Tipo de firma"].map(dato)}</div>)}</div>
      <div className="xl:col-span-4">{summary("credito","Información crediticia","Resumen económico y contractual","landmark",<div className="grid grid-cols-2 xl:grid-cols-4">{["Contrato","Capital","Importe","Finca","Tipo operación","Subtipo operación","N.º solicitud SIA","Observaciones"].map(dato)}</div>)}</div>
    </div>

    <section className="molsan-card overflow-hidden"><div className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-3">
      <div className="flex shrink-0 items-center gap-2 pr-2"><span className="grid h-9 w-9 place-items-center rounded-xl" style={{background:"var(--molsan-panel,#F2F7FB)",color:"var(--molsan-blue,#064675)"}}><MolsanIcon name="folderOpen" size={19} tone="ocean" bare /></span><div className="min-w-[145px]"><small className="block text-[9px] font-bold uppercase" style={{color:"var(--molsan-secondary-text,#617789)"}}>Ficha de expediente</small><b className="text-base" style={{color:"var(--molsan-blue,#064675)"}}>2026483148</b><small className="block text-[10px]" style={{color:"var(--molsan-secondary-text,#617789)"}}>Ficha completa del expediente</small></div></div>
      <label className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5" style={{borderColor:"var(--molsan-border,#D8E4EC)"}}><b className="text-[10px] uppercase">Promoción</b><input value={promocion} onChange={e=>setPromocion(e.target.value)} placeholder="Sin asignar" className="w-36 rounded border bg-[#F8FBFD] px-2 py-1.5 text-xs" /></label>
      <button className="molsan-btn molsan-btn--secondary text-xs" onClick={()=>setModal("Agregar expediente relacionado")}>＋ Agregar expediente relacionado</button>
      <div className="ml-auto flex flex-wrap gap-1.5">{["Alta defecto","Control y bloqueo","Emails","Área de clientes"].map(x=><button key={x} className="molsan-btn text-[10px]" onClick={()=>setModal(x)}>{x}</button>)}</div>
      <div className="ml-auto flex flex-wrap gap-2"><span className="rounded-lg border bg-white px-2.5 py-2 text-[10px]"><b>Gestor asignado:</b> Pendiente</span><span className="rounded-lg border bg-[#EFF8F3] px-2.5 py-2 text-[10px] text-emerald-800"><b>Actividad actual:</b> Documentación previa</span></div>
      {relacionados.length>0 && <div className="basis-full border-t pt-2 text-[10px]">Relacionados: {relacionados.slice(0,2).join(" · ")} {relacionados.length>2 && <button onClick={()=>setModal("Ver expedientes relacionados")}>+{relacionados.length-2} · Ver más</button>}</div>}
    </div></section>

    <section id="ficha-actividades" className="molsan-card min-w-0 overflow-hidden p-3 sm:p-4">
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-2">{visibles.map((item,index)=><button key={item.key} type="button" onClick={()=>{setControlCalidad(false);setActividad(item.key)}} aria-pressed={!controlCalidad&&actividad===item.key} className="group relative flex h-[84px] w-[190px] min-w-[190px] shrink-0 flex-col justify-start rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md" style={{borderColor:!controlCalidad&&actividad===item.key?"var(--molsan-blue,#064675)":"var(--molsan-border,#D8E4EC)",background:!controlCalidad&&actividad===item.key?"var(--molsan-panel,#F2F7FB)":"#fff"}}><span className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl transition-all group-hover:h-1" style={{background:!controlCalidad&&actividad===item.key?"var(--molsan-blue,#064675)":"#B8D1E2"}}/><span className="flex items-start gap-2 pt-1"><span className="grid h-8 w-8 place-items-center rounded-lg" style={{background:"var(--molsan-panel,#F2F7FB)",color:"var(--molsan-blue,#064675)"}}><MolsanIcon name={item.icon} size={17} tone="ocean" bare /></span><span><small className="block text-[9px] font-bold">ACTIVIDAD {String(index+1).padStart(2,"0")}</small><b className="mt-1 block text-[11px] leading-tight">{item.label}</b></span></span>{actividad===item.key&&!controlCalidad&&<small className="mt-1 font-bold text-emerald-700">● Actividad seleccionada</small>}</button>)}
        <button type="button" onClick={()=>setControlCalidad(true)} className="flex h-[84px] w-[190px] min-w-[190px] shrink-0 flex-col rounded-xl border px-3 py-2 text-left" style={{borderColor:controlCalidad?"#B9A5E8":"#D8CFF0",background:controlCalidad?"#F5F1FC":"#fff"}}><b className="flex items-center gap-2 text-xs text-violet-800"><MolsanIcon name="shieldCheck" size={18} tone="inherit" bare/>Control de calidad</b><small className="mt-2 text-[9px]">Revisión independiente</small></button>
      </div>
      <div className="mt-2 rounded-xl border p-4" style={{borderColor:"var(--molsan-border,#D8E4EC)",background:"rgba(242,247,251,.72)"}}>
        {controlCalidad?<><h3 className="mb-3 text-sm font-bold">Control de calidad del expediente</h3><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{["Hoja de encargo firmada","Justificante de cancelación","Nota simple registral","Firma y protocolo","AJD / ITP","Hoja de inscripción y Registradores","Defectos registrales subsanados","Factura y expediente digital completo"].map(x=><div key={x} className="rounded-lg border bg-white p-3 text-xs">{x}<span className="float-right text-[10px]">Pendiente</span></div>)}</div></>:<>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white"><MolsanIcon name={actual.icon} size={19} tone="ocean" bare/></span><div><h3 className="text-sm font-bold" style={{color:"var(--molsan-blue,#064675)"}}>{actual.label}</h3><p className="text-[10px]">Estado actividad: —　 Oficina: —</p></div></div><span className="rounded-full border bg-white px-3 py-1 text-[10px]">Demostración · sin guardar</span></div>
          {actividad==="gestion-economica"?<div className="space-y-3"><div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{["Provisión inicial","Obligaciones / gastos","Pagos confirmados","Saldo disponible"].map(x=><div className="molsan-data-point" key={x}><p className="ficha-dato__label">{x}</p><b>—</b></div>)}</div><p className="text-xs">El saldo solo se reduce con pagos confirmados; adjuntar una factura no equivale a registrar un pago.</p><button className="molsan-btn molsan-btn--primary" onClick={()=>setModal("Registrar pago")}>Registrar pago</button></div>:<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{(CAMPOS[actividad]||[]).map(([key,label,type])=>field(key,label,type))}</div>}
          {actividad!=="gestion-economica"&&<div className="mt-4 rounded-xl border bg-white p-3" style={{borderColor:"var(--molsan-border,#D8E4EC)"}}><div className="mb-2 flex justify-between"><b className="text-xs">Documentación vinculada a la actividad</b><button className="molsan-btn text-[10px]" onClick={()=>setModal("Carpeta digital")}>Abrir carpeta digital</button></div><div className="flex flex-wrap gap-2">{docs.map(x=><span key={x} className="rounded-lg border bg-[#F8FBFD] px-2.5 py-2 text-[10px]">{x}</span>)}</div></div>}
          <div className="mt-4 flex justify-end gap-2"><button className="molsan-btn" onClick={()=>setModal("Vista previa de actividad")}>Vista previa</button><button className="molsan-btn molsan-btn--primary" onClick={()=>setModal("Guardar datos de actividad")}>Guardar (demo deshabilitada)</button></div>
        </>}
      </div>
    </section>

    <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
      {panel("building","Fincas y Registros","Datos registrales del expediente",<><div className="rounded-xl border bg-white p-3" style={{borderColor:"var(--molsan-border,#D8E4EC)"}}><div className="flex justify-between"><b className="text-sm">Finca —</b><button className="molsan-btn text-[10px]" onClick={()=>setModal("Editar finca")}>Editar</button></div><p className="mt-1 text-[11px]">Registro: — · Sección: — · Población: — · Provincia: —</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{["CRU/Idufir","Cuantía","Inscripción","Contrato"].map(dato)}</div></div><button className="molsan-btn mt-3 w-full" onClick={()=>setModal("Nueva finca")}>＋ Nueva finca</button></>)}
      {panel("messageSquare","Observaciones","Última observación · historial y validaciones",<><textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)} rows={3} placeholder="Observaciones locales…" className="w-full rounded-lg border bg-white p-3 text-sm"/><button className="molsan-btn mt-2 w-full" onClick={()=>setModal("Historial de observaciones")}>Ver historial y gestionar observaciones</button></>)}
    </div>
    {panel("folderOpen","Carpeta digital","Documentos del expediente, actividad e histórico",<><div className="mb-3 flex gap-2"><button className="molsan-btn molsan-btn--primary" onClick={()=>setModal("Documentos")}>Documentos</button><button className="molsan-btn" onClick={()=>setModal("Historial documental")}>Historial documental</button></div><div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs"><thead style={{background:"var(--molsan-table-head,#EAF2F8)"}}><tr>{["Documento","Actividad","Estado","Fecha","Acciones"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody><tr><td colSpan={5} className="p-5 text-center">La carpeta aparecerá tras la importación y carga documental.</td></tr></tbody></table></div></>)}
    {panel("wallet","Gestión económica","Provisiones, obligaciones, pagos, PPAD y saldo",<><div className="mb-3 flex flex-wrap gap-2"><button className="molsan-btn molsan-btn--primary" onClick={()=>setTabEconomia("resumen")}>Resumen</button><button className="molsan-btn" onClick={()=>setTabEconomia("movimientos")}>Libro de gastos y pagos</button><button className="molsan-btn" onClick={()=>setTabEconomia("ppad")}>PPAD</button></div>{tabEconomia==="resumen"?<div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{["Provisión inicial","Obligaciones / gastos","Pagos confirmados","Saldo disponible"].map(x=><div className="molsan-data-point" key={x}><p className="ficha-dato__label">{x}</p><b>—</b></div>)}</div>:<p className="rounded-lg border border-dashed p-4 text-xs">Sin registros en esta demostración.</p>}<p className="mt-3 rounded-lg border p-3 text-[10px]" style={{background:"var(--molsan-panel,#F2F7FB)",borderColor:"var(--molsan-border,#D8E4EC)"}}>Los pagos pendientes no reducen el saldo. Solo los pagos confirmados.</p></>)}

    {modal&&<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("")}}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" className="w-full max-w-xl overflow-hidden rounded-2xl border bg-white shadow-2xl" style={{borderColor:"var(--molsan-border,#D8E4EC)"}}><header className="flex items-center justify-between border-b px-4 py-3" style={{borderColor:"var(--molsan-border,#D8E4EC)"}}><div><h2 className="text-sm font-bold" style={{color:"var(--molsan-blue,#064675)"}}>{modal}</h2><p className="text-[10px]">Acción local · no se guardará</p></div><button className="molsan-btn" onClick={()=>setModal("")}>Cerrar</button></header><div className="p-4"><p className="mb-3 rounded-lg border p-3 text-xs" style={{background:"var(--molsan-panel,#F2F7FB)",borderColor:"var(--molsan-border,#D8E4EC)"}}>La funcionalidad real y sus validaciones permanecen en la ficha operativa. Esta demo no ejecuta operaciones.</p>{modal==="Agregar expediente relacionado"&&<div className="flex gap-2"><input value={nuevoRelacionado} onChange={e=>setNuevoRelacionado(e.target.value)} placeholder="N.º expediente" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"/><button className="molsan-btn molsan-btn--primary" onClick={()=>{const v=nuevoRelacionado.trim();if(v&&!relacionados.includes(v))setRelacionados(p=>[...p,v]);setNuevoRelacionado("")}}>Añadir localmente</button></div>}</div></section></div>}
  </main>;
}
