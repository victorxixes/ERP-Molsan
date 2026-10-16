import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useParams } from "react-router-dom";
import axios from "../../api/axios";

import { obtenerExpediente, obtenerListadoExpedientes, enviarExpedienteANotario } from "../../api/expedientes";

import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";
import CarpetaDigitalModal from "../../components/expedientes/CarpetaDigitalModal";

import { obtenerCatalogoAcciones, obtenerAccionesExpediente, asignarAccionExpediente, eliminarAccionExpediente } from "../../api/expedienteAcciones";

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
  if (!fechaISO || !/^\\d{4}-\\d{2}-\\d{2}/.test(String(fechaISO))) return "";
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

  return new Intl.NumberFormat(
    "es-ES",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(numero);
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
    icono: "📄",
  },

  {
    key: "sede-notarial",
    label: "Sede notarial",
    icono: "🏛️",
  },

  {
    key: "sede-notarial-protocolo",
    label: "Sede notarial con protocolo",
    icono: "📜",
  },

  {
    key: "liquidacion-impuestos",
    label: "Liquidación de impuestos",
    icono: "💶",
  },

  {
    key: "tramitacion-inscripcion",
    label: "Tramitación inscripción",
    icono: "🏢",
  },

  {
    key: "defectos-registrales",
    label: "Defectos registrales",
    icono: "⚠️",
  },

  {
    key: "facturacion-cierre",
    label: "Cierre del expediente",
    icono: "🧾",
  },
];


// ============================================================
// CATÁLOGOS — FINCAS Y REGISTROS
// ============================================================

const PROVINCIAS_FINCA = [
"CORUÑA (A)","ALAVA","ALBACETE","ALICANTE/ALACANT","ALMERIA","ASTURIAS","AVILA","BADAJOZ","BALEARS (ILLES)","BARCELONA","BURGOS","CACERES","CADIZ","CANTABRIA","CASTELLON/CASTELLO","CEUTA","CIUDAD REAL","CORDOBA","CUENCA","GIRONA","GRANADA","GUADALAJARA","GUIPUZCOA","HUELVA","HUESCA","JAEN","RIOJA (LA)","PALMAS (LAS)","LEON","LLEIDA","LUGO","MADRID","MALAGA","MELILLA","MURCIA","NAVARRA","OURENSE","PALENCIA","PONTEVEDRA","SALAMANCA","SANTA CRUZ DE TENERIFE","SEGOVIA","SEVILLA","SORIA","TARRAGONA","TERUEL","TOLEDO","VALENCIA/VALENCIA","VALLADOLID","VIZCAYA","ZAMORA","ZARAGOZA"
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



const DEFECTO_VACIO = {
  tipo_carga_hipotecaria_id: "",
  motivo_defecto: "",
  subtipo_defecto_id: "",
  subtipo_defecto: "",
  fecha_notificacion_registro: "",
  fecha_vencimiento_presentacion: "",
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

    {
      key: "ultima_accion",
      label: "Última acción",
    },

    {
      key: "fecha_ultima_accion",
      label: "Fecha última acción",
      tipo: "fecha",
    },

    {
      key: "sol",
      label: "SOL",
    },

    {
      key: "cs",
      label: "CS",
    },

    {
      key: "ns",
      label: "NS",
    },
  ],

  "sede-notarial": [
    {
      key: "fecha_envio",
      label: "Fecha envío",
      tipo: "fecha",
    },

    {
      key: "apoderado",
      label: "Apoderado",
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
      key: "tipo_firma",
      label: "Tipo firma",
    },

    {
      key: "fecha_prevista_firma",
      label: "Fecha prevista firma",
      tipo: "fecha",
    },

    {
      key: "fecha_firma",
      label: "Fecha firma",
      tipo: "fecha",
    },

    {
      key: "ultima_accion",
      label: "Última acción",
    },

    {
      key: "fecha_ultima_accion",
      label: "Fecha última acción",
      tipo: "fecha",
    },

    {
      key: "sol",
      label: "SOL",
    },

    {
      key: "cs",
      label: "CS",
    },

    {
      key: "ns",
      label: "NS",
    },
  ],

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
      key: "tipo_firma",
      label: "Tipo firma",
    },

    {
      key: "fecha_firma",
      label: "Fecha firma",
      tipo: "fecha",
    },

    {
      key: "protocolo",
      label: "Protocolo",
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

    {
      key: "copia_simple_escritura",
      label: "Copia simple escritura",
    },

    {
      key: "ultima_accion",
      label: "Última acción",
    },

    {
      key: "fecha_ultima_accion",
      label: "Fecha última acción",
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
    {
      key: "escritura_simple_cancelacion",
      label: "Hoja de inscripción",
    },
    {
      key: "registral_estado",
      label: "Estado registral",
      estado: true,
    },
    {
      key: "registral_fecha",
      label: "Fecha registral",
      tipo: "fecha",
    },
  ],

  "defectos-registrales": [
    {
      key: "tiene_defectos_abiertos",
      label: "Defectos abiertos",
      estado: true,
    },

    {
      key: "tipo_error",
      label: "Tipo error",
    },

    {
      key: "falta_defecto",
      label: "Falta / defecto",
    },

    {
      key: "descripcion_error",
      label: "Descripción del defecto",
      multilinea: true,
    },

    {
      key: "fcierre_defecto",
      label: "Fecha cierre defecto",
      tipo: "fecha",
    },

    {
      key: "registral_estado",
      label: "Estado registral",
      estado: true,
    },

    {
      key: "registral_fecha",
      label: "Fecha registral",
      tipo: "fecha",
    },
  ],

  "facturacion-cierre": [
    {
      key: "facturacion_estado",
      label: "Estado facturación",
      estado: true,
    },
    {
      key: "facturacion_fecha",
      label: "Fecha facturación",
      tipo: "fecha",
    },
    {
      key: "fecha_entregado_cliente",
      label: "Fecha entregado cliente",
      tipo: "fecha",
    },
    {
      key: "fecha_fin_actividad",
      label: "Fin actividad",
      tipo: "fecha",
    },
  ],
};


// ============================================================
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
    estado: "◉",
    titular: "👤",
    solicitante: "👥",
    economico: "📊",
    notario: "✒️",
    observaciones: "▣",
    actividad: "⚙️",
    finca: "🏠",
    registro: "📚",
    accion: "⚡",
  };

  return (
    <span
      className="
        text-base
        leading-none
      "
      aria-hidden="true"
    >
      {
        iconos[tipo] ||
        "▣"
      }
    </span>
  );
}


// ============================================================
// TARJETA
// ============================================================

