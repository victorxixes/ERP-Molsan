import { useEffect, useMemo, useRef, useState } from "react";
import useAccessibleDialog from "../ui/useAccessibleDialog";
import axios from "../../api/axios";


const ACTIVIDADES = [
  { key: "documentacion-previa", label: "Documentación general y previa" },
  { key: "sede-notarial", label: "Sede notarial" },
  { key: "sede-notarial-protocolo", label: "Sede notarial con protocolo" },
  { key: "gestion-economica", label: "Gestión económica" },
  { key: "liquidacion-impuestos", label: "Liquidación de impuestos" },
  { key: "tramitacion-inscripcion", label: "Tramitación inscripción" },
  { key: "defectos-registrales", label: "Defectos registrales" },
  { key: "facturacion-cierre", label: "Cierre del expediente" },
];

const COLUMNAS_INICIALES = {
  "documentacion-previa": ["id_expediente", "fecha_alta", "oficina", "estado_expediente", "nombre_solicitante", "nif_solicitante", "contrato", "capital", "tipo_operacion", "importe", "observaciones"],
  "sede-notarial": ["id_expediente", "estado_expediente", "actividad_actual", "fecha_envio_notario", "fecha_envio", "fecha_prevista_firma", "apoderado", "tipo_documento", "poblacion", "provincia", "tipo_firma"],
  "sede-notarial-protocolo": ["id_expediente", "estado_expediente", "fecha_envio", "fecha_firma", "protocolo", "nombre_notario", "asiento_presentacion_libro_diario", "fecha_presentacion", "numero_entrada", "fecha_recogida_notario_presentacion_telematica"],
  "gestion-economica": ["id_expediente", "estado_expediente", "actividad_actual", "contrato", "capital", "importe", "finca", "tipo_operacion", "subtipo_operacion", "num_solicitud_sia", "observaciones"],
  "liquidacion-impuestos": ["id_expediente", "estado_expediente", "fecha_firma", "fecha_presentacion_tributaria", "fecha_liquidacion_tributaria", "oficina_liquidadora", "base_imponible", "tributacion", "impuesto_ajd_itp"],
  "tramitacion-inscripcion": ["id_expediente", "estado_expediente", "fecha_presentacion", "fecha_vencimiento_asiento", "fecha_inscripcion", "finca", "observaciones"],
  "defectos-registrales": ["id_expediente", "estado_expediente", "falta_defecto", "tipo_error", "descripcion_error", "fecha_vencimiento", "fcierre_defecto", "observaciones"],
  "facturacion-cierre": ["id_expediente", "estado_expediente", "fecha_firma", "fecha_inscripcion", "facturacion_estado", "facturacion_fecha", "fecha_entregado_cliente", "fecha_fin_actividad", "saldo_real", "saldo_disponible"],
};

const REPOSITORIOS_INICIALES = {
  "documentacion-previa": ["documentos_absis", "hoja_encargo_firmada", "justificante_cancelacion", "nota_simple_registral", "borradores_escritura", "otra_documentacion", "emails_oficina", "otros_documentos"],
  "sede-notarial": [],
  "sede-notarial-protocolo": ["hoja_presentacion_documentos", "copia_simple_documentos"],
  "gestion-economica": ["factura_notarial_documentos", "factura_registral_documentos", "factura_impuestos_documentos", "honorarios_gestoria_documentos", "otros_documentos"],
  "liquidacion-impuestos": ["ajd_itp_documentos", "otros_impuestos_documentos"],
  "tramitacion-inscripcion": ["hoja_inscripcion_documentos", "factura_registro_documentos"],
  "defectos-registrales": ["defecto_registral", "subsanacion_defecto"],
  "facturacion-cierre": ["expediente_digital_completo_documentos"],
};

const CLASE_INPUT = "w-full  px-3 py-2.5   ";

