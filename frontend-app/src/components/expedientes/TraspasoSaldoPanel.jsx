import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "../../api/axios";
import useAccessibleDialog from "../ui/useAccessibleDialog";

const euros = (value) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
  ? "—"
  : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value));

const fecha = (value) => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("es-ES") : "—";

function errorApi(error) {
  return error?.response?.data?.detail || error?.response?.data?.mensaje || error?.message || "No se pudo completar la operación.";
}

export default function TraspasoSaldoPanel({ expediente, visible = true }) {
  const numeroActual = String(expediente?.id_expediente || "");
  const [contexto, setContexto] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: abierto, onClose: () => setAbierto(false), dialogRef });
  const [receptorNumero, setReceptorNumero] = useState(numeroActual);
  const [origenesSeleccionados, setOrigenesSeleccionados] = useState([]);
  const [importeReceptor, setImporteReceptor] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [operacionActiva, setOperacionActiva] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    if (!numeroActual) return;
    setCargando(true);
    try {
      const respuesta = await axios.get(`/expedientes/${encodeURIComponent(numeroActual)}/traspasos-saldo/contexto`);
      setContexto(respuesta.data || null);
      setReceptorNumero((actual) => actual || numeroActual);
      const operaciones = respuesta.data?.operaciones || [];
      const pendiente = operaciones.find((item) => ["pendiente_verificacion", "pendiente_email"].includes(item.estado)) || null;
      setOperacionActiva(pendiente);
      if (pendiente?.receptor_numero) setReceptorNumero(pendiente.receptor_numero);
      if (pendiente?.origenes?.length) setOrigenesSeleccionados(pendiente.origenes.map((item) => item.numero));
      if (pendiente?.estado === "pendiente_email") {
        setDestinatario(pendiente.email_destinatario || "");
        setAsunto(pendiente.email_asunto || "");
        setCuerpo(pendiente.email_cuerpo || "");
        setImporteReceptor(pendiente.importe_receptor_actualizado == null ? "" : String(pendiente.importe_receptor_actualizado));
      }
    } catch (e) {
      setError(errorApi(e));
    } finally {
      setCargando(false);
    }
  }, [numeroActual]);

  useEffect(() => {
    if (visible) cargar();
  }, [visible, cargar]);

  const candidatos = contexto?.candidatos || [];
  const receptor = candidatos.find((item) => item.numero === receptorNumero) || candidatos.find((item) => item.numero === numeroActual);
  const origenes = useMemo(
    () => candidatos.filter((item) => item.numero !== receptorNumero),
    [candidatos, receptorNumero]
  );
  const seleccionados = origenes.filter((item) => origenesSeleccionados.includes(item.numero));
  const sumaReferencia = seleccionados.reduce((total, item) => total + (Number(item.saldo_disponible) || 0), 0);
  const faltanFirma = receptor?.faltan_requisitos_receptor || [];
  const origenBloqueado = seleccionados.find((item) => item.bloqueado_por_traspaso || item.liquidado_sin_tramitar);

  useEffect(() => {
    if (!receptor || operacionActiva?.estado === "pendiente_email") return;
    setDestinatario(receptor.email_cliente || "");
    setImporteReceptor(receptor.importe === null || receptor.importe === undefined ? "" : String(receptor.importe));
    const origenes = seleccionados.map((item) => `${item.numero} (saldo disponible de referencia: ${item.saldo_disponible ?? "no indicado"} €)`).join(", ");
    setAsunto(`Actualización de saldo · expediente ${receptor.numero}`);
    setCuerpo(
      `Estimado/a cliente:\n\nLe informamos de la actualización del importe del expediente ${receptor.numero}, tras verificar la operación comunicada.\n\nExpedientes relacionados de origen: ${origenes || "pendiente de confirmar"}.\nImporte actualizado del expediente receptor: ${importeReceptor !== "" ? importeReceptor : (receptor.importe ?? "pendiente de indicar")} €.\n\nQuedamos a su disposición para cualquier aclaración.\n\nAtentamente,\nMolsan`
    );
    // La plantilla se vuelve a calcular al cambiar el receptor o los orígenes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receptorNumero, candidatos.length, origenesSeleccionados.join("|"), operacionActiva?.estado]);

  const alternarOrigen = (numero) => setOrigenesSeleccionados((actual) =>
    actual.includes(numero) ? actual.filter((item) => item !== numero) : [...actual, numero]
  );

  const crear = async () => {
    setError(""); setMensaje(""); setGuardando(true);
    try {
      const respuesta = await axios.post("/expedientes/traspasos-saldo", {
        receptor_numero: receptorNumero,
        origenes_numeros: origenesSeleccionados,
      });
      setOperacionActiva({ id: respuesta.data.id, estado: respuesta.data.estado });
      setMensaje(respuesta.data.mensaje || "Traspaso creado.");
      setAbierto(true);
      setOrigenesSeleccionados([]);
      await cargar();
    } catch (e) {
      setError(errorApi(e));
    } finally {
      setGuardando(false);
    }
  };

  const verificar = async () => {
    setError(""); setMensaje(""); setGuardando(true);
    try {
      const respuesta = await axios.post(`/expedientes/traspasos-saldo/${operacionActiva.id}/verificar`, {
        importe_receptor: Number(String(importeReceptor).replace(",", ".")),
        destinatario,
        asunto,
        cuerpo: cuerpo.replace(/Importe actualizado del expediente receptor:.*(?=\n|$)/, `Importe actualizado del expediente receptor: ${importeReceptor} €`),
      });
      setMensaje(respuesta.data.mensaje || "Importe verificado.");
      await cargar();
    } catch (e) {
      setError(errorApi(e));
    } finally {
      setGuardando(false);
    }
  };

  const guardarEmail = async () => {
    if (!operacionActiva?.id) return;
    setError(""); setMensaje(""); setGuardando(true);
    try {
      const respuesta = await axios.put(`/expedientes/traspasos-saldo/${operacionActiva.id}/email`, { destinatario, asunto, cuerpo });
      setMensaje(respuesta.data.mensaje || "Email actualizado.");
      await cargar();
    } catch (e) {
      setError(errorApi(e));
    } finally {
      setGuardando(false);
    }
  };

  const enviarEmail = async () => {
    setError(""); setMensaje(""); setGuardando(true);
    try {
      const respuesta = await axios.post(`/expedientes/traspasos-saldo/${operacionActiva.id}/enviar-email`);
      setMensaje(respuesta.data.mensaje || "Email enviado y traspaso cerrado.");
      setOperacionActiva(null);
      await cargar();
    } catch (e) {
      setError(errorApi(e));
      await cargar();
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = async () => {
    const motivo = window.prompt("Indica el motivo de cancelación del traspaso:");
    if (!motivo || motivo.trim().length < 3) return;
    setError(""); setMensaje(""); setGuardando(true);
    try {
      await axios.post(`/expedientes/traspasos-saldo/${operacionActiva.id}/cancelar`, { motivo: motivo.trim() });
      setOperacionActiva(null);
      setMensaje("Traspaso cancelado. Los expedientes de origen vuelven a estar disponibles.");
      await cargar();
    } catch (e) {
      setError(errorApi(e));
    } finally {
      setGuardando(false);
    }
  };

  if (!visible) return null;
  return (
    <>
      <button
          type="button"
          onClick={() => setAbierto(true)}
          className="inline-flex items-center gap-2 px-3 py-2"
        >
          <span aria-hidden="true">⇄</span> Gestionar traspaso
      </button>

      {abierto && (
        <div className="molsan-modal-overlay traspaso-saldo-modal fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setAbierto(false); }}>
          <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-traspaso-saldo-titulo" className="molsan-modal__panel my-auto max-h-[92vh] w-full max-w-5xl overflow-y-auto p-4 sm:p-5">
            <header className="molsan-modal__header mb-4 flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center">⇄</span>
                <div>
                  <h3 id="modal-traspaso-saldo-titulo">Control de traspasos de saldo</h3>
                  <p className="mt-1 max-w-3xl">Solo para expedientes relacionados con «Cancelación con provisión». Permite agrupar varios orígenes en un único receptor, verificar el importe manualmente y registrar el email al cliente.</p>
                </div>
              </div>
              <button type="button" onClick={() => setAbierto(false)} className="px-3 py-2">✕ Cerrar</button>
            </header>
            {cargando && <p className="mb-3">Consultando expedientes relacionados…</p>}
            {error && <div role="alert" className="mb-3 p-3">{error}</div>}
            {mensaje && <div role="status" className="mb-3 p-3">{mensaje}</div>}
            <div className="space-y-4">
          {contexto?.habilitado === false && (
            <div className="p-3">
              {contexto.motivo || "Este expediente no cumple los requisitos para gestionar traspasos de saldo."}
            </div>
          )}
          {contexto?.habilitado !== false && !cargando && candidatos.length < 2 && !(contexto?.operaciones || []).length && (
            <div className="p-3">
              No se han encontrado otros expedientes relacionados disponibles para traspasar saldo. Comprueba que los expedientes compartan el mismo VINCCANC y sean de tipo «Cancelación con provisión».
            </div>
          )}
          {!contexto?.expediente?.vinccanc && (
            <div className="p-3">
              Este expediente no tiene código VincCanc (VINCCANC). El sistema necesita ese identificador común para confirmar que los expedientes pertenecen al mismo grupo; no permite crear relaciones por aproximación.
            </div>
          )}

          {contexto?.operaciones?.length > 0 && (
            <div className="space-y-2">
              <h4 className="uppercase">Historial de traspasos</h4>
              {contexto.operaciones.map((op) => (
                <article key={op.id} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>Traspaso #{op.id} · receptor {op.receptor_numero}</div>
                    <span className={`px-2.5 py-1 uppercase ${op.estado === "cerrado" ? "" : op.estado === "cancelado" ? "" : ""}`}>{op.estado.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-1">Orígenes: {op.origenes.map((item) => item.numero).join(", ") || "—"} · Importe receptor verificado: {euros(op.importe_receptor_actualizado)}</p>
                  {op.email_estado === "enviado" && <p className="mt-1">Email enviado · {fecha(op.email_enviado_en)}</p>}
                  {op.estado === "pendiente_verificacion" && <button type="button" disabled={guardando} onClick={() => { setOperacionActiva(op); setReceptorNumero(op.receptor_numero); setAbierto(true); }} className="mt-2 px-3 py-1.5">Continuar verificación</button>}
                  {op.estado === "pendiente_email" && <button type="button" disabled={guardando} onClick={() => { setOperacionActiva(op); setAbierto(true); }} className="mt-2 px-3 py-1.5">Continuar comunicación</button>}
                </article>
              ))}
            </div>
          )}

          {operacionActiva?.estado === "pendiente_verificacion" && (
            <div className="p-4">
              <h4>1. Verificar importe en la base de datos externa</h4>
              <p className="mt-1">El importe se actualiza únicamente con la cifra confirmada por el gestor. El campo Saldo disponible no se modifica.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label>Importe confirmado del receptor (€)
                  <input type="number" min="0" step="0.01" value={importeReceptor} onChange={(e) => setImporteReceptor(e.target.value)} className="mt-1 w-full px-3 py-2" />
                </label>
                <label>Email del cliente
                  <input type="email" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="cliente@ejemplo.com" className="mt-1 w-full px-3 py-2" />
                </label>
                <label className="md:col-span-2">Asunto
                  <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="mt-1 w-full px-3 py-2" />
                </label>
                <label className="md:col-span-2">Cuerpo del email
                  <textarea rows={5} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} className="mt-1 w-full px-3 py-2" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" disabled={guardando || !importeReceptor || !destinatario.includes("@") || !asunto.trim() || !cuerpo.trim()} onClick={verificar} className="px-4 py-2.5">{guardando ? "Guardando…" : "Confirmar importe verificado"}</button>
                <button type="button" disabled={guardando} onClick={cancelar} className="px-4 py-2.5">Cancelar operación</button>
              </div>
            </div>
          )}

          {operacionActiva?.estado === "pendiente_email" && (
            <div className="p-4">
              <h4>2. Enviar email y cerrar el traspaso</h4>
              <p className="mt-1">El Importe del receptor ya se ha actualizado. Al enviar correctamente el email, los expedientes de origen pasarán a «Liquidado sin tramitar».</p>
              <p className="mt-2">Importe verificado: <strong>{euros(operacionActiva.importe_receptor_actualizado)}</strong></p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label>Email del cliente
                  <input type="email" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} className="mt-1 w-full px-3 py-2" />
                </label>
                <label>Asunto
                  <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className="mt-1 w-full px-3 py-2" />
                </label>
                <label className="md:col-span-2">Cuerpo del email
                  <textarea rows={4} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} className="mt-1 w-full px-3 py-2" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" disabled={guardando || !destinatario.includes("@") || !asunto.trim() || !cuerpo.trim()} onClick={guardarEmail} className="px-4 py-2.5">Guardar cambios del email</button>
                <button type="button" disabled={guardando || !destinatario.includes("@") || !asunto.trim() || !cuerpo.trim()} onClick={enviarEmail} className="px-4 py-2.5">{guardando ? "Enviando…" : "Enviar email al cliente y cerrar"}</button>
              </div>
              <p className="mt-2">El envío requiere SMTP configurado en el backend. Si falla, la operación seguirá pendiente de comunicación y los orígenes no se liquidarán.</p>
            </div>
          )}

          <div className="p-3">
            <h4 className="uppercase">Crear nuevo traspaso agrupado</h4>
            <p className="mt-1">Los saldos de origen son informativos; el ERP no los suma ni los transfiere automáticamente.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label>Expediente receptor
                <select value={receptorNumero} onChange={(e) => { setReceptorNumero(e.target.value); setOrigenesSeleccionados([]); setOperacionActiva(null); }} className="mt-1 w-full px-3 py-2.5">
                  {candidatos.map((item) => <option key={item.numero} value={item.numero}>{item.numero}{item.faltan_requisitos_receptor.length ? " · firma/protocolo pendiente" : ""}</option>)}
                </select>
              </label>
              <div className="p-3">
                <p>Requisitos del receptor</p>
                {faltanFirma.length ? <p className="mt-1">Bloqueado: falta {faltanFirma.join(" y ")}.</p> : <p className="mt-1">Firma y protocolo informados · {fecha(receptor?.fecha_firma)} · protocolo {receptor?.protocolo}</p>}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <p>Selecciona uno o varios expedientes de origen</p>
              {origenes.length === 0 && <p className="p-3">No hay otros expedientes con el mismo VincCanc y tipo de operación.</p>}
              {origenes.map((item) => {
                const bloqueado = item.bloqueado_por_traspaso || item.liquidado_sin_tramitar;
                return <label key={item.numero} className={`flex flex-wrap items-center gap-3 p-3 ${bloqueado ? "" : ""}`}>
                  <input type="checkbox" checked={origenesSeleccionados.includes(item.numero)} disabled={bloqueado} onChange={() => alternarOrigen(item.numero)} className="h-4 w-4" />
                  <span className="min-w-0 flex-1"><strong>{item.numero}</strong><span className="ml-2">{item.bloqueado_por_traspaso ? item.motivo_bloqueo_traspaso : item.liquidado_sin_tramitar ? "Liquidado sin tramitar" : "Disponible para incluir"}</span></span>
                  <span><span className="block">Importe</span><strong>{euros(item.importe)}</strong></span>
                  <span><span className="block">Saldo disponible</span><strong>{euros(item.saldo_disponible)}</strong></span>
                </label>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p>Suma informativa de saldos seleccionados: <strong>{euros(sumaReferencia)}</strong></p>
              <button type="button" disabled={guardando || !contexto?.expediente?.vinccanc || !receptorNumero || seleccionados.length === 0 || Boolean(origenBloqueado) || faltanFirma.length > 0} onClick={crear} className="px-4 py-2.5">{guardando ? "Creando…" : "Crear control de traspaso"}</button>
            </div>
            <p className="mt-2">Reglas: todos deben compartir VINCCANC y ser «Cancelación con provisión»; el receptor necesita fecha de firma real y protocolo. Cada origen solo puede estar en un traspaso activo. Las validaciones también se aplican en el servidor.</p>
          </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
