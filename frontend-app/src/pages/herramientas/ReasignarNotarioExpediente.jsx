import { useState } from "react";
import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";
import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";
import { enviarExpedienteANotario } from "../../api/expedientes";

export default function ReasignarNotarioExpediente() {
  const [numero, setNumero] = useState("");
  const [expediente, setExpediente] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [actividadActual, setActividadActual] = useState("");
  const [actividadActualTexto, setActividadActualTexto] = useState("");
  const [actividadDestino, setActividadDestino] = useState("");
  const [motivoActividad, setMotivoActividad] = useState("");
  const [guardandoActividad, setGuardandoActividad] = useState(false);

  async function consultar(evento) {
    evento?.preventDefault();
    const identificador = numero.trim();
    setError("");
    setMensaje("");
    setExpediente(null);

    if (!identificador) {
      setError("Introduce el número de expediente.");
      return;
    }

    setConsultando(true);
    try {
      const { data } = await axios.get(
        `/expedientes/${encodeURIComponent(identificador)}`
      );
      setExpediente(data);
      const actividad = await axios.get(`/notargest/admin/expedientes/${encodeURIComponent(data.id_expediente)}/actividad`);
      setActividadActual(actividad.data.estado || "recepcion");
      setActividadActualTexto(actividad.data.estado_texto || actividad.data.estado || "");
      setActividadDestino(actividad.data.estado || "recepcion");
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "No se ha encontrado el expediente o no tienes permiso para consultarlo."
      );
    } finally {
      setConsultando(false);
    }
  }

  async function guardarEnvio(datos) {
    await enviarExpedienteANotario(expediente.id_expediente, datos);
    setMensaje(
      `Se han guardado los datos de envío y la asignación notarial del expediente ${expediente.id_expediente}.`
    );
  }

  async function guardarActividad() {
    if (!expediente || !actividadDestino || !motivoActividad.trim()) {
      setError("Selecciona la actividad de destino e indica el motivo del cambio.");
      return;
    }
    setGuardandoActividad(true);
    setError("");
    setMensaje("");
    try {
      const { data } = await axios.post(
        `/notargest/admin/expedientes/${encodeURIComponent(expediente.id_expediente)}/actividad`,
        { estado: actividadDestino, motivo: motivoActividad.trim() }
      );
      setActividadActual(data.estado);
      setActividadActualTexto(data.estado_texto || data.estado);
      setMensaje(`Actividad NotarGest actualizada a «${data.estado_texto}». El cambio ha quedado registrado en el histórico.`);
      setMotivoActividad("");
    } catch (err) {
      setError(err?.response?.data?.detail || "No se ha podido actualizar la actividad NotarGest.");
    } finally {
      setGuardandoActividad(false);
    }
  }

  function cerrarFormulario() {
    setExpediente(null);
  }

  return (
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="RN" title="Reasignar expediente a notario" description="Recupera la ficha de Envío a notario, corrige sus datos y guarda la nueva asignación." />
      <div className="flex justify-end"><Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link></div>

      <section className="erp-card p-6">
        <form onSubmit={consultar} className="molsan-form">
          <h2>1. Buscar expediente</h2>
          <p className="mt-1">
            Introduce el número de expediente. Se cargarán los datos notariales que ya están guardados, sin crear un expediente nuevo.
          </p>
          <label htmlFor="numero-expediente-notario" className="mt-5 block">
            Número de expediente
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="numero-expediente-notario"
              value={numero}
              onChange={(evento) => {
                setNumero(evento.target.value);
                setExpediente(null);
                setMensaje("");
                setError("");
              }}
              placeholder="Introduce el número de expediente"
              className="min-w-0 flex-1 px-4 py-3"
            />
            <button
              type="submit"
              disabled={consultando}
              className="px-5 py-3"
            >
              {consultando ? "Buscando…" : "Cargar ficha de envío"}
            </button>
          </div>
        </form>

        {expediente && (
          <div className="mt-5 p-4">
            <p className="uppercase">Expediente encontrado</p>
            <p className="mt-1">{expediente.id_expediente}</p>
            <p className="mt-1">
              Notario actual: <span>{expediente.nombre_notario || expediente.notario || "Sin notario asignado"}</span>
            </p>
            <p className="mt-1">
              Fecha de envío: <span>{expediente.fecha_envio_notario || expediente.fecha_envio || "Sin fecha registrada"}</span>
            </p>
          </div>
        )}
      </section>

      {expediente && (
        <section className="p-6 space-y-4">
          <div>
            <h2>3. Cambiar actividad en NotarGest</h2>
            <p className="mt-1">Puedes mover el expediente libremente a cualquiera de las bandejas. El cambio no elimina la fecha de firma, el protocolo ni los documentos ya registrados.</p>
          </div>
          <div className="px-4 py-3">
            Actividad actual: <strong>{actividadActualTexto || "Cargando…"}</strong>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">Actividad de destino
              <select value={actividadDestino} onChange={e => setActividadDestino(e.target.value)} className="mt-2 w-full px-4 py-3">
                <option value="recepcion">Pendientes de recepción · Nuevo encargo</option>
                <option value="firma">Pendientes de firma</option>
                <option value="factura">Pendientes de factura notarial · Firmado</option>
                <option value="registro">Pendientes de presentación en Registro</option>
                <option value="ajd">Liquidación AJD / ITP</option>
                <option value="inscripcion">Pendientes de inscripción</option>
                <option value="copia">Pendientes de copia simple</option>
                <option value="cerrada">Escrituras cerradas inscritas</option>
              </select>
            </label>
            <label className="block">Motivo del cambio (obligatorio)
              <input value={motivoActividad} onChange={e => setMotivoActividad(e.target.value)} maxLength={1000} placeholder="Indica por qué se mueve el expediente" className="mt-2 w-full px-4 py-3" />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={guardarActividad} disabled={guardandoActividad || !actividadDestino || !motivoActividad.trim() || actividadDestino === actividadActual} className="px-5 py-3">
              {guardandoActividad ? "Guardando…" : "Guardar cambio de actividad"}
            </button>
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="px-4 py-3">
          {error}
        </div>
      )}
      {mensaje && (
        <div role="status" className="px-4 py-3">
          {mensaje}
        </div>
      )}

      {expediente && (
        <section className="space-y-3">
          <div>
            <h2>2. Revisar y corregir el envío a notario</h2>
            <p className="mt-1">
              La ficha se abre con los datos actuales. Puedes cambiar el notario, la fecha de envío y los demás campos del formulario; los cambios se guardan en el expediente existente.
            </p>
          </div>
          <EnviarANotarioModal
            key={expediente.id_expediente}
            expediente={expediente}
            inline
            onGuardar={guardarEnvio}
            onClose={cerrarFormulario}
          />
        </section>
      )}
    </main>
  );
}
