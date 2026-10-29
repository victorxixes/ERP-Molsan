import { useEffect, useState } from "react";
import axios from "../../api/axios";
import { Link } from "react-router-dom";
import HonorariosGestoria from "./HonorariosGestoria";
import ProvisionesFondosPage from "../provisiones/ProvisionesFondosPage";

const documentos = [
  { id: "liquidacion", titulo: "Hoja de liquidación", subtitulo: "Cierre del expediente", estado: "Diseño MOLSAN PREMIUM 2027", color: "emerald", descripcion: "Documento de cierre económico y relación de documentación entregada. Esta vista define el diseño; la conexión a datos reales y la generación definitiva del PDF se realizarán sobre los registros del expediente.", campos: ["Titular y NIF", "Número de expediente", "Contrato y oficina CaixaBank", "Datos de la gestoría", "Documentos realizados e importes", "Provisión de fondos", "Movimientos de Gestión económica", "Documentación entregada", "Lugar, fecha y conformidad"] },
  { id: "provision", titulo: "Hoja de provisión de fondos", subtitulo: "Provisiones de fondos", estado: "Plantilla existente", color: "blue", descripcion: "La generación actual de provisiones y sus cálculos siguen en el módulo de Provisiones de fondos.", campos: ["Datos del cliente", "Oficina de origen", "Garantías y conceptos", "Importes calculados", "Observaciones"] },
  { id: "factura", titulo: "Factura de honorarios de gestoría", subtitulo: "Facturación de honorarios", estado: "Diseño pendiente", color: "amber", descripcion: "El diseño definitivo de la factura oficial se ajustará al modelo Word, conservando la numeración y las reglas actuales.", campos: ["Número de factura", "Expediente", "Datos fiscales del cliente", "Base imponible e impuestos", "Totales"] },
];

