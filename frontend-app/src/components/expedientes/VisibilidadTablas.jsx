import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

const ACTIVIDADES = [
  { key: "documentacion-previa", label: "Documentación previa" },
  { key: "sede-notarial", label: "Sede notarial" },
  { key: "sede-notarial-protocolo", label: "Sede notarial con protocolo" },
  { key: "liquidacion-impuestos", label: "Liquidación de impuestos" },
  { key: "tramitacion-inscripcion", label: "Tramitación inscripción" },
  { key: "defectos-registrales", label: "Defectos registrales" },
  { key: "facturacion-cierre", label: "Facturación y cierre" },
];

const COLUMNAS_INICIALES = {
  "documentacion-previa": ["id_expediente", "fecha_alta", "oficina", "estado_expediente", "nombre_solicitante", "nif_solicitante", "contrato", "capital", "tipo_operacion", "importe", "observaciones"],
  "sede-notarial": ["id_expediente", "estado_expediente", "actividad_actual", "fecha_envio_notario", "fecha_envio", "fecha_prevista_firma", "apoderado", "tipo_documento", "poblacion", "provincia", "tipo_firma"],
  "sede-notarial-protocolo": ["id_expediente", "estado_expediente", "fecha_envio", "fecha_firma", "protocolo", "nombre_notario", "asiento_presentacion_libro_diario", "fecha_presentacion", "numero_entrada", "fecha_recogida_notario_presentacion_telematica"],
  "liquidacion-impuestos": ["id_expediente", "estado_expediente", "fecha_firma", "fecha_presentacion_tributaria", "fecha_liquidacion_tributaria", "oficina_liquidadora", "base_imponible", "tributacion", "impuesto_ajd_itp"],
  "tramitacion-inscripcion": ["id_expediente", "estado_expediente", "fecha_presentacion", "fecha_vencimiento_asiento", "fecha_inscripcion", "finca", "observaciones"],
  "defectos-registrales": ["id_expediente", "estado_expediente", "falta_defecto", "tipo_error", "descripcion_error", "fecha_vencimiento", "fcierre_defecto", "observaciones"],
  "facturacion-cierre": ["id_expediente", "estado_expediente", "fecha_firma", "fecha_inscripcion", "facturacion_estado", "facturacion_fecha", "fecha_entregado_cliente", "fecha_fin_actividad", "saldo_real", "saldo_disponible"],
};

const REPOSITORIOS_INICIALES = {
  "documentacion-previa": ["documentos_absis", "hoja_encargo_firmada", "justificante_cancelacion", "nota_simple_registral"],
  "sede-notarial": ["borradores_escritura", "presentacion_registro_documentos", "copia_simple_documentos"],
  "sede-notarial-protocolo": ["borradores_escritura", "presentacion_registro_documentos", "copia_simple_documentos"],
  "liquidacion-impuestos": ["ajd_itp_documentos", "otros_impuestos_documentos"],
  "tramitacion-inscripcion": ["hoja_inscripcion_documentos", "documento_inscripcion_documentos"],
  "defectos-registrales": ["defecto_registral", "subsanacion_defecto"],
  "facturacion-cierre": ["escritura_digital_final_documentos", "documento_inscripcion_documentos", "expediente_digital_completo_documentos", "factura_notarial_documentos", "factura_registral_documentos", "factura_impuestos_documentos", "honorarios_gestoria_documentos", "otros_pagos_documentos"],
};

const CLASE_INPUT = "w-full rounded-xl border border-[var(--erp-border)] bg-white px-3 py-2.5 text-sm text-[var(--erp-text)] outline-none focus:border-[var(--erp-primary)] focus:ring-2 focus:ring-[var(--erp-primary-soft)]";

