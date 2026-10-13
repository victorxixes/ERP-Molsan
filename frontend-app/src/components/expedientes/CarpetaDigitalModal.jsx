```jsx
import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

// ============================================================
// ESTRUCTURA DE LA CARPETA DIGITAL
// Los valores enviados al backend se mantienen separados
// de los títulos visibles para conservar compatibilidad.
// ============================================================

const ACTIVIDADES = [
  {
    id: "documentacion-previa",
    numero: "01",
    titulo: "Documentación previa",
    descripcion: "Documentación inicial y preparación del expediente.",
    icono: "📄",
    color: "blue",
    categorias: [
      { valor: "Documentos Absis", titulo: "Documentos Absis" },
      {
        valor: "Hoja de Encargo firmada",
        titulo: "Hoja de Encargo firmada",
      },
      {
        valor: "Justificante de cancelación",
        titulo: "Justificante de cancelación",
      },
      {
        valor: "Nota simple registral",
        titulo: "Nota simple registral",
      },
      {
        valor: "Mails de la Oficina",
        titulo: "Mails de la Oficina",
      },
      {
        valor: "Escrituras/borradores",
        titulo: "Borradores de escrituras",
        alias: ["Borradores de escrituras"],
      },
    ],
  },
  {
    id: "sede-notarial",
    numero: "02",
    titulo: "Sede notarial",
    descripcion: "Documentación relacionada con la actividad notarial.",
    icono: "🏛️",
    color: "emerald",
    categorias: [
      {
        valor: "Presentación Registro",
        titulo: "Presentación Registro",
      },
      { valor: "Copia simple", titulo: "Copia simple" },
    ],
  },
  {
    id: "liquidacion-impuestos",
    numero: "03",
    titulo: "Liquidación impuestos",
    descripcion: "Justificantes y documentación tributaria.",
    icono: "📑",
    color: "amber",
    categorias: [
      { valor: "AJD/ITP", titulo: "AJD/ITP" },
      {
        valor: "Otra documentación",
        titulo: "Otra documentación",
      },
    ],
  },
  {
    id: "gestion-economica",
    numero: "04",
    titulo: "Gestión económica",
    descripcion: "Facturas y documentación económica.",
    icono: "💼",
    color: "violet",
    categorias: [
      { valor: "Factura notarial", titulo: "Factura notarial" },
      { valor: "Factura Registral", titulo: "Factura Registral" },
    ],
  },
  {
    id: "defectos-registrales",
    numero: "05",
    titulo: "Defectos registrales",
    descripcion: "Documentación de los defectos detectados.",
    icono: "⚠️",
    color: "rose",
    categorias: [
      { valor: "Defecto registral", titulo: "Defecto registral" },
    ],
  },
  {
    id: "tramitacion-inscripcion",
    numero: "06",
    titulo: "Tramitación inscripción",
    descripcion: "Documentación de la inscripción registral.",
    icono: "🗂️",
    color: "cyan",
    categorias: [
      { valor: "Hoja de Inscripción", titulo: "Hoja de Inscripción" },
    ],
  },
  {
    id: "facturacion-cierre",
    numero: "07",
    titulo: "Facturación y cierre",
    descripcion: "Documentación final y cierre del expediente.",
    icono: "🏁",
    color: "indigo",
    categorias: [
      {
        valor: "Escritura digital final",
        titulo: "Escritura digital final",
      },
      {
        valor: "Honorarios gestoría",
        titulo: "Honorarios gestoría",
      },
    ],
  },
];

const BASE = (id) =>
  `/expedientes/${encodeURIComponent(id)}/carpeta-digital`;

const COLORES = {
  blue: {
    borde: "border-blue-200",
    fondo: "bg-blue-50/70",
    icono: "bg-blue-600 text-white",
    numero: "bg-blue-100 text-blue-700",
    titulo: "text-blue-800",
    acento: "text-blue-700",
    subida:
      "border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50",
    foco: "focus-visible:ring-blue-500",
  },
  emerald: {
    borde: "border-emerald-200",
    fondo: "bg-emerald-50/50",
    icono: "bg-emerald-600 text-white",
    numero: "bg-emerald-100 text-emerald-700",
    titulo: "text-emerald-800",
    acento: "text-emerald-700",
    subida:
      "border-emerald-200 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50",
    foco: "focus-visible:ring-emerald-500",
  },
  amber: {
    borde: "border-amber-200",
    fondo: "bg-amber-50/50",
    icono: "bg-amber-500 text-white",
    numero: "bg-amber-100 text-amber-800",
    titulo: "text-amber-800",
    acento: "text-amber-700",
    subida:
      "border-amber-200 text-amber-700 hover:border-amber-400 hover:bg-amber-50",
    foco: "focus-visible:ring-amber-500",
  },
  violet: {
    borde: "border-violet-200",
    fondo: "bg-violet-50/50",
    icono: "bg-violet-600 text-white",
    numero: "bg-violet-100 text-violet-700",
    titulo: "text-violet-800",
    acento: "text-violet-700",
    subida:
      "border-violet-200 text-violet-700 hover:border-violet-400 hover:bg-violet-50",
    foco: "focus-visible:ring-violet-500",
  },
  rose: {
    borde: "border-rose-200",
    fondo: "bg-rose-50/50",
    icono: "bg-rose-600 text-white",
    numero: "bg-rose-100 text-rose-700",
    titulo: "text-rose-800",
    acento: "text-rose-700",
    subida:
      "border-rose-200 text-rose-700 hover:border-rose-400 hover:bg-rose-50",
    foco: "focus-visible:ring-rose-500",
  },
  cyan: {
    borde: "border-cyan-200",
    fondo: "bg-cyan-50/50",
    icono: "bg-cyan-600 text-white",
    numero: "bg-cyan-100 text-cyan-700",
    titulo: "text-cyan-800",
    acento: "text-cyan-700",
    subida:
      "border-cyan-200 text-cyan-700 hover:border-cyan-400 hover:bg-cyan-50",
    foco: "focus-visible:ring-cyan-500",
  },
  indigo: {
    borde: "border-indigo-200",
    fondo: "bg-indigo-50/50",
    icono: "bg-indigo-600 text-white",
    numero: "bg-indigo-100 text-indigo-700",
    titulo: "text-indigo-800",
    acento: "text-indigo-700",
    subida:
      "border-indigo-200 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50",
    foco: "focus-visible:ring-indigo-500",
  },
};

export default function CarpetaDigitalModal({
  expedienteId,
  onClose,
}) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState("");
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});

  const cargar = useCallback(async () => {
    if (!expedienteId) {
      setError("No se ha encontrado el identificador del expediente.");
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError("");

      const res = await axios.get(BASE(expedienteId));

      setDocumentos(
        Array.isArray(res.data) ? res.data : res.data?.items || []
      );
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudieron cargar los documentos."
      );
    } finally {
      setCargando(false);
    }
  }, [expedienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function subir(event, categoria) {
    const archivos = Array.from(event.target.files || []);

    // Permite seleccionar otra vez el mismo archivo.
    event.target.value = "";

    if (!archivos.length) return;

    setSubiendo(categoria);
    setError("");

    try {
      for (const archivo of archivos) {
        const data = new FormData();

        data.append("archivo", archivo);
        data.append("categoria", categoria);

        await axios.post(BASE(expedienteId), data);
      }

      await cargar();
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo guardar uno de los archivos. Comprueba las categorías admitidas por el backend."
      );

      // Actualiza el listado por si se guardaron algunos archivos
      // antes de producirse el error.
      await cargar();
    } finally {
      setSubiendo("");
    }
  }

  async function descargar(doc, abrir = false) {
    try {
      setError("");

      const res = await axios.get(
        `${BASE(expedienteId)}/${doc.id}/descargar`,
        { responseType: "blob" }
      );

      const url = URL.createObjectURL(res.data);

      if (abrir) {
        const ventana = window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );

        if (!ventana) {
          const a = document.createElement("a");
          a.href = url;
          a.download = doc.nombre_original || "documento";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.nombre_original || "documento";

        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo abrir o descargar el documento."
      );
    }
  }

  async function eliminar(doc) {
    const confirmar = window.confirm(
      `¿Eliminar el archivo «${doc.nombre_original}»?`
    );

    if (!confirmar) return;

    try {
      setError("");

      await axios.delete(`${BASE(expedienteId)}/${doc.id}`);

      await cargar();
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo eliminar el documento."
      );
    }
  }

  function documentosDeCategoria(categoria) {
    // Compatibilidad con los nombres históricos que ya pudieran
    // existir en la base de datos.
    const valores = [
      categoria.valor,
      ...(categoria.alias || []),
    ];

    return documentos.filter((doc) =>
      valores.includes(doc.categoria)
    );
  }

  function documentosDeActividad(actividad) {
    return actividad.categorias.reduce(
      (total, categoria) =>
        total + documentosDeCategoria(categoria).length,
      0
    );
  }

  function bytes(n) {
    const numero = Number(n) || 0;

    if (numero < 1024) return `${numero} B`;

    if (numero < 1048576) {
      return `${(numero / 1024).toFixed(1)} KB`;
    }

    return `${(numero / 1048576).toFixed(1)} MB`;
  }

  function fecha(valor) {
    if (!valor) return "";

    const date = new Date(valor);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  const totalDocumentos = documentos.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Carpeta digital del expediente"
        className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* CABECERA */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-2xl text-white shadow-sm">
              📁
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">
                MOLSAN ERP · DOCUMENTACIÓN
              </p>

              <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">
                Carpeta digital
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Expediente{" "}
                <span className="font-bold text-slate-700">
                  {expedienteId || "—"}
                </span>
                <span className="mx-2 text-slate-300">·</span>
                {totalDocumentos} archivo(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            ✕ <span className="hidden sm:inline">Cerrar</span>
          </button>
        </header>

        {/* CONTENIDO */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-5">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span aria-hidden="true">⚠️</span>
              <p className="min-w-0 flex-1">{error}</p>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 rounded px-1 font-bold hover:bg-red-100"
                aria-label="Cerrar mensaje"
              >
                ✕
              </button>
            </div>
          )}

          {cargando ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
              <p className="text-sm font-medium text-slate-500">
                Cargando carpeta digital…
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Organización documental
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Documentos agrupados por actividad del expediente.
                  </p>
                </div>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                  7 actividades
                </span>
              </div>

              <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
                {ACTIVIDADES.map((actividad) => {
                  const color = COLORES[actividad.color];
                  const totalActividad =
                    documentosDeActividad(actividad);
                  const esCierre =
                    actividad.id === "facturacion-cierre";

                  return (
                    <article
                      key={actividad.id}
                      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${color.borde} ${
                        esCierre ? "md:col-span-2 xl:col-span-3" : ""
                      }`}
                    >
                      {/* CABECERA DE ACTIVIDAD */}
                      <div
                        className={`flex items-start gap-3 border-b border-slate-100 px-4 py-3 ${color.fondo}`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm ${color.icono}`}
                        >
                          {actividad.icono}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold tracking-wider ${color.acento}`}
                            >
                              ACTIVIDAD {actividad.numero}
                            </span>

                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${color.numero}`}
                            >
                              {totalActividad}
                            </span>
                          </div>

                          <h3
                            className={`mt-0.5 text-sm font-extrabold ${color.titulo}`}
                          >
                            {actividad.titulo}
                          </h3>

                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            {actividad.descripcion}
                          </p>
                        </div>
                      </div>

                      {/* CATEGORÍAS */}
                      <div
                        className={`flex flex-1 flex-col gap-3 p-3 sm:p-4 ${
                          esCierre
                            ? "xl:grid xl:grid-cols-2 xl:items-start xl:gap-4"
                            : ""
                        }`}
                      >
                        {actividad.categorias.map((categoria) => {
                          const lista =
                            documentosDeCategoria(categoria);
                          const clave =
                            `${actividad.id}:${categoria.valor}`;
                          const abierta =
                            !!categoriasAbiertas[clave];
                          const mostrar =
                            abierta ? lista : lista.slice(0, 3);

                          return (
                            <section
                              key={categoria.valor}
                              className="min-w-0 rounded-lg border border-slate-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="break-words text-xs font-bold leading-5 text-slate-800">
                                    {categoria.titulo}
                                  </h4>

                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {lista.length} archivo(s)
                                  </p>
                                </div>

                                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[10px] font-extrabold text-slate-600">
                                  {lista.length}
                                </span>
                              </div>

                              {/* ADJUNTAR */}
                              <label
                                className={`mt-3 flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-center text-[11px] font-bold transition focus-within:ring-2 ${color.subida} ${color.foco} ${
                                  subiendo === categoria.valor
                                    ? "pointer-events-none opacity-60"
                                    : ""
                                }`}
                              >
                                <span className="text-base leading-none">
                                  {subiendo === categoria.valor
                                    ? "⏳"
                                    : "+"}
                                </span>

                                <span>
                                  {subiendo === categoria.valor
                                    ? "Guardando archivos…"
                                    : "Adjuntar archivo(s)"}
                                </span>

                                <input
                                  className="sr-only"
                                  type="file"
                                  multiple
                                  onChange={(e) =>
                                    subir(e, categoria.valor)
                                  }
                                  disabled={!!subiendo}
                                  aria-label={`Adjuntar archivos: ${categoria.titulo}`}
                                />
                              </label>

                              {/* LISTADO */}
                              {lista.length > 0 && (
                                <ul className="mt-2 divide-y divide-slate-100">
                                  {mostrar.map((doc) => (
                                    <li
                                      key={doc.id}
                                      className="flex min-w-0 items-center gap-2 py-2"
                                    >
                                      <div className="flex h-8 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-sm">
                                        📕
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p
                                          className="truncate text-[11px] font-semibold text-slate-700"
                                          title={doc.nombre_original}
                                        >
                                          {doc.nombre_original}
                                        </p>

                                        <p className="mt-0.5 text-[10px] text-slate-400">
                                          {bytes(doc.tamano_bytes)} 
                                          {doc.fecha_subida
                                            ? ` · ${fecha(doc.fecha_subida)}`
                                            : ""}
                                        </p>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            descargar(doc, true)
                                          }
                                          title="Ver documento"
                                          aria-label={`Ver ${doc.nombre_original}`}
                                          className="rounded-md px-2 py-1.5 text-[10px] font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        >
                                          Ver
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            descargar(doc, false)
                                          }
                                          title="Descargar documento"
                                          aria-label={`Descargar ${doc.nombre_original}`}
                                          className="rounded-md px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        >
                                          ↓
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => eliminar(doc)}
                                          title="Eliminar documento"
                                          aria-label={`Eliminar ${doc.nombre_original}`}
                                          className="rounded-md px-2 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {lista.length === 0 && (
                                <p className="py-3 text-center text-[10px] text-slate-400">
                                  No hay documentos adjuntos.
                                </p>
                              )}

                              {lista.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCategoriasAbiertas((actual) => ({
                                      ...actual,
                                      [clave]: !actual[clave],
                                    }))
                                  }
                                  className={`mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-bold transition hover:bg-slate-50 ${color.acento}`}
                                >
                                  {abierta
                                    ? "Mostrar menos"
                                    : `Ver todos los documentos (${lista.length})`}

                                  <span
                                    className={`transition-transform ${
                                      abierta ? "rotate-180" : ""
                                    }`}
                                  >
                                    ⌄
                                  </span>
                                </button>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* PIE */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <p className="hidden text-[11px] text-slate-400 sm:block">
            MOLSAN ERP · Gestión documental del expediente
          </p>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            Terminar
          </button>
        </footer>
      </section>
    </div>
  );
}
```
