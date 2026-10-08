import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { obtenerExpediente } from "../../api/expedientes";
import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";


// ============================================================
// HELPERS
// ============================================================

function valorVisible(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return String(valor);
}


function formatearFecha(fecha) {
  if (!fecha) return "—";

  const texto = String(fecha);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [year, month, day] = texto.split("-");
    return `${day}/${month}/${year}`;
  }

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
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return String(valor);
  }

  return numero.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


function normalizarActividad(valor) {
  if (!valor) return "";

  return String(valor)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


// ============================================================
// ICONOS DE SECCIÓN
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
    actividad: "⚙️",
    facturacion: "💶",
    economico: "📊",
    provision: "💰",
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
// BADGE ESTADO
// ============================================================

function EstadoBadge({ valor }) {
  const texto = valorVisible(valor);

  const normalizado = texto.toLowerCase();

  let clases =
    "border-slate-200 bg-slate-50 text-slate-700";

  if (
    normalizado.includes("vig") ||
    normalizado.includes("abiert") ||
    normalizado.includes("activo")
  ) {
    clases =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalizado.includes("cerr") ||
    normalizado.includes("final")
  ) {
    clases =
      "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (
    normalizado.includes("error") ||
    normalizado.includes("defecto")
  ) {
    clases =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${clases}`}
    >
      {texto}
    </span>
  );
}


// ============================================================
// DATO
// ============================================================

function Dato({
  etiqueta,
  valor,
  tipo = "texto",
  destacado = false,
}) {
  let contenido = valorVisible(valor);

  if (tipo === "fecha") {
    contenido = formatearFecha(valor);
  }

  if (tipo === "numero") {
    contenido = formatearNumero(valor);
  }

  const esEstado =
    etiqueta === "Estado" ||
    etiqueta === "Estado actividad";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {etiqueta}
      </div>

      {esEstado ? (
        <EstadoBadge valor={contenido} />
      ) : (
        <div
          className={
            destacado
              ? "text-sm font-bold text-slate-800"
              : "text-sm font-medium text-slate-600"
          }
        >
          {contenido}
        </div>
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
  icono,
  children,
}) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/78 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl">

      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      <div className="mb-5 flex items-center gap-3">

        <IconoSeccion tipo={icono} />

        <div>
          <h2 className="text-base font-bold text-slate-800">
            {titulo}
          </h2>

          {subtitulo && (
            <p className="mt-0.5 text-xs text-slate-400">
              {subtitulo}
            </p>
          )}
        </div>

      </div>

      <div className="space-y-3">
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

      <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-slate-400 via-blue-400 to-indigo-400" />

      <div className="mb-4 flex items-center gap-3">

        <IconoSeccion tipo="identificacion" />

        <div>
          <h2 className="text-base font-bold text-slate-800">
            Observaciones
          </h2>

          <p className="text-xs text-slate-400">
            Información adicional del expediente
          </p>
        </div>

      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4">
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {valorVisible(texto)}
        </div>
      </div>

    </section>
  );
}


// ============================================================
// FICHA EXPEDIENTE
// ============================================================

export default function FichaExpediente() {
  const { id } = useParams();

  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarEnviarANotario, setMostrarEnviarANotario] =
    useState(false);


  // ==========================================================
  // CARGA EXPEDIENTE
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
        console.error(
          "Error cargando expediente:",
          err
        );

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
  // ACTIVIDAD
  // ==========================================================

  const actividadNormalizada = useMemo(() => {
    return normalizarActividad(
      expediente?.actividad_actual
    );
  }, [expediente?.actividad_actual]);


  const esDocumentacionPrevia =
    actividadNormalizada.includes("document") ||
    actividadNormalizada.includes("previa");


  // ==========================================================
  // ENVIAR A NOTARIO
  // ==========================================================

  function cerrarEnviarANotario() {
    setMostrarEnviarANotario(false);
  }


  async function guardarEnviarANotario(payload) {
    console.log(
      "ENVIAR A NOTARIO — payload:",
      payload
    );

    setMostrarEnviarANotario(false);
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-[1600px]">

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl">

            <div className="animate-pulse">

              <div className="mb-4 h-4 w-40 rounded bg-slate-200" />

              <div className="mb-3 h-8 w-80 rounded bg-slate-200" />

              <div className="h-4 w-64 rounded bg-slate-200" />

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
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-[1600px]">

          <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 shadow-sm">

            <h1 className="text-lg font-bold text-red-700">
              No se ha podido cargar el expediente
            </h1>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <Link
              to="/expedientes"
              className="mt-5 inline-flex rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              ← Volver a expedientes
            </Link>

          </div>

        </div>

      </div>
    );
  }


  // ==========================================================
  // SIN DATOS
  // ==========================================================

  if (!expediente) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-[1600px]">

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-sm">

            <h1 className="text-lg font-bold text-slate-800">
              Expediente no encontrado
            </h1>

            <Link
              to="/expedientes"
              className="mt-5 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              ← Volver a expedientes
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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

      <div className="mx-auto max-w-[1600px] space-y-5">


        {/* ====================================================
            CABECERA
        ==================================================== */}

        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur-2xl">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

            <div>

              <Link
                to="/expedientes"
                className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800"
              >
                ← Expedientes
              </Link>

              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Ficha de expediente
              </div>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
                Expediente{" "}
                {valorVisible(expediente.id_expediente)}
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Información completa del expediente
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-3">

              {expediente.fecha_prevista_firma && (
                <Link
                  to={`/agenda?fecha=${String(
                    expediente.fecha_prevista_firma
                  ).slice(0, 10)}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  📅 Ver agenda
                </Link>
              )}


              {(esDocumentacionPrevia ||
                actividadNormalizada.includes("document") ||
                actividadNormalizada.includes("previa")) && (

                <button
                  type="button"
                  onClick={() =>
                    setMostrarEnviarANotario(true)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  ✒️ Enviar a notario
                </button>

              )}

            </div>

          </div>

        </header>


        {/* ====================================================
            BLOQUE 1
            ESTADO / TITULARES / SOLICITANTES
        ==================================================== */}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">


          {/* ==================================================
              IZQUIERDA — ESTADO
          ================================================== */}

          <Seccion
            titulo="Estado"
            subtitulo="Situación actual del expediente"
            icono="estado"
          >

            <Dato
              etiqueta="Estado"
              valor={expediente.estado_expediente}
              destacado
            />

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
              etiqueta="Tipo operación"
              valor={expediente.tipo_operacion}
              destacado
            />

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
              etiqueta="Fecha alta"
              valor={expediente.fecha_alta}
              tipo="fecha"
              destacado
            />

          </Seccion>


          {/* ==================================================
              CENTRO — TITULARES
          ================================================== */}

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


          {/* ==================================================
              DERECHA — SOLICITANTES
          ================================================== */}

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

          </Seccion>

        </div>


        {/* ====================================================
            INFORMACIÓN CREDITICIA
        ==================================================== */}

        <Seccion
          titulo="Información crediticia"
          subtitulo="Datos identificativos del préstamo/crédito"
          icono="identificacion"
        >

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

            <Dato
              etiqueta="ID expediente"
              valor={expediente.id_expediente}
              destacado
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

            <Dato
              etiqueta="Finca"
              valor={expediente.finca}
              destacado
            />

          </div>

        </Seccion>


        {/* ====================================================
            NOTARIO
        ==================================================== */}

        <Seccion
          titulo="Notario"
          subtitulo="Información del notario asociado"
          icono="notario"
        >

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

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

          </div>

        </Seccion>


        {/* ====================================================
            OFICINA
        ==================================================== */}

        <Seccion
          titulo="Oficina"
          subtitulo="Datos de oficina y asignación"
          icono="oficina"
        >

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

            <Dato
              etiqueta="Oficina"
              valor={expediente.oficina}
              destacado
            />

            <Dato
              etiqueta="DAN"
              valor={expediente.dan}
            />

          </div>

        </Seccion>


       

        {/* ====================================================
            OBSERVACIONES
        ==================================================== */}

        <Observaciones
          texto={expediente.observaciones}
        />


        {/* ====================================================
            MODAL ENVIAR A NOTARIO
        ==================================================== */}

        {mostrarEnviarANotario && (
          <EnviarANotarioModal
            expediente={expediente}
            onCerrar={cerrarEnviarANotario}
            onGuardar={guardarEnviarANotario}
          />
        )}

      </div>

    </div>
  );
}

