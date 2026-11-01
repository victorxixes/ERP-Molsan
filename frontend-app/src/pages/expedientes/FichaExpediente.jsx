import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Link, useParams } from "react-router-dom";
import axios from "../../api/axios";
import { formatDecimal, formatEuro, formatPercent } from "../../utils/formatters";

import { obtenerExpediente, obtenerListadoExpedientes, enviarExpedienteANotario } from "../../api/expedientes";

import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";
import LiquidarExpedienteModal from "../../components/expedientes/LiquidarExpedienteModal";
import CarpetaDigitalModal from "../../components/expedientes/CarpetaDigitalModal";
import MolsanIcon from "../../components/ui/MolsanIcon";
import TraspasoSaldoPanel from "../../components/expedientes/TraspasoSaldoPanel";
import { useAuthStore } from "../../store/authStore";
import "./FichaExpedientePremium.css";

import { obtenerCatalogoAcciones, obtenerAccionesExpediente, asignarAccionExpediente, eliminarAccionExpediente } from "../../api/expedienteAcciones";

function normalizarMunicipio(valor) {
  return String(valor ?? "")
    .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}


import {
  listarDefectosExpediente,
  listarSubtiposDefecto,
  crearDefectoExpediente,
  actualizarDefectoExpediente,
  registrarSubsanacionDefecto,
  subirCalificacionRegistro,
  obtenerCalificacionRegistro,
  listarTiposCargaHipotecaria,
} from "../../api/expedienteDefectos";

// ============================================================
// HELPERS
// ============================================================

function mensajeErrorApi(error, fallback) {
  const detalle = error?.response?.data?.detail;
  if (typeof detalle === "string" && detalle.trim()) return detalle;
  if (Array.isArray(detalle)) {
    const mensajes = detalle.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.msg || item.message || JSON.stringify(item);
      return String(item ?? "");
    }).filter(Boolean);
    if (mensajes.length) return mensajes.join(" · ");
  }
  if (detalle && typeof detalle === "object") {
    return detalle.msg || detalle.message || JSON.stringify(detalle);
  }
  return fallback;
}


function valorVisible(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  return String(valor);
}


function formatearFecha(valor) {
  if (!valor) {
    return "—";
  }

  const texto = String(valor);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(texto)
  ) {
    const [
      year,
      month,
      day,
    ] = texto.split("-");

    return `${day}/${month}/${year}`;
  }

  try {
    const fecha = new Date(valor);

    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toLocaleDateString("es-ES");
    }
  } catch {
    // Nada.
  }

  return texto;
}


function sumarDiasNaturales(fechaISO, dias) {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}/.test(String(fechaISO))) return "";
  const [year, month, day] = String(fechaISO).slice(0, 10).split("-").map(Number);
  const fecha = new Date(Date.UTC(year, month - 1, day));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}-${String(fecha.getUTCDate()).padStart(2, "0")}`;
}


function formatearNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return String(valor);
  }

  return formatDecimal(numero);
}


function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


function sumarUnaHoraTexto(hora) {
  if (!hora) return "";
  const coincidencia = String(hora).match(/^(\d{1,2}):(\d{2})/);
  if (!coincidencia) return "";
  const minutos = (Number(coincidencia[1]) * 60 + Number(coincidencia[2]) + 60) % (24 * 60);
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

function esDisponible(
  objeto,
  campo
) {
  if (!objeto) {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(
      objeto,
      campo
    ) &&
    objeto[campo] !== null &&
    objeto[campo] !== undefined &&
    objeto[campo] !== ""
  );
}


function obtenerArrayRespuesta(
  respuesta
) {
  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  if (
    Array.isArray(
      respuesta?.items
    )
  ) {
    return respuesta.items;
  }

  if (
    Array.isArray(
      respuesta?.expedientes
    )
  ) {
    return respuesta.expedientes;
  }

  if (
    Array.isArray(
      respuesta?.data
    )
  ) {
    return respuesta.data;
  }

  if (
    Array.isArray(
      respuesta?.results
    )
  ) {
    return respuesta.results;
  }

  return [];
}


// ============================================================
// ACTIVIDADES REALES DEL WORKFLOW
// ============================================================

const ACTIVIDADES_EXPEDIENTES = [
  {
    key: "documentacion-previa",
    label: "Documentación previa",
    icono: "file",
  },

  {
    key: "sede-notarial",
    label: "Sede notarial",
    icono: "courthouse",
  },

  {
    key: "sede-notarial-protocolo",
    label: "Sede notarial con protocolo",
    icono: "scroll",
  },

  {
    key: "gestion-economica",
    label: "Gestión económica",
    icono: "briefcase",
  },

  {
    key: "liquidacion-impuestos",
    label: "Liquidación de impuestos",
    icono: "euro",
  },

  {
    key: "tramitacion-inscripcion",
    label: "Tramitación inscripción",
    icono: "building",
  },

  {
    key: "defectos-registrales",
    label: "Defectos registrales",
    icono: "⚠️",
  },

  {
    key: "facturacion-cierre",
    label: "Cierre del expediente",
    icono: "receipt",
  },
];


const ENTIDADES_ORIGINALES_FINCA = [
"BANCA CÍVICA","Banca Jover, S.A.","BANCAJA","BANCO DE EUROPA","BANCO DE FOMENTO (Cesión de oficinas)","Banco de la Pequeña y Mediana Empresa, S.A.","BANCO DE LAS ISLAS CANARIAS","BANCO DE MURCIA","BANCO DE VALENCIA","BANCO GRANADA JEREZ","BANCO MARE NOSTRUM (BMN)","BANCO ZARAGOZANO","BANCOFAR","BANCOFAR (Cesión de créditos)","BANKIA","BANZANO HIPOTECARIO","BARCLAYS BANK SUCURSAL EN ESPAÑA","BFA","CAIXA D´ESTALVIS SAGRADA FAMILIA","Caixa Estalvis Laietana","CAIXA GIRONA","CAIXA LAIETANA","CAIXA PENEDÈS","CAIXABANK","CAIXALEASING Y FACTORING","Caja Adherida de Sant Joan de les Abadesses","Caja Adherida del Círculo Obrero de Banyoles","CAJA ÁVILA","Caja de Ahorros de La Rioja","Caja de Ahorros de La Seo de Urgell","Caja de Ahorros de Palamós","Caja de Ahorros de Valencia, Castellón y Alicante","Caja de Ahorros de Villarreal","CAJA DE AHORROS MUNICIPAL DE BURGOS","Caja de Ahorros Provincial de Ciudad Real","CAJA DE AHORROS PROVINCIAL DE GUADALAJARA","CAJA DE AHORROS PROVINCIAL SAN FERNANDO DE SEVILLA Y JEREZ","Caja de Ahorros y Monte de Piedad de Alcalá de Henares","Caja de Ahorros y Monte de Piedad de Alcira","Caja de Ahorros y Monte de Piedad de Ampurdán","Caja de Ahorros y Monte de Piedad de Ávila","CAJA DE AHORROS Y MONTE DE PIEDAD DE BARCELONA","Caja de Ahorros y Monte de Piedad de Ceuta","Caja de Ahorros y Monte de Piedad de Játiva","CAJA DE AHORROS Y MONTE DE PIEDAD DE LÉRIDA","CAJA DE AHORROS Y MONTE DE PIEDAD DE NAVARRA","Caja de Ahorros y Monte de Piedad de Segorbe","Caja de Ahorros y Monte de Piedad de Segovia","CAJA DE AHORROS Y MONTE DE PIEDAD MUNICIPAL DE PAMPLONA","CAJA DE AHORROS Y PENSIONES DE BARCELONA","Caja de Ahorros y Préstamos de Carlet","Caja de Ahorros y Socorros y Monte de Piedad de Alberique","Caja de Ahorros y Socorros y Monte de Piedad de Gandía","Caja de Crédito de Granollers","Caja de Crédito Industrial Cooperativo, Sociedad Cooperativa de Crédito Limitada","Caja de Crédito Mediterránea, Cooperativa de Crédito","Caja de Inversión, Sociedad Cooperativa de Crédito Limitada","CAJA DE PENSIONES PARA LA VEJEZ Y DE AHORROS ¿CATALUÑA y BALEARES?","Caja de Previsión Social del Reino de Valencia","CAJA GENERAL DE AHORROS DE CANARIAS","CAJA GRANADA","CAJA INSULAR CANARIAS","CAJA MADRID","CAJA MURCIA","CAJA RIOJA","Caja Rural de Cantabria, Sdad. Coop. Cto. Ltda.","CAJA RURAL DE TALAVERA","Caja Rural Provincial de Barcelona, Sdad. Coop. Catalana Cto. Ltda.","Caja Rural Provincial de Gerona, Sdad. Coop. Cto. Ltda.","Caja Rural Provincial de Madrid, Sdad. Coop. Cto. Ltda.","Caja Rural Provincial de Patencia, Sdad. Coop. Cto. Ltda.","Caja Rural Provincial, Sdad. Coop. de Cto. Agrario Ltda. de Reus","CAJA SEGOVIA","CAJASOL","DEUTSCHE BANK (Cesión de operaciones financieras)","HIPOTECAIXA","ISBANC","MICROBANK DE LA CAIXA - CRITERIA CAIXACORP","MONTE DE PIEDAD Y CAJA DE AHORROS DE HUELVA Y SEVILLA","MONTE DE PIEDAD Y CAJA DE AHORROS SAN FERNANDO DE HUELVA, JEREZ Y SEVILLA","PROMINMO","SA NOSTRA","SERVIHABITAT","Sindicato de Banqueros de Barcelona, S.A."
];


// ============================================================
// CAMPOS COMUNES DE ACTIVIDADES
// ============================================================

const CAMPOS_COMUNES_ACTIVIDAD = [
  {
    key: "id_expediente",
    label: "Nº expediente",
  },

  {
    key: "estado_expediente",
    label: "Estado expediente",
    estado: true,
  },

  {
    key: "estado_actividad",
    label: "Estado actividad",
    estado: true,
  },

  {
    key: "fecha_alta",
    label: "Fecha alta",
    tipo: "fecha",
  },

  {
    key: "actividad_actual",
    label: "Actividad actual",
  },

  {
    key: "nombre_titular",
    label: "Nombre titular",
  },

  {
    key: "nif_titular",
    label: "NIF titular",
  },

  {
    key: "nombre_solicitante",
    label: "Nombre solicitante",
  },

  {
    key: "nif_solicitante",
    label: "NIF solicitante",
  },

  {
    key: "nombre_notario",
    label: "Nombre notario",
  },

  {
    key: "nif_notario",
    label: "NIF notario",
  },

  {
    key: "oficina",
    label: "Oficina",
  },

  {
    key: "capital",
    label: "Capital",
    tipo: "numero",
  },

  {
    key: "importe",
    label: "Importe",
    tipo: "numero",
  },

  {
    key: "saldo_real",
    label: "Saldo real",
    tipo: "numero",
  },

  {
    key: "saldo_disponible",
    label: "Saldo disponible",
    tipo: "numero",
  },

  {
    key: "contrato",
    label: "Contrato",
  },

  {
    key: "tipo_operacion",
    label: "Tipo operación",
  },

  {
    key: "subtipo_operacion",
    label: "Subtipo operación",
  },

  {
    key: "observaciones",
    label: "Observaciones",
    multilinea: true,
  },
];



function calcularVencimientoAsientoRenovacion(fechaNotificacion) {
  if (!fechaNotificacion) return "";
  const [anio, mes, dia] = String(fechaNotificacion).split("-").map(Number);
  if (!anio || !mes || !dia) return "";
  // UTC evita desfases de zona horaria al sumar días naturales.
  return new Date(Date.UTC(anio, mes - 1, dia + 60)).toISOString().slice(0, 10);
}

const DEFECTO_VACIO = {
  tipo_carga_hipotecaria_id: "",
  motivo_defecto: "",
  subtipo_defecto_id: "",
  subtipo_defecto: "",
  fecha_notificacion_registro: "",
  fecha_vencimiento_presentacion: "",
  fecha_calificacion: "",
  fecha_renovacion_asiento: "",
  asiento_renovacion_libro_diario: "",
  vencimiento_asiento_renovacion: "",
  anotacion_suspensiva: "",
  vencimiento_anotacion: "",
  calificacion_sustitutoria: "",
  recurso_gubernativo: "",
  calificacion_registro: "",
  observaciones_registro: "",
  fecha_entrada_subsanacion: "",
};

const MOTIVOS_DEFECTO = [
  { codigo: "112", texto: "Anterior a LCI_Defectos en aspectos relacionados con el cliente" },
  { codigo: "116", texto: "Anterior a LCI_Defectos en documento judicial" },
  { codigo: "115", texto: "Anterior a LCI_Defectos relacionados con alguna cláusula de la hipoteca u otra garantía" },
  { codigo: "113", texto: "Anterior a LCI_Defectos relacionados con aspectos de la finca" },
  { codigo: "114", texto: "Anterior a LCI_Defectos relacionados con la Ley 1/13, de 14 de mayo (reforma de la ley hipotecaria)" },
  { codigo: "118", texto: "Anterior a LCI_Falta un documento judicial previo" },
  { codigo: "121", texto: "Anterior a LCI_Falta un documento previo a aportar por el Client" },
  { codigo: "120", texto: "Anterior a LCI_Falta un documento previo a aportar por la Oficina" },
  { codigo: "117", texto: "Anterior a LCI_Falta un documento previo de una Administración u Organismo Público" },
  { codigo: "119", texto: "Anterior a LCI_Falta un documento previo del Registro Mercantil" },
  { codigo: "127", texto: "LCI_Constitución P.Hipotecario-Defect.ámbito de aplicación (empleados y casos extrapolados)" },
  { codigo: "125", texto: "LCI_Constitución P.Hipotecario-Defect.carácter documental (acta, inscripción CGC, protocolización)" },
  { codigo: "124", texto: "LCI_Constitución P.Hipotecario-Defect.cláusula préstamo Hip(vencimiento,demora,comisión,tasación)" },
  { codigo: "126", texto: "LCI_Constitución P.Hipotecario-Defect.falta transparencia (escritura,proyecto,FEIN-ANEXOS)" },
  { codigo: "123", texto: "LCI_Constitución Préstamo Hipotecario-Defectos relacionados con aspectos de la finca." },
  { codigo: "122", texto: "LCI_Constitución Préstamo Hipotecario-Defectos relacionados con los intervinientes" },
  { codigo: "128", texto: "LCI_Novaciones-Defectos por no cumplir la Ley 5/2019." },
  { codigo: "129", texto: "LCI_Subrogaciones deudor (con o sin novación)-Defectos por no cumplir la Ley 5/2019." },
];

// ============================================================
// CAMPOS ESPECÍFICOS DE ACTIVIDADES
// ============================================================

const CAMPOS_ACTIVIDADES = {

  "documentacion-previa": [
    {
      key: "fecha_inicio_actividad",
      label: "Inicio actividad",
      tipo: "fecha",
    },

    {
      key: "fecha_fin_actividad",
      label: "Fin actividad",
      tipo: "fecha",
    },
  ],

  // Los datos de Sede notarial se editan en el bloque de integración para evitar duplicados.
  "sede-notarial": [],

  "sede-notarial-protocolo": [
    {
      key: "fecha_envio",
      label: "Fecha envío",
      tipo: "fecha",
    },

    {
      key: "apoderado",
      label: "Apoderado",
      opciones: ["Gestoría", "CaixaBank"],
    },

    {
      key: "tipo_documento",
      label: "Tipo documento",
    },

    {
      key: "poblacion",
      label: "Población",
    },

    {
      key: "provincia",
      label: "Provincia",
    },

    {
      key: "fecha_firma",
      label: "Fecha firma",
      tipo: "fecha",
    },

    {
      key: "asiento_presentacion_libro_diario",
      label: "Asiento presentación / Libro diario",
    },

    {
      key: "fecha_presentacion",
      label: "Fecha presentación",
      tipo: "fecha",
    },

    {
      key: "numero_entrada",
      label: "Número de entrada",
    },

    {
      key: "fecha_recogida_notario_presentacion_telematica",
      label: "Fecha recogida notario o presentación telemática",
      tipo: "fecha",
    },

  ],

  "liquidacion-impuestos": [
    {
      key: "fecha_presentacion_tributaria",
      label: "Fecha presentación tributaria",
      tipo: "fecha",
    },
    {
      key: "fecha_liquidacion_tributaria",
      label: "Fecha liquidación tributaria",
      tipo: "fecha",
    },
    {
      key: "oficina_liquidadora",
      label: "Oficina liquidadora / comunidad autónoma",
      opciones: [
        "Andalucía", "Aragón", "Asturias", "Illes Balears", "Canarias",
        "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña",
        "Comunitat Valenciana", "Extremadura", "Galicia", "Comunidad de Madrid",
        "Región de Murcia", "Comunidad Foral de Navarra", "País Vasco",
        "La Rioja", "Ceuta", "Melilla"
      ],
    },
    {
      key: "base_imponible",
      label: "Base imponible (€)",
      tipo: "numero",
    },
    {
      key: "tributacion",
      label: "Tributación",
      opciones: ["Prescrito", "Exento", "Bonificación", "Renuncia", "AJD", "TPO"],
    },
    {
      key: "impuesto_ajd_itp",
      label: "Impuesto (AJD / ITP)",
      opciones: ["AJD", "ITP"],
    },
  ],

  "tramitacion-inscripcion": [
    {
      key: "fecha_presentacion",
      label: "Fecha presentación",
      tipo: "fecha",
    },
    {
      key: "fecha_vencimiento_asiento",
      label: "Fecha vencimiento asiento (+60 días naturales)",
      tipo: "fecha",
    },
    {
      key: "fecha_inscripcion",
      label: "Fecha inscripción",
      tipo: "fecha",
    },

  ],

  "defectos-registrales": [
    {
      key: "tipo_documento",
      label: "Tipo documento",
    },
    {
      key: "motivos_defecto",
      label: "Motivos del defecto",
      catalogo: "motivos-defecto",
    },
    {
      key: "fecha_notificacion_registro",
      label: "Fecha notificación Registro",
      tipo: "fecha",
    },
    {
      key: "fecha_vencimiento_presentacion_registro",
      label: "Fecha vencimiento presentación Registro",
      tipo: "fecha",
    },
    {
      key: "observaciones_defecto_registral",
      label: "Observaciones",
      multilinea: true,
    },
  ],

  "facturacion-cierre": [
    {
      key: "fecha_fin_actividad",
      label: "Fin actividad",
      tipo: "fecha",
    },
  ],
};


// ============================================================
const CAMPOS_INTEGRACION_SEDE_PROTOCOLO = [
  { key: "nombre_notario", label: "Notario" },
  { key: "nif_notario", label: "NIF notario" },
  { key: "apoderado", label: "Apoderado" },
  { key: "tipo_gestoria", label: "Gestoría", opciones: ["Gestoría", "CaixaBank"] },
  { key: "tipo_firma", label: "Tipo firma" },
  { key: "fecha_firma", label: "Fecha firma", tipo: "fecha" },
  { key: "protocolo", label: "Protocolo" },
  { key: "asiento_presentacion", label: "Asiento presentación" },
  { key: "libro_diario", label: "Libro diario" },
  { key: "fecha_presentacion", label: "Fecha presentación", tipo: "fecha" },
  { key: "numero_entrada", label: "Número de entrada" },
  { key: "fecha_recogida_notario_presentacion_telematica", label: "Fecha recogida notario o presentación telemática", tipo: "fecha" },
];

// RESOLVER ACTIVIDAD
// ============================================================

function resolverActividadActual(
  expediente
) {
  const actividad =
    normalizarTexto(
      expediente?.actividad_actual
    );

  if (
    actividad.includes(
      "sede notarial con protocolo"
    )
  ) {
    return "sede-notarial-protocolo";
  }

  if (
    actividad.includes(
      "gestion economica"
    )
  ) {
    return "gestion-economica";
  }

  if (
    actividad.includes(
      "defectos registrales"
    )
  ) {
    return "defectos-registrales";
  }

  if (
    actividad.includes(
      "liquidacion de impuestos"
    ) ||
    actividad.includes(
      "liquidacion impuestos"
    )
  ) {
    return "liquidacion-impuestos";
  }

  if (
    actividad.includes(
      "tramitacion inscripcion"
    )
  ) {
    return "tramitacion-inscripcion";
  }

  if (
    actividad.includes(
      "facturacion y cierre"
    )
  ) {
    return "facturacion-cierre";
  }

  if (
    actividad.includes(
      "sede notarial"
    )
  ) {
    if (
      expediente?.protocolo ||
      expediente?.fecha_firma
    ) {
      return "sede-notarial-protocolo";
    }

    return "sede-notarial";
  }

  return "documentacion-previa";
}


// ============================================================
// ESTADO BADGE
// ============================================================

function RepositorioDocumentosInline({ expedienteId, categorias = [], titulo = "Repositorio digital", onAbrirRepositorio }) {
  const categoriasClave = categorias.join("|");
  const normalizarCategoriaRepositorio = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es");
  const categoriasNormalizadas = categorias.map(normalizarCategoriaRepositorio);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError("");
    if (!expedienteId) {
      setDocumentos([]);
      setCargando(false);
      return () => { activo = false; };
    }
    axios.get(`/expedientes/${encodeURIComponent(expedienteId)}/carpeta-digital`)
      .then(({ data }) => {
        if (!activo) return;
        const lista = Array.isArray(data) ? data : data?.items || [];
        setDocumentos(lista);
      })
      .catch((e) => {
        if (activo) {
          setDocumentos([]);
          const detalle = e?.response?.data?.detail;
          setError(typeof detalle === "string" && !/no existe el expediente/i.test(detalle) ? detalle : "");
        }
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [expedienteId, categoriasClave]);

  async function abrirDocumento(doc, descargar = false) {
    try {
      setError("");
      const res = await axios.get(`/expedientes/${encodeURIComponent(expedienteId)}/carpeta-digital/${doc.id}/descargar`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data instanceof Blob ? res.data : new Blob([res.data]));
      if (descargar) {
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = doc.nombre_original || "documento";
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo abrir el documento.");
    }
  }

  return (
    <section className="space-y-2">
      {categorias.map((categoria, indice) => {
        const categoriaNormalizada = categoriasNormalizadas[indice];
        const documentosCategoria = documentos.filter((doc) =>
          normalizarCategoriaRepositorio(doc.categoria || doc.categoria_nombre || doc.tipo_documento) === categoriaNormalizada
        );
        return (
          <div key={categoria} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            <div className="min-w-0 flex-1">
              <span className="block font-semibold">{categoria}</span>
              {cargando ? <span className="mt-1 block text-[11px] text-slate-500">Cargando documentos…</span> :
                documentosCategoria.length ? (
                  <div className="mt-1 space-y-1">
                    {documentosCategoria.map((doc) => (
                      <div key={doc.id} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 break-words text-[11px] font-semibold text-emerald-700">✓ {doc.nombre_original || doc.nombre || "Documento guardado"}</span>
                        <button type="button" onClick={() => abrirDocumento(doc)} className="rounded-md px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Ver</button>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-500">{documentosCategoria.length} documento(s) encontrado(s) en la carpeta digital</p>
                  </div>
                ) : <span className="mt-1 block text-[11px] text-amber-700">No hay ningún documento guardado en esta categoría.</span>}
            </div>
            <button type="button" onClick={onAbrirRepositorio} className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">Abrir repositorio</button>
          </div>
        );
      })}
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
    </section>
  );
}

function EstadoBadge({
  valor,
}) {
  const texto =
    valorVisible(valor);

  if (texto === "—") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-slate-200
          bg-slate-50
          px-2.5
          py-1
          text-[11px]
          font-semibold
          text-slate-400
        "
      >
        —
      </span>
    );
  }

  const normalizado =
    normalizarTexto(texto);

  const positivo =
    normalizado.includes("vig") ||
    normalizado.includes("abiert") ||
    normalizado.includes("activo");

  const negativo =
    normalizado.includes("error") ||
    normalizado.includes("defecto");

  const cerrado =
    normalizado.includes("cerr") ||
    normalizado.includes("final");

  let clases =
    "border-blue-200 bg-blue-50 text-blue-700";

  let punto =
    "bg-blue-500";

  if (positivo) {
    clases =
      "border-emerald-200 bg-emerald-50 text-emerald-700";

    punto =
      "bg-emerald-500";
  }

  if (cerrado) {
    clases =
      "border-slate-200 bg-slate-100 text-slate-600";

    punto =
      "bg-slate-500";
  }

  if (negativo) {
    clases =
      "border-red-200 bg-red-50 text-red-700";

    punto =
      "bg-red-500";
  }

  return (
    <span
      className={`
        inline-flex
        max-w-full
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1
        text-[11px]
        font-bold
        ${clases}
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${punto}
        `}
      />

      <span className="truncate">
        {texto}
      </span>
    </span>
  );
}


// ============================================================
// ICONO
// ============================================================

function IconoSeccion({
  tipo = "default",
}) {
  const iconos = {
    estado: "eye",
    titular: "person",
    solicitante: "users",
    economico: "chart",
    notario: "pen",
    observaciones: "video",
    actividad: "settings",
    finca: "home",
    registro: "book",
    accion: "activity",
  };

  return (
    <span
      className="
        text-base
        leading-none
      "
      aria-hidden="true"
    >
      <MolsanIcon name={iconos[tipo] || "file"} size={30} />
    </span>
  );
}


// ============================================================
// TARJETA
// ============================================================

function Seccion({
  id,
  titulo,
  subtitulo,
  icono,
  children,
  className = "",
  colapsable = false,
  compacto = false,
  colapsadaInicial = false,
}) {
  const [abierta, setAbierta] = useState(!colapsadaInicial);

  return (
    <section
      id={id}
      className={`
        scroll-mt-24
        rounded-2xl
        border
        border-white/80
        bg-white/85
        shadow-[0_15px_40px_rgba(15,23,42,0.07)]
        overflow-hidden
        ${className}
      `}
    >
      <div
        className={`
          flex
          items-center
          gap-3
          border-b
          border-slate-100
          ${compacto ? "px-2.5 py-2" : "px-5 py-4"}
        `}
      >
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-blue-100
            bg-blue-50
            text-blue-600
          "
        >
          <IconoSeccion
            tipo={icono}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className="
              truncate
              text-sm
              font-bold
              text-slate-800
            "
          >
            {titulo}
          </h2>

          {subtitulo && (
            <p
              className="
                mt-0.5
                truncate
                text-[11px]
                text-slate-400
              "
            >
              {subtitulo}
            </p>
          )}
        </div>

        {colapsable && (
          <button
            type="button"
            onClick={() => setAbierta((valor) => !valor)}
            className="
              ml-auto
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-white
              text-slate-500
              transition
              hover:bg-slate-50
              hover:text-blue-600
            "
            aria-label={abierta ? `Ocultar ${titulo}` : `Mostrar ${titulo}`}
            title={abierta ? "Ocultar" : "Mostrar"}
          >
            <span className="text-xs font-bold">
              {abierta ? "⌃" : "⌄"}
            </span>
          </button>
        )}
      </div>

      {(!colapsable || abierta) && (
        <div className={compacto ? "p-3" : "p-5"}>
          {children}
        </div>
      )}
    </section>
  );
}


// ============================================================
// DATO
// ============================================================

function Dato({
  campo,
  valor,
  tipo = "texto",
  destaque = false,
  estado = false,
  multilinea = false,
  compacto = false,
}) {
  let contenido =
    valorVisible(valor);

  if (tipo === "fecha") {
    contenido =
      formatearFecha(valor);
  }

  if (tipo === "numero") {
    contenido =
      formatearNumero(valor);
  }

  return (
    <div
      className={`
        min-w-0
        rounded-xl
        border
        ${compacto ? "px-1.5 py-1.5 rounded-lg" : "px-2 py-2 rounded-xl"}
        ${
          destaque
            ? "border-blue-100 bg-blue-50/60"
            : "border-slate-100 bg-white"
        }
      `}
    >
      <p
        className="
          mb-1
          truncate
          text-[9px]
          font-bold
          uppercase
          tracking-[0.08em]
          text-slate-400
        "
      >
        {campo}
      </p>

      {estado ? (
        <EstadoBadge
          valor={valor}
        />
      ) : (
        <div
          className={`
            ${compacto ? "text-[11px] leading-tight" : "text-xs"}
            font-medium
            ${
              destaque
                ? "text-blue-700"
                : "text-slate-700"
            }
            ${
              multilinea
                ? "whitespace-pre-wrap"
                : "break-words"
            }
          `}
        >
          {contenido}
        </div>
      )}
    </div>
  );
}


// ============================================================
// MODAL BASE
// ============================================================

function Modal({
  open,
  onClose,
  titulo,
  subtitulo,
  children,
  footer,
  ancho = "max-w-3xl",
}) {
  if (!open) {
    return null;
  }

  return createPortal((
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-900/50
        p-4
        backdrop-blur-[2px]
      "
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`
          relative
          flex
          max-h-[92vh]
          w-full
          ${ancho}
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        `}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-slate-200
            bg-gradient-to-r
            from-slate-50
            to-white
            px-6
            py-5
          "
        >
          <div className="min-w-0">
            <h2
              className="
                text-lg
                font-bold
                text-slate-800
              "
            >
              {titulo}
            </h2>

            {subtitulo && (
              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                {subtitulo}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-500
              transition
              hover:bg-slate-50
              hover:text-slate-800
            "
          >
            ✕
          </button>
        </div>

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-6
            py-6
          "
        >
          {children}
        </div>

        {footer && (
          <div
            className="
              flex
              items-center
              justify-end
              gap-3
              border-t
              border-slate-200
              bg-slate-50
              px-6
              py-4
            "
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}


// ============================================================
// BOTÓN
// ============================================================

function Boton({
  children,
  onClick,
  tipo = "secondary",
  disabled = false,
  className = "",
}) {
  const clases = {
    primary:
      "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",

    secondary:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",

    danger:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",

    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",

    warning:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-xl
        border
        px-4
        py-2.5
        text-xs
        font-bold
        transition
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${clases[tipo] || clases.secondary}
        ${className}
      `}
    >
      {children}
    </button>
  );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function FichaExpediente() {
  const { id } = useParams();
  const empleadoSesion = useAuthStore((state) => state.empleado);
  const rolSesionNormalizado = String(
    empleadoSesion?.rol_nombre || empleadoSesion?.rol?.nombre || empleadoSesion?.rol || ""
  ).trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const esAdministradorSesion = [
    "admin",
    "administrador",
    "administradora",
    "superadmin",
    "super admin",
    "superadministrador",
    "super administradora",
    "administrador general",
  ].includes(rolSesionNormalizado);

  const [
    expediente,
    setExpediente,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  // ----------------------------------------------------------
  // MODALES
  // ----------------------------------------------------------


  const [mostrarLiquidarExpediente, setMostrarLiquidarExpediente] = useState(false);
  const [liquidandoExpediente, setLiquidandoExpediente] = useState(false);

  const [
    actividadSeleccionada,
    setActividadSeleccionada,
  ] = useState(
    "documentacion-previa"
  );

  const [pestanaActividad, setPestanaActividad] = useState("documentos");
  const [mostrarControlCalidad, setMostrarControlCalidad] = useState(false);
  const [fasesCalidadColapsadas, setFasesCalidadColapsadas] = useState({});
  const [complementosSaldoExpediente, setComplementosSaldoExpediente] = useState([]);
  const [cargandoComplementosExpediente, setCargandoComplementosExpediente] = useState(false);
  const [errorComplementosExpediente, setErrorComplementosExpediente] = useState("");
  const [mostrarDatosEnvioNotario, setMostrarDatosEnvioNotario] = useState(true);
  const [mostrarResumenEconomico, setMostrarResumenEconomico] = useState(true);
  const [mostrarPanelEconomicoPago, setMostrarPanelEconomicoPago] = useState(true);
  const [mostrarModalDatosActividad, setMostrarModalDatosActividad] = useState(false);
  const [actividadDraft, setActividadDraft] = useState({});
  const [guardandoActividad, setGuardandoActividad] = useState(false);
  const [errorActividad, setErrorActividad] = useState("");
  const [mostrarControlExpediente, setMostrarControlExpediente] = useState(false);
  const [mostrarAvisoBloqueoExpediente, setMostrarAvisoBloqueoExpediente] = useState(false);
  const [guardandoControlExpediente, setGuardandoControlExpediente] = useState(false);
  const [errorControlExpediente, setErrorControlExpediente] = useState("");
  const [controlExpediente, setControlExpediente] = useState({ liquidado_sin_tramitar:false, fecha_liquidacion_sin_tramitar:"", cambio_gestoria:false, fecha_cambio_gestoria:"", bloqueo_manual:false, motivo_bloqueo:"", fecha_bloqueo:new Date().toLocaleDateString("sv-SE") });
  const [mensajeActividad, setMensajeActividad] = useState("");
  const [estadoDocumentacionAbsis, setEstadoDocumentacionAbsis] = useState({
    certificado_saldo_cero_erroneo: false,
    solicitud_cancelacion_notarial: false,
    certificado_cancelacion_administrativo: false,
    nota_simple_registral: false,
    mover_siguiente_actividad: false,
    enviado_a_absis: false,
    solicitud_registrada_localmente: false,
    fecha_solicitud_local: null,
  });
  const [cargandoEstadoAbsis, setCargandoEstadoAbsis] = useState(false);
  const [registrandoSolicitudIntegracion, setRegistrandoSolicitudIntegracion] = useState(false);
  const [fechaEnvioAbsis, setFechaEnvioAbsis] = useState("");
  const [documentosCarpetaPrevia, setDocumentosCarpetaPrevia] = useState([]);
  const [documentosCierre, setDocumentosCierre] = useState([]);
  const actualizarDocumentosCarpetaPrevia = useCallback((lista) => {
    const documentos = Array.isArray(lista) ? lista : [];
    setDocumentosCarpetaPrevia(documentos);
    setDocumentosCierre(documentos);
  }, []);
  const [cargandoDocumentosCierre, setCargandoDocumentosCierre] = useState(false);
  const [errorDocumentosCierre, setErrorDocumentosCierre] = useState("");
  const [honorariosGestoria, setHonorariosGestoria] = useState(null);
  const [generandoHonorariosGestoria, setGenerandoHonorariosGestoria] = useState(false);
  const [errorHonorariosGestoria, setErrorHonorariosGestoria] = useState("");
  const [mensajeHonorariosGestoria, setMensajeHonorariosGestoria] = useState("");
  const [mostrarModalFacturaHonorarios, setMostrarModalFacturaHonorarios] = useState(false);
  const [empleadoEnFactura, setEmpleadoEnFactura] = useState(false);
  const [baseHonorariosOriginal, setBaseHonorariosOriginal] = useState(0);
  const [previsualizandoFacturaHonorarios, setPrevisualizandoFacturaHonorarios] = useState(false);
  const [guardandoFacturaHonorarios, setGuardandoFacturaHonorarios] = useState(false);
  const [conceptosFacturaHonorarios, setConceptosFacturaHonorarios] = useState([]);
  const [facturaHonorariosForm, setFacturaHonorariosForm] = useState({
    cliente: "", nifCliente: "", direccion: "", codigoPostal: "", poblacion: "", provincia: "", numeroFactura: "", fechaFactura: new Date().toISOString().slice(0, 10),
    concepto: "Honorarios de gestoría", baseImponible: "0.00", tipoImpuesto: "IVA", porcentajeImpuesto: "21",
    importeImpuesto: "0.00", totalFactura: "0.00", provisionFondos: "0.00", saldoDisponible: "0.00",
    tarifa: "", entidad: "", observaciones: "",
  });

  useEffect(() => {
    if (!mostrarModalFacturaHonorarios) return;
    let vigente = true;
    axios.get("/tipos-concepto-gastos/opciones")
      .then(({ data }) => {
        if (!vigente) return;
        const lista = Array.isArray(data) ? data : [];
        setConceptosFacturaHonorarios(lista);
        const predeterminado = lista.find((item) => String(item.nombre || "").trim().toLowerCase() === "honorarios gestoría");
        if (predeterminado) setFacturaHonorariosForm((actual) => ({ ...actual, concepto: predeterminado.nombre }));
      })
      .catch(() => { if (vigente) setConceptosFacturaHonorarios([]); });
    return () => { vigente = false; };
  }, [mostrarModalFacturaHonorarios]);

  const cargarDocumentosCierre = useCallback(async () => {
    const numero = expediente?.id_expediente || id;
    if (!numero) return;
    setCargandoDocumentosCierre(true);
    setErrorDocumentosCierre("");
    try {
      const respuesta = await axios.get(`/expedientes/${encodeURIComponent(numero)}/carpeta-digital`);
      const lista = Array.isArray(respuesta.data) ? respuesta.data : respuesta.data?.items || [];
      setDocumentosCierre(lista);
    } catch (error) {
      setErrorDocumentosCierre(error?.response?.data?.detail || "No se pudieron cargar los documentos de la carpeta digital.");
    } finally {
      setCargandoDocumentosCierre(false);
    }
  }, [expediente?.id_expediente, id]);

  useEffect(() => {
    if (actividadSeleccionada === "facturacion-cierre") cargarDocumentosCierre();
  }, [actividadSeleccionada, cargarDocumentosCierre]);

  // Recupera la fecha registrada para el envío de la actividad seleccionada.
  useEffect(() => {
    const numero = expediente?.id_expediente || id;
    if (!mostrarModalDatosActividad || !numero || !actividadSeleccionada || actividadSeleccionada === "gestion-economica") return undefined;
    let activo = true;
    axios.get(`/expedientes/${encodeURIComponent(numero)}/integraciones-pendientes/${encodeURIComponent(actividadSeleccionada)}`)
      .then(({ data }) => {
        if (activo) setFechaEnvioAbsis(String(data?.fecha_envio_absis || "").slice(0, 10));
      })
      .catch(() => {
        if (activo) setFechaEnvioAbsis("");
      });
    return () => { activo = false; };
  }, [mostrarModalDatosActividad, expediente?.id_expediente, id, actividadSeleccionada]);

  // Mantiene visibles en Documentación previa los archivos que ya están guardados
  // en la carpeta digital, incluso antes de abrir el repositorio manualmente.
  useEffect(() => {
    const numero = expediente?.id_expediente || id;
    if (actividadSeleccionada !== "documentacion-previa" || !numero) return;
    let activo = true;
    axios.get(`/expedientes/${encodeURIComponent(numero)}/carpeta-digital`)
      .then((respuesta) => {
        if (!activo) return;
        const lista = Array.isArray(respuesta.data) ? respuesta.data : respuesta.data?.items || [];
        setDocumentosCarpetaPrevia(lista);
      })
      .catch(() => {
        // No bloquea la ficha si el repositorio no responde temporalmente.
      });
    return () => { activo = false; };
  }, [actividadSeleccionada, expediente?.id_expediente, id]);

  const [
    mostrarDefecto,
    setMostrarDefecto,
  ] = useState(false);

  const [
    mostrarEnviarNotario,
    setMostrarEnviarNotario,
  ] = useState(false);

  // Gastos vinculados al expediente y al documento formalizado.
  const [mostrarFormularioGasto, setMostrarFormularioGasto] = useState(false);
  const [origenFormularioGasto, setOrigenFormularioGasto] = useState("economico");
  const [gastosExpediente, setGastosExpediente] = useState([]);
  const [pagosPorGasto, setPagosPorGasto] = useState({});
  const [tiposImpositivosCatalogo, setTiposImpositivosCatalogo] = useState([]);
  const [mostrarFormularioPagoReal, setMostrarFormularioPagoReal] = useState(false);
  const [gastoEdicionId, setGastoEdicionId] = useState(null);
  const [pagoGastoSeleccionadoId, setPagoGastoSeleccionadoId] = useState("");
  const [guardandoPagoReal, setGuardandoPagoReal] = useState(false);
  const [errorPagoReal, setErrorPagoReal] = useState("");
  const [pagoRealForm, setPagoRealForm] = useState({
    fecha: new Date().toLocaleDateString("sv-SE"),
    importe: "",
    concepto: "",
    medio_pago: "Transferencia",
    idempotency_key: "erp-pago-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10),
  });
  const [cargandoGastos, setCargandoGastos] = useState(false);
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [errorGastos, setErrorGastos] = useState("");
  const [mensajeGastos, setMensajeGastos] = useState("");

  useEffect(() => {
    let vigente = true;
    axios.get("/tipos-impositivos")
      .then(({ data }) => { if (vigente) setTiposImpositivosCatalogo(Array.isArray(data) ? data : []); })
      .catch((error) => console.error("No se pudo cargar el catálogo fiscal.", error));
    return () => { vigente = false; };
  }, []);
  const [mostrarModalComplementoSaldo, setMostrarModalComplementoSaldo] = useState(false);
  const [guardandoComplementoSaldo, setGuardandoComplementoSaldo] = useState(false);
  const [errorComplementoSaldo, setErrorComplementoSaldo] = useState("");
  const [mensajeComplementoSaldo, setMensajeComplementoSaldo] = useState("");
  const [formComplementoSaldo, setFormComplementoSaldo] = useState({
    provisionado: "",
    saldo_disponible: "",
    importe: "",
    motivo: "",
  });
  const [conceptosGasto, setConceptosGasto] = useState([]);
  const [cargandoConceptosGasto, setCargandoConceptosGasto] = useState(false);
  const [tiposConceptoAbsis, setTiposConceptoAbsis] = useState([]);
  const [cargandoTiposConceptoAbsis, setCargandoTiposConceptoAbsis] = useState(false);
  const [catalogoTiposConceptoAbsisCargado, setCatalogoTiposConceptoAbsisCargado] = useState(false);
  const [honorariosCatalogo, setHonorariosCatalogo] = useState([]);
  const [honorarioGestoriaId, setHonorarioGestoriaId] = useState("");
  const [documentosFacturaGasto, setDocumentosFacturaGasto] = useState([]);
  const [documentoFacturaSeleccionado, setDocumentoFacturaSeleccionado] = useState("");
  const [urlVistaPreviaFactura, setUrlVistaPreviaFactura] = useState("");
  const [cargandoVistaPreviaFactura, setCargandoVistaPreviaFactura] = useState(false);
  const [errorVistaPreviaFactura, setErrorVistaPreviaFactura] = useState("");
  const expedienteIdGastos = expediente?.id_expediente || id;
  const documentosFacturaElegibles = documentosFacturaGasto.filter((doc) =>
    ["factura notarial", "factura registral", "factura registro"].includes(String(doc.categoria || doc.categoria_nombre || "").trim().toLowerCase())
  );
  useEffect(() => {
    if (!mostrarFormularioGasto || !expedienteIdGastos) return;
    let activo = true;
    axios.get(`/expedientes/${encodeURIComponent(expedienteIdGastos)}/carpeta-digital`)
      .then((res) => {
        if (!activo) return;
        const lista = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDocumentosFacturaGasto(lista);
        const elegible = lista.find((doc) =>
          ["factura notarial", "factura registral", "factura registro"].includes(String(doc.categoria || doc.categoria_nombre || "").trim().toLowerCase())
          && /\.pdf$/i.test(String(doc.nombre_original || doc.nombre || ""))
        );
        if (elegible) setDocumentoFacturaSeleccionado(String(elegible.id));
      })
      .catch(() => { if (activo) setErrorVistaPreviaFactura("No se pudieron cargar las facturas de la Carpeta Digital."); });
    return () => { activo = false; };
  }, [mostrarFormularioGasto, expedienteIdGastos]);
  useEffect(() => {
    if (!mostrarFormularioGasto || !documentoFacturaSeleccionado || !expedienteIdGastos) {
      setUrlVistaPreviaFactura("");
      return;
    }
    let activo = true;
    let urlTemporal = "";
    const doc = documentosFacturaGasto.find((d) => String(d.id) === String(documentoFacturaSeleccionado));
    if (!doc) return;
    if (!/\.pdf$/i.test(String(doc.nombre_original || doc.nombre || ""))) {
      setErrorVistaPreviaFactura("La vista previa integrada está disponible para archivos PDF.");
      setUrlVistaPreviaFactura("");
      return;
    }
    setCargandoVistaPreviaFactura(true);
    setErrorVistaPreviaFactura("");
    axios.get(`/expedientes/${encodeURIComponent(expedienteIdGastos)}/carpeta-digital/${doc.id}/descargar`, { responseType: "blob" })
      .then((res) => {
        if (!activo) return;
        urlTemporal = URL.createObjectURL(res.data);
        setUrlVistaPreviaFactura(urlTemporal);
      })
      .catch((e) => { if (activo) setErrorVistaPreviaFactura(e?.response?.data?.detail || "No se pudo cargar la vista previa del PDF."); })
      .finally(() => { if (activo) setCargandoVistaPreviaFactura(false); });
    return () => { activo = false; if (urlTemporal) URL.revokeObjectURL(urlTemporal); };
  }, [mostrarFormularioGasto, documentoFacturaSeleccionado, documentosFacturaGasto, expedienteIdGastos]);

  const [gastoForm, setGastoForm] = useState({
    tipo: "", tipo_concepto_absis: "", descripcion: "", importe: "", fecha: new Date().toLocaleDateString("sv-SE"), documento_url: "",
    nif_notario: "", nombre_notario: "", pagador: "", cuenta_bancaria: "", medio_pago: "Transferencia",
    numero_factura: "", fecha_factura: new Date().toLocaleDateString("sv-SE"), importe_total_bruto: "",
    base_exenta_impuestos: "0.00", base_sujeta_impuestos: "", tramo_impuesto: "General", tipo_impuesto: "IVA 21%",
    porcentaje_impuesto: "21", base_exenta_retencion: "0.00", base_sujeta_retencion: "0.00",
    tipo_retencion: "IRPF profesionales", porcentaje_retencion: "15", documento_carpeta_id: "", estado_pago: "Pendiente",
  });
  const [cuentasBancariasNotario, setCuentasBancariasNotario] = useState([]);

  const cargarCuentasBancariasNotarioParaPago = async () => {
    setCuentasBancariasNotario([]);
    const idNotaria = expediente?.notario_id || expediente?.notaria_id;
    const nifObjetivo = String(expediente?.nif_notario || expediente?.notario_nif || "").trim().toUpperCase();
    const nombreObjetivo = String(expediente?.notario || expediente?.nombre_notario || "").trim();
    let notaria = null;
    try {
      if (idNotaria) {
        try {
          const detalle = await axios.get(`/ctn/notarias/${encodeURIComponent(idNotaria)}`);
          notaria = detalle?.data || null;
        } catch {
          notaria = null;
        }
      }
      if (!notaria && (nifObjetivo || nombreObjetivo)) {
        const respuesta = await axios.get("/ctn/notarias", { params: { q: nifObjetivo || nombreObjetivo, page: 1, page_size: 100 } });
        const items = Array.isArray(respuesta?.data?.items) ? respuesta.data.items : Array.isArray(respuesta?.data) ? respuesta.data : [];
        notaria = items.find((item) => nifObjetivo && String(item.nif || "").trim().toUpperCase() === nifObjetivo)
          || items.find((item) => nombreObjetivo && [item.nombre, item.apellidos, item.nombre_completo].filter(Boolean).join(" ").toLowerCase().includes(nombreObjetivo.toLowerCase()))
          || null;
        if (notaria?.id) {
          try {
            const detalle = await axios.get(`/ctn/notarias/${encodeURIComponent(notaria.id)}`);
            notaria = detalle?.data || notaria;
          } catch {}
        }
      }
      const cuentas = [
        { id: "iban_1", label: "Cuenta bancaria 1", iban: String(notaria?.iban_1 || "").replace(/\s/g, "").toUpperCase() },
        { id: "iban_2", label: "Cuenta bancaria 2", iban: String(notaria?.iban_2 || "").replace(/\s/g, "").toUpperCase() },
      ].filter((cuenta) => cuenta.iban);
      setCuentasBancariasNotario(cuentas);
      setGastoForm((actual) => ({
        ...actual,
        nif_notario: actual.nif_notario || notaria?.nif || nifObjetivo,
        nombre_notario: actual.nombre_notario || [notaria?.nombre, notaria?.apellidos].filter(Boolean).join(" ").trim() || nombreObjetivo,
        cuenta_bancaria: cuentas[0]?.iban || "",
      }));
      if (!notaria && (nifObjetivo || nombreObjetivo)) {
        setErrorGastos("No se encontró la ficha CTN del notario; puedes introducir el IBAN manualmente.");
      }
    } catch {
      setCuentasBancariasNotario([]);
      setErrorGastos("No se pudieron consultar las cuentas CTN; puedes introducir el IBAN manualmente.");
    }
  };

  const numeroDecimalGasto = (valor) => {
    if (valor === "" || valor === null || valor === undefined) return 0;
    const n = Number(String(valor).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const baseImponibleGasto = numeroDecimalGasto(gastoForm.base_sujeta_impuestos);
  const impuestoCalculadoGasto = Math.round(baseImponibleGasto * numeroDecimalGasto(gastoForm.porcentaje_impuesto)) / 100;
  const retencionCalculadaGasto = Math.round(numeroDecimalGasto(gastoForm.base_sujeta_retencion) * numeroDecimalGasto(gastoForm.porcentaje_retencion)) / 100;
  const brutoCalculadoGasto = gastoForm.importe_total_bruto !== "" ? numeroDecimalGasto(gastoForm.importe_total_bruto) : Math.round((numeroDecimalGasto(gastoForm.base_exenta_impuestos) + baseImponibleGasto + impuestoCalculadoGasto) * 100) / 100;
  const resultadoCalculadoGasto = Math.round((brutoCalculadoGasto - retencionCalculadaGasto) * 100) / 100;

  // Resumen económico: solo los gastos efectivamente pagados descuentan provisión.
  const estadosPagoConfirmado = ["pagado", "pagada", "abonado", "abonada", "efectuado", "efectuada"];
  const importeInicialProvision = Number(String(expediente?.importe ?? "").replace(",", "."));
  const importeInicialDisponible = expediente?.importe !== null && expediente?.importe !== undefined && expediente?.importe !== "" && Number.isFinite(importeInicialProvision);
  const movimientosEconomicosOrdenados = (Array.isArray(gastosExpediente) ? gastosExpediente : [])
    .flatMap((gasto) => {
      const pagos = Array.isArray(pagosPorGasto[String(gasto.id)]) ? pagosPorGasto[String(gasto.id)] : [];
      if (pagos.length) return pagos.map((pago) => ({
        ...gasto,
        id: `pago-${pago.id}`,
        numero_documento: `PAG-${String(pago.id).padStart(6, "0")}`,
        fecha: pago.fecha,
        concepto_pago: pago.concepto,
        importeMovimiento: pago.anulado_en ? 0 : -Math.abs(Number(pago.importe || 0)),
        importe_resultante: Math.abs(Number(pago.importe || 0)),
        pago_id: pago.id,
        gasto_id: gasto.id,
        anulado_en: pago.anulado_en,
        motivo_anulacion: pago.motivo_anulacion,
        anulado_por: pago.anulado_por,
        estado_pago: pago.anulado_en ? "Anulado" : "Pagado",
        es_movimiento_pago: true,
      }));
      // Compatibilidad con gastos históricos que ya constaban como pagados antes
      // del nuevo libro de movimientos; no se alteran ni se inventan filas de pago.
      const estado = String(gasto.estado_pago || "").trim().toLowerCase();
      if (estadosPagoConfirmado.includes(estado)) return [{
        ...gasto,
        numero_documento: gasto.numero_documento || `PAG-${String(gasto.id).padStart(6, "0")}`,
        importeMovimiento: -Math.abs(Number(gasto.importe_resultante ?? gasto.importe ?? 0)),
        es_movimiento_pago: false,
      }];
      return [];
    })
    .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")) || String(a.id).localeCompare(String(b.id)));
  const resumenEconomico = movimientosEconomicosOrdenados.reduce((resultado, movimiento) => {
    const importe = Math.abs(Number(movimiento.importeMovimiento ?? movimiento.importe_resultante ?? movimiento.importe ?? 0)) || 0;
    const saldo = resultado.saldoActual - importe;
    resultado.movimientos.push({ ...movimiento, importeMovimiento: importe === 0 ? 0 : -importe, saldoCalculado: saldo });
    resultado.saldoActual = saldo;
    return resultado;
  }, { saldoActual: importeInicialDisponible ? importeInicialProvision : 0, movimientos: [] });
  const gastosPendientesResumen = (Array.isArray(gastosExpediente) ? gastosExpediente : [])
    .filter((gasto) => {
      const estado = String(gasto.estado_pago || "").trim().toLowerCase();
      if (estado.includes("anulad")) return false;
      const pagos = Array.isArray(pagosPorGasto[String(gasto.id)]) ? pagosPorGasto[String(gasto.id)] : [];
      const totalPagado = pagos.filter((pago) => !pago.anulado_en).reduce((suma, pago) => suma + Number(pago.importe || 0), 0);
      const obligacion = Number(gasto.importe_resultante ?? gasto.importe ?? 0);
      if (obligacion > 0 && totalPagado > 0) return totalPagado + 0.005 < obligacion;
      return !estadosPagoConfirmado.includes(estado);
    });

  const [
    mostrarFincas,
    setMostrarFincas,
  ] = useState(false);

  const [
    mostrarCarpetaDigital,
    setMostrarCarpetaDigital,
  ] = useState(false);
  const [mostrarRepositoriosDocumentacionPrevia, setMostrarRepositoriosDocumentacionPrevia] = useState(false);
  const [mostrarReclamarOficina, setMostrarReclamarOficina] = useState(false);
  const [emailReclamacion, setEmailReclamacion] = useState({ destinatario: "", cc: "", asunto: "", cuerpo: "" });
  const [categoriasEmail] = useState(["General", "Documentación", "Firma y notaría", "Defectos registrales", "Liquidación e impuestos", "Inscripción registral", "Provisión de fondos", "Cierre de expediente", "Avisos y reclamaciones"]);
  const [plantillasEmail, setPlantillasEmail] = useState([]);
  const [categoriaEmail, setCategoriaEmail] = useState("");
  const [plantillaEmailId, setPlantillaEmailId] = useState("");
  const [contextoEmail, setContextoEmail] = useState({});
  const [cargandoPlantillasEmail, setCargandoPlantillasEmail] = useState(false);
  const [historicoReclamaciones, setHistoricoReclamaciones] = useState([]);
  const [cargandoHistoricoReclamaciones, setCargandoHistoricoReclamaciones] = useState(false);
  const [enviandoReclamacion, setEnviandoReclamacion] = useState(false);
  const [errorReclamacion, setErrorReclamacion] = useState("");
  const [mensajeReclamacion, setMensajeReclamacion] = useState("");

  // Modal de carpeta digital del expediente.
  function crearPlantillaReclamacionOficina() {
    const solicitante = expediente?.nombre_solicitante || "";
    const dniSolicitante = expediente?.nif_solicitante || "";
    const titular = expediente?.nombre_titular || "";
    const dniTitular = expediente?.nif_titular || "";
    const numeroExpediente = expediente?.id_expediente || id || "";
    const fechaAlta = expediente?.fecha_alta ? formatearFecha(expediente.fecha_alta) : "—";
    const importe = expediente?.importe == null ? "—" : `${formatearNumero(expediente.importe)} €`;
    const contrato = expediente?.contrato || "—";
    const finca = expediente?.finca || "—";
    const capital = expediente?.capital == null ? "—" : `${formatearNumero(expediente.capital)} €`;
    return {
      destinatario: "",
      asunto: `CANCELACIÓN REGISTRAL, CONTRATO: ${contrato} solicitante ${solicitante} ${dniSolicitante} EXPEDIENTE: ${numeroExpediente}`,
      cuerpo: `EXPEDIENTE CON PROVISIÓN cancelación CaixaBank:
En relación al cliente de referencia ${solicitante} ${dniSolicitante} y cuyo titular es ${titular} ${dniTitular} le informamos que el día ${fechaAlta}, realizó una provisión de fondos de ${importe} para cancelar ante notario y para tramitar en el registro de la propiedad la cancelación total de su contrato nº ${contrato}.

Esta hipoteca se constituyó en la finca registral nº ${finca} por un capital principal de ${capital}.

A fecha de hoy estamos a la espera de recibir la documentación necesaria para autorizar la firma, personarnos ante notario y una vez firmada gestionar la cancelación total, con la provisión realizada por el cliente.

Rogamos atienda nuestro correo y nos facilite la siguiente documentación, porque esta provisión debe ser gestionada a petición del cliente en el menor tiempo posible.

DOCUMENTACIÓN:

* Solicitud de cancelación notarial
* Certificado de cancelación administrativa
* Nota del Registro de la Propiedad

Muchas gracias por su colaboración y quedamos a la espera de respuesta

Atentamente.

MOLSAN GESTIÓN Y TRAMITACIÓN, S.L.
Centro Cancelador del Grupo "la Caixa"
Tel: 93.349.74.65.
e/mail: cancelaciones@molsan.es
www.molsan.es

Este e-mail incorpora información confidencial. El contenido de la misma se encuentra protegido por Ley. Cualquier persona distinta a su destinatario tiene prohibida su reproducción, uso, divulgación e impresión total o parcial. Si ha recibido este mensaje por error notifíquelo de inmediato al remitente y borre el mensaje original junto con sus ficheros anexos

APODERADOS EN: ALICANTE · BALEARES · CANARIAS · CASTELLON · CATALUÑA · GALICIA · HUESCA · LA RIOJA · MURCIA · NAVARRA · VALENCIA · ZARAGOZA`,
    };
  }

  const cargarHistoricoReclamaciones = useCallback(async () => {
    const numero = expediente?.id_expediente || id;
    if (!numero) return;
    setCargandoHistoricoReclamaciones(true);
    try {
      const respuesta = await axios.get(`/expedientes/${encodeURIComponent(numero)}/reclamaciones-oficina/historico`);
      setHistoricoReclamaciones(Array.isArray(respuesta.data) ? respuesta.data : []);
    } catch (error) {
      setErrorReclamacion(error?.response?.data?.detail || "No se pudo cargar el histórico de emails.");
    } finally {
      setCargandoHistoricoReclamaciones(false);
    }
  }, [expediente?.id_expediente, id]);

  const abrirReclamacionOficina = useCallback(async () => {
    setErrorReclamacion("");
    setMensajeReclamacion("");
    setEmailReclamacion({ destinatario: "", cc: "", asunto: "", cuerpo: "" });
    setCategoriaEmail("");
    setPlantillaEmailId("");
    setContextoEmail({});
    setMostrarReclamarOficina(true);
    cargarHistoricoReclamaciones();
    setCargandoPlantillasEmail(true);
    try {
      const numero = expediente?.id_expediente || id;
      const [plantillasRes, contextoRes] = await Promise.all([
        axios.get("/utilidades/correspondencia/plantillas"),
        axios.get("/utilidades/correspondencia/expediente", { params: { numero_expediente: numero } }),
      ]);
      setPlantillasEmail(Array.isArray(plantillasRes.data) ? plantillasRes.data.filter((p) => p.activo !== false) : []);
      setContextoEmail(contextoRes.data?.contexto || {});
    } catch (error) {
      setErrorReclamacion(error?.response?.data?.detail || "No se pudieron cargar las plantillas o los datos del expediente. Comprueba el acceso a Correspondencia tipificada.");
    } finally {
      setCargandoPlantillasEmail(false);
    }
  }, [expediente?.id_expediente, id, cargarHistoricoReclamaciones]);

  const seleccionarPlantillaEmail = useCallback((plantillaId) => {
    setPlantillaEmailId(String(plantillaId || ""));
    const plantilla = plantillasEmail.find((item) => String(item.id) === String(plantillaId));
    if (!plantilla) return;
    const sustituir = (texto) => String(texto || "").replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, clave) => {
      const valor = contextoEmail[clave];
      return valor === undefined || valor === null || String(valor).trim() === "" ? "[[FALTA: " + clave + "]]" : String(valor);
    });
    setEmailReclamacion({ destinatario: sustituir(plantilla.destinatario), cc: sustituir(plantilla.cc), asunto: sustituir(plantilla.asunto), cuerpo: sustituir(plantilla.cuerpo) });
    setErrorReclamacion("");
    setMensajeReclamacion("");
  }, [plantillasEmail, contextoEmail]);

  const plantillasCategoriaEmail = plantillasEmail.filter((plantilla) => !categoriaEmail || plantilla.categoria === categoriaEmail);
  const plantillaSeleccionadaEmail = plantillasEmail.find((plantilla) => String(plantilla.id) === String(plantillaEmailId));

  const enviarReclamacionOficina = useCallback(async () => {
    const numero = expediente?.id_expediente || id;
    if (!numero) return setErrorReclamacion("No se identifica el expediente actual.");
    setEnviandoReclamacion(true);
    setErrorReclamacion("");
    setMensajeReclamacion("");
    try {
      const respuesta = await axios.post(`/expedientes/${encodeURIComponent(numero)}/reclamaciones-oficina/enviar`, { ...emailReclamacion, categoria: categoriaEmail, plantilla_id: plantillaSeleccionadaEmail?.id || null, plantilla_nombre: plantillaSeleccionadaEmail?.nombre || "" });
      setMensajeReclamacion(respuesta.data?.mensaje || "Email enviado correctamente.");
      await cargarHistoricoReclamaciones();
    } catch (error) {
      setErrorReclamacion(error?.response?.data?.detail || "No se pudo enviar el email. Revisa la configuración SMTP y el histórico.");
      await cargarHistoricoReclamaciones();
    } finally {
      setEnviandoReclamacion(false);
    }
  }, [expediente?.id_expediente, id, emailReclamacion, categoriaEmail, plantillaSeleccionadaEmail, cargarHistoricoReclamaciones]);

  const [
    mostrarAcciones,
    setMostrarAcciones,
  ] = useState(false);

  const [
    mostrarAgregarExpedientes,
    setMostrarAgregarExpedientes,
  ] = useState(false);

  const [
    mostrarObservaciones,
    setMostrarObservaciones,
  ] = useState(false);

  // ----------------------------------------------------------
  // DATOS AUXILIARES
  // ----------------------------------------------------------

  const [
    expedientesRelacionados,
    setExpedientesRelacionados,
  ] = useState([]);

  const [
    expedientesManuales,
    setExpedientesManuales,
  ] = useState([]);

  const [
    cargandoRelacionados,
    setCargandoRelacionados,
  ] = useState(false);

  const [
    expedienteRelacionadoManual,
    setExpedienteRelacionadoManual,
  ] = useState("");

  const [
    errorRelacionManual,
    setErrorRelacionManual,
  ] = useState("");

  const [
    comentario,
    setComentario,
  ] = useState("");

  const [
    visionesComentario,
    setVisionesComentario,
  ] = useState({
    notario: false,
    apoderado: false,
    actividad: true,
    absis: false,
  });

  const [
    fincaForm,
    setFincaForm,
  ] = useState({
    numero_finca: "",
    cru_idufir: "",
    provincia: "",
    poblacion: "",
    registro: "",
    registro_propiedad_id: "",
    seccion: "",
    cuantia: "",
    inscripcion: "",
    contrato: "",
    fecha_constitucion: "",
    subrogado: "",
    entidad_original: "",
  });

  const [municipiosCatalogo, setMunicipiosCatalogo] = useState([]);
  const [cargandoMunicipiosCatalogo, setCargandoMunicipiosCatalogo] = useState(false);
  const [municipiosFincaAbierto, setMunicipiosFincaAbierto] = useState(false);
  const [fincasExpediente, setFincasExpediente] = useState([]);
  const [cargandoFincas, setCargandoFincas] = useState(false);
  const [errorFincas, setErrorFincas] = useState("");
  const [fincaEditandoId, setFincaEditandoId] = useState(null);
  const [guardandoFinca, setGuardandoFinca] = useState(false);
  const [catalogoRegistrosPropiedad, setCatalogoRegistrosPropiedad] = useState([]);
  const [modalSelectorRegistro, setModalSelectorRegistro] = useState(false);
  const [busquedaRegistroCatalogo, setBusquedaRegistroCatalogo] = useState("");
  const [registroDetalleAbierto, setRegistroDetalleAbierto] = useState(null);
  const [oficinaDetalleAbierta, setOficinaDetalleAbierta] = useState(false);
  const [oficinaCatalogoDetalle, setOficinaCatalogoDetalle] = useState(null);
  const [cargandoOficinaDetalle, setCargandoOficinaDetalle] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargarCatalogoRegistrosPropiedad() {
      try {
        const respuesta = await axios.get("/registros-propiedad");
        if (!activo) return;
        const datos = Array.isArray(respuesta?.data) ? respuesta.data : (Array.isArray(respuesta?.data?.items) ? respuesta.data.items : []);
        setCatalogoRegistrosPropiedad(datos);
      } catch (error) {
        console.error("No se ha podido cargar el catálogo de Registros de la Propiedad.");
      }
    }
    cargarCatalogoRegistrosPropiedad();
    async function cargarMunicipiosCatalogo() {
      setCargandoMunicipiosCatalogo(true);
      try {
        const respuesta = await axios.get("/municipios");
        if (!activo) return;
        setMunicipiosCatalogo(Array.isArray(respuesta?.data) ? respuesta.data : []);
      } catch (error) {
        console.error("No se ha podido cargar el catálogo de municipios para Fincas y Registros.");
      } finally {
        if (activo) setCargandoMunicipiosCatalogo(false);
      }
    }
    cargarMunicipiosCatalogo();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!mostrarFincas || !String(fincaForm.poblacion || "").trim() || !municipiosCatalogo.length) return;
    const coincidencia = municipiosCatalogo.find((item) =>
      normalizarMunicipio(item.municipio) === normalizarMunicipio(fincaForm.poblacion)
    );
    if (!coincidencia) return;
    if (fincaForm.poblacion !== coincidencia.municipio || fincaForm.provincia !== coincidencia.provincia) {
      setFincaForm((actual) => ({ ...actual, poblacion: coincidencia.municipio, provincia: coincidencia.provincia }));
    }
  }, [mostrarFincas, municipiosCatalogo, fincaForm.poblacion, fincaForm.provincia]);

  const [mostrarFusion, setMostrarFusion] = useState(false);
  const [fincaFusion, setFincaFusion] = useState(null);
  const [guardandoFusion, setGuardandoFusion] = useState(false);
  const [errorFusion, setErrorFusion] = useState("");
  const [mensajeFusion, setMensajeFusion] = useState("");
  const [fusionForm, setFusionForm] = useState({
    numero_entrada: "",
    serie_numero_factura: "",
    fecha_factura: "",
    nif_registrador: "",
    importe: "",
    entidad_origen: "",
    cambio_denominacion: "NO",
    recurrible: "SI",
    tipo_factura: "Factura (con número y fecha)",
    comentarios_observaciones: "",
  });

  function abrirSolicitudFusion(finca) {
    setFincaFusion(finca);
    setFusionForm({
      numero_entrada: "",
      serie_numero_factura: "",
      fecha_factura: "",
      nif_registrador: "",
      importe: "",
      entidad_origen: finca?.entidad_original || expediente?.entidad_origen || "",
      cambio_denominacion: "NO",
      recurrible: "SI",
      tipo_factura: "Factura (con número y fecha)",
      comentarios_observaciones: "",
    });
    setErrorFusion("");
    setMensajeFusion("");
    setMostrarFusion(true);
  }

  async function guardarSolicitudFusion() {
    const numero = expediente?.id_expediente || id;
    if (!numero) {
      setErrorFusion("No se ha podido identificar el expediente.");
      return;
    }
    if (!fincaFusion?.id || !String(fincaFusion?.registro || "").trim()) {
      setErrorFusion("La finca seleccionada debe tener un registro informado.");
      return;
    }
    if (fusionForm.tipo_factura === "Factura (con número y fecha)" &&
        (!fusionForm.serie_numero_factura.trim() || !fusionForm.fecha_factura)) {
      setErrorFusion("Para una factura completa, indica la serie/número y la fecha.");
      return;
    }
    setGuardandoFusion(true);
    setErrorFusion("");
    try {
      const payload = {
        finca_id: fincaFusion.id,
        numero_entrada: fusionForm.numero_entrada.trim() || null,
        serie_numero_factura: fusionForm.serie_numero_factura.trim() || null,
        fecha_factura: fusionForm.fecha_factura || null,
        nif_registrador: fusionForm.nif_registrador.trim() || null,
        importe: fusionForm.importe === "" ? null : Number(String(fusionForm.importe).replace(",", ".")),
        entidad_origen: fusionForm.entidad_origen.trim() || fincaFusion.entidad_original || null,
        cambio_denominacion: fusionForm.cambio_denominacion,
        recurrible: fusionForm.recurrible,
        tipo_factura: fusionForm.tipo_factura,
        comentarios_observaciones: fusionForm.comentarios_observaciones.trim() || null,
      };
      const respuesta = await axios.post(
        `/fusiones/solicitudes?id_expediente=${encodeURIComponent(numero)}`,
        payload
      );
      if (!respuesta?.data?.ok) throw new Error("El servidor no confirmó el registro de la solicitud.");
      setMensajeFusion(`Solicitud de fusión #${respuesta.data.item?.id || ""} guardada y enviada al módulo Fusiones.`);
      setMostrarFusion(false);
      window.alert(`Solicitud de fusión #${respuesta.data.item?.id || ""} guardada correctamente. Ya está disponible en el módulo Fusiones.`);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setErrorFusion(typeof detail === "string" ? detail : (error?.message || "No se pudo guardar la solicitud de fusión."));
    } finally {
      setGuardandoFusion(false);
    }
  }

  const [
    fincaRegistrada,
    setFincaRegistrada,
  ] = useState({
    numero_finca: "",
    cru_idufir: "",
    provincia: "",
    poblacion: "",
    registro: "",
    seccion: "",
    cuantia: "",
    inscripcion: "",
    contrato: "",
    fecha_constitucion: "",
    subrogado: "",
    entidad_original: "",
  });

const [
    accionForm,
    setAccionForm,
  ] = useState({
    accion_id: "",
    estado: "Pendiente",
    fecha: "",
    observaciones: "",
  });

  const [
    accionesCatalogo,
    setAccionesCatalogo,
  ] = useState([]);

  const [
    accionesExpediente,
    setAccionesExpediente,
  ] = useState([]);

  const [
    cargandoAcciones,
    setCargandoAcciones,
  ] = useState(false);

  const [
    errorAcciones,
    setErrorAcciones,
  ] = useState("");

  const [
    defectoLocal,
    setDefectoLocal,
  ] = useState(null);


const [defectosRegistrados, setDefectosRegistrados] = useState([]);
const [tiposCargaHipotecaria, setTiposCargaHipotecaria] = useState([]);
const [subtiposDefecto, setSubtiposDefecto] = useState([]);
const [defectoForm, setDefectoForm] = useState({ ...DEFECTO_VACIO });
const [defectoEditandoId, setDefectoEditandoId] = useState(null);
const [guardandoDefecto, setGuardandoDefecto] = useState(false);
const [errorDefecto, setErrorDefecto] = useState("");
const [archivoCalificacion, setArchivoCalificacion] = useState(null);
  
  // ----------------------------------------------------------
  // PPAD — datos persistidos en el backend
  // ----------------------------------------------------------
  const [ppadItems, setPpadItems] = useState([]);
  const [cargandoPpad, setCargandoPpad] = useState(false);
  const [guardandoPpad, setGuardandoPpad] = useState(false);
  const [errorPpad, setErrorPpad] = useState("");
  const [mostrarModalPpad, setMostrarModalPpad] = useState(false);
  const [mostrarFormularioPpad, setMostrarFormularioPpad] = useState(false);
  const [ppadEditandoId, setPpadEditandoId] = useState(null);
  const [ppadForm, setPpadForm] = useState({
    concepto: "",
    importe: "",
    imputableA: "Molsan",
  });

  // OBSERVACIONES — datos persistidos en el backend
  const [observacionesExpediente, setObservacionesExpediente] = useState([]);
  const [cargandoObservaciones, setCargandoObservaciones] = useState(false);
  const [guardandoObservacion, setGuardandoObservacion] = useState(false);
  const [errorObservaciones, setErrorObservaciones] = useState("");
  const [empleadosObservaciones, setEmpleadosObservaciones] = useState([]);
  const [destinatarioObservacion, setDestinatarioObservacion] = useState("");
  const [mostrarFormularioObservacion, setMostrarFormularioObservacion] = useState(false);
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [visibilidadObservacion, setVisibilidadObservacion] = useState("Gestor");
  const [observacionEditandoId, setObservacionEditandoId] = useState(null);

  // ==========================================================
  // CARGAR EXPEDIENTE
  // ==========================================================

  const cargarExpediente =
    useCallback(
      async () => {
        if (!id) {
          setLoading(false);
          setError(
            "No se ha indicado ningún expediente."
          );
          return;
        }

        try {
          setLoading(true);
          setError("");

          const respuesta =
            await obtenerExpediente(id);

          const datos =
            respuesta?.expediente ||
            respuesta?.data ||
            respuesta ||
            null;

          setExpediente(datos);

          setFincaRegistrada({
            numero_finca: datos?.finca || "",
            cru_idufir:
              datos?.cru_idufir ||
              datos?.cru ||
              datos?.idufir ||
              "",
            provincia: datos?.provincia || "",
            poblacion:
              datos?.poblacion ||
              datos?.municipio ||
              "",
            registro: datos?.registro || "",
            seccion: datos?.seccion || "",
            cuantia: datos?.cuantia || "",
            inscripcion: datos?.inscripcion || "",
            contrato: datos?.contrato || "",
            fecha_constitucion:
              datos?.fecha_constitucion || "",
            subrogado:
              datos?.subrogado === true
                ? "SI"
                : datos?.subrogado === false
                  ? "NO"
                  : datos?.subrogado || "",
            entidad_original:
              datos?.entidad_original || "",
          });

          try {
            const guardados = JSON.parse(
              localStorage.getItem(
                `erp_expedientes_relacionados_${datos?.id_expediente || id}`
              ) || "[]"
            );
            setExpedientesManuales(
              Array.isArray(guardados) ? guardados : []
            );
          } catch {
            setExpedientesManuales([]);
          }

          if (
            datos?.tiene_defectos_abiertos
          ) {
            setDefectoLocal({
              tipo_error:
                datos.tipo_error || "",
              falta_defecto:
                datos.falta_defecto || "",
              descripcion_error:
                datos.descripcion_error ||
                "",
              fcierre_defecto:
                datos.fcierre_defecto ||
                "",
            });
          } else {
            setDefectoLocal(null);
          }

          setActividadSeleccionada(
            resolverActividadActual(
              datos
            )
          );
        } catch (err) {
          console.error(
            "Error cargando ficha:",
            err
          );

          setExpediente(null);

          setError(
            err?.code === "ECONNABORTED"
              ? "El servidor ha tardado demasiado en responder al cargar el expediente. Comprueba la conexión e inténtalo de nuevo."
              : err?.response?.data?.detail ||
                "No se ha podido cargar la ficha del expediente."
          );
        } finally {
          setLoading(false);
        }
      },
      [id]
    );


  useEffect(() => {
    cargarExpediente();
  }, [
    cargarExpediente,
  ]);


  useEffect(() => {
    const nifExpediente = String(expediente?.nif_notario || expediente?.notario_nif || "").trim();
    const expedienteId = expediente?.id_expediente;
    if (!nifExpediente || !expedienteId) return undefined;

    const normalizarNif = (valor) => String(valor || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const nifBuscado = normalizarNif(nifExpediente);
    if (!nifBuscado) return undefined;

    let cancelado = false;
    const vincularDatosCtn = async () => {
      try {
        const respuesta = await axios.get("/ctn/notarias", {
          params: { q: nifExpediente, page: 1, page_size: 200 },
        });
        const payload = respuesta?.data;
        const notarias = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
        const notariaCtn = notarias.find(
          (notaria) => normalizarNif(notaria?.nif) === nifBuscado
        );
        if (!notariaCtn || cancelado) return;

        const apoderadoCtn = String(notariaCtn.apoderado || notariaCtn.apoderado_s || "").trim();
        const modalidadCtnOriginal = String(notariaCtn.vc || "").trim();
        const modalidadNormalizada = modalidadCtnOriginal
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        let tipoFirmaCtn = "";
        if (modalidadNormalizada) {
          if (
            modalidadNormalizada.includes("videoconferencia") ||
            modalidadNormalizada.includes("videoconference") ||
            ["vc", "si", "s", "yes", "true", "1", "video"].includes(modalidadNormalizada)
          ) {
            tipoFirmaCtn = "Videoconferencia";
          } else if (
            modalidadNormalizada.includes("presencial") ||
            ["no", "n", "false", "0", "p"].includes(modalidadNormalizada)
          ) {
            tipoFirmaCtn = "Presencial";
          } else {
            tipoFirmaCtn = modalidadCtnOriginal;
          }
        }

        const campos = {};
        if (apoderadoCtn && apoderadoCtn !== String(expediente?.apoderado || "").trim()) {
          campos.apoderado = apoderadoCtn;
        }
        if (tipoFirmaCtn && tipoFirmaCtn !== String(expediente?.tipo_firma || "").trim()) {
          campos.tipo_firma = tipoFirmaCtn;
        }
        if (!Object.keys(campos).length) return;

        await axios.put(
          `/expedientes/${encodeURIComponent(expedienteId)}/actividad`,
          { campos }
        );
        if (cancelado) return;
        setExpediente((actual) => actual && String(actual.id_expediente) === String(expedienteId)
          ? { ...actual, ...campos }
          : actual);
      } catch (errorCtn) {
        // La ficha sigue disponible si CTN no responde o el usuario no tiene acceso.
        console.warn("No se pudieron autocompletar los datos del notario desde CTN.", errorCtn);
      }
    };

    vincularDatosCtn();
    return () => {
      cancelado = true;
    };
  }, [
    expediente?.id_expediente,
    expediente?.nif_notario,
    expediente?.notario_nif,
    expediente?.apoderado,
    expediente?.tipo_firma,
  ]);


  // ==========================================================
  // ACTIVIDAD ACTUAL
  // ==========================================================

  const actividadActual =
    useMemo(
      () =>
        resolverActividadActual(
          expediente
        ),
      [expediente]
    );


  useEffect(() => {
    if (!expediente) return;
    const actividadInicial = resolverActividadActual(expediente);
    const fechaFirma = String(expediente.fecha_firma || "").slice(0, 10);
    setActividadSeleccionada(actividadInicial);
    setActividadDraft({
      ...expediente,
      ...Object.fromEntries((CAMPOS_ACTIVIDADES[actividadInicial] || []).map((campo) => [campo.key, expediente[campo.key] ?? ""])),
      fecha_fin_actividad: expediente.fecha_fin_actividad || expediente.fecha_envio_notario || expediente.fecha_envio || "",
      apoderado: expediente.apoderado || "Gestoría",
      fecha_presentacion: expediente.fecha_presentacion || fechaFirma,
      fecha_recogida_notario_presentacion_telematica: expediente.fecha_recogida_notario_presentacion_telematica || fechaFirma,
      fecha_presentacion_tributaria: expediente.fecha_presentacion_tributaria || fechaFirma,
      fecha_liquidacion_tributaria: expediente.fecha_liquidacion_tributaria || fechaFirma,
      fecha_vencimiento_asiento: expediente.fecha_vencimiento_asiento || sumarDiasNaturales(expediente.fecha_presentacion || fechaFirma, 60),
      mover_siguiente_actividad: expediente.mover_siguiente_actividad ?? (actividadInicial === "liquidacion-impuestos" || actividadInicial === "tramitacion-inscripcion"),
    });
  }, [expediente?.id_expediente, expediente?.actividad_actual]);


  // ==========================================================
  // DATOS DE ACTIVIDAD SELECCIONADA
  // ==========================================================

  const actividadSeleccionadaDef =
    useMemo(
      () =>
        ACTIVIDADES_EXPEDIENTES.find(
          (actividad) =>
            actividad.key ===
            actividadSeleccionada
        ) ||
        ACTIVIDADES_EXPEDIENTES[0],
      [actividadSeleccionada]
    );


  // ==========================================================
  // CAMPOS ACTIVIDAD
  // ==========================================================

  const camposActividad =
    useMemo(() => {
      const especificos =
        CAMPOS_ACTIVIDADES[
          actividadSeleccionada
        ] || [];

      const todos = [
        ...CAMPOS_COMUNES_ACTIVIDAD,
        ...especificos,
      ].filter((campo) => {
        // En Sede notarial con protocolo solo se conserva el número de expediente
        // de los campos generales; el resto no pertenece a esta ficha de actividad.
        if (
          actividadSeleccionada === "sede-notarial-protocolo" &&
          CAMPOS_COMUNES_ACTIVIDAD.some((comun) => comun.key === campo.key) &&
          campo.key !== "id_expediente"
        ) {
          return false;
        }

        // En Liquidación de impuestos y Tramitación inscripción se ocultan
        // todos los campos generales; cada actividad muestra sus campos específicos.
        if (
          ["liquidacion-impuestos", "tramitacion-inscripcion", "defectos-registrales", "facturacion-cierre"].includes(actividadSeleccionada) &&
          CAMPOS_COMUNES_ACTIVIDAD.some((comun) => comun.key === campo.key)
        ) {
          return false;
        }

        // En Defectos registrales se ocultan también los campos específicos
        // que describen el estado y el texto del defecto; esta ficha queda limpia
        // de campos generales y muestra solo los datos de gestión registral restantes.
        if (
          actividadSeleccionada === "defectos-registrales" &&
          ["tiene_defectos_abiertos", "tipo_error", "falta_defecto", "descripcion_error"].includes(campo.key)
        ) {
          return false;
        }

        // Estos datos no se muestran en la actividad con protocolo.
        if (
          actividadSeleccionada === "sede-notarial-protocolo" &&
          ["tipo_documento", "poblacion", "provincia", "tipo_firma"].includes(campo.key)
        ) {
          return false;
        }

        return true;
      });

      const vistos =
        new Set();

      return todos.filter(
        (campo) => {
          if (
            vistos.has(campo.key)
          ) {
            return false;
          }

          vistos.add(campo.key);

          return true;
        }
      );
    }, [
      actividadSeleccionada,
    ]);


  // ==========================================================
  // ABRIR ACTIVIDADES
  // ==========================================================

  const estadoLegadoBloqueante = ["LST","RST"].some((codigo) => String(expediente?.estado_expediente || "").trim().toUpperCase().startsWith(codigo));
  const motivoBloqueoExpediente = String(expediente?.estado_expediente || "").trim().toUpperCase().startsWith("LST") ? "LIQUIDADO SIN TRAMITAR" : String(expediente?.estado_expediente || "").trim().toUpperCase()==="RST" ? "RETENCIÓN SIN TRAMITAR" : expediente?.liquidado_sin_tramitar ? "LIQUIDADO SIN TRAMITAR" : expediente?.cambio_gestoria ? "CAMBIO DE GESTORÍA" : expediente?.bloqueo_manual ? (expediente?.motivo_bloqueo || "BLOQUEO MANUAL") : "";
  const expedienteBloqueado = Boolean(motivoBloqueoExpediente);
  const esRetencionSinTramitar = String(expediente?.estado_expediente || "").trim().toUpperCase() === "RST";
  useEffect(() => {
    setMostrarAvisoBloqueoExpediente(Boolean(expedienteBloqueado && !esRetencionSinTramitar));
  }, [id, expedienteBloqueado, esRetencionSinTramitar, motivoBloqueoExpediente]);
  function abrirControlExpediente() {
    setControlExpediente({ liquidado_sin_tramitar:Boolean(expediente?.liquidado_sin_tramitar)||String(expediente?.estado_expediente||"").trim().toUpperCase().startsWith("LST"), fecha_liquidacion_sin_tramitar:String(expediente?.fecha_liquidacion_sin_tramitar||"").slice(0,10), cambio_gestoria:Boolean(expediente?.cambio_gestoria), fecha_cambio_gestoria:String(expediente?.fecha_cambio_gestoria||"").slice(0,10), bloqueo_manual:Boolean(expediente?.bloqueo_manual), motivo_bloqueo:expediente?.motivo_bloqueo||"", fecha_bloqueo:String(expediente?.fecha_bloqueo||new Date().toLocaleDateString("sv-SE")).slice(0,10) });
    setErrorControlExpediente(""); setMostrarControlExpediente(true);
  }
  async function guardarControlExpediente() {
    const numero=expediente?.id_expediente||id; if(!numero||guardandoControlExpediente)return;
    if(controlExpediente.liquidado_sin_tramitar&&!controlExpediente.fecha_liquidacion_sin_tramitar)return setErrorControlExpediente("Indica la fecha de liquidación sin tramitar.");
    if(controlExpediente.cambio_gestoria&&!controlExpediente.fecha_cambio_gestoria)return setErrorControlExpediente("Indica la fecha del cambio de gestoría.");
    if(controlExpediente.bloqueo_manual&&!String(controlExpediente.motivo_bloqueo||"").trim())return setErrorControlExpediente("Indica el motivo del bloqueo manual.");
    setGuardandoControlExpediente(true);setErrorControlExpediente("");
    try { const res=await axios.put(`/expedientes/${encodeURIComponent(numero)}/control-bloqueo`,{...controlExpediente,fecha_liquidacion_sin_tramitar:controlExpediente.fecha_liquidacion_sin_tramitar||null,fecha_cambio_gestoria:controlExpediente.fecha_cambio_gestoria||null,fecha_bloqueo:controlExpediente.fecha_bloqueo||null});setExpediente((v)=>({...v,...(res?.data||controlExpediente)}));setMostrarControlExpediente(false); }
    catch(e){const detail=e?.response?.data?.detail;const mensaje=typeof detail==="string"?detail:Array.isArray(detail)?detail.map((item)=>item?.msg||"Error de validación").join(" · "):detail?.mensaje||"No se pudo guardar el control del expediente.";setErrorControlExpediente(mensaje);}
    finally{setGuardandoControlExpediente(false);}
  }

  function abrirActividades() {
    setActividadSeleccionada(actividadActual);
    const fechaFirma = String(expediente?.fecha_firma || "").slice(0, 10);
    setActividadDraft({
      ...(expediente || {}),
      ...Object.fromEntries((CAMPOS_ACTIVIDADES[actividadActual] || []).map((campo) => [campo.key, expediente?.[campo.key] ?? ""])),
      apoderado: expediente?.apoderado || "Gestoría",
      fecha_presentacion: expediente?.fecha_presentacion || fechaFirma,
      fecha_recogida_notario_presentacion_telematica:
        expediente?.fecha_recogida_notario_presentacion_telematica || fechaFirma,
      fecha_presentacion_tributaria:
        expediente?.fecha_presentacion_tributaria || fechaFirma,
      fecha_liquidacion_tributaria:
        expediente?.fecha_liquidacion_tributaria || fechaFirma,
      fecha_vencimiento_asiento:
        expediente?.fecha_vencimiento_asiento ||
        sumarDiasNaturales(expediente?.fecha_presentacion || fechaFirma, 60),
      mover_siguiente_actividad:
        expediente?.mover_siguiente_actividad ??
        (actividadActual === "liquidacion-impuestos" || actividadActual === "tramitacion-inscripcion"),
    });
    setErrorActividad("");
    setMensajeActividad("");
    if (expediente?.id_expediente) {
      const numeroExpediente = expediente.id_expediente;
      setCargandoEstadoAbsis(true);
      axios.get(`/expedientes/${encodeURIComponent(numeroExpediente)}/documentacion-previa/absis`)
        .then((res) => setEstadoDocumentacionAbsis((actual) => ({
          ...actual,
          ...(res?.data || {}),
          // Si nunca se ha guardado el estado, el selector empieza en NO.
          certificado_saldo_cero_erroneo: res?.data?.fecha_actualizacion
            ? Boolean(res.data.certificado_saldo_cero_erroneo)
            : false,
        })))
        .catch(() => {})
        .finally(() => setCargandoEstadoAbsis(false));

      // Sincroniza el checklist con los documentos reales de la carpeta digital.
      // Solo marca los requisitos cuyo documento está localizado; no desmarca
      // requisitos ya confirmados manualmente si la consulta no devuelve archivos.
      axios.get(`/expedientes/${encodeURIComponent(numeroExpediente)}/carpeta-digital`)
        .then((res) => {
          const documentos = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
          const normalizarCategoria = (valor) => normalizarTexto(valor).replace(/[^a-z0-9]/g, "");
          const categoriasPresentes = documentos.map((doc) => normalizarCategoria(
            doc?.categoria || doc?.categoria_nombre || doc?.repositorio || doc?.tipo_documento || ""
          ));
          const tieneCategoria = (...nombres) => nombres.some((nombre) => categoriasPresentes.includes(normalizarCategoria(nombre)));
          setEstadoDocumentacionAbsis((actual) => ({
            ...actual,
            solicitud_cancelacion_notarial: actual.solicitud_cancelacion_notarial || tieneCategoria("Hoja de Encargo firmada", "Hoja de encargo firmada"),
            certificado_cancelacion_administrativo: actual.certificado_cancelacion_administrativo || tieneCategoria("Justificante de cancelación"),
            nota_simple_registral: actual.nota_simple_registral || tieneCategoria("Nota simple registral"),
          }));
        })
        .catch(() => {
          // La ficha sigue siendo editable aunque la carpeta digital no responda.
        });
    }
  }

  async function guardarEstadoAbsis(registrarSolicitudPendiente = false) {
    if (!expediente?.id_expediente || registrandoSolicitudIntegracion) return;
    setRegistrandoSolicitudIntegracion(true);
    setErrorActividad("");
    setMensajeActividad("");
    let datosGuardados = false;
    try {
      const payload = { ...estadoDocumentacionAbsis };
      const res = await axios.put(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/absis`,
        payload
      );
      datosGuardados = true;
      setEstadoDocumentacionAbsis((actual) => ({ ...actual, ...(res?.data || payload) }));
      if (registrarSolicitudPendiente) {
        const solicitud = await axios.post(
          `/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/enviar-a-absis`
        );
        setEstadoDocumentacionAbsis((actual) => ({
          ...actual,
          ...(solicitud?.data || {}),
          enviado_a_absis: false,
          solicitud_registrada_localmente: true,
        }));
        setMensajeActividad(
          "Solicitud registrada localmente. No se ha transmitido a ABSIS; la API externa queda pendiente de implementación."
        );
      } else {
        setMensajeActividad("Datos guardados en el ERP. No se ha realizado ningún envío externo.");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const causa = typeof detail === "string" ? detail : detail?.mensaje || JSON.stringify(detail) || err?.message || "Error no especificado.";
      setErrorActividad(
        datosGuardados
          ? `Los datos quedaron guardados en el ERP, pero no se pudo registrar la solicitud pendiente: ${causa}`
          : `No se pudieron guardar los datos para la futura integración: ${causa}`
      );
    } finally {
      setRegistrandoSolicitudIntegracion(false);
    }
  }

  async function avanzarActividad() {
    if (!expediente?.id_expediente || guardandoActividad) return;

    if (actividadActual === "documentacion-previa" && !estadoDocumentacionAbsis.mover_siguiente_actividad) {
      setErrorActividad("Selecciona Sí en «Mover el expediente a la siguiente actividad» para confirmar el avance.");
      return;
    }

    setGuardandoActividad(true);
    setErrorActividad("");
    setMensajeActividad("");

    try {
      // Este selector solo pertenece al paso Documentación previa. En el resto
      // de actividades se ejecuta la validación de avance del backend directamente.
      if (actividadActual === "documentacion-previa") {
        await axios.put(
          `/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/absis`,
          estadoDocumentacionAbsis
        );
      }
      const response = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/avanzar-actividad`
      );
      await cargarExpediente();
      setActividadSeleccionada(resolverActividadActual(response?.data || expediente));
      setActividadDraft((actual) => ({ ...actual, ...(response?.data || {}) }));
      setMensajeActividad("La validación se ha completado y la actividad se ha actualizado correctamente.");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorActividad(
        typeof detail === "string"
          ? detail
          : detail?.mensaje
            ? `${detail.mensaje}${Array.isArray(detail.documentos_pendientes) ? ` Faltan: ${detail.documentos_pendientes.join(", ")}.` : ""}`
            : JSON.stringify(detail) || err?.message || "No se pudo avanzar la actividad."
      );
    } finally {
      setGuardandoActividad(false);
    }
  }

  async function enviarActividadAAbsis() {
    const numero = expediente?.id_expediente || id;
    if (!numero || !actividadSeleccionada || actividadSeleccionada === "gestion-economica" || registrandoSolicitudIntegracion) return;
    if (!fechaEnvioAbsis) {
      setErrorActividad("Indica la fecha de envío a ABSIS antes de registrar la solicitud.");
      return;
    }
    setRegistrandoSolicitudIntegracion(true);
    setErrorActividad("");
    setMensajeActividad("");
    try {
      const payload = {
        ...actividadDraft,
        fecha_envio_absis: fechaEnvioAbsis,
        estado_documentacion_absis: actividadSeleccionada === "documentacion-previa" ? estadoDocumentacionAbsis : undefined,
        solicitud_manual: true,
        mover_siguiente_actividad: false,
      };
      const respuesta = await axios.post(
        `/expedientes/${encodeURIComponent(numero)}/integraciones-pendientes/${encodeURIComponent(actividadSeleccionada)}`,
        payload
      );
      setMensajeActividad(
        `Solicitud de envío a ABSIS registrada (n.º ${respuesta?.data?.solicitud_id || "—"}). ` +
        "Importante: la conexión externa aún no está activa; no se ha transmitido información a ABSIS."
      );
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorActividad(typeof detail === "string" ? detail : detail?.mensaje || JSON.stringify(detail) || err?.message || "No se pudo registrar la solicitud de envío a ABSIS.");
    } finally {
      setRegistrandoSolicitudIntegracion(false);
    }
  }

  async function registrarSolicitudIntegracionPendiente(tipoActividad) {
    if (!expediente?.id_expediente || guardandoActividad || registrandoSolicitudIntegracion) return;
    const camposEspecificos = CAMPOS_ACTIVIDADES[tipoActividad] || [];
    const campos = {};
    for (const campo of camposEspecificos) {
      if (Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)) {
        campos[campo.key] = actividadDraft[campo.key] ?? "";
      }
    }
    if (actividadSeleccionada === "sede-notarial") {
      for (const key of ["fecha_envio_notario", "nombre_notario", "nif_notario"]) {
        if (Object.prototype.hasOwnProperty.call(actividadDraft, key)) {
          campos[key] = actividadDraft[key] ?? "";
        } else if (key === "fecha_envio_notario") {
          campos[key] = expediente?.fecha_envio_notario || expediente?.fecha_envio || "";
        } else {
          campos[key] = expediente?.[key] ?? "";
        }
      }
    }
    if (!Object.keys(campos).length) {
      setErrorActividad("No hay campos de esta actividad disponibles para registrar la solicitud.");
      return;
    }

    const moverSiguiente = Boolean(actividadDraft.mover_siguiente_actividad);
    setGuardandoActividad(true);
    setRegistrandoSolicitudIntegracion(true);
    setErrorActividad("");
    setMensajeActividad("");
    let datosActividadGuardados = false;
    try {
      // Primero se persisten los datos propios de la actividad en el ERP.
      await axios.put(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/actividad`,
        { campos }
      );
      datosActividadGuardados = true;
      // Esta ruta solo guarda una petición pendiente; no llama a ABSIS.
      const respuesta = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/integraciones-pendientes/${encodeURIComponent(tipoActividad)}`,
        { ...campos, mover_siguiente_actividad: moverSiguiente }
      );
      await cargarExpediente();
      setActividadDraft((actual) => ({ ...actual, ...campos }));
      const solicitudId = respuesta?.data?.solicitud_id;
      setMensajeActividad(
        `Datos guardados y petición registrada localmente${solicitudId ? ` (n.º ${solicitudId})` : ""}. No se ha transmitido a ABSIS ni se ha cambiado la actividad. ` +
        (moverSiguiente
          ? "La preferencia de avance ha quedado anotada para la futura integración; puedes validar el avance desde el botón de actividad."
          : "El expediente permanece en esta actividad.")
      );
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const causa = typeof detail === "string"
        ? detail
        : detail?.mensaje || JSON.stringify(detail) || err?.message || "Error no especificado.";
      setErrorActividad(
        datosActividadGuardados
          ? `Los datos de actividad se guardaron, pero no se pudo registrar la solicitud pendiente: ${causa}`
          : `No se pudieron guardar los datos de actividad: ${causa}`
      );
    } finally {
      setGuardandoActividad(false);
      setRegistrandoSolicitudIntegracion(false);
    }
  }


  async function calcularHonorariosGestoria() {
    const datos = expediente || {};
    const nombresEntidades = [
      datos.entidad_bancaria, datos.nombre_entidad, datos.entidad, datos.banco,
      datos.entidad_financiera, datos.entidad_solicitante, datos.entidad_original,
      datos.entidad_crediticia, datos.banco_acreedor,
      ...(Array.isArray(fincasExpediente) ? fincasExpediente.map((f) => f?.entidad_original) : []),
    ].filter((valor) => valor != null && String(valor).trim() !== "").map((valor) => String(valor).trim());
    const entidad = nombresEntidades.join(" ").toLowerCase();

    const normalizarNombre = (valor) => String(valor || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-ES")
      .replace(/[^a-z0-9]/g, "");
    // El catálogo conserva la entidad histórica y su sucesora en «Entidad actual».
    // Por eso no basta con buscar la palabra CaixaBank en el nombre original:
    // Banco de Murcia y otras entidades históricas pueden tener hoy esa sucesora.
    const respuestaBancos = await axios.get("/entidades-bancarias").catch(() => ({ data: [] }));
    const entidadesBancarias = Array.isArray(respuestaBancos?.data) ? respuestaBancos.data : [];
    const entidadesActuales = nombresEntidades.flatMap((nombreOrigen) => {
      const origenNormalizado = normalizarNombre(nombreOrigen);
      if (!origenNormalizado) return [];
      return entidadesBancarias
        .filter((banco) => {
          const nombreCatalogo = normalizarNombre(banco?.nombre);
          return nombreCatalogo.length >= 8 &&
            (nombreCatalogo === origenNormalizado ||
             nombreCatalogo.startsWith(origenNormalizado) ||
             origenNormalizado.startsWith(nombreCatalogo));
        })
        .map((banco) => banco?.entidad_actual || "");
    }).filter(Boolean);
    const entidadesParaTarifa = normalizarNombre(entidad + " " + entidadesActuales.join(" "));
    
    // Canarias se selecciona por ubicación fiscal, nunca por la existencia de provisión.
    const ubicacionFiscal = [
      datos.provincia, datos.nombre_provincia, datos.provincia_titular,
      datos.poblacion, datos.municipio, datos.direccion, datos.direccion_titular,
      datos.codigo_postal, datos.cp,
    ].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const esCanarias = /canarias|las palmas|santa cruz de tenerife|tenerife|gran canaria|lanzarote|fuerteventura|la palma|la gomera|el hierro/.test(ubicacionFiscal);
    const esCaixaBank = entidadesParaTarifa.includes("caixabank");
    const nombreTarifa = esCanarias
      ? "Honorarios de gestoría — Canarias"
      : esCaixaBank
        ? "Honorarios de gestoría — CaixaBank"
        : "Honorarios de gestoría — Otra entidad";

    const respuesta = await axios.get("/honorarios-gestoria?activos=true");
    const catalogo = Array.isArray(respuesta?.data) ? respuesta.data : [];
    const normalizarTarifa = (valor) => String(valor || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es-ES");
    const tarifa = catalogo.find((item) => normalizarTarifa(item.nombre) === normalizarTarifa(nombreTarifa));
    if (!tarifa) {
      throw new Error(`No se encuentra activa la tarifa «${nombreTarifa}» en el catálogo de Honorarios de gestoría. Abre Utilidades → Honorarios de gestoría y comprueba que esté activa.`);
    }
    const tipoImpuesto = String(tarifa.tipo_impuesto || "IVA").toUpperCase();
    const porcentajeImpuesto = tipoImpuesto === "EXENTO"
      ? 0
      : Math.max(0, Number(String(tarifa.porcentaje_impuesto ?? (tipoImpuesto === "IGIC" ? 7 : 21)).replace(",", ".")) || 0);
    const baseCatalogo = Number(String(tarifa.base_imponible ?? "").replace(",", "."));
    // "importe" en el catálogo es el total. Se prioriza siempre base_imponible.
    // Compatibilidad con registros antiguos sin base: reconstruirla desde el total.
    const base = Number.isFinite(baseCatalogo) && baseCatalogo >= 0
      ? baseCatalogo
      : Math.max(0, Number(String(tarifa.importe ?? "0").replace(",", ".")) / (1 + porcentajeImpuesto / 100));
    return {
      baseImponible: Number.isFinite(base) ? base : 0,
      tipoImpuesto,
      porcentajeImpuesto,
      tarifa: tarifa.nombre,
      entidad: entidad || "No identificada",
    };
  }

  function actualizarImportesFacturaHonorarios(formActual, cambios = {}) {
    const siguiente = { ...formActual, ...cambios };
    const base = Math.max(0, Number(String(siguiente.baseImponible ?? "0").replace(",", ".")) || 0);
    const porcentaje = Math.max(0, Number(String(siguiente.porcentajeImpuesto ?? "0").replace(",", ".")) || 0);
    const impuesto = Math.round((base * (porcentaje / 100) + Number.EPSILON) * 100) / 100;
    siguiente.importeImpuesto = impuesto.toFixed(2);
    siguiente.totalFactura = (Math.round((base + impuesto + Number.EPSILON) * 100) / 100).toFixed(2);
    return siguiente;
  }

  async function generarHonorariosGestoria() {
    if (!expediente?.id_expediente || generandoHonorariosGestoria) return;

    // Abrir primero la ventana. La consulta del catálogo nunca debe retrasar
    // ni sustituir la apertura del modal por una generación directa.
    const datos = expediente || {};
    const nombreCliente = datos.nombre_titular || datos.nombre_solicitante || datos.titular || "";
    const nifCliente = datos.nif_titular || datos.nif_solicitante || datos.nif || "";
    const saldo = datos.saldo_disponible ?? datos.saldo_real ?? "";
    setErrorHonorariosGestoria("");
    setMensajeHonorariosGestoria("");
    setPrevisualizandoFacturaHonorarios(false);
    setFacturaHonorariosForm({
      cliente: String(datos.facturacion_nombre || datos.nombre_facturacion || nombreCliente || ""),
      nifCliente: String(datos.facturacion_dni_nif || datos.dni_facturacion || datos.nif_facturacion || nifCliente || ""),
      direccion: String(datos.facturacion_direccion || datos.direccion_facturacion || ""),
      codigoPostal: String(datos.facturacion_codigo_postal || datos.codigo_postal_facturacion || ""),
      poblacion: String(datos.facturacion_poblacion || datos.poblacion_facturacion || ""),
      provincia: String(datos.facturacion_provincia || datos.provincia_facturacion || ""),
      numeroFactura: "",
      fechaFactura: new Date().toISOString().slice(0, 10),
      concepto: "Honorarios de gestoría",
      baseImponible: "0.00",
      tipoImpuesto: "IVA",
      porcentajeImpuesto: "21",
      importeImpuesto: "0.00",
      totalFactura: "0.00",
      provisionFondos: String(datos.importe ?? "0"),
      saldoDisponible: String(saldo ?? "0"),
      tarifa: "",
      entidad: "",
      observaciones: "",
    });
    const empleadoInicial = [true, "true", "1", "si", "sí"].includes(String(datos.facturacion_empleado ?? false).trim().toLowerCase());
    setEmpleadoEnFactura(empleadoInicial);
    setBaseHonorariosOriginal(0);
    setMostrarModalFacturaHonorarios(true);
    setGenerandoHonorariosGestoria(true);

    try {
      const calculo = await calcularHonorariosGestoria();
      const baseOriginal = Math.round((Math.max(0, Number(calculo.baseImponible) || 0) + Number.EPSILON) * 100) / 100;
      const esEmpleado = [true, "true", "1", "si", "sí"].includes(String(expediente?.facturacion_empleado ?? false).trim().toLowerCase());
      setEmpleadoEnFactura(esEmpleado);
      setBaseHonorariosOriginal(baseOriginal);
      const descuentoEmpleado = esEmpleado ? Math.round((baseOriginal * 0.5 + Number.EPSILON) * 100) / 100 : 0;
      const base = Math.round((baseOriginal - descuentoEmpleado + Number.EPSILON) * 100) / 100;
      const tipoImpuesto = String(calculo.tipoImpuesto || "IVA").toUpperCase();
      const porcentaje = tipoImpuesto === "EXENTO" ? 0 : Math.max(0, Number(calculo.porcentajeImpuesto) || 0);
      setFacturaHonorariosForm((actual) => actualizarImportesFacturaHonorarios({
        ...actual,
        baseImponible: base.toFixed(2),
        observaciones: esEmpleado ? `Cliente empleado: descuento del 50 % (${descuentoEmpleado.toFixed(2)} €) sobre honorarios.` : actual.observaciones,
        tipoImpuesto,
        porcentajeImpuesto: String(porcentaje),
        tarifa: calculo.tarifa,
        entidad: calculo.entidad,
      }));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorHonorariosGestoria(
        typeof detail === "string" ? detail :
        detail?.mensaje || err?.message ||
        "No se pudo cargar la tarifa de honorarios. Puedes revisar el catálogo y volver a intentarlo."
      );
    } finally {
      setGenerandoHonorariosGestoria(false);
    }
  }

  async function confirmarFacturaHonorarios() {
    if (!expediente?.id_expediente || guardandoFacturaHonorarios) return;
    setGuardandoFacturaHonorarios(true);
    setErrorHonorariosGestoria("");
    setMensajeHonorariosGestoria("");
    try {
      const base = Math.round((Math.max(0, Number(String(facturaHonorariosForm.baseImponible).replace(",", ".")) || 0) + Number.EPSILON) * 100) / 100;
      const porcentaje = Math.max(0, Number(String(facturaHonorariosForm.porcentajeImpuesto).replace(",", ".")) || 0);
      const tipoImpuesto = String(facturaHonorariosForm.tipoImpuesto || "IVA").toUpperCase();
      const impuesto = tipoImpuesto === "EXENTO" ? 0 : Math.round((base * porcentaje / 100 + Number.EPSILON) * 100) / 100;
      const total = Math.round((base + impuesto + Number.EPSILON) * 100) / 100;
      const baseOriginal = Math.max(0, Number(baseHonorariosOriginal) || 0);
      const descuentoEmpleado = empleadoEnFactura
        ? Math.round((baseOriginal * 0.5 + Number.EPSILON) * 100) / 100
        : 0;
      const payloadFactura = {
        importe: total,
        tarifa: facturaHonorariosForm.tarifa,
        concepto: facturaHonorariosForm.concepto || "Honorarios de gestoría",
        entidad: facturaHonorariosForm.entidad,
        id_expediente: expediente.id_expediente,
        cliente: facturaHonorariosForm.cliente,
        nif_cliente: facturaHonorariosForm.nifCliente,
        direccion_facturacion: facturaHonorariosForm.direccion,
        codigo_postal_facturacion: facturaHonorariosForm.codigoPostal,
        poblacion_facturacion: facturaHonorariosForm.poblacion,
        provincia_facturacion: facturaHonorariosForm.provincia,
        numero_factura: facturaHonorariosForm.numeroFactura,
        fecha_factura: facturaHonorariosForm.fechaFactura,
        base_imponible: base,
        empleado: Boolean(empleadoEnFactura),
        descuento_empleado: descuentoEmpleado,
        tipo_impuesto: tipoImpuesto,
        porcentaje_impuesto: porcentaje,
        importe_impuesto: impuesto,
        total_factura: total,
        observaciones: facturaHonorariosForm.observaciones,
      };

      // El backend asigna el número correlativo VI/NNNNN-AA,
      // genera el PDF oficial y conserva la factura como pendiente de registro.
      const documentoFactura = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/honorarios-gestoria/factura-pdf`,
        payloadFactura,
        { responseType: "blob" }
      );
      const numeroAsignado = String(documentoFactura?.headers?.["x-numero-factura"] || "").trim();
      if (!numeroAsignado) {
        throw new Error("El PDF se ha generado, pero el servidor no ha devuelto el número de factura VI. No se ha confirmado el registro definitivo.");
      }
      payloadFactura.numero_factura = numeroAsignado;
      setFacturaHonorariosForm(actual => ({ ...actual, numeroFactura: numeroAsignado }));

      // El segundo paso registra los honorarios y confirma la factura; ambos
      // quedan asociados al expediente y habilitan el cierre cuando procede.
      const respuesta = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/honorarios-gestoria/generar`,
        payloadFactura
      );

      setHonorariosGestoria({
        importe: total,
        numeroFactura: numeroAsignado,
        fechaFactura: facturaHonorariosForm.fechaFactura,
        tarifa: facturaHonorariosForm.tarifa,
        entidad: facturaHonorariosForm.entidad,
        ...(respuesta?.data || {}),
        guardado: true,
      });

      const urlFactura = URL.createObjectURL(documentoFactura.data instanceof Blob ? documentoFactura.data : new Blob([documentoFactura.data]));
      const enlaceFactura = document.createElement("a");
      enlaceFactura.href = urlFactura;
      enlaceFactura.download = `Factura_${numeroAsignado}_Expediente_${String(expediente.id_expediente).replace(/[/\\\\]/g, "-")}.pdf`;
      document.body.appendChild(enlaceFactura);
      enlaceFactura.click();
      enlaceFactura.remove();
      URL.revokeObjectURL(urlFactura);

      setMensajeHonorariosGestoria(`Factura ${numeroAsignado} registrada correctamente y asociada al expediente ${expediente.id_expediente}. PDF oficial generado.`);
      setMostrarModalFacturaHonorarios(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorHonorariosGestoria(
        typeof detail === "string" ? detail :
        detail?.mensaje || err?.message ||
        "No se pudieron registrar los honorarios o generar la factura Word. No se ha confirmado la operación."
      );
    } finally {
      setGuardandoFacturaHonorarios(false);
    }
  }

  async function guardarCamposActividad() {
    if (!expediente?.id_expediente || guardandoActividad) return;
    const camposEspecificos = CAMPOS_ACTIVIDADES[actividadSeleccionada] || [];
    const campos = {};
    for (const campo of camposEspecificos) {
      if (Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)) {
        campos[campo.key] = actividadDraft[campo.key] ?? "";
      }
    }
    // En Documentación previa la fecha de envío no se edita aquí:
    // es un dato único, enlazado y mantenido por el modal «Enviar a notario».
    // No incluir fecha_envio_notario en este guardado evita sobrescribirla.
    if (actividadSeleccionada === "sede-notarial") {
      // Sede notarial no tiene campos en CAMPOS_ACTIVIDADES: sus datos
      // editables viven en el bloque de integración del modal.
      for (const key of ["fecha_envio_notario", "nombre_notario", "nif_notario"]) {
        campos[key] = Object.prototype.hasOwnProperty.call(actividadDraft, key)
          ? (actividadDraft[key] ?? "")
          : (expediente?.[key] ?? "");
      }
    }
    if (actividadSeleccionada === "sede-notarial-protocolo") {
      for (const key of [
        "nombre_notario", "nif_notario", "apoderado", "tipo_gestoria", "tipo_firma",
        "fecha_firma", "protocolo", "asiento_presentacion", "libro_diario",
        "fecha_presentacion", "numero_entrada",
        "fecha_recogida_notario_presentacion_telematica",
      ]) {
        const gestoriaPorDefecto = Number(expediente?.apoderado_empleado_id) === 7
          ? "CaixaBank"
          : "Gestoría";
        const valorPorDefecto = key === "tipo_gestoria"
          ? (expediente?.tipo_gestoria || gestoriaPorDefecto)
          : (key === "apoderado" ? (expediente?.apoderado || "") : (expediente?.[key] ?? ""));
        campos[key] = Object.prototype.hasOwnProperty.call(actividadDraft, key)
          ? (actividadDraft[key] ?? "")
          : valorPorDefecto;
      }
    }
    if (!Object.keys(campos).length) {
      setErrorActividad("Esta actividad no tiene campos editables disponibles en el expediente.");
      return;
    }

    // Validaciones cronológicas del modal: la firma debe producirse antes
    // de la presentación registral y la inscripción no puede precederla.
    const fechaFirmaValidar = String(campos.fecha_firma ?? actividadDraft.fecha_firma ?? "").slice(0, 10);
    const fechaPresentacionValidar = String(campos.fecha_presentacion ?? actividadDraft.fecha_presentacion ?? "").slice(0, 10);
    const fechaInscripcionValidar = String(campos.fecha_inscripcion ?? actividadDraft.fecha_inscripcion ?? "").slice(0, 10);
    const fechaVencimientoValidar = String(campos.fecha_vencimiento_asiento ?? actividadDraft.fecha_vencimiento_asiento ?? "").slice(0, 10);

    if (
      actividadSeleccionada === "sede-notarial-protocolo" &&
      fechaFirmaValidar && fechaPresentacionValidar &&
      fechaFirmaValidar > fechaPresentacionValidar
    ) {
      setErrorActividad("La fecha de firma no puede ser posterior a la fecha de presentación.");
      return;
    }

    if (
      actividadSeleccionada === "tramitacion-inscripcion" &&
      fechaPresentacionValidar && fechaVencimientoValidar &&
      fechaVencimientoValidar < fechaPresentacionValidar
    ) {
      setErrorActividad("La fecha de vencimiento del asiento no puede ser anterior a la fecha de presentación.");
      return;
    }

    if (
      actividadSeleccionada === "tramitacion-inscripcion" &&
      fechaPresentacionValidar && fechaInscripcionValidar &&
      fechaInscripcionValidar < fechaPresentacionValidar
    ) {
      setErrorActividad("La fecha de inscripción no puede ser anterior a la fecha de presentación.");
      return;
    }

    setGuardandoActividad(true);
    setErrorActividad("");
    setMensajeActividad("");
    try {
      const response = await axios.put(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/actividad`,
        { campos }
      );
      // Documentación previa guarda también el checklist de documentos para la
      // futura integración ABSIS. Este endpoint solo persiste datos en el ERP.
      if (actividadSeleccionada === "documentacion-previa") {
        await axios.put(
          `/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/absis`,
          estadoDocumentacionAbsis
        );
      }
      await cargarExpediente();
      setActividadDraft((actual) => ({ ...actual, ...(response?.data || {}) }));
      setMensajeActividad(
        actividadSeleccionada === "documentacion-previa"
          ? "Datos de actividad y checklist guardados en el ERP. La integración con la API de ABSIS sigue pendiente."
          : "Los datos de la actividad se han guardado."
      );
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorActividad(
        typeof detail === "string"
          ? detail
          : detail?.mensaje || JSON.stringify(detail) ||
            err?.message || "No se pudieron guardar los datos de la actividad."
      );
    } finally {
      setGuardandoActividad(false);
    }
  }


  // ==========================================================
  // ENVIAR A NOTARIO
  // ==========================================================

  async function guardarEnviarANotario(
    payload
  ) {
    await enviarExpedienteANotario(
      expediente.id_expediente,
      payload
    );

    // Una vez guardados los datos del envío, solicitar el avance de actividad.
    // El backend valida los documentos obligatorios antes de cambiarla.
    const transicion = await axios.post(
      `/expedientes/${encodeURIComponent(expediente.id_expediente)}/avanzar-actividad`,
      {
        actividad_destino: "Sede notarial",
        confirmar_envio_notario: true,
      }
    );
    await cargarExpediente();
    setActividadSeleccionada(resolverActividadActual(transicion?.data || expediente));
    setActividadDraft((actual) => ({
      ...actual,
      ...(transicion?.data || {}),
      fecha_envio_notario: payload?.fecha_envio || actual.fecha_envio_notario || "",
      fecha_fin_actividad: payload?.fecha_envio || actual.fecha_fin_actividad || "",
    }));
    setMensajeActividad("Envío a notario guardado y actividad actualizada. La transmisión a ABSIS queda pendiente de la API.");
    setMostrarEnviarNotario(false);
  }


  // ==========================================================
  // GASTOS DEL EXPEDIENTE
  // ==========================================================

  async function cargarGastosExpediente() {
    const expedienteId = expediente?.id ?? (Number.isFinite(Number(id)) ? Number(id) : null);
    if (!expedienteId) return { lista: [], pagosPorGasto: {} };

    setCargandoGastos(true);
    setErrorGastos("");
    try {
      const respuesta = await axios.get(
        `/expedientes/${encodeURIComponent(expedienteId)}/gastos`
      );
      const datos = respuesta?.data;
      const lista = Array.isArray(datos)
        ? datos
        : Array.isArray(datos?.items)
          ? datos.items
          : Array.isArray(datos?.gastos)
            ? datos.gastos
            : [];
      setGastosExpediente(lista);
      // El histórico de pagos se consulta por obligación. Si una obligación es antigua,
      // sin movimientos nuevos, se conserva su estado histórico sin inventar pagos.
      const pagosCargados = await Promise.all(lista.map(async (gasto) => {
        try {
          const respuestaPagos = await axios.get(`/expedientes/${encodeURIComponent(expedienteId)}/gastos/${encodeURIComponent(gasto.id)}/pagos`);
          return [String(gasto.id), Array.isArray(respuestaPagos?.data?.items) ? respuestaPagos.data.items : []];
        } catch {
          return [String(gasto.id), []];
        }
      }));
      const mapaPagos = Object.fromEntries(pagosCargados);
      setPagosPorGasto(mapaPagos);
      // Si hay movimientos, abrir el libro al cargar o actualizar.
      if (lista.length > 0) setMostrarPanelEconomicoPago(true);
      return { lista, pagosPorGasto: mapaPagos };
    } catch (err) {
      setErrorGastos(
        err?.response?.data?.detail ||
        "No se pudieron cargar los gastos del expediente."
      );
      return { lista: [], pagosPorGasto: {} };
    } finally {
      setCargandoGastos(false);
    }
  }

  async function guardarGastoExpediente(event) {
    event.preventDefault();
    const expedienteId = expediente?.id ?? (Number.isFinite(Number(id)) ? Number(id) : null);
    const brutoIntroducido = numeroDecimalGasto(gastoForm.importe_total_bruto);

    if (!expedienteId) {
      setErrorGastos("No se ha identificado el expediente.");
      return;
    }
    if (!gastoForm.tipo.trim()) {
      setErrorGastos("Indica el tipo de gasto.");
      return;
    }
    if (!gastoForm.descripcion.trim()) {
      setErrorGastos("Indica la descripción del gasto.");
      return;
    }
    if (gastoForm.importe_total_bruto === "" || !Number.isFinite(brutoIntroducido) || brutoIntroducido < 0) {
      setErrorGastos("Indica un importe bruto de factura válido.");
      return;
    }
    if (!Number.isFinite(resultadoCalculadoGasto) || resultadoCalculadoGasto < 0) {
      setErrorGastos("El resultado neto no puede ser negativo. Revisa el bruto y la retención.");
      return;
    }
    if (!gastoForm.fecha) {
      setErrorGastos("Indica la fecha del gasto.");
      return;
    }

    setGuardandoGasto(true);
    setErrorGastos("");
    setMensajeGastos("");
    try {
      const payloadGasto = {
          tipo: gastoForm.tipo.trim(), descripcion: gastoForm.descripcion.trim(), importe: resultadoCalculadoGasto, fecha: gastoForm.fecha,
          documento_url: gastoForm.documento_url.trim() || null,
          nif_notario: gastoForm.nif_notario.trim() || null, nombre_notario: gastoForm.nombre_notario.trim() || null,
          pagador: gastoForm.pagador.trim() || null, cuenta_bancaria: gastoForm.cuenta_bancaria.trim() || null,
          medio_pago: gastoForm.medio_pago || null, numero_factura: gastoForm.numero_factura.trim() || null,
          tipo_concepto_absis: gastoForm.tipo_concepto_absis || null, origen_registro: "ERP",
          estado_consolidacion: "Pendiente envío",
          fecha_factura: gastoForm.fecha_factura || null, importe_total_bruto: brutoCalculadoGasto,
          base_exenta_impuestos: numeroDecimalGasto(gastoForm.base_exenta_impuestos), base_sujeta_impuestos: baseImponibleGasto,
          tramo_impuesto: gastoForm.tramo_impuesto || null, tipo_impuesto: gastoForm.tipo_impuesto || null,
          porcentaje_impuesto: numeroDecimalGasto(gastoForm.porcentaje_impuesto), importe_impuesto: impuestoCalculadoGasto,
          base_exenta_retencion: numeroDecimalGasto(gastoForm.base_exenta_retencion), base_sujeta_retencion: numeroDecimalGasto(gastoForm.base_sujeta_retencion),
          tipo_retencion: gastoForm.tipo_retencion || null, porcentaje_retencion: numeroDecimalGasto(gastoForm.porcentaje_retencion), importe_retencion: retencionCalculadaGasto,
          importe_resultante: resultadoCalculadoGasto, documento_carpeta_id: gastoForm.documento_carpeta_id ? Number(gastoForm.documento_carpeta_id) : null,
          estado_pago: "Pendiente",
        };
      const urlGastos = `/expedientes/${encodeURIComponent(expedienteId)}/gastos`;
      const respuestaGasto = gastoEdicionId
        ? await axios.put(`${urlGastos}/${encodeURIComponent(gastoEdicionId)}`, payloadGasto)
        : await axios.post(urlGastos, payloadGasto);
      let avisoIntegracion = "";
      if (gastoForm.tipo_concepto_absis && respuestaGasto?.data?.id) {
        try {
          const solicitud = await axios.post(
            `/expedientes/${encodeURIComponent(expedienteId)}/gastos/${encodeURIComponent(respuestaGasto.data.id)}/integracion-absis`
          );
          avisoIntegracion = solicitud?.data?.transmitido_a_absis
            ? " Enviado a ABSIS."
            : " Solicitud de integración registrada para Informática; todavía no se ha transmitido a ABSIS.";
        } catch {
          avisoIntegracion = " El gasto se ha guardado, pero no se pudo registrar la solicitud pendiente de integración.";
        }
      }
      setGastoEdicionId(null);
      setGastoForm({ tipo: "", tipo_concepto_absis: "", descripcion: "", importe: "", fecha: new Date().toLocaleDateString("sv-SE"), documento_url: "", nif_notario: "", nombre_notario: "", pagador: "", cuenta_bancaria: "", medio_pago: "Transferencia", numero_factura: "", fecha_factura: new Date().toLocaleDateString("sv-SE"), importe_total_bruto: "", base_exenta_impuestos: "0.00", base_sujeta_impuestos: "", tramo_impuesto: "General", tipo_impuesto: "IVA 21%", porcentaje_impuesto: "21", base_exenta_retencion: "0.00", base_sujeta_retencion: "0.00", tipo_retencion: "IRPF profesionales", porcentaje_retencion: "15", documento_carpeta_id: "", estado_pago: "Pendiente" });
      setMensajeGastos(`${gastoEdicionId ? "La obligación económica se ha actualizado" : "El gasto se ha registrado correctamente"}.${avisoIntegracion}`);
      setMostrarFormularioGasto(false);
      setHonorarioGestoriaId("");
      await cargarGastosExpediente();
    } catch (err) {
      const detalle = err?.response?.data?.detail;
      setErrorGastos(
        typeof detalle === "string"
          ? detalle
          : "No se pudo registrar el gasto. Comprueba los campos requeridos por el router de gastos."
      );
    } finally {
      setGuardandoGasto(false);
    }
  }

  async function abrirPagoDesdeGestionEconomica(gastoIdObjetivo = null) {
    setOrigenFormularioGasto("pagar");
    setErrorGastos("");
    setMensajeGastos("");
    setErrorPagoReal("");
    const resultado = await cargarGastosExpediente();
    const lista = resultado?.lista || [];
    const mapaPagos = resultado?.pagosPorGasto || {};
    if (!gastoIdObjetivo) {
      setMostrarFormularioPagoReal(false);
      setMostrarFormularioGasto(false);
      setPagoGastoSeleccionadoId("");
      return;
    }
    const pendientes = lista.filter((gasto) => String(gasto.id) === String(gastoIdObjetivo)).filter((gasto) => {
      const estado = String(gasto.estado_pago || "").trim().toLowerCase();
      if (estado.includes("anulad") || estadosPagoConfirmado.includes(estado)) return false;
      const totalPagado = (mapaPagos[String(gasto.id)] || []).filter((pago) => !pago.anulado_en).reduce((suma, pago) => suma + Number(pago.importe || 0), 0);
      const importeObligacion = Number(gasto.importe_resultante ?? gasto.importe ?? 0);
      return importeObligacion <= 0 || totalPagado + 0.005 < importeObligacion;
    });
    const sinImporte = pendientes.find((gasto) => !(Number(gasto.importe_resultante ?? gasto.importe ?? 0) > 0));
    if (sinImporte) {
      setGastoEdicionId(sinImporte.id);
      setGastoForm((actual) => ({
        ...actual,
        tipo: sinImporte.tipo || actual.tipo || "",
        descripcion: sinImporte.descripcion || actual.descripcion || "",
        documento_carpeta_id: sinImporte.documento_carpeta_id ? String(sinImporte.documento_carpeta_id) : "",
        importe: "",
        importe_total_bruto: "",
        fecha: sinImporte.fecha || new Date().toLocaleDateString("sv-SE"),
        fecha_factura: sinImporte.fecha_factura || sinImporte.fecha || new Date().toLocaleDateString("sv-SE"),
        estado_pago: "Pendiente",
      }));
      setMostrarFormularioPagoReal(false);
      setMostrarFormularioGasto(true);
      return;
    }
    if (pendientes.length) {
      const gasto = pendientes[0];
      abrirOrdenPago(gasto);
      return;
    }
    setGastoEdicionId(null);
    setPagoGastoSeleccionadoId("");
    setMostrarFormularioPagoReal(false);
    setMostrarFormularioGasto(true);
    setGastoForm((actual) => ({
      ...actual,
      tipo: actual.tipo || "",
      descripcion: "",
      documento_carpeta_id: "",
      importe: "",
      importe_total_bruto: "",
      estado_pago: "Pendiente",
    }));
    setGastoForm((actual) => ({
      ...actual,
      nif_notario: actual.nif_notario || expediente?.nif_notario || expediente?.notario_nif || "",
      nombre_notario: actual.nombre_notario || expediente?.notario || expediente?.nombre_notario || "",
      pagador: actual.pagador || [expediente?.facturacion_nombre, expediente?.facturacion_apellidos].filter(Boolean).join(" "),
      cuenta_bancaria: actual.cuenta_bancaria || "",
    }));
    void cargarCuentasBancariasNotarioParaPago();
  }

  async function anularPagoGasto(movimiento) {
    if (!esAdministradorSesion || !movimiento?.gasto_id || !movimiento?.pago_id || movimiento.anulado_en) return;
    const motivo = window.prompt("Indica el motivo de la anulación del pago:");
    if (!motivo || motivo.trim().length < 5) {
      setErrorPagoReal("La anulación requiere un motivo de al menos 5 caracteres.");
      return;
    }
    try {
      setErrorPagoReal("");
      await axios.post("/expedientes/" + encodeURIComponent(expediente?.id ?? id) + "/gastos/" + encodeURIComponent(movimiento.gasto_id) + "/pagos/" + encodeURIComponent(movimiento.pago_id) + "/anular", { motivo: motivo.trim() });
      setMensajeGastos("Pago PAG-" + String(movimiento.pago_id).padStart(6, "0") + " anulado; se conserva en el histórico.");
      await cargarGastosExpediente();
    } catch (err) {
      setErrorPagoReal(err?.response?.data?.detail || "No se pudo anular el pago.");
    }
  }

  function abrirOrdenPago(gasto) {
    if (!gasto?.id) {
      setErrorPagoReal("No se ha identificado la obligación económica que se va a pagar.");
      return;
    }
    const pagos = (pagosPorGasto[String(gasto.id)] || []).filter((pago) => !pago.anulado_en);
    const totalPagado = pagos.reduce((suma, pago) => suma + Number(pago.importe || 0), 0);
    const importeObligacion = Number(gasto.importe_resultante ?? gasto.importe ?? 0);
    const restante = Math.max(0, importeObligacion - totalPagado);
    const hoy = new Date().toLocaleDateString("sv-SE");
    setOrigenFormularioGasto("pagar");
    setPagoGastoSeleccionadoId(String(gasto.id));
    setPagoRealForm({
      fecha: hoy,
      importe: restante.toFixed(2),
      concepto: String(gasto.tipo || "Gasto") + " · " + String(gasto.descripcion || gasto.numero_documento || gasto.id),
      medio_pago: "Transferencia",
      idempotency_key: "erp-pago-" + gasto.id + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10),
    });
    setGastoForm((actual) => ({
      ...actual,
      tipo: gasto.tipo || actual.tipo || "Factura de notaría",
      descripcion: gasto.descripcion || actual.descripcion || "",
      nif_notario: expediente?.nif_notario || expediente?.notario_nif || gasto.nif_notario || "",
      nombre_notario: expediente?.nombre_notario || expediente?.notario || gasto.nombre_notario || "",
      pagador: [expediente?.facturacion_nombre, expediente?.facturacion_apellidos].filter(Boolean).join(" ") || gasto.pagador || "",
      cuenta_bancaria: gasto.cuenta_bancaria || "",
      medio_pago: "Transferencia",
      numero_factura: gasto.numero_factura || gasto.numero_documento || "",
      fecha_factura: gasto.fecha_factura || "",
      importe_total_bruto: String(gasto.importe_total_bruto ?? gasto.importe_resultante ?? gasto.importe ?? ""),
      base_exenta_impuestos: String(gasto.base_exenta_impuestos ?? ""),
      base_sujeta_impuestos: String(gasto.base_sujeta_impuestos ?? ""),
      tramo_impuesto: gasto.tramo_impuesto || "General",
      tipo_impuesto: gasto.tipo_impuesto || "IVA 21%",
      porcentaje_impuesto: String(gasto.porcentaje_impuesto ?? 21),
      base_exenta_retencion: String(gasto.base_exenta_retencion ?? "0"),
      base_sujeta_retencion: String(gasto.base_sujeta_retencion ?? "0"),
      tipo_retencion: gasto.tipo_retencion || "Sin retención",
      porcentaje_retencion: String(gasto.porcentaje_retencion ?? 0),
      importe: String(gasto.importe_resultante ?? gasto.importe ?? ""),
      fecha: gasto.fecha || hoy,
      estado_pago: "Pendiente",
      documento_carpeta_id: gasto.documento_carpeta_id ? String(gasto.documento_carpeta_id) : "",
    }));
    setErrorPagoReal("");
    setErrorGastos("");
    setMostrarFormularioGasto(false);
    setMostrarFormularioPagoReal(true);
    void cargarCuentasBancariasNotarioParaPago();
  }

  async function registrarPagoObligacion(event) {
    event.preventDefault();
    const expedienteId = expediente?.id ?? (Number.isFinite(Number(id)) ? Number(id) : null);
    const gastoId = Number(pagoGastoSeleccionadoId);
    const importe = numeroDecimalGasto(pagoRealForm.importe);
    if (!expedienteId || !gastoId) {
      setErrorPagoReal("Selecciona una obligación económica pendiente.");
      return;
    }
    if (!pagoRealForm.fecha || !Number.isFinite(importe) || importe <= 0 || !pagoRealForm.concepto.trim()) {
      setErrorPagoReal("Indica fecha, importe mayor que cero y concepto del pago.");
      return;
    }
    const gasto = gastosExpediente.find((item) => Number(item.id) === gastoId);
    if (!gasto) {
      setErrorPagoReal("La obligación seleccionada ya no está disponible. Actualiza el libro económico.");
      return;
    }
    const claveOperacion = pagoRealForm.idempotency_key || ("erp-pago-" + gastoId + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10));
    setGuardandoPagoReal(true);
    setErrorPagoReal("");
    try {
      // Guardar los datos fiscales y bancarios en la obligación existente antes de registrar el pago.
      // No se modifica el importe de la obligación ni su estado; el pago sigue siendo un movimiento independiente.
      const importeFacturaActual = Number(gasto.importe_total_bruto ?? gasto.importe_resultante ?? gasto.importe ?? 0);
      await axios.put(`/expedientes/${encodeURIComponent(expedienteId)}/gastos/${encodeURIComponent(gastoId)}`, {
        tipo: gasto.tipo || gastoForm.tipo || "Gasto",
        descripcion: gasto.descripcion || gastoForm.descripcion || "",
        importe: Number(gasto.importe_resultante ?? gasto.importe ?? importeFacturaActual),
        fecha: gasto.fecha || pagoRealForm.fecha,
        nif_notario: gastoForm.nif_notario || expediente?.nif_notario || expediente?.notario_nif || null,
        nombre_notario: gastoForm.nombre_notario || expediente?.nombre_notario || expediente?.notario || null,
        pagador: gastoForm.pagador || [expediente?.facturacion_nombre, expediente?.facturacion_apellidos].filter(Boolean).join(" ") || null,
        cuenta_bancaria: gastoForm.cuenta_bancaria || null,
        medio_pago: "Transferencia",
        numero_factura: gastoForm.numero_factura || null,
        fecha_factura: gastoForm.fecha_factura || null,
        importe_total_bruto: numeroDecimalGasto(gastoForm.importe_total_bruto) || importeFacturaActual,
        base_exenta_impuestos: gastoForm.base_exenta_impuestos === "" ? (gasto.base_exenta_impuestos ?? null) : numeroDecimalGasto(gastoForm.base_exenta_impuestos),
        base_sujeta_impuestos: gastoForm.base_sujeta_impuestos === "" ? (gasto.base_sujeta_impuestos ?? null) : numeroDecimalGasto(gastoForm.base_sujeta_impuestos),
        tramo_impuesto: gastoForm.tramo_impuesto || gasto.tramo_impuesto || null,
        tipo_impuesto: gastoForm.tipo_impuesto || gasto.tipo_impuesto || null,
        porcentaje_impuesto: gastoForm.porcentaje_impuesto === "" ? (gasto.porcentaje_impuesto ?? null) : numeroDecimalGasto(gastoForm.porcentaje_impuesto),
        importe_impuesto: gasto.importe_impuesto ?? null,
        base_exenta_retencion: gastoForm.base_exenta_retencion === "" ? (gasto.base_exenta_retencion ?? null) : numeroDecimalGasto(gastoForm.base_exenta_retencion),
        base_sujeta_retencion: gastoForm.base_sujeta_retencion === "" ? (gasto.base_sujeta_retencion ?? null) : numeroDecimalGasto(gastoForm.base_sujeta_retencion),
        tipo_retencion: gastoForm.tipo_retencion || gasto.tipo_retencion || null,
        porcentaje_retencion: gastoForm.porcentaje_retencion === "" ? (gasto.porcentaje_retencion ?? null) : numeroDecimalGasto(gastoForm.porcentaje_retencion),
        importe_retencion: gasto.importe_retencion ?? null,
        importe_resultante: Number(gasto.importe_resultante ?? gasto.importe ?? importeFacturaActual),
        documento_carpeta_id: gasto.documento_carpeta_id || null,
        estado_pago: gasto.estado_pago || "Pendiente",
      });
      await axios.post(`/expedientes/${encodeURIComponent(expedienteId)}/gastos/${encodeURIComponent(gastoId)}/pagos`, {
        fecha: pagoRealForm.fecha,
        importe,
        concepto: pagoRealForm.concepto.trim(),
        medio_pago: "Transferencia",
        idempotency_key: claveOperacion,
      });
      setPagoRealForm({ fecha: new Date().toLocaleDateString("sv-SE"), importe: "", concepto: "", medio_pago: "Transferencia", idempotency_key: "erp-pago-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) });
      setMostrarFormularioPagoReal(false);
      setPagoGastoSeleccionadoId("");
      setErrorPagoReal("");
      setMensajeGastos("Pago registrado en el histórico de movimientos.");
      await cargarGastosExpediente();
    } catch (err) {
      setErrorPagoReal(err?.response?.data?.detail || "No se pudo registrar el pago. No se ha confirmado ningún movimiento.");
    } finally {
      setGuardandoPagoReal(false);
    }
  }

  async function eliminarGastoExpediente(gasto) {
    if (!window.confirm(`¿Eliminar el gasto «${gasto.descripcion || gasto.tipo || gasto.id}»?`)) return;
    const expedienteId = expediente?.id ?? (Number.isFinite(Number(id)) ? Number(id) : null);
    try {
      setErrorGastos("");
      await axios.delete(
        `/expedientes/${encodeURIComponent(expedienteId)}/gastos/${encodeURIComponent(gasto.id)}`
      );
      setMensajeGastos("El gasto se ha eliminado.");
      await cargarGastosExpediente();
    } catch (err) {
      setErrorGastos(
        err?.response?.data?.detail ||
        "No se pudo eliminar el gasto."
      );
    }
  }

  useEffect(() => {
    if (expediente?.id || id) cargarGastosExpediente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expediente?.id, id]);

  useEffect(() => {
    if (!mostrarFormularioGasto || honorariosCatalogo.length) return;
    let activo = true;
    axios.get("/honorarios-gestoria?activos=true")
      .then((respuesta) => {
        if (!activo) return;
        setHonorariosCatalogo(Array.isArray(respuesta?.data) ? respuesta.data : []);
      })
      .catch(() => { if (activo) setErrorGastos("No se pudo cargar el catálogo de honorarios de gestoría."); });
    return () => { activo = false; };
  }, [mostrarFormularioGasto, honorariosCatalogo.length]);

  useEffect(() => {
    if (!mostrarFormularioGasto || catalogoTiposConceptoAbsisCargado) return;
    let activo = true;
    setCargandoTiposConceptoAbsis(true);
    axios.get("/catalogos-absis?categoria=TIPOCONCEPTO")
      .then((respuesta) => {
        if (!activo) return;
        const lista = Array.isArray(respuesta?.data) ? respuesta.data : [];
        setTiposConceptoAbsis(lista.filter((item) => item && item.activo !== false));
      })
      .catch(() => {
        if (activo) setTiposConceptoAbsis([]);
      })
      .finally(() => {
        if (activo) {
          setCargandoTiposConceptoAbsis(false);
          setCatalogoTiposConceptoAbsisCargado(true);
        }
      });
    return () => { activo = false; };
  }, [mostrarFormularioGasto, catalogoTiposConceptoAbsisCargado]);

  useEffect(() => {
    if (!mostrarFormularioGasto || conceptosGasto.length) return;
    let activo = true;
    setCargandoConceptosGasto(true);
    axios.get("/tipos-concepto-gastos/opciones")
      .then((respuesta) => {
        if (!activo) return;
        const datos = respuesta?.data;
        const lista = Array.isArray(datos) ? datos : Array.isArray(datos?.items) ? datos.items : Array.isArray(datos?.opciones) ? datos.opciones : [];
        setConceptosGasto(lista.map((x) => typeof x === "string" ? { value: x, label: x } : ({ value: x.value ?? x.nombre ?? x.tipo ?? x.id, label: x.label ?? x.nombre ?? x.descripcion ?? x.value })).filter((x) => x.value && x.label));
      })
      .catch(() => { if (activo) setErrorGastos("No se pudo cargar el catálogo de conceptos de gasto."); })
      .finally(() => { if (activo) setCargandoConceptosGasto(false); });
    return () => { activo = false; };
  }, [mostrarFormularioGasto, conceptosGasto.length]);


  // ==========================================================
  // DEFECTO
  // ==========================================================


async function cargarDefectosRegistrados() {
  const numero = expediente?.id_expediente;
  if (!numero) return;

  const respuesta = await listarDefectosExpediente(numero);

  const lista = Array.isArray(respuesta)
    ? respuesta
    : Array.isArray(respuesta?.defectos)
      ? respuesta.defectos
      : [];

  setDefectosRegistrados(lista);
}

// Consultar los defectos al abrir/cambiar de expediente, no solo al abrir el modal.
// El indicador de la cabecera se basa exclusivamente en registros devueltos por la API.
useEffect(() => {
  const numeroExpediente = expediente?.id_expediente;

  if (!numeroExpediente) {
    setDefectosRegistrados([]);
    return undefined;
  }

  let cancelado = false;

  async function cargarDefectosIniciales() {
    try {
      const respuesta = await listarDefectosExpediente(numeroExpediente);
      const lista = Array.isArray(respuesta)
        ? respuesta
        : Array.isArray(respuesta?.defectos)
          ? respuesta.defectos
          : [];

      if (!cancelado) {
        setDefectosRegistrados(lista);
      }
    } catch (error) {
      console.error(
        "Error consultando los defectos registrados del expediente:",
        error
      );
      if (!cancelado) {
        setDefectosRegistrados([]);
      }
    }
  }

  cargarDefectosIniciales();

  return () => {
    cancelado = true;
  };
}, [expediente?.id_expediente]);

async function abrirDefecto() {
  setErrorDefecto("");
  setDefectoEditandoId(null);
  setDefectoForm({ ...DEFECTO_VACIO });
  setArchivoCalificacion(null);
  setMostrarDefecto(true);

  try {
    const tipos = await listarTiposCargaHipotecaria();
    setTiposCargaHipotecaria(Array.isArray(tipos) ? tipos : []);
  } catch (error) {
    console.error("Error cargando tipos de carga hipotecaria:", error);
    setTiposCargaHipotecaria([]);
    setErrorDefecto(
      error?.response?.data?.detail ||
      "No se ha podido cargar el catálogo de tipos de carga hipotecaria."
    );
  }

  try {
    const subtipos = await listarSubtiposDefecto();
    setSubtiposDefecto(Array.isArray(subtipos) ? subtipos.filter((item) => item.activo !== false) : []);
  } catch (error) {
    console.error("Error cargando subtipos de defecto:", error);
    setSubtiposDefecto([]);
    setErrorDefecto(
      error?.response?.data?.detail ||
      "No se ha podido cargar el catálogo de subtipos de defecto."
    );
  }

  try {
    await cargarDefectosRegistrados();
  } catch (error) {
    console.error("Error cargando defectos:", error);
    setErrorDefecto(
      error?.response?.data?.detail ||
      "No se han podido cargar los defectos del expediente."
    );
  }
}

async function editarDefectoDesdeActividad(defecto) {
  // Carga los catálogos y los datos de defectos antes de preparar el formulario de edición.
  await abrirDefecto();
  editarDefectoRegistrado(defecto);
}

function editarDefectoRegistrado(defecto) {
  setDefectoEditandoId(defecto.id ?? defecto.id_defecto);
  setArchivoCalificacion(null);
  setDefectoForm({
    tipo_carga_hipotecaria_id: defecto.tipo_carga_hipotecaria_id == null ? "" : String(defecto.tipo_carga_hipotecaria_id),
    motivo_defecto: defecto.motivo_defecto || "",
    subtipo_defecto_id: defecto.subtipo_defecto_id == null
      ? String(subtiposDefecto.find((item) => item.nombre === defecto.subtipo_defecto)?.id ?? "")
      : String(defecto.subtipo_defecto_id),
    subtipo_defecto: defecto.subtipo_defecto || "",
    fecha_notificacion_registro: defecto.fecha_notificacion_registro || "",
    fecha_vencimiento_presentacion: defecto.fecha_vencimiento_presentacion || "",
    fecha_calificacion: defecto.fecha_calificacion || "",
    fecha_renovacion_asiento: defecto.fecha_renovacion_asiento || "",
    asiento_renovacion_libro_diario: defecto.asiento_renovacion_libro_diario || "",
    vencimiento_asiento_renovacion: calcularVencimientoAsientoRenovacion(defecto.fecha_notificacion_registro),
    anotacion_suspensiva: defecto.anotacion_suspensiva == null ? "" : String(defecto.anotacion_suspensiva),
    vencimiento_anotacion: defecto.vencimiento_anotacion || "",
    calificacion_sustitutoria: defecto.calificacion_sustitutoria == null ? "" : String(defecto.calificacion_sustitutoria),
    recurso_gubernativo: defecto.recurso_gubernativo == null ? "" : String(defecto.recurso_gubernativo),
    calificacion_registro: defecto.calificacion_registro || "",
    observaciones_registro: defecto.observaciones_registro || "",
    fecha_entrada_subsanacion: defecto.fecha_entrada_subsanacion || "",
  });
  setErrorDefecto("");
}

async function guardarDefectoRegistral() {
  if (!expediente?.id_expediente) {
    setErrorDefecto("No se ha identificado el expediente.");
    return;
  }
  if (!defectoForm.motivo_defecto) {
    setErrorDefecto("Selecciona un motivo del defecto.");
    return;
  }
  if (!defectoForm.fecha_calificacion) {
    setErrorDefecto("Indica la fecha de calificación.");
    return;
  }
  if (defectoForm.observaciones_registro && defectoForm.observaciones_registro.length > 200) {
    setErrorDefecto("Las observaciones no pueden superar 200 caracteres.");
    return;
  }
  if (archivoCalificacion && archivoCalificacion.size > 15 * 1024 * 1024) {
    setErrorDefecto("El PDF no puede superar los 15 MB.");
    return;
  }
  if (archivoCalificacion && !/\.pdf$/i.test(archivoCalificacion.name || "")) {
    setErrorDefecto("El archivo adjunto debe ser un PDF.");
    return;
  }

  try {
    setGuardandoDefecto(true);
    setErrorDefecto("");
    const payload = {
      ...defectoForm,
      tipo_carga_hipotecaria_id: defectoForm.tipo_carga_hipotecaria_id ? Number(defectoForm.tipo_carga_hipotecaria_id) : null,
      subtipo_defecto_id: defectoForm.subtipo_defecto_id ? Number(defectoForm.subtipo_defecto_id) : null,
      subtipo_defecto: defectoForm.subtipo_defecto || null,
      fecha_notificacion_registro: defectoForm.fecha_notificacion_registro || null,
      fecha_vencimiento_presentacion: defectoForm.fecha_vencimiento_presentacion || null,
      fecha_calificacion: defectoForm.fecha_calificacion || null,
      fecha_renovacion_asiento: defectoForm.fecha_renovacion_asiento || null,
      asiento_renovacion_libro_diario: defectoForm.asiento_renovacion_libro_diario || null,
      vencimiento_asiento_renovacion: defectoForm.vencimiento_asiento_renovacion || null,
      anotacion_suspensiva: defectoForm.anotacion_suspensiva === "" ? null : defectoForm.anotacion_suspensiva === "true",
      vencimiento_anotacion: defectoForm.vencimiento_anotacion || null,
      calificacion_sustitutoria: defectoForm.calificacion_sustitutoria === "" ? null : defectoForm.calificacion_sustitutoria === "true",
      recurso_gubernativo: defectoForm.recurso_gubernativo === "" ? null : defectoForm.recurso_gubernativo === "true",
      calificacion_registro: defectoForm.calificacion_registro || null,
      observaciones_registro: defectoForm.observaciones_registro || null,
      fecha_entrada_subsanacion: defectoForm.fecha_entrada_subsanacion || null,
    };

    const respuesta = defectoEditandoId
      ? await actualizarDefectoExpediente(expediente.id_expediente, defectoEditandoId, payload)
      : await crearDefectoExpediente(expediente.id_expediente, payload);
    const guardado = respuesta?.defecto || respuesta || {};
    const idDefecto = guardado.id ?? guardado.id_defecto ?? defectoEditandoId;
    if (idDefecto) setDefectoEditandoId(idDefecto);

    if (archivoCalificacion) {
      if (!idDefecto) {
        throw new Error("El defecto se guardó, pero no se recibió su identificador para adjuntar el PDF.");
      }
      await subirCalificacionRegistro(expediente.id_expediente, idDefecto, archivoCalificacion);
    }

    setDefectoLocal({
      tipo_error: guardado.motivo_defecto || "",
      falta_defecto: guardado.subtipo_defecto || "",
      descripcion_error: guardado.calificacion_registro || "",
      fcierre_defecto: guardado.fecha_cierre_defecto || "",
    });
    setExpediente((actual) => ({
      ...actual,
      tiene_defectos_abiertos: guardado.tiene_defectos_abiertos ?? actual?.tiene_defectos_abiertos,
      tipo_error: guardado.tipo_error ?? guardado.motivo_defecto ?? actual?.tipo_error,
      falta_defecto: guardado.falta_defecto ?? guardado.subtipo_defecto ?? actual?.falta_defecto,
      descripcion_error: guardado.descripcion_error ?? guardado.calificacion_registro ?? actual?.descripcion_error,
    }));

    await cargarDefectosRegistrados();
    setDefectoEditandoId(null);
    setDefectoForm({ ...DEFECTO_VACIO });
    setArchivoCalificacion(null);
  } catch (error) {
    console.error("Error guardando defecto:", error);
    setErrorDefecto(
      error?.response?.data?.detail || error?.message || "No se ha podido guardar el defecto."
    );
  } finally {
    setGuardandoDefecto(false);
  }
}

async function descargarPDFCalificacion(defecto) {
  try {
    const idDefecto = defecto?.id ?? defecto?.id_defecto;
    if (!idDefecto || !expediente?.id_expediente) return;
    const blob = await obtenerCalificacionRegistro(expediente.id_expediente, idDefecto);
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = defecto.calificacion_nombre || `calificacion_defecto_${idDefecto}.pdf`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    setErrorDefecto(error?.response?.data?.detail || "No se ha podido descargar el PDF de calificación.");
  }
}


  // ==========================================================
  // ACCIONES
  // ==========================================================

  const cargarAccionesDelExpediente =
    useCallback(
      async () => {
        if (!expediente?.id_expediente) {
          setAccionesExpediente([]);
          return;
        }

        try {
          setCargandoAcciones(true);
          setErrorAcciones("");

          const respuesta =
            await obtenerAccionesExpediente(
              expediente.id_expediente
            );

          const datos =
            Array.isArray(respuesta)
              ? respuesta
              : respuesta?.items ||
                respuesta?.data ||
                [];

          setAccionesExpediente(datos);
        } catch (err) {
          console.error(
            "Error cargando acciones del expediente:",
            err
          );
          setAccionesExpediente([]);
          setErrorAcciones(
            err?.response?.data?.detail ||
            "No se han podido cargar las acciones del expediente."
          );
        } finally {
          setCargandoAcciones(false);
        }
      },
      [expediente?.id_expediente]
    );

  useEffect(() => {
    cargarAccionesDelExpediente();
  }, [cargarAccionesDelExpediente]);

  async function cargarCatalogoAcciones() {
    try {
      setErrorAcciones("");

      const respuesta =
        await obtenerCatalogoAcciones({
          activo: true,
        });

      const datos =
        Array.isArray(respuesta)
          ? respuesta
          : respuesta?.items ||
            respuesta?.data ||
            [];

      setAccionesCatalogo(datos);
    } catch (err) {
      console.error(
        "Error cargando catálogo de acciones:",
        err
      );
      setAccionesCatalogo([]);
      setErrorAcciones(
        err?.response?.data?.detail ||
        "No se ha podido cargar el catálogo de acciones."
      );
    }
  }

  async function abrirAcciones() {
    const hoy =
      new Date()
        .toISOString()
        .slice(0, 10);

    setAccionForm({
      accion_id: "",
      fecha: hoy,      
    });

    setErrorAcciones("");
    setMostrarAcciones(true);

    await Promise.all([
      cargarCatalogoAcciones(),
      cargarAccionesDelExpediente(),
    ]);
  }

  async function guardarAccion() {
    if (!expediente?.id_expediente) {
      setErrorAcciones(
        "No se ha podido identificar el expediente."
      );
      return;
    }

    if (!accionForm.accion_id) {
      setErrorAcciones(
        "Debes seleccionar una acción del catálogo."
      );
      return;
    }

    try {
      setCargandoAcciones(true);
      setErrorAcciones("");

      await asignarAccionExpediente(
        expediente.id_expediente,
        {
          accion_id: Number(accionForm.accion_id),
           fecha:
            accionForm.fecha ||
            null,
          }
      );

      await cargarAccionesDelExpediente();

      setAccionForm({
        accion_id: "",
        
        fecha: new Date()
          .toISOString()
          .slice(0, 10),
        
      });

      setMostrarAcciones(false);
    } catch (err) {
      console.error(
        "Error asignando acción al expediente:",
        err
      );
      setErrorAcciones(
        err?.response?.data?.detail ||
        "No se ha podido asignar la acción al expediente."
      );
    } finally {
      setCargandoAcciones(false);
    }
  }

  async function retirarAccion(relacionId) {
    if (!relacionId) return;

    try {
      setCargandoAcciones(true);
      setErrorAcciones("");

      await eliminarAccionExpediente(
        relacionId
      );

      await cargarAccionesDelExpediente();
    } catch (err) {
      console.error(
        "Error retirando acción del expediente:",
        err
      );
      setErrorAcciones(
        err?.response?.data?.detail ||
        "No se ha podido retirar la acción."
      );
    } finally {
      setCargandoAcciones(false);
    }
  }


  // ==========================================================
  // OBSERVACIONES DEL EXPEDIENTE — API
  // ==========================================================

  const numeroExpedienteApi = expediente?.id_expediente || id;

  const cargarObservacionesExpediente = useCallback(async () => {
    if (!numeroExpedienteApi) {
      setObservacionesExpediente([]);
      return;
    }
    setCargandoObservaciones(true);
    setErrorObservaciones("");
    try {
      const respuesta = await axios.get(
        `/expedientes/${encodeURIComponent(numeroExpedienteApi)}/observaciones`
      );
      setObservacionesExpediente(
        Array.isArray(respuesta.data?.items) ? respuesta.data.items : []
      );
    } catch (err) {
      console.error("Error cargando observaciones del expediente:", err);
      setErrorObservaciones(
        mensajeErrorApi(err, "No se pudieron cargar las observaciones.")
      );
      setObservacionesExpediente([]);
    } finally {
      setCargandoObservaciones(false);
    }
  }, [numeroExpedienteApi]);

  useEffect(() => {
    if (!numeroExpedienteApi) return;
    cargarObservacionesExpediente();
  }, [numeroExpedienteApi, cargarObservacionesExpediente]);

  useEffect(() => {
    let cancelado = false;
    async function cargarEmpleadosObservaciones() {
      try {
        const respuesta = await axios.get(
          `/expedientes/${encodeURIComponent(numeroExpedienteApi || id)}/observaciones/empleados`
        );
        if (!cancelado) {
          const lista = Array.isArray(respuesta.data) ? respuesta.data : [];
          setEmpleadosObservaciones(lista);
          if (lista.length && !destinatarioObservacion) {
            setDestinatarioObservacion(String(lista[0].id));
          }
        }
      } catch (err) {
        if (!cancelado) {
          console.error("Error cargando empleados destinatarios:", err);
          setEmpleadosObservaciones([]);
        }
      }
    }
    if (numeroExpedienteApi || id) cargarEmpleadosObservaciones();
    return () => { cancelado = true; };
  }, [numeroExpedienteApi, id]);

  async function agregarObservacionExpediente() {
    const texto = nuevaObservacion.trim();
    if (!texto || !numeroExpedienteApi) return;
    if (visibilidadObservacion === "Gestor" && !destinatarioObservacion) {
      setErrorObservaciones("Selecciona el empleado destinatario de la observación.");
      return;
    }
    setGuardandoObservacion(true);
    setErrorObservaciones("");
    try {
      const payload = {
        comentario: texto,
        visibilidad: visibilidadObservacion,
        empleado_destinatario_id: visibilidadObservacion === "Gestor"
          ? Number(destinatarioObservacion)
          : null,
      };
      if (observacionEditandoId !== null) {
        await axios.put(
          `/expedientes/${encodeURIComponent(numeroExpedienteApi)}/observaciones/${observacionEditandoId}`,
          payload
        );
      } else {
        await axios.post(
          `/expedientes/${encodeURIComponent(numeroExpedienteApi)}/observaciones`,
          payload
        );
      }
      setNuevaObservacion("");
      setVisibilidadObservacion("Gestor");
      setObservacionEditandoId(null);
      setMostrarFormularioObservacion(false);
      await cargarObservacionesExpediente();
    } catch (err) {
      console.error("Error guardando observación:", err);
      setErrorObservaciones(mensajeErrorApi(err, "No se pudo guardar la observación."));
    } finally {
      setGuardandoObservacion(false);
    }
  }

  function editarObservacionExpediente(observacion) {
    setObservacionEditandoId(observacion.id);
    setNuevaObservacion(observacion.comentario || "");
    setVisibilidadObservacion(observacion.visibilidad || "Gestor");
    setDestinatarioObservacion(
      observacion.empleado_destinatario_id ? String(observacion.empleado_destinatario_id) : ""
    );
    setMostrarFormularioObservacion(true);
    setErrorObservaciones("");
  }

  async function eliminarObservacionExpediente(observacionId) {
    if (!numeroExpedienteApi) return;
    setErrorObservaciones("");
    try {
      await axios.delete(
        `/expedientes/${encodeURIComponent(numeroExpedienteApi)}/observaciones/${observacionId}`
      );
      await cargarObservacionesExpediente();
    } catch (err) {
      console.error("Error desactivando observación:", err);
      setErrorObservaciones(
        err?.response?.data?.detail || "No se pudo eliminar la observación."
      );
    }
  }

  function abrirObservaciones() {
    setComentario("");

    setVisionesComentario({
      notario: false,
      apoderado: false,
      actividad: true,
      absis: false,
    });

    setMostrarObservaciones(true);
  }


  async function guardarObservacion() {
    const texto = String(comentario || "").trim();

    if (!texto) {
      setErrorObservaciones("Escribe un comentario antes de guardarlo.");
      return;
    }

    if (!numeroExpedienteApi) {
      setErrorObservaciones("No se ha identificado el expediente.");
      return;
    }

    const visiones = Object.entries(visionesComentario)
      .filter(([, marcado]) => Boolean(marcado))
      .map(([vision]) => vision);

    if (!visiones.length) {
      setErrorObservaciones("Selecciona al menos un destino del comentario.");
      return;
    }

    if (visiones.includes("actividad") && !destinatarioObservacion) {
      setErrorObservaciones(
        "Selecciona el empleado destinatario del comentario interno."
      );
      return;
    }

    setGuardandoObservacion(true);
    setErrorObservaciones("");

    try {
      const respuesta = await axios.post(
        `/expedientes/${encodeURIComponent(numeroExpedienteApi)}/observaciones/comentario-ficha`,
        {
          comentario: texto,
          visiones,
          empleado_destinatario_id: visiones.includes("actividad")
            ? Number(destinatarioObservacion)
            : null,
        }
      );

      if (visiones.includes("actividad")) {
        setExpediente((actual) => ({
          ...actual,
          observaciones: respuesta?.data?.observaciones_expediente ?? texto,
        }));
      }

      await cargarObservacionesExpediente();
      setMostrarObservaciones(false);
    } catch (err) {
      console.error("Error guardando el comentario:", err);
      setErrorObservaciones(
        err?.response?.data?.detail ||
          "No se pudo guardar el comentario. No se han confirmado los cambios."
      );
    } finally {
      setGuardandoObservacion(false);
    }
  }


  async function validarObservacionInterna(observacion) {
    if (!numeroExpedienteApi || !observacion?.id) return;
    setErrorObservaciones("");
    try {
      await axios.post(`/expedientes/${encodeURIComponent(numeroExpedienteApi)}/observaciones/${observacion.id}/validar`);
      await cargarObservacionesExpediente();
    } catch (err) {
      setErrorObservaciones(mensajeErrorApi(err, "No se pudo validar la observación."));
    }
  }


  // ==========================================================
  // EXPEDIENTES RELACIONADOS POR NIF
  // ==========================================================

  function guardarManualesRelacionados(lista) {
    setExpedientesManuales(lista);

    try {
      localStorage.setItem(
        `erp_expedientes_relacionados_${expediente?.id_expediente || id}`,
        JSON.stringify(lista)
      );
    } catch (err) {
      console.warn(
        "No se han podido guardar los expedientes relacionados localmente:",
        err
      );
    }
  }

  async function abrirAgregarExpedientes() {
    setMostrarAgregarExpedientes(true);
    setExpedienteRelacionadoManual("");
    setErrorRelacionManual("");

    const nif =
      expediente?.nif_titular ||
      expediente?.nif_solicitante ||
      "";

    try {
      setCargandoRelacionados(true);

      let automaticos = [];

      if (nif) {
        const respuesta =
          await obtenerListadoExpedientes({
            nif,
            pagina: 1,
            porPagina: 100,
          });

        const lista =
          obtenerArrayRespuesta(
            respuesta
          );

        const expedienteActual =
          String(
            expediente?.id_expediente ||
            ""
          );

        automaticos =
          lista
            .filter(
              (item) =>
                String(
                  item?.id_expediente || ""
                ) !== expedienteActual
            )
            .map((item) => ({
              ...item,
              _manual: false,
            }));
      }

      const manuales = expedientesManuales.map(
        (item) => ({
          ...item,
          _manual: true,
        })
      );

      const mapa = new Map();

      [...automaticos, ...manuales].forEach(
        (item) => {
          const clave = String(
            item?.id_expediente || ""
          ).trim();

          if (clave) {
            mapa.set(clave, item);
          }
        }
      );

      setExpedientesRelacionados(
        Array.from(mapa.values())
      );
    } catch (err) {
      console.error(
        "Error buscando expedientes relacionados:",
        err
      );

      setExpedientesRelacionados(
        expedientesManuales.map(
          (item) => ({
            ...item,
            _manual: true,
          })
        )
      );
    } finally {
      setCargandoRelacionados(false);
    }
  }

  async function guardarExpedienteRelacionado() {
    const numero = String(
      expedienteRelacionadoManual || ""
    ).trim();

    if (!numero) {
      setErrorRelacionManual(
        "Introduce un número de expediente."
      );
      return;
    }

    const actual = String(
      expediente?.id_expediente || ""
    ).trim();

    if (numero === actual) {
      setErrorRelacionManual(
        "No puedes relacionar el expediente consigo mismo."
      );
      return;
    }

    const yaExiste = expedientesRelacionados.some(
      (item) =>
        String(
          item?.id_expediente || ""
        ).trim() === numero
    );

    if (yaExiste) {
      setErrorRelacionManual(
        "Ese expediente ya está en la lista."
      );
      return;
    }

    try {
      setErrorRelacionManual("");
      setCargandoRelacionados(true);

      const respuesta =
        await obtenerExpediente(numero);

      const datos =
        respuesta?.expediente ||
        respuesta?.data ||
        respuesta ||
        null;

      if (!datos?.id_expediente) {
        throw new Error(
          "No se ha encontrado el expediente indicado."
        );
      }

      const nuevo = {
        ...datos,
        _manual: true,
      };

      const manualesActuales = [
        ...expedientesManuales,
        nuevo,
      ];

      guardarManualesRelacionados(
        manualesActuales
      );

      setExpedientesRelacionados(
        (actuales) => [
          ...actuales,
          nuevo,
        ]
      );

      setExpedienteRelacionadoManual("");
    } catch (err) {
      console.error(
        "Error agregando expediente relacionado:",
        err
      );

      setErrorRelacionManual(
        err?.response?.data?.detail ||
        err?.message ||
        "No se ha podido encontrar ese expediente."
      );
    } finally {
      setCargandoRelacionados(false);
    }
  }

  function eliminarExpedienteRelacionado(
    numeroExpediente
  ) {
    const numero = String(
      numeroExpediente || ""
    ).trim();

    const manuales = expedientesManuales.filter(
      (item) =>
        String(
          item?.id_expediente || ""
        ).trim() !== numero
    );

    guardarManualesRelacionados(
      manuales
    );

    setExpedientesRelacionados(
      (actuales) =>
        actuales.filter(
          (item) =>
            String(
              item?.id_expediente || ""
            ).trim() !== numero ||
            !item?._manual
        )
    );
  }



  // ==========================================================
  // PPAD — API
  // ==========================================================

  const cargarPpad = useCallback(async () => {
    const numero = expediente?.id_expediente || id;
    if (!numero) {
      setPpadItems([]);
      return;
    }
    setCargandoPpad(true);
    setErrorPpad("");
    try {
      const respuesta = await axios.get(
        `/expedientes/${encodeURIComponent(numero)}/ppad`
      );
      const lista = Array.isArray(respuesta.data?.items) ? respuesta.data.items : [];
      setPpadItems(lista.map((item) => ({
        ...item,
        imputableA: item.imputable_a || item.imputableA || "Molsan",
      })));
    } catch (err) {
      console.error("Error cargando PPAD:", err);
      setErrorPpad(mensajeErrorApi(err, "No se pudieron cargar los conceptos PPAD."));
      setPpadItems([]);
    } finally {
      setCargandoPpad(false);
    }
  }, [expediente?.id_expediente, id]);

  useEffect(() => {
    if (expediente?.id_expediente || id) cargarPpad();
  }, [expediente?.id_expediente, id, cargarPpad]);

  useEffect(() => {
    let vigente = true;
    const numero = expediente?.id_expediente || id;
    if (!numero) {
      setComplementosSaldoExpediente([]);
      return undefined;
    }
    setCargandoComplementosExpediente(true);
    setErrorComplementosExpediente("");
    axios.get("/complementos-saldo", { params: { q: numero } })
      .then(({ data }) => {
        if (!vigente) return;
        const lista = Array.isArray(data) ? data : [];
        setComplementosSaldoExpediente(lista.filter((item) => String(item.numero_expediente || "").trim() === String(numero).trim()));
      })
      .catch((err) => {
        if (!vigente) return;
        setErrorComplementosExpediente(err?.response?.data?.detail || "No se pudieron cargar los complementos de saldo de este expediente.");
        setComplementosSaldoExpediente([]);
      })
      .finally(() => { if (vigente) setCargandoComplementosExpediente(false); });
    return () => { vigente = false; };
  }, [expediente?.id_expediente, id]);

  function abrirNuevoPpad() {
    setPpadEditandoId(null);
    setPpadForm({ concepto: "", importe: "", imputableA: "Molsan" });
    setErrorPpad("");
    setMostrarFormularioPpad(true);
  }

  function editarPpad(item) {
    setPpadEditandoId(item.id);
    setPpadForm({
      concepto: item.concepto || "",
      importe: item.importe ?? "",
      imputableA: item.imputable_a || item.imputableA || "Molsan",
    });
    setErrorPpad("");
    setMostrarFormularioPpad(true);
  }

  function cancelarPpad() {
    setMostrarFormularioPpad(false);
    setPpadEditandoId(null);
    setPpadForm({ concepto: "", importe: "", imputableA: "Molsan" });
  }

  async function aceptarPpad() {
    const numero = expediente?.id_expediente || id;
    const concepto = ppadForm.concepto.trim();
    const importeTexto = String(ppadForm.importe).trim();
    if (!numero || !concepto || !importeTexto) return;

    const importeNormalizado = importeTexto
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const importeNumero = Number(importeNormalizado);
    if (!Number.isFinite(importeNumero) || importeNumero < 0) {
      setErrorPpad("Introduce un importe válido igual o superior a cero.");
      return;
    }

    setGuardandoPpad(true);
    setErrorPpad("");
    try {
      const payload = {
        concepto,
        importe: importeNumero,
        imputable_a: ppadForm.imputableA === "Externo" ? "Externo" : "Molsan",
      };
      if (ppadEditandoId !== null && ppadEditandoId !== undefined) {
        await axios.put(
          `/expedientes/${encodeURIComponent(numero)}/ppad/${ppadEditandoId}`,
          payload
        );
      } else {
        await axios.post(
          `/expedientes/${encodeURIComponent(numero)}/ppad`,
          payload
        );
      }
      cancelarPpad();
      await cargarPpad();
    } catch (err) {
      console.error("Error guardando PPAD:", err);
      setErrorPpad(err?.response?.data?.detail || "No se pudo guardar el concepto PPAD.");
    } finally {
      setGuardandoPpad(false);
    }
  }

  async function eliminarPpad(itemId) {
    const numero = expediente?.id_expediente || id;
    if (!numero) return;
    setErrorPpad("");
    try {
      await axios.delete(
        `/expedientes/${encodeURIComponent(numero)}/ppad/${itemId}`
      );
      if (ppadEditandoId === itemId) cancelarPpad();
      await cargarPpad();
    } catch (err) {
      console.error("Error eliminando PPAD:", err);
      setErrorPpad(err?.response?.data?.detail || "No se pudo eliminar el concepto PPAD.");
    }
  }


  async function compensarPpad(item) {
    const numero = expediente?.id_expediente || id;
    if (!numero || !item?.id || item.compensado) return;
    if (!String(expediente?.fecha_firma || "").slice(0, 10)) {
      setErrorPpad("No se puede compensar el PPAD hasta que el expediente tenga fecha de firma.");
      return;
    }
    const confirmar = window.confirm("¿Confirmas que este PPAD ya está compensado?");
    if (!confirmar) return;
    setGuardandoPpad(true);
    setErrorPpad("");
    try {
      await axios.post(`/expedientes/${encodeURIComponent(numero)}/ppad/${item.id}/compensar`);
      await cargarPpad();
    } catch (err) {
      console.error("Error compensando PPAD:", err);
      setErrorPpad(err?.response?.data?.detail || "No se pudo registrar la compensación del PPAD.");
    } finally {
      setGuardandoPpad(false);
    }
  }



  const numeroExpedienteFincas = expediente?.id_expediente || id;

  const cargarFincasExpediente = useCallback(async () => {
    if (!numeroExpedienteFincas) {
      setFincasExpediente([]);
      return;
    }
    setCargandoFincas(true);
    setErrorFincas("");
    try {
      const respuesta = await axios.get(
        `/expedientes/${encodeURIComponent(numeroExpedienteFincas)}/fincas`
      );
      const lista = Array.isArray(respuesta.data?.items)
        ? respuesta.data.items
        : Array.isArray(respuesta.data) ? respuesta.data : [];
      setFincasExpediente(lista);
      if (lista.length) {
        const principal = lista[0];
        setFincaRegistrada({
          numero_finca: principal.finca || "",
          cru_idufir: principal.cru_idufir || "",
          provincia: principal.provincia || "",
          poblacion: principal.poblacion || "",
          registro: principal.registro || "",
          seccion: principal.seccion || "",
          cuantia: principal.cuantia || "",
          inscripcion: principal.inscripcion || "",
          contrato: principal.contrato || "",
          fecha_constitucion: principal.fecha_constitucion || "",
          subrogado: principal.subrogado || "",
          entidad_original: principal.entidad_original || "",
        });
      } else {
        setFincaRegistrada({
          numero_finca: "", cru_idufir: "", provincia: "", poblacion: "",
          registro: "", seccion: "", cuantia: "", inscripcion: "", contrato: "",
          fecha_constitucion: "", subrogado: "", entidad_original: "",
        });
      }
    } catch (err) {
      console.error("Error cargando fincas del expediente:", err);
      setErrorFincas(err?.response?.data?.detail || "No se pudieron cargar las fincas.");
    } finally {
      setCargandoFincas(false);
    }
  }, [numeroExpedienteFincas]);

  useEffect(() => {
    cargarFincasExpediente();
  }, [cargarFincasExpediente]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
  return (
      <div
        className="
          ficha-expediente-premium erp-page
          p-6
        "
      >
        <div
          className="
           w-full
            rounded-2xl
            border
            border-white/80
            bg-white/85
            p-12
            text-center
            shadow-lg
          "
        >
          <div
            className="
              animate-pulse
              text-sm
              text-slate-400
            "
          >
            Cargando ficha del expediente…
          </div>
        </div>
      </div>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div
        className="
          ficha-expediente-premium erp-page
          p-6
        "
      >
        <div
          className="
             w-full
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-6
            text-red-700
          "
        >
          <p className="text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={cargarExpediente}
            className="mt-4 mr-3 inline-flex rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-800"
          >
            Reintentar carga
          </button>

          <Link
            to="/expedientes"
            className="
              mt-4
              inline-flex
              rounded-xl
              bg-blue-600
              px-4
              py-2.5
              text-xs
              font-bold
              text-white
            "
          >
            ← Expedientes
          </Link>
        </div>
      </div>
    );
  }


  if (!expediente) {
    return null;
  }


  // Solo se considera que hay defecto si existe al menos un registro real en la API.
const tieneDefecto = defectosRegistrados.some(
  (defecto) => !defecto.fecha_entrada_subsanacion
);

// La cuantía que se envía al modal procede de Fincas y Registros.
// Si hay varias fincas, se toma la primera que tenga cuantía informada.
const cuantiaFincasParaEnvio =
  fincasExpediente.find((finca) => finca?.cuantia !== null && finca?.cuantia !== undefined && finca?.cuantia !== "")?.cuantia
  ?? fincaRegistrada?.cuantia
  ?? expediente?.cuantia
  ?? "";

  // ==========================================================
  // RENDER
  // ==========================================================

  // ==========================================================
  // FINCAS
  // ==========================================================



  function abrirFincas(finca = null) {
    setFincaEditandoId(finca?.id ?? null);
    setFincaForm({
      numero_finca: finca?.finca || "",
      cru_idufir: finca?.cru_idufir || "",
      provincia: finca?.provincia || expediente?.provincia || "",
      poblacion: finca?.poblacion || expediente?.poblacion || "",
      registro: finca?.registro || "",
      registro_propiedad_id: finca?.registro_propiedad_id ? String(finca.registro_propiedad_id) : "",
      seccion: finca?.seccion || "",
      cuantia: finca?.cuantia ?? "",
      inscripcion: finca?.inscripcion || "",
      contrato: finca?.contrato || expediente?.contrato || "",
      fecha_constitucion: finca?.fecha_constitucion || "",
      subrogado: finca?.subrogado || "",
      entidad_original: finca?.entidad_original || "",
    });
    setErrorFincas("");
    setMostrarFincas(true);
  }

  async function guardarFinca() {
    const numero = numeroExpedienteFincas;
    if (!numero) {
      setErrorFincas("No se ha podido identificar el expediente.");
      return;
    }
    const payload = {
      finca: String(fincaForm.numero_finca || "").trim() || null,
      cru_idufir: String(fincaForm.cru_idufir || "").trim() || null,
      provincia: String(fincaForm.provincia || "").trim() || null,
      poblacion: String(fincaForm.poblacion || "").trim() || null,
      registro: String(fincaForm.registro || "").trim() || null,
      registro_propiedad_id: fincaForm.registro_propiedad_id ? Number(fincaForm.registro_propiedad_id) : null,
      seccion: String(fincaForm.seccion || "").trim() || null,
      cuantia: fincaForm.cuantia === "" ? null : String(fincaForm.cuantia),
      inscripcion: String(fincaForm.inscripcion || "").trim() || null,
      contrato: String(fincaForm.contrato || "").trim() || null,
      fecha_constitucion: fincaForm.fecha_constitucion || null,
      subrogado: fincaForm.subrogado || null,
      entidad_original: String(fincaForm.entidad_original || "").trim() || null,
    };
    setGuardandoFinca(true);
    setErrorFincas("");
    try {
      if (fincaEditandoId !== null) {
        await axios.put(
          `/expedientes/${encodeURIComponent(numero)}/fincas/${fincaEditandoId}`,
          payload
        );
      } else {
        await axios.post(
          `/expedientes/${encodeURIComponent(numero)}/fincas`,
          payload
        );
      }
      setMostrarFincas(false);
      setFincaEditandoId(null);
      await cargarFincasExpediente();
    } catch (err) {
      console.error("Error guardando finca:", err);
      setErrorFincas(err?.response?.data?.detail || "No se pudo guardar la finca.");
    } finally {
      setGuardandoFinca(false);
    }
  }

  async function eliminarFinca(fincaId) {
    if (!fincaId || !numeroExpedienteFincas) return;
    if (!window.confirm("¿Seguro que quieres eliminar esta finca del expediente?")) return;
    try {
      await axios.delete(
        `/expedientes/${encodeURIComponent(numeroExpedienteFincas)}/fincas/${fincaId}`
      );
      await cargarFincasExpediente();
    } catch (err) {
      setErrorFincas(err?.response?.data?.detail || "No se pudo eliminar la finca.");
    }
  }

  const renderChecklistCalidad = ({ compacto = false, onNavigate } = {}) => (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800">Checklist de calidad del expediente</h3>
                          <p className="mt-1 text-xs text-slate-500">Cada visto se obtiene de los datos guardados y de los documentos encontrados en la carpeta digital. Los requisitos pendientes se muestran para poder corregirlos.</p>
                        </div>
                        <button
                          type="button"
                          onClick={cargarDocumentosCierre}
                          disabled={cargandoDocumentosCierre}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {cargandoDocumentosCierre ? "Comprobando…" : "↻ Comprobar de nuevo"}
                        </button>
                      </div>
                      {cargandoDocumentosCierre && <p className="mt-3 text-xs text-slate-500">Actualizando datos documentales…</p>}
                      {errorDocumentosCierre && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorDocumentosCierre}</p>}
                      {(() => {
                        const valor = (...claves) => {
                          for (const clave of claves) {
                            const dato = expediente?.[clave] ?? actividadDraft?.[clave];
                            if (dato !== undefined && dato !== null && String(dato).trim() !== "") return dato;
                          }
                          return "";
                        };
                        const normalizar = (dato) => String(dato ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
                        const documentos = Array.isArray(documentosCierre) ? documentosCierre : [];
                        const tieneDoc = (...categorias) => documentos.some((doc) => {
                          const categoria = normalizar([doc?.categoria, doc?.categoria_nombre, doc?.nombre_categoria, doc?.actividad, doc?.actividad_nombre, doc?.fase].filter(Boolean).join(" "));
                          const nombre = normalizar([doc?.nombre, doc?.nombre_archivo, doc?.nombre_original, doc?.filename, doc?.titulo].filter(Boolean).join(" "));
                          return categorias.some((buscado) => {
                            const objetivo = normalizar(buscado);
                            return categoria.includes(objetivo) || nombre.includes(objetivo);
                          });
                        });
                        // Para los documentos obligatorios de Documentación previa,
                        // se exige su categoría exacta y no solo el nombre del fichero.
                        const tieneDocEnCategoria = (...categorias) => documentos.some((doc) => {
                          const categoria = normalizar([
                            doc?.categoria, doc?.categoria_nombre, doc?.nombre_categoria,
                            doc?.tipo_documento, doc?.metadata?.categoria,
                          ].filter(Boolean).join(" "));
                          return categorias.some((buscado) => categoria === normalizar(buscado));
                        });
                        const requisito = (etiqueta, ok, detalle) => ({ etiqueta, ok: Boolean(ok), detalle: ok ? "Correcto" : detalle });
                        const fechaEnvio = valor("fecha_envio_notario", "fecha_envio");
                        const notario = valor("nombre_notario", "notario", "notario_otorgante");
                        const fechaFirma = valor("fecha_firma");
                        const protocolo = valor("protocolo", "numero_protocolo");
                        const fechaPresentacionTributaria = valor("fecha_presentacion_tributaria");
                        const tributacion = normalizar(valor("tributacion"));
                        const esExencionTributaria = ["prescrito", "exento", "renuncia"].some((x) => tributacion === x);
                        const defectos = Array.isArray(defectosRegistrados) ? defectosRegistrados : [];
                        const hayDefectosAbiertos = defectos.some((d) => {
                          const cerrado = Boolean(d?.fecha_cierre_defecto || d?.fecha_cierre || d?.fcierre_defecto || d?.fecha_entrada_subsanacion);
                          const estado = normalizar(d?.estado || d?.estado_defecto || d?.situacion);
                          return !cerrado && !["cerrado", "subsanado", "resuelto", "archivado"].some((x) => estado.includes(x));
                        });
                        const fases = [
                          {
                            key: "documentacion-previa", label: "Documentación previa", icono: "📄",
                            checks: [
                              requisito(
                                "Certificado Saldo «0» erróneo",
                                Boolean(estadoDocumentacionAbsis.fecha_actualizacion),
                                "Selecciona Sí o No en Documentación previa y pulsa «Guardar datos para integración»."
                              ),
                              requisito("Fecha de envío a notario", Boolean(fechaEnvio), "No consta la fecha de envío en FichaExpediente → Enviar a notario"),
                              requisito(
                                "Hoja de encargo firmada · marcada",
                                Boolean(estadoDocumentacionAbsis.solicitud_cancelacion_notarial),
                                "Marca «Hoja de Encargo firmada» en Documentación previa y guarda los datos."
                              ),
                              requisito(
                                "Hoja de encargo firmada · documento subido",
                                tieneDocEnCategoria("Hoja de Encargo firmada"),
                                "Sube el documento a la categoría «Hoja de encargo firmada» de Carpeta digital y comprueba que se pueda abrir en el visor."
                              ),
                              requisito(
                                "Justificante de cancelación · marcado",
                                Boolean(estadoDocumentacionAbsis.certificado_cancelacion_administrativo),
                                "Marca «Justificante de cancelación» en Documentación previa y guarda los datos."
                              ),
                              requisito(
                                "Justificante de cancelación · documento subido",
                                tieneDocEnCategoria("Justificante de cancelación"),
                                "Sube el documento a la categoría «Justificante de cancelación» de Carpeta digital y comprueba que se pueda abrir en el visor."
                              ),
                              requisito(
                                "Nota simple registral · marcada",
                                Boolean(estadoDocumentacionAbsis.nota_simple_registral),
                                "Marca «Nota simple registral» en Documentación previa y guarda los datos."
                              ),
                              requisito(
                                "Nota simple registral · documento subido",
                                tieneDocEnCategoria("Nota simple registral"),
                                "Sube el documento a la categoría «Nota simple registral» de Carpeta digital y comprueba que se pueda abrir en el visor."
                              ),
                              requisito("Nombre del notario", Boolean(notario), "No consta el nombre del notario en FichaExpediente → Enviar a notario"),
                              requisito("NIF del notario", Boolean(valor("nif_notario")), "No consta el NIF del notario en FichaExpediente → Enviar a notario"),
                            ],
                          },
                          {
                            key: "sede-notarial", label: "Sede notarial", icono: "🏛️",
                            checks: [
                              requisito("Notario", Boolean(notario), "Falta seleccionar o indicar el notario en Enviar a notario"),
                              requisito("Fecha de envío", Boolean(fechaEnvio), "No consta la fecha de envío a notario"),
                            ],
                          },
                          {
                            key: "sede-notarial-protocolo", label: "Sede notarial con protocolo", icono: "📜",
                            checks: [
                              requisito("Apoderado", Boolean(valor("apoderado")), "Selecciona Gestoría o CaixaBank"),
                              requisito("Fecha firma", Boolean(fechaFirma), "No consta la fecha de firma"),
                              requisito("Protocolo", Boolean(protocolo), "No consta el número de protocolo"),
                              requisito("Asiento presentación / Libro diario", Boolean(valor("asiento_presentacion_libro_diario")), "Falta el asiento de presentación o libro diario"),
                              requisito("Fecha presentación", Boolean(valor("fecha_presentacion")), "Falta la fecha de presentación en Registro"),
                              requisito("Número de entrada", Boolean(valor("numero_entrada")), "Falta el número de entrada"),
                              requisito("Fecha recogida notario o presentación telemática", Boolean(valor("fecha_recogida_notario_presentacion_telematica")), "Falta la fecha de recogida o presentación telemática"),
                              requisito("Documento Presentación Registro", tieneDocEnCategoria("Presentación Registro"), "Sube el documento en la categoría «Presentación Registro» de Carpeta digital y comprueba que abre en el visor"),
                              requisito("Documento Copia simple", tieneDocEnCategoria("Copia simple", "Copia simple de escritura"), "Sube la copia simple en su categoría de Carpeta digital y comprueba que abre en el visor"),
                            ],
                          },
                          {
                            key: "liquidacion-impuestos", label: "Liquidación de impuestos", icono: "💶",
                            checks: [
                              requisito("Fecha presentación tributaria", Boolean(valor("fecha_presentacion_tributaria")), "Falta la fecha de presentación tributaria"),
                              requisito("Fecha liquidación tributaria", Boolean(valor("fecha_liquidacion_tributaria")), "Falta la fecha de liquidación tributaria"),
                              requisito("Oficina liquidadora / comunidad autónoma", Boolean(valor("oficina_liquidadora")), "Selecciona la oficina liquidadora o comunidad autónoma"),
                              requisito("Base imponible (€)", valor("base_imponible") !== "" && Number.isFinite(Number(valor("base_imponible"))) && Number(valor("base_imponible")) >= 0, "Indica una base imponible válida en euros"),
                              requisito("Tributación", Boolean(valor("tributacion")), "Selecciona Prescrito, Exento, Bonificación, Renuncia, AJD o TPO"),
                              requisito("Impuesto (AJD / ITP)", Boolean(valor("impuesto_ajd_itp")), "Indica el impuesto AJD / ITP"),
                              requisito("Documento AJD / ITP", tieneDocEnCategoria("AJD / ITP", "AJD/ITP", "AJD - ITP"), "Sube el documento en la categoría «AJD / ITP» de Carpeta digital y comprueba que abre en el visor"),
                            ],
                          },
                          {
                            key: "tramitacion-inscripcion", label: "Tramitación inscripción", icono: "🏢",
                            checks: [
                              requisito("Fecha presentación", Boolean(valor("fecha_presentacion")), "Falta la fecha de presentación en Registro"),
                              requisito("Fecha vencimiento asiento (+60 días naturales)", Boolean(valor("fecha_vencimiento_asiento", "fecha_vencimiento")), "No consta la fecha de vencimiento del asiento, calculada a 60 días naturales desde la presentación"),
                              requisito("Vencimiento calculado correctamente (+60 días)", (() => {
                                const presentacion = valor("fecha_presentacion");
                                const vencimiento = valor("fecha_vencimiento_asiento", "fecha_vencimiento");
                                if (!presentacion || !vencimiento) return false;
                                const fecha = new Date(String(presentacion).slice(0, 10) + "T00:00:00");
                                fecha.setDate(fecha.getDate() + 60);
                                return fecha.toISOString().slice(0, 10) === String(vencimiento).slice(0, 10);
                              })(), "La fecha de vencimiento debe ser exactamente 60 días naturales después de la fecha de presentación"),
                              requisito("Fecha inscripción", Boolean(valor("fecha_inscripcion")), "Todavía no consta la fecha de inscripción registral"),
                              requisito("Hoja de inscripción", tieneDocEnCategoria("Hoja de inscripción", "Hoja de Inscripción"), "Sube la hoja de inscripción a su categoría de Carpeta digital y comprueba que abre en el visor"),
                            ],
                          },
                          {
                            key: "defectos-registrales", label: "Defectos registrales", icono: "⚠️",
                            checks: [
                              requisito(
                                "Control de defectos registrales",
                                !hayDefectosAbiertos,
                                hayDefectosAbiertos
                                  ? "Hay uno o varios defectos abiertos: completa los controles siguientes para documentar su subsanación y cierre."
                                  : "No hay defectos registrales abiertos; esta fase se considera correcta."
                              ),
                              requisito(
                                "Fecha de cierre o subsanación del defecto",
                                !hayDefectosAbiertos && (!defectos.length || defectos.every((d) => Boolean(d?.fecha_cierre_defecto || d?.fecha_cierre || d?.fcierre_defecto || d?.fecha_subsanacion || d?.fecha_entrada_subsanacion))),
                                hayDefectosAbiertos
                                  ? "Hay defectos abiertos. Registra la fecha de subsanación o cierre cuando corresponda."
                                  : "No hay defectos abiertos."
                              ),
                              requisito(
                                "Documento Defecto registral",
                                !hayDefectosAbiertos || tieneDocEnCategoria("Defecto registral"),
                                "Sube el documento del defecto en la categoría «Defecto registral» y comprueba que abre en el visor."
                              ),
                              requisito(
                                "Documento Subsanación del defecto",
                                !hayDefectosAbiertos || tieneDocEnCategoria("Subsanación del defecto"),
                                "Sube la subsanación en la categoría «Subsanación del defecto» y comprueba que abre en el visor."
                              ),
                              requisito(
                                "Defectos cerrados o subsanados",
                                !hayDefectosAbiertos,
                                "Queda algún defecto abierto; subsánalo y registra su cierre."
                              ),
                            ],
                          },
                          {
                            key: "facturacion-cierre", label: "Facturación y cierre", icono: "🧾",
                            checks: [
                              requisito("Fecha de facturación", Boolean(valor("facturacion_fecha")), "Falta la fecha de facturación"),
                              requisito("Entrega al cliente", Boolean(valor("fecha_entregado_cliente")), "Falta la fecha de entrega al cliente"),
                              requisito("Fin de actividad", Boolean(valor("fecha_fin_actividad")), "Falta la fecha de cierre de la actividad"),
                              requisito("Escritura digital final", tieneDoc("Escritura digital final"), "Falta la escritura digital final"),
                              requisito("Factura notarial", tieneDoc("Factura notarial"), "Falta la factura notarial"),
                              requisito("Factura registral", tieneDoc("Factura Registral", "Factura registral"), "Falta la factura registral"),
                            ],
                          },
                        ];
                        if (compacto) {
                          return (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {fases.map((fase) => {
                                const pendientes = fase.checks.filter((check) => !check.ok);
                                const completa = pendientes.length === 0;
                                const actual = fase.key === actividadActual;
                                return (
                                  <button
                                    key={fase.key}
                                    type="button"
                                    onClick={() => onNavigate?.(fase.key)}
                                    className={`group w-full min-w-0 rounded-xl border p-3 text-left transition hover:-translate-y-px hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${completa ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300" : actual ? "border-blue-300 bg-blue-50/70 hover:border-blue-400" : "border-slate-200 bg-white hover:border-indigo-200"}`}
                                    aria-label={"Ir a " + fase.label + ". " + (completa ? "Control superado" : pendientes.length + " tareas pendientes")}
                                  >
                                    <span className="flex items-center gap-3">
                                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${completa ? "bg-emerald-100" : actual ? "bg-blue-100" : "bg-slate-100"}`}>{completa ? <MolsanIcon name="check" size={22} tone="emerald" /> : <MolsanIcon name={fase.icono} size={30} />}</span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-extrabold text-slate-800"><MolsanIcon name={fase.icono} size={20} /> {fase.label}</span>
                                        <span className={`mt-1 block text-xs font-semibold ${completa ? "text-emerald-700" : actual ? "text-blue-700" : "text-amber-700"}`}>
                                          {completa ? "Control superado" : actual ? "Actividad actual · requiere revisión" : "Con incidencias pendientes"}
                                        </span>
                                      </span>
                                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${completa ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                                        {completa ? "✓ Correcto" : pendientes.length + " pendiente(s)"}
                                      </span>
                                    </span>
                                    <span className="mt-2 block text-[10px] font-semibold text-slate-400 group-hover:text-indigo-600">Abrir actividad →</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }
                        const completadas = fases.filter((fase) => fase.checks.every((check) => check.ok)).length;
                        const totalChecks = fases.reduce((suma, fase) => suma + fase.checks.length, 0);
                        const checksOk = fases.reduce((suma, fase) => suma + fase.checks.filter((check) => check.ok).length, 0);
                        const porcentaje = totalChecks ? Math.round((checksOk / totalChecks) * 100) : 0;
                        return (
                          <>
                            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-700">Calidad documental y de datos</span>
                                <span className="text-xs font-extrabold tabular-nums text-slate-700">{completadas}/7 fases completas · {checksOk}/{totalChecks} comprobaciones</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${porcentaje}%` }} />
                              </div>
                              <p className="mt-2 text-[10px] text-slate-500">Una fase solo se marca como completa cuando todos sus requisitos configurados están cumplidos. La falta de datos no se considera correcta por el mero hecho de haber avanzado de actividad.</p>
                            </div>
                            <div className="mt-4 grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {fases.map((fase, indice) => {
                                const pendientes = fase.checks.filter((check) => !check.ok);
                                const completa = pendientes.length === 0;
                                const actual = fase.key === actividadActual;
                                return (
                                  <article key={fase.key} className={`min-w-0 rounded-xl border p-3 ${completa ? "border-emerald-200 bg-emerald-50/40" : actual ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
                                    <div className="flex items-center gap-3">
                                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-extrabold ${completa ? "border-emerald-500 bg-emerald-500 text-white" : actual ? "border-blue-500 bg-white text-blue-700" : "border-slate-300 bg-white text-slate-400"}`}>
                                        {completa ? "✓" : actual ? "●" : indice + 1}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800">{fase.icono} {fase.label}</p>
                                        <p className={`mt-0.5 text-[10px] font-semibold ${completa ? "text-emerald-700" : actual ? "text-blue-700" : "text-amber-700"}`}>
                                          {completa ? "Control superado" : actual ? "Actividad actual · requiere revisión" : "Con incidencias pendientes"}
                                        </p>
                                      </div>
                                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${completa ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                                        {completa ? "✓ Correcto" : `${pendientes.length} pendiente(s)`}
                                      </span>
                                      <button
                                        type="button"
                                        aria-expanded={!fasesCalidadColapsadas[fase.key]}
                                        onClick={() => setFasesCalidadColapsadas((actuales) => ({ ...actuales, [fase.key]: !actuales[fase.key] }))}
                                        className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                                      >
                                        {fasesCalidadColapsadas[fase.key] ? "＋ Mostrar" : "− Ocultar"}
                                      </button>
                                    </div>
                                    {!fasesCalidadColapsadas[fase.key] && (
                                    <ul className="ml-11 mt-2 space-y-1 border-t border-slate-200/70 pt-2">
                                      {fase.checks.map((check) => (
                                        <li key={check.etiqueta} className="flex items-start gap-2 text-[11px]">
                                          <span
                                            aria-label={check.ok ? "Correcto" : "Pendiente"}
                                            title={check.ok ? "Correcto" : "Pendiente"}
                                            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${check.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                                          >
                                            {check.ok ? "✓" : "✕"}
                                          </span>
                                          <span className={check.ok ? "text-emerald-800" : "text-red-800"}>
                                            <strong>{check.etiqueta}:</strong> {check.ok ? "Correcto" : check.detalle}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                    )}
                                  </article>
                                );
                              })}
                              <article className="min-w-0 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
                                <div className="flex items-center gap-2">
                                  <MolsanIcon name="euro" size={34} tone="violet" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800">PPAD</p>
                                    <p className="mt-0.5 text-[10px] font-semibold text-violet-700">{cargandoPpad ? "Cargando registros…" : `${ppadItems.length} registro(s) · ${ppadItems.filter((item) => !item.compensado).length} pendiente(s)`}</p>
                                  </div>
                                  <button type="button" aria-expanded={!fasesCalidadColapsadas.ppad} onClick={() => setFasesCalidadColapsadas((actuales) => ({ ...actuales, ppad: !actuales.ppad }))} className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">{fasesCalidadColapsadas.ppad ? "＋ Mostrar" : "− Ocultar"}</button>
                                </div>
                                {!fasesCalidadColapsadas.ppad && <div className="mt-2 space-y-1.5 border-t border-violet-200/70 pt-2">
                                  {errorPpad && <p role="alert" className="text-[10px] text-red-700">{errorPpad}</p>}
                                  {!cargandoPpad && !errorPpad && ppadItems.length === 0 && <p className="text-[11px] text-slate-500">No hay registros PPAD en este expediente.</p>}
                                  {ppadItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-2 text-[11px]">
                                    <span className="min-w-0 text-slate-700"><strong>{item.concepto || "PPAD"}</strong><span className="block text-[10px] text-slate-500">{item.compensado ? "✓ Compensado" : "◷ Pendiente"}{item.imputable_a || item.imputableA ? ` · ${item.imputable_a || item.imputableA}` : ""}</span></span>
                                    <span className="shrink-0 font-bold tabular-nums text-slate-800">{formatEuro(Number(item.importe) || 0)}</span>
                                  </div>)}
                                </div>}
                              </article>
                              <article className="min-w-0 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                                <div className="flex items-center gap-2">
                                  <MolsanIcon name="wallet" size={34} tone="amber" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800">Complementos de saldo</p>
                                    <p className="mt-0.5 text-[10px] font-semibold text-amber-800">{cargandoComplementosExpediente ? "Cargando solicitudes…" : `${complementosSaldoExpediente.length} solicitud(es) · ${complementosSaldoExpediente.filter((item) => !["compensado", "cerrado"].includes(String(item.estado || "").toLowerCase())).length} pendiente(s)`}</p>
                                  </div>
                                  <button type="button" aria-expanded={!fasesCalidadColapsadas.complementos} onClick={() => setFasesCalidadColapsadas((actuales) => ({ ...actuales, complementos: !actuales.complementos }))} className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50">{fasesCalidadColapsadas.complementos ? "＋ Mostrar" : "− Ocultar"}</button>
                                </div>
                                {!fasesCalidadColapsadas.complementos && <div className="mt-2 space-y-1.5 border-t border-amber-200/70 pt-2">
                                  {errorComplementosExpediente && <p role="alert" className="text-[10px] text-red-700">{errorComplementosExpediente}</p>}
                                  {!cargandoComplementosExpediente && !errorComplementosExpediente && complementosSaldoExpediente.length === 0 && <p className="text-[11px] text-slate-500">No hay solicitudes de complemento para este expediente.</p>}
                                  {complementosSaldoExpediente.map((item) => <div key={item.id} className="flex items-start justify-between gap-2 text-[11px]">
                                    <span className="min-w-0 text-slate-700"><strong>{item.motivo || "Complemento de saldo"}</strong><span className="block text-[10px] text-slate-500">{item.fecha_solicitud ? formatearFecha(item.fecha_solicitud) : "Sin fecha"} · {item.estado || "Pendiente"}</span></span>
                                    <span className="shrink-0 font-bold tabular-nums text-slate-800">{formatEuro(Number(item.importe) || 0)}</span>
                                  </div>)}
                                </div>}
                              </article>
                            </div>
                          </>
                        );
                      })()}
                    </section>
  );

  return (
    <div
      className="
        ficha-expediente-premium erp-page
        space-y-4
        pb-8
      "
    >

      {/* =====================================================
          CABECERA
      ====================================================== */}

      <section
        className="
           w-full
          overflow-hidden
          rounded-[24px]
          border
          border-white/80
          bg-white/85
          shadow-[0_20px_60px_rgba(15,23,42,0.08)]
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            p-2.5
            sm:p-3
          "
        >

          <div className="min-w-0">

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link
                to="/expedientes"
                className="inline-flex items-center text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                ← Expedientes
              </Link>
            </div>


          </div>


        {/* ===================================================
            BLOQUES SUPERIORES
        ==================================================== */}

        <div
          className="
            min-w-0
            w-full
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-2
              md:grid-cols-2
              xl:grid-cols-12
            "
          >

            <Seccion
              titulo="Titulares y solicitantes"
              subtitulo="Datos independientes de titulares y solicitantes del expediente"
              icono="titular"
              className="h-full xl:col-span-4"
              compacto
              colapsable
              colapsadaInicial
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-2">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Titulares</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Dato
                      campo="Nombre titular"
                      valor={expediente.nombre_titular}
                      destaque
                    />
                    <Dato
                      campo="NIF titular"
                      valor={expediente.nif_titular}
                    />
                  </div>
                </div>
                <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 p-2">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Solicitantes</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Dato
                      campo="Nombre solicitante"
                      valor={expediente.nombre_solicitante}
                      destaque
                    />
                    <Dato
                      campo="NIF solicitante"
                      valor={expediente.nif_solicitante}
                    />
                  </div>
                </div>
              </div>
            </Seccion>

            <Seccion
              titulo="Notario"
              subtitulo="Información del notario asociado"
              icono="notario"
              className="h-full xl:col-span-4"
              compacto
              colapsable
              colapsadaInicial
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Dato
                  campo="Nombre notario"
                  valor={expediente.nombre_notario || expediente.notario}
                  destaque
                />
                <Dato
                  campo="NIF notario"
                  valor={expediente.nif_notario || expediente.notario_nif}
                />
                <Dato
                  campo="Apoderado"
                  valor={expediente.apoderado}
                />
                <Dato
                  campo="Tipo de Firma"
                  valor={expediente.tipo_firma || expediente.tipo_firma_notarial}
                />
              </div>
            </Seccion>

            <Seccion
              titulo="Información crediticia"
              subtitulo="Resumen económico y contractual"
              icono="economico"
              className="h-full xl:col-span-4"
              compacto
              colapsable
              colapsadaInicial
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Dato campo="Contrato" valor={expediente.contrato} compacto />
                <Dato campo="Capital" valor={expediente.capital} tipo="numero" destaque compacto />
                <Dato campo="Importe" valor={expediente.importe} tipo="numero" destaque compacto />
                <Dato campo="Finca" valor={expediente.finca} compacto />
                <Dato campo="Tipo operación" valor={expediente.tipo_operacion} compacto />
                <Dato campo="Subtipo operación" valor={expediente.subtipo_operacion} compacto />
                <Dato campo="Nº solicitud SIA" valor={expediente.num_solicitud_sia} compacto />
                <Dato campo="Observaciones" valor={expediente.observaciones ?? expediente.Observaciones} compacto />
              </div>
            </Seccion>

          </div>

          {/* Ficha y acciones en una sola línea, debajo de los bloques principales */}
          <div className="molsan-page-toolbar mt-3 w-full overflow-x-hidden">
            <div className="flex shrink-0 items-center gap-2 pr-2">
              <MolsanIcon name="folder" size={34} />
              <div className="min-w-[150px]">
                <p className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Ficha de expediente</p>
                <h1 className="whitespace-nowrap text-base font-extrabold leading-tight text-slate-800">{valorVisible(expediente.id_expediente)}</h1>
                <p className="whitespace-nowrap text-[10px] leading-tight text-slate-400">Ficha completa del expediente</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
              <label htmlFor="ficha-promocion" className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Promoción</label>
              <input id="ficha-promocion" type="text" value={expediente?.promocion || ""} readOnly placeholder="Sin asignar" className="w-36 min-w-[100px] cursor-default rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 sm:w-44" aria-label="Promoción asignada al expediente" title="La promoción se asigna desde Utilidades → Gestión de expedientes." />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button type="button" onClick={abrirAgregarExpedientes} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100">
                ➕ Agregar expediente relacionado
              </button>
            </div>
            {(() => {
              const relacionadosVisibles = [
                ...expedientesRelacionados,
                ...expedientesManuales.filter((manual) => !expedientesRelacionados.some(
                  (relacionado) => String(relacionado.id_expediente) === String(manual.id_expediente)
                )).map((manual) => ({ ...manual, _manual: true })),
              ];
              const primerosRelacionados = relacionadosVisibles.slice(0, 2);
              return relacionadosVisibles.length > 0 ? (
                <div className="order-last flex basis-full min-w-0 items-center gap-1.5 border-t border-slate-200 pt-2">
                  <span className="mr-1 shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-400">Relacionados</span>
                  {primerosRelacionados.map((relacionado) => (
                    <Link key={String(relacionado.id_expediente)} to={`/expedientes/${encodeURIComponent(relacionado.id_expediente)}`} className="inline-flex max-w-[180px] min-w-0 shrink items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50" title={relacionado.actividad_actual || "Abrir expediente relacionado"}>
                      <MolsanIcon name="folder" size={20} />
                      <span className="truncate">{valorVisible(relacionado.id_expediente)}</span>
                    </Link>
                  ))}
                  {relacionadosVisibles.length > 2 && (
                    <button type="button" onClick={abrirAgregarExpedientes} className="inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-800 transition hover:bg-amber-100">
                      +{relacionadosVisibles.length - 2} · Ver más
                    </button>
                  )}
                </div>
              ) : null;
            })()}
            {expedienteBloqueado && <span className="inline-flex shrink-0 items-center rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-[10px] font-extrabold text-red-800"><MolsanIcon name="lock" size={16} /> BLOQUEADO · {motivoBloqueoExpediente}</span>}
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={abrirDefecto} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] font-bold leading-tight text-blue-700 shadow-sm transition hover:bg-blue-100" title="Registrar un defecto registral">➕ Alta defecto</button>
              <Boton onClick={abrirControlExpediente} className="!shrink-0 !rounded-lg !px-2.5 !py-2 !text-[11px] !leading-tight">{expedienteBloqueado ? "Control / desbloqueo" : "Control y bloqueo"}</Boton>
              <button type="button" onClick={abrirReclamacionOficina} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] font-bold leading-tight text-amber-800 shadow-sm transition hover:bg-amber-100">✉️ Emails</button>
              <button type="button" onClick={() => window.alert("Pendiente: enlazar este botón con la dirección real del área de clientes.")} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold leading-tight text-slate-600 shadow-sm transition hover:bg-slate-100" title="Pendiente de enlazar con el área de clientes">🔗 Área de clientes</button>
              {tieneDefecto && <button type="button" onClick={abrirDefecto} className="animate-pulse inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] font-bold leading-tight text-red-700 shadow-sm">⚠️ DEFECTO REGISTRAL</button>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="inline-flex max-w-[260px] items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-2.5 py-2 text-[11px]">
                <span className="whitespace-nowrap font-bold text-blue-700">Gestor asignado:</span>
                <span className="truncate font-semibold text-slate-700">{expediente.gestor_asignado_nombre || "Pendiente de asignación"}</span>
              </div>
              <div className="inline-flex max-w-[300px] items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-[11px]" title="Actividad actual del expediente">
                <span className="whitespace-nowrap font-bold text-emerald-800">Actividad actual:</span>
                <span className="truncate font-semibold text-emerald-900">{ACTIVIDADES_EXPEDIENTES.find((actividad) => actividad.key === actividadActual)?.label || "Documentación previa"}</span>
              </div>
            </div>
          </div>
          <p className="mt-1 text-[10px] leading-3 text-amber-700">Aviso: el enlace al área de clientes está pendiente de configurar.</p>
        </div>
        </div>
      </section>


      {/* =====================================================
          ACTIVIDADES DEL EXPEDIENTE
      ====================================================== */}

      <section id="ficha-actividades" className="mb-4 w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div
          className="
            flex min-w-0 flex-col gap-3
          "
        >

          {/* MENU ACTIVIDADES */}

          <div
            className="flex min-w-0 gap-2 overflow-x-auto pb-1"
          >

            {ACTIVIDADES_EXPEDIENTES.filter((actividad) => {
              const operacion = String(expediente?.tipo_operacion || "").trim().toLowerCase()
                .replaceAll("ó", "o")
                .replaceAll("í", "i");
              if (operacion === "cancelacion sin provision") {
                return ["documentacion-previa", "sede-notarial"].includes(actividad.key);
              }
              return true;
            }).map(
              (actividad) => {

                const activa =
                  actividad.key ===
                  actividadSeleccionada;

                const esActual =
                  actividad.key ===
                  actividadActual;

                return (
                  <>
                  {actividad.key === "facturacion-cierre" && (
                    <button
                      key="control-calidad-expediente"
                      type="button"
                      onClick={() => { setMostrarControlCalidad(true); cargarDocumentosCierre(); }}
                      className={`flex h-[84px] w-[190px] min-w-[190px] shrink-0 flex-col justify-start rounded-xl border px-3 py-2 text-left transition ${mostrarControlCalidad ? "border-violet-300 bg-violet-50 shadow-sm" : "border-violet-200 bg-white hover:bg-violet-50"}`}
                    >
                      <span className={`text-xs font-bold ${mostrarControlCalidad ? "text-violet-700" : "text-violet-800"}`}><MolsanIcon name="shield" size={18} /> Control de calidad</span>
                      <span className="mt-2 text-[9px] font-semibold text-slate-500">Revisión independiente</span>
                    </button>
                  )}
                  <button
                    key={
                      actividad.key
                    }
                    type="button"
                    onClick={() => {
                      setMostrarControlCalidad(false);
                      setActividadSeleccionada(actividad.key);
                      if (actividad.key === "defectos-registrales") cargarDocumentosCierre();
                      if (["sede-notarial-protocolo", "liquidacion-impuestos", "tramitacion-inscripcion"].includes(actividad.key)) {
                        const fechaFirma = String(actividadDraft?.fecha_firma || expediente?.fecha_firma || "").slice(0, 10);
                        const fechaLiquidacion = String(
                          actividadDraft?.fecha_liquidacion_tributaria ||
                          expediente?.fecha_liquidacion_tributaria ||
                          fechaFirma
                        ).slice(0, 10);
                        setActividadDraft((actual) => {
                          const camposActividadActual = CAMPOS_ACTIVIDADES[actividad.key] || [];
                          const base = { ...actual };
                          for (const campo of camposActividadActual) {
                            if (!Object.prototype.hasOwnProperty.call(base, campo.key)) base[campo.key] = "";
                          }
                          if (actividad.key === "sede-notarial-protocolo") {
                            return {
                              ...base,
                              apoderado: base.apoderado || "Gestoría",
                              fecha_presentacion: base.fecha_presentacion || fechaFirma,
                              fecha_recogida_notario_presentacion_telematica:
                                base.fecha_recogida_notario_presentacion_telematica || fechaFirma,
                              mover_siguiente_actividad: base.mover_siguiente_actividad ?? false,
                            };
                          }
                          if (actividad.key === "liquidacion-impuestos") {
                            return {
                              ...base,
                              fecha_presentacion_tributaria: base.fecha_presentacion_tributaria || fechaFirma,
                              fecha_liquidacion_tributaria: base.fecha_liquidacion_tributaria || fechaFirma,
                              mover_siguiente_actividad: base.mover_siguiente_actividad ?? true,
                            };
                          }
                          const fechaPresentacion = base.fecha_presentacion || fechaLiquidacion;
                          return {
                            ...base,
                            fecha_presentacion: fechaPresentacion,
                            fecha_vencimiento_asiento:
                              base.fecha_vencimiento_asiento || sumarDiasNaturales(fechaPresentacion, 60),
                            mover_siguiente_actividad: base.mover_siguiente_actividad ?? true,
                          };
                        });
                      }
                      setErrorActividad("");
                      setMensajeActividad("");
                    }}
                    className={`
                      flex h-[84px] w-[190px] min-w-[190px] shrink-0 flex-col justify-start rounded-xl border px-3 py-2 text-left transition
                      ${
                        activa
                          ? "border-blue-300 bg-blue-50 shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }
                    `}
                  >

                    <div
                      className="
                        flex
                        min-w-0
                        items-start
                        gap-2
                      "
                    >

                      <span
                        className="
                          shrink-0
                          text-lg
                          leading-tight
                        "
                      >
                        {
                          actividad.icono
                        }
                      </span>

                      <span
                        className={`
                          min-w-0
                          flex-1
                          break-words
                          text-left
                          text-xs
                          leading-tight
                          font-bold
                          ${
                            activa
                              ? "text-blue-700"
                              : "text-slate-700"
                          }
                        `}
                      >
                        {
                          actividad.label
                        }
                      </span>

                    </div>

                    {esActual && actividadSeleccionada !== "documentacion-previa" && (
                      <span
                        className="
                          mt-2
                          inline-flex
                          rounded-full
                          border
                          border-emerald-200
                          bg-emerald-50
                          px-2
                          py-1
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-wide
                          text-emerald-700
                        "
                      >
                        ● Actividad actual
                      </span>
                    )}

                  </button>
                  </>
                );
              }
            )}

          </div>


          {/* DETALLE */}

          <div className={mostrarControlCalidad ? "hidden" : "min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"}>

            <div
              className="
                mb-4
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
              "
            >

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-800">
                  <MolsanIcon name={actividadSeleccionadaDef.icono} size={28} /> {actividadSeleccionadaDef.label}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">Estado actividad</span>
                    <span className="font-semibold text-slate-800">{expediente.estado_actividad || "—"}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">Oficina</span>
                    <button type="button" onClick={async () => {
                      setOficinaDetalleAbierta(true);
                      setCargandoOficinaDetalle(true);
                      setOficinaCatalogoDetalle(null);
                      try {
                        const respuesta = await axios.get("/oficinas-catalogo", { params: { q: expediente?.oficina || "", limit: 200 } });
                        const items = Array.isArray(respuesta?.data?.items) ? respuesta.data.items : [];
                        const valor = normalizarTexto(expediente?.oficina || "");
                        const encontrada = items.find((item) => normalizarTexto(item.oficina) === valor || normalizarTexto(item.nombre) === valor) || items.find((item) => valor && (normalizarTexto(item.oficina).includes(valor) || normalizarTexto(item.nombre).includes(valor) || valor.includes(normalizarTexto(item.oficina))));
                        setOficinaCatalogoDetalle(encontrada || null);
                      } catch (error) {
                        setOficinaCatalogoDetalle(null);
                      } finally {
                        setCargandoOficinaDetalle(false);
                      }
                    }} className="font-semibold text-indigo-700 underline decoration-dotted underline-offset-2 hover:text-indigo-900" title="Consultar datos del catálogo de oficinas">{expediente.oficina || "—"}</button>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">Fecha alta</span>
                    <span className="font-semibold text-slate-800">{expediente.fecha_alta ? formatearFecha(expediente.fecha_alta) : "—"}</span>
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Campos de esta actividad</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { setErrorActividad(""); setMensajeActividad(""); setMostrarModalDatosActividad(true); }} className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-extrabold text-sky-800 transition hover:bg-sky-100">
                  ☷ Datos de actividad
                </button>
                <button type="button" onClick={() => { setPestanaActividad("datos"); setMostrarModalPpad(true); setErrorPpad(""); }} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-800 transition hover:bg-indigo-100">
                  PPAD
                  {ppadItems.filter((item) => !item.compensado).length > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">{ppadItems.filter((item) => !item.compensado).length}</span>}
                </button>
                {actividadSeleccionada === "gestion-economica" && (
                  <TraspasoSaldoPanel expediente={expediente} visible={actividadSeleccionada === "gestion-economica"} />
                )}
                <button type="button" onClick={() => { setPestanaActividad("datos"); abrirAcciones(); }} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100">
                  ⚡ Acciones
                  {accionesExpediente.length > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">{accionesExpediente.length}</span>}
                </button>
              </div>

              {actividadSeleccionada !== "documentacion-previa" && actividadSeleccionada ===
                actividadActual && (
                <EstadoBadge
                  valor="Actividad actual"
                />
              )}

            </div>


            {(
              <div className="mb-4 min-w-0">
                {actividadSeleccionada !== "sede-notarial" && (
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                    <CarpetaDigitalModal
                      expedienteId={expediente?.id_expediente || id}
                      modoActividad
                      actividadId={actividadSeleccionada}
                      tipoOperacion={expediente?.tipo_operacion || expediente?.tipoOperacion || expediente?.operacion}
                      datosEnvioNotario={expediente}
                      datosPanelActividad={{ ...expediente, ...actividadDraft }}
                      camposPanelActividad={CAMPOS_ACTIVIDADES[actividadSeleccionada] || []}
                      onAbrirEnvioNotario={() => setMostrarEnviarNotario(true)}
                      onLiquidar={() => {
                        setMostrarLiquidarExpediente(true);
                        cargarGastosExpediente();
                        cargarDocumentosCierre();
                      }}
                      onFacturar={generarHonorariosGestoria}
                      generandoFacturacion={generandoHonorariosGestoria}
                      facturaEmitida={Boolean(honorariosGestoria?.guardado || expediente?.facturacion_fecha || expediente?.numero_factura || expediente?.factura_honorarios_id)}
                      onPagar={() => { void abrirPagoDesdeGestionEconomica(); }}
                      panelLibroPagos={<section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-4 sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><span aria-hidden="true">▤</span></span>
                        <div>
                          <h5 className="text-sm font-extrabold text-slate-900">Control económico · Libro de pagos</h5>
                          <p className="mt-1 text-xs text-slate-500">Saldo inicial, gastos imputados y saldo pendiente del expediente.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={cargarGastosExpediente} disabled={cargandoGastos} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{cargandoGastos ? "Actualizando…" : "↻ Actualizar"}</button>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Saldo inicial</p>
                          <p className="mt-2 text-xl font-extrabold tabular-nums text-slate-900">{importeInicialDisponible ? formatEuro(importeInicialProvision) : "—"}</p>
                          <p className="mt-1 text-[10px] text-slate-500">Campo Importe del expediente</p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Saldo pendiente</p>
                          <p className={`mt-2 text-xl font-extrabold tabular-nums ${resumenEconomico.saldoActual < 0 ? "text-red-700" : "text-emerald-700"}`}>{importeInicialDisponible ? formatEuro(resumenEconomico.saldoActual) : "—"}</p>
                          <p className="mt-1 text-[10px] text-slate-500">Tras descontar pagos confirmados</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total imputado</p>
                          <p className="mt-2 text-xl font-extrabold tabular-nums text-slate-900">{importeInicialDisponible ? formatEuro(importeInicialProvision - resumenEconomico.saldoActual) : formatEuro(resumenEconomico.movimientos.reduce((s, m) => s + Math.abs(Number(m.importeMovimiento || 0)), 0))}</p>
                          <p className="mt-1 text-[10px] text-slate-500">Pagos contabilizados</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Pagos registrados</p>
                          <p className="mt-2 text-xl font-extrabold tabular-nums text-slate-900">{resumenEconomico.movimientos.length}</p>
                          <p className="mt-1 text-[10px] text-slate-500">Movimientos confirmados</p>
                        </div>
                      </div>
                      {importeInicialDisponible && importeInicialProvision > 0 && (
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-600">Consumo del saldo inicial</span><span className="text-xs font-bold tabular-nums text-slate-600">{formatPercent(Math.max(0, Math.min(100, ((importeInicialProvision - resumenEconomico.saldoActual) / importeInicialProvision) * 100)))}</span></div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${resumenEconomico.saldoActual < 0 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(0, Math.min(100, ((importeInicialProvision - resumenEconomico.saldoActual) / importeInicialProvision) * 100))}%` }} /></div>
                        </div>
                      )}
                      <div className="mt-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Libro de movimientos contables</h6><span className="text-[11px] text-slate-500">Solo los pagos confirmados descuentan el saldo</span></div>
                        {cargandoGastos ? (
                          <p className="py-4 text-sm text-slate-500">Cargando movimientos contables…</p>
                        ) : gastosExpediente.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Todavía no hay líneas contables guardadas. Cada gasto registrado aparecerá aquí con su ID y desglose fiscal.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full min-w-[1080px] text-left text-xs">
                              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3 font-bold">ID de pago</th><th className="px-3 py-3 font-bold">Fecha</th><th className="px-3 py-3 font-bold">Tipo de documento</th><th className="px-3 py-3 text-right font-bold">Cuantía documento</th><th className="px-3 py-3 text-right font-bold">Impuesto</th><th className="px-3 py-3 text-right font-bold">Total</th><th className="px-3 py-3 font-bold">Estado</th><th className="px-3 py-3 text-right font-bold">Saldo tras pago</th><th className="px-3 py-3 font-bold">Acciones</th></tr></thead>
                              <tbody className="divide-y divide-slate-100">
                                {resumenEconomico.movimientos.length === 0 && gastosPendientesResumen.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-500">Todavía no hay gastos ni pagos registrados.</td></tr>}
                                {gastosPendientesResumen.map((gasto) => { const fmtPendiente = (valor) => formatEuro(Number(valor ?? 0)); const importe = Math.abs(Number(gasto.importe_resultante ?? gasto.importe ?? 0)); const base = Number(gasto.base_imponible ?? gasto.base_sujeta_impuestos ?? gasto.base_exenta_impuestos ?? 0); const impuesto = Number(gasto.importe_impuesto ?? gasto.impuesto ?? gasto.iva ?? 0); return <tr key={"pendiente-" + gasto.id} className="bg-amber-50/40 text-slate-700"><td className="whitespace-nowrap px-3 py-3 font-extrabold text-amber-700">{gasto.numero_documento || ("GAS-" + String(gasto.id).padStart(6, "0"))}</td><td className="whitespace-nowrap px-3 py-3">{formatearFecha(gasto.fecha_factura || gasto.fecha || gasto.created_at)}</td><td className="px-3 py-3"><span className="font-semibold">{gasto.tipo || "Gasto registrado"}</span>{gasto.descripcion ? <span className="mt-1 block text-slate-500">{gasto.descripcion}</span> : null}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{fmtPendiente(base > 0 ? base : importe)}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{impuesto > 0 ? fmtPendiente(impuesto) : "—"}</td><td className="whitespace-nowrap px-3 py-3 text-right font-extrabold tabular-nums">{fmtPendiente(importe)}</td><td className="whitespace-nowrap px-3 py-3"><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Pendiente</span></td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{importeInicialDisponible ? fmtPendiente(resumenEconomico.saldoActual) : "—"}</td><td className="px-3 py-3">{esAdministradorSesion ? <button type="button" onClick={() => abrirOrdenPago(gasto)} disabled={importe <= 0} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50">Pagar</button> : <span className="text-[10px] text-slate-400">Solo administración</span>}</td></tr>; })}
                                {resumenEconomico.movimientos.map((movimiento) => {
                                  const fmt = (valor) => formatEuro(Number(valor ?? 0));
                                  const importeMovimiento = Math.abs(Number(movimiento.importeMovimiento ?? movimiento.importe_resultante ?? movimiento.importe ?? 0));
                                  const textoMovimiento = normalizarTexto([movimiento.tipo, movimiento.concepto_pago, movimiento.descripcion, movimiento.tipo_impuesto].filter(Boolean).join(" "));
                                  const esPagoImpuesto = movimiento.es_movimiento_pago && /impuesto|ajd|itp|tribut/.test(textoMovimiento);
                                  const cuantiaDocumento = esPagoImpuesto ? null : numeroDecimalGasto(cuantiaFincasParaEnvio);
                                  const impuesto = esPagoImpuesto ? importeMovimiento : 0;
                                  const total = movimiento.es_movimiento_pago ? importeMovimiento : Math.abs(Number(movimiento.importe_resultante ?? movimiento.importe ?? movimiento.importe_total_bruto ?? importeMovimiento));
                                  const estado = movimiento.es_movimiento_pago ? (movimiento.anulado_en ? "Anulado" : "Pagado") : String(movimiento.estado_pago || "Pagado").trim();
                                  const saldoTrasMovimiento = importeInicialDisponible ? Number(movimiento.saldoCalculado) : null;
                                  return <tr key={movimiento.id} className="text-slate-700 transition-colors hover:bg-indigo-50/40"><td className="whitespace-nowrap px-3 py-3 font-extrabold text-indigo-700">{movimiento.numero_documento || ("PAG-" + String(movimiento.pago_id || movimiento.id).padStart(6, "0"))}</td><td className="whitespace-nowrap px-3 py-3">{formatearFecha(movimiento.fecha || movimiento.fecha_factura)}</td><td className="px-3 py-3"><span className="font-semibold">{movimiento.tipo || "Documento"}</span>{movimiento.concepto_pago ? <span className="mt-1 block text-slate-500">{movimiento.concepto_pago}</span> : movimiento.descripcion ? <span className="mt-1 block text-slate-500">{movimiento.descripcion}</span> : null}{movimiento.tipo_impuesto && !movimiento.es_movimiento_pago ? <span className="mt-1 block text-[10px] text-slate-400">{movimiento.tipo_impuesto}</span> : null}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{cuantiaDocumento === null || cuantiaDocumento === 0 ? "—" : fmt(cuantiaDocumento)}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{impuesto > 0 ? fmt(impuesto) : "—"}</td><td className="whitespace-nowrap px-3 py-3 text-right font-extrabold tabular-nums">{fmt(total)}</td><td className="whitespace-nowrap px-3 py-3"><span className={"rounded-full px-2 py-1 text-[10px] font-bold " + (estado === "Anulado" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>{estado}</span>{movimiento.motivo_anulacion ? <span className="mt-1 block max-w-[220px] whitespace-normal text-[10px] text-red-600" title={movimiento.motivo_anulacion}>Motivo: {movimiento.motivo_anulacion}</span> : null}</td><td className={"whitespace-nowrap px-3 py-3 text-right font-extrabold tabular-nums " + (saldoTrasMovimiento !== null && saldoTrasMovimiento < 0 ? "text-red-700" : "text-slate-900")}>{saldoTrasMovimiento === null ? "—" : fmt(saldoTrasMovimiento)}</td><td className="px-3 py-3">{movimiento.es_movimiento_pago && !movimiento.anulado_en && esAdministradorSesion ? <button type="button" onClick={() => void anularPagoGasto(movimiento)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-50">Anular pago</button> : movimiento.anulado_en ? <span className="text-[10px] font-semibold text-slate-500">Anulado</span> : "—"}</td></tr>;
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {!importeInicialDisponible && <p className="mt-2 text-xs text-amber-700">No hay un Importe inicial válido en el expediente; revisa el dato antes de utilizar el saldo como referencia contable.</p>}
                      </div>
                      {gastosPendientesResumen.length > 0 && <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">{gastosPendientesResumen.length} gasto(s) registrado(s) todavía pendiente(s); no se descuentan del saldo hasta confirmar el pago.</p>}
                      <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                        <button type="button" onClick={() => generarHonorariosGestoria?.()} disabled={generandoHonorariosGestoria || !generarHonorariosGestoria} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50" title="Generar y guardar la factura en Honorarios gestoría, sin crear pagos ni avisos de deuda">
                          {generandoHonorariosGestoria ? "Generando factura…" : "Facturar"}
                        </button>
                      </div>
                    </div>
                    {errorGastos && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{errorGastos}</p>}
                  </section>}
                      formularioPago={origenFormularioGasto === "pagar" ? (
                        <>
                        {mostrarFormularioPagoReal && createPortal((
                          <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="orden-pago-titulo">
                            <section className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-slate-50 shadow-2xl">
                              <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                                <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · Gestión económica</p><h2 id="orden-pago-titulo" className="mt-1 text-xl font-extrabold text-slate-900">Orden de pago</h2><p className="mt-1 text-xs text-slate-500">Expediente {expediente?.id_expediente || expediente?.id || id || "—"} · Preparar la orden no ejecuta una transferencia bancaria.</p></div>
                                <button type="button" onClick={() => { if (!guardandoPagoReal) { setMostrarFormularioPagoReal(false); setPagoGastoSeleccionadoId(""); } }} disabled={guardandoPagoReal} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg leading-none text-slate-600 hover:bg-slate-100 disabled:opacity-50" aria-label="Cerrar orden de pago">×</button>
                              </header>
                              <form onSubmit={registrarPagoObligacion} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                                <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <h3 className="mb-3 text-sm font-extrabold text-slate-800">1. Concepto del gasto</h3>
                                  <label className="block text-xs font-bold text-slate-600">Tipo de documento / obligación
                                    <input readOnly value={gastoForm.tipo || (gastosExpediente.find((g) => String(g.id) === String(pagoGastoSeleccionadoId))?.tipo || "Gasto")} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800" />
                                  </label>
                                </section>
                                <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <h3 className="mb-3 text-sm font-extrabold text-slate-800">2. Ordenante del pago</h3>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block text-xs font-bold text-slate-600">Nombre y apellidos
                                      <input readOnly value={[expediente?.facturacion_nombre, expediente?.facturacion_apellidos].filter(Boolean).join(" ")} placeholder="Sin datos de facturación" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">DNI / NIF
                                      <input readOnly value={expediente?.facturacion_dni_nif || expediente?.dni_facturacion || expediente?.nif_facturacion || ""} placeholder="Sin DNI/NIF de facturación" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                  </div>
                                </section>
                                <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <h3 className="mb-3 text-sm font-extrabold text-slate-800">3. Beneficiario</h3>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block text-xs font-bold text-slate-600">Nombre del notario
                                      <input readOnly value={expediente?.nombre_notario || expediente?.notario || gastoForm.nombre_notario || ""} placeholder="Sin notario vinculado en Envío a notario" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">DNI / NIF del notario
                                      <input readOnly value={expediente?.nif_notario || expediente?.notario_nif || gastoForm.nif_notario || ""} placeholder="Sin NIF del notario" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                  </div>
                                  <label className="mt-3 block text-xs font-bold text-slate-600">Cuenta bancaria principal · CTN / Medios de pago
                                    <input readOnly value={gastoForm.cuenta_bancaria || ""} placeholder="No consta cuenta principal en la ficha CTN" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm font-normal text-slate-800" />
                                  </label>
                                  {cuentasBancariasNotario.length === 0 && <p className="mt-2 text-[11px] text-amber-700">No se ha podido confirmar la cuenta principal del notario. Revisa la ficha CTN antes de continuar.</p>}
                                </section>
                                <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <h3 className="mb-3 text-sm font-extrabold text-slate-800">4. Detalle del gasto</h3>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block text-xs font-bold text-slate-600">Medio de pago
                                      <input readOnly value="Transferencia bancaria a la cuenta del destinatario" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Fecha del pago
                                      <input readOnly type="date" value={pagoRealForm.fecha} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                  </div>
                                </section>
                                <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-slate-800">5. Datos de la factura</h3><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">Extracción PDF pendiente</span></div>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block text-xs font-bold text-slate-600">N.º de factura
                                      <input value={gastoForm.numero_factura || ""} onChange={(e) => setGastoForm((a) => ({ ...a, numero_factura: e.target.value }))} placeholder="Pendiente de lectura del PDF" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Fecha de factura
                                      <input type="date" value={gastoForm.fecha_factura || ""} onChange={(e) => setGastoForm((a) => ({ ...a, fecha_factura: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                  </div>
                                </section>
                                <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                                  <h3 className="mb-3 text-sm font-extrabold text-slate-800">6. Datos fiscales</h3>
                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    <label className="block text-xs font-bold text-slate-600">Base imponible total
                                      <input readOnly value={(gastoForm.base_exenta_impuestos !== "" || gastoForm.base_sujeta_impuestos !== "") ? (Number(gastoForm.base_exenta_impuestos || 0) + Number(gastoForm.base_sujeta_impuestos || 0)) : ""} placeholder="Pendiente de lectura del PDF" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Base exenta / no sujeta
                                      <input type="number" min="0" step="0.01" value={gastoForm.base_exenta_impuestos || ""} onChange={(e) => setGastoForm((a) => ({ ...a, base_exenta_impuestos: e.target.value }))} placeholder="Pendiente de lectura del PDF" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Base sujeta a impuestos
                                      <input type="number" min="0" step="0.01" value={gastoForm.base_sujeta_impuestos || ""} onChange={(e) => setGastoForm((a) => ({ ...a, base_sujeta_impuestos: e.target.value }))} placeholder="Pendiente de lectura del PDF" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Tipo de impuesto
                                      <select value={gastoForm.tipo_impuesto || ""} onChange={(e) => { const v=e.target.value; const tipo=tiposImpositivosCatalogo.find((x) => x.categoria === "impuesto" && x.nombre === v); setGastoForm((a) => ({ ...a, tipo_impuesto:v, porcentaje_impuesto:tipo ? (tipo.porcentaje == null ? "" : String(tipo.porcentaje)) : a.porcentaje_impuesto })); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"><option value="">Seleccionar del catálogo…</option>{gastoForm.tipo_impuesto && !tiposImpositivosCatalogo.some((x) => x.categoria === "impuesto" && x.nombre === gastoForm.tipo_impuesto) && <option value={gastoForm.tipo_impuesto}>{gastoForm.tipo_impuesto} · valor histórico</option>}{tiposImpositivosCatalogo.filter((x) => x.categoria === "impuesto").map((x) => <option key={x.id} value={x.nombre}>{x.nombre}</option>)}</select>
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Tramo / tipo
                                      <select value={gastoForm.tramo_impuesto || "General"} onChange={(e) => setGastoForm((a) => ({ ...a, tramo_impuesto:e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">{["Exento","General","Reducido","Super reducido","Único"].map((x) => <option key={x}>{x}</option>)}</select>
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Porcentaje del impuesto (%)
                                      <input type="number" min="0" max="100" step="0.01" value={gastoForm.porcentaje_impuesto ?? "0"} onChange={(e) => setGastoForm((a) => ({ ...a, porcentaje_impuesto:e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Tipo de retención
                                      <select value={gastoForm.tipo_retencion || ""} onChange={(e) => { const v=e.target.value; const tipo=tiposImpositivosCatalogo.find((x) => x.categoria === "retencion" && x.nombre === v); setGastoForm((a) => ({ ...a, tipo_retencion:v, porcentaje_retencion:tipo?.porcentaje == null ? "" : String(tipo.porcentaje) })); }} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800"><option value="">Seleccionar del catálogo…</option>{gastoForm.tipo_retencion && !tiposImpositivosCatalogo.some((x) => x.categoria === "retencion" && x.nombre === gastoForm.tipo_retencion) && <option value={gastoForm.tipo_retencion}>{gastoForm.tipo_retencion} · valor histórico</option>}{tiposImpositivosCatalogo.filter((x) => x.categoria === "retencion").map((x) => <option key={x.id} value={x.nombre}>{x.nombre}</option>)}</select>
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Porcentaje de retención (%)
                                      <input type="number" min="0" max="100" step="0.01" value={gastoForm.porcentaje_retencion ?? "0"} onChange={(e) => setGastoForm((a) => ({ ...a, porcentaje_retencion:e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                  </div>
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <label className="block text-xs font-bold text-slate-600">Importe total de factura (€)
                                      <input readOnly value={Number(gastoForm.importe_total_bruto || (gastosExpediente.find((g) => String(g.id) === String(pagoGastoSeleccionadoId))?.importe_total_bruto ?? gastosExpediente.find((g) => String(g.id) === String(pagoGastoSeleccionadoId))?.importe_resultante ?? gastosExpediente.find((g) => String(g.id) === String(pagoGastoSeleccionadoId))?.importe ?? 0))} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-extrabold text-slate-900" />
                                    </label>
                                    <label className="block text-xs font-bold text-slate-600">Importe de este pago (€)
                                      <input required type="number" min="0.01" step="0.01" value={pagoRealForm.importe} onChange={(e) => setPagoRealForm((a) => ({ ...a, importe: e.target.value }))} className="mt-1 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-extrabold text-emerald-900" />
                                    </label>
                                  </div>
                                </section>
                                {errorPagoReal && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorPagoReal}</p>}
                                <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
                                  <p className="max-w-xl text-xs leading-5 text-slate-500">Al confirmar, se guardarán los datos de la factura en la obligación y se registrará un movimiento en el histórico. No se ordena ninguna transferencia bancaria desde el ERP.</p>
                                  <div className="flex gap-2"><button type="button" onClick={() => { if (!guardandoPagoReal) { setMostrarFormularioPagoReal(false); setPagoGastoSeleccionadoId(""); } }} disabled={guardandoPagoReal} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50">Cancelar</button><button type="submit" disabled={guardandoPagoReal || !pagoGastoSeleccionadoId} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50">{guardandoPagoReal ? "Registrando pago…" : "Pagar"}</button></div>
                                </footer>
                              </form>
                            </section>
                          </div>
                        ), document.body)}
                        {mostrarFormularioGasto && (
                          <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3 sm:p-4">
                            <div className="mx-auto flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                          <form onSubmit={guardarGastoExpediente} className="flex min-h-0 flex-col overflow-hidden">
                            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                              <div><h5 id="titulo-modal-gasto" className="text-base font-extrabold text-slate-900">{gastoEdicionId ? "Completar obligación económica" : "Registrar obligación económica"}</h5><p className="mt-1 text-xs text-slate-500">Adjuntar una factura crea una obligación pendiente. Solo el formulario de pago confirma movimientos reales.</p></div>
                              <button type="button" aria-label="Cerrar ventana" onClick={() => setMostrarFormularioGasto(false)} disabled={guardandoGasto} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg leading-none text-slate-600 hover:bg-slate-100 disabled:opacity-50">×</button>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">Pago: pendiente</span>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(360px,0.9fr)]">
                              <div className="min-w-0">
                              <div className="space-y-3">
                                <h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Factura y proveedor</h6>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-indigo-800">Honorarios de gestoría (opcional)</span><select value={honorarioGestoriaId} onChange={(e) => { const idSeleccionado = e.target.value; setHonorarioGestoriaId(idSeleccionado); const tarifa = honorariosCatalogo.find((x) => String(x.id) === idSeleccionado); if (tarifa) {
                                    const importeTarifa = Number(tarifa.importe || 0).toFixed(2);
                                    const baseTarifa = Number(tarifa.base_imponible ?? tarifa.importe ?? 0).toFixed(2);
                                    const tipoCatalogo = String(tarifa.tipo_impuesto || "IVA").toUpperCase();
                                    const porcentajeTarifa = Number(tarifa.porcentaje_impuesto ?? (tipoCatalogo === "IGIC" ? 7 : tipoCatalogo === "EXENTO" ? 0 : 21));
                                    const tipoFormulario = tipoCatalogo === "EXENTO" ? "Exento" : tipoCatalogo === "IGIC" ? (porcentajeTarifa === 5 ? "IGIC 5%" : porcentajeTarifa === 6.5 ? "IGIC 6,50%" : "IGIC 7%") : "IVA 21%";
                                    const exento = tipoCatalogo === "EXENTO";
                                    setGastoForm((a) => ({
                                      ...a,
                                      tipo: "Honorarios de gestoría",
                                      descripcion: tarifa.nombre,
                                      importe_total_bruto: importeTarifa,
                                      importe: importeTarifa,
                                      base_exenta_impuestos: exento ? baseTarifa : "0.00",
                                      base_sujeta_impuestos: exento ? "0.00" : baseTarifa,
                                      tipo_impuesto: tipoFormulario,
                                      porcentaje_impuesto: String(porcentajeTarifa),
                                      base_exenta_retencion: "0.00",
                                      base_sujeta_retencion: "0.00",
                                      porcentaje_retencion: "0",
                                      tipo_retencion: "Sin retención",
                                    }));
                                  } }} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm"><option value="">No aplicar una tarifa de honorarios</option>{honorariosCatalogo.filter((x) => x.activo).map((x) => <option key={x.id} value={String(x.id)}>{x.nombre} · base {formatEuro(Number(x.base_imponible ?? x.importe ?? 0))} + {String(x.tipo_impuesto || "IVA").toUpperCase()} {formatPercent(Number(x.porcentaje_impuesto ?? 21))} · total {formatEuro(Number(x.importe || 0))}</option>)}</select><span className="mt-1 block text-[11px] text-slate-500">Al elegir una tarifa, se rellena automáticamente el importe total con el precio configurado.</span></label>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Concepto del gasto *</span><select required value={gastoForm.tipo} onChange={(e) => setGastoForm((a) => ({...a, tipo:e.target.value, descripcion:a.descripcion || e.target.options[e.target.selectedIndex]?.text || e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">{cargandoConceptosGasto ? "Cargando catálogo…" : "Selecciona un concepto"}</option>{conceptosGasto.map((c) => <option key={String(c.value)} value={String(c.value)}>{c.label}</option>)}{!conceptosGasto.some((c) => String(c.value) === "Honorarios de gestoría") && <option value="Honorarios de gestoría">Honorarios de gestoría</option>}</select></label>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tipo de concepto ABSIS (TIPOCONCEPTO)</span><select value={gastoForm.tipo_concepto_absis} onChange={(e) => setGastoForm((a) => ({ ...a, tipo_concepto_absis: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">{cargandoTiposConceptoAbsis ? "Cargando catálogo ABSIS…" : tiposConceptoAbsis.length ? "Selecciona el tipo ABSIS" : "Sin valores activos en Catálogo ABSIS"}</option>{tiposConceptoAbsis.map((item) => <option key={item.id} value={String(item.codigo || item.valor || "")}>{item.codigo ? `${item.codigo} — ${item.valor}` : item.valor}</option>)}</select><span className="mt-1 block text-[11px] text-slate-500">Opcional hasta validar con Informática los códigos oficiales y su correspondencia con el concepto interno.</span></label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">NIF/CIF/NIE notario</span><input value={gastoForm.nif_notario} onChange={(e)=>setGastoForm(a=>({...a,nif_notario:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Nombre del notario</span><input value={gastoForm.nombre_notario} onChange={(e)=>setGastoForm(a=>({...a,nombre_notario:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                </div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Pagador / razón social</span><input value={gastoForm.pagador} onChange={(e)=>setGastoForm(a=>({...a,pagador:e.target.value}))} placeholder="Nombre de facturación" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Número de factura</span><input value={gastoForm.numero_factura} onChange={(e)=>setGastoForm(a=>({...a,numero_factura:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Fecha de factura *</span><input required type="date" value={gastoForm.fecha_factura} onChange={(e)=>setGastoForm(a=>({...a,fecha_factura:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                </div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Fecha del gasto / factura *</span><input required type="date" value={gastoForm.fecha} onChange={(e)=>setGastoForm(a=>({...a,fecha:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                <div className="space-y-2">
                                  {cuentasBancariasNotario.length > 0 && <label className="block"><span className="mb-1 block text-xs font-bold text-indigo-800">Cuentas guardadas en la ficha CTN</span><select value={cuentasBancariasNotario.some((cuenta) => cuenta.iban === gastoForm.cuenta_bancaria) ? gastoForm.cuenta_bancaria : "__manual__"} onChange={(e)=>setGastoForm(a=>({...a,cuenta_bancaria:e.target.value === "__manual__" ? "" : e.target.value}))} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm"><option value="__manual__">Introducir otra cuenta manualmente</option>{cuentasBancariasNotario.map((cuenta)=><option key={cuenta.id} value={cuenta.iban}>{cuenta.label} · {cuenta.iban}</option>)}</select></label>}
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Cuenta bancaria / IBAN</span><input value={gastoForm.cuenta_bancaria} onChange={(e)=>setGastoForm(a=>({...a,cuenta_bancaria:e.target.value.toUpperCase()}))} placeholder="Selecciona una cuenta guardada o introduce el IBAN" maxLength={34} autoComplete="off" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Medio de pago</span><select value={gastoForm.medio_pago} onChange={(e)=>setGastoForm(a=>({...a,medio_pago:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>Transferencia</option><option>Cheque</option><option>Tarjeta</option><option>Efectivo</option><option>Otro</option></select></label></div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Documento / URL de factura</span><input type="url" value={gastoForm.documento_url} onChange={(e)=>setGastoForm(a=>({...a,documento_url:e.target.value}))} placeholder="https://…" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                              </div>
                              </div>
                              <div className="space-y-3">
                                <h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Impuestos y retenciones</h6>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tramo de impuesto</span><select value={gastoForm.tramo_impuesto} onChange={(e)=>setGastoForm(a=>({...a,tramo_impuesto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{["Exento","General","Reducido","Super reducido","Único"].map(x=><option key={x}>{x}</option>)}</select></label>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tipo impositivo</span><select value={gastoForm.tipo_impuesto} onChange={(e)=>{const v=e.target.value;setGastoForm(a=>({...a,tipo_impuesto:v,porcentaje_impuesto:v==="IVA 21%"?"21":v==="IGIC 5%"?"5":v==="IGIC 6,50%"?"6.5":v==="IGIC 7%"?"7":"0"}))}} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{!["Exento","IVA 21%","IGIC 5%","IGIC 6,50%","IGIC 7%"].includes(gastoForm.tipo_impuesto) && <option value={gastoForm.tipo_impuesto}>{gastoForm.tipo_impuesto}</option>}{["Exento","IVA 21%","IGIC 5%","IGIC 6,50%","IGIC 7%"].map(x=><option key={x}>{x}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Porcentaje (%)</span><input type="number" min="0" max="100" step="0.01" value={gastoForm.porcentaje_impuesto} onChange={(e)=>setGastoForm(a=>({...a,porcentaje_impuesto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="grid gap-3 sm:grid-cols-2">{[["Base exenta (€)","base_exenta_impuestos"],["Base sujeta (€)","base_sujeta_impuestos"]].map(([label,key])=><label key={key} className="block"><span className="mb-1 block text-xs font-bold text-slate-700">{label}</span><input type="number" min="0" step="0.01" value={gastoForm[key]} onChange={(e)=>setGastoForm(a=>({...a,[key]:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>)}</div>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><div className="flex justify-between"><span>Impuesto calculado</span><strong>{formatEuro(impuestoCalculadoGasto)}</strong></div></div>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Base exenta retención (€)</span><input type="number" min="0" step="0.01" value={gastoForm.base_exenta_retencion} onChange={(e)=>setGastoForm(a=>({...a,base_exenta_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Base sujeta retención (€)</span><input type="number" min="0" step="0.01" value={gastoForm.base_sujeta_retencion} onChange={(e)=>setGastoForm(a=>({...a,base_sujeta_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Retención</span><select value={gastoForm.tipo_retencion} onChange={(e)=>setGastoForm(a=>({...a,tipo_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>IRPF profesionales</option><option>Sin retención</option></select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">IRPF (%)</span><input type="number" min="0" max="21" step="0.01" value={gastoForm.porcentaje_retencion} onChange={(e)=>setGastoForm(a=>({...a,porcentaje_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div className="flex justify-between text-xs text-slate-600"><span>Retención calculada</span><strong>{formatEuro(retencionCalculadaGasto)}</strong></div><div className="mt-2 flex items-end justify-between gap-3"><span className="text-xs font-bold text-indigo-900">Resultado calculado</span><strong className="text-2xl text-indigo-950">{formatEuro(resultadoCalculadoGasto)}</strong></div><label className="mt-3 block"><span className="mb-1 block text-xs font-bold text-slate-700">Total bruto de factura (€) *</span><input required type="number" min="0" step="0.01" value={gastoForm.importe_total_bruto} onChange={(e)=>setGastoForm(a=>({...a,importe_total_bruto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Descripción *</span><input required value={gastoForm.descripcion} onChange={(e)=>setGastoForm(a=>({...a,descripcion:e.target.value}))} placeholder="Concepto detallado de la factura" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                              </div>
                              <aside className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-3">
                                  <h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Factura de Carpeta Digital</h6>
                                  <p className="mt-1 text-[11px] text-slate-500">Factura notarial o registral · PDF</p>
                                </div>
                                <label className="mb-3 block">
                                  <span className="mb-1 block text-xs font-bold text-slate-700">Documento a revisar</span>
                                  <select value={documentoFacturaSeleccionado} onChange={(e) => { setDocumentoFacturaSeleccionado(e.target.value); setGastoForm(a => ({...a, documento_carpeta_id: e.target.value})); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                                    <option value="">Selecciona una factura PDF…</option>
                                    {documentosFacturaElegibles.map((doc) => <option key={doc.id} value={String(doc.id)}>{doc.nombre_original || doc.nombre || `Documento ${doc.id}`} · {doc.categoria || doc.categoria_nombre}</option>)}
                                  </select>
                                </label>
                                {cargandoVistaPreviaFactura ? <p className="p-4 text-xs text-slate-500">Cargando PDF…</p> : null}
                                {errorVistaPreviaFactura ? <p role="alert" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{errorVistaPreviaFactura}</p> : null}
                                {urlVistaPreviaFactura ? <iframe title="Vista previa de factura" src={urlVistaPreviaFactura} className="h-[58vh] min-h-[360px] w-full rounded-lg border border-slate-200 bg-white" /> : null}
                                {!urlVistaPreviaFactura && !cargandoVistaPreviaFactura && !errorVistaPreviaFactura ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">No hay ningún PDF seleccionado. Comprueba que la factura esté en Gestión económica de la Carpeta Digital.</p> : null}
                              </aside>
                            </div></div>
                            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={()=>setMostrarFormularioGasto(false)} disabled={guardandoGasto} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button type="submit" disabled={guardandoGasto || cargandoConceptosGasto} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{guardandoGasto ? "Guardando…" : gastoEdicionId ? "Guardar obligación" : "Registrar gasto"}</button></div>
                          </form>
                            </div>
                          </div>
                        )}
                        </>
                      ) : null}
                      formularioEnvioNotario={
                        <EnviarANotarioModal
                          expediente={expediente}
                          cuantiaFincas={cuantiaFincasParaEnvio}
                          onClose={() => setMostrarEnviarNotario(false)}
                          onGuardar={guardarEnviarANotario}
                          inline
                        />
                      }
                      onDocumentosChange={
                        actividadSeleccionada === "documentacion-previa"
                          ? actualizarDocumentosCarpetaPrevia
                          : undefined
                      }
                    />
                  </div>
                )}

                {actividadSeleccionada === "sede-notarial" && (
                  <section className="mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Datos de Sede notarial</h3>
                  <span className="text-[11px] font-medium text-slate-500">Información del envío y del documento</span>
                </div>

                <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-2">
                  <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                    <h4 className="mb-3 border-b border-slate-100 pb-2 text-xs font-extrabold text-slate-800">Datos del notario</h4>
                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                      <Dato campo="Fecha envío" valor={expediente?.fecha_envio_notario || expediente?.fecha_envio} tipo="fecha" />
                      <Dato campo="Apoderado" valor={expediente?.apoderado} />
                      <Dato campo="Notario" valor={expediente?.nombre_notario ?? expediente?.notario} />
                      <Dato campo="NIF notario" valor={expediente?.nif_notario} />
                      <Dato campo="Población" valor={expediente?.poblacion} />
                      <Dato campo="Provincia" valor={expediente?.provincia} />
                      <Dato campo="Tipo firma" valor={expediente?.tipo_firma ?? expediente?.tipo_firma_notarial} />
                      <Dato campo="N.º solicitud PNC" valor={expediente?.numero_solicitud_pnc ?? expediente?.num_solicitud_pnc ?? expediente?.pnc_numero_solicitud} />
                      <Dato campo="Fecha solicitud PNC" valor={expediente?.fecha_solicitud_pnc ?? expediente?.fecha_pnc ?? expediente?.pnc_fecha_solicitud} tipo="fecha" />
                      <Dato campo="Fecha prevista de firma" valor={expediente?.fecha_prevista_firma} tipo="fecha" />
                      <Dato campo="Hora de inicio" valor={expediente?.hora_prevista_firma ?? expediente?.hora_inicio_firma} />
                      <Dato campo="Hora de fin" valor={expediente?.hora_fin_prevista_firma} />
                    </div>
                  </article>

                  <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                    <h4 className="mb-3 border-b border-slate-100 pb-2 text-xs font-extrabold text-slate-800">Datos del documento</h4>
                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                      <Dato campo="Título" valor={expediente?.titulo ?? expediente?.titulo_documento ?? expediente?.titulo_escritura} />
                      <Dato
                        campo="Tipo de documento"
                        valor={
                          Array.isArray(expediente?.documentos_escritura) && expediente.documentos_escritura.length
                            ? expediente.documentos_escritura.map((documento) => documento?.tipo_documento).filter(Boolean).join(" · ")
                            : expediente?.tipo_documento
                        }
                      />
                      <Dato campo="Tipo de operación" valor={expediente?.tipo_operacion ?? expediente?.subtipo_operacion} />
                      <Dato campo="Idioma del documento" valor={expediente?.idioma_documento ?? expediente?.idioma ?? expediente?.lengua_documento} />
                      <Dato campo="Importe (€)" valor={expediente?.importe} />
                      <Dato campo="Formato de escritura" valor={expediente?.formato_escritura ?? expediente?.formato_escritura_notarial} />
                      <Dato campo="Tipo de trámite" valor={expediente?.tipo_tramite ?? expediente?.tipo_tramite_notarial ?? expediente?.tramite} />
                    </div>

                  </article>
                </div>
              </section>
            
                )}
              </div>
            )}


            {false && <>
            {actividadSeleccionada === "documentacion-previa" && (
              <div className="mb-4 space-y-4">
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-extrabold text-slate-800">Preparación de datos para la futura integración ABSIS</h4>
                    <p className="mt-1 text-xs text-slate-500">Los datos se guardan en el ERP. Esta pantalla no transmite información a ABSIS.</p>
                  </div>
                  {cargandoEstadoAbsis ? <p className="text-xs text-slate-500">Cargando estado de ABSIS…</p> : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="rounded-lg border border-slate-200 p-3">
                      <span className="mb-2 block text-xs font-bold text-slate-700">Certificado Saldo «0» erróneo</span>
                      <select value={estadoDocumentacionAbsis.certificado_saldo_cero_erroneo ? "si" : "no"} onChange={(e) => setEstadoDocumentacionAbsis((a) => ({ ...a, certificado_saldo_cero_erroneo: e.target.value === "si" }))} disabled={registrandoSolicitudIntegracion} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                        <option value="no">No</option><option value="si">Sí</option>
                      </select>
                    </label>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <span className="mb-1 block text-xs font-bold text-slate-700">Fecha envío a notario</span>
                      <p className="text-sm font-semibold text-slate-800">{expediente?.fecha_envio_notario || expediente?.fecha_envio ? new Date(expediente.fecha_envio_notario || expediente.fecha_envio).toLocaleDateString("es-ES") : "Pendiente de envío"}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Vinculada al envío guardado en Enviar a notario.</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Documentos que incluirá la futura solicitud</p>
                    {[
                      ["solicitud_cancelacion_notarial", "Hoja de Encargo firmada"],
                      ["certificado_cancelacion_administrativo", "Justificante de cancelación"],
                      ["nota_simple_registral", "Nota simple registral"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700">
                        <input type="checkbox" checked={!!estadoDocumentacionAbsis[key]} onChange={(e) => setEstadoDocumentacionAbsis((a) => ({ ...a, [key]: e.target.checked }))} disabled={registrandoSolicitudIntegracion} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                        <span className="flex-1">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                    <span className="mb-2 block text-xs font-extrabold text-slate-700">Solicitar avance al completar la futura integración</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="moverActividadPrevia" checked={!!estadoDocumentacionAbsis.mover_siguiente_actividad} onChange={() => setEstadoDocumentacionAbsis((a) => ({ ...a, mover_siguiente_actividad: true }))} disabled={registrandoSolicitudIntegracion} />Sí</label>
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="moverActividadPrevia" checked={!estadoDocumentacionAbsis.mover_siguiente_actividad} onChange={() => setEstadoDocumentacionAbsis((a) => ({ ...a, mover_siguiente_actividad: false }))} disabled={registrandoSolicitudIntegracion} />No</label>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">Registrar la solicitud no envía nada ni avanza el expediente. El avance se valida por separado.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Boton onClick={() => guardarEstadoAbsis(false)} disabled={registrandoSolicitudIntegracion || cargandoEstadoAbsis}>{registrandoSolicitudIntegracion ? "Guardando…" : "Guardar datos para integración"}</Boton>
                    <Boton tipo="primary" onClick={() => guardarEstadoAbsis(true)} disabled={registrandoSolicitudIntegracion || cargandoEstadoAbsis}>{registrandoSolicitudIntegracion ? "Registrando…" : estadoDocumentacionAbsis.solicitud_registrada_localmente ? "✓ Solicitud pendiente registrada" : "Registrar solicitud pendiente"}</Boton>
                  </div>
                  {estadoDocumentacionAbsis.solicitud_registrada_localmente && <p className="mt-2 text-right text-xs font-semibold text-amber-700">Pendiente de API externa; todavía no transmitida a ABSIS.</p>}
                </section>
              </div>
            )}

            </>}





            {false && <>
            {actividadSeleccionada === "defectos-registrales" && (
              <section className="mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Defectos registrales del expediente</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">Detalle compartido con el alta de defectos</span>
                    <Boton tipo="primary" onClick={() => { setDefectoEditandoId(null); setDefectoForm({ ...DEFECTO_VACIO }); setErrorDefecto(""); setMostrarDefecto(true); }}>＋ Alta defecto</Boton>
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <Dato campo="Notario" valor={expediente?.nombre_notario ?? expediente?.notario} />
                  <Dato campo="NIF notario" valor={expediente?.nif_notario} />
                  <Dato campo="Fecha de firma" valor={expediente?.fecha_firma} tipo="fecha" />
                  <Dato campo="Protocolo" valor={expediente?.protocolo} />
                  <Dato
                    campo="Tipo del documento formalizado"
                    valor={
                      Array.isArray(expediente?.documentos_escritura) && expediente.documentos_escritura.length
                        ? expediente.documentos_escritura.map((documento) => documento?.tipo_documento).filter(Boolean).join(" · ")
                        : expediente?.tipo_documento
                    }
                  />
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="mb-2 text-xs font-extrabold text-slate-700">Información de fincas y registro</h4>
                  {cargandoFincas ? (
                    <p className="text-xs text-slate-500">Cargando fincas y datos registrales…</p>
                  ) : fincasExpediente.length === 0 ? (
                    <p className="text-xs text-slate-500">No hay fincas ni datos registrales vinculados a este expediente.</p>
                  ) : (
                    <div className="space-y-2">
                      {fincasExpediente.map((finca, indice) => (
                        <article key={finca.id || `${finca.finca || finca.numero_finca || "finca"}-${indice}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-800">Finca {finca.finca || finca.numero_finca || "—"}</p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <Dato campo="Registro" valor={finca.registro} />
                            <Dato campo="Sección" valor={finca.seccion} />
                            <Dato campo="CRU / IDUFIR" valor={finca.cru_idufir} />
                            <Dato campo="Población" valor={finca.poblacion} />
                            <Dato campo="Provincia" valor={finca.provincia} />
                            <Dato campo="Inscripción" valor={finca.inscripcion} />
                            <Dato campo="Cuantía" valor={finca.cuantia} />
                            <Dato campo="Contrato" valor={finca.contrato} />
                            <Dato campo="Fecha constitución" valor={finca.fecha_constitucion} tipo="fecha" />
                            <Dato campo="Entidad original" valor={finca.entidad_original} />
                            <Dato campo="Subrogado" valor={finca.subrogado} />
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {defectosRegistrados.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
                    <h4 className="mb-3 text-xs font-extrabold text-slate-700">Datos de defectos registrales informados</h4>
                    <div className="space-y-3">
                      {defectosRegistrados.map((defecto) => {
                        const tipoCarga = defecto.tipo_carga_hipotecaria_nombre || tiposCargaHipotecaria.find(
                          (tipo) => String(tipo.id) === String(defecto.tipo_carga_hipotecaria_id)
                        )?.nombre;
                        return (
                          <article key={defecto.id ?? defecto.id_defecto} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-extrabold text-slate-800">{defecto.motivo_defecto || defecto.tipo_error || "Defecto registral"}</p>
                            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                              <Dato campo="Tipo de carga hipotecaria" valor={tipoCarga} />
                              <Dato campo="Motivos del defecto" valor={defecto.motivo_defecto} />
                              <Dato campo="Subtipo del defecto" valor={defecto.subtipo_defecto} />
                              <Dato campo="Fecha calificación" valor={defecto.fecha_calificacion} tipo="fecha" />
                              <Dato campo="Fecha renovación asiento" valor={defecto.fecha_renovacion_asiento} tipo="fecha" />
                              <Dato campo="Asiento renovación / libro diario" valor={defecto.asiento_renovacion_libro_diario} />
                              <Dato campo="Vencimiento asiento renovación" valor={defecto.vencimiento_asiento_renovacion} tipo="fecha" />
                              <Dato campo="Anotación suspensiva" valor={defecto.anotacion_suspensiva == null ? "—" : defecto.anotacion_suspensiva ? "Sí" : "No"} />
                              <Dato campo="Vencimiento anotación" valor={defecto.vencimiento_anotacion} tipo="fecha" />
                              <Dato campo="Calificación sustitutoria" valor={defecto.calificacion_sustitutoria == null ? "—" : defecto.calificacion_sustitutoria ? "Sí" : "No"} />
                              <Dato campo="Recurso gubernativo" valor={defecto.recurso_gubernativo == null ? "—" : defecto.recurso_gubernativo ? "Sí" : "No"} />
                              <Dato campo="Fecha Notificación Registro (control interno)" valor={defecto.fecha_notificacion_registro} tipo="fecha" />
                              <Dato campo="Fecha Vencimiento Presentación (control interno)" valor={defecto.fecha_vencimiento_presentacion} tipo="fecha" />
                              <Dato campo="Fecha Entrada Registro Subsanación" valor={defecto.fecha_entrada_subsanacion} tipo="fecha" />
                              <Dato campo="Calificación del Registro" valor={defecto.calificacion_registro} />
                              <Dato campo="Observaciones" valor={defecto.observaciones_registro} />
                              <Dato campo="Estado envío ABSIS" valor={defecto.estado_envio_absis || "Pendiente"} />
                              <Dato campo="Estado de subsanación" valor={defecto.fecha_entrada_subsanacion ? "Subsanado" : "Pendiente de subsanación"} />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {actividadSeleccionada === "tramitacion-inscripcion" && (
              <section className="mb-3 rounded-2xl border border-indigo-100 bg-white p-3 sm:p-4">
                <h3 className="mb-3 text-sm font-extrabold text-slate-800">Repositorios digitales</h3>
                <RepositorioDocumentosInline
                  expedienteId={expediente?.id_expediente || expediente?.id || id}
                  categorias={["Hoja de inscripción"]}
                  titulo="Repositorios digitales · Tramitación inscripción"
                />
              </section>
            )}

            {actividadSeleccionada === "tramitacion-inscripcion" && (
              <section className="mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Datos vinculados de Enviar a notario</h3>
                  <span className="text-[11px] font-medium text-slate-500">Información de la ficha del expediente</span>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <Dato campo="Notario" valor={expediente?.nombre_notario ?? expediente?.notario} />
                  <Dato campo="NIF notario" valor={expediente?.nif_notario} />
                  <Dato campo="Fecha de firma" valor={expediente?.fecha_firma} tipo="fecha" />
                  <Dato campo="Protocolo" valor={expediente?.protocolo} />
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="mb-2 text-xs font-extrabold text-slate-700">Fincas y registros vinculados</h4>
                  {cargandoFincas ? (
                    <p className="text-xs text-slate-500">Cargando fincas y registros…</p>
                  ) : fincasExpediente.length === 0 ? (
                    <p className="text-xs text-slate-500">No hay fincas ni registros vinculados a este expediente.</p>
                  ) : (
                    <div className="space-y-2">
                      {fincasExpediente.map((finca, indice) => (
                        <article key={finca.id || `${finca.finca || finca.numero_finca || "finca"}-${indice}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-800">Finca {finca.finca || finca.numero_finca || "—"}</p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            <Dato campo="Registro" valor={finca.registro} />
                            <Dato campo="Sección" valor={finca.seccion} />
                            <Dato campo="CRU / IDUFIR" valor={finca.cru_idufir} />
                            <Dato campo="Población" valor={finca.poblacion} />
                            <Dato campo="Provincia" valor={finca.provincia} />
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {actividadSeleccionada !== "documentacion-previa" &&
              actividadSeleccionada !== "sede-notarial" &&
              actividadSeleccionada !== "tramitacion-inscripcion" && (
              <div
                className="
                  grid
                  grid-cols-1
                  gap-2
                  sm:grid-cols-2
                  xl:grid-cols-3
                "
              >

              {camposActividad
                .filter((campo) => actividadSeleccionada !== "defectos-registrales" || !["tipo_documento", "motivos_defecto", "fecha_notificacion_registro", "fecha_vencimiento_presentacion_registro", "observaciones_defecto_registral"].includes(campo.key))
                .map((campo) => {
                const esComun = CAMPOS_COMUNES_ACTIVIDAD.some((item) => item.key === campo.key);
                const valorActual = actividadDraft[campo.key] ?? expediente?.[campo.key] ?? "";
                if (esComun || campo.key === "fecha_envio") {
                  if (!esDisponible(expediente, campo.key)) return null;
                  return (
                    <Dato
                      key={campo.key}
                      campo={campo.label}
                      valor={expediente[campo.key]}
                      tipo={campo.tipo}
                      estado={campo.estado}
                      multilinea={campo.multilinea}
                    />
                  );
                }
                if (!esDisponible(expediente, campo.key) && !Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)) {
                  // Los campos previstos que aún no existen en el modelo no se inventan en pantalla.
                  return null;
                }
                return (
                  <label key={campo.key} className="block min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                    <span className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-600">{campo.label}{campo.key === "oficina" && <button type="button" onClick={async () => { setOficinaDetalleAbierta(true); setCargandoOficinaDetalle(true); setOficinaCatalogoDetalle(null); try { const respuesta = await axios.get("/oficinas-catalogo", { params: { q: expediente?.oficina || "", limit: 200 } }); const items = Array.isArray(respuesta?.data?.items) ? respuesta.data.items : []; const valor = normalizarTexto(expediente?.oficina || ""); const encontrada = items.find((item) => normalizarTexto(item.oficina) === valor || normalizarTexto(item.nombre) === valor) || items.find((item) => valor && (normalizarTexto(item.oficina).includes(valor) || normalizarTexto(item.nombre).includes(valor) || valor.includes(normalizarTexto(item.oficina)))); setOficinaCatalogoDetalle(encontrada || null); } catch (error) { setOficinaCatalogoDetalle(null); } finally { setCargandoOficinaDetalle(false); } }} className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-extrabold text-indigo-700 hover:bg-indigo-100">ⓘ Ver catálogo</button>}</span>
                    {campo.multilinea ? (
                      <textarea
                        rows={3}
                        value={String(valorActual ?? "")}
                        disabled={guardandoActividad}
                        onChange={(event) => setActividadDraft((actual) => ({ ...actual, [campo.key]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    ) : campo.opciones ? (
                      <select
                        value={String(valorActual || (campo.key === "apoderado" ? "Gestoría" : ""))}
                        disabled={guardandoActividad}
                        onChange={(event) => setActividadDraft((actual) => ({ ...actual, [campo.key]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                      >
                        <option value="">Seleccionar…</option>
                        {campo.opciones.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
                      </select>
                    ) : (
                      <input
                        type={campo.tipo === "fecha" ? "date" : campo.tipo === "numero" ? "number" : "text"}
                        step={campo.tipo === "numero" ? "0.01" : undefined}
                        value={campo.tipo === "fecha" ? String(valorActual ?? "").slice(0, 10) : String(valorActual ?? "")}
                        disabled={guardandoActividad}
                        onChange={(event) => setActividadDraft((actual) => {
                          const nuevoValor = event.target.value;
                          if (campo.key === "fecha_firma" && actividadSeleccionada === "sede-notarial-protocolo") {
                            const fechaAnterior = String(actual.fecha_firma || "").slice(0, 10);
                            return {
                              ...actual,
                              fecha_firma: nuevoValor,
                              fecha_presentacion: !actual.fecha_presentacion || String(actual.fecha_presentacion).slice(0, 10) === fechaAnterior ? nuevoValor : actual.fecha_presentacion,
                              fecha_recogida_notario_presentacion_telematica: !actual.fecha_recogida_notario_presentacion_telematica || String(actual.fecha_recogida_notario_presentacion_telematica).slice(0, 10) === fechaAnterior ? nuevoValor : actual.fecha_recogida_notario_presentacion_telematica,
                            };
                          }
                          if (campo.key === "fecha_presentacion" && actividadSeleccionada === "tramitacion-inscripcion") {
                            return {
                              ...actual,
                              fecha_presentacion: nuevoValor,
                              fecha_vencimiento_asiento: sumarDiasNaturales(nuevoValor, 60),
                            };
                          }
                          return { ...actual, [campo.key]: nuevoValor };
                        })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    )}
                  </label>
                );
              })}

              </div>
            )}

            {actividadSeleccionada === "sede-notarial-protocolo" && (
              <section className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-extrabold text-slate-700">Copia simple de escritura</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {actividadDraft?.copia_simple_escritura || expediente?.copia_simple_escritura
                        ? "Hay una referencia guardada a la copia simple."
                        : "Pendiente de que el notario la suba a la carpeta digital."}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">La vinculación automática con Notargest se completará cuando esté disponible la integración de documentos.</p>
                    <button type="button" onClick={() => setMostrarCarpetaDigital(true)} className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                      Abrir carpeta digital
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-extrabold text-slate-700">Solicitar avance al completar la futura integración</p>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadProtocolo" checked={!!actividadDraft.mover_siguiente_actividad} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: true }))} disabled={guardandoActividad || registrandoSolicitudIntegracion} /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadProtocolo" checked={!actividadDraft.mover_siguiente_actividad} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: false }))} disabled={guardandoActividad || registrandoSolicitudIntegracion} /> No
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">La preferencia se guarda en la solicitud pendiente. No modifica la actividad y no se realiza envío externo.</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Boton tipo="primary" onClick={() => registrarSolicitudIntegracionPendiente("sede-notarial-protocolo")} disabled={guardandoActividad || registrandoSolicitudIntegracion}>
                    {registrandoSolicitudIntegracion ? "Registrando…" : "Registrar solicitud pendiente"}
                  </Boton>
                </div>
              </section>
            )}

            {actividadSeleccionada === "defectos-registrales" && (
              <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/30 p-4">
                <div className="mt-4 border-t border-amber-200 pt-4">
                  <h3 className="mb-3 text-sm font-extrabold text-slate-800">Repositorios digitales</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    {
                      key: "defecto-registral",
                      titulo: "Defecto registral",
                      descripcion: "Calificación o nota de defectos emitida por el Registro.",
                    },
                    {
                      key: "subsanacion-del-defecto",
                      titulo: "Subsanación del defecto",
                      descripcion: "Documentos que acreditan la subsanación del defecto.",
                    },
                  ].map((categoria) => {
                    const documentos = (Array.isArray(documentosCierre) ? documentosCierre : []).filter((doc) => {
                      const categoriaDoc = String(
                        doc?.categoria || doc?.categoria_nombre || doc?.tipo_documento ||
                        doc?.nombre_categoria || doc?.metadata?.categoria || ""
                      ).toLowerCase();
                      const nombreDoc = String(
                        doc?.nombre_original || doc?.nombre || doc?.nombre_archivo || doc?.filename || ""
                      ).toLowerCase();
                      const clave = categoria.key.toLowerCase();
                      const etiqueta = categoria.titulo.toLowerCase();
                      if (categoria.key === "defecto-registral") {
                        return (categoriaDoc.includes("defecto") && !categoriaDoc.includes("subsan")) ||
                          (nombreDoc.includes("defecto") && !nombreDoc.includes("subsan"));
                      }
                      return categoriaDoc.includes("subsan") || nombreDoc.includes("subsan");
                    });
                    return (
                      <article key={categoria.key} className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">{categoria.titulo}</h4>
                            <p className="mt-1 text-xs text-slate-500">{categoria.descripcion}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                            {documentos.length} archivo(s)
                          </span>
                        </div>
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          {documentos.length ? (
                            <ul className="space-y-2">
                              {documentos.map((doc, index) => {
                                const url = doc?.url || doc?.url_descarga || doc?.download_url || doc?.ruta;
                                return (
                                  <li key={doc?.id || doc?.id_documento || index} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="min-w-0 break-words font-medium text-slate-700">{doc?.nombre_original || doc?.nombre || doc?.nombre_archivo || doc?.filename || `Archivo ${index + 1}`}</span>
                                    {url && <a href={url} target="_blank" rel="noreferrer" className="shrink-0 font-bold text-blue-700 underline">Ver PDF</a>}
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-400">Todavía no hay documentos en esta categoría.</p>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">{documentos.length} archivo(s)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setMostrarCarpetaDigital(true);
                              cargarDocumentosCierre();
                            }}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            ＋ Adjuntar/ver PDF
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                </div>
              </section>
            )}

            {actividadSeleccionada === "liquidacion-impuestos" && (
              <section className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-extrabold text-slate-700">Impuesto (AJD / ITP)</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {actividadDraft?.impuesto_ajd_itp
                        ? `Documento asociado: ${actividadDraft.impuesto_ajd_itp}`
                        : "Pendiente de recibir el justificante tributario del notario en Notargest."}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">La asociación automática del PDF desde Notargest requiere conectar la integración documental.</p>
                    <button type="button" onClick={() => setMostrarCarpetaDigital(true)} className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                      Abrir carpeta digital
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-extrabold text-slate-700">Solicitar avance al completar la futura integración</p>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadLiquidacion" checked={actividadDraft.mover_siguiente_actividad !== false} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: true }))} disabled={guardandoActividad || registrandoSolicitudIntegracion} /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadLiquidacion" checked={actividadDraft.mover_siguiente_actividad === false} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: false }))} disabled={guardandoActividad || registrandoSolicitudIntegracion} /> No
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Boton tipo="primary" onClick={() => registrarSolicitudIntegracionPendiente("liquidacion-impuestos")} disabled={guardandoActividad || registrandoSolicitudIntegracion}>
                    {registrandoSolicitudIntegracion ? "Registrando…" : "Registrar solicitud pendiente"}
                  </Boton>
                </div>
              </section>
            )}


            {actividadSeleccionada === "facturacion-cierre" && (
              <div className="mt-4 space-y-4">
                <section className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-extrabold text-slate-800">Datos vinculados de la ficha del expediente</h3>
                    <p className="mt-1 text-xs text-slate-500">Información enlazada con Enviar a notario, Fincas y registros e Información crediticia. Los datos se consultan desde el expediente, sin duplicarlos.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Dato campo="Expediente" valor={expediente?.numero_expediente ?? expediente?.id_expediente} compacto />
                    <Dato campo="Nombre notario" valor={expediente?.nombre_notario ?? expediente?.notario} compacto />
                    <Dato campo="NIF notario" valor={expediente?.nif_notario} compacto />
                    <Dato campo="Fecha de firma" valor={expediente?.fecha_firma} tipo="fecha" compacto />
                    <Dato campo="Protocolo" valor={expediente?.protocolo} compacto />
                    <Dato campo="Tipo del documento formalizado" valor={Array.isArray(expediente?.documentos_escritura) && expediente.documentos_escritura.length ? expediente.documentos_escritura.map((documento) => documento?.tipo_documento).filter(Boolean).join(" · ") : expediente?.tipo_documento} compacto />
                    <Dato campo="Importe (Información crediticia)" valor={expediente?.importe} tipo="numero" destaque compacto />
                    <Dato campo="Saldo real actual (Información crediticia)" valor={resumenEconomico?.saldoActual ?? expediente?.saldo_real} tipo="numero" destaque compacto />
                  </div>
                  <div className="mt-4 border-t border-indigo-100 pt-3">
                    <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">Fincas y datos registrales vinculados</h4>
                    {errorFincas && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorFincas}</p>}
                    {cargandoFincas ? (
                      <p className="text-xs text-slate-500">Cargando fincas y registros…</p>
                    ) : fincasExpediente.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">No hay fincas ni registros vinculados a este expediente.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                        {fincasExpediente.map((finca, indice) => (
                          <article key={finca.id || String(finca.finca || finca.numero_finca || "finca") + "-" + indice} className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-extrabold text-slate-800">Finca {finca.finca || finca.numero_finca || "—"}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                              <div><span className="block text-slate-400">Registro</span><strong>{finca.registro || "—"}</strong></div>
                              <div><span className="block text-slate-400">Sección</span><strong>{finca.seccion || "—"}</strong></div>
                              <div><span className="block text-slate-400">CRU / IDUFIR</span><strong>{finca.cru_idufir || finca.cru || finca.idufir || "—"}</strong></div>
                              <div><span className="block text-slate-400">Población</span><strong>{finca.poblacion || "—"}</strong></div>
                              <div><span className="block text-slate-400">Provincia</span><strong>{finca.provincia || "—"}</strong></div>
                              <div><span className="block text-slate-400">Inscripción</span><strong>{finca.inscripcion || "—"}</strong></div>
                              <div><span className="block text-slate-400">Cuantía</span><strong>{finca.cuantia !== null && finca.cuantia !== undefined && finca.cuantia !== "" ? formatEuro(Number(finca.cuantia)) : "—"}</strong></div>
                              <div><span className="block text-slate-400">Contrato</span><strong>{finca.contrato || "—"}</strong></div>
                              <div><span className="block text-slate-400">Entidad original</span><strong>{finca.entidad_original || "—"}</strong></div>
                              <div><span className="block text-slate-400">Fecha constitución</span><strong>{finca.fecha_constitucion || "—"}</strong></div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t border-indigo-100 pt-3">
                    <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">Garantías</h4>
                    <p className="mb-3 text-xs text-slate-500">Datos derivados de Fincas y registros y de la fecha de inscripción de Tramitación inscripción. No se duplican ni se editan desde este apartado.</p>
                    {errorFincas && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorFincas}</p>}
                    {cargandoFincas ? (
                      <p className="text-xs text-slate-500">Cargando garantías…</p>
                    ) : fincasExpediente.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">No hay fincas ni registros vinculados para generar garantías.</p>
                    ) : (
                      <div className="space-y-3">
                        {fincasExpediente.map((finca, indice) => {
                          const idufir = finca.idufir || finca.cru_idufir || finca.cru || "";
                          const numeroFinca = finca.finca || finca.numero_finca || "";
                          const fechaInscripcion = expediente?.fecha_inscripcion || "";
                          // Identificación registral: enlazada directamente con Fincas y registros.
                          const registroProvincia = finca.provincia || "";
                          const registroPoblacion = finca.poblacion || "";
                          // El número del registro aún no tiene un campo dedicado programado.
                          const registroNumero = finca.numero_registro || finca.registro_numero || "";
                          const numeroSeccion = finca.seccion || "";
                          const nombreRegistro = finca.registro || "";
                          const datosPendientes = !idufir || !numeroFinca || !fechaInscripcion || !registroProvincia || !registroPoblacion || !registroNumero || !numeroSeccion || !nombreRegistro;
                          const campoGarantia = (label, valor, fecha = false) => (
                            <div>
                              <span className="block text-[10px] font-semibold text-slate-400">{label}</span>
                              <strong className="mt-0.5 block break-words text-xs font-semibold text-slate-700">{valor ? (fecha ? formatearFecha(valor) : valor) : "No consta"}</strong>
                            </div>
                          );
                          return (
                            <article key={finca.id || String(numeroFinca || "finca") + "-garantia-" + indice} className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <h5 className="text-xs font-extrabold text-slate-800">Garantía {indice + 1} · Finca {numeroFinca || "No identificada"}</h5>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${datosPendientes ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>Datos pendientes: {datosPendientes ? "Sí" : "No"}</span>
                              </div>
                              <div className="rounded-lg bg-slate-50 p-3">
                                <h6 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Datos de la garantía</h6>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                  {campoGarantia("IDUFIR / CRU", idufir)}
                                  {campoGarantia("Núm. finca registral", numeroFinca)}
                                  {campoGarantia("Fecha inscripción cancelación", fechaInscripcion, true)}
                                </div>
                              </div>
                              <div className="mt-3 rounded-lg border border-slate-100 p-3">
                                <h6 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Identificación del registro de propiedad</h6>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                  {campoGarantia("Provincia", registroProvincia)}
                                  {campoGarantia("Población", registroPoblacion)}
                                  {campoGarantia("Registro (Número)", registroNumero)}
                                  {campoGarantia("Núm. sección", numeroSeccion)}
                                  {campoGarantia("Registro (Nombre)", nombreRegistro)}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>


                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Honorarios de gestoría</h3>
                      <p className="mt-1 text-xs text-slate-600">La tarifa se obtiene del catálogo de Utilidades según la entidad y si el expediente tiene provisión.</p>
                    </div>
                    <button
                      type="button"
                      onClick={generarHonorariosGestoria}
                      disabled={generandoHonorariosGestoria}
                      className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {generandoHonorariosGestoria ? "Generando…" : "Generar honorarios de gestoría"}
                    </button>
                  </div>
                  {honorariosGestoria && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Tarifa aplicada: {honorariosGestoria.tarifa}</p>
                      <p className="mt-1 text-2xl font-extrabold text-emerald-800">
                        {formatEuro(Number(honorariosGestoria.importe))}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">Entidad detectada: {honorariosGestoria.entidad || "No identificada"}</p>
                      {honorariosGestoria.guardado && <p className="mt-1 text-xs font-semibold text-emerald-700">Registrado en el backend.</p>}
                    </div>
                  )}
                  {mensajeHonorariosGestoria && <p className="mt-2 text-xs font-semibold text-emerald-800">{mensajeHonorariosGestoria}</p>}
                  {errorHonorariosGestoria && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorHonorariosGestoria}</p>}
                </section>
              </div>
            )}

            {errorActividad && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorActividad}
              </div>
            )}
            {mensajeActividad && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {mensajeActividad}
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {(CAMPOS_ACTIVIDADES[actividadSeleccionada] || []).some((campo) =>
                Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)
              ) && (
                <Boton tipo="primary" onClick={guardarCamposActividad} disabled={guardandoActividad || expedienteBloqueado}>
                  {guardandoActividad ? "Guardando…" : "Guardar datos de actividad"}
                </Boton>
              )}
              {actividadSeleccionada === "documentacion-previa" && actividadActual === "documentacion-previa" && (
                <Boton tipo="primary" onClick={avanzarActividad} disabled={guardandoActividad || expedienteBloqueado || !estadoDocumentacionAbsis.mover_siguiente_actividad}>
                  {guardandoActividad ? "Validando…" : "➡️ Mover a Sede notarial sin protocolo"}
                </Boton>
              )}
              {actividadSeleccionada === actividadActual && actividadActual && actividadActual !== "documentacion-previa" && (
                <Boton tipo="primary" onClick={avanzarActividad} disabled={guardandoActividad}>
                  {guardandoActividad
                    ? "Validando…"
                    : actividadActual === "facturacion-cierre"
                      ? "✅ Validar y cerrar expediente"
                      : "➡️ Validar y avanzar actividad"}
                </Boton>
              )}
            </div>

            {actividadSeleccionada !== "documentacion-previa" && !camposActividad.some(
              (campo) =>
                esDisponible(
                  expediente,
                  campo.key
                )
            ) && (
              <div
                className="
                  rounded-xl
                  border
                  border-dashed
                  border-slate-300
                  bg-white
                  p-8
                  text-center
                "
              >
                <p
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                  "
                >
                  No hay datos disponibles
                  para esta actividad.
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Los campos aparecerán cuando
                  el expediente disponga de ellos.
                </p>
              </div>
            )}

            </>}

          </div>

          {mostrarControlCalidad && renderChecklistCalidad()}

        </div>


      <div className={`mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2 ${mostrarControlCalidad ? "hidden" : ""}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">

        {cargandoAcciones ? <span className="text-[10px] text-slate-500">Cargando última acción…</span> : accionesExpediente.length > 0 && (() => {
          const relacion = accionesExpediente[accionesExpediente.length - 1];
          const accion = relacion.accion || relacion.accion_expediente || relacion;
          return <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-500">Última acción</div>
            <div className="text-xs font-bold text-slate-800">{accion.descripcion || relacion.descripcion || "Acción"}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">{relacion.fecha && <span>{formatearFecha(relacion.fecha)}</span>}{relacion.usuario_creador && <span>Realizada por: {relacion.usuario_creador}</span>}</div>
          </div>;
        })()}
        {errorAcciones && <p className="w-full text-xs text-red-700">{errorAcciones}</p>}
      </div>
          <div className="flex min-w-0 flex-col items-start gap-2">

            {ppadItems.length > 0 && (
              <div className="w-full space-y-2">
                {ppadItems.map((item) => (
                  <div key={item.id} className={`rounded-lg border px-3 py-2 ${item.compensado ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/70"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 break-words text-xs font-bold text-slate-800">{item.concepto || "PPAD"}</span>
                      <span className="text-xs font-extrabold text-slate-800">{formatEuro(Number(item.importe) || 0)}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-600">Realizado por: <strong>{item.usuario_creador || "Usuario no registrado"}</strong>{item.fecha_creacion ? ` · ${formatearFecha(item.fecha_creacion)}` : ""}</p>
                    {item.compensado ? (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">✓ PPAD compensado{item.fecha_compensacion ? ` el ${formatearFecha(item.fecha_compensacion)}` : ""}.</p>
                    ) : (
                      <p role="status" className="mt-1 text-[11px] font-bold text-amber-800">⚠ PPAD pendiente de compensar.</p>
                    )}
                    {!item.compensado && !String(expediente?.fecha_firma || "").slice(0, 10) && (
                      <p className="mt-1 text-[10px] text-slate-600">La compensación estará disponible cuando el expediente tenga fecha de firma.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {mostrarModalPpad && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
              onMouseDown={(event) => { if (event.target === event.currentTarget) { setMostrarModalPpad(false); cancelarPpad(); } }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-ppad-titulo"
                className="my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
                  <div>
                    <h3 id="modal-ppad-titulo" className="text-base font-extrabold text-slate-900">PPAD · Conceptos y compensaciones</h3>
                    <p className="mt-1 text-xs text-slate-500">Historial completo de PPAD de este expediente.</p>
                  </div>
                  <button type="button" onClick={() => { setMostrarModalPpad(false); cancelarPpad(); }} aria-label="Cerrar PPAD" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">✕ Cerrar</button>
                </header>
                <div className="space-y-3 p-4 sm:p-6">
                  {errorPpad && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorPpad}</p>}
                  {cargandoPpad && <p className="text-xs text-slate-500">Cargando conceptos PPAD…</p>}
                  {!cargandoPpad && ppadItems.length === 0 && !mostrarFormularioPpad && (
                    <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-500">Todavía no hay conceptos PPAD añadidos.</p>
                  )}
                  {ppadItems.map((item) => (
                    <article key={item.id} className={`rounded-xl border p-3 ${item.compensado ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-white"}`}>
                      <p className="mb-2 text-[10px] text-slate-600">Realizado por: <strong>{item.usuario_creador || "Usuario no registrado"}</strong>{item.fecha_creacion ? ` · ${formatearFecha(item.fecha_creacion)}` : ""}</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Concepto</div>
                          <div className="mt-1 break-words text-sm font-semibold text-slate-800">{item.concepto}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Importe</div>
                          <div className="mt-1 text-sm font-semibold text-slate-800">{formatEuro(Number(item.importe) || 0)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Imputable a</div>
                          <div className="mt-1 text-sm font-semibold text-slate-800">{item.imputable_a || item.imputableA || "Molsan"}</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-2">
                        <div><span className="font-semibold text-slate-500">Fecha alta: </span><span className="font-semibold text-slate-700">{formatearFecha(item.fecha_creacion)}</span></div>
                        <div><span className="font-semibold text-slate-500">Fecha compensación: </span><span className={item.compensado ? "font-bold text-emerald-700" : "font-semibold text-slate-500"}>{formatearFecha(item.fecha_compensacion)}</span></div>
                        <div className="sm:col-span-2"><span className="font-semibold text-slate-500">Registrado por: </span><span className="font-semibold text-slate-700">{item.usuario_creador || "No disponible en registros anteriores"}</span></div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        {item.compensado ? (
                          <span className="mr-auto rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800">✓ COMPENSADO</span>
                        ) : (
                          <>
                            <Boton tipo="primary" onClick={() => compensarPpad(item)} disabled={guardandoPpad || !String(expediente?.fecha_firma || "").slice(0, 10)}>
                              {guardandoPpad ? "Registrando…" : "✓ Compensar"}
                            </Boton>
                            {!String(expediente?.fecha_firma || "").slice(0, 10) && <span className="text-[10px] text-slate-500">Disponible tras informar la fecha de firma.</span>}
                          </>
                        )}
                        {!item.compensado && <Boton tipo="secondary" onClick={() => editarPpad(item)}>Editar</Boton>}
                        {(!item.compensado || esAdministradorSesion) && (
                          <Boton tipo="danger" onClick={() => {
                            const mensaje = item.compensado
                              ? "Este PPAD ya está compensado. ¿Confirmas que quieres eliminarlo como administrador?"
                              : "¿Confirmas que quieres eliminar este concepto PPAD?";
                            if (window.confirm(mensaje)) eliminarPpad(item.id);
                          }}>Eliminar</Boton>
                        )}
                      </div>
                    </article>
                  ))}
                  {mostrarFormularioPpad && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                      <h4 className="mb-3 text-sm font-extrabold text-slate-800">{ppadEditandoId !== null ? "Editar concepto PPAD" : "Añadir concepto PPAD"}</h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">Concepto</span>
                          <input type="text" value={ppadForm.concepto} onChange={(event) => setPpadForm((actual) => ({ ...actual, concepto: event.target.value }))} placeholder="Introduce el concepto" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" autoFocus />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">Importe (€)</span>
                          <input type="text" inputMode="decimal" value={ppadForm.importe} onChange={(event) => setPpadForm((actual) => ({ ...actual, importe: event.target.value }))} placeholder="0,00" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-semibold text-slate-600">Imputable a</span>
                          <select value={ppadForm.imputableA} onChange={(event) => setPpadForm((actual) => ({ ...actual, imputableA: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                            <option value="Molsan">Molsan</option>
                            <option value="Externo">Externo</option>
                          </select>
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Boton tipo="secondary" onClick={cancelarPpad}>Cancelar</Boton>
                        <Boton tipo="primary" onClick={aceptarPpad} disabled={!ppadForm.concepto.trim() || !String(ppadForm.importe).trim() || guardandoPpad}>{guardandoPpad ? "Guardando…" : "Aceptar"}</Boton>
                      </div>
                    </div>
                  )}
                  {!mostrarFormularioPpad && <div className="flex justify-end"><Boton tipo="primary" onClick={abrirNuevoPpad}>＋ Añadir concepto PPAD</Boton></div>}
                </div>
              </section>
            </div>
          )}
      </div>
      <div className={`mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2 ${mostrarControlCalidad ? "hidden" : ""}`}>
        {/* FINCAS Y REGISTROS — SOLO LOS TRES DATOS SOLICITADOS */}

          <Seccion
            id="ficha-fincas"
            titulo="Fincas y Registros"
            subtitulo="Datos registrales del expediente"
            icono="finca"
            colapsable
          >
            {errorFincas && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorFincas}</p>}
            {cargandoFincas && <p className="text-xs text-slate-500">Cargando fincas...</p>}
            {!cargandoFincas && fincasExpediente.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                No hay fincas registradas en la tabla de fincas de este expediente.
              </p>
            )}
            <div className="space-y-3">
              {fincasExpediente.map((finca) => (
                <article key={finca.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Finca {finca.finca || "—"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-slate-500">
                        {finca.registro ? <button type="button" onClick={() => {
                          const registroBuscado = normalizarTexto(finca.registro);
                          const registroCatalogo = catalogoRegistrosPropiedad.find((item) =>
                            (finca.registro_propiedad_id && Number(item.id) === Number(finca.registro_propiedad_id)) ||
                            normalizarTexto(item.registro_propiedad) === registroBuscado
                          );
                          if (registroCatalogo) setRegistroDetalleAbierto(registroCatalogo);
                          else window.alert("Este registro no se encuentra en el catálogo de Registros de la Propiedad.");
                        }} title="Abrir la ficha completa del Registro de la Propiedad" className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-900">Registro: {finca.registro} <span aria-hidden="true">ⓘ</span></button> : null}
                        {finca.seccion ? <span>Sección: {finca.seccion}</span> : null}
                        {finca.poblacion ? <span>Población: {finca.poblacion}</span> : null}
                        {finca.provincia ? <span>Provincia: {finca.provincia}</span> : null}
                        {!finca.registro && !finca.seccion && !finca.poblacion && !finca.provincia ? "Sin datos registrales" : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => abrirSolicitudFusion(finca)} disabled={!finca.registro} title={!finca.registro ? "Completa el registro de la finca para solicitar una fusión" : "Crear solicitud de fusión para este registro"} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50">
                        <span aria-hidden="true">⇄</span> Fusión
                      </button>
                      <button type="button" onClick={() => abrirFincas(finca)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700">Editar</button>
                      <button type="button" onClick={() => eliminarFinca(finca.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">Eliminar</button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div><span className="block text-slate-400">CRU/Idufir</span><strong>{finca.cru_idufir || "—"}</strong></div>
                    <div><span className="block text-slate-400">Cuantía</span><strong>{finca.cuantia || "—"}</strong></div>
                    <div><span className="block text-slate-400">Inscripción</span><strong>{finca.inscripcion || "—"}</strong></div>
                    <div><span className="block text-slate-400">Contrato</span><strong>{finca.contrato || "—"}</strong></div>
                  </div>
                </article>
              ))}
            </div>
            <button type="button" onClick={() => abrirFincas()} className="mt-3 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100">
              ＋ Nueva finca
            </button>
          </Seccion>
        {/* OBSERVACIONES */}
          <Seccion
            id="ficha-observaciones"
            titulo="Observaciones"
            subtitulo="Última observación · historial y validaciones"
            icono="observaciones"
            colapsable
            compacto
          >
            <div className="space-y-3">
              {errorObservaciones && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorObservaciones}</p>}
              {cargandoObservaciones ? (
                <p className="text-xs text-slate-500">Cargando observaciones…</p>
              ) : observacionesExpediente[0] ? (
                <article className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{observacionesExpediente[0].comentario}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{observacionesExpediente[0].autor || "Usuario conectado"} · {observacionesExpediente[0].visibilidad === "Gestor" ? "Interna" : observacionesExpediente[0].visibilidad}</span>
                    <time dateTime={observacionesExpediente[0].fecha}>{observacionesExpediente[0].fecha ? new Date(observacionesExpediente[0].fecha).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Fecha no disponible"}</time>
                  </div>
                  {observacionesExpediente[0].visibilidad === "Gestor" && (
                    <p className={`mt-2 text-[11px] font-semibold ${observacionesExpediente[0].estado_validacion === "Validada" ? "text-emerald-700" : "text-amber-700"}`}>
                      {observacionesExpediente[0].estado_validacion === "Validada" ? "✓ Validada por el destinatario" : "⏳ Pendiente de validación del destinatario"}
                    </p>
                  )}
                </article>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">Todavía no hay observaciones añadidas.</p>
              )}
              <button type="button" onClick={() => { setComentario(""); setErrorObservaciones(""); setMostrarObservaciones(true); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100">
                Ver historial y gestionar observaciones <span className="rounded-full bg-white px-2 py-0.5 text-[10px]">{observacionesExpediente.length}</span>
              </button>
            </div>
          </Seccion>
      </div>
      </section>





      {/* =====================================================
          CUATRO COLUMNAS PRINCIPALES
      ====================================================== */}

      <div
        className={`
          grid
           w-full
          grid-cols-1
          gap-3
          xl:grid-cols-12
          ${mostrarControlCalidad ? "hidden" : ""}
        `}
      >

        {/* ===================================================
            COLUMNA 1
        ==================================================== */}




      

       

        {/* Información complementaria: se oculta visualmente hasta registrar un envío a notario. */}
        <div className={`min-w-0 xl:col-span-12 ${actividadSeleccionada === "gestion-economica" ? "" : "hidden"}`}>
          <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-8">
        {/* ENVÍO A NOTARIO: CENTRADO DEBAJO DE PPAD E INFORMACIÓN CREDITICIA */}
        <div className="min-w-0 w-full xl:col-span-8">
          {expedienteBloqueado && esRetencionSinTramitar && <section role="alert" className="mx-auto mb-4 w-full rounded-2xl border-2 border-red-300 bg-red-50 px-5 py-4 shadow-sm"><p className="text-xs font-black uppercase text-red-700">⛔ Expediente bloqueado</p><h2 className="mt-1 text-base font-extrabold text-red-900">RETENCIÓN SIN TRAMITAR</h2><p className="mt-1 text-sm text-red-800">Estado RST: retención sin tramitar.</p><p className="mt-2 text-xs font-semibold text-red-700">Las actividades no se pueden modificar ni avanzar mientras esté bloqueado.</p><button type="button" onClick={abrirControlExpediente} className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-800">Gestionar bloqueo</button></section>}
          <div className="flex w-full min-w-0 justify-center">
          {/* =====================================================
              FICHA COMPLETA DE ENVÍO A NOTARIO
              El botón abre el modal para completar y guardar el encargo.
          ====================================================== */}
            <section className="w-full max-w-none min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(30,41,59,0.08)]">
              <div className="hidden flex-wrap items-center justify-center gap-3 border-b border-slate-100 bg-white px-4 py-4 text-center sm:px-5">
                <MolsanIcon name="courthouse" size={42} tone="indigo" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-800">Envío a notario</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Encargo al notario, datos de firma y facturación</p>
                </div>
                {(expediente.fecha_envio_notario || expediente.fecha_envio) && (
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Datos guardados</span>
                )}
                <button type="button" onClick={() => setMostrarDatosEnvioNotario((actual) => !actual)} aria-expanded={mostrarDatosEnvioNotario} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{mostrarDatosEnvioNotario ? "⌃ Ocultar" : "⌄ Expandir"}</button>
              </div>
              <div className={`space-y-4 p-4 sm:p-5 ${mostrarDatosEnvioNotario ? "" : "hidden"}`}>
                <>
                <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-2">
                <div className="hidden min-w-0 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-700">Datos del envío</p>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Dato campo="Fecha de envío" valor={expediente.fecha_envio_notario || expediente.fecha_envio} tipo="fecha" />
                    <Dato campo="Idioma del documento" valor={expediente.idioma_documento ?? expediente.idioma ?? expediente.lengua_documento} />
                    <Dato campo="Fecha solicitud PNC" valor={expediente.fecha_solicitud_pnc ?? expediente.fecha_pnc ?? expediente.pnc_fecha_solicitud} tipo="fecha" />
                    <Dato campo="Número solicitud PNC" valor={expediente.numero_solicitud_pnc ?? expediente.num_solicitud_pnc ?? expediente.pnc_numero_solicitud} />
                    <Dato campo="Notario" valor={expediente.nombre_notario || expediente.notario} />
                    <Dato campo="NIF notario" valor={expediente.nif_notario} />
                    <Dato campo="Población notario" valor={expediente.poblacion} />
                    <Dato campo="Provincia notario" valor={expediente.provincia} />
                    <Dato campo="Apoderado" valor={expediente.apoderado} />
                     <Dato campo="Tipo de firma" valor={expediente.tipo_firma} />
                    <Dato campo="Fecha prevista de firma" valor={expediente.fecha_prevista_firma} tipo="fecha" />
                    <Dato campo="Hora prevista de firma" valor={expediente.hora_prevista_firma} />
                  </div>
                </div>
                </div>
                <div className="hidden border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-700">Tipo de documento y cuantía</p>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Dato campo="Formato de escritura" valor={expediente.formato_escritura ?? expediente.formato_escritura_notarial} />
                    <Dato campo="Tipo de trámite" valor={expediente.tipo_tramite ?? expediente.tipo_tramite_notarial ?? expediente.tramite} />
                    <Dato
                      campo="Firma urgente"
                      valor={
                        expediente.firma_urgente === true ||
                        ["true", "1", "si", "sí"].includes(
                          String(expediente.firma_urgente ?? "").trim().toLowerCase()
                        )
                          ? "SÍ · URGENTE"
                          : "No"
                      }
                    />
                    <Dato campo="Fecha de firma" valor={expediente.fecha_firma} tipo="fecha" />
                    <Dato campo="Protocolo" valor={expediente.protocolo} />
                    <Dato
                      campo="Tipo del documento formalizado"
                      valor={
                        Array.isArray(expediente.documentos_escritura) &&
                        expediente.documentos_escritura.length > 0
                          ? expediente.documentos_escritura
                              .map((documento) => documento.tipo_documento || "Documento")
                              .join(" | ")
                          : expediente.tipo_documento
                      }
                    />
                    <Dato
                      campo="Cuantía del documento"
                      valor={
                        Array.isArray(expediente.documentos_escritura) &&
                        expediente.documentos_escritura.length > 0
                          ? expediente.documentos_escritura
                              .map((documento) => {
                                if (documento.cuantia == null || documento.cuantia === "") {
                                  return "Sin cuantía";
                                }
                                return formatEuro(Number(documento.cuantia));
                              })
                              .join(" | ")
                          : expediente.cuantia != null
                            ? formatEuro(Number(expediente.cuantia))
                            : null
                      }
                    />
                    <Dato campo="Importe" valor={expediente.importe} tipo="numero" />

                    </div>
                  </div>

                    {actividadSeleccionada === "gestion-economica" && (
                      <section className="mt-4 rounded-xl border border-indigo-100 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">Resumen Económico</h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Importe inicial tomado de Información crediticia. El saldo solo descuenta los gastos cuyo pago está confirmado.
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setErrorGastos("");
                              setMensajeGastos("");
                              setOrigenFormularioGasto("economico");
                              setMostrarFormularioGasto((actual) => {
                                const abrir = !actual;
                                if (abrir) setGastoForm((g) => ({ ...g, nif_notario: g.nif_notario || expediente?.nif_notario || expediente?.notario_nif || "", nombre_notario: g.nombre_notario || expediente?.notario || expediente?.nombre_notario || "", pagador: g.pagador || [expediente?.facturacion_nombre, expediente?.facturacion_apellidos].filter(Boolean).join(" ") }));
                                return abrir;
                              });
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                          >
                            ＋ Registrar gasto
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setErrorComplementoSaldo("");
                              setMensajeComplementoSaldo("");
                              setFormComplementoSaldo({ provisionado: String(importeInicialProvision || expediente?.importe || ""), saldo_disponible: String(expediente?.saldo_disponible ?? resumenEconomico.saldoActual ?? ""), importe: "", motivo: "" });
                              setMostrarModalComplementoSaldo(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            ＋ Solicitar complemento de saldo
                          </button>
                        </div>
                        <div>

                        {mensajeComplementoSaldo && <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{mensajeComplementoSaldo}</div>}
                        {mostrarModalComplementoSaldo && (
                          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div><h5 className="text-sm font-extrabold text-slate-900">Solicitar complemento de saldo</h5><p className="mt-1 text-xs text-slate-600">La solicitud quedará registrada en Utilidades → Complementos de saldo con estado Pendiente.</p></div>
                              <button type="button" onClick={() => setMostrarModalComplementoSaldo(false)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600">Cerrar ×</button>
                            </div>
                            <form onSubmit={async (event) => {
                              event.preventDefault(); setErrorComplementoSaldo("");
                              const numeroExpediente = String(expediente?.id_expediente || id || "").trim();
                              const importe = Number(String(formComplementoSaldo.importe).replace(",", "."));
                              const provisionado = Number(String(formComplementoSaldo.provisionado || 0).replace(",", "."));
                              const saldoDisponible = Number(String(formComplementoSaldo.saldo_disponible || 0).replace(",", "."));
                              if (!numeroExpediente) { setErrorComplementoSaldo("No se ha podido identificar el expediente."); return; }
                              if (formComplementoSaldo.importe === "" || !Number.isFinite(importe) || importe <= 0) { setErrorComplementoSaldo("Introduce un saldo a solicitar válido y mayor que cero."); return; }
                              if (!Number.isFinite(provisionado) || !Number.isFinite(saldoDisponible)) { setErrorComplementoSaldo("No se han podido validar los importes de la provisión."); return; }
                              if (!String(formComplementoSaldo.motivo || "").trim()) { setErrorComplementoSaldo("Indica el motivo de la solicitud."); return; }
                              setGuardandoComplementoSaldo(true);
                              try {
                                await axios.post("/complementos-saldo", {
                                  expediente_id: expediente?.id || null, numero_expediente: numeroExpediente,
                                  fecha_solicitud: new Date().toLocaleDateString("sv-SE"),
                                  solicitante: expediente?.nombre_solicitante || expediente?.solicitante || expediente?.nombre_titular || "",
                                  oficina: expediente?.oficina || expediente?.oficina_alta || "",
                                  provisionado, saldo_disponible: saldoDisponible, importe,
                                  motivo: formComplementoSaldo.motivo.trim(), observaciones: formComplementoSaldo.motivo.trim(), estado: "Pendiente",
                                });
                                setMostrarModalComplementoSaldo(false);
                                setMensajeComplementoSaldo("Solicitud registrada correctamente. Estado: Pendiente.");
                                setFormComplementoSaldo({ provisionado: String(importeInicialProvision || expediente?.importe || ""), saldo_disponible: String(expediente?.saldo_disponible ?? resumenEconomico.saldoActual ?? ""), importe: "", motivo: "" });
                              } catch (error) {
                                setErrorComplementoSaldo(error?.response?.data?.detail || "No se pudo registrar la solicitud de complemento.");
                              } finally { setGuardandoComplementoSaldo(false); }
                            }} className="grid gap-3 sm:grid-cols-2">
                              <div><label className="mb-1 block text-xs font-bold text-slate-600">Provisionado (€)</label><input readOnly value={formComplementoSaldo.provisionado} className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600" /></div>
                              <div><label className="mb-1 block text-xs font-bold text-slate-600">Saldo disponible (€)</label><input readOnly value={formComplementoSaldo.saldo_disponible} className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600" /></div>
                              <div><label className="mb-1 block text-xs font-bold text-slate-600">Saldo a solicitar (€)</label><input required min="0.01" step="0.01" type="number" value={formComplementoSaldo.importe} onChange={(e) => setFormComplementoSaldo((f) => ({ ...f, importe: e.target.value }))} placeholder="0,00" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></div>
                              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-bold text-slate-600">Motivo</label><textarea required rows={3} value={formComplementoSaldo.motivo} onChange={(e) => setFormComplementoSaldo((f) => ({ ...f, motivo: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Explica el motivo por el que se solicita el complemento…" /></div>
                              {errorComplementoSaldo && <p role="alert" className="sm:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{errorComplementoSaldo}</p>}
                              <div className="flex flex-wrap justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setMostrarModalComplementoSaldo(false)} disabled={guardandoComplementoSaldo} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button type="submit" disabled={guardandoComplementoSaldo} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{guardandoComplementoSaldo ? "Guardando…" : "Solicitar complemento"}</button></div>
                            </form>
                          </div>
                        )}

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">Importe inicial de la provisión</p>
                            <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{importeInicialDisponible ? formatEuro(importeInicialProvision) : "—"}</p>
                            <p className="mt-1 text-[10px] text-slate-500">Campo Importe · Excel de Absis</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Saldo real actual</p>
                            <p className={`mt-1 text-2xl font-extrabold tabular-nums ${resumenEconomico.saldoActual < 0 ? "text-red-700" : "text-emerald-700"}`}>{importeInicialDisponible ? formatEuro(resumenEconomico.saldoActual) : "—"}</p>
                            <p className="mt-1 text-[10px] text-slate-500">Importe inicial menos pagos confirmados</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h5 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">Movimientos de la provisión</h5>
                          {cargandoGastos ? (
                            <p className="py-3 text-xs text-slate-500">Cargando movimientos económicos…</p>
                          ) : resumenEconomico.movimientos.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">Todavía no hay pagos confirmados para mostrar.</p>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                              <table className="w-full min-w-[980px] table-auto text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                                  <tr>
                                    <th className="w-[190px] px-5 py-4 font-extrabold">N.º documento</th>
                                    <th className="w-[170px] px-5 py-4 font-extrabold">Fecha de pago</th>
                                    <th className="px-5 py-4 font-extrabold">Concepto</th>
                                    <th className="w-[180px] px-5 py-4 text-right font-extrabold">Importe</th>
                                    <th className="w-[190px] px-5 py-4 text-right font-extrabold">Saldo real</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {resumenEconomico.movimientos.map((movimiento, indice) => (
                                    <tr key={movimiento.id} className={`border-t border-slate-100 transition-colors hover:bg-indigo-50/40 ${indice % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}>
                                      <td className="whitespace-nowrap px-5 py-4 font-extrabold text-indigo-700">{movimiento.numero_documento || `PAG-${String(movimiento.id).padStart(6, "0")}`}</td>
                                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{movimiento.fecha ? formatearFecha(movimiento.fecha) : "—"}</td>
                                      <td className="px-5 py-4 font-semibold text-slate-800">{movimiento.descripcion || movimiento.tipo || "Gasto"}</td>
                                      <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-red-700">{formatEuro(movimiento.importeMovimiento)}</td>
                                      <td className={`whitespace-nowrap px-5 py-4 text-right text-base font-extrabold ${movimiento.saldoCalculado < 0 ? "text-red-700" : "text-slate-900"}`}>{formatEuro(movimiento.saldoCalculado)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {!importeInicialDisponible && <p className="mt-2 text-[11px] text-amber-700">El expediente no tiene un Importe inicial válido; revisa la importación de Absis para calcular el saldo.</p>}
                        </div>

                        {errorGastos && (
                          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {errorGastos}
                          </div>
                        )}
                        {mensajeGastos && (
                          <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                            {mensajeGastos}
                          </div>
                        )}

                        {mostrarFormularioGasto && origenFormularioGasto === "economico" && createPortal((
                          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-modal-gasto">
                            <div className="flex max-h-[94vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                          <form onSubmit={guardarGastoExpediente} className="flex min-h-0 flex-col overflow-hidden">
                            <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                              <div><h5 id="titulo-modal-gasto" className="text-base font-extrabold text-slate-900">Registrar gasto · Factura y pago</h5><p className="mt-1 text-xs text-slate-500">El registro no ejecuta una transferencia bancaria.</p></div>
                              <button type="button" aria-label="Cerrar ventana" onClick={() => setMostrarFormularioGasto(false)} disabled={guardandoGasto} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg leading-none text-slate-600 hover:bg-slate-100 disabled:opacity-50">×</button>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">Pago: pendiente</span>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-5"><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(360px,0.9fr)]">
                              <div className="min-w-0">
                              <div className="space-y-3">
                                <h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Factura y proveedor</h6>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-indigo-800">Honorarios de gestoría (opcional)</span><select value={honorarioGestoriaId} onChange={(e) => { const idSeleccionado = e.target.value; setHonorarioGestoriaId(idSeleccionado); const tarifa = honorariosCatalogo.find((x) => String(x.id) === idSeleccionado); if (tarifa) {
                                    const importeTarifa = Number(tarifa.importe || 0).toFixed(2);
                                    const baseTarifa = Number(tarifa.base_imponible ?? tarifa.importe ?? 0).toFixed(2);
                                    const tipoCatalogo = String(tarifa.tipo_impuesto || "IVA").toUpperCase();
                                    const porcentajeTarifa = Number(tarifa.porcentaje_impuesto ?? (tipoCatalogo === "IGIC" ? 7 : tipoCatalogo === "EXENTO" ? 0 : 21));
                                    const tipoFormulario = tipoCatalogo === "EXENTO" ? "Exento" : tipoCatalogo === "IGIC" ? (porcentajeTarifa === 5 ? "IGIC 5%" : porcentajeTarifa === 6.5 ? "IGIC 6,50%" : "IGIC 7%") : "IVA 21%";
                                    const exento = tipoCatalogo === "EXENTO";
                                    setGastoForm((a) => ({
                                      ...a,
                                      tipo: "Honorarios de gestoría",
                                      descripcion: tarifa.nombre,
                                      importe_total_bruto: importeTarifa,
                                      importe: importeTarifa,
                                      base_exenta_impuestos: exento ? baseTarifa : "0.00",
                                      base_sujeta_impuestos: exento ? "0.00" : baseTarifa,
                                      tipo_impuesto: tipoFormulario,
                                      porcentaje_impuesto: String(porcentajeTarifa),
                                      base_exenta_retencion: "0.00",
                                      base_sujeta_retencion: "0.00",
                                      porcentaje_retencion: "0",
                                      tipo_retencion: "Sin retención",
                                    }));
                                  } }} className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm"><option value="">No aplicar una tarifa de honorarios</option>{honorariosCatalogo.filter((x) => x.activo).map((x) => <option key={x.id} value={String(x.id)}>{x.nombre} · base {formatEuro(Number(x.base_imponible ?? x.importe ?? 0))} + {String(x.tipo_impuesto || "IVA").toUpperCase()} {formatPercent(Number(x.porcentaje_impuesto ?? 21))} · total {formatEuro(Number(x.importe || 0))}</option>)}</select><span className="mt-1 block text-[11px] text-slate-500">Al elegir una tarifa, se rellena automáticamente el importe total con el precio configurado.</span></label>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Concepto del gasto *</span><select required value={gastoForm.tipo} onChange={(e) => setGastoForm((a) => ({...a, tipo:e.target.value, descripcion:a.descripcion || e.target.options[e.target.selectedIndex]?.text || e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">{cargandoConceptosGasto ? "Cargando catálogo…" : "Selecciona un concepto"}</option>{conceptosGasto.map((c) => <option key={String(c.value)} value={String(c.value)}>{c.label}</option>)}{!conceptosGasto.some((c) => String(c.value) === "Honorarios de gestoría") && <option value="Honorarios de gestoría">Honorarios de gestoría</option>}</select></label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">NIF/CIF/NIE notario</span><input value={gastoForm.nif_notario} onChange={(e)=>setGastoForm(a=>({...a,nif_notario:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Nombre del notario</span><input value={gastoForm.nombre_notario} onChange={(e)=>setGastoForm(a=>({...a,nombre_notario:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                </div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Pagador / razón social</span><input value={gastoForm.pagador} onChange={(e)=>setGastoForm(a=>({...a,pagador:e.target.value}))} placeholder="Nombre de facturación" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Número de factura</span><input value={gastoForm.numero_factura} onChange={(e)=>setGastoForm(a=>({...a,numero_factura:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Fecha de factura *</span><input required type="date" value={gastoForm.fecha_factura} onChange={(e)=>setGastoForm(a=>({...a,fecha_factura:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                </div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Fecha de pago / movimiento *</span><input required type="date" value={gastoForm.fecha} onChange={(e)=>setGastoForm(a=>({...a,fecha:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Cuenta bancaria / IBAN</span><input value={gastoForm.cuenta_bancaria} onChange={(e)=>setGastoForm(a=>({...a,cuenta_bancaria:e.target.value.toUpperCase()}))} placeholder="ES… (editable; no se autocompleta)" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Medio de pago</span><select value={gastoForm.medio_pago} onChange={(e)=>setGastoForm(a=>({...a,medio_pago:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>Transferencia</option><option>Cheque</option><option>Tarjeta</option><option>Efectivo</option><option>Otro</option></select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Estado</span><select value={gastoForm.estado_pago} onChange={(e)=>setGastoForm(a=>({...a,estado_pago:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>Pendiente</option><option>Pagado</option><option>Anulado</option></select></label></div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Documento / URL de factura</span><input type="url" value={gastoForm.documento_url} onChange={(e)=>setGastoForm(a=>({...a,documento_url:e.target.value}))} placeholder="https://…" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                              </div>
                              </div>
                              <div className="space-y-3">
                                <h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Impuestos y retenciones</h6>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tramo de impuesto</span><select value={gastoForm.tramo_impuesto} onChange={(e)=>setGastoForm(a=>({...a,tramo_impuesto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{["Exento","General","Reducido","Super reducido","Único"].map(x=><option key={x}>{x}</option>)}</select></label>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tipo impositivo</span><select value={gastoForm.tipo_impuesto} onChange={(e)=>{const v=e.target.value;setGastoForm(a=>({...a,tipo_impuesto:v,porcentaje_impuesto:v==="IVA 21%"?"21":v==="IGIC 5%"?"5":v==="IGIC 6,50%"?"6.5":v==="IGIC 7%"?"7":"0"}))}} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{!["Exento","IVA 21%","IGIC 5%","IGIC 6,50%","IGIC 7%"].includes(gastoForm.tipo_impuesto) && <option value={gastoForm.tipo_impuesto}>{gastoForm.tipo_impuesto}</option>}{["Exento","IVA 21%","IGIC 5%","IGIC 6,50%","IGIC 7%"].map(x=><option key={x}>{x}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Porcentaje (%)</span><input type="number" min="0" max="100" step="0.01" value={gastoForm.porcentaje_impuesto} onChange={(e)=>setGastoForm(a=>({...a,porcentaje_impuesto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="grid gap-3 sm:grid-cols-2">{[["Base exenta (€)","base_exenta_impuestos"],["Base sujeta (€)","base_sujeta_impuestos"]].map(([label,key])=><label key={key} className="block"><span className="mb-1 block text-xs font-bold text-slate-700">{label}</span><input type="number" min="0" step="0.01" value={gastoForm[key]} onChange={(e)=>setGastoForm(a=>({...a,[key]:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>)}</div>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><div className="flex justify-between"><span>Impuesto calculado</span><strong>{formatEuro(impuestoCalculadoGasto)}</strong></div></div>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Base exenta retención (€)</span><input type="number" min="0" step="0.01" value={gastoForm.base_exenta_retencion} onChange={(e)=>setGastoForm(a=>({...a,base_exenta_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Base sujeta retención (€)</span><input type="number" min="0" step="0.01" value={gastoForm.base_sujeta_retencion} onChange={(e)=>setGastoForm(a=>({...a,base_sujeta_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Retención</span><select value={gastoForm.tipo_retencion} onChange={(e)=>setGastoForm(a=>({...a,tipo_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>IRPF profesionales</option><option>Sin retención</option></select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">IRPF (%)</span><input type="number" min="0" max="21" step="0.01" value={gastoForm.porcentaje_retencion} onChange={(e)=>setGastoForm(a=>({...a,porcentaje_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div className="flex justify-between text-xs text-slate-600"><span>Retención calculada</span><strong>{formatEuro(retencionCalculadaGasto)}</strong></div><div className="mt-2 flex items-end justify-between gap-3"><span className="text-xs font-bold text-indigo-900">Resultado calculado</span><strong className="text-2xl text-indigo-950">{formatEuro(resultadoCalculadoGasto)}</strong></div><label className="mt-3 block"><span className="mb-1 block text-xs font-bold text-slate-700">Total bruto de factura (€) *</span><input required type="number" min="0" step="0.01" value={gastoForm.importe_total_bruto} onChange={(e)=>setGastoForm(a=>({...a,importe_total_bruto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Descripción *</span><input required value={gastoForm.descripcion} onChange={(e)=>setGastoForm(a=>({...a,descripcion:e.target.value}))} placeholder="Concepto detallado de la factura" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                              </div>
                              <aside className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-3">
                                  <h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Factura de Carpeta Digital</h6>
                                  <p className="mt-1 text-[11px] text-slate-500">Factura notarial o registral · PDF</p>
                                </div>
                                <label className="mb-3 block">
                                  <span className="mb-1 block text-xs font-bold text-slate-700">Documento a revisar</span>
                                  <select value={documentoFacturaSeleccionado} onChange={(e) => { setDocumentoFacturaSeleccionado(e.target.value); setGastoForm(a => ({...a, documento_carpeta_id: e.target.value})); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                                    <option value="">Selecciona una factura PDF…</option>
                                    {documentosFacturaElegibles.map((doc) => <option key={doc.id} value={String(doc.id)}>{doc.nombre_original || doc.nombre || `Documento ${doc.id}`} · {doc.categoria || doc.categoria_nombre}</option>)}
                                  </select>
                                </label>
                                {cargandoVistaPreviaFactura ? <p className="p-4 text-xs text-slate-500">Cargando PDF…</p> : null}
                                {errorVistaPreviaFactura ? <p role="alert" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{errorVistaPreviaFactura}</p> : null}
                                {urlVistaPreviaFactura ? <iframe title="Vista previa de factura" src={urlVistaPreviaFactura} className="h-[58vh] min-h-[360px] w-full rounded-lg border border-slate-200 bg-white" /> : null}
                                {!urlVistaPreviaFactura && !cargandoVistaPreviaFactura && !errorVistaPreviaFactura ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">No hay ningún PDF seleccionado. Comprueba que la factura esté en Gestión económica de la Carpeta Digital.</p> : null}
                              </aside>
                            </div></div>
                            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={()=>setMostrarFormularioGasto(false)} disabled={guardandoGasto} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button type="submit" disabled={guardandoGasto || cargandoConceptosGasto} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{guardandoGasto ? "Guardando…" : "Registrar gasto"}</button></div>
                          </form>
                            </div>
                          </div>
                        ), document.body)}

                        <div className="mt-6 border-t border-slate-100 pt-5">
                          <h5 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-700">Facturas y gastos registrados</h5>
                          {cargandoGastos ? (
                            <p className="py-4 text-sm text-slate-500">Cargando gastos…</p>
                          ) : gastosExpediente.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">Todavía no hay gastos registrados en este expediente.</p>
                          ) : (
                            <ul className="space-y-3">
                              {gastosExpediente.map((gasto) => (
                                <li key={gasto.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-extrabold text-slate-900">{gasto.descripcion || gasto.tipo || "Gasto"}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                                      <span className="font-bold text-indigo-700">{gasto.numero_documento || `PAG-${String(gasto.id).padStart(6, "0")}`}</span>
                                      {gasto.tipo && <span>{gasto.tipo}</span>}
                                      {gasto.fecha && <span>Fecha: {formatearFecha(gasto.fecha)}</span>}
                                      {gasto.id_gasto_absis && <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">IDGASTO: {gasto.id_gasto_absis}</span>}
                                      {gasto.tipo_concepto_absis && <span className="rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">TIPOCONCEPTO: {gasto.tipo_concepto_absis}</span>}
                                      {gasto.estado_consolidacion && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${gasto.estado_consolidacion === "Consolidado" ? "bg-emerald-50 text-emerald-700" : gasto.estado_consolidacion === "Pendiente envío" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{gasto.estado_consolidacion}</span>}
                                      {gasto.fecha_ultima_sincronizacion && <span>Sincronizado: {formatearFecha(gasto.fecha_ultima_sincronizacion)}</span>}
                                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${String(gasto.estado_pago || "Pendiente").toLowerCase().includes("pag") || String(gasto.estado_pago || "").toLowerCase().includes("abon") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{gasto.estado_pago || "Pendiente"}</span>
                                    </div>
                                  </div>
                                  <span className="whitespace-nowrap text-base font-extrabold text-slate-900">
                                    {gasto.importe_resultante == null && gasto.importe == null ? "—" : formatEuro(Number(gasto.importe_resultante ?? gasto.importe))}
                                  </span>
                                  {(() => {
                                    const estadoPago = String(gasto.estado_pago || "Pendiente").trim().toLowerCase();
                                    const pagado = estadosPagoConfirmado.includes(estadoPago);
                                    const importeObligacion = Number(gasto.importe_resultante ?? gasto.importe ?? 0);
                                    const pagosActivos = (pagosPorGasto[String(gasto.id)] || []).filter((pago) => !pago.anulado_en);
                                    const totalPagado = pagosActivos.reduce((suma, pago) => suma + Number(pago.importe || 0), 0);
                                    const completado = pagado || (importeObligacion > 0 && totalPagado + 0.005 >= importeObligacion);
                                    return <button type="button" onClick={() => void abrirPagoDesdeGestionEconomica(gasto.id)} disabled={completado} title={completado ? "Obligación pagada; no admite otro pago" : "Registrar un pago de esta obligación"} className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45">{completado ? "Pagada" : "Pagar"}</button>;
                                  })()}
                                  <button type="button" onClick={() => eliminarGastoExpediente(gasto)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50">
                                    Eliminar
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {gastosPendientesResumen.length > 0 && <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">Hay {gastosPendientesResumen.length} gasto(s) pendiente(s) de pago que todavía no descuentan del saldo real.</p>}
                        </div>
                        </div>
                      </section>
                    )}
                </>
                </div>
              </section>
            </div>
          </div>
        </div>
 
  {mostrarCarpetaDigital && (
        <CarpetaDigitalModal
          expedienteId={id || expediente?.id_expediente || expediente?.id}
          onClose={() => setMostrarCarpetaDigital(false)}
        />
      )}
      {mostrarRepositoriosDocumentacionPrevia && (
        <CarpetaDigitalModal
          expedienteId={id || expediente?.id_expediente || expediente?.id}
          modoActividad
          actividadId="documentacion-previa"
          onClose={() => setMostrarRepositoriosDocumentacionPrevia(false)}
          onDocumentosChange={actualizarDocumentosCarpetaPrevia}
        />
      )}


      <Modal
        open={mostrarReclamarOficina}
        onClose={() => !enviandoReclamacion && setMostrarReclamarOficina(false)}
        titulo="✉️ Emails del expediente"
        subtitulo={`Expediente ${valorVisible(expediente?.id_expediente || id)} · Correspondencia tipificada e histórico`}
        ancho="max-w-5xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Boton onClick={() => setMostrarReclamarOficina(false)} disabled={enviandoReclamacion}>Cerrar</Boton>
            <Boton tipo="primary" onClick={enviarReclamacionOficina} disabled={enviandoReclamacion || !emailReclamacion.destinatario.trim() || !emailReclamacion.asunto.trim() || !emailReclamacion.cuerpo.trim() || /\[\[FALTA:/.test(emailReclamacion.destinatario + emailReclamacion.cc + emailReclamacion.asunto + emailReclamacion.cuerpo)}>
              {enviandoReclamacion ? "Enviando…" : "✉️ Enviar email"}
            </Boton>
          </div>
        }
      >
        <div className="space-y-5">
          {errorReclamacion && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorReclamacion}</p>}
          {mensajeReclamacion && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensajeReclamacion}</p>}
          <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">1 · Tipo de email</label>
              <select value={categoriaEmail} onChange={(e) => { setCategoriaEmail(e.target.value); setPlantillaEmailId(""); setEmailReclamacion({ destinatario: "", cc: "", asunto: "", cuerpo: "" }); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                <option value="">Todas las categorías</option>
                {categoriasEmail.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">2 · Plantilla guardada</label>
              <select value={plantillaEmailId} onChange={(e) => seleccionarPlantillaEmail(e.target.value)} disabled={cargandoPlantillasEmail || plantillasCategoriaEmail.length === 0} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                <option value="">{cargandoPlantillasEmail ? "Cargando plantillas…" : plantillasCategoriaEmail.length ? "Selecciona una plantilla…" : "No hay plantillas activas para esta categoría"}</option>
                {plantillasCategoriaEmail.map((plantilla) => <option key={plantilla.id} value={plantilla.id}>{plantilla.nombre} · {plantilla.asunto || "Sin asunto"}</option>)}
              </select>
            </div>
            {plantillaEmailId && <p className="text-xs text-slate-500 md:col-span-2">Plantilla: {plantillaSeleccionadaEmail?.nombre || "—"}. Revisa los marcadores [[FALTA: …]] si algún dato no existe en la ficha.</p>}
          </section>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <CampoFormulario label="De · Email de empresa (FichaEmpleado)" value={empleadoSesion?.email_empresa || "Falta email de empresa en la ficha del empleado"} onChange={() => {}} />
            <CampoFormulario label="Para · Destinatario" value={emailReclamacion.destinatario} onChange={(v) => setEmailReclamacion((p) => ({ ...p, destinatario: v }))} placeholder="Email del destinatario" />
            <CampoFormulario label="CC · Copia (opcional)" value={emailReclamacion.cc} onChange={(v) => setEmailReclamacion((p) => ({ ...p, cc: v }))} placeholder="Email en copia, si procede" />
          </div>
          <CampoFormulario label="Asunto" value={emailReclamacion.asunto} onChange={(v) => setEmailReclamacion((p) => ({ ...p, asunto: v }))} />
          <CampoFormulario label="Mensaje (editable antes de enviar)" value={emailReclamacion.cuerpo} onChange={(v) => setEmailReclamacion((p) => ({ ...p, cuerpo: v }))} textarea />
          <section className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Histórico de emails</h3>
                <p className="text-xs text-slate-500">Registro guardado en el sistema para este expediente.</p>
              </div>
              <Boton onClick={cargarHistoricoReclamaciones} disabled={cargandoHistoricoReclamaciones}>{cargandoHistoricoReclamaciones ? "Actualizando…" : "↻ Actualizar"}</Boton>
            </div>
            {cargandoHistoricoReclamaciones ? <p className="p-4 text-sm text-slate-500">Cargando histórico…</p> : historicoReclamaciones.length === 0 ? <p className="p-4 text-sm text-slate-500">Todavía no hay correos registrados.</p> : (
              <div className="max-h-64 overflow-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="sticky top-0 bg-white text-slate-500"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Tipo / plantilla</th><th className="px-3 py-2">Para</th><th className="px-3 py-2">Asunto</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Gestor</th></tr></thead>
                  <tbody>{historicoReclamaciones.map((item) => <tr key={item.id} className="border-t border-slate-100 align-top"><td className="whitespace-nowrap px-3 py-2">{item.creado_en ? new Date(item.creado_en).toLocaleString("es-ES") : "—"}</td><td className="px-3 py-2">{item.categoria || "—"}<p className="text-slate-400">{item.plantilla_nombre || "Plantilla manual/anterior"}</p></td><td className="px-3 py-2">{item.destinatario}{item.cc && <p className="text-slate-400">CC: {item.cc}</p>}</td><td className="max-w-xs px-3 py-2">{item.asunto}</td><td className="px-3 py-2"><span className={item.estado === "enviado" ? "font-bold text-emerald-700" : "font-bold text-red-700"}>{item.estado === "enviado" ? "Enviado" : "Error"}</span>{item.detalle && <p className="mt-1 max-w-xs text-[10px] text-slate-500">{item.detalle}</p>}</td><td className="px-3 py-2">{item.enviado_por || "—"}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
          <p className="text-[11px] text-amber-700">El envío requiere que el servidor tenga configuradas las variables SMTP. El historial registra tanto los envíos correctos como los intentos fallidos.</p>
        </div>
      </Modal>


      {/* AVISO CENTRAL DE BLOQUEO: no se muestra para RETENCIÓN SIN TRAMITAR (RST). */}
      <Modal
        open={mostrarAvisoBloqueoExpediente}
        onClose={() => setMostrarAvisoBloqueoExpediente(false)}
        titulo="⛔ AVISO DE BLOQUEO DEL EXPEDIENTE"
        subtitulo={`Expediente ${valorVisible(expediente?.id_expediente)}`}
        ancho="max-w-[620px]"
        footer={
          <div className="flex flex-wrap justify-center gap-3">
            <Boton onClick={() => setMostrarAvisoBloqueoExpediente(false)}>Entendido</Boton>
            <Boton tipo="primary" onClick={() => { setMostrarAvisoBloqueoExpediente(false); abrirControlExpediente(); }}>Gestionar bloqueo</Boton>
          </div>
        }
      >
        <div role="alert" className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-center shadow-inner sm:p-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-white text-4xl shadow-sm">⛔</div>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-red-700">Expediente bloqueado</p>
          <h2 className="mt-2 text-xl font-black text-red-900 sm:text-2xl">{motivoBloqueoExpediente}</h2>
          {(String(expediente?.estado_expediente || "").trim().toUpperCase().startsWith("LST") || expediente?.liquidado_sin_tramitar) && (
            <p className="mt-3 text-sm font-semibold text-red-800">Liquidación sin tramitar · fecha: {formatearFecha(expediente?.fecha_liquidacion_sin_tramitar)}</p>
          )}
          {expediente?.cambio_gestoria && (
            <p className="mt-2 text-sm font-semibold text-red-800">Cambio de gestoría · fecha: {formatearFecha(expediente?.fecha_cambio_gestoria)}</p>
          )}
          {expediente?.bloqueo_manual && (
            <p className="mt-2 text-sm font-semibold text-red-800">Motivo: {valorVisible(expediente?.motivo_bloqueo)} · fecha: {formatearFecha(expediente?.fecha_bloqueo)}</p>
          )}
          <p className="mt-4 rounded-xl border border-red-200 bg-white/80 px-4 py-3 text-sm font-bold text-red-800">Las actividades no se pueden modificar ni avanzar mientras el expediente siga bloqueado.</p>
        </div>
      </Modal>

      {/* CONTROL DE BLOQUEO */}
      <Modal open={mostrarControlExpediente} onClose={()=>!guardandoControlExpediente&&setMostrarControlExpediente(false)} titulo="Control del expediente" subtitulo={`Expediente ${valorVisible(expediente?.id_expediente)}`} ancho="max-w-[760px]" footer={<div className="flex justify-end gap-2"><Boton onClick={()=>setMostrarControlExpediente(false)} disabled={guardandoControlExpediente}>Cancelar</Boton><Boton tipo="primary" onClick={guardarControlExpediente} disabled={guardandoControlExpediente}>{guardandoControlExpediente?"Guardando…":"Guardar control"}</Boton></div>}>
        <div className="space-y-4">
          {estadoLegadoBloqueante&&<p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">El estado {expediente?.estado_expediente} mantiene el bloqueo automático. Para desbloquearlo, debe corregirse primero el estado del expediente.</p>}
          <label className="flex items-start gap-3 rounded-xl border p-4"><input type="checkbox" className="mt-1" checked={!!controlExpediente.liquidado_sin_tramitar} onChange={e=>setControlExpediente(v=>({...v,liquidado_sin_tramitar:e.target.checked}))}/><span className="flex-1"><strong className="block text-sm">Liquidado sin tramitar</strong><span className="block text-xs text-slate-500">Bloquea el expediente y genera aviso central.</span>{controlExpediente.liquidado_sin_tramitar&&<input aria-label="Fecha liquidado sin tramitar" type="date" className="mt-3 w-full rounded-lg border p-2" value={controlExpediente.fecha_liquidacion_sin_tramitar||""} onChange={e=>setControlExpediente(v=>({...v,fecha_liquidacion_sin_tramitar:e.target.value}))}/>}</span></label>
          <label className="flex items-start gap-3 rounded-xl border p-4"><input type="checkbox" className="mt-1" checked={!!controlExpediente.cambio_gestoria} onChange={e=>setControlExpediente(v=>({...v,cambio_gestoria:e.target.checked}))}/><span className="flex-1"><strong className="block text-sm">Cambio de gestoría</strong><span className="block text-xs text-slate-500">Bloquea el expediente con aviso específico.</span>{controlExpediente.cambio_gestoria&&<input aria-label="Fecha cambio gestoría" type="date" className="mt-3 w-full rounded-lg border p-2" value={controlExpediente.fecha_cambio_gestoria||""} onChange={e=>setControlExpediente(v=>({...v,fecha_cambio_gestoria:e.target.value}))}/>}</span></label>
          <div className="rounded-xl border p-4"><label className="flex items-start gap-3"><input type="checkbox" className="mt-1" checked={!!controlExpediente.bloqueo_manual} onChange={e=>setControlExpediente(v=>({...v,bloqueo_manual:e.target.checked}))}/><span><strong className="block text-sm">Bloqueo manual</strong><span className="block text-xs text-slate-500">Se puede desbloquear desmarcando esta opción.</span></span></label>{controlExpediente.bloqueo_manual&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Motivo<input className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" value={controlExpediente.motivo_bloqueo||""} onChange={e=>setControlExpediente(v=>({...v,motivo_bloqueo:e.target.value}))} placeholder="Motivo del bloqueo"/></label><label className="text-xs font-bold">Fecha<input type="date" className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" value={controlExpediente.fecha_bloqueo||""} onChange={e=>setControlExpediente(v=>({...v,fecha_bloqueo:e.target.value}))}/></label></div>}</div>
          {errorControlExpediente&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{errorControlExpediente}</p>}
          <p className="text-xs text-slate-500">LST y RST bloquean automáticamente el expediente aunque se desmarquen las opciones.</p>
        </div>
      </Modal>

      {/* =====================================================
          MODAL DEFECTO
      ====================================================== */}

     
<Modal
  open={mostrarDefecto}
  onClose={() => setMostrarDefecto(false)}
  titulo="⚠️ Alta de defecto registral"
  subtitulo={`Expediente ${valorVisible(expediente?.id_expediente)}`}
  ancho="max-w-4xl"
  footer={
    <>
      <Boton
        onClick={() => {
          setDefectoEditandoId(null);
          setDefectoForm({ ...DEFECTO_VACIO });
          setMostrarDefecto(false);
        }}
      >
        Cerrar
      </Boton>

      <Boton
        tipo="primary"
        disabled={guardandoDefecto}
        onClick={guardarDefectoRegistral}
      >
        {guardandoDefecto ? "Guardando…" : "Guardar defecto"}
      </Boton>
    </>
  }
>
  <div className="space-y-6">
    {errorDefecto && (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {errorDefecto}
      </div>
    )}

    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">
        Defectos registrados
      </h3>

      {defectosRegistrados.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no hay defectos registrados para este expediente.
        </p>
      ) : (
        <div className="space-y-2">
          {defectosRegistrados.map((defecto) => (
            <div
              key={defecto.id ?? defecto.id_defecto}
              className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {defecto.motivo_defecto || defecto.tipo_error || "Defecto"}
                </p>

                {defecto.tipo_carga_hipotecaria_nombre || tiposCargaHipotecaria.find(
                  (tipo) => String(tipo.id) === String(defecto.tipo_carga_hipotecaria_id)
                )?.nombre ? (
                  <p className="mt-1 text-xs font-medium text-indigo-700">
                    Carga hipotecaria: {defecto.tipo_carga_hipotecaria_nombre || tiposCargaHipotecaria.find(
                      (tipo) => String(tipo.id) === String(defecto.tipo_carga_hipotecaria_id)
                    )?.nombre}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {defecto.fecha_entrada_subsanacion
                    ? `Subsanado: ${formatearFecha(defecto.fecha_entrada_subsanacion)}`
                    : "Pendiente de subsanación"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {defecto.calificacion_nombre && (
                  <Boton onClick={() => descargarPDFCalificacion(defecto)}>
                    Descargar PDF
                  </Boton>
                )}
                <Boton onClick={() => editarDefectoRegistrado(defecto)}>
                  ✏️ Editar
                </Boton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <div>
      <h3 className="mb-3 text-sm font-bold text-slate-800">
        {defectoEditandoId
          ? `Modificar defecto nº ${defectoEditandoId}`
          : "Datos del nuevo defecto"}
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Tipo de carga hipotecaria
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            value={defectoForm.tipo_carga_hipotecaria_id}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                tipo_carga_hipotecaria_id: e.target.value,
              }))
            }
          >
            <option value="">Selecciona un tipo de carga hipotecaria…</option>
            {tiposCargaHipotecaria.map((tipo) => (
              <option key={tipo.id} value={String(tipo.id)}>
                {tipo.nombre}
              </option>
            ))}
          </select>
          {tiposCargaHipotecaria.length === 0 && (
            <span className="mt-1 block text-xs font-normal text-amber-700">
              No hay tipos activos disponibles en el catálogo.
            </span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Motivos del Defecto *
          <select
            required
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            value={defectoForm.motivo_defecto}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                motivo_defecto: e.target.value,
              }))
            }
          >
            <option value="">Selecciona un motivo…</option>
            {MOTIVOS_DEFECTO.map((motivo) => (
              <option
                key={motivo.codigo}
                value={`${motivo.codigo}.${motivo.texto}`}
              >
                {motivo.codigo}.{motivo.texto}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Subtipo del Defecto
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            value={defectoForm.subtipo_defecto_id}
            onChange={(e) => {
              const subtipoSeleccionado = subtiposDefecto.find(
                (item) => String(item.id) === e.target.value
              );
              setDefectoForm((actual) => ({
                ...actual,
                subtipo_defecto_id: e.target.value,
                subtipo_defecto: subtipoSeleccionado?.nombre || "",
              }));
            }}
          >
            <option value="">Selecciona un subtipo de defecto…</option>
            {subtiposDefecto.map((subtipo) => (
              <option key={subtipo.id} value={String(subtipo.id)}>
                {subtipo.nombre}{subtipo.descripcion ? ` — ${subtipo.descripcion}` : ""}
              </option>
            ))}
          </select>
          {subtiposDefecto.length === 0 && (
            <span className="mt-1 block text-xs font-normal text-amber-700">
              No hay subtipos activos disponibles. Comprueba que el catálogo se haya cargado.
            </span>
          )}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Fecha calificación *
          <input type="date" required className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" value={defectoForm.fecha_calificacion} onChange={(e) => setDefectoForm((actual) => ({ ...actual, fecha_calificacion: e.target.value }))} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Fecha renovación asiento
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" value={defectoForm.fecha_renovacion_asiento} onChange={(e) => setDefectoForm((actual) => ({ ...actual, fecha_renovacion_asiento: e.target.value }))} />
        </label>
        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Asiento renovación y libro diario
          <input type="text" maxLength={200} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" value={defectoForm.asiento_renovacion_libro_diario} onChange={(e) => setDefectoForm((actual) => ({ ...actual, asiento_renovacion_libro_diario: e.target.value }))} placeholder="Asiento de renovación / libro diario" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Vencimiento asiento renovación
          <input type="date" readOnly className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm" value={defectoForm.vencimiento_asiento_renovacion} />
          <span className="mt-1 block text-xs font-normal text-amber-700">Cálculo automático: fecha de notificación + 60 días naturales.</span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Anotación suspensiva
          <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" value={defectoForm.anotacion_suspensiva} onChange={(e) => setDefectoForm((actual) => ({ ...actual, anotacion_suspensiva: e.target.value }))}>
            <option value="">— Seleccionar —</option><option value="true">Sí</option><option value="false">No</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Vencimiento anotación
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" value={defectoForm.vencimiento_anotacion} onChange={(e) => setDefectoForm((actual) => ({ ...actual, vencimiento_anotacion: e.target.value }))} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Calificación sustitutoria
          <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" value={defectoForm.calificacion_sustitutoria} onChange={(e) => setDefectoForm((actual) => ({ ...actual, calificacion_sustitutoria: e.target.value }))}>
            <option value="">— Seleccionar —</option><option value="true">Sí</option><option value="false">No</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Recurso gubernativo
          <select className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" value={defectoForm.recurso_gubernativo} onChange={(e) => setDefectoForm((actual) => ({ ...actual, recurso_gubernativo: e.target.value }))}>
            <option value="">— Seleccionar —</option><option value="true">Sí</option><option value="false">No</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Fecha Notificación Registro
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            value={defectoForm.fecha_notificacion_registro}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                fecha_notificacion_registro: e.target.value,
                vencimiento_asiento_renovacion: calcularVencimientoAsientoRenovacion(e.target.value),
              }))
            }
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Fecha Vencimiento Presentación Registro
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            value={defectoForm.fecha_vencimiento_presentacion}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                fecha_vencimiento_presentacion: e.target.value,
              }))
            }
          />
        </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Calificación del Registro
          <textarea
            rows={3}
            maxLength={2000}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            value={defectoForm.calificacion_registro}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                calificacion_registro: e.target.value,
              }))
            }
            placeholder="Introduce la calificación del Registro"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          PDF de calificación del Registro
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            onChange={(e) => setArchivoCalificacion(e.target.files?.[0] || null)}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            PDF de hasta 15 MB. Se guardará al pulsar «Guardar defecto».
            {archivoCalificacion ? ` Archivo seleccionado: ${archivoCalificacion.name}` : ""}
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Observaciones
          <span className="ml-2 text-xs font-normal text-slate-400">
            {defectoForm.observaciones_registro.length}/200 caracteres
          </span>
          <textarea
            rows={3}
            maxLength={200}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            value={defectoForm.observaciones_registro}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                observaciones_registro: e.target.value,
              }))
            }
            placeholder="Observaciones del defecto"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700 md:col-span-2">
          Fecha Entrada Registro Subsanación
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            value={defectoForm.fecha_entrada_subsanacion}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                fecha_entrada_subsanacion: e.target.value,
              }))
            }
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Rellena esta fecha cuando la subsanación haya entrado en el Registro.
          </span>
        </label>
      </div>

      {defectoEditandoId && (
        <div className="mt-4 flex justify-end">
          <Boton
            onClick={() => {
              setDefectoEditandoId(null);
              setDefectoForm({ ...DEFECTO_VACIO });
              setErrorDefecto("");
            }}
          >
            Cancelar edición
          </Boton>
        </div>
      )}
    </div>
  </div>
</Modal>

      {/* =====================================================
          MODAL FINCAS Y REGISTROS
      ====================================================== */}

      <Modal
        open={mostrarFincas}
        onClose={() => {
          setMostrarFincas(false);
          setFincaEditandoId(null);
        }}
        titulo={fincaEditandoId !== null ? "Editar finca" : "Nueva finca"}
        subtitulo="Datos registrales del expediente"
        ancho="max-w-5xl"
        footer={
          <>
            <Boton
              onClick={() =>
                setMostrarFincas(false)
              }
            >
              Cerrar
            </Boton>

            <Boton
              tipo="primary"
              onClick={guardarFinca}
              disabled={guardandoFinca}
            >
              {guardandoFinca ? "Guardando..." : "Guardar finca"}
            </Boton>
          </>
        }
      >

        <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">

          <CampoFormulario
            label="Finca"
            value={fincaForm.numero_finca}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                numero_finca: valor,
              }))
            }
          />

          <CampoFormulario
            label="CRU/Idufir"
            value={fincaForm.cru_idufir}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                cru_idufir: valor,
              }))
            }
          />

          <div className="relative mt-4 min-w-0">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Población / municipio</label>
            <input
              type="text"
              value={fincaForm.poblacion ?? ""}
              autoComplete="off"
              placeholder={cargandoMunicipiosCatalogo ? "Cargando municipios..." : "Escribe para buscar un municipio"}
              onFocus={() => setMunicipiosFincaAbierto(true)}
              onChange={(event) => {
                const valor = event.target.value;
                const coincidencia = municipiosCatalogo.find((item) => normalizarMunicipio(item.municipio) === normalizarMunicipio(valor));
                setFincaForm((actual) => ({ ...actual, poblacion: valor, provincia: coincidencia ? coincidencia.provincia : "" }));
                setMunicipiosFincaAbierto(true);
              }}
              onBlur={() => setTimeout(() => setMunicipiosFincaAbierto(false), 120)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={municipiosFincaAbierto}
              aria-label="Población o municipio de la finca"
            />
            {municipiosFincaAbierto && String(fincaForm.poblacion || "").trim() && (
              <div role="listbox" className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {municipiosCatalogo.filter((item) =>
                  normalizarMunicipio(item.municipio).includes(normalizarMunicipio(fincaForm.poblacion)) ||
                  normalizarMunicipio(item.provincia).includes(normalizarMunicipio(fincaForm.poblacion))
                ).slice(0, 10).map((item) => (
                  <button
                    key={item.id ?? (item.municipio + "-" + item.provincia)}
                    type="button"
                    role="option"
                    aria-selected={normalizarMunicipio(item.municipio) === normalizarMunicipio(fincaForm.poblacion)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setFincaForm((actual) => ({ ...actual, poblacion: item.municipio, provincia: item.provincia }));
                      setMunicipiosFincaAbierto(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-indigo-50"
                  >
                    <span className="font-medium text-slate-800">{item.municipio}</span>
                    <span className="text-xs text-slate-500">{item.provincia}</span>
                  </button>
                ))}
                {municipiosCatalogo.filter((item) =>
                  normalizarMunicipio(item.municipio).includes(normalizarMunicipio(fincaForm.poblacion)) ||
                  normalizarMunicipio(item.provincia).includes(normalizarMunicipio(fincaForm.poblacion))
                ).length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No se encuentra en el catálogo. Revisa Utilidades → Municipios.</p>}
              </div>
            )}
            <p className="mt-1 text-[11px] text-slate-500">{cargandoMunicipiosCatalogo ? "Cargando catálogo de municipios…" : "Selecciona una población del catálogo para completar automáticamente la provincia."}</p>
          </div>

          <div className="mt-4 min-w-0">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Provincia (automática)</label>
            <input
              type="text"
              value={fincaForm.provincia ?? ""}
              readOnly
              aria-label="Provincia de la finca, completada automáticamente"
              placeholder="Se completa al seleccionar la población"
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none"
            />
          </div>

          <div className="mt-4 min-w-0">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Registro (número - Nombre)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fincaForm.registro || ""}
                readOnly
                placeholder="Selecciona un Registro de la Propiedad"
                onClick={() => {
                  const existente = catalogoRegistrosPropiedad.find((item) => String(item.id) === String(fincaForm.registro_propiedad_id));
                  if (existente) setRegistroDetalleAbierto(existente);
                  else if (fincaForm.registro) {
                    const texto = normalizarTexto(fincaForm.registro);
                    const coincidencia = catalogoRegistrosPropiedad.find((item) => normalizarTexto(item.registro_propiedad) === texto || normalizarTexto(item.registro_propiedad).includes(texto) || texto.includes(normalizarTexto(item.registro_propiedad)));
                    if (coincidencia) setRegistroDetalleAbierto(coincidencia);
                    else setModalSelectorRegistro(true);
                  } else setModalSelectorRegistro(true);
                }}
                className="min-w-0 flex-1 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none hover:border-indigo-300"
                aria-label="Consultar datos del Registro de la Propiedad"
              />
              <button type="button" onClick={() => { setBusquedaRegistroCatalogo(""); setModalSelectorRegistro(true); }} className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">Buscar</button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{fincaForm.registro_propiedad_id ? "Registro vinculado al catálogo. Pulsa el campo para consultar sus datos." : "Selecciona un registro del catálogo para vincularlo al expediente."}</p>
          </div>

          <CampoFormulario
            label="Sección"
            value={fincaForm.seccion}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                seccion: valor,
              }))
            }
          />

          <CampoFormulario
            label="Cuantía"
            value={fincaForm.cuantia}
            tipo="number"
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                cuantia: valor,
              }))
            }
          />

          <CampoFormulario
            label="Inscripción"
            value={fincaForm.inscripcion}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                inscripcion: valor,
              }))
            }
          />

          <CampoFormulario
            label="Contrato"
            value={fincaForm.contrato}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                contrato: valor,
              }))
            }
          />

          <CampoFormulario
            label="Fecha Constitución"
            value={fincaForm.fecha_constitucion}
            tipo="date"
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                fecha_constitucion: valor,
              }))
            }
          />

          <CampoSelect
            label="Subrogado"
            value={fincaForm.subrogado}
            opciones={["NO", "SI"]}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                subrogado: valor,
              }))
            }
          />

          <CampoSelect
            label="Entidad Original"
            value={fincaForm.entidad_original}
            opciones={ENTIDADES_ORIGINALES_FINCA}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                entidad_original: valor,
              }))
            }
          />

        </div>

      </Modal>


      <Modal
        open={modalSelectorRegistro}
        onClose={() => setModalSelectorRegistro(false)}
        titulo="Catálogo de Registros de la Propiedad"
        subtitulo="Busca y vincula un registro al expediente"
        ancho="max-w-4xl"
        footer={<Boton onClick={() => setModalSelectorRegistro(false)}>Cerrar</Boton>}
      >
        <div className="space-y-3">
          <input value={busquedaRegistroCatalogo} onChange={(event) => setBusquedaRegistroCatalogo(event.target.value)} placeholder="Buscar por número, nombre, población o provincia…" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200">
            {catalogoRegistrosPropiedad.filter((item) => {
              const q = normalizarTexto(busquedaRegistroCatalogo);
              return !q || [item.registro_propiedad, item.nombre_registrador, item.poblacion, item.provincia, item.direccion].some((v) => normalizarTexto(v).includes(q));
            }).slice(0, 100).map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-indigo-50/60">
                <button type="button" onClick={() => { setFincaForm((actual) => ({ ...actual, registro: item.registro_propiedad || "", registro_propiedad_id: String(item.id), poblacion: item.poblacion || actual.poblacion, provincia: item.provincia || actual.provincia })); setModalSelectorRegistro(false); }} className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-bold text-slate-800">{item.registro_propiedad}</span>
                  <span className="block text-xs text-slate-500">{[item.poblacion ? `Población: ${item.poblacion}` : null, item.provincia ? `Provincia: ${item.provincia}` : null, item.nombre_registrador ? `Registrador: ${item.nombre_registrador}` : null].filter(Boolean).join(" · ")}</span>
                </button>
                <button type="button" onClick={() => { setRegistroDetalleAbierto(item); setModalSelectorRegistro(false); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Ver datos</button>
              </div>
            ))}
            {catalogoRegistrosPropiedad.length === 0 && <p className="p-4 text-sm text-slate-500">No se han podido cargar registros del catálogo.</p>}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(registroDetalleAbierto)}
        onClose={() => setRegistroDetalleAbierto(null)}
        titulo="Datos del Registro de la Propiedad"
        subtitulo={registroDetalleAbierto?.registro_propiedad || "Datos del catálogo"}
        ancho="max-w-3xl"
        footer={<Boton onClick={() => setRegistroDetalleAbierto(null)}>Cerrar</Boton>}
      >
        {registroDetalleAbierto && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Registro (número - Nombre)", registroDetalleAbierto.registro_propiedad],
            ["Nombre del registrador", registroDetalleAbierto.nombre_registrador],
            ["Dirección", registroDetalleAbierto.direccion],
            ["Código postal", registroDetalleAbierto.codigo_postal],
            ["Población", registroDetalleAbierto.poblacion],
            ["Provincia", registroDetalleAbierto.provincia],
            ["Teléfono", registroDetalleAbierto.telefono],
            ["Teléfono 2", registroDetalleAbierto.telefono_2],
            ["Fax", registroDetalleAbierto.fax],
            ["WhatsApp", registroDetalleAbierto.whatsapp],
            ["Email 1", registroDetalleAbierto.email_1],
            ["Email 2", registroDetalleAbierto.email_2],
            ["IBAN", registroDetalleAbierto.iban],
            ["Oficina liquidadora", registroDetalleAbierto.tiene_of_liq ? "Sí" : "No"],
            ["Comentarios", registroDetalleAbierto.comentarios],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-medium text-slate-800">{value || "—"}</div></div>)}
        </div>}
      </Modal>

      <Modal
        open={oficinaDetalleAbierta}
        onClose={() => setOficinaDetalleAbierta(false)}
        titulo="Datos de la oficina"
        subtitulo={expediente?.oficina || "Catálogo de oficinas"}
        ancho="max-w-3xl"
        footer={<Boton onClick={() => setOficinaDetalleAbierta(false)}>Cerrar</Boton>}
      >
        {cargandoOficinaDetalle ? <p className="text-sm text-slate-500">Consultando el catálogo de oficinas…</p> : oficinaCatalogoDetalle ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Oficina", oficinaCatalogoDetalle.oficina],
            ["Nombre", oficinaCatalogoDetalle.nombre],
            ["Dirección", oficinaCatalogoDetalle.direccion],
            ["Población", oficinaCatalogoDetalle.poblacion],
            ["Código postal", oficinaCatalogoDetalle.cod_postal],
            ["Código provincia", oficinaCatalogoDetalle.cod_provincia],
            ["Provincia", oficinaCatalogoDetalle.provincia],
            ["Código DT", oficinaCatalogoDetalle.cod_dt],
            ["DT", oficinaCatalogoDetalle.dt],
            ["Código DG", oficinaCatalogoDetalle.cod_dg],
            ["DG", oficinaCatalogoDetalle.dg],
            ["Código DAN", oficinaCatalogoDetalle.cod_dan],
            ["DAN", oficinaCatalogoDetalle.dan],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-medium text-slate-800">{value || "—"}</div></div>)}
        </div> : <p className="text-sm text-amber-700">No se ha encontrado una coincidencia para esta oficina en el catálogo. El dato original del expediente se conserva: {expediente?.oficina || "—"}.</p>}
      </Modal>

      {/* =====================================================
          MODAL SOLICITUD DE FUSIÓN
      ====================================================== */}
      <Modal
        open={mostrarFusion}
        onClose={() => { if (!guardandoFusion) setMostrarFusion(false); }}
        titulo="⇄ Solicitud de fusión"
        subtitulo={`Expediente ${expediente?.id_expediente || id} · Registro ${fincaFusion?.registro || "—"}`}
        ancho={["liquidacion-impuestos", "tramitacion-inscripcion"].includes(actividadSeleccionada) ? "max-w-7xl" : "max-w-4xl"}
        footer={
          <>
            <Boton onClick={() => setMostrarFusion(false)} disabled={guardandoFusion}>Cancelar</Boton>
            <Boton tipo="primary" onClick={guardarSolicitudFusion} disabled={guardandoFusion || !fincaFusion?.registro}>
              {guardandoFusion ? "Enviando…" : "Enviar a Fusiones"}
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          {errorFusion && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorFusion}</div>}
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Datos vinculados automáticamente</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
              <div><span className="block text-[11px] text-slate-500">Expediente *</span><strong>{expediente?.id_expediente || id || "—"}</strong></div>
              <div><span className="block text-[11px] text-slate-500">Registro *</span><strong>{fincaFusion?.registro || "—"}</strong></div>
              <div><span className="block text-[11px] text-slate-500">Finca</span><strong>{fincaFusion?.finca || "—"}</strong></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFormulario label="Número entrada" value={fusionForm.numero_entrada} onChange={v => setFusionForm(a => ({...a, numero_entrada:v}))} placeholder="Número /" />
            <CampoFormulario label="Serie y número factura" value={fusionForm.serie_numero_factura} onChange={v => setFusionForm(a => ({...a, serie_numero_factura:v}))} />
            <CampoFormulario label="Fecha factura" tipo="date" value={fusionForm.fecha_factura} onChange={v => setFusionForm(a => ({...a, fecha_factura:v}))} />
            <CampoFormulario label="NIF registrador" value={fusionForm.nif_registrador} onChange={v => setFusionForm(a => ({...a, nif_registrador:v}))} />
            <CampoFormulario label="Importe" tipo="number" value={fusionForm.importe} onChange={v => setFusionForm(a => ({...a, importe:v}))} />
            <CampoFormulario label="Entidad origen" value={fusionForm.entidad_origen} onChange={v => setFusionForm(a => ({...a, entidad_origen:v}))} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600">Cambio denominación *</p>
              <div className="flex gap-4">
                {["NO","SI"].map(v => <label key={v} className="flex items-center gap-2 text-sm"><input type="radio" name="fusion-cambio-denominacion" checked={fusionForm.cambio_denominacion===v} onChange={() => setFusionForm(a => ({...a,cambio_denominacion:v}))}/>{v}</label>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600">Recurrible *</p>
              <div className="flex gap-4">
                {["SI","NO"].map(v => <label key={v} className="flex items-center gap-2 text-sm"><input type="radio" name="fusion-recurrible" checked={fusionForm.recurrible===v} onChange={() => setFusionForm(a => ({...a,recurrible:v}))}/>{v}</label>)}
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-slate-600">Indicar tipo factura *</p>
            <div className="space-y-2">
              {["Factura (con número y fecha)","Pre-Factura (falta número)"].map(v => <label key={v} className="flex items-center gap-2 text-sm"><input type="radio" name="fusion-tipo-factura" checked={fusionForm.tipo_factura===v} onChange={() => setFusionForm(a => ({...a,tipo_factura:v}))}/>{v}</label>)}
            </div>
          </div>
          <CampoFormulario label="Comentarios / Observaciones" value={fusionForm.comentarios_observaciones} textarea onChange={v => setFusionForm(a => ({...a,comentarios_observaciones:v}))} placeholder="Comentarios para el equipo de Fusiones" />
          <p className="text-[11px] text-slate-500">La solicitud se guardará vinculada a este expediente y a la finca/registro seleccionado. En Factura (con número y fecha), ambos datos son obligatorios.</p>
        </div>
      </Modal>

      {/* =====================================================
    MODAL ACCIONES
====================================================== */}

<Modal
  open={mostrarAcciones}
  onClose={() => setMostrarAcciones(false)}
  titulo="⚡ Acciones del expediente"
  subtitulo="Asignar una acción del catálogo al expediente"
  ancho="max-w-3xl"
  footer={
    <>
      <Boton
        onClick={() => setMostrarAcciones(false)}
      >
        Cancelar
      </Boton>

      <Boton
        tipo="primary"
        onClick={guardarAccion}
      >
        Asignar acción
      </Boton>
    </>
  }
>
  <div className="space-y-5">

    {errorAcciones && (
      <div className="erp-danger rounded-xl border px-4 py-3 text-sm">
        {errorAcciones}
      </div>
    )}

    <CampoSelect
      label="Acción"
      value={accionForm.accion_id}
      onChange={(valor) =>
        setAccionForm((actual) => ({
          ...actual,
          accion_id: valor,
        }))
      }
      opciones={accionesCatalogo.map((accion) => ({
        value: String(accion.id),
        // En la ficha se muestra únicamente la descripción.
        // El ID real se conserva para guardar la asignación.
        label: accion.descripcion,
      }))}
    />

    {cargandoAcciones && (
      <div className="erp-text-soft text-xs">
        Cargando acciones...
      </div>
    )}


    <CampoFormulario
      label="Fecha"
      value={accionForm.fecha}
      tipo="date"
      onChange={(valor) =>
        setAccionForm((actual) => ({
          ...actual,
          fecha: valor,
        }))
      }
    />

    <div className="border-t border-slate-200 pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800">Histórico de acciones</h4>
          <p className="text-[11px] text-slate-500">Todas las acciones registradas en este expediente, ordenadas por fecha.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{accionesExpediente.length} {accionesExpediente.length === 1 ? "acción" : "acciones"}</span>
      </div>
      {cargandoAcciones ? (
        <p className="py-3 text-xs text-slate-500">Cargando histórico…</p>
      ) : accionesExpediente.length ? (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {[...accionesExpediente].reverse().map((relacion, indice) => {
            const accion = relacion.accion || relacion.accion_expediente || relacion;
            return (
              <div key={relacion.id || `${relacion.accion_id || "accion"}-${indice}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs font-bold text-slate-800">{accion.descripcion || relacion.descripcion || "Acción"}</p>
                  {(relacion.id || relacion.id_accion_expediente || relacion.relacion_id) && (
                    <button
                      type="button"
                      disabled={cargandoAcciones}
                      onClick={() => {
                        const relacionId = relacion.id || relacion.id_accion_expediente || relacion.relacion_id;
                        if (window.confirm(`¿Quieres eliminar la acción «${accion.descripcion || relacion.descripcion || "Acción"}» de este expediente?`)) {
                          retirarAccion(relacionId);
                        }
                      }}
                      className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                {(accion.actividad || accion.departamento || accion.seccion) && <p className="mt-1 text-[10px] text-slate-500">{[accion.departamento, accion.seccion, accion.actividad].filter(Boolean).join(" · ")}</p>}
                <div className="mt-1 text-[10px] text-slate-500">{relacion.fecha ? formatearFecha(relacion.fecha) : "Sin fecha registrada"}{relacion.usuario_creador ? ` · Realizada por: ${relacion.usuario_creador}` : ""}</div>
                {relacion.observaciones && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{relacion.observaciones}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">Este expediente todavía no tiene acciones registradas.</p>
      )}
    </div>

  </div>
</Modal>

      {/* =====================================================
          MODAL EXPEDIENTES RELACIONADOS
      ====================================================== */}

      <Modal
        open={
          mostrarAgregarExpedientes
        }
        onClose={() =>
          setMostrarAgregarExpedientes(false)
        }
        titulo="➕ Expedientes relacionados"
        subtitulo={
          `Agrupación por NIF · ${valorVisible(
            expediente.nif_titular
          )}`
        }
        ancho="max-w-5xl"
        footer={
          <Boton
            onClick={() =>
              setMostrarAgregarExpedientes(false)
            }
          >
            Cerrar
          </Boton>
        }
      >

        <div className="space-y-5">

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-sm font-bold text-slate-800">
              Agregar expediente manualmente
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Introduce el número de expediente que quieres relacionar.
              Se guardará en este navegador para este expediente.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={expedienteRelacionadoManual}
                onChange={(event) =>
                  setExpedienteRelacionadoManual(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    guardarExpedienteRelacionado();
                  }
                }}
                placeholder="Nº de expediente"
                className="
                  min-w-0 flex-1 rounded-xl border border-slate-200
                  bg-white px-4 py-2.5 text-sm text-slate-700
                  outline-none transition focus:border-blue-400
                  focus:ring-2 focus:ring-blue-100
                "
              />

              <Boton
                tipo="primary"
                onClick={guardarExpedienteRelacionado}
                disabled={
                  cargandoRelacionados ||
                  !expedienteRelacionadoManual.trim()
                }
              >
                ＋ Agregar
              </Boton>
            </div>

            {errorRelacionManual && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {errorRelacionManual}
              </div>
            )}
          </div>

          {cargandoRelacionados ? (
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                p-8
                text-center
                text-sm
                text-slate-400
              "
            >
              Buscando expedientes del mismo NIF…
            </div>
          ) : expedientesRelacionados.length === 0 ? (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-slate-50
                p-8
                text-center
              "
            >
              <p className="text-sm font-semibold text-slate-500">
                No hay otros expedientes relacionados.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Los encontrados por NIF aparecerán aquí y también puedes
                añadirlos manualmente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              <div
                className="
                  rounded-xl
                  border
                  border-blue-100
                  bg-blue-50
                  px-4
                  py-3
                "
              >
                <p className="text-xs font-bold text-blue-700">
                  {expedientesRelacionados.length} expediente(s) relacionado(s)
                </p>

                <p className="mt-1 text-[11px] text-blue-600">
                  Automáticos por NIF y añadidos manualmente.
                </p>
              </div>

              <div
                className="
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                "
              >
                <div
                  className="
                    grid
                    grid-cols-[1.2fr_1fr_1.3fr_1fr_auto]
                    gap-3
                    border-b
                    border-slate-200
                    bg-slate-50
                    px-4
                    py-3
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-slate-400
                  "
                >
                  <span>Expediente</span>
                  <span>Fecha alta</span>
                  <span>Actividad</span>
                  <span>Origen</span>
                  <span />
                </div>

                {expedientesRelacionados.map(
                  (relacionado) => (
                    <div
                      key={String(
                        relacionado.id_expediente
                      )}
                      className="
                        grid
                        grid-cols-[1.2fr_1fr_1.3fr_1fr_auto]
                        items-center
                        gap-3
                        border-b
                        border-slate-100
                        px-4
                        py-3
                        last:border-b-0
                      "
                    >
                      <span className="text-xs font-bold text-blue-700">
                        {valorVisible(
                          relacionado.id_expediente
                        )}
                      </span>

                      <span className="text-xs text-slate-600">
                        {formatearFecha(
                          relacionado.fecha_alta
                        )}
                      </span>

                      <span className="text-xs text-slate-600">
                        {valorVisible(
                          relacionado.actividad_actual
                        )}
                      </span>

                      <span
                        className={`
                          inline-flex
                          w-fit
                          rounded-full
                          px-2.5
                          py-1
                          text-[10px]
                          font-bold
                          ${
                            relacionado._manual
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }
                        `}
                      >
                        {
                          relacionado._manual
                            ? "Manual"
                            : "Por NIF"
                        }
                      </span>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/expedientes/${encodeURIComponent(
                            relacionado.id_expediente
                          )}`}
                          className="
                            inline-flex
                            rounded-lg
                            border
                            border-blue-200
                            bg-blue-50
                            px-3
                            py-2
                            text-[10px]
                            font-bold
                            text-blue-700
                            hover:bg-blue-100
                          "
                          onClick={() =>
                            setMostrarAgregarExpedientes(false)
                          }
                        >
                          Ver
                        </Link>

                        {relacionado._manual && (
                          <button
                            type="button"
                            onClick={() =>
                              eliminarExpedienteRelacionado(
                                relacionado.id_expediente
                              )
                            }
                            className="
                              inline-flex
                              rounded-lg
                              border
                              border-red-200
                              bg-red-50
                              px-3
                              py-2
                              text-[10px]
                              font-bold
                              text-red-700
                              hover:bg-red-100
                            "
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        </div>

      </Modal>


      {/* =====================================================
          MODAL OBSERVACIONES
      ====================================================== */}

      <Modal
        open={
          mostrarObservaciones
        }
        onClose={() =>
          setMostrarObservaciones(false)
        }
        titulo="Observaciones"
        subtitulo="Comentario y destino dentro del expediente"
        ancho="max-w-3xl"
        footer={
          <>
            <Boton
              onClick={() =>
                setMostrarObservaciones(false)
              }
            >
              Cancelar
            </Boton>

            <Boton
              tipo="primary"
              onClick={guardarObservacion}
              disabled={
                guardandoObservacion ||
                (visionesComentario.actividad && !destinatarioObservacion)
              }
            >
              {guardandoObservacion ? "Guardando…" : "Guardar comentario"}
            </Boton>
          </>
        }
      >

        <div className="space-y-5">
          {errorObservaciones && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorObservaciones}
            </p>
          )}

          <CampoFormulario
            label="Comentario"
            value={
              comentario
            }
            textarea
            onChange={
              setComentario
            }
            placeholder="Escribe aquí la observación..."
          />


          <div>

            <p
              className="
                mb-3
                text-xs
                font-bold
                text-slate-700
              "
            >
              Dirigir comentario a
            </p>

            <div
              className="
                grid
                grid-cols-1
                gap-3
                md:grid-cols-2
                xl:grid-cols-4
              "
            >

              <CheckboxVision
                label="Visión notario"
                checked={
                  visionesComentario.notario
                }
                onChange={(checked) =>
                  setVisionesComentario(
                    (actual) => ({
                      ...actual,
                      notario:
                        checked,
                    })
                  )
                }
              />

              <CheckboxVision
                label="Visión apoderado"
                checked={
                  visionesComentario.apoderado
                }
                onChange={(checked) =>
                  setVisionesComentario(
                    (actual) => ({
                      ...actual,
                      apoderado:
                        checked,
                    })
                  )
                }
              />

              <CheckboxVision
                label="Visión actividad"
                checked={
                  visionesComentario.actividad
                }
                onChange={(checked) =>
                  setVisionesComentario(
                    (actual) => ({
                      ...actual,
                      actividad:
                        checked,
                    })
                  )
                }
              />

              <div className="space-y-1">
                <CheckboxVision
                  label="Visión ABSIS"
                  checked={false}
                  disabled
                  onChange={() => {}}
                />
                <p className="px-1 text-[11px] font-semibold text-amber-700">
                  Pendiente de API. Esta opción todavía no envía comentarios a ABSIS.
                </p>
              </div>

            </div>

            {visionesComentario.actividad && (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">
                  Empleado destinatario del comentario interno
                </span>
                <select
                  value={destinatarioObservacion}
                  onChange={(event) => setDestinatarioObservacion(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecciona un empleado</option>
                  {empleadosObservaciones.map((empleado) => (
                    <option key={empleado.id} value={empleado.id}>
                      {empleado.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-slate-800">Historial completo</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{observacionesExpediente.length} observaciones</span>
            </div>
            {cargandoObservaciones ? <p className="text-xs text-slate-500">Actualizando historial…</p> : observacionesExpediente.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-500">No hay observaciones guardadas todavía.</p>
            ) : (
              <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {observacionesExpediente.map((observacion) => (
                  <article key={observacion.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{observacion.comentario}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>{observacion.autor || "Usuario conectado"} → {observacion.visibilidad === "Gestor" ? (observacion.empleado_destinatario || "Empleado interno") : observacion.visibilidad}</span>
                      <time>{observacion.fecha ? new Date(observacion.fecha).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Fecha no disponible"}</time>
                    </div>
                    {observacion.visibilidad === "Gestor" && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${observacion.estado_validacion === "Validada" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                          {observacion.estado_validacion === "Validada" ? `✓ Validada por ${observacion.validado_por || "empleado destinatario"} · ${observacion.validado_en ? new Date(observacion.validado_en).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : ""}` : "⏳ Pendiente de validación"}
                        </span>
                        {Number(empleadoSesion?.id) === Number(observacion.empleado_destinatario_id) && observacion.estado_validacion !== "Validada" && (
                          <button type="button" onClick={() => validarObservacionInterna(observacion)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100">✓ Validar observación</button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

        </div>

      </Modal>


      {/* =====================================================
          MODAL ENVIAR A NOTARIO
      ====================================================== */}

      <Modal
        open={mostrarModalFacturaHonorarios}
        onClose={() => !guardandoFacturaHonorarios && setMostrarModalFacturaHonorarios(false)}
        titulo="Factura de honorarios gestoría"
        subtitulo={`Expediente ${expediente?.id_expediente || ""} · Revisa los datos antes de registrar`}
        ancho="max-w-5xl"
        footer={
          <div className="flex w-full flex-wrap justify-between gap-2">
            <Boton onClick={() => setMostrarModalFacturaHonorarios(false)} disabled={guardandoFacturaHonorarios}>Cancelar</Boton>
            <div className="flex flex-wrap gap-2">
              {previsualizandoFacturaHonorarios && <Boton onClick={() => setPrevisualizandoFacturaHonorarios(false)} disabled={guardandoFacturaHonorarios}>← Editar datos</Boton>}
              {!previsualizandoFacturaHonorarios ? (
                <Boton tipo="primary" onClick={() => setPrevisualizandoFacturaHonorarios(true)}><MolsanIcon name="eye" size={18} /> Previsualizar factura</Boton>
              ) : (
                <Boton tipo="primary" onClick={confirmarFacturaHonorarios} disabled={guardandoFacturaHonorarios}>
                  {guardandoFacturaHonorarios ? "Guardando…" : "Guardar y facturar"}
                </Boton>
              )}
            </div>
          </div>
        }
      >
        <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
          {errorHonorariosGestoria && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorHonorariosGestoria}</p>}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Provisión de fondos</p>
              <p className="mt-1 text-lg font-extrabold text-slate-800">{formatEuro(Number(String(facturaHonorariosForm.provisionFondos || "0").replace(",", "." ) || 0))}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Saldo disponible (dato del expediente)</p>
              <p className="mt-1 text-lg font-extrabold text-slate-800">{formatEuro(Number(String(facturaHonorariosForm.saldoDisponible || "0").replace(",", "." ) || 0))}</p>
            </div>
            <div className={`rounded-xl border p-3 ${empleadoEnFactura ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label htmlFor="empleado-factura-honorarios" className="text-xs font-extrabold text-slate-800">Empleado</label>
                <select
                  id="empleado-factura-honorarios"
                  value={empleadoEnFactura ? "si" : "no"}
                  disabled={generandoHonorariosGestoria || guardandoFacturaHonorarios}
                  onChange={(event) => {
                    const esEmpleado = event.target.value === "si";
                    setEmpleadoEnFactura(esEmpleado);
                    const original = Math.max(0, Number(baseHonorariosOriginal) || 0);
                    const descuento = esEmpleado ? Math.round((original * 0.5 + Number.EPSILON) * 100) / 100 : 0;
                    const base = Math.round((original - descuento + Number.EPSILON) * 100) / 100;
                    setFacturaHonorariosForm((actual) => actualizarImportesFacturaHonorarios({
                      ...actual,
                      baseImponible: base.toFixed(2),
                      observaciones: esEmpleado ? `Cliente empleado: descuento del 50 % (${formatEuro(descuento)}) sobre honorarios.` : "",
                    }));
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500"
                >
                  <option value="no">No</option>
                  <option value="si">Sí — descuento del 50 %</option>
                </select>
              </div>
              {empleadoEnFactura && <p className="mt-1 text-xs font-semibold text-amber-800">Descuento del 50 % aplicado.</p>}
            </div>
          </div>

          {previsualizandoFacturaHonorarios ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">MOLSAN ERP · Facturación</p><h3 className="mt-2 text-2xl font-extrabold text-slate-800">FACTURA DE HONORARIOS GESTORIA</h3><p className="mt-1 text-sm text-slate-500">Expediente {expediente?.id_expediente}</p></div>
                <div className="text-right"><p className="text-sm font-bold text-slate-700">{facturaHonorariosForm.numeroFactura || "Número pendiente de asignación"}</p><p className="text-sm text-slate-500">Fecha: {facturaHonorariosForm.fechaFactura || "—"}</p></div>
              </div>
              <div className="grid gap-4 py-5 md:grid-cols-2">
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Datos de facturación</p><p className="mt-1 font-bold text-slate-800">{facturaHonorariosForm.cliente || "Cliente pendiente de completar"}</p><p className="text-sm text-slate-600">NIF: {facturaHonorariosForm.nifCliente || "—"}</p><p className="text-sm text-slate-600">{[facturaHonorariosForm.direccion, facturaHonorariosForm.codigoPostal, facturaHonorariosForm.poblacion, facturaHonorariosForm.provincia].filter(Boolean).join(", ") || "Dirección pendiente de completar"}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Concepto</p><p className="mt-1 font-semibold text-slate-800">{facturaHonorariosForm.tarifa || facturaHonorariosForm.concepto}</p></div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="grid grid-cols-[1fr_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600"><span>Concepto</span><span>Importe</span></div>
                <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-100 px-4 py-3 text-sm"><span>Base imponible</span><span>{formatEuro(Number(facturaHonorariosForm.baseImponible || 0))}</span></div>
                {empleadoEnFactura && <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-900"><span>Descuento empleado (50 %)</span><span className="font-semibold">− {formatEuro(Math.round((Math.max(0, Number(baseHonorariosOriginal) || 0) * 0.5 + Number.EPSILON) * 100) / 100)}</span></div>}
                <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-100 px-4 py-3 text-sm"><span>{facturaHonorariosForm.tipoImpuesto} ({formatPercent(Number(facturaHonorariosForm.porcentajeImpuesto || 0))})</span><span>{formatEuro(Number(facturaHonorariosForm.importeImpuesto || 0))}</span></div>
                <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-slate-200 bg-emerald-50 px-4 py-4 font-extrabold text-emerald-900"><span>TOTAL FACTURA</span><span>{formatEuro(Number(facturaHonorariosForm.totalFactura || 0))}</span></div>
              </div>
              {facturaHonorariosForm.observaciones && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">{facturaHonorariosForm.observaciones}</p>}
              <p className="mt-4 text-xs text-amber-700">Vista previa de revisión. Al pulsar «Guardar y facturar», el ERP generará y descargará la factura en PDF con número {expediente?.id_expediente || "—"} - {facturaHonorariosForm.numeroFactura || "pendiente de asignación"}, usando la plantilla oficial asociada al concepto de honorarios de gestoría.</p>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-extrabold text-slate-800">Datos de facturación</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">Cliente / titular<input value={facturaHonorariosForm.cliente} onChange={e => setFacturaHonorariosForm(f => ({...f,cliente:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-semibold text-slate-600">NIF / CIF<input value={facturaHonorariosForm.nifCliente} onChange={e => setFacturaHonorariosForm(f => ({...f,nifCliente:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-semibold text-slate-600">Dirección<input value={facturaHonorariosForm.direccion} onChange={e => setFacturaHonorariosForm(f => ({...f,direccion:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-semibold text-slate-600">Código postal<input value={facturaHonorariosForm.codigoPostal} onChange={e => setFacturaHonorariosForm(f => ({...f,codigoPostal:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-semibold text-slate-600">Población<input value={facturaHonorariosForm.poblacion} onChange={e => setFacturaHonorariosForm(f => ({...f,poblacion:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-semibold text-slate-600">Provincia<input value={facturaHonorariosForm.provincia} onChange={e => setFacturaHonorariosForm(f => ({...f,provincia:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-extrabold text-slate-800">Datos de factura</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">Número de factura (automático)<input value={facturaHonorariosForm.numeroFactura} readOnly placeholder="Se asignará al generar la factura" className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /><span className="mt-1 block text-[11px] font-normal text-slate-400">Serie correlativa VI por año; el número definitivo lo asigna el servidor.</span></label>
                  <label className="text-xs font-semibold text-slate-600">Fecha de factura<input type="date" value={facturaHonorariosForm.fechaFactura} onChange={e => setFacturaHonorariosForm(f => ({...f,fechaFactura:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-semibold text-slate-600 md:col-span-2">Concepto
                    <select value={facturaHonorariosForm.concepto} onChange={e => setFacturaHonorariosForm(f => ({...f,concepto:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      {conceptosFacturaHonorarios.length === 0 && <option value="Honorarios de gestoría">Honorarios de gestoría</option>}
                      {conceptosFacturaHonorarios.map((concepto) => <option key={concepto.id} value={concepto.nombre}>{concepto.nombre}</option>)}
                    </select>
                    <span className="mt-1 block text-[11px] font-normal text-slate-400">Opciones del catálogo Tipos de Concepto de Gastos.</span>
                  </label>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-extrabold text-slate-800">Tarifa de honorarios</h3>
                <p className="mb-3 text-xs text-slate-500">Tarifa del catálogo: <strong>{facturaHonorariosForm.tarifa}</strong> · Entidad detectada: {facturaHonorariosForm.entidad || "No identificada"} · <a href="/herramientas/honorarios-gestoria" target="_blank" rel="noreferrer" className="font-bold text-blue-700 underline">Revisa aquí tarifa honorarios</a></p>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-600">Base imponible (€)<input type="number" min="0" step="0.01" value={facturaHonorariosForm.baseImponible} onChange={e => setFacturaHonorariosForm(f => actualizarImportesFacturaHonorarios(f,{baseImponible:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                  <label className="text-xs font-semibold text-slate-600">IVA (€)<input type="number" value={facturaHonorariosForm.importeImpuesto} readOnly className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><span className="block text-xs font-semibold text-emerald-700">Total honorarios (€)</span><strong className="mt-1 block text-sm text-emerald-800">{formatEuro(Number(facturaHonorariosForm.totalFactura || 0))}</strong></div>
                </div>
                <label className="mt-3 block text-xs font-semibold text-slate-600">Observaciones<textarea value={facturaHonorariosForm.observaciones} onChange={e => setFacturaHonorariosForm(f => ({...f,observaciones:e.target.value}))} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
              </section>
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-2 text-sm font-extrabold text-slate-800">Checklist de control</h3>
                <p className="mb-3 text-xs text-slate-500">Revisión visual de documentos y actividades vinculados al expediente. Los documentos no se marcan como completados automáticamente.</p>
                {(() => {
                  const docs = Array.isArray(documentosCierre) ? documentosCierre : [];
                  const norm = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                  const textoDoc = (doc) => norm([doc?.categoria, doc?.categoria_nombre, doc?.nombre_categoria, doc?.tipo_documento, doc?.actividad, doc?.actividad_nombre, doc?.fase, doc?.nombre, doc?.nombre_archivo, doc?.nombre_original, doc?.filename, doc?.titulo].filter(Boolean).join(" "));
                  const hay = (...terminos) => docs.some((doc) => terminos.some((termino) => textoDoc(doc).includes(norm(termino))));
                  const dato = (...keys) => keys.some((key) => String(expediente?.[key] ?? actividadDraft?.[key] ?? "").trim() !== "");
                  const items = [
                    { nombre: "Documentación previa", ok: hay("documentación previa", "hoja encargo", "nota simple", "justificante cancelación", "documentos absis") },
                    { nombre: "Firma / protocolo", ok: dato("fecha_firma", "numero_protocolo", "protocolo", "fecha_protocolo") || hay("copia simple", "hoja presentación", "protocolo") },
                    { nombre: "Liquidación de impuestos", ok: dato("fecha_liquidacion_tributaria", "fecha_liquidacion", "justificante_impuestos") || hay("liquidación impuestos", "ajd", "itp", "impuestos") },
                    { nombre: "Tramitación de inscripción", ok: dato("fecha_inscripcion", "fecha_presentacion_registro", "fecha_fin_tramitacion") || hay("hoja inscripción", "inscripción registro") },
                    { nombre: "Defectos registrales", ok: dato("fecha_calificacion", "fecha_subsanacion", "fecha_fin_defectos") || hay("defecto registral", "subsanación defecto") },
                    { nombre: "Documentos de facturación y cierre", ok: hay("factura gestoría", "factura notarial", "expediente digital completo", "cierre expediente") },
                  ];
                  const completos = items.every((item) => item.ok);
                  return <>
                    <div className={`mb-3 rounded-lg border px-3 py-2 text-xs font-bold ${completos ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                      {completos ? "✓ Checklist completo según datos/documentos encontrados" : `${items.filter((item) => item.ok).length} de ${items.length} comprobaciones completas`}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {items.map((item) => <div key={item.nombre} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${item.ok ? "border-emerald-100 bg-emerald-50/60 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><span className="font-extrabold">{item.ok ? "✓" : "□"}</span><span>{item.nombre}</span></div>)}
                    </div>
                  </>;
                })()}
                {errorDocumentosCierre && <p className="mt-2 text-xs text-red-700">No se ha podido verificar la carpeta digital completa; revisa antes de facturar.</p>}
                <button type="button" onClick={cargarDocumentosCierre} disabled={cargandoDocumentosCierre} className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{cargandoDocumentosCierre ? "Comprobando…" : "↻ Actualizar checklist"}</button>
              </section>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={mostrarModalDatosActividad}
        onClose={() => setMostrarModalDatosActividad(false)}
        titulo={`☷ Datos de actividad · ${ACTIVIDADES_EXPEDIENTES.find((item) => item.key === actividadSeleccionada)?.label || "Actividad"}`}
        subtitulo={`Expediente ${expediente?.id_expediente || ""}. Solo se muestran los campos propios de esta actividad.`}
        ancho="max-w-4xl"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {errorActividad && <p className="text-xs font-semibold text-red-700">{errorActividad}</p>}
              {mensajeActividad && <p className="text-xs font-semibold text-emerald-700">{mensajeActividad}</p>}
            </div>
            <div className="flex gap-2">
              <Boton onClick={() => { setMostrarModalDatosActividad(false); setPestanaActividad("documentos"); }}>Cerrar</Boton>
              <Boton tipo="primary" onClick={guardarCamposActividad} disabled={guardandoActividad}>
                {guardandoActividad ? "Guardando…" : "Guardar datos"}
              </Boton>
            </div>
          </div>
        }
      >
        {!["liquidacion-impuestos", "tramitacion-inscripcion"].includes(actividadSeleccionada) && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { key: "fecha_inicio_actividad", label: "Inicio actividad" },
            { key: "fecha_fin_actividad", label: "Fin actividad" },
          ].map((campo) => {
            const valor = actividadDraft?.[campo.key] ?? expediente?.[campo.key] ?? "";
            return (
              <label key={campo.key} className="min-w-0 text-xs font-bold text-slate-600">
                <span className="mb-1.5 block">{campo.label}</span>
                <input type="date" value={valor ?? ""} onChange={(event) => setActividadDraft((actual) => ({ ...actual, [campo.key]: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800" />
              </label>
            );
          })}
        </div>
        )}
        {actividadSeleccionada !== "sede-notarial-protocolo" && !["liquidacion-impuestos", "tramitacion-inscripcion"].includes(actividadSeleccionada) && (
        <section className={`rounded-2xl p-3 sm:p-4 ${["gestion-economica", "defectos-registrales", "facturacion-cierre"].includes(actividadSeleccionada) ? "border border-indigo-100 bg-indigo-50/30" : "rounded-xl border border-slate-200 bg-white"}`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(CAMPOS_ACTIVIDADES[actividadSeleccionada] || []).filter((campo) => !["fecha_inicio_actividad", "fecha_fin_actividad"].includes(campo.key) && !(actividadSeleccionada === "defectos-registrales" && ["tiene_defectos_abiertos", "tipo_error", "falta_defecto", "descripcion_error", "fcierre_defecto", "tipo_documento", "motivos_defecto", "fecha_notificacion_registro", "fecha_vencimiento_presentacion_registro", "observaciones_defecto_registral"].includes(campo.key))).map((campo) => {
            const valor = actividadDraft?.[campo.key] ?? expediente?.[campo.key] ?? "";
            const cambiar = (nuevoValor) => setActividadDraft((actual) => ({ ...actual, [campo.key]: nuevoValor }));
            return (
              <label key={campo.key} className={`min-w-0 text-xs font-bold text-slate-600 ${campo.multilinea ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                <span className="mb-1.5 block">{campo.label}</span>
                {Array.isArray(campo.opciones) ? (
                  <select value={valor ?? ""} onChange={(event) => cambiar(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800">
                    <option value="">— Seleccionar —</option>
                    {campo.opciones.map((opcion) => <option key={String(opcion)} value={typeof opcion === "object" ? opcion.value : opcion}>{typeof opcion === "object" ? opcion.label : opcion}</option>)}
                  </select>
                ) : campo.multilinea ? (
                  <textarea value={valor ?? ""} onChange={(event) => cambiar(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800" />
                ) : (
                  <input type={campo.tipo === "fecha" ? "date" : campo.tipo === "numero" ? "number" : "text"} value={valor ?? ""} onChange={(event) => cambiar(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800" />
                )}
              </label>
            );
          })}
          {!(CAMPOS_ACTIVIDADES[actividadSeleccionada] || []).length && actividadSeleccionada !== "sede-notarial-protocolo" && actividadSeleccionada !== "sede-notarial" && actividadSeleccionada !== "gestion-economica" && (
            <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Esta actividad no tiene campos específicos configurados todavía.</p>
          )}
          </div>
        </section>
        )}
        {["liquidacion-impuestos", "tramitacion-inscripcion"].includes(actividadSeleccionada) && (
          <section className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <h3 className="mb-3 text-sm font-extrabold text-slate-800">Fechas de actividad</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { key: "fecha_inicio_actividad", label: "Inicio actividad" },
                { key: "fecha_fin_actividad", label: "Fin actividad" },
              ].map((campo) => {
                const valor = actividadDraft?.[campo.key] ?? expediente?.[campo.key] ?? "";
                return (
                  <label key={campo.key} className="block rounded-lg border border-slate-200 bg-white p-3">
                    <span className="block text-xs font-bold text-slate-600">{campo.label}</span>
                    <input
                      type="date"
                      value={String(valor ?? "").slice(0, 10)}
                      onChange={(event) => setActividadDraft((actual) => ({ ...actual, [campo.key]: event.target.value }))}
                      disabled={guardandoActividad || expedienteBloqueado}
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                    />
                  </label>
                );
              })}
            </div>
          </section>
        )}
        {(
          <section className="mt-5 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">{actividadSeleccionada === "sede-notarial-protocolo" ? "Sede notarial con protocolo · datos para integración" : `${ACTIVIDADES_EXPEDIENTES.find((item) => item.key === actividadSeleccionada)?.label || "Actividad"} · datos para integración`}</h3>
              <p className="mt-1 text-xs text-slate-600">Resumen de los campos propios de esta actividad para preparar la futura comunicación con ABSIS. El guardado sigue siendo local hasta que informática active la integración.</p>
            </div>
            {actividadSeleccionada === "documentacion-previa" ? (
              <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block rounded-lg border border-slate-200 bg-white p-3">
                  <span className="block text-xs font-bold text-slate-600">Certificado Saldo "0" erróneo SI/NO</span>
                  <select value={estadoDocumentacionAbsis.certificado_saldo_cero_erroneo ? "si" : "no"} onChange={(event) => setEstadoDocumentacionAbsis((actual) => ({ ...actual, certificado_saldo_cero_erroneo: event.target.value === "si" }))} disabled={guardandoActividad || cargandoEstadoAbsis || registrandoSolicitudIntegracion || expedienteBloqueado} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                    <option value="no">NO</option>
                    <option value="si">SÍ</option>
                  </select>
                </label>
              </div>
              <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800"><MolsanIcon name="folder" size={22} /> Repositorios digitales</h4>
                <RepositorioDocumentosInline
                  expedienteId={expediente?.id_expediente || expediente?.id || id}
                  categorias={["Hoja de Encargo firmada", "Justificante de cancelación", "Nota simple registral"]}
                  titulo="Repositorios digitales"
                  onAbrirRepositorio={() => setMostrarRepositoriosDocumentacionPrevia(true)}
                />
              </section>
              </>
            ) : actividadSeleccionada === "sede-notarial" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block rounded-lg border border-slate-200 bg-white p-3">
                  <span className="block text-xs font-bold text-slate-600">Notario</span>
                  <input type="text" value={Object.prototype.hasOwnProperty.call(actividadDraft, "nombre_notario") ? String(actividadDraft.nombre_notario ?? "") : String(expediente?.nombre_notario || "")} onChange={(event) => setActividadDraft((actual) => ({ ...actual, nombre_notario: event.target.value }))} disabled={guardandoActividad || expedienteBloqueado} placeholder="Nombre del notario" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                </label>
                <label className="block rounded-lg border border-slate-200 bg-white p-3">
                  <span className="block text-xs font-bold text-slate-600">NIF de notario</span>
                  <input type="text" value={Object.prototype.hasOwnProperty.call(actividadDraft, "nif_notario") ? String(actividadDraft.nif_notario ?? "") : String(expediente?.nif_notario || "")} onChange={(event) => setActividadDraft((actual) => ({ ...actual, nif_notario: event.target.value }))} disabled={guardandoActividad || expedienteBloqueado} placeholder="NIF del notario" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                </label>
              </div>
            ) : actividadSeleccionada === "sede-notarial-protocolo" ? (
              <div className="grid w-full min-w-0 grid-cols-1 items-start gap-3">
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-extrabold text-slate-800">Datos de la actividad</h4>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {CAMPOS_INTEGRACION_SEDE_PROTOCOLO.filter((campo) => ["nombre_notario", "nif_notario", "tipo_gestoria", "fecha_firma", "asiento_presentacion", "libro_diario", "fecha_presentacion", "numero_entrada", "fecha_recogida_notario_presentacion_telematica"].includes(campo.key)).map((campo) => {
                      const valor = Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)
                        ? (actividadDraft[campo.key] ?? "")
                        : campo.key === "tipo_gestoria"
                          ? (expediente?.tipo_gestoria || (Number(expediente?.apoderado_empleado_id) === 7 ? "CaixaBank" : "Gestoría"))
                          : (expediente?.[campo.key] ?? "");
                      const cambiar = (nuevoValor) => setActividadDraft((actual) => ({ ...actual, [campo.key]: nuevoValor }));
                      return (
                        <label key={campo.key} className="block min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                          <span className="block text-xs font-bold text-slate-600">{campo.label}</span>
                          {campo.key === "tipo_gestoria" ? (
                            <select value={String(valor)} onChange={(event) => cambiar(event.target.value)} disabled={guardandoActividad || expedienteBloqueado} className="mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                              <option value="Gestoría">Gestoría</option>
                              <option value="CaixaBank">CaixaBank</option>
                            </select>
                          ) : (
                            <input type={campo.tipo === "fecha" ? "date" : "text"} value={campo.tipo === "fecha" ? String(valor).slice(0, 10) : String(valor)} onChange={(event) => cambiar(event.target.value)} disabled={guardandoActividad || expedienteBloqueado} placeholder={campo.label} className="mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </section>
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-extrabold text-slate-800">Repositorios digitales</h4>
                  <RepositorioDocumentosInline
                    expedienteId={expediente?.id_expediente || expediente?.id || id}
                    categorias={["Copia simple", "Hoja de presentación"]}
                    onAbrirRepositorio={() => setMostrarRepositoriosDocumentacionPrevia(true)}
                  />
                  <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                    La extracción automática de estos datos desde la hoja de presentación PDF subida en NotarGest está pendiente de implementar; por ahora puedes introducirlos y guardarlos aquí.
                  </p>
                </section>
              </div>
            ) : actividadSeleccionada === "gestion-economica" ? (
              <div className="space-y-3">
                <section className="min-w-0 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800" aria-hidden="true">⇧</span>
                    <div>
                      <h4 className="text-sm font-extrabold text-sky-950">Información económica para enviar a ABSIS</h4>
                      <p className="mt-1 text-xs leading-relaxed text-sky-900">
                        <strong>Los pagos realizados del expediente son los que deben comunicarse a ABSIS.</strong> Cada línea debe incluir el ID de pago, la fecha de pago, el tipo de documento, la base imponible, el impuesto y el importe total. Los gastos pendientes de pago se conservan en el libro contable, pero no deben comunicarse como pagos realizados.
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-sky-800">
                        <strong>Estado de integración:</strong> este bloque define los datos que debe recoger el envío. La conexión automática con ABSIS sigue pendiente de activación; guardar o confirmar un pago en el ERP no acredita por sí solo que ABSIS lo haya recibido.
                      </p>
                    </div>
                  </div>
                </section>
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-2 text-sm font-extrabold text-slate-800">Campos de cada línea económica</h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    El libro de movimientos de la ficha del expediente es la referencia para preparar la información contable. El campo <strong>Tipo de documento</strong> debe conservarse en cada movimiento junto con su identificador y desglose fiscal.
                  </p>
                </section>
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-extrabold text-slate-800">Carpeta digital · Gestión económica</h4>
                  <RepositorioDocumentosInline
                    expedienteId={expediente?.id_expediente || expediente?.id || id}
                    categorias={["Factura notarial", "Factura registral", "Factura impuestos", "Honorarios gestoría", "Otros"]}
                    titulo="Documentación de las líneas de pago"
                  />
                </section>
              </div>
            ) : actividadSeleccionada === "facturacion-cierre" ? (
              <div className="grid min-w-0 grid-cols-1 items-start gap-3">
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800"><MolsanIcon name="clipboard" size={22} /> Datos · Cierre del expediente</h4>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { key: "fecha_fin_actividad", label: "Fecha de cierre" },
                  ].map((campo) => {
                    const valor = Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)
                      ? actividadDraft[campo.key]
                      : expediente?.[campo.key] ?? "";
                    return (
                      <label key={campo.key} className="block min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                        <span className="block text-xs font-bold text-slate-600">{campo.label}</span>
                        <input
                          type="date"
                          value={String(valor ?? "").slice(0, 10)}
                          onChange={(event) => setActividadDraft((actual) => ({ ...actual, [campo.key]: event.target.value }))}
                          disabled={guardandoActividad || expedienteBloqueado}
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                        />
                      </label>
                    );
                  })}
                </div>
                </section>
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-extrabold text-slate-800">Repositorios digitales</h4>
                <RepositorioDocumentosInline
                  expedienteId={expediente?.id || id}
                  categorias={["Expediente digital completo"]}
                  titulo="Repositorios digitales · Expediente digital completo"
                />
                </section>
              </div>
            ) : actividadSeleccionada === "liquidacion-impuestos" ? (
              <div className="grid min-w-0 grid-cols-1 items-start gap-3">
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800"><MolsanIcon name="clipboard" size={22} /> Datos · Liquidación de impuestos</h4>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(CAMPOS_ACTIVIDADES[actividadSeleccionada] || []).filter((campo) => !["fecha_inicio_actividad", "fecha_fin_actividad"].includes(campo.key)).map((campo) => {
                      const valor = actividadDraft?.[campo.key] ?? expediente?.[campo.key] ?? "";
                      const cambiar = (nuevoValor) => setActividadDraft((actual) => ({ ...actual, [campo.key]: nuevoValor }));
                      return (
                        <label key={campo.key} className="block min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                          <span className="block text-xs font-bold text-slate-600">{campo.label}</span>
                          {Array.isArray(campo.opciones) ? (
                            <select value={String(valor)} onChange={(event) => cambiar(event.target.value)} disabled={guardandoActividad || expedienteBloqueado} className="mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                              <option value="">— Seleccionar —</option>
                              {campo.opciones.map((opcion) => <option key={String(opcion)} value={typeof opcion === "object" ? opcion.value : opcion}>{typeof opcion === "object" ? opcion.label : opcion}</option>)}
                            </select>
                          ) : (
                            <input type={campo.tipo === "fecha" ? "date" : campo.tipo === "numero" ? "number" : "text"} step={campo.tipo === "numero" ? "0.01" : undefined} value={campo.tipo === "fecha" ? String(valor).slice(0, 10) : String(valor)} onChange={(event) => cambiar(event.target.value)} disabled={guardandoActividad || expedienteBloqueado} className="mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </section>
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-extrabold text-slate-800">Repositorios digitales</h4>
                  <RepositorioDocumentosInline
                    expedienteId={expediente?.id_expediente || expediente?.id || id}
                    categorias={["AJD/ITP"]}
                    titulo="Repositorios digitales · AJD/ITP"
                    onAbrirRepositorio={() => setMostrarRepositoriosDocumentacionPrevia(true)}
                  />
                </section>
              </div>
            ) : actividadSeleccionada === "tramitacion-inscripcion" ? (
              <div className="grid min-w-0 grid-cols-1 items-start gap-3">
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800"><MolsanIcon name="clipboard" size={22} /> Datos · Tramitación inscripción</h4>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(CAMPOS_ACTIVIDADES[actividadSeleccionada] || []).filter((campo) => !["fecha_inicio_actividad", "fecha_fin_actividad"].includes(campo.key)).map((campo) => {
                      const valor = actividadDraft?.[campo.key] ?? expediente?.[campo.key] ?? "";
                      const cambiar = (nuevoValor) => setActividadDraft((actual) => ({ ...actual, [campo.key]: nuevoValor }));
                      return (
                        <label key={campo.key} className="block min-w-0 rounded-lg border border-slate-200 bg-white p-3">
                          <span className="block text-xs font-bold text-slate-600">{campo.label}</span>
                          {Array.isArray(campo.opciones) ? (
                            <select value={String(valor)} onChange={(event) => cambiar(event.target.value)} disabled={guardandoActividad || expedienteBloqueado} className="mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                              <option value="">— Seleccionar —</option>
                              {campo.opciones.map((opcion) => <option key={String(opcion)} value={typeof opcion === "object" ? opcion.value : opcion}>{typeof opcion === "object" ? opcion.label : opcion}</option>)}
                            </select>
                          ) : (
                            <input type={campo.tipo === "fecha" ? "date" : campo.tipo === "numero" ? "number" : "text"} step={campo.tipo === "numero" ? "0.01" : undefined} value={campo.tipo === "fecha" ? String(valor).slice(0, 10) : String(valor)} onChange={(event) => cambiar(event.target.value)} disabled={guardandoActividad || expedienteBloqueado} className="mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </section>
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                  <h4 className="mb-3 text-sm font-extrabold text-slate-800">Repositorios digitales</h4>
                  <RepositorioDocumentosInline
                    expedienteId={expediente?.id_expediente || expediente?.id || id}
                    categorias={["Hoja de inscripción"]}
                    titulo="Repositorios digitales · Hoja de inscripción"
                    onAbrirRepositorio={() => setMostrarRepositoriosDocumentacionPrevia(true)}
                  />
                </section>
              </div>
            ) : actividadSeleccionada === "defectos-registrales" ? (
              <div className="space-y-3">
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-extrabold text-slate-800">Defectos registrales · datos para integración</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">Resumen de los campos propios de esta actividad para preparar la futura comunicación con ABSIS. El guardado sigue siendo local hasta que informática active la integración.</p>
                  </div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                  <p className="text-xs leading-relaxed text-indigo-900">Los datos del defecto se mantienen en un único registro. Usa el alta para crear o editar la información; esta actividad solo resume el estado guardado y no duplica campos editables.</p>
                  <Boton tipo="primary" disabled={expedienteBloqueado} onClick={abrirDefecto}>＋ Alta defecto</Boton>
                </div>
                {defectosRegistrados.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">Todavía no hay defectos registrados para este expediente.</p>
                ) : (
                  <div className="space-y-3">
                    {defectosRegistrados.map((defecto) => (
                      <article key={defecto.id ?? defecto.id_defecto} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800">{defecto.motivo_defecto || "Defecto registral"}</p>
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">{defecto.estado_envio_absis || "Pendiente ABSIS"}</span>
                        </div>
                        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                          <Dato campo="Fecha calificación" valor={defecto.fecha_calificacion} tipo="fecha" />
                          <Dato campo="Fecha renovación asiento" valor={defecto.fecha_renovacion_asiento} tipo="fecha" />
                          <Dato campo="Asiento renovación / libro diario" valor={defecto.asiento_renovacion_libro_diario} />
                          <Dato campo="Vencimiento asiento renovación" valor={defecto.vencimiento_asiento_renovacion} tipo="fecha" />
                          <Dato campo="Anotación suspensiva" valor={defecto.anotacion_suspensiva == null ? "—" : defecto.anotacion_suspensiva ? "Sí" : "No"} />
                          <Dato campo="Vencimiento anotación" valor={defecto.vencimiento_anotacion} tipo="fecha" />
                          <Dato campo="Calificación sustitutoria" valor={defecto.calificacion_sustitutoria == null ? "—" : defecto.calificacion_sustitutoria ? "Sí" : "No"} />
                          <Dato campo="Recurso gubernativo" valor={defecto.recurso_gubernativo == null ? "—" : defecto.recurso_gubernativo ? "Sí" : "No"} />
                          <Dato campo="Observaciones" valor={defecto.observaciones_registro} />
                          <Dato campo="Subsanación" valor={defecto.fecha_entrada_subsanacion ? "Subsanado" : "Pendiente de subsanación"} />
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Boton onClick={() => editarDefectoDesdeActividad(defecto)}>Editar defecto</Boton>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                </section>
                <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-extrabold text-slate-800">Repositorios digitales</h4>
                <RepositorioDocumentosInline
                  expedienteId={expediente?.id_expediente || expediente?.id || id}
                  categorias={["Defecto registral"]}
                  titulo="Repositorios digitales · Defecto registral"
                  onAbrirRepositorio={() => setMostrarRepositoriosDocumentacionPrevia(true)}
                />
                </section>
              </div>
            ) : null}
        {actividadSeleccionada !== "gestion-economica" && (
          <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block min-w-0">
                <span className="mb-1.5 block text-xs font-extrabold text-slate-700">Fecha envío ABSIS</span>
                <input
                  type="date"
                  value={fechaEnvioAbsis}
                  onChange={(event) => setFechaEnvioAbsis(event.target.value)}
                  disabled={registrandoSolicitudIntegracion || expedienteBloqueado}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
                />
              </label>
              <button
                type="button"
                onClick={enviarActividadAAbsis}
                disabled={registrandoSolicitudIntegracion || expedienteBloqueado}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registrandoSolicitudIntegracion ? "Registrando solicitud…" : "Enviar a ABSIS"}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-sky-900">
              Permite registrar el envío manual o dejar preparada la solicitud. Hasta que se active la conexión con ABSIS, este botón registra la petición en el ERP, pero no transmite datos externamente.
            </p>
          </section>
        )}
        <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-extrabold text-amber-900">Aviso para informática · Integración de datos</p>
          {actividadSeleccionada === "sede-notarial-protocolo" ? (
            <>
              <p className="mt-1 text-sm text-amber-800">
                Para la futura comunicación con ABSIS, informática deberá mapear los campos Notario, NIF de notario y Fecha de firma con los nombres y formatos exigidos por ABSIS.
              </p>
              <p className="mt-1 text-xs text-amber-800">La conexión con ABSIS todavía no está activa. Guardar los datos en el ERP no realiza ningún envío externo.</p>
            </>
          ) : actividadSeleccionada === "sede-notarial" ? (
            <>
              <p className="mt-1 text-sm text-amber-800">
                Para la futura comunicación con ABSIS, informática deberá mapear los campos Notario, NIF de notario y Fecha de firma con los nombres y formatos exigidos por ABSIS.
              </p>
              <p className="mt-1 text-xs text-amber-800">La conexión con ABSIS todavía no está activa. Guardar los datos en el ERP no realiza ningún envío externo.</p>
            </>
          ) : actividadSeleccionada === "documentacion-previa" ? (
            <>
              <p className="mt-1 text-sm text-amber-800">
                Informática deberá revisar el mapeo de las fechas de inicio y fin de actividad y de los datos de documentación que se muestran en este modal antes de activar cualquier intercambio externo.
              </p>
              <p className="mt-1 text-xs text-amber-800">El registro de datos en el ERP no implica por sí mismo una transmisión a sistemas externos.</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-amber-800">
                Informática deberá confirmar los campos y formatos que correspondan a esta actividad antes de configurar su integración con sistemas externos.
              </p>
              <p className="mt-1 text-xs text-amber-800">Este aviso es informativo: guardar los datos en el ERP no realiza ningún envío externo.</p>
            </>
          )}
          </section>
        </section>
        )}
      </Modal>

      {mostrarLiquidarExpediente && (
        <LiquidarExpedienteModal
          expediente={expediente}
          movimientos={gastosExpediente}
          checklist={renderChecklistCalidad({
            compacto: true,
            onNavigate: (claveActividad) => {
              setActividadSeleccionada(claveActividad);
              setMostrarLiquidarExpediente(false);
            },
          })}
          cargandoCierre={liquidandoExpediente}
          onClose={() => setMostrarLiquidarExpediente(false)}
          onConfirmarCierre={async () => {
            setLiquidandoExpediente(true);
            try {
              const respuesta = await axios.post(
                "/expedientes/" + encodeURIComponent(expediente?.id_expediente || id) + "/avanzar-actividad",
                {}
              );
              await cargarExpediente();
              await cargarGastosExpediente();
              setMostrarLiquidarExpediente(false);
              setMensajeActividad("Liquidación confirmada y expediente cerrado.");
              return respuesta?.data;
            } finally {
              setLiquidandoExpediente(false);
            }
          }}
        />
      )}

          </div>
        </div>
      </div>
  );
}


// ============================================================
// CAMPO FORMULARIO
// ============================================================

function CampoFormulario({
  label,
  value,
  onChange,
  textarea = false,
  tipo = "text",
  placeholder = "",
}) {

  return (
    <div className="mt-4">

      <label
        className="
          mb-1.5
          block
          text-[11px]
          font-bold
          uppercase
          tracking-wide
          text-slate-500
        "
      >
        {label}
      </label>

      {textarea ? (
        <textarea
          value={
            value ?? ""
          }
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={
            placeholder
          }
          rows={4}
          className="
            w-full
            rounded-xl
            border
            border-slate-200
            bg-white
            px-3
            py-3
            text-sm
            text-slate-700
            outline-none
            transition
            focus:border-blue-400
            focus:ring-2
            focus:ring-blue-100
          "
        />
      ) : (
        <input
          type={
            tipo
          }
          value={
            value ?? ""
          }
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={
            placeholder
          }
          className="
            w-full
            rounded-xl
            border
            border-slate-200
            bg-white
            px-3
            py-2.5
            text-sm
            text-slate-700
            outline-none
            transition
            focus:border-blue-400
            focus:ring-2
            focus:ring-blue-100
          "
        />
      )}

    </div>
  );
}


// ============================================================
// CAMPO SELECT
// ============================================================

function CampoSelect({
  label,
  value,
  onChange,
  opciones = [],
}) {
  return (
    <div>

      <label
        className="
          mb-1.5
          block
          text-[11px]
          font-bold
          uppercase
          tracking-wide
          text-slate-500
        "
      >
        {label}
      </label>

      <select
        value={
          value ?? ""
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          py-2.5
          text-sm
          text-slate-700
          outline-none
          transition
          focus:border-blue-400
          focus:ring-2
          focus:ring-blue-100
        "
      >

        <option value="">
          — Seleccionar —
        </option>

        {opciones.map(
          (opcion, indice) => {
            const esObjeto =
              opcion &&
              typeof opcion === "object";

            const valor =
              esObjeto
                ? String(
                    opcion.value ?? ""
                  )
                : String(
                    opcion ?? ""
                  );

            const texto =
              esObjeto
                ? opcion.label ?? valor
                : opcion ||
                  "Seleccionar…";

            return (
              <option
                key={`${valor}-${indice}`}
                value={valor}
              >
                {texto}
              </option>
            );
          }
        )}

      </select>

    </div>
  );
}


// ============================================================
// CHECKBOX VISIÓN
// ============================================================

function CheckboxVision({
  label,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label
      className={`
        flex
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        items-center
        gap-3
        rounded-xl
        border
        p-4
        transition
        ${
          checked
            ? "border-blue-200 bg-blue-50"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }
      `}
    >

      <input
        type="checkbox"
        checked={
          checked
        }
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        className="
          h-4
          w-4
          rounded
          border-slate-300
          text-blue-600
          focus:ring-blue-500
        "
      />

      <span
        className={`
          text-xs
          font-bold
          ${
            checked
              ? "text-blue-700"
              : "text-slate-600"
          }
        `}
      >
        {label}
      </span>

    </label>
  );
}
