import { useCallback, useEffect, useState } from "react";
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

  if (cargando) return <div className="ctn-detalle-page"><p>Cargando ficha CTN…</p></div>;
  if (!notaria) return <div className="ctn-detalle-page"><p>{error || "No se ha encontrado el notario."}</p><button onClick={() => navigate(-1)}>Volver</button></div>;

  return (
    <div className="ctn-detalle-page" style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{nombreNotario(notaria)}</h1>
          <div style={{ opacity: 0.75 }}>Ficha CTN · NIF: {valor(notaria.nif)} · Código: {valor(notaria.codigo)}</div>
        </div>
        <button type="button" onClick={() => navigate(-1)}>Volver al listado</button>
      </div>

      {error && <div role="alert" style={{ margin: "14px 0", padding: 12, border: "1px solid #d88", borderRadius: 8 }}>{error}</div>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, marginTop: 20 }}>
        <Info titulo="Teléfono" valor={notaria.telefono} />
        <Info titulo="Dirección" valor={notaria.direccion} />
        <Info titulo="Municipio" valor={notaria.municipio} />
        <Info titulo="Provincia" valor={notaria.provincia} />
        <Info titulo="Código postal" valor={notaria.cp} />
        <Info titulo="Videoconferencia habilitada" valor={notaria.vc} />
        <Info titulo="Apoderado" valor={notaria.apoderado} />
        <Info titulo="Observaciones" valor={notaria.observacion} />
      </section>

      <h2 style={{ marginTop: 28 }}>Histórico de firmas reales</h2>
      <p style={{ opacity: 0.75 }}>Se consideran expedientes con fecha de firma registrada. Las citas de agenda no se contabilizan como firmas realizadas.</p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        <div style={tarjeta}>
          <h3>Videoconferencia</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>{firmasVC}</p>
          <button type="button" onClick={() => abrirHistorico("VC")}>Mostrar listado</button>
        </div>
        <div style={tarjeta}>
          <h3>Presencial</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>{firmasPresenciales}</p>
          <button type="button" onClick={() => abrirHistorico("PRESENCIAL")}>Mostrar listado</button>
        </div>
        <div style={tarjeta}>
          <h3>Sin modalidad clasificada</h3>
          <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>{Number(totales.total_sin_clasificar || 0)}</p>
          <p style={{ fontSize: 13, opacity: 0.75 }}>El endpoint de histórico debe devolver este total para que se muestre correctamente.</p>
        </div>
      </section>

      <section style={{ ...tarjeta, marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Notarios asociados</h2>
        <p style={{ opacity: 0.75 }}>Las asociaciones se guardan en ambos sentidos. Eliminar una asociación desde cualquiera de las dos fichas la elimina para ambos notarios.</p>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Buscar notario por nombre, apellidos o NIF</label>
        <input
          value={busquedaNotario}
          onChange={(e) => setBusquedaNotario(e.target.value)}
          placeholder="Escribe al menos 2 caracteres…"
          style={{ width: "100%", maxWidth: 520, padding: 10, boxSizing: "border-box" }}
        />
        {resultados.length > 0 && (
          <div style={{ marginTop: 8, maxWidth: 720, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
            {resultados.map((n) => (
              <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 10, borderBottom: "1px solid #eee" }}>
                <span>{nombreNotario(n)} · NIF: {valor(n.nif)}</span>
                <button type="button" disabled={guardandoAsociacion} onClick={() => agregarAsociacion(n.id)}>Asociar</button>
              </div>
            ))}
          </div>
        )}
        {busquedaNotario.trim().length >= 2 && resultados.length === 0 && <p style={{ opacity: 0.7 }}>No hay resultados nuevos para asociar.</p>}
        <h3 style={{ marginTop: 22 }}>Asociaciones actuales ({asociadas.length})</h3>
        {asociadas.length === 0 ? <p>No hay notarios asociados.</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Notario</th><th style={th}>NIF</th><th style={th}>Municipio</th><th style={th}>Acción</th></tr></thead>
              <tbody>
                {asociadas.map((n) => (
                  <tr key={n.id}>
                    <td style={td}>{nombreNotario(n)}</td>
                    <td style={td}>{valor(n.nif)}</td>
                    <td style={td}>{valor(n.municipio)}</td>
                    <td style={td}><button type="button" disabled={guardandoAsociacion} onClick={() => quitarAsociacion(n.id)}>Eliminar asociación</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalAbierto && (
        <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalAbierto(false); }} style={overlay}>
          <div role="dialog" aria-modal="true" aria-label={`Firmas realizadas: ${modalidadTexto}`} style={modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div><h2 style={{ margin: 0 }}>Firmas realizadas · {modalidadTexto}</h2><p style={{ margin: "6px 0 14px", opacity: 0.75 }}>{nombreNotario(notaria)}</p></div>
              <button type="button" onClick={() => setModalAbierto(false)}>Cerrar</button>
            </div>
            <form onSubmit={buscarHistorico} style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <input value={filtroHistorico} onChange={(e) => setFiltroHistorico(e.target.value)} placeholder="Buscar expediente, titular, NIF o protocolo" style={{ flex: 1, minWidth: 240, padding: 9 }} />
              <button type="submit">Buscar</button>
            </form>
            {cargandoHistorico ? <p>Cargando firmas…</p> : historico.length === 0 ? <p>No se han encontrado firmas registradas para esta modalidad.</p> : (
              <div style={{ overflow: "auto", maxHeight: "60vh" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>
                  <thead><tr>{["Fecha firma", "Expediente", "Titular", "NIF titular", "Solicitante", "Protocolo", "Oficina", "Importe"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
                  <tbody>
                    {historico.map((f, i) => (
                      <tr key={f.id ?? `${f.id_expediente}-${i}`}>
                        <td style={td}>{valor(f.fecha_firma)}</td>
                        <td style={td}>{valor(f.id_expediente)}</td>
                        <td style={td}>{valor(f.nombre_titular)}</td>
                        <td style={td}>{valor(f.nif_titular)}</td>
                        <td style={td}>{valor(f.nombre_solicitante)}</td>
                        <td style={td}>{valor(f.protocolo)}</td>
                        <td style={td}>{valor(f.oficina)}</td>
                        <td style={td}>{valor(f.importe ?? f.capital)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12, opacity: 0.75 }}>Resultados: {historico.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ titulo, valor: contenido }) {
  return <div style={tarjeta}><div style={{ fontSize: 13, opacity: 0.7 }}>{titulo}</div><div style={{ fontWeight: 600, marginTop: 5, whiteSpace: "pre-wrap" }}>{valor(contenido)}</div></div>;
}

const tarjeta = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "var(--ctn-card-bg, #fff)" };
const th = { textAlign: "left", padding: 9, borderBottom: "1px solid #ddd", whiteSpace: "nowrap" };
const td = { padding: 9, borderBottom: "1px solid #eee", verticalAlign: "top" };
const overlay = { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 };
const modal = { width: "min(1200px, 100%)", maxHeight: "90vh", overflow: "auto", background: "white", color: "#222", borderRadius: 14, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,.25)" };
