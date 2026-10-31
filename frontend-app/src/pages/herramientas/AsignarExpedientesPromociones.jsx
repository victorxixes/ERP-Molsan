import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";

export default function AsignarExpedientesPromociones() {
  const [numero, setNumero] = useState("");
  const [tipos, setTipos] = useState([]);
  const [tipoId, setTipoId] = useState("");
  const [expediente, setExpediente] = useState(null);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;
    axios.get("/utilidades/tipos-promocion")
      .then(({ data }) => { if (activo) setTipos(Array.isArray(data) ? data : []); })
      .catch((err) => { if (activo) setError(err.response?.data?.detail || "No se pudo cargar el catálogo Tipos de expediente."); })
      .finally(() => { if (activo) setCargandoTipos(false); });
    return () => { activo = false; };
  }, []);

  async function consultar(event) {
    event?.preventDefault();
    setError("");
    setMensaje("");
    setExpediente(null);
    setTipoId("");
    const valor = numero.trim();
    if (!valor) {
      setError("Introduce el número de expediente.");
      return;
    }
    setConsultando(true);
    try {
      const { data } = await axios.get("/utilidades/expediente-promocion", { params: { numero_expediente: valor } });
      setExpediente(data);
      setTipoId(data.promocion_tipo_expediente_id != null ? String(data.promocion_tipo_expediente_id) : "");
    } catch (err) {
      setError(err.response?.data?.detail || "No se ha podido consultar el expediente.");
    } finally {
      setConsultando(false);
    }
  }

  async function guardar(event) {
    event.preventDefault();
    setError("");
    setMensaje("");
    if (!expediente) {
      setError("Consulta primero el expediente.");
      return;
    }
    setGuardando(true);
    try {
      const { data } = await axios.post("/utilidades/asignar-promocion", {
        numero_expediente: expediente.numero_expediente,
        tipo_expediente_id: tipoId ? Number(tipoId) : null,
      });
      setExpediente((actual) => actual ? {
        ...actual,
        promocion_tipo_expediente_id: data.promocion_tipo_expediente_id,
        promocion: data.promocion,
      } : actual);
      setTipoId(data.promocion_tipo_expediente_id != null ? String(data.promocion_tipo_expediente_id) : "");
      setMensaje(data.mensaje || "Asignación guardada correctamente.");
    } catch (err) {
      setError(err.response?.data?.detail || "No se ha podido guardar la asignación.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="PR" title="Asignar expedientes a promociones" description="Asocia cada expediente a un tipo activo del catálogo oficial y refleja la promoción en su ficha." />
      <div className="flex justify-end"><Link to="/herramientas/utilidades" className="molsan-btn molsan-btn--secondary">← Volver a Utilidades</Link></div>

      {(error || mensaje) && (
        <div role="status" className={`px-4 py-3 ${error ? "" : ""}`}>
          {error || mensaje}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <form onSubmit={consultar} className="erp-card molsan-form p-6">
          <h2>1. Buscar expediente</h2>
          <p className="mt-1">Introduce el número tal como aparece en la ficha del expediente.</p>
          <label className="mt-5 block" htmlFor="numero-expediente-promocion">Número de expediente</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input id="numero-expediente-promocion" value={numero} onChange={(event) => { setNumero(event.target.value); setExpediente(null); setTipoId(""); setMensaje(""); setError(""); }} placeholder="Ej. ALTA-24-00001" className="min-w-0 flex-1 px-4 py-3" />
            <button type="submit" disabled={consultando} className="px-5 py-3">{consultando ? "Buscando…" : "Consultar"}</button>
          </div>
          {expediente && (
            <div className="mt-5 p-4">
              <p className="uppercase">Expediente encontrado</p>
              <p className="mt-1">{expediente.numero_expediente}</p>
              <p className="mt-2">Titular: <span>{expediente.titular || "Sin titular indicado"}</span></p>
              <p className="mt-1">Actividad actual: <span>{expediente.actividad_actual || "Sin actividad indicada"}</span></p>
              <p className="mt-1">Promoción actual: <span>{expediente.promocion || "Sin asignar"}</span></p>
            </div>
          )}
        </form>

        <form onSubmit={guardar} className="erp-card molsan-form p-6">
          <h2>2. Seleccionar tipo de expediente</h2>
          <p className="mt-1">La promoción se toma directamente del catálogo Tipos de expediente; no se escribe manualmente en la ficha.</p>
          <label className="mt-5 block" htmlFor="tipo-promocion-destino">Tipo de expediente / promoción</label>
          <select id="tipo-promocion-destino" value={tipoId} onChange={(event) => { setTipoId(event.target.value); setMensaje(""); }} disabled={cargandoTipos || !expediente} className="mt-2 w-full px-4 py-3">
            <option value="">Sin asignar promoción</option>
            {tipos.map((tipo) => <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>)}
          </select>
          {cargandoTipos && <p className="mt-2">Cargando catálogo…</p>}
          {!cargandoTipos && tipos.length === 0 && <p className="mt-2">El catálogo no tiene tipos activos disponibles.</p>}
          <button type="submit" disabled={guardando || !expediente || cargandoTipos} className="mt-6 w-full px-5 py-3">
            {guardando ? "Guardando asignación…" : "Guardar asignación"}
          </button>
          <p className="mt-3">Puedes elegir «Sin asignar promoción» para retirar la asignación actual. El cambio se refleja en la ficha y en el filtro de expedientes.</p>
        </form>
      </section>
    </div>
  );
}
