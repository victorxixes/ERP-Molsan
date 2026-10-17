import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { API_BASE } from "../../api/config";
import "../../css/ApoderaGest.css";
import "../../css/NotarGest.css";

const TOKEN_KEY = "notargest_token";
const bandejas = [
  { id: "recepcion", titulo: "Pendientes de recepción", campo: "pendiente_recepcion" },
  { id: "firma", titulo: "Pendientes de firma", campo: "pendiente_firma" },
  { id: "factura", titulo: "Expedientes pendientes de factura notarial", campo: "pendiente_factura_notaria" },
  { id: "registro", titulo: "Pendientes de presentación en Registro", campo: "pendiente_presentacion_registro" },
  { id: "ajd", titulo: "Liquidación AJD / ITP", campo: "pendiente_ajd_itp" },
  { id: "inscripcion", titulo: "Inscripciones registrales", campo: "pendiente_inscripcion" },
  { id: "defectos", titulo: "Expedientes con defectos", campo: "con_defectos" },
  { id: "copia", titulo: "Copias simples pendientes", campo: "pendiente_copia_simple" },
  { id: "cerrada", titulo: "Escrituras cerradas inscritas", campo: "escrituras_cerradas_inscritas" },
];
const esFecha = (v) => v ? String(v).slice(0, 10).split("-").reverse().join("-") : "—";
const texto = (v) => v === null || v === undefined || v === "" ? "—" : String(v);
const euros = (v) => v === null || v === undefined || v === "" ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v));

