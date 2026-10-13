import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

// ============================================================
// CATEGORÍAS ADMITIDAS POR EL BACKEND ACTUAL
// No cambiar estos valores sin actualizar también el router.
// ============================================================

const ACTIVIDADES = [
  {
    numero: "01",
    titulo: "Documentación previa",
    descripcion: "Documentación inicial del expediente.",
    categorias: [
      "Documentos Absis",
      "Hoja de Encargo firmada",
      "Justificante de cancelación",
      "Nota simple registral",
      "Escrituras/borradores",
    ],
  },
  {
    numero: "02",
    titulo: "Sede notarial",
    descripcion: "Documentación relacionada con la gestión notarial.",
    categorias: ["Presentación Registro"],
  },
  {
    numero: "03",
    titulo: "Liquidación de impuestos",
    descripcion: "Justificantes y documentación tributaria.",
    categorias: ["AJD/ITP"],
  },
  {
    numero: "04",
    titulo: "Gestión económica",
    descripcion: "Facturas y documentación económica.",
    categorias: ["Factura notarial", "Factura Registral"],
  },
  {
  numero: "05",
  titulo: "Defectos registrales",
  descripcion: "Documentación relativa a defectos y subsanaciones.",
  categorias: [
    "Defecto registral",
    "Subsanación del defecto",
  ],
},
  {
    numero: "06",
    titulo: "Tramitación inscripción",
    descripcion: "Documentación de la inscripción registral.",
    categorias: ["Hoja de Inscripción"],
  },
  {
    numero: "07",
    titulo: "Facturación y cierre",
    descripcion: "Documentación final del expediente.",
    categorias: ["Escritura digital final"],
  },
  {
    numero: "08",
    titulo: "Documentación general",
    descripcion: "Correos y documentación complementaria.",
    categorias: ["Mails de la Oficina", "Otra documentación"],
  },
];

const BASE = (id) =>
  "/expedientes/" +
  encodeURIComponent(id) +
  "/carpeta-digital";