export default function VisibilidadTablas({ empleadoId, onClose }) {
  const [catalogo, setCatalogo] = useState({ columnas_excel: [], repositorios: [], configuraciones: [] });
  const [actividadKey, setActividadKey] = useState(ACTIVIDADES[0].key);
  const [nombreTabla, setNombreTabla] = useState("");
  const [columnas, setColumnas] = useState([]);
  const [repositorios, setRepositorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busquedaColumna, setBusquedaColumna] = useState("");

  useEffect(() => {
    let activo = true;
    axios.get("/expedientes/configuracion-visibilidad", { params: { empleado_id: empleadoId } })
      .then(({ data }) => {
        if (activo) setCatalogo({
          columnas_excel: data?.columnas_excel || [],
          repositorios: data?.repositorios || [],
          configuraciones: data?.configuraciones || [],
        });
      })
      .catch((e) => {
        if (activo) setError(e?.response?.data?.detail || "No se pudo cargar el catálogo de visibilidad.");
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [empleadoId]);

  const configuracionActual = useMemo(
    () => catalogo.configuraciones.find((item) => item.actividad_key === actividadKey),
    [catalogo.configuraciones, actividadKey]
  );
  const actividad = ACTIVIDADES.find((item) => item.key === actividadKey) || ACTIVIDADES[0];

  useEffect(() => {
    const columnasPermitidas = new Set(catalogo.columnas_excel.map((item) => item.key));
    if (configuracionActual) {
      setNombreTabla(configuracionActual.nombre_tabla || `Expedientes - ${actividad.label}`);
      setColumnas((Array.isArray(configuracionActual.excel_columns) ? configuracionActual.excel_columns : []).filter((key) => columnasPermitidas.has(key)));
      setRepositorios(Array.isArray(configuracionActual.repositorios) ? configuracionActual.repositorios : []);
    } else {
      setNombreTabla(`Expedientes - ${actividad.label}`);
      // Los valores iniciales deben pertenecer al catálogo real del backend; así el primer guardado no falla por claves ocultas/no admitidas.
      setColumnas((COLUMNAS_INICIALES[actividadKey] || []).filter((key) => columnasPermitidas.has(key)));
      setRepositorios(REPOSITORIOS_INICIALES[actividadKey] || []);
    }
    setError("");
    setMensaje("");
    setBusquedaColumna("");
  }, [actividadKey, configuracionActual, actividad.label, catalogo.columnas_excel]);

  const columnasFiltradas = useMemo(() => {
    const q = busquedaColumna.trim().toLocaleLowerCase("es");
    return catalogo.columnas_excel.filter((item) => !q || item.label.toLocaleLowerCase("es").includes(q) || item.key.toLocaleLowerCase("es").includes(q));
  }, [catalogo.columnas_excel, busquedaColumna]);

  function alternar(setter, actual, key, checked) {
    setter(checked ? [...actual, key] : actual.filter((item) => item !== key));
  }

  async function guardar() {
    if (!nombreTabla.trim()) {
      setError("Indica el nombre que tendrá la tabla Excel.");
      return;
    }
    if (!columnas.length) {
      setError("Selecciona al menos una columna para el Excel.");
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const { data } = await axios.put("/expedientes/configuracion-visibilidad", {
        empleado_id: empleadoId,
        actividad_key: actividadKey,
        nombre_tabla: nombreTabla.trim(),
        excel_columns: columnas,
        repositorios,
      });
      setCatalogo((actual) => ({
        ...actual,
        configuraciones: [
          ...actual.configuraciones.filter((item) => item.actividad_key !== actividadKey),
          { ...data, empleado_id: empleadoId, actividad_key: actividadKey, actividad_label: actividad.label },
        ],
      }));
      setMensaje(`Configuración de «${actividad.label}» guardada correctamente.`);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar la configuración. Comprueba tus permisos.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="erp-page fixed inset-0 z-[12000] overflow-y-auto bg-slate-900/40 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Visibilidad tablas">
      <div className="mx-auto my-2 max-w-7xl overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-bg)] shadow-[var(--erp-shadow-lg)]">
        <header className="flex flex-wrap items-center gap-3 bg-[var(--erp-primary)] px-5 py-4 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">⚙️</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold">Visibilidad tablas</h2>
            <p className="text-xs text-white/85">Empleado ID {empleadoId ?? "actual"} · Columnas de Excel y repositorios de carpeta digital por actividad</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">Cerrar ✕</button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{String(error)}</div>}
          {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</div>}
          {cargando ? <p className="py-12 text-center text-sm text-slate-500">Cargando configuración…</p> : (
            <>
              <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,0.7fr)_minmax(280px,1.3fr)]">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Actividad</span>
                  <select value={actividadKey} onChange={(e) => setActividadKey(e.target.value)} className={CLASE_INPUT}>
                    {ACTIVIDADES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                  <span className="mt-2 block text-xs text-slate-500">Cada actividad conserva su propia configuración guardada.</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Nombre de la tabla Excel</span>
                  <input value={nombreTabla} onChange={(e) => setNombreTabla(e.target.value)} maxLength={200} className={CLASE_INPUT} placeholder="Nombre que aparecerá en la configuración" />
                  <span className="mt-2 block text-xs text-slate-500">Se utilizará como nombre descriptivo de la tabla configurada para esta actividad.</span>
                </label>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Columnas del Excel</h3>
                    <p className="mt-1 text-xs text-slate-500">Marca las columnas y ordénalas con las flechas. La exportación de esta actividad respetará esta selección.</p>
                  </div>
                  <span className="rounded-full bg-[var(--erp-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--erp-primary-dark)]">{columnas.length} seleccionadas</span>
                </div>
                <input value={busquedaColumna} onChange={(e) => setBusquedaColumna(e.target.value)} className={CLASE_INPUT + " mb-3"} placeholder="Buscar columna Excel…" />
                <div className="grid max-h-[34vh] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                  {columnasFiltradas.map((item) => (
                    <label key={item.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${columnas.includes(item.key) ? "border-[var(--erp-primary)] bg-[var(--erp-primary-soft)] text-[var(--erp-primary-dark)]" : "border-slate-200 bg-white text-slate-600"}`}>
                      <input type="checkbox" checked={columnas.includes(item.key)} onChange={(e) => alternar(setColumnas, columnas, item.key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--erp-primary)]" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setColumnas(catalogo.columnas_excel.map((item) => item.key))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Seleccionar todas</button>
                  <button type="button" onClick={() => setColumnas([])} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Limpiar selección</button>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Orden de las columnas seleccionadas</p>
                  <div className="flex flex-wrap gap-2">
                    {columnas.map((key, index) => {
                      const item = catalogo.columnas_excel.find((col) => col.key === key);
                      return <span key={key} className="inline-flex items-center gap-1 rounded-lg border border-[var(--erp-border)] bg-[var(--erp-surface-soft)] px-2 py-1 text-xs text-[var(--erp-text)]">
                        {item?.label || key}
                        <button type="button" aria-label={`Mover ${key} arriba`} disabled={index === 0} onClick={() => setColumnas((actual) => { const next = [...actual]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="px-1 font-bold disabled:opacity-30">↑</button>
                        <button type="button" aria-label={`Mover ${key} abajo`} disabled={index === columnas.length - 1} onClick={() => setColumnas((actual) => { const next = [...actual]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="px-1 font-bold disabled:opacity-30">↓</button>
                      </span>;
                    })}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">Repositorios de la carpeta digital</h3>
                  <p className="mt-1 text-xs text-slate-500">Selecciona las categorías que se mostrarán en el espacio de esta actividad. Los archivos almacenados no se borran ni se mueven.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {catalogo.repositorios.map((item) => (
                    <label key={item.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${repositorios.includes(item.key) ? "border-[var(--erp-primary)] bg-[var(--erp-primary-soft)] text-[var(--erp-primary-dark)]" : "border-slate-200 bg-white text-slate-600"}`}>
                      <input type="checkbox" checked={repositorios.includes(item.key)} onChange={(e) => alternar(setRepositorios, repositorios, item.key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--erp-primary)]" />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </section>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-xs text-slate-500">{configuracionActual ? "Esta actividad ya tiene una configuración guardada." : "Se mostrarán valores iniciales hasta que guardes la configuración."}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={onClose} className="erp-btn-secondary rounded-xl px-4 py-2.5 text-sm font-bold">Cancelar</button>
                  <button type="button" disabled={guardando} onClick={guardar} className="erp-btn-primary rounded-xl px-5 py-2.5 text-sm font-extrabold shadow-sm disabled:cursor-wait disabled:opacity-60">{guardando ? "Guardando…" : "Guardar configuración"}</button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
