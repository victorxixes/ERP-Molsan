import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const hoy = () => new Date().toISOString().slice(0, 10);
const dinero = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v || 0));
const TIPOS_CARGA = ["Hipotecaria", "Administrativa", "Judicial", "Bienes muebles", "Otras"];
const TERRITORIOS = ["Península", "Canarias"];
const vaciaGarantia = () => ({ entidad: "", capital: "", finca: "", cru_idufir: "", registro_propiedad: "", poblacion: "", provincia: "", tipo_carga: "Hipotecaria", territorio: "Península", notaria: "0", ajd: "0", registro: "0", gestion: "0", otros_gastos: "0", total: "0" });
const nuevoFormulario = () => ({ id: null, fecha: hoy(), cliente: { nombre: "", nif: "", direccion: "", cp: "", poblacion: "", provincia: "", telefono: "", email: "" }, oficina: { numero: "", contacto: "", email: "" }, garantias: [vaciaGarantia()], observaciones: "" });
const input = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const label = "block text-xs font-semibold uppercase tracking-wide text-slate-500";
const boton = "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function Campo({ titulo, valor, onChange, tipo = "text", requerido = false, placeholder = "", disabled = false }) {
  return <label className={label}>{titulo}<input className={`${input} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`} type={tipo} value={valor ?? ""} onChange={(e) => onChange(e.target.value)} required={requerido} placeholder={placeholder} disabled={disabled} /></label>;
}
function Selector({ titulo, valor, onChange, opciones, requerido = false }) {
  return <label className={label}>{titulo}<select className={input} value={valor ?? ""} onChange={(e) => onChange(e.target.value)} required={requerido}><option value="">Seleccionar…</option>{opciones.map((op) => <option key={typeof op === "string" ? op : op.nombre} value={typeof op === "string" ? op : op.nombre}>{typeof op === "string" ? op : op.nombre}</option>)}</select></label>;
}
function Seccion({ titulo, detalle, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-base font-bold text-slate-900">{titulo}</h2>{detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}</div>{children}</section>;
}

export default function ProvisionesFondosPage() {
  const [form, setForm] = useState(nuevoFormulario);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [entidadesBancarias, setEntidadesBancarias] = useState([]);

  useEffect(() => {
    let activa = true;
    axios.get("/entidades-bancarias").then((r) => {
      if (activa) setEntidadesBancarias(Array.isArray(r.data) ? r.data.filter((e) => e.activo !== false) : []);
    }).catch(() => { if (activa) setEntidadesBancarias([]); });
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
  const cambiarGarantia = (i, campo, valor) => setForm((f) => ({ ...f, garantias: f.garantias.map((g, n) => n === i ? { ...g, [campo]: valor, ...(campo === "tipo_carga" && valor !== "Hipotecaria" ? { notaria: "0" } : {}) } : g) }));
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
      const r = await axios.post("/expedientes/provisiones/tarifas/calcular", { tipo: "provision", entidad: g.entidad, capital: Number(g.capital || 0) });
      const t = r.data?.tarifa || {};
      const notaria = Number(t.suplidos || 0);
      const registro = Number(t.gastos_registro || 0);
      const gestion = Number(r.data?.honorarios || t.honorarios || 0);
      const otros = Number(t.otros_gastos || 0);
      const nuevoTotal = notaria + Number(g.ajd || 0) + registro + gestion + otros;
      setForm((f) => ({ ...f, garantias: f.garantias.map((x, n) => n === i ? { ...x, notaria: String(notaria), registro: String(registro), gestion: String(gestion), otros_gastos: String(otros), total: nuevoTotal.toFixed(2) } : x) }));
      setAviso("Tarifa aplicada. Revisa los conceptos y el total estimado.");
      setError("");
    } catch (e) { setError(e.response?.data?.detail || "No hay tarifa activa para esa entidad y capital. Puedes introducir los importes manualmente."); }
  };
  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    const payload = { fecha: form.fecha || hoy(), cliente: form.cliente, oficina: form.oficina, garantias: form.garantias.map((g) => ({ ...g, capital: Number(g.capital || 0), notaria: Number(g.notaria || 0), ajd: Number(g.ajd || 0), registro: Number(g.registro || 0), gestion: Number(g.gestion || 0), otros_gastos: Number(g.otros_gastos || 0), total: Number(g.total || 0) })), observaciones: form.observaciones };
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

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-3 md:p-6">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-blue-900 p-6 text-white shadow-lg md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">MOLSAN ERP PREMIUM 2027</p><h1 className="mt-2 text-3xl font-bold">Provisiones de fondos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Presupuestos independientes para clientes que contactan con la gestoría, sin necesidad de expediente asociado. Las provisiones quedan guardadas para recuperarlas cuando lo necesites.</p></div>
        <button type="button" onClick={nueva} className={`${boton} bg-white text-slate-900 hover:bg-blue-50`}>＋ Nueva provisión</button>
      </div>
      {form.id && <div className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">Editando {form.numero || `provisión #${form.id}`}</div>}
    </header>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{String(error)}</div>}
    {aviso && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{aviso}</div>}

    <form onSubmit={guardar} className="space-y-5">
      <Seccion titulo="1. Datos del cliente" detalle="Datos de contacto del cliente que solicita la provisión estimativa.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo titulo="Nombre / razón social" valor={form.cliente.nombre} onChange={(v) => cambiarCliente("nombre", v)} requerido />
          <Campo titulo="DNI / CIF" valor={form.cliente.nif} onChange={(v) => cambiarCliente("nif", v)} />
          <Campo titulo="Teléfono" valor={form.cliente.telefono} onChange={(v) => cambiarCliente("telefono", v)} />
          <Campo titulo="Email" tipo="email" valor={form.cliente.email} onChange={(v) => cambiarCliente("email", v)} />
          <div className="sm:col-span-2"><Campo titulo="Dirección" valor={form.cliente.direccion} onChange={(v) => cambiarCliente("direccion", v)} /></div>
          <Campo titulo="Código postal" valor={form.cliente.cp} onChange={(v) => cambiarCliente("cp", v)} />
          <Campo titulo="Población" valor={form.cliente.poblacion} onChange={(v) => cambiarCliente("poblacion", v)} />
          <Campo titulo="Provincia" valor={form.cliente.provincia} onChange={(v) => cambiarCliente("provincia", v)} />
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

      <Seccion titulo="3. Datos de la garantía y cálculo" detalle="Añade una línea por cada préstamo o garantía. Puedes calcular con el tarifario disponible o introducir los importes manualmente.">
        <div className="space-y-4">
          {form.garantias.map((g, i) => <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Garantía {i + 1}</h3>{form.garantias.length > 1 && <button type="button" onClick={() => setForm((f) => ({ ...f, garantias: f.garantias.filter((_, n) => n !== i) }))} className="text-xs font-semibold text-red-600 hover:text-red-800">Eliminar</button>}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Selector titulo="Entidad bancaria" valor={g.entidad} onChange={(v) => cambiarGarantia(i, "entidad", v)} opciones={entidadesBancarias.map((e) => ({ nombre: e.nombre }))} requerido />
              <Campo titulo="Capital del préstamo (€)" tipo="number" valor={g.capital} onChange={(v) => cambiarGarantia(i, "capital", v)} />
              <Campo titulo="N.º finca registral" valor={g.finca} onChange={(v) => cambiarGarantia(i, "finca", v)} />
              <Campo titulo="CRU / IDUFIR" valor={g.cru_idufir} onChange={(v) => cambiarGarantia(i, "cru_idufir", v)} />
              <Campo titulo="Registro de la Propiedad" valor={g.registro_propiedad} onChange={(v) => cambiarGarantia(i, "registro_propiedad", v)} />
              <Campo titulo="Población" valor={g.poblacion} onChange={(v) => cambiarGarantia(i, "poblacion", v)} />
              <Campo titulo="Provincia" valor={g.provincia} onChange={(v) => cambiarGarantia(i, "provincia", v)} />
              <Selector titulo="Tipo de carga" valor={g.tipo_carga} onChange={(v) => cambiarGarantia(i, "tipo_carga", v)} opciones={TIPOS_CARGA} requerido />
              <Selector titulo="Territorio" valor={g.territorio} onChange={(v) => cambiarGarantia(i, "territorio", v)} opciones={TERRITORIOS} requerido />
            </div>
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
      {cargando ? <p className="py-8 text-center text-sm text-slate-500">Cargando histórico…</p> : filtrados.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Todavía no hay provisiones guardadas que coincidan con la búsqueda.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Número / fecha</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Población</th><th className="px-3 py-3 text-right">Importe</th><th className="px-3 py-3">Acciones</th></tr></thead><tbody>{filtrados.map((it) => <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-3 py-3"><p className="font-bold text-slate-900">{it.numero}</p><p className="text-xs text-slate-500">{it.fecha || "—"}</p></td><td className="px-3 py-3"><p className="font-semibold">{it.cliente?.nombre || "—"}</p><p className="text-xs text-slate-500">{it.cliente?.nif || ""}</p></td><td className="px-3 py-3">{it.cliente?.poblacion || "—"}</td><td className="px-3 py-3 text-right font-bold tabular-nums">{dinero(it.importe_total)}</td><td className="px-3 py-3"><button type="button" onClick={() => recuperar(it)} className="font-semibold text-blue-700 hover:underline">Abrir / editar</button></td></tr>)}</tbody></table></div>}
    </Seccion>
  </main>;
}
