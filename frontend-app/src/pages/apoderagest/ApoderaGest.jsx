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

function horaLegible(valor) {
  if (!valor) return "—";
  const textoHora = String(valor);
  const coincidencia = textoHora.match(/(?:T|^)(\d{2}:\d{2})/);
  return coincidencia ? coincidencia[1] : textoHora.slice(0, 5);
}

function texto(valor, alternativa = "—") {
  return valor === null || valor === undefined || valor === ""
    ? alternativa
    : String(valor);
}

function normalizarCategoriaDocumento(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function esBorradorEscritura(documento) {
  const categoria = normalizarCategoriaDocumento(documento?.categoria);
  const nombre = normalizarCategoriaDocumento(documento?.nombre_original);
  return categoria.includes("borrador") || categoria.includes("escrituras/borradores") ||
    nombre.includes("borrador de escritura") || nombre.includes("borradores de escritura");
}

function esDocumentoOtros(documento) {
  const categoria = normalizarCategoriaDocumento(documento?.categoria);
  const nombre = normalizarCategoriaDocumento(documento?.nombre_original);
  return categoria === "otros documentos" || categoria === "otra documentacion" ||
    categoria === "mails de la oficina" ||
    nombre.includes("otros documentos") || nombre.includes("otra documentacion");
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
  const [catalogoCtn, setCatalogoCtn] = useState([]);
  const [datosAceptacion, setDatosAceptacion] = useState({});
  const [guardandoAceptacion, setGuardandoAceptacion] = useState({});
  const [erroresAceptacion, setErroresAceptacion] = useState({});
  const [mensajesAceptacion, setMensajesAceptacion] = useState({});

  useEffect(() => {
    let activo = true;
    const nombres = [...new Set(encargos
      .map((encargo) => String(encargo.nombre_notario || encargo.notario || "").trim())
      .filter(Boolean))];
    Promise.all(nombres.map((nombre) =>
      axios.get("/ctn/notarias", { params: { q: nombre, page_size: 200 } })
        .then(({ data }) => Array.isArray(data?.items) ? data.items : [])
        .catch(() => [])
    )).then((listas) => {
      if (activo) {
        const unicos = new Map();
        listas.flat().forEach((notario) => unicos.set(notario.id, notario));
        setCatalogoCtn([...unicos.values()]);
      }
    });
    return () => { activo = false; };
  }, [encargos]);
  const grupos = useMemo(() => agruparEncargosPorNotario(encargos), [encargos]);

  function cambiarDatoAceptacion(encargo, campo, valor) {
    const id = String(encargo.id_expediente || encargo.id);
    setDatosAceptacion((actual) => ({
      ...actual,
      [id]: {
        numero_solicitud_pnc: actual[id]?.numero_solicitud_pnc ?? encargo.numero_solicitud_pnc ?? "",
        fecha_solicitud_pnc: actual[id]?.fecha_solicitud_pnc ?? encargo.fecha_solicitud_pnc ?? "",
        fecha_prevista_firma: actual[id]?.fecha_prevista_firma ?? encargo.fecha_prevista_firma ?? "",
        hora_inicio: actual[id]?.hora_inicio ?? encargo.hora_prevista_firma ?? "09:00",
        hora_fin: actual[id]?.hora_fin ?? encargo.hora_fin_prevista_firma ?? "10:00",
        [campo]: valor,
      },
    }));
    setErroresAceptacion((actual) => ({ ...actual, [id]: "" }));
    setMensajesAceptacion((actual) => ({ ...actual, [id]: "" }));
  }

  async function aceptarEncargo(encargo) {
    const id = String(encargo.id_expediente || encargo.id);
    const valores = datosAceptacion[id] || {
      numero_solicitud_pnc: encargo.numero_solicitud_pnc || "",
      fecha_solicitud_pnc: encargo.fecha_solicitud_pnc || "",
      fecha_prevista_firma: encargo.fecha_prevista_firma || "",
      hora_inicio: horaLegible(encargo.hora_prevista_firma) === "—" ? "09:00" : horaLegible(encargo.hora_prevista_firma),
      hora_fin: horaLegible(encargo.hora_fin_prevista_firma) === "—" ? "10:00" : horaLegible(encargo.hora_fin_prevista_firma),
    };
    if (!valores.numero_solicitud_pnc?.trim() || !valores.fecha_solicitud_pnc || !valores.fecha_prevista_firma || !valores.hora_inicio || !valores.hora_fin) {
      setErroresAceptacion((actual) => ({ ...actual, [id]: "Completa el número de solicitud, las fechas y el horario." }));
      return;
    }
    if (valores.hora_fin <= valores.hora_inicio) {
      setErroresAceptacion((actual) => ({ ...actual, [id]: "La hora de fin debe ser posterior a la hora de inicio." }));
      return;
    }
    setGuardandoAceptacion((actual) => ({ ...actual, [id]: true }));
    setErroresAceptacion((actual) => ({ ...actual, [id]: "" }));
    setMensajesAceptacion((actual) => ({ ...actual, [id]: "" }));
    try {
      const { data } = await axios.post(`/apoderagest/encargos/${encodeURIComponent(id)}/aceptar`, {
        numero_solicitud_pnc: valores.numero_solicitud_pnc.trim(),
        fecha_solicitud_pnc: valores.fecha_solicitud_pnc,
        fecha_prevista_firma: valores.fecha_prevista_firma,
        hora_inicio: valores.hora_inicio,
        hora_fin: valores.hora_fin,
      });
      setMensajesAceptacion((actual) => ({ ...actual, [id]: data?.mensaje || "Encargo aceptado y cita de firma guardada en Agenda." }));
      onFirmado?.();
    } catch (error) {
      setErroresAceptacion((actual) => ({ ...actual, [id]: error?.response?.data?.detail || "No se pudo aceptar el encargo." }));
    } finally {
      setGuardandoAceptacion((actual) => ({ ...actual, [id]: false }));
    }
  }

  function cambiarFirma(id, campo, valor) {
    setFirmas((actual) => ({
      ...actual,
      [id]: { fecha_firma: actual[id]?.fecha_firma ?? "", protocolo: actual[id]?.protocolo ?? "", notario_otorgante: actual[id]?.notario_otorgante ?? "", [campo]: valor },
    }));
  }

  async function firmar(encargo) {
    const id = String(encargo.id_expediente || encargo.id);
    const valores = firmas[id] || {};
    if (!valores.fecha_firma || !String(valores.protocolo || "").trim() || !String(valores.notario_otorgante || encargo.nombre_notario || encargo.notario || "").trim()) {
      setErroresFirma((actual) => ({ ...actual, [id]: "Indica la fecha, el número de protocolo y el notario otorgante." }));
      return;
    }
    setGuardandoFirma((actual) => ({ ...actual, [id]: true }));
    setErroresFirma((actual) => ({ ...actual, [id]: "" }));
    setMensajeFirma((actual) => ({ ...actual, [id]: "" }));
    try {
      await axios.post(`/apoderagest/encargos/${encodeURIComponent(encargo.id_expediente || encargo.id)}/firmar`, {
        fecha_firma: valores.fecha_firma,
        protocolo: String(valores.protocolo).trim(),
        notario_otorgante: String(valores.notario_otorgante || encargo.nombre_notario || encargo.notario || "").trim(),
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
      const nombre = documento.nombre_original || "Documento";
      const extension = nombre.split(".").pop()?.toLowerCase() || "";
      const mimeOriginal = res.data instanceof Blob ? res.data.type : "";
      const mimeDeclarado = documento.tipo_mime || mimeOriginal || "";
      // Algunos endpoints entregan los PDF como application/octet-stream.
      // Forzamos application/pdf para que el navegador lo renderice en el iframe
      // del visor integrado, en lugar de intentar descargarlo como adjunto.
      const mime = extension === "pdf" || mimeDeclarado.toLowerCase().includes("pdf")
        ? "application/pdf"
        : mimeDeclarado;
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const previsualizable = mime === "application/pdf" || mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(extension);
      setDocumentoVisor({ ...documento, nombre, url, mime, previsualizable });
    } catch (error) {
      window.alert(error?.response?.data?.detail || "No se ha podido abrir el documento en el visor.");
    }
  }

  function cerrarVisor() {
    if (documentoVisor?.url) URL.revokeObjectURL(documentoVisor.url);
    setDocumentoVisor(null);
  }

  function descargarDocumentoVisor() {
    if (!documentoVisor?.url) return;
    const enlace = document.createElement("a");
    enlace.href = documentoVisor.url;
    enlace.download = documentoVisor.nombre || "documento";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
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
              <div className="ag-encargos-detalle-lista ag-ficha-premium">
                {grupo.expedientes.map((encargo, indice) => {
                  const id = String(encargo.id_expediente || encargo.id || indice);
                  const detalleAbierto = Boolean(abiertos[`exp-${id}`]);
                  const firma = firmas[id] || {};
                  const facturacion = encargo.facturacion || {};
                  return (
                    <article className="ag-encargo-detalle ag-ficha-encargo" key={id}>
                      <button type="button" className="ag-encargo-detalle-cabecera" aria-expanded={detalleAbierto} onClick={() => setAbiertos(actual => ({ ...actual, [`exp-${id}`]: !actual[`exp-${id}`] }))}>
                        <span><strong>Expediente {texto(encargo.id_expediente || encargo.id)}</strong><small>{texto(encargo.titular)}</small></span>
                        <span>{detalleAbierto ? "Ocultar detalles ⌃" : "Ver todos los datos ⌄"}</span>
                      </button>
                      {encargo.bloqueado && <div className="ag-alerta-bloqueo" role="alert"><strong>EXPEDIENTE BLOQUEADO EN CANCELAGEST</strong><span>{texto(encargo.motivo_bloqueo_efectivo || encargo.motivo_bloqueo || "Este expediente está bloqueado. Consulta con gestión antes de continuar.")}</span></div>}
                      <div className="ag-encargo-resumen ag-ficha-resumen ag-aceptar-resumen">
                        <CampoDetalle etiqueta="Expediente bloqueado" valor={encargo.bloqueado ? "Sí" : "No"} />
                        <CampoDetalle etiqueta="Solicitante" valor={encargo.nombre_solicitante || encargo.solicitante} />
                        <CampoDetalle etiqueta="NIF solicitante" valor={encargo.nif_solicitante} />
                        <CampoDetalle etiqueta="Capital" valor={encargo.capital === null || encargo.capital === undefined ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(encargo.capital))} />
                        <label className="ag-aceptar-campo"><span>N.º solicitud PN</span><input type="text" value={(datosAceptacion[id]?.numero_solicitud_pnc ?? encargo.numero_solicitud_pnc ?? "")} onChange={(e) => cambiarDatoAceptacion(encargo, "numero_solicitud_pnc", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} /></label>
                        <label className="ag-aceptar-campo"><span>Fecha solicitud PNC</span><input type="date" value={(datosAceptacion[id]?.fecha_solicitud_pnc ?? encargo.fecha_solicitud_pnc ?? "")} onChange={(e) => cambiarDatoAceptacion(encargo, "fecha_solicitud_pnc", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} /></label>
                        <label className="ag-aceptar-campo"><span>Fecha prevista de firma</span><input type="date" value={(datosAceptacion[id]?.fecha_prevista_firma ?? encargo.fecha_prevista_firma ?? "")} onChange={(e) => cambiarDatoAceptacion(encargo, "fecha_prevista_firma", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} /></label>
                        <label className="ag-aceptar-campo"><span>Hora de inicio</span><input type="time" value={(datosAceptacion[id]?.hora_inicio ?? (encargo.hora_prevista_firma || "09:00").slice(0,5))} onChange={(e) => cambiarDatoAceptacion(encargo, "hora_inicio", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} /></label>
                        <label className="ag-aceptar-campo"><span>Hora de fin</span><input type="time" value={(datosAceptacion[id]?.hora_fin ?? (encargo.hora_fin_prevista_firma || "10:00").slice(0,5))} onChange={(e) => cambiarDatoAceptacion(encargo, "hora_fin", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} /></label>
                        <div className="ag-aceptar-accion"><button type="button" disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} onClick={() => aceptarEncargo(encargo)}>{guardandoAceptacion[id] ? "Guardando…" : "Aceptar"}</button></div>
                        {erroresAceptacion[id] && <p className="ag-firma-error">{erroresAceptacion[id]}</p>}
                        {mensajesAceptacion[id] && <p className="ag-firma-ok">{mensajesAceptacion[id]}</p>}
                      </div>
                      {detalleAbierto && (
                        <div className="ag-encargo-paneles ag-ficha-paneles">
                          <section className="ag-encargo-subpanel ag-ficha-envio">
                            <div className="ag-ficha-bloque-heading"><span>01 · DATOS DEL ENVÍO</span><h4>Datos del envío</h4></div>
                            <div className="ag-encargo-grid">
                              <CampoDetalle etiqueta="Fecha de envío" valor={fechaLegible(encargo.fecha_envio_notario || encargo.fecha_envio)} />
                              <CampoDetalle etiqueta="Idioma del documento" valor={encargo.idioma_documento || encargo.idioma} />
                              <CampoDetalle etiqueta="Fecha solicitud PNC" valor={fechaLegible(encargo.fecha_solicitud_pnc)} />
                              <CampoDetalle etiqueta="Número solicitud PNC" valor={encargo.numero_solicitud_pnc} />
                              <CampoDetalle etiqueta="Apoderado" valor={encargo.apoderado} />
                              <CampoDetalle etiqueta="Tipo de firma" valor={encargo.tipo_firma} />
                              <CampoDetalle etiqueta="Fecha prevista de firma" valor={fechaLegible(encargo.fecha_prevista_firma)} />
                              <CampoDetalle etiqueta="Hora prevista de firma" valor={horaLegible(encargo.hora_prevista_firma)} />
                            </div>
                          </section>
                          <section className="ag-encargo-subpanel ag-ficha-facturacion">
                            <div className="ag-ficha-bloque-heading"><span>02 · DATOS DE FACTURACIÓN</span><h4>Datos de facturación</h4></div>
                            <div className="ag-encargo-grid">
                              <CampoDetalle etiqueta="Nombre" valor={facturacion.nombre} />
                              <CampoDetalle etiqueta="Apellidos" valor={facturacion.apellidos} />
                              <CampoDetalle etiqueta="DNI / NIF de facturación" valor={facturacion.dni_nif} />
                              <CampoDetalle etiqueta="Dirección" valor={facturacion.direccion} />
                              <CampoDetalle etiqueta="Código postal" valor={facturacion.codigo_postal} />
                              <CampoDetalle etiqueta="Población" valor={facturacion.poblacion} />
                              <CampoDetalle etiqueta="Provincia" valor={facturacion.provincia} />
                              <CampoDetalle etiqueta="Teléfono" valor={facturacion.telefono} />
                              <CampoDetalle etiqueta="Email" valor={facturacion.email} />
                            </div>
                          </section>
                          <section className="ag-encargo-subpanel ag-ficha-archivo">
                            <div className="ag-ficha-bloque-heading"><span>04 · ARCHIVO</span><h4>Carpeta digital</h4><p>Documentación disponible para consultar desde el expediente.</p></div>
                            {(() => {
                              const documentos = encargo.documentos || [];
                              const borradores = documentos.filter(esBorradorEscritura);
                              const otros = documentos.filter((doc) => !esBorradorEscritura(doc) && esDocumentoOtros(doc));
                              const restantes = documentos.filter((doc) => !esBorradorEscritura(doc) && !esDocumentoOtros(doc));
                              const renderCarpeta = (titulo, icono, lista, vacio) => (
                                <div className="ag-carpeta-apoderado" key={titulo}>
                                  <div className="ag-carpeta-apoderado-cabecera">
                                    <span className="ag-carpeta-apoderado-icono" aria-hidden="true">{icono}</span>
                                    <div><strong>{titulo}</strong><small>{lista.length} documento{lista.length === 1 ? "" : "s"}</small></div>
                                  </div>
                                  {lista.length ? (
                                    <ul className="ag-documentos-apoderado">
                                      {lista.map((doc) => (
                                        <li key={doc.id}>
                                          <span><strong>{doc.categoria}</strong><small>{doc.nombre_original} · {fechaLegible(doc.fecha_subida)}</small></span>
                                          <button type="button" onClick={() => abrirDocumento(encargo, doc)}>Ver en visor</button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : <p className="ag-encargo-vacio">{vacio}</p>}
                                </div>
                              );
                              return (
                                <div className="ag-carpetas-apoderado">
                                  {renderCarpeta("Borradores de escritura", "▤", borradores, "No hay borradores de escritura disponibles.")}
                                  {renderCarpeta("Otros", "▣", otros, "No hay documentos clasificados en Otros.")}
                                  {restantes.length > 0 && renderCarpeta("Resto de documentación", "▧", restantes, "")}
                                </div>
                              );
                            })()}
                          </section>
                          <section className="ag-encargo-subpanel ag-ficha-registral">
                            <div className="ag-ficha-bloque-heading"><span>03 · INFORMACIÓN REGISTRAL</span><h4>Fincas y registros de la propiedad</h4></div>
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
                          <section className="ag-encargo-subpanel ag-firmar-panel ag-ficha-firma">
                            <div className="ag-ficha-bloque-heading"><span>05 · CIERRE DE FIRMA</span><h4>Confirmar firma</h4></div>
                            <p>Al pulsar «Firmar», la fecha y el protocolo se guardan en los campos oficiales de FichaExpediente.</p>
                            <div className="ag-firmar-controles">
                              <label>Fecha de firma<input type="date" value={firma.fecha_firma ?? encargo.fecha_firma ?? ""} onChange={(e) => cambiarFirma(id, "fecha_firma", e.target.value)} /></label>
                              <label>Número de protocolo<input type="text" maxLength={200} value={firma.protocolo ?? encargo.protocolo ?? ""} onChange={(e) => cambiarFirma(id, "protocolo", e.target.value)} placeholder="Introduce el protocolo" /></label>
                              <label>Notario otorgante
                                <select value={firma.notario_otorgante ?? encargo.notario_otorgante ?? encargo.nombre_notario ?? encargo.notario ?? ""} onChange={(e) => cambiarFirma(id, "notario_otorgante", e.target.value)}>
                                  <option value={encargo.nombre_notario || encargo.notario || ""}>{encargo.nombre_notario || encargo.notario || "Notario del encargo"}</option>
                                  {(() => {
                                    const normalizar = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
                                    const nombreAsignado = normalizar(encargo.nombre_notario || encargo.notario);
                                    const notarioCtn = catalogoCtn.find((n) => normalizar(n.nombre_completo || [n.nombre, n.apellidos].filter(Boolean).join(" ")) === nombreAsignado);
                                    const asociados = (notarioCtn?.notarios_asociados || []).filter((n) => normalizar(n.nombre_completo || [n.nombre, n.apellidos].filter(Boolean).join(" ")) !== nombreAsignado);
                                    return asociados.map((n) => { const nombre = n.nombre_completo || [n.nombre, n.apellidos].filter(Boolean).join(" "); return <option key={n.id} value={nombre}>{nombre}</option>; });
                                  })()}
                                </select>
                              </label>
                              <button type="button" disabled={!!guardandoFirma[id]} onClick={() => firmar(encargo)}>{guardandoFirma[id] ? "Guardando…" : "Firmar"}</button>
                            </div>
                            {erroresFirma[id] && <p className="ag-firma-error">{erroresFirma[id]}</p>}
                            {mensajeFirma[id] && <p className="ag-firma-ok">{mensajeFirma[id]}</p>}
                          </section>
                          <section className="ag-encargo-subpanel ag-ficha-observaciones">
                            <div className="ag-ficha-bloque-heading"><span>06 · COMUNICACIONES</span><h4>Observaciones visibles para el apoderado</h4></div>
                            {encargo.observaciones_apoderado?.length ? (
                              <ul className="ag-observaciones-apoderado">
                                {encargo.observaciones_apoderado.map((obs) => <li key={obs.id}><p>{obs.comentario}</p><small>{obs.fecha ? new Date(obs.fecha).toLocaleString("es-ES") : "Fecha no disponible"}</small></li>)}
                              </ul>
                            ) : <p className="ag-encargo-vacio">No hay observaciones marcadas como «Visible apoderado».</p>}
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
      {documentoVisor ? (
        <div className="ag-visor-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrarVisor(); }}>
          <section className="ag-visor-modal" role="dialog" aria-modal="true" aria-label="Visor de documentos">
            <header className="ag-visor-cabecera">
              <div className="ag-visor-titulo"><span className="ag-visor-icono">▤</span><div><strong>{documentoVisor.categoria || "Documento de carpeta digital"}</strong><small>{documentoVisor.nombre}</small></div></div>
              <div className="ag-visor-acciones"><button type="button" onClick={descargarDocumentoVisor}>Descargar</button><button type="button" className="ag-visor-cerrar" onClick={cerrarVisor} aria-label="Cerrar visor">×</button></div>
            </header>
            <div className="ag-visor-contenido">
              {documentoVisor.previsualizable ? (
                documentoVisor.mime.startsWith("image/") || ["png","jpg","jpeg","webp","gif"].includes(documentoVisor.nombre.split(".").pop()?.toLowerCase())
                  ? <div className="ag-visor-imagen-contenedor"><img src={documentoVisor.url} alt={documentoVisor.nombre} className="ag-visor-imagen" /></div>
                  : <iframe title={documentoVisor.nombre} src={documentoVisor.url} className="ag-visor-pdf" />
              ) : <div className="ag-visor-estado"><strong>Vista previa no disponible para este formato.</strong><span>Descarga el archivo para abrirlo con la aplicación correspondiente.</span><button type="button" onClick={descargarDocumentoVisor}>Descargar documento</button></div>}
            </div>
          </section>
        </div>
      ) : null}
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
                  <div className="ag-cita-fecha">
                    <strong>{fechaLegible(cita.fecha).split("/")[0]}</strong>
                    <span>{fechaLegible(cita.fecha).split("/").slice(1).join("/")}</span>
                  </div>
                  <div className="ag-cita-info">
                    <div className="ag-cita-titulo-fila">
                      <strong>{texto(cita.tipo_cita, "Cita")}</strong>
                      {cita.tipo_firma ? <span className="ag-cita-modalidad">{texto(cita.tipo_firma)}</span> : null}
                    </div>
                    <div className="ag-cita-datos">
                      <span className="ag-cita-horario"><b>Horario</b>{texto(cita.hora_inicio, "—").slice(0, 5)} – {texto(cita.hora_fin, "—").slice(0, 5)}</span>
                      <span><b>Notaría</b>{texto(cita.nombre_notario, "Sin notaría asignada")}</span>
                      <span><b>Apoderado</b>{texto(cita.apoderado, "Sin apoderado asignado")}</span>
                      {cita.id_expediente ? <span><b>Expediente</b>{texto(cita.id_expediente)}</span> : null}
                    </div>
                  </div>
                  <span className="ag-cita-flecha" aria-hidden="true">›</span>
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

