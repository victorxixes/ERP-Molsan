import { useEffect, useState } from "react";
import axios from "../../api/axios";
import "../../css/ModalesHerramientasPremium.css";
import "../../css/CatalogosMaestrosPremium.css";

const euros = (value) => Number(value || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

const VACIO = { nombre: "", descripcion: "", base_imponible: "", tipo_impuesto: "IVA", porcentaje_impuesto: "21", activo: true };
const redondear = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const totalHonorario = (form) => redondear(Number(String(form.base_imponible || "0").replace(",", ".")) * (1 + (form.tipo_impuesto === "EXENTO" ? 0 : Number(String(form.porcentaje_impuesto || "0").replace(",", "."))) / 100));
const impuestoHonorario = (form) => redondear(totalHonorario(form) - Number(String(form.base_imponible || "0").replace(",", ".")));

export default function HonorariosGestoria({ soloPlantilla = false } = {}) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [plantillaFactura, setPlantillaFactura] = useState(null);
  const [archivoPlantilla, setArchivoPlantilla] = useState(null);
  const [subiendoPlantilla, setSubiendoPlantilla] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [errorPlantilla, setErrorPlantilla] = useState("");
  const [mensajePlantilla, setMensajePlantilla] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const response = await axios.get("/honorarios-gestoria");
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar el catálogo de honorarios.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); cargarEstadoPlantilla(); }, []);

  async function cargarEstadoPlantilla() {
    try {
      const { data } = await axios.get("/utilidades/conceptos-gastos/6/plantilla-factura/estado");
      setPlantillaFactura(data);
      setErrorPlantilla("");
    } catch (e) {
      setErrorPlantilla(e?.response?.data?.detail || "No se pudo consultar el estado de la plantilla Word.");
    }
  }

  async function subirPlantilla() {
    if (!archivoPlantilla || subiendoPlantilla) return;
    if (!archivoPlantilla.name.toLowerCase().endsWith(".docx")) {
      setErrorPlantilla("Selecciona un documento Word .docx.");
      return;
    }
    const formData = new FormData();
    formData.append("fichero", archivoPlantilla);
    setSubiendoPlantilla(true);
    setErrorPlantilla("");
    setMensajePlantilla("");
    try {
      const { data } = await axios.post("/utilidades/conceptos-gastos/6/plantilla-factura", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPlantillaFactura({ plantilla_cargada: true, factura_nombre: data.factura_nombre, factura_tipo: data.factura_tipo, actualizado_en: new Date().toISOString() });
      setArchivoPlantilla(null);
      const selector = document.getElementById("plantilla-word-honorarios");
      if (selector) selector.value = "";
      setMensajePlantilla("Plantilla Word guardada correctamente en el catálogo de honorarios.");
    } catch (e) {
      setErrorPlantilla(e?.response?.data?.detail || "No se pudo guardar el documento Word.");
    } finally {
      setSubiendoPlantilla(false);
    }
  }

  async function descargarPlantilla() {
    setDescargandoPlantilla(true);
    setErrorPlantilla("");
    try {
      const { data } = await axios.get("/utilidades/conceptos-gastos/6/plantilla-factura", { responseType: "blob" });
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = plantillaFactura?.factura_nombre || "plantilla-factura.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorPlantilla(e?.response?.data?.detail || "No se pudo descargar la plantilla Word.");
    } finally {
      setDescargandoPlantilla(false);
    }
  }

  function editar(item) {
    setEditando(item.id);
    setForm({ nombre: item.nombre || "", descripcion: item.descripcion || "", base_imponible: String(item.base_imponible ?? item.importe ?? ""), tipo_impuesto: item.tipo_impuesto || "IVA", porcentaje_impuesto: String(item.porcentaje_impuesto ?? 21), activo: Boolean(item.activo) });
    setMensaje("");
    setError("");
  }

  function nuevo() {
    setEditando(null);
    setForm(VACIO);
    setMensaje("");
    setError("");
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");
    const payload = { ...form, base_imponible: String(form.base_imponible).replace(",", "."), porcentaje_impuesto: String(form.porcentaje_impuesto).replace(",", "."), importe: String(totalHonorario(form).toFixed(2)) };
    try {
      if (editando) await axios.put(`/honorarios-gestoria/${editando}`, payload);
      else await axios.post("/honorarios-gestoria", payload);
      nuevo();
      setMensaje("Honorario guardado correctamente.");
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar el honorario.");
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(item) {
    if (!window.confirm(`¿Desactivar «${item.nombre}»? No se eliminarán los pagos históricos.`)) return;
    setError("");
    try {
      await axios.delete(`/honorarios-gestoria/${item.id}`);
      setMensaje("Honorario desactivado. Los pagos históricos se conservan.");
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo desactivar el honorario.");
    }
  }

  return (
    <div className={`honorarios-gestoria-premium herramientas-subpagina-premium w-full max-w-none space-y-6 ${soloPlantilla ? "p-0" : "p-4 sm:p-6 lg:p-8"}`}>
      {!soloPlantilla && <>
      <header className="molsan-page-header rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600">Utilidades · Catálogo económico</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Honorarios de gestoría</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">Administra las tarifas vigentes. Los cambios se aplican al seleccionar el honorario en «Añadir pagos»; los importes ya registrados no se modifican.</p>
      </header>

      {(error || mensaje) && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || mensaje}</div>}
      </>}
      <div className={soloPlantilla ? "space-y-6" : "grid items-start gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,.8fr)]"}>
        {!soloPlantilla && <div className="min-w-0 space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-extrabold text-slate-800">Tarifas configuradas</h2><p className="mt-1 text-xs text-slate-500">Base, tipo de impuesto y porcentaje son configurables; el total se calcula automáticamente.</p></div><button type="button" onClick={nuevo} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">＋ Nuevo honorario</button></div>
          {cargando ? <p className="p-6 text-sm text-slate-500">Cargando tarifas…</p> : items.length === 0 ? <p className="p-6 text-sm text-slate-500">Todavía no hay tarifas.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Honorario</th><th className="px-4 py-3">Base</th><th className="px-4 py-3">Impuesto</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item)=><tr key={item.id} className={item.activo ? "" : "bg-slate-50 opacity-60"}><td className="px-4 py-3"><div className="font-bold text-slate-800">{item.nombre}</div>{item.descripcion && <div className="mt-1 max-w-md text-xs text-slate-500">{item.descripcion}</div>}</td><td className="whitespace-nowrap px-4 py-3 tabular-nums">{euros(item.base_imponible ?? item.importe)}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{item.tipo_impuesto || "IVA"} {Number(item.porcentaje_impuesto ?? 0)}%<div className="mt-1 text-[11px] text-slate-500">{euros(Number(item.base_imponible ?? item.importe) * (item.tipo_impuesto === "EXENTO" ? 0 : Number(item.porcentaje_impuesto ?? 0)) / 100)}</div></td><td className="whitespace-nowrap px-4 py-3 font-extrabold tabular-nums">{euros(item.importe)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{item.activo ? "Activo" : "Inactivo"}</span></td><td className="whitespace-nowrap px-4 py-3 text-right"><button type="button" onClick={()=>editar(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Editar</button>{item.activo && <button type="button" onClick={()=>desactivar(item)} className="ml-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Desactivar</button>}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="font-extrabold text-slate-800">{editando ? "Editar honorario" : "Crear honorario"}</h2><p className="mt-1 text-xs text-slate-500">Configura la base imponible y selecciona IVA, IGIC o exento. El impuesto y el total se calculan automáticamente.</p></div>
          <form onSubmit={guardar} className="space-y-4">
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Nombre del honorario *</span><input required minLength={2} maxLength={200} value={form.nombre} onChange={e=>setForm(a=>({...a,nombre:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Ej. Cancelaciones con provisión" /></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Base imponible (€) *</span><input required type="number" min="0" step="0.01" value={form.base_imponible} onChange={e=>setForm(a=>({...a,base_imponible:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="69,00" /></label>
              <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tipo de impuesto</span><select value={form.tipo_impuesto} onChange={e=>setForm(a=>({...a,tipo_impuesto:e.target.value,porcentaje_impuesto:e.target.value==="EXENTO"?"0":a.porcentaje_impuesto}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="IVA">IVA</option><option value="IGIC">IGIC</option><option value="EXENTO">Exento</option></select></label>
              <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Porcentaje (%)</span><input required type="number" min="0" max="100" step="0.01" disabled={form.tipo_impuesto==="EXENTO"} value={form.porcentaje_impuesto} onChange={e=>setForm(a=>({...a,porcentaje_impuesto:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-100" /></label>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3"><div className="text-[11px] font-bold text-indigo-700">IMPUESTO CALCULADO</div><div className="mt-1 font-extrabold text-slate-800">{euros(impuestoHonorario(form))}</div><div className="mt-2 text-[11px] text-slate-500">Total de honorarios</div><div className="text-xl font-black text-indigo-800">{euros(totalHonorario(form))}</div></div>
            </div>
            <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Descripción / notas</span><textarea rows={3} maxLength={2000} value={form.descripcion} onChange={e=>setForm(a=>({...a,descripcion:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm"><input type="checkbox" checked={form.activo} onChange={e=>setForm(a=>({...a,activo:e.target.checked}))} />Honorario disponible en «Añadir pagos»</label>
            <div className="flex flex-wrap gap-2"><button disabled={guardando} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar honorario"}</button><button type="button" onClick={nuevo} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Limpiar</button></div>
          </form>
        </section>
        </div>}
        {soloPlantilla && <div className="min-w-0">
      <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600">Plantilla de factura oficial</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Modelo Word de factura MOLSAN</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sube aquí el modelo oficial en formato .docx. El archivo se guarda en el servidor, vinculado a la plantilla de factura de honorarios, para poder revisarlo y adaptar el PDF del ERP a su estructura.</p>
            <p className="mt-2 text-xs text-slate-500">{plantillaFactura?.plantilla_cargada ? "Documento guardado: " + (plantillaFactura.factura_nombre || "plantilla Word") : "Todavía no hay ningún Word guardado."} · Formato .docx · Máximo 10 MB</p>
          </div>
          {plantillaFactura?.plantilla_cargada && <button type="button" onClick={descargarPlantilla} disabled={descargandoPlantilla} className="shrink-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{descargandoPlantilla ? "Descargando…" : "Descargar Word guardado"}</button>}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input id="plantilla-word-honorarios" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>setArchivoPlantilla(e.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-indigo-700" />
          <button type="button" onClick={subirPlantilla} disabled={!archivoPlantilla || subiendoPlantilla} className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{subiendoPlantilla ? "Subiendo…" : "Guardar plantilla Word"}</button>
        </div>
        {(errorPlantilla || mensajePlantilla) && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${errorPlantilla ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{errorPlantilla || mensajePlantilla}</p>}
      </section>
        </div>}
      </div>
    </div>
  );
}
