import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import axios from "../../api/axios";
import AutocompleteNotario from "../../components/agenda/AutocompleteNotario";
import Agenda from "../agenda/Agenda";
import Intranet from "../intranet/Intranet";
import Mensajes from "../mensajes/Mensajes";
import CtnListadoPage from "../ctn/CtnListadoPage";
import { useAuthStore } from "../../store/authStore";
import { createPortal } from "react-dom";

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

function normalizarNombreNotario(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

function encontrarNotarioCtn(grupo, catalogo) {
  const nif = normalizarNombreNotario(grupo?.nif);
  if (nif) {
    const porNif = catalogo.find((notario) =>
      normalizarNombreNotario(notario.nif) === nif
    );
    if (porNif) return porNif;
  }

  const nombre = normalizarNombreNotario(grupo?.nombre);
  return catalogo.find((notario) =>
    normalizarNombreNotario(
      notario.nombre_completo || [notario.nombre, notario.apellidos].filter(Boolean).join(" ")
    ) === nombre
  ) || null;
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

function euros(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(numero)
    : String(valor);
}

function EstadoPill({ valor }) {
  const estado = texto(valor, "Pendiente");
  const normalizado = estado.toLowerCase();
  return <span>{estado}</span>;
}

function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  icono,
  variante = "",
  onClick,
}) {
  const contenido = (
    <>
      <div>
        <span>{titulo}</span>
        <span aria-hidden="true">{icono}</span>
      </div>
      <div>{valor}</div>
      {detalle ? <div>{detalle}</div> : null}
      {onClick ? <span>Ver expedientes ↗</span> : null}
    </>
  );
  return onClick ? (
    <button type="button" className={`molsan-stat-card ${variante}`} onClick={onClick} aria-label={`Ver expedientes: ${titulo}`}>
      {contenido}
    </button>
  ) : <article className={`molsan-stat-card ${variante}`}>{contenido}</article>;
}

function EstadoVacio({ icono = "◇", titulo, detalle }) {
  return (
    <div className="erp-empty-state">
      <span aria-hidden="true">
        {icono}
      </span>
      <h3>{titulo}</h3>
      <p>{detalle}</p>
    </div>
  );
}

