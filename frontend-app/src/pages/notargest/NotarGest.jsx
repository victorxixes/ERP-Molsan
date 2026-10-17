import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function NotarGest() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [expedientes, setExpedientes] = useState([]);
  const [notario, setNotario] = useState(null);
  const [vista, setVista] = useState("inicio");
  const [detalle, setDetalle] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [firmaFecha, setFirmaFecha] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [fechaEnvioGestoria, setFechaEnvioGestoria] = useState("");

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
    } catch (e) {
      setError(e.message);
      if (/sesión|acceso notargest deshabilitado|caducado/i.test(e.message)) { localStorage.removeItem(TOKEN_KEY); setToken(""); }
    } finally { setCargando(false); }
  }, [token, peticion]);
  useEffect(() => { cargar(); }, [cargar]);

  async function entrar(e) {
    e.preventDefault(); setCargando(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/notargest/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario: usuario.trim().toUpperCase(), password: password.trim().toUpperCase() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Credenciales incorrectas.");
      localStorage.setItem(TOKEN_KEY, data.token); setToken(data.token); setNotario(data.notario); setPassword("");
    } catch (e2) { setError(e2.message); } finally { setCargando(false); }
  }
  function salir() { localStorage.removeItem(TOKEN_KEY); setToken(""); setNotario(null); setExpedientes([]); setDetalle(null); setPassword(""); setVista("inicio"); }

  async function abrirExpediente(item) {
    setCargando(true); setError(""); setMensaje("");
    try {
      const id = encodeURIComponent(item.id_expediente || item.numero_expediente);
      const data = await peticion(`/notargest/expedientes/${id}`);
      setDetalle(data); setFirmaFecha(data.fecha_firma || ""); setProtocolo(data.protocolo || ""); setFechaCierre(data.notargest_fecha_cierre || ""); setFechaEnvioGestoria(data.notargest_fecha_envio_gestoria || ""); setVista("detalle");
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

  async function abrirDocumento(doc) {
    try {
      const id = encodeURIComponent(detalle.id_expediente);
      const response = await fetch(`${API_BASE}/notargest/expedientes/${id}/documentos/${doc.id}/descargar`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.detail || "No se ha podido abrir el documento."); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e.message); }
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
  const titulo = esDetalle ? `Expediente ${detalle.id_expediente}` : (bandejas.find(b => b.id === vista)?.titulo || (vista === "inicio" ? "Mis tareas pendientes" : vista === "documentacion" ? "Carpeta Digital" : "NotarGest"));
  const tablaFactura = vista === "factura";
  return <main className="apoderagest notargest">
    <header className="ng-cabecera"><div><span className="ng-sobrelinea">PORTAL PROFESIONAL · MOLSAN</span><h1>NotarGest</h1><p>{notario?.nombre || "Portal de la notaría"}</p></div><div className="ng-cabecera-acciones"><button className="ng-boton-secundario" onClick={cargar} disabled={cargando}>↻ Actualizar</button><button className="ng-boton-secundario" onClick={salir}>Cerrar sesión</button></div></header>
    {error && <div className="ng-error" role="alert">{error}</div>}{mensaje && <div className="ng-success">{mensaje}</div>}
    {vista === "inicio" && <>
      <section className="ng-contadores">{bandejas.slice(0,4).map(b => <button key={b.id} className="ng-contador" onClick={() => {setBusqueda("");setVista(b.id);}}><span>{b.titulo}</span><strong>{cargando ? "…" : cuenta(b.id)}</strong></button>)}</section>
      <section className="ng-panel"><div className="ng-panel-titulo"><h2>Estados de trabajo</h2></div><div className="ng-lista-tareas">{bandejas.map(b => <button className="ng-tarea" key={b.id} onClick={() => {setBusqueda("");setVista(b.id);}}><span>{b.titulo}</span><strong>{cuenta(b.id)}</strong><span className="ng-flecha">›</span></button>)}</div></section>
    </>}
    {bandejas.some(b => b.id === vista) && <section className="ng-panel">
      <div className="ng-panel-titulo"><h2>{titulo}</h2><button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button></div>
      <div className="ng-filtros"><label>Buscar<input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Expediente, oficina, solicitante, protocolo…" /></label><span>{filas.length} registros</span></div>
      <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr>{tablaFactura ? <><th>Provisión</th><th>Ofic.</th><th>F. alta</th><th>F. firma</th><th>Protocolo</th><th>Solicitante</th><th>PDF factura notaría</th><th>Adjuntar</th></> : <><th>Expediente</th><th>Oficina</th><th>F. envío</th><th>F. firma prevista</th><th>F. firma</th><th>Protocolo</th><th>Solicitante</th><th>Titular</th><th>Actividad / estado</th><th>Acceso</th></>}</tr></thead><tbody>
      {filas.map(x => <tr key={x.id}><td><button className="ng-abrir" onClick={() => abrirExpediente(x)}>{x.id_expediente}</button></td>{tablaFactura ? <><td>{texto(x.oficina)}</td><td>{esFecha(x.fecha_alta)}</td><td>{esFecha(x.fecha_firma)}</td><td>{texto(x.protocolo)}</td><td>{texto(x.solicitante)}</td><td>{x.factura_notarial ? <button className="ng-abrir" onClick={() => abrirExpediente(x)}>{x.factura_notarial.nombre}</button> : "Pendiente"}</td><td><label className="ng-adjuntar">Adjuntar PDF<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => {adjuntarFactura(x, e.target.files?.[0]);e.target.value="";}} /></label></td></> : <><td>{texto(x.oficina)}</td><td>{esFecha(x.fecha_envio_notario || x.fecha_envio)}</td><td>{esFecha(x.fecha_prevista_firma)}</td><td>{esFecha(x.fecha_firma)}</td><td>{texto(x.protocolo)}</td><td>{texto(x.solicitante)}</td><td>{texto(x.titular)}</td><td>{texto(x.actividad_actual || x.estado_actividad || x.estado)}</td><td><button className="ng-abrir" onClick={() => abrirExpediente(x)}>Abrir ficha →</button></td></>}</tr>)}
      </tbody></table>{filas.length === 0 && <p className="ng-mensaje">{cargando ? "Cargando expedientes…" : "No hay expedientes pendientes en este estado."}</p>}</div>
    </section>}
    {esDetalle && <section className="ng-panel ng-ficha"><div className="ng-panel-titulo"><h2>{titulo}</h2><button className="ng-volver" onClick={() => setVista("recepcion")}>← Volver al listado</button></div>
      <div className="ng-ficha-cuerpo">
        <section className="ng-detalle-bloque ng-workflow"><h3>Gestión del estado</h3>
          {detalle.notargest_estado === "recepcion" && <button className="ng-login-submit" disabled={cargando} onClick={() => cambiarEstado("firma")}>Marcar como recibido · Pasar a pendientes de firma</button>}
          {detalle.notargest_estado === "firma" && <div className="ng-workflow-form"><label>Fecha de firma<input type="date" value={firmaFecha} onChange={e => setFirmaFecha(e.target.value)} /></label><label>Protocolo<input value={protocolo} onChange={e => setProtocolo(e.target.value)} placeholder="Número de protocolo" /></label><button className="ng-login-submit" disabled={cargando || !firmaFecha || !protocolo.trim()} onClick={() => cambiarEstado("factura")}>Guardar firma y pasar a pendientes de factura notaría</button></div>}
          {detalle.notargest_estado === "factura" && <p>Adjunta la factura notarial desde su bandeja. Al subirla, el expediente pasará a presentación en Registro.</p>}
          {detalle.notargest_estado === "registro" && <label className="ng-adjuntar">Subir justificante de presentación en Registro<input type="file" disabled={cargando} onChange={e => { subirDocumentoWorkflow("presentacion", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {detalle.notargest_estado === "ajd" && <label className="ng-adjuntar">Subir justificante AJD / ITP<input type="file" disabled={cargando} onChange={e => { subirDocumentoWorkflow("ajd", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {["inscripcion", "copia"].includes(detalle.notargest_estado) && <div className="ng-workflow-form"><label>Defecto registral (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("defecto", e.target.files?.[0]); e.target.value = ""; }} /></label><label>Hoja de inscripción (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("inscripcion", e.target.files?.[0]); e.target.value = ""; }} /></label>{String(detalle.tiene_defectos_abiertos || "").trim().toLowerCase() === "si" && <label>Subsanación del defecto (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("subsanacion", e.target.files?.[0]); e.target.value = ""; }} /></label>}<p>Los documentos se guardan en la Carpeta Digital. Si hay un defecto abierto, se deberá adjuntar la subsanación antes de cerrar.</p></div>}
          {detalle.notargest_estado === "copia" && <label className="ng-adjuntar">Subir copia simple (PDF)<input type="file" accept="application/pdf,.pdf" disabled={cargando} onChange={e => { subirDocumentoWorkflow("copia", e.target.files?.[0]); e.target.value = ""; }} /></label>}
          {detalle.notargest_estado === "cerrada" && <div className="ng-workflow-form"><label>Fecha de cierre<input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} /></label><label>Fecha de envío a gestoría<input type="date" value={fechaEnvioGestoria} onChange={e => setFechaEnvioGestoria(e.target.value)} /></label><button className="ng-login-submit" disabled={cargando || !fechaCierre} onClick={guardarCierre}>Guardar cierre y envío a gestoría</button></div>}
        </section>
        <section className="ng-detalle-bloque"><h3>Datos del encargo y envío</h3><div className="ng-datos-grid">{[["Expediente",detalle.id_expediente],["Estado",detalle.estado],["Actividad",detalle.actividad_actual],["Oficina",detalle.oficina],["Fecha de alta",esFecha(detalle.fecha_alta)],["Fecha de envío",esFecha(detalle.fecha_envio_notario || detalle.fecha_envio)],["Solicitud PNC",detalle.numero_solicitud_pnc],["Fecha solicitud PNC",esFecha(detalle.fecha_solicitud_pnc)],["Fecha prevista de firma",esFecha(detalle.fecha_prevista_firma)],["Hora prevista",detalle.hora_prevista_firma],["Fecha de firma",esFecha(detalle.fecha_firma)],["Protocolo",detalle.protocolo],["Tipo de documento",detalle.tipo_documento],["Idioma",detalle.idioma_documento],["Formato",detalle.formato_escritura],["Trámite",detalle.tipo_tramite],["Tipo de firma",detalle.tipo_firma],["Solicitante",detalle.solicitante],["Titular",detalle.titular]].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div></section>
        <section className="ng-detalle-bloque"><h3>Fincas y registros</h3>{detalle.fincas?.length ? <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr><th>Finca</th><th>CRU / IDUFIR</th><th>Registro</th><th>Provincia</th><th>Población</th><th>Sección</th><th>Inscripción</th><th>Cuantía</th></tr></thead><tbody>{detalle.fincas.map(f => <tr key={f.id}><td>{texto(f.finca)}</td><td>{texto(f.cru_idufir)}</td><td>{texto(f.registro)}</td><td>{texto(f.provincia)}</td><td>{texto(f.poblacion)}</td><td>{texto(f.seccion)}</td><td>{texto(f.inscripcion)}</td><td>{texto(f.cuantia)}</td></tr>)}</tbody></table></div> : <p className="ng-mensaje">No hay fincas registradas en este expediente.</p>}</section>
        <section className="ng-detalle-bloque"><h3>Carpeta Digital · Documentación previa</h3><p className="ng-descripcion">Archivos disponibles del expediente, agrupados por categoría.</p>{detalle.documentos?.length ? <div className="ng-documentos">{detalle.documentos.map(d => <div className="ng-documento" key={d.id}><div><strong>{d.nombre}</strong><small>{d.categoria} · {esFecha(d.fecha_subida)}</small></div><button className="ng-boton-secundario" onClick={() => abrirDocumento(d)}>Abrir PDF / archivo</button></div>)}</div> : <p className="ng-mensaje">Todavía no hay documentos en la Carpeta Digital.</p>}</section>
        <section className="ng-detalle-bloque"><h3>Observaciones para la notaría</h3>{detalle.observaciones_notaria?.length ? detalle.observaciones_notaria.map(o => <article className="ng-observacion" key={o.id}><p>{o.comentario}</p><small>{o.visibilidad} · {texto(o.fecha)}</small></article>) : <p className="ng-mensaje">No hay observaciones compartidas con la notaría.</p>}{detalle.observaciones && <article className="ng-observacion"><p>{detalle.observaciones}</p><small>Observaciones del expediente</small></article>}</section>
        <section className="ng-detalle-bloque"><h3>Información económica y contractual</h3><div className="ng-datos-grid">{[["Capital",detalle.capital],["Importe",detalle.importe],["Saldo real",detalle.saldo_real],["Saldo disponible",detalle.saldo_disponible],["Contrato",detalle.contrato],["Tipo de operación",detalle.tipo_operacion]].map(([k,v]) => <div className="ng-dato" key={k}><small>{k}</small><strong>{texto(v)}</strong></div>)}</div></section>
      </div>
    </section>}
    <footer className="ng-pie">MOLSAN ERP · NotarGest</footer>
  </main>;
}
