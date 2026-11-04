import { useEffect, useRef, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { renderAsync } from "docx-preview";
import axios from "../../api/axios";
import { Link } from "react-router-dom";
import HonorariosGestoria from "./HonorariosGestoria";
import ProvisionesFondosPage, { DocumentoLayoutDesigner } from "../provisiones/ProvisionesFondosPage";

const documentos = [
  { id: "liquidacion", titulo: "Hoja de liquidación", subtitulo: "Cierre del expediente", estado: "Editor visual ampliado", color: "emerald", descripcion: "PDF oficial conservado tal como está confeccionado. Se añade un editor visual independiente para ajustar la distribución sin alterar el documento emitido. La hoja oficial se genera desde Liquidar expediente con los datos disponibles del expediente y Gestión económica; se previsualiza y solo se guarda cuando se acepta.", campos: ["Titular y NIF", "Número de expediente", "Contrato y oficina CaixaBank", "Datos de la gestoría", "Documentos realizados e importes", "Provisión de fondos", "Movimientos de Gestión económica", "Documentación entregada", "Lugar, fecha y conformidad"] },
  { id: "provision", titulo: "Hoja de provisión de fondos", subtitulo: "Provisiones de fondos", estado: "Editor visual ampliado", color: "blue", descripcion: "PDF oficial conservado tal como está confeccionado. Se añade un editor visual independiente para ajustar la distribución sin alterar cálculos ni documento emitido. Se mantienen en Provisiones de fondos los catálogos, tarifas, tramos, reglas fiscales e importes calculados.", campos: ["Datos del cliente", "Oficina de origen", "Garantías y conceptos", "Importes calculados", "Observaciones"] },
  { id: "factura", titulo: "Factura de honorarios de gestoría", subtitulo: "Facturación de honorarios", estado: "Preparación del diseño", color: "amber", descripcion: "Editor visual preparado para diseñar la factura tomando como referencia el Word oficial. La conexión al PDF de emisión se hará después de validar el diseño.", campos: ["Número de factura", "Expediente", "Datos fiscales del cliente", "Base imponible e impuestos", "Totales"] },
];

const money = "— €";
function Section({ title, children, className = "" }) {
  return <section className={`overflow-hidden ${className}`}><div className="px-3 py-2"><h4>{title}</h4></div><div className="p-3">{children}</div></section>;
}
function Field({ label, value = "Se completará desde el expediente" }) {
  return <div className="grid grid-cols-[minmax(82px,.8fr)_minmax(0,1.2fr)] gap-2 py-1"><span>{label}</span><span>{value}</span></div>;
}
function Table({ headers, rows }) {
  return <div className="overflow-hidden"><table className="w-full"><thead><tr>{headers.map(h => <th key={h} className="px-2 py-1.5">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-2 py-1.5">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function LiquidacionPreview({ datosMolsan, logoCliente, expediente, gastos = [], fechaEmision }) {
  const get = (...keys) => { for (const key of keys) { const v = expediente?.[key]; if (v !== undefined && v !== null && String(v).trim() !== "") return v; } return ""; };
  const titular = [get("facturacion_nombre", "nombre_facturacion"), get("facturacion_apellidos", "apellidos_facturacion")].filter(Boolean).join(" ") || get("nombre", "titular");
  const nifTitular = get("facturacion_dni_nif", "dni_facturacion", "nif_facturacion");
  const importeProvision = Number(get("importe", "importe_provision") || 0);
  const totalPagado = gastos.filter(g => ["pagado", "pagada", "abonado", "abonada", "realizado", "efectuado", "efectuada", "paid"].includes(String(g.estado_pago || "").toLowerCase())).reduce((sum, g) => sum + Number(g.importe_resultante ?? g.importe ?? g.importe_total_bruto ?? 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.importe_resultante ?? g.importe ?? g.importe_total_bruto ?? 0), 0);
  const euros = n => Number(n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  return <div className="mx-auto w-full max-w-[760px] p-3 sm:p-5">
    <article className="relative overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32" />
      <header className="relative flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-3">{logoCliente ? <img src={logoCliente} alt="Logotipo del cliente" className="max-h-14 max-w-36 object-contain" /> : <div className="flex h-12 w-36 items-center justify-center px-2">Logotipo del cliente</div>}<div className="pl-3"><div>{datosMolsan.razon_social || "Nombre de la gestoría"}</div><div>{datosMolsan.nif ? `CIF: ${datosMolsan.nif}` : "CIF: configurar en Datos Molsan"}</div></div></div>
        <div><div className="uppercase">MOLSAN</div><div className="mt-1">Fecha de emisión: {fechaEmision || "—"}</div></div>
      </header>
      <h3 className="relative mt-4">Hoja de liquidación de expediente</h3><p className="mt-1">Cancelación</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Section title="Datos de la provisión"><Field label="Titular / Nombre" value={titular || "No consta en facturación"} /><Field label="DNI / NIF" value={nifTitular || "No consta en facturación"} /><Field label="N.º expediente" value={get("id_expediente", "numero_expediente") || "—"} /><Field label="Contrato" value={get("contrato", "numero_contrato") || "No disponible en el expediente"} /><Field label="Oficina CaixaBank" value={get("oficina", "oficina_caixabank", "oficinaAlta") || "No disponible en el expediente"} /></Section>
        <Section title="Datos de la gestoría"><Field label="Razón social" value={datosMolsan.razon_social || "Configurar en Datos Molsan"} /><Field label="CIF" value={datosMolsan.nif || "Configurar en Datos Molsan"} /><Field label="Domicilio fiscal" value={datosMolsan.domicilio_fiscal || "Configurar en Datos Molsan"} /><Field label="Código postal" value={datosMolsan.codigo_postal || "—"} /><Field label="Población / provincia" value={[datosMolsan.poblacion, datosMolsan.provincia].filter(Boolean).join(", ") || "—"} /><Field label="Teléfono / email" value={[datosMolsan.telefono, datosMolsan.email].filter(Boolean).join(" · ") || "—"} /><Field label="Web" value={datosMolsan.web || "—"} /></Section>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.6fr_0.8fr]">
        <Section title="Documentos realizados y cuantías"><Table headers={["Tipo de documento", "Importe"]} rows={[["[Documento realizado]", money],["[Documento realizado]", money],["[Documento realizado]", money],["Total documentos", money]]}/></Section>
        <Section title="Importe de la provisión de fondos"><div className="p-3"><div>Importe recibido</div><div className="mt-2">{Number.isFinite(importeProvision) && importeProvision ? euros(importeProvision) : "—"}</div><div className="mt-3 pt-2">Según provisión registrada</div></div></Section>
      </div>
      <div className="mt-3"><Section title="Gastos realizados del expediente"><Table headers={["Fecha", "Concepto", "Importe", "Estado"]} rows={gastos.length ? [...gastos.map(g => [String(g.fecha_pago || g.fecha || g.fecha_factura || "").slice(0,10) || "—", g.tipo || g.descripcion || "Gasto", euros(g.importe_resultante ?? g.importe ?? g.importe_total_bruto), g.estado_pago || "Pendiente"]), ["", "Total gastos registrados", euros(totalGastos), ""]] : [["—", "No hay gastos asociados", "—", "—"]]}/><p className="mt-2">El detalle se alimentará de Gestión económica; adjuntar una factura no equivale a registrar su pago.</p></Section></div>
      <div className="mt-3"><Section title="Documentación entregada en este documento"><p className="mb-2">Relación según el orden establecido en la ventana «Liquidar expediente»:</p><ol className="grid list-decimal grid-cols-1 gap-x-6 gap-y-1 pl-4 sm:grid-cols-2">{["Hoja de encargo firmada","Documentos ABSIS","Nota simple registral","Facturas y justificantes de pago","Impuestos (AJD/ITP)","Honorarios de gestoría","Justificante de cancelación","Escritura de cancelación","Expediente digital completo"].map(x=><li key={x}>{x}</li>)}</ol></Section></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Section title="Resultado de la liquidación"><Field label="Total fondos recibidos" value={Number.isFinite(importeProvision) && importeProvision ? euros(importeProvision) : "—"}/><Field label="Total gastos realizados" value={euros(totalGastos)}/><div className="mt-2 px-2 py-2"><div>Saldo a devolver / importe pendiente</div><div className="mt-1">{Number.isFinite(importeProvision) && importeProvision ? euros(importeProvision - totalPagado) : "—"}</div></div></Section>
        <Section title="Cierre y conformidad"><p>En Barcelona, a {fechaEmision || "—"}.</p><p className="mt-3">Recibido y conforme por parte del titular</p><div className="mt-8"/><p className="mt-2">{titular || "Titular no identificado"}</p><p>DNI: {nifTitular || "No consta"}</p></Section>
      </div>
      <footer className="mt-4 flex flex-wrap justify-between gap-2 pt-2"><span>MOLSAN · Documento de liquidación del expediente</span><span>Documento corporativo MOLSAN</span></footer>
      <p className="mt-3 p-2">{expediente ? "Vista previa conectada a datos del expediente. Los campos no disponibles se indican expresamente; revisar antes de emitir." : "Selecciona un expediente para cargar los datos fiables disponibles. No se inventan importes ni datos ausentes."}</p>
    </article>
  </div>;
}


const FACTURA_CAMPOS = [
  { id: "logo", label: "Logotipo Molsan", x: 6, y: 3, w: 30, h: 8 },
  { id: "empresa", label: "Datos fiscales de Molsan", x: 42, y: 3, w: 52, h: 12 },
  { id: "numero", label: "Número de factura", x: 6, y: 19, w: 42, h: 7 },
  { id: "fecha", label: "Fecha de emisión", x: 52, y: 19, w: 42, h: 7 },
  { id: "cliente", label: "Datos completos del cliente", x: 6, y: 29, w: 88, h: 15 },
  { id: "expediente", label: "Expediente · Documento · Notario · Protocolo · Firma", x: 6, y: 47, w: 88, h: 12 },
  { id: "concepto", label: "Concepto: Honorarios de gestoría · Base", x: 6, y: 62, w: 88, h: 10 },
  { id: "totales", label: "Base imponible · IVA · Total", x: 48, y: 75, w: 46, h: 12 },
  { id: "qr", label: "QR Veri*Factu · AEAT", x: 6, y: 86, w: 32, h: 10 },
];
function FacturaDocumentoPreview({ posiciones, datosMolsan = {} }) {
  const logo = datosMolsan.logo_data_url || "";
  const valores = {
    logo: logo ? <img src={logo} alt="Logotipo Molsan" className="max-h-full max-w-full object-contain" /> : <div className="flex h-full items-center justify-center">LOGOTIPO MOLSAN</div>,
    empresa: <div><div>{datosMolsan.razon_social || "MOLSAN GESTIÓN Y TRAMITACIÓN"}</div><div className="mt-1">{[datosMolsan.nif, datosMolsan.domicilio_fiscal, [datosMolsan.codigo_postal, datosMolsan.poblacion, datosMolsan.provincia].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</div></div>,
    numero: <div><div>FACTURA N.º</div><div className="mt-1">HG-2026-0001</div></div>,
    fecha: <div><div>FECHA DE EMISIÓN</div><div className="mt-1">{new Date().toLocaleDateString("es-ES")}</div></div>,
    cliente: <div className="h-full"><div className="mb-1 uppercase">Datos del cliente</div><div>Nombre / Razón social: <b>Nombre del cliente</b></div><div>NIF: B00000000</div><div>Domicilio fiscal: Dirección · Código postal · Población</div><div>Provincia</div></div>,
    expediente: <div className="h-full"><div className="mb-1 uppercase">Datos del expediente</div><div className="grid grid-cols-2 gap-x-2 gap-y-1"><span>N.º expediente: <b>EXP-000000</b></span><span>Documento: Escritura</span><span>Notario: Nombre del notario</span><span>Protocolo: 0000/2026</span><span>Fecha de firma: DD/MM/AAAA</span></div></div>,
    concepto: <div className="h-full"><table className="w-full"><thead><tr><th className="py-1">Concepto</th><th className="py-1">Base imponible</th></tr></thead><tbody><tr><td className="py-2">Honorarios de gestoría</td><td className="py-2">XXX,XX €</td></tr></tbody></table></div>,
    totales: <div className="ml-auto max-w-full space-y-1"><div>Base imponible: <b>XXX,XX €</b></div><div>IVA: <b>XX,XX €</b></div><div className="pt-1">TOTAL HONORARIOS: XXX,XX €</div></div>,
    qr: <div className="flex h-full items-center gap-2"><div className="flex aspect-square h-full max-h-14 items-center justify-center p-1">QR REAL<br/>PENDIENTE</div><div>Factura verificable en la Sede Electrónica de la AEAT<br/>Código QR Veri*Factu pendiente de integración oficial</div></div>,
  };
  return <section className="p-5">
    <div className="mb-3"><p className="uppercase">Previsualización de la factura</p><h3>Así quedará el documento · vista A4 en directo</h3><p className="mt-1">Esta maqueta se actualiza al instante cuando mueves los bloques de arriba. Los datos e importes son ejemplos, no una factura emitida.</p></div>
    <div className="overflow-auto p-3 sm:p-5">
      <article className="relative mx-auto aspect-[210/297] w-full max-w-[620px] overflow-hidden">
        <div className="absolute inset-x-[6%] top-[1.2%] pb-1">FACTURA DE HONORARIOS DE GESTORÍA</div>
        {FACTURA_CAMPOS.map(c => { const p = posiciones[c.id] || c; return <div key={c.id} style={{ left:p.x+"%", top:p.y+"%", width:p.w+"%", height:p.h+"%", paddingLeft:(p.padL??1.2)+"%", paddingRight:(p.padR??1.2)+"%", paddingTop:(p.padT??1.2)+"%", paddingBottom:(p.padB??1.2)+"%", display:"flex", alignItems:p.valign==="center"?"center":p.valign==="bottom"?"flex-end":"flex-start" }} className="absolute overflow-hidden">{valores[c.id]}</div>; })}
        <div className="absolute bottom-[2%] left-[6%] right-[6%] pt-1">MOLSAN · Documento de ejemplo · No válido como factura</div>
      </article>
    </div>
  </section>;
}

function FacturaLayoutDesigner({ datosMolsan = {} }) {
  const [posiciones, setPosiciones] = useState(() => Object.fromEntries(FACTURA_CAMPOS.map(c => [c.id, { x: c.x, y: c.y, w: c.w, h: c.h, align: "left", valign: "top", fontSize: 9, padL: 1.2, padR: 1.2, padT: 1.2, padB: 1.2 }])));
  const [campoActivo, setCampoActivo] = useState("empresa");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let activo = true;
    axios.get("/utilidades/factura-plantilla").then(({ data }) => {
      const guardadas = data?.configuracion?.posiciones;
      if (activo && guardadas && typeof guardadas === "object") setPosiciones(prev => {
        const siguientes = { ...prev };
        for (const campo of FACTURA_CAMPOS) {
          const guardada = guardadas[campo.id];
          if (!guardada || typeof guardada !== "object") continue;
          const w = Math.max(4, Math.min(100, Number(guardada.w ?? campo.w) || campo.w));
          const h = Math.max(3, Math.min(100, Number(guardada.h ?? campo.h) || campo.h));
          siguientes[campo.id] = {
            x: Math.max(0, Math.min(100 - w, Number(guardada.x ?? campo.x) || 0)),
            y: Math.max(0, Math.min(100 - h, Number(guardada.y ?? campo.y) || 0)),
            w, h,
          };
        }
        return siguientes;
      });
    }).catch(() => {});
    return () => { activo = false; };
  }, []);
  const soltarCampo = e => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const rect = e.currentTarget.getBoundingClientRect();
    if (!id || !rect.width || !rect.height) return;
    const actual = posiciones[id] || FACTURA_CAMPOS.find(c => c.id === id);
    if (!actual) return;
    const w = Math.max(4, Math.min(100, Number(actual.w) || 20));
    const h = Math.max(3, Math.min(100, Number(actual.h) || 8));
    // Coloca el centro del bloque bajo el cursor y limita sus cuatro bordes a la hoja A4.
    const cursorX = ((e.clientX - rect.left) / rect.width) * 100;
    const cursorY = ((e.clientY - rect.top) / rect.height) * 100;
    const x = Math.max(0, Math.min(100 - w, cursorX - w / 2));
    const y = Math.max(0, Math.min(100 - h, cursorY - h / 2));
    setCampoActivo(id);
    setPosiciones(prev => ({ ...prev, [id]: { ...(prev[id] || actual), x, y, w, h } }));
    setMensaje("");
  };
  const guardar = async () => {
    setGuardando(true); setError(""); setMensaje("");
    try {
      const { data } = await axios.put("/utilidades/factura-plantilla", {
        color: "#064675", titulo: "FACTURA", subtitulo: "Honorarios de gestoría",
        mostrarAvisoAEAT: true, mostrarObservaciones: false, mostrarLogo: true,
        densidad: "normal", posiciones,
      });
      if (!data?.ok) throw new Error(data?.mensaje || "No se pudo guardar la distribución.");
      setMensaje("Distribución guardada en el ERP.");
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se pudo guardar la distribución.");
    } finally { setGuardando(false); }
  };
  return <section className="p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="uppercase">Diseñador de distribución</p><h3>Arrastra los bloques a la posición deseada</h3><p className="mt-1">Recoloca los bloques dentro de la hoja y guarda la configuración.</p></div>
      <button type="button" onClick={guardar} disabled={guardando} className="px-4 py-2">{guardando ? "Guardando…" : "Guardar distribución"}</button>
    </div>
    <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
      <div className="overflow-auto p-3">
        <div onDragOver={e => e.preventDefault()} onDrop={soltarCampo} className="relative mx-auto aspect-[210/297] w-full max-w-[520px] overflow-hidden">
          {FACTURA_CAMPOS.map(c => { const p = posiciones[c.id] || c; const activo = campoActivo === c.id; return <div key={c.id} draggable onClick={() => setCampoActivo(c.id)} onDragStart={e => { setCampoActivo(c.id); e.dataTransfer.setData("text/plain", c.id); }} style={{ left: p.x + "%", top: p.y + "%", width: p.w + "%", height: p.h + "%", paddingLeft:(p.padL??1.2)+"%", paddingRight:(p.padR??1.2)+"%", paddingTop:(p.padT??1.2)+"%", paddingBottom:(p.padB??1.2)+"%" }} className={`absolute flex items-center ${activo ? "z-10" : ""}`}>{c.label}</div>; })}
          <div className="pointer-events-none absolute bottom-2 left-2">MOLSAN · FACTURA DE HONORARIOS</div>
        </div>
      </div>
      <aside className="grid min-w-0 content-start gap-3">
        <div className="p-3"><p>1. Selecciona un campo</p><div className="mt-2 grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2 xl:grid-cols-1">{FACTURA_CAMPOS.map(c => <button key={c.id} type="button" onClick={() => setCampoActivo(c.id)} draggable onDragStart={e => { setCampoActivo(c.id); e.dataTransfer.setData("text/plain", c.id); }} className={`w-full px-3 py-2 ${campoActivo===c.id?"":""}`}>{c.label}</button>)}</div></div>
        {(() => { const p = posiciones[campoActivo] || FACTURA_CAMPOS.find(c=>c.id===campoActivo) || {}; const cambiar = (k,v) => { const n=Number(v); setPosiciones(prev=>({...prev,[campoActivo]:{...(prev[campoActivo]||p),[k]:Number.isFinite(n)?n:0}})); setMensaje(""); }; const mover=(dx,dy)=>setPosiciones(prev=>({...prev,[campoActivo]:{...(prev[campoActivo]||p),x:Math.max(0,Math.min(100-(p.w||10),(p.x||0)+dx)),y:Math.max(0,Math.min(100-(p.h||5),(p.y||0)+dy))}})); return <div className="space-y-3 p-3">
          <div><p>2. Posición y tamaño</p><p>{FACTURA_CAMPOS.find(c=>c.id===campoActivo)?.label}</p></div>
          <div className="grid grid-cols-2 gap-2">{[["x","X · izquierda"],["y","Y · arriba"],["w","Ancho"],["h","Alto"]].map(([k,l])=><label key={k}>{l} (%)<input type="number" min="0" max="100" step="0.5" value={Number(p[k]??0)} onChange={e=>cambiar(k,e.target.value)} className="mt-1 w-full px-2 py-1.5"/></label>)}</div>
          <div className="flex items-center justify-between gap-2"><span>Ajuste fino</span><div className="grid grid-cols-3 gap-1"><span/><button type="button" onClick={()=>mover(0,-0.5)} className="px-2 py-1">↑</button><span/><button type="button" onClick={()=>mover(-0.5,0)} className="px-2 py-1">←</button><button type="button" onClick={()=>mover(0,0.5)} className="px-2 py-1">↓</button><button type="button" onClick={()=>mover(0.5,0)} className="px-2 py-1">→</button></div></div>
          <div className="pt-2"><p>3. Texto y márgenes internos</p>
            <label className="mt-2 block">Alineación horizontal<select value={p.align||"left"} onChange={e=>setPosiciones(prev=>({...prev,[campoActivo]:{...(prev[campoActivo]||p),align:e.target.value}}))} className="mt-1 w-full px-2 py-1.5"><option value="left">Izquierda</option><option value="center">Centrada</option><option value="right">Derecha</option><option value="justify">Justificada</option></select></label>
            <label className="mt-2 block">Alineación vertical<select value={p.valign||"top"} onChange={e=>setPosiciones(prev=>({...prev,[campoActivo]:{...(prev[campoActivo]||p),valign:e.target.value}}))} className="mt-1 w-full px-2 py-1.5"><option value="top">Arriba</option><option value="center">Centro</option><option value="bottom">Abajo</option></select></label>
            <label className="mt-2 block">Tamaño de letra (px)<input type="number" min="5" max="24" step="0.5" value={p.fontSize||9} onChange={e=>cambiar("fontSize",e.target.value)} className="mt-1 w-full px-2 py-1.5"/></label>
            <div className="mt-2 grid grid-cols-2 gap-2">{[["padL","Margen izq."],["padR","Margen der."],["padT","Margen sup."],["padB","Margen inf."]].map(([k,l])=><label key={k}>{l} (%)<input type="number" min="0" max="8" step="0.2" value={p[k]??1.2} onChange={e=>cambiar(k,e.target.value)} className="mt-1 w-full px-2 py-1.5"/></label>)}</div>
            <div className="mt-2 flex gap-3"><label className="flex items-center gap-1"><input type="checkbox" checked={!!p.bold} onChange={e=>setPosiciones(prev=>({...prev,[campoActivo]:{...(prev[campoActivo]||p),bold:e.target.checked}}))}/>Negrita</label><label className="flex items-center gap-1"><input type="checkbox" checked={!!p.italic} onChange={e=>setPosiciones(prev=>({...prev,[campoActivo]:{...(prev[campoActivo]||p),italic:e.target.checked}}))}/>Cursiva</label></div>
          </div>
        </div>; })()}
        <p>Puedes arrastrar los campos o ajustar sus valores exactos. La alineación, tamaño de letra y márgenes internos se guardan junto con la distribución. El QR se reserva para el código fiscal real; no se genera un QR ficticio.</p>
        {error && <p role="alert">{error}</p>}
        {mensaje && <p role="status">{mensaje}</p>}
      </aside>
    </div>
    <div className="mt-5"><FacturaDocumentoPreview posiciones={posiciones} datosMolsan={datosMolsan} /></div>
  </section>;
}



function FacturaPlantillaEditor({ datosMolsan = {} }) {
  const [plantillaWord, setPlantillaWord] = useState(null);
  const [archivoWord, setArchivoWord] = useState(null);
  const [subiendoWord, setSubiendoWord] = useState(false);
  const [cargandoVista, setCargandoVista] = useState(false);
  const [errorWord, setErrorWord] = useState("");
  const [mensajeWord, setMensajeWord] = useState("");
  const vistaWordRef = useRef(null);

  useEffect(() => {
    let activo = true;
    axios.get("/utilidades/conceptos-gastos/6/plantilla-factura/estado")
      .then(({ data }) => { if (activo) setPlantillaWord(data); })
      .catch((error) => {
        if (activo) setErrorWord(error?.response?.data?.detail || "No se pudo consultar el estado del Word oficial.");
      });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    const contenedor = vistaWordRef.current;
    if (!plantillaWord?.plantilla_cargada || !contenedor) {
      if (contenedor) contenedor.innerHTML = "";
      return () => { activo = false; };
    }

    const mostrarDocumento = async () => {
      setCargandoVista(true);
      setErrorWord("");
      contenedor.innerHTML = "";
      try {
        const { data } = await axios.get("/utilidades/conceptos-gastos/6/plantilla-factura", { responseType: "blob" });
        if (!activo) return;
        await renderAsync(data, contenedor, contenedor, {
          className: "molsan-docx",
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          experimental: true,
        });
      } catch (error) {
        if (activo) setErrorWord(error?.response?.data?.detail || "No se ha podido representar el Word. Puedes descargarlo para comprobarlo.");
      } finally {
        if (activo) setCargandoVista(false);
      }
    };

    mostrarDocumento();
    return () => { activo = false; };
  }, [plantillaWord?.plantilla_cargada, plantillaWord?.actualizado_en]);

  const subirWordOficial = async () => {
    if (!archivoWord || subiendoWord) return;
    if (!/\.docx$/i.test(archivoWord.name)) {
      setErrorWord("Selecciona el modelo oficial en formato Word .docx.");
      return;
    }
    if (archivoWord.size > 10 * 1024 * 1024) {
      setErrorWord("El Word supera el límite permitido de 10 MB.");
      return;
    }
    const form = new FormData();
    form.append("fichero", archivoWord);
    setSubiendoWord(true);
    setErrorWord("");
    setMensajeWord("");
    try {
      const { data } = await axios.post("/utilidades/conceptos-gastos/6/plantilla-factura", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPlantillaWord({
        plantilla_cargada: true,
        factura_nombre: data.factura_nombre,
        factura_tipo: data.factura_tipo,
        concepto_gasto_id: data.concepto_gasto_id,
        concepto_gasto: data.concepto_gasto,
        actualizado_en: new Date().toISOString(),
      });
      setArchivoWord(null);
      setMensajeWord("Word oficial actualizado. La vista previa ya muestra el documento subido.");
    } catch (error) {
      setErrorWord(error?.response?.data?.detail || "No se pudo guardar el Word oficial.");
    } finally {
      setSubiendoWord(false);
    }
  };

  const descargarWordOficial = async () => {
    setErrorWord("");
    try {
      const { data } = await axios.get("/utilidades/conceptos-gastos/6/plantilla-factura", { responseType: "blob" });
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = plantillaWord?.factura_nombre || "MOD FACTURA.docx";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorWord(error?.response?.data?.detail || "No se pudo descargar el Word oficial.");
    }
  };

  return <section className="modelos-documentos-premium space-y-5">
    <FacturaLayoutDesigner datosMolsan={datosMolsan} />
    <div className="p-5">
      <p className="uppercase">Plantilla Word original</p>
      <h2 className="mt-1">Factura de honorarios de gestoría</h2>
      <p className="mt-2">La previsualización se carga desde el archivo .docx guardado en el ERP. Para modificar su contenido o composición, descarga el Word, edítalo en Word y vuelve a subir la versión revisada. El archivo original solo se sustituye cuando guardas expresamente una nueva versión.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="uppercase">Documento maestro</p>
          <p className="mt-1 break-all">{plantillaWord?.plantilla_cargada ? plantillaWord.factura_nombre || "Plantilla Word oficial" : "Todavía no hay una plantilla Word cargada"}</p>
          {plantillaWord?.actualizado_en && <p className="mt-1">Última actualización: {new Date(plantillaWord.actualizado_en).toLocaleString("es-ES")}</p>}
        </div>
        {plantillaWord?.plantilla_cargada && <button type="button" onClick={descargarWordOficial} className="px-3 py-2">Descargar Word para editar</button>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => { setArchivoWord(e.target.files?.[0] || null); setErrorWord(""); setMensajeWord(""); }} className="min-w-0 flex-1 file:mr-2 file:px-3 file:py-2"/>
        <button type="button" onClick={subirWordOficial} disabled={!archivoWord || subiendoWord} className="px-4 py-2">{subiendoWord ? "Guardando Word…" : "Guardar nueva versión"}</button>
      </div>
      {errorWord && <p role="alert" className="mt-3">{errorWord}</p>}
      {mensajeWord && <p role="status" className="mt-3">{mensajeWord}</p>}
    </div>

    <div className="overflow-hidden p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><p className="uppercase">Vista previa del archivo subido</p><h3>{plantillaWord?.factura_nombre || "Documento Word"} · páginas originales</h3></div>
        <span className="px-3 py-1">{cargandoVista ? "Cargando Word…" : plantillaWord?.plantilla_cargada ? "Word representado" : "Sin documento"}</span>
      </div>
      {!plantillaWord?.plantilla_cargada && <div className="p-10">Sube el archivo MOD FACTURA.docx para visualizar aquí su contenido y distribución.</div>}
      {plantillaWord?.plantilla_cargada && <div ref={vistaWordRef} className="molsan-docx-preview min-h-[700px] overflow-x-auto p-2"/>}
      <p className="mt-3">La vista reproduce el contenido y la estructura del DOCX en el navegador. La paginación y algunos detalles pueden variar ligeramente respecto a Microsoft Word según las fuentes disponibles en el navegador. El Word descargado sigue siendo el documento maestro.</p>
    </div>
  </section>;
}

export default function ModelosDocumentos() {
  const [seleccionado, setSeleccionado] = useState("liquidacion");
  const actual = documentos.find((d) => d.id === seleccionado) || documentos[0];
  const [datosMolsan, setDatosMolsan] = useState({});
  const [logoCliente, setLogoCliente] = useState("");
  const [errorLogo, setErrorLogo] = useState("");
  const [numeroExpediente, setNumeroExpediente] = useState("");
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [gastosExpediente, setGastosExpediente] = useState([]);
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const [errorExpediente, setErrorExpediente] = useState("");
  const [fechaEmision] = useState(() => new Date().toLocaleDateString("es-ES"));

  useEffect(() => {
    let activo = true;
    axios.get("/utilidades/datos-molsan")
      .then(({ data }) => {
        if (activo) setDatosMolsan(data?.datos || data || {});
      })
      .catch(() => {
        if (activo) setDatosMolsan({});
      });
    try {
      const guardado = localStorage.getItem("molsan_logo_cliente_liquidacion");
      if (guardado && activo) setLogoCliente(guardado);
    } catch {}
    return () => { activo = false; };
  }, []);

  const cargarExpediente = async () => {
    const numero = numeroExpediente.trim();
    if (!numero) { setErrorExpediente("Introduce el número de expediente."); return; }
    setCargandoExpediente(true); setErrorExpediente(""); setExpedienteSeleccionado(null); setGastosExpediente([]);
    try {
      const respuesta = await axios.get(`/expedientes/${encodeURIComponent(numero)}`);
      const datos = respuesta.data?.expediente || respuesta.data?.item || respuesta.data || null;
      if (!datos || !(datos.id_expediente || datos.id || datos.numero_expediente)) throw new Error("La respuesta no contiene un expediente identificable.");
      setExpedienteSeleccionado(datos);
      const idConsulta = datos.id ?? datos.id_expediente ?? numero;
      try {
        const rGastos = await axios.get(`/expedientes/${encodeURIComponent(idConsulta)}/gastos`);
        setGastosExpediente(Array.isArray(rGastos.data) ? rGastos.data : (rGastos.data?.items || []));
      } catch (e) {
        setGastosExpediente([]);
        setErrorExpediente("Expediente cargado, pero no se pudieron consultar los gastos. La hoja no mostrará importes de gastos hasta resolverlo.");
      }
    } catch (e) {
      setErrorExpediente(e?.response?.data?.detail || e?.message || "No se ha podido cargar el expediente.");
    } finally { setCargandoExpediente(false); }
  };

  const subirLogoCliente = (archivo) => {
    setErrorLogo("");
    if (!archivo) return;
    const tiposPermitidos = ["image/png", "image/jpeg", "image/webp"];
    if (!tiposPermitidos.includes(archivo.type)) {
      setErrorLogo("Formato no válido. Sube una imagen PNG, JPG o WEBP.");
      return;
    }
    if (archivo.size > 1024 * 1024) {
      setErrorLogo("La imagen supera el máximo permitido de 1 MB.");
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = typeof lector.result === "string" ? lector.result : "";
      if (!resultado) {
        setErrorLogo("No se ha podido leer la imagen seleccionada.");
        return;
      }
      try {
        localStorage.setItem("molsan_logo_cliente_liquidacion", resultado);
        setLogoCliente(resultado);
      } catch {
        setErrorLogo("No se ha podido guardar la imagen en este navegador. Prueba con un archivo más pequeño.");
      }
    };
    lector.onerror = () => setErrorLogo("No se ha podido leer la imagen seleccionada.");
    lector.readAsDataURL(archivo);
  };

  return <main className="erp-page modelos-documentos-premium utilidades-premium-page min-h-full min-w-0 space-y-6">
    <MolsanPageHeader mark="MD" title="Modelos de documentos" description="Plantillas corporativas para documentos del ERP, sin alterar tarifas, cálculos, pagos ni numeración oficial." />
    <div className="flex justify-end"><Link to="/herramientas/utilidades" className="inline-flex px-3 py-2">← Volver a Utilidades</Link></div>
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">{documentos.map(doc=><button key={doc.id} type="button" onClick={()=>setSeleccionado(doc.id)} className={`p-4 ${seleccionado===doc.id?"":""}`}><div className="flex items-start justify-between gap-3"><span>{doc.id==="liquidacion"?"▤":doc.id==="provision"?"€":"▧"}</span><span className="px-2.5 py-1">{doc.estado}</span></div><h2 className="mt-3">{doc.titulo}</h2><p className="mt-1">{doc.subtitulo}</p></button>)}</section>
    {actual.id==="liquidacion" ? <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="uppercase">Diseño aprobado · referencia visual</p><h2 className="mt-1">Hoja de liquidación · Cancelación</h2><p className="mt-1">Maqueta visual basada en tu propuesta, con identidad MOLSAN PREMIUM 2027.</p></div><span className="px-3 py-1">PDF oficial conectado en Liquidar expediente</span></div><div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2"><section className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h3>Logotipo del cliente</h3><p className="mt-1">Se mostrará en la cabecera de la hoja de liquidación. PNG, JPG o WEBP · máximo 1 MB.</p></div>
        <div className="flex flex-wrap items-center gap-3">{logoCliente && <img src={logoCliente} alt="Vista previa del logotipo del cliente" className="max-h-12 max-w-36 object-contain"/>}<label className="px-4 py-2">Subir logotipo<input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={e => subirLogoCliente(e.target.files?.[0])}/></label>{logoCliente && <button type="button" onClick={() => { try { localStorage.removeItem("molsan_logo_cliente_liquidacion"); } catch {} setLogoCliente(""); }} className="px-3 py-2">Quitar</button>}</div>
      </div>
      {errorLogo && <p role="alert" className="mt-3">{errorLogo}</p>}
      <p className="mt-3">Esta imagen se utiliza en esta referencia visual. La emisión oficial se realiza desde Liquidar expediente y no depende de esta previsualización.</p>
    </section><section className="p-4"><div className="flex flex-wrap items-end gap-3"><label className="min-w-[240px] flex-1">Número de expediente<input value={numeroExpediente} onChange={e => setNumeroExpediente(e.target.value)} onKeyDown={e => { if (e.key === "Enter") cargarExpediente(); }} placeholder="Introduce el número exacto del expediente" className="mt-1 w-full px-3 py-2"/></label><button type="button" onClick={cargarExpediente} disabled={cargandoExpediente} className="px-4 py-2">{cargandoExpediente ? "Cargando…" : "Cargar expediente"}</button></div>{errorExpediente && <p role="alert" className="mt-2">{errorExpediente}</p>}{expedienteSeleccionado && <p className="mt-2">Expediente cargado: {expedienteSeleccionado.id_expediente || expedienteSeleccionado.numero_expediente || numeroExpediente} · {gastosExpediente.length} gasto(s) recuperado(s).</p>}</section></div><DocumentoLayoutDesigner tipo="liquidacion"/><LiquidacionPreview datosMolsan={datosMolsan} logoCliente={logoCliente} expediente={expedienteSeleccionado} gastos={gastosExpediente} fechaEmision={fechaEmision}/><div className="p-4"><strong>Integración operativa:</strong> el PDF oficial se genera en «Liquidar expediente», reúne la documentación en el orden de cierre definido y se guarda en «Expediente digital completo» solo después de revisar y aceptar la vista previa. Los gastos figuran según sus registros y estados reales de pago.</div></section> : actual.id==="factura" ? <FacturaPlantillaEditor datosMolsan={datosMolsan} onGuardarLogoFactura={async (logoDataUrl) => { const actualizado = { ...datosMolsan, logo_data_url: logoDataUrl }; const { data } = await axios.put("/utilidades/datos-molsan", actualizado); if (!data?.ok) throw new Error(data?.mensaje || "No se pudo guardar el logotipo."); setDatosMolsan(actualizado); }} /> : actual.id==="provision" ? <ProvisionesFondosPage soloEditorPlantilla/> : <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.85fr)]"><div className="p-5 sm:p-6"><h2>{actual.titulo}</h2><p className="mt-3">{actual.descripcion}</p><h3 className="mt-5">Contenido previsto</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{actual.campos.map(c=><li key={c} className="px-3 py-2">✓ {c}</li>)}</ul></div><div className="space-y-4"><HonorariosGestoria soloPlantilla/></div></section>}
  </main>;
}