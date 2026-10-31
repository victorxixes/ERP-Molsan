import { useEffect, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";

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
    <div className={`erp-page w-full max-w-none space-y-6 ${soloPlantilla ? "p-0" : ""}`}>
      {!soloPlantilla && <>
      <MolsanPageHeader mark="HG" title="Honorarios de gestoría" description="Administra las tarifas vigentes. Los cambios se aplican al seleccionar el honorario en Añadir pagos; los importes ya registrados no se modifican." />

      {(error || mensaje) && <div role="status" className={`px-4 py-3 ${error ? "" : ""}`}>{error || mensaje}</div>}
      </>}
      <div className={soloPlantilla ? "space-y-6" : "grid items-start gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,.8fr)]"}>
        {!soloPlantilla && <div className="min-w-0 space-y-6">
        <section className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"><div><h2>Tarifas configuradas</h2><p className="mt-1">Base, tipo de impuesto y porcentaje son configurables; el total se calcula automáticamente.</p></div><button type="button" onClick={nuevo} className="px-4 py-2">＋ Nuevo honorario</button></div>
          {cargando ? <p className="p-6">Cargando tarifas…</p> : items.length === 0 ? <p className="p-6">Todavía no hay tarifas.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px]"><thead className="uppercase"><tr><th className="px-4 py-3">Honorario</th><th className="px-4 py-3">Base</th><th className="px-4 py-3">Impuesto</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead><tbody>{items.map((item)=><tr key={item.id} className={item.activo ? "" : ""}><td className="px-4 py-3"><div>{item.nombre}</div>{item.descripcion && <div className="mt-1 max-w-md">{item.descripcion}</div>}</td><td className="whitespace-nowrap px-4 py-3 tabular-nums">{euros(item.base_imponible ?? item.importe)}</td><td className="whitespace-nowrap px-4 py-3">{item.tipo_impuesto || "IVA"} {Number(item.porcentaje_impuesto ?? 0)}%<div className="mt-1">{euros(Number(item.base_imponible ?? item.importe) * (item.tipo_impuesto === "EXENTO" ? 0 : Number(item.porcentaje_impuesto ?? 0)) / 100)}</div></td><td className="whitespace-nowrap px-4 py-3 tabular-nums">{euros(item.importe)}</td><td className="px-4 py-3"><span className={`px-2.5 py-1 ${item.activo ? "" : ""}`}>{item.activo ? "Activo" : "Inactivo"}</span></td><td className="whitespace-nowrap px-4 py-3"><button type="button" onClick={()=>editar(item)} className="px-3 py-1.5">Editar</button>{item.activo && <button type="button" onClick={()=>desactivar(item)} className="ml-2 px-3 py-1.5">Desactivar</button>}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="p-5">
          <div className="mb-4"><h2>{editando ? "Editar honorario" : "Crear honorario"}</h2><p className="mt-1">Configura la base imponible y selecciona IVA, IGIC o exento. El impuesto y el total se calculan automáticamente.</p></div>
          <form onSubmit={guardar} className="space-y-4">
            <label className="block"><span className="mb-1 block">Nombre del honorario *</span><input required minLength={2} maxLength={200} value={form.nombre} onChange={e=>setForm(a=>({...a,nombre:e.target.value}))} className="w-full px-3 py-2.5" placeholder="Ej. Cancelaciones con provisión" /></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block">Base imponible (€) *</span><input required type="number" min="0" step="0.01" value={form.base_imponible} onChange={e=>setForm(a=>({...a,base_imponible:e.target.value}))} className="w-full px-3 py-2.5" placeholder="69,00" /></label>
              <label className="block"><span className="mb-1 block">Tipo de impuesto</span><select value={form.tipo_impuesto} onChange={e=>setForm(a=>({...a,tipo_impuesto:e.target.value,porcentaje_impuesto:e.target.value==="EXENTO"?"0":a.porcentaje_impuesto}))} className="w-full px-3 py-2.5"><option value="IVA">IVA</option><option value="IGIC">IGIC</option><option value="EXENTO">Exento</option></select></label>
              <label className="block"><span className="mb-1 block">Porcentaje (%)</span><input required type="number" min="0" max="100" step="0.01" disabled={form.tipo_impuesto==="EXENTO"} value={form.porcentaje_impuesto} onChange={e=>setForm(a=>({...a,porcentaje_impuesto:e.target.value}))} className="w-full px-3 py-2.5" /></label>
              <div className="p-3"><div>IMPUESTO CALCULADO</div><div className="mt-1">{euros(impuestoHonorario(form))}</div><div className="mt-2">Total de honorarios</div><div>{euros(totalHonorario(form))}</div></div>
            </div>
            <label className="block"><span className="mb-1 block">Descripción / notas</span><textarea rows={3} maxLength={2000} value={form.descripcion} onChange={e=>setForm(a=>({...a,descripcion:e.target.value}))} className="w-full px-3 py-2.5" /></label>
            <label className="flex items-center gap-2 p-3"><input type="checkbox" checked={form.activo} onChange={e=>setForm(a=>({...a,activo:e.target.checked}))} />Honorario disponible en «Añadir pagos»</label>
            <div className="flex flex-wrap gap-2"><button type="submit" disabled={guardando} className="px-4 py-2.5">{guardando ? "Guardando…" : "Guardar honorario"}</button><button type="button" onClick={nuevo} className="px-4 py-2.5">Limpiar</button></div>
          </form>
        </section>
        </div>}
        {soloPlantilla && <div className="min-w-0">
      <section className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="uppercase">Plantilla de factura oficial</p>
            <h2 className="mt-1">Modelo Word de factura MOLSAN</h2>
            <p className="mt-2">Sube aquí el modelo oficial en formato .docx. El archivo se guarda en el servidor, vinculado a la plantilla de factura de honorarios, para poder revisarlo y adaptar el PDF del ERP a su estructura.</p>
            <p className="mt-2">{plantillaFactura?.plantilla_cargada ? "Documento guardado: " + (plantillaFactura.factura_nombre || "plantilla Word") : "Todavía no hay ningún Word guardado."} · Formato .docx · Máximo 10 MB</p>
          </div>
          {plantillaFactura?.plantilla_cargada && <button type="button" onClick={descargarPlantilla} disabled={descargandoPlantilla} className="shrink-0 px-4 py-2.5">{descargandoPlantilla ? "Descargando…" : "Descargar Word guardado"}</button>}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input id="plantilla-word-honorarios" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e=>setArchivoPlantilla(e.target.files?.[0] || null)} className="block w-full px-3 py-2 file:mr-3 file:px-3 file:py-2" />
          <button type="button" onClick={subirPlantilla} disabled={!archivoPlantilla || subiendoPlantilla} className="shrink-0 px-4 py-2.5">{subiendoPlantilla ? "Subiendo…" : "Guardar plantilla Word"}</button>
        </div>
        {(errorPlantilla || mensajePlantilla) && <p role="status" className={`mt-3 px-3 py-2 ${errorPlantilla ? "" : ""}`}>{errorPlantilla || mensajePlantilla}</p>}
      </section>
        </div>}
      </div>
    </div>
  );
}
