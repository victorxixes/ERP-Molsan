import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { obtenerExpediente } from "../../api/expedientes";
import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";


// ============================================================
// HELPERS
// ============================================================

function valorVisible(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === "" ||
    String(valor).trim() === ""
  ) {
    return "—";
  }

  return String(valor);
}


function formatearFecha(fecha) {
  if (!fecha) return "—";

  const texto = String(fecha);

  // Formato ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [year, month, day] = texto.split("-");

    return `${day}/${month}/${year}`;
  }

  // ISO con hora
  if (texto.includes("T")) {
    const parteFecha = texto.split("T")[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(parteFecha)) {
      const [year, month, day] = parteFecha.split("-");

      return `${day}/${month}/${year}`;
    }
  }

  return texto;
}


function formatearNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === "" ||
    String(valor).trim() === ""
  ) {
    return "—";
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return valorVisible(valor);
  }

  return numero.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


function normalizarActividad(valor) {
  if (!valor) return "—";

  const texto = String(valor).trim();

  return texto || "—";
}


// ============================================================
// ICONOS
// ============================================================

function IconoSeccion({ tipo }) {
  const iconos = {
    estado: "◉",
    identificacion: "▣",
    titular: "👤",
    solicitante: "👥",
    notario: "✒️",
    oficina: "🏢",
    fechas: "📅",
    actividad: "↻",
    facturacion: "🧾",
    economico: "€",
    provision: "💶",
    finca: "🏠",
    defectos: "⚠️",
  };

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-lg text-blue-600">
      {iconos[tipo] || "•"}
    </div>
  );
}


// ============================================================
// ESTADO
// ============================================================

function EstadoBadge({ estado }) {
  const texto = valorVisible(estado);

  let clases =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";

  const normalizado = String(estado || "").toLowerCase();

  if (
    normalizado.includes("cerr") ||
    normalizado.includes("final") ||
    normalizado.includes("entreg")
  ) {
    clases += " border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (
    normalizado.includes("pend") ||
    normalizado.includes("abiert")
  ) {
    clases += " border-amber-200 bg-amber-50 text-amber-700";
  } else if (
    normalizado.includes("error") ||
    normalizado.includes("cancel")
  ) {
    clases += " border-red-200 bg-red-50 text-red-700";
  } else {
    clases += " border-slate-200 bg-slate-50 text-slate-700";
  }

  return <span className={clases}>{texto}</span>;
}


// ============================================================
// DATO
// ============================================================

function Dato({ etiqueta, valor, tipo = "texto", destacado = false }) {
  let valorFormateado = valorVisible(valor);

  if (tipo === "fecha") {
    valorFormateado = formatearFecha(valor);
  }

  if (tipo === "numero") {
    valorFormateado = formatearNumero(valor);
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {etiqueta}
      </div>

      <div
        className={
          destacado
            ? "text-base font-bold text-slate-900"
            : "text-sm font-medium text-slate-700"
        }
      >
        {valorFormateado}
      </div>
    </div>
  );
}


// ============================================================
// SECCION
// ============================================================