function Seccion({
  titulo,
  subtitulo,
  icono,
  children,
  className = "",
  colapsable = false,
  compacto = false,
}) {
  const [abierta, setAbierta] = useState(true);

  return (
    <section
      className={`
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
          ${compacto ? "px-3 py-2.5" : "px-5 py-4"}
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

  return (
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
  );
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

  const [
    mostrarActividades,
    setMostrarActividades,
  ] = useState(false);

  const [
    actividadSeleccionada,
    setActividadSeleccionada,
  ] = useState(
    "documentacion-previa"
  );

  const [actividadDraft, setActividadDraft] = useState({});
  const [guardandoActividad, setGuardandoActividad] = useState(false);
  const [errorActividad, setErrorActividad] = useState("");
  const [mensajeActividad, setMensajeActividad] = useState("");
  const [estadoDocumentacionAbsis, setEstadoDocumentacionAbsis] = useState({
    certificado_saldo_cero_erroneo: false,
    solicitud_cancelacion_notarial: false,
    certificado_cancelacion_administrativo: false,
    nota_simple_registral: false,
    mover_siguiente_actividad: false,
    enviado_a_absis: false,
  });
  const [cargandoEstadoAbsis, setCargandoEstadoAbsis] = useState(false);
  const [enviandoAbsis, setEnviandoAbsis] = useState(false);
  const [documentosCarpetaPrevia, setDocumentosCarpetaPrevia] = useState([]);
  const [documentosCierre, setDocumentosCierre] = useState([]);
  const [cargandoDocumentosCierre, setCargandoDocumentosCierre] = useState(false);
  const [errorDocumentosCierre, setErrorDocumentosCierre] = useState("");
  const [honorariosGestoria, setHonorariosGestoria] = useState(null);
  const [generandoHonorariosGestoria, setGenerandoHonorariosGestoria] = useState(false);
  const [errorHonorariosGestoria, setErrorHonorariosGestoria] = useState("");
  const [mensajeHonorariosGestoria, setMensajeHonorariosGestoria] = useState("");

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
  const [gastosExpediente, setGastosExpediente] = useState([]);
  const [cargandoGastos, setCargandoGastos] = useState(false);
  const [guardandoGasto, setGuardandoGasto] = useState(false);
  const [errorGastos, setErrorGastos] = useState("");
  const [mensajeGastos, setMensajeGastos] = useState("");
  const [conceptosGasto, setConceptosGasto] = useState([]);
  const [cargandoConceptosGasto, setCargandoConceptosGasto] = useState(false);
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
    tipo: "", descripcion: "", importe: "", fecha: new Date().toLocaleDateString("sv-SE"), documento_url: "",
    nif_notario: "", nombre_notario: "", pagador: "", cuenta_bancaria: "", medio_pago: "Transferencia",
    numero_factura: "", fecha_factura: new Date().toLocaleDateString("sv-SE"), importe_total_bruto: "",
    base_exenta_impuestos: "0.00", base_sujeta_impuestos: "", tramo_impuesto: "General", tipo_impuesto: "IVA 21%",
    porcentaje_impuesto: "21", base_exenta_retencion: "0.00", base_sujeta_retencion: "0.00",
    tipo_retencion: "IRPF profesionales", porcentaje_retencion: "15", documento_carpeta_id: "", estado_pago: "Pendiente",
  });

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

  const [
    mostrarFincas,
    setMostrarFincas,
  ] = useState(false);

  // Modal de carpeta digital del expediente.
  const [
    mostrarCarpetaDigital,
    setMostrarCarpetaDigital,
  ] = useState(false);
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
    seccion: "",
    cuantia: "",
    inscripcion: "",
    contrato: "",
    fecha_constitucion: "",
    subrogado: "",
    entidad_original: "",
  });

  const [fincasExpediente, setFincasExpediente] = useState([]);
  const [cargandoFincas, setCargandoFincas] = useState(false);
  const [errorFincas, setErrorFincas] = useState("");
  const [fincaEditandoId, setFincaEditandoId] = useState(null);
  const [guardandoFinca, setGuardandoFinca] = useState(false);

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
            err?.response?.data?.detail ||
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
      ];

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
        sumarDiasNaturales(expediente?.fecha_liquidacion_tributaria || fechaFirma, 60),
      mover_siguiente_actividad:
        expediente?.mover_siguiente_actividad ??
        (actividadActual === "liquidacion-impuestos" || actividadActual === "tramitacion-inscripcion"),
    });
    setErrorActividad("");
    setMensajeActividad("");
    setMostrarActividades(true);
    if (expediente?.id_expediente) {
      setCargandoEstadoAbsis(true);
      axios.get(`/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/absis`)
        .then((res) => setEstadoDocumentacionAbsis((actual) => ({ ...actual, ...(res?.data || {}) })))
        .catch(() => {})
        .finally(() => setCargandoEstadoAbsis(false));
    }
  }

  async function guardarEstadoAbsis(marcarEnviado = false) {
    if (!expediente?.id_expediente || enviandoAbsis) return;
    setEnviandoAbsis(true);
    setErrorActividad("");
    setMensajeActividad("");
    try {
      const payload = { ...estadoDocumentacionAbsis };
      const res = await axios.put(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/absis`,
        payload
      );
      setEstadoDocumentacionAbsis((actual) => ({ ...actual, ...(res?.data || payload) }));
      if (marcarEnviado) {
        const enviado = await axios.post(
          `/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/enviar-a-absis`
        );
        setEstadoDocumentacionAbsis((actual) => ({ ...actual, ...(enviado?.data || {}), enviado_a_absis: true }));
        setMensajeActividad("La información de Documentación previa se ha registrado para ABSIS. La transmisión externa requiere que el backend tenga configurada la integración con ABSIS.");
      } else {
        setMensajeActividad("Los datos de comunicación a ABSIS se han guardado.");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorActividad(typeof detail === "string" ? detail : detail?.mensaje || JSON.stringify(detail) || err?.message || "No se pudieron guardar los datos de ABSIS.");
    } finally {
      setEnviandoAbsis(false);
    }
  }

  async function avanzarActividad() {
    if (!expediente?.id_expediente || guardandoActividad) return;

    // Validar antes de activar el estado de guardado para no dejar
    // el formulario bloqueado cuando el usuario no confirma el avance.
    if (!estadoDocumentacionAbsis.mover_siguiente_actividad) {
      setErrorActividad("Selecciona Sí en «Mover el expediente a la siguiente actividad» para confirmar el avance.");
      return;
    }

    setGuardandoActividad(true);
    setErrorActividad("");
    setMensajeActividad("");

    try {
      await axios.put(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/documentacion-previa/absis`,
        estadoDocumentacionAbsis
      );
      const response = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/avanzar-actividad`
      );
      await cargarExpediente();
      setActividadSeleccionada(resolverActividadActual(response?.data || expediente));
      setActividadDraft((actual) => ({ ...actual, ...(response?.data || {}) }));
      setMensajeActividad("La actividad se ha actualizado correctamente.");
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

  async function enviarSedeNotarialProtocoloAbsis() {
    if (!expediente?.id_expediente || guardandoActividad || enviandoAbsis) return;
    setGuardandoActividad(true);
    setEnviandoAbsis(true);
    setErrorActividad("");
    setMensajeActividad("");
    try {
      const camposEspecificos = CAMPOS_ACTIVIDADES["sede-notarial-protocolo"] || [];
      const campos = {};
      for (const campo of camposEspecificos) {
        if (Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)) {
          campos[campo.key] = actividadDraft[campo.key] ?? "";
        }
      }
      await axios.put(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/actividad`,
        { campos }
      );
      const respuesta = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/sede-notarial-protocolo/enviar-a-absis`,
        { ...campos, mover_siguiente_actividad: !!actividadDraft.mover_siguiente_actividad }
      );
      await cargarExpediente();
      setActividadDraft((actual) => ({ ...actual, ...(respuesta?.data || {}), ...campos }));
      setMensajeActividad(
        actividadDraft.mover_siguiente_actividad
          ? "Datos guardados y solicitud de envío a ABSIS registrada, incluyendo la indicación de mover a la siguiente actividad."
          : "Datos guardados y solicitud de envío a ABSIS registrada. El expediente permanece en esta actividad."
      );
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorActividad(
        typeof detail === "string"
          ? detail
          : detail?.mensaje || JSON.stringify(detail) || err?.message ||
            "No se pudo enviar la información de Sede notarial con protocolo a ABSIS. Comprueba que el backend tenga habilitado este endpoint."
      );
    } finally {
      setGuardandoActividad(false);
      setEnviandoAbsis(false);
    }
  }

  async function enviarActividadAbsis(tipoActividad) {
    if (!expediente?.id_expediente || guardandoActividad || enviandoAbsis) return;
    const claves = CAMPOS_ACTIVIDADES[tipoActividad] || [];
    const campos = {};
    for (const campo of claves) {
      if (Object.prototype.hasOwnProperty.call(actividadDraft, campo.key)) {
        campos[campo.key] = actividadDraft[campo.key] ?? "";
      }
    }
    campos.mover_siguiente_actividad = actividadDraft.mover_siguiente_actividad ?? true;

    setGuardandoActividad(true);
    setEnviandoAbsis(true);
    setErrorActividad("");
    setMensajeActividad("");
    try {
      const camposActividad = { ...campos };
      delete camposActividad.mover_siguiente_actividad;
      await axios.put(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/actividad`,
        { campos: camposActividad }
      );
      const respuesta = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/${tipoActividad}/enviar-a-absis`,
        campos
      );
      await cargarExpediente();
      setActividadDraft((actual) => ({ ...actual, ...(respuesta?.data || {}), ...campos }));
      setMensajeActividad(
        campos.mover_siguiente_actividad
          ? "Datos guardados y solicitud de envío a ABSIS registrada. Se ha indicado avanzar a la siguiente actividad."
          : "Datos guardados y solicitud de envío a ABSIS registrada. El expediente permanece en esta actividad."
      );
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setErrorActividad(
        typeof detail === "string"
          ? detail
          : detail?.mensaje || JSON.stringify(detail) || err?.message ||
            `No se pudo enviar a ABSIS. Comprueba que el backend tenga habilitada la ruta de ${tipoActividad}.`
      );
    } finally {
      setGuardandoActividad(false);
      setEnviandoAbsis(false);
    }
  }


  function calcularHonorariosGestoria() {
    const datos = expediente || {};
    const entidad = [
      datos.entidad_bancaria,
      datos.nombre_entidad,
      datos.entidad,
      datos.banco,
      datos.entidad_financiera,
      datos.entidad_solicitante,
      datos.entidad_original,
      datos.entidad_crediticia,
      datos.banco_acreedor,
      ...(Array.isArray(fincasExpediente) ? fincasExpediente.map((f) => f?.entidad_original) : []),
    ].filter(Boolean).join(" ").toLowerCase();

    const provinciasCanarias = [
      "las palmas", "palmas (las)", "santa cruz de tenerife",
      "tenerife", "canarias", "canary islands",
    ];
    const ubicacion = [
      datos.comunidad_autonoma,
      datos.comunidad,
      datos.provincia,
      datos.provincia_finca,
      datos.oficina_liquidadora,
      datos.registro_propiedad,
      ...(Array.isArray(fincasExpediente) ? fincasExpediente.flatMap((f) => [f?.provincia, f?.poblacion, f?.comunidad_autonoma]) : []),
    ].filter(Boolean).join(" ").toLowerCase();

    if (provinciasCanarias.some((termino) => ubicacion.includes(termino))) {
      return { importe: 69, tarifa: "Canarias", entidad: entidad || "No identificada" };
    }
    if (entidad.includes("caixabank") || entidad.includes("caixa bank") || entidad.includes("la caixa") || /(^|\\W)caixa(\\W|$)/.test(entidad)) {
      return { importe: 83, tarifa: "CaixaBank", entidad: entidad || "CaixaBank" };
    }
    return { importe: 111, tarifa: "Otras entidades", entidad: entidad || "No identificada" };
  }

  async function generarHonorariosGestoria() {
    if (!expediente?.id_expediente || generandoHonorariosGestoria) return;
    const calculo = calcularHonorariosGestoria();
    setHonorariosGestoria(calculo);
    setGenerandoHonorariosGestoria(true);
    setErrorHonorariosGestoria("");
    setMensajeHonorariosGestoria("");
    try {
      const respuesta = await axios.post(
        `/expedientes/${encodeURIComponent(expediente.id_expediente)}/honorarios-gestoria/generar`,
        {
          importe: calculo.importe,
          tarifa: calculo.tarifa,
          concepto: "Honorarios de gestoría",
          entidad: calculo.entidad,
          id_expediente: expediente.id_expediente,
        }
      );
      setHonorariosGestoria((actual) => ({ ...actual, ...(respuesta?.data || {}), guardado: true }));
      setMensajeHonorariosGestoria("Honorarios de gestoría generados y registrados.");
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 404 || status === 405) {
        setMensajeHonorariosGestoria(
          `Importe calculado: ${calculo.importe.toFixed(2).replace(".", ",")} €. El backend todavía no dispone de una ruta compatible para registrar automáticamente este concepto.`
        );
      } else {
        setErrorHonorariosGestoria(
          typeof detail === "string"
            ? detail
            : detail?.mensaje || JSON.stringify(detail) || err?.message ||
              "No se pudieron registrar los honorarios. El importe calculado se mantiene visible."
        );
      }
    } finally {
      setGenerandoHonorariosGestoria(false);
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
    if (!Object.keys(campos).length) {
      setErrorActividad("Esta actividad no tiene campos editables disponibles en el expediente.");
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
      await cargarExpediente();
      setActividadDraft((actual) => ({ ...actual, ...(response?.data || {}) }));
      setMensajeActividad("Los datos de la actividad se han guardado.");
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

    await cargarExpediente();

    setMostrarEnviarNotario(false);
  }


  // ==========================================================
  // GASTOS DEL EXPEDIENTE
  // ==========================================================

  async function cargarGastosExpediente() {
    const expedienteId = expediente?.id ?? (Number.isFinite(Number(id)) ? Number(id) : null);
    if (!expedienteId) return;

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
    } catch (err) {
      setErrorGastos(
        err?.response?.data?.detail ||
        "No se pudieron cargar los gastos del expediente."
      );
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
      await axios.post(
        `/expedientes/${encodeURIComponent(expedienteId)}/gastos`,
        {
          tipo: gastoForm.tipo.trim(), descripcion: gastoForm.descripcion.trim(), importe: resultadoCalculadoGasto, fecha: gastoForm.fecha,
          documento_url: gastoForm.documento_url.trim() || null,
          nif_notario: gastoForm.nif_notario.trim() || null, nombre_notario: gastoForm.nombre_notario.trim() || null,
          pagador: gastoForm.pagador.trim() || null, cuenta_bancaria: gastoForm.cuenta_bancaria.trim() || null,
          medio_pago: gastoForm.medio_pago || null, numero_factura: gastoForm.numero_factura.trim() || null,
          fecha_factura: gastoForm.fecha_factura || null, importe_total_bruto: brutoCalculadoGasto,
          base_exenta_impuestos: numeroDecimalGasto(gastoForm.base_exenta_impuestos), base_sujeta_impuestos: baseImponibleGasto,
          tramo_impuesto: gastoForm.tramo_impuesto || null, tipo_impuesto: gastoForm.tipo_impuesto || null,
          porcentaje_impuesto: numeroDecimalGasto(gastoForm.porcentaje_impuesto), importe_impuesto: impuestoCalculadoGasto,
          base_exenta_retencion: numeroDecimalGasto(gastoForm.base_exenta_retencion), base_sujeta_retencion: numeroDecimalGasto(gastoForm.base_sujeta_retencion),
          tipo_retencion: gastoForm.tipo_retencion || null, porcentaje_retencion: numeroDecimalGasto(gastoForm.porcentaje_retencion), importe_retencion: retencionCalculadaGasto,
          importe_resultante: resultadoCalculadoGasto, documento_carpeta_id: gastoForm.documento_carpeta_id ? Number(gastoForm.documento_carpeta_id) : null,
          estado_pago: gastoForm.estado_pago || "Pendiente",
        }
      );
      setGastoForm({ tipo: "", descripcion: "", importe: "", fecha: new Date().toLocaleDateString("sv-SE"), documento_url: "", nif_notario: "", nombre_notario: "", pagador: "", cuenta_bancaria: "", medio_pago: "Transferencia", numero_factura: "", fecha_factura: new Date().toLocaleDateString("sv-SE"), importe_total_bruto: "", base_exenta_impuestos: "0.00", base_sujeta_impuestos: "", tramo_impuesto: "General", tipo_impuesto: "IVA 21%", porcentaje_impuesto: "21", base_exenta_retencion: "0.00", base_sujeta_retencion: "0.00", tipo_retencion: "IRPF profesionales", porcentaje_retencion: "15", documento_carpeta_id: "", estado_pago: "Pendiente" });
      setMensajeGastos("El gasto se ha registrado correctamente.");
      setMostrarFormularioGasto(false);
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
        err?.response?.data?.detail || "No se pudieron cargar las observaciones."
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
      setErrorObservaciones(err?.response?.data?.detail || "No se pudo guardar la observación.");
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
    setComentario(
      expediente?.observaciones ||
      ""
    );

    setVisionesComentario({
      notario: false,
      apoderado: false,
      actividad: true,
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
      setErrorPpad(err?.response?.data?.detail || "No se pudieron cargar los conceptos PPAD.");
      setPpadItems([]);
    } finally {
      setCargandoPpad(false);
    }
  }, [expediente?.id_expediente, id]);

  useEffect(() => {
    if (expediente?.id_expediente || id) cargarPpad();
  }, [expediente?.id_expediente, id, cargarPpad]);

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
          erp-page
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
          erp-page
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

  return (
    <div
      className="
        erp-page
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
            grid
            grid-cols-1
            gap-3
            p-3
            sm:p-4
            xl:grid-cols-[250px_minmax(0,1fr)_auto]
            xl:items-center
          "
        >

          <div className="min-w-0">

            <Link
              to="/expedientes"
              className="
                mb-3
                inline-flex
                items-center
                text-[11px]
                font-bold
                text-blue-600
                hover:text-blue-700
              "
            >
              ← Expedientes
            </Link>

            <div
              className="
                flex
                items-center
                gap-4
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-blue-100
                  bg-blue-50
                  text-xl
                  text-blue-600
                "
              >
                📁
              </div>

              <div className="min-w-0">

                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-slate-400
                  "
                >
                  Ficha de expediente
                </p>

                <h1
                  className="
                    whitespace-nowrap
                    text-xl
                    font-bold
                    leading-none
                    text-slate-800
                  "
                >
                  {valorVisible(
                    expediente.id_expediente
                  )}
                </h1>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-400
                  "
                >
                  Ficha completa del expediente
                </p>

              </div>
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
              xl:grid-cols-4
            "
          >

            <Seccion
              titulo="Titulares"
              subtitulo="Titulares del expediente"
              icono="titular"
              className="h-full"
              compacto
            >
              <div className="grid grid-cols-2 gap-2">
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
            </Seccion>

            <Seccion
              titulo="Solicitantes"
              subtitulo="Solicitantes del expediente"
              icono="solicitante"
              className="h-full"
              compacto
            >
              <div className="grid grid-cols-2 gap-2">
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
            </Seccion>

            <Seccion
              titulo="Expedientes relacionados"
              subtitulo="Agrupación automática por NIF"
              icono="titular"
              className="h-full"
              compacto
            >
              <p className="text-xs leading-5 text-slate-500">
                El sistema buscará otros expedientes cuyo titular tenga el mismo NIF.
              </p>

              {(() => {
                const listaVisibles = expedientesRelacionados.length > 0
                  ? expedientesRelacionados
                  : expedientesManuales.map((item) => ({ ...item, _manual: true }));

                return listaVisibles.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {listaVisibles.map((relacionado) => (
                      <div
                        key={String(relacionado.id_expediente)}
                        className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-blue-700">
                            {valorVisible(relacionado.id_expediente)}
                          </div>
                          <div className="truncate text-[10px] text-slate-500">
                            {relacionado._manual ? "Añadido manualmente" : "Encontrado por NIF"}
                            {relacionado.actividad_actual
                              ? ` · ${relacionado.actividad_actual}`
                              : ""}
                          </div>
                        </div>
                        <Link
                          to={`/expedientes/${encodeURIComponent(relacionado.id_expediente)}`}
                          className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                        >
                          Ver
                        </Link>
                        {relacionado._manual && (
                          <button
                            type="button"
                            onClick={() => eliminarExpedienteRelacionado(relacionado.id_expediente)}
                            className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100"
                            title="Eliminar expediente relacionado"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              <button
                type="button"
                onClick={abrirAgregarExpedientes}
                className="
                  mt-3 w-full rounded-xl border border-blue-100
                  bg-blue-50 px-3 py-2.5 text-xs font-bold
                  text-blue-700 transition hover:bg-blue-100
                "
              >
                ➕ Agregar expedientes
              </button>
            </Seccion>

            <Seccion
              titulo="Notario"
              subtitulo="Información del notario asociado"
              icono="notario"
              className="h-full"
              compacto
              colapsable
            >
              <div className="grid grid-cols-1 gap-2">
                <Dato
                  campo="Nombre notario"
                  valor={expediente.nombre_notario || expediente.notario}
                  destaque
                />
                <Dato
                  campo="NIF notario"
                  valor={expediente.nif_notario}
                />
              </div>
            </Seccion>

          </div>
        </div>


          <div
            className="flex flex-col items-stretch gap-2"
          >

            <button
              type="button"
              onClick={abrirDefecto}
              className="
                inline-flex items-center justify-center gap-2
                rounded-xl border border-blue-200 bg-blue-50
                px-4 py-2.5 text-xs font-bold text-blue-700
                shadow-sm transition hover:bg-blue-100
                focus:outline-none focus:ring-2 focus:ring-blue-300
              "
              title="Registrar un defecto registral"
            >
              ➕ Alta defecto
            </button>

            <Boton
              onClick={abrirActividades}
            >
              ⚙️ Ver actividades
            </Boton>

            <Boton
              tipo="primary"
              onClick={() => setMostrarCarpetaDigital(true)}
              className="w-full"
            >
              📁 Carpeta digital
            </Boton>

            {tieneDefecto && (
              <button
                type="button"
                onClick={
                  abrirDefecto
                }
                className="
                  animate-pulse
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-red-300
                  bg-red-50
                  px-4
                  py-2.5
                  text-xs
                  font-bold
                  text-red-700
                  shadow-sm
                "
              >
                ⚠️ DEFECTO REGISTRAL
              </button>
            )}


          </div>
        </div>
      </section>


      {/* =====================================================
          CUATRO COLUMNAS PRINCIPALES
      ====================================================== */}

      <div
        className="
          grid
           w-full
          grid-cols-1
          gap-3
          xl:grid-cols-12
        "
      >

        {/* ===================================================
            COLUMNA 1
        ==================================================== */}

        <div className="min-w-0 space-y-4 xl:col-span-4">

          {/* ESTADO */}

          <Seccion
            titulo="Estado"
            subtitulo="Situación actual del expediente"
            icono="estado"
            colapsable
          >
            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-3
                gap-2
              "
            >

              <Dato
                campo="Estado"
                valor={
                  expediente.estado_expediente
                }
                estado
                destaque
              />

              <Dato
                campo="Actividad actual"
                valor={
                  expediente.actividad_actual
                }
                destaque
              />

              <Dato
                campo="Estado actividad"
                valor={
                  expediente.estado_actividad
                }
                estado
              />


              <Dato
                campo="Oficina"
                valor={
                  expediente.oficina
                }
                destaque
              />

              <Dato
                campo="DAN"
                valor={
                  expediente.dan
                }
              />

              <Dato
                campo="Fecha alta"
                valor={
                  expediente.fecha_alta
                }
                tipo="fecha"
                destaque
              />

            </div>
          </Seccion>


         


          {/* FINCAS Y REGISTROS — SOLO LOS TRES DATOS SOLICITADOS */}

          <Seccion
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
                      <p className="mt-1 text-xs text-slate-500">{[finca.registro, finca.seccion, finca.poblacion, finca.provincia].filter(Boolean).join(" · ") || "Sin datos registrales"}</p>
                    </div>
                    <div className="flex gap-2">
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




                    {/* ACCIONES */}

          <Seccion
            titulo="Acciones"
            subtitulo="Acciones operativas del expediente"
            icono="accion"
            colapsable
          >
            <button
              type="button"
              onClick={
                abrirAcciones
              }
              className="
                w-full
                rounded-xl
                border
                border-blue-100
                bg-blue-50
                px-4
                py-3
                text-xs
                font-bold
                text-blue-700
                transition
                hover:bg-blue-100
              "
            >
⚡ Gestionar acciones
            </button>

            {errorAcciones && (
              <div className="erp-danger mt-3 rounded-xl border px-4 py-3 text-xs">
                {errorAcciones}
              </div>
            )}

            {cargandoAcciones ? (
              <div className="erp-text-soft mt-3 text-xs">
                Cargando acciones...
              </div>
            ) : accionesExpediente.length > 0 ? (
              <div className="mt-4 space-y-3">
                {accionesExpediente.map((relacion) => {
                  const accion =
                    relacion.accion ||
                    relacion.accion_expediente ||
                    relacion;

                  return (
                    <div
                      key={relacion.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800">
                            {accion.descripcion ||
                              relacion.descripcion ||
                              "Acción"}
                          </div>

                          {accion.actividad && (
                            <div className="mt-1 text-xs text-slate-500">
                              {accion.actividad}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            retirarAccion(relacion.id)
                          }
                          className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                        >
                          Retirar
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {relacion.estado && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                            {relacion.estado}
                          </span>
                        )}
                        {relacion.fecha && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {formatearFecha(relacion.fecha)}
                          </span>
                        )}
                      </div>

                      {relacion.observaciones && (
                        <div className="mt-3 text-xs text-slate-600">
                          {relacion.observaciones}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="erp-text-soft mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-4 text-xs">
                Este expediente todavía no tiene acciones asignadas.
              </div>
            )}
          </Seccion>

          {/* OBSERVACIONES */}
          <Seccion
            titulo="Observaciones"
            subtitulo="Comentarios, autor y visibilidad"
            icono="observaciones"
            colapsable
            compacto
          >
            <div className="space-y-3">
              {errorObservaciones && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorObservaciones}</p>}
              {cargandoObservaciones && <p className="text-xs text-slate-500">Cargando observaciones…</p>}
              {!cargandoObservaciones && observacionesExpediente.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                  Todavía no hay observaciones añadidas.
                </p>
              )}

              {observacionesExpediente.map((observacion) => (
                <article key={observacion.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{observacion.comentario}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{observacion.autor || "Usuario conectado"}</span>
                    <time dateTime={observacion.fecha}>
                      {observacion.fecha ? new Date(observacion.fecha).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Fecha no disponible"}
                    </time>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {observacion.visibilidad === "Gestor" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
                        🔒 Interna · Departamento
                      </span>
                    ) : observacion.visibilidad === "Visible notario" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-800">
                        ⚖️ Visible para notario
                      </span>
                    ) : observacion.visibilidad === "Visible apoderado" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-800">
                        👤 Visible para apoderado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">
                        Visibilidad: {observacion.visibilidad || "No indicada"}
                      </span>
                    )}
                    {observacion.visibilidad === "Gestor" && observacion.empleado_destinatario && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                        Destinatario: {observacion.empleado_destinatario}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => editarObservacionExpediente(observacion)} className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                      Editar
                    </button>
                    <button type="button" onClick={() => eliminarObservacionExpediente(observacion.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">
                      Desactivar
                    </button>
                  </div>
                </article>
              ))}

              {mostrarFormularioObservacion ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">{observacionEditandoId !== null ? "Editar comentario" : "Comentario"}</span>
                    <textarea value={nuevaObservacion} onChange={(event) => setNuevaObservacion(event.target.value)} rows={4} placeholder="Escribe la observación..." className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Visibilidad</span>
                    <select value={visibilidadObservacion} onChange={(event) => setVisibilidadObservacion(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <option value="Gestor">Departamento interno (Gestor)</option>
                      <option value="Visible notario">Visible para el notario</option>
                      <option value="Visible apoderado">Visible para el apoderado</option>
                    </select>
                  </label>
                  {visibilidadObservacion === "Gestor" && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Empleado destinatario</span>
                      <select value={destinatarioObservacion} onChange={(event) => setDestinatarioObservacion(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                        <option value="">Selecciona un empleado</option>
                        {empleadosObservaciones.map((empleado) => <option key={empleado.id} value={empleado.id}>{empleado.nombre}</option>)}
                      </select>
                    </label>
                  )}
                  <div className="flex justify-end gap-2">
                    <Boton onClick={() => { setMostrarFormularioObservacion(false); setNuevaObservacion(""); setObservacionEditandoId(null); }}>Cancelar</Boton>
                    <Boton tipo="primary" onClick={agregarObservacionExpediente} disabled={!nuevaObservacion.trim() || guardandoObservacion || (visibilidadObservacion === "Gestor" && !destinatarioObservacion)}>{guardandoObservacion ? "Guardando…" : observacionEditandoId !== null ? "Guardar cambios" : "Guardar observación"}</Boton>
                  </div>
                </div>
              ) : (
                <Boton tipo="primary" onClick={() => setMostrarFormularioObservacion(true)}>＋ Añadir observación</Boton>
              )}
            </div>
          </Seccion>

        </div>


      

       

        {/* ===================================================
            ZONA DERECHA — PPAD, INFORMACIÓN CREDITICIA Y ENVÍO
            Se mantiene a la derecha de Fincas, Acciones y Observaciones.
        ==================================================== */}
        <div className="min-w-0 xl:col-span-8">
          <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-8">
        {/* PPAD */}
        <div className="min-w-0 space-y-2 xl:col-span-3">
          {/* PPAD */}
          <Seccion
            titulo="PPAD"
            subtitulo="Conceptos, importes e imputación"
            icono="economico"
            colapsable
            compacto
          >
            <div className="space-y-2">
              {errorPpad && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorPpad}</p>}
              {cargandoPpad && <p className="text-xs text-slate-500">Cargando conceptos PPAD…</p>}
              {ppadItems.length === 0 && !cargandoPpad && !mostrarFormularioPpad && (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                  Todavía no hay conceptos PPAD añadidos.
                </p>
              )}

              {ppadItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Concepto</div>
                      <div className="mt-0.5 break-words text-[11px] leading-tight font-semibold text-slate-800">{item.concepto}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Importe</div>
                      <div className="mt-0.5 text-[11px] leading-tight font-semibold text-slate-800">{new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(item.importe) || 0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Imputable a</div>
                      <div className="mt-0.5 text-[11px] leading-tight font-semibold text-slate-800">{item.imputable_a || item.imputableA || "Molsan"}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Boton tipo="secondary" onClick={() => editarPpad(item)}>Editar</Boton>
                    <Boton tipo="danger" onClick={() => eliminarPpad(item.id)}>Eliminar</Boton>
                  </div>
                </div>
              ))}

              {mostrarFormularioPpad && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Concepto</span>
                      <input
                        type="text"
                        value={ppadForm.concepto}
                        onChange={(event) => setPpadForm((actual) => ({ ...actual, concepto: event.target.value }))}
                        placeholder="Introduce el concepto"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Importe (€)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ppadForm.importe}
                        onChange={(event) => setPpadForm((actual) => ({ ...actual, importe: event.target.value }))}
                        placeholder="0,00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Imputable a</span>
                      <select
                        value={ppadForm.imputableA}
                        onChange={(event) => setPpadForm((actual) => ({ ...actual, imputableA: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
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

              {!mostrarFormularioPpad && (
                <Boton tipo="primary" onClick={abrirNuevoPpad}>＋ Añadir concepto PPAD</Boton>
              )}
            </div>
          </Seccion>

        </div>

 {/* ===================================================
            INFORMACIÓN CREDITICIA
        ==================================================== */}

        <div className="min-w-0 xl:col-span-5">
          <Seccion
            titulo="Información crediticia"
            subtitulo="Datos económicos y contractuales"
            icono="economico"
            colapsable
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-1.5">
              {/* Fila 1: Contrato · Capital · Tipo operación · Subtipo · Importe · Saldo disponible */}
              <div className="min-w-0 xl:col-span-1">
                <Dato campo="Contrato" valor={expediente.contrato} compacto />
              </div>
              <div className="min-w-0 xl:col-span-1">
                <Dato campo="Capital" valor={expediente.capital} tipo="numero" destaque compacto />
              </div>
              <div className="min-w-0 xl:col-span-1">
                <Dato campo="Tipo operación" valor={expediente.tipo_operacion} compacto />
              </div>
              <div className="min-w-0 xl:col-span-1">
                <Dato campo="Subtipo operación" valor={expediente.subtipo_operacion} compacto />
              </div>
              <div className="min-w-0 xl:col-span-1">
                <Dato campo="Importe" valor={expediente.importe} tipo="numero" destaque compacto />
              </div>
              <div className="min-w-0 xl:col-span-1">
                <Dato campo="Saldo disponible" valor={expediente.saldo_disponible} tipo="numero" compacto />
              </div>

              {/* Fila 2: Nº solicitud SIA · Finca · Observaciones */}
              <div className="min-w-0 xl:col-span-2">
                <Dato campo="Nº solicitud SIA" valor={expediente.num_solicitud_sia} compacto />
              </div>
              <div className="min-w-0 xl:col-span-2">
                <Dato campo="Finca" valor={expediente.finca} destaque compacto />
              </div>
              <div className="min-w-0 xl:col-span-2">
                <Dato
                  campo="Observaciones"
                  valor={expediente.observaciones ?? expediente.Observaciones}
                  destaque
                  compacto
                />
              </div>
            </div>
          </Seccion>
        </div>


        {/* ENVÍO A NOTARIO: CENTRADO DEBAJO DE PPAD E INFORMACIÓN CREDITICIA */}
        <div className="min-w-0 w-full xl:col-span-8">
          <div className="flex w-full min-w-0 justify-center">
          {/* =====================================================
              FICHA COMPLETA DE ENVÍO A NOTARIO
              El botón abre el modal para completar y guardar el encargo.
          ====================================================== */}
            <section className="w-full max-w-none min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(30,41,59,0.08)]">
              <div className="flex flex-wrap items-center justify-center gap-3 border-b border-slate-100 bg-white px-4 py-4 text-center sm:px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-white text-xl shadow-sm">🏛️</div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-800">Envío a notario</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Encargo al notario, datos de firma y facturación</p>
                </div>
                {(expediente.fecha_envio_notario || expediente.fecha_envio) && (
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Datos guardados</span>
                )}
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                {!(expediente.fecha_envio_notario || expediente.fecha_envio) && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    Todavía no se ha registrado el encargo. Pulsa «Enviar a notario» para completar los datos y guardarlos en el expediente.
                  </p>
                )}
                {(expediente.fecha_envio_notario || expediente.fecha_envio) && <>
                <div>
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
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-700">Datos de facturación</p>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Dato campo="Nombre" valor={expediente.facturacion_nombre ?? expediente.nombre_facturacion ?? expediente.nombre_cliente_facturacion} />
                    <Dato campo="Apellidos" valor={expediente.facturacion_apellidos ?? expediente.apellidos_facturacion ?? expediente.apellidos_cliente_facturacion} />
                    <Dato campo="DNI / NIF de facturación" valor={expediente.facturacion_dni_nif ?? expediente.dni_facturacion ?? expediente.nif_facturacion} />
                    <Dato campo="Dirección" valor={expediente.facturacion_direccion ?? expediente.direccion_facturacion ?? expediente.direccion_cliente_facturacion} />
                    <Dato campo="Código postal" valor={expediente.facturacion_codigo_postal ?? expediente.codigo_postal_facturacion ?? expediente.cp_facturacion} />
                    <Dato campo="Población" valor={expediente.facturacion_poblacion ?? expediente.poblacion_facturacion ?? expediente.municipio_facturacion} />
                    <Dato campo="Provincia" valor={expediente.facturacion_provincia ?? expediente.provincia_facturacion} />
                    <Dato campo="Teléfono" valor={expediente.facturacion_telefono ?? expediente.telefono_facturacion ?? expediente.telefono_cliente_facturacion} />
                    <Dato campo="Email" valor={expediente.facturacion_email ?? expediente.email_facturacion ?? expediente.correo_facturacion} />
                  </div>
                </div>
                  <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-indigo-700">Tipo de documento y cuantía</p>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Dato campo="Notario" valor={expediente.nombre_notario || expediente.notario} />
                    <Dato campo="NIF notario" valor={expediente.nif_notario} />
                    <Dato campo="Población notario" valor={expediente.poblacion} />
                    <Dato campo="Provincia notario" valor={expediente.provincia} />
                    <Dato campo="Formato de escritura" valor={expediente.formato_escritura ?? expediente.formato_escritura_notarial} />
                    <Dato campo="Tipo de trámite" valor={expediente.tipo_tramite ?? expediente.tipo_tramite_notarial ?? expediente.tramite} />
                    <Dato campo="Escritura firmada" valor={expediente.escritura_firmada === true ? "Sí" : expediente.escritura_firmada === false ? "No" : null} />
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

            return `${Number(documento.cuantia).toLocaleString(
              "es-ES",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )} €`;
          })
          .join(" | ")
      : expediente.cuantia != null
        ? `${Number(expediente.cuantia).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} €`
        : null
  }
/>
                    </div>

                    {(expediente.fecha_envio_notario || expediente.fecha_envio) && (
                      <section className="mt-4 rounded-xl border border-indigo-100 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">Gastos del expediente</h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Registra los gastos derivados de la escritura. El importe del gasto es independiente de la cuantía del documento formalizado.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setErrorGastos("");
                              setMensajeGastos("");
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

                        {mostrarFormularioGasto && (
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
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Concepto del gasto *</span><select required value={gastoForm.tipo} onChange={(e) => setGastoForm((a) => ({...a, tipo:e.target.value, descripcion:a.descripcion || e.target.options[e.target.selectedIndex]?.text || e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">{cargandoConceptosGasto ? "Cargando catálogo…" : "Selecciona un concepto"}</option>{conceptosGasto.map((c) => <option key={String(c.value)} value={String(c.value)}>{c.label}</option>)}</select></label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">NIF/CIF/NIE notario</span><input value={gastoForm.nif_notario} onChange={(e)=>setGastoForm(a=>({...a,nif_notario:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Nombre del notario</span><input value={gastoForm.nombre_notario} onChange={(e)=>setGastoForm(a=>({...a,nombre_notario:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                </div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Pagador / razón social</span><input value={gastoForm.pagador} onChange={(e)=>setGastoForm(a=>({...a,pagador:e.target.value}))} placeholder="Nombre de facturación" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Número de factura</span><input value={gastoForm.numero_factura} onChange={(e)=>setGastoForm(a=>({...a,numero_factura:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                  <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Fecha de factura *</span><input required type="date" value={gastoForm.fecha_factura} onChange={(e)=>setGastoForm(a=>({...a,fecha_factura:e.target.value,fecha:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                </div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Cuenta bancaria / IBAN</span><input value={gastoForm.cuenta_bancaria} onChange={(e)=>setGastoForm(a=>({...a,cuenta_bancaria:e.target.value.toUpperCase()}))} placeholder="ES… (editable; no se autocompleta)" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Medio de pago</span><select value={gastoForm.medio_pago} onChange={(e)=>setGastoForm(a=>({...a,medio_pago:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>Transferencia</option><option>Cheque</option><option>Tarjeta</option><option>Efectivo</option><option>Otro</option></select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Estado</span><select value={gastoForm.estado_pago} onChange={(e)=>setGastoForm(a=>({...a,estado_pago:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>Pendiente</option><option>Pagado</option><option>Anulado</option></select></label></div>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Documento / URL de factura</span><input type="url" value={gastoForm.documento_url} onChange={(e)=>setGastoForm(a=>({...a,documento_url:e.target.value}))} placeholder="https://…" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                              </div>
                              </div>
                              <div className="space-y-3">
                                <h6 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Impuestos y retenciones</h6>
                                <label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tramo de impuesto</span><select value={gastoForm.tramo_impuesto} onChange={(e)=>setGastoForm(a=>({...a,tramo_impuesto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{["Exento","General","Reducido","Super reducido","Único"].map(x=><option key={x}>{x}</option>)}</select></label>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Tipo impositivo</span><select value={gastoForm.tipo_impuesto} onChange={(e)=>{const v=e.target.value;setGastoForm(a=>({...a,tipo_impuesto:v,porcentaje_impuesto:v==="IVA 21%"?"21":v==="IGIC 5%"?"5":v==="IGIC 6,50%"?"6.5":v==="IGIC 7%"?"7":"0"}))}} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{["Exento","IVA 21%","IGIC 5%","IGIC 6,50%","IGIC 7%"].map(x=><option key={x}>{x}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Porcentaje (%)</span><input type="number" min="0" max="100" step="0.01" value={gastoForm.porcentaje_impuesto} onChange={(e)=>setGastoForm(a=>({...a,porcentaje_impuesto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="grid gap-3 sm:grid-cols-2">{[["Base exenta (€)","base_exenta_impuestos"],["Base sujeta (€)","base_sujeta_impuestos"]].map(([label,key])=><label key={key} className="block"><span className="mb-1 block text-xs font-bold text-slate-700">{label}</span><input type="number" min="0" step="0.01" value={gastoForm[key]} onChange={(e)=>setGastoForm(a=>({...a,[key]:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>)}</div>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><div className="flex justify-between"><span>Impuesto calculado</span><strong>{impuestoCalculadoGasto.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div></div>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Base exenta retención (€)</span><input type="number" min="0" step="0.01" value={gastoForm.base_exenta_retencion} onChange={(e)=>setGastoForm(a=>({...a,base_exenta_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Base sujeta retención (€)</span><input type="number" min="0" step="0.01" value={gastoForm.base_sujeta_retencion} onChange={(e)=>setGastoForm(a=>({...a,base_sujeta_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">Retención</span><select value={gastoForm.tipo_retencion} onChange={(e)=>setGastoForm(a=>({...a,tipo_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option>IRPF profesionales</option><option>Sin retención</option></select></label><label className="block"><span className="mb-1 block text-xs font-bold text-slate-700">IRPF (%)</span><input type="number" min="1" max="21" step="0.01" value={gastoForm.porcentaje_retencion} onChange={(e)=>setGastoForm(a=>({...a,porcentaje_retencion:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
                                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div className="flex justify-between text-xs text-slate-600"><span>Retención calculada</span><strong>{retencionCalculadaGasto.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div className="mt-2 flex items-end justify-between gap-3"><span className="text-xs font-bold text-indigo-900">Resultado calculado</span><strong className="text-2xl text-indigo-950">{resultadoCalculadoGasto.toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><label className="mt-3 block"><span className="mb-1 block text-xs font-bold text-slate-700">Total bruto de factura (€) *</span><input required type="number" min="0" step="0.01" value={gastoForm.importe_total_bruto} onChange={(e)=>setGastoForm(a=>({...a,importe_total_bruto:e.target.value}))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div>
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
                        )}

                        <div className="mt-3">
                          {cargandoGastos ? (
                            <p className="py-3 text-xs text-slate-500">Cargando gastos…</p>
                          ) : gastosExpediente.length === 0 ? (
                            <p className="py-3 text-xs text-slate-500">Todavía no hay gastos registrados en este expediente.</p>
                          ) : (
                            <ul className="divide-y divide-slate-100">
                              {gastosExpediente.map((gasto) => (
                                <li key={gasto.id} className="flex flex-wrap items-center gap-3 py-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-800">{gasto.descripcion || gasto.tipo || "Gasto"}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                      {[gasto.tipo, gasto.fecha ? formatearFecha(gasto.fecha) : null].filter(Boolean).join(" · ")}
                                    </p>
                                  </div>
                                  <span className="text-sm font-extrabold text-slate-800">
                                    {gasto.importe == null ? "—" : `${Number(gasto.importe).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                                  </span>
                                  <button type="button" onClick={() => eliminarGastoExpediente(gasto)} className="rounded-md px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50">
                                    Eliminar
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </section>
                    )}
                </div>
                </>}
                {actividadActual === "documentacion-previa" && (
                  <div className="flex justify-center border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setMostrarEnviarNotario(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
                    >
                      🏛️ {expediente.fecha_envio_notario || expediente.fecha_envio ? "Revisar / modificar encargo" : "Enviar a notario"}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

  {mostrarCarpetaDigital && (
        <CarpetaDigitalModal
          expedienteId={id || expediente?.id_expediente || expediente?.id}
          onClose={() => setMostrarCarpetaDigital(false)}
        />
      )}


      {/* =====================================================
          MODAL ACTIVIDADES
      ====================================================== */}

      <Modal
        open={
          mostrarActividades
        }
        onClose={() =>
          setMostrarActividades(false)
        }
        titulo="⚙️ Actividades del expediente"
        subtitulo={
          actividadSeleccionada === "documentacion-previa"
            ? ""
            : `Expediente ${valorVisible(
                expediente.id_expediente
              )} · actividad actual: ${valorVisible(
                expediente.actividad_actual
              )}`
        }
        ancho="max-w-[1200px]"
        footer={
          <Boton
            onClick={() =>
              setMostrarActividades(false)
            }
          >
            Cerrar
          </Boton>
        }
      >

        <div
          className="
            grid
            grid-cols-1
            gap-4
            lg:grid-cols-[280px_minmax(0,1fr)]
          "
        >

          {/* MENU ACTIVIDADES */}

          <div
            className="
              space-y-2
            "
          >

            {ACTIVIDADES_EXPEDIENTES.map(
              (actividad) => {

                const activa =
                  actividad.key ===
                  actividadSeleccionada;

                const esActual =
                  actividad.key ===
                  actividadActual;

                return (
                  <button
                    key={
                      actividad.key
                    }
                    type="button"
                    onClick={() => {
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
                      w-full
                      rounded-xl
                      border
                      p-3
                      text-left
                      transition
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
                        items-center
                        gap-3
                      "
                    >

                      <span
                        className="
                          text-lg
                        "
                      >
                        {
                          actividad.icono
                        }
                      </span>

                      <span
                        className={`
                          text-xs
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
                );
              }
            )}

          </div>


          {/* DETALLE */}

          <div
            className="
              min-w-0
              rounded-2xl
              border
              border-slate-200
              bg-slate-50/70
              p-4
            "
          >

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

              <div>

                <h3
                  className="
                    text-base
                    font-bold
                    text-slate-800
                  "
                >
                  {
                    actividadSeleccionadaDef.icono
                  }{" "}
                  {
                    actividadSeleccionadaDef.label
                  }
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Campos de esta actividad
                </p>

              </div>

              {actividadSeleccionada !== "documentacion-previa" && actividadSeleccionada ===
                actividadActual && (
                <EstadoBadge
                  valor="Actividad actual"
                />
              )}

            </div>


            {actividadSeleccionada === "documentacion-previa" && (
              <div className="mb-4 space-y-4">
                <CarpetaDigitalModal
                  expedienteId={expediente?.id_expediente || id}
                  modoActividad
                  onDocumentosChange={setDocumentosCarpetaPrevia}
                />

                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-extrabold text-slate-800">Cambio de actividad para informar a ABSIS</h4>
                    <p className="mt-1 text-xs text-slate-500">Estos datos se guardan para el expediente y no modifican las otras actividades.</p>
                  </div>
                  {cargandoEstadoAbsis ? <p className="text-xs text-slate-500">Cargando estado de ABSIS…</p> : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="rounded-lg border border-slate-200 p-3">
                      <span className="mb-2 block text-xs font-bold text-slate-700">Certificado Saldo «0» erróneo</span>
                      <select value={estadoDocumentacionAbsis.certificado_saldo_cero_erroneo ? "si" : "no"} onChange={(e) => setEstadoDocumentacionAbsis((a) => ({ ...a, certificado_saldo_cero_erroneo: e.target.value === "si" }))} disabled={enviandoAbsis} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
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
                    <p className="text-xs font-bold text-slate-700">Documentos que se informan a ABSIS</p>
                    {[
                      ["solicitud_cancelacion_notarial", "Hoja de Encargo firmada"],
                      ["certificado_cancelacion_administrativo", "Justificante de cancelación"],
                      ["nota_simple_registral", "Nota simple registral"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700">
                        <input type="checkbox" checked={!!estadoDocumentacionAbsis[key]} onChange={(e) => setEstadoDocumentacionAbsis((a) => ({ ...a, [key]: e.target.checked }))} disabled={enviandoAbsis} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                        <span className="flex-1">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                    <span className="mb-2 block text-xs font-extrabold text-slate-700">Mover el expediente a la siguiente actividad</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="moverActividadPrevia" checked={!!estadoDocumentacionAbsis.mover_siguiente_actividad} onChange={() => setEstadoDocumentacionAbsis((a) => ({ ...a, mover_siguiente_actividad: true }))} disabled={enviandoAbsis} />Sí</label>
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="moverActividadPrevia" checked={!estadoDocumentacionAbsis.mover_siguiente_actividad} onChange={() => setEstadoDocumentacionAbsis((a) => ({ ...a, mover_siguiente_actividad: false }))} disabled={enviandoAbsis} />No</label>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">Al confirmar el avance, el backend comprobará el envío a notario y los tres documentos obligatorios.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Boton onClick={() => guardarEstadoAbsis(false)} disabled={enviandoAbsis || cargandoEstadoAbsis}>{enviandoAbsis ? "Guardando…" : "💾 Guardar datos ABSIS"}</Boton>
                    <Boton tipo="primary" onClick={() => guardarEstadoAbsis(true)} disabled={enviandoAbsis || cargandoEstadoAbsis}>{enviandoAbsis ? "Procesando…" : estadoDocumentacionAbsis.enviado_a_absis ? "✓ Registrado para ABSIS" : "📨 Enviar a ABSIS"}</Boton>
                  </div>
                  {estadoDocumentacionAbsis.enviado_a_absis && <p className="mt-2 text-right text-xs font-semibold text-emerald-700">Solicitud registrada para ABSIS.</p>}
                </section>
              </div>
            )}

            {actividadSeleccionada === "sede-notarial" && (
              <section className="mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Datos de Sede notarial</h3>
                  <span className="text-[11px] font-medium text-slate-500">Datos guardados desde «Enviar a notario»</span>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <Dato campo="Expediente" valor={expediente?.id_expediente ?? expediente?.expediente} />
                  <Dato campo="Notario" valor={expediente?.nombre_notario ?? expediente?.notario} />
                  <Dato campo="Tipo de documento" valor={expediente?.tipo_documento ?? expediente?.documentos_escritura?.map((d) => d?.tipo_documento).filter(Boolean).join(" · ")} />
                  <Dato campo="Cuantía" valor={expediente?.cuantia ?? expediente?.documentos_escritura?.[0]?.cuantia ?? expediente?.finca_cuantia} tipo="numero" />
                  <Dato campo="Formato de escritura" valor={expediente?.formato_escritura ?? expediente?.formato_escritura_notarial} />
                  <Dato campo="Tipo de trámite" valor={expediente?.tipo_tramite ?? expediente?.tipo_tramite_notarial ?? expediente?.tramite} />
                  <Dato campo="Fecha de envío" valor={expediente?.fecha_envio_notario || expediente?.fecha_envio} tipo="fecha" />
                  <Dato campo="Fecha solicitud PNC" valor={expediente?.fecha_solicitud_pnc ?? expediente?.fecha_pnc ?? expediente?.pnc_fecha_solicitud} tipo="fecha" />
                  <Dato campo="N.º de solicitud" valor={expediente?.numero_solicitud_pnc ?? expediente?.num_solicitud_pnc ?? expediente?.pnc_numero_solicitud} />
                  <Dato campo="Fecha prevista de firma" valor={expediente?.fecha_prevista_firma} tipo="fecha" />
                  <Dato campo="Hora prevista" valor={expediente?.hora_prevista_firma} />
                  <Dato campo="Fin previsto" valor={expediente?.fin_previsto_firma ?? expediente?.hora_fin_prevista ?? sumarUnaHoraTexto(expediente?.hora_prevista_firma)} />
                  <Dato campo="Modalidad de firma" valor={expediente?.tipo_firma ?? expediente?.tipo_firma_notarial} />
                  <Dato campo="Idioma" valor={expediente?.idioma_documento ?? expediente?.idioma ?? expediente?.lengua_documento} />
                  <Dato campo="Escritura firmada" valor={expediente?.escritura_firmada === true || expediente?.escritura_firmada === "Sí" ? "Sí" : expediente?.escritura_firmada === false || expediente?.escritura_firmada === "No" ? "No" : null} />
                </div>
              </section>
            )}

            {actividadSeleccionada !== "documentacion-previa" && (
              <div
                className="
                  grid
                  grid-cols-1
                  gap-2
                  sm:grid-cols-2
                  xl:grid-cols-3
                "
              >

              {(actividadSeleccionada === "sede-notarial"
                ? camposActividad.filter((campo) => CAMPOS_COMUNES_ACTIVIDAD.some((item) => item.key === campo.key))
                : camposActividad
              ).map((campo) => {
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
                    <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{campo.label}</span>
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
                      📁 Abrir carpeta digital
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-extrabold text-slate-700">Mover el expediente a la siguiente actividad</p>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadProtocolo" checked={!!actividadDraft.mover_siguiente_actividad} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: true }))} disabled={guardandoActividad || enviandoAbsis} /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadProtocolo" checked={!actividadDraft.mover_siguiente_actividad} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: false }))} disabled={guardandoActividad || enviandoAbsis} /> No
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">La selección se incluye en la solicitud enviada a ABSIS.</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Boton tipo="primary" onClick={enviarSedeNotarialProtocoloAbsis} disabled={guardandoActividad || enviandoAbsis}>
                    {enviandoAbsis ? "Enviando…" : "📨 Enviar a ABSIS"}
                  </Boton>
                </div>
              </section>
            )}

            {actividadSeleccionada === "defectos-registrales" && (
              <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/30 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">Carpeta digital de defectos</h3>
                  <p className="mt-1 text-xs text-slate-500">Dos categorías separadas para la calificación registral y la documentación de subsanación.</p>
                </div>
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
                      📁 Abrir carpeta digital
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-extrabold text-slate-700">Mover el expediente a la siguiente actividad</p>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadLiquidacion" checked={actividadDraft.mover_siguiente_actividad !== false} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: true }))} disabled={guardandoActividad || enviandoAbsis} /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadLiquidacion" checked={actividadDraft.mover_siguiente_actividad === false} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: false }))} disabled={guardandoActividad || enviandoAbsis} /> No
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Boton tipo="primary" onClick={() => enviarActividadAbsis("liquidacion-impuestos")} disabled={guardandoActividad || enviandoAbsis}>
                    {enviandoAbsis ? "Enviando…" : "📨 Enviar a ABSIS"}
                  </Boton>
                </div>
              </section>
            )}

            {actividadSeleccionada === "tramitacion-inscripcion" && (
              <section className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-extrabold text-slate-700">Hoja de inscripción</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {actividadDraft?.escritura_simple_cancelacion || expediente?.escritura_simple_cancelacion
                        ? "Hay una referencia guardada al documento de inscripción."
                        : "Pendiente de que se incorpore la hoja de inscripción a la carpeta digital."}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">La subida y vinculación automática desde Notargest requiere conectar la integración documental.</p>
                    <button type="button" onClick={() => setMostrarCarpetaDigital(true)} className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                      📁 Abrir carpeta digital
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-extrabold text-slate-700">Mover el expediente a la siguiente actividad</p>
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadInscripcion" checked={actividadDraft.mover_siguiente_actividad !== false} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: true }))} disabled={guardandoActividad || enviandoAbsis} /> Sí
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="radio" name="moverActividadInscripcion" checked={actividadDraft.mover_siguiente_actividad === false} onChange={() => setActividadDraft((actual) => ({ ...actual, mover_siguiente_actividad: false }))} disabled={guardandoActividad || enviandoAbsis} /> No
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Boton tipo="primary" onClick={() => enviarActividadAbsis("tramitacion-inscripcion")} disabled={guardandoActividad || enviandoAbsis}>
                    {enviandoAbsis ? "Enviando…" : "📨 Enviar a ABSIS"}
                  </Boton>
                </div>
              </section>
            )}

            {actividadSeleccionada === "facturacion-cierre" && (
              <div className="mt-4 space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Resumen de actividades y documentos</h3>
                      <p className="mt-1 text-xs text-slate-500">Actividades del expediente y documentos visibles en la carpeta digital.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={cargarDocumentosCierre}
                        disabled={cargandoDocumentosCierre}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {cargandoDocumentosCierre ? "Actualizando…" : "↻ Actualizar documentos"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarCarpetaDigital(true)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        📁 Consultar carpeta digital
                      </button>
                    </div>
                  </div>
                  {cargandoDocumentosCierre && <p className="mt-3 text-xs text-slate-500">Cargando documentos de la carpeta digital…</p>}
                  {errorDocumentosCierre && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorDocumentosCierre}</p>}
                  <div className="mt-3 space-y-2">
                    {ACTIVIDADES_EXPEDIENTES.map((actividad, indice) => {
                      const documentosActividad = (Array.isArray(documentosCierre) ? documentosCierre : []).filter((doc) => {
                        const nombreActividad = String(
                          doc?.actividad || doc?.actividad_nombre || doc?.nombre_actividad ||
                          doc?.fase || doc?.categoria_actividad || doc?.metadata?.actividad || ""
                        ).toLowerCase();
                        const etiqueta = `${actividad.key} ${actividad.label}`.toLowerCase();
                        if (!nombreActividad) return false;
                        return nombreActividad.includes(actividad.key.toLowerCase()) ||
                          nombreActividad.includes(actividad.label.toLowerCase()) ||
                          (actividad.key === "facturacion-cierre" && nombreActividad.includes("cierre"));
                      });
                      return (
                        <article key={actividad.key} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-lg">{actividad.icono}</span>
                              <div>
                                <p className="text-xs font-bold text-slate-800">{indice + 1}. {actividad.label}</p>
                                <p className="text-[11px] text-slate-500">
                                  {actividad.key === actividadActual ? "Actividad actual" : "Actividad del circuito"}
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                              {documentosActividad.length} documento(s)
                            </span>
                          </div>
                          {documentosActividad.length > 0 ? (
                            <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                              {documentosActividad.map((doc, docIndex) => (
                                <li key={doc?.id || doc?.id_documento || doc?.url || docIndex} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="font-medium text-slate-700">{doc?.nombre || doc?.nombre_archivo || doc?.filename || doc?.titulo || `Documento ${docIndex + 1}`}</span>
                                  {(doc?.url || doc?.url_descarga || doc?.ruta || doc?.download_url) && (
                                    <a href={doc.url || doc.url_descarga || doc.ruta || doc.download_url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">Abrir documento</a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-[11px] text-slate-400">No hay documentos de esta actividad cargados en la lista disponible. Si el documento está en la carpeta digital, revisa allí su categoría/actividad.</p>
                          )}
                        </article>
                      );
                    })}
                    {documentosCierre.filter((doc) => {
                      const nombreActividad = String(
                        doc?.actividad || doc?.actividad_nombre || doc?.nombre_actividad ||
                        doc?.fase || doc?.categoria_actividad || doc?.metadata?.actividad ||
                        doc?.categoria_actividad_nombre || ""
                      ).toLowerCase();
                      return !nombreActividad || !ACTIVIDADES_EXPEDIENTES.some((actividad) =>
                        nombreActividad.includes(actividad.key.toLowerCase()) ||
                        nombreActividad.includes(actividad.label.toLowerCase()) ||
                        (actividad.key === "facturacion-cierre" && nombreActividad.includes("cierre"))
                      );
                    }).length > 0 && (
                      <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                        <p className="text-xs font-bold text-slate-800">Documentos sin actividad identificada</p>
                        <p className="mt-1 text-[11px] text-slate-500">Estos documentos están en la carpeta digital, pero no incluyen una actividad reconocible en sus metadatos.</p>
                        <ul className="mt-2 space-y-1 border-t border-amber-100 pt-2">
                          {documentosCierre.filter((doc) => {
                            const nombreActividad = String(
                              doc?.actividad || doc?.actividad_nombre || doc?.nombre_actividad ||
                              doc?.fase || doc?.categoria_actividad || doc?.metadata?.actividad ||
                              doc?.categoria_actividad_nombre || ""
                            ).toLowerCase();
                            return !nombreActividad || !ACTIVIDADES_EXPEDIENTES.some((actividad) =>
                              nombreActividad.includes(actividad.key.toLowerCase()) ||
                              nombreActividad.includes(actividad.label.toLowerCase()) ||
                              (actividad.key === "facturacion-cierre" && nombreActividad.includes("cierre"))
                            );
                          }).map((doc, docIndex) => (
                            <li key={doc?.id || doc?.id_documento || docIndex} className="text-xs text-slate-700">
                              {doc?.nombre_original || doc?.nombre || doc?.nombre_archivo || doc?.filename || `Documento ${docIndex + 1}`}
                              {doc?.categoria || doc?.categoria_nombre ? ` · ${doc.categoria || doc.categoria_nombre}` : ""}
                            </li>
                          ))}
                        </ul>
                      </article>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-extrabold text-slate-800">Garantías</h3>
                    <p className="mt-1 text-xs text-slate-500">Fincas y registros vinculados al expediente.</p>
                  </div>
                  {errorFincas && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorFincas}</p>}
                  {cargandoFincas ? (
                    <p className="text-xs text-slate-500">Cargando garantías…</p>
                  ) : fincasExpediente.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">No hay fincas ni registros vinculados.</p>
                  ) : (
                    <div className="space-y-2">
                      {fincasExpediente.map((finca, i) => (
                        <article key={finca.id || `${finca.finca}-${i}`} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs font-bold text-slate-800">Finca {finca.finca || finca.numero_finca || "—"}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                            <div><span className="block text-slate-400">Registro</span><strong>{finca.registro || "—"}</strong></div>
                            <div><span className="block text-slate-400">Sección</span><strong>{finca.seccion || "—"}</strong></div>
                            <div><span className="block text-slate-400">Población</span><strong>{finca.poblacion || "—"}</strong></div>
                            <div><span className="block text-slate-400">Provincia</span><strong>{finca.provincia || "—"}</strong></div>
                            <div><span className="block text-slate-400">CRU/Idufir</span><strong>{finca.cru_idufir || "—"}</strong></div>
                            <div><span className="block text-slate-400">Inscripción</span><strong>{finca.inscripcion || "—"}</strong></div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Honorarios de gestoría</h3>
                      <p className="mt-1 text-xs text-slate-600">Canarias: 69 € · CaixaBank: 83 € · Otras entidades: 111 €.</p>
                    </div>
                    <button
                      type="button"
                      onClick={generarHonorariosGestoria}
                      disabled={generandoHonorariosGestoria}
                      className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {generandoHonorariosGestoria ? "Generando…" : "💶 Generar honorarios de gestoría"}
                    </button>
                  </div>
                  {honorariosGestoria && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Tarifa aplicada: {honorariosGestoria.tarifa}</p>
                      <p className="mt-1 text-2xl font-extrabold text-emerald-800">
                        {Number(honorariosGestoria.importe).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
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
                <Boton tipo="primary" onClick={guardarCamposActividad} disabled={guardandoActividad}>
                  {guardandoActividad ? "Guardando…" : "💾 Guardar datos de actividad"}
                </Boton>
              )}
              {actividadSeleccionada === "documentacion-previa" && actividadActual === "documentacion-previa" && (
                <Boton tipo="primary" onClick={avanzarActividad} disabled={guardandoActividad || !estadoDocumentacionAbsis.mover_siguiente_actividad}>
                  {guardandoActividad ? "Validando…" : "➡️ Mover a Sede notarial sin protocolo"}
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

          </div>

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
        {guardandoDefecto ? "Guardando…" : "💾 Guardar defecto"}
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
                    📄 Descargar PDF
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
          Fecha Notificación Registro
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            value={defectoForm.fecha_notificacion_registro}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                fecha_notificacion_registro: e.target.value,
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
        titulo={fincaEditandoId !== null ? "🏠 Editar finca" : "🏠 Nueva finca"}
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
              {guardandoFinca ? "Guardando..." : "💾 Guardar finca"}
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

          <CampoSelect
            label="Provincia"
            value={fincaForm.provincia}
            opciones={PROVINCIAS_FINCA}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                provincia: valor,
              }))
            }
          />

          <CampoFormulario
            label="Población"
            value={fincaForm.poblacion}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                poblacion: valor,
              }))
            }
          />

          <CampoFormulario
            label="Registro (número - Nombre)"
            value={fincaForm.registro}
            onChange={(valor) =>
              setFincaForm((actual) => ({
                ...actual,
                registro: valor,
              }))
            }
          />

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
        💾 Asignar acción
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
        titulo="💬 Observaciones"
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
              {guardandoObservacion ? "Guardando…" : "💾 Guardar comentario"}
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
                md:grid-cols-3
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

        </div>

      </Modal>


      {/* =====================================================
          MODAL ENVIAR A NOTARIO
      ====================================================== */}

      {mostrarEnviarNotario && (
        <EnviarANotarioModal
          expediente={
            expediente
          }
          cuantiaFincas={cuantiaFincasParaEnvio}
          onClose={() =>
            setMostrarEnviarNotario(
              false
            )
          }
          onGuardar={
            guardarEnviarANotario
          }
        />
      )}

          </div>
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
}) {
  return (
    <label
      className={`
        flex
        cursor-pointer
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