export default function NotarGest() {
  const navigate = useNavigate();
  const tokenERP = useAuthStore((s) => s.token);
  const empleadoERP = useAuthStore((s) => s.empleado);
  const accesoERP = Boolean(tokenERP && empleadoERP);
  const [tokenNotario, setTokenNotario] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const token = accesoERP ? tokenERP : tokenNotario;
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [expedientes, setExpedientes] = useState([]);
  const [notario, setNotario] = useState(null);
  const [vista, setVista] = useState("inicio");
  // Conserva la bandeja desde la que se abrió la ficha para que Volver regrese al mismo sitio.
  const vistaOrigenFicha = useRef("inicio");
  const [detalle, setDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [firmaFecha, setFirmaFecha] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [fechaEnvioGestoria, setFechaEnvioGestoria] = useState("");
  const [gestores, setGestores] = useState([]);
  const [comentarioGestor, setComentarioGestor] = useState("");
  const [gestorDestinatario, setGestorDestinatario] = useState("");
  const [avisos, setAvisos] = useState({ comentarios: [], documentos: [] });

  const peticion = useCallback(async (path, options = {}) => {
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "No se ha podido completar la operación.");
    return data;
  }, [token]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true); setError("");
    try {
      const [perfil, lista] = await Promise.all([peticion("/notargest/me"), peticion("/notargest/expedientes")]);
      setNotario(perfil); setExpedientes(lista.items || []);
      try {
        const avisosData = await peticion("/notargest/avisos");
        setAvisos({ comentarios: avisosData.comentarios || [], documentos: avisosData.documentos || [] });
      } catch (errorAvisos) {
        console.warn("No se pudieron cargar los avisos de NotarGest:", errorAvisos);
        setAvisos({ comentarios: [], documentos: [] });
      }
    } catch (e) {
      setError(e.message);
      if (!accesoERP && /sesión|acceso notargest deshabilitado|caducado/i.test(e.message)) { localStorage.removeItem(TOKEN_KEY); setTokenNotario(""); }
    } finally { setCargando(false); }
  }, [token, peticion]);
  useEffect(() => { cargar(); }, [cargar]);

  async function entrar(e) {
    e.preventDefault(); setCargando(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/notargest/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario: usuario.trim().toUpperCase(), password: password.trim().toUpperCase() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Credenciales incorrectas.");
      localStorage.setItem(TOKEN_KEY, data.token); setTokenNotario(data.token); setNotario(data.notario); setPassword("");
    } catch (e2) { setError(e2.message); } finally { setCargando(false); }
  }
  function salir() {
    if (accesoERP) { navigate("/modulos"); return; }
    localStorage.removeItem(TOKEN_KEY);
    setTokenNotario("");
    setNotario(null);
    setExpedientes([]);
    setDetalle(null);
    setPassword("");
    setVista("inicio");
  }

  async function abrirExpediente(item) {
    vistaOrigenFicha.current = vista;
    setCargando(true); setError(""); setMensaje("");
    try {
      const id = encodeURIComponent(item.id_expediente || item.numero_expediente);
      const [data, listaGestores] = await Promise.all([
        peticion(`/notargest/expedientes/${id}`),
        peticion("/notargest/gestores"),
      ]);
      setDetalle(data); setGestores(Array.isArray(listaGestores) ? listaGestores : []);
      setComentarioGestor(""); setGestorDestinatario("");
      setFirmaFecha(data.fecha_firma || ""); setProtocolo(data.protocolo || ""); setFechaCierre(data.notargest_fecha_cierre || ""); setFechaEnvioGestoria(data.notargest_fecha_envio_gestoria || ""); setVista("detalle");
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  async function adjuntarFactura(item, archivo) {
    if (!archivo) return;
    setCargando(true); setError(""); setMensaje("");
    try {
      const body = new FormData(); body.append("archivo", archivo);
      await peticion(`/notargest/expedientes/${encodeURIComponent(item.id_expediente)}/factura-notarial`, { method: "POST", body });
      setMensaje("Factura notarial guardada correctamente.");
      await cargar();
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  async function cambiarEstado(estado) {
    if (!detalle) return;
    setCargando(true); setError(""); setMensaje("");
    try {
      if (estado === "factura") await peticion("/notargest/expedientes/" + encodeURIComponent(detalle.id_expediente) + "/firma", { method: "PATCH", body: JSON.stringify({ fecha_firma: firmaFecha, protocolo }) });
      await peticion("/notargest/expedientes/" + encodeURIComponent(detalle.id_expediente) + "/estado", { method: "POST", body: JSON.stringify({ estado }) });
      const data = await peticion("/notargest/expedientes/" + encodeURIComponent(detalle.id_expediente));
      setDetalle(data); setMensaje("Estado actualizado correctamente."); await cargar();
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }
  async function subirDocumentoWorkflow(categoria, archivo) {
    if (!detalle || !archivo) return;
    setCargando(true); setError(""); setMensaje("");
    try {
      const body = new FormData(); body.append("categoria", categoria); body.append("archivo", archivo);
      await peticion("/notargest/expedientes/" + encodeURIComponent(detalle.id_expediente) + "/documentos-workflow", { method: "POST", body });
      const data = await peticion("/notargest/expedientes/" + encodeURIComponent(detalle.id_expediente));
      setDetalle(data); setMensaje("Documento guardado en Carpeta Digital y estado actualizado."); await cargar();
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }
  async function guardarComentarioGestor() {
    if (!detalle) return;
    if (!comentarioGestor.trim()) { setError("Escribe el comentario que quieres enviar al gestor."); return; }
    if (!gestorDestinatario) { setError("Selecciona el gestor destinatario."); return; }
    setCargando(true); setError(""); setMensaje("");
    try {
      await peticion(`/notargest/expedientes/${encodeURIComponent(detalle.id_expediente)}/comentarios`, {
        method: "POST",
        body: JSON.stringify({ comentario: comentarioGestor.trim(), empleado_destinatario_id: Number(gestorDestinatario) }),
      });
      const data = await peticion(`/notargest/expedientes/${encodeURIComponent(detalle.id_expediente)}`);
      setDetalle(data); setComentarioGestor(""); setGestorDestinatario("");
      setMensaje("Comentario enviado al gestor seleccionado.");
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  async function guardarCierre() {
    if (!detalle) return;
    setCargando(true); setError(""); setMensaje("");
    try {
      const body = { notargest_fecha_cierre: fechaCierre, notargest_fecha_envio_gestoria: fechaEnvioGestoria };
      await peticion("/notargest/expedientes/" + encodeURIComponent(detalle.id_expediente) + "/cierre", { method: "PATCH", body: JSON.stringify(body) });
      const data = await peticion("/notargest/expedientes/" + encodeURIComponent(detalle.id_expediente));
      setDetalle(data); setMensaje("Fechas de cierre y envío a gestoría guardadas."); await cargar();
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }

  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [documentoSeleccionadoUrl, setDocumentoSeleccionadoUrl] = useState("");
  const [visorAmpliado, setVisorAmpliado] = useState(false);

  async function abrirDocumento(doc) {
    try {
      const id = encodeURIComponent(detalle.id_expediente);
      const response = await fetch(`${API_BASE}/notargest/expedientes/${id}/documentos/${doc.id}/descargar`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.detail || "No se ha podido abrir el documento."); }
      const blob = await response.blob();
      if (documentoSeleccionadoUrl) URL.revokeObjectURL(documentoSeleccionadoUrl);
      setDocumentoSeleccionadoUrl(URL.createObjectURL(blob));
      setDocumentoSeleccionado(doc);
      setError("");
    } catch (e) { setError(e.message); }
  }

  async function subirDocumentoCarpeta(categoria, archivo) {
    if (!detalle || !archivo) return;
    if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo puedes adjuntar documentos PDF.");
      return;
    }
    setCargando(true); setError(""); setMensaje("");
    try {
      const body = new FormData(); body.append("categoria", categoria); body.append("archivo", archivo);
      await peticion(`/notargest/expedientes/${encodeURIComponent(detalle.id_expediente)}/documentos`, { method: "POST", body });
      const data = await peticion(`/notargest/expedientes/${encodeURIComponent(detalle.id_expediente)}`);
      setDetalle(data); setMensaje(`Documento añadido a «${categoria}».`); await cargar();
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }

  const cuenta = (id) => expedientes.filter(x => x[bandejas.find(b => b.id === id)?.campo]).length;
  const filas = useMemo(() => {
    const filtradas = expedientes.filter(x => {
      const q = busqueda.trim().toLocaleLowerCase("es");
      return !q || [x.id_expediente, x.oficina, x.solicitante, x.titular, x.protocolo, x.estado, x.actividad_actual].some(v => String(v || "").toLocaleLowerCase("es").includes(q));
    });
    const bandeja = bandejas.find(b => b.id === vista);
    return bandeja ? filtradas.filter(x => x[bandeja.campo]) : filtradas;
  }, [expedientes, busqueda, vista]);

  if (!token) return <main className="apoderagest notargest ng-login-shell"><form className="ng-login" onSubmit={entrar}>
    <span className="ng-sobrelinea">PORTAL PROFESIONAL</span><h1>NotarGest</h1><p>Acceso para notarías autorizadas por Molsan.</p>
    <label>DNI / NIF del notario<input autoComplete="username" value={usuario} onChange={e => setUsuario(e.target.value.toUpperCase())} required /></label>
    <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value.toUpperCase())} required /></label>
    {error && <div className="ng-error">{error}</div>}<button className="ng-login-submit" disabled={cargando}>{cargando ? "Accediendo…" : "Entrar en NotarGest"}</button>
    <small>Usuario y contraseña: DNI/NIF completo del notario, incluida la letra.</small>
  </form></main>;

  const esDetalle = vista === "detalle" && detalle;
  const titulo = esDetalle ? `Expediente ${detalle.id_expediente}` : (bandejas.find(b => b.id === vista)?.titulo || ({ avisos_comentarios: "Observaciones del gestor", avisos_documentos: "Nueva documentación añadida" }[vista]) || (vista === "inicio" ? "Mis tareas pendientes" : vista === "documentacion" ? "Carpeta Digital" : "NotarGest"));
  const tablaFactura = vista === "factura";
  return <main className="apoderagest notargest">
    <header className="ng-cabecera"><div><span className="ng-sobrelinea">PORTAL PROFESIONAL · MOLSAN</span><h1>NotarGest</h1><p>{accesoERP ? (empleadoERP?.nombre || empleadoERP?.usuario || "Gestión interna ERP") : (notario?.nombre || "Portal de la notaría")}</p></div><div className="ng-cabecera-acciones"><button className="ng-boton-secundario" onClick={cargar} disabled={cargando}>↻ Actualizar</button><button className="ng-boton-secundario" onClick={salir}>{accesoERP ? "Volver a módulos" : "Cerrar sesión"}</button></div></header>
    {error && <div className="ng-error" role="alert">{error}</div>}{mensaje && <div className="ng-success">{mensaje}</div>}
    {vista === "inicio" && <section className="ng-estados-grid" aria-label="Estados de trabajo">
      {bandejas.map((b, i) => <button key={b.id} className={`ng-estado-card ${cuenta(b.id) ? "ng-estado-con-pendientes" : ""}`} onClick={() => {setBusqueda("");setVista(b.id);}} aria-label={`${b.titulo}: ${cuenta(b.id)} expedientes. Abrir listado`}>
        <span className="ng-estado-icono" aria-hidden="true">{["↗","✍","€","▤","◷","▣","!","▧","✓"][i]}</span>
        <span className="ng-estado-texto"><strong>{b.titulo}</strong><small>Ver expedientes y abrir ficha</small></span>
        <span className="ng-estado-cantidad">{cargando ? "…" : cuenta(b.id)}</span>
        <span className="ng-estado-flecha" aria-hidden="true">›</span>
      </button>)}
      <button className={`ng-estado-card ${avisos.comentarios.length ? "ng-estado-con-pendientes" : ""}`} onClick={() => setVista("avisos_comentarios")}>
        <span className="ng-estado-icono" aria-hidden="true">💬</span><span className="ng-estado-texto"><strong>Observaciones del gestor</strong><small>Comentarios visibles para la notaría</small></span><span className="ng-estado-cantidad">{cargando ? "…" : avisos.comentarios.length}</span><span className="ng-estado-flecha" aria-hidden="true">›</span>
      </button>
      <button className={`ng-estado-card ${avisos.documentos.length ? "ng-estado-con-pendientes" : ""}`} onClick={() => setVista("avisos_documentos")}>
        <span className="ng-estado-icono" aria-hidden="true">📎</span><span className="ng-estado-texto"><strong>Nueva documentación</strong><small>Documentos añadidos tras el envío y antes de la firma</small></span><span className="ng-estado-cantidad">{cargando ? "…" : avisos.documentos.length}</span><span className="ng-estado-flecha" aria-hidden="true">›</span>
      </button>
    </section>}
    {(vista === "avisos_comentarios" || vista === "avisos_documentos") && <section className="ng-panel">
      <div className="ng-panel-titulo"><h2>{titulo}</h2><button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button></div>
      {vista === "avisos_comentarios" ? (avisos.comentarios.length ? <div className="ng-documentos">{avisos.comentarios.map(o => <article className="ng-documento" key={o.id}><div><strong>Expediente {o.id_expediente} · {texto(o.solicitante)}</strong><p>{o.comentario}</p><small>{texto(o.oficina)} · {texto(o.fecha)} · {o.visibilidad}</small></div><button className="ng-boton-secundario" onClick={() => abrirExpediente({id_expediente:o.id_expediente})}>Abrir expediente →</button></article>)}</div> : <p className="ng-mensaje">No hay observaciones visibles para la notaría.</p>) : (avisos.documentos.length ? <div className="ng-documentos">{avisos.documentos.map(d => <article className="ng-documento" key={d.id}><div><strong>Expediente {d.id_expediente} · {texto(d.solicitante)}</strong><p>{d.nombre}</p><small>{texto(d.oficina)} · {texto(d.categoria)} · Añadido: {texto(d.fecha_subida)}</small></div><button className="ng-boton-secundario" onClick={() => abrirExpediente({id_expediente:d.id_expediente})}>Abrir expediente →</button></article>)}</div> : <p className="ng-mensaje">No hay documentos nuevos pendientes de revisar antes de la firma.</p>)}
    </section>}
    {bandejas.some(b => b.id === vista) && <section className="ng-panel">
      <div className="ng-panel-titulo"><h2>{titulo}</h2><button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button></div>
      <div className="ng-filtros"><label>Buscar<input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Expediente, oficina, solicitante, protocolo…" /></label><span>{filas.length} registros</span></div>
      <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr>{tablaFactura ? <><th>Provisión</th><th>Oficina</th><th>Fecha de envío</th><th>Fecha de firma</th><th>Protocolo</th><th>Solicitante</th><th>Factura notarial</th><th>Adjuntar</th></> : <><th>Expediente</th><th>Oficina</th><th>Fecha de envío</th><th>Nombre</th><th>Apellidos</th><th>DNI</th><th>Contrato</th><th>Capital</th><th>Finca</th><th>Tipo operación</th><th>Subtipo operación</th><th>Importe</th><th>Tipo del documento</th><th>Cuantía del documento</th><th>Acción</th></>}</tr></thead><tbody>
      {filas.map(x => <tr key={x.id}><td>{tablaFactura ? <button className="ng-abrir" onClick={() => abrirExpediente(x)}>{texto(x.id_provision || x.id_expediente)}</button> : texto(x.id_expediente)}</td>{tablaFactura ? <><td>{texto(x.oficina)}</td><td>{esFecha(x.fecha_envio_notario || x.fecha_envio)}</td><td>{esFecha(x.fecha_firma)}</td><td>{texto(x.protocolo)}</td><td>{texto(x.solicitante)}</td><td>{x.factura_notarial ? <button className="ng-abrir" onClick={() => abrirExpediente(x)}>{x.factura_notarial.nombre}</button> : "Pendiente"}</td><td><label className="ng-adjuntar">Adjuntar PDF<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => {adjuntarFactura(x, e.target.files?.[0]);e.target.value="";}} /></label></td></> : <><td>{texto(x.oficina)}</td><td>{esFecha(x.fecha_envio_notario || x.fecha_envio)}</td><td>{texto(x.nombre || x.nombre_titular || x.titular)}</td><td>{texto(x.apellidos || x.facturacion_apellidos)}</td><td>{texto(x.dni || x.nif_titular)}</td><td>{texto(x.contrato)}</td><td>{euros(x.capital)}</td><td>{texto(x.finca || x.fincas?.map(f => f.finca).filter(Boolean).join(", "))}</td><td>{texto(x.tipo_operacion)}</td><td>{texto(x.subtipo_operacion)}</td><td>{euros(x.importe)}</td><td>{texto(x.tipo_documento || x.documentos_escritura?.map(d => d.tipo_documento).filter(Boolean).join(", "))}</td><td>{euros(x.cuantia_documento ?? x.cuantia ?? x.documentos_escritura?.[0]?.cuantia)}</td><td><button className="ng-abrir" onClick={() => abrirExpediente(x)}>Ver ficha →</button></td></>}</tr>)}
      </tbody></table>{filas.length === 0 && <p className="ng-mensaje">{cargando ? "Cargando expedientes…" : "No hay expedientes pendientes en este estado."}</p>}</div>
    </section>}
    {esDetalle && <section className="ng-panel ng-ficha">
      <div className="ng-panel-titulo ng-ficha-cabecera"><div><h2>{titulo}</h2><small>Ficha operativa del expediente · NotarGest</small></div><button className="ng-volver" onClick={() => setVista(vistaOrigenFicha.current || "inicio")}>← Volver al listado</button></div>
      {detalle.bloqueado && <div className="ng-alerta ng-bloqueo-expediente" role="alert"><span className="ng-alerta-icono">!</span><div><strong>EXPEDIENTE BLOQUEADO EN CANCELAGEST</strong><p>{texto(detalle.motivo_bloqueo_efectivo || detalle.motivo_bloqueo || "Este expediente está bloqueado. Consulta con gestión antes de continuar.")}</p></div></div>}
      <div className="ng-ficha-cuerpo ng-ficha-premium">
        <section className="ng-detalle-bloque ng-workflow ng-bloque-estado">
          <div className="ng-bloque-heading"><div><span className="ng-kicker">FLUJO DE TRABAJO</span><h3>Gestión del estado</h3></div><span className={`ng-estado-pill ng-estado-${detalle.notargest_estado || "pendiente"}`}>{texto(bandejas.find(x => x.id === detalle.notargest_estado)?.titulo || detalle.notargest_estado)}</span></div>
          {detalle.notargest_estado === "recepcion" && <button className="ng-login-submit" disabled={cargando} onClick={() => cambiarEstado("firma")}>Recepción encargo · Pasar a pendientes de firma</button>}
          {detalle.notargest_estado === "firma" && <div className="ng-workflow-form ng-firma-form"><label>Fecha de firma<input type="date" value={firmaFecha} onChange={e => setFirmaFecha(e.target.value)} /></label><label>Protocolo<input value={protocolo} onChange={e => setProtocolo(e.target.value)} placeholder="Número de protocolo" /></label><button className="ng-login-submit" disabled={cargando || !firmaFecha || !protocolo.trim()} onClick={() => cambiarEstado("factura")}>Guardar firma y pasar a pendientes de factura notaría</button><p className="ng-ayuda-campo">Esta acción solo está disponible mientras el expediente está en <strong>Pendientes de firma</strong>.</p></div>}
          {detalle.notargest_estado === "factura" && <p>Adjunta la factura notarial desde su bandeja. Al subirla, el expediente pasará a presentación en Registro.</p>}
          {detalle.notargest_estado === "registro" && <label className="ng-adjuntar">Subir justificante de presentación en Registro<input type="file" disabled={cargando} onChange={e => { subirDocumentoWorkflow("presentacion", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {detalle.notargest_estado === "ajd" && <label className="ng-adjuntar">Subir justificante AJD / ITP<input type="file" disabled={cargando} onChange={e => { subirDocumentoWorkflow("ajd", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {["inscripcion", "copia"].includes(detalle.notargest_estado) && <div className="ng-workflow-form"><label>Defecto registral (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("defecto", e.target.files?.[0]); e.target.value = ""; }} /></label><label>Hoja de inscripción (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("inscripcion", e.target.files?.[0]); e.target.value = ""; }} /></label>{String(detalle.tiene_defectos_abiertos || "").trim().toLowerCase() === "si" && <label>Subsanación del defecto (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("subsanacion", e.target.files?.[0]); e.target.value = ""; }} /></label>}<p>Los documentos se guardan en la Carpeta Digital. Si hay un defecto abierto, se deberá adjuntar la subsanación antes de cerrar.</p></div>}
          {detalle.notargest_estado === "copia" && <label className="ng-adjuntar">Subir copia simple (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("copia", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {detalle.notargest_estado === "cerrada" && <div className="ng-workflow-form"><label>Fecha de cierre<input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} /></label><label>Fecha de envío a gestoría<input type="date" value={fechaEnvioGestoria} onChange={e => setFechaEnvioGestoria(e.target.value)} /></label><button className="ng-login-submit" disabled={cargando || !fechaCierre} onClick={guardarCierre}>Guardar cierre y envío a gestoría</button></div>}
        </section>

        <div className="ng-datos-superiores">
          <section className="ng-detalle-bloque ng-datos-envio">
            <div className="ng-bloque-heading"><div><span className="ng-kicker">01 · ENVÍO</span><h3>Datos de envío y firma prevista</h3></div></div>
            <div className="ng-datos-grid ng-datos-operacion">{[
              ["Fecha de envío", esFecha(detalle.fecha_envio_notario || detalle.fecha_envio)], ["Fecha solicitud PNC", esFecha(detalle.fecha_solicitud_pnc)],
              ["Número solicitud PNC", detalle.numero_solicitud_pnc], ["Fecha prevista de firma", esFecha(detalle.fecha_prevista_firma)],
              ["Hora prevista de firma", detalle.hora_prevista_firma], ["Contrato", detalle.contrato], ["Capital", euros(detalle.capital)],
              ["Tipo de operación", detalle.tipo_operacion], ["Subtipo de operación", detalle.subtipo_operacion], ["Importe", euros(detalle.importe)]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
          </section>
          <section className="ng-detalle-bloque ng-datos-facturacion-bloque">
            <div className="ng-bloque-heading"><div><span className="ng-kicker">02 · FACTURACIÓN</span><h3>Datos de facturación</h3></div></div>
            <div className="ng-datos-grid ng-datos-facturacion">{[
              ["Nombre", detalle.facturacion_nombre], ["Apellidos", detalle.facturacion_apellidos], ["DNI / NIF", detalle.facturacion_dni_nif],
              ["Dirección", detalle.facturacion_direccion], ["Código postal", detalle.facturacion_codigo_postal], ["Población", detalle.facturacion_poblacion],
              ["Provincia", detalle.facturacion_provincia], ["Teléfono", detalle.facturacion_telefono], ["Correo electrónico", detalle.facturacion_email]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
          </section>
        </div>
        <div className="ng-documentacion-layout">
          <section className="ng-detalle-bloque ng-carpeta-premium">
            <div className="ng-bloque-heading"><div><span className="ng-kicker">03 · ARCHIVO</span><h3>Carpeta digital</h3><p className="ng-descripcion">Documentación del expediente, organizada por categoría, con visor PDF integrado.</p></div></div>
            <div className="ng-carpeta-layout">
              <div className="ng-carpeta-categorias">
                {[
                  ["Documentación previa · Documentos ABSIS", ["documentos absis","absis"]],
                  ["Hoja de encargo firmada", ["hoja de encargo firmada","hoja de encargo"]],
                  ["Justificante de cancelación", ["justificante de cancelación","cancelación"]],
                  ["Nota simple registral", ["nota simple"]],
                  ["Borradores de escritura", ["borrador","borradores de escritura"]],
                  ["Otros documentos", []]
                ].map(([categoria, palabras]) => {
                  const docs = (detalle.documentos || []).filter(d => {
                    const cat = String(d.categoria || "").toLocaleLowerCase("es");
                    const nom = String(d.nombre || "").toLocaleLowerCase("es");
                    const previas = ["documentos absis","absis"].some(p => cat.includes(p) || nom.includes(p));
                    if (categoria.startsWith("Documentación previa")) return previas;
                    if (categoria === "Otros documentos") return !["documentos absis","absis","hoja de encargo firmada","hoja de encargo","justificante de cancelación","cancelación","nota simple","borrador","borradores de escritura"].some(p => cat.includes(p) || nom.includes(p));
                    return palabras.some(p => cat.includes(p) || nom.includes(p));
                  });
                  return <div className="ng-categoria-documental" key={categoria}>
                    <div className="ng-categoria-heading"><div><strong>{categoria}</strong><small>{docs.length} archivo(s)</small></div><label className="ng-adjuntar-pdf">＋ Adjuntar PDF<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoCarpeta(categoria, e.target.files?.[0]); e.target.value = ""; }} /></label></div>
                    {docs.length ? docs.map(d => <div className="ng-archivo-row" key={d.id}><span className="ng-pdf-icon">PDF</span><div className="ng-archivo-info"><strong>{d.nombre}</strong><small>{esFecha(d.fecha_subida)}</small></div><button type="button" className="ng-boton-secundario" onClick={() => abrirDocumento(d)}>Ver a la derecha</button></div>) : <p className="ng-vacio-categoria">Todavía no hay archivos. Usa «Adjuntar PDF» para incorporarlo aquí.</p>}
                  </div>;
                })}
              </div>
              <aside className="ng-visor-documentos"><div className="ng-visor-cabecera"><div><span className="ng-kicker">VISOR INTEGRADO</span><strong>Visor de documentos</strong><small>{documentoSeleccionado ? documentoSeleccionado.nombre : "Selecciona «Ver a la derecha» en un archivo"}</small></div><button className="ng-boton-secundario" type="button" onClick={() => setVisorAmpliado(v => !v)}>{visorAmpliado ? "⤢ Reducir" : "⛶ Ampliar"}</button></div>
                {documentoSeleccionadoUrl ? <iframe className={`ng-pdf-frame ${visorAmpliado ? "ng-pdf-ampliado" : ""}`} title="Vista previa del documento" src={documentoSeleccionadoUrl} /> : <div className="ng-visor-vacio"><span>▤</span><strong>Vista previa</strong><p>Adjunta un PDF o pulsa «Ver a la derecha» en uno de los documentos para consultarlo aquí sin salir de la actividad.</p></div>}
              </aside>
            </div>
          </section>
          <section className="ng-detalle-bloque ng-tipo-documento-bloque">
            <div className="ng-bloque-heading"><div><span className="ng-kicker">04 · DOCUMENTO</span><h3>Tipo de documento</h3><p className="ng-descripcion">Datos del documento remitidos desde el modal Enviar a notario.</p></div></div>
            <div className="ng-datos-grid">{[
              ["Contrato", detalle.contrato], ["Capital", euros(detalle.capital)], ["Tipo de operación", detalle.tipo_operacion],
              ["Subtipo de operación", detalle.subtipo_operacion], ["Importe", euros(detalle.importe)], ["Formato de escritura", detalle.formato_escritura],
              ["Tipo de trámite", detalle.tipo_tramite]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
            <h4 className="ng-subtitulo-detalle">Documentos y cuantías</h4>
            {detalle.documentos_escritura?.length ? <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr><th>Tipo de documento</th><th>Cuantía</th></tr></thead><tbody>{detalle.documentos_escritura.map((d,i) => <tr key={d.id || i}><td>{texto(d.tipo_documento)}</td><td>{euros(d.cuantia)}</td></tr>)}</tbody></table></div> : <div className="ng-datos-grid"><div className="ng-dato"><small>Tipo de documento</small><strong>{texto(detalle.tipo_documento)}</strong></div><div className="ng-dato"><small>Cuantía</small><strong>{euros(detalle.cuantia)}</strong></div></div>}
            <h4 className="ng-subtitulo-detalle">Fincas y registros</h4><p className="ng-descripcion">Datos registrales del expediente</p>
            {detalle.fincas?.length ? <div className="ng-fincas-lista">{detalle.fincas.map((f,i) => <article className="ng-finca-card" key={f.id || i}><strong>Finca {texto(f.finca)}</strong><span>{[f.poblacion,f.registro,f.provincia].filter(Boolean).join(" · ") || "—"}</span><div><small>CRU/IDUFIR</small><b>{texto(f.cru_idufir)}</b></div><div><small>Cuantía</small><b>{euros(f.cuantia)}</b></div><div><small>Inscripción</small><b>{texto(f.inscripcion)}</b></div><div><small>Contrato</small><b>{texto(f.contrato || detalle.contrato)}</b></div></article>)}</div> : <p className="ng-mensaje">No hay fincas registradas en este expediente.</p>}
          </section>
        </div>
        <section className="ng-detalle-bloque ng-comentarios-gestor">
          <div className="ng-bloque-heading"><div><span className="ng-kicker">05 · COMUNICACIÓN</span><h3>Observaciones y comentarios</h3><p className="ng-descripcion">Envía un comentario directamente al gestor responsable del expediente.</p></div></div>
          <div className="ng-comentario-form">
            <label>Comentario<textarea rows={3} value={comentarioGestor} onChange={e => setComentarioGestor(e.target.value)} placeholder="Escribe aquí el comentario para el gestor…" maxLength={2000} /></label>
            <label>Dirigido a<select value={gestorDestinatario} onChange={e => setGestorDestinatario(e.target.value)} required><option value="">Selecciona un gestor…</option>{gestores.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label>
            <button className="ng-login-submit" type="button" disabled={cargando || !comentarioGestor.trim() || !gestorDestinatario} onClick={guardarComentarioGestor}>Enviar comentario al gestor</button>
          </div>
          <div className="ng-comentarios-historico"><h4>Histórico de observaciones</h4>
            {detalle.observaciones_notaria?.length ? detalle.observaciones_notaria.map(o => <article className="ng-observacion" key={o.id}><p>{o.comentario}</p><small>{o.visibilidad === "Gestor" ? `Dirigido a: ${o.empleado_destinatario || "Gestor"}` : o.visibilidad} · {texto(o.fecha)}</small></article>) : <p className="ng-mensaje">No hay comentarios registrados para mostrar.</p>}
            {detalle.observaciones && <article className="ng-observacion"><p>{detalle.observaciones}</p><small>Observaciones generales del expediente</small></article>}
          </div>
        </section>
      </div>
    </section>}
    <footer className="ng-pie">MOLSAN ERP · NotarGest</footer>
  </main>;
}
