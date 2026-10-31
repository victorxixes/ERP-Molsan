import { useCallback, useEffect, useRef, useState } from "react";
import axios from "../../api/axios";
import useAccessibleDialog from "../ui/useAccessibleDialog";

const hoy = () => new Date().toISOString().slice(0, 10);
const importe = (valor) => {
  const numero = Number(valor ?? 0);
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number.isFinite(numero) ? numero : 0);
};
const numero = (valor) => (valor === "" || valor === null || valor === undefined ? 0 : Number(valor));
const nuevaFinca = () => ({ finca: "", cru_idufir: "", registro_propiedad_id: "", registro_propiedad: "", provincia: "", poblacion: "", seccion: "" });
const nuevaOperacion = () => ({ entidad: "", numero_prestamo: "", capital: "0", aplicar_tarifa: true, tarifa_id: null, honorarios_base: "0", honorarios: "0", suplidos: "0", gastos_registro: "0", otros_gastos: "0", notaria: "0", impuestos: "0", ajustes_motivo: "", condonar_honorarios: false, importe_manual: "", observaciones: "", fincas: [nuevaFinca()] });
const nuevoFormulario = (tipo = "provision") => ({ tipo, fecha: hoy(), observaciones: "", operaciones: [nuevaOperacion()] });
const nuevaTarifa = () => ({ tipo: "provision", entidad: "*", capital_minimo: "0", capital_maximo: "", honorarios: "0", suplidos: "0", gastos_registro: "0", otros_gastos: "0" });
const clsInput = "mt-1 w-full px-3 py-2";
const clsLabel = "block";
const clsBoton = "inline-flex items-center justify-center px-3 py-2";

function Campo({ label, value, onChange, type = "text", placeholder = "", min, step, required = false, disabled = false }) {
  return <label className={clsLabel}>{label}<input className={clsInput} value={value ?? ""} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} min={min} step={step} required={required} disabled={disabled} /></label>;
}

function Selector({ label, value, onChange, children, required = false }) {
  return <label className={clsLabel}>{label}<select className={clsInput} value={value ?? ""} onChange={(e) => onChange(e.target.value)} required={required}>{children}</select></label>;
}

