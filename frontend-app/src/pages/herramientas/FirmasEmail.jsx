import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import "../../css/HerramientasPremium.css";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function FirmasEmail() {
  const [config, setConfig] = useState({ firma_pie: "", factura_nombre: "", factura_tipo: "" });
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await axios.get("/utilidades/correspondencia/firma");
      setConfig({ firma_pie: data.firma_pie || "", factura_nombre: data.factura_nombre || "", factura_tipo: data.factura_tipo || "" });
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar la configuración de firma.");
    } finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);

  async function guardar() {
    setGuardando(true); setError(""); setMensaje("");
    try {
      const { data } = await axios.put("/utilidades/correspondencia/firma", { firma_pie: config.firma_pie || "" });
      setConfig((v) => ({ ...v, firma_pie: data.firma_pie || "" }));
      setMensaje("Firma corporativa guardada. Se aplicará automáticamente a los emails enviados desde el ERP.");
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo guardar la firma."); }
    finally { setGuardando(false); }
  }

  async function descargarFactura() {
    setDescargando(true); setError("");
    try {
      const { data } = await axios.get("/utilidades/correspondencia/firma/factura", { responseType: "blob" });
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = config.factura_nombre || "plantilla-factura";
      document.body.appendChild(enlace); enlace.click(); enlace.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo descargar la plantilla."); }
    finally { setDescargando(false); }
  }

  async function subirFactura() {
    if (!archivo) { setError("Selecciona primero el archivo de la plantilla de factura."); return; }
    const form = new FormData(); form.append("fichero", archivo);
    setSubiendo(true); setError(""); setMensaje("");
    try {
      const { data } = await axios.post("/utilidades/correspondencia/firma/factura", form, { headers: { "Content-Type": "multipart/form-data" } });
      setConfig((v) => ({ ...v, factura_nombre: data.factura_nombre || archivo.name, factura_tipo: data.factura_tipo || archivo.type }));
      setArchivo(null);
      setMensaje("Plantilla de factura subida y guardada correctamente.");
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo subir la plantilla de factura."); }
    finally { setSubiendo(false); }
  }

  return <main className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
    <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl">✉️</div><div>
          <Link to="/herramientas/catalogos" className="text-xs font-bold text-blue-600 hover:text-blue-700">← Volver a Catálogos</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Firmas y plantillas de email</h1>
          <p className="mt-1 text-sm text-slate-500">Configura la firma corporativa y conserva la plantilla de factura de honorarios.</p>
        </div></div>
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
    {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{mensaje}</div>}
    {cargando ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Cargando configuración…</div> : <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-5">
        <div><h2 className="text-lg font-bold text-slate-800">Firma corporativa</h2><p className="mt-1 text-sm text-slate-500">El ERP añadirá automáticamente el nombre del empleado, departamento y cargo de su ficha, seguido de este pie común.</p></div>
        <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Pie corporativo de la firma</span>
          <textarea rows={6} value={config.firma_pie} onChange={(e) => setConfig((v) => ({ ...v, firma_pie: e.target.value }))} placeholder={"MOLSAN\nGestoría y tramitación\nTel. · Web · Dirección"} className={inputClass} />
        </label>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900"><strong>Vista previa del bloque automático</strong><p className="mt-2 whitespace-pre-line text-blue-800">Nombre y apellidos del gestor{"\n"}Departamento · Cargo{"\n"}{config.firma_pie || "Aquí aparecerá el pie corporativo que configures."}</p><p className="mt-2 text-xs text-blue-700">Los datos personales se resolverán desde la ficha del empleado que envía cada correo.</p></div>
        <div className="flex justify-end"><button type="button" onClick={guardar} disabled={guardando} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">{guardando ? "Guardando…" : "Guardar firma corporativa"}</button></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
        <div><h2 className="text-lg font-bold text-slate-800">Plantilla de factura de honorarios</h2><p className="mt-1 text-sm text-slate-500">Sube el modelo aprobado para conservarlo en el catálogo y poder vincularlo al flujo de emails de honorarios.</p></div>
        {config.factura_nombre ? <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Plantilla guardada</p><p className="mt-1 break-all font-semibold text-slate-800">{config.factura_nombre}</p><p className="text-xs text-slate-500">{config.factura_tipo || "Tipo de archivo no indicado"}</p></div><button type="button" onClick={descargarFactura} disabled={descargando} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">{descargando ? "Descargando…" : "Descargar plantilla"}</button></div> : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Todavía no hay ninguna plantilla de factura cargada.</p>}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Archivo de plantilla (PDF, DOCX o imagen; máximo 10 MB)</span><input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className={inputClass} /></label><button type="button" onClick={subirFactura} disabled={!archivo || subiendo} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{subiendo ? "Subiendo…" : "Subir plantilla"}</button></div>
        <p className="text-xs text-slate-500">La plantilla se guarda en la base de datos del ERP, no en el almacenamiento temporal del servidor. No se adjunta indiscriminadamente a todos los correos: debe vincularse al flujo de honorarios para evitar enviar el modelo por error.</p>
      </section>
    </>}
  </main>;
}
