import { useEffect, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";

const VACIO = {
  razon_social: "", nif: "", domicilio_fiscal: "", codigo_postal: "",
  poblacion: "", provincia: "", telefono: "", email: "", web: "",
  logo_data_url: "", serie_factura: "", condiciones_pago: "",
  datos_bancarios: "", pie_factura: "",
};
const secciones = [
  { titulo: "Identificación fiscal", campos: [
    ["razon_social", "Razón social", "text", true],
    ["nif", "CIF", "text", true],
    ["domicilio_fiscal", "Domicilio fiscal", "text", true],
    ["codigo_postal", "Código postal", "text", false],
    ["poblacion", "Población", "text", false],
    ["provincia", "Provincia", "text", false],
  ]},
  { titulo: "Contacto corporativo", campos: [
    ["telefono", "Teléfono", "tel", false],
    ["email", "Correo electrónico", "email", false],
    ["web", "Web corporativa", "url", false],
  ]},
  { titulo: "Preferencias documentales", campos: [
    ["serie_factura", "Serie de facturación (configuración)", "text", false],
    ["condiciones_pago", "Condiciones de pago habituales", "text", false],
    ["datos_bancarios", "Datos bancarios para documentos (si procede)", "text", false],
  ]},
];
const input = "mt-1 w-full px-3 py-2.5";
const label = "block uppercase";

export default function DatosMolsan() {
  const [datos, setDatos] = useState(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    axios.get("/utilidades/datos-molsan")
      .then(({ data }) => {
        if (activo) setDatos({ ...VACIO, ...(data?.datos || {}) });
      })
      .catch((e) => { if (activo) setError(e.response?.data?.detail || "No se pudieron cargar los datos corporativos."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const cambiar = (campo, valor) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setMensaje("");
  };

  const subirLogo = (archivo) => {
    setError(""); setMensaje("");
    if (!archivo) return;
    if (!/^image\/(png|jpeg|webp)$/.test(archivo.type || "")) {
      setError("El logotipo debe ser PNG, JPG o WEBP."); return;
    }
    if (archivo.size > 1024 * 1024) {
      setError("El logotipo no puede superar 1 MB."); return;
    }
    const lector = new FileReader();
    lector.onload = () => cambiar("logo_data_url", String(lector.result || ""));
    lector.onerror = () => setError("No se ha podido leer el logotipo.");
    lector.readAsDataURL(archivo);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true); setMensaje(""); setError("");
    try {
      const { data } = await axios.put("/utilidades/datos-molsan", datos);
      setMensaje(data?.mensaje || "Datos guardados correctamente.");
    } catch (e) {
      setError(e.response?.data?.detail || "No se pudieron guardar los datos. Comprueba tus permisos e inténtalo de nuevo.");
    } finally { setGuardando(false); }
  };

  return (
    <div className="erp-page min-h-full space-y-6">
      <MolsanPageHeader mark="DM" title="Datos Molsan" description="Datos corporativos oficiales para reutilizar en documentos y facturación, sin valores fiscales inventados." />

      {cargando ? <div className="p-6">Cargando configuración…</div> : (
        <form onSubmit={guardar} className="molsan-form space-y-5">
          {secciones.map((seccion) => (
            <section key={seccion.titulo} className="erp-card p-5 sm:p-6">
              <h2>{seccion.titulo}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {seccion.campos.map(([campo, titulo, tipo, requerido]) => (
                  <label key={campo} className={label}>
                    {titulo}{requerido && <span className="ml-1">*</span>}
                    <input className={input} type={tipo} value={datos[campo] || ""} onChange={(e) => cambiar(campo, e.target.value)} required={requerido} maxLength={campo === "domicilio_fiscal" ? 300 : 180} />
                  </label>
                ))}
              </div>
            </section>
          ))}

          <section className="erp-card p-5 sm:p-6">
            <h2>Logotipo corporativo</h2>
            <p className="mt-1">Imagen PNG, JPG o WEBP de hasta 1 MB.</p>
            <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {datos.logo_data_url ? <img src={datos.logo_data_url} alt="Logotipo Molsan" className="max-h-24 max-w-56 p-2 object-contain" /> : <div className="flex h-20 w-48 items-center justify-center">Sin logotipo cargado</div>}
              <label className={label}>Seleccionar logotipo<input className="mt-2 block max-w-full normal-case" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => subirLogo(e.target.files?.[0])} /></label>
              {datos.logo_data_url && <button type="button" onClick={() => cambiar("logo_data_url", "")} className="px-3 py-2">Quitar logotipo</button>}
            </div>
          </section>

          <section className="p-5 sm:p-6">
            <h2>Texto habitual de factura</h2>
            <textarea className={input + "min-h-28"} value={datos.pie_factura || ""} onChange={(e) => cambiar("pie_factura", e.target.value)} maxLength={3000} placeholder="Texto o condiciones que deban aparecer habitualmente al pie de la factura…" />
            <p className="mt-2">La serie y los datos guardados aquí quedan centralizados; la emisión y numeración definitiva deberán validarse en el flujo de facturación antes de aplicarse a facturas emitidas.</p>
          </section>

          {error && <div role="alert" className="px-4 py-3">{error}</div>}
          {mensaje && <div role="status" className="px-4 py-3">{mensaje}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>Los cambios se guardan en la base de datos compartida del ERP.</p>
            <button type="submit" disabled={guardando} className="inline-flex items-center justify-center px-5 py-3">{guardando ? "Guardando…" : "Guardar datos Molsan"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
