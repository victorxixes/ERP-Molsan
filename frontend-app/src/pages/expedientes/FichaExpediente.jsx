import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { obtenerExpediente } from "../../api/expedientes";

/**
 * ============================================================
 * FICHA DE EXPEDIENTE — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Primera versión de la nueva ficha de expediente.
 *
 * - Compatible con /expedientes/:id
 * - Carga el expediente real desde el backend
 * - Diseño Premium / Glass Luxe
 * - Preparada para el futuro sistema documental SOL / CS / NS
 * - Preparada para las 7 actividades del circuito
 *
 * IMPORTANTE:
 * Los contadores y documentos de SOL / CS / NS todavía no se
 * inventan: mientras no exista el backend documental, se muestra
 * 0 documentos.
 * ============================================================
 */

const ACTIVIDADES = [
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

const DOCUMENTOS_DIGITALES = [
  "Documentos Absis",
  "Hoja de Encargo firmada",
  "Justificante de cancelación",
  "Nota simple registral",
  "Mails de la Oficina",
  "Escrituras/borradores",
  "Presentación Registro",
  "AJD",
  "Otra documentación",
  "NotarGest - Factura Notario",
  "NotarGest - Factura Registro",
  "Documento Inscripción",
];

function normalizarActividad(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerActividadDefinicion(valor) {
  const normalizada = normalizarActividad(valor);

  return (
    ACTIVIDADES.find(
      (actividad) =>
        normalizarActividad(actividad.label) === normalizada
    ) || null
  );
}

function formatearFecha(valor) {
  if (!valor) {
    return "—";
  }

  const texto = String(valor);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [year, month, day] = texto.split("-");
    return `${day}/${month}/${year}`;
  }

  try {
    return new Date(valor).toLocaleDateString("es-ES");
  } catch {
    return texto;
  }
}

function formatearFechaHora(valor) {
  if (!valor) {
    return "—";
  }

  try {
    return new Date(valor).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(valor);
  }
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

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero);
}

function valorSeguro(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  return String(valor);
}

