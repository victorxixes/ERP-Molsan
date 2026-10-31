import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import { useNavigate, useParams } from "react-router-dom";
import {
  listarNotarias,
  obtenerNotaria,
  obtenerHistoricoFirmasNotaria,
  listarNotariasAsociadas,
  asociarNotarios,
  desasociarNotarios,
} from "../../api/ctn";

const valor = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const nombreNotario = (n) => [n?.nombre, n?.apellidos].filter(Boolean).join(" ").trim() || n?.nombre_completo || "Notario";
const dataDe = (r) => r?.data ?? r;

export default function CtnDetallePage() {
  const params = useParams();
  const navigate = useNavigate();
  const notariaId = params.id || params.notariaId;

  const [notaria, setNotaria] = useState(null);
  const [asociadas, setAsociadas] = useState([]);
  const [busquedaNotario, setBusquedaNotario] = useState("");
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoAsociacion, setGuardandoAsociacion] = useState(false);
  const [error, setError] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalModalidad, setModalModalidad] = useState("VC");
  const [filtroHistorico, setFiltroHistorico] = useState("");
  const [historico, setHistorico] = useState([]);
  const [cargandoHistorico, setCargandoHistorico] = useState(false);
  const [totales, setTotales] = useState({ total: 0, total_vc: 0, total_presencial: 0, total_sin_clasificar: 0 });
  const historicoDialogRef = useRef(null);
  useAccessibleDialog({ open: modalAbierto, onClose: () => setModalAbierto(false), dialogRef: historicoDialogRef });

  const cargarFicha = useCallback(async () => {
    if (!notariaId) return;
    setCargando(true);
    setError("");
    try {
      const [rNotaria, rAsociadas] = await Promise.all([
        obtenerNotaria(notariaId),
        listarNotariasAsociadas(notariaId),
      ]);
      const n = dataDe(rNotaria);
      const a = dataDe(rAsociadas);
      setNotaria(n);
      setAsociadas(Array.isArray(a) ? a : (a?.items || []));
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se pudo cargar la ficha del notario.");
    } finally {
      setCargando(false);
    }
  }, [notariaId]);

  useEffect(() => { cargarFicha(); }, [cargarFicha]);

  useEffect(() => {
    const termino = busquedaNotario.trim();
    if (termino.length < 2) {
      setResultados([]);
      return;
    }
    let activo = true;
    listarNotarias({ q: termino, page: 1, page_size: 30 })
      .then((r) => {
        if (!activo) return;
        const d = dataDe(r);
        const lista = Array.isArray(d?.items) ? d.items : [];
        const idsAsociados = new Set(asociadas.map((x) => Number(x.id)));
        setResultados(lista.filter((x) => Number(x.id) !== Number(notariaId) && !idsAsociados.has(Number(x.id))));
      })
      .catch(() => { if (activo) setResultados([]); });
    return () => { activo = false; };
  }, [busquedaNotario, asociadas, notariaId]);

  const cargarHistorico = useCallback(async (modalidad, q = "") => {
    if (!notariaId) return;
    setCargandoHistorico(true);
    setError("");
    try {
      const r = await obtenerHistoricoFirmasNotaria(notariaId, { modalidad, q });
      const d = dataDe(r) || {};
      setHistorico(Array.isArray(d.items) ? d.items : []);
      if (!String(q || "").trim() && !modalidad) {
        setTotales({
          total: Number(d.total || 0),
          total_vc: Number(d.total_vc || 0),
          total_presencial: Number(d.total_presencial || 0),
          total_sin_clasificar: Number(d.total_sin_clasificar || 0),
        });
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se pudo cargar el histórico de firmas.");
      setHistorico([]);
    } finally {
      setCargandoHistorico(false);
    }
  }, [notariaId]);

  // Carga el histórico completo al entrar para calcular los totales de ambas tarjetas.
  useEffect(() => {
    cargarHistorico(undefined, "");
  }, [cargarHistorico]);

  const abrirHistorico = async (modalidad) => {
    setModalModalidad(modalidad);
    setFiltroHistorico("");
    setModalAbierto(true);
    await cargarHistorico(modalidad, "");
  };

  const buscarHistorico = async (e) => {
    e?.preventDefault?.();
    await cargarHistorico(modalModalidad, filtroHistorico);
  };

  const agregarAsociacion = async (asociadaId) => {
    setGuardandoAsociacion(true);
    setError("");
    try {
      await asociarNotarios(notariaId, asociadaId);
      setBusquedaNotario("");
      setResultados([]);
      await cargarFicha();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se pudo crear la asociación.");
    } finally {
      setGuardandoAsociacion(false);
    }
  };

  const quitarAsociacion = async (asociadaId) => {
    if (!window.confirm("¿Eliminar la asociación entre ambos notarios?")) return;
    setGuardandoAsociacion(true);
    setError("");
    try {
      await desasociarNotarios(notariaId, asociadaId);
      await cargarFicha();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se pudo eliminar la asociación.");
    } finally {
      setGuardandoAsociacion(false);
    }
  };

  const firmasVC = Number(totales.total_vc || 0);
  const firmasPresenciales = Number(totales.total_presencial || 0);
  const modalidadTexto = modalModalidad === "VC" ? "Videoconferencia" : "Presencial";

  if (cargando) return <div><p>Cargando ficha CTN…</p></div>;
  if (!notaria) return <div><p>{error || "No se ha encontrado el notario."}</p><button type="button" onClick={() => navigate(-1)}>Volver</button></div>;

  return (
    <div className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="CTN" title={nombreNotario(notaria)} description={`Ficha CTN · NIF: ${valor(notaria.nif)} · Código: ${valor(notaria.codigo)}`} />
      <div className="flex justify-end"><button type="button" onClick={() => navigate(-1)}>Volver al listado</button></div>

      {error && <div role="alert" className="ctn-detalle-alert">{error}</div>}

      <section className="ctn-detalle-grid ctn-detalle-grid--info">
        <Info titulo="Teléfono" valor={notaria.telefono} />
        <Info titulo="Dirección" valor={notaria.direccion} />
        <Info titulo="Municipio" valor={notaria.municipio} />
        <Info titulo="Provincia" valor={notaria.provincia} />
        <Info titulo="Código postal" valor={notaria.cp} />
        <Info titulo="Videoconferencia habilitada" valor={notaria.vc} />
        <Info titulo="Apoderado" valor={notaria.apoderado} />
        <Info titulo="Observaciones" valor={notaria.observacion} />
      </section>

      <h2 className="ctn-detalle-section-title">Histórico de firmas reales</h2>
      <p className="ctn-detalle-muted">Se consideran expedientes con fecha de firma registrada. Las citas de agenda no se contabilizan como firmas realizadas.</p>
      <section className="ctn-detalle-grid ctn-detalle-grid--stats">
        <div className="ctn-detalle-stat">
          <h3>Videoconferencia</h3>
          <p className="ctn-detalle-stat__value">{firmasVC}</p>
          <button type="button" onClick={() => abrirHistorico("VC")}>Mostrar listado</button>
        </div>
        <div className="ctn-detalle-stat">
          <h3>Presencial</h3>
          <p className="ctn-detalle-stat__value">{firmasPresenciales}</p>
          <button type="button" onClick={() => abrirHistorico("PRESENCIAL")}>Mostrar listado</button>
        </div>
        <div className="ctn-detalle-stat">
          <h3>Sin modalidad clasificada</h3>
          <p className="ctn-detalle-stat__value">{Number(totales.total_sin_clasificar || 0)}</p>
          <p className="ctn-detalle-muted ctn-detalle-muted--small">El endpoint de histórico debe devolver este total para que se muestre correctamente.</p>
        </div>
      </section>

      <section className=" --associations">
        <h2 className="ctn-detalle-section-title ctn-detalle-section-title--flush">Notarios asociados</h2>
        <p className="ctn-detalle-muted">Las asociaciones se guardan en ambos sentidos. Eliminar una asociación desde cualquiera de las dos fichas la elimina para ambos notarios.</p>
        <label className="ctn-detalle-label">Buscar notario por nombre, apellidos o NIF</label>
        <input
          value={busquedaNotario}
          onChange={(e) => setBusquedaNotario(e.target.value)}
          placeholder="Escribe al menos 2 caracteres…"
          className="ctn-detalle-search"
        />
        {resultados.length > 0 && (
          <div className="ctn-detalle-results">
            {resultados.map((n) => (
              <div key={n.id} className="ctn-detalle-result-row">
                <span>{nombreNotario(n)} · NIF: {valor(n.nif)}</span>
                <button type="button" disabled={guardandoAsociacion} onClick={() => agregarAsociacion(n.id)}>Asociar</button>
              </div>
            ))}
          </div>
        )}
        {busquedaNotario.trim().length >= 2 && resultados.length === 0 && <p className="ctn-detalle-muted">No hay resultados nuevos para asociar.</p>}
        <h3 className="ctn-detalle-subtitle">Asociaciones actuales ({asociadas.length})</h3>
        {asociadas.length === 0 ? <p>No hay notarios asociados.</p> : (
          <div className="ctn-detalle-table-wrap">
            <table className="ctn-detalle-table">
              <thead><tr><th className="ctn-detalle-th">Notario</th><th className="ctn-detalle-th">NIF</th><th className="ctn-detalle-th">Municipio</th><th className="ctn-detalle-th">Acción</th></tr></thead>
              <tbody>
                {asociadas.map((n) => (
                  <tr key={n.id}>
                    <td className="ctn-detalle-td">{nombreNotario(n)}</td>
                    <td className="ctn-detalle-td">{valor(n.nif)}</td>
                    <td className="ctn-detalle-td">{valor(n.municipio)}</td>
                    <td className="ctn-detalle-td"><button type="button" disabled={guardandoAsociacion} onClick={() => quitarAsociacion(n.id)}>Eliminar asociación</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalAbierto && (
        <div className="ctn-detalle-overlay molsan-modal-overlay fixed inset-0 z-[100] p-3 sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalAbierto(false); }}>
          <div ref={historicoDialogRef} tabIndex={-1} className="ctn-detalle-modal molsan-modal__panel flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label={`Firmas realizadas: ${modalidadTexto}`}>
            <div className="ctn-detalle-modal-header molsan-modal__header flex items-start justify-between gap-4">
              <div><h2 className="ctn-detalle-modal-title">Firmas realizadas · {modalidadTexto}</h2><p className="ctn-detalle-muted ctn-detalle-modal-subtitle">{nombreNotario(notaria)}</p></div>
              <button type="button" onClick={() => setModalAbierto(false)}>Cerrar</button>
            </div>
            <div className="molsan-modal__body min-h-0 flex-1 overflow-y-auto p-4">
            <form className="ctn-detalle-search-form flex flex-wrap gap-3" onSubmit={buscarHistorico}>
              <input value={filtroHistorico} onChange={(e) => setFiltroHistorico(e.target.value)} placeholder="Buscar expediente, titular, NIF o protocolo" className="ctn-detalle-search ctn-detalle-search--grow" />
              <button type="submit">Buscar</button>
            </form>
            {cargandoHistorico ? <p>Cargando firmas…</p> : historico.length === 0 ? <p>No se han encontrado firmas registradas para esta modalidad.</p> : (
              <div className="ctn-detalle-history-table-wrap overflow-x-auto">
                <table className="ctn-detalle-table ctn-detalle-table--history">
                  <thead><tr>{["Fecha firma", "Expediente", "Titular", "NIF titular", "Solicitante", "Protocolo", "Oficina", "Importe"].map((x) => <th key={x} className="ctn-detalle-th">{x}</th>)}</tr></thead>
                  <tbody>
                    {historico.map((f, i) => (
                      <tr key={f.id ?? `${f.id_expediente}-${i}`}>
                        <td className="ctn-detalle-td">{valor(f.fecha_firma)}</td>
                        <td className="ctn-detalle-td">{valor(f.id_expediente)}</td>
                        <td className="ctn-detalle-td">{valor(f.nombre_titular)}</td>
                        <td className="ctn-detalle-td">{valor(f.nif_titular)}</td>
                        <td className="ctn-detalle-td">{valor(f.nombre_solicitante)}</td>
                        <td className="ctn-detalle-td">{valor(f.protocolo)}</td>
                        <td className="ctn-detalle-td">{valor(f.oficina)}</td>
                        <td className="ctn-detalle-td">{valor(f.importe ?? f.capital)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="ctn-detalle-muted ctn-detalle-results-count"> {historico.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ titulo, valor: contenido }) {
  return <div className="ctn-detalle-stat"><div className="ctn-detalle-info-label">{titulo}</div><div className="ctn-detalle-info-value">{valor(contenido)}</div></div>;
}
