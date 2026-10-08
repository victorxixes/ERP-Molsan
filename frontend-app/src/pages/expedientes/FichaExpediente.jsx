import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  obtenerExpediente,
  enviarExpedienteANotario,
} from "../../api/expedientes";

import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";


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

  const fecha = String(valor);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    const [
      year,
      month,
      day,
    ] = fecha.split("-");

    return `${day}/${month}/${year}`;
  }

  return fecha;
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


function esValorDisponible(
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


// ============================================================
// ACTIVIDADES REALES DEL MÓDULO EXPEDIENTES
// ============================================================

const ACTIVIDADES_EXPEDIENTES = [
  {
    key: "documentacion-previa",
    label: "Documentación previa",
    icono: "📄",
    aliases: [
      "Documentación previa",
    ],
  },

  {
    key: "sede-notarial",
    label: "Sede notarial",
    icono: "🏛️",
    aliases: [
      "Sede notarial",
      "Sede Notarial",
    ],
  },

  {
    key: "sede-notarial-protocolo",
    label: "Sede notarial con protocolo",
    icono: "📜",
    aliases: [
      "Sede notarial con protocolo",
      "Sede Notarial con protocolo",
    ],
  },

  {
    key: "liquidacion-impuestos",
    label: "Liquidación de impuestos",
    icono: "💶",
    aliases: [
      "Liquidación de impuestos",
      "Liquidacion de impuestos",
    ],
  },

  {
    key: "tramitacion-inscripcion",
    label: "Tramitación inscripción",
    icono: "🏢",
    aliases: [
      "Tramitación inscripción",
      "Tramitacion inscripcion",
    ],
  },

  {
    key: "defectos-registrales",
    label: "Defectos registrales",
    icono: "⚠️",
    aliases: [
      "Defectos registrales",
      "Defectos Registrales",
    ],
  },

  {
    key: "facturacion-cierre",
    label: "Facturación y cierre",
    icono: "🧾",
    aliases: [
      "Facturación y cierre",
      "Facturacion y cierre",
    ],
  },
];


// ============================================================
// CAMPOS COMUNES DE ACTIVIDAD
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
    destaque: true,
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
    destaque: true,
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


// ============================================================
// CAMPOS ESPECÍFICOS POR ACTIVIDAD
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
      label: "Fecha recogida notario / presentación telemática",
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
      label: "Tiene defectos abiertos",
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
// RESOLVER ACTIVIDAD ACTUAL
// ============================================================

function resolverActividadActual(
  expediente
) {
  const actividad =
    normalizarTexto(
      expediente?.actividad_actual
    );

  if (!actividad) {
    return "documentacion-previa";
  }

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
    /*
     * Si el backend todavía devuelve "Sede notarial"
     * pero ya existe fecha de firma/protocolo,
     * mostramos la fase con protocolo.
     */
    if (
      expediente?.protocolo ||
      expediente?.fecha_firma
    ) {
      return "sede-notarial-protocolo";
    }

    return "sede-notarial";
  }

  if (
    actividad.includes(
      "documentacion previa"
    )
  ) {
    return "documentacion-previa";
  }

  return "documentacion-previa";
}


// ============================================================
// ICONOS DE SECCIÓN
// ============================================================

function IconoSeccion({
  tipo = "default",
}) {

  const iconos = {

    estado: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path
          d="m9 12 2 2 4-4"
        />
      </>
    ),

    titular: (
      <>
        <circle
          cx="12"
          cy="8"
          r="3"
        />
        <path
          d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"
        />
      </>
    ),

    solicitante: (
      <>
        <circle
          cx="9"
          cy="8"
          r="3"
        />
        <path
          d="M3.5 20c.5-3.4 2.7-5.5 5.5-5.5"
        />
        <path
          d="M16 12v6"
        />
        <path
          d="M13 15h6"
        />
      </>
    ),

    economico: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8"
        />
        <path
          d="M12 7v10"
        />
        <path
          d="M15 9.5c0-1.2-1.1-2-3-2s-3 .8-3 2 1.1 2 3 2 3 .8 3 2-1.1 2-3 2-3-.8-3-2"
        />
      </>
    ),

    notario: (
      <>
        <path
          d="M4 20h16"
        />
        <path
          d="M6 20V9l6-4 6 4v11"
        />
        <path
          d="M9 20v-6h6v6"
        />
      </>
    ),

    observaciones: (
      <>
        <path
          d="M4 5h16v12H8l-4 4z"
        />
        <path
          d="M8 9h8"
        />
        <path
          d="M8 13h5"
        />
      </>
    ),

    actividad: (
      <>
        <path
          d="M5 12h14"
        />
        <path
          d="m13 6 6 6-6 6"
        />
      </>
    ),

    defecto: (
      <>
        <path
          d="M12 4 3.5 19h17z"
        />
        <path
          d="M12 9v4"
        />
        <path
          d="M12 16h.01"
        />
      </>
    ),

    default: (
      <>
        <rect
          x="5"
          y="4"
          width="14"
          height="16"
          rx="2"
        />
        <path
          d="M9 8h6"
        />
        <path
          d="M9 12h6"
        />
        <path
          d="M9 16h4"
        />
      </>
    ),
  };

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {
        iconos[tipo] ||
        iconos.default
      }
    </svg>
  );
}


