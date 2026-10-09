import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useParams } from "react-router-dom";

import { obtenerExpediente, obtenerListadoExpedientes, enviarExpedienteANotario } from "../../api/expedientes";

import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";

import { obtenerCatalogoAcciones, obtenerAccionesExpediente, asignarAccionExpediente, eliminarAccionExpediente } from "../../api/expedienteAcciones";

import {
  listarDefectosExpediente,
  crearDefectoExpediente,
  actualizarDefectoExpediente,
  registrarSubsanacionDefecto,
  subirCalificacionRegistro,
  obtenerCalificacionRegistro,
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
    label: "Facturación y cierre",
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

const DEFECTO_VACIO = {
  documento: "CANCELACIÓN DE CONDICIÓN RESOLUTORIA",
  motivo_defecto: "",
  subtipo_defecto: "",
  fecha_notificacion_registro: "",
  fecha_vencimiento_presentacion: "",
  calificacion_registro: "",
  observaciones_registro: "",
  fecha_entrada_subsanacion: "",
};

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
      label: "Asiento presentación libro diario",
    },

    {
      key: "fecha_presentacion",
      label: "Fecha presentación",
      tipo: "fecha",
    },

    {
      key: "numero_entrada",
      label: "Número entrada",
    },

    {
      key: "fecha_recogida_notario_presentacion_telematica",
      label:
        "Fecha recogida notario / presentación telemática",
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
      key: "ultima_accion",
      label: "Última acción",
    },

    {
      key: "fecha_ultima_accion",
      label: "Fecha última acción",
      tipo: "fecha",
    },

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
      label: "Oficina liquidadora",
    },

    {
      key: "base_imponible",
      label: "Base imponible",
      tipo: "numero",
    },

    {
      key: "tributacion",
      label: "Tributación",
    },

    {
      key: "impuesto_ajd_itp",
      label: "Impuesto AJD / ITP",
    },
  ],

  "tramitacion-inscripcion": [
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
      key: "fecha_presentacion",
      label: "Fecha presentación",
      tipo: "fecha",
    },

    {
      key: "fecha_vencimiento_asiento",
      label: "Fecha vencimiento asiento",
      tipo: "fecha",
    },

    {
      key: "fecha_inscripcion",
      label: "Fecha inscripción",
      tipo: "fecha",
    },

    {
      key: "escritura_simple_cancelacion",
      label: "Escritura simple cancelación",
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
        px-2
        py-2
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
            text-xs
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

  const [
    mostrarDefecto,
    setMostrarDefecto,
  ] = useState(false);

  const [
    mostrarEnviarNotario,
    setMostrarEnviarNotario,
  ] = useState(false);

  const [
    mostrarFincas,
    setMostrarFincas,
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
const [defectoForm, setDefectoForm] = useState({ ...DEFECTO_VACIO });
const [defectoEditandoId, setDefectoEditandoId] = useState(null);
const [guardandoDefecto, setGuardandoDefecto] = useState(false);
const [errorDefecto, setErrorDefecto] = useState("");
const [archivoCalificacion, setArchivoCalificacion] = useState(null);
  
  // ----------------------------------------------------------
  // PPAD — CONCEPTOS DEL EXPEDIENTE
  // Se conservan por expediente en este navegador.
  // ----------------------------------------------------------
  const [ppadItems, setPpadItems] = useState([]);
  const [mostrarFormularioPpad, setMostrarFormularioPpad] = useState(false);
  const [ppadEditandoId, setPpadEditandoId] = useState(null);
  const [ppadForm, setPpadForm] = useState({
    concepto: "",
    importe: "",
    imputableA: "Molsan",
  });

  // OBSERVACIONES DEL EXPEDIENTE (guardado local en este navegador)
  const [observacionesExpediente, setObservacionesExpediente] = useState([]);
  const [mostrarFormularioObservacion, setMostrarFormularioObservacion] = useState(false);
  const [nuevaObservacion, setNuevaObservacion] = useState("");
  const [visibilidadObservacion, setVisibilidadObservacion] = useState({
    interno: true,
    notario: false,
    apoderado: false,
  });

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

          try {
            const ppadGuardados = JSON.parse(
              localStorage.getItem(
                `erp_expediente_ppad_${datos?.id_expediente || id}`
              ) || "[]"
            );
            setPpadItems(Array.isArray(ppadGuardados) ? ppadGuardados : []);
          } catch {
            setPpadItems([]);
          }

          try {
            const observacionesGuardadas = JSON.parse(
              localStorage.getItem(
                `erp_expediente_observaciones_${datos?.id_expediente || id}`
              ) || "[]"
            );
            setObservacionesExpediente(
              Array.isArray(observacionesGuardadas) ? observacionesGuardadas : []
            );
          } catch {
            setObservacionesExpediente([]);
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
    setActividadSeleccionada(
      actividadActual
    );

    setMostrarActividades(true);
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

async function abrirDefecto() {
  setErrorDefecto("");
  setDefectoEditandoId(null);
  setDefectoForm({ ...DEFECTO_VACIO });
  setArchivoCalificacion(null);
  setMostrarDefecto(true);

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
    documento: defecto.documento || DEFECTO_VACIO.documento,
    motivo_defecto: defecto.motivo_defecto || "",
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
  // OBSERVACIONES DEL EXPEDIENTE
  // ==========================================================

  function guardarObservacionesExpediente(lista) {
    setObservacionesExpediente(lista);
    try {
      localStorage.setItem(
        `erp_expediente_observaciones_${expediente?.id_expediente || id}`,
        JSON.stringify(lista)
      );
    } catch (err) {
      console.error("No se pudieron guardar las observaciones localmente:", err);
    }
  }

  function obtenerNombreUsuarioActual() {
    const claves = ["user", "usuario", "currentUser", "auth-storage", "authStore", "user-storage"];
    for (const clave of claves) {
      try {
        const valor = localStorage.getItem(clave);
        if (!valor) continue;
        const datos = JSON.parse(valor);
        const candidatos = [datos, datos?.state?.user, datos?.user, datos?.usuario, datos?.empleado];
        for (const candidato of candidatos) {
          const nombre = candidato?.nombre_completo || candidato?.nombreCompleto || candidato?.nombre || candidato?.full_name || candidato?.username || candidato?.usuario || candidato?.email;
          if (nombre && typeof nombre === "string") return nombre;
        }
      } catch {
        // La clave puede no contener JSON; se prueba la siguiente.
      }
    }
    return "Usuario conectado";
  }

  function agregarObservacionExpediente() {
    const texto = nuevaObservacion.trim();
    if (!texto) return;

    const destinos = [];
    if (visibilidadObservacion.interno) destinos.push("Departamento interno");
    if (visibilidadObservacion.notario) destinos.push("Notario");
    if (visibilidadObservacion.apoderado) destinos.push("Apoderado");

    const observacion = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      comentario: texto,
      autor: obtenerNombreUsuarioActual(),
      fecha: new Date().toISOString(),
      visibilidad: destinos.length ? destinos : ["Departamento interno"],
    };
    guardarObservacionesExpediente([observacion, ...observacionesExpediente]);
    setNuevaObservacion("");
    setVisibilidadObservacion({ interno: true, notario: false, apoderado: false });
    setMostrarFormularioObservacion(false);
  }

  function eliminarObservacionExpediente(observacionId) {
    guardarObservacionesExpediente(
      observacionesExpediente.filter((item) => item.id !== observacionId)
    );
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


  function guardarObservacion() {
    console.log(
      "OBSERVACION EXPEDIENTE:",
      {
        expediente:
          expediente?.id_expediente,
        comentario,
        visiones:
          visionesComentario,
      }
    );

    /*
     * Dejamos la observación inmediatamente visible
     * en la ficha.
     *
     * La persistencia definitiva se conectará al
     * sistema de observaciones/mensajes.
     */

    setExpediente(
      (actual) => ({
        ...actual,
        observaciones:
          comentario,
      })
    );

    setMostrarObservaciones(false);
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



    function abrirNuevoPpad() {
    setPpadEditandoId(null);
    setPpadForm({ concepto: "", importe: "", imputableA: "Molsan" });
    setMostrarFormularioPpad(true);
  }

  function editarPpad(item) {
    setPpadEditandoId(item.id);
    setPpadForm({
      concepto: item.concepto || "",
      importe: item.importe ?? "",
      imputableA: item.imputableA || "Molsan",
    });
    setMostrarFormularioPpad(true);
  }

  function cancelarPpad() {
    setMostrarFormularioPpad(false);
    setPpadEditandoId(null);
    setPpadForm({ concepto: "", importe: "", imputableA: "Molsan" });
  }

  function aceptarPpad() {
    const concepto = ppadForm.concepto.trim();
    const importeTexto = String(ppadForm.importe).trim();
    if (!concepto || !importeTexto) return;

    const importeNormalizado = importeTexto.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
    const importeNumero = Number(importeNormalizado);
    if (!Number.isFinite(importeNumero)) return;

    const nuevo = {
      id: ppadEditandoId || `ppad-${Date.now()}`,
      concepto,
      importe: importeNumero,
      imputableA: ppadForm.imputableA === "Externo" ? "Externo" : "Molsan",
    };
    const actualizados = ppadEditandoId
      ? ppadItems.map((item) => item.id === ppadEditandoId ? nuevo : item)
      : [...ppadItems, nuevo];
    setPpadItems(actualizados);
    try {
      localStorage.setItem(
        `erp_expediente_ppad_${expediente?.id_expediente || id}`,
        JSON.stringify(actualizados)
      );
    } catch (err) {
      console.error("No se han podido guardar los datos PPAD en este navegador:", err);
    }
    cancelarPpad();
  }

  function eliminarPpad(itemId) {
    const actualizados = ppadItems.filter((item) => item.id !== itemId);
    setPpadItems(actualizados);
    try {
      localStorage.setItem(
        `erp_expediente_ppad_${expediente?.id_expediente || id}`,
        JSON.stringify(actualizados)
      );
    } catch (err) {
      console.error("No se han podido actualizar los datos PPAD:", err);
    }
    if (ppadEditandoId === itemId) cancelarPpad();
  }



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


  const tieneDefecto =
    Boolean(
      expediente.tiene_defectos_abiertos ||
      defectoLocal
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  // ==========================================================
  // FINCAS
  // ==========================================================

  function abrirFincas() {
    setFincaForm({
      numero_finca: expediente?.finca || "",
      cru_idufir:
        expediente?.cru_idufir ||
        expediente?.cru ||
        expediente?.idufir ||
        "",
      provincia: expediente?.provincia || "",
      poblacion:
        expediente?.poblacion ||
        expediente?.municipio ||
        "",
      registro: expediente?.registro || "",
      seccion: expediente?.seccion || "",
      cuantia: expediente?.cuantia || "",
      inscripcion: expediente?.inscripcion || "",
      contrato: expediente?.contrato || "",
      fecha_constitucion:
        expediente?.fecha_constitucion || "",
      subrogado:
        expediente?.subrogado === true
          ? "SI"
          : expediente?.subrogado === false
            ? "NO"
            : expediente?.subrogado || "",
      entidad_original:
        expediente?.entidad_original || "",
    });

    setMostrarFincas(true);
  }


  function guardarFinca() {
    const datos = {
      ...fincaForm,
    };

    setFincaRegistrada(datos);

    setExpediente((actual) => ({
      ...actual,
      finca: datos.numero_finca,
      cru_idufir: datos.cru_idufir,
      provincia: datos.provincia,
      poblacion: datos.poblacion,
      registro: datos.registro,
      seccion: datos.seccion,
      cuantia: datos.cuantia,
      inscripcion: datos.inscripcion,
      contrato: datos.contrato,
      fecha_constitucion:
        datos.fecha_constitucion,
      subrogado: datos.subrogado,
      entidad_original:
        datos.entidad_original,
    }));

    setMostrarFincas(false);
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
              md:grid-cols-3
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

          </div>
        </div>


          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >

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

            <Boton
              onClick={
                abrirActividades
              }
            >
              ⚙️ Ver actividades
            </Boton>

            <Boton
              tipo="primary"
              onClick={() =>
                setMostrarEnviarNotario(
                  true
                )
              }
            >
              📤 Enviar a notario
            </Boton>

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
          xl:grid-cols-4
        "
      >

        {/* ===================================================
            COLUMNA 1
        ==================================================== */}

        <div className="space-y-4">

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
                grid-cols-2
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


         


          {/* FINCAS Y REGISTROS */}

          <Seccion
            titulo="Fincas y Registros"
            subtitulo="Datos registrales del expediente"
            icono="finca"
            colapsable
          >
            <div className="grid grid-cols-2 gap-2">

              <Dato
                campo="Finca"
                valor={fincaRegistrada.numero_finca}
                destaque
              />

              {esDisponible(
                fincaRegistrada.cru_idufir
              ) && (
                <Dato
                  campo="CRU/Idufir"
                  valor={fincaRegistrada.cru_idufir}
                />
              )}

              {esDisponible(
                fincaRegistrada.provincia
              ) && (
                <Dato
                  campo="Provincia"
                  valor={fincaRegistrada.provincia}
                />
              )}

              {esDisponible(
                fincaRegistrada.poblacion
              ) && (
                <Dato
                  campo="Población"
                  valor={fincaRegistrada.poblacion}
                />
              )}

              {esDisponible(
                fincaRegistrada.registro
              ) && (
                <Dato
                  campo="Registro"
                  valor={fincaRegistrada.registro}
                />
              )}

              {esDisponible(
                fincaRegistrada.inscripcion
              ) && (
                <Dato
                  campo="Inscripción"
                  valor={fincaRegistrada.inscripcion}
                />
              )}

              {esDisponible(
                fincaRegistrada.seccion
              ) && (
                <Dato
                  campo="Sección"
                  valor={fincaRegistrada.seccion}
                />
              )}

              {esDisponible(
                fincaRegistrada.cuantia
              ) && (
                <Dato
                  campo="Cuantía"
                  valor={fincaRegistrada.cuantia}
                  tipo="numero"
                />
              )}

              {esDisponible(
                fincaRegistrada.contrato
              ) && (
                <Dato
                  campo="Contrato"
                  valor={fincaRegistrada.contrato}
                />
              )}

              {esDisponible(
                fincaRegistrada.fecha_constitucion
              ) && (
                <Dato
                  campo="Fecha constitución"
                  valor={fincaRegistrada.fecha_constitucion}
                  tipo="fecha"
                />
              )}

              {esDisponible(
                fincaRegistrada.subrogado
              ) && (
                <Dato
                  campo="Subrogado"
                  valor={fincaRegistrada.subrogado}
                />
              )}

              {esDisponible(
                fincaRegistrada.entidad_original
              ) && (
                <Dato
                  campo="Entidad original"
                  valor={fincaRegistrada.entidad_original}
                />
              )}

            </div>

            <button
              type="button"
              onClick={abrirFincas}
              className="
                mt-3 w-full rounded-xl border border-blue-100
                bg-blue-50 px-3 py-2.5 text-xs font-bold
                text-blue-700 transition hover:bg-blue-100
              "
            >
              ＋ Nueva Finca
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
              {observacionesExpediente.length === 0 && (
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
                    {(observacion.visibilidad || ["Departamento interno"]).map((destino) => (
                      <span key={destino} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">Visible: {destino}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => eliminarObservacionExpediente(observacion.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}

              {mostrarFormularioObservacion ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Comentario</span>
                    <textarea value={nuevaObservacion} onChange={(event) => setNuevaObservacion(event.target.value)} rows={4} placeholder="Escribe la observación..." className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">Visibilidad de la observación</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        { key: "interno", label: "Departamento interno" },
                        { key: "notario", label: "Visible para el Notario" },
                        { key: "apoderado", label: "Visible para el Apoderado" },
                      ].map((opcion) => (
                        <label key={opcion.key} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700">
                          <input type="checkbox" checked={visibilidadObservacion[opcion.key]} onChange={(event) => setVisibilidadObservacion((actual) => ({ ...actual, [opcion.key]: event.target.checked }))} className="mt-0.5" />
                          <span>{opcion.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Boton onClick={() => { setMostrarFormularioObservacion(false); setNuevaObservacion(""); }}>Cancelar</Boton>
                    <Boton tipo="primary" onClick={agregarObservacionExpediente} disabled={!nuevaObservacion.trim()}>Guardar observación</Boton>
                  </div>
                </div>
              ) : (
                <Boton tipo="primary" onClick={() => setMostrarFormularioObservacion(true)}>＋ Añadir observación</Boton>
              )}
            </div>
          </Seccion>

        </div>


      

       

        {/* ===================================================
            COLUMNA 3
        ==================================================== */}

        <div className="space-y-3">

          {/* NOTARIO */}

          <Seccion
            titulo="Notario"
            subtitulo="Información del notario asociado"
            icono="notario"
            colapsable
          >

            <div
              className="
                grid
                grid-cols-2
                gap-2
              "
            >

              <Dato
                campo="Nombre notario"
                valor={
                  expediente.nombre_notario
                }
                destaque
              />

              <Dato
                campo="NIF notario"
                valor={
                  expediente.nif_notario
                }
              />

            </div>

          </Seccion>

        </div>

        {/* ===================================================
            COLUMNA 3 — PPAD
        ==================================================== */}
        <div className="min-w-0 space-y-3">
          {/* PPAD */}
          <Seccion
            titulo="PPAD"
            subtitulo="Conceptos, importes e imputación"
            icono="economico"
            colapsable
            compacto
          >
            <div className="space-y-3">
              {ppadItems.length === 0 && !mostrarFormularioPpad && (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
                  Todavía no hay conceptos PPAD añadidos.
                </p>
              )}

              {ppadItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Concepto</div>
                      <div className="mt-1 break-words text-xs font-semibold text-slate-800">{item.concepto}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Importe</div>
                      <div className="mt-1 text-xs font-semibold text-slate-800">{new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(item.importe) || 0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Imputable a</div>
                      <div className="mt-1 text-xs font-semibold text-slate-800">{item.imputableA}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
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
                    <Boton tipo="primary" onClick={aceptarPpad} disabled={!ppadForm.concepto.trim() || !String(ppadForm.importe).trim()}>Aceptar</Boton>
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
            COLUMNA 3 — INFORMACIÓN CREDITICIA
        ==================================================== */}

        <div className="min-w-0">

          <Seccion
            titulo="Información crediticia"
            subtitulo="Datos económicos y contractuales"
            icono="economico"
            colapsable
          >

            <div
              className="
                grid
                grid-cols-2
                gap-2
              "
            >


              <Dato
                campo="Contrato"
                valor={
                  expediente.contrato
                }
              />

              <Dato
                campo="Tipo operación"
                valor={
                  expediente.tipo_operacion
                }
              />

              <Dato
                campo="Subtipo operación"
                valor={
                  expediente.subtipo_operacion
                }
              />

              <Dato
                campo="Nº solicitud SIA"
                valor={
                  expediente.num_solicitud_sia
                }
              />

              <Dato
                campo="Capital"
                valor={
                  expediente.capital
                }
                tipo="numero"
                destaque
              />

              <Dato
                campo="Importe"
                valor={
                  expediente.importe
                }
                tipo="numero"
                destaque
              />

              <Dato
                campo="Saldo real"
                valor={
                  expediente.saldo_real
                }
                tipo="numero"
              />

              <Dato
                campo="Saldo disponible"
                valor={
                  expediente.saldo_disponible
                }
                tipo="numero"
              />

              <Dato
                campo="Finca"
                valor={
                  expediente.finca
                }
                destaque
              />

                           <Dato
                campo="Observaciones"
                valor={
                  expediente.Observaciones
                }
                destaque
              />

            </div>

          </Seccion>

        </div>

      </div>

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
          `Expediente ${valorVisible(
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
                    onClick={() =>
                      setActividadSeleccionada(
                        actividad.key
                      )
                    }
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

                    {esActual && (
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

              {actividadSeleccionada ===
                actividadActual && (
                <EstadoBadge
                  valor="Actividad actual"
                />
              )}

            </div>


            <div
              className="
                grid
                grid-cols-1
                gap-2
                sm:grid-cols-2
                xl:grid-cols-3
              "
            >

              {camposActividad.map(
                (campo) => {

                  if (
                    !esDisponible(
                      expediente,
                      campo.key
                    )
                  ) {
                    return null;
                  }

                  return (
                    <Dato
                      key={
                        campo.key
                      }
                      campo={
                        campo.label
                      }
                      valor={
                        expediente[
                          campo.key
                        ]
                      }
                      tipo={
                        campo.tipo
                      }
                      estado={
                        campo.estado
                      }
                      multilinea={
                        campo.multilinea
                      }
                    />
                  );
                }
              )}

            </div>


            {!camposActividad.some(
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
        <label className="block text-sm font-medium text-slate-700">
          Documento *
          <select
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            value={defectoForm.documento}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                documento: e.target.value,
              }))
            }
          >
            <option value="CANCELACIÓN DE CONDICIÓN RESOLUTORIA">
              CANCELACIÓN DE CONDICIÓN RESOLUTORIA
            </option>
          </select>
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
          <input
            type="text"
            maxLength={500}
            className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
            value={defectoForm.subtipo_defecto}
            onChange={(e) =>
              setDefectoForm((actual) => ({
                ...actual,
                subtipo_defecto: e.target.value,
              }))
            }
            placeholder="Introduce el subtipo del defecto"
          />
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
        onClose={() =>
          setMostrarFincas(false)
        }
        titulo="🏠 Nueva Finca"
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
            >
              💾 Guardar
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
        label: `${accion.descripcion}${
          accion.actividad
            ? ` — ${accion.actividad}`
            : ""
        }`,
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
              onClick={
                guardarObservacion
              }
            >
              💾 Guardar comentario
            </Boton>
          </>
        }
      >

        <div className="space-y-5">

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
