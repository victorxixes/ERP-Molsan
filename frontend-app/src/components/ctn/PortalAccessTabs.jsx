import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";

const button = {
  border: "1px solid #dbe3ee", borderRadius: 10, padding: "9px 13px",
  background: "#fff", color: "#1e293b", fontWeight: 700, cursor: "pointer",
};
const label = { display: "block", color: "#64748b", fontSize: 12, marginBottom: 5 };
const panel = { border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, background: "#fff" };

export default function PortalAccessTabs({ notariaId }) {
  const empleadoSesion = useAuthStore((state) => state.empleado);
  const nombreRol = String(
    empleadoSesion?.rol_nombre || empleadoSesion?.rol?.nombre || empleadoSesion?.role?.name || ""
  ).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const esAdministrador = /(^|\s)(admin|administrador)(\s|$)/.test(nombreRol);
  const permisosEmpleado = empleadoSesion?.permisos_modulo_dict || empleadoSesion?.permisos_modulo || {};
  const modulosVisibles = Array.isArray(empleadoSesion?.modulos_visibles_list)
    ? empleadoSesion.modulos_visibles_list
    : Array.isArray(empleadoSesion?.modulos_visibles) ? empleadoSesion.modulos_visibles : [];
  const permisosNotarGest = Array.isArray(permisosEmpleado.notargestweb) ? permisosEmpleado.notargestweb : [];
  const permisosEncargaGest = Array.isArray(permisosEmpleado.encargagestweb) ? permisosEmpleado.encargagestweb : [];
  const puedeVerNotarGest = esAdministrador || (modulosVisibles.includes("notargestweb") && permisosNotarGest.includes("ver"));
  const puedeVerEncargaGest = esAdministrador || (modulosVisibles.includes("encargagestweb") && permisosEncargaGest.includes("ver"));
  const [portal, setPortal] = useState(puedeVerNotarGest ? "notargest" : "encargagest");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordRevelada, setPasswordRevelada] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const cargar = useCallback(async () => {
    if (!notariaId || (!puedeVerNotarGest && !puedeVerEncargaGest)) return;
    setCargando(true);
    setError("");
    try {
      const respuesta = await axios.get(`/ctn/notarias/${notariaId}/accesos-portales`);
      setDatos(respuesta?.data ?? respuesta);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar la gestión de accesos.");
    } finally {
      setCargando(false);
    }
  }, [notariaId, puedeVerNotarGest, puedeVerEncargaGest]);

  useEffect(() => {
    if (!puedeVerNotarGest && puedeVerEncargaGest) setPortal("encargagest");
    else if (puedeVerNotarGest && !puedeVerEncargaGest) setPortal("notargest");
  }, [puedeVerNotarGest, puedeVerEncargaGest]);

  useEffect(() => { cargar(); }, [cargar]);

  const acceso = datos?.[portal] || {};
  const clavePermisoPortal = portal === "notargest" ? "notargestweb" : "encargagestweb";
  const permisosPortalActual = Array.isArray(permisosEmpleado[clavePermisoPortal]) ? permisosEmpleado[clavePermisoPortal] : [];
  const puedeGestionar = esAdministrador || permisosPortalActual.includes("editar") ||
    (!acceso.configurado && permisosPortalActual.includes("crear"));
  const ejecutar = async (accion) => {
    setProcesando(true);
    setError("");
    setMensaje("");
    if (accion !== "revelar") {
      setPasswordNueva("");
      setPasswordRevelada("");
      setMostrarPassword(false);
    }
    try {
      if (accion === "revelar") {
        if (mostrarPassword) {
          setMostrarPassword(false);
          return;
        }
        if (!passwordRevelada) {
          const respuesta = await axios.get(`/ctn/notarias/${notariaId}/accesos-portales/${portal}/password`);
          const resultado = respuesta?.data ?? respuesta;
          setPasswordRevelada(resultado.password || "");
        }
        setMostrarPassword(true);
        setMensaje("");
      } else if (accion === "reset") {
        const respuesta = await axios.post(`/ctn/notarias/${notariaId}/accesos-portales/${portal}/reset-password`);
        const resultado = respuesta?.data ?? respuesta;
        setPasswordNueva(resultado.password_nueva || "");
        setPasswordRevelada(resultado.password_nueva || "");
        setMostrarPassword(true);
        setMensaje("Contraseña restablecida. También puedes ocultarla con el ojo.");
      } else {
        await axios.post(`/ctn/notarias/${notariaId}/accesos-portales/${portal}/habilitado`, {
          habilitado: !acceso.habilitado,
        });
        setMensaje(!acceso.habilitado ? "Acceso habilitado." : "Acceso deshabilitado.");
      }
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo completar la operación.");
    } finally {
      setProcesando(false);
    }
  };

  const historial = (datos?.historial || []).filter((item) => item.portal === portal);

  if (!puedeVerNotarGest && !puedeVerEncargaGest) {
    return (
      <section className="ctn-modal-seccion" style={{ marginTop: 18 }}>
        <div className="ctn-modal-seccion-titulo"><h3>Accesos a portales externos</h3></div>
        <p role="alert" style={{ padding: 12, borderRadius: 10, background: "#fff7ed", color: "#9a3412" }}>
          Tu usuario no tiene permiso para consultar NotarGestWeb ni EncargaGestWeb. Solicita al administrador que lo habilite en la ficha del empleado.
        </p>
      </section>
    );
  }

  return (
    <section className="ctn-modal-seccion" style={{ marginTop: 18 }}>
      <div className="ctn-modal-seccion-titulo">
        <h3>Accesos a portales externos</h3>
        <span>Credenciales, permisos e historial</span>
      </div>
      <div role="tablist" aria-label="Portales externos" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 16px" }}>
        {[
          ...(puedeVerNotarGest ? [["notargest", "Acceso a NotarGest"]] : []),
          ...(puedeVerEncargaGest ? [["encargagest", "Acceso a EncargaGest"]] : []),
        ].map(([key, titulo]) => (
          <button key={key} type="button" role="tab" aria-selected={portal === key}
            onClick={() => { setPortal(key); setPasswordNueva(""); setPasswordRevelada(""); setMostrarPassword(false); setMensaje(""); setError(""); }}
            style={{ ...button, background: portal === key ? "#172554" : "#fff", color: portal === key ? "#fff" : "#334155", borderColor: portal === key ? "#172554" : "#dbe3ee" }}>
            {titulo}
          </button>
        ))}
      </div>

      {error && <div role="alert" style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#fef2f2", color: "#991b1b" }}>{error}</div>}
      {mensaje && <div role="status" style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#eff6ff", color: "#1d4ed8" }}>{mensaje}</div>}
      {cargando && !datos ? <p>Consultando accesos…</p> : (
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={label}>Estado del portal</div>
              <strong style={{ color: acceso.habilitado ? "#047857" : "#b91c1c" }}>{acceso.habilitado ? "HABILITADO" : "DESHABILITADO"}</strong>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{acceso.configurado ? "Credenciales configuradas" : "Todavía no se han generado credenciales"}</div>
            </div>
            {puedeGestionar && <button type="button" style={button} disabled={procesando || (portal === "encargagest" && !acceso.configurado)}
              onClick={() => ejecutar("toggle")}>
              {acceso.habilitado ? "Deshabilitar acceso" : "Habilitar acceso"}
            </button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
              <div style={label}>Usuario de acceso</div>
              <strong style={{ overflowWrap: "anywhere" }}>{acceso.usuario || "—"}</strong>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
              <div style={label}>Contraseña</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={mostrarPassword ? (passwordNueva || passwordRevelada) : "••••••••••••"}
                  readOnly
                  aria-label={mostrarPassword ? "Contraseña visible" : "Contraseña oculta"}
                  style={{ minWidth: 0, flex: 1, border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 10px", background: "#f8fafc", color: "#0f172a" }}
                />
                {esAdministrador && acceso.configurado && <button
                  type="button"
                  style={{ ...button, minWidth: 44, padding: "8px 10px" }}
                  disabled={procesando || cargando}
                  title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => ejecutar("revelar")}
                >{mostrarPassword ? "🙈" : "👁"}</button>}
              </div>
              {mostrarPassword && (passwordNueva || passwordRevelada) && <button type="button" style={{ ...button, marginTop: 8 }} onClick={() => navigator.clipboard?.writeText(passwordNueva || passwordRevelada)}>Copiar contraseña</button>}
              {!esAdministrador && <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>Solo un administrador puede mostrar la contraseña.</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {puedeGestionar && <button type="button" style={{ ...button, background: "#eff6ff", borderColor: "#bfdbfe" }} disabled={procesando}
              onClick={() => {
                if (window.confirm("Se generará una contraseña nueva y la anterior dejará de funcionar. ¿Continuar?")) ejecutar("reset");
              }}>
              {acceso.configurado ? "Restablecer contraseña" : "Crear acceso y generar contraseña"}
            </button>}
            <button type="button" style={button} disabled={procesando || cargando} onClick={cargar}>Actualizar datos</button>
          </div>
          {passwordNueva && <p style={{ color: "#92400e", fontSize: 12, marginTop: 10 }}>Guarda la contraseña antes de cerrar esta ficha. Por seguridad no se conserva en el historial.</p>}
        </div>
      )}

      <div style={{ ...panel, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 15 }}>Historial de conexiones y cambios</h4>
          <span style={{ color: "#64748b", fontSize: 12 }}>{historial.length} eventos</span>
        </div>
        {historial.length === 0 ? <p style={{ color: "#64748b", fontSize: 13 }}>Todavía no hay eventos registrados para este portal.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr>{["Fecha y hora", "Evento", "Resultado", "Usuario", "Detalle"].map((x) => <th key={x} style={{ textAlign: "left", padding: 9, borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>{x}</th>)}</tr></thead>
              <tbody>{historial.map((item, i) => <tr key={`${item.fecha}-${i}`}>
                <td style={{ padding: 9, borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{item.fecha ? new Date(item.fecha).toLocaleString("es-ES") : "—"}</td>
                <td style={{ padding: 9, borderBottom: "1px solid #f1f5f9" }}>{item.evento}</td>
                <td style={{ padding: 9, borderBottom: "1px solid #f1f5f9" }}>{item.resultado}</td>
                <td style={{ padding: 9, borderBottom: "1px solid #f1f5f9" }}>{item.usuario || "—"}</td>
                <td style={{ padding: 9, borderBottom: "1px solid #f1f5f9" }}>{item.detalle || "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