// ============================================================
// BADGE ESTADO
// ============================================================

function EstadoBadge({
  valor,
  rojo = false,
}) {

  const texto =
    valorVisible(valor);

  if (
    texto === "—"
  ) {
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

  if (rojo) {
    return (
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-full
          border
          border-red-200
          bg-red-50
          px-2.5
          py-1
          text-[11px]
          font-bold
          text-red-700
        "
      >
        <span
          className="
            h-1.5
            w-1.5
            rounded-full
            bg-red-500
          "
        />
        {texto}
      </span>
    );
  }

  const normalizado =
    normalizarTexto(texto);

  const positivo =
    normalizado.includes("vig") ||
    normalizado.includes("abiert") ||
    normalizado.includes("activo");

  const cerrado =
    normalizado.includes("cerr") ||
    normalizado.includes("final");

  const negativo =
    normalizado.includes("error") ||
    normalizado.includes("defecto");

  let clases =
    "border-blue-100 bg-blue-50 text-blue-600";

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
          shrink-0
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

  if (
    tipo === "fecha"
  ) {
    contenido =
      formatearFecha(valor);
  }

  if (
    tipo === "numero"
  ) {
    contenido =
      formatearNumero(valor);
  }

  return (
    <div
      className={`
        min-w-0
        rounded-2xl
        border
        p-3.5
        transition-all
        duration-200
        ${
          destaque
            ? `
              border-blue-100
              bg-blue-50/55
            `
            : `
              border-slate-200/80
              bg-white/70
              hover:border-blue-100
              hover:bg-white
              hover:shadow-sm
            `
        }
      `}
    >

      <p
        className="
          mb-1.5
          truncate
          text-[10px]
          font-semibold
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
          rojo={
            normalizarTexto(
              valor
            ).includes("defecto")
          }
        />

      ) : (

        <p
          className={`
            break-words
            text-sm
            leading-5
            ${
              multilinea
                ? "whitespace-pre-wrap"
                : ""
            }
            ${
              destaque
                ? `
                  font-bold
                  text-blue-700
                `
                : `
                  font-medium
                  text-slate-700
                `
            }
          `}
        >
          {contenido}
        </p>

      )}

    </div>
  );
}


// ============================================================
// SECCIÓN
// ============================================================

function Seccion({
  titulo,
  subtitulo,
  icono = "default",
  children,
  columnas = 3,
}) {

  const gridClass =
    columnas === 4
      ? "xl:grid-cols-4"
      : columnas === 2
        ? "xl:grid-cols-2"
        : "xl:grid-cols-3";

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/80
        bg-white/80
        p-5
        shadow-[0_16px_45px_rgba(15,23,42,0.06)]
        backdrop-blur-2xl
        sm:p-6
      "
    >

      <div
        className="
          absolute
          left-0
          right-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-blue-400/45
          to-transparent
        "
      />

      <div
        className="
          mb-5
          flex
          items-start
          gap-3
        "
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
              text-base
              font-bold
              tracking-tight
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
                leading-5
                text-slate-400
              "
            >
              {subtitulo}
            </p>
          )}

        </div>

      </div>

      <div
        className={`
          grid
          grid-cols-1
          gap-3
          sm:grid-cols-2
          ${gridClass}
        `}
      >
        {children}
      </div>

    </section>
  );
}


// ============================================================
// OBSERVACIONES
// ============================================================

function Observaciones({
  valor,
}) {

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/80
        bg-white/80
        p-5
        shadow-[0_16px_45px_rgba(15,23,42,0.06)]
        backdrop-blur-2xl
        sm:p-6
      "
    >

      <div
        className="
          absolute
          left-0
          right-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-blue-400/45
          to-transparent
        "
      />

      <div
        className="
          mb-5
          flex
          items-center
          gap-3
        "
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
            border-slate-200
            bg-slate-50
            text-slate-500
          "
        >
          <IconoSeccion
            tipo="observaciones"
          />
        </div>

        <div>

          <h2
            className="
              text-base
              font-bold
              tracking-tight
              text-slate-800
            "
          >
            Observaciones
          </h2>

          <p
            className="
              mt-1
              text-xs
              text-slate-400
            "
          >
            Información adicional
          </p>

        </div>

      </div>

      <div
        className="
          min-h-[100px]
          rounded-2xl
          border
          border-slate-200/80
          bg-slate-50/75
          p-4
          text-sm
          leading-6
          text-slate-600
          shadow-inner
          whitespace-pre-wrap
          break-words
        "
      >
        {valorVisible(valor)}
      </div>

    </section>
  );
}


// ============================================================
// MODAL ACTIVIDADES
// ============================================================

