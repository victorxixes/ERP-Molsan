import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../api/config";
import "../../css/ApoderaGest.css";
import "../../css/NotarGest.css";

const TOKEN_KEY = "notargest_token";
const tareas = [
  ["factura", "Facturas notariales"],
  ["copia", "Copias simples"],
  ["registro", "Pendientes presentación Registro"],
  ["ajd", "Liquidación AJD / ITP"],
  ["inscripcion", "Inscripciones registrales"],
  ["sin-provision", "Copias simples sin provisión"],
];

export default function NotarGest() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [requiereCambio, setRequiereCambio] = useState(false);
  const [expedientes, setExpedientes] = useState([]);
  const [notario, setNotario] = useState(null);
  const [vista, setVista] = useState("inicio");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const peticion = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "No se ha podido completar la operación.");
    return data;
  }, [token]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true); setError("");
    try {
      const [perfil, lista] = await Promise.all([peticion("/notargest/me"), peticion("/notargest/expedientes")]);
      setNotario(perfil); setRequiereCambio(Boolean(perfil.requiere_cambio_password)); setExpedientes(lista.items || []);
    } catch (e) {
      setError(e.message);
      if (/sesión|acceso notargest deshabilitado/i.test(e.message)) { localStorage.removeItem(TOKEN_KEY); setToken(""); }
    } finally { setCargando(false); }
  }, [token, peticion]);

  useEffect(() => { cargar(); }, [cargar]);

  async function entrar(e) {
    e.preventDefault(); setCargando(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/notargest/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Credenciales incorrectas.");
      localStorage.setItem(TOKEN_KEY, data.token); setToken(data.token); setNotario(data.notario); setRequiereCambio(Boolean(data.requiere_cambio_password)); if (!data.requiere_cambio_password) setPassword("");
    } catch (e2) { setError(e2.message); } finally { setCargando(false); }
  }

  async function guardarPassword(e) {
    e.preventDefault(); setError(""); setMensaje(""); setCargando(true);
    try {
      await peticion("/notargest/cambiar-password", { method: "POST", body: JSON.stringify({ password_actual: password, password_nueva: passwordNueva }) });
      setPassword(""); setPasswordNueva(""); setRequiereCambio(false); setMensaje("Contraseña actualizada correctamente.");
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  }

  function salir() { localStorage.removeItem(TOKEN_KEY); setToken(""); setNotario(null); setExpedientes([]); setPassword(""); setPasswordNueva(""); }

  if (!token) return <main className="apoderagest notargest ng-login-shell"><form className="ng-login" onSubmit={entrar}>
    <span className="ng-sobrelinea">PORTAL PROFESIONAL</span><h1>NotarGest</h1><p>Acceso para notarías autorizadas por Molsan.</p>
    <label>DNI / NIF del notario<input autoComplete="username" value={usuario} onChange={e => setUsuario(e.target.value)} required /></label>
    <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
    {error && <div className="ng-error">{error}</div>}<button className="ng-login-submit" disabled={cargando}>{cargando ? "Accediendo…" : "Entrar en NotarGest"}</button>
    <small>Usuario y contraseña inicial: CIF/NIF completo del notario, incluida la letra. En el primer acceso tendrás que crear una contraseña personal.</small>
  </form></main>;

  if (requiereCambio) return <main className="apoderagest notargest ng-login-shell"><form className="ng-login" onSubmit={guardarPassword}>
    <span className="ng-sobrelinea">SEGURIDAD DE LA CUENTA</span><h1>Crea tu contraseña</h1><p>Por seguridad, cambia la contraseña provisional antes de continuar.</p>
    <label>Contraseña provisional<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
    <label>Nueva contraseña (mínimo 10 caracteres)<input type="password" autoComplete="new-password" minLength={10} value={passwordNueva} onChange={e => setPasswordNueva(e.target.value)} required /></label>
    {error && <div className="ng-error">{error}</div>}<button className="ng-login-submit" disabled={cargando}>{cargando ? "Guardando…" : "Guardar contraseña"}</button>
  </form></main>;

  const cuenta = (f) => expedientes.filter(f).length;
  return <main className="apoderagest notargest">
    <header className="ng-cabecera"><div><span className="ng-sobrelinea">PORTAL PROFESIONAL · MOLSAN</span><h1>NotarGest</h1><p>{notario?.nombre || "Portal de la notaría"}</p></div><div className="ng-cabecera-acciones"><button className="ng-boton-secundario" onClick={cargar} disabled={cargando}>↻ Actualizar</button><button className="ng-boton-secundario" onClick={salir}>Cerrar sesión</button></div></header>
    <section className="ng-alerta"><div className="ng-alerta-icono">!</div><div><strong>Alertas de Molsan</strong><p>Comentarios y documentación pendientes de validar.</p></div><button onClick={() => setVista("alertas")}>Ver alertas →</button></section>
    {error && <div className="ng-error" role="alert">{error}</div>}{mensaje && <div className="ng-success">{mensaje}</div>}
    <section className="ng-contadores">
      <button className="ng-contador" onClick={() => setVista("alertas")}><span>Documentación por validar</span><strong>—</strong></button>
      <button className="ng-contador" onClick={() => setVista("recepcion")}><span>Pendientes de recepción</span><strong>{cargando ? "…" : cuenta(x => !x.fecha_recepcion_notario)}</strong></button>
      <button className="ng-contador" onClick={() => setVista("firma")}><span>Pendientes de firma</span><strong>{cargando ? "…" : cuenta(x => !x.fecha_firma)}</strong></button>
      <button className="ng-contador ng-contador-rojo" onClick={() => setVista("defectos")}><span>Expedientes con defectos</span><strong>{cargando ? "…" : cuenta(x => String(x.actividad_actual || x.estado || "").toLowerCase().includes("defecto"))}</strong></button>
    </section>
    <section className="ng-panel"><div className="ng-panel-titulo"><h2>{vista === "inicio" ? "Mis tareas pendientes" : vista === "alertas" ? "Alertas de Molsan" : vista === "recepcion" ? "Pendientes de recepción" : vista === "firma" ? "Pendientes de firma" : vista === "defectos" ? "Expedientes con defectos" : tareas.find(x => x[0] === vista)?.[1] || "Mis tareas pendientes"}</h2>{vista !== "inicio" && <button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button>}</div>
      {vista === "inicio" ? <div className="ng-lista-tareas">{tareas.map(([id, label]) => <button className="ng-tarea" key={id} onClick={() => setVista(id)}><span>{label}</span><strong>{id === "registro" ? cuenta(x => x.pendiente_presentacion_registro) : "—"}</strong><span className="ng-flecha">›</span></button>)}</div>
      : vista === "alertas" ? <p className="ng-mensaje">La integración de alertas de comentarios y documentos pendientes de validar está pendiente de conectar con los módulos internos de Molsan.</p>
      : <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr><th>Expediente</th><th>Titular</th><th>Estado</th></tr></thead><tbody>{expedientes.filter(x => vista === "recepcion" ? !x.fecha_recepcion_notario : vista === "firma" ? !x.fecha_firma : vista === "defectos" ? String(x.actividad_actual || x.estado || "").toLowerCase().includes("defecto") : vista === "registro" ? x.pendiente_presentacion_registro : true).map((x,i) => <tr key={x.id || i}><td>{x.numero_expediente || x.id || "—"}</td><td>{x.titular || "—"}</td><td>{x.estado || x.actividad_actual || "En trámite"}</td></tr>)}</tbody></table>{expedientes.length === 0 && <p className="ng-mensaje">No hay expedientes asociados a esta notaría o todavía no se han vinculado.</p>}</div>}
    </section>
    <div className="ng-accesos"><button className="ng-acceso" onClick={() => setVista("documentacion")}><span className="ng-acceso-icono">↑</span><span><strong>Documentación</strong><small>Facturas, copias y documentos de trabajo.</small></span><b>→</b></button><button className="ng-acceso ng-acceso-verde" onClick={() => setVista("pagos")}><span className="ng-acceso-icono">€</span><span><strong>Pagos</strong><small>Pagos y justificantes.</small></span><b>→</b></button></div>
    {["documentacion","pagos"].includes(vista) && <section className="ng-panel"><div className="ng-panel-titulo"><h2>{vista === "documentacion" ? "Documentación" : "Pagos"}</h2><button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button></div><p className="ng-mensaje">{vista === "documentacion" ? "La carga y descarga de documentos se debe conectar a la Carpeta Digital con permisos restringidos a esta notaría." : "La consulta de pagos y justificantes se debe conectar con los pagos de la Ficha de Expediente y limitar a esta notaría."}</p></section>}
    <footer className="ng-pie">MOLSAN ERP · NotarGest</footer>
  </main>;
}