function Badge({
  children,
  tipo = "neutral",
}) {
  const clases = {
    primary:
      "bg-[var(--erp-primary-soft)] text-[var(--erp-primary)] border-[var(--erp-primary)]/20",
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200",
    danger:
      "bg-red-50 text-red-700 border-red-200",
    neutral:
      "bg-[var(--erp-surface-soft)] text-[var(--erp-text-soft)] border-[var(--erp-border)]",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        px-2.5
        py-1
        rounded-lg
        border
        text-xs
        font-semibold
        whitespace-nowrap
        ${clases[tipo] || clases.neutral}
      `}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  children,
}) {
  return (
    <div
      className="
        px-5
        py-4
        border-b
        border-[var(--erp-border)]
        flex
        flex-col
        sm:flex-row
        sm:items-center
        sm:justify-between
        gap-3
      "
    >
      <div className="flex items-center gap-3">
        <div
          className="
            w-10
            h-10
            rounded-xl
            bg-[var(--erp-primary-soft)]
            text-[var(--erp-primary)]
            flex
            items-center
            justify-center
            border
            border-[var(--erp-border)]
            flex-shrink-0
          "
        >
          <span className="text-lg">{icon}</span>
        </div>

        <div>
          <h2
            className="
              text-base
              font-semibold
              text-[var(--erp-text)]
            "
          >
            {title}
          </h2>

          {subtitle && (
            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}

function Dato({
  label,
  children,
  ancho = "",
}) {
  return (
    <div className={`${ancho}`}>
      <p
        className="
          text-[11px]
          uppercase
          tracking-wide
          font-semibold
          text-[var(--erp-text-soft)]
          mb-1
        "
      >
        {label}
      </p>

      <div
        className="
          min-h-[24px]
          text-sm
          font-medium
          text-[var(--erp-text)]
          break-words
        "
      >
        {children}
      </div>
    </div>
  );
}

function TarjetaEstado({
  label,
  value,
  tipo = "neutral",
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-[var(--erp-border)]
        bg-[var(--erp-surface)]
        px-4
        py-3
      "
    >
      <p
        className="
          text-[11px]
          uppercase
          tracking-wide
          font-semibold
          text-[var(--erp-text-soft)]
          mb-2
        "
      >
        {label}
      </p>

      <Badge tipo={tipo}>
        {valorSeguro(value)}
      </Badge>
    </div>
  );
}

function CarpetaDigital({
  nombre,
  icono,
  documentos,
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-[var(--erp-border)]
        bg-[var(--erp-surface)]
        p-4
        hover:shadow-sm
        transition
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          mb-4
        "
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="
              w-10
              h-10
              rounded-xl
              bg-[var(--erp-primary-soft)]
              flex
              items-center
              justify-center
              flex-shrink-0
              text-lg
            "
          >
            {icono}
          </div>

          <div className="min-w-0">
            <p
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
              "
            >
              {nombre}
            </p>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              Carpeta digital
            </p>
          </div>
        </div>

        <span
          className="
            min-w-[34px]
            h-8
            px-2
            rounded-lg
            bg-[var(--erp-surface-soft)]
            border
            border-[var(--erp-border)]
            text-xs
            font-bold
            text-[var(--erp-text)]
            flex
            items-center
            justify-center
          "
        >
          {documentos}
        </span>
      </div>

      <button
        type="button"
        disabled
        className="
          w-full
          h-9
          rounded-lg
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface-soft)]
          text-xs
          font-semibold
          text-[var(--erp-text-soft)]
          opacity-80
          cursor-not-allowed
        "
        title="La gestión documental se conectará cuando exista el backend documental"
      >
        Ver documentos
      </button>
    </div>
  );
}

export default function FichaExpediente() {
  const { id } = useParams();

  const [expediente, setExpediente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!id) {
        setLoading(false);
        setError("No se ha indicado ningún expediente.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await obtenerExpediente(id);

        if (!activo) {
          return;
        }

        setExpediente(data);
      } catch (err) {
        console.error(
          "Error cargando ficha de expediente:",
          err
        );

        if (activo) {
          setExpediente(null);
          setError(
            err?.response?.data?.detail ||
            "No se ha podido cargar la ficha del expediente."
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

  const actividadDefinicion = useMemo(
    () =>
      obtenerActividadDefinicion(
        expediente?.actividad_actual
      ),
    [expediente?.actividad_actual]
  );

  if (loading) {
    return (
      <div className="erp-page space-y-5">
        <div
          className="
            erp-card
           w-ful
            p-8
          "
        >
          <div
            className="
              py-20
              text-center
              text-[var(--erp-text-soft)]
              animate-pulse
            "
          >
            Cargando ficha del expediente…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="erp-page space-y-5">
        <div
          className="
            erp-card
            max-w-[1700px]
            mx-auto
            p-6
          "
        >
          <div
            className="
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-4
              text-sm
              text-red-700
            "
          >
            {error}
          </div>

          <div className="mt-4">
            <Link
              to="/expedientes"
              className="
                inline-flex
                items-center
                px-4
                py-2
                rounded-lg
                bg-[var(--erp-primary)]
                text-white
                text-sm
                font-semibold
                hover:opacity-90
                transition
              "
            >
              ← Volver a expedientes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!expediente) {
    return (
      <div className="erp-page space-y-5">
        <div
          className="
            erp-card
            max-w-[1700px]
            mx-auto
            p-8
            text-center
            text-[var(--erp-text-soft)]
          "
        >
          No se ha encontrado el expediente.
        </div>
      </div>
    );
  }

  const actividadLabel =
    actividadDefinicion?.label ||
    valorSeguro(expediente.actividad_actual);

  const actividadIcono =
    actividadDefinicion?.icono || "📁";

  return (
    <div
      className="
        erp-page
        space-y-5
        animate-fade-in
      "
    >
      {/* =====================================================
          CABECERA
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <div className="p-5 sm:p-6">
          <div
            className="
              flex
              flex-col
              xl:flex-row
              xl:items-center
              xl:justify-between
              gap-5
            "
          >
            <div className="flex items-start gap-4">
              <div
                className="
                  w-14
                  h-14
                  rounded-2xl
                  bg-[var(--erp-primary-soft)]
                  text-[var(--erp-primary)]
                  border
                  border-[var(--erp-border)]
                  flex
                  items-center
                  justify-center
                  text-2xl
                  flex-shrink-0
                "
              >
                📁
              </div>

              <div className="min-w-0">
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                    mb-1
                  "
                >
                  <h1
                    className="
                      text-2xl
                      font-bold
                      text-[var(--erp-text)]
                    "
                  >
                    Expediente{" "}
                    {valorSeguro(
                      expediente.id_expediente
                    )}
                  </h1>

                  <Badge tipo="primary">
                    {actividadIcono} {actividadLabel}
                  </Badge>
                </div>

                <p
                  className="
                    text-sm
                    text-[var(--erp-text-soft)]
                  "
                >
                  Ficha completa del expediente y
                  seguimiento del circuito de trabajo
                </p>
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
              <Link
                to="/expedientes"
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2.5
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface)]
                  text-[var(--erp-text)]
                  text-sm
                  font-semibold
                  hover:bg-[var(--erp-surface-soft)]
                  transition
                "
              >
                ← Volver al listado
              </Link>

              <button
                type="button"
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2.5
                  rounded-xl
                  bg-[var(--erp-primary)]
                  text-white
                  text-sm
                  font-semibold
                  hover:opacity-90
                  transition
                "
              >
                Editar ficha
              </button>
            </div>
          </div>

          {/* RESUMEN SUPERIOR */}

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-4
              gap-3
              mt-6
            "
          >
            <TarjetaEstado
              label="Estado expediente"
              value={expediente.estado_expediente}
              tipo="primary"
            />

            <TarjetaEstado
              label="Estado actividad"
              value={expediente.estado_actividad}
              tipo="neutral"
            />

            <TarjetaEstado
              label="Fecha alta"
              value={formatearFecha(
                expediente.fecha_alta
              )}
              tipo="neutral"
            />

            <TarjetaEstado
              label="Fecha inicio actividad"
              value={formatearFecha(
                expediente.fecha_inicio_actividad
              )}
              tipo="neutral"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          CIRCUITO DE ACTIVIDADES
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="🔄"
          title="Circuito del expediente"
          subtitle="Situación actual dentro del flujo de trabajo"
        />

        <div className="p-5">
          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-4
              xl:grid-cols-7
              gap-2
            "
          >
            {ACTIVIDADES.map((actividad) => {
              const activa =
                normalizarActividad(
                  actividad.label
                ) ===
                normalizarActividad(
                  expediente.actividad_actual
                );

              return (
                <div
                  key={actividad.key}
                  className={`
                    rounded-xl
                    border
                    px-3
                    py-3
                    transition
                    ${
                      activa
                        ? "border-[var(--erp-primary)] bg-[var(--erp-primary-soft)] shadow-sm"
                        : "border-[var(--erp-border)] bg-[var(--erp-surface-soft)]"
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {actividad.icono}
                    </span>

                    <span
                      className={`
                        text-xs
                        font-semibold
                        ${
                          activa
                            ? "text-[var(--erp-primary)]"
                            : "text-[var(--erp-text-soft)]"
                        }
                      `}
                    >
                      {actividad.label}
                    </span>
                  </div>

                  {activa && (
                    <div
                      className="
                        mt-2
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-[var(--erp-primary)]
                      "
                    >
                      Actividad actual
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          IDENTIFICACIÓN / TITULAR
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="👤"
          title="Identificación"
          subtitle="Datos principales del expediente y de sus intervinientes"
        />

        <div
          className="
            p-5
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-x-6
            gap-y-5
          "
        >
          <Dato label="Nº expediente">
            {valorSeguro(expediente.id_expediente)}
          </Dato>

          <Dato label="ID interno">
            {valorSeguro(expediente.id)}
          </Dato>

          <Dato label="Titular">
            {valorSeguro(expediente.nombre_titular)}
          </Dato>

          <Dato label="NIF titular">
            {valorSeguro(expediente.nif_titular)}
          </Dato>

          <Dato label="Solicitante">
            {valorSeguro(expediente.nombre_solicitante)}
          </Dato>

          <Dato label="NIF solicitante">
            {valorSeguro(expediente.nif_solicitante)}
          </Dato>

          <Dato label="Apoderado">
            {valorSeguro(expediente.apoderado)}
          </Dato>

          <Dato label="Oficina">
            {valorSeguro(expediente.oficina)}
          </Dato>

          <Dato label="Oficina de alta">
            {valorSeguro(expediente.oficina_alta)}
          </Dato>

          <Dato label="DAN">
            {valorSeguro(expediente.dan)}
          </Dato>

          <Dato label="Origen">
            {valorSeguro(expediente.origen_bankia)}
          </Dato>

          <Dato label="Producto">
            {valorSeguro(expediente.producto_gtg)}
          </Dato>
        </div>
      </section>

      {/* =====================================================
          OPERACIÓN / ECONÓMICO
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="💶"
          title="Operación y situación económica"
          subtitle="Información económica principal del expediente"
        />

        <div
          className="
            p-5
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-x-6
            gap-y-5
          "
        >
          <Dato label="Capital">
            {formatearNumero(expediente.capital)}
          </Dato>

          <Dato label="Importe">
            {formatearNumero(expediente.importe)}
          </Dato>

          <Dato label="Saldo real">
            {formatearNumero(expediente.saldo_real)}
          </Dato>

          <Dato label="Saldo disponible">
            {formatearNumero(
              expediente.saldo_disponible
            )}
          </Dato>

          <Dato label="Contrato">
            {valorSeguro(expediente.contrato)}
          </Dato>

          <Dato label="Tipo operación">
            {valorSeguro(expediente.tipo_operacion)}
          </Dato>

          <Dato label="Subtipo operación">
            {valorSeguro(
              expediente.subtipo_operacion
            )}
          </Dato>

          <Dato label="Provisión">
            {valorSeguro(expediente.tipo_provision)}
          </Dato>

          <Dato label="ID provisión">
            {valorSeguro(expediente.id_provision)}
          </Dato>

          <Dato label="Solicitud SIA">
            {valorSeguro(
              expediente.num_solicitud_sia
            )}
          </Dato>

          <Dato label="Vinculación cancelación">
            {valorSeguro(expediente.vinccanc)}
          </Dato>

          <Dato label="DT">
            {valorSeguro(expediente.dt)}
          </Dato>
        </div>
      </section>

      {/* =====================================================
          NOTARÍA
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="🏛️"
          title="Notaría"
          subtitle="Datos notariales del expediente"
        />

        <div
          className="
            p-5
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-x-6
            gap-y-5
          "
        >
          <Dato label="Notario">
            {valorSeguro(
              expediente.nombre_notario ||
              expediente.notario
            )}
          </Dato>

          <Dato label="NIF notario">
            {valorSeguro(expediente.nif_notario)}
          </Dato>

          <Dato label="Fecha prevista firma">
            {formatearFecha(
              expediente.fecha_prevista_firma
            )}
          </Dato>

          <Dato label="Fecha firma">
            {formatearFecha(
              expediente.fecha_firma
            )}
          </Dato>

          <Dato label="Protocolo">
            {valorSeguro(expediente.protocolo)}
          </Dato>

          <Dato label="Tipo acta">
            {valorSeguro(expediente.tipo_acta)}
          </Dato>

          <Dato label="Fecha firma prevista validación">
            {formatearFecha(
              expediente.fecha_firma_prev_val
            )}
          </Dato>

          <Dato label="Fecha firma prevista cliente">
            {formatearFecha(
              expediente.fecha_firma_prev_cli
            )}
          </Dato>
        </div>
      </section>

      {/* =====================================================
          REGISTRAL / DEFECTOS
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="🏢"
          title="Registral"
          subtitle="Información registral y posibles defectos"
        />

        <div
          className="
            p-5
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-x-6
            gap-y-5
          "
        >
          <Dato label="Estado registral">
            {valorSeguro(
              expediente.registral_estado
            )}
          </Dato>

          <Dato label="Fecha registral">
            {formatearFecha(
              expediente.registral_fecha
            )}
          </Dato>

          <Dato label="Finca">
            {valorSeguro(expediente.finca)}
          </Dato>

          <Dato label="Defectos abiertos">
            {valorSeguro(
              expediente.tiene_defectos_abiertos
            )}
          </Dato>

          <Dato label="Tipo de error">
            {valorSeguro(expediente.tipo_error)}
          </Dato>

          <Dato label="Cierre defecto">
            {formatearFecha(
              expediente.fcierre_defecto
            )}
          </Dato>

          <Dato
            label="Descripción del error"
            ancho="sm:col-span-2"
          >
            {valorSeguro(
              expediente.descripcion_error
            )}
          </Dato>

          <Dato
            label="Falta / defecto"
            ancho="sm:col-span-2"
          >
            {valorSeguro(
              expediente.falta_defecto
            )}
          </Dato>

          <Dato label="ID expediente CGN">
            {valorSeguro(
              expediente.id_expediente_cgn
            )}
          </Dato>
        </div>
      </section>

      {/* =====================================================
          FECHAS DEL EXPEDIENTE
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="📅"
          title="Cronología"
          subtitle="Fechas principales registradas en el expediente"
        />

        <div
          className="
            p-5
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-4
            gap-3
          "
        >
          {[
            ["Fecha alta", expediente.fecha_alta],
            ["Inicio actividad", expediente.fecha_inicio_actividad],
            ["Fin actividad", expediente.fecha_fin_actividad],
            ["Fecha firma", expediente.fecha_firma],
            ["Fecha inscripción", expediente.fecha_inscripcion],
            ["Fecha entregado cliente", expediente.fecha_entregado_cliente],
            ["Fecha vencimiento", expediente.fecha_vencimiento],
            ["Fecha solicitud CGN", expediente.fecha_sol_cgn],
            ["Fecha facturación", expediente.facturacion_fecha],
          ].map(([label, fecha]) => (
            <div
              key={label}
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface-soft)]
                px-4
                py-3
              "
            >
              <p
                className="
                  text-[11px]
                  uppercase
                  tracking-wide
                  font-semibold
                  text-[var(--erp-text-soft)]
                "
              >
                {label}
              </p>

              <p
                className="
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                  mt-1
                "
              >
                {formatearFecha(fecha)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          CARPETAS DIGITALES SOL / CS / NS
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="📂"
          title="Documentación digital"
          subtitle="SOL · CS · NS — estructura documental del expediente"
        >
          <Badge tipo="neutral">
            0 documentos conectados
          </Badge>
        </SectionHeader>

        <div className="p-5">
          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-3
              gap-4
              mb-6
            "
          >
            <CarpetaDigital
              nombre="SOL"
              icono="📁"
              documentos={0}
            />

            <CarpetaDigital
              nombre="CS"
              icono="📁"
              documentos={0}
            />

            <CarpetaDigital
              nombre="NS"
              icono="📁"
              documentos={0}
            />
          </div>

          <div
            className="
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              overflow-hidden
            "
          >
            <div
              className="
                px-4
                py-3
                border-b
                border-[var(--erp-border)]
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div>
                <h3
                  className="
                    text-sm
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Estructura documental prevista
                </h3>

                <p
                  className="
                    text-xs
                    text-[var(--erp-text-soft)]
                    mt-0.5
                  "
                >
                  Categorías que formarán parte de la
                  documentación real del expediente
                </p>
              </div>

              <span
                className="
                  text-xs
                  font-semibold
                  text-[var(--erp-text-soft)]
                "
              >
                {DOCUMENTOS_DIGITALES.length} categorías
              </span>
            </div>

            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-3
                gap-px
                bg-[var(--erp-border)]
              "
            >
              {DOCUMENTOS_DIGITALES.map((documento) => (
                <div
                  key={documento}
                  className="
                    bg-[var(--erp-surface)]
                    px-4
                    py-3
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <span
                    className="
                      text-sm
                      text-[var(--erp-text)]
                    "
                  >
                    {documento}
                  </span>

                  <span
                    className="
                      min-w-[28px]
                      h-7
                      px-2
                      rounded-lg
                      bg-[var(--erp-surface-soft)]
                      border
                      border-[var(--erp-border)]
                      text-xs
                      font-semibold
                      text-[var(--erp-text-soft)]
                      flex
                      items-center
                      justify-center
                    "
                  >
                    0
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          OBSERVACIONES
      ====================================================== */}

      <section
        className="
          erp-card
          max-w-[1700px]
          mx-auto
          overflow-hidden
        "
      >
        <SectionHeader
          icon="📝"
          title="Observaciones"
          subtitle="Información adicional del expediente"
        />

        <div className="p-5">
          <div
            className="
              min-h-[100px]
              rounded-xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              px-4
              py-4
              text-sm
              leading-6
              text-[var(--erp-text)]
              whitespace-pre-wrap
            "
          >
            {valorSeguro(
              expediente.observaciones
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          PIE
      ====================================================== */}

      <div
        className="
          max-w-[1700px]
          mx-auto
          flex
          flex-col
          sm:flex-row
          items-center
          justify-between
          gap-3
          text-xs
          text-[var(--erp-text-soft)]
          pb-4
        "
      >
        <span>
          Expediente{" "}
          <strong className="text-[var(--erp-text)]">
            {valorSeguro(
              expediente.id_expediente
            )}
          </strong>
        </span>

        <span>
          Última actualización de la ficha:{" "}
          <strong className="text-[var(--erp-text)]">
            {formatearFechaHora(
              expediente.fecha_fin_actividad ||
              expediente.fecha_inscripcion ||
              expediente.fecha_firma ||
              expediente.fecha_alta
            )}
          </strong>
        </span>
      </div>
    </div>
  );
}
