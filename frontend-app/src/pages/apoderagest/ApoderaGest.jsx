import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";
import AutocompleteNotario from "../../components/agenda/AutocompleteNotario";
import Agenda from "../agenda/Agenda";
import Intranet from "../intranet/Intranet";
import Mensajes from "../mensajes/Mensajes";
import { useAuthStore } from "../../store/authStore";
import "../../css/ApoderaGest.css";

const PESTANAS = [
  { nombre: "Dashboard", icono: "◫" },
  { nombre: "Agenda", icono: "▦" },
  { nombre: "Encargos", icono: "▤" },
  { nombre: "Mensajes", icono: "✉" },
  { nombre: "Intranet", icono: "⌂" },
  { nombre: "CTN", icono: "◇" },
];

function fechaLegible(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function texto(valor, alternativa = "—") {
  return valor === null || valor === undefined || valor === ""
    ? alternativa
    : String(valor);
}

function numeroLegible(valor) {
  if (valor === null || valor === undefined || valor === "") return "Pendiente";
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? new Intl.NumberFormat("es-ES").format(numero)
    : String(valor);
}

function EstadoPill({ valor }) {
  const estado = texto(valor, "Pendiente");
  const normalizado = estado.toLowerCase();
  let clase = "ag-estado-neutro";

  if (
    normalizado.includes("firmad") ||
    normalizado.includes("complet") ||
    normalizado.includes("finaliz")
  ) {
    clase = "ag-estado-ok";
  } else if (
    normalizado.includes("pendient") ||
    normalizado.includes("tramit")
  ) {
    clase = "ag-estado-pendiente";
  } else if (
    normalizado.includes("cancel") ||
    normalizado.includes("rechaz") ||
    normalizado.includes("error")
  ) {
    clase = "ag-estado-alerta";
  }

  return <span className={`ag-estado ${clase}`}>{estado}</span>;
}

function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  icono,
  variante = "",
}) {
  return (
    <article className={`ag-kpi ${variante}`}>
      <div className="ag-kpi-superior">
        <span className="ag-kpi-titulo">{titulo}</span>
        <span className="ag-kpi-icono" aria-hidden="true">
          {icono}
        </span>
      </div>
      <div className="ag-kpi-valor">{valor}</div>
      {detalle ? <div className="ag-kpi-detalle">{detalle}</div> : null}
    </article>
  );
}

function EstadoVacio({ icono = "◇", titulo, detalle }) {
  return (
    <div className="ag-vacio">
      <span className="ag-vacio-icono" aria-hidden="true">
        {icono}
      </span>
      <h3>{titulo}</h3>
      <p>{detalle}</p>
    </div>
  );
}

