import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import "./ProvisionesFondosPage.css";

const hoy = () => new Date().toISOString().slice(0, 10);
const dinero = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v || 0));
const totalConceptos = (g) => Math.round((["notaria", "ajd", "registro", "gestion"].reduce((s, k) => s + Number(g?.[k] || 0), 0) + Number.EPSILON) * 100) / 100;
const compactarEntidad = (valor) => normalizarCatalogo(valor).replace(/[^a-z0-9]/g, "");
const vaciaGarantia = () => ({ entidad: "", capital: "", finca: "", cru_idufir: "", registro_propiedad: "", poblacion: "", provincia: "", tipo_carga: "prestamo hipotecario", condicion_resolutoria: "no", adquisicion_vivienda_habitual: "", notaria: "0", ajd: "0", registro: "0", gestion: "0", total: "0" });
const nuevoFormulario = () => ({ id: null, fecha: hoy(), cliente: { nombre: "", nif: "", direccion: "", cp: "", poblacion: "", provincia: "", telefono: "", email: "" }, oficina: { numero: "", contacto: "", email: "" }, garantias: [vaciaGarantia()], observaciones: "" });
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const label = "block text-xs font-semibold uppercase tracking-wide text-slate-500";
const boton = "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const DOCUMENTO_LAYOUTS = {
  liquidacion: [
    { id:"cabecera", label:"Logotipo y datos corporativos", x:5,y:3,w:90,h:10 },
    { id:"titulo", label:"Título · Hoja de liquidación", x:5,y:15,w:90,h:7 },
    { id:"datos_provision", label:"Datos de la provisión · titular · expediente · contrato · oficina", x:5,y:24,w:44,h:16 },
    { id:"datos_gestoria", label:"Datos de la gestoría", x:51,y:24,w:44,h:16 },
    { id:"documentos", label:"Documentos realizados e importes", x:5,y:42,w:58,h:14 },
    { id:"importe_provision", label:"Importe de la provisión de fondos", x:66,y:42,w:29,h:14 },
    { id:"gastos", label:"Gastos realizados · Gestión económica", x:5,y:58,w:90,h:12 },
    { id:"documentacion", label:"Documentación entregada", x:5,y:72,w:90,h:8 },
    { id:"resultado", label:"Resultado de la liquidación", x:5,y:82,w:44,h:10 },
    { id:"conformidad", label:"Cierre · fecha · conformidad y firma", x:51,y:82,w:44,h:10 },
  ],
  provision: [
    { id:"cabecera", label:"Logotipo y datos corporativos", x:5,y:3,w:90,h:10 },
    { id:"titulo", label:"Título · número y fecha de petición", x:5,y:15,w:90,h:8 },
    { id:"cliente", label:"Datos del cliente", x:5,y:25,w:90,h:15 },
    { id:"oficina", label:"Datos de la oficina de origen", x:5,y:42,w:90,h:16 },
    { id:"desglose", label:"Desglose de provisión · entidad · cuantía · notaría · impuestos · registro · gestión", x:5,y:60,w:90,h:17 },
    { id:"total", label:"Importe total estimado", x:5,y:79,w:90,h:5 },
    { id:"observaciones", label:"Observaciones y textos de estimación", x:5,y:85,w:90,h:5 },
    { id:"aviso_firma", label:"Aviso legal · firma del cliente", x:5,y:91,w:90,h:6 },
  ],
};