function agruparEncargosPorApoderado(encargos) {
  const grupos = new Map();
  for (const encargo of encargos) {
    const nombre = String(encargo.apoderado || "Apoderado sin asignar").trim();
    const idEmpleado = encargo.apoderado_empleado_id ?? encargo.apoderado_id ?? "";
    const clave = String(idEmpleado || nombre).toLocaleLowerCase("es");
    if (!grupos.has(clave)) grupos.set(clave, { clave, nombre, expedientes: [] });
    grupos.get(clave).expedientes.push(encargo);
  }
  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function CampoDetalle({ etiqueta, valor, clase = "" }) {
  return (
    <div className={`erp-data-item ${clase}`}>
      <span>{etiqueta}</span>
      <strong>{texto(valor)}</strong>
    </div>
  );
}

function ImprimirEncargos({ encargos = [] }) {
  const imprimir = (modo) => {
    document.body.classList.remove("molsan-print-encargos-lista", "molsan-print-encargos-fichas");
    document.body.classList.add(modo === "lista" ? "molsan-print-encargos-lista" : "molsan-print-encargos-fichas");
    const limpiar = () => { document.body.classList.remove("molsan-print-encargos-lista", "molsan-print-encargos-fichas"); window.removeEventListener("afterprint", limpiar); };
    window.addEventListener("afterprint", limpiar);
    window.print();
  };
  const documentosDe = (encargo) => {
    const lista = encargo.documentos || encargo.documentos_adjuntos || encargo.archivos || [];
    return Array.isArray(lista) ? lista : [];
  };
  return (
    <div>
      <button type="button" onClick={() => imprimir("lista")}>⎙ Imprimir listado</button>
      <button type="button" onClick={() => imprimir("fichas")}>▤ Imprimir fichas detalladas</button>
      <section aria-hidden="true">
        <header><strong>MOLSAN ERP · APODERAGEST</strong><h1>Listado de encargos</h1><p>{encargos.length} {encargos.length === 1 ? "encargo" : "encargos"} · Impreso el {new Date().toLocaleDateString("es-ES")}</p></header>
        <table><thead><tr><th>Expediente</th><th>Solicitante</th><th>Notario</th><th>Fecha prevista</th><th>Horario</th><th>Estado</th></tr></thead><tbody>{encargos.map((e, i) => <tr key={String(e.id_expediente || e.id || i)}><td>{texto(e.id_expediente || e.id)}{e.bloqueado ? <small>Bloqueado</small> : null}</td><td>{texto(e.nombre_solicitante || e.solicitante)}<small>{texto(e.nif_solicitante || e.dni_solicitante, "")}</small></td><td>{texto(e.nombre_notario || e.notario)}</td><td>{fechaLegible(e.fecha_prevista_firma)}</td><td>{horaLegible(e.hora_prevista_firma)}{e.hora_fin_prevista_firma ? " – " + horaLegible(e.hora_fin_prevista_firma) : ""}</td><td>{e.fecha_firma || e.protocolo ? "Firmado" : e.bloqueado ? "Bloqueado" : "Pendiente"}</td></tr>)}</tbody></table>
        <div>
          {encargos.map((e, i) => {
            const fincas = Array.isArray(e.fincas) ? e.fincas : [];
            const docs = documentosDe(e);
            return <article key={String(e.id_expediente || e.id || i)}>
              <header><strong>MOLSAN ERP · APODERAGEST</strong><span>FICHA DE ENCARGO</span><h2>Expediente {texto(e.id_expediente || e.id)}</h2></header>
              <div>
                <div><small>Solicitante</small><strong>{texto(e.nombre_solicitante || e.solicitante)}</strong></div>
                <div><small>NIF / CIF</small><strong>{texto(e.nif_solicitante || e.dni_solicitante)}</strong></div>
                <div><small>Notario</small><strong>{texto(e.nombre_notario || e.notario)}</strong></div>
                <div><small>Estado</small><strong>{e.fecha_firma || e.protocolo ? "Firmado" : e.bloqueado ? "Bloqueado" : "Pendiente de firma"}</strong></div>
                <div><small>Fecha prevista de firma</small><strong>{fechaLegible(e.fecha_prevista_firma)}</strong></div>
                <div><small>Horario</small><strong>{horaLegible(e.hora_prevista_firma)}{e.hora_fin_prevista_firma ? " – " + horaLegible(e.hora_fin_prevista_firma) : ""}</strong></div>
                <div><small>Fecha de firma</small><strong>{fechaLegible(e.fecha_firma)}</strong></div>
                <div><small>Número de protocolo</small><strong>{texto(e.protocolo)}</strong></div>
                <div><small>Tipo de firma</small><strong>{texto(e.tipo_firma)}</strong></div>
                <div><small>Expediente bloqueado</small><strong>{e.bloqueado ? "Sí" : "No"}</strong></div>
              </div>
              <h3>Información registral</h3>
              {fincas.length ? <table><thead><tr><th>Finca</th><th>Registro</th><th>Población</th><th>Provincia</th><th>CRU / IDUFIR</th><th>Cuantía</th></tr></thead><tbody>{fincas.map((f, j) => <tr key={j}><td>{texto(f.finca)}</td><td>{texto(f.registro)}</td><td>{texto(f.poblacion)}</td><td>{texto(f.provincia)}</td><td>{texto(f.cru_idufir)}</td><td>{texto(f.cuantia)}</td></tr>)}</tbody></table> : <p>No constan fincas registradas.</p>}
              <h3>Documentación de carpeta digital</h3>
              {docs.length ? <ul>{docs.map((d, j) => <li key={j}>{texto(d.nombre_original || d.nombre || d.filename || d.categoria || d.tipo, "Documento adjunto")}</li>)}</ul> : <p>La ficha impresa no incorpora los archivos PDF/adjuntos; consúltalos en la carpeta digital del expediente.</p>}
              {e.observaciones ? <><h3>Observaciones</h3><p>{e.observaciones}</p></> : null}
            </article>;
          })}
        </div>
        <footer>Impresión generada desde ApoderaGest. Los documentos originales no se incrustan en esta impresión.</footer>
      </section>
    </div>
  );
}
function TablaEncargos({ encargos, onFirmado }) {
  const [abiertos, setAbiertos] = useState({});
  const [grupoEncargosAbierto, setGrupoEncargosAbierto] = useState(null);
  const grupoDialogRef = useRef(null);
  useAccessibleDialog({
    open: grupoEncargosAbierto,
    onClose: () => setGrupoEncargosAbierto(null),
    dialogRef: grupoDialogRef,
  });
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
  const [edicionAceptacion, setEdicionAceptacion] = useState({});
  const [gestoresDisponibles, setGestoresDisponibles] = useState([]);
  const [comentariosGestor, setComentariosGestor] = useState({});
  const [destinatariosGestor, setDestinatariosGestor] = useState({});
  const [guardandoComentarioGestor, setGuardandoComentarioGestor] = useState({});
  const [erroresComentarioGestor, setErroresComentarioGestor] = useState({});
  const [mensajesComentarioGestor, setMensajesComentarioGestor] = useState({});

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
  useEffect(() => {
    let activo = true;
    axios.get("/apoderagest/encargos/gestores")
      .then(({ data }) => { if (activo) setGestoresDisponibles(Array.isArray(data) ? data : []); })
      .catch((error) => {
        console.error("No se ha podido cargar el catálogo de gestores de ApoderaGest.");
        if (activo) setGestoresDisponibles([]);
      });
    return () => { activo = false; };
  }, []);

  const grupos = useMemo(() => agruparEncargosPorApoderado(encargos), [encargos]);

  function cambiarDatoAceptacion(encargo, campo, valor) {
    const id = String(encargo.id_expediente || encargo.id);
    setDatosAceptacion((actual) => ({
      ...actual,
      [id]: {
        fecha_envio: actual[id]?.fecha_envio ?? encargo.fecha_envio_notario ?? encargo.fecha_envio ?? "",
        numero_solicitud_pnc: actual[id]?.numero_solicitud_pnc ?? encargo.numero_solicitud_pnc ?? "",
        fecha_solicitud_pnc: actual[id]?.fecha_solicitud_pnc ?? encargo.fecha_solicitud_pnc ?? "",
        fecha_prevista_firma: actual[id]?.fecha_prevista_firma ?? encargo.fecha_prevista_firma ?? "",
        hora_inicio: actual[id]?.hora_inicio ?? (encargo.hora_prevista_firma || "09:00").slice(0, 5),
        hora_fin: actual[id]?.hora_fin ?? (encargo.hora_fin_prevista_firma || "10:00").slice(0, 5),
        [campo]: valor,
      },
    }));
    setErroresAceptacion((actual) => ({ ...actual, [id]: "" }));
    setMensajesAceptacion((actual) => ({ ...actual, [id]: "" }));
  }

  async function aceptarEncargo(encargo) {
    const id = String(encargo.id_expediente || encargo.id);
    const valores = datosAceptacion[id] || {
      fecha_envio: encargo.fecha_envio_notario || encargo.fecha_envio || "",
      numero_solicitud_pnc: encargo.numero_solicitud_pnc || "",
      fecha_solicitud_pnc: encargo.fecha_solicitud_pnc || "",
      fecha_prevista_firma: encargo.fecha_prevista_firma || "",
      hora_inicio: horaLegible(encargo.hora_prevista_firma) === "—" ? "09:00" : horaLegible(encargo.hora_prevista_firma),
      hora_fin: horaLegible(encargo.hora_fin_prevista_firma) === "—" ? "10:00" : horaLegible(encargo.hora_fin_prevista_firma),
    };
    if (!valores.fecha_envio || !valores.numero_solicitud_pnc?.trim() || !valores.fecha_solicitud_pnc || !valores.fecha_prevista_firma || !valores.hora_inicio || !valores.hora_fin) {
      setErroresAceptacion((actual) => ({ ...actual, [id]: "Completa la fecha de envío, el número y fecha de solicitud PNC, la fecha prevista y el horario de firma." }));
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
        fecha_envio: valores.fecha_envio,
        numero_solicitud_pnc: valores.numero_solicitud_pnc.trim(),
        fecha_solicitud_pnc: valores.fecha_solicitud_pnc,
        fecha_prevista_firma: valores.fecha_prevista_firma,
        hora_inicio: valores.hora_inicio,
        hora_fin: valores.hora_fin,
      });
      setMensajesAceptacion((actual) => ({ ...actual, [id]: data?.mensaje || "Encargo aceptado y cita de firma guardada en Agenda." }));
      setEdicionAceptacion((actual) => ({ ...actual, [id]: false }));
      onFirmado?.();
    } catch (error) {
      setErroresAceptacion((actual) => ({ ...actual, [id]: error?.response?.data?.detail || "No se pudo aceptar el encargo." }));
    } finally {
      setGuardandoAceptacion((actual) => ({ ...actual, [id]: false }));
    }
  }

  function fechaHoyLocal() {
    const ahora = new Date();
    const zonaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
    return zonaLocal.toISOString().slice(0, 10);
  }

  function cambiarFirma(id, campo, valor) {
    setFirmas((actual) => ({
      ...actual,
      [id]: {
        fecha_firma: actual[id]?.fecha_firma ?? "",
        protocolo: actual[id]?.protocolo ?? "",
        notario_otorgante: actual[id]?.notario_otorgante ?? "",
        tipo_firma: actual[id]?.tipo_firma ?? "",
        [campo]: valor,
      },
    }));
  }

  async function firmar(encargo) {
    const id = String(encargo.id_expediente || encargo.id);
    const valores = firmas[id] || {};
    const fechaFirma = valores.fecha_firma || encargo.fecha_firma || encargo.fecha_prevista_firma || fechaHoyLocal();
    const tipoFirma = valores.tipo_firma || encargo.tipo_firma || "Presencial";
    if (!fechaFirma || !String(valores.protocolo || encargo.protocolo || "").trim() || !String(valores.notario_otorgante || encargo.notario_otorgante || encargo.nombre_notario || encargo.notario || "").trim() || !["Videoconferencia", "Presencial"].includes(tipoFirma)) {
      setErroresFirma((actual) => ({ ...actual, [id]: "Indica la fecha, el número de protocolo, el notario otorgante y el tipo de firma." }));
      return;
    }
    setGuardandoFirma((actual) => ({ ...actual, [id]: true }));
    setErroresFirma((actual) => ({ ...actual, [id]: "" }));
    setMensajeFirma((actual) => ({ ...actual, [id]: "" }));
    try {
      await axios.post(`/apoderagest/encargos/${encodeURIComponent(encargo.id_expediente || encargo.id)}/firmar`, {
        fecha_firma: fechaFirma,
        protocolo: String(valores.protocolo || encargo.protocolo || "").trim(),
        notario_otorgante: String(valores.notario_otorgante || encargo.notario_otorgante || encargo.nombre_notario || encargo.notario || "").trim(),
        tipo_firma: tipoFirma,
      });
      setMensajeFirma((actual) => ({ ...actual, [id]: "Firma real registrada. La cita de Agenda queda marcada como realizada." }));
      window.dispatchEvent(new Event("apoderagest:firma-registrada"));
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

  async function enviarComentarioAlGestor(encargo) {
    const id = String(encargo.id_expediente || encargo.id);
    const comentario = String(comentariosGestor[id] || "").trim();
    const destinatario = destinatariosGestor[id];
    if (!comentario) {
      setErroresComentarioGestor((actual) => ({ ...actual, [id]: "Escribe la observación que quieres enviar al gestor." }));
      return;
    }
    if (!destinatario) {
      setErroresComentarioGestor((actual) => ({ ...actual, [id]: "Selecciona el gestor destinatario." }));
      return;
    }
    setGuardandoComentarioGestor((actual) => ({ ...actual, [id]: true }));
    setErroresComentarioGestor((actual) => ({ ...actual, [id]: "" }));
    setMensajesComentarioGestor((actual) => ({ ...actual, [id]: "" }));
    try {
      await axios.post(`/apoderagest/encargos/${encodeURIComponent(id)}/comentarios`, {
        comentario,
        empleado_destinatario_id: Number(destinatario),
      });
      setComentariosGestor((actual) => ({ ...actual, [id]: "" }));
      setMensajesComentarioGestor((actual) => ({ ...actual, [id]: "Observación enviada al gestor seleccionado." }));
      onFirmado?.();
    } catch (error) {
      setErroresComentarioGestor((actual) => ({
        ...actual,
        [id]: error?.response?.data?.detail || "No se pudo enviar la observación al gestor.",
      }));
    } finally {
      setGuardandoComentarioGestor((actual) => ({ ...actual, [id]: false }));
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
      if (documentoVisor?.url) URL.revokeObjectURL(documentoVisor.url);
      setDocumentoVisor({ ...documento, expedienteId: String(encargo.id_expediente || encargo.id), nombre, url, mime, previsualizable });
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
    <div>
      {grupos.map((grupo) => {
        const abierto = grupoEncargosAbierto === grupo.clave;
        const notarioCtn = encontrarNotarioCtn(grupo, catalogoCtn);
        const expedientesBloqueados = grupo.expedientes.filter((encargo) => Boolean(encargo.bloqueado)).length;
        const direccionNotario = [notarioCtn?.direccion, notarioCtn?.cp].filter(Boolean).join(" · ");
        const ubicacionNotario = [notarioCtn?.municipio, notarioCtn?.provincia].filter(Boolean).join(" · ");
        return (
          <section key={grupo.clave}>
            <button type="button" aria-expanded={abierto} onClick={() => setGrupoEncargosAbierto(abierto ? null : grupo.clave)}>
              <span aria-hidden="true">♙</span>
              <span>
                <span>
                  <strong>{grupo.nombre}</strong>
                  <span><b>Encargos</b>{grupo.expedientes.length}</span>
                </span>
              </span>
              <span>
                <span>✓ {grupo.expedientes.filter((e) => e.fecha_firma && e.protocolo).length} firmas</span>
                <span>{grupo.expedientes.length} {grupo.expedientes.length === 1 ? "encargo" : "encargos"}</span>
                <span className={`${expedientesBloqueados > 0 ? "tiene-bloqueados" : ""}`}>{expedientesBloqueados} {expedientesBloqueados === 1 ? "bloqueado" : "bloqueados"}</span>
                <span>Ver encargos →</span>
              </span>
            </button>
            {abierto ? createPortal((
              <div className="molsan-modal-overlay panel-modal-premium fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setGrupoEncargosAbierto(null); }}>
                <div ref={grupoDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Encargos de ${grupo.nombre}`} className="molsan-modal__panel molsan-modal--wide flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden">
                  <header className="molsan-modal__header flex items-center justify-between gap-4 px-5 py-4">
                    <div><span className="uppercase">APODERAGEST · BLOQUE DE APODERADO</span><h3 className="mt-1">{grupo.nombre}</h3><p>{grupo.expedientes.filter((e) => e.fecha_firma && e.protocolo).length} firmas registradas · {grupo.expedientes.length} encargos</p></div>
                    <button type="button" className="px-4 py-2" onClick={() => setGrupoEncargosAbierto(null)}>Cerrar ✕</button>
                  </header>
                  <div className="molsan-modal__body overflow-y-auto p-4">
                {grupo.expedientes.map((encargo, indice) => {
                  const id = String(encargo.id_expediente || encargo.id || indice);
                  const detalleAbierto = Boolean(abiertos[`exp-${id}`]);
                  const firma = firmas[id] || {};
                  const facturacion = encargo.facturacion || {};
                  return (
                    <article key={id}>
                      <button type="button" aria-expanded={detalleAbierto} onClick={() => setAbiertos(actual => ({ ...actual, [`exp-${id}`]: !actual[`exp-${id}`] }))}>
                        <span><strong>Expediente {texto(encargo.id_expediente || encargo.id)}</strong><small>{texto(encargo.nombre_solicitante || encargo.solicitante)}{(encargo.nif_solicitante || encargo.dni_solicitante) ? ` · ${texto(encargo.nif_solicitante || encargo.dni_solicitante)}` : ""}</small></span>
                        <span>{detalleAbierto ? "Ocultar detalles ⌃" : "Ver todos los datos ⌄"}</span>
                      </button>
                      {encargo.bloqueado && <div role="alert"><strong>EXPEDIENTE BLOQUEADO EN CANCELAGEST</strong><span>{texto(encargo.motivo_bloqueo_efectivo || encargo.motivo_bloqueo || "Este expediente está bloqueado. Consulta con gestión antes de continuar.")}</span></div>}
                      <div>
                        <CampoDetalle etiqueta="Expediente bloqueado" valor={encargo.bloqueado ? "Sí" : "No"} />
                        <CampoDetalle etiqueta="Firma urgente" valor={encargo.firma_urgente ? "SÍ · URGENTE" : "No"} clase={encargo.firma_urgente ? "" : ""} />
                        <label><span>Fecha de envío</span><input type="date" value={(datosAceptacion[id]?.fecha_envio ?? encargo.fecha_envio_notario ?? encargo.fecha_envio ?? "")} onChange={(e) => cambiarDatoAceptacion(encargo, "fecha_envio", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id] || (!!(encargo.fecha_envio_notario || encargo.fecha_envio) && !!(encargo.fecha_envio_notario || encargo.fecha_envio) && !!encargo.numero_solicitud_pnc && !!encargo.fecha_solicitud_pnc && !!encargo.fecha_prevista_firma && !edicionAceptacion[id])} /></label>
                        <label><span>N.º solicitud PN</span><input type="text" value={(datosAceptacion[id]?.numero_solicitud_pnc ?? encargo.numero_solicitud_pnc ?? "")} onChange={(e) => cambiarDatoAceptacion(encargo, "numero_solicitud_pnc", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id] || (!!encargo.numero_solicitud_pnc && !!encargo.fecha_solicitud_pnc && !!encargo.fecha_prevista_firma && !edicionAceptacion[id])} /></label>
                        <label><span>Fecha solicitud PNC</span><input type="date" value={(datosAceptacion[id]?.fecha_solicitud_pnc ?? encargo.fecha_solicitud_pnc ?? "")} onChange={(e) => cambiarDatoAceptacion(encargo, "fecha_solicitud_pnc", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id] || (!!encargo.numero_solicitud_pnc && !!encargo.fecha_solicitud_pnc && !!encargo.fecha_prevista_firma && !edicionAceptacion[id])} /></label>
                        <label><span>Fecha prevista de firma</span><input type="date" value={(datosAceptacion[id]?.fecha_prevista_firma ?? encargo.fecha_prevista_firma ?? "")} onChange={(e) => cambiarDatoAceptacion(encargo, "fecha_prevista_firma", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id] || (!!encargo.numero_solicitud_pnc && !!encargo.fecha_solicitud_pnc && !!encargo.fecha_prevista_firma && !edicionAceptacion[id])} /></label>
                        <label><span>Hora de inicio</span><input type="time" value={(datosAceptacion[id]?.hora_inicio ?? (encargo.hora_prevista_firma || "09:00").slice(0,5))} onChange={(e) => cambiarDatoAceptacion(encargo, "hora_inicio", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id] || (!!encargo.numero_solicitud_pnc && !!encargo.fecha_solicitud_pnc && !!encargo.fecha_prevista_firma && !edicionAceptacion[id])} /></label>
                        <label><span>Hora de fin</span><input type="time" value={(datosAceptacion[id]?.hora_fin ?? (encargo.hora_fin_prevista_firma || "10:00").slice(0,5))} onChange={(e) => cambiarDatoAceptacion(encargo, "hora_fin", e.target.value)} disabled={!!encargo.bloqueado || !!guardandoAceptacion[id] || (!!encargo.numero_solicitud_pnc && !!encargo.fecha_solicitud_pnc && !!encargo.fecha_prevista_firma && !edicionAceptacion[id])} /></label>
                        <div>{encargo.numero_solicitud_pnc && encargo.fecha_solicitud_pnc && encargo.fecha_prevista_firma && !edicionAceptacion[id] ? <><button type="button" disabled> Aceptar </button><button type="button" disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} onClick={() => setEdicionAceptacion((actual) => ({ ...actual, [id]: true }))}>Editar</button></> : <button type="button" disabled={!!encargo.bloqueado || !!guardandoAceptacion[id]} onClick={() => aceptarEncargo(encargo)}>{guardandoAceptacion[id] ? "Guardando…" : "Aceptar"}</button>}</div>
                        {erroresAceptacion[id] && <p>{erroresAceptacion[id]}</p>}
                        {mensajesAceptacion[id] && <p>{mensajesAceptacion[id]}</p>}
                      </div>
                      {detalleAbierto && (
                        <div>
                          <details open>
                            <summary><span>01 · DATOS DEL ENVÍO</span><h4>Datos del envío</h4></summary>
                            <div>
                              <CampoDetalle etiqueta="Fecha de envío" valor={fechaLegible(encargo.fecha_envio_notario || encargo.fecha_envio)} />
                              <CampoDetalle etiqueta="Oficina" valor={encargo.oficina} />
                              <CampoDetalle etiqueta="Fecha alta" valor={fechaLegible(encargo.fecha_alta)} />
                              <CampoDetalle etiqueta="Idioma del documento" valor={encargo.idioma_documento || encargo.idioma} />
                              <CampoDetalle etiqueta="Fecha solicitud PNC" valor={fechaLegible(encargo.fecha_solicitud_pnc)} />
                              <CampoDetalle etiqueta="Número solicitud PNC" valor={encargo.numero_solicitud_pnc} />
                              <CampoDetalle etiqueta="Apoderado" valor={encargo.apoderado} />
                              <CampoDetalle etiqueta="Tipo de firma" valor={encargo.tipo_firma} />
                              <CampoDetalle etiqueta="Fecha prevista de firma" valor={fechaLegible(encargo.fecha_prevista_firma)} />
                              <CampoDetalle etiqueta="Hora prevista de firma" valor={horaLegible(encargo.hora_prevista_firma)} />
                            </div>
                          </details>
                          <details open>
                            <summary><span>02 · DATOS DE FACTURACIÓN</span><h4>Datos de facturación</h4></summary>
                            <div>
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
                          </details>
                          <details open>
                            <summary><span>03 · ENCARGO NOTARIAL</span><h4>Encargo notarial</h4></summary>
                            <div>
                              <CampoDetalle etiqueta="Tipo de operación" valor={encargo.tipo_operacion} />
                              <CampoDetalle etiqueta="Subtipo de operación" valor={encargo.subtipo_operacion} />
                              <CampoDetalle etiqueta="Importe" valor={encargo.importe != null ? euros(encargo.importe) : null} />
                              <CampoDetalle etiqueta="Saldo disponible" valor={encargo.saldo_disponible != null ? euros(encargo.saldo_disponible) : null} />
                              <CampoDetalle etiqueta="Tipo del documento formalizado" valor={(encargo.documentos_escritura || []).map((doc) => doc.tipo_documento).filter(Boolean).join(", ") || encargo.tipo_documento || encargo.formato_escritura || encargo.tipo_tramite} />
                              <CampoDetalle etiqueta="Cuantía del documento" valor={(encargo.documentos_escritura || []).some((doc) => doc.cuantia != null) ? euros((encargo.documentos_escritura || []).reduce((total, doc) => total + (Number(doc.cuantia) || 0), 0)) : (encargo.cuantia_documento != null ? euros(encargo.cuantia_documento) : null)} />
                              <CampoDetalle etiqueta="Firma urgente" valor={encargo.firma_urgente ? "SÍ · URGENTE" : "No"} clase={encargo.firma_urgente ? "" : ""} />
                              <CampoDetalle etiqueta="Datos del envío" valor={fechaLegible(encargo.fecha_envio_notario || encargo.fecha_envio)} />
                              <CampoDetalle etiqueta="Oficina" valor={encargo.oficina} />
                              <CampoDetalle etiqueta="Fecha alta" valor={fechaLegible(encargo.fecha_alta)} />
                            </div>
                          </details>
                          <details open>
                            <summary><span>04 · ARCHIVO</span><h4>Carpeta digital</h4><small>Documentación disponible para consultar desde el expediente.</small></summary>
                              <div>
                            {(() => {
                              const documentos = encargo.documentos || [];
                              const normalizar = (valor) => normalizarCategoriaDocumento(valor);
                              const esCategoria = (doc, opciones) => opciones.some((opcion) => normalizar(doc?.categoria).includes(normalizar(opcion)) || normalizar(doc?.nombre_original).includes(normalizar(opcion)));
                              const borradores = documentos.filter(esBorradorEscritura);
                              const hojaEncargo = documentos.filter((doc) => !esBorradorEscritura(doc) && esCategoria(doc, ["hoja de encargo firmada", "hoja de encargo"]));
                              const justificantes = documentos.filter((doc) => !esBorradorEscritura(doc) && esCategoria(doc, ["justificante de cancelación"]));
                              const notasSimples = documentos.filter((doc) => !esBorradorEscritura(doc) && esCategoria(doc, ["nota simple registral", "nota simple"]));
                              const clasificados = new Set([...borradores, ...hojaEncargo, ...justificantes, ...notasSimples]);
                              const otros = documentos.filter((doc) => !clasificados.has(doc) && esDocumentoOtros(doc));
                              const restantes = documentos.filter((doc) => !clasificados.has(doc) && !esDocumentoOtros(doc));
                              const renderCarpeta = (titulo, icono, lista, vacio) => (
                                <details key={titulo} open>
                                  <summary>
                                    <span aria-hidden="true">{icono}</span>
                                    <div><strong>{titulo}</strong><small>{lista.length} documento{lista.length === 1 ? "" : "s"}</small></div>
                                  </summary>
                                  {lista.length ? (
                                    <ul>
                                      {lista.map((doc) => (
                                        <li key={doc.id}>
                                          <span><strong>{doc.categoria}</strong><small>{doc.nombre_original} · {fechaLegible(doc.fecha_subida)}</small></span>
                                          <button type="button" onClick={() => abrirDocumento(encargo, doc)}>Ver en visor</button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : <p>{vacio}</p>}
                                </details>
                              );
                              return (
                                <div>
                                  {renderCarpeta("Borradores de escritura", "▤", borradores, "No hay borradores de escritura disponibles.")}
                                  {renderCarpeta("Hoja de encargo firmada", "▣", hojaEncargo, "No hay hojas de encargo firmadas disponibles.")}
                                  {renderCarpeta("Justificante de cancelación", "▣", justificantes, "No hay justificantes de cancelación disponibles.")}
                                  {renderCarpeta("Nota simple registral", "▧", notasSimples, "No hay notas simples registrales disponibles.")}
                                  {renderCarpeta("Otros", "▣", otros, "No hay documentos clasificados en Otros.")}
                                  {restantes.length > 0 && renderCarpeta("Resto de documentación", "▧", restantes, "")}
                                </div>
                              );
                            })()}
                              </div>
                          </details>
                          <details open>
                            <summary><span>VISUALIZACIÓN</span><h4>Visor de documentos</h4><small>Vista previa del fichero seleccionado.</small></summary>
                              <div>
                                {documentoVisor && documentoVisor.expedienteId === String(encargo.id_expediente || encargo.id) ? (
                                  <>
                                    <div><strong>{documentoVisor.nombre}</strong><div><button type="button" onClick={descargarDocumentoVisor}>Descargar</button><button type="button" onClick={cerrarVisor}>Cerrar</button></div></div>
                                    <div>
                                      {documentoVisor.previsualizable ? (documentoVisor.mime.startsWith("image/") || ["png","jpg","jpeg","webp","gif"].includes(documentoVisor.nombre.split(".").pop()?.toLowerCase()) ? <img src={documentoVisor.url} alt={documentoVisor.nombre} /> : <iframe title={documentoVisor.nombre} src={documentoVisor.url} />) : <div><strong>Vista previa no disponible para este formato.</strong><span>Descarga el archivo para abrirlo con la aplicación correspondiente.</span><button type="button" onClick={descargarDocumentoVisor}>Descargar documento</button></div>}
                                    </div>
                                  </>
                                ) : <div><span aria-hidden="true">▤</span><strong>Visor de documentos PDF</strong><p>Selecciona «Ver en visor» en una carpeta para consultar el documento aquí.</p></div>}
                              </div>
                          </details>
                          <details open>
                            <summary><span>03 · INFORMACIÓN REGISTRAL</span><h4>Fincas y registros de la propiedad</h4></summary>
                            {encargo.fincas?.length ? encargo.fincas.map((finca, i) => (
                              <div key={`${id}-finca-${i}`}>
                                <div>
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
                            )) : <p>No constan fincas registradas en el expediente.</p>}
                          </details>
                          <details open>
                            <summary><span>05 · CIERRE DE FIRMA</span><h4>Confirmar firma</h4></summary>
                            <p>Al pulsar «Firmar», la fecha y el protocolo se guardan en los campos oficiales de FichaExpediente.</p>
                            <div>
                              <label>Fecha de firma<input type="date" value={firma.fecha_firma || encargo.fecha_firma || encargo.fecha_prevista_firma || fechaHoyLocal()} onChange={(e) => cambiarFirma(id, "fecha_firma", e.target.value)} /></label>
                              <label>Número de protocolo<input type="text" maxLength={200} value={firma.protocolo || encargo.protocolo || ""} onChange={(e) => cambiarFirma(id, "protocolo", e.target.value)} placeholder="N.º protocolo" /></label>
                              <label>Tipo de firma<select value={firma.tipo_firma || encargo.tipo_firma || "Presencial"} onChange={(e) => cambiarFirma(id, "tipo_firma", e.target.value)}><option value="Videoconferencia">Videoconferencia</option><option value="Presencial">Presencial</option></select></label>
                              <label>Notario otorgante<select value={firma.notario_otorgante || encargo.notario_otorgante || encargo.nombre_notario || encargo.notario || ""} onChange={(e) => cambiarFirma(id, "notario_otorgante", e.target.value)}>
                                <option value={encargo.nombre_notario || encargo.notario || ""}>{encargo.nombre_notario || encargo.notario || "Notario del encargo"}</option>
                                {(() => {
                                  const normalizar = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
                                  const nombreAsignado = normalizar(encargo.nombre_notario || encargo.notario);
                                  const notarioCtn = catalogoCtn.find((n) => normalizar(n.nombre_completo || [n.nombre, n.apellidos].filter(Boolean).join(" ")) === nombreAsignado);
                                  const asociados = (notarioCtn?.notarios_asociados || []).filter((n) => normalizar(n.nombre_completo || [n.nombre, n.apellidos].filter(Boolean).join(" ")) !== nombreAsignado);
                                  return asociados.map((n) => { const nombre = n.nombre_completo || [n.nombre, n.apellidos].filter(Boolean).join(" "); return <option key={n.id} value={nombre}>{nombre}</option>; });
                                })()}
                              </select></label>
                              <button type="button" disabled={!!guardandoFirma[id]} onClick={() => firmar(encargo)}>{guardandoFirma[id] ? "Guardando…" : "Firmar"}</button>
                            </div>
                            {erroresFirma[id] && <p>{erroresFirma[id]}</p>}
                            {mensajeFirma[id] && <p>{mensajeFirma[id]}</p>}
                          </details>
                          <details open>
                            <summary><span>06 · COMUNICACIONES</span><h4>Observaciones y mensajes al gestor</h4></summary>
                            <h5>Observaciones visibles para el apoderado</h5>
                            {encargo.observaciones_apoderado?.length ? (
                              <ul>
                                {encargo.observaciones_apoderado.map((obs) => <li key={obs.id}><p>{obs.comentario}</p><small>{obs.fecha ? new Date(obs.fecha).toLocaleString("es-ES") : "Fecha no disponible"}</small></li>)}
                              </ul>
                            ) : <p>No hay observaciones marcadas como «Visible apoderado».</p>}
                            <div>
                              <h5>Enviar una observación al gestor</h5>
                              <label>Observación
                                <textarea rows={3} maxLength={2000} value={comentariosGestor[id] || ""} onChange={(e) => setComentariosGestor((actual) => ({ ...actual, [id]: e.target.value }))} placeholder="Escribe aquí el comentario para el gestor responsable…" />
                              </label>
                              <label>Dirigido a
                                <select value={destinatariosGestor[id] || ""} onChange={(e) => setDestinatariosGestor((actual) => ({ ...actual, [id]: e.target.value }))}>
                                  <option value="">Selecciona un gestor…</option>
                                  {gestoresDisponibles.map((gestor) => <option key={gestor.id} value={gestor.id}>{gestor.nombre}</option>)}
                                </select>
                              </label>
                              <button type="button" disabled={!!guardandoComentarioGestor[id] || !gestoresDisponibles.length} onClick={() => enviarComentarioAlGestor(encargo)}>{guardandoComentarioGestor[id] ? "Enviando…" : "Enviar al gestor"}</button>
                              {erroresComentarioGestor[id] && <p>{erroresComentarioGestor[id]}</p>}
                              {mensajesComentarioGestor[id] && <p>{mensajesComentarioGestor[id]}</p>}
                            </div>
                          </details>
                        </div>
                      )}
                    </article>
                  );
                })}
                  </div>
                </div>
              </div>
            ), document.body) : null}
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
  const navigate = useNavigate();
  const empleado = useAuthStore((state) => state.empleado);
  const usuarioId = empleado?.empleado_id ?? empleado?.id ?? null;

  const [dashboard, setDashboard] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [encargos, setEncargos] = useState([]);
  const [esAdministradorEncargos, setEsAdministradorEncargos] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busquedaEncargos, setBusquedaEncargos] = useState("");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [modalResumen, setModalResumen] = useState(null);
  const resumenDialogRef = useRef(null);
  useAccessibleDialog({ open: Boolean(modalResumen), onClose: () => setModalResumen(null), dialogRef: resumenDialogRef });


  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [resDashboard, resAgenda, resEncargos, resContextoEncargos] = await Promise.all([
        axios.get("/apoderagest/dashboard"),
        axios.get("/apoderagest/agenda"),
        axios.get("/apoderagest/encargos"),
        axios.get("/apoderagest/encargos/contexto").catch(() => ({ data: { administrador: false } })),
      ]);

      setEsAdministradorEncargos(Boolean(resContextoEncargos.data?.administrador));
      setDashboard(resDashboard.data || {});
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const citasFuturas = (Array.isArray(resAgenda.data) ? resAgenda.data : [])
        .filter((cita) => {
          if (!cita?.fecha) return false;
          const fecha = new Date(`${String(cita.fecha).slice(0, 10)}T00:00:00`);
          return !Number.isNaN(fecha.getTime()) && fecha >= hoy;
        })
        .sort((a, b) => {
          const fechaA = String(a.fecha || "").slice(0, 10);
          const fechaB = String(b.fecha || "").slice(0, 10);
          return fechaA.localeCompare(fechaB) ||
            String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || ""));
        });
      setAgenda(citasFuturas);
      setEncargos(Array.isArray(resEncargos.data) ? resEncargos.data : []);
      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error("No se ha podido cargar ApoderaGest.");
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

  const esEncargoFirmado = (encargo) => Boolean(encargo?.fecha_firma && String(encargo?.protocolo || "").trim());
  const normalizarModalidad = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  const encargosDelResumen = useMemo(() => {
    if (!modalResumen) return [];
    const lista = encargos.filter((encargo) => {
      const firmado = esEncargoFirmado(encargo);
      const modalidad = normalizarModalidad(encargo.tipo_firma);
      switch (modalResumen.filtro) {
        case "todos": return true;
        case "firmados": return firmado;
        case "pendientes": return !firmado;
        case "media": return firmado && Boolean(encargo.fecha_prevista_firma && encargo.fecha_firma);
        case "presenciales": return firmado && (modalidad.includes("presencial") || modalidad === "p");
        case "videoconferencia": return firmado && (modalidad.includes("videoconferencia") || modalidad.includes("videoconference") || modalidad === "vc" || modalidad === "video");
        case "kilometros": return firmado && (modalidad.includes("presencial") || modalidad === "p");
        default: return true;
      }
    });
    return lista.slice().sort((a,b) => String(a.fecha_prevista_firma || "").localeCompare(String(b.fecha_prevista_firma || "")));
  }, [encargos, modalResumen]);

  function abrirResumenEncargos(filtro, titulo) {
    setModalResumen({ filtro, titulo });
  }

  const encargosFiltrados = useMemo(() => {
    const termino = busquedaEncargos.trim().toLowerCase();
    if (!termino) return encargos;

    return encargos.filter((encargo) =>
      [
        encargo.id_expediente,
        encargo.id,
        encargo.apoderado,
        encargo.nombre_solicitante,
        encargo.nif_solicitante,
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


  return (
    <div className="min-h-screen apoderagest">
      <Sidebar
        brandName="ApoderaGest"
        navigationItems={[
          { key: "dashboard", label: "Dashboard", icon: "home" },
          { key: "agenda", label: "Agenda", icon: "calendar" },
          { key: "encargos", label: "Encargos", icon: "clipboard" },
          { key: "ctn", label: "CTN", icon: "globe" },
          { key: "mensajes", label: "Mensajes", icon: "chat" },
          { key: "intranet", label: "Intranet", icon: "folder" },
          ...(empleado?.es_colaborador === true ? [
            { key: "liquidaciones", label: "Mi liquidación", icon: "receipt" },
          ] : []),
        ]}
        activeNavigationItem={pestana}
        onNavigationItemClick={(key) => { if (String(key).toLowerCase() === "liquidaciones") { navigate("/apoderagest/liquidaciones"); return; } setPestana(({ dashboard: "Dashboard", agenda: "Agenda", encargos: "Encargos", ctn: "CTN", mensajes: "Mensajes", intranet: "Intranet" }[String(key).toLowerCase()] || key)); }}
      />
      <main className="relative min-h-[calc(100vh-70px)]">
        <div className="w-full px-4 py-6 lg:px-6">
          <div className="erp-page w-full apoderagest">
      <MolsanPageHeader mark="AG" title="ApoderaGest" description="Centro de gestión de encargos, firmas y actividad del apoderado." />

      {error ? (
        <div role="alert">
          <span>!</span>
          <div><strong>No se han podido actualizar los datos</strong><p>{error}</p></div>
          <button type="button" onClick={cargarDatos} disabled={cargando}>Reintentar</button>
        </div>
      ) : null}

      {cargando && !dashboard ? (
        <div><span /><span>Cargando tu espacio de trabajo…</span></div>
      ) : null}

      {pestana === "Dashboard" ? (
        <section>
          <div>
            <div><span>VISTA GENERAL</span><h2>Resumen de actividad</h2><p>Una visión rápida de encargos, firmas y próximos compromisos.</p></div>
            {ultimaActualizacion ? <span>Actualizado a las {ultimaActualizacion.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span> : null}
          </div>
          <div className="molsan-stat-grid">
            <TarjetaIndicador titulo="Total de encargos" valor={numeroLegible(dashboard?.total_encargos ?? 0)} detalle="Volumen registrado" icono="▤" variante="" onClick={() => abrirResumenEncargos("todos", "Todos los encargos")} />
            <TarjetaIndicador titulo="Firmados" valor={numeroLegible(dashboard?.firmados ?? 0)} detalle="Encargos completados" icono="✓" variante="" onClick={() => abrirResumenEncargos("firmados", "Encargos firmados")} />
            <TarjetaIndicador titulo="Pendientes" valor={numeroLegible(dashboard?.pendientes ?? 0)} detalle="Requieren seguimiento" icono="◷" variante="" onClick={() => abrirResumenEncargos("pendientes", "Encargos pendientes")} />
            <TarjetaIndicador titulo="Media hasta firma" valor={dashboard?.media_dias_hasta_firma == null ? "—" : `${Math.abs(dashboard.media_dias_hasta_firma)} días ${dashboard.media_dias_hasta_firma < 0 ? "antes" : dashboard.media_dias_hasta_firma > 0 ? "después" : "en fecha"}`} detalle="Desde fecha prevista hasta fecha real" icono="↗" variante="" onClick={() => abrirResumenEncargos("media", "Encargos incluidos en la media hasta firma")} />
          </div>
          <div className="molsan-stat-grid">
            <TarjetaIndicador titulo="Firmas presenciales" valor={numeroLegible(dashboard?.firmas_presenciales)} detalle="Actividad presencial" icono="⌖" onClick={() => abrirResumenEncargos("presenciales", "Firmas presenciales")} />
            <TarjetaIndicador titulo="Firmas por videoconferencia" valor={numeroLegible(dashboard?.firmas_videoconferencia)} detalle="Actividad remota" icono="▣" onClick={() => abrirResumenEncargos("videoconferencia", "Firmas por videoconferencia")} />
            <TarjetaIndicador titulo="Kilómetros presenciales" valor={dashboard?.kilometros_presenciales == null ? "Pendiente" : `${numeroLegible(dashboard.kilometros_presenciales)} km`} detalle={`Desde CP ${dashboard?.origen_kilometros || "08016"} · ${dashboard?.firmas_presenciales_con_distancia ?? 0}/${dashboard?.firmas_presenciales ?? 0} distancias calculadas en línea recta`} icono="⌁" onClick={() => abrirResumenEncargos("kilometros", "Firmas presenciales · cálculo de kilómetros")} />
          </div>
          <div>
            <section>
              <div>
                <div><span>PLANIFICACIÓN</span><h3>Próximas citas</h3></div>
                <button type="button" onClick={() => setPestana("Agenda")}>Ver agenda <span>→</span></button>
              </div>
              {!agenda.length ? <EstadoVacio icono="▦" titulo="No hay citas disponibles" detalle="Cuando existan citas asignadas, podrás consultarlas desde aquí." /> : (
                <div>
                  {agenda.slice(0, 5).map((cita, i) => {
                    const firmaRealizada = String(cita.observaciones || "").toUpperCase().includes("FIRMA REALIZADA");
                    return (
                      <article key={cita.id ?? `${cita.fecha}-${i}`} className="erp-data-item">
                        <div>
                          <strong>{fechaLegible(cita.fecha).split("/")[0]}</strong>
                          <span>{fechaLegible(cita.fecha).split("/").slice(1).join("/")}</span>
                        </div>
                        <div>
                          <div>
                            <strong>{texto(cita.tipo_cita, "Cita")}</strong>
                            {cita.tipo_firma ? <span>{texto(cita.tipo_firma)}</span> : null}
                            {cita.tipo_cita === "Firma notarial" ? <span className={` ${firmaRealizada ? "realizada" : ""}`}>{firmaRealizada ? "✓ Firma realizada" : "◷ Pendiente de firma"}</span> : null}
                          </div>
                          <div>
                            <span><b>Horario</b>{texto(cita.hora_inicio, "—").slice(0, 5)} – {texto(cita.hora_fin, "—").slice(0, 5)}</span>
                            <span><b>Notaría</b>{texto(cita.nombre_notario, "Sin notaría asignada")}</span>
                            <span><b>Apoderado</b>{texto(cita.apoderado, "Sin apoderado asignado")}</span>
                            {cita.id_expediente ? <span><b>Expediente</b>{texto(cita.id_expediente)}</span> : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
            <section>
              <div>
                <div><span>ACTIVIDAD ANUAL</span><h3>Estadística de firma</h3></div>
                <span>{dashboard?.anio_estadistica_firmas || new Date().getFullYear()}</span>
              </div>
              <div>
                <strong>{numeroLegible((dashboard?.volumen_mensual_firmas || []).reduce((suma, mes) => suma + Number(mes.total || 0), 0))}</strong>
                <span>firmas con protocolo registrado este año</span>
              </div>
              <div role="img" aria-label={`Volumen mensual de firmas en ${dashboard?.anio_estadistica_firmas || new Date().getFullYear()}`}>
                {(() => {
                  const meses = dashboard?.volumen_mensual_firmas || [];
                  const maximo = Math.max(1, ...meses.map((mes) => Number(mes.total || 0)));
                  return meses.map((mes) => (
                    <div key={mes.mes_numero || mes.mes}>
                      <span>{mes.total || 0}</span>
                      <div><span style={{ height: `${Math.max(mes.total ? 8 : 2, (Number(mes.total || 0) / maximo) * 100)}%` }} /></div>
                      <span>{mes.mes}</span>
                    </div>
                  ));
                })()}
              </div>
              <p>Cuenta las firmas reales por la fecha registrada con el protocolo, no las citas planificadas.</p>
            </section>
          </div>
          {dashboard?.es_dashboard_general ? (
            <section>
              <div>
                <div><span>ACTIVIDAD ANUAL · POR APODERADO</span><h3>Estadística de firma por apoderado</h3></div>
                <span>{dashboard?.anio_estadistica_firmas || new Date().getFullYear()}</span>
              </div>
              {(() => {
                const datos = dashboard?.volumen_anual_por_apoderado || [];
                const maximo = Math.max(1, ...datos.map((item) => Number(item.total || 0)));
                if (!datos.length) return <EstadoVacio icono="▥" titulo="Todavía no hay firmas registradas este año" detalle="Cuando los apoderados registren firmas con fecha y protocolo, aparecerán aquí." />;
                return <div>{datos.map((item) => (
                  <div key={item.apoderado}>
                    <div><strong title={item.apoderado}>{item.apoderado}</strong><span>{item.total}</span></div>
                    <div><span style={{ width: `${Math.max(2, Number(item.total || 0) / maximo * 100)}%` }} /></div>
                  </div>
                ))}</div>;
              })()}
              <p>Total de firmas reales de todos los apoderados, agrupadas por el empleado asignado al expediente.</p>
            </section>
          ) : null}
        </section>
      ) : null}

           {pestana === "Agenda" ? (
        <section>
          <div>
            <div>
              <span>ORGANIZACIÓN</span>
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
        <section>
          <div><div><span>{esAdministradorEncargos ? "SUPERVISIÓN GLOBAL" : "GESTIÓN OPERATIVA"}</span><h2>{esAdministradorEncargos ? "Todos los encargos de ApoderaGest" : "Mis encargos"}</h2><p>{esAdministradorEncargos ? "Vista de administrador: encargos de todos los apoderados, incluidos los asignados a tu propio usuario. Puedes buscar por apoderado, expediente, titular o notario." : "Seguimiento de tus expedientes, titulares y estado de firma."}</p></div><span>{encargos.length} encargos</span></div>
          <div>
            <div>
              <label><span aria-hidden="true">⌕</span><input type="search" value={busquedaEncargos} onChange={(e) => setBusquedaEncargos(e.target.value)} placeholder={esAdministradorEncargos ? "Buscar apoderado, expediente, titular, notario o estado…" : "Buscar expediente, titular, notario o estado…"} aria-label="Buscar encargos" /></label>
              <span>{encargosFiltrados.length} resultados</span>
            </div>
            <TablaEncargos encargos={encargosFiltrados} onFirmado={cargarDatos} />
            <ImprimirEncargos encargos={encargosFiltrados} />
          </div>
        </section>
      ) : null}

      {pestana === "CTN" ? (
        <section>
          <div>
            <div>
              <span>COORDINACIÓN NOTARIAL</span>
              <h2>CTN · Catálogo de notarías</h2>
              <p>Listado completo con filtros, asociaciones y acceso a la ficha de cada notaría, compartiendo la misma pantalla CTN del ERP.</p>
            </div>
          </div>
          <CtnListadoPage />
        </section>
      ) : null}

      {pestana === "Mensajes" ? (
        <section>
          <div><div><span>COMUNICACIÓN CORPORATIVA</span><h2>Mensajes</h2><p>Mensajería del ERP-Molsan con contactos conectados, conversaciones, mensajes no leídos y archivos adjuntos.</p></div></div>
          {usuarioId ? <Mensajes usuarioId={usuarioId} /> : <div role="alert"><h3>No se ha podido identificar al usuario</h3><p>No es posible abrir Mensajes porque la sesión actual no contiene un identificador de empleado válido. Vuelve a iniciar sesión y prueba de nuevo.</p></div>}
        </section>
      ) : null}

      {pestana === "Intranet" ? <Intranet /> : null}

      
      {modalResumen ? (
        <div className="molsan-modal-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalResumen(null); }}>
          <section ref={resumenDialogRef} tabIndex={-1} className="molsan-modal__panel" role="dialog" aria-modal="true" aria-labelledby="">
            <header className="molsan-modal__header">
              <div><span>APODERAGEST · RESUMEN DE ACTIVIDAD</span><h2 id="">{modalResumen.titulo}</h2><p>{encargosDelResumen.length} expediente(s) en este indicador.</p></div>
              <button type="button" onClick={() => setModalResumen(null)} aria-label="Cerrar modal">✕</button>
            </header>
            <div>
              {!encargosDelResumen.length ? <EstadoVacio icono="▤" titulo="No hay expedientes en este bloque" detalle="No hay encargos que coincidan con este indicador." /> : (
                <div>
                  <table>
                    <thead><tr><th>Expediente</th><th>Solicitante</th><th>Notario</th><th>Apoderado</th><th>Fecha prevista</th><th>Fecha de firma</th><th>Protocolo</th><th>Modalidad</th><th>Estado</th><th></th></tr></thead>
                    <tbody>{encargosDelResumen.map((encargo, i) => {
                      const id = encargo.id_expediente ?? encargo.id ?? i;
                      const firmado = esEncargoFirmado(encargo);
                      return <tr key={String(id)}>
                        <td><strong>{texto(encargo.id_expediente ?? encargo.id)}</strong></td>
                        <td>{texto(encargo.nombre_solicitante || encargo.solicitante || encargo.titular)}<small>{texto(encargo.nif_solicitante || encargo.dni_solicitante, "")}</small></td>
                        <td>{texto(encargo.nombre_notario || encargo.notario)}</td>
                        <td>{texto(encargo.apoderado)}</td>
                        <td>{fechaLegible(encargo.fecha_prevista_firma)}</td>
                        <td>{fechaLegible(encargo.fecha_firma)}</td>
                        <td>{texto(encargo.protocolo)}</td>
                        <td>{texto(encargo.tipo_firma)}</td>
                        <td><EstadoPill valor={firmado ? "Firmado" : encargo.bloqueado ? "Bloqueado" : "Pendiente de firma"} /></td>
                        <td><button type="button" onClick={() => { setBusquedaEncargos(String(id)); setPestana("Encargos"); setModalResumen(null); }}>Ver en encargos →</button></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <footer><span><strong>MOLSAN ERP</strong> · ApoderaGest</span></footer>
          </div>
        </div>
      </main>
    </div>
  );
}