export default function VisibilidadTablas({ empleadoId, onClose, ambito = "administracion", modal = true, titulo }) {
  const [catalogo, setCatalogo] = useState({ columnas_excel: [], repositorios: [], configuraciones: [], configuraciones_administrativas: [] });
  const [actividadKey, setActividadKey] = useState(ACTIVIDADES[0].key);
  const [nombreTabla, setNombreTabla] = useState("");
  const [columnas, setColumnas] = useState([]);
  const [repositorios, setRepositorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busquedaColumna, setBusquedaColumna] = useState("");
  const dialogRef = useRef(null);

  useAccessibleDialog({ open: modal, onClose, dialogRef });

  useEffect(() => {
    let activo = true;
    axios.get("/expedientes/configuracion-visibilidad", { params: { empleado_id: empleadoId, ambito } })
      .then(({ data }) => {
        if (activo) setCatalogo({
          columnas_excel: data?.columnas_excel || [],
          repositorios: data?.repositorios || [],
          configuraciones: data?.configuraciones || [],
          configuraciones_administrativas: data?.configuraciones_administrativas || [],
        });
      })
      .catch((e) => {
        if (activo) setError(e?.response?.data?.detail || "No se pudo cargar el catálogo de visibilidad.");
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [empleadoId, ambito]);

  const configuracionActual = useMemo(
    () => catalogo.configuraciones.find((item) => item.actividad_key === actividadKey),
    [catalogo.configuraciones, actividadKey]
  );
  const actividad = ACTIVIDADES.find((item) => item.key === actividadKey) || ACTIVIDADES[0];
  const configuracionAdministrativa = catalogo.configuraciones_administrativas.find((item) => item.actividad_key === actividadKey);
  const columnasVisibles = useMemo(() => {
    if (ambito !== "personal" || !configuracionAdministrativa) return catalogo.columnas_excel;
    const permitidas = new Set(configuracionAdministrativa.excel_columns || []);
    return catalogo.columnas_excel.filter((item) => permitidas.has(item.key));
  }, [ambito, catalogo.columnas_excel, configuracionAdministrativa]);
  const repositoriosVisibles = useMemo(() => {
    if (ambito !== "personal" || !configuracionAdministrativa) return catalogo.repositorios;
    const permitidos = new Set(configuracionAdministrativa.repositorios || []);
    return catalogo.repositorios.filter((item) => permitidos.has(item.key));
  }, [ambito, catalogo.repositorios, configuracionAdministrativa]);

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
    return columnasVisibles.filter((item) => !q || item.label.toLocaleLowerCase("es").includes(q) || item.key.toLocaleLowerCase("es").includes(q));
  }, [columnasVisibles, busquedaColumna]);

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
        ambito,
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
    <div className={modal ? "erp-page molsan-modal-overlay fixed inset-0 z-[12000] flex items-center justify-center overflow-y-auto p-3 sm:p-6" : "erp-page w-full"} role={modal ? "presentation" : undefined}>
      <div ref={dialogRef} tabIndex={modal ? -1 : undefined} role={modal ? "dialog" : undefined} aria-modal={modal ? "true" : undefined} aria-label={titulo || "Visibilidad tablas"} className={modal ? "molsan-modal__panel flex max-h-[calc(100dvh-2rem)] w-full max-w-7xl flex-col overflow-hidden" : "mx-auto max-w-7xl overflow-hidden"}>
        <header className={modal ? "molsan-modal__header flex flex-wrap items-center gap-3" : "flex flex-wrap items-center gap-3 px-5 py-4"}>
          <div className="flex h-11 w-11 items-center justify-center">⚙️</div>
          <div className="min-w-0 flex-1">
            <h2>{titulo || (ambito === "personal" ? "Mi visibilidad de tablas" : "Visibilidad tablas")}</h2>
            <p>{ambito === "personal" ? "Personaliza tus preferencias sin modificar la configuración general." : `Empleado ID ${empleadoId ?? "actual"} · Columnas de Excel y repositorios de carpeta digital por actividad`}</p>
          </div>
          {modal && <button type="button" onClick={onClose} className="px-3 py-2">Cerrar ✕</button>}
        </header>

        <div className={modal ? "molsan-modal__body min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" : "space-y-5 p-4 sm:p-6"}>
          {error && <div className="px-4 py-3">{String(error)}</div>}
          {mensaje && <div className="px-4 py-3">{mensaje}</div>}
          {cargando ? <p className="py-12">Cargando configuración…</p> : (
            <>
              <section className="grid gap-4 p-4 md:grid-cols-[minmax(220px,0.7fr)_minmax(280px,1.3fr)]">
                <label className="block">
                  <span className="mb-1.5 block uppercase">Actividad</span>
                  <select value={actividadKey} onChange={(e) => setActividadKey(e.target.value)} className={CLASE_INPUT}>
                    {ACTIVIDADES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                  <span className="mt-2 block">Cada actividad conserva su propia configuración guardada.</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block uppercase">Nombre de la tabla Excel</span>
                  <input value={nombreTabla} onChange={(e) => setNombreTabla(e.target.value)} maxLength={200} className={CLASE_INPUT} placeholder="Nombre que aparecerá en la configuración" />
                  <span className="mt-2 block">Se utilizará como nombre descriptivo de la tabla configurada para esta actividad.</span>
                </label>
              </section>

              <section className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3>Columnas del Excel</h3>
                    <p className="mt-1">Marca las columnas y ordénalas con las flechas. La exportación de esta actividad respetará esta selección.</p>
                  </div>
                  <span className="px-3 py-1">{columnas.length} seleccionadas</span>
                </div>
                <input value={busquedaColumna} onChange={(e) => setBusquedaColumna(e.target.value)} className={CLASE_INPUT + "mb-3"} placeholder="Buscar columna Excel…" />
                <div className="grid max-h-[34vh] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                  {columnasFiltradas.map((item) => (
                    <label key={item.key} className={`flex items-center gap-2 px-3 py-2 ${columnas.includes(item.key) ? "" : ""}`}>
                      <input type="checkbox" checked={columnas.includes(item.key)} onChange={(e) => alternar(setColumnas, columnas, item.key, e.target.checked)} className="h-4 w-4" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setColumnas(columnasVisibles.map((item) => item.key))} className="px-3 py-2">Seleccionar todas</button>
                  <button type="button" onClick={() => setColumnas([])} className="px-3 py-2">Limpiar selección</button>
                </div>
                <div className="mt-4 pt-3">
                  <p className="mb-2 uppercase">Orden de las columnas seleccionadas</p>
                  <div className="flex flex-wrap gap-2">
                    {columnas.map((key, index) => {
                      const item = catalogo.columnas_excel.find((col) => col.key === key);
                      return <span key={key} className="inline-flex items-center gap-1 px-2 py-1">
                        {item?.label || key}
                        <button type="button" aria-label={`Mover ${key} arriba`} disabled={index === 0} onClick={() => setColumnas((actual) => { const next = [...actual]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="px-1">↑</button>
                        <button type="button" aria-label={`Mover ${key} abajo`} disabled={index === columnas.length - 1} onClick={() => setColumnas((actual) => { const next = [...actual]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="px-1">↓</button>
                      </span>;
                    })}
                  </div>
                </div>
              </section>

              <section className="p-4">
                <div className="mb-3">
                  <h3>Repositorios de la carpeta digital</h3>
                  <p className="mt-1">Selecciona las categorías que se mostrarán en el espacio de esta actividad. Los archivos almacenados no se borran ni se mueven.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {repositoriosVisibles.map((item) => (
                    <label key={item.key} className={`flex items-center gap-2 px-3 py-2 ${repositorios.includes(item.key) ? "" : ""}`}>
                      <input type="checkbox" checked={repositorios.includes(item.key)} onChange={(e) => alternar(setRepositorios, repositorios, item.key, e.target.checked)} className="h-4 w-4" />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </section>
              <footer className={modal ? "molsan-modal__footer flex flex-wrap items-center justify-between gap-3" : "flex flex-wrap items-center justify-between gap-3 pt-4"}>
                <p>{configuracionActual ? "Esta actividad ya tiene una configuración guardada." : "Se mostrarán valores iniciales hasta que guardes la configuración."}</p>
                <div className="flex gap-2">
                  {modal && <button type="button" onClick={onClose} className="erp-btn-secondary px-4 py-2.5">Cancelar</button>}
                  <button type="button" disabled={guardando} onClick={guardar} className="erp-btn-primary px-5 py-2.5">{guardando ? "Guardando…" : "Guardar configuración"}</button>
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