function Seccion({ titulo, subtitulo, icono, children }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/78 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />

      <div className="mb-5 flex items-center gap-3">
        <IconoSeccion tipo={icono} />

        <div>
          <h2 className="text-base font-bold text-slate-900">
            {titulo}
          </h2>

          {subtitulo && (
            <p className="mt-0.5 text-xs text-slate-400">
              {subtitulo}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}


// ============================================================
// OBSERVACIONES
// ============================================================

function Observaciones({ texto }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/78 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-slate-400 via-slate-300 to-slate-400" />

      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">
          Observaciones
        </h2>

        <p className="mt-0.5 text-xs text-slate-400">
          Información adicional del expediente
        </p>
      </div>

      <div className="min-h-[100px] rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm leading-6 text-slate-700">
        {valorVisible(texto)}
      </div>
    </section>
  );
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function FichaExpediente() {
  const { id } = useParams();

  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mostrarEnviarANotario, setMostrarEnviarANotario] = useState(false);

  // ==========================================================
  // CARGAR EXPEDIENTE
  // ==========================================================

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        setCargando(true);
        setError("");

        const datos = await obtenerExpediente(id);

        if (!activo) return;

        setExpediente(datos);
      } catch (err) {
        console.error("Error cargando expediente:", err);

        if (!activo) return;

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "No se ha podido cargar el expediente."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    if (id) {
      cargar();
    }

    return () => {
      activo = false;
    };
  }, [id]);


  // ==========================================================
  // DATOS CALCULADOS
  // ==========================================================

  const esDocumentacionPrevia = useMemo(() => {
    const actividad = String(
      expediente?.actividad_actual || ""
    ).toLowerCase();

    return (
      actividad.includes("document") ||
      actividad.includes("previa")
    );
  }, [expediente]);


  // ==========================================================
  // ENVIAR A NOTARIO
  // ==========================================================

  function cerrarEnviarANotario() {
    setMostrarEnviarANotario(false);
  }


  async function guardarEnviarANotario(payload) {
    console.log(
      "ENVIAR A NOTARIO — PAYLOAD:",
      payload
    );

    setMostrarEnviarANotario(false);
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (cargando) {
    return (
      <div className="min-h-[60vh] p-6">
        <div className="mx-auto max-w-[1500px]">
          <div className="rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
            <div className="animate-pulse space-y-5">
              <div className="h-8 w-72 rounded-xl bg-slate-200" />
              <div className="h-4 w-96 rounded-lg bg-slate-100" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="h-24 rounded-2xl bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
                <div className="h-24 rounded-2xl bg-slate-100" />
              </div>
            </div>
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
      <div className="min-h-[60vh] p-6">
        <div className="mx-auto max-w-[1500px]">
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8">
            <h1 className="text-lg font-bold text-red-800">
              Error al cargar el expediente
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <Link
              to="/expedientes"
              className="mt-5 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Volver a expedientes
            </Link>
          </div>
        </div>
      </div>
    );
  }


  if (!expediente) {
    return (
      <div className="min-h-[60vh] p-6">
        <div className="mx-auto max-w-[1500px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              No se ha encontrado el expediente.
            </p>

            <Link
              to="/expedientes"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Volver a expedientes
            </Link>
          </div>
        </div>
      </div>
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-6 md:px-6">
      {/* Fondos decorativos */}
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-96 h-80 w-80 rounded-full bg-cyan-200/20 blur-3xl" />

      <div className="relative mx-auto max-w-[1500px] space-y-5">

        {/* ================================================== */}
        {/* CABECERA */}
        {/* ================================================== */}

        <header className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
          <div className="absolute left-0 right-0 top-0 h-[4px] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500" />

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Link
                  to="/expedientes"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  ← Expedientes
                </Link>

                <span className="text-slate-300">/</span>

                <span className="text-xs text-slate-400">
                  Ficha de expediente
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Expediente {valorVisible(expediente.id_expediente)}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Información completa del expediente
              </p>
            </div>


            <div className="flex flex-wrap items-center gap-3">

              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Estado
                </div>

                <div className="mt-1">
                  <EstadoBadge
                    estado={expediente.estado_expediente}
                  />
                </div>
              </div>


              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Actividad actual
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-800">
                  {normalizarActividad(
                    expediente.actividad_actual
                  )}
                </div>
              </div>


              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Importe
                </div>

                <div className="mt-1 text-sm font-bold text-slate-900">
                  {formatearNumero(expediente.importe)}
                </div>
              </div>

            </div>
          </div>


          {/* Acciones */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">

            {expediente.fecha_prevista_firma && (
              <Link
                to={`/agenda?fecha=${String(
                  expediente.fecha_prevista_firma
                ).slice(0, 10)}`}
                className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                📅 Ver agenda
              </Link>
            )}


            {esDocumentacionPrevia && (
              <button
                type="button"
                onClick={() => setMostrarEnviarANotario(true)}
                className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ✒️ Enviar a notario
              </button>
            )}

          </div>
        </header>


        {/* ================================================== */}
        {/* 1. ESTADO */}
        {/* ================================================== */}

        <Seccion
          titulo="Estado del expediente"
          subtitulo="Situación actual del expediente"
          icono="estado"
        >
          <Dato
            etiqueta="Estado expediente"
            valor={expediente.estado_expediente}
            destacado
          />

          <Dato
            etiqueta="Estado expediente ANCERT"
            valor={expediente.estado_expediente_ancert}
          />

          <Dato
            etiqueta="Estado actividad"
            valor={expediente.estado_actividad}
          />

          <Dato
            etiqueta="Estado facturación"
            valor={expediente.facturacion_estado}
          />

          <Dato
            etiqueta="Estado registral"
            valor={expediente.registral_estado}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 2. IDENTIFICACIÓN */}
        {/* ================================================== */}

        <Seccion
          titulo="Identificación"
          subtitulo="Datos generales y referencias del expediente"
          icono="identificacion"
        >
          <Dato
            etiqueta="Nº expediente"
            valor={expediente.id_expediente}
            destacado
          />

          <Dato
            etiqueta="ID interno"
            valor={expediente.id}
          />

          <Dato
            etiqueta="ID cliente"
            valor={expediente.cliente_id}
          />

          <Dato
            etiqueta="Contrato"
            valor={expediente.contrato}
          />

          <Dato
            etiqueta="Tipo operación"
            valor={expediente.tipo_operacion}
          />

          <Dato
            etiqueta="Subtipo operación"
            valor={expediente.subtipo_operacion}
          />

          <Dato
            etiqueta="Nº solicitud SIA"
            valor={expediente.num_solicitud_sia}
          />

          <Dato
            etiqueta="Nº solicitud PNC"
            valor={expediente.num_solicitud_pnc}
          />

          <Dato
            etiqueta="VINCCANC"
            valor={expediente.vinccanc}
          />

          <Dato
            etiqueta="Protocolo"
            valor={expediente.protocolo}
          />

          <Dato
            etiqueta="Tipo acta"
            valor={expediente.tipo_acta}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 3. TITULARES */}
        {/* ================================================== */}

        <Seccion
          titulo="Titulares"
          subtitulo="Información de los titulares del expediente"
          icono="titular"
        >
          <Dato
            etiqueta="Nombre titular"
            valor={expediente.nombre_titular}
            destacado
          />

          <Dato
            etiqueta="NIF titular"
            valor={expediente.nif_titular}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 4. SOLICITANTES */}
        {/* ================================================== */}

        <Seccion
          titulo="Solicitantes"
          subtitulo="Información de solicitantes y apoderados"
          icono="solicitante"
        >
          <Dato
            etiqueta="Nombre solicitante"
            valor={expediente.nombre_solicitante}
            destacado
          />

          <Dato
            etiqueta="NIF solicitante"
            valor={expediente.nif_solicitante}
          />

          <Dato
            etiqueta="Apoderado"
            valor={expediente.apoderado}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 5. NOTARIO */}
        {/* ================================================== */}

        <Seccion
          titulo="Notario"
          subtitulo="Datos del notario asignado"
          icono="notario"
        >
          <Dato
            etiqueta="Nombre notario"
            valor={expediente.nombre_notario}
            destacado
          />

          <Dato
            etiqueta="NIF notario"
            valor={expediente.nif_notario}
          />

          <Dato
            etiqueta="Notario"
            valor={expediente.notario}
          />

          <Dato
            etiqueta="ID notario"
            valor={expediente.notario_id}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 6. OFICINA */}
        {/* ================================================== */}

        <Seccion
          titulo="Oficina"
          subtitulo="Información de oficina y departamento"
          icono="oficina"
        >
          <Dato
            etiqueta="Oficina"
            valor={expediente.oficina}
            destacado
          />

          <Dato
            etiqueta="DAN"
            valor={expediente.dan}
          />

          <Dato
            etiqueta="Oficina alta"
            valor={expediente.oficina_alta}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 7. FECHAS */}
        {/* ================================================== */}

        <Seccion
          titulo="Fechas"
          subtitulo="Fechas relevantes del expediente"
          icono="fechas"
        >
          <Dato
            etiqueta="Fecha alta"
            valor={expediente.fecha_alta}
            tipo="fecha"
            destacado
          />

          <Dato
            etiqueta="Fecha firma"
            valor={expediente.fecha_firma}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha inscripción"
            valor={expediente.fecha_inscripcion}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha entrega cliente"
            valor={expediente.fecha_entregado_cliente}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha solicitud"
            valor={expediente.fecha_solicitud}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha prevista firma"
            valor={expediente.fecha_prevista_firma}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha vencimiento"
            valor={expediente.fecha_vencimiento}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha solicitud CGN"
            valor={expediente.fecha_sol_cgn}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha firma prevista valoración"
            valor={expediente.fecha_firma_prev_val}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha firma prevista cliente"
            valor={expediente.fecha_firma_prev_cli}
            tipo="fecha"
          />
        </Seccion>


        {/* ================================================== */}
        {/* 8. ACTIVIDAD */}
        {/* ================================================== */}

        <Seccion
          titulo="Actividad"
          subtitulo="Situación y evolución de la actividad"
          icono="actividad"
        >
          <Dato
            etiqueta="Actividad actual"
            valor={expediente.actividad_actual}
            destacado
          />

          <Dato
            etiqueta="Estado actividad"
            valor={expediente.estado_actividad}
          />

          <Dato
            etiqueta="Inicio actividad"
            valor={expediente.fecha_inicio_actividad}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fin actividad"
            valor={expediente.fecha_fin_actividad}
            tipo="fecha"
          />

          <Dato
            etiqueta="Fecha cierre defecto"
            valor={expediente.fcierre_defecto}
            tipo="fecha"
          />
        </Seccion>


        {/* ================================================== */}
        {/* 9. FACTURACIÓN */}
        {/* ================================================== */}

        <Seccion
          titulo="Facturación"
          subtitulo="Información relacionada con la facturación del expediente"
          icono="facturacion"
        >
          <Dato
            etiqueta="Estado facturación"
            valor={expediente.facturacion_estado}
            destacado
          />

          <Dato
            etiqueta="Fecha facturación"
            valor={expediente.facturacion_fecha}
            tipo="fecha"
          />
        </Seccion>


        {/* ================================================== */}
        {/* 10. INFORMACIÓN CREDITICIA */}
        {/* ================================================== */}

        <Seccion
          titulo="Información crediticia"
          subtitulo="Capital, importe y situación económica del expediente"
          icono="economico"
        >
          <Dato
            etiqueta="Capital"
            valor={expediente.capital}
            tipo="numero"
            destacado
          />

          <Dato
            etiqueta="Importe"
            valor={expediente.importe}
            tipo="numero"
            destacado
          />

          <Dato
            etiqueta="Saldo real"
            valor={expediente.saldo_real}
            tipo="numero"
          />

          <Dato
            etiqueta="Saldo disponible"
            valor={expediente.saldo_disponible}
            tipo="numero"
          />
        </Seccion>


        {/* ================================================== */}
        {/* 11. PROVISIÓN */}
        {/* ================================================== */}

        <Seccion
          titulo="Provisión"
          subtitulo="Información de la provisión asociada al expediente"
          icono="provision"
        >
          <Dato
            etiqueta="ID provisión"
            valor={expediente.id_provision}
            destacado
          />

          <Dato
            etiqueta="Tipo provisión"
            valor={expediente.tipo_provision}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 12. FINCA */}
        {/* ================================================== */}

        <Seccion
          titulo="Finca"
          subtitulo="Información registral de la finca"
          icono="finca"
        >
          <Dato
            etiqueta="Finca"
            valor={expediente.finca}
            destacado
          />

          <Dato
            etiqueta="Fecha registral"
            valor={expediente.registral_fecha}
            tipo="fecha"
          />
        </Seccion>


        {/* ================================================== */}
        {/* 13. DEFECTOS */}
        {/* ================================================== */}

        <Seccion
          titulo="Defectos"
          subtitulo="Incidencias y defectos registrales"
          icono="defectos"
        >
          <Dato
            etiqueta="Defectos abiertos"
            valor={
              expediente.tiene_defectos_abiertos
                ? "SÍ"
                : "NO"
            }
            destacado
          />

          <Dato
            etiqueta="Tipo error"
            valor={expediente.tipo_error}
          />

          <Dato
            etiqueta="Falta / defecto"
            valor={expediente.falta_defecto}
          />

          <Dato
            etiqueta="Descripción error"
            valor={expediente.descripcion_error}
          />
        </Seccion>


        {/* ================================================== */}
        {/* 14. OBSERVACIONES */}
        {/* ================================================== */}

        <Observaciones
          texto={expediente.observaciones}
        />


        {/* ================================================== */}
        {/* NOTA DE ESTRUCTURA
            CGN / GTG-BANKIA / OTROS / GESTORÍA
            se han retirado de esta versión.
        ================================================== */}

      </div>


      {/* ==================================================== */}
      {/* MODAL ENVIAR A NOTARIO                               */}
      {/* ==================================================== */}

      {mostrarEnviarANotario && (
        <EnviarANotarioModal
          expediente={expediente}
          onCerrar={cerrarEnviarANotario}
          onGuardar={guardarEnviarANotario}
        />
      )}
    </div>
  );
}