const money = "— €";
function Section({ title, children, className = "" }) {
  return <section className={`overflow-hidden rounded-xl border border-sky-100 bg-white ${className}`}><div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-3 py-2"><h4 className="text-[11px] font-extrabold text-[#123e70]">{title}</h4></div><div className="p-3">{children}</div></section>;
}
function Field({ label, value = "Se completará desde el expediente" }) {
  return <div className="grid grid-cols-[minmax(82px,.8fr)_minmax(0,1.2fr)] gap-2 border-b border-slate-100 py-1 text-[9px] last:border-0"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-700">{value}</span></div>;
}
function Table({ headers, rows }) {
  return <div className="overflow-hidden rounded-md border border-sky-100"><table className="w-full border-collapse text-left text-[9px]"><thead className="bg-sky-50"><tr>{headers.map(h => <th key={h} className="border-b border-sky-100 px-2 py-1.5 font-bold text-[#123e70]">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="odd:bg-white even:bg-slate-50/70">{row.map((cell, j) => <td key={j} className="border-b border-slate-100 px-2 py-1.5 text-slate-600">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function LiquidacionPreview({ datosMolsan, logoCliente, expediente, gastos = [], fechaEmision }) {
  const get = (...keys) => { for (const key of keys) { const v = expediente?.[key]; if (v !== undefined && v !== null && String(v).trim() !== "") return v; } return ""; };
  const titular = [get("facturacion_nombre", "nombre_facturacion"), get("facturacion_apellidos", "apellidos_facturacion")].filter(Boolean).join(" ") || get("nombre", "titular");
  const nifTitular = get("facturacion_dni_nif", "dni_facturacion", "nif_facturacion");
  const importeProvision = Number(get("importe", "importe_provision") || 0);
  const totalPagado = gastos.filter(g => ["pagado", "pagada", "abonado", "abonada", "realizado", "efectuado", "efectuada", "paid"].includes(String(g.estado_pago || "").toLowerCase())).reduce((sum, g) => sum + Number(g.importe_resultante ?? g.importe ?? g.importe_total_bruto ?? 0), 0);
  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.importe_resultante ?? g.importe ?? g.importe_total_bruto ?? 0), 0);
  const euros = n => Number(n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  return <div className="mx-auto w-full max-w-[760px] bg-slate-100 p-3 sm:p-5">
    <article className="relative overflow-hidden bg-white p-4 text-slate-800 shadow-[0_12px_35px_rgba(15,23,42,.12)] sm:p-6">
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-sky-50/80" />
      <header className="relative flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#1e5794] pb-3">
        <div className="flex min-w-0 items-center gap-3">{logoCliente ? <img src={logoCliente} alt="Logotipo del cliente" className="max-h-14 max-w-36 object-contain" /> : <div className="flex h-12 w-36 items-center justify-center rounded-lg border border-dashed border-slate-300 px-2 text-center text-[8px] text-slate-400">Logotipo del cliente</div>}<div className="border-l border-sky-200 pl-3"><div className="text-lg font-black tracking-wide text-[#123e70]">{datosMolsan.razon_social || "Nombre de la gestoría"}</div><div className="text-[8px] font-semibold text-slate-500">{datosMolsan.nif ? `CIF: ${datosMolsan.nif}` : "CIF: configurar en Datos Molsan"}</div></div></div>
        <div className="text-right"><div className="text-[8px] font-bold uppercase tracking-[.18em] text-[#1e5794]">MOLSAN PREMIUM 2027</div><div className="mt-1 text-[8px] text-slate-500">Fecha de emisión: {fechaEmision || "—"}</div></div>
      </header>
      <h3 className="relative mt-4 text-xl font-extrabold leading-tight text-[#123e70] sm:text-2xl">Hoja de liquidación de expediente</h3><p className="mt-1 text-sm font-semibold text-[#2872b8]">Cancelación</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Section title="Datos de la provisión"><Field label="Titular / Nombre" value={titular || "No consta en facturación"} /><Field label="DNI / NIF" value={nifTitular || "No consta en facturación"} /><Field label="N.º expediente" value={get("id_expediente", "numero_expediente") || "—"} /><Field label="Contrato" value={get("contrato", "numero_contrato") || "No disponible en el expediente"} /><Field label="Oficina CaixaBank" value={get("oficina", "oficina_caixabank", "oficinaAlta") || "No disponible en el expediente"} /></Section>
        <Section title="Datos de la gestoría"><Field label="Razón social" value={datosMolsan.razon_social || "Configurar en Datos Molsan"} /><Field label="CIF" value={datosMolsan.nif || "Configurar en Datos Molsan"} /><Field label="Domicilio fiscal" value={datosMolsan.domicilio_fiscal || "Configurar en Datos Molsan"} /><Field label="Código postal" value={datosMolsan.codigo_postal || "—"} /><Field label="Población / provincia" value={[datosMolsan.poblacion, datosMolsan.provincia].filter(Boolean).join(", ") || "—"} /><Field label="Teléfono / email" value={[datosMolsan.telefono, datosMolsan.email].filter(Boolean).join(" · ") || "—"} /><Field label="Web" value={datosMolsan.web || "—"} /></Section>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.6fr_0.8fr]">
        <Section title="Documentos realizados y cuantías"><Table headers={["Tipo de documento", "Importe"]} rows={[["[Documento realizado]", money],["[Documento realizado]", money],["[Documento realizado]", money],["Total documentos", money]]}/></Section>
        <Section title="Importe de la provisión de fondos"><div className="rounded-lg bg-sky-50 p-3"><div className="text-[9px] font-semibold text-[#1e5794]">Importe recibido</div><div className="mt-2 text-xl font-black text-[#123e70]">{Number.isFinite(importeProvision) && importeProvision ? euros(importeProvision) : "—"}</div><div className="mt-3 border-t border-sky-200 pt-2 text-[8px] text-slate-500">Según provisión registrada</div></div></Section>
      </div>
      <div className="mt-3"><Section title="Gastos realizados del expediente"><Table headers={["Fecha", "Concepto", "Importe", "Estado"]} rows={gastos.length ? [...gastos.map(g => [String(g.fecha_pago || g.fecha || g.fecha_factura || "").slice(0,10) || "—", g.tipo || g.descripcion || "Gasto", euros(g.importe_resultante ?? g.importe ?? g.importe_total_bruto), g.estado_pago || "Pendiente"]), ["", "Total gastos registrados", euros(totalGastos), ""]] : [["—", "No hay gastos asociados", "—", "—"]]}/><p className="mt-2 text-[8px] italic text-slate-500">El detalle se alimentará de Gestión económica; adjuntar una factura no equivale a registrar su pago.</p></Section></div>
      <div className="mt-3"><Section title="Documentación entregada en este documento"><p className="mb-2 text-[8px] text-slate-500">Relación según el orden establecido en la ventana «Liquidar expediente»:</p><ol className="grid list-decimal grid-cols-1 gap-x-6 gap-y-1 pl-4 text-[9px] sm:grid-cols-2">{["Hoja de encargo firmada","Documentos ABSIS","Nota simple registral","Facturas y justificantes de pago","Impuestos (AJD/ITP)","Honorarios de gestoría","Justificante de cancelación","Escritura de cancelación","Expediente digital completo"].map(x=><li key={x}>{x}</li>)}</ol></Section></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Section title="Resultado de la liquidación"><Field label="Total fondos recibidos" value={Number.isFinite(importeProvision) && importeProvision ? euros(importeProvision) : "—"}/><Field label="Total gastos realizados" value={euros(totalGastos)}/><div className="mt-2 rounded-md bg-sky-50 px-2 py-2"><div className="text-[8px] font-bold text-[#1e5794]">Saldo a devolver / importe pendiente</div><div className="mt-1 text-lg font-black text-[#123e70]">{Number.isFinite(importeProvision) && importeProvision ? euros(importeProvision - totalPagado) : "—"}</div></div></Section>
        <Section title="Cierre y conformidad"><p className="text-[9px]">En {get("facturacion_poblacion", "poblacion") || "—"}, a {fechaEmision || "—"}.</p><p className="mt-3 text-[9px] font-semibold">Recibido y conforme por parte del titular</p><div className="mt-8 border-b border-slate-300"/><p className="mt-2 text-[9px] font-semibold">{titular || "Titular no identificado"}</p><p className="text-[9px] text-slate-500">DNI: {nifTitular || "No consta"}</p></Section>
      </div>
      <footer className="mt-4 flex flex-wrap justify-between gap-2 border-t border-sky-100 pt-2 text-[8px] text-slate-500"><span>MOLSAN · Documento de liquidación del expediente</span><span>Diseño corporativo MOLSAN PREMIUM 2027</span></footer>
      <p className="mt-3 rounded-md border border-amber-100 bg-amber-50 p-2 text-[8px] leading-4 text-amber-900">{expediente ? "Vista previa conectada a datos del expediente. Los campos no disponibles se indican expresamente; revisar antes de emitir." : "Selecciona un expediente para cargar los datos fiables disponibles. No se inventan importes ni datos ausentes."}</p>
    </article>
  </div>;
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
      const idConsulta = datos.id_expediente || numero;
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

  return <main className="min-h-full space-y-6 p-4 animate-fadeIn sm:p-6 lg:p-8">
    <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-700 via-sky-500 to-cyan-300"/><div className="relative flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-2xl">▤</div><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-800">MOLSAN ERP · UTILIDADES · PREMIUM 2027</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Modelos de documentos</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Diseño corporativo unificado. Las plantillas no alteran tarifas, cálculos, pagos ni numeración oficial.</p></div><Link to="/herramientas/utilidades" className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex">← Utilidades</Link></div></header>
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">{documentos.map(doc=><button key={doc.id} type="button" onClick={()=>setSeleccionado(doc.id)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${seleccionado===doc.id?"border-sky-300 bg-sky-50/70 shadow-md":"border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-3"><span className="text-2xl">{doc.id==="liquidacion"?"▤":doc.id==="provision"?"€":"▧"}</span><span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-800">{doc.estado}</span></div><h2 className="mt-3 font-bold text-slate-900">{doc.titulo}</h2><p className="mt-1 text-xs text-slate-500">{doc.subtitulo}</p></button>)}</section>
    {actual.id==="liquidacion" ? <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-sky-800">Previsualización de diseño</p><h2 className="mt-1 text-xl font-bold text-slate-900">Hoja de liquidación · Cancelación</h2><p className="mt-1 text-sm text-slate-600">Maqueta visual basada en tu propuesta, con identidad MOLSAN PREMIUM 2027.</p></div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Pendiente de conexión a datos reales</span></div><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h3 className="font-bold text-slate-900">Logotipo del cliente</h3><p className="mt-1 text-xs text-slate-500">Se mostrará en la cabecera de la hoja de liquidación. PNG, JPG o WEBP · máximo 1 MB.</p></div>
        <div className="flex flex-wrap items-center gap-3">{logoCliente && <img src={logoCliente} alt="Vista previa del logotipo del cliente" className="max-h-12 max-w-36 object-contain"/>}<label className="cursor-pointer rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800">Subir logotipo<input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={e => subirLogoCliente(e.target.files?.[0])}/></label>{logoCliente && <button type="button" onClick={() => { try { localStorage.removeItem("molsan_logo_cliente_liquidacion"); } catch {} setLogoCliente(""); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Quitar</button>}</div>
      </div>
      {errorLogo && <p role="alert" className="mt-3 text-sm text-rose-700">{errorLogo}</p>}
      <p className="mt-3 text-xs text-amber-700">Nota: por ahora el logotipo se conserva en este navegador; antes de usarlo desde varios equipos lo conectaremos a almacenamiento compartido del ERP.</p>
    </section><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end gap-3"><label className="min-w-[240px] flex-1 text-sm font-semibold text-slate-700">Número de expediente<input value={numeroExpediente} onChange={e => setNumeroExpediente(e.target.value)} onKeyDown={e => { if (e.key === "Enter") cargarExpediente(); }} placeholder="Introduce el número exacto del expediente" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"/></label><button type="button" onClick={cargarExpediente} disabled={cargandoExpediente} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{cargandoExpediente ? "Cargando…" : "Cargar expediente"}</button></div>{errorExpediente && <p role="alert" className="mt-2 text-sm text-amber-700">{errorExpediente}</p>}{expedienteSeleccionado && <p className="mt-2 text-xs font-semibold text-emerald-700">Expediente cargado: {expedienteSeleccionado.id_expediente || expedienteSeleccionado.numero_expediente || numeroExpediente} · {gastosExpediente.length} gasto(s) recuperado(s).</p>}</section><LiquidacionPreview datosMolsan={datosMolsan} logoCliente={logoCliente} expediente={expedienteSeleccionado} gastos={gastosExpediente} fechaEmision={fechaEmision}/><div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-slate-700"><strong className="text-[#123e70]">Siguiente fase:</strong> conectar los campos al expediente, usar los movimientos reales de Gestión económica, respetar el orden documental definido en «Liquidar expediente» y generar el PDF final con previsualización y confirmación antes de guardarlo en «Expediente digital completo».</div></section> : <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.85fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold text-slate-900">{actual.titulo}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{actual.descripcion}</p><h3 className="mt-5 text-sm font-bold text-slate-800">Contenido previsto</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{actual.campos.map(c=><li key={c} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">✓ {c}</li>)}</ul></div><div className="rounded-2xl border border-slate-200 bg-white p-4">{actual.id==="provision" ? <ProvisionesFondosPage soloEditorPlantilla/> : <HonorariosGestoria soloPlantilla/>}</div></section>}
  </main>;
}