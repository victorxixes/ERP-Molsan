import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import "./ProvisionesFondosPage.css";

const hoy = () => new Date().toISOString().slice(0, 10);
const dinero = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v || 0));
const vaciaGarantia = () => ({ entidad: "", capital: "", finca: "", cru_idufir: "", registro_propiedad: "", poblacion: "", provincia: "", tipo_carga: "prestamo hipotecario", condicion_resolutoria: "no", adquisicion_vivienda_habitual: "", notaria: "0", ajd: "0", registro: "0", gestion: "0", total: "0" });
const nuevoFormulario = () => ({ id: null, fecha: hoy(), cliente: { nombre: "", nif: "", direccion: "", cp: "", poblacion: "", provincia: "", telefono: "", email: "" }, oficina: { numero: "", contacto: "", email: "" }, garantias: [vaciaGarantia()], observaciones: "" });
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const label = "block text-xs font-semibold uppercase tracking-wide text-slate-500";
const boton = "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function Campo({ titulo, valor, onChange, tipo = "text", requerido = false, placeholder = "", disabled = false, listId }) {
  const [enfocado, setEnfocado] = useState(false);
  const esMoneda = tipo === "number";
  const mostrar = esMoneda && !enfocado && valor !== "" && valor != null && Number.isFinite(Number(valor)) ? dinero(valor) : (valor ?? "");
  return <label className={label}>{titulo}<input className={`${input} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`} type={tipo === "number" ? "text" : tipo} inputMode={tipo === "number" ? "decimal" : undefined} value={mostrar} onFocus={() => setEnfocado(true)} onBlur={() => setEnfocado(false)} onChange={(e) => onChange(e.target.value.replace(/€/g, "").replace(/\s/g, "").replace(",", "."))} required={requerido} placeholder={placeholder} disabled={disabled} list={listId} autoComplete={listId ? "off" : undefined} /></label>;
}

