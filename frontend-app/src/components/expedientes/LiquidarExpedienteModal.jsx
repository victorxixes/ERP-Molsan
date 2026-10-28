import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "../../api/axios";
import "../../css/ModalesOperativosPremium.css";

const fechaHoy = () => new Date().toISOString().slice(0, 10);
const dinero = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString("es-ES", { style: "currency", currency: "EUR" })
    : "—";
};
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

  const cambiar = (campo, dato) => setForm((actual) => ({ ...actual, [campo]: dato }));
  const guardar = async () => {
    setGuardando(true); setError(""); setMensaje("");
    try {
      const id = expediente?.id ?? expediente?.id_expediente;
      if (!id) throw new Error("No se ha identificado el expediente.");
      await axios.put(`/expedientes/${encodeURIComponent(id)}/actividad`, { campos: form });
      for (const fila of filas) {
        if (!fila.id) continue;
        const actual = movimientos.find((g) => String(g.id) === String(fila.id));
        if (actual && (String(actual.tipo || actual.descripcion || "Gasto") !== fila._tipo || Boolean(["pagado", "realizado", "abonado", "paid"].includes(String(actual.estado_pago || "").toLowerCase())) !== fila._pagado)) {
          await axios.put(`/expedientes/${encodeURIComponent(id)}/gastos/${encodeURIComponent(fila.id)}`, {
            tipo: fila._tipo,
            estado_pago: fila._pagado ? "Pagado" : "Pendiente",
            ...(fila._pagado && !fila.fecha_pago ? { fecha_pago: fechaHoy() } : {}),
          });
        }
      }
      setMensaje("Datos de facturación y movimientos guardados.");
      return true;
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se pudieron guardar los datos de liquidación.");
      return false;
    } finally { setGuardando(false); }
  };
  const confirmar = async () => {
    const ok = await guardar();
    if (ok) await onConfirmarCierre?.();
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
                <input value={form.tipo_documento || ""} onChange={(e) => cambiar("tipo_documento", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
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
                    <td className="px-3 py-2"><input aria-label="Tipo de documento o movimiento" value={fila._tipo} onChange={(e) => setFilas((prev) => prev.map((f, i) => i === idx ? { ...f, _tipo: e.target.value } : f))} className="w-full rounded-md border border-slate-300 px-2 py-1.5" /></td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{dinero(fila.importe_total_bruto ?? fila.importe ?? fila.importe_resultante)}</td>
                    <td className="px-3 py-2"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={fila._pagado} onChange={(e) => setFilas((prev) => prev.map((f, i) => i === idx ? { ...f, _pagado: e.target.checked } : f))} />{fila._pagado ? "Realizado" : "Pendiente"}</label></td>
                  </tr>)}
                  <tr className="border-t-2 border-indigo-200 bg-indigo-50/60"><td className="px-3 py-2"><input aria-label="Fecha de liquidación" type="date" defaultValue={fechaHoy()} className="rounded-md border border-slate-300 bg-white px-2 py-1.5" /></td><td className="px-3 py-2 font-extrabold text-indigo-900">Liquidación final</td><td className="px-3 py-2 text-right font-extrabold text-indigo-900">{dinero(saldoLiquidacion)}</td><td className="px-3 py-2 text-slate-600">Saldo calculado</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">El saldo se calcula como provisión inicial menos los movimientos marcados como pagados. Los cambios de tipo y estado se guardan al pulsar Guardar liquidación.</p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-extrabold text-slate-800">Datos de facturación</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["facturacion_nombre","Nombre / razón social"],["facturacion_apellidos","Apellidos"],["facturacion_dni_nif","DNI / NIF"],["facturacion_direccion","Dirección"],["facturacion_codigo_postal","Código postal"],["facturacion_poblacion","Población"],["facturacion_provincia","Provincia"],["facturacion_telefono","Teléfono"],["facturacion_email","Email"],
              ].map(([campo, etiqueta]) => <label key={campo} className="text-xs font-bold text-slate-600">{etiqueta}<input value={form[campo] || ""} onChange={(e) => cambiar(campo, e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" /></label>)}
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-extrabold text-slate-800">Checklist del expediente</h3>
            <p className="mb-3 text-xs text-slate-500">Se muestra la comprobación existente de la ficha; no se crea una lista paralela.</p>
            {checklist || <p className="text-xs text-amber-700">La checklist existente no está disponible en este momento.</p>}
          </section>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cerrar sin liquidar</button>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={guardando} onClick={guardar} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-extrabold text-indigo-800 disabled:opacity-50">{guardando ? "Guardando…" : "Guardar liquidación"}</button><button type="button" disabled={guardando || cargandoCierre} onClick={confirmar} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50">{cargandoCierre ? "Validando cierre…" : "Confirmar liquidación y cerrar expediente"}</button></div>
        </footer>
      </section>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(contenido, document.body) : contenido;
}
