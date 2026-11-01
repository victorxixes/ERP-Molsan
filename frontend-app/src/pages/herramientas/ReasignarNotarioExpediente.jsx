import MolsanIcon from "../../components/ui/MolsanIcon";
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";
import { enviarExpedienteANotario } from "../../api/expedientes";
import "../../css/ModalesHerramientasPremium.css";

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
    <main className="molsan-page-stack herramientas-subpagina-premium min-h-full">
      <header className="molsan-page-header">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-3xl"><MolsanIcon name="courthouse" size={20} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Reasignar expediente a notario</h1>
            <p className="mt-1 text-sm text-slate-500">
              Busca el expediente para recuperar su ficha de Envío a notario, corregir sus datos y guardar la nueva asignación.
            </p>
          </div>
          <Link to="/herramientas/utilidades" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            ← Volver a Utilidades
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={consultar}>
          <h2 className="text-lg font-bold text-slate-800">1. Buscar expediente</h2>
          <p className="mt-1 text-sm text-slate-500">
            Introduce el número de expediente. Se cargarán los datos notariales que ya están guardados, sin crear un expediente nuevo.
          </p>
          <label htmlFor="numero-expediente-notario" className="mt-5 block text-sm font-semibold text-slate-700">
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
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={consultando}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {consultando ? "Buscando…" : "Cargar ficha de envío"}
            </button>
          </div>
        </form>

        {expediente && (
          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Expediente encontrado</p>
            <p className="mt-1 font-bold text-slate-800">{expediente.id_expediente}</p>
            <p className="mt-1 text-sm text-slate-600">
              Notario actual: <span className="font-semibold">{expediente.nombre_notario || expediente.notario || "Sin notario asignado"}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Fecha de envío: <span className="font-semibold">{expediente.fecha_envio_notario || expediente.fecha_envio || "Sin fecha registrada"}</span>
            </p>
          </div>
        )}
      </section>

      {expediente && (
        <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">3. Cambiar actividad en NotarGest</h2>
            <p className="mt-1 text-sm text-slate-500">Puedes mover el expediente libremente a cualquiera de las bandejas. El cambio no elimina la fecha de firma, el protocolo ni los documentos ya registrados.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Actividad actual: <strong>{actividadActualTexto || "Cargando…"}</strong>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">Actividad de destino
              <select value={actividadDestino} onChange={e => setActividadDestino(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal">
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
            <label className="block text-sm font-semibold text-slate-700">Motivo del cambio (obligatorio)
              <input value={motivoActividad} onChange={e => setMotivoActividad(e.target.value)} maxLength={1000} placeholder="Indica por qué se mueve el expediente" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={guardarActividad} disabled={guardandoActividad || !actividadDestino || !motivoActividad.trim() || actividadDestino === actividadActual} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {guardandoActividad ? "Guardando…" : "Guardar cambio de actividad"}
            </button>
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {mensaje && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {mensaje}
        </div>
      )}

      {expediente && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">2. Revisar y corregir el envío a notario</h2>
            <p className="mt-1 text-sm text-slate-500">
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