function normalizarCatalogo(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}
function AutocompleteCatalogo({ titulo, valor, opciones, etiqueta, detalle, onChange, onSelect, placeholder = "Escribe para buscar…", disabled = false }) {
  const [abierto, setAbierto] = useState(false);
  const consulta = normalizarCatalogo(valor);
  const filtradas = opciones.filter((op) => {
    const texto = typeof etiqueta === "function" ? etiqueta(op) : String(op ?? "");
    const apoyo = detalle ? detalle(op) : "";
    return !consulta || normalizarCatalogo(texto).includes(consulta) || normalizarCatalogo(apoyo).includes(consulta);
  }).slice(0, 12);
  return <div className="relative min-w-0">
    <label className={label}>{titulo}<input className={input} value={valor ?? ""} disabled={disabled} autoComplete="off" placeholder={placeholder} role="combobox" aria-autocomplete="list" aria-expanded={abierto} onFocus={() => setAbierto(true)} onChange={(e) => { onChange(e.target.value); setAbierto(true); }} onBlur={() => setTimeout(() => setAbierto(false), 120)} /></label>
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
function Seccion({ titulo, detalle, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-base font-bold text-slate-900">{titulo}</h2>{detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}</div>{children}</section>;
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

function ConfiguracionConceptosProvisiones() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errorConfig, setErrorConfig] = useState("");
  const [borradores, setBorradores] = useState({});
  const [catalogoHonorarios, setCatalogoHonorarios] = useState([]);
  const [tramosEditando, setTramosEditando] = useState({});
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
  return <Seccion titulo="Configuración de conceptos e importes" detalle="Tablas editables de provisiones por capital. Los importes de Notaría y Registro se guardan por tramo; Honorarios y Gestión se enlazan al catálogo central. El total se calcula automáticamente cuando el catálogo proporciona el importe.">
    {errorConfig && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorConfig}</div>}
    {mensaje && <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensaje}</div>}
    {cargando ? <p className="py-4 text-sm text-slate-500">Cargando conceptos…</p> : <div className="space-y-3">
      {items.filter((item) => item.codigo === "notaria" || item.codigo === "impuestos").map((item) => {
        const draft = borradores[item.codigo] || {};
        if (item.codigo === "notaria") {
          return <div key={item.codigo} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold text-slate-900">Tramos de provisión por capital</p><p className="mt-1 max-w-3xl text-xs text-slate-600">Configuración maestra del catálogo económico y plantilla corporativa de los PDF de provisiones. Los cambios de plantilla se aplican a los nuevos documentos.</p></div>
              <button type="button" disabled={guardando === item.codigo} onClick={() => guardarConcepto(item)} className={boton + " bg-blue-600 text-white hover:bg-blue-700"}>{guardando === item.codigo ? "Guardando…" : "Guardar tablas"}</button>
            </div>
            {renderTabla(item, draft, "caixabank")}
            {renderTabla(item, draft, "ajena")}
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">Plantilla de la hoja de provisión</h3><p className="mb-3 mt-1 text-xs text-slate-500">Configuración guardada en el catálogo y aplicada a los PDF nuevos, tanto independientes como vinculados a expedientes.</p></div><button type="button" disabled={guardando === item.codigo} onClick={() => guardarConcepto(item, "plantilla")} className={boton + " bg-emerald-600 text-white hover:bg-emerald-700"}>{guardando === item.codigo ? "Guardando plantilla…" : "Guardar plantilla"}</button></div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className={label}>Nombre corporativo<input className={input} value={draft.reglas?.plantilla_pdf?.nombre_empresa ?? "MOLSAN GESTIÓN Y TRAMITACIÓN, S.L."} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), nombre_empresa: e.target.value } })} /></label>
                <label className={label}>CIF<input className={input} value={draft.reglas?.plantilla_pdf?.cif ?? ""} placeholder="CIF de la empresa" onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), cif: e.target.value } })} /></label>
                <label className={label}>Dirección corporativa<input className={input} value={draft.reglas?.plantilla_pdf?.direccion ?? ""} placeholder="Dirección" onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), direccion: e.target.value } })} /></label>
                <label className={label}>Teléfono y correo<input className={input} value={draft.reglas?.plantilla_pdf?.contacto ?? ""} placeholder="Teléfono · email" onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), contacto: e.target.value } })} /></label>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <h4 className="font-semibold text-slate-900">2. Datos de la oficina de origen</h4>
                <p className="mt-1 mb-3 text-xs text-slate-500">Campos en blanco de la plantilla. No están vinculados al catálogo de oficinas.</p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["numero", "Número de oficina"],
                    ["nombre", "Nombre de la oficina"],
                    ["direccion", "Dirección"],
                    ["poblacion", "Población"],
                    ["codigo_postal", "Código postal"],
                    ["provincia", "Provincia"],
                    ["dan", "DAN"],
                    ["dt", "DT"],
                    ["contacto", "Contacto"],
                    ["email", "Email persona de contacto"],
                    ["telefono", "Teléfono"],
                  ].map(([campo, titulo]) => (
                    <label key={campo} className={label}>{titulo}
                      <input
                        className={input}
                        type={campo === "email" ? "email" : "text"}
                        value={draft.reglas?.plantilla_pdf?.oficina_origen?.[campo] ?? ""}
                        placeholder=""
                        onChange={(e) => cambiar(item.codigo, "reglas", {
                          ...(draft.reglas || {}),
                          plantilla_pdf: {
                            ...(draft.reglas?.plantilla_pdf || {}),
                            oficina_origen: {
                              ...(draft.reglas?.plantilla_pdf?.oficina_origen || {}),
                              [campo]: e.target.value,
                            },
                          },
                        })}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <label className={label}>Aviso legal<textarea rows={3} className={input + " resize-y"} value={draft.reglas?.plantilla_pdf?.aviso_legal ?? "En el supuesto de que todos los gastos, hasta su inscripción registral, fueran superiores a los informados, según norma 3.7.20 Cancelaciones solicitaremos un complemento de saldo. Rogamos tengan en cuenta esta información."} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), aviso_legal: e.target.value } })} /></label>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className={label}>Texto de estimación<textarea rows={2} className={input + " resize-y"} value={draft.reglas?.plantilla_pdf?.texto_estimacion ?? "La presente provisión es estimativa y podrá ajustarse a los gastos efectivamente devengados."} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), texto_estimacion: e.target.value } })} /></label>
                <label className={label}>Pie corporativo<textarea rows={2} className={input + " resize-y"} value={draft.reglas?.plantilla_pdf?.pie_corporativo ?? "Documento emitido por ERP-Molsan."} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), pie_corporativo: e.target.value } })} /></label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.reglas?.plantilla_pdf?.mostrar_aviso_legal !== false} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), mostrar_aviso_legal: e.target.checked } })} /> Mostrar aviso legal</label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.reglas?.plantilla_pdf?.mostrar_firma !== false} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), plantilla_pdf: { ...(draft.reglas?.plantilla_pdf || {}), mostrar_firma: e.target.checked } })} /> Mostrar firma del cliente</label>
              </div>
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Vista previa</p><div className="mt-3 border-b-2 border-slate-200 pb-3"><p className="text-lg font-extrabold text-[#15325b]">{draft.reglas?.plantilla_pdf?.nombre_empresa || "MOLSAN GESTIÓN Y TRAMITACIÓN, S.L."}</p><p className="text-xs text-slate-600">{[draft.reglas?.plantilla_pdf?.cif, draft.reglas?.plantilla_pdf?.direccion, draft.reglas?.plantilla_pdf?.contacto].filter(Boolean).join(" · ") || "Completa los datos corporativos."}</p><p className="mt-2 font-semibold text-slate-800">PROVISIÓN ESTIMATIVA DE FONDOS</p></div><p className="mt-3 text-xs text-slate-600">{draft.reglas?.plantilla_pdf?.mostrar_aviso_legal === false ? "Aviso legal oculto" : (draft.reglas?.plantilla_pdf?.aviso_legal || "Aviso legal pendiente")}</p></div>
            </div>
          </div>;
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
  </Seccion>;
}