export default function ProvisionesModal({ idExpediente, onClose }) {
  const [vista, setVista] = useState("historial");
  const [provisiones, setProvisiones] = useState([]);
  const [tarifas, setTarifas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [fincasExpediente, setFincasExpediente] = useState([]);
  const [expediente, setExpediente] = useState(null);
  const [form, setForm] = useState(nuevoFormulario());
  const [provisionEditando, setProvisionEditando] = useState(null);
  const [tarifaForm, setTarifaForm] = useState(nuevaTarifa());
  const [tarifaEditando, setTarifaEditando] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [mostrarTarifasInactivas, setMostrarTarifasInactivas] = useState(false);
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: true, onClose, dialogRef });

  const rutaExp = `/expedientes/${encodeURIComponent(idExpediente)}`;
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError("");
    const resultados = await Promise.allSettled([
      axios.get(`${rutaExp}/provisiones`),
      axios.get(`/expedientes/provisiones/tarifas`, { params: { incluir_inactivas: mostrarTarifasInactivas } }),
      axios.get(`/expedientes/provisiones/tarifas/catalogo-registros`),
      axios.get(rutaExp),
      axios.get(`${rutaExp}/fincas`),
    ]);
    if (resultados[0].status === "fulfilled") setProvisiones(resultados[0].value?.data?.items || []);
    else setError(resultados[0].reason?.response?.data?.detail || "No se pudo cargar el histórico de provisiones.");
    if (resultados[1].status === "fulfilled") setTarifas(Array.isArray(resultados[1].value?.data) ? resultados[1].value.data : []);
    const registrosCargados = resultados[2].status === "fulfilled" && Array.isArray(resultados[2].value?.data) ? resultados[2].value.data : [];
    if (resultados[2].status === "fulfilled") setRegistros(registrosCargados);
    if (resultados[4].status === "fulfilled") {
      const lista = resultados[4].value?.data?.items || [];
      const normalizar = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
      setFincasExpediente(lista.map((f) => {
        const nombreRegistro = f.registro || f.registro_propiedad || "";
        const clave = normalizar(nombreRegistro);
        const registro = registrosCargados.find((r) => normalizar(r.registro_propiedad) === clave || (clave && (normalizar(r.registro_propiedad).includes(clave) || clave.includes(normalizar(r.registro_propiedad)))));
        return { ...nuevaFinca(), finca: f.finca || "", cru_idufir: f.cru_idufir || "", registro_propiedad_id: registro ? String(registro.id) : "", registro_propiedad: registro?.registro_propiedad || nombreRegistro, provincia: f.provincia || registro?.provincia || "", poblacion: f.poblacion || registro?.poblacion || "", seccion: f.seccion || "" };
      }));
    }
    if (resultados[3].status === "fulfilled") {
      const value = resultados[3].value?.data;
      setExpediente(value?.expediente || value?.item || value || null);
    }
    setLoading(false);
  }, [rutaExp, mostrarTarifasInactivas]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  function crearNuevo(tipo = "provision") {
    setProvisionEditando(null);
    const nuevo = nuevoFormulario(tipo);
    if (fincasExpediente.length) nuevo.operaciones[0].fincas = fincasExpediente.map((f) => ({ ...f }));
    setForm(nuevo);
    setAviso(""); setError(""); setVista("formulario");
  }

  function editarProvision(item) {
    setProvisionEditando(item.id);
    setForm({
      tipo: item.tipo || "provision",
      fecha: String(item.fecha || hoy()).slice(0, 10),
      observaciones: item.observaciones || "",
      operaciones: (item.operaciones || []).map((op) => ({
        entidad: op.entidad || "", numero_prestamo: op.numero_prestamo || "", capital: String(op.capital ?? 0),
        aplicar_tarifa: op.aplicar_tarifa !== false, tarifa_id: op.tarifa_id || null,
        honorarios_base: String(op.honorarios_base ?? op.honorarios ?? 0), honorarios: String(op.honorarios ?? 0),
        suplidos: String(op.suplidos ?? 0), gastos_registro: String(op.gastos_registro ?? 0), otros_gastos: String(op.otros_gastos ?? 0),
        notaria: String(op.notaria ?? 0), impuestos: String(op.impuestos ?? 0), ajustes_motivo: op.ajustes_motivo || "",
        condonar_honorarios: Boolean(op.condonar_honorarios), importe_manual: op.importe_manual == null ? "" : String(op.importe_manual),
        observaciones: op.observaciones || "", fincas: (op.fincas || []).length ? op.fincas.map((f) => ({ ...nuevaFinca(), ...f, registro_propiedad_id: f.registro_propiedad_id ? String(f.registro_propiedad_id) : "" })) : [nuevaFinca()],
      })),
    });
    setError(""); setAviso(""); setVista("formulario");
  }

  function cambiarOperacion(index, campo, valor) {
    setForm((actual) => ({ ...actual, operaciones: actual.operaciones.map((op, i) => i === index ? { ...op, [campo]: valor } : op) }));
  }
  function cambiarFinca(indexOp, indexFinca, campo, valor) {
    setForm((actual) => ({ ...actual, operaciones: actual.operaciones.map((op, i) => i !== indexOp ? op : ({ ...op, fincas: op.fincas.map((f, j) => j !== indexFinca ? f : ({ ...f, [campo]: valor })) })) }));
  }
  function cambiarRegistro(indexOp, indexFinca, value) {
    const selected = registros.find((r) => String(r.id) === String(value));
    setForm((actual) => ({ ...actual, operaciones: actual.operaciones.map((op, i) => i !== indexOp ? op : ({ ...op, fincas: op.fincas.map((f, j) => j !== indexFinca ? f : ({ ...f, registro_propiedad_id: value, registro_propiedad: selected?.registro_propiedad || "", provincia: selected?.provincia || f.provincia || "", poblacion: selected?.poblacion || f.poblacion || "" })) })) }));
  }

  async function calcularTarifa(index) {
    setError(""); setAviso("");
    const op = form.operaciones[index];
    if (!op.entidad.trim()) { setError(`Indica la entidad bancaria de la operación ${index + 1}.`); return; }
    try {
      const res = await axios.post("/expedientes/provisiones/tarifas/calcular", { tipo: form.tipo, entidad: op.entidad, capital: numero(op.capital), condonar_honorarios: op.condonar_honorarios });
      const t = res.data?.tarifa;
      cambiarOperacion(index, "tarifa_id", t?.id || null);
      for (const field of ["honorarios_base", "honorarios", "suplidos", "gastos_registro", "otros_gastos"]) cambiarOperacion(index, field, String(res.data?.[field] ?? t?.[field] ?? 0));
      cambiarOperacion(index, "aplicar_tarifa", true);
      cambiarOperacion(index, "importe_manual", "");
      setAviso(`Tarifa aplicada a la operación ${index + 1}. Total estimado: ${importe(res.data?.total_calculado)}.`);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se encontró una tarifa; puedes desactivar la tarifa y rellenar los importes manualmente.");
    }
  }

  async function guardarProvision(e) {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    try {
      const payload = {
        tipo: form.tipo, fecha: form.fecha, observaciones: form.observaciones || null,
        operaciones: form.operaciones.map((op) => ({
          ...op, capital: numero(op.capital), tarifa_id: op.tarifa_id || null,
          honorarios_base: numero(op.honorarios_base), honorarios: numero(op.honorarios), suplidos: numero(op.suplidos),
          gastos_registro: numero(op.gastos_registro), otros_gastos: numero(op.otros_gastos),
          notaria: numero(op.notaria), impuestos: numero(op.impuestos), ajustes_motivo: op.ajustes_motivo || null,
          importe_manual: op.importe_manual === "" ? null : numero(op.importe_manual),
          fincas: op.fincas.filter((f) => f.finca || f.cru_idufir || f.registro_propiedad_id || f.registro_propiedad || f.provincia || f.poblacion || f.seccion).map((f) => ({ ...f, registro_propiedad_id: f.registro_propiedad_id ? Number(f.registro_propiedad_id) : null })),
        })),
      };
      if (provisionEditando) await axios.put(`${rutaExp}/provisiones/${provisionEditando}`, payload);
      else await axios.post(`${rutaExp}/provisiones`, payload);
      setAviso("Registro guardado correctamente.");
      await cargarDatos();
      setVista("historial"); setProvisionEditando(null);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo guardar el registro.");
    } finally { setGuardando(false); }
  }

  async function anular(item) {
    if (!window.confirm(`¿Anular el registro #${item.id}? Se conservará en el histórico.`)) return;
    setError(""); setAviso("");
    try { await axios.delete(`${rutaExp}/provisiones/${item.id}`); setAviso(`Registro #${item.id} anulado.`); await cargarDatos(); }
    catch (err) { setError(err?.response?.data?.detail || "No se pudo anular el registro."); }
  }

  async function descargarPDF(item) {
    setError("");
    try {
      const response = await axios.get(`${rutaExp}/provisiones/${item.id}/documento`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const enlace = document.createElement("a"); enlace.href = url;
      enlace.download = `${item.tipo === "cancelacion" ? "cancelacion" : "provision"}_${idExpediente}_${item.id}.pdf`;
      document.body.appendChild(enlace); enlace.click(); enlace.remove(); window.URL.revokeObjectURL(url);
      await cargarDatos();
    } catch (err) { setError(err?.response?.data?.detail || "No se pudo generar el PDF."); }
  }

  function editarTarifa(item) {
    setTarifaEditando(item.id);
    setTarifaForm({ tipo: item.tipo, entidad: item.entidad, capital_minimo: String(item.capital_minimo ?? 0), capital_maximo: item.capital_maximo == null ? "" : String(item.capital_maximo), honorarios: String(item.honorarios ?? 0), suplidos: String(item.suplidos ?? 0), gastos_registro: String(item.gastos_registro ?? 0), otros_gastos: String(item.otros_gastos ?? 0) });
    setError(""); setAviso("");
  }

  async function guardarTarifa(e) {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    const payload = { ...tarifaForm, capital_minimo: numero(tarifaForm.capital_minimo), capital_maximo: tarifaForm.capital_maximo === "" ? null : numero(tarifaForm.capital_maximo), honorarios: numero(tarifaForm.honorarios), suplidos: numero(tarifaForm.suplidos), gastos_registro: numero(tarifaForm.gastos_registro), otros_gastos: numero(tarifaForm.otros_gastos) };
    try {
      if (tarifaEditando) await axios.put(`/expedientes/provisiones/tarifas/${tarifaEditando}`, payload);
      else await axios.post("/expedientes/provisiones/tarifas", payload);
      setAviso("Tarifa guardada correctamente."); setTarifaForm(nuevaTarifa()); setTarifaEditando(null);
      await cargarDatos();
    } catch (err) { setError(err?.response?.data?.detail || "No se pudo guardar la tarifa. Comprueba que tienes permisos de Seguridad."); }
    finally { setGuardando(false); }
  }

  async function desactivarTarifa(item) {
    if (!window.confirm(`¿Desactivar la tarifa #${item.id} (${item.entidad})?`)) return;
    setError(""); setAviso("");
    try { await axios.delete(`/expedientes/provisiones/tarifas/${item.id}`); setAviso("Tarifa desactivada."); await cargarDatos(); }
    catch (err) { setError(err?.response?.data?.detail || "No se pudo desactivar la tarifa."); }
  }

  const totalFormulario = form.operaciones.reduce((s, op) => s + (op.importe_manual !== "" && op.importe_manual != null ? numero(op.importe_manual) : (op.condonar_honorarios ? 0 : numero(op.honorarios)) + numero(op.suplidos) + numero(op.gastos_registro) + numero(op.otros_gastos) + numero(op.notaria) + numero(op.impuestos)), 0);
  const nombreTitular = expediente?.nombre_titular || expediente?.titular || "";

  return <div className="molsan-modal-overlay expediente-operativo-modal fixed inset-0 z-[100] flex items-stretch justify-center p-0 sm:items-center sm:p-4">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Provisiones y cancelaciones" className="molsan-modal__panel flex max-h-screen w-full max-w-6xl flex-col overflow-hidden sm:max-h-[94vh]">
      <header className="molsan-modal__header flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div><p className="uppercase">ERP · Expedientes</p><h2 className="mt-1">Provisiones de fondos y cancelaciones</h2><p className="mt-1">Expediente {idExpediente}{nombreTitular ? ` · ${nombreTitular}` : ""}</p></div>
        <button type="button" className="px-3 py-2" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <nav className="flex flex-wrap gap-2 px-4 py-3 sm:px-6">
        <button type="button" className={clsBoton} onClick={() => { setVista("historial"); setError(""); }}>Histórico</button>
        <button type="button" className={clsBoton} onClick={() => crearNuevo("provision")}>Nueva provisión</button>
        <button type="button" className={clsBoton} onClick={() => crearNuevo("cancelacion")}>Nueva cancelación</button>
        <button type="button" className={clsBoton} onClick={() => { setVista("tarifas"); setError(""); setAviso(""); }}>Gestionar tarifas</button>
      </nav>
      <div className="molsan-modal__body flex-1 overflow-y-auto p-4 sm:p-6">
        {error && <div className="mb-4 px-4 py-3">{String(error)}</div>}
        {aviso && <div className="mb-4 px-4 py-3">{aviso}</div>}
        {loading && <p className="py-8">Cargando información…</p>}

        {!loading && vista === "historial" && <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3>Registros guardados</h3><p>Se conservan los anulados en el histórico.</p></div><span className="px-3 py-1">{provisiones.length} registros</span></div>
          {provisiones.length === 0 && <div className="p-8">Todavía no hay provisiones ni cancelaciones vinculadas a este expediente.</div>}
          {provisiones.map((item) => <article key={item.id} className="p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong>#{item.id} · {item.tipo === "cancelacion" ? "Cancelación hipotecaria" : "Provisión de fondos"}</strong><span className={`px-2 py-1 ${item.estado === "anulada" ? "" : item.estado === "generada" ? "" : ""}`}>{item.estado}</span></div><p className="mt-1">Fecha: {item.fecha || "—"} · {(item.operaciones || []).length} operación(es)</p><p className="mt-1">{importe(item.importe_total)}</p>{item.observaciones && <p className="mt-1 max-w-2xl">{item.observaciones}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" className={`${clsBoton}`} onClick={() => descargarPDF(item)}>Generar PDF</button>{item.estado !== "anulada" && <><button type="button" className={`${clsBoton}`} onClick={() => editarProvision(item)}>Editar</button><button type="button" className={`${clsBoton}`} onClick={() => anular(item)}>Anular</button></>}</div></div>{(item.operaciones || []).length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{item.operaciones.map((op) => <div key={op.id} className="px-3 py-2"><div>{op.entidad} {op.numero_prestamo ? `· Préstamo ${op.numero_prestamo}` : ""}</div><div>Capital: {importe(op.capital)} · Total: <b>{importe(op.total)}</b></div><div>{(op.fincas || []).map((f) => f.finca || f.registro_propiedad).filter(Boolean).join(" · ")}</div></div>)}</div>}</article>)}
        </div>}

        {!loading && vista === "formulario" && <form className="space-y-5" onSubmit={guardarProvision}>
          <div className="grid gap-4 p-4 md:grid-cols-3"><Selector label="Tipo de gestión" value={form.tipo} onChange={(v) => setForm((x) => ({ ...x, tipo: v }))}><option value="provision">Provisión de fondos</option><option value="cancelacion">Cancelación hipotecaria</option></Selector><Campo label="Fecha" value={form.fecha} type="date" onChange={(v) => setForm((x) => ({ ...x, fecha: v }))} required /><Campo label="Observaciones generales" value={form.observaciones} onChange={(v) => setForm((x) => ({ ...x, observaciones: v }))} placeholder="Notas del expediente" /></div>
          {form.operaciones.map((op, i) => <article key={i} className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3>Préstamo / operación {i + 1}</h3>{form.operaciones.length > 1 && <button type="button" className={`${clsBoton}`} onClick={() => setForm((x) => ({ ...x, operaciones: x.operaciones.filter((_, j) => j !== i) }))}>Eliminar operación</button>}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Campo label="Entidad bancaria" value={op.entidad} onChange={(v) => cambiarOperacion(i, "entidad", v)} required placeholder="Nombre entidad" /><Campo label="N.º préstamo / contrato" value={op.numero_prestamo} onChange={(v) => cambiarOperacion(i, "numero_prestamo", v)} /><Campo label="Capital del préstamo (€)" value={op.capital} onChange={(v) => cambiarOperacion(i, "capital", v)} type="number" min="0" step="0.01" /><label className={`${clsLabel} flex items-center gap-2 pt-5`}><input type="checkbox" checked={op.aplicar_tarifa} onChange={(e) => { const checked = e.target.checked; cambiarOperacion(i, "aplicar_tarifa", checked); if (!checked) cambiarOperacion(i, "tarifa_id", null); }} /> Aplicar tarifa configurada</label></div>
            {op.aplicar_tarifa && <div className="flex flex-wrap items-center gap-3 p-3"><button type="button" className={`${clsBoton}`} onClick={() => calcularTarifa(i)}>Calcular tarifa</button><span>{op.tarifa_id ? `Tarifa #${op.tarifa_id} aplicada` : "Busca el tramo por entidad y capital."}</span><label className="flex items-center gap-2"><input type="checkbox" checked={op.condonar_honorarios} onChange={(e) => { const value = e.target.checked; cambiarOperacion(i, "condonar_honorarios", value); if (value) cambiarOperacion(i, "honorarios", "0"); else if (op.honorarios_base) cambiarOperacion(i, "honorarios", String(op.honorarios_base)); }} /> Condonar honorarios</label></div>}
            {!op.aplicar_tarifa && <div className="px-3 py-2">Los importes de esta operación se introducen manualmente.</div>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Campo label="Honorarios (€)" value={op.honorarios} onChange={(v) => cambiarOperacion(i, "honorarios", v)} type="number" min="0" step="0.01" /><Campo label="Notaría (€)" value={op.notaria} onChange={(v) => cambiarOperacion(i, "notaria", v)} type="number" min="0" step="0.01" /><Campo label="Registro (€)" value={op.gastos_registro} onChange={(v) => cambiarOperacion(i, "gastos_registro", v)} type="number" min="0" step="0.01" /><Campo label="Impuestos (€)" value={op.impuestos} onChange={(v) => cambiarOperacion(i, "impuestos", v)} type="number" min="0" step="0.01" /><Campo label="Suplidos (€)" value={op.suplidos} onChange={(v) => cambiarOperacion(i, "suplidos", v)} type="number" min="0" step="0.01" /><Campo label="Otros gastos (€)" value={op.otros_gastos} onChange={(v) => cambiarOperacion(i, "otros_gastos", v)} type="number" min="0" step="0.01" /><Campo label="Total manual (€), opcional" value={op.importe_manual} onChange={(v) => cambiarOperacion(i, "importe_manual", v)} type="number" min="0" step="0.01" placeholder="Automático" /></div>
            <div className="p-3"><p>Puedes ajustar los importes previstos de esta operación sin cambiar el catálogo general. Si modificas una tarifa, indica el motivo para que quede trazado.</p><Campo label="Motivo del ajuste (obligatorio si cambias importes de tarifa)" value={op.ajustes_motivo} onChange={(v) => cambiarOperacion(i, "ajustes_motivo", v)} placeholder="Ej.: particularidad registral, importe confirmado por notaría…" /></div>
            <Campo label="Observaciones de la operación" value={op.observaciones} onChange={(v) => cambiarOperacion(i, "observaciones", v)} />
            <div className="space-y-3 pt-4"><div className="flex items-center justify-between gap-2"><div><h4>Fincas y Registros</h4><p>Puedes añadir varias fincas a cada préstamo.</p></div><button type="button" className={`${clsBoton}`} onClick={() => cambiarOperacion(i, "fincas", [...op.fincas, nuevaFinca()])}>+ Añadir finca</button></div>
              {op.fincas.map((f, j) => <div key={j} className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4"><Campo label="Número de finca" value={f.finca} onChange={(v) => cambiarFinca(i, j, "finca", v)} /><Campo label="CRU / IDUFIR" value={f.cru_idufir} onChange={(v) => cambiarFinca(i, j, "cru_idufir", v)} /><Selector label="Registro de la Propiedad" value={f.registro_propiedad_id} onChange={(v) => cambiarRegistro(i, j, v)}><option value="">Seleccionar del catálogo…</option>{registros.map((r) => <option key={r.id} value={String(r.id)}>{r.registro_propiedad}{r.poblacion ? ` · ${r.poblacion}` : ""}{r.provincia ? ` (${r.provincia})` : ""}</option>)}</Selector><Campo label="Sección" value={f.seccion} onChange={(v) => cambiarFinca(i, j, "seccion", v)} /><Campo label="Población" value={f.poblacion} onChange={(v) => cambiarFinca(i, j, "poblacion", v)} /><Campo label="Provincia" value={f.provincia} onChange={(v) => cambiarFinca(i, j, "provincia", v)} />{op.fincas.length > 1 && <div className="flex items-end"><button type="button" className={`${clsBoton}`} onClick={() => cambiarOperacion(i, "fincas", op.fincas.filter((_, k) => k !== j))}>Quitar finca</button></div>}</div>)}
            </div><div className="flex justify-end px-4 py-3"><span>Total operación: <b className="ml-2">{importe(op.importe_manual !== "" && op.importe_manual != null ? numero(op.importe_manual) : (op.condonar_honorarios ? 0 : numero(op.honorarios)) + numero(op.suplidos) + numero(op.gastos_registro) + numero(op.otros_gastos) + numero(op.notaria) + numero(op.impuestos))}</b></span></div>
          </article>)}
          <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className={`${clsBoton}`} onClick={() => setForm((x) => ({ ...x, operaciones: [...x.operaciones, nuevaOperacion()] }))}>+ Añadir otro préstamo</button><div><div>Total general estimado</div><div>{importe(totalFormulario)}</div></div></div>
          <div className="flex flex-wrap justify-end gap-2 pt-4"><button type="button" className={`${clsBoton}`} onClick={() => { setVista("historial"); setProvisionEditando(null); setError(""); }}>Cancelar</button><button type="submit" disabled={guardando} className={`${clsBoton} px-5`}>{guardando ? "Guardando…" : provisionEditando ? "Guardar cambios" : "Guardar registro"}</button></div>
        </form>}

        {!loading && vista === "tarifas" && <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="space-y-4 p-4" onSubmit={guardarTarifa}><div><h3>{tarifaEditando ? `Editar tarifa #${tarifaEditando}` : "Nueva tarifa"}</h3><p>Configura los importes aprobados por entidad y tramo de capital. No se cargan tarifas inventadas.</p></div><Selector label="Tipo" value={tarifaForm.tipo} onChange={(v) => setTarifaForm((x) => ({ ...x, tipo: v }))}><option value="provision">Provisión de fondos</option><option value="cancelacion">Cancelación hipotecaria</option></Selector><Campo label="Entidad (usa * como tarifa general)" value={tarifaForm.entidad} onChange={(v) => setTarifaForm((x) => ({ ...x, entidad: v }))} required /><div className="grid grid-cols-2 gap-3"><Campo label="Capital mínimo (€)" type="number" min="0" step="0.01" value={tarifaForm.capital_minimo} onChange={(v) => setTarifaForm((x) => ({ ...x, capital_minimo: v }))} required /><Campo label="Capital máximo (€), vacío = sin límite" type="number" min="0" step="0.01" value={tarifaForm.capital_maximo} onChange={(v) => setTarifaForm((x) => ({ ...x, capital_maximo: v }))} /></div><div className="grid grid-cols-2 gap-3"><Campo label="Honorarios (€)" type="number" min="0" step="0.01" value={tarifaForm.honorarios} onChange={(v) => setTarifaForm((x) => ({ ...x, honorarios: v }))} /><Campo label="Suplidos (€)" type="number" min="0" step="0.01" value={tarifaForm.suplidos} onChange={(v) => setTarifaForm((x) => ({ ...x, suplidos: v }))} /><Campo label="Gastos de Registro (€)" type="number" min="0" step="0.01" value={tarifaForm.gastos_registro} onChange={(v) => setTarifaForm((x) => ({ ...x, gastos_registro: v }))} /><Campo label="Otros gastos (€)" type="number" min="0" step="0.01" value={tarifaForm.otros_gastos} onChange={(v) => setTarifaForm((x) => ({ ...x, otros_gastos: v }))} /></div><div className="flex flex-wrap gap-2"><button type="submit" disabled={guardando} className={`${clsBoton}`}>{guardando ? "Guardando…" : tarifaEditando ? "Guardar tarifa" : "Crear tarifa"}</button><button type="button" className={`${clsBoton}`} onClick={() => { setTarifaEditando(null); setTarifaForm(nuevaTarifa()); }}>Limpiar</button></div><p>Necesitas permiso de edición de Seguridad para crear, cambiar o desactivar tarifas.</p></form>
          <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3>Tarifario configurado</h3><label className="flex items-center gap-2"><input type="checkbox" checked={mostrarTarifasInactivas} onChange={(e) => setMostrarTarifasInactivas(e.target.checked)} /> Mostrar inactivas</label></div>{tarifas.length === 0 && <div className="p-6">No hay tarifas configuradas todavía.</div>}{tarifas.map((t) => <article key={t.id} className={`p-4 ${t.activo ? "" : ""}`}><div className="flex items-start justify-between gap-3"><div><div>{t.entidad === "*" ? "Tarifa general · todas las entidades" : t.entidad}</div><div className="mt-1">{t.tipo === "cancelacion" ? "Cancelación hipotecaria" : "Provisión de fondos"} · Capital {importe(t.capital_minimo)} a {t.capital_maximo == null ? "sin límite" : importe(t.capital_maximo)}</div><div className="mt-2">Honorarios {importe(t.honorarios)} · Suplidos {importe(t.suplidos)} · Registro {importe(t.gastos_registro)} · Otros {importe(t.otros_gastos)}</div>{!t.activo && <span className="mt-1 inline-block">INACTIVA</span>}</div>{t.activo && <div className="flex gap-2"><button type="button" className={`${clsBoton}`} onClick={() => editarTarifa(t)}>Editar</button><button type="button" className={`${clsBoton}`} onClick={() => desactivarTarifa(t)}>Desactivar</button></div>}</div></article>)}</div>
        </div>}
      </div>
      <footer className="molsan-modal__footer px-5 py-3 sm:px-6">Documento interno de estimación. Comprueba importes y criterios registrales antes de cursar la operación.</footer>
    </section>
  </div>;
}
