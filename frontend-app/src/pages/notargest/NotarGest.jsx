import MolsanIcon from "../../components/ui/MolsanIcon";
import MolsanDataTable from "../../components/ui/MolsanDataTable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalLogin from "../../components/PortalLogin";
import Sidebar from "../../components/Sidebar";
import { useAuthStore } from "../../store/authStore";
import { API_BASE } from "../../api/config";
import "../../css/PortalProfesionalShared.css";
import "../../css/NotarGest.css";
import { formatEuro as euros } from "../../utils/formatters";

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


export default function NotarGest({ accessMode = "auto" } = {}) {
  const navigate = useNavigate();
  const tokenERP = useAuthStore((s) => s.token);
  const empleadoERP = useAuthStore((s) => s.empleado);
  // En la URL del portal externo se respeta siempre la sesión de notaría,
  // aunque el navegador conserve una sesión de empleado de MOLSAN.
  const accesoERP = accessMode !== "external" && Boolean(tokenERP && empleadoERP);
  const rolNotarGest = String(empleadoERP?.rol?.nombre || empleadoERP?.rol_nombre || empleadoERP?.nombre_rol || "").trim().toLowerCase();
  const esAdminNotarGest = String(empleadoERP?.usuario || "").trim().toLowerCase() === "admin" || /^(admin|administrador|administradora|superadmin)$/.test(rolNotarGest);
  const [tokenNotario, setTokenNotario] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [tokenAdminNotaria, setTokenAdminNotaria] = useState(() => sessionStorage.getItem("notargest_soporte_token") || "");
  const [notariasSeleccionables, setNotariasSeleccionables] = useState([]);
  const [notariaAdminSeleccionada, setNotariaAdminSeleccionada] = useState("");
  const [cargandoSelectorNotaria, setCargandoSelectorNotaria] = useState(false);
  const token = accesoERP ? (tokenAdminNotaria || tokenERP) : tokenNotario;
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
  const [passwordActualPerfil, setPasswordActualPerfil] = useState("");
  const [passwordNuevaPerfil, setPasswordNuevaPerfil] = useState("");
  const [passwordConfirmarPerfil, setPasswordConfirmarPerfil] = useState("");
  const [guardandoPasswordPerfil, setGuardandoPasswordPerfil] = useState(false);
  const [mensajePasswordPerfil, setMensajePasswordPerfil] = useState("");
  const [errorPasswordPerfil, setErrorPasswordPerfil] = useState("");
  const [pagosAbiertos, setPagosAbiertos] = useState(false);
  const [pagosNotario, setPagosNotario] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [avisosLeidos, setAvisosLeidos] = useState([]);
  const [modalExpedientesResumen, setModalExpedientesResumen] = useState(null);
  const [cargandoResumenExpedientes, setCargandoResumenExpedientes] = useState(false);

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
    if (accesoERP && esAdminNotarGest && !tokenAdminNotaria) return;
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
  }, [token, peticion, accesoERP, esAdminNotarGest, tokenAdminNotaria]);
  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!accesoERP || !esAdminNotarGest || !tokenERP) {
      setNotariasSeleccionables([]);
      setTokenAdminNotaria("");
      setNotariaAdminSeleccionada("");
      return;
    }
    let vigente = true;
    setCargandoSelectorNotaria(true);
    fetch(`${API_BASE}/notargest/seleccion/notarias`, { headers: { Authorization: `Bearer ${tokenERP}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "No se ha podido cargar el catálogo de notarías habilitadas.");
        return data;
      })
      .then((data) => { if (vigente) setNotariasSeleccionables(Array.isArray(data) ? data : []); })
      .catch((e) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargandoSelectorNotaria(false); });
    return () => { vigente = false; };
  }, [accesoERP, esAdminNotarGest, tokenERP]);


  async function abrirModalResumen(filtro, titulo, notariaId = null) {
    setCargandoResumenExpedientes(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/notargest/seleccion/expedientes`, {
        headers: { Authorization: `Bearer ${tokenERP}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "No se han podido cargar los expedientes del resumen.");
      const items = (Array.isArray(data.items) ? data.items : []).filter((item) => {
        const coincideNotaria = notariaId === null || String(item.notaria_id) === String(notariaId);
        const coincideFiltro = !filtro || Boolean(item[filtro]);
        return coincideNotaria && coincideFiltro;
      });
      setModalExpedientesResumen({ titulo, items, filtro, notariaId });
    } catch (e) {
      setError(e.message || "No se han podido cargar los expedientes.");
    } finally {
      setCargandoResumenExpedientes(false);
    }
  }

  async function abrirFichaDesdeResumen(item) {
    setCargando(true);
    setError("");
    try {
      const seleccion = await fetch(`${API_BASE}/notargest/seleccion/notaria/${encodeURIComponent(item.notaria_id)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenERP}`, "Content-Type": "application/json" },
      });
      const seleccionData = await seleccion.json().catch(() => ({}));
      if (!seleccion.ok) throw new Error(seleccionData.detail || "No se ha podido abrir la notaría.");
      const tokenNotaria = seleccionData.token;
      const headers = { Authorization: `Bearer ${tokenNotaria}`, "Content-Type": "application/json" };
      const id = encodeURIComponent(item.id_expediente || item.numero_expediente);
      const [detalleResponse, gestoresResponse] = await Promise.all([
        fetch(`${API_BASE}/notargest/expedientes/${id}`, { headers }),
        fetch(`${API_BASE}/notargest/gestores`, { headers }),
      ]);
      const detalleData = await detalleResponse.json().catch(() => ({}));
      const gestoresData = await gestoresResponse.json().catch(() => []);
      if (!detalleResponse.ok) throw new Error(detalleData.detail || "No se ha podido abrir la ficha del expediente.");
      if (!gestoresResponse.ok) throw new Error(Array.isArray(gestoresData) ? "No se ha podido cargar la lista de gestores." : (gestoresData.detail || "No se ha podido cargar la lista de gestores."));
      setTokenAdminNotaria(tokenNotaria);
      setNotariaAdminSeleccionada(String(seleccionData.notaria?.id || item.notaria_id));
      setNotario(seleccionData.notaria || null);
      setDetalle(detalleData);
      setGestores(Array.isArray(gestoresData) ? gestoresData : []);
      setComentarioGestor("");
      setGestorDestinatario("");
      setFirmaFecha(detalleData.fecha_firma || "");
      setProtocolo(detalleData.protocolo || "");
      setFechaCierre(detalleData.notargest_fecha_cierre || "");
      setFechaEnvioGestoria(detalleData.notargest_fecha_envio_gestoria || "");
      vistaOrigenFicha.current = "inicio";
      setVista("detalle");
      setBusqueda("");
      setModalExpedientesResumen(null);
    } catch (e) {
      setError(e.message || "No se ha podido abrir la ficha del expediente.");
    } finally {
      setCargando(false);
    }
  }

  async function seleccionarNotariaAdmin(notariaId) {
    if (!notariaId) {
      setTokenAdminNotaria("");
      setNotariaAdminSeleccionada("");
      setExpedientes([]);
      setDetalle(null);
      setNotario(null);
      setVista("inicio");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/notargest/seleccion/notaria/${encodeURIComponent(notariaId)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenERP}`, "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "No se ha podido abrir la notaría seleccionada.");
      setTokenAdminNotaria(data.token || "");
      setNotariaAdminSeleccionada(String(data.notaria?.id || notariaId));
      setNotario(data.notaria || null);
      setExpedientes([]);
      setDetalle(null);
      setVista("inicio");
      setBusqueda("");
    } catch (e) {
      setError(e.message || "No se ha podido seleccionar la notaría.");
    } finally {
      setCargando(false);
    }
  }



  async function cambiarPasswordPerfil(event) {
    event.preventDefault();
    setErrorPasswordPerfil("");
    setMensajePasswordPerfil("");
    if (passwordNuevaPerfil !== passwordConfirmarPerfil) {
      setErrorPasswordPerfil("Las nuevas contraseñas no coinciden.");
      return;
    }
    if (passwordNuevaPerfil.trim().length < 8) {
      setErrorPasswordPerfil("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setGuardandoPasswordPerfil(true);
    try {
      const resultado = await peticion("/notargest/cambiar-password", {
        method: "POST",
        body: JSON.stringify({ password_actual: passwordActualPerfil, password_nueva: passwordNuevaPerfil }),
      });
      setMensajePasswordPerfil(resultado.mensaje || "Contraseña actualizada correctamente.");
      setPasswordActualPerfil("");
      setPasswordNuevaPerfil("");
      setPasswordConfirmarPerfil("");
    } catch (e) {
      setErrorPasswordPerfil(e.message || "No se ha podido actualizar la contraseña.");
    } finally {
      setGuardandoPasswordPerfil(false);
    }
  }

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
      const response = await fetch(`${API_BASE}/notargest/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario: usuario.trim().toUpperCase(), password: password.trim() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Credenciales incorrectas.");
      localStorage.setItem(TOKEN_KEY, data.token); setTokenNotario(data.token); setNotario(data.notario); setPassword("");
    } catch (e2) { setError(e2.message); } finally { setCargando(false); }
  }
  function salir() {
    if (accesoERP) {
      useAuthStore.getState().logout();
      navigate("/login", { replace: true });
      return;
    }
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

  if (!token) return (
    <PortalLogin
      variant="notargest"
      title="NotarGest EP"
      subtitle="Acceso profesional para notarías autorizadas por MOLSAN. Consulta encargos, firmas y seguimiento registral."
      usernameLabel="DNI / NIF del notario"
      usernamePlaceholder="DNI/NIF completo, incluida la letra"
      passwordPlaceholder="Introduce tu contraseña"
      footnote="Usuario y contraseña inicial: NIF completo con letra, sin espacios ni guiones. Después podrás cambiarla desde tu perfil."
      submitLabel="Entrar en NotarGest EP"
      username={usuario}
      setUsername={(valor) => setUsuario(valor.toUpperCase())}
      password={password}
      setPassword={setPassword}
      onSubmit={entrar}
      loading={cargando}
      error={error}
    />
  );

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
  const volverVistaAnterior = () => {
    setBusqueda("");
    setVista(vista === "detalle" ? (vistaOrigenFicha.current || "inicio") : "inicio");
  };
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

  const actualizarDatosSidebar = async () => {
    if (accesoERP && esAdminNotarGest && !tokenAdminNotaria) {
      setCargandoSelectorNotaria(true);
      setError("");
      try {
        const response = await fetch(API_BASE + "/notargest/seleccion/notarias", {
          headers: { Authorization: "Bearer " + tokenERP },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "No se ha podido actualizar el resumen de notarías.");
        setNotariasSeleccionables(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "No se ha podido actualizar el resumen de notarías.");
      } finally {
        setCargandoSelectorNotaria(false);
      }
      return;
    }
    await cargar();
  };

  return (
    <div className="min-h-screen bg-[var(--erp-bg)] text-[var(--erp-text)]">
      <Sidebar
        brandName="NotarGest"
        navigationItems={accesoERP && esAdminNotarGest && !tokenAdminNotaria ? [] : [
          { key: "inicio", label: "Dashboard", icon: "home" },
          { key: "recepcion", label: "Nuevos encargos", icon: "clipboard-list", badge: cuenta("recepcion") },
          { key: "firma", label: "Pendientes de firma", icon: "clock", badge: cuenta("firma") },
          { key: "copia", label: "Pendientes copias simples", icon: "files", badge: cuenta("copia") },
          { key: "factura", label: "Pendientes de factura notarial", icon: "receipt", badge: cuenta("factura") },
          { key: "ajd", label: "Pendientes de AJD / ITP", icon: "file-text", badge: cuenta("ajd") },
          { key: "registro", label: "Pendientes de presentación registral", icon: "folder-check", badge: cuenta("registro") },
          { key: "defectos", label: "Expedientes con defectos", icon: "alert-triangle", badge: cuenta("defectos") },
          { key: "inscripcion", label: "Inscripciones registrales", icon: "book-check", badge: cuenta("inscripcion") },
          { key: "cerrada", label: "Escrituras cerradas inscritas", icon: "check-circle", badge: cuenta("cerrada") },
          { key: "firmas_urgentes", label: "Firmas urgentes", icon: "zap", badge: expedientes.filter(x => x.firma_urgente).length, attention: expedientes.some(x => x.firma_urgente) },
        ]}
        activeNavigationItem={sidebarVista}
        onNavigationItemClick={navegarSidebar}
        onNotificationsClick={() => setNotificacionesAbiertas(true)}
        notificationBadge={totalAvisosPendientes}
        onProfileClick={() => setPerfilNotarioAbierto(true)}
        onLogoutClick={salir}
        headerActions={
          <>
            <div className="ag-fecha-actual" aria-label={`Fecha actual: ${fechaActual}`}>
              <span className="ag-punto-vivo" aria-hidden="true" />
              <span>{fechaActual}</span>
            </div>
            <button
              type="button"
              className="ag-boton-actualizar"
              onClick={actualizarDatosSidebar}
              disabled={cargando || cargandoSelectorNotaria}
              aria-live="polite"
            >
              <MolsanIcon name="refresh" size={18} bare className={cargando || cargandoSelectorNotaria ? "ag-icono-girando" : ""} />
              {cargando || cargandoSelectorNotaria ? "Actualizando…" : "Actualizar datos"}
            </button>
          </>
        }
      />
      {notificacionesAbiertas && <div className="ng-modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setNotificacionesAbiertas(false); }}><section className="ng-modal ng-modal-avisos" role="dialog" aria-modal="true" aria-labelledby="ng-avisos-titulo"><header><div><span className="ng-kicker">NOTARGEST · AVISOS</span><h2 id="ng-avisos-titulo">Notificaciones pendientes</h2><p>Documentos nuevos y observaciones del gestor vinculados a tus expedientes.</p></div><button type="button" className="ng-boton-secundario" onClick={() => setNotificacionesAbiertas(false)}><MolsanIcon name="x" size={16} bare /> Cerrar</button></header><div className="ng-modal-lista">{totalAvisosPendientes === 0 ? <div className="ng-modal-vacio"><strong>Todo al día</strong><p>No tienes notificaciones pendientes de leer.</p></div> : <>{avisosPendientes.documentos.map(item => <article className="ng-aviso-item" key={`documento:${item.id}`}><span className="ng-aviso-icono">PDF</span><div className="ng-aviso-contenido"><strong>Nuevo documento en expediente {item.id_expediente}</strong><p>{texto(item.nombre)} · {texto(item.categoria)}</p><small>{texto(item.oficina)} · {texto(item.fecha_subida)}</small><div className="ng-aviso-acciones"><button type="button" className="ng-login-submit" onClick={() => abrirAvisoExpediente(item)}>Ver expediente</button><button type="button" className="ng-boton-secundario" onClick={() => marcarAvisoLeido("documento", item.id)}>Marcar como leída</button></div></div></article>)}{avisosPendientes.comentarios.map(item => <article className="ng-aviso-item" key={`comentario:${item.id}`}><span className="ng-aviso-icono ng-aviso-icono-observacion">!</span><div className="ng-aviso-contenido"><strong>Nueva observación · expediente {item.id_expediente}</strong><p>{texto(item.comentario)}</p><small>{texto(item.oficina)} · {texto(item.fecha)}</small><div className="ng-aviso-acciones"><button type="button" className="ng-login-submit" onClick={() => abrirAvisoExpediente(item)}>Ver expediente</button><button type="button" className="ng-boton-secundario" onClick={() => marcarAvisoLeido("comentario", item.id)}>Marcar como leída</button></div></div></article>)}</>}</div></section></div>}
      {pagosAbiertos && <div className="ng-modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPagosAbiertos(false); }}>
        <section className="ng-modal ng-modal-pagos ng-modal-pagos-amplio" role="dialog" aria-modal="true" aria-labelledby="ng-pagos-titulo">
          <header><div><span className="ng-kicker">NOTARGEST · GESTIÓN ECONÓMICA</span><h2 id="ng-pagos-titulo">Solicitudes de Pago efectuadas por Molsan</h2><p>Pagos registrados desde la Ficha de expediente y vinculados a la notaría.</p></div><button type="button" className="ng-boton-secundario" onClick={() => setPagosAbiertos(false)}>Cerrar</button></header>
          <div className="ng-pagos-tabla-wrap">
            <MolsanDataTable
              rows={pagosNotario}
          pagination
          pageSize={25}

              rowKey="id"
              minWidth="1300px"
              initialSort={{ key: "fecha_pago", direction: "desc" }}
              emptyText="No hay pagos efectuados. Los pagos marcados como «Pagado» en Ficha de expediente aparecerán aquí cuando estén vinculados a esta notaría."
              columns={[
                { key: "id_expediente", header: "N.º expediente", accessor: "id_expediente", sortType: "text", render: (value, item) => <button type="button" className="ng-abrir" onClick={() => { setPagosAbiertos(false); abrirExpediente({id_expediente:item.id_expediente}); }}>{texto(value)}</button> },
                { key: "fecha_pago", header: "Fecha de pago", accessor: "fecha_pago", sortType: "date", render: (value) => esFecha(value) },
                { key: "nombre", header: "Nombre", accessor: "nombre", sortType: "text", render: (value) => texto(value) },
                { key: "dni", header: "DNI", accessor: "dni", sortType: "text", render: (value) => texto(value) },
                { key: "importe", header: "Importe", accessor: "importe", sortType: "currency", align: "right", render: (value) => euros(value) },
                { key: "protocolo", header: "Protocolo", accessor: "protocolo", sortType: "text", render: (value) => texto(value) },
                { key: "fecha_firma", header: "Fecha de firma", accessor: "fecha_firma", sortType: "date", render: (value) => esFecha(value) },
                { key: "factura", header: "Factura notarial", sortable: false, accessor: (item) => item.factura_notarial_id, render: (_, item) => item.factura_notarial_id ? <button type="button" className="ng-pdf-link" title="Abrir factura notarial PDF" onClick={() => abrirPdfPago(item,"factura")}><MolsanIcon name="file" size={18} bare /> PDF</button> : "—" },
                { key: "justificante", header: "Justificante", sortable: false, accessor: (item) => item.justificante_documento_id || item.justificante_url, render: (_, item) => item.justificante_documento_id || item.justificante_url ? <button type="button" className="ng-pdf-link" title="Abrir justificante PDF" onClick={() => abrirPdfPago(item,"justificante")}><MolsanIcon name="file" size={18} bare /> PDF</button> : "—" },
              ]}
            />
            {cargandoPagos && <p className="ng-mensaje">Cargando pagos…</p>}
          </div>
        </section>
      </div>}
      {perfilNotarioAbierto && <div className="ng-modal-overlay ng-modal-overlay-scroll" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPerfilNotarioAbierto(false); }}><section className="ng-modal ng-modal-perfil ng-modal-perfil-scroll" role="dialog" aria-modal="true" aria-labelledby="ng-perfil-titulo"><header><div><span className="ng-kicker">FICHA CTN</span><h2 id="ng-perfil-titulo">Ficha del notario</h2><p>Datos de la notaría registrados en el catálogo CTN.</p></div><button type="button" className="ng-boton-secundario" onClick={() => setPerfilNotarioAbierto(false)}>Cerrar ✕</button></header><div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <div className="min-w-0">
            <div className="ng-perfil-identidad"><div className="ng-perfil-avatar"><MolsanIcon name="courthouse" size={36} /></div><div><strong>{texto(notario?.nombre)}</strong><span>{texto(notario?.nif)}</span></div></div>
            <div className="ng-perfil-datos">{[["Nombre",notario?.nombre],["NIF",notario?.nif],["Usuario",notario?.nif],["Teléfono",notario?.telefono],["Dirección",notario?.direccion],["Código postal",notario?.cp],["Municipio",notario?.municipio],["Provincia",notario?.provincia],["Código CTN",notario?.codigo],["Videoconferencia",notario?.vc],["Apoderado asociado",notario?.apoderado],["Departamento cancelaciones",notario?.departamento_cancelaciones],["Departamento copias",notario?.departamento_copias],["Otros departamentos",notario?.otros_departamentos]].map(([label,value]) => <div className="ng-dato" key={label}><small>{label}</small><strong>{texto(value)}</strong></div>)}</div>
            {notario?.observacion && <div className="ng-perfil-observacion"><small>Observaciones CTN</small><p>{notario.observacion}</p></div>}
          </div>
          <form onSubmit={cambiarPasswordPerfil} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div><h3 className="text-sm font-extrabold text-slate-900">Seguridad de la cuenta</h3><p className="mt-1 text-xs leading-5 text-slate-500">Usuario: NIF completo registrado en CTN. Si aún no has cambiado la contraseña inicial, utiliza tu NIF como contraseña.</p></div>
            {mensajePasswordPerfil && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{mensajePasswordPerfil}</p>}
            {errorPasswordPerfil && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{errorPasswordPerfil}</p>}
            <label className="block text-xs font-semibold text-slate-600">Contraseña actual<input required type="password" autoComplete="current-password" value={passwordActualPerfil} onChange={e=>setPasswordActualPerfil(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
            <label className="block text-xs font-semibold text-slate-600">Nueva contraseña<input required minLength={8} type="password" autoComplete="new-password" value={passwordNuevaPerfil} onChange={e=>setPasswordNuevaPerfil(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
            <label className="block text-xs font-semibold text-slate-600">Repetir nueva contraseña<input required minLength={8} type="password" autoComplete="new-password" value={passwordConfirmarPerfil} onChange={e=>setPasswordConfirmarPerfil(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /></label>
            <button type="submit" disabled={guardandoPasswordPerfil} className="ng-login-submit w-full">{guardandoPasswordPerfil ? "Guardando contraseña…" : "Cambiar contraseña"}</button>
          </form>
          </div>
        </section></div>}

      {modalExpedientesResumen && (
        <div className="ng-modal-overlay ng-resumen-expedientes-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModalExpedientesResumen(null); }}>
          <section className="ng-modal ng-resumen-expedientes-modal" role="dialog" aria-modal="true" aria-labelledby="ng-resumen-expedientes-titulo">
            <header>
              <div><span className="ng-kicker">NOTARGEST · VISIÓN MOLSAN</span><h2 id="ng-resumen-expedientes-titulo">{modalExpedientesResumen.titulo}</h2><p>{modalExpedientesResumen.items.length} expediente(s) coinciden con este bloque.</p></div>
              <button type="button" className="ng-boton-secundario" onClick={() => setModalExpedientesResumen(null)}>Cerrar</button>
            </header>
            <div className="ng-resumen-expedientes-contenido">
              {cargandoResumenExpedientes ? <p className="ng-mensaje">Cargando expedientes…</p> : modalExpedientesResumen.items.length === 0 ? <div className="ng-modal-vacio"><strong>No hay expedientes en este bloque</strong><p>Cuando existan expedientes que cumplan esta condición aparecerán aquí.</p></div> : (
                <div className="ng-resumen-expedientes-tabla-wrap">
                  <MolsanDataTable
                    rows={modalExpedientesResumen.items}
          pagination
          pageSize={25}

                    rowKey="id_expediente"
                    minWidth="1200px"
                    initialSort={{ key: "id_expediente", direction: "asc" }}
                    emptyText="No hay expedientes en este bloque."
                    columns={[
                      { key: "id_expediente", header: "Expediente", accessor: (item) => item.id_expediente || item.numero_expediente, sortType: "text", render: (value) => <strong>{texto(value)}</strong> },
                      { key: "notaria", header: "Notaría", accessor: "notaria_nombre", sortType: "text", render: (value) => texto(value) },
                      { key: "titular", header: "Titular / solicitante", accessor: (item) => item.titular || item.nombre_solicitante || item.solicitante, sortType: "text", render: (value) => texto(value) },
                      { key: "actividad", header: "Actividad actual", accessor: "actividad_actual", sortType: "text", render: (value) => texto(value) },
                      { key: "estado", header: "Estado", accessor: (item) => item.notargest_estado || item.estado_actividad || item.estado_expediente, sortType: "text", render: (value) => texto(value) },
                      { key: "fecha_firma", header: "Fecha firma", accessor: "fecha_firma", sortType: "date", render: (value) => esFecha(value) },
                      { key: "acciones", header: "", sortable: false, accessor: (item) => item.id_expediente, render: (_, item) => <button type="button" className="ng-abrir" disabled={cargando} onClick={() => abrirFichaDesdeResumen(item)}>Abrir ficha →</button> },
                    ]}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      {accesoERP && esAdminNotarGest && (
        <section className="ng-admin-notarias">
          {!tokenAdminNotaria ? <>
            <header className="ng-control-hero">
              <div className="ng-control-identidad molsan-page-header__identity">
                <div className="ng-control-logo molsan-page-header__mark" aria-hidden="true"><MolsanIcon name="courthouse" size={42} bare /></div>
                <div className="ng-control-titulos min-w-0">
                  <span className="ng-control-eyebrow">MOLSAN ERP · PREMIUM 2027</span>
                  <h2>NotarGest</h2>
                  <p>Visión global del trabajo notarial y detalle operativo de cada notaría habilitada.</p>
                </div>
              </div>
              <div className="ng-control-acciones">
                <div className="ng-control-botones">
                  <button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => navigate("/modulos")}><MolsanIcon name="dashboard" size={18} bare /> Ir a módulos</button>
                </div>
              </div>
            </header>
            {cargandoSelectorNotaria && <p className="ng-mensaje">Calculando pendientes de las notarías…</p>}
            {!cargandoSelectorNotaria && notariasSeleccionables.length === 0 && <div className="ng-admin-vacio"><strong>No hay notarías habilitadas</strong><p>Activa el acceso NotarGest desde la ficha CTN de cada notaría.</p></div>}
            <section className="ng-admin-global-resumen" aria-label="Resumen global de todas las notarías">
              <div className="ng-admin-global-titulo">
                <div><span className="ng-admin-global-eyebrow">RESUMEN CONSOLIDADO</span><h3>Visión global · todas las notarías</h3><p>Contadores acumulados de las {notariasSeleccionables.length} notarías habilitadas.</p></div>
                <span className="ng-admin-global-total">{notariasSeleccionables.length} habilitadas</span>
              </div>
              <div className="ng-admin-kpis ng-admin-kpis-global">
                {[
                  ["Nuevos encargos", "pendiente_recepcion", n => n.pendientes_recepcion],
                  ["Pendientes de firma", "pendiente_firma", n => n.pendientes_firma],
                  ["Pendientes copias simples", "pendiente_copia_simple", n => n.pendientes_copias],
                  ["Pendientes de factura notarial", "pendiente_factura_notarial", n => n.pendientes_factura],
                  ["Pendientes de AJD / ITP", "pendiente_ajd_itp", n => n.pendientes_ajd_itp],
                  ["Pendientes de presentación registral", "pendiente_presentacion_registro", n => n.pendientes_registro],
                  ["Expedientes con defectos", "con_defectos", n => n.con_defectos],
                  ["Inscripciones registrales", "pendiente_inscripcion", n => n.pendientes_inscripcion],
                  ["Escrituras cerradas inscritas", "escrituras_cerradas_inscritas", n => n.escrituras_cerradas],
                  ["Firmas urgentes", "firmas_urgentes", n => n.firmas_urgentes],
                ].map(([label, filtro, cuenta]) => (
                  <button type="button" className="ng-admin-kpi-button" key={filtro} onClick={() => abrirModalResumen(filtro, label)} title={`Ver expedientes: ${label}`}>
                    <MolsanIcon name={({ pendiente_recepcion: "clipboardList", pendiente_firma: "pen", pendiente_copia_simple: "files", pendiente_factura_notarial: "receipt", pendiente_ajd_itp: "calculator", pendiente_presentacion_registro: "folderOpen", con_defectos: "alert", pendiente_inscripcion: "book", escrituras_cerradas_inscritas: "check", firmas_urgentes: "zap" })[filtro] || "file"} size={34} tone={["con_defectos", "firmas_urgentes"].includes(filtro) ? "amber" : "ocean"} /><span>{label}</span><strong className={["con_defectos", "firmas_urgentes"].includes(filtro) && notariasSeleccionables.some(n => Number(cuenta(n)) > 0) ? "ng-cifra-urgente" : ""}>{notariasSeleccionables.reduce((s, n) => s + Number(cuenta(n) || 0), 0)}</strong>
                    <small>Ver expedientes <span aria-hidden="true">↗</span></small>
                  </button>
                ))}
              </div>
            </section>
            <div className="ng-admin-individual-titulo"><span className="ng-admin-global-eyebrow">DETALLE POR NOTARÍA</span><h3>Situación individual</h3><p>Cada ficha muestra los contadores y las incidencias de esa notaría.</p></div>
            <div className="ng-admin-notarias-grid">
              {notariasSeleccionables.map(item => {
                const urgentes = Number(item.firmas_urgentes || 0);
                const pendiente = Number(item.total_pendiente || 0);
                const defectos = Number(item.con_defectos || 0);
                return <article className={`ng-admin-notaria-card ${urgentes > 0 ? "tiene-urgentes" : ""}`} key={item.id}>
                  <header className="ng-admin-card-header">
                    <div className="ng-admin-notaria-identidad">
                      <span className="ng-admin-notaria-icono" aria-hidden="true"><MolsanIcon name="courthouse" size={34} /></span>
                      <div className="ng-admin-notaria-titulo">
                        <h3>{item.nombre || "Notaría sin nombre"}</h3>
                        <p><MolsanIcon name="pin" size={15} bare /> {[item.municipio, item.provincia].filter(Boolean).join(" · ") || "Ubicación no indicada"}</p>
                        <small>{item.nif || "NIF no indicado"} <span>·</span> {Number(item.total_expedientes || 0)} expedientes en circuito</small>
                      </div>
                    </div>
                    <span className={`ng-admin-estado ${urgentes > 0 || defectos > 0 ? "ng-admin-estado-alerta" : "ng-admin-estado-ok"}`}>
                      <i aria-hidden="true" />{urgentes > 0 ? "Requiere atención" : defectos > 0 ? "Con incidencias" : "Operativa"}
                    </span>
                  </header>
                  <div className="ng-admin-resumen">
                    <div className="ng-admin-resumen-principal">
                      <span>Pendientes totales</span>
                      <strong>{pendiente}</strong>
                      <small>Expedientes que requieren actuación</small>
                    </div>
                    <div className={`ng-admin-resumen-secundario ${urgentes > 0 ? "es-urgente" : ""}`}>
                      <span>Firmas urgentes</span><strong>{urgentes}</strong>
                    </div>
                    <div className={`ng-admin-resumen-secundario ${defectos > 0 ? "es-defecto" : ""}`}>
                      <span>Con defectos</span><strong>{defectos}</strong>
                    </div>
                  </div>
                  <div className="ng-admin-circuitos">
                    <section className="ng-admin-circuito">
                      <div className="ng-admin-circuito-titulo"><span className="ng-admin-circuito-icono">01</span><h4>Gestión notarial</h4></div>
                      <div className="ng-admin-metricas">
                        <div><span>Nuevos encargos</span><strong>{Number(item.pendientes_recepcion || 0)}</strong></div>
                        <div><span>Firma</span><strong>{Number(item.pendientes_firma || 0)}</strong></div>
                        <div><span>Facturas</span><strong>{Number(item.pendientes_factura || 0)}</strong></div>
                        <div><span>Copias</span><strong>{Number(item.pendientes_copias || 0)}</strong></div>
                      </div>
                    </section>
                    <section className="ng-admin-circuito">
                      <div className="ng-admin-circuito-titulo"><span className="ng-admin-circuito-icono ng-admin-circuito-icono-fiscal">02</span><h4>Registro y fiscalidad</h4></div>
                      <div className="ng-admin-metricas">
                        <div><span>Registro</span><strong>{Number(item.pendientes_registro || 0)}</strong></div>
                        <div><span>AJD / ITP</span><strong>{Number(item.pendientes_ajd_itp || 0)}</strong></div>
                        <div><span>Inscripción</span><strong>{Number(item.pendientes_inscripcion || 0)}</strong></div>
                        <div><span>Cerradas inscritas</span><strong>{Number(item.escrituras_cerradas || 0)}</strong></div>
                        <div><span>Defectos</span><strong className={defectos > 0 ? "ng-cifra-urgente" : ""}>{defectos}</strong></div>
                      </div>
                    </section>
                  </div>
                  <button type="button" className="ng-admin-ver-expedientes" disabled={cargandoResumenExpedientes} onClick={() => abrirModalResumen(null, `Expedientes · ${item.nombre || "Notaría"}`, item.id)}>
                    <span>Ver expedientes</span><MolsanIcon name="arrowRight" size={17} bare />
                  </button>
                  <button type="button" className="ng-admin-entrar" disabled={cargando} onClick={() => seleccionarNotariaAdmin(String(item.id))}>
                    <span>Acceder al espacio de trabajo</span><MolsanIcon name="arrowRight" size={17} bare />
                  </button>
                </article>;
              })}
            </div>
          </> : <div className="ng-admin-notaria-activa"><div><span className="ng-kicker">NOTARÍA SELECCIONADA</span><h2>{notariasSeleccionables.find(x=>String(x.id)===String(notariaAdminSeleccionada))?.nombre || notario?.nombre || "Notaría"}</h2><p>Estás gestionando esta notaría como administrador.</p></div><button type="button" className="ng-boton-secundario" onClick={()=>seleccionarNotariaAdmin("")}>← Volver al control de notarías</button></div>}
        </section>
      )}
      {(!accesoERP || !esAdminNotarGest || Boolean(tokenAdminNotaria)) && <main className="relative min-h-[calc(100vh-70px)]">
        <div className="w-full px-4 py-6 lg:px-6">
          <div className="w-full apoderagest notargest-workspace-premium">
            <div className="notargest ng-content">
    <header className="ag-hero molsan-page-header ng-hero-apoderagest">
      <div className="ag-hero-identidad molsan-page-header__identity">
        <div className="ag-marca ng-marca-notargest molsan-page-header__mark" aria-label="NotarGest">NG</div>
        <div>
          <div className="ag-eyebrow molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</div>
          <h1 className="molsan-page-header__title">NotarGest</h1>
          <p className="molsan-page-header__description">Centro de gestión notarial, firmas y seguimiento registral.</p>
        </div>
      </div>
      <div className="ag-hero-acciones molsan-page-header__actions">
        {vista !== "inicio" && <button type="button" onClick={volverVistaAnterior} className="ng-boton-secundario"><MolsanIcon name="arrowLeft" size={16} bare /> Volver</button>}
        {accesoERP && <button type="button" onClick={() => navigate("/modulos")} className="molsan-btn molsan-btn--secondary inline-flex items-center gap-2"><MolsanIcon name="dashboard" size={18} bare /> Ir a módulos</button>}
      </div>
    </header>

    {error && <div className="ng-error" role="alert">{error}</div>}{mensaje && <div className="ng-success">{mensaje}</div>}
    {vista === "inicio" && <section className="ng-dashboard-analitica">
      <div className="ng-dashboard-graficos ng-dashboard-graficos-tres-columnas">
        <section className="ng-dashboard-grafico ng-dashboard-actividad"><div className="ng-bloque-heading"><div><span className="ng-kicker">ACTIVIDAD</span><h3>Firmas realizadas por mes</h3></div></div>
          {(() => {
            const meses = [];
            const ahora = new Date();
            for (let i=5;i>=0;i--) { const d=new Date(ahora.getFullYear(),ahora.getMonth()-i,1); meses.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("es-ES",{month:"short",year:"2-digit"}),valor:0}); }
            expedientes.filter(x=>x.fecha_firma && x.protocolo).forEach(x=>{const key=String(x.fecha_firma).slice(0,7);const m=meses.find(z=>z.key===key);if(m)m.valor++;});
            const max=Math.max(1,...meses.map(m=>m.valor));
            return <div className="ng-barras-meses">{meses.map(m=><div className="ng-barra-mes" key={m.key}><strong>{m.valor}</strong><div className="ng-barra-pista"><span style={{height:`${Math.max(m.valor?6:0,m.valor/max*100)}%`}} /></div><small>{m.label}</small></div>)}</div>;
          })()}
        </section>
        <section className="ng-dashboard-grafico ng-dashboard-pagos ng-dashboard-economica">
          <div className="ng-bloque-heading">
            <div className="flex items-center gap-3"><MolsanIcon name="wallet" size={36} /><div><span className="ng-kicker">GESTIÓN ECONÓMICA</span><h3>Pagos</h3></div></div>
            <button type="button" className="ng-abrir" onClick={abrirPagos}><MolsanIcon name="wallet" size={16} bare /> Ver pagos</button>
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
        <section className="ng-dashboard-grafico ng-dashboard-etapas ng-dashboard-hitos"><div className="ng-bloque-heading"><div><span className="ng-kicker">SEGUIMIENTO DE HITOS</span><h3>Ciclo registral</h3></div></div>
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
      <div className="ng-panel-titulo"><h2>{titulo}</h2><button className="ng-volver" onClick={() => setVista("inicio")}><MolsanIcon name="arrowLeft" size={16} bare /> Volver</button></div>
      {vista === "avisos_comentarios" ? (avisos.comentarios.length ? <div className="ng-documentos">{avisos.comentarios.map(o => <article className="ng-documento" key={o.id}><div><strong>Expediente {o.id_expediente} · {texto(o.solicitante)}</strong><p>{o.comentario}</p><small>{texto(o.oficina)} · {texto(o.fecha)} · {o.visibilidad}</small></div><button className="ng-boton-secundario" onClick={() => abrirExpediente({id_expediente:o.id_expediente})}><MolsanIcon name="arrowRight" size={16} bare /> Abrir expediente</button></article>)}</div> : <p className="ng-mensaje">No hay observaciones visibles para la notaría.</p>) : (avisos.documentos.length ? <div className="ng-documentos">{avisos.documentos.map(d => <article className="ng-documento" key={d.id}><div><strong>Expediente {d.id_expediente} · {texto(d.solicitante)}</strong><p>{d.nombre}</p><small>{texto(d.oficina)} · {texto(d.categoria)} · Añadido: {texto(d.fecha_subida)}</small></div><button className="ng-boton-secundario" onClick={() => abrirExpediente({id_expediente:d.id_expediente})}><MolsanIcon name="arrowRight" size={16} bare /> Abrir expediente</button></article>)}</div> : <p className="ng-mensaje">No hay documentos nuevos pendientes de revisar antes de la firma.</p>)}
    </section>}
    {vista === "firmas_urgentes" && <section className="ng-panel">
      <div className="ng-panel-titulo"><div><h2>Firmas urgentes</h2><p>Expedientes marcados como urgentes desde la planificación de la firma.</p></div><button className="ng-volver" onClick={() => setVista("inicio")}><MolsanIcon name="arrowLeft" size={16} bare /> Volver</button></div>
      <div className="ng-tabla-contenedor">
        <MolsanDataTable
          rows={expedientes.filter(x => x.firma_urgente)}
          pagination
          pageSize={25}

          rowKey="id"
          minWidth="1050px"
          initialSort={{ key: "fecha_prevista", direction: "asc" }}
          emptyText="No hay firmas urgentes. Marca «Sí» en Firma urgente dentro de la planificación de la firma del envío a notario."
          columns={[
            { key: "id_expediente", header: "N.º expediente", accessor: "id_expediente", sortType: "text", render: (value) => texto(value) },
            { key: "nombre", header: "Nombre", accessor: (item) => [item.nombre, item.apellidos].filter(Boolean).join(" ") || item.titular, sortType: "text", render: (value) => texto(value) },
            { key: "dni", header: "DNI", accessor: (item) => item.dni || item.nif_titular, sortType: "text", render: (value) => texto(value) },
            { key: "fecha_prevista", header: "Fecha prevista", accessor: "fecha_prevista_firma", sortType: "date", render: (value) => esFecha(value) },
            { key: "hora", header: "Hora", accessor: "hora_prevista_firma", sortType: "text", render: (value) => texto(value) },
            { key: "notario", header: "Notario", accessor: "nombre_notario", sortType: "text", render: (value) => texto(value) },
            { key: "acciones", header: "Acción", sortable: false, accessor: (item) => item.id, render: (_, item) => <button type="button" className="ng-login-submit" onClick={() => abrirExpediente(item)}>Abrir ficha →</button> },
          ]}
        />
      </div>
    </section>}
    {bandejas.some(b => b.id === vista) && <section className="ng-panel">
      <div className="ng-panel-titulo"><h2>{titulo}</h2><button className="ng-volver" onClick={() => setVista("inicio")}><MolsanIcon name="arrowLeft" size={16} bare /> Volver</button></div>
      <div className="ng-filtros"><label>Buscar<input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Expediente, oficina, solicitante, protocolo…" /></label><span>{filas.length} registros</span></div>
      <div className="ng-tabla-contenedor">
        <MolsanDataTable
          rows={filas}
          pagination
          pageSize={25}

          rowKey="id"
          minWidth={tablaFactura ? "1200px" : "1900px"}
          initialSort={{ key: "id_expediente", direction: "asc" }}
          emptyText={cargando ? "Cargando expedientes…" : "No hay expedientes pendientes en este estado."}
          columns={tablaFactura ? [
            { key: "id_expediente", header: "Provisión", accessor: (item) => item.id_provision || item.id_expediente, sortType: "text", render: (value, item) => <button type="button" className="ng-abrir" onClick={() => abrirExpediente(item)}>{texto(value)}</button> },
            { key: "oficina", header: "Oficina", accessor: "oficina", sortType: "text", render: (value) => texto(value) },
            { key: "fecha_envio", header: "Fecha de envío", accessor: (item) => item.fecha_envio_notario || item.fecha_envio, sortType: "date", render: (value) => esFecha(value) },
            { key: "fecha_firma", header: "Fecha de firma", accessor: "fecha_firma", sortType: "date", render: (value) => esFecha(value) },
            { key: "protocolo", header: "Protocolo", accessor: "protocolo", sortType: "text", render: (value) => texto(value) },
            { key: "solicitante", header: "Solicitante", accessor: "solicitante", sortType: "text", render: (value) => texto(value) },
            { key: "factura", header: "Factura notarial", accessor: (item) => item.factura_notarial?.nombre, sortType: "text", render: (_, item) => item.factura_notarial ? <button type="button" className="ng-abrir" onClick={() => abrirExpediente(item)}>{item.factura_notarial.nombre}</button> : "Pendiente" },
            { key: "adjuntar", header: "Adjuntar", sortable: false, accessor: (item) => item.id, render: (_, item) => <label className="ng-adjuntar">Adjuntar PDF<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { adjuntarFactura(item, e.target.files?.[0]); e.target.value = ""; }} /></label> },
          ] : [
            { key: "id_expediente", header: "Expediente", accessor: "id_expediente", sortType: "text", render: (value) => texto(value) },
            { key: "oficina", header: "Oficina", accessor: "oficina", sortType: "text", render: (value) => texto(value) },
            { key: "fecha_envio", header: "Fecha de envío", accessor: (item) => item.fecha_envio_notario || item.fecha_envio, sortType: "date", render: (value) => esFecha(value) },
            { key: "nombre", header: "Nombre", accessor: (item) => item.nombre || item.nombre_titular || item.titular, sortType: "text", render: (value) => texto(value) },
            { key: "apellidos", header: "Apellidos", accessor: "apellidos", sortType: "text", render: (value) => texto(value) },
            { key: "dni", header: "DNI", accessor: (item) => item.dni || item.nif_titular, sortType: "text", render: (value) => texto(value) },
            { key: "contrato", header: "Contrato", accessor: "contrato", sortType: "text", render: (value) => texto(value) },
            { key: "capital", header: "Capital", accessor: "capital", sortType: "currency", align: "right", render: (value) => euros(value) },
            { key: "finca", header: "Finca", accessor: (item) => item.finca || item.fincas?.map(f => f.finca).filter(Boolean).join(", "), sortType: "text", render: (value) => texto(value) },
            { key: "tipo_operacion", header: "Tipo operación", accessor: "tipo_operacion", sortType: "text", render: (value) => texto(value) },
            { key: "subtipo_operacion", header: "Subtipo operación", accessor: "subtipo_operacion", sortType: "text", render: (value) => texto(value) },
            { key: "importe", header: "Importe", accessor: "importe", sortType: "currency", align: "right", render: (value) => euros(value) },
            { key: "tipo_documento", header: "Tipo del documento", accessor: (item) => item.tipo_documento || item.documentos_escritura?.map(d => d.tipo_documento).filter(Boolean).join(", "), sortType: "text", render: (value) => texto(value) },
            { key: "cuantia_documento", header: "Cuantía del documento", accessor: (item) => item.cuantia_documento ?? item.cuantia ?? item.documentos_escritura?.[0]?.cuantia, sortType: "currency", align: "right", render: (value) => euros(value) },
            { key: "acciones", header: "Acción", sortable: false, accessor: (item) => item.id, render: (_, item) => <button type="button" className="ng-abrir" onClick={() => abrirExpediente(item)}><MolsanIcon name="arrowRight" size={16} bare /> Ver ficha</button> },
          ]}
        />
      </div>
    </section>}
    {esDetalle && <section className="ng-panel ng-ficha">
      <div className="ng-panel-titulo ng-ficha-cabecera"><div><h2>{titulo}</h2><small>Ficha operativa del expediente · NotarGest</small></div><button className="ng-volver" onClick={() => setVista(vistaOrigenFicha.current || "inicio")}><MolsanIcon name="arrowLeft" size={16} bare /> Volver al listado</button></div>
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
          <details open className="ng-detalle-bloque ng-tipo-documento-bloque ng-acordeon-ficha">
            <summary className="ng-bloque-heading"><div><span className="ng-kicker">04 · DOCUMENTO</span><h3>Tipo de documento</h3><p className="ng-descripcion">Datos del documento remitidos desde el modal Enviar a notario.</p></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
            <div className="ng-datos-grid">{[
             ["Formato de escritura", detalle.formato_escritura], ["Tipo de trámite", detalle.tipo_tramite]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
            <h4 className="ng-subtitulo-detalle">Documentos y cuantías</h4>
            {detalle.documentos_escritura?.length ? <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr><th>Tipo de documento</th><th>Cuantía documento</th></tr></thead><tbody>{detalle.documentos_escritura.map((d,i) => <tr key={d.id || i}><td>{texto(d.tipo_documento)}</td><td>{euros(d.cuantia_documento ?? d.cuantia)}</td></tr>)}</tbody></table></div> : <div className="ng-datos-grid"><div className="ng-dato"><small>Tipo de documento</small><strong>{texto(detalle.tipo_documento)}</strong></div><div className="ng-dato"><small>Cuantía documento</small><strong>{euros(detalle.cuantia_documento ?? detalle.cuantia)}</strong></div></div>}
            <h4 className="ng-subtitulo-detalle">Fincas y registros</h4><p className="ng-descripcion">Datos registrales del expediente</p>
            {detalle.fincas?.length ? <div className="ng-fincas-lista">{detalle.fincas.map((f,i) => <article className="ng-finca-card" key={f.id || i}><strong>Finca {texto(f.finca)}</strong><span>{[f.poblacion,f.registro,f.provincia].filter(Boolean).join(" · ") || "—"}</span><div><small>CRU/IDUFIR</small><b>{texto(f.cru_idufir)}</b></div><div><small>Cuantía</small><b>{euros(f.cuantia)}</b></div><div><small>Inscripción</small><b>{texto(f.inscripcion)}</b></div><div><small>Contrato</small><b>{texto(f.contrato || detalle.contrato)}</b></div></article>)}</div> : <p className="ng-mensaje">No hay fincas registradas en este expediente.</p>}
          </details>

          <details open className="ng-detalle-bloque ng-datos-envio ng-acordeon-ficha">
            <summary className="ng-bloque-heading"><div><span className="ng-kicker">01 · ENVÍO</span><h3>Datos de envío y firma prevista</h3></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
            <div className="ng-datos-grid ng-datos-operacion">{[
              ["Fecha de envío", esFecha(detalle.fecha_envio_notario || detalle.fecha_envio)], ["Fecha solicitud PNC", esFecha(detalle.fecha_solicitud_pnc)],
              ["Número solicitud PNC", detalle.numero_solicitud_pnc], ["Fecha prevista de firma", esFecha(detalle.fecha_prevista_firma)],
              ["Hora prevista de firma", detalle.hora_prevista_firma], ["Contrato", detalle.contrato], ["Capital", euros(detalle.capital)],
              ["Tipo de operación", detalle.tipo_operacion], ["Subtipo de operación", detalle.subtipo_operacion], ["Importe", euros(detalle.importe)]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
          </details>
          <details open className="ng-detalle-bloque ng-datos-facturacion-bloque ng-acordeon-ficha">
            <summary className="ng-bloque-heading"><div><span className="ng-kicker">02 · FACTURACIÓN</span><h3>Datos de facturación</h3></div><span className="ng-acordeon-flecha" aria-hidden="true">⌄</span></summary>
            <div className="ng-datos-grid ng-datos-facturacion">{[
              ["Nombre", detalle.facturacion_nombre ?? detalle.nombre_facturacion ?? detalle.nombre_cliente_facturacion], ["Apellidos", detalle.facturacion_apellidos ?? detalle.apellidos_facturacion ?? detalle.apellidos_cliente_facturacion], ["DNI / NIF", detalle.facturacion_dni_nif ?? detalle.dni_facturacion ?? detalle.nif_facturacion],
              ["Dirección", detalle.facturacion_direccion ?? detalle.direccion_facturacion ?? detalle.direccion_cliente_facturacion], ["Código postal", detalle.facturacion_codigo_postal ?? detalle.codigo_postal_facturacion ?? detalle.cp_facturacion], ["Población", detalle.facturacion_poblacion ?? detalle.poblacion_facturacion ?? detalle.municipio_facturacion],
              ["Provincia", detalle.facturacion_provincia ?? detalle.provincia_facturacion], ["Teléfono", detalle.facturacion_telefono ?? detalle.telefono_facturacion ?? detalle.telefono_cliente_facturacion], ["Correo electrónico", detalle.facturacion_email ?? detalle.email_facturacion ?? detalle.correo_facturacion]
            ].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div>
          </details>
        </div>
        <div className="ng-documentacion-layout">
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
        </details>

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
                    {docs.length ? docs.map(d => <div className="ng-archivo-row" key={d.id}><span className="ng-pdf-icon"><MolsanIcon name="file" size={18} bare /> PDF</span><div className="ng-archivo-info"><strong>{d.nombre}</strong><small>{esFecha(d.fecha_subida)}</small></div><button type="button" className="ng-boton-secundario" onClick={() => abrirDocumento(d)}>Ver a la derecha</button></div>) : <p className="ng-vacio-categoria">Todavía no hay archivos. Usa «Adjuntar PDF» para incorporarlo aquí.</p>}
                  </div>;
                })}
              </div>
              <aside className="ng-visor-documentos"><div className="ng-visor-cabecera"><div><span className="ng-kicker">VISOR INTEGRADO</span><strong>Visor de documentos</strong><small>{documentoSeleccionado ? documentoSeleccionado.nombre : "Selecciona «Ver a la derecha» en un archivo"}</small></div><button className="ng-boton-secundario" type="button" onClick={() => setVisorAmpliado(v => !v)}>{visorAmpliado ? "⤢ Reducir" : "⛶ Ampliar"}</button></div>
                {documentoSeleccionadoUrl ? <iframe className={`ng-pdf-frame ${visorAmpliado ? "ng-pdf-ampliado" : ""}`} title="Vista previa del documento" src={documentoSeleccionadoUrl} /> : <div className="ng-visor-vacio"><MolsanIcon name="file" size={42} /><strong>Vista previa</strong><p>Adjunta un PDF o pulsa «Ver a la derecha» en uno de los documentos para consultarlo aquí sin salir de la actividad.</p></div>}
              </aside>
            </div>
          </details>
        </div>
      </div>
    </section>}
    <footer className="ng-pie">MOLSAN ERP · PREMIUM 2027 · NotarGest</footer>
            </div>
          </div>
        </div>
      </main>}
    </div>
  );
}
