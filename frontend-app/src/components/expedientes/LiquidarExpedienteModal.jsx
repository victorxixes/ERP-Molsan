import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "../../api/axios";
import "../../css/ModalesOperativosPremium.css";
import { formatEuro as dinero } from "../../utils/formatters";

const valor = (obj, ...keys) => {
  for (const key of keys) if (obj?.[key] !== undefined && obj?.[key] !== null && String(obj[key]).trim() !== "") return obj[key];
  return "";
};

export default function LiquidarExpedienteModal({ expediente, movimientos = [], checklist, onClose, onConfirmarCierre, cargandoCierre = false }) {
  const [form, setForm] = useState({});
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cierreDocumental, setCierreDocumental] = useState(null);
  const [generandoCierreDocumental, setGenerandoCierreDocumental] = useState(false);
  const [guardandoCierreDocumental, setGuardandoCierreDocumental] = useState(false);
  const [vistaPreviaUrl, setVistaPreviaUrl] = useState("");
  const [metadataVistaPrevia, setMetadataVistaPrevia] = useState(null);

  useEffect(() => {
    setForm({
      tipo_documento: valor(expediente, "tipo_documento"),
      facturacion_nombre: valor(expediente, "facturacion_nombre", "nombre_facturacion"),
      facturacion_apellidos: valor(expediente, "facturacion_apellidos", "apellidos_facturacion"),
      facturacion_dni_nif: valor(expediente, "facturacion_dni_nif", "dni_facturacion", "nif_facturacion"),
      facturacion_direccion: valor(expediente, "facturacion_direccion", "direccion_facturacion"),
      facturacion_codigo_postal: valor(expediente, "facturacion_codigo_postal", "codigo_postal_facturacion"),
      facturacion_poblacion: valor(expediente, "facturacion_poblacion", "poblacion_facturacion"),
      facturacion_provincia: valor(expediente, "facturacion_provincia", "provincia_facturacion"),
      facturacion_telefono: valor(expediente, "facturacion_telefono", "telefono_facturacion"),
      facturacion_email: valor(expediente, "facturacion_email", "email_facturacion"),
      fecha_fin_actividad: String(expediente?.fecha_fin_actividad || "").slice(0, 10),
    });
    setFilas((Array.isArray(movimientos) ? movimientos : []).map((g) => ({
      ...g,
      _tipo: String(g.tipo || g.descripcion || "Gasto"),
      _pagado: ["pagado", "realizado", "abonado", "paid"].includes(String(g.estado_pago || "").toLowerCase()),
    })));
  }, [expediente, movimientos]);

  const importeInicial = Number(expediente?.importe || 0);
  const totalPagado = useMemo(() => filas.filter((f) => f._pagado).reduce((sum, f) => sum + Number(f.importe_total_bruto ?? f.importe ?? f.importe_resultante ?? 0), 0), [filas]);
  const saldoLiquidacion = Math.round((importeInicial - totalPagado) * 100) / 100;

  // Liquidar es una pantalla de consulta: los datos maestros y los movimientos
  // proceden de sus módulos de origen y nunca se escriben desde este modal.
  const guardar = async () => {
    setGuardando(true); setError(""); setMensaje("");
    try {
      const id = expediente?.id ?? expediente?.id_expediente;
      if (!id) throw new Error("No se ha identificado el expediente.");
      setMensaje("Datos enlazados revisados. No se han modificado datos del expediente ni movimientos económicos.");
      return true;
    } catch (e) {
      setError(e?.message || "No se han podido validar los datos de liquidación.");
      return false;
    } finally { setGuardando(false); }
  };
  const generarCierreDocumental = async () => {
    const id = expediente?.id_expediente ?? expediente?.id;
    if (!id) throw new Error("No se ha identificado el expediente para generar el cierre documental.");
    const ok = await guardar();
    if (!ok) return;
    setGenerandoCierreDocumental(true);
    try {
      const { data, headers } = await axios.post(`/expedientes/${encodeURIComponent(id)}/carpeta-digital/previsualizar-cierre-documental`, null, { responseType: "blob" });
      const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
      if (vistaPreviaUrl) URL.revokeObjectURL(vistaPreviaUrl);
      setVistaPreviaUrl(URL.createObjectURL(blob));
      let meta = {};
      try {
        const encoded = headers?.["x-cierre-metadata"];
        if (encoded) {
          const bytes = Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0));
          meta = JSON.parse(new TextDecoder().decode(bytes));
        }
      } catch { meta = {}; }
      setMetadataVistaPrevia(meta);
      setError("");
      return meta;
    } finally {
      setGenerandoCierreDocumental(false);
    }
  };
  const aceptarCierreDocumental = async () => {
    const id = expediente?.id_expediente ?? expediente?.id;
    if (!id || !vistaPreviaUrl || guardandoCierreDocumental) return;
    setGuardandoCierreDocumental(true);
    setError("");
    try {
      const blob = await fetch(vistaPreviaUrl).then((r) => {
        if (!r.ok) throw new Error("No se pudo recuperar el PDF previsualizado.");
        return r.blob();
      });
      const body = new FormData();
      body.append("archivo", new File([blob], `Expediente digital completo - ${id}.pdf`, { type: "application/pdf" }));
      const { data } = await axios.post(`/expedientes/${encodeURIComponent(id)}/carpeta-digital/guardar-cierre-documental`, body, { headers: { "Content-Type": "multipart/form-data" } });
      setCierreDocumental({ ...(metadataVistaPrevia || {}), documento: data, guardado: true, mensaje: "PDF aceptado y guardado en Expediente digital completo." });
      setVistaPreviaUrl((actual) => { if (actual) URL.revokeObjectURL(actual); return ""; });
      setMetadataVistaPrevia(null);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se ha podido guardar el PDF aceptado.");
    } finally {
      setGuardandoCierreDocumental(false);
    }
  };
  const cerrarVistaPrevia = () => {
    setVistaPreviaUrl((actual) => { if (actual) URL.revokeObjectURL(actual); return ""; });
    setMetadataVistaPrevia(null);
  };
  const confirmar = async () => {
    if (!cierreDocumental?.guardado) {
      setError("Primero genera el PDF, revísalo y pulsa «Aceptar y guardar en Carpeta digital».");
      return;
    }
    const ok = await guardar();
    if (!ok) return;
    try {
      setError("");
      await onConfirmarCierre?.();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se ha podido cerrar el expediente. Revisa los requisitos de cierre y la factura de honorarios.");
    }
  };
  const contenido = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="liquidar-expediente-titulo">
      <section className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-slate-50 shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · Cierre</p><h2 id="liquidar-expediente-titulo" className="mt-1 text-xl font-extrabold text-slate-900">Liquidar expediente</h2><p className="mt-1 text-xs text-slate-500">Expediente {expediente?.id_expediente || expediente?.id || "—"}. Revisar y guardar no cierra el expediente.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg leading-none text-slate-600 hover:bg-slate-100" aria-label="Cerrar modal">×</button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(error)}</p>}
          {mensaje && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mensaje}</p>}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-extrabold text-slate-800">Tipo de documento</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Tipo de documento (enlazado con Envío a notario)
                <input value={form.tipo_documento || ""} readOnly aria-readonly="true" className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-600" />
              </label>
              <label className="text-xs font-bold text-slate-600">ID del documento
                <input value={valor(expediente, "id_documento", "id_documento_notarial", "numero_documento") || "Se conserva el identificador existente"} readOnly className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-600" />
              </label>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-slate-800">Provisión y movimientos</h3><span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-800">Provisión inicial: {dinero(importeInicial)}</span></div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Tipo de documento / movimiento</th><th className="px-3 py-2 text-right">Importe</th><th className="px-3 py-2">Pago realizado</th></tr></thead>
                <tbody>
                  <tr className="border-t border-slate-100"><td className="px-3 py-2">—</td><td className="px-3 py-2 font-bold">Provisión de fondos inicial</td><td className="px-3 py-2 text-right font-bold">{dinero(importeInicial)}</td><td className="px-3 py-2 text-slate-500">Provisión registrada</td></tr>
                  {filas.map((fila, idx) => <tr key={fila.id || idx} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2">{String(fila.fecha_pago || fila.fecha || fila.fecha_factura || "").slice(0,10) || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{fila._tipo}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{dinero(fila.importe_total_bruto ?? fila.importe ?? fila.importe_resultante)}</td>
                    <td className="px-3 py-2"><span className={fila._pagado ? "font-bold text-emerald-700" : "font-semibold text-amber-700"}>{fila._pagado ? "Pagado" : "Pendiente · registrar desde Pagar"}</span></td>
                  </tr>)}
                  <tr className="border-t-2 border-indigo-200 bg-indigo-50/60"><td className="whitespace-nowrap px-3 py-2 text-slate-600">{form.fecha_fin_actividad || "—"}</td><td className="px-3 py-2 font-extrabold text-indigo-900">Liquidación final</td><td className="px-3 py-2 text-right font-extrabold text-indigo-900">{dinero(saldoLiquidacion)}</td><td className="px-3 py-2 text-slate-600">Saldo calculado</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">El saldo se calcula con pagos registrados. Para confirmar un pago, utiliza el botón Pagar de Gestión económica; este checklist no puede simular un movimiento.</p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-extrabold text-slate-800">Datos de facturación</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["facturacion_nombre","Nombre / razón social"],["facturacion_apellidos","Apellidos"],["facturacion_dni_nif","DNI / NIF"],["facturacion_direccion","Dirección"],["facturacion_codigo_postal","Código postal"],["facturacion_poblacion","Población"],["facturacion_provincia","Provincia"],["facturacion_telefono","Teléfono"],["facturacion_email","Email"],
              ].map(([campo, etiqueta]) => <label key={campo} className="text-xs font-bold text-slate-600">{etiqueta}<input value={form[campo] || ""} readOnly aria-readonly="true" className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal text-slate-600" /></label>)}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-extrabold text-slate-800">Checklist del expediente</h3>
            <p className="mb-3 text-xs text-slate-500">Se muestra la comprobación existente de la ficha; no se crea una lista paralela.</p>
            {checklist || <p className="text-xs text-amber-700">La checklist existente no está disponible en este momento.</p>}
          </section>
          <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-slate-900">📚 Cierre documental digital</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">Genera una vista previa sin guardar. Tras revisarla, pulsa «Aceptar y guardar en Carpeta digital» para registrar el PDF en Expediente digital completo. Orden: Hoja de liquidación, Factura notario, Factura registro, Factura Honorarios gestoría, Copia simple, Justificación de cancelación, AJD / ITP y Hoja de inscripción.</p>
                {cierreDocumental && <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${cierreDocumental.guardado ? "border-emerald-200 bg-white text-emerald-800" : "border-amber-200 bg-white text-amber-800"}`}>
                  <p className="font-extrabold">{cierreDocumental.mensaje || "PDF de cierre documental preparado."}</p>
                  <p className="mt-1">{Number(cierreDocumental.paginas || 0)} páginas · {Array.isArray(cierreDocumental.documentos_incluidos) ? cierreDocumental.documentos_incluidos.length : 0} documento(s).</p>
                  {Array.isArray(cierreDocumental.documentos_faltantes) && cierreDocumental.documentos_faltantes.length > 0 && <p className="mt-1">No encontrados: {cierreDocumental.documentos_faltantes.join(", ")}.</p>}
                </div>}
                {cierreDocumental?.guardado && <p className="mt-2 text-xs font-bold text-emerald-700">✓ PDF guardado en Carpeta digital → Expediente digital completo.</p>}
              </div>
              <button type="button" onClick={async () => { setError(""); try { await generarCierreDocumental(); } catch (e) { setError(e?.response?.data?.detail || e?.message || "No se ha podido generar la vista previa del PDF."); } }} disabled={generandoCierreDocumental || guardandoCierreDocumental || guardando || cargandoCierre} className="shrink-0 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-extrabold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50">
                {generandoCierreDocumental ? "Generando vista previa…" : cierreDocumental?.guardado ? "Generar nueva vista previa" : "Generar y previsualizar PDF"}
              </button>
            </div>
          </section>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cerrar sin liquidar</button>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={guardando} onClick={guardar} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-extrabold text-indigo-800 disabled:opacity-50">{guardando ? "Guardando…" : "Guardar liquidación"}</button><button type="button" disabled={guardando || cargandoCierre || !cierreDocumental?.guardado} onClick={confirmar} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50">{cargandoCierre ? "Validando cierre…" : !cierreDocumental?.guardado ? "Acepta el PDF para poder cerrar" : "Confirmar liquidación y cerrar expediente"}</button></div>
        </footer>
      </section>
    </div>
  );
  const vistaPrevia = vistaPreviaUrl ? (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="vista-previa-cierre-titulo">
      <section className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div><h2 id="vista-previa-cierre-titulo" className="text-base font-extrabold text-slate-900">Vista previa · Expediente digital completo</h2><p className="mt-1 text-xs text-slate-500">Aún no está guardado. Revísalo antes de aceptar.</p></div>
          <button type="button" onClick={cerrarVistaPrevia} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">Cancelar</button>
        </header>
        {metadataVistaPrevia?.documentos_faltantes?.length > 0 && <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">Faltan documentos: {metadataVistaPrevia.documentos_faltantes.join(", ")}. Puedes revisar el PDF, pero comprueba si quieres aceptarlo incompleto.</p>}
        <iframe title="Vista previa del PDF de cierre" src={vistaPreviaUrl} className="min-h-0 flex-1 bg-slate-100" />
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <p className="text-xs text-slate-500">{Number(metadataVistaPrevia?.paginas || 0)} páginas · {Array.isArray(metadataVistaPrevia?.documentos_incluidos) ? metadataVistaPrevia.documentos_incluidos.length : 0} documento(s)</p>
          <div className="flex gap-2"><button type="button" onClick={cerrarVistaPrevia} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancelar</button><button type="button" onClick={aceptarCierreDocumental} disabled={guardandoCierreDocumental} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50">{guardandoCierreDocumental ? "Guardando PDF…" : "Aceptar y guardar en Carpeta digital"}</button></div>
        </footer>
      </section>
    </div>
  ) : null;
  return typeof document !== "undefined" ? createPortal(<>{contenido}{vistaPrevia}</>, document.body) : contenido;
}
