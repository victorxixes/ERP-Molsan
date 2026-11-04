import { useEffect, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { Link } from "react-router-dom";
import axios from "../../api/axios";

const inputClass = "w-full px-3 py-2.5";

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

  return <main className="erp-page min-h-full space-y-6">
    <MolsanPageHeader mark="FE" title="Firmas y plantillas de email" description="Configura las firmas corporativas y plantillas de comunicación del ERP." />
    {error && <div role="alert" className="px-4 py-3">{error}</div>}
    {mensaje && <div role="status" className="px-4 py-3">{mensaje}</div>}
    {cargando ? <div className="p-8">Cargando configuración…</div> : <section className="p-5 sm:p-6 space-y-5">
      <div>
        <h2>Firma personal automática + pie corporativo</h2>
        <p className="mt-1">El nombre y apellidos, departamento y cargo se obtienen de la FichaEmpleado del usuario que envía el correo. Aquí solo se configura el pie corporativo común.</p>
      </div>
      <div className="p-4">
        <strong>Orden de la firma en cada email</strong>
        <p className="mt-2 whitespace-pre-line">{"Nombre y apellidos del gestor\nDepartamento · Cargo\n"}{firmaPie || "Aquí aparecerá el pie corporativo común."}</p>
        <p className="mt-2">Los datos de nombre, departamento y cargo no se escriben manualmente aquí: se leen de la ficha de quien envía el correo.</p>
      </div>
      <label className="block">
        <span className="mb-1.5 block uppercase">Pie corporativo común</span>
        <textarea rows={6} value={firmaPie} onChange={(e) => setFirmaPie(e.target.value)} placeholder={"MOLSAN\nGestoría y tramitación\nTel. · Web · Dirección"} className={inputClass} />
      </label>
      <div className="flex justify-end">
        <button type="button" onClick={guardar} disabled={guardando} className="px-5 py-2.5">{guardando ? "Guardando…" : "Guardar firma corporativa"}</button>
      </div>
    </section>}
  </main>;
}
