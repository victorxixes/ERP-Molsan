import MolsanIcon from "../ui/MolsanIcon";
import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";

import "../../css/LayoutPortalesPremium.css";
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
      <section className="portal-access-tabs-premium ctn-modal-seccion ctn-portal-access-panel">
        <div className="ctn-modal-seccion-titulo"><h3>Accesos a portales externos</h3></div>
        <p role="alert" className="ctn-portal-alert ctn-portal-alert--warning">
          Tu usuario no tiene permiso para consultar NotarGestWeb ni EncargaGestWeb. Solicita al administrador que lo habilite en la ficha del empleado.
        </p>
      </section>
    );
  }

  return (
    <section className="ctn-modal-seccion ctn-portal-access-panel">
      <div className="ctn-modal-seccion-titulo">
        <h3>Accesos a portales externos</h3>
        <span>Credenciales, permisos e historial</span>
      </div>
      <div role="tablist" aria-label="Portales externos" className="ctn-portal-tabs">
        {[
          ...(puedeVerNotarGest ? [["notargest", "Acceso a NotarGest"]] : []),
          ...(puedeVerEncargaGest ? [["encargagest", "Acceso a EncargaGest"]] : []),
        ].map(([key, titulo]) => (
          <button key={key} type="button" role="tab" aria-selected={portal === key}
            onClick={() => { setPortal(key); setPasswordNueva(""); setPasswordRevelada(""); setMostrarPassword(false); setMensaje(""); setError(""); }}
            className={`ctn-portal-tab ${portal === key ? "is-active" : ""}`}>
            {titulo}
          </button>
        ))}
      </div>

      {error && <div role="alert" className="ctn-portal-alert ctn-portal-alert--error">{error}</div>}
      {mensaje && <div role="status" className="ctn-portal-alert ctn-portal-alert--info">{mensaje}</div>}
      {cargando && !datos ? <p>Consultando accesos…</p> : (
        <div className="ctn-portal-card">
          <div className="ctn-portal-card-header">
            <div>
              <div className="ctn-portal-label">Estado del portal</div>
              <strong className={`ctn-portal-state ${acceso.habilitado ? "is-enabled" : "is-disabled"}`}>{acceso.habilitado ? "HABILITADO" : "DESHABILITADO"}</strong>
              <div className="ctn-portal-muted ctn-portal-muted--spaced">{acceso.configurado ? "Credenciales configuradas" : "Todavía no se han generado credenciales"}</div>
            </div>
            {puedeGestionar && <button type="button" className="ctn-portal-button" disabled={procesando || (portal === "encargagest" && !acceso.configurado)}
              onClick={() => ejecutar("toggle")}>
              {acceso.habilitado ? "Deshabilitar acceso" : "Habilitar acceso"}
            </button>}
          </div>
          <div className="ctn-portal-credentials-grid">
            <div className="ctn-portal-field-card">
              <div className="ctn-portal-label">Usuario de acceso</div>
              <strong className="ctn-portal-user-value">{acceso.usuario || "—"}</strong>
            </div>
            <div className="ctn-portal-field-card">
              <div className="ctn-portal-label">Contraseña</div>
              <div className="ctn-portal-password-row">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={mostrarPassword ? (passwordNueva || passwordRevelada) : "••••••••••••"}
                  readOnly
                  aria-label={mostrarPassword ? "Contraseña visible" : "Contraseña oculta"}
                  className="ctn-portal-password-input"
                />
                {esAdministrador && acceso.configurado && <button
                  type="button"
                  className="ctn-portal-button ctn-portal-button--icon"
                  disabled={procesando || cargando}
                  title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => ejecutar("revelar")}
                ><MolsanIcon name={mostrarPassword ? "eyeOff" : "eye"} size={18} bare /></button>}
              </div>
              {mostrarPassword && (passwordNueva || passwordRevelada) && <button type="button" className="ctn-portal-button ctn-portal-button--copy" onClick={() => navigator.clipboard?.writeText(passwordNueva || passwordRevelada)}>Copiar contraseña</button>}
              {!esAdministrador && <div className="ctn-portal-muted ctn-portal-muted--spaced">Solo un administrador puede mostrar la contraseña.</div>}
            </div>
          </div>
          <div className="ctn-portal-actions">
            {puedeGestionar && <button type="button" className="ctn-portal-button ctn-portal-button--primary-soft" disabled={procesando}
              onClick={() => {
                if (window.confirm("Se generará una contraseña nueva y la anterior dejará de funcionar. ¿Continuar?")) ejecutar("reset");
              }}>
              {acceso.configurado ? "Restablecer contraseña" : "Crear acceso y generar contraseña"}
            </button>}
            <button type="button" className="ctn-portal-button" disabled={procesando || cargando} onClick={cargar}>Actualizar datos</button>
          </div>
          {passwordNueva && <p className="ctn-portal-alert ctn-portal-alert--warning ctn-portal-password-warning">Guarda la contraseña antes de cerrar esta ficha. Por seguridad no se conserva en el historial.</p>}
        </div>
      )}

      <div className="ctn-portal-card ctn-portal-history-card">
        <div className="ctn-portal-history-header">
          <h4 className="ctn-portal-history-title">Historial de conexiones y cambios</h4>
          <span className="ctn-portal-muted">{historial.length} eventos</span>
        </div>
        {historial.length === 0 ? <p className="ctn-portal-muted">Todavía no hay eventos registrados para este portal.</p> : (
          <div className="ctn-portal-history-table-wrap">
            <table className="ctn-portal-history-table">
              <thead><tr>{["Fecha y hora", "Evento", "Resultado", "Usuario", "Detalle"].map((x) => <th key={x} className="ctn-portal-history-th">{x}</th>)}</tr></thead>
              <tbody>{historial.map((item, i) => <tr key={`${item.fecha}-${i}`}>
                <td className="ctn-portal-history-td ctn-portal-history-td--nowrap">{item.fecha ? new Date(item.fecha).toLocaleString("es-ES") : "—"}</td>
                <td className="ctn-portal-history-td">{item.evento}</td>
                <td className="ctn-portal-history-td">{item.resultado}</td>
                <td className="ctn-portal-history-td">{item.usuario || "—"}</td>
                <td className="ctn-portal-history-td">{item.detalle || "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