export default function CarpetaDigitalModal({
  expedienteId,
  onClose,
}) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState("");

  // Todas las actividades aparecen extendidas al abrir el modal.
  // Cada actividad se puede ocultar o extender independientemente.
  const [actividadesAbiertas, setActividadesAbiertas] = useState({
    "01": true,
    "02": true,
    "03": true,
    "04": true,
    "05": true,
    "06": true,
    "07": true,
    "08": true,
  });

  const cargar = useCallback(async () => {
    if (!expedienteId) {
      setError(
        "No se ha encontrado el identificador del expediente."
      );
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta = await axios.get(BASE(expedienteId));

      setDocumentos(
        Array.isArray(respuesta.data)
          ? respuesta.data
          : respuesta.data?.items || []
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

  function alternarActividad(numero) {
    setActividadesAbiertas((actual) => ({
      ...actual,
      [numero]: !actual[numero],
    }));
  }

  function extenderTodas() {
    setActividadesAbiertas({
      "01": true,
      "02": true,
      "03": true,
      "04": true,
      "05": true,
      "06": true,
      "07": true,
      "08": true,
    });
  }

  function ocultarTodas() {
    setActividadesAbiertas({
      "01": false,
      "02": false,
      "03": false,
      "04": false,
      "05": false,
      "06": false,
      "07": false,
      "08": false,
    });
  }

  async function subir(evento, categoria) {
    const archivos = Array.from(
      evento.target.files || []
    );

    // Permite volver a seleccionar el mismo archivo.
    evento.target.value = "";

    if (!archivos.length) return;

    setSubiendo(categoria);
    setError("");

    try {
      for (const archivo of archivos) {
        const datos = new FormData();

        datos.append("archivo", archivo);
        datos.append("categoria", categoria);

        await axios.post(BASE(expedienteId), datos);
      }

      await cargar();
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo guardar uno de los archivos."
      );
    } finally {
      setSubiendo("");
    }
  }

  async function descargar(documento, abrir = false) {
    setError("");

    try {
      const respuesta = await axios.get(
        BASE(expedienteId) +
          "/" +
          documento.id +
          "/descargar",
        { responseType: "blob" }
      );

      const url = URL.createObjectURL(respuesta.data);

      if (abrir) {
        const ventana = window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );

        if (!ventana) {
          setError(
            "El navegador ha bloqueado la ventana. Utiliza Descargar."
          );
        }
      } else {
        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download =
          documento.nombre_original || "documento";

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo abrir o descargar el documento."
      );
    }
  }

  async function eliminar(documento) {
    const confirmar = window.confirm(
      `¿Quieres eliminar el archivo «${documento.nombre_original}»?`
    );

    if (!confirmar) return;

    setError("");

    try {
      await axios.delete(
        BASE(expedienteId) + "/" + documento.id
      );

      await cargar();
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo eliminar el documento."
      );
    }
  }

  function documentosCategoria(categoria) {
    return documentos.filter(
      (documento) => documento.categoria === categoria
    );
  }

  function formatoBytes(bytes) {
    const cantidad = Number(bytes) || 0;

    if (cantidad < 1024) {
      return `${cantidad} B`;
    }

    if (cantidad < 1048576) {
      return `${(cantidad / 1024).toFixed(1)} KB`;
    }

    return `${(cantidad / 1048576).toFixed(1)} MB`;
  }

  const totalCategorias = ACTIVIDADES.reduce(
    (total, actividad) =>
      total + actividad.categorias.length,
    0
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-2 sm:p-5"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Carpeta digital del expediente"
        className="flex max-h-[96vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl"
      >
        {/* CABECERA */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">
              MOLSAN ERP · Gestión documental
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-slate-900 sm:text-xl">
              📁 Carpeta digital
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Expediente {expedienteId || "—"} ·{" "}
              {documentos.length} documento(s)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            ✕ Cerrar
          </button>
        </header>

        {/* CONTENIDO */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {/* CONTROLES GENERALES */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <div>
              <p className="text-sm font-bold text-slate-800">
                Actividades del expediente
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Oculta o extiende cada bloque de forma independiente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={extenderTodas}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                ⬇ Extender todas
              </button>

              <button
                type="button"
                onClick={ocultarTodas}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                ⬆ Ocultar todas
              </button>
            </div>
          </div>

          {/* ERRORES */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* CARGA */}
          {cargando ? (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
              <p className="text-sm font-semibold text-slate-600">
                Cargando carpeta digital…
              </p>
            </div>
          ) : (
            <>
              {/*
                Tres columnas en escritorio:
                fila 1: actividades 01, 02, 03
                fila 2: actividades 04, 05, 06
                fila 3: actividades 07, 08
              */}
              <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
                {ACTIVIDADES.map((actividad) => {
                  const abierta =
                    !!actividadesAbiertas[actividad.numero];

                  const cantidadDocumentos =
                    actividad.categorias.reduce(
                      (total, categoria) =>
                        total +
                        documentosCategoria(categoria).length,
                      0
                    );

                  return (
                    <article
                      key={actividad.numero}
                      className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                    >
                      {/* CABECERA PLEGABLE DE LA ACTIVIDAD */}
                      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-white p-3 sm:p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-sm font-extrabold text-indigo-700">
                          {actividad.numero}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            alternarActividad(actividad.numero)
                          }
                          aria-expanded={abierta}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                            ACTIVIDAD {actividad.numero}
                          </span>

                          <span className="mt-1 block text-sm font-extrabold leading-snug text-slate-900">
                            {actividad.titulo}
                          </span>

                          <span className="mt-1 block text-xs text-slate-500">
                            {cantidadDocumentos} documento(s)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            alternarActividad(actividad.numero)
                          }
                          aria-expanded={abierta}
                          aria-label={
                            abierta
                              ? `Ocultar ${actividad.titulo}`
                              : `Extender ${actividad.titulo}`
                          }
                          title={
                            abierta
                              ? "Ocultar actividad"
                              : "Extender actividad"
                          }
                          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          {abierta ? "Ocultar ↑" : "Extender ↓"}
                        </button>
                      </div>

                      {/* CONTENIDO EXPANDIBLE */}
                      {abierta && (
                        <div className="space-y-3 border-t border-slate-100 p-3 sm:p-4">
                          <p className="text-xs leading-relaxed text-slate-500">
                            {actividad.descripcion}
                          </p>

                          {actividad.categorias.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3">
                              <p className="text-xs font-bold text-amber-800">
                                Categorías pendientes de configurar
                              </p>

                              <p className="mt-1 text-xs leading-relaxed text-amber-700">
                                Las categorías de defectos registrales
                                y subsanaciones todavía deben habilitarse
                                en el backend antes de poder adjuntar
                                archivos en esta actividad.
                              </p>
                            </div>
                          ) : (
                            actividad.categorias.map((categoria) => {
                              const lista =
                                documentosCategoria(categoria);

                              return (
                                <div
                                  key={categoria}
                                  className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
                                >
                                  {/* CATEGORÍA */}
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="min-w-0 break-words text-xs font-extrabold text-slate-800">
                                      {categoria === "Mails de la Oficina"
                                        ? "Correos de la oficina"
                                        : categoria}
                                    </h4>

                                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-extrabold text-slate-600">
                                      {lista.length}
                                    </span>
                                  </div>

                                  {/* ADJUNTAR */}
                                  <label
                                    className={`mt-3 flex items-center justify-center rounded-lg border border-dashed px-3 py-2.5 text-center text-xs font-bold transition ${
                                      subiendo === categoria
                                        ? "cursor-wait border-slate-200 bg-slate-100 text-slate-400"
                                        : "cursor-pointer border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50"
                                    }`}
                                  >
                                    {subiendo === categoria
                                      ? "Guardando archivos…"
                                      : "＋ Adjuntar archivo(s)"}

                                    <input
                                      className="hidden"
                                      type="file"
                                      multiple
                                      disabled={!!subiendo}
                                      onChange={(evento) =>
                                        subir(evento, categoria)
                                      }
                                    />
                                  </label>

                                  {/* LISTADO COMPLETO DE DOCUMENTOS */}
                                  {lista.length > 0 ? (
                                    <ul className="mt-2 divide-y divide-slate-200">
                                      {lista.map((documento) => (
                                        <li
                                          key={documento.id}
                                          className="flex min-w-0 items-center gap-1.5 py-2"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <p
                                              className="break-words text-xs font-semibold text-slate-700"
                                              title={
                                                documento.nombre_original
                                              }
                                            >
                                              📄{" "}
                                              {documento.nombre_original}
                                            </p>

                                            <p className="mt-1 text-[10px] text-slate-400">
                                              {formatoBytes(
                                                documento.tamano_bytes
                                              )}
                                              {documento.fecha_subida
                                                ? ` · ${new Date(
                                                    documento.fecha_subida
                                                  ).toLocaleString("es-ES")}`
                                                : ""}
                                            </p>
                                          </div>

                                          <div className="flex shrink-0 items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                descargar(documento, true)
                                              }
                                              title="Abrir documento"
                                              className="rounded-md border border-indigo-100 bg-white px-2 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
                                            >
                                              Ver
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                descargar(documento, false)
                                              }
                                              title="Descargar documento"
                                              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                                            >
                                              ↓
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                eliminar(documento)
                                              }
                                              title="Eliminar documento"
                                              className="rounded-md border border-red-100 bg-white px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="py-3 text-center text-[11px] text-slate-400">
                                      No hay documentos adjuntos.
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              <p className="mt-4 text-center text-[10px] text-slate-400">
                {totalCategorias} categorías documentales configuradas ·
                Los documentos se conservan al ocultar una actividad.
              </p>
            </>
          )}
        </div>

        {/* PIE */}
        <footer className="flex shrink-0 justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <span className="self-center text-xs text-slate-500">
            {documentos.length} documento(s) en total
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-700"
          >
            Terminar
          </button>
        </footer>
      </section>
    </div>
  );
}