function ProvisionDocumentoPreview({ posiciones = {}, datosMolsan = {} }) {
  const logo = datosMolsan.logo_data_url || "";
  const razon = datosMolsan.razon_social || "MOLSAN GESTIÓN Y TRAMITACIÓN";
  const domicilio = [datosMolsan.domicilio_fiscal, [datosMolsan.codigo_postal, datosMolsan.poblacion, datosMolsan.provincia].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
  const contacto = [datosMolsan.telefono, datosMolsan.email, datosMolsan.web].filter(Boolean).join(" · ");

  const bloques = [
    { id:"cabecera", content:<div className="flex h-full items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{logo ? <img src={logo} alt="Logotipo Molsan" className="max-h-12 max-w-28 object-contain"/> : <div className="flex h-12 w-28 shrink-0 items-center justify-center rounded border border-dashed border-slate-300 text-[9px] font-bold text-slate-400">LOGOTIPO MOLSAN</div>}<div className="min-w-0"><div className="text-sm font-black text-[#123e70]">{razon}</div><div className="text-[8px] text-slate-500">{[datosMolsan.nif ? "CIF: "+datosMolsan.nif : "",domicilio,contacto].filter(Boolean).join(" · ") || "Completa los datos en Utilidades · Datos Molsan"}</div></div></div><div className="text-right text-[8px] text-slate-500">Documento de provisión</div></div> },
    { id:"titulo", content:<div className="flex h-full items-center justify-between border-b-2 border-[#1e5794] pb-1"><div><div className="text-base font-extrabold text-[#123e70]">HOJA DE PROVISIÓN DE FONDOS</div><div className="text-[9px] font-semibold text-sky-700">Estimación de gastos y servicios de tramitación</div></div><div className="text-right text-[8px] text-slate-500">Fecha: DD/MM/AAAA<br/>N.º: PROV-000000</div></div> },
    { id:"cliente", content:<div className="h-full rounded border border-sky-100 p-2"><div className="mb-1 text-[9px] font-extrabold uppercase text-[#123e70]">Datos del cliente</div><div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] text-slate-600"><span>Nombre / Razón social: <b>Nombre del titular</b></span><span>NIF: <b>00000000X</b></span><span>Dirección: Calle y número</span><span>CP / Población: 08000 · Barcelona</span><span>Teléfono: 600 000 000</span><span>Email: cliente@correo.es</span></div></div> },
    { id:"oficina", content:<div className="h-full rounded border border-sky-100 p-2"><div className="mb-1 text-[9px] font-extrabold uppercase text-[#123e70]">Oficina de origen</div><div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] text-slate-600"><span>Entidad: <b>CaixaBank / Otra entidad</b></span><span>Oficina: <b>0000</b></span><span>Persona de contacto: Nombre</span><span>Email: oficina@entidad.es</span><span>Expediente / operación: EXP-000000</span><span>Fecha de solicitud: DD/MM/AAAA</span></div></div> },
    { id:"desglose", content:<div className="h-full overflow-hidden rounded border border-sky-100"><div className="bg-sky-50 px-2 py-1 text-[9px] font-extrabold uppercase text-[#123e70]">Desglose estimado de provisión por garantía</div><table className="w-full border-collapse text-[8px]"><thead className="bg-slate-50 text-[#123e70]"><tr><th className="p-1 text-left">Concepto / garantía</th><th className="p-1 text-right">Notaría</th><th className="p-1 text-right">Impuestos</th><th className="p-1 text-right">Registro</th><th className="p-1 text-right">Gestión</th><th className="p-1 text-right">Total</th></tr></thead><tbody className="text-slate-600"><tr className="border-t border-slate-100"><td className="p-1">Hipoteca · Capital 150.000,00 €</td><td className="p-1 text-right">XXX €</td><td className="p-1 text-right">XXX €</td><td className="p-1 text-right">XXX €</td><td className="p-1 text-right">XXX €</td><td className="p-1 text-right font-bold">X.XXX €</td></tr><tr className="border-t border-slate-100"><td className="p-1">Otras garantías / conceptos</td><td className="p-1 text-right">—</td><td className="p-1 text-right">—</td><td className="p-1 text-right">—</td><td className="p-1 text-right">—</td><td className="p-1 text-right">—</td></tr></tbody></table></div> },
    { id:"total", content:<div className="flex h-full items-center justify-between rounded bg-sky-50 px-3"><span className="text-[10px] font-extrabold uppercase text-[#123e70]">Total provisión estimada</span><span className="text-lg font-black text-[#123e70]">X.XXX,XX €</span></div> },
    { id:"observaciones", content:<div className="h-full rounded border border-slate-200 p-2"><div className="mb-1 text-[8px] font-extrabold uppercase text-[#123e70]">Observaciones</div><p className="text-[8px] leading-relaxed text-slate-600">Importes estimados sujetos a las circunstancias de la operación, tarifas aplicables y liquidación definitiva de los organismos intervinientes.</p></div> },
    { id:"aviso_firma", content:<div className="flex h-full items-end justify-between gap-3 text-[8px] text-slate-600"><div className="max-w-[58%]">La presente provisión tiene carácter estimativo. Los importes finales se justificarán con los documentos y pagos correspondientes.</div><div className="w-[34%] text-center"><div className="mb-1 font-bold text-[#123e70]">Conforme del cliente</div><div className="h-8 border-b border-slate-400"/><div className="mt-1">Firma y fecha</div></div></div> },
  ];
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3"><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Previsualización de la provisión</p><h3 className="font-bold text-slate-900">Así quedaría la hoja · vista A4 en directo</h3><p className="mt-1 text-xs text-slate-500">La distribución se actualiza al instante al mover los bloques del diseñador. Los textos e importes son una referencia visual, no una provisión emitida.</p></div>
    <div className="overflow-auto rounded-xl bg-slate-100 p-3 sm:p-5"><article className="relative mx-auto aspect-[210/297] w-full max-w-[620px] overflow-hidden border border-slate-200 bg-white shadow-xl">
      <div className="absolute inset-x-[5%] top-[1.5%] border-b border-sky-200 pb-1 text-center text-[7px] font-bold tracking-[.15em] text-slate-400">MOLSAN · PROVISIÓN DE FONDOS</div>
      {bloques.map(b=>{const p=posiciones[b.id]||DOCUMENTO_LAYOUTS.provision.find(c=>c.id===b.id);if(!p)return null;return <div key={b.id} style={{left:p.x+"%",top:p.y+"%",width:p.w+"%",height:p.h+"%",textAlign:p.align||"left",fontSize:(p.fontSize||9)+"px",fontWeight:p.bold?"700":"400",fontStyle:p.italic?"italic":"normal",paddingLeft:(p.padL??1)+"%",paddingRight:(p.padR??1)+"%",paddingTop:(p.padT??1)+"%",paddingBottom:(p.padB??1)+"%"}} className="absolute overflow-hidden text-slate-800">{b.content}</div>;})}
      <div className="absolute bottom-[1.5%] left-[5%] right-[5%] border-t border-slate-200 pt-1 text-center text-[6px] text-slate-400">MOLSAN · Documento de provisión de fondos · Modelo de referencia</div>
    </article></div>
    <p className="mt-3 text-[10px] leading-4 text-slate-500">Los textos e importes de ejemplo sirven para valorar la composición. Se conservan sin cambios las tarifas, los cálculos, las reglas fiscales y la generación del PDF oficial.</p>
  </section>;
}

export function DocumentoLayoutDesigner({ tipo, datosMolsan = {} }) {
  const campos = DOCUMENTO_LAYOUTS[tipo] || [];
  const [posiciones, setPosiciones] = useState(() => Object.fromEntries(campos.map(c => [c.id,{...c,align:"left",valign:"top",fontSize:9,padL:1,padR:1,padT:1,padB:1,bold:false,italic:false}])));
  const [activo,setActivo] = useState(campos[0]?.id || "");
  const [guardando,setGuardando] = useState(false);
  const [cargando,setCargando] = useState(true);
  const [mensaje,setMensaje] = useState("");
  const [error,setError] = useState("");
  useEffect(() => {
    let vigente=true;
    axios.get("/utilidades/documentos-plantilla/"+tipo).then(({data})=>{
      if(!vigente) return;
      const guardadas=data?.configuracion?.posiciones || {};
      setPosiciones(prev=>{
        const next={...prev};
        campos.forEach(c=>{ if(guardadas[c.id]) next[c.id]={...prev[c.id],...guardadas[c.id]}; });
        return next;
      });
    }).catch(e=>{ if(vigente) setError(e?.response?.data?.detail || "No se pudo cargar la distribución guardada."); })
      .finally(()=>{if(vigente)setCargando(false);});
    return ()=>{vigente=false;};
  },[tipo]);
  const actualizar=(id,k,v)=>setPosiciones(prev=>({...prev,[id]:{...prev[id],[k]:v}}));
  const mover=(id,dx,dy)=>setPosiciones(prev=>({...prev,[id]:{...prev[id],x:Math.max(0,Math.min(100-(prev[id]?.w||10),(prev[id]?.x||0)+dx)),y:Math.max(0,Math.min(100-(prev[id]?.h||5),(prev[id]?.y||0)+dy))}}));
  const soltar=e=>{
    e.preventDefault();
    const id=e.dataTransfer.getData("text/plain");
    const r=e.currentTarget.getBoundingClientRect();
    const c=posiciones[id];
    if(!c || !r.width || !r.height) return;
    const x=((e.clientX-r.left)/r.width)*100;
    const y=((e.clientY-r.top)/r.height)*100;
    actualizar(id,"x",Math.max(0,Math.min(100-c.w,x-c.w/2)));
    actualizar(id,"y",Math.max(0,Math.min(100-c.h,y-c.h/2)));
    setActivo(id);
  };
  const guardar=async()=>{
    setGuardando(true);setError("");setMensaje("");
    try{
      const {data}=await axios.put("/utilidades/documentos-plantilla/"+tipo,{posiciones});
      if(!data?.ok) throw new Error(data?.mensaje || "No se pudo guardar la distribución.");
      setMensaje("Distribución guardada correctamente.");
    }catch(e){setError(e?.response?.data?.detail || e?.message || "No se pudo guardar la distribución.");}
    finally{setGuardando(false);}
  };
  const p=posiciones[activo] || {};
  const cambiarNumero=(k,v)=>actualizar(activo,k,Number(v));
  return <><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-wider text-sky-700">Diseñador de distribución · A4</p><h3 className="font-bold text-slate-900">Diseñador de distribución</h3><p className="mt-1 text-xs text-slate-500">Arrastra los bloques a la posición deseada. Recoloca los bloques dentro de la hoja y guarda la configuración.</p></div>
      <button type="button" onClick={guardar} disabled={guardando||cargando} className="rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{guardando?"Guardando…":"Guardar distribución"}</button>
    </div>
    <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
      <div className="overflow-auto rounded-xl bg-slate-100 p-3">
        <div onDragOver={e=>e.preventDefault()} onDrop={soltar} className="relative mx-auto aspect-[210/297] w-full max-w-[520px] overflow-hidden border border-slate-300 bg-white shadow-lg">
          <div className="absolute inset-x-[5%] top-[1.5%] border-b-2 border-[#1e5794] pb-1 text-center text-[7px] font-bold tracking-wider text-[#1e5794]">{tipo==="liquidacion"?"HOJA DE LIQUIDACIÓN · CANCELACIÓN":"PROVISIÓN ESTIMATIVA DE FONDOS"}</div>
          {campos.map(c=>{const v=posiciones[c.id]||c;return <div key={c.id} draggable onClick={()=>setActivo(c.id)} onDragStart={e=>{setActivo(c.id);e.dataTransfer.setData("text/plain",c.id);}} style={{left:v.x+"%",top:v.y+"%",width:v.w+"%",height:v.h+"%",textAlign:v.align||"left",fontSize:(v.fontSize||9)+"px",fontWeight:v.bold?"700":"500",fontStyle:v.italic?"italic":"normal",paddingLeft:(v.padL??1)+"%",paddingRight:(v.padR??1)+"%",paddingTop:(v.padT??1)+"%",paddingBottom:(v.padB??1)+"%"}} className={"absolute flex cursor-grab items-center overflow-hidden rounded-sm border border-dashed px-1 leading-tight text-sky-950 "+(activo===c.id?"z-10 border-2 border-blue-700 bg-blue-100/95 ring-2 ring-blue-300":"border-sky-500 bg-sky-50/85")}>{c.label}</div>;})}
          <div className="absolute bottom-[1.5%] left-[5%] right-[5%] border-t border-slate-200 pt-1 text-center text-[6px] text-slate-400">MOLSAN · Documento oficial · distribución de referencia</div>
        </div>
      </div>
      <aside className="grid min-w-0 content-start gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-extrabold text-slate-800">1. Selecciona un campo</p><div className="mt-2 grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 xl:grid-cols-1">{campos.map(c=><button key={c.id} type="button" draggable onClick={()=>setActivo(c.id)} onDragStart={e=>{setActivo(c.id);e.dataTransfer.setData("text/plain",c.id);}} className={"w-full cursor-grab rounded-lg border px-3 py-2 text-left text-xs font-semibold "+(activo===c.id?"border-blue-500 bg-blue-50 text-blue-900":"border-slate-200 bg-white text-slate-700")}>{c.label}</button>)}</div></div>
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
          <div><p className="text-xs font-extrabold text-blue-900">2. Posición y tamaño</p><p className="text-[10px] text-slate-500">{campos.find(c=>c.id===activo)?.label}</p></div>
          <div className="grid grid-cols-2 gap-2">{[["x","X · izquierda"],["y","Y · arriba"],["w","Ancho"],["h","Alto"]].map(([k,l])=><label key={k} className="text-[10px] font-semibold text-slate-600">{l} (%)<input type="number" min="0" max="100" step="0.5" value={Number(p[k]??0)} onChange={e=>cambiarNumero(k,e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"/></label>)}</div>
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold text-slate-600">Ajuste fino</span><div className="grid grid-cols-3 gap-1"><span/><button type="button" onClick={()=>mover(activo,0,-0.5)} className="rounded border bg-white px-2 py-1 text-xs">↑</button><span/><button type="button" onClick={()=>mover(activo,-0.5,0)} className="rounded border bg-white px-2 py-1 text-xs">←</button><button type="button" onClick={()=>mover(activo,0,0.5)} className="rounded border bg-white px-2 py-1 text-xs">↓</button><button type="button" onClick={()=>mover(activo,0.5,0)} className="rounded border bg-white px-2 py-1 text-xs">→</button></div></div>
          <div className="border-t border-blue-100 pt-2"><p className="text-xs font-extrabold text-blue-900">3. Texto y márgenes internos</p>
            <label className="mt-2 block text-[10px] font-semibold text-slate-600">Alineación horizontal<select value={p.align||"left"} onChange={e=>actualizar(activo,"align",e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"><option value="left">Izquierda</option><option value="center">Centrada</option><option value="right">Derecha</option><option value="justify">Justificada</option></select></label>
            <label className="mt-2 block text-[10px] font-semibold text-slate-600">Alineación vertical<select value={p.valign||"top"} onChange={e=>actualizar(activo,"valign",e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"><option value="top">Arriba</option><option value="center">Centro</option><option value="bottom">Abajo</option></select></label>
            <label className="mt-2 block text-[10px] font-semibold text-slate-600">Tamaño de letra (px)<input type="number" min="5" max="24" step="0.5" value={p.fontSize||9} onChange={e=>cambiarNumero("fontSize",e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"/></label>
            <div className="mt-2 grid grid-cols-2 gap-2">{[["padL","Margen izq."],["padR","Margen der."],["padT","Margen sup."],["padB","Margen inf."]].map(([k,l])=><label key={k} className="text-[10px] font-semibold text-slate-600">{l} (%)<input type="number" min="0" max="8" step="0.2" value={p[k]??1} onChange={e=>cambiarNumero(k,e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"/></label>)}</div>
            <div className="mt-2 flex gap-3 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={!!p.bold} onChange={e=>actualizar(activo,"bold",e.target.checked)}/>Negrita</label><label className="flex items-center gap-1"><input type="checkbox" checked={!!p.italic} onChange={e=>actualizar(activo,"italic",e.target.checked)}/>Cursiva</label></div>
          </div>
        </div>
        {cargando&&<p className="text-xs text-slate-500">Cargando distribución guardada…</p>}
        {error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}
        {mensaje&&<p role="status" className="text-xs font-semibold text-emerald-700">{mensaje}</p>}
        <p className="text-[10px] leading-4 text-slate-500">Esta configuración se guarda por separado para cada documento. El PDF oficial conserva su composición actual: este editor no altera la emisión, tarifas, impuestos, gastos, pagos ni datos del expediente.</p>
      </aside>
    </div>
  </section>{tipo==="provision"&&<div className="mt-5"><ProvisionDocumentoPreview posiciones={posiciones} datosMolsan={datosMolsan}/></div>}</>;
}



function Campo({ titulo, valor, onChange, tipo = "text", requerido = false, placeholder = "", disabled = false, listId }) {
  const [enfocado, setEnfocado] = useState(false);
  const esMoneda = tipo === "number";
  const mostrar = esMoneda && !enfocado && valor !== "" && valor != null && Number.isFinite(Number(valor)) ? dinero(valor) : (valor ?? "");
  return <label className={label}>{titulo}<input className={`${input} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`} type={tipo === "number" ? "text" : tipo} inputMode={tipo === "number" ? "decimal" : undefined} value={mostrar} onFocus={() => setEnfocado(true)} onBlur={() => setEnfocado(false)} onChange={(e) => onChange(e.target.value.replace(/€/g, "").replace(/\s/g, "").replace(",", "."))} required={requerido} placeholder={placeholder} disabled={disabled} list={listId} autoComplete={listId ? "off" : undefined} /></label>;
}

function normalizarCatalogo(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}
function esTerritorioVasco(g, municipios = []) {
  const normalizar = (valor) => normalizarCatalogo(valor).replace(/[^a-z0-9]/g, "");
  const claves = ["gipuzkoa", "guipuzcoa", "alava", "araba", "bizkaia", "vizcaya"];
  const municipioCatalogado = municipios.find((m) => normalizar(m.municipio) === normalizar(g?.poblacion));
  return [g?.provincia, g?.registro_propiedad, municipioCatalogado?.provincia].some((valor) => {
    const texto = normalizar(valor);
    return claves.some((clave) => texto.includes(clave));
  });
}
function AutocompleteCatalogo({ titulo, valor, opciones, etiqueta, detalle, onChange, onSelect, placeholder = "Escribe para buscar…", disabled = false, requerido = false }) {
  const [abierto, setAbierto] = useState(false);
  const consulta = normalizarCatalogo(valor);
  const filtradas = opciones.filter((op) => {
    const texto = typeof etiqueta === "function" ? etiqueta(op) : String(op ?? "");
    const apoyo = detalle ? detalle(op) : "";
    return !consulta || normalizarCatalogo(texto).includes(consulta) || normalizarCatalogo(apoyo).includes(consulta);
  }).slice(0, 12);
  return <div className="relative min-w-0">
    <label className={label}>{titulo}<input className={input} value={valor ?? ""} disabled={disabled} required={requerido} autoComplete="off" placeholder={placeholder} role="combobox" aria-autocomplete="list" aria-expanded={abierto} onFocus={() => setAbierto(true)} onChange={(e) => { onChange(e.target.value); setAbierto(true); }} onBlur={() => setTimeout(() => setAbierto(false), 120)} /></label>
    {abierto && !disabled && consulta && <div role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
      {filtradas.map((op, idx) => {
        const texto = typeof etiqueta === "function" ? etiqueta(op) : String(op ?? "");
        const apoyo = detalle ? detalle(op) : "";
        return <button key={op?.id ?? texto + idx} type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSelect(op); setAbierto(false); }} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50">
          <span className="font-medium text-slate-800">{texto}</span>{apoyo && <span className="text-xs text-slate-500">{apoyo}</span>}
        </button>;
      })}
      {!filtradas.length && <p className="px-3 py-2 text-xs text-slate-500">No hay coincidencias en el catálogo. Revisa Utilidades → Catálogos.</p>}
    </div>}
  </div>;
}
function Selector({ titulo, valor, onChange, opciones, requerido = false }) {
  return <label className={label}>{titulo}<select className={input} value={valor ?? ""} onChange={(e) => onChange(e.target.value)} required={requerido}><option value="">Seleccionar…</option>{opciones.map((op) => <option key={typeof op === "string" ? op : op.nombre} value={typeof op === "string" ? op : op.nombre}>{typeof op === "string" ? op : op.nombre}</option>)}</select></label>;
}
function Seccion({ titulo, detalle, children, className = "" }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}><div className="mb-4"><h2 className="text-base font-bold text-slate-900">{titulo}</h2>{detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}</div>{children}</section>;
}


const TRAMOS_BASE = [
  { desde: 0, hasta: 40000, notariaCaixa: 263, notariaAjena: 438, registroCaixa: 426, registroAjena: 426 },
  { desde: 40000.01, hasta: 70000, notariaCaixa: 296, notariaAjena: 471, registroCaixa: 444, registroAjena: 444 },
  { desde: 70000.01, hasta: 90000, notariaCaixa: 305, notariaAjena: 480, registroCaixa: 456, registroAjena: 456 },
  { desde: 90000.01, hasta: 110000, notariaCaixa: 320, notariaAjena: 495, registroCaixa: 474, registroAjena: 474 },
  { desde: 110000.01, hasta: 130000, notariaCaixa: 341, notariaAjena: 516, registroCaixa: 492, registroAjena: 492 },
  { desde: 130000.01, hasta: 250000, notariaCaixa: 380, notariaAjena: 555, registroCaixa: 516, registroAjena: 516 },
  { desde: 250000.01, hasta: 400000, notariaCaixa: 416, notariaAjena: 591, registroCaixa: 547, registroAjena: 547 },
  { desde: 400000.01, hasta: 600000, notariaCaixa: 509, notariaAjena: 684, registroCaixa: 601, registroAjena: 601 },
  { desde: 600000.01, hasta: 1000000, notariaCaixa: 539, notariaAjena: 714, registroCaixa: 619, registroAjena: 619 },
  { desde: 1000000.01, hasta: 1500000, notariaCaixa: 552, notariaAjena: 727, registroCaixa: 624, registroAjena: 624 },
  { desde: 1500000.01, hasta: 2000000, notariaCaixa: 611, notariaAjena: 786, registroCaixa: 631, registroAjena: 631 },
  { desde: 2000000.01, hasta: 2500000, notariaCaixa: 672, notariaAjena: 847, registroCaixa: 698, registroAjena: 698 },
  { desde: 2500000.01, hasta: 3000000, notariaCaixa: 685, notariaAjena: 860, registroCaixa: 720, registroAjena: 720 },
  { desde: 3000000.01, hasta: 3500000, notariaCaixa: 702, notariaAjena: 877, registroCaixa: 730, registroAjena: 730 },
  { desde: 3500000.01, hasta: 4000000, notariaCaixa: 736, notariaAjena: 911, registroCaixa: 760, registroAjena: 760 },
  { desde: 4000000.01, hasta: 5000000, notariaCaixa: 795, notariaAjena: 970, registroCaixa: 790, registroAjena: 790 },
  { desde: 5000000.01, hasta: 6000000, notariaCaixa: 812, notariaAjena: 987, registroCaixa: 801, registroAjena: 801 },
];
const clonarTramos = (tipo) => TRAMOS_BASE.map((t) => ({
  desde: String(t.desde), hasta: String(t.hasta),
  notaria: String(tipo === "caixabank" ? t.notariaCaixa : t.notariaAjena),
  registro: String(tipo === "caixabank" ? t.registroCaixa : t.registroAjena),
}));
const importeHonorario = (h) => {
  if (!h) return null;
  const directo = h.importe;
  if (directo !== null && directo !== undefined && directo !== "" && Number.isFinite(Number(directo))) return Number(directo);
  const base = Number(h.base_imponible ?? h.importe_base ?? h.importe_honorarios ?? h.precio);
  if (!Number.isFinite(base)) return null;
  const impuesto = String(h.tipo_impuesto || "IVA").toUpperCase() === "EXENTO" ? 0 : Number(h.porcentaje_impuesto || 0);
  return base * (1 + impuesto / 100);
};
const honorarioGestoriaPorEntidad = (catalogo, tipo) => {
  const nombres = catalogo.map((h) => ({ h, nombre: normalizarCatalogo(h.nombre) }));
  if (tipo === "caixabank") {
    return nombres.find(({ nombre }) =>
      nombre.includes("honorario") && nombre.includes("gestoria") && nombre.includes("caixabank")
    )?.h || null;
  }
  return nombres.find(({ nombre }) =>
    nombre.includes("honorario") && nombre.includes("gestoria") &&
    (nombre.includes("otra entidad") || nombre.includes("otras entidades") || nombre.includes("entidad ajena"))
  )?.h || null;
};

function ConfiguracionConceptosProvisiones({ soloEditorPlantilla = false } = {}) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errorConfig, setErrorConfig] = useState("");
  const [borradores, setBorradores] = useState({});
  const [catalogoHonorarios, setCatalogoHonorarios] = useState([]);
  const [tramosEditando, setTramosEditando] = useState({});
  const [arrastrandoCampo, setArrastrandoCampo] = useState(null);
  const [campoPlantillaActivo, setCampoPlantillaActivo] = useState("nombre_empresa");
  useEffect(() => { axios.get("/honorarios-gestoria?activos=true").then((r) => setCatalogoHonorarios(Array.isArray(r.data) ? r.data.filter((h) => h.activo !== false) : [])).catch(() => setCatalogoHonorarios([])); }, []);
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await axios.get("/expedientes/provisiones/conceptos-importes");
      const lista = r.data?.items || [];
      setItems(lista);
      setBorradores(Object.fromEntries(lista.map((x) => {
        const reglas = { porcentaje_condicion_resolutoria: 1.5, porcentaje_hipoteca_provincia: x.reglas?.porcentaje_hipoteca_provincia || x.reglas?.importes_hipoteca_provincia || { Gipuzkoa: "", Álava: "", Bizkaia: "" }, tramos: [], ...(x.reglas || {}) };
        if (!Array.isArray(reglas.tramos_caixabank)) reglas.tramos_caixabank = clonarTramos("caixabank");
        if (!Array.isArray(reglas.tramos_entidad_ajena)) reglas.tramos_entidad_ajena = clonarTramos("ajena");
        return [x.codigo, { modo: x.modo === "calculado" ? "calculado" : "previsto", importe_previsto: x.importe_previsto == null ? "" : String(x.importe_previsto), descripcion: x.descripcion || "", reglas, activo: x.activo !== false }];
      })));
      setErrorConfig("");
    } catch (e) { setErrorConfig(e.response?.data?.detail || "No se pudo cargar la configuración de conceptos."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const cambiar = (codigo, campo, valor) => setBorradores((prev) => ({ ...prev, [codigo]: { ...prev[codigo], [campo]: valor } }));
  const cambiarTramo = (codigo, tipo, indice, campo, valor) => {
    const draft = borradores[codigo] || {};
    const clave = tipo === "caixabank" ? "tramos_caixabank" : "tramos_entidad_ajena";
    const tramos = draft.reglas?.[clave] || [];
    cambiar(codigo, "reglas", { ...(draft.reglas || {}), [clave]: tramos.map((t, i) => i === indice ? { ...t, [campo]: valor } : t) });
  };
  const agregarTramo = (codigo, tipo) => {
    const draft = borradores[codigo] || {};
    const clave = tipo === "caixabank" ? "tramos_caixabank" : "tramos_entidad_ajena";
    const tramos = draft.reglas?.[clave] || [];
    cambiar(codigo, "reglas", { ...(draft.reglas || {}), [clave]: [...tramos, { desde: "", hasta: "", notaria: "", registro: "", honorario_id: "" }] });
    setTramosEditando((prev) => ({ ...prev, [tipo + "-" + tramos.length]: true }));
  };
  const eliminarTramo = (codigo, tipo, indice) => {
    if (!window.confirm("¿Quieres eliminar este tramo? La eliminación se aplicará al guardar la configuración.")) return;
    const draft = borradores[codigo] || {};
    const clave = tipo === "caixabank" ? "tramos_caixabank" : "tramos_entidad_ajena";
    cambiar(codigo, "reglas", { ...(draft.reglas || {}), [clave]: (draft.reglas?.[clave] || []).filter((_, i) => i !== indice) });
  };
  const guardarConcepto = async (item, tipoGuardado = "configuracion") => {
    const draft = borradores[item.codigo] || {};
    setGuardando(item.codigo); setMensaje(""); setErrorConfig("");
    try {
      await axios.put("/expedientes/provisiones/conceptos-importes/" + item.codigo, {
        modo: draft.modo,
        importe_previsto: draft.modo === "previsto" ? Number(draft.importe_previsto || 0) : null,
        descripcion: draft.descripcion || "",
        reglas: draft.reglas || {},
        activo: draft.activo !== false,
      });
      setMensaje(tipoGuardado === "plantilla" ? "Plantilla de la hoja de provisión guardada correctamente." : item.nombre + ": configuración guardada.");
      await cargar();
    } catch (e) { setErrorConfig(e.response?.data?.detail || "No se pudo guardar " + item.nombre + "."); }
    finally { setGuardando(""); }
  };
  const cambiarCampoPlantilla = (codigo, campo, valor) => {
    const draft = borradores[codigo] || {};
    cambiar(codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), [campo]: valor } });
  };
  const actualizarPosicionPlantilla = (codigo, campo, x, y) => {
    const p = borradores[codigo]?.reglas?.plantilla_pdf || {};
    const actual = p.posiciones?.[campo] || {};
    cambiarCampoPlantilla(codigo, "posiciones", { ...(p.posiciones || {}), [campo]: { ...actual, x: Math.max(0, Math.min(94, x)), y: Math.max(0, Math.min(82, y)) } });
  };
  const subirLogoPlantilla = (codigo, archivo) => {
    if (!archivo) return;
    if (!/^image\/(png|jpeg|webp)$/.test(archivo.type || "")) { setErrorConfig("El logo debe ser una imagen PNG, JPG o WEBP."); return; }
    if (archivo.size > 1024 * 1024) { setErrorConfig("El logo no puede superar 1 MB para mantener ligera la plantilla."); return; }
    const lector = new FileReader();
    lector.onload = () => {
      const p = borradores[codigo]?.reglas?.plantilla_pdf || {};
      cambiarCampoPlantilla(codigo, "logo_data_url", String(lector.result || ""));
      setErrorConfig("");
    };
    lector.onerror = () => setErrorConfig("No se ha podido leer el archivo del logo.");
    lector.readAsDataURL(archivo);
  };
  const renderTabla = (item, draft, tipo) => {
    const caixabank = tipo === "caixabank";
    const clave = caixabank ? "tramos_caixabank" : "tramos_entidad_ajena";
    const tramos = draft.reglas?.[clave] || [];
    const titulo = caixabank ? "CAIXABANK" : "ENTIDAD AJENA";
    const honorariosEtiqueta = caixabank ? "Honorarios" : "Gestión";
    const honorarioSeleccionado = honorarioGestoriaPorEntidad(catalogoHonorarios, tipo);
    const importe = importeHonorario(honorarioSeleccionado);
    const tablaAbierta = borradores[item.codigo]?.reglas?.tablas_abiertas?.[tipo] !== false;
    return <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-bold text-slate-900">{titulo}</h3><p className="mt-1 text-xs text-slate-500">{tramos.length} tramos · capital, notaría y registro editables; {honorariosEtiqueta.toLowerCase()} enlazada al catálogo.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), tablas_abiertas: { ...(draft.reglas?.tablas_abiertas || {}), [tipo]: !tablaAbierta } })} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">{tablaAbierta ? "− Ocultar tabla" : "+ Expandir tabla"}</button>{tablaAbierta && <button type="button" onClick={() => agregarTramo(item.codigo, tipo)} className={boton + " bg-indigo-600 text-white hover:bg-indigo-700"}>＋ Añadir tramo</button>}</div>
      </div>
      {tablaAbierta && <>
      <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Concepto enlazado automáticamente al catálogo Honorarios Gestoría</p>
        <p className="mt-1 font-semibold text-slate-800">{honorarioSeleccionado?.nombre || (caixabank ? "Honorarios de gestoría — CaixaBank" : "Honorarios de gestoría — Otra entidad")}</p>
        <p className="mt-1 text-sm text-slate-700">{importe == null ? "No se ha encontrado un importe válido en el catálogo. Revisa el concepto activo." : "Importe aplicado: " + dinero(importe)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <th className="p-2">Principal desde (€)</th><th className="p-2">Principal hasta (€)</th><th className="p-2">Notaría (€)</th><th className="p-2">Registro (€)</th><th className="p-2">{honorariosEtiqueta} · catálogo</th><th className="p-2">Total (€)</th><th className="p-2">Acciones</th>
          </tr></thead>
          <tbody>{tramos.map((tramo, indice) => {
            const claveEdicion = tipo + "-" + indice;
            const editando = Boolean(tramosEditando[claveEdicion]);
            const subtotal = Number(tramo.notaria || 0) + Number(tramo.registro || 0) + (importe ?? 0);
            const campos = [["desde", "Principal desde (€)"], ["hasta", "Principal hasta (€)"], ["notaria", "Notaría (€)"], ["registro", "Registro (€)"]];
            return <tr key={claveEdicion} className="border-b border-slate-100">
              {campos.map(([campo, etiqueta]) => <td key={campo} className="p-2">{editando ? <input aria-label={etiqueta} className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="text" inputMode="decimal" value={tramo[campo] ?? ""} onChange={(e) => cambiarTramo(item.codigo, tipo, indice, campo, e.target.value)} /> : <span>{tramo[campo] === "" || tramo[campo] == null ? "—" : dinero(tramo[campo])}</span>}</td>)}
              <td className="p-2">{importe == null ? <span className="text-amber-700">Revisar catálogo</span> : dinero(importe)}</td>
              <td className="p-2 font-semibold">{importe == null || tramo.notaria === "" || tramo.registro === "" ? <span className="text-amber-700">Pendiente</span> : dinero(subtotal)}</td>
              <td className="p-2"><div className="flex gap-1"><button type="button" onClick={() => setTramosEditando((prev) => ({ ...prev, [claveEdicion]: !prev[claveEdicion] }))} className="rounded-lg border border-slate-200 px-2 py-1.5 font-semibold text-blue-700">{editando ? "Terminar" : "Editar"}</button><button type="button" onClick={() => eliminarTramo(item.codigo, tipo, indice)} className="rounded-lg border border-red-200 px-2 py-1.5 font-semibold text-red-600">Eliminar</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">El total se calcula con Notaría + Registro + el importe del concepto enlazado a toda la tabla. Si el catálogo no devuelve un importe reconocible, se muestra «Pendiente de catálogo» y no se inventa un total.</p>
      </>}
    </div>;
  };
  return <div className={soloEditorPlantilla ? "contents" : ""}><Seccion className={soloEditorPlantilla ? "provision-editor-config-section" : ""} titulo="Configuración de conceptos e importes" detalle="Tablas editables de provisiones por capital. Los importes de Notaría y Registro se guardan por tramo; Honorarios y Gestión se enlazan al catálogo central. El total se calcula automáticamente cuando el catálogo proporciona el importe.">
    {errorConfig && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorConfig}</div>}
    {mensaje && <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensaje}</div>}
    {cargando ? <p className="py-4 text-sm text-slate-500">Cargando conceptos…</p> : <div className={soloEditorPlantilla ? "provision-editor-config-items" : "space-y-3"}>
      {items.filter((item) => item.codigo === "notaria" || (!soloEditorPlantilla && item.codigo === "impuestos")).map((item) => {
        const draft = borradores[item.codigo] || {};
        if (item.codigo === "notaria") {
          return <><div key={item.codigo} className={"rounded-xl border border-slate-200 bg-slate-50/60 p-4 " + (soloEditorPlantilla ? "provision-editor-tarifas" : "")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold text-slate-900">Tramos de provisión por capital</p><p className="mt-1 max-w-3xl text-xs text-slate-600">Configuración maestra del catálogo económico. Los cambios de tarifas se gestionan aquí y no se trasladan al editor documental.</p></div>
              <button type="button" disabled={guardando === item.codigo} onClick={() => guardarConcepto(item)} className={boton + " bg-blue-600 text-white hover:bg-blue-700"}>{guardando === item.codigo ? "Guardando…" : "Guardar tablas"}</button>
            </div>
            {renderTabla(item, draft, "caixabank")}
            {renderTabla(item, draft, "ajena")}
            
          </div>
          
          </>;
        }
        return <div key={item.codigo} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1.4fr_auto] md:items-end">
            <div><p className="font-semibold text-slate-800">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">Reglas fiscales de referencia. Los porcentajes se aplican al capital del préstamo cuando corresponde la regla territorial.</p></div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Tratamiento</label><select className={input} value={draft.modo || "calculado"} onChange={(e) => cambiar(item.codigo, "modo", e.target.value)}><option value="previsto">Importe previsto</option><option value="calculado">Calculado (pendiente de regla fiscal)</option></select>{draft.modo === "previsto" && <><label className="mb-1 mt-2 block text-xs font-semibold text-slate-600">Importe previsto (€)</label><input className={input} type="number" min="0" step="0.01" value={draft.importe_previsto ?? ""} onChange={(e) => cambiar(item.codigo, "importe_previsto", e.target.value)} placeholder="Introduce el importe" /></>}</div>
            <div><label className="mb-1 block text-xs font-semibold text-slate-600">Descripción / criterio</label><textarea className={input + " min-h-16 resize-y"} value={draft.descripcion || ""} onChange={(e) => cambiar(item.codigo, "descripcion", e.target.value)} /></div>
            <button type="button" disabled={guardando === item.codigo} onClick={() => guardarConcepto(item)} className={boton + " bg-blue-600 text-white hover:bg-blue-700"}>{guardando === item.codigo ? "Guardando…" : "Guardar reglas fiscales"}</button>
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3"><p className="text-sm font-semibold text-slate-800">Reglas iniciales de impuestos</p><p className="mt-1 text-xs text-slate-600">La condición resolutoria tiene un porcentaje propio. En hipotecas, el porcentaje configurado para la provincia se multiplica por el capital del préstamo para calcular AJD / impuestos.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>Condición resolutoria · porcentaje<input className={input} type="number" min="0" step="0.01" value={draft.reglas?.porcentaje_condicion_resolutoria ?? 1.5} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), porcentaje_condicion_resolutoria: e.target.value === "" ? "" : Number(e.target.value) })} /></label>{["Gipuzkoa", "Álava", "Bizkaia"].map((provincia) => <label key={provincia} className={label}>Hipoteca · {provincia} (%)<input className={input} type="text" inputMode="decimal" placeholder="Por definir" value={draft.reglas?.porcentaje_hipoteca_provincia?.[provincia] ?? ""} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), porcentaje_hipoteca_provincia: { ...(draft.reglas?.porcentaje_hipoteca_provincia || {}), [provincia]: e.target.value } })} /></label>)}</div><p className="mt-2 text-xs text-slate-500">Vitoria-Gasteiz queda cubierta por Álava. El porcentaje se aplica sobre el capital y el resultado se muestra en euros; valida siempre el criterio fiscal aplicable.</p></div>
        </div>;
      })}
    </div>}
  </Seccion></div>;
}

export default function ProvisionesFondosPage({ modoCatalogo = false, soloEditorPlantilla = false }) {
  const [form, setForm] = useState(nuevoFormulario);
  const [datosCorporativos, setDatosCorporativos] = useState({});
  const [cargandoDatosCorporativos, setCargandoDatosCorporativos] = useState(false);
  const [guardandoLogo, setGuardandoLogo] = useState(false);
  const [errorDatosCorporativos, setErrorDatosCorporativos] = useState("");
  const [mensajeDatosCorporativos, setMensajeDatosCorporativos] = useState("");
  useEffect(() => {
    if (!soloEditorPlantilla) return;
    let vigente = true;
    setCargandoDatosCorporativos(true);
    axios.get("/utilidades/datos-molsan").then(({ data }) => {
      if (!vigente) return;
      setDatosCorporativos(data?.datos || data || {});
    }).catch((e) => {
      if (vigente) setErrorDatosCorporativos(e?.response?.data?.detail || "No se pudieron cargar los Datos Molsan.");
    }).finally(() => { if (vigente) setCargandoDatosCorporativos(false); });
    return () => { vigente = false; };
  }, [soloEditorPlantilla]);
  const subirLogoCorporativo = (archivo) => {
    setErrorDatosCorporativos(""); setMensajeDatosCorporativos("");
    if (!archivo) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type)) {
      setErrorDatosCorporativos("Formato no válido. Sube un PNG, JPG o WEBP."); return;
    }
    if (archivo.size > 1024 * 1024) {
      setErrorDatosCorporativos("El logotipo supera el máximo permitido de 1 MB."); return;
    }
    const lector = new FileReader();
    lector.onerror = () => setErrorDatosCorporativos("No se ha podido leer el logotipo.");
    lector.onload = async () => {
      const logo_data_url = typeof lector.result === "string" ? lector.result : "";
      if (!logo_data_url) { setErrorDatosCorporativos("No se ha podido leer el logotipo."); return; }
      setGuardandoLogo(true);
      try {
        const actualizado = { ...datosCorporativos, logo_data_url };
        const { data } = await axios.put("/utilidades/datos-molsan", actualizado);
        if (data?.ok === false) throw new Error(data?.mensaje || "No se pudo guardar el logotipo.");
        setDatosCorporativos(data?.datos || actualizado);
        setMensajeDatosCorporativos("Logotipo corporativo guardado. Ya aparece en la previsualización.");
      } catch (e) {
        setErrorDatosCorporativos(e?.response?.data?.detail || e?.message || "No se pudo guardar el logotipo.");
      } finally { setGuardandoLogo(false); }
    };
    lector.readAsDataURL(archivo);
  };
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [entidadesBancarias, setEntidadesBancarias] = useState([]);
  const [catalogoHonorarios, setCatalogoHonorarios] = useState([]);
  const [catalogoMunicipios, setCatalogoMunicipios] = useState([]);
  const [catalogoOficinas, setCatalogoOficinas] = useState([]);
  const [catalogoRegistros, setCatalogoRegistros] = useState([]);
  const [tiposCarga, setTiposCarga] = useState([]);
  const [conceptosImportes, setConceptosImportes] = useState([]);
  const [emailDraft, setEmailDraft] = useState(null);
  const [emailProvisionId, setEmailProvisionId] = useState(null);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([
      axios.get("/municipios"),
      axios.get("/expedientes/provisiones/tarifas/catalogo-registros"),
      axios.get("/tipos-carga-hipotecaria/opciones"),
    ]).then(([municipios, registros, tipos]) => {
      if (!activo) return;
      setCatalogoMunicipios(Array.isArray(municipios.data) ? municipios.data.filter((m) => m.activo !== false) : []);
      setCatalogoRegistros(Array.isArray(registros.data) ? registros.data : []);
      setTiposCarga(Array.isArray(tipos.data) ? tipos.data.filter((t) => t.activo !== false) : []);
    }).catch(() => {
      if (activo) { setCatalogoMunicipios([]); setCatalogoRegistros([]); setTiposCarga([]); }
    });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activa = true;
    axios.get("/expedientes/provisiones/conceptos-importes").then((r) => {
      if (activa) setConceptosImportes(Array.isArray(r.data?.items) ? r.data.items : []);
    }).catch(() => { if (activa) setConceptosImportes([]); });
    Promise.all([
      axios.get("/entidades-bancarias"),
      axios.get("/honorarios-gestoria?activos=true"),
    ]).then(([bancos, honorarios]) => {
      if (!activa) return;
      setEntidadesBancarias(Array.isArray(bancos.data) ? bancos.data.filter((e) => e.activo !== false) : []);
      setCatalogoHonorarios(Array.isArray(honorarios.data) ? honorarios.data.filter((h) => h.activo !== false) : []);
    }).catch(() => {
      if (activa) {
        // Se mantienen disponibles los bancos aunque el catálogo de honorarios no responda.
        axios.get("/entidades-bancarias").then((r) => {
          if (activa) setEntidadesBancarias(Array.isArray(r.data) ? r.data.filter((e) => e.activo !== false) : []);
        }).catch(() => { if (activa) setEntidadesBancarias([]); });
        setCatalogoHonorarios([]);
      }
    });
    return () => { activa = false; };
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await axios.get("/expedientes/provisiones-independientes");
      setItems(r.data?.items || []);
      setError("");
    } catch (e) { setError(e.response?.data?.detail || "No se pudo cargar el histórico de provisiones."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarCliente = (campo, valor) => setForm((f) => ({ ...f, cliente: { ...f.cliente, [campo]: valor } }));
  const cambiarOficina = (campo, valor) => setForm((f) => ({ ...f, oficina: { ...f.oficina, [campo]: valor } }));
  const buscarOficinas = (valor) => {
    cambiarOficina("numero", valor);
    if (!String(valor || "").trim()) { setCatalogoOficinas([]); return; }
    axios.get("/oficinas-catalogo", { params: { q: String(valor).trim(), limit: 50 } })
      .then((r) => setCatalogoOficinas(Array.isArray(r.data?.items) ? r.data.items : []))
      .catch(() => setCatalogoOficinas([]));
  };
  const seleccionarOficina = (oficina) => setForm((f) => ({
    ...f,
    oficina: {
      ...f.oficina,
      numero: oficina.oficina || "",
      nombre: oficina.nombre || "",
      direccion: oficina.direccion || "",
      poblacion: oficina.poblacion || "",
      cp: oficina.cod_postal || "",
      provincia: oficina.provincia || "",
      dan: oficina.dan || "",
      dt: oficina.dt || "",
    },
  }));
  const importeHipotecaProvincia = (provincia) => {
    const concepto = conceptosImportes.find((x) => x.codigo === "impuestos" && x.activo !== false);
    const importes = concepto?.reglas?.porcentaje_hipoteca_provincia || concepto?.reglas?.importes_hipoteca_provincia || {};
    const clave = String(provincia || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
    const entrada = Object.entries(importes).find(([nombre]) => nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es") === clave);
    return entrada && entrada[1] !== "" && entrada[1] != null && Number.isFinite(Number(entrada[1])) ? Number(entrada[1]) : null;
  };
  const cambiarGarantia = (i, campo, valor) => setForm((f) => ({ ...f, garantias: f.garantias.map((g, n) => {
    if (n !== i) return g;
    const cambios = { [campo]: valor };
    if (campo === "tipo_carga" && valor !== "Hipotecaria") {
      cambios.notaria = "0";
      cambios.total = ["ajd", "registro", "gestion"].reduce((s, k) => s + Number(g[k] || 0), 0).toFixed(2);
    }
    return { ...g, ...cambios };
  }) }));
  const nueva = () => { setForm(nuevoFormulario()); setError(""); setAviso(""); };
  const recuperar = (item) => {
    setForm({ ...nuevoFormulario(), ...item, cliente: { ...nuevoFormulario().cliente, ...(item.cliente || {}) }, oficina: { ...nuevoFormulario().oficina, ...(item.oficina || {}) }, garantias: (item.garantias?.length ? item.garantias : [vaciaGarantia()]).map((g) => Object.fromEntries(Object.entries({ ...vaciaGarantia(), ...g }).map(([k, v]) => [k, v ?? ""]))), observaciones: item.observaciones || "" });
    setError(""); setAviso(`Provisión ${item.numero} recuperada. Puedes modificarla y guardar los cambios.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const calcular = async (i) => {
    const g = form.garantias[i];
    if (!String(g.entidad || "").trim()) { setError("Indica la entidad bancaria antes de calcular."); return; }
    const capital = Number(String(g.capital || "").replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(capital) || capital <= 0) { setError("Introduce un capital del préstamo válido y mayor que 0 €."); return; }

    const normalizar = normalizarCatalogo;
    // El usuario puede escribir el nombre bancario con o sin espacios/puntuación
    // (p. ej. "BancoCaixaGeral" frente a "Banco Caixa Geral, S.A.").
    // La coincidencia compacta evita rechazar una entidad válida por diferencias de formato.
    const entidadEscrita = normalizar(g.entidad);
    const entidadCompacta = compactarEntidad(g.entidad);
    const coincidenciasExactas = entidadesBancarias.filter((e) => normalizar(e.nombre) === entidadEscrita);
    const coincidenciasCompactas = entidadesBancarias.filter((e) => compactarEntidad(e.nombre) === entidadCompacta);
    const coincidenciasBanco = coincidenciasExactas.length ? coincidenciasExactas : coincidenciasCompactas;
    const coincidenciasParciales = coincidenciasBanco.length ? coincidenciasBanco : entidadesBancarias.filter((e) => {
      const nombre = normalizar(e.nombre);
      const nombreCompacto = compactarEntidad(e.nombre);
      return nombre.startsWith(entidadEscrita) || entidadEscrita.startsWith(nombre)
        || nombreCompacto.startsWith(entidadCompacta) || entidadCompacta.startsWith(nombreCompacto);
    });
    const banco = coincidenciasParciales.length === 1 ? coincidenciasParciales[0] : null;
    if (!banco) {
      setError(coincidenciasParciales.length > 1
        ? "Hay varias entidades que coinciden con ese texto. Escribe el nombre completo de la entidad bancaria del catálogo."
        : "Selecciona una entidad bancaria existente en el catálogo Entidades bancarias.");
      return;
    }
    const entidadActualRelacionada = entidadesBancarias.find((e) => banco.entidad_actual_id != null && String(e.id) === String(banco.entidad_actual_id));
    // La tarifa se decide exclusivamente por la columna Entidad actual del registro seleccionado.
    // Si no hay sucesora, está vacía o conserva el nombre original, corresponde Otra entidad.
    const actualNombre = (typeof banco.entidad_actual === "string" && banco.entidad_actual.trim())
      || entidadActualRelacionada?.nombre
      || "";
    const nombreOriginal = normalizar(banco.nombre);
    const nombreActual = normalizar(actualNombre);
    const esCaixaBank = Boolean(
      nombreActual
      && nombreActual !== nombreOriginal
      && (nombreActual === "caixabank" || nombreActual === "caixabank s.a." || nombreActual === "caixabank sa" || nombreActual.includes("caixabank"))
    );
    const conceptoNotaria = conceptosImportes.find((x) => x.codigo === "notaria" && x.activo !== false);
    const conceptoRegistro = conceptosImportes.find((x) => x.codigo === "registro" && x.activo !== false);
    const conceptoImpuestos = conceptosImportes.find((x) => x.codigo === "impuestos" && x.activo !== false);
    const reglas = conceptoNotaria?.reglas || {};
    const tramosConfigurados = esCaixaBank ? reglas.tramos_caixabank : reglas.tramos_entidad_ajena;
    // Los tramos iniciales que muestra el catálogo son también la configuración por defecto
    // hasta que el administrador los personalice y guarde.
    const tramos = Array.isArray(tramosConfigurados) && tramosConfigurados.length
      ? tramosConfigurados
      : clonarTramos(esCaixaBank ? "caixabank" : "ajena");
    const tramo = tramos.find((t) => {
      const desde = Number(String(t.desde ?? "").replace(",", "."));
      const hasta = Number(String(t.hasta ?? "").replace(",", "."));
      return Number.isFinite(desde) && Number.isFinite(hasta) && capital >= desde && capital <= hasta;
    });
    if (!tramo) {
      setError(`No encuentro un tramo que incluya ${dinero(capital)} para ${esCaixaBank ? "CaixaBank" : "otra entidad"}. Entra en Catálogos económicos → Provisiones de fondos, revisa los valores Desde/Hasta y pulsa «Guardar tablas».`);
      return;
    }

    const tipoCargaNormalizado = normalizar(g.tipo_carga);
    const esCondicionResolutoria = tipoCargaNormalizado.includes("condicion resolutoria") || g.condicion_resolutoria === "si";
    const esHipoteca = tipoCargaNormalizado.includes("hipotec") || tipoCargaNormalizado.includes("prestamo hipotecario") || tipoCargaNormalizado.includes("préstamo hipotecario");
    const notaria = esHipoteca ? Number(tramo.notaria || 0) : 0;
    const registro = Number(tramo.registro || 0);
    const honorario = honorarioGestoriaPorEntidad(catalogoHonorarios, esCaixaBank ? "caixabank" : "ajena");
    const gestionCalculada = importeHonorario(honorario);
    const gestion = gestionCalculada == null ? Number(g.gestion || 0) : gestionCalculada;
    let impuestos = Number(g.ajd || 0);
    if (esCondicionResolutoria) {
      const porcentajeConfigurado = conceptoImpuestos?.reglas?.porcentaje_condicion_resolutoria;
      const porcentaje = porcentajeConfigurado == null || String(porcentajeConfigurado).trim() === ""
        ? 1.5
        : Number(porcentajeConfigurado);
      if (!Number.isFinite(porcentaje) || porcentaje < 0) {
        setError("El porcentaje de impuestos para condición resolutoria no es válido. Revisa Catálogos económicos → Provisiones de fondos.");
        return;
      }
      impuestos = Math.round((capital * porcentaje / 100) * 100) / 100;
    } else if (esHipoteca && esTerritorioVasco(g, catalogoMunicipios)) {
      // En el País Vasco, la vivienda habitual está exenta: Sí fuerza AJD a 0,00 €.
      // Si responde No, solo se aplica el porcentaje territorial configurado.
      if (g.adquisicion_vivienda_habitual === "si") {
        impuestos = 0;
      } else if (g.adquisicion_vivienda_habitual === "no") {
        const porcentajeTerritorial = importeHipotecaProvincia(g.provincia);
        if (porcentajeTerritorial !== null) impuestos = Math.round((capital * porcentajeTerritorial / 100) * 100) / 100;
      }
    } else if (g.tipo_carga && !normalizar(g.tipo_carga).includes("hipotec")) {
      // Para otras cargas no se presupone un impuesto específico.
      impuestos = Number(g.ajd || 0);
    }
    const nuevoTotal = notaria + impuestos + registro + gestion;
    setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => n === i ? {
      ...x, notaria: String(notaria), ajd: String(impuestos), registro: String(registro),
      gestion: String(gestion), total: nuevoTotal.toFixed(2)
    } : x) }));
    setAviso(`Cálculo aplicado con el tramo de capital ${dinero(tramo.desde)}–${dinero(tramo.hasta)} del catálogo. Entidad de referencia: ${actualNombre}.${honorario ? "" : " No se encontró honorario activo; se ha mantenido el importe de Gestión existente."}`);
    setError("");
  };
  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    const payload = { fecha: form.fecha || hoy(), cliente: form.cliente, oficina: form.oficina, garantias: form.garantias.map((g) => {
      const notaria = normalizarCatalogo(g.tipo_carga).includes("hipotec") ? Number(g.notaria || 0) : 0;
      const ajd = Number(g.ajd || 0);
      const registro = Number(g.registro || 0);
      const gestion = Number(g.gestion || 0);
      const total = Math.round((notaria + ajd + registro + gestion + Number.EPSILON) * 100) / 100;
      return { ...g, capital: Number(g.capital || 0), notaria, ajd, registro, gestion, total };
    }), observaciones: form.observaciones };
    try {
      const r = form.id ? await axios.put(`/expedientes/provisiones-independientes/${form.id}`, payload) : await axios.post("/expedientes/provisiones-independientes", payload);
      setForm({ ...nuevoFormulario(), ...r.data, cliente: { ...nuevoFormulario().cliente, ...r.data.cliente }, oficina: { ...nuevoFormulario().oficina, ...r.data.oficina }, garantias: (r.data.garantias || [vaciaGarantia()]).map((g) => ({ ...vaciaGarantia(), ...g })), observaciones: r.data.observaciones || "" });
      setAviso(`Provisión ${r.data.numero} guardada correctamente.`);
      await cargar();
    } catch (e2) { setError(e2.response?.data?.detail || "No se pudo guardar la provisión."); }
    finally { setGuardando(false); }
  };
  const pdf = async () => {
    if (!form.id) { setError("Guarda la provisión antes de generar el PDF."); return; }
    try {
      const r = await axios.get(`/expedientes/provisiones-independientes/${form.id}/documento`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = String(form.numero || ("provision-" + form.id)) + ".pdf";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e.response?.data?.detail || "No se pudo generar el PDF."); }
  };
  const filtrados = items.filter((x) => [x.numero, x.cliente?.nombre, x.cliente?.nif, x.cliente?.poblacion].some((v) => String(v || "").toLowerCase().includes(busqueda.toLowerCase())));
  const abrirEmail = async (item = form) => {
    const id = item?.id;
    if (!id) { setError("Guarda la provisión antes de preparar el correo."); return; }
    setError(""); setAviso("");
    try {
      const r = await axios.get(`/expedientes/provisiones-independientes/${id}/email-preview`);
      setEmailDraft({ destinatario: r.data.destinatario || "", asunto: r.data.asunto || "", cuerpo: r.data.cuerpo || "", pdf_filename: r.data.pdf_filename || "provision.pdf", smtp_configurado: Boolean(r.data.smtp_configurado), historial: Array.isArray(r.data.historial) ? r.data.historial : [] });
      setEmailProvisionId(id);
    } catch (e) { setError(e.response?.data?.detail || "No se pudo preparar el email de la provisión."); }
  };
  const enviarEmail = async (e) => {
    e.preventDefault();
    if (!emailProvisionId || !emailDraft) return;
    setEnviandoEmail(true); setError(""); setAviso("");
    try {
      const r = await axios.post(`/expedientes/provisiones-independientes/${emailProvisionId}/email`, {
        destinatario: emailDraft.destinatario,
        asunto: emailDraft.asunto,
        cuerpo: emailDraft.cuerpo,
      });
      setEmailDraft(null); setEmailProvisionId(null);
      setAviso(r.data?.mensaje || "Provisión enviada por email correctamente.");
      await cargar();
    } catch (e2) { setError(e2.response?.data?.detail || "No se pudo enviar el email."); }
    finally { setEnviandoEmail(false); }
  };


  if (soloEditorPlantilla) return <main className="provisiones-fondos-page w-full min-w-0 space-y-4">
    <header className="molsan-page-header">
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">PF</div>
        <div className="min-w-0">
          <p className="molsan-page-header__eyebrow">MOLSAN ERP · UTILIDADES</p>
          <h1 className="molsan-page-header__title">Diseño de plantilla · Provisión de fondos</h1>
          <p className="molsan-page-header__description">Configura la distribución visual del documento corporativo.</p>
        </div>
      </div>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wider text-sky-700">Datos corporativos vinculados</p><h3 className="mt-1 font-bold text-slate-900">Datos Molsan</h3><p className="mt-1 text-xs text-slate-500">La cabecera utiliza la información guardada en Utilidades → Datos Molsan. Los cambios de razón social, CIF, domicilio y contacto se gestionan allí.</p>
          <div className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2"><span><b>Razón social:</b> {datosCorporativos.razon_social || "No configurada"}</span><span><b>CIF:</b> {datosCorporativos.nif || "No configurado"}</span><span><b>Domicilio:</b> {datosCorporativos.domicilio_fiscal || "No configurado"}</span><span><b>Contacto:</b> {[datosCorporativos.telefono, datosCorporativos.email].filter(Boolean).join(" · ") || "No configurado"}</span></div>
        </div>
        <div className="flex min-w-[180px] flex-col items-start gap-2">
          {datosCorporativos.logo_data_url ? <img src={datosCorporativos.logo_data_url} alt="Logotipo corporativo Molsan" className="max-h-16 max-w-40 object-contain"/> : <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">Sin logotipo</div>}
          <label className="cursor-pointer rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white">{guardandoLogo ? "Guardando…" : datosCorporativos.logo_data_url ? "Cambiar logotipo" : "Subir logotipo"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={guardandoLogo} onChange={e => { subirLogoCorporativo(e.target.files?.[0]); e.target.value = ""; }}/></label>
          <span className="text-[10px] text-slate-500">PNG, JPG o WEBP · máximo 1 MB</span>
        </div>
      </div>
      {cargandoDatosCorporativos && <p className="mt-2 text-xs text-slate-500">Cargando Datos Molsan…</p>}
      {errorDatosCorporativos && <p role="alert" className="mt-2 text-xs text-rose-700">{errorDatosCorporativos}</p>}
      {mensajeDatosCorporativos && <p role="status" className="mt-2 text-xs font-semibold text-emerald-700">{mensajeDatosCorporativos}</p>}
    </section>
    <div className="provision-editor-layout provision-editor-layout-solo"><div className="provision-editor-designer min-w-0"><DocumentoLayoutDesigner tipo="provision" datosMolsan={datosCorporativos} /></div></div>
  </main>;
  if (modoCatalogo) return <main className="provisiones-fondos-page w-full min-w-0 space-y-6">
    <header className="molsan-page-header">
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">PF</div>
        <div className="min-w-0">
          <p className="molsan-page-header__eyebrow">MOLSAN ERP · CATÁLOGOS ECONÓMICOS</p>
          <h1 className="molsan-page-header__title">Tabla Provisiones de fondos</h1>
          <p className="molsan-page-header__description">Configura importes estimativos y criterios iniciales. Estos valores sirven de referencia para nuevas provisiones; los registros históricos no se recalculan al cambiar la tabla.</p>
        </div>
      </div>
    </header>
    <ConfiguracionConceptosProvisiones />
  </main>;

  return <main className="provisiones-fondos-page w-full min-w-0 space-y-6">
    <header className="molsan-page-header">
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">PF</div>
        <div className="min-w-0">
          <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
          <h1 className="molsan-page-header__title">Provisión estimativa</h1>
          <p className="molsan-page-header__description">Gestión de presupuestos independientes, con histórico y documento PDF.</p>
          {form.id && <span className="mt-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">Editando {form.numero || `provisión #${form.id}`}</span>}
        </div>
      </div>
      <div className="molsan-page-header__actions">
        <button type="button" onClick={nueva} className={`${boton} shrink-0 bg-blue-600 text-white shadow-sm hover:bg-blue-700`}>＋ Nueva provisión</button>
      </div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{String(error)}</div>}
    {aviso && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</div>}

    

    <form onSubmit={guardar} className="space-y-5">
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
      <Seccion titulo="1. Datos del cliente" detalle="Datos de contacto del cliente que solicita la provisión estimativa.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo titulo="Nombre / razón social" valor={form.cliente.nombre} onChange={(v) => cambiarCliente("nombre", v)} requerido />
          <Campo titulo="DNI / CIF" valor={form.cliente.nif} onChange={(v) => cambiarCliente("nif", v)} />
          <Campo titulo="Teléfono" valor={form.cliente.telefono} onChange={(v) => cambiarCliente("telefono", v)} />
          <Campo titulo="Email" tipo="email" valor={form.cliente.email} onChange={(v) => cambiarCliente("email", v)} />
          <div className="sm:col-span-2"><Campo titulo="Dirección" valor={form.cliente.direccion} onChange={(v) => cambiarCliente("direccion", v)} /></div>
          <Campo titulo="Código postal" valor={form.cliente.cp} onChange={(v) => {
            const cp = String(v || "").trim();
            const coincidencias = catalogoMunicipios.filter((m) => (m.codigos_postales || []).includes(cp));
            setForm((actual) => ({
              ...actual,
              cliente: {
                ...actual.cliente,
                cp: v,
                ...(coincidencias.length === 1 ? { poblacion: coincidencias[0].municipio, provincia: coincidencias[0].provincia } : {}),
              },
            }));
          }} />
          <AutocompleteCatalogo titulo="Población" valor={form.cliente.poblacion} opciones={catalogoMunicipios} etiqueta={(m) => m.municipio} detalle={(m) => m.provincia} placeholder="Busca una población…" onChange={(v) => setForm((f) => ({ ...f, cliente: { ...f.cliente, poblacion: v, provincia: "" } }))} onSelect={(m) => setForm((f) => ({ ...f, cliente: { ...f.cliente, poblacion: m.municipio, provincia: m.provincia, cp: m.codigo_postal_principal || (m.codigos_postales || [])[0] || f.cliente.cp } }))} />
          <AutocompleteCatalogo titulo="Provincia" valor={form.cliente.provincia} opciones={[...new Set(catalogoMunicipios.map((m) => m.provincia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"))} etiqueta={(p) => p} placeholder="Busca una provincia…" onChange={(v) => cambiarCliente("provincia", v)} onSelect={(p) => cambiarCliente("provincia", p)} />
          <Campo titulo="Fecha de provisión" tipo="date" valor={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} requerido />
        </div>
      </Seccion>

      <Seccion titulo="2. Datos de la oficina de origen" detalle="Oficina que solicita o tramita la provisión.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AutocompleteCatalogo titulo="Número de oficina" valor={form.oficina.numero} opciones={catalogoOficinas} etiqueta={(o) => o.oficina} detalle={(o) => o.nombre} placeholder="Introduce el número de oficina…" onChange={buscarOficinas} onSelect={seleccionarOficina} />
          <Campo titulo="Nombre de la oficina" valor={form.oficina.nombre || ""} onChange={(v) => cambiarOficina("nombre", v)} disabled />
          <Campo titulo="Dirección" valor={form.oficina.direccion || ""} onChange={(v) => cambiarOficina("direccion", v)} disabled />
          <Campo titulo="Población" valor={form.oficina.poblacion || ""} onChange={(v) => cambiarOficina("poblacion", v)} disabled />
          <Campo titulo="Código postal" valor={form.oficina.cp || ""} onChange={(v) => cambiarOficina("cp", v)} disabled />
          <Campo titulo="Provincia" valor={form.oficina.provincia || ""} onChange={(v) => cambiarOficina("provincia", v)} disabled />
          <Campo titulo="DAN" valor={form.oficina.dan || ""} onChange={(v) => cambiarOficina("dan", v)} disabled />
          <Campo titulo="DT" valor={form.oficina.dt || ""} onChange={(v) => cambiarOficina("dt", v)} disabled />
          <Campo titulo="Contacto" valor={form.oficina.contacto} onChange={(v) => cambiarOficina("contacto", v)} />
          <Campo titulo="Email" tipo="email" valor={form.oficina.email} onChange={(v) => cambiarOficina("email", v)} />
        </div>
      </Seccion>
      </div>

      <Seccion titulo="3. Datos de la garantía y cálculo" detalle="Añade una línea por cada préstamo o garantía. Puedes calcular con el tarifario disponible o introducir los importes manualmente.">
        <datalist id="catalogo-entidades-bancarias">{entidadesBancarias.map((e) => <option key={e.id || e.nombre} value={e.nombre} />)}</datalist>
        <div className="space-y-4">
          {form.garantias.map((g, i) => <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Garantía {i + 1}</h3>{form.garantias.length > 1 && <button type="button" onClick={() => setForm((f) => ({ ...f, garantias: f.garantias.filter((_, n) => n !== i) }))} className="text-xs font-semibold text-red-600 hover:text-red-800">Eliminar</button>}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AutocompleteCatalogo titulo="Entidad bancaria" valor={g.entidad} opciones={entidadesBancarias} etiqueta={(e) => e.nombre} detalle={(e) => e.entidad_actual || ""} placeholder="Escribe para buscar una entidad bancaria…" requerido onChange={(v) => cambiarGarantia(i, "entidad", v)} onSelect={(e) => cambiarGarantia(i, "entidad", e.nombre)} />
              {(() => {
                const bancoCatalogo = entidadesBancarias.find((e) => compactarEntidad(e.nombre) === compactarEntidad(g.entidad));
                const entidadActual = String(bancoCatalogo?.entidad_actual || entidadesBancarias.find((e) => bancoCatalogo?.entidad_actual_id != null && String(e.id) === String(bancoCatalogo.entidad_actual_id))?.nombre || "").trim();
                return <p className="sm:col-span-2 lg:col-span-4 -mt-1 text-xs text-slate-500">Entidad actual del catálogo: <strong className="text-slate-700">{entidadActual || "Sin entidad actual asignada; se aplicará tarifa de otra entidad"}</strong></p>;
              })()}
              <Campo titulo="Capital del préstamo (€)" tipo="number" valor={g.capital} onChange={(v) => cambiarGarantia(i, "capital", v)} requerido />
              <Campo titulo="N.º finca registral" valor={g.finca} onChange={(v) => cambiarGarantia(i, "finca", v)} />
              <Campo titulo="CRU / IDUFIR" valor={g.cru_idufir} onChange={(v) => cambiarGarantia(i, "cru_idufir", v)} />
              <AutocompleteCatalogo titulo="Registro de la Propiedad" valor={g.registro_propiedad} opciones={catalogoRegistros} etiqueta={(r) => r.registro_propiedad} detalle={(r) => [r.poblacion, r.provincia].filter(Boolean).join(" · ")} placeholder="Busca un registro…" onChange={(v) => cambiarGarantia(i, "registro_propiedad", v)} onSelect={(r) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => n === i ? { ...x, registro_propiedad: r.registro_propiedad, poblacion: r.poblacion || x.poblacion, provincia: r.provincia || x.provincia } : x) }))} />
              <AutocompleteCatalogo titulo="Población" valor={g.poblacion} opciones={catalogoMunicipios} etiqueta={(m) => m.municipio} detalle={(m) => m.provincia} placeholder="Busca una población…" onChange={(v) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => n === i ? { ...x, poblacion: v, provincia: "", ajd: x.adquisicion_vivienda_habitual === "si" ? "0" : x.ajd } : x) }))} onSelect={(m) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => {
                if (n !== i) return x;
                return { ...x, poblacion: m.municipio, provincia: m.provincia };
              }) }))} />
              <AutocompleteCatalogo titulo="Provincia" valor={g.provincia} opciones={[...new Set(catalogoMunicipios.map((m) => m.provincia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"))} etiqueta={(p) => p} placeholder="Busca una provincia…" onChange={(v) => cambiarGarantia(i, "provincia", v)} onSelect={(p) => cambiarGarantia(i, "provincia", p)} />
              <Selector titulo="Tipo de carga" valor={g.tipo_carga} onChange={(v) => cambiarGarantia(i, "tipo_carga", v)} opciones={tiposCarga} />
              <Selector titulo="¿Es una condición resolutoria?" valor={g.condicion_resolutoria || (normalizarCatalogo(g.tipo_carga).includes("condicion resolutoria") ? "si" : "no")} onChange={(v) => cambiarGarantia(i, "condicion_resolutoria", v)} opciones={[{ nombre: "no" }, { nombre: "si" }]} />
              {normalizarCatalogo(g.tipo_carga).includes("hipotec") && esTerritorioVasco(g, catalogoMunicipios) && <label className={label}>¿La hipoteca se constituyó para adquirir la vivienda habitual?
                <select className={input} value={g.adquisicion_vivienda_habitual ?? ""} onChange={(e) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => {
                  if (n !== i) return x;
                  const respuesta = e.target.value;
                  return { ...x, adquisicion_vivienda_habitual: respuesta, ...(respuesta === "si" ? { ajd: "0" } : {}) };
                }) }))}>
                <option value="">Selecciona una respuesta…</option><option value="si">Sí, para adquirir la vivienda habitual</option><option value="no">No, para otra finalidad</option>
              </select>
              </label>}
            </div>
            {normalizarCatalogo(g.tipo_carga).includes("hipotec") && esTerritorioVasco(g, catalogoMunicipios) && <div role="status" className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <strong>Regla territorial detectada: {g.provincia}.</strong>{" "}
              {g.adquisicion_vivienda_habitual === "" || g.adquisicion_vivienda_habitual == null
                ? "Responde primero si la hipoteca se constituyó para adquirir la vivienda habitual."
                : g.adquisicion_vivienda_habitual === "si"
                  ? "Al tratarse de la vivienda habitual, AJD / impuestos queda fijado en 0,00 € y no se aplica el porcentaje provincial."
                  : importeHipotecaProvincia(g.provincia) === null
                    ? "No hay porcentaje configurado para " + g.provincia + " en Catálogos → Tabla Provisiones de fondos. Introduce el impuesto manualmente."
                    : "Como la hipoteca no se constituyó para adquirir la vivienda habitual, se aplica el " + String(importeHipotecaProvincia(g.provincia)).replace(".", ",") + " % al capital del préstamo. El resultado se refleja en AJD / impuestos y puedes revisarlo antes de guardar."}
            </div>}
            {!normalizarCatalogo(g.tipo_carga).includes("hipotec") && <div role="note" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>Atención:</strong> en cargas administrativas, judiciales, bienes muebles u otras (por ejemplo, embargos) no se debe presupuestar gasto notarial. Añade en Observaciones una nota indicando la carga que debe cancelarse. El importe de Notaría queda a 0 €.</div>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Campo titulo="Notaría (€)" tipo="number" valor={g.notaria} onChange={(v) => cambiarGarantia(i, "notaria", v)} disabled={!normalizarCatalogo(g.tipo_carga).includes("hipotec")} />
              <Campo titulo="AJD / impuestos (€)" tipo="number" valor={g.ajd} onChange={(v) => cambiarGarantia(i, "ajd", v)} />
              <Campo titulo="Registro (€)" tipo="number" valor={g.registro} onChange={(v) => cambiarGarantia(i, "registro", v)} />
              <Campo titulo="Gestión (€)" tipo="number" valor={g.gestion} onChange={(v) => cambiarGarantia(i, "gestion", v)} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => calcular(i)} className={`${boton} border border-blue-200 bg-white text-blue-800 hover:bg-blue-50`}>Calcular con tarifario</button>
              <div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total de la garantía</p><p className="text-lg font-bold text-slate-900">{dinero(totalConceptos(g))}</p></div>
            </div>
          </div>)}
          <button type="button" onClick={() => setForm((f) => ({ ...f, garantias: [...f.garantias, vaciaGarantia()] }))} className={`${boton} border border-dashed border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>＋ Añadir otra garantía / préstamo</button>
        </div>
      </Seccion>

      <Seccion titulo="4. Observaciones" ><textarea className={`${input} min-h-24 resize-y`} value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} placeholder="Si se trata de un embargo u otra carga no hipotecaria, indica aquí qué carga debe cancelarse y cualquier detalle relevante. No se presupuestará gasto notarial para esas cargas." /></Seccion>

      <div className="sticky bottom-3 z-10 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Importe total estimado</p><p className="text-2xl font-bold text-slate-950">{dinero(form.garantias.reduce((s, g) => s + totalConceptos(g), 0))}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={nueva} className={`${boton} border border-slate-300 text-slate-700 hover:bg-slate-50`}>Nueva / limpiar</button><button type="button" onClick={pdf} disabled={!form.id} className={`${boton} border border-blue-200 text-blue-800 hover:bg-blue-50`}>Generar PDF</button><button type="button" onClick={() => abrirEmail(form)} disabled={!form.id} className={`${boton} border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>✉ Enviar por email</button><button type="submit" disabled={guardando} className={`${boton} bg-slate-950 text-white hover:bg-slate-800`}>{guardando ? "Guardando…" : form.id ? "Guardar cambios" : "Guardar provisión"}</button></div>
      </div>
    </form>

    <Seccion titulo="Histórico de provisiones guardadas" detalle="Busca, recupera y modifica una provisión anterior o vuelve a generar su documento.">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row"><input className={`${input} mt-0 flex-1`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por número, cliente, DNI/CIF o población…" /><button type="button" onClick={cargar} className={`${boton} border border-slate-300 text-slate-700 hover:bg-slate-50`}>Actualizar</button></div>
      {cargando ? <p role="status" aria-live="polite" className="py-8 text-center text-sm text-slate-500">Cargando histórico…</p> : filtrados.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Todavía no hay provisiones guardadas que coincidan con la búsqueda.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Número / fecha</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Población</th><th className="px-3 py-3 text-right">Importe</th><th className="px-3 py-3">Acciones</th></tr></thead><tbody>{filtrados.map((it) => <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-3"><p className="font-bold text-slate-900">{it.numero}</p><p className="text-xs text-slate-500">{it.fecha || "—"}</p></td><td className="px-3 py-3"><p className="font-semibold">{it.cliente?.nombre || "—"}</p><p className="text-xs text-slate-500">{it.cliente?.nif || ""}</p></td><td className="px-3 py-3">{it.cliente?.poblacion || "—"}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{dinero(it.importe_total)}</td><td className="px-3 py-3"><div className="flex flex-col items-start gap-1"><button type="button" onClick={() => recuperar(it)} className="font-semibold text-blue-700 hover:underline">Abrir / editar</button><button type="button" onClick={() => abrirEmail(it)} className="font-semibold text-emerald-700 hover:underline">Enviar por email</button></div></td></tr>)}</tbody></table></div>}

    </Seccion>
    {emailDraft && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Enviar provisión por email">
      <form onSubmit={enviarEmail} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.55)]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/70 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black tracking-tight text-white shadow-lg shadow-slate-900/15">M·</div>
            <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-800">MOLSAN ERP · PREMIUM 2027</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">Enviar provisión de fondos</h2><p className="mt-1 text-sm text-slate-600">Correspondencia tipificada · PDF adjunto automáticamente</p><p className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"><span className="h-2 w-2 rounded-full bg-blue-700"></span>Remitente: cancelaciones@molsan.es</p></div>
          </div>
          <button type="button" onClick={() => { setEmailDraft(null); setEmailProvisionId(null); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">×</button>
        </header>
        <div className="space-y-5 p-5 sm:p-7">
          <label className={label}>De<input className={input} value="cancelaciones@molsan.es" readOnly /></label>
          <label className={label}>Para · Email de la oficina de origen<input className={input} type="email" required value={emailDraft.destinatario} onChange={(e) => setEmailDraft((d) => ({ ...d, destinatario: e.target.value }))} /></label>
          <label className={label}>Asunto<input className={input} required maxLength={500} value={emailDraft.asunto} onChange={(e) => setEmailDraft((d) => ({ ...d, asunto: e.target.value }))} /></label>
          <label className={label}>Mensaje<textarea className={input + " min-h-56 resize-y"} required value={emailDraft.cuerpo} onChange={(e) => setEmailDraft((d) => ({ ...d, cuerpo: e.target.value }))} /></label>
          {!emailDraft.smtp_configurado && <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><span className="text-xl">⚠️</span><div><p className="font-bold">Envío pendiente de configuración SMTP</p><p className="mt-1">La plantilla y el correo están preparados, pero todavía no se pueden enviar emails. Falta configurar el servicio SMTP en el backend. Cuando esté configurado, este botón permitirá realizar el envío.</p></div></div>}
          <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/70 p-3 text-sm text-slate-700"><span className="text-2xl">📎</span><div><p className="font-semibold">PDF de la provisión</p><p className="text-xs text-slate-500">Se genera desde la provisión seleccionada y se adjunta al correo automáticamente.</p></div></div>
          {emailDraft.historial?.length > 0 && <section className="rounded-xl border border-slate-200 bg-slate-50 p-3"><h3 className="mb-2 text-sm font-bold text-slate-800">Últimos envíos</h3><div className="space-y-2">{emailDraft.historial.map((envio, i) => <div key={envio.creado_en || i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"><div><p className="font-semibold text-slate-700">{envio.destinatario}</p><p className="text-slate-500">{envio.creado_en ? new Date(envio.creado_en).toLocaleString("es-ES") : "Fecha no disponible"}</p></div><span className={envio.estado === "enviado" ? "rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-800" : "rounded-full bg-red-100 px-2 py-1 font-bold text-red-800"}>{envio.estado === "enviado" ? "Enviado" : "Error"}</span></div>)}</div></section>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => { setEmailDraft(null); setEmailProvisionId(null); }} className={boton + " border border-slate-300 text-slate-700 hover:bg-slate-50"}>Cancelar</button>
            <button type="submit" disabled={enviandoEmail || !emailDraft.smtp_configurado || !emailDraft.destinatario.trim() || !emailDraft.asunto.trim() || !emailDraft.cuerpo.trim()} className={boton + " bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"}>{enviandoEmail ? "Enviando…" : emailDraft.smtp_configurado ? "Enviar correo" : "SMTP pendiente"}</button>
          </div>
        </div>
      </form>
    </div>}
  </main>;
}
