import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import "./ProvisionesFondosPage.css";

const hoy = () => new Date().toISOString().slice(0, 10);
const dinero = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v || 0));
const TIPOS_CARGA = ["Hipotecaria", "Administrativa", "Judicial", "Bienes muebles", "Otras"];
const TERRITORIOS = ["Península", "Canarias"];
const vaciaGarantia = () => ({ entidad: "", capital: "", finca: "", cru_idufir: "", registro_propiedad: "", poblacion: "", provincia: "", tipo_carga: "Hipotecaria", adquisicion_vivienda_habitual: "", territorio: "Península", notaria: "0", ajd: "0", registro: "0", gestion: "0", otros_gastos: "0", total: "0" });
const nuevoFormulario = () => ({ id: null, fecha: hoy(), cliente: { nombre: "", nif: "", direccion: "", cp: "", poblacion: "", provincia: "", telefono: "", email: "" }, oficina: { numero: "", contacto: "", email: "" }, garantias: [vaciaGarantia()], observaciones: "" });
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const label = "block text-xs font-semibold uppercase tracking-wide text-slate-500";
const boton = "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function Campo({ titulo, valor, onChange, tipo = "text", requerido = false, placeholder = "", disabled = false, listId }) {
  return <label className={label}>{titulo}<input className={`${input} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`} type={tipo} value={valor ?? ""} onChange={(e) => onChange(e.target.value)} required={requerido} placeholder={placeholder} disabled={disabled} list={listId} autoComplete={listId ? "off" : undefined} /></label>;
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
  honorario_id: "",
}));
const importeHonorario = (h) => {
  const n = Number(h?.importe ?? h?.importe_base ?? h?.base_imponible ?? h?.importe_honorarios ?? h?.precio ?? h?.total);
  return Number.isFinite(n) ? n : null;
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
        const reglas = { porcentaje_condicion_resolutoria: 1.5, importes_hipoteca_provincia: { Gipuzkoa: "", Álava: "", Bizkaia: "" }, tramos: [], ...(x.reglas || {}) };
        if (!Array.isArray(reglas.tramos_caixabank) || reglas.tramos_caixabank.length === 0) reglas.tramos_caixabank = clonarTramos("caixabank");
        if (!Array.isArray(reglas.tramos_entidad_ajena) || reglas.tramos_entidad_ajena.length === 0) reglas.tramos_entidad_ajena = clonarTramos("ajena");
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
  const guardarConcepto = async (item) => {
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
      setMensaje(item.nombre + ": configuración guardada.");
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
    return <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="font-bold text-slate-900">{titulo}</h3><p className="mt-1 text-xs text-slate-500">{tramos.length} tramos · capital, notaría y registro editables; {honorariosEtiqueta.toLowerCase()} enlazada al catálogo.</p></div>
        <button type="button" onClick={() => agregarTramo(item.codigo, tipo)} className={boton + " bg-indigo-600 text-white hover:bg-indigo-700"}>＋ Añadir tramo</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <th className="p-2">Principal desde (€)</th><th className="p-2">Principal hasta (€)</th><th className="p-2">Notaría (€)</th><th className="p-2">Registro (€)</th><th className="p-2">{honorariosEtiqueta} · catálogo</th><th className="p-2">Total (€)</th><th className="p-2">Acciones</th>
          </tr></thead>
          <tbody>{tramos.map((tramo, indice) => {
            const claveEdicion = tipo + "-" + indice;
            const editando = Boolean(tramosEditando[claveEdicion]);
            const honorario = catalogoHonorarios.find((h) => String(h.id ?? h.codigo ?? h.nombre) === String(tramo.honorario_id));
            const importe = importeHonorario(honorario);
            const subtotal = Number(tramo.notaria || 0) + Number(tramo.registro || 0) + (importe ?? 0);
            const campos = [["desde", "Principal desde (€)"], ["hasta", "Principal hasta (€)"], ["notaria", "Notaría (€)"], ["registro", "Registro (€)"]];
            return <tr key={claveEdicion} className="border-b border-slate-100">
              {campos.map(([campo, etiqueta]) => <td key={campo} className="p-2">{editando ? <input aria-label={etiqueta} className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="number" min="0" step="0.01" value={tramo[campo] ?? ""} onChange={(e) => cambiarTramo(item.codigo, tipo, indice, campo, e.target.value)} /> : <span>{tramo[campo] === "" || tramo[campo] == null ? "—" : dinero(tramo[campo])}</span>}</td>)}
              <td className="p-2">{editando ? <select aria-label={honorariosEtiqueta + " del catálogo"} className="w-56 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={tramo.honorario_id ?? ""} onChange={(e) => cambiarTramo(item.codigo, tipo, indice, "honorario_id", e.target.value)}><option value="">Seleccionar del catálogo…</option>{catalogoHonorarios.map((h) => <option key={h.id ?? h.codigo ?? h.nombre} value={h.id ?? h.codigo ?? h.nombre}>{h.nombre || h.concepto || h.codigo || "Honorario " + h.id}</option>)}</select> : <span>{honorario?.nombre || honorario?.concepto || honorario?.codigo || "Sin enlazar"}</span>}</td>
              <td className="p-2 font-semibold">{importe == null ? <span className="text-slate-400">Pendiente de catálogo</span> : dinero(subtotal)}</td>
              <td className="p-2"><div className="flex gap-1"><button type="button" onClick={() => setTramosEditando((prev) => ({ ...prev, [claveEdicion]: !prev[claveEdicion] }))} className="rounded-lg border border-slate-200 px-2 py-1.5 font-semibold text-blue-700">{editando ? "Terminar" : "Editar"}</button><button type="button" onClick={() => eliminarTramo(item.codigo, tipo, indice)} className="rounded-lg border border-red-200 px-2 py-1.5 font-semibold text-red-600">Eliminar</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">El total se calcula con Notaría + Registro + el importe del concepto enlazado. Si el catálogo no devuelve un importe reconocible, se muestra «Pendiente de catálogo» y no se inventa un total.</p>
    </div>;
  };
  return <Seccion titulo="Configuración de conceptos e importes" detalle="Tablas editables de provisiones por capital. Los importes de Notaría y Registro se guardan por tramo; Honorarios y Gestión se enlazan al catálogo central. El total se calcula automáticamente cuando el catálogo proporciona el importe.">
    {errorConfig && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorConfig}</div>}
    {mensaje && <div role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensaje}</div>}
    {cargando ? <p className="py-4 text-sm text-slate-500">Cargando conceptos…</p> : <div className="space-y-3">
      {items.map((item) => {
        const draft = borradores[item.codigo] || {};
        return <div key={item.codigo} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1.2fr_1fr_1.4fr_auto] md:items-end">
          <div><p className="font-semibold text-slate-800">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">{item.codigo === "gestion" ? "Fuente: catálogo central de Honorarios Gestoría." : item.codigo === "impuestos" ? "Puede marcarse como calculado o introducir una previsión." : "Importe estimativo configurable, sin tarifa inventada."}</p></div>
          {item.codigo === "gestion" ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 md:col-span-2">Se obtiene del catálogo central según «Entidad actual» del banco. No se modifica aquí.</div> : <div><label className="mb-1 block text-xs font-semibold text-slate-600">Tratamiento</label><select className={input} value={draft.modo || "previsto"} onChange={(e) => cambiar(item.codigo, "modo", e.target.value)}><option value="previsto">Importe previsto</option>{item.codigo === "impuestos" && <option value="calculado">Calculado (pendiente de regla fiscal)</option>}</select>{draft.modo === "previsto" && <><label className="mb-1 mt-2 block text-xs font-semibold text-slate-600">Importe previsto (€)</label><input className={input} type="number" min="0" step="0.01" value={draft.importe_previsto ?? ""} onChange={(e) => cambiar(item.codigo, "importe_previsto", e.target.value)} placeholder="Introduce el importe" /></>}</div>}
          <div><label className="mb-1 block text-xs font-semibold text-slate-600">Descripción / criterio</label><textarea className={input + " min-h-16 resize-y"} value={draft.descripcion || ""} onChange={(e) => cambiar(item.codigo, "descripcion", e.target.value)} disabled={item.codigo === "gestion"} /></div>
          {item.codigo === "notaria" && <div className="md:col-span-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div><p className="font-semibold text-slate-900">Tramos de provisión por capital</p><p className="mt-1 text-xs text-slate-600">Los 17 rangos facilitados por Molsan están cargados en ambas tablas. Edita cualquier tramo, elimina los que no procedan o añade otros. Las tablas se guardan con el botón «Guardar» del concepto Notaría.</p></div>
            {renderTabla(item, draft, "caixabank")}
            {renderTabla(item, draft, "ajena")}
            <p className="mt-3 text-xs text-slate-500">La selección automática de tarifa en el cálculo de provisiones es una fase separada. Estos cambios configuran las tablas sin recalcular expedientes históricos.</p>
          </div>}
          {item.codigo === "impuestos" && <div className="md:col-span-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3"><p className="text-sm font-semibold text-slate-800">Reglas iniciales de impuestos</p><p className="mt-1 text-xs text-slate-600">La condición resolutoria se configura al 1,5 % como criterio inicial indicado por Molsan. Los importes por provincia son manuales y no se inventan ni se aplican automáticamente hasta validar cada supuesto.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={label}>Condición resolutoria · porcentaje<input className={input} type="number" min="0" step="0.01" value={draft.reglas?.porcentaje_condicion_resolutoria ?? 1.5} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), porcentaje_condicion_resolutoria: e.target.value === "" ? "" : Number(e.target.value) })} /></label>{["Gipuzkoa", "Álava", "Bizkaia"].map((provincia) => <label key={provincia} className={label}>Hipoteca · {provincia} (€)<input className={input} type="number" min="0" step="0.01" placeholder="Por definir" value={draft.reglas?.importes_hipoteca_provincia?.[provincia] ?? ""} onChange={(e) => cambiar(item.codigo, "reglas", { ...(draft.reglas || {}), importes_hipoteca_provincia: { ...(draft.reglas?.importes_hipoteca_provincia || {}), [provincia]: e.target.value } })} /></label>)}</div><p className="mt-2 text-xs text-slate-500">Vitoria-Gasteiz queda cubierta por Álava. Estos importes son configuraciones de provisión, no una confirmación de la cuota tributaria legal.</p></div>}
          {item.codigo === "gestion" ? <span className="text-xs font-semibold text-emerald-700">Catálogo central</span> : <button type="button" disabled={guardando === item.codigo} onClick={() => guardarConcepto(item)} className={boton + " bg-blue-600 text-white hover:bg-blue-700"}>{guardando === item.codigo ? "Guardando…" : "Guardar"}</button>}
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
  const [catalogoRegistros, setCatalogoRegistros] = useState([]);
  const [conceptosImportes, setConceptosImportes] = useState([]);

  useEffect(() => {
    let activo = true;
    Promise.all([
      axios.get("/municipios"),
      axios.get("/expedientes/provisiones/tarifas/catalogo-registros"),
    ]).then(([municipios, registros]) => {
      if (!activo) return;
      setCatalogoMunicipios(Array.isArray(municipios.data) ? municipios.data.filter((m) => m.activo !== false) : []);
      setCatalogoRegistros(Array.isArray(registros.data) ? registros.data : []);
    }).catch(() => {
      if (activo) { setCatalogoMunicipios([]); setCatalogoRegistros([]); }
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
  const importeHipotecaProvincia = (provincia) => {
    const concepto = conceptosImportes.find((x) => x.codigo === "impuestos" && x.activo !== false);
    const importes = concepto?.reglas?.importes_hipoteca_provincia || {};
    const clave = String(provincia || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
    const entrada = Object.entries(importes).find(([nombre]) => nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es") === clave);
    return entrada && entrada[1] !== "" && entrada[1] != null && Number.isFinite(Number(entrada[1])) ? Number(entrada[1]) : null;
  };
  const cambiarGarantia = (i, campo, valor) => setForm((f) => ({ ...f, garantias: f.garantias.map((g, n) => {
    if (n !== i) return g;
    const cambios = { [campo]: valor };
    if (campo === "tipo_carga" && valor !== "Hipotecaria") {
      cambios.notaria = "0";
      cambios.total = ["ajd", "registro", "gestion", "otros_gastos"].reduce((s, k) => s + Number(g[k] || 0), 0).toFixed(2);
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
    if (!g.entidad.trim()) { setError("Indica la entidad bancaria antes de calcular."); return; }
    try {
      const entidadSeleccionada = entidadesBancarias.find((e) => String(e.nombre || "").trim().toLocaleLowerCase("es") === String(g.entidad || "").trim().toLocaleLowerCase("es"));
      const entidadActual = entidadSeleccionada?.entidad_actual_id
        ? entidadesBancarias.find((e) => Number(e.id) === Number(entidadSeleccionada.entidad_actual_id))
        : null;
      const esCaixaBank = /caixabank/i.test(String(entidadActual?.nombre || ""));
      const honorarioAplicable = esCaixaBank
        ? catalogoHonorarios.find((h) => /honorarios de gestoría\s*[—-]\s*caixabank/i.test(String(h.nombre || "")))
        : catalogoHonorarios.find((h) => /honorarios de gestoría\s*[—-]\s*otra entidad/i.test(String(h.nombre || "")));

      if (!honorarioAplicable) {
        const nombreHonorario = esCaixaBank ? "Honorarios de gestoría — CaixaBank" : "Honorarios de gestoría — Otra entidad";
        setError(`No se ha encontrado un honorario activo «${nombreHonorario}» en el catálogo de Honorarios Gestoría. Revisa el catálogo y vuelve a calcular.`);
        return;
      }

      const r = await axios.post("/expedientes/provisiones/tarifas/calcular", { tipo: "provision", entidad: g.entidad, territorio: g.territorio || "Península", capital: Number(g.capital || 0) });
      const t = r.data?.tarifa || {};
      const conceptoNotaria = conceptosImportes.find((x) => x.codigo === "notaria" && x.activo !== false);
      const conceptoRegistro = conceptosImportes.find((x) => x.codigo === "registro" && x.activo !== false);
      const conceptoImpuestos = conceptosImportes.find((x) => x.codigo === "impuestos" && x.activo !== false);
      const notaria = g.tipo_carga === "Hipotecaria" ? Number(t.suplidos || conceptoNotaria?.importe_previsto || 0) : 0;
      const registro = Number(t.gastos_registro || conceptoRegistro?.importe_previsto || 0);
      // Los honorarios siempre proceden del catálogo central. La elección
      // se hace según la columna «Entidad actual» del catálogo bancario.
      const gestion = Number(honorarioAplicable.importe ?? (
        Number(honorarioAplicable.base_imponible || 0) *
        (1 + (String(honorarioAplicable.tipo_impuesto || "IVA").toUpperCase() === "EXENTO" ? 0 : Number(honorarioAplicable.porcentaje_impuesto || 0)) / 100)
      ));
      const otros = Number(t.otros_gastos || 0);
      const impuestos = Number(g.ajd || (conceptoImpuestos?.modo === "previsto" ? conceptoImpuestos.importe_previsto : 0) || 0);
      const nuevoTotal = notaria + impuestos + registro + gestion + otros;
      setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => n === i ? { ...x, notaria: String(notaria), ajd: String(impuestos), registro: String(registro), gestion: String(gestion), otros_gastos: String(otros), total: nuevoTotal.toFixed(2) } : x) }));
      setAviso(`Tarifa aplicada. Honorarios de gestoría tomados del catálogo central: ${honorarioAplicable.nombre}.`);
      setError("");
    } catch (e) { setError(e.response?.data?.detail || "No hay tarifa activa para esa entidad y capital. Puedes introducir los importes manualmente."); }
  };
  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    const payload = { fecha: form.fecha || hoy(), cliente: form.cliente, oficina: form.oficina, garantias: form.garantias.map((g) => {
      const notaria = g.tipo_carga === "Hipotecaria" ? Number(g.notaria || 0) : 0;
      const ajd = Number(g.ajd || 0);
      const registro = Number(g.registro || 0);
      const gestion = Number(g.gestion || 0);
      const otros_gastos = Number(g.otros_gastos || 0);
      return { ...g, capital: Number(g.capital || 0), notaria, ajd, registro, gestion, otros_gastos, total: notaria + ajd + registro + gestion + otros_gastos };
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
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e.response?.data?.detail || "No se pudo generar el PDF."); }
  };
  const filtrados = items.filter((x) => [x.numero, x.cliente?.nombre, x.cliente?.nif, x.cliente?.poblacion].some((v) => String(v || "").toLowerCase().includes(busqueda.toLowerCase())));

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

    <ConfiguracionConceptosProvisiones />

    <form onSubmit={guardar} className="space-y-5">
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
      <Seccion titulo="1. Datos del cliente" detalle="Datos de contacto del cliente que solicita la provisión estimativa.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo titulo="Nombre / razón social" valor={form.cliente.nombre} onChange={(v) => cambiarCliente("nombre", v)} requerido />
          <Campo titulo="DNI / CIF" valor={form.cliente.nif} onChange={(v) => cambiarCliente("nif", v)} />
          <Campo titulo="Teléfono" valor={form.cliente.telefono} onChange={(v) => cambiarCliente("telefono", v)} />
          <Campo titulo="Email" tipo="email" valor={form.cliente.email} onChange={(v) => cambiarCliente("email", v)} />
          <div className="sm:col-span-2"><Campo titulo="Dirección" valor={form.cliente.direccion} onChange={(v) => cambiarCliente("direccion", v)} /></div>
          <Campo titulo="Código postal" valor={form.cliente.cp} onChange={(v) => cambiarCliente("cp", v)} />
          <AutocompleteCatalogo titulo="Población" valor={form.cliente.poblacion} opciones={catalogoMunicipios} etiqueta={(m) => m.municipio} detalle={(m) => m.provincia} placeholder="Busca una población…" onChange={(v) => setForm((f) => ({ ...f, cliente: { ...f.cliente, poblacion: v, provincia: "" } }))} onSelect={(m) => setForm((f) => ({ ...f, cliente: { ...f.cliente, poblacion: m.municipio, provincia: m.provincia } }))} />
          <AutocompleteCatalogo titulo="Provincia" valor={form.cliente.provincia} opciones={[...new Set(catalogoMunicipios.map((m) => m.provincia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"))} etiqueta={(p) => p} placeholder="Busca una provincia…" onChange={(v) => cambiarCliente("provincia", v)} onSelect={(p) => cambiarCliente("provincia", p)} />
          <Campo titulo="Fecha de provisión" tipo="date" valor={form.fecha} onChange={(v) => setForm((f) => ({ ...f, fecha: v }))} requerido />
        </div>
      </Seccion>

      <Seccion titulo="2. Datos de la oficina de origen" detalle="Oficina que solicita o tramita la provisión.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo titulo="Número de oficina" valor={form.oficina.numero} onChange={(v) => cambiarOficina("numero", v)} />
          <Campo titulo="Contacto" valor={form.oficina.contacto} onChange={(v) => cambiarOficina("contacto", v)} />
          <Campo titulo="Email" tipo="email" valor={form.oficina.email} onChange={(v) => cambiarOficina("email", v)} />
        </div>
      </Seccion>
      </div>

      <Seccion titulo="3. Datos de la garantía y cálculo" detalle="Añade una línea por cada préstamo o garantía. Puedes calcular con el tarifario disponible o introducir los importes manualmente.">
        <datalist id="catalogo-entidades-bancarias">{entidadesBancarias.map((e) => <option key={e.id || e.nombre} value={e.nombre} />)}</datalist>
        <datalist id="catalogo-tipos-carga">{TIPOS_CARGA.map((tipo) => <option key={tipo} value={tipo} />)}</datalist>
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
                const importeTerritorial = x.tipo_carga === "Hipotecaria" && x.adquisicion_vivienda_habitual === "no" ? importeHipotecaProvincia(m.provincia) : null;
                return { ...x, poblacion: m.municipio, provincia: m.provincia, ...(importeTerritorial !== null ? { ajd: String(importeTerritorial) } : {}) };
              }) }))} />
              <AutocompleteCatalogo titulo="Provincia" valor={g.provincia} opciones={[...new Set(catalogoMunicipios.map((m) => m.provincia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"))} etiqueta={(p) => p} placeholder="Busca una provincia…" onChange={(v) => cambiarGarantia(i, "provincia", v)} onSelect={(p) => cambiarGarantia(i, "provincia", p)} />
              <Campo titulo="Tipo de carga" valor={g.tipo_carga} onChange={(v) => cambiarGarantia(i, "tipo_carga", v)} requerido listId="catalogo-tipos-carga" placeholder="Escribe para buscar el tipo…" />
              {g.tipo_carga === "Hipotecaria" && <label className={label}>¿La hipoteca se constituyó para adquirir la vivienda habitual?
                <select className={input} value={g.adquisicion_vivienda_habitual ?? ""} onChange={(e) => setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => {
                  if (n !== i) return x;
                  const respuesta = e.target.value;
                  const importeTerritorial = respuesta === "no" ? importeHipotecaProvincia(x.provincia) : null;
                  return { ...x, adquisicion_vivienda_habitual: respuesta, ...(importeTerritorial !== null ? { ajd: String(importeTerritorial) } : {}) };
                }) }))} required>
                <option value="">Selecciona una respuesta…</option><option value="si">Sí, para adquirir la vivienda habitual</option><option value="no">No, para otra finalidad</option>
              </select>
              </label>}
              <Selector titulo="Territorio" valor={g.territorio} onChange={(v) => cambiarGarantia(i, "territorio", v)} opciones={TERRITORIOS} requerido />
            </div>
            {g.tipo_carga === "Hipotecaria" && ["gipuzkoa", "alava", "bizkaia"].includes(String(g.provincia || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")) && <div role="status" className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <strong>Regla territorial detectada: {g.provincia}.</strong>{" "}
              {g.adquisicion_vivienda_habitual === "" || g.adquisicion_vivienda_habitual == null
                ? "Responde primero si la hipoteca se constituyó para adquirir la vivienda habitual."
                : g.adquisicion_vivienda_habitual === "si"
                  ? "Al tratarse de una hipoteca constituida para adquirir la vivienda habitual, no se aplica el importe territorial configurado por esta regla."
                  : importeHipotecaProvincia(g.provincia) === null
                    ? "No hay importe configurado para " + g.provincia + " en Catálogos → Tabla Provisiones de fondos. Introduce el impuesto manualmente."
                    : "Como la hipoteca no se constituyó para adquirir la vivienda habitual, se propone " + dinero(importeHipotecaProvincia(g.provincia)) + " según la tabla configurada. El importe se refleja en AJD / impuestos y puedes revisarlo antes de guardar."}
            </div>}
            {g.tipo_carga !== "Hipotecaria" && <div role="note" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"><strong>Atención:</strong> en cargas administrativas, judiciales, bienes muebles u otras (por ejemplo, embargos) no se debe presupuestar gasto notarial. Añade en Observaciones una nota indicando la carga que debe cancelarse. El importe de Notaría queda a 0 €.</div>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Campo titulo="Notaría (€)" tipo="number" valor={g.notaria} onChange={(v) => cambiarGarantia(i, "notaria", v)} disabled={g.tipo_carga !== "Hipotecaria"} />
              <Campo titulo="AJD / impuestos (€)" tipo="number" valor={g.ajd} onChange={(v) => cambiarGarantia(i, "ajd", v)} />
              <Campo titulo="Registro (€)" tipo="number" valor={g.registro} onChange={(v) => cambiarGarantia(i, "registro", v)} />
              <Campo titulo="Gestión (€)" tipo="number" valor={g.gestion} onChange={(v) => cambiarGarantia(i, "gestion", v)} />
              <Campo titulo="Otros gastos (€)" tipo="number" valor={g.otros_gastos} onChange={(v) => cambiarGarantia(i, "otros_gastos", v)} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => calcular(i)} className={`${boton} border border-blue-200 bg-white text-blue-800 hover:bg-blue-50`}>Calcular con tarifario</button>
              <div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total de la garantía</p><p className="text-lg font-bold text-slate-900">{dinero(Number(g.total || 0) || ["notaria", "ajd", "registro", "gestion", "otros_gastos"].reduce((s, k) => s + Number(g[k] || 0), 0))}</p><button type="button" onClick={() => cambiarGarantia(i, "total", ["notaria", "ajd", "registro", "gestion", "otros_gastos"].reduce((s, k) => s + Number(g[k] || 0), 0).toFixed(2))} className="mt-1 text-xs font-semibold text-blue-700 underline">Actualizar total desde conceptos</button></div>
            </div>
          </div>)}
          <button type="button" onClick={() => setForm((f) => ({ ...f, garantias: [...f.garantias, vaciaGarantia()] }))} className={`${boton} border border-dashed border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>＋ Añadir otra garantía / préstamo</button>
        </div>
      </Seccion>

      <Seccion titulo="4. Observaciones" ><textarea className={`${input} min-h-24 resize-y`} value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} placeholder="Si se trata de un embargo u otra carga no hipotecaria, indica aquí qué carga debe cancelarse y cualquier detalle relevante. No se presupuestará gasto notarial para esas cargas." /></Seccion>

      <div className="sticky bottom-3 z-10 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Importe total estimado</p><p className="text-2xl font-bold text-slate-950">{dinero(form.garantias.reduce((s, g) => s + (Number(g.total || 0) || ["notaria", "ajd", "registro", "gestion", "otros_gastos"].reduce((a, k) => a + Number(g[k] || 0), 0)), 0))}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={nueva} className={`${boton} border border-slate-300 text-slate-700 hover:bg-slate-50`}>Nueva / limpiar</button><button type="button" onClick={pdf} disabled={!form.id} className={`${boton} border border-blue-200 text-blue-800 hover:bg-blue-50`}>Generar PDF</button><button type="submit" disabled={guardando} className={`${boton} bg-slate-950 text-white hover:bg-slate-800`}>{guardando ? "Guardando…" : form.id ? "Guardar cambios" : "Guardar provisión"}</button></div>
      </div>
    </form>

    <Seccion titulo="Histórico de provisiones guardadas" detalle="Busca, recupera y modifica una provisión anterior o vuelve a generar su documento.">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row"><input className={`${input} mt-0 flex-1`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por número, cliente, DNI/CIF o población…" /><button type="button" onClick={cargar} className={`${boton} border border-slate-300 text-slate-700 hover:bg-slate-50`}>Actualizar</button></div>
      {cargando ? <p role="status" aria-live="polite" className="py-8 text-center text-sm text-slate-500">Cargando histórico…</p> : filtrados.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Todavía no hay provisiones guardadas que coincidan con la búsqueda.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Número / fecha</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Población</th><th className="px-3 py-3 text-right">Importe</th><th className="px-3 py-3">Acciones</th></tr></thead><tbody>{filtrados.map((it) => <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-3"><p className="font-bold text-slate-900">{it.numero}</p><p className="text-xs text-slate-500">{it.fecha || "—"}</p></td><td className="px-3 py-3"><p className="font-semibold">{it.cliente?.nombre || "—"}</p><p className="text-xs text-slate-500">{it.cliente?.nif || ""}</p></td><td className="px-3 py-3">{it.cliente?.poblacion || "—"}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{dinero(it.importe_total)}</td><td className="px-3 py-3"><button type="button" onClick={() => recuperar(it)} className="font-semibold text-blue-700 hover:underline">Abrir / editar</button></td></tr>)}</tbody></table></div>}
    </Seccion>
  </main>;
}
