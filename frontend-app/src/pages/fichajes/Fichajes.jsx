import { useCallback, useEffect, useMemo, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";
import FichajesResumen from "./FichajesResumen.jsx";
import FestivosCompensaciones from "./FestivosCompensaciones.jsx";
import ControlFichajesAdmin from "./ControlFichajesAdmin.jsx";
import SolicitudesAusencia from "./SolicitudesAusencia.jsx";
import DocumentosAdmin from "./DocumentosAdmin.jsx";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

const TIPOS = [
  { value: "ENTRADA", label: "Entrada a trabajar", icon: "↗", tone: "emerald" },
  { value: "PAUSA_DESAYUNO_INICIO", label: "Pausa desayuno", icon: "☕", tone: "amber" },
  { value: "PAUSA_DESAYUNO_FIN", label: "Regreso desayuno", icon: "↩", tone: "blue" },
  { value: "PAUSA_COMIDA_INICIO", label: "Pausa comida", icon: "🍽️", tone: "sky" },
  { value: "PAUSA_COMIDA_FIN", label: "Regreso comida", icon: "↩", tone: "blue" },
  { value: "PAUSA_CIGARRILLO_INICIO", label: "Pausa cigarrillo", icon: "🚬", tone: "amber" },
  { value: "PAUSA_CIGARRILLO_FIN", label: "Regreso cigarrillo", icon: "🚬", tone: "blue" },
  { value: "AUSENCIA", label: "Registrar ausencia", icon: "📅", tone: "violet" },
  { value: "SALIDA", label: "Salida del trabajo", icon: "↙", tone: "rose" },
];
const TIPOS_DOCUMENTO = ["Justificante médico", "Vacaciones", "Ausencia", "Permiso", "Otro"];
const FECHA_HOY = new Date();

function fechaISO(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hora(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function fechaLarga(valor) {
  if (!valor) return "—";
  return new Date(valor).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}
function formatearTipo(tipo) {
  const etiquetas = { PAUSA_CAFE_INICIO: "Pausa desayuno", RETORNO_AUSENCIA: "Regreso de pausa / ausencia", AUSENCIA_PUNTUAL: "Registrar ausencia" };
  return TIPOS.find((t) => t.value === tipo)?.label || etiquetas[tipo] || tipo;
}
function inicioMes(fecha) { return new Date(fecha.getFullYear(), fecha.getMonth(), 1); }
function finMes(fecha) { return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0); }

export default function Fichajes({ modo = "empleado" }) {
  const [perfil, setPerfil] = useState(null);
  const [marcajes, setMarcajes] = useState([]);
  const [marcajesCalendario, setMarcajesCalendario] = useState([]);
  const [resumenCompensacion, setResumenCompensacion] = useState({ festivos: [], solicitudes: [] });
  const [documentos, setDocumentos] = useState([]);
  const [solicitudesAusencia, setSolicitudesAusencia] = useState([]);
  const [tiposAusencia, setTiposAusencia] = useState([]);
  const [tipoAusencia, setTipoAusencia] = useState("");
  const [mostrarSelectorAusencia, setMostrarSelectorAusencia] = useState(false);
  const [reloj, setReloj] = useState(new Date());
  const [empleados, setEmpleados] = useState([]);
  const [marcajesAdmin, setMarcajesAdmin] = useState([]);
  const [vacacionesAdmin, setVacacionesAdmin] = useState([]);
  const [documentosAdmin, setDocumentosAdmin] = useState([]);
  const [pestana, setPestana] = useState(modo === "admin" ? "control" : "resumen");
  const [mes, setMes] = useState(inicioMes(FECHA_HOY));
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState(fechaISO(new Date(FECHA_HOY.getFullYear(), FECHA_HOY.getMonth(), 1)));
  const [fechaHasta, setFechaHasta] = useState(fechaISO(FECHA_HOY));
  const [empleadoFiltro, setEmpleadoFiltro] = useState("");
  const [empleadoBolsaId, setEmpleadoBolsaId] = useState("");
  const [diasBolsa, setDiasBolsa] = useState("22");
  const [anioBolsa, setAnioBolsa] = useState(String(new Date().getFullYear()));
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [fechaDocumento, setFechaDocumento] = useState(fechaISO(FECHA_HOY));
  const [archivo, setArchivo] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const esAdminVista = modo === "admin";
  const recargarEmpleado = useCallback(async () => {
    const [p, m, d, ta, fc, sa] = await Promise.all([
      axios.get("/fichajes/mi-perfil"), axios.get("/fichajes/marcajes"),
      axios.get("/fichajes/documentos"), axios.get("/fichajes/catalogo-ausencias"),
      axios.get("/fichajes/compensaciones/resumen"), axios.get("/fichajes/solicitudes-ausencia"),
    ]);
    setPerfil(p.data);
    setMarcajes(Array.isArray(m.data) ? m.data : []);
    setDocumentos(Array.isArray(d.data) ? d.data : []);
    setTiposAusencia(Array.isArray(ta.data) ? ta.data : []);
    setResumenCompensacion(fc.data || { festivos: [], solicitudes: [] });
    setSolicitudesAusencia(Array.isArray(sa.data) ? sa.data : []);
  }, []);

  const recargarAdmin = useCallback(async () => {
    const [e, m, v, d] = await Promise.all([
      axios.get("/fichajes/admin/empleados"),
      axios.get("/fichajes/admin/marcajes", { params: { desde: fechaDesde || undefined, hasta: fechaHasta || undefined, empleado_id: empleadoFiltro || undefined } }),
      axios.get("/fichajes/admin/vacaciones", { params: { empleado_id: empleadoFiltro || undefined } }),
      axios.get("/fichajes/admin/documentos", { params: { desde: fechaDesde || undefined, hasta: fechaHasta || undefined, empleado_id: empleadoFiltro || undefined } }),
    ]);
    setEmpleados(Array.isArray(e.data) ? e.data : []);
    setMarcajesAdmin(Array.isArray(m.data) ? m.data : []);
    setVacacionesAdmin(Array.isArray(v.data) ? v.data : []);
    setDocumentosAdmin(Array.isArray(d.data) ? d.data : []);
  }, [fechaDesde, fechaHasta, empleadoFiltro]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError("");
    (esAdminVista ? recargarAdmin() : recargarEmpleado())
      .catch((e) => { if (vivo) setError(e?.response?.data?.detail || "No se ha podido cargar el módulo de fichajes."); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [esAdminVista, recargarAdmin, recargarEmpleado]);

  useEffect(() => {
    if (esAdminVista || pestana !== "calendario") return;
    let vivo = true;
    const desde = fechaISO(inicioMes(mes));
    const hasta = fechaISO(finMes(mes));
    axios.get("/fichajes/marcajes", { params: { desde, hasta } })
      .then((r) => { if (vivo) setMarcajesCalendario(Array.isArray(r.data) ? r.data : []); })
      .catch((e) => { if (vivo) setError(e?.response?.data?.detail || "No se pudieron cargar los marcajes de este mes."); });
    return () => { vivo = false; };
  }, [esAdminVista, pestana, mes, marcajes, fechaISO]);

  const marcajesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return marcajes.filter((m) => !q || [formatearTipo(m.tipo), m.observaciones, fechaLarga(m.fecha_hora), hora(m.fecha_hora)].some((v) => String(v || "").toLocaleLowerCase("es").includes(q)));
  }, [marcajes, busqueda]);

  const ordenMarcajes = useSortableData(marcajesFiltrados);
  const ordenVacaciones = useSortableData(vacacionesAdmin);

  const calendario = useMemo(() => {
    const primero = inicioMes(mes);
    const desplazamiento = (primero.getDay() + 6) % 7;
    const dias = finMes(mes).getDate();
    const celdas = Array.from({ length: desplazamiento }, () => null);
    for (let dia = 1; dia <= dias; dia += 1) celdas.push(new Date(mes.getFullYear(), mes.getMonth(), dia));
    while (celdas.length % 7) celdas.push(null);
    return celdas;
  }, [mes]);

  const porDia = useMemo(() => {
    const mapa = {};
    marcajesCalendario.forEach((m) => {
      const clave = fechaISO(m.fecha_hora);
      (mapa[clave] ||= []).push(m);
    });
    return mapa;
  }, [marcajesCalendario]);

  const ultimoMarcaje = marcajes[0] || null;
  useEffect(() => { const timer = window.setInterval(() => setReloj(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const enviarMarcaje = async (tipo) => {
    if (tipo === "AUSENCIA" && !tipoAusencia) { setError("Selecciona primero el tipo de ausencia."); return; }
    setGuardando(true); setError(""); setMensaje("");
    try {
      const data = new FormData();
      data.append("tipo", tipo);
      data.append("observaciones", observaciones);
      if (tipo === "AUSENCIA") data.append("tipo_ausencia", tipoAusencia);
      await axios.post("/fichajes/marcajes", data);
      setObservaciones("");
      if (tipo === "AUSENCIA") {
        const nombreAusenciaRegistrada = tipoAusencia;
        setMostrarSelectorAusencia(false);
        setTipoAusencia("");
        setMensaje(`Ausencia «${nombreAusenciaRegistrada}» registrada correctamente a las ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`);
      } else {
        setMensaje(`Marcaje de «${formatearTipo(tipo)}» registrado correctamente a las ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`);
      }
      try {
        await recargarEmpleado();
      } catch (actualizacionError) {
        setError("El marcaje se ha guardado, pero no se pudieron actualizar los datos de pantalla. Recarga la página para comprobarlo.");
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido registrar el marcaje.");
    } finally { setGuardando(false); }
  };

  const resolverVacaciones = async (solicitud, estado) => {
    const observacion = window.prompt(
      estado === "APROBADO" ? "Observaciones de aprobación (opcional):" : "Motivo del rechazo (recomendado):",
      ""
    );
    if (observacion === null) return;
    setGuardando(true); setError(""); setMensaje("");
    try {
      const data = new FormData();
      data.append("estado", estado);
      data.append("observaciones", observacion);
      await axios.patch(`/fichajes/admin/vacaciones/${solicitud.id}`, data);
      setMensaje(`Solicitud de vacaciones ${estado === "APROBADO" ? "aprobada" : "rechazada"}.`);
      await recargarAdmin();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo resolver la solicitud de vacaciones.");
    } finally { setGuardando(false); }
  };

  const subirDocumento = async (e) => {
    e.preventDefault();
    const formulario = e.currentTarget;
    if (!archivo) { setError("Selecciona el documento que quieres adjuntar."); return; }
    setGuardando(true); setError(""); setMensaje("");
    try {
      const data = new FormData();
      data.append("tipo_justificante", tipoDocumento);
      data.append("fecha_documento", fechaDocumento);
      data.append("archivo", archivo);
      await axios.post("/fichajes/documentos", data);
      setArchivo(null);
      formulario.reset();
      setMensaje("Documento guardado en tu historial.");
      await recargarEmpleado();
    } catch (err) {
      setError(err?.response?.data?.detail || "No se ha podido guardar el documento.");
    } finally { setGuardando(false); }
  };

  const descargar = async (doc) => {
    try {
      const r = await axios.get(`/fichajes/documentos/${doc.id}/descargar`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url; a.download = doc.nombre_archivo || "justificante";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setError(e?.response?.data?.detail || "No se ha podido descargar el documento."); }
  };

  const tabs = esAdminVista
    ? [{ id: "control", label: "Control de marcajes" }, { id: "solicitudes", label: "Solicitudes de vacaciones" }, { id: "ausenciasAdmin", label: "Solicitudes de ausencias" }, { id: "documentosAdmin", label: "Documentos y justificantes" }, { id: "compensaciones", label: "Festivos y compensaciones" }]
    : [{ id: "resumen", label: "Resumen de marcajes" }, { id: "calendario", label: "Calendario mensual" }, { id: "documentos", label: "Documentos" }, { id: "personal", label: "Información personal" }, { id: "ausencias", label: "Solicitudes de ausencia" }, { id: "compensaciones", label: "Festivos y compensaciones" }];

  return (
    <main className="erp-page w-full min-w-0 space-y-5">
      <MolsanPageHeader
        mark="FI"
        title={esAdminVista ? "Control de Fichajes" : "Fichajes"}
        description={esAdminVista ? "Supervisión de marcajes de la plantilla." : "Registro de jornada y gestión de justificantes personales."}
      />
      {!esAdminVista && perfil && <div className="molsan-panel mb-4 px-4 py-3"><p className="text-xs font-semibold uppercase">Empleado</p><p className="font-semibold">{perfil.nombre}</p><p className="text-sm">{perfil.usuario}</p></div>}

      {mensaje && <div role="status" className="px-4 py-3">{mensaje}</div>}
      {error && <div role="alert" className="px-4 py-3">{error}</div>}
      {cargando ? <div className="p-8">Cargando fichajes…</div> : (
        <>
          {!esAdminVista && (
            <section className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2>Jornada de hoy</h2><p className="mt-2 tabular-nums">{reloj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p><p>Hora local · reloj en tiempo real</p></div>
                <div className="px-3 py-2"><span>Último movimiento: </span><strong>{ultimoMarcaje ? formatearTipo(ultimoMarcaje.tipo) : "Sin marcajes hoy"}</strong>{ultimoMarcaje && <span className="ml-2">{hora(ultimoMarcaje.fecha_hora)}</span>}</div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {TIPOS.map((t) => (
                  <button key={t.value} type="button" disabled={guardando} onClick={() => t.value === "AUSENCIA" ? setMostrarSelectorAusencia(true) : enviarMarcaje(t.value)} className={`flex min-h-[94px] items-center gap-4 px-5 py-4 ${t.tone === "emerald" ? "" : t.tone === "rose" ? "" : t.tone === "amber" ? "" : t.tone === "violet" ? "" : t.tone === "blue" ? "" : ""}`}>
                    <span className="grid h-11 w-11 place-items-center">{t.icon}</span><span>{t.label}<span className="mt-1 block">Registrar ahora</span></span>
                  </button>
                ))}
              </div>
              {mostrarSelectorAusencia && <div className="mt-4 p-4"><label className="block">Selecciona el tipo de ausencia
                <select value={tipoAusencia} disabled={guardando || tiposAusencia.length === 0} onChange={(e) => { setTipoAusencia(e.target.value); setError(""); }} className="mt-2 w-full px-4 py-3">
                  <option value="">{tiposAusencia.length ? "Selecciona una ausencia…" : "No hay tipos de ausencia disponibles"}</option>
                  {tiposAusencia.map((x) => <option key={x.id} value={x.nombre}>{x.nombre}{x.requiere_justificante ? " · requiere justificante" : ""}</option>)}
                </select>
                {tiposAusencia.length === 0 && <p className="mt-2">No se ha podido cargar el catálogo de ausencias. Actualiza Fichajes o contacta con administración.</p>}
              </label><button type="button" disabled={guardando || !tipoAusencia || tiposAusencia.length === 0} onClick={() => enviarMarcaje("AUSENCIA")} className="mt-3 px-4 py-2.5">{guardando ? "Registrando…" : "Confirmar ausencia"}</button><button type="button" disabled={guardando} onClick={() => { setMostrarSelectorAusencia(false); setTipoAusencia(""); setError(""); }} className="ml-2 px-4 py-2.5">Cancelar</button></div>}

            </section>
          )}

          {!esAdminVista && <FichajesResumen recargar={recargarEmpleado} />}

          <section className="overflow-hidden">
            <div className="flex flex-wrap gap-2 p-3 sm:p-4">
              {tabs.map((t) => <button key={t.id} type="button" onClick={() => setPestana(t.id)} className={`px-4 py-2.5 ${pestana === t.id ? "" : ""}`}>{t.label}</button>)}
            </div>

            {!esAdminVista && pestana === "calendario" && (
              <div className="p-4 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div><h2>Calendario de marcajes</h2><p>Consulta tus registros por día y navega entre meses y años.</p></div>
                  <div className="flex items-center gap-2"><button type="button" onClick={() => setMes(new Date(mes.getFullYear() - 1, mes.getMonth(), 1))} className="px-3 py-2" aria-label="Año anterior">«</button><button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} className="px-3 py-2" aria-label="Mes anterior">‹</button><span className="min-w-36 capitalize">{mes.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</span><button type="button" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} className="px-3 py-2" aria-label="Mes siguiente">›</button><button type="button" onClick={() => setMes(new Date(mes.getFullYear() + 1, mes.getMonth(), 1))} className="px-3 py-2" aria-label="Año siguiente">»</button></div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => <div key={d + i} className="py-2">{d}</div>)}
                  {calendario.map((dia, i) => {
                    const claveDia = dia ? fechaISO(dia) : "";
                    const registros = dia ? porDia[claveDia] || [] : [];
                    const festivosDia = dia ? (resumenCompensacion.festivos || []).filter((f) => f.fecha === claveDia) : [];
                    const calendarioFestivosDia = dia ? (resumenCompensacion.calendario_festivos || []).filter((f) => f.fecha === claveDia) : [];
                    const solicitudesDia = dia ? (resumenCompensacion.solicitudes || []).filter((s) => s.fecha_disfrute === claveDia && ["SOLICITADO", "APROBADO", "DISFRUTADO"].includes(s.estado)) : [];
                    const ausenciasDia = dia ? solicitudesAusencia.filter((a) => a.fecha_inicio <= claveDia && a.fecha_fin >= claveDia && ["SOLICITADO", "APROBADO"].includes(a.estado)) : [];
                    const esHoy = dia && claveDia === fechaISO(FECHA_HOY);
                    return <div key={dia ? fechaISO(dia) : "vacio-" + i} className={`min-h-[78px] p-2 sm:min-h-[105px] ${!dia ? "" : esHoy ? "" : ""}`}>
                      {dia && <><div className={`${esHoy ? "" : ""}`}>{dia.getDate()}</div><div className="mt-1 space-y-1">{registros.slice(0, 3).map((m) => <div key={m.id} title={formatearTipo(m.tipo)} className="truncate px-1.5 py-1">{hora(m.fecha_hora)} {formatearTipo(m.tipo)}</div>)}{registros.length > 3 && <p>+{registros.length - 3} más</p>}{calendarioFestivosDia.map((f) => <div key={"calendario-festivo-" + f.id} className="truncate px-1.5 py-1" title={f.nombre}>{f.nombre}</div>)}{festivosDia.map((f) => <div key={"festivo-" + f.id} className="truncate px-1.5 py-1" title="Festivo trabajado">{f.estado === "VALIDADO" ? "Festivo validado" : f.estado === "RECHAZADO" ? "Festivo rechazado" : "Festivo pendiente"}</div>)}{solicitudesDia.map((s) => <div key={"comp-" + s.id} className="truncate px-1.5 py-1" title="Compensación">{s.estado === "SOLICITADO" ? "Compensación solicitada" : s.estado === "APROBADO" ? "Compensación aprobada" : "Compensación disfrutada"}</div>)}{ausenciasDia.map((a) => <div key={"ausencia-" + a.id} className={"truncate px-1.5 py-1" + (a.estado === "SOLICITADO" ? "" : "")} title={a.tipo_ausencia}>{a.estado === "SOLICITADO" ? "Ausencia pendiente" : "Ausencia aprobada"} · {a.tipo_ausencia}</div>)}</div></>}
                    </div>;
                  })}
                </div>
              </div>
            )}

            {!esAdminVista && pestana === "resumen" && (
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><h2>Resumen de marcajes</h2><p>Busca por tipo, fecha, hora u observaciones.</p></div><label className="w-full max-w-sm">Buscar<input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Ej. Entrada, 09:00…" className="mt-1 w-full px-3 py-2.5" /></label></div>
                <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px]"><thead><tr className="uppercase"><MolsanSortableTh label="Fecha" sortKey="fecha_hora" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="px-3 py-3" /><MolsanSortableTh label="Hora" sortKey="fecha_hora" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="px-3 py-3" /><MolsanSortableTh label="Marcaje" sortKey="tipo" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="px-3 py-3" /><MolsanSortableTh label="Observaciones" sortKey="observaciones" sortConfig={ordenMarcajes.sortConfig} onSort={ordenMarcajes.requestSort} className="px-3 py-3" /></tr></thead><tbody>{ordenMarcajes.items.map((m) => <tr key={m.id}><td className="px-3 py-3">{fechaLarga(m.fecha_hora)}</td><td className="px-3 py-3 tabular-nums">{hora(m.fecha_hora)}</td><td className="px-3 py-3"><span className="px-2.5 py-1.5">{formatearTipo(m.tipo)}</span></td><td className="px-3 py-3">{m.observaciones || "—"}</td></tr>)}{marcajesFiltrados.length === 0 && <tr><td colSpan="4" className="px-3 py-10">No hay marcajes para esta búsqueda.</td></tr>}</tbody></table></div>
              </div>
            )}

            {!esAdminVista && pestana === "documentos" && (
              <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:p-6">
                <form onSubmit={subirDocumento} className="space-y-4 p-4">
                  <div><h2>Adjuntar justificante</h2><p className="mt-1">Los archivos quedan guardados junto con su tipo y fecha.</p></div>
                  <label className="block">Tipo de justificación<select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="mt-1 w-full px-3 py-3">{TIPOS_DOCUMENTO.map((t) => <option key={t}>{t}</option>)}</select></label>
                  <label className="block">Fecha del documento<input type="date" value={fechaDocumento} onChange={(e) => setFechaDocumento(e.target.value)} required className="mt-1 w-full px-3 py-3" /></label>
                  <label className="block">Archivo<input type="file" required onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mt-1 block w-full p-2" /><span className="mt-1 block">Máximo 10 MB por archivo.</span></label>
                  <button type="submit" disabled={guardando} className="w-full px-4 py-3">{guardando ? "Guardando…" : "Guardar documento"}</button>
                </form>
                <div><h2>Historial de documentos</h2><div className="mt-3 space-y-2">{documentos.map((d) => <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate">{d.nombre_archivo}</p><p className="mt-1">{d.tipo_justificante} · Fecha: {d.fecha_documento} · Subido: {d.subido_en ? fechaLarga(d.subido_en) : "—"}</p><p className="mt-1">Revisión: {d.revision_estado === "APROBADO" ? "Aprobado" : d.revision_estado === "RECHAZADO" ? "Rechazado" : "Pendiente"}</p>{d.revision_motivo && <p className="mt-1">{d.revision_motivo}</p>}</div><button type="button" onClick={() => descargar(d)} className="px-3 py-2">Descargar</button></div>)}{documentos.length === 0 && <p className="p-8">Todavía no has adjuntado documentos.</p>}</div></div>
              </div>
            )}

            {!esAdminVista && pestana === "ausencias" && <SolicitudesAusencia modo="empleado" />}

            {esAdminVista && pestana === "ausenciasAdmin" && <SolicitudesAusencia modo="admin" empleados={empleados} />}

            {!esAdminVista && pestana === "personal" && perfil && (
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
                {[["Nombre completo", perfil.nombre], ["Usuario", perfil.usuario], ["Correo electrónico", perfil.email], ["Departamento", perfil.departamento_id ? `ID ${perfil.departamento_id}` : "No indicado"], ["Cargo", perfil.cargo_id ? `ID ${perfil.cargo_id}` : "No indicado"]].map(([label, valor]) => <div key={label} className="p-4"><p>{label}</p><p className="mt-2 break-words">{valor || "No indicado"}</p></div>)}
                <p className="sm:col-span-2 lg:col-span-3">La información se obtiene de tu ficha de empleado del ERP. Para modificarla, utiliza el procedimiento de actualización de tu ficha personal.</p>
              </div>
            )}

            {!esAdminVista && pestana === "compensaciones" && <FestivosCompensaciones modo="empleado" onUpdated={recargarEmpleado} />}

            {esAdminVista && pestana === "compensaciones" && <FestivosCompensaciones modo="admin" />}

            {esAdminVista && pestana === "solicitudes" && (
              <div className="p-4 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h2>Solicitudes de vacaciones</h2><p>Revisa, aprueba o rechaza las solicitudes recibidas desde Fichajes.</p></div>
                  <div className="px-4 py-2">Pendientes: {vacacionesAdmin.filter(v => v.estado === "SOLICITADO").length}</div>
                </div>
                <div className="mb-4 grid gap-3 sm:grid-cols-2"><label>Filtrar empleado<select value={empleadoFiltro} onChange={e => setEmpleadoFiltro(e.target.value)} className="mt-1 w-full px-3 py-2.5"><option value="">Toda la plantilla</option>{empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label><div className="flex items-end"><button type="button" onClick={() => recargarAdmin().catch(e => setError(e?.response?.data?.detail || "No se pudieron actualizar las solicitudes."))} className="px-4 py-2.5">Actualizar solicitudes</button></div></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px]">
                    <thead><tr className="uppercase"><MolsanSortableTh label="Empleado" sortKey="empleado_nombre" sortConfig={ordenVacaciones.sortConfig} onSort={ordenVacaciones.requestSort} className="p-3" /><MolsanSortableTh label="Desde" sortKey="fecha_inicio" sortConfig={ordenVacaciones.sortConfig} onSort={ordenVacaciones.requestSort} className="p-3" /><MolsanSortableTh label="Hasta" sortKey="fecha_fin" sortConfig={ordenVacaciones.sortConfig} onSort={ordenVacaciones.requestSort} className="p-3" /><MolsanSortableTh label="Días" sortKey="dias" sortConfig={ordenVacaciones.sortConfig} onSort={ordenVacaciones.requestSort} className="p-3" /><MolsanSortableTh label="Estado" sortKey="estado" sortConfig={ordenVacaciones.sortConfig} onSort={ordenVacaciones.requestSort} className="p-3" /><MolsanSortableTh label="Observaciones" sortKey="observaciones" sortConfig={ordenVacaciones.sortConfig} onSort={ordenVacaciones.requestSort} className="p-3" /><th className="p-3">Acciones</th></tr></thead>
                    <tbody>{ordenVacaciones.items.map(v => <tr key={v.id}>
                      <td className="p-3">{v.empleado_nombre}</td><td className="p-3">{fechaLarga(v.fecha_inicio)}</td><td className="p-3">{fechaLarga(v.fecha_fin)}</td><td className="p-3">{v.dias}</td><td className="p-3"><span className={v.estado === "SOLICITADO" ? "px-2 py-1" : v.estado === "APROBADO" ? "px-2 py-1" : "px-2 py-1"}>{v.estado === "SOLICITADO" ? "Pendiente" : v.estado === "APROBADO" ? "Aprobada" : "Rechazada"}</span></td>
                      <td className="max-w-[220px] p-3">{v.observaciones || "—"}</td><td className="p-3">{v.estado === "SOLICITADO" ? <div className="flex gap-2"><button type="button" disabled={guardando} onClick={() => resolverVacaciones(v, "APROBADO")} className="px-3 py-2">Aprobar</button><button type="button" disabled={guardando} onClick={() => resolverVacaciones(v, "RECHAZADO")} className="px-3 py-2">Rechazar</button></div> : "Resuelta"}</td>
                    </tr>)}{!vacacionesAdmin.length && <tr><td colSpan="7" className="p-10">No hay solicitudes de vacaciones registradas.</td></tr>}</tbody>
                  </table>
                </div>
              </div>
            )}

            {esAdminVista && pestana === "documentosAdmin" && <DocumentosAdmin documentos={documentosAdmin} descargar={descargar} recargar={recargarAdmin} guardando={guardando} setGuardando={setGuardando} setError={setError} setMensaje={setMensaje} />}

            {esAdminVista && pestana === "control" && <ControlFichajesAdmin empleados={empleados} />}
          </section>
        </>
      )}
    </main>
  );
}