function ModalActividades({
  expediente,
  actividadSeleccionada,
  setActividadSeleccionada,
  cerrar,
}) {

  const actividad =
    ACTIVIDADES_EXPEDIENTES.find(
      (item) =>
        item.key ===
        actividadSeleccionada
    ) ||
    ACTIVIDADES_EXPEDIENTES[0];

  const campos =
    [
      ...CAMPOS_COMUNES_ACTIVIDAD,
      ...(
        CAMPOS_ACTIVIDADES[
          actividad.key
        ] || []
      ),
    ];

  /*
   * Eliminamos duplicados por seguridad.
   */
  const camposUnicos =
    campos.filter(
      (campo, index, array) =>
        array.findIndex(
          (item) =>
            item.key === campo.key
        ) === index
    );

  /*
   * Solo mostramos campos que realmente
   * vienen en el objeto expediente.
   *
   * Así NO inventamos información.
   */
  const camposDisponibles =
    camposUnicos.filter(
      (campo) =>
        esValorDisponible(
          expediente,
          campo.key
        )
    );

  return (
    <div
      className="
        fixed
        inset-0
        z-[9998]
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
          cerrar();
        }
      }}
    >

      <div
        className="
          relative
          flex
          max-h-[92vh]
          w-full
          max-w-[1250px]
          flex-col
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200
          bg-white
          shadow-[0_30px_100px_rgba(15,23,42,0.25)]
        "
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >

        {/* ================================================
            CABECERA MODAL
        ================================================ */}

        <div
          className="
            flex
            shrink-0
            items-start
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

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-blue-100
                  bg-blue-50
                  text-xl
                "
              >
                ⚙️
              </div>

              <div>

                <h2
                  className="
                    text-lg
                    font-bold
                    tracking-tight
                    text-slate-800
                  "
                >
                  Actividades del expediente
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Expediente{" "}
                  <span
                    className="
                      font-semibold
                      text-slate-600
                    "
                  >
                    {
                      valorVisible(
                        expediente.id_expediente
                      )
                    }
                  </span>
                </p>

              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={cerrar}
            className="
              inline-flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-lg
              text-slate-400
              shadow-sm
              transition
              hover:border-slate-300
              hover:bg-slate-50
              hover:text-slate-700
            "
            aria-label="Cerrar actividades"
          >
            ×
          </button>

        </div>


        {/* ================================================
            ACTIVIDADES / PESTAÑAS
        ================================================ */}

        <div
          className="
            shrink-0
            border-b
            border-slate-200
            bg-slate-50/70
            px-5
            py-4
          "
        >

          <div
            className="
              flex
              gap-2
              overflow-x-auto
              pb-1
            "
          >

            {ACTIVIDADES_EXPEDIENTES.map(
              (item) => {

                const activa =
                  item.key ===
                  actividadSeleccionada;

                const esActual =
                  item.key ===
                  resolverActividadActual(
                    expediente
                  );

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setActividadSeleccionada(
                        item.key
                      )
                    }
                    className={`
                      relative
                      flex
                      shrink-0
                      items-center
                      gap-2
                      rounded-xl
                      border
                      px-3
                      py-2.5
                      text-xs
                      font-semibold
                      transition-all
                      ${
                        activa
                          ? `
                            border-blue-200
                            bg-blue-600
                            text-white
                            shadow-sm
                          `
                          : `
                            border-slate-200
                            bg-white
                            text-slate-600
                            hover:border-blue-200
                            hover:bg-blue-50
                            hover:text-blue-700
                          `
                      }
                    `}
                  >

                    <span>
                      {item.icono}
                    </span>

                    <span>
                      {item.label}
                    </span>

                    {esActual && (
                      <span
                        className={`
                          rounded-full
                          px-2
                          py-0.5
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-wide
                          ${
                            activa
                              ? `
                                bg-white/20
                                text-white
                              `
                              : `
                                bg-emerald-50
                                text-emerald-700
                              `
                          }
                        `}
                      >
                        Actual
                      </span>
                    )}

                  </button>
                );
              }
            )}

          </div>

        </div>


        {/* ================================================
            CUERPO
        ================================================ */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-6
            py-6
          "
        >

          {/* Cabecera de actividad */}

          <div
            className="
              mb-5
              flex
              flex-col
              gap-3
              rounded-2xl
              border
              border-blue-100
              bg-blue-50/60
              p-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
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
                  text-2xl
                "
              >
                {actividad.icono}
              </span>

              <div>

                <h3
                  className="
                    text-base
                    font-bold
                    text-slate-800
                  "
                >
                  {actividad.label}
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Información disponible
                  para esta actividad.
                </p>

              </div>

            </div>

            {actividad.key ===
              resolverActividadActual(
                expediente
              ) && (
                <span
                  className="
                    inline-flex
                    w-fit
                    items-center
                    rounded-full
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-3
                    py-1.5
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-emerald-700
                  "
                >
                  ● Actividad actual
                </span>
              )}

          </div>


          {/* Datos */}

          {camposDisponibles.length > 0 ? (

            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
                xl:grid-cols-3
              "
            >

              {camposDisponibles.map(
                (campo) => (

                  <Dato
                    key={campo.key}
                    campo={campo.label}
                    valor={
                      expediente[
                        campo.key
                      ]
                    }
                    tipo={
                      campo.tipo ||
                      "texto"
                    }
                    estado={
                      Boolean(
                        campo.estado
                      )
                    }
                    destaque={
                      Boolean(
                        campo.destaque
                      )
                    }
                    multilinea={
                      Boolean(
                        campo.multilinea
                      )
                    }
                  />

                )
              )}

            </div>

          ) : (

            <div
              className="
                flex
                min-h-[220px]
                items-center
                justify-center
                rounded-2xl
                border
                border-dashed
                border-slate-200
                bg-slate-50/70
                p-8
                text-center
              "
            >

              <div>

                <div
                  className="
                    mx-auto
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-2xl
                    bg-slate-100
                    text-2xl
                  "
                >
                  📋
                </div>

                <h4
                  className="
                    mt-4
                    text-sm
                    font-bold
                    text-slate-700
                  "
                >
                  Sin información disponible
                </h4>

                <p
                  className="
                    mx-auto
                    mt-1
                    max-w-md
                    text-xs
                    leading-5
                    text-slate-400
                  "
                >
                  El expediente no contiene
                  actualmente datos registrados
                  para esta actividad.
                </p>

              </div>

            </div>

          )}

        </div>


        {/* ================================================
            PIE
        ================================================ */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            gap-3
            border-t
            border-slate-200
            bg-slate-50
            px-6
            py-4
          "
        >

          <p
            className="
              text-[11px]
              text-slate-400
            "
          >
            Los datos mostrados corresponden
            al expediente actual.
          </p>

          <button
            type="button"
            onClick={cerrar}
            className="
              inline-flex
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-xs
              font-semibold
              text-slate-600
              shadow-sm
              transition
              hover:border-slate-300
              hover:bg-slate-100
            "
          >
            Cerrar
          </button>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// MODAL DEFECTO
// ============================================================

function ModalDefecto({
  modo,
  tipoDefecto,
  faltaDefecto,
  descripcionDefecto,
  fechaAltaDefecto,
  fechaSubsanacion,
  observacionSubsanacion,
  setTipoDefecto,
  setFaltaDefecto,
  setDescripcionDefecto,
  setFechaAltaDefecto,
  setFechaSubsanacion,
  setObservacionSubsanacion,
  guardar,
  confirmarSubsanacion,
  cerrar,
  guardando,
}) {

  const esSubsanacion =
    modo === "subsanar";

  const esDetalle =
    modo === "detalle";

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
          cerrar();
        }
      }}
    >

      <div
        className="
          relative
          flex
          max-h-[90vh]
          w-full
          max-w-2xl
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-2xl
        "
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >

        {/* HEADER */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-200
            bg-gradient-to-r
            from-slate-50
            to-white
            px-6
            py-5
          "
        >

          <div>

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  text-red-600
                "
              >
                ⚠️
              </div>

              <div>

                <h2
                  className="
                    text-lg
                    font-bold
                    text-slate-800
                  "
                >
                  {esSubsanacion
                    ? "Subsanar defecto registral"
                    : esDetalle
                      ? "Detalle del defecto registral"
                      : "Dar de alta defecto registral"}
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Información registral del expediente
                </p>

              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={cerrar}
            className="
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-lg
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
            "
          >
            ×
          </button>

        </div>


        {/* BODY */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-6
            py-6
          "
        >

          {!esSubsanacion && (
            <div
              className="
                grid
                grid-cols-1
                gap-4
                sm:grid-cols-2
              "
            >

              <label className="block">

                <span
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  Tipo de defecto
                </span>

                <input
                  type="text"
                  value={
                    tipoDefecto
                  }
                  onChange={(event) =>
                    setTipoDefecto(
                      event.target.value
                    )
                  }
                  disabled={esDetalle}
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
                    disabled:bg-slate-50
                  "
                  placeholder="Tipo de defecto"
                />

              </label>


              <label className="block">

                <span
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  Falta / defecto
                </span>

                <input
                  type="text"
                  value={
                    faltaDefecto
                  }
                  onChange={(event) =>
                    setFaltaDefecto(
                      event.target.value
                    )
                  }
                  disabled={esDetalle}
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
                    disabled:bg-slate-50
                  "
                  placeholder="Falta o defecto"
                />

              </label>


              <label
                className="
                  block
                  sm:col-span-2
                "
              >

                <span
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  Descripción
                </span>

                <textarea
                  rows={5}
                  value={
                    descripcionDefecto
                  }
                  onChange={(event) =>
                    setDescripcionDefecto(
                      event.target.value
                    )
                  }
                  disabled={esDetalle}
                  className="
                    w-full
                    resize-y
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    leading-6
                    text-slate-700
                    outline-none
                    transition
                    focus:border-blue-400
                    focus:ring-2
                    focus:ring-blue-100
                    disabled:bg-slate-50
                  "
                  placeholder="Descripción del defecto registral"
                />

              </label>


              <label className="block">

                <span
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  Fecha de alta
                </span>

                <input
                  type="date"
                  value={
                    fechaAltaDefecto
                  }
                  onChange={(event) =>
                    setFechaAltaDefecto(
                      event.target.value
                    )
                  }
                  disabled={esDetalle}
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
                    disabled:bg-slate-50
                  "
                />

              </label>

            </div>
          )}


          {esSubsanacion && (
            <div
              className="
                space-y-5
              "
            >

              <div
                className="
                  rounded-2xl
                  border
                  border-red-100
                  bg-red-50/70
                  p-4
                "
              >

                <p
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-red-600
                  "
                >
                  Defecto registral
                </p>

                <p
                  className="
                    mt-2
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  {valorVisible(
                    tipoDefecto
                  )}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  {valorVisible(
                    descripcionDefecto
                  )}
                </p>

              </div>


              <label className="block">

                <span
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  Fecha de subsanación
                </span>

                <input
                  type="date"
                  value={
                    fechaSubsanacion
                  }
                  onChange={(event) =>
                    setFechaSubsanacion(
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
                />

              </label>


              <label className="block">

                <span
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  Observación de la subsanación
                </span>

                <textarea
                  rows={5}
                  value={
                    observacionSubsanacion
                  }
                  onChange={(event) =>
                    setObservacionSubsanacion(
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    resize-y
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    leading-6
                    text-slate-700
                    outline-none
                    transition
                    focus:border-blue-400
                    focus:ring-2
                    focus:ring-blue-100
                  "
                  placeholder="Observaciones de la subsanación"
                />

              </label>

            </div>
          )}

        </div>


        {/* FOOTER */}

        <div
          className="
            flex
            shrink-0
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

          <button
            type="button"
            onClick={cerrar}
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-xs
              font-semibold
              text-slate-600
              shadow-sm
              transition
              hover:bg-slate-100
            "
          >
            Cerrar
          </button>

          {esDetalle && (
            <span
              className="
                rounded-xl
                bg-slate-100
                px-4
                py-2.5
                text-xs
                font-semibold
                text-slate-500
              "
            >
              Solo consulta
            </span>
          )}

          {!esDetalle &&
            !esSubsanacion && (
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="
                  rounded-xl
                  bg-red-600
                  px-4
                  py-2.5
                  text-xs
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-red-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {guardando
                  ? "Guardando…"
                  : "⚠️ Dar de alta defecto"}
              </button>
            )}

          {esSubsanacion && (
            <button
              type="button"
              onClick={
                confirmarSubsanacion
              }
              disabled={guardando}
              className="
                rounded-xl
                bg-emerald-600
                px-4
                py-2.5
                text-xs
                font-bold
                text-white
                shadow-sm
                transition
                hover:bg-emerald-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {guardando
                ? "Guardando…"
                : "✓ Confirmar subsanación"}
            </button>
          )}

        </div>

      </div>

    </div>
  );
}


// ============================================================
// FICHA
// ============================================================

export default function FichaExpediente() {

  const {
    id,
  } = useParams();


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


  // ==========================================================
  // ACTIVIDADES
  // ==========================================================

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


  // ==========================================================
  // ENVIAR A NOTARIO
  // ==========================================================

  const [
    mostrarEnviarNotario,
    setMostrarEnviarNotario,
  ] = useState(false);


  const [
    enviandoNotario,
    setEnviandoNotario,
  ] = useState(false);


  // ==========================================================
  // DEFECTOS
  // ==========================================================

  const [
    mostrarDefectoModal,
    setMostrarDefectoModal,
  ] = useState(false);


  const [
    modoDefecto,
    setModoDefecto,
  ] = useState("detalle");


  const [
    tipoDefecto,
    setTipoDefecto,
  ] = useState("");


  const [
    faltaDefecto,
    setFaltaDefecto,
  ] = useState("");


  const [
    descripcionDefecto,
    setDescripcionDefecto,
  ] = useState("");


  const [
    fechaAltaDefecto,
    setFechaAltaDefecto,
  ] = useState("");


  const [
    fechaSubsanacion,
    setFechaSubsanacion,
  ] = useState("");


  const [
    observacionSubsanacion,
    setObservacionSubsanacion,
  ] = useState("");


  const [
    guardandoDefecto,
    setGuardandoDefecto,
  ] = useState(false);


  // ==========================================================
  // CARGAR EXPEDIENTE
  // ==========================================================

  useEffect(() => {

    let activo = true;

    async function cargar() {

      setLoading(true);
      setError("");

      try {

        const data =
          await obtenerExpediente(id);

        if (activo) {

          setExpediente(
            data
          );

        }

      } catch (err) {

        console.error(
          "Error cargando expediente:",
          err
        );

        if (activo) {

          setError(
            err?.response?.data?.detail ||
            "No se ha podido cargar el expediente."
          );

          setExpediente(
            null
          );

        }

      } finally {

        if (activo) {
          setLoading(false);
        }

      }
    }

    cargar();

    return () => {
      activo = false;
    };

  }, [id]);


  // ==========================================================
  // ACTIVIDAD ACTUAL
  // ==========================================================

  const actividadActualKey =
    useMemo(() => {

      if (!expediente) {
        return "documentacion-previa";
      }

      return resolverActividadActual(
        expediente
      );

    }, [
      expediente,
    ]);


  // ==========================================================
  // ABRIR ACTIVIDADES
  // ==========================================================

  function abrirActividades() {

    setActividadSeleccionada(
      actividadActualKey
    );

    setMostrarActividades(
      true
    );
  }


  // ==========================================================
  // ABRIR DEFECTO
  // ==========================================================

  function abrirDetalleDefecto() {

    setModoDefecto(
      "detalle"
    );

    setTipoDefecto(
      expediente?.tipo_error ||
      ""
    );

    setFaltaDefecto(
      expediente?.falta_defecto ||
      ""
    );

    setDescripcionDefecto(
      expediente?.descripcion_error ||
      ""
    );

    setFechaAltaDefecto(
      expediente?.fecha_alta ||
      ""
    );

    setMostrarDefectoModal(
      true
    );
  }


  function abrirAltaDefecto() {

    setModoDefecto(
      "alta"
    );

    setTipoDefecto("");
    setFaltaDefecto("");
    setDescripcionDefecto("");

    setFechaAltaDefecto(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

    setMostrarDefectoModal(
      true
    );
  }


  function abrirSubsanacion() {

    setModoDefecto(
      "subsanar"
    );

    setTipoDefecto(
      expediente?.tipo_error ||
      ""
    );

    setFaltaDefecto(
      expediente?.falta_defecto ||
      ""
    );

    setDescripcionDefecto(
      expediente?.descripcion_error ||
      ""
    );

    setFechaSubsanacion(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

    setObservacionSubsanacion(
      ""
    );

    setMostrarDefectoModal(
      true
    );
  }


  // ==========================================================
  // GUARDAR DEFECTO
  // ==========================================================

  async function guardarDefecto() {

    setGuardandoDefecto(
      true
    );

    try {

      /*
       * De momento el backend actual no dispone
       * de un endpoint específico de defectos.
       *
       * Por tanto NO hacemos una llamada inventada.
       *
       * Dejamos la información preparada para
       * conectarla al endpoint cuando se cree.
       */

      console.log(
        "ALTA DEFECTO:",
        {
          id_expediente:
            expediente?.id_expediente,

          tipo_error:
            tipoDefecto,

          falta_defecto:
            faltaDefecto,

          descripcion_error:
            descripcionDefecto,

          fecha_alta:
            fechaAltaDefecto,
        }
      );

      setExpediente(
        (actual) => ({
          ...actual,

          tiene_defectos_abiertos:
            true,

          tipo_error:
            tipoDefecto,

          falta_defecto:
            faltaDefecto,

          descripcion_error:
            descripcionDefecto,

          fcierre_defecto:
            null,
        })
      );

      setMostrarDefectoModal(
        false
      );

    } finally {

      setGuardandoDefecto(
        false
      );

    }
  }


  // ==========================================================
  // SUBSANAR DEFECTO
  // ==========================================================

  async function confirmarSubsanacion() {

    if (
      !fechaSubsanacion
    ) {
      window.alert(
        "Indica la fecha de subsanación."
      );

      return;
    }

    setGuardandoDefecto(
      true
    );

    try {

      console.log(
        "SUBSANACIÓN DEFECTO:",
        {
          id_expediente:
            expediente?.id_expediente,

          fecha_subsanacion:
            fechaSubsanacion,

          observacion:
            observacionSubsanacion,
        }
      );

      setExpediente(
        (actual) => ({
          ...actual,

          tiene_defectos_abiertos:
            false,

          fcierre_defecto:
            fechaSubsanacion,
        })
      );

      setMostrarDefectoModal(
        false
      );

    } finally {

      setGuardandoDefecto(
        false
      );

    }
  }


  // ==========================================================
  // ENVIAR A NOTARIO
  // ==========================================================

  async function guardarEnviarANotario(
    payload
  ) {

    if (!expediente) {
      return;
    }

    setEnviandoNotario(
      true
    );

    try {

      const data =
        await enviarExpedienteANotario(
          expediente.id_expediente,
          payload
        );

      setExpediente(
        (actual) => ({
          ...actual,
          ...(data || {}),
        })
      );

      setMostrarEnviarNotario(
        false
      );

    } catch (err) {

      console.error(
        "Error enviando expediente a notario:",
        err
      );

      window.alert(
        err?.response?.data?.detail ||
        "No se ha podido enviar el expediente a notario."
      );

    } finally {

      setEnviandoNotario(
        false
      );

    }
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <div
        className="
          relative
          min-h-full
          overflow-hidden
          px-4
          py-4
          sm:px-6
          sm:py-6
        "
      >

        <div
          className="
            mx-auto
            flex
            min-h-[420px]
            max-w-[1800px]
            items-center
            justify-center
          "
        >

          <div
            className="
              rounded-2xl
              border
              border-white/80
              bg-white/80
              px-8
              py-6
              text-center
              shadow-[0_16px_45px_rgba(15,23,42,0.06)]
              backdrop-blur-2xl
            "
          >

            <div
              className="
                mx-auto
                mb-3
                h-8
                w-8
                animate-spin
                rounded-full
                border-2
                border-blue-100
                border-t-blue-500
              "
            />

            <p
              className="
                text-sm
                font-semibold
                text-slate-600
              "
            >
              Cargando expediente…
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              Obteniendo información del expediente
            </p>

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
          px-4
          py-6
          sm:px-6
        "
      >

        <div
          className="
            mx-auto
            max-w-[1800px]
          "
        >

          <Link
            to="/expedientes"
            className="
              inline-flex
              items-center
              rounded-xl
              border
              border-slate-200
              bg-white/80
              px-3
              py-2
              text-sm
              font-medium
              text-slate-500
              shadow-sm
              backdrop-blur-xl
              transition
              hover:border-blue-200
              hover:bg-blue-50
              hover:text-blue-600
            "
          >
            ← Expedientes
          </Link>

          <div
            className="
              mt-5
              rounded-[24px]
              border
              border-red-200
              bg-red-50/80
              p-6
              shadow-sm
            "
          >

            <h2
              className="
                text-base
                font-bold
                text-red-700
              "
            >
              No se ha podido cargar el expediente
            </h2>

            <p
              className="
                mt-2
                text-sm
                text-red-600/80
              "
            >
              {error}
            </p>

          </div>

        </div>

      </div>
    );
  }


  // ==========================================================
  // NO ENCONTRADO
  // ==========================================================

  if (!expediente) {

    return (
      <div
        className="
          px-4
          py-6
          sm:px-6
        "
      >

        <div
          className="
            mx-auto
            max-w-[1800px]
            rounded-[24px]
            border
            border-slate-200
            bg-white/80
            p-8
            text-center
            shadow-sm
          "
        >

          <div className="text-3xl">
            📁
          </div>

          <h2
            className="
              mt-3
              text-lg
              font-bold
              text-slate-700
            "
          >
            Expediente no encontrado
          </h2>

          <Link
            to="/expedientes"
            className="
              mt-5
              inline-flex
              rounded-xl
              bg-blue-600
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-blue-700
            "
          >
            ← Volver a expedientes
          </Link>

        </div>

      </div>
    );
  }


  // ==========================================================
  // VARIABLES
  // ==========================================================

  const numeroExpediente =
    valorVisible(
      expediente.id_expediente
    );

  const tieneDefectos =
    Boolean(
      expediente.tiene_defectos_abiertos
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        relative
        min-h-full
        overflow-hidden
        px-4
        py-4
        sm:px-6
        sm:py-6
      "
    >

      {/* ====================================================
          FONDO PREMIUM
      ==================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >

        <div
          className="
            absolute
            -left-52
            -top-52
            h-[560px]
            w-[560px]
            rounded-full
            bg-blue-400/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -bottom-56
            -right-56
            h-[620px]
            w-[620px]
            rounded-full
            bg-cyan-300/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[760px]
            w-[760px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white/70
            blur-3xl
          "
        />

      </div>


      {/* ====================================================
          CONTENIDO
      ==================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          max-w-[1800px]
          space-y-5
        "
      >

        {/* ==================================================
            CABECERA
        ================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-white/80
            bg-white/80
            p-5
            shadow-[0_20px_60px_rgba(15,23,42,0.08)]
            backdrop-blur-2xl
            sm:p-6
          "
        >

          <div
            className="
              absolute
              left-0
              right-0
              top-0
              h-px
              bg-gradient-to-r
              from-transparent
              via-blue-400/55
              to-transparent
            "
          />

          <div
            className="
              flex
              flex-col
              gap-5
              xl:flex-row
              xl:items-center
              xl:justify-between
            "
          >

            {/* IZQUIERDA */}

            <div className="min-w-0">

              <Link
                to="/expedientes"
                className="
                  inline-flex
                  items-center
                  rounded-lg
                  text-xs
                  font-semibold
                  text-blue-600
                  transition
                  hover:text-blue-700
                "
              >
                ← Expedientes
              </Link>

              <div
                className="
                  mt-3
                  flex
                  items-start
                  gap-4
                "
              >

                <div
                  className="
                    flex
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-blue-100
                    bg-blue-50
                    text-blue-600
                    shadow-sm
                  "
                >

                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M4 6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"
                    />

                    <path
                      d="M4 9h16"
                    />
                  </svg>

                </div>

                <div className="min-w-0">

                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.12em]
                      text-slate-400
                    "
                  >
                    Ficha de expediente
                  </p>

                  <h1
                    className="
                      mt-1
                      break-words
                      text-2xl
                      font-bold
                      tracking-tight
                      text-slate-800
                      sm:text-3xl
                    "
                  >
                    {numeroExpediente}
                  </h1>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-slate-400
                    "
                  >
                    Ficha completa del expediente
                  </p>

                </div>

              </div>

            </div>


            {/* BOTONES */}

            <div
              className="
                flex
                flex-wrap
                items-center
                justify-end
                gap-2
              "
            >

              {/* DEFECTO */}

              {tieneDefectos ? (

                <button
                  type="button"
                  onClick={
                    abrirDetalleDefecto
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
                    transition
                    hover:bg-red-100
                  "
                >
                  ⚠️ DEFECTO REGISTRAL
                </button>

              ) : (

                <button
                  type="button"
                  onClick={
                    abrirAltaDefecto
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-2.5
                    text-xs
                    font-semibold
                    text-slate-600
                    shadow-sm
                    transition
                    hover:border-red-200
                    hover:bg-red-50
                    hover:text-red-700
                  "
                >
                  ⚠️ Dar de alta defecto
                </button>

              )}


              {/* ACTIVIDADES */}

              <button
                type="button"
                onClick={
                  abrirActividades
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-2.5
                  text-xs
                  font-semibold
                  text-slate-600
                  shadow-sm
                  transition
                  hover:border-blue-200
                  hover:bg-blue-50
                  hover:text-blue-700
                "
              >
                📋 Ver actividades
              </button>


              {/* NOTARIO */}

              <button
                type="button"
                onClick={() =>
                  setMostrarEnviarNotario(
                    true
                  )
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  text-xs
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
                disabled={
                  enviandoNotario
                }
              >
                ✒️ Enviar a notario
              </button>

            </div>

          </div>

        </section>


        {/* ==================================================
            FILA PRINCIPAL DE CUATRO BLOQUES
        ================================================== */}

        <div
          className="
            grid
            grid-cols-1
            gap-5
            xl:grid-cols-4
          "
        >

          {/* =================================================
              ESTADO
          ================================================= */}

          <Seccion
            titulo="◉ Estado"
            subtitulo="Situación actual del expediente"
            icono="estado"
            columnas={1}
          >

            <Dato
              campo="Estado"
              valor={
                expediente.estado_expediente
              }
              estado
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
              campo="Tipo operación"
              valor={
                expediente.tipo_operacion
              }
              destaque
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

          </Seccion>


          {/* =================================================
              TITULARES + SOLICITANTES
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-5
            "
          >

            <Seccion
              titulo="👤 Titulares"
              subtitulo="Titulares del expediente"
              icono="titular"
              columnas={1}
            >

              <Dato
                campo="Nombre titular"
                valor={
                  expediente.nombre_titular
                }
                destaque
              />

              <Dato
                campo="NIF titular"
                valor={
                  expediente.nif_titular
                }
              />

            </Seccion>


            <Seccion
              titulo="👥 Solicitantes"
              subtitulo="Solicitantes del expediente"
              icono="solicitante"
              columnas={1}
            >

              <Dato
                campo="Nombre solicitante"
                valor={
                  expediente.nombre_solicitante
                }
                destaque
              />

              <Dato
                campo="NIF solicitante"
                valor={
                  expediente.nif_solicitante
                }
              />

            </Seccion>

          </div>


          {/* =================================================
              INFORMACIÓN CREDITICIA
          ================================================= */}

          <Seccion
            titulo="📊 Información crediticia"
            subtitulo="Datos económicos y contractuales"
            icono="economico"
            columnas={1}
          >

            <Dato
              campo="Nº expediente"
              valor={
                expediente.id_expediente
              }
              destaque
            />

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

          </Seccion>


          {/* =================================================
              NOTARIO + OBSERVACIONES
          ================================================= */}

          <div
            className="
              flex
              flex-col
              gap-5
            "
          >

            <Seccion
              titulo="✒️ Notario"
              subtitulo="Información del notario asociado"
              icono="notario"
              columnas={1}
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

              <Dato
                campo="Notario"
                valor={
                  expediente.notario
                }
              />

              <Dato
                campo="ID notario"
                valor={
                  expediente.notario_id
                }
              />

            </Seccion>


            <Observaciones
              valor={
                expediente.observaciones
              }
            />

          </div>

        </div>


        {/* ==================================================
            ACTIVIDADES — BLOQUE COMPACTO
        ================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[24px]
            border
            border-white/80
            bg-white/80
            p-5
            shadow-[0_16px_45px_rgba(15,23,42,0.06)]
            backdrop-blur-2xl
            sm:p-6
          "
        >

          <div
            className="
              absolute
              left-0
              right-0
              top-0
              h-px
              bg-gradient-to-r
              from-transparent
              via-blue-400/45
              to-transparent
            "
          />

          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
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
                  tipo="actividad"
                />
              </div>

              <div>

                <h2
                  className="
                    text-base
                    font-bold
                    tracking-tight
                    text-slate-800
                  "
                >
                  ⚙️ Actividades
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Información de las actividades
                  del expediente
                </p>

              </div>

            </div>


            <div
              className="
                flex
                flex-wrap
                items-center
                gap-3
              "
            >

              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-3
                  py-2
                "
              >

                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-emerald-500
                  "
                />

                <span
                  className="
                    text-[11px]
                    font-bold
                    text-emerald-700
                  "
                >
                  {valorVisible(
                    expediente.actividad_actual
                  )}
                </span>

              </div>


              <button
                type="button"
                onClick={
                  abrirActividades
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  text-xs
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                "
              >
                📋 Ver actividades
              </button>

            </div>

          </div>

        </section>


        {/* ==================================================
            MODALES
        ================================================== */}

        {mostrarActividades && (
          <ModalActividades
            expediente={
              expediente
            }
            actividadSeleccionada={
              actividadSeleccionada
            }
            setActividadSeleccionada={
              setActividadSeleccionada
            }
            cerrar={() =>
              setMostrarActividades(
                false
              )
            }
          />
        )}


        {mostrarDefectoModal && (
          <ModalDefecto
            modo={
              modoDefecto
            }
            tipoDefecto={
              tipoDefecto
            }
            faltaDefecto={
              faltaDefecto
            }
            descripcionDefecto={
              descripcionDefecto
            }
            fechaAltaDefecto={
              fechaAltaDefecto
            }
            fechaSubsanacion={
              fechaSubsanacion
            }
            observacionSubsanacion={
              observacionSubsanacion
            }
            setTipoDefecto={
              setTipoDefecto
            }
            setFaltaDefecto={
              setFaltaDefecto
            }
            setDescripcionDefecto={
              setDescripcionDefecto
            }
            setFechaAltaDefecto={
              setFechaAltaDefecto
            }
            setFechaSubsanacion={
              setFechaSubsanacion
            }
            setObservacionSubsanacion={
              setObservacionSubsanacion
            }
            guardar={
              guardarDefecto
            }
            confirmarSubsanacion={
              confirmarSubsanacion
            }
            cerrar={() =>
              setMostrarDefectoModal(
                false
              )
            }
            guardando={
              guardandoDefecto
            }
          />
        )}


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
            onEnviar={
              guardarEnviarANotario
            }
          />
        )}

      </div>

    </div>
  );
}