function agruparEncargosPorNotario(encargos) {
  const grupos = new Map();
  for (const encargo of encargos) {
    const nombre = String(encargo.nombre_notario || encargo.notario || "Notario sin identificar").trim();
    const clave = String(encargo.nif_notario || nombre).toLocaleLowerCase("es");
    if (!grupos.has(clave)) grupos.set(clave, { clave, nombre, nif: encargo.nif_notario || "", expedientes: [] });
    grupos.get(clave).expedientes.push(encargo);
  }
  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function CampoDetalle({ etiqueta, valor }) {
  return (
    <div className="ag-detalle-campo">
      <span>{etiqueta}</span>
      <strong>{texto(valor)}</strong>
    </div>
  );
}

function TablaEncargos({ encargos, onFirmado }) {
  const [abiertos, setAbiertos] = useState({});
  const [firmas, setFirmas] = useState({});
  const [guardandoFirma, setGuardandoFirma] = useState({});
  const [erroresFirma, setErroresFirma] = useState({});
  const [mensajeFirma, setMensajeFirma] = useState({});
  const [documentoVisor, setDocumentoVisor] = useState(null);
  const grupos = useMemo(() => agruparEncargosPorNotario(encargos), [encargos]);

  function cambiarFirma(id, campo, valor) {
    setFirmas((actual) => ({
      ...actual,
      [id]: { fecha_firma: actual[id]?.fecha_firma ?? "", protocolo: actual[id]?.protocolo ?? "", [campo]: valor },
    }));
  }

  async function firmar(encargo) {
    const id = String(encargo.id_expediente || encargo.id);
    const valores = firmas[id] || {};
    if (!valores.fecha_firma || !String(valores.protocolo || "").trim()) {
      setErroresFirma((actual) => ({ ...actual, [id]: "Indica la fecha de firma y el número de protocolo." }));
      return;
    }
    setGuardandoFirma((actual) => ({ ...actual, [id]: true }));
    setErroresFirma((actual) => ({ ...actual, [id]: "" }));
    setMensajeFirma((actual) => ({ ...actual, [id]: "" }));
    try {
      await axios.post(`/apoderagest/encargos/${encodeURIComponent(encargo.id_expediente || encargo.id)}/firmar`, {
        fecha_firma: valores.fecha_firma,
        protocolo: String(valores.protocolo).trim(),
      });
      setMensajeFirma((actual) => ({ ...actual, [id]: "Firma registrada en la ficha del expediente." }));
      onFirmado?.();
    } catch (error) {
      setErroresFirma((actual) => ({
        ...actual,
        [id]: error?.response?.data?.detail || "No se pudo registrar la firma.",
      }));
    } finally {
      setGuardandoFirma((actual) => ({ ...actual, [id]: false }));
    }
  }

  async function abrirDocumento(encargo, documento) {
    try {
      const ruta = documento.url_descarga || `/expedientes/${encodeURIComponent(encargo.id_expediente)}/carpeta-digital/${documento.id}/descargar`;
      const res = await axios.get(ruta, { responseType: "blob" });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      window.alert(error?.response?.data?.detail || "No se pudo abrir el documento.");
    }
  }

  if (!encargos.length) {
    return <EstadoVacio icono="▤" titulo="No hay encargos pendientes de firma" detalle="Aquí aparecen los expedientes enviados al notario que aún no tienen fecha de firma real ni protocolo." />;
  }

  return (
    <div className="ag-encargos-agrupados">
      {grupos.map((grupo) => {
        const abierto = Boolean(abiertos[grupo.clave]);
        return (
          <section className="ag-panel ag-grupo-notario" key={grupo.clave}>
            <button type="button" className="ag-panel-cabecera ag-notario-grupo-trigger" aria-expanded={abierto} onClick={() => setAbiertos(actual => ({ ...actual, [grupo.clave]: !actual[grupo.clave] }))}>
              <span className="ag-notario-grupo-icono" aria-hidden="true">{abierto ? "⌄" : "›"}</span>
              <span className="ag-notario-grupo-info"><strong>{grupo.nombre}</strong><small>{grupo.nif || "NIF no disponible"}</small></span>
              <span className="ag-contador">{grupo.expedientes.length} {grupo.expedientes.length === 1 ? "expediente pendiente" : "expedientes pendientes"}</span>
            </button>
            {abierto ? (
              <div className="ag-encargos-detalle-lista">
                {grupo.expedientes.map((encargo, indice) => {
                  const id = String(encargo.id_expediente || encargo.id || indice);
                  const detalleAbierto = Boolean(abiertos[`exp-${id}`]);
                  const firma = firmas[id] || {};
                  const facturacion = encargo.facturacion || {};
                  return (
                    <article className="ag-encargo-detalle" key={id}>
                      <button type="button" className="ag-encargo-detalle-cabecera" aria-expanded={detalleAbierto} onClick={() => setAbiertos(actual => ({ ...actual, [`exp-${id}`]: !actual[`exp-${id}`] }))}>
                        <span><strong>Expediente {texto(encargo.id_expediente || encargo.id)}</strong><small>{texto(encargo.titular)} · {texto(encargo.notario || encargo.nombre_notario)}</small></span>
                        <span>{detalleAbierto ? "Ocultar detalles ⌃" : "Ver todos los datos ⌄"}</span>
                      </button>
                      <div className="ag-encargo-resumen">
                        <CampoDetalle etiqueta="Fecha prevista" valor={fechaLegible(encargo.fecha_prevista_firma)} />
                        <CampoDetalle etiqueta="Fecha de envío" valor={fechaLegible(encargo.fecha_envio_notario)} />
                        <CampoDetalle etiqueta="Cuantía del documento / importe" valor={encargo.cuantia_documento ?? encargo.importe} />
                        <CampoDetalle etiqueta="Protocolo actual" valor={encargo.protocolo} />
                      </div>
                      {detalleAbierto && (
                        <div className="ag-encargo-paneles">
                          <section className="ag-encargo-subpanel">
                            <h4>Datos del expediente y documento</h4>
                            <div className="ag-encargo-grid">
                              <CampoDetalle etiqueta="Titular" valor={encargo.titular} />
                              <CampoDetalle etiqueta="NIF titular" valor={encargo.nif_titular} />
                              <CampoDetalle etiqueta="Notario" valor={encargo.nombre_notario || encargo.notario} />
                              <CampoDetalle etiqueta="NIF notario" valor={encargo.nif_notario} />
                              <CampoDetalle etiqueta="Oficina" valor={encargo.oficina} />
                              <CampoDetalle etiqueta="Tipo de documento" valor={encargo.tipo_documento} />
                              <CampoDetalle etiqueta="Tipo de trámite" valor={encargo.tipo_tramite} />
                              <CampoDetalle etiqueta="Formato de escritura" valor={encargo.formato_escritura} />
                              <CampoDetalle etiqueta="Idioma" valor={encargo.idioma_documento} />
                              <CampoDetalle etiqueta="Contrato" valor={encargo.contrato} />
                              <CampoDetalle etiqueta="Tipo de operación" valor={encargo.tipo_operacion} />
                              <CampoDetalle etiqueta="Capital" valor={numeroLegible(encargo.capital)} />
                              <CampoDetalle etiqueta="Importe" valor={numeroLegible(encargo.importe)} />
                              <CampoDetalle etiqueta="Saldo real" valor={numeroLegible(encargo.saldo_real)} />
                              <CampoDetalle etiqueta="Saldo disponible" valor={numeroLegible(encargo.saldo_disponible)} />
                              <CampoDetalle etiqueta="Observaciones generales" valor={encargo.observaciones} />
                            </div>
                            {encargo.documentos_escritura?.length > 0 && (
                              <div className="ag-cuantias-documentos">
                                <h5>Documentos de escritura y cuantías</h5>
                                {encargo.documentos_escritura.map((documento) => (
                                  <div key={documento.id} className="ag-cuantia-documento">
                                    <span>{texto(documento.tipo_documento, "Documento")}</span>
                                    <strong>{documento.cuantia == null ? "Cuantía pendiente" : numeroLegible(documento.cuantia)}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>
                          <section className="ag-encargo-subpanel">
                            <h4>Datos de facturación</h4>
                            <div className="ag-encargo-grid">
                              <CampoDetalle etiqueta="Nombre / razón social" valor={[facturacion.nombre, facturacion.apellidos].filter(Boolean).join(" ")} />
                              <CampoDetalle etiqueta="DNI / NIF" valor={facturacion.dni_nif} />
                              <CampoDetalle etiqueta="Dirección" valor={facturacion.direccion} />
                              <CampoDetalle etiqueta="Código postal" valor={facturacion.codigo_postal} />
                              <CampoDetalle etiqueta="Población" valor={facturacion.poblacion} />
                              <CampoDetalle etiqueta="Provincia" valor={facturacion.provincia} />
                              <CampoDetalle etiqueta="Teléfono" valor={facturacion.telefono} />
                              <CampoDetalle etiqueta="Email" valor={facturacion.email} />
                              <CampoDetalle etiqueta="Estado de facturación" valor={facturacion.estado} />
                              <CampoDetalle etiqueta="Fecha de facturación" valor={fechaLegible(facturacion.fecha)} />
                            </div>
                          </section>
                          <section className="ag-encargo-subpanel">
                            <h4>Fincas y registros de la propiedad</h4>
                            {encargo.fincas?.length ? encargo.fincas.map((finca, i) => (
                              <div className="ag-finca-registro" key={`${id}-finca-${i}`}>
                                <div className="ag-encargo-grid">
                                  <CampoDetalle etiqueta="Finca" valor={finca.finca} />
                                  <CampoDetalle etiqueta="CRU / IDUFIR" valor={finca.cru_idufir} />
                                  <CampoDetalle etiqueta="Registro de la Propiedad" valor={finca.registro} />
                                  <CampoDetalle etiqueta="Provincia" valor={finca.provincia} />
                                  <CampoDetalle etiqueta="Población" valor={finca.poblacion} />
                                  <CampoDetalle etiqueta="Sección" valor={finca.seccion} />
                                  <CampoDetalle etiqueta="Cuantía registral" valor={finca.cuantia} />
                                  <CampoDetalle etiqueta="Inscripción" valor={finca.inscripcion} />
                                  <CampoDetalle etiqueta="Contrato finca" valor={finca.contrato} />
                                  <CampoDetalle etiqueta="Fecha de constitución" valor={fechaLegible(finca.fecha_constitucion)} />
                                  <CampoDetalle etiqueta="Subrogado" valor={finca.subrogado} />
                                  <CampoDetalle etiqueta="Entidad original" valor={finca.entidad_original} />
                                </div>
                              </div>
                            )) : <p className="ag-encargo-vacio">No constan fincas registradas en el expediente.</p>}
                          </section>
                          <section className="ag-encargo-subpanel">
                            <h4>Documentación de la carpeta digital</h4>
                            {encargo.documentos?.length ? (
                              <ul className="ag-documentos-apoderado">
                                {encargo.documentos.map((doc) => (
                                  <li key={doc.id}>
                                    <span><strong>{doc.categoria}</strong><small>{doc.nombre_original} · {fechaLegible(doc.fecha_subida)}</small></span>
                                    <button type="button" onClick={() => abrirDocumento(encargo, doc)}>Ver documento</button>
                                  </li>
                                ))}
                              </ul>
                            ) : <p className="ag-encargo-vacio">Todavía no hay documentos disponibles en las categorías de apoderado.</p>}
                          </section>
                          <section className="ag-encargo-subpanel">
                            <h4>Observaciones visibles para el apoderado</h4>
                            {encargo.observaciones_apoderado?.length ? (
                              <ul className="ag-observaciones-apoderado">
                                {encargo.observaciones_apoderado.map((obs) => <li key={obs.id}><p>{obs.comentario}</p><small>{obs.fecha ? new Date(obs.fecha).toLocaleString("es-ES") : "Fecha no disponible"}</small></li>)}
                              </ul>
                            ) : <p className="ag-encargo-vacio">No hay observaciones marcadas como «Visible apoderado».</p>}
                          </section>
                          <section className="ag-encargo-subpanel ag-firmar-panel">
                            <h4>Confirmar firma</h4>
                            <p>Al pulsar «Firmar», la fecha y el protocolo se guardan en los campos oficiales de FichaExpediente.</p>
                            <div className="ag-firmar-controles">
                              <label>Fecha de firma<input type="date" value={firma.fecha_firma ?? encargo.fecha_firma ?? ""} onChange={(e) => cambiarFirma(id, "fecha_firma", e.target.value)} /></label>
                              <label>Número de protocolo<input type="text" maxLength={200} value={firma.protocolo ?? encargo.protocolo ?? ""} onChange={(e) => cambiarFirma(id, "protocolo", e.target.value)} placeholder="Introduce el protocolo" /></label>
                              <button type="button" disabled={!!guardandoFirma[id]} onClick={() => firmar(encargo)}>{guardandoFirma[id] ? "Guardando…" : "Firmar"}</button>
                            </div>
                            {erroresFirma[id] && <p className="ag-firma-error">{erroresFirma[id]}</p>}
                            {mensajeFirma[id] && <p className="ag-firma-ok">{mensajeFirma[id]}</p>}
                          </section>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function nombreNotaria(notaria) {
  if (!notaria) return "Notaría";

  const nombreCompleto = [
    notaria.nombre,
    notaria.apellidos,
  ].filter(Boolean).join(" ").trim();

  return (
    nombreCompleto ||
    notaria.nombre_completo ||
    notaria.nombre_notario ||
    `Notaría ${notaria.id}`
  );
}

function normalizarRespuesta(respuesta) {
  const datos = respuesta?.data ?? respuesta;
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.items)) return datos.items;
  if (Array.isArray(datos?.resultados)) return datos.resultados;
  if (Array.isArray(datos?.notarias)) return datos.notarias;
  return [];
}

export default function ApoderaGest() {
  const [pestana, setPestana] = useState("Dashboard");
  const empleado = useAuthStore((state) => state.empleado);
  const usuarioId = empleado?.empleado_id ?? empleado?.id ?? null;

  const [dashboard, setDashboard] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [encargos, setEncargos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busquedaEncargos, setBusquedaEncargos] = useState("");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // CTN: histórico real de firmas y ficha completa del notario integrada.
  const [notarias, setNotarias] = useState([]);
  const [notariaSeleccionada, setNotariaSeleccionada] = useState("");
  const [cargandoNotarias, setCargandoNotarias] = useState(false);
  const [errorCTN, setErrorCTN] = useState("");
  const [notariasCargadas, setNotariasCargadas] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [resDashboard, resAgenda, resEncargos] = await Promise.all([
        axios.get("/apoderagest/dashboard"),
        axios.get("/apoderagest/agenda"),
        axios.get("/apoderagest/encargos"),
      ]);

      setDashboard(resDashboard.data || {});
      setAgenda(Array.isArray(resAgenda.data) ? resAgenda.data : []);
      setEncargos(Array.isArray(resEncargos.data) ? resEncargos.data : []);
      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error("Error cargando ApoderaGest:", err);
      setError(
        err?.response?.data?.detail ||
          "No se han podido cargar los datos. Comprueba tu conexión o vuelve a intentarlo."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const encargosFiltrados = useMemo(() => {
    const termino = busquedaEncargos.trim().toLowerCase();
    if (!termino) return encargos;

    return encargos.filter((encargo) =>
      [
        encargo.id_expediente,
        encargo.id,
        encargo.titular,
        encargo.estado,
        encargo.notario,
        encargo.nombre_notario,
        encargo.nif_notario,
        encargo.fecha_envio_notario,
        encargo.fecha_prevista_firma,
        encargo.observaciones,
        ...(encargo.fincas || []).flatMap((f) => [f.finca, f.registro, f.cru_idufir]),
      ].some((valor) => String(valor ?? "").toLowerCase().includes(termino))
    );
  }, [encargos, busquedaEncargos]);

  const cargarNotariasCTN = useCallback(async () => {
    setCargandoNotarias(true);
    setErrorCTN("");

    try {
      const respuesta = await axios.get("/ctn/notarias", {
        params: { page: 1, page_size: 200 },
      });

      const listado = normalizarRespuesta(respuesta).sort((a, b) =>
        nombreNotaria(a).localeCompare(nombreNotaria(b), "es")
      );

      setNotarias(listado);
      setNotariasCargadas(true);

      setNotariaSeleccionada((actual) => {
        if (actual && listado.some((item) => String(item.id) === actual)) {
          return actual;
        }
        return listado.length ? String(listado[0].id) : "";
      });

    } catch (err) {
      console.error("Error cargando notarías CTN:", err);
      setErrorCTN(
        err?.response?.data?.detail ||
          "No se ha podido cargar el listado de notarías de CTN."
      );
    } finally {
      setCargandoNotarias(false);
    }
  }, []);

  useEffect(() => {
    if (pestana !== "CTN" || notariasCargadas) return;
    cargarNotariasCTN();
  }, [pestana, notariasCargadas, cargarNotariasCTN]);

  const fechaActual = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const notariaActual = notarias.find(
    (item) => String(item.id) === notariaSeleccionada
  );

  return (
    <main className="apoderagest">
      <div className="ag-fondo-decorativo" aria-hidden="true" />

      <header className="ag-hero">
        <div className="ag-hero-identidad">
          <div className="ag-marca">AG</div>
          <div>
            <div className="ag-eyebrow">MOLSAN ERP · PREMIUM 2027</div>
            <h1>ApoderaGest</h1>
            <p>Centro de gestión de encargos, firmas y actividad del apoderado.</p>
          </div>
        </div>
        <div className="ag-hero-acciones">
          <div className="ag-fecha-actual">
            <span className="ag-punto-vivo" />
            <span>{fechaActual}</span>
          </div>
          <button type="button" className="ag-boton-actualizar" onClick={cargarDatos} disabled={cargando}>
            <span className={cargando ? "ag-icono-girando" : ""} aria-hidden="true">↻</span>
            {cargando ? "Actualizando…" : "Actualizar datos"}
          </button>
        </div>
      </header>

      <nav className="ag-navegacion" aria-label="Secciones de ApoderaGest">
        {PESTANAS.map((item) => (
          <button
            type="button"
            key={item.nombre}
            className={`ag-nav-item ${pestana === item.nombre ? "ag-nav-activo" : ""}`}
            onClick={() => setPestana(item.nombre)}
            aria-current={pestana === item.nombre ? "page" : undefined}
          >
            <span className="ag-nav-icono" aria-hidden="true">{item.icono}</span>
            <span>{item.nombre}</span>
          </button>
        ))}
      </nav>

      {error ? (
        <div className="ag-alerta-error" role="alert">
          <span className="ag-alerta-icono">!</span>
          <div><strong>No se han podido actualizar los datos</strong><p>{error}</p></div>
          <button type="button" onClick={cargarDatos} disabled={cargando}>Reintentar</button>
        </div>
      ) : null}

      {cargando && !dashboard ? (
        <div className="ag-cargando"><span className="ag-spinner" /><span>Cargando tu espacio de trabajo…</span></div>
      ) : null}

      {pestana === "Dashboard" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion">
            <div><span className="ag-kicker">VISTA GENERAL</span><h2>Resumen de actividad</h2><p>Una visión rápida de encargos, firmas y próximos compromisos.</p></div>
            {ultimaActualizacion ? <span className="ag-actualizado">Actualizado a las {ultimaActualizacion.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span> : null}
          </div>
          <div className="ag-grid-kpi">
            <TarjetaIndicador titulo="Total de encargos" valor={numeroLegible(dashboard?.total_encargos ?? 0)} detalle="Volumen registrado" icono="▤" variante="ag-kpi-azul" />
            <TarjetaIndicador titulo="Firmados" valor={numeroLegible(dashboard?.firmados ?? 0)} detalle="Encargos completados" icono="✓" variante="ag-kpi-verde" />
            <TarjetaIndicador titulo="Pendientes" valor={numeroLegible(dashboard?.pendientes ?? 0)} detalle="Requieren seguimiento" icono="◷" variante="ag-kpi-ambar" />
            <TarjetaIndicador titulo="Media hasta firma" valor={dashboard?.media_dias_hasta_firma == null ? "—" : `${dashboard.media_dias_hasta_firma} días`} detalle="Tiempo medio de gestión" icono="↗" variante="ag-kpi-violeta" />
          </div>
          <div className="ag-grid-secundario">
            <TarjetaIndicador titulo="Firmas presenciales" valor={numeroLegible(dashboard?.firmas_presenciales)} detalle="Actividad presencial" icono="⌖" />
            <TarjetaIndicador titulo="Firmas por videoconferencia" valor={numeroLegible(dashboard?.firmas_videoconferencia)} detalle="Actividad remota" icono="▣" />
            <TarjetaIndicador titulo="Kilómetros presenciales" valor={dashboard?.kilometros_presenciales == null ? "Pendiente" : `${numeroLegible(dashboard.kilometros_presenciales)} km`} detalle="Desplazamientos registrados" icono="⌁" />
          </div>
          <section className="ag-panel ag-panel-proximas">
            <div className="ag-panel-cabecera"><div><span className="ag-kicker">PLANIFICACIÓN</span><h3>Próximas citas</h3></div><button type="button" className="ag-enlace-accion" onClick={() => setPestana("Agenda")}>Ver agenda <span>→</span></button></div>
            {!agenda.length ? <EstadoVacio icono="▦" titulo="No hay citas disponibles" detalle="Cuando existan citas asignadas, podrás consultarlas desde aquí." /> : (
              <div className="ag-proximas-lista">{agenda.slice(0, 5).map((cita, i) => (
                <article className="ag-cita-item" key={cita.id ?? `${cita.fecha}-${i}`}>
                  <div className="ag-cita-fecha"><strong>{fechaLegible(cita.fecha).split("/")[0]}</strong><span>{fechaLegible(cita.fecha).split("/").slice(1).join("/")}</span></div>
                  <div className="ag-cita-info"><strong>{texto(cita.tipo_cita, "Cita")}</strong><span>{texto(cita.hora_inicio, "Hora pendiente")}{cita.expediente_id ? ` · Expediente ${cita.expediente_id}` : ""}</span></div>
                  <span className="ag-cita-flecha">›</span>
                </article>
              ))}</div>
            )}
          </section>
        </section>
      ) : null}

           {pestana === "Agenda" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion">
            <div>
              <span className="ag-kicker">ORGANIZACIÓN</span>
              <h2>Mi agenda de citas</h2>
              <p>
                Consulta tus citas asignadas. Las citas de otros apoderados
                no se muestran en este apartado.
              </p>
            </div>
          </div>

          <Agenda soloApoderado />
        </section>
      ) : null}

      {pestana === "Encargos" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion"><div><span className="ag-kicker">GESTIÓN OPERATIVA</span><h2>Mis encargos</h2><p>Seguimiento de expedientes, titulares y estado de firma.</p></div><span className="ag-contador">{encargos.length} encargos</span></div>
          <div className="ag-panel">
            <div className="ag-toolbar">
              <label className="ag-busqueda"><span aria-hidden="true">⌕</span><input type="search" value={busquedaEncargos} onChange={(e) => setBusquedaEncargos(e.target.value)} placeholder="Buscar expediente, titular, notario o estado…" aria-label="Buscar encargos" /></label>
              <span className="ag-resultados">{encargosFiltrados.length} resultados</span>
            </div>
            <TablaEncargos encargos={encargosFiltrados} onFirmado={cargarDatos} />
          </div>
        </section>
      ) : null}

      {pestana === "CTN" ? (
        <section className="ag-contenido ag-ctn-integrado">
          <div className="ag-titulo-seccion">
            <div><span className="ag-kicker">COORDINACIÓN NOTARIAL</span><h2>CTN · Ficha e histórico de firmas</h2><p>Datos completos de la notaría, relaciones con otros notarios e histórico de firmas, sin ventanas emergentes.</p></div>
            <button type="button" className="ag-boton-actualizar" onClick={cargarNotariasCTN} disabled={cargandoNotarias}>{cargandoNotarias ? "Actualizando…" : "Actualizar notarías"}</button>
          </div>

          {errorCTN ? (
            <div className="ag-alerta-error" role="alert"><span className="ag-alerta-icono">!</span><div><strong>Error en la integración CTN</strong><p>{errorCTN}</p></div><button type="button" onClick={cargarNotariasCTN} disabled={cargandoNotarias}>Reintentar</button></div>
          ) : null}

          <div className="ag-panel ag-ctn-selector">
            <div className="ag-toolbar">
              <div className="ag-ctn-buscador-notario">
                <AutocompleteNotario
                  value={notariaActual || null}
                  disabled={cargandoNotarias}
                  onSelect={(notario) => {
                    if (!notario?.id) return;
                    setNotarias((actuales) => {
                      const existe = actuales.some((item) => String(item.id) === String(notario.id));
                      return existe
                        ? actuales.map((item) => String(item.id) === String(notario.id) ? { ...item, ...notario } : item)
                        : [notario, ...actuales];
                    });
                    setNotariaSeleccionada(String(notario.id));
                    setErrorCTN("");
                  }}
                />
              </div>
              <span className="ag-resultados">
                {notarias.length} {notarias.length === 1 ? "notaría cargada" : "notarías cargadas"} · busca en el catálogo CTN
              </span>
            </div>
          </div>

          {notariaActual ? (
            <ModalCtnDetalle open inline notaria={notariaActual} />
          ) : (
            <div className="ag-panel"><EstadoVacio icono="◇" titulo={cargandoNotarias ? "Cargando notarías…" : "Selecciona una notaría"} detalle="La ficha completa y las asociaciones aparecerán en esta sección." /></div>
          )}
        </section>
      ) : null}

      {pestana === "Mensajes" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion"><div><span className="ag-kicker">COMUNICACIÓN CORPORATIVA</span><h2>Mensajes</h2><p>Mensajería del ERP-Molsan con contactos conectados, conversaciones, mensajes no leídos y archivos adjuntos.</p></div></div>
          {usuarioId ? <Mensajes usuarioId={usuarioId} /> : <div className="ag-panel" role="alert"><h3>No se ha podido identificar al usuario</h3><p>No es posible abrir Mensajes porque la sesión actual no contiene un identificador de empleado válido. Vuelve a iniciar sesión y prueba de nuevo.</p></div>}
        </section>
      ) : null}

      {pestana === "Intranet" ? <Intranet /> : null}

      <footer className="ag-footer"><span><strong>MOLSAN ERP</strong> · ApoderaGest</span><span>Premium 2027</span></footer>
    </main>
  );
}

