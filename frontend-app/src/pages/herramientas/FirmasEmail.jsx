import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import "../../css/HerramientasPremium.css";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function FirmasEmail() {
  const [firmaPie, setFirmaPie] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const { data } = await axios.get("/utilidades/correspondencia/firma");
      setFirmaPie(data.firma_pie || "");
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar la configuración de firma.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function guardar() {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const { data } = await axios.put("/utilidades/correspondencia/firma", { firma_pie: firmaPie || "" });
      setFirmaPie(data.firma_pie || "");
      setMensaje("Pie corporativo guardado. Cada correo añadirá automáticamente los datos del empleado remitente.");
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar la firma.");
    } finally {
      setGuardando(false);
    }
  }

  return <main className="molsan-page-stack catalogos-premium-page min-h-full animate-fadeIn">
    <header className="molsan-page-header">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/herramientas/catalogos" className="text-xs font-bold text-blue-600 hover:text-blue-700">← Volver a Catálogos</Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Firma corporativa de email</h1>
          <p className="mt-1 text-sm text-slate-500">Configura el pie común que acompaña a la firma personal del empleado remitente.</p>
        </div>
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
    {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{mensaje}</div>}
    {cargando ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Cargando configuración…</div> : <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Firma personal automática + pie corporativo</h2>
        <p className="mt-1 text-sm text-slate-500">El nombre y apellidos, departamento y cargo se obtienen de la FichaEmpleado del usuario que envía el correo. Aquí solo se configura el pie corporativo común.</p>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900">
        <strong>Orden de la firma en cada email</strong>
        <p className="mt-2 whitespace-pre-line text-blue-800">{"Nombre y apellidos del gestor\nDepartamento · Cargo\n"}{firmaPie || "Aquí aparecerá el pie corporativo común."}</p>
        <p className="mt-2 text-xs text-blue-700">Los datos de nombre, departamento y cargo no se escriben manualmente aquí: se leen de la ficha de quien envía el correo.</p>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Pie corporativo común</span>
        <textarea rows={6} value={firmaPie} onChange={(e) => setFirmaPie(e.target.value)} placeholder={"MOLSAN\nGestoría y tramitación\nTel. · Web · Dirección"} className={inputClass} />
      </label>
      <div className="flex justify-end">
        <button type="button" onClick={guardar} disabled={guardando} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">{guardando ? "Guardando…" : "Guardar firma corporativa"}</button>
      </div>
    </section>}
  </main>;
}
