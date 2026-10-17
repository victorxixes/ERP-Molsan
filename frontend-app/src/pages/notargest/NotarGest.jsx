import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
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
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [perfilNotarioAbierto, setPerfilNotarioAbierto] = useState(false);
  const [pagosAbiertos, setPagosAbiertos] = useState(false);
  const [pagosNotario, setPagosNotario] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [avisosLeidos, setAvisosLeidos] = useState([]);

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
        const pagosData = await peticion("/notargest/pagos");
        setPagosNotario(pagosData.items || []);
      } catch (errorPagos) {
        console.warn("No se pudieron cargar los pagos de NotarGest:", errorPagos);
        setPagosNotario([]);
      }
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


  async function abrirPagos() {
    setPagosAbiertos(true);
    setCargandoPagos(false);
  }

  async function abrirPdfPago(item, tipo) {
    const documentoId = tipo === "factura" ? item.factura_notarial_id : item.justificante_documento_id;
    if (!documentoId && tipo === "justificante" && item.justificante_url) {
      window.open(item.justificante_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!documentoId) {
      setError(tipo === "factura" ? "Este expediente todavía no tiene factura notarial en PDF." : "Este pago no tiene justificante PDF vinculado.");
      return;
    }
    const ventana = window.open("about:blank", "_blank");
    try {
      const id = encodeURIComponent(item.id_expediente);
      const response = await fetch(`${API_BASE}/notargest/expedientes/${id}/documentos/${documentoId}/descargar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "No se ha podido abrir el PDF.");
      }
      const url = URL.createObjectURL(await response.blob());
      if (ventana) ventana.location.href = url;
      else {
        const enlace = document.createElement("a");
        enlace.href = url; enlace.target = "_blank"; enlace.rel = "noopener";
        enlace.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (ventana) ventana.close();
      setError(e.message || "No se ha podido abrir el PDF.");
    }
  }

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
  const avisosPendientes = { comentarios: avisos.comentarios.filter(x => !avisosLeidos.includes(`comentario:${x.id}`)), documentos: avisos.documentos.filter(x => !avisosLeidos.includes(`documento:${x.id}`)) };
  const totalAvisosPendientes = avisosPendientes.comentarios.length + avisosPendientes.documentos.length;
  async function marcarAvisoLeido(tipo, id) { const clave = `${tipo}:${id}`; try { await peticion(`/notargest/avisos/${tipo}/${encodeURIComponent(id)}/leido`, { method: "POST" }); setAvisosLeidos(actual => actual.includes(clave) ? actual : [...actual, clave]); setError(""); } catch (e) { setError(e.message || "No se pudo marcar la notificación como leída."); } }
  function abrirAvisoExpediente(item) { setNotificacionesAbiertas(false); abrirExpediente({ id_expediente: item.id_expediente, numero_expediente: item.id_expediente }); }
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
  const fechaActual = new Intl.DateTimeFormat("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
  const sidebarVista = vista === "inicio" ? "Dashboard" : ({
    recepcion: "Nuevos encargos",
    firma: "Pendientes de firma",
    copia: "Pendientes copias simples",
    factura: "Pendientes de factura notarial",
    ajd: "Pendientes de AJD / ITP",
    registro: "Pendientes de presentación registral",
    defectos: "Expedientes con defectos",
    inscripcion: "Inscripciones registrales",
    cerrada: "Escrituras cerradas inscritas",
    firmas_urgentes: "Firmas urgentes",
    avisos_comentarios: "",
    avisos_documentos: "",
  }[vista] || "");
  const navegarSidebar = (label) => {
    const destinos = {
      "Dashboard": "inicio",
      "Nuevos encargos": "recepcion",
      "Pendientes de firma": "firma",
      "Pendientes copias simples": "copia",
      "Pendientes de factura notarial": "factura",
      "Pendientes de AJD / ITP": "ajd",
      "Pendientes de presentación registral": "registro",
      "Expedientes con defectos": "defectos",
      "Inscripciones registrales": "inscripcion",
      "Escrituras cerradas inscritas": "cerrada",
      "Firmas urgentes": "firmas_urgentes",
    };
    setBusqueda("");
    setVista(destinos[label] || "inicio");
  };

  return (
    <div className="min-h-screen bg-[var(--erp-bg)] text-[var(--erp-text)]">
      <Sidebar
        brandName="NotarGest"
        navigationItems={[
          { key: "dashboard", label: "Dashboard", icon: "home" },
          { key: "recepcion", label: "Nuevos encargos", icon: "clipboard", badge: cuenta("recepcion") },
          { key: "firma", label: "Pendientes de firma", icon: "calendar", badge: cuenta("firma") },
          { key: "copia", label: "Pendientes copias simples", icon: "folder", badge: cuenta("copia") },
          { key: "factura", label: "Pendientes de factura notarial", icon: "clipboard", badge: cuenta("factura") },
          { key: "ajd", label: "Pendientes de AJD / ITP", icon: "calendar", badge: cuenta("ajd") },
          { key: "registro", label: "Pendientes de presentación registral", icon: "folder", badge: cuenta("registro") },
          { key: "defectos", label: "Expedientes con defectos", icon: "globe", badge: cuenta("defectos") },
          { key: "inscripcion", label: "Inscripciones registrales", icon: "folder", badge: cuenta("inscripcion") },
          { key: "cerrada", label: "Escrituras cerradas inscritas", icon: "clipboard", badge: cuenta("cerrada") },
          { key: "firmas_urgentes", label: "Firmas urgentes", icon: "activity", badge: expedientes.filter(x => x.firma_urgente).length, attention: expedientes.some(x => x.firma_urgente) },
        ]}
        activeNavigationItem={sidebarVista}
        onNavigationItemClick={navegarSidebar}
        onNotificationsClick={() => setNotificacionesAbiertas(true)}
        notificationBadge={totalAvisosPendientes}
        onProfileClick={() => setPerfilNotarioAbierto(true)}
      />
      {notificacionesAbiertas && <div className="ng-modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setNotificacionesAbiertas(false); }}><section className="ng-modal ng-modal-avisos" role="dialog" aria-modal="true" aria-labelledby="ng-avisos-titulo"><header><div><span className="ng-kicker">NOTARGEST · AVISOS</span><h2 id="ng-avisos-titulo">Notificaciones pendientes</h2><p>Documentos nuevos y observaciones del gestor vinculados a tus expedientes.</p></div><button type="button" className="ng-boton-secundario" onClick={() => setNotificacionesAbiertas(false)}>Cerrar ✕</button></header><div className="ng-modal-lista">{totalAvisosPendientes === 0 ? <div className="ng-modal-vacio"><strong>Todo al día</strong><p>No tienes notificaciones pendientes de leer.</p></div> : <>{avisosPendientes.documentos.map(item => <article className="ng-aviso-item" key={`documento:${item.id}`}><span className="ng-aviso-icono">PDF</span><div className="ng-aviso-contenido"><strong>Nuevo documento en expediente {item.id_expediente}</strong><p>{texto(item.nombre)} · {texto(item.categoria)}</p><small>{texto(item.oficina)} · {texto(item.fecha_subida)}</small><div className="ng-aviso-acciones"><button type="button" className="ng-login-submit" onClick={() => abrirAvisoExpediente(item)}>Ver expediente</button><button type="button" className="ng-boton-secundario" onClick={() => marcarAvisoLeido("documento", item.id)}>Marcar como leída</button></div></div></article>)}{avisosPendientes.comentarios.map(item => <article className="ng-aviso-item" key={`comentario:${item.id}`}><span className="ng-aviso-icono ng-aviso-icono-observacion">!</span><div className="ng-aviso-contenido"><strong>Nueva observación · expediente {item.id_expediente}</strong><p>{texto(item.comentario)}</p><small>{texto(item.oficina)} · {texto(item.fecha)}</small><div className="ng-aviso-acciones"><button type="button" className="ng-login-submit" onClick={() => abrirAvisoExpediente(item)}>Ver expediente</button><button type="button" className="ng-boton-secundario" onClick={() => marcarAvisoLeido("comentario", item.id)}>Marcar como leída</button></div></div></article>)}</>}</div></section></div>}
      {pagosAbiertos && <div className="ng-modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPagosAbiertos(false); }}>
        <section className="ng-modal ng-modal-pagos ng-modal-pagos-amplio" style={{ width: "calc(100vw - 32px)", maxWidth: "1840px", height: "90vh", maxHeight: "94vh", boxSizing: "border-box" }} role="dialog" aria-modal="true" aria-labelledby="ng-pagos-titulo">
          <header><div><span className="ng-kicker">NOTARGEST · GESTIÓN ECONÓMICA</span><h2 id="ng-pagos-titulo">Solicitudes de Pago efectuadas por Molsan</h2><p>Pagos registrados desde la Ficha de expediente y vinculados a la notaría.</p></div><button type="button" className="ng-boton-secundario" onClick={() => setPagosAbiertos(false)}>Cerrar ✕</button></header>
          <div className="ng-pagos-tabla-wrap">
            <table className="ng-tabla ng-tabla-pagos"><thead><tr><th>N.º expediente</th><th>Fecha de pago</th><th>Nombre</th><th>DNI</th><th>Importe</th><th>Protocolo</th><th>Fecha de firma</th><th>Factura notarial</th><th>Justificante</th></tr></thead>
              <tbody>{pagosNotario.map(item => <tr key={item.id}>
                <td><button type="button" className="ng-abrir" onClick={() => { setPagosAbiertos(false); abrirExpediente({id_expediente:item.id_expediente}); }}>{texto(item.id_expediente)}</button></td>
                <td>{esFecha(item.fecha_pago)}</td><td>{texto(item.nombre)}</td><td>{texto(item.dni)}</td><td>{euros(item.importe)}</td><td>{texto(item.protocolo)}</td><td>{esFecha(item.fecha_firma)}</td>
                <td>{item.factura_notarial_id ? <button type="button" className="ng-pdf-link" title="Abrir factura notarial PDF" onClick={() => abrirPdfPago(item,"factura")}><span>PDF</span></button> : "—"}</td>
                <td>{item.justificante_documento_id || item.justificante_url ? <button type="button" className="ng-pdf-link" title="Abrir justificante PDF" onClick={() => abrirPdfPago(item,"justificante")}><span>PDF</span></button> : "—"}</td>
              </tr>)}</tbody>
            </table>
            {!cargandoPagos && pagosNotario.length === 0 && <div className="ng-modal-vacio"><strong>No hay pagos efectuados</strong><p>Los pagos marcados como «Pagado» en Ficha de expediente aparecerán aquí cuando estén vinculados a esta notaría.</p></div>}
            {cargandoPagos && <p className="ng-mensaje">Cargando pagos…</p>}
          </div>
        </section>
      </div>}
      {perfilNotarioAbierto && <div className="ng-modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPerfilNotarioAbierto(false); }}><section className="ng-modal ng-modal-perfil" role="dialog" aria-modal="true" aria-labelledby="ng-perfil-titulo"><header><div><span className="ng-kicker">FICHA CTN</span><h2 id="ng-perfil-titulo">Ficha del notario</h2><p>Datos de la notaría registrados en el catálogo CTN.</p></div><button type="button" className="ng-boton-secundario" onClick={() => setPerfilNotarioAbierto(false)}>Cerrar ✕</button></header><div className="ng-perfil-identidad"><div className="ng-perfil-avatar">NG</div><div><strong>{texto(notario?.nombre)}</strong><span>{texto(notario?.nif)}</span></div></div><div className="ng-perfil-datos">{[["Nombre",notario?.nombre],["NIF",notario?.nif],["Teléfono",notario?.telefono],["Dirección",notario?.direccion],["Código postal",notario?.cp],["Municipio",notario?.municipio],["Provincia",notario?.provincia],["Código CTN",notario?.codigo],["Videoconferencia",notario?.vc],["Apoderado asociado",notario?.apoderado],["Departamento cancelaciones",notario?.departamento_cancelaciones],["Departamento copias",notario?.departamento_copias],["Otros departamentos",notario?.otros_departamentos]].map(([label,value]) => <div className="ng-dato" key={label}><small>{label}</small><strong>{texto(value)}</strong></div>)}</div>{notario?.observacion && <div className="ng-perfil-observacion"><small>Observaciones CTN</small><p>{notario.observacion}</p></div>}</section></div>}
      <main className="relative min-h-[calc(100vh-70px)]">
        <div className="w-full px-4 py-6 lg:px-6">
          <div className="w-full apoderagest">
            <div className="notargest ng-content">
    <header className="ag-hero ng-hero-apoderagest">
      <div className="ag-hero-identidad">
        <div className="ag-marca ng-marca-notargest" aria-label="NotarGest">NG</div>
        <div>
          <div className="ag-eyebrow">MOLSAN ERP · PREMIUM 2027</div>
          <h1>NotarGest</h1>
          <p>Centro de gestión notarial, firmas y seguimiento registral.</p>
        </div>
      </div>
      <div className="ag-hero-acciones">
        <div className="ag-fecha-actual">
          <span className="ag-punto-vivo" />
          <span>{fechaActual}</span>
        </div>
        {accesoERP && <button type="button" onClick={() => navigate("/modulos")} className="flex items-center gap-2 rounded-xl border border-[var(--erp-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--erp-text)] transition hover:border-[var(--erp-primary)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)]"><span aria-hidden="true">▦</span> Ir a módulos</button>}
        <button type="button" className="ag-boton-actualizar" onClick={cargar} disabled={cargando}><span className={cargando ? "ag-icono-girando" : ""} aria-hidden="true">↻</span>{cargando ? "Actualizando…" : "Actualizar datos"}</button>
      </div>
    </header>
    {error && <div className="ng-error" role="alert">{error}</div>}{mensaje && <div className="ng-success">{mensaje}</div>}
    {vista === "inicio" && <section className="ng-dashboard-analitica">
      <div className="ng-dashboard-graficos">
        <section className="ng-dashboard-grafico"><div className="ng-bloque-heading"><div><span className="ng-kicker">ACTIVIDAD</span><h3>Firmas realizadas por mes</h3></div></div>
          {(() => {
            const meses = [];
            const ahora = new Date();
            for (let i=5;i>=0;i--) { const d=new Date(ahora.getFullYear(),ahora.getMonth()-i,1); meses.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("es-ES",{month:"short",year:"2-digit"}),valor:0}); }
            expedientes.filter(x=>x.fecha_firma && x.protocolo).forEach(x=>{const key=String(x.fecha_firma).slice(0,7);const m=meses.find(z=>z.key===key);if(m)m.valor++;});
            const max=Math.max(1,...meses.map(m=>m.valor));
            return <div className="ng-barras-meses">{meses.map(m=><div className="ng-barra-mes" key={m.key}><strong>{m.valor}</strong><div className="ng-barra-pista"><span style={{height:`${Math.max(m.valor?6:0,m.valor/max*100)}%`}} /></div><small>{m.label}</small></div>)}</div>;
          })()}
        </section>
        <section className="ng-dashboard-grafico ng-dashboard-pagos">
          <div className="ng-bloque-heading">
            <div><span className="ng-kicker">GESTIÓN ECONÓMICA</span><h3>Pagos</h3></div>
            <button type="button" className="ng-abrir" onClick={abrirPagos}>Ver pagos →</button>
          </div>
          <p className="ng-descripcion">Solicitudes de pago efectuadas por Molsan al notario desde la Ficha de expediente.</p>
          <div className="ng-pagos-resumen">
            <p>Consulta los pagos efectuados al notario, sus importes y los documentos PDF vinculados.</p>
            <button type="button" className="ng-login-submit" onClick={abrirPagos}>Solicitudes de Pago efectuadas por Molsan</button>
          </div>
          {(() => {
            const meses = [];
            const ahora = new Date();
            for (let i = 5; i >= 0; i--) {
              const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
              meses.push({ key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, label: d.toLocaleDateString("es-ES",{month:"short",year:"2-digit"}), valor: 0 });
            }
            pagosNotario.forEach(p => {
              const key = String(p.fecha_pago || "").slice(0,7);
              const mes = meses.find(x => x.key === key);
              const importe = Number(p.importe || 0);
              if (mes && Number.isFinite(importe)) mes.valor += importe;
            });
            const max = Math.max(1, ...meses.map(x => x.valor));
            return <div className="ng-pagos-grafico">
              <div className="ng-pagos-grafico-titulo"><strong>Cuantías pagadas por mes</strong><span>Últimos 6 meses</span></div>
              <div className="ng-barras-meses ng-barras-pagos">{meses.map(x => <div className="ng-barra-mes" key={x.key}><strong>{euros(x.valor)}</strong><div className="ng-barra-pista"><span style={{height:`${x.valor ? Math.max(5,x.valor/max*100) : 0}%`}} /></div><small>{x.label}</small></div>)}</div>
            </div>;
          })()}
        </section>
        <section className="ng-dashboard-grafico ng-dashboard-etapas"><div className="ng-bloque-heading"><div><span className="ng-kicker">SEGUIMIENTO DE HITOS</span><h3>Ciclo registral</h3></div></div>
          {(() => {
            const etapas=[
              {label:"Fecha envío → fecha firma",desde:["fecha_envio_notario","fecha_envio"],hasta:["fecha_firma"]},
              {label:"Firma → presentación tributaria",desde:["fecha_firma"],hasta:["fecha_presentacion_tributaria","fecha_presentacion_impuestos","fecha_liquidacion_tributaria","fecha_liquidacion"]},
              {label:"Presentación tributaria → Registro",desde:["fecha_presentacion_tributaria","fecha_presentacion_impuestos","fecha_liquidacion"],hasta:["fecha_presentacion_registro","fecha_presentacion_registral"]},
              {label:"Presentación Registro → inscripción",desde:["fecha_presentacion_registro","fecha_presentacion_registral"],hasta:["fecha_inscripcion","fecha_inscripcion_registro"]},
              {label:"Inscripción → cierre",desde:["fecha_inscripcion","fecha_inscripcion_registro"],hasta:["notargest_fecha_cierre","fecha_cierre"]},
            ];
            const valorFecha=(x,keys)=>{for(const k of keys){if(x[k])return x[k];}return null;};
            const diferencia=(a,b)=>{if(!a||!b)return null;const n=Math.round((new Date(String(b).slice(0,10)+"T00:00:00")-new Date(String(a).slice(0,10)+"T00:00:00"))/86400000);return Number.isFinite(n)&&n>=0?n:null;};
            const medias=etapas.map(e=>{const ds=expedientes.map(x=>diferencia(valorFecha(x,e.desde),valorFecha(x,e.hasta))).filter(n=>n!==null);return {...e,media:ds.length?ds.reduce((a,b)=>a+b,0)/ds.length: null,n:ds.length};});
            const max=Math.max(1,...medias.map(x=>x.media||0));
            return <div className="ng-barras-medias">{medias.map(e=><div className="ng-media-row" key={e.label}><div><strong>{e.label}</strong><small>{e.media===null?"Sin datos suficientes":`${e.media.toFixed(1)} días de media · ${e.n} expedientes`}</small></div><div className="ng-media-pista"><span style={{width:`${e.media===null?0:e.media/max*100}%`}} /></div></div>)}</div>;
          })()}
        </section>
      </div>
    </section>}
    {(vista === "avisos_comentarios" || vista === "avisos_documentos") && <section className="ng-panel">
      <div className="ng-panel-titulo"><h2>{titulo}</h2><button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button></div>
      {vista === "avisos_comentarios" ? (avisos.comentarios.length ? <div className="ng-documentos">{avisos.comentarios.map(o => <article className="ng-documento" key={o.id}><div><strong>Expediente {o.id_expediente} · {texto(o.solicitante)}</strong><p>{o.comentario}</p><small>{texto(o.oficina)} · {texto(o.fecha)} · {o.visibilidad}</small></div><button className="ng-boton-secundario" onClick={() => abrirExpediente({id_expediente:o.id_expediente})}>Abrir expediente →</button></article>)}</div> : <p className="ng-mensaje">No hay observaciones visibles para la notaría.</p>) : (avisos.documentos.length ? <div className="ng-documentos">{avisos.documentos.map(d => <article className="ng-documento" key={d.id}><div><strong>Expediente {d.id_expediente} · {texto(d.solicitante)}</strong><p>{d.nombre}</p><small>{texto(d.oficina)} · {texto(d.categoria)} · Añadido: {texto(d.fecha_subida)}</small></div><button className="ng-boton-secundario" onClick={() => abrirExpediente({id_expediente:d.id_expediente})}>Abrir expediente →</button></article>)}</div> : <p className="ng-mensaje">No hay documentos nuevos pendientes de revisar antes de la firma.</p>)}
    </section>}
    {vista === "firmas_urgentes" && <section className="ng-panel">
      <div className="ng-panel-titulo"><div><h2>Firmas urgentes</h2><p>Expedientes marcados como urgentes desde la planificación de la firma.</p></div><button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button></div>
      <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr><th>N.º expediente</th><th>Nombre</th><th>DNI</th><th>Fecha prevista</th><th>Hora</th><th>Notario</th><th>Acción</th></tr></thead><tbody>
      {expedientes.filter(x => x.firma_urgente).map(x => <tr key={x.id}><td>{texto(x.id_expediente)}</td><td>{texto([x.nombre,x.apellidos].filter(Boolean).join(" ") || x.titular)}</td><td>{texto(x.dni || x.nif_titular)}</td><td>{esFecha(x.fecha_prevista_firma)}</td><td>{texto(x.hora_prevista_firma)}</td><td>{texto(x.nombre_notario)}</td><td><button type="button" className="ng-login-submit" onClick={() => abrirExpediente(x)}>Abrir ficha →</button></td></tr>)}
      </tbody></table>{expedientes.filter(x => x.firma_urgente).length === 0 && <div className="ng-modal-vacio"><strong>No hay firmas urgentes</strong><p>Marca «Sí» en Firma urgente dentro de la planificación de la firma del envío a notario.</p></div>}</div>
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
        <details className="ng-detalle-bloque ng-workflow ng-bloque-estado ng-acordeon-ficha">
          <summary className="ng-bloque-heading"><div><span className="ng-kicker">FLUJO DE TRABAJO</span><h3>Gestión del estado</h3></div><span className={`ng-estado-pill ng-estado-${detalle.notargest_estado || "pendiente"}`}>{texto(bandejas.find(x => x.id === detalle.notargest_estado)?.titulo || detalle.notargest_estado)}</span><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
          {detalle.notargest_estado === "recepcion" && <button className="ng-login-submit" disabled={cargando} onClick={() => cambiarEstado("firma")}>Recepción encargo · Pasar a pendientes de firma</button>}
          {detalle.notargest_estado === "firma" && <div className="ng-workflow-form ng-firma-form"><label>Fecha de firma<input type="date" value={firmaFecha} onChange={e => setFirmaFecha(e.target.value)} /></label><label>Protocolo<input value={protocolo} onChange={e => setProtocolo(e.target.value)} placeholder="Número de protocolo" /></label><button className="ng-login-submit" disabled={cargando || !firmaFecha || !protocolo.trim()} onClick={() => cambiarEstado("factura")}>Guardar firma y pasar a pendientes de factura notaría</button><p className="ng-ayuda-campo">Esta acción solo está disponible mientras el expediente está en <strong>Pendientes de firma</strong>.</p></div>}
          {detalle.notargest_estado === "factura" && <p>Adjunta la factura notarial desde su bandeja. Al subirla, el expediente pasará a presentación en Registro.</p>}
          {detalle.notargest_estado === "registro" && <label className="ng-adjuntar">Subir justificante de presentación en Registro<input type="file" disabled={cargando} onChange={e => { subirDocumentoWorkflow("presentacion", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {detalle.notargest_estado === "ajd" && <label className="ng-adjuntar">Subir justificante AJD / ITP<input type="file" disabled={cargando} onChange={e => { subirDocumentoWorkflow("ajd", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {["inscripcion", "copia"].includes(detalle.notargest_estado) && <div className="ng-workflow-form"><label>Defecto registral (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("defecto", e.target.files?.[0]); e.target.value = ""; }} /></label><label>Hoja de inscripción (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("inscripcion", e.target.files?.[0]); e.target.value = ""; }} /></label>{String(detalle.tiene_defectos_abiertos || "").trim().toLowerCase() === "si" && <label>Subsanación del defecto (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("subsanacion", e.target.files?.[0]); e.target.value = ""; }} /></label>}<p>Los documentos se guardan en la Carpeta Digital. Si hay un defecto abierto, se deberá adjuntar la subsanación antes de cerrar.</p></div>}
          {detalle.notargest_estado === "copia" && <label className="ng-adjuntar">Subir copia simple (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("copia", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {detalle.notargest_estado === "cerrada" && <div className="ng-workflow-form"><label>Fecha de cierre<input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} /></label><label>Fecha de envío a gestoría<input type="date" value={fechaEnvioGestoria} onChange={e => setFechaEnvioGestoria(e.target.value)} /></label><button className="ng-login-submit" disabled={cargando || !fechaCierre} onClick={guardarCierre}>Guardar cierre y envío a gestoría</button></div>}
        </details>

        <div className="ng-datos-superiores">
          <details open className="ng-detalle-bloque ng-datos-envio ng-acordeon-ficha">
            <summary className="ng-bloque-heading"><div><span className="ng-kicker">01 · ENVÍO</span><h3>Datos de envío y firma prevista</h3></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
            <div className="ng-datos-grid ng-datos-operacion">{[
              ["Fecha de envío", esFecha(detalle.fecha_envio_notario || detalle.fecha_envio)], ["Fecha solicitud PNC", esFecha(detalle.fecha_solicitud_pnc)],
              ["Número solicitud PNC", detalle.numero_solicitud_pnc], ["Fecha prevista de firma", esFecha(detalle.fecha_prevista_firma)],
              ["Hora prevista de firma", detalle.hora_prevista_firma], ["Contrato", detalle.contrato], ["Capital", euros(detalle.capital)],
              ["Tipo de operación", detalle.tipo_operacion], ["Subtipo de operación", detalle.subtipo_operacion], ["Importe", euros(detalle.importe)]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
          </section>
          <details open className="ng-detalle-bloque ng-datos-facturacion-bloque ng-acordeon-ficha">
            <summary className="ng-bloque-heading"><div><span className="ng-kicker">02 · FACTURACIÓN</span><h3>Datos de facturación</h3></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
            <div className="ng-datos-grid ng-datos-facturacion">{[
              ["Nombre", detalle.facturacion_nombre ?? detalle.nombre_facturacion], ["Apellidos", detalle.facturacion_apellidos ?? detalle.apellidos_facturacion], ["DNI / NIF", detalle.facturacion_dni_nif ?? detalle.dni_facturacion ?? detalle.nif_facturacion],
              ["Dirección", detalle.facturacion_direccion ?? detalle.direccion_facturacion], ["Código postal", detalle.facturacion_codigo_postal ?? detalle.codigo_postal_facturacion], ["Población", detalle.facturacion_poblacion ?? detalle.poblacion_facturacion],
              ["Provincia", detalle.facturacion_provincia ?? detalle.provincia_facturacion], ["Teléfono", detalle.facturacion_telefono ?? detalle.telefono_facturacion], ["Correo electrónico", detalle.facturacion_email ?? detalle.email_facturacion]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
          </details>
        </div>
        <div className="ng-documentacion-layout">
          <details open className="ng-detalle-bloque ng-carpeta-premium ng-acordeon-ficha">
            <summary className="ng-bloque-heading"><div><span className="ng-kicker">03 · ARCHIVO</span><h3>Carpeta digital</h3><p className="ng-descripcion">Documentación del expediente, organizada por categoría, con visor PDF integrado.</p></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
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
          <details open className="ng-detalle-bloque ng-tipo-documento-bloque ng-acordeon-ficha">
            <summary className="ng-bloque-heading"><div><span className="ng-kicker">04 · DOCUMENTO</span><h3>Tipo de documento</h3><p className="ng-descripcion">Datos del documento remitidos desde el modal Enviar a notario.</p></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
            <div className="ng-datos-grid">{[
             ["Formato de escritura", detalle.formato_escritura], ["Tipo de trámite", detalle.tipo_tramite]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
            <h4 className="ng-subtitulo-detalle">Documentos y cuantías</h4>
            {detalle.documentos_escritura?.length ? <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr><th>Tipo de documento</th><th>Cuantía</th></tr></thead><tbody>{detalle.documentos_escritura.map((d,i) => <tr key={d.id || i}><td>{texto(d.tipo_documento)}</td><td>{euros(d.cuantia)}</td></tr>)}</tbody></table></div> : <div className="ng-datos-grid"><div className="ng-dato"><small>Tipo de documento</small><strong>{texto(detalle.tipo_documento)}</strong></div><div className="ng-dato"><small>Cuantía</small><strong>{euros(detalle.cuantia)}</strong></div></div>}
            <h4 className="ng-subtitulo-detalle">Fincas y registros</h4><p className="ng-descripcion">Datos registrales del expediente</p>
            {detalle.fincas?.length ? <div className="ng-fincas-lista">{detalle.fincas.map((f,i) => <article className="ng-finca-card" key={f.id || i}><strong>Finca {texto(f.finca)}</strong><span>{[f.poblacion,f.registro,f.provincia].filter(Boolean).join(" · ") || "—"}</span><div><small>CRU/IDUFIR</small><b>{texto(f.cru_idufir)}</b></div><div><small>Cuantía</small><b>{euros(f.cuantia)}</b></div><div><small>Inscripción</small><b>{texto(f.inscripcion)}</b></div><div><small>Contrato</small><b>{texto(f.contrato || detalle.contrato)}</b></div></article>)}</div> : <p className="ng-mensaje">No hay fincas registradas en este expediente.</p>}
          </details>
        </div>
        <details open className="ng-detalle-bloque ng-comentarios-gestor ng-acordeon-ficha">
          <summary className="ng-bloque-heading"><div><span className="ng-kicker">05 · COMUNICACIÓN</span><h3>Observaciones y comentarios</h3><p className="ng-descripcion">Envía un comentario directamente al gestor responsable del expediente.</p></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
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
    </details>}
    <footer className="ng-pie">MOLSAN ERP · PREMIUM 2027 · NotarGest</footer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