export default function ProvisionesFondosPage({ modoCatalogo = false }) {
  const [form, setForm] = useState(nuevoFormulario);
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
    const entidadEscrita = normalizar(g.entidad);
    const coincidenciasBanco = entidadesBancarias.filter((e) => normalizar(e.nombre) === entidadEscrita);
    const coincidenciasParciales = coincidenciasBanco.length ? coincidenciasBanco : entidadesBancarias.filter((e) => {
      const nombre = normalizar(e.nombre);
      return nombre.startsWith(entidadEscrita) || entidadEscrita.startsWith(nombre);
    });
    const banco = coincidenciasParciales.length === 1 ? coincidenciasParciales[0] : null;
    if (!banco) {
      setError(coincidenciasParciales.length > 1
        ? "Hay varias entidades que coinciden con ese texto. Escribe el nombre completo de la entidad bancaria del catálogo."
        : "Selecciona una entidad bancaria existente en el catálogo Entidades bancarias.");
      return;
    }
    const entidadActual = entidadesBancarias.find((e) => banco.entidad_actual_id != null && String(e.id) === String(banco.entidad_actual_id));
    const actualNombre = entidadActual?.nombre || (typeof banco.entidad_actual === "string" ? banco.entidad_actual : "") || banco.nombre;
    const esCaixaBank = normalizar(actualNombre).includes("caixabank");
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
    } else if (esHipoteca && g.adquisicion_vivienda_habitual === "no") {
      // Para hipotecas destinadas a otra finalidad, el valor de la regla provincial es un porcentaje del capital.
      const porcentajeTerritorial = importeHipotecaProvincia(g.provincia);
      if (porcentajeTerritorial !== null) impuestos = Math.round((capital * porcentajeTerritorial / 100) * 100) / 100;
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
      return { ...g, capital: Number(g.capital || 0), notaria, ajd, registro, gestion, total: notaria + ajd + registro + gestion };
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


  if (modoCatalogo) return <main className="provisiones-fondos-page w-full min-w-0 space-y-6 p-3 md:p-6"><header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 px-5 py-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">MOLSAN ERP PREMIUM 2027 · CATÁLOGOS ECONÓMICOS</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Tabla Provisiones de fondos</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Configura importes estimativos y criterios iniciales. Estos valores sirven de referencia para nuevas provisiones; los registros históricos no se recalculan al cambiar la tabla.</p></header><ConfiguracionConceptosProvisiones /></main>;

  return <main className="provisiones-fondos-page w-full min-w-0 space-y-6 p-3 md:p-6">
    <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
      <div className="relative z-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">MOLSAN ERP PREMIUM 2027 · GLASS LUXE</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-800">Provisión estimativa</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de presupuestos independientes, con histórico y documento PDF.</p>
        </div>
        <button type="button" onClick={nueva} className={`${boton} shrink-0 bg-blue-600 text-white shadow-sm hover:bg-blue-700`}>＋ Nueva provisión</button>
      </div>
      {form.id && <div className="relative z-10 mt-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">Editando {form.numero || `provisión #${form.id}`}</div>}
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
              <Campo titulo="Entidad bancaria" valor={g.entidad} onChange={(v) => cambiarGarantia(i, "entidad", v)} requerido listId="catalogo-entidades-bancarias" placeholder="Escribe para buscar una entidad…" />
              <Campo titulo="Capital del préstamo (€)" tipo="number" valor={g.capital} onChange={(v) => cambiarGarantia(i, "capital", v)} />
              <Campo titulo="N.º finca registral" valor={g.finca} onChange={(v) => cambiarGarantia(i, "finca", v)} />
              <Campo titulo="CRU / IDUFIR" valor={g.cru_idufir} onChange={(v) => cambiarGarantia(i, "cru_idufir", v)} />
              <AutocompleteCatalogo titulo="Registro de la Propiedad" valor={g.registro_propiedad} opciones={catalogoRegistros} etiqueta={(r) => r.registro_propiedad} detalle={(r) => [r.poblacion, r.provincia].filter(Boolean).join(" · ")} placeholder="Busca un registro…" onChange={(v) => cambiarGarantia(i, "registro_propiedad", v)} onSelect={(r) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => n === i ? { ...x, registro_propiedad: r.registro_propiedad, poblacion: r.poblacion || x.poblacion, provincia: r.provincia || x.provincia } : x) }))} />
              <AutocompleteCatalogo titulo="Población" valor={g.poblacion} opciones={catalogoMunicipios} etiqueta={(m) => m.municipio} detalle={(m) => m.provincia} placeholder="Busca una población…" onChange={(v) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => n === i ? { ...x, poblacion: v, provincia: "", ajd: x.adquisicion_vivienda_habitual === "no" ? "0" : x.ajd } : x) }))} onSelect={(m) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => {
                if (n !== i) return x;
                return { ...x, poblacion: m.municipio, provincia: m.provincia };
              }) }))} />
              <AutocompleteCatalogo titulo="Provincia" valor={g.provincia} opciones={[...new Set(catalogoMunicipios.map((m) => m.provincia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"))} etiqueta={(p) => p} placeholder="Busca una provincia…" onChange={(v) => cambiarGarantia(i, "provincia", v)} onSelect={(p) => cambiarGarantia(i, "provincia", p)} />
              <Selector titulo="Tipo de carga" valor={g.tipo_carga} onChange={(v) => cambiarGarantia(i, "tipo_carga", v)} opciones={tiposCarga} requerido />
              <Selector titulo="¿Es una condición resolutoria?" valor={g.condicion_resolutoria || (normalizarCatalogo(g.tipo_carga).includes("condicion resolutoria") ? "si" : "no")} onChange={(v) => cambiarGarantia(i, "condicion_resolutoria", v)} opciones={[{ nombre: "no" }, { nombre: "si" }]} requerido />
              {normalizarCatalogo(g.tipo_carga).includes("hipotec") && <label className={label}>¿La hipoteca se constituyó para adquirir la vivienda habitual?
                <select className={input} value={g.adquisicion_vivienda_habitual ?? ""} onChange={(e) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => {
                  if (n !== i) return x;
                  const respuesta = e.target.value;
                  return { ...x, adquisicion_vivienda_habitual: respuesta };
                }) }))} required>
                <option value="">Selecciona una respuesta…</option><option value="si">Sí, para adquirir la vivienda habitual</option><option value="no">No, para otra finalidad</option>
              </select>
              </label>}
            </div>
            {normalizarCatalogo(g.tipo_carga).includes("hipotec") && ["gipuzkoa", "alava", "bizkaia"].includes(String(g.provincia || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")) && <div role="status" className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <strong>Regla territorial detectada: {g.provincia}.</strong>{" "}
              {g.adquisicion_vivienda_habitual === "" || g.adquisicion_vivienda_habitual == null
                ? "Responde primero si la hipoteca se constituyó para adquirir la vivienda habitual."
                : g.adquisicion_vivienda_habitual === "si"
                  ? "Al tratarse de una hipoteca constituida para adquirir la vivienda habitual, no se aplica el porcentaje provincial configurado por esta regla."
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
              <div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total de la garantía</p><p className="text-lg font-bold text-slate-900">{dinero(Number(g.total || 0) || ["notaria", "ajd", "registro", "gestion"].reduce((s, k) => s + Number(g[k] || 0), 0))}</p><button type="button" onClick={() => cambiarGarantia(i, "total", ["notaria", "ajd", "registro", "gestion"].reduce((s, k) => s + Number(g[k] || 0), 0).toFixed(2))} className="mt-1 text-xs font-semibold text-blue-700 underline">Actualizar total desde conceptos</button></div>
            </div>
          </div>)}
          <button type="button" onClick={() => setForm((f) => ({ ...f, garantias: [...f.garantias, vaciaGarantia()] }))} className={`${boton} border border-dashed border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>＋ Añadir otra garantía / préstamo</button>
        </div>
      </Seccion>

      <Seccion titulo="4. Observaciones" ><textarea className={`${input} min-h-24 resize-y`} value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} placeholder="Si se trata de un embargo u otra carga no hipotecaria, indica aquí qué carga debe cancelarse y cualquier detalle relevante. No se presupuestará gasto notarial para esas cargas." /></Seccion>

      <div className="sticky bottom-3 z-10 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Importe total estimado</p><p className="text-2xl font-bold text-slate-950">{dinero(form.garantias.reduce((s, g) => s + (Number(g.total || 0) || ["notaria", "ajd", "registro", "gestion"].reduce((a, k) => a + Number(g[k] || 0), 0)), 0))}</p></div>
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
