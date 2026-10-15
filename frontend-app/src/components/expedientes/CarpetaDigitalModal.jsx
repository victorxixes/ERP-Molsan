```jsx
import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

// Categorías documentales existentes: se conservan las etiquetas
// utilizadas por el repositorio actual.
const BLOQUES = [
  {
    id: "documentacion-previa",
    titulo: "Documentación previa",
    descripcion:
      "Documentación recibida del banco y documentos necesarios antes de la firma.",
    categorias: [
      { etiqueta: "Documentos ABSIS", categoria: "Documentos Absis" },
      {
        etiqueta: "Hoja de encargo firmada",
        categoria: "Hoja de Encargo firmada",
      },
      {
        etiqueta: "Justificante de cancelación",
        categoria: "Justificante de cancelación",
      },
      {
        etiqueta: "Nota simple registral",
        categoria: "Nota simple registral",
      },
      {
        etiqueta: "Borradores de escritura",
        categoria: "Escrituras/borradores",
      },
    ],
  },
  {
    id: "sede-notarial",
    titulo: "Sede notarial con protocolo",
    descripcion:
      "Documentos generados o recibidos durante la gestión notarial.",
    categorias: [
      {
        etiqueta: "Presentación Registro",
        categoria: "Presentación Registro",
      },
      { etiqueta: "Copia simple", categoria: "Copia simple" },
    ],
  },
  {
    id: "liquidacion-impuestos",
    titulo: "Liquidación de impuestos",
    descripcion:
      "Justificantes y documentación relativa a la liquidación tributaria.",
    categorias: [{ etiqueta: "AJD", categoria: "AJD/ITP" }],
  },
  {
    id: "tramitacion-inscripcion",
    titulo: "Tramitación inscripción",
    descripcion:
      "Documentación que acredita la inscripción registral.",
    categorias: [
      {
        etiqueta: "Hoja de inscripción",
        categoria: "Hoja de Inscripción",
      },
    ],
  },
  {
    id: "defectos-registrales",
    titulo: "Defectos registrales",
    descripcion:
      "Documentación del defecto registral y de su subsanación.",
    categorias: [
      { etiqueta: "Defecto registral", categoria: "Defecto registral" },
      {
        etiqueta: "Subsanación del defecto",
        categoria: "Subsanación del defecto",
      },
    ],
  },
  {
    id: "facturacion-cierre",
    titulo: "Facturación y cierre",
    descripcion:
      "Documentos finales para completar y cerrar el expediente.",
    categorias: [
      {
        etiqueta: "Documento de inscripción",
        categoria: "Documento de inscripción",
      },
      {
        etiqueta: "Expediente digital completo",
        categoria: "Expediente digital completo",
      },
    ],
  },
  {
    id: "gestion-economica",
    titulo: "Gestión económica",
    descripcion:
      "Facturas y otros justificantes económicos asociados al expediente.",
    categorias: [
      { etiqueta: "Factura notarial", categoria: "Factura notarial" },
      { etiqueta: "Factura registral", categoria: "Factura Registral" },
      { etiqueta: "Factura impuestos", categoria: "Factura impuestos" },
      {
        etiqueta: "Otros documentos económicos",
        categoria: "Otros documentos económicos",
      },
    ],
  },
];

const CATEGORIAS_OTROS = [
  { etiqueta: "Otra documentación", categoria: "Otra documentación" },
  { etiqueta: "Emails de oficina", categoria: "Mails de la Oficina" },
];

const BASE = (id) =>
  "/expedientes/" + encodeURIComponent(id) + "/carpeta-digital";

export default function CarpetaDigitalModal({
  expedienteId,
  onClose,
  modoActividad = false,
  onDocumentosChange,
}) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState("");
  const [bloquesAbiertos, setBloquesAbiertos] = useState({
    "documentacion-previa": true,
  });
  const [otrosAbierto, setOtrosAbierto] = useState(false);

  // Estado del visor integrado.
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState(null);
  const [urlVistaPrevia, setUrlVistaPrevia] = useState("");
  const [cargandoVistaPrevia, setCargandoVistaPrevia] = useState(false);

  // Libera la URL temporal cuando se cierra el visor o cambia el documento.
  useEffect(() => {
    return () => {
      if (urlVistaPrevia) {
        URL.revokeObjectURL(urlVistaPrevia);
      }
    };
  }, [urlVistaPrevia]);

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
      const lista = Array.isArray(res.data)
        ? res.data
        : res.data?.items || [];

      setDocumentos(lista);
      onDocumentosChange?.(lista);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudieron cargar los documentos."
      );
    } finally {
      setCargando(false);
    }
  }, [expedienteId, onDocumentosChange]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function subir(event, categoria) {
    const archivos = Array.from(event.target.files || []);
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
          "No se pudo guardar uno de los archivos."
      );
    } finally {
      setSubiendo("");
    }
  }

  async function verDocumento(doc) {
    setError("");
    setCargandoVistaPrevia(true);
    setDocumentoVistaPrevia(doc);
    setUrlVistaPrevia("");

    try {
      const res = await axios.get(
        `${BASE(expedienteId)}/${doc.id}/descargar`,
        { responseType: "blob" }
      );

      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      setUrlVistaPrevia(url);
    } catch (e) {
      setDocumentoVistaPrevia(null);
      setError(
        e?.response?.data?.detail ||
          "No se pudo abrir el documento."
      );
    } finally {
      setCargandoVistaPrevia(false);
    }
  }

  function cerrarVisor() {
    setDocumentoVistaPrevia(null);
    setUrlVistaPrevia("");
    setCargandoVistaPrevia(false);
  }

  async function descargar(doc) {
    setError("");

    try {
      const res = await axios.get(
        `${BASE(expedienteId)}/${doc.id}/descargar`,
        { responseType: "blob" }
      );

      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: "application/octet-stream" });

      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = doc.nombre_original || "documento";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo descargar el documento."
      );
    }
  }

  async function eliminar(doc) {
    if (
      !window.confirm(
        `¿Eliminar el archivo «${doc.nombre_original}»?`
      )
    ) {
      return;
    }

    try {
      setError("");
      await axios.delete(`${BASE(expedienteId)}/${doc.id}`);

      if (documentoVistaPrevia?.id === doc.id) {
        cerrarVisor();
      }

      await cargar();
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          "No se pudo eliminar el documento."
      );
    }
  }

  const porCategoria = useCallback(
    (categoria) =>
      documentos.filter((doc) => doc.categoria === categoria),
    [documentos]
  );

  const bytes = (n) => {
    const numero = Number(n || 0);

    if (numero < 1024) return `${numero} B`;
    if (numero < 1048576) return `${(numero / 1024).toFixed(1)} KB`;

    return `${(numero / 1048576).toFixed(1)} MB`;
  };

  const contarBloque = (bloque) =>
    bloque.categorias.reduce(
      (suma, item) => suma + porCategoria(item.categoria).length,
      0
    );

  const totalArchivos = documentos.length;

  const renderCategoria = ({ etiqueta, categoria }) => {
    const lista = porCategoria(categoria);

    return (
      <article
        key={categoria}
        className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800">
              {etiqueta}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              {lista.length} archivo(s)
            </p>
          </div>

          <span
            className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
              lista.length
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {lista.length}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label
            className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-bold transition ${
              subiendo === categoria
                ? "cursor-wait border-slate-200 bg-slate-100 text-slate-500"
                : "cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            {subiendo === categoria
              ? "Guardando archivo…"
              : "＋ Adjuntar/ver PDF"}

            <input
              className="hidden"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => subir(e, categoria)}
              disabled={!!subiendo}
            />
          </label>

          {lista.length > 0 && (
            <span className="text-xs text-slate-500">
              Pulsa «Ver» para consultar el documento.
            </span>
          )}
        </div>

        {lista.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {lista.map((doc) => (
              <li
                key={doc.id}
                className="flex min-w-0 flex-wrap items-center gap-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-xs font-semibold text-slate-700"
                    title={doc.nombre_original}
                  >
                    {doc.nombre_original}
                  </p>

                  <p className="text-[10px] text-slate-400">
                    {bytes(doc.tamano_bytes || 0)}
                    {doc.fecha_subida
                      ? ` · ${new Date(doc.fecha_subida).toLocaleString("es-ES")}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => verDocumento(doc)}
                  className="rounded-md px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  Ver
                </button>

                <button
                  type="button"
                  onClick={() => descargar(doc)}
                  className="rounded-md px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  title="Descargar"
                >
                  Descargar
                </button>

                <button
                  type="button"
                  onClick={() => eliminar(doc)}
                  className="rounded-md px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                  title="Eliminar"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            Todavía no hay documentos en esta categoría.
          </p>
        )}
      </article>
    );
  };

  const renderBloque = (bloque) => {
    const abierto = !!bloquesAbiertos[bloque.id];
    const cantidad = contarBloque(bloque);

    return (
      <section
        key={bloque.id}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <button
          type="button"
          onClick={() =>
            setBloquesAbiertos((prev) => ({
              ...prev,
              [bloque.id]: !prev[bloque.id],
            }))
          }
          aria-expanded={abierto}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition ${
            abierto ? "bg-slate-50" : "bg-white hover:bg-slate-50"
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                cantidad
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-indigo-50 text-indigo-700"
              }`}
            >
              {cantidad}
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-slate-900">
                {bloque.titulo}
              </span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                {bloque.descripcion}
              </span>
            </span>
          </span>

          <span
            className={`shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition ${
              abierto ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            ⌄
          </span>
        </button>

        {abierto && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4">
            <div className="grid gap-3 xl:grid-cols-2">
              {bloque.categorias.map(renderCategoria)}
            </div>
          </div>
        )}
      </section>
    );
  };

  const otrosCantidad = CATEGORIAS_OTROS.reduce(
    (suma, item) => suma + porCategoria(item.categoria).length,
    0
  );

  return (
    <>
      <div
        className={
          modoActividad
            ? "w-full space-y-3"
            : "fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
        }
        onMouseDown={(e) => {
          if (!modoActividad && e.target === e.currentTarget) {
            onClose?.();
          }
        }}
      >
        <section
          role={modoActividad ? undefined : "dialog"}
          aria-modal={modoActividad ? undefined : "true"}
          aria-label="Carpeta digital del expediente"
          className={
            modoActividad
              ? "w-full space-y-3"
              : "flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          }
        >
          {!modoActividad && (
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">
                  MOLSAN ERP · Documentación
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Carpeta digital
                </h2>
                <p className="text-xs text-slate-500">
                  Expediente {expedienteId || "—"} · {totalArchivos} archivo(s)
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                ✕ Cerrar
              </button>
            </header>
          )}

          {modoActividad && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Carpeta digital del expediente
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Documentación organizada por actividad.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {totalArchivos} archivo(s)
              </span>
            </div>
          )}

          <div
            className={
              modoActividad
                ? "space-y-3"
                : "min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
            }
          >
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {cargando ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Cargando documentos…
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-900">
                  <strong>Carpeta documental del expediente.</strong>{" "}
                  Adjunta los PDF en su categoría, consulta su contenido desde
                  «Ver» y descarga o elimina los archivos cuando corresponda.
                </div>

                {BLOQUES
                  .filter(
                    (bloque) =>
                      !modoActividad ||
                      bloque.id === "documentacion-previa"
                  )
                  .map(renderBloque)}

                {!modoActividad && (
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOtrosAbierto((v) => !v)}
                      aria-expanded={otrosAbierto}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition ${
                        otrosAbierto
                          ? "bg-slate-50"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                            otrosCantidad
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-indigo-50 text-indigo-700"
                          }`}
                        >
                          {otrosCantidad}
                        </span>

                        <span>
                          <span className="block text-sm font-extrabold text-slate-900">
                            Otros
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            Documentación complementaria y comunicaciones de oficina.
                          </span>
                        </span>
                      </span>

                      <span
                        className={`shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition ${
                          otrosAbierto ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ⌄
                      </span>
                    </button>

                    {otrosAbierto && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4">
                        <div className="grid gap-3 xl:grid-cols-2">
                          {CATEGORIAS_OTROS.map(renderCategoria)}
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Visor de documentos integrado en ERP-Molsan */}
      {documentoVistaPrevia && (
        <div
          className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/75 p-2 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Visor de documento"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarVisor();
          }}
        >
          <section className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg">
                📄
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-extrabold text-slate-900">
                  {documentoVistaPrevia.nombre_original || "Documento"}
                </h3>
                <p className="text-xs text-slate-500">
                  Expediente {expedienteId} · Vista previa
                </p>
              </div>

              <button
                type="button"
                onClick={() => descargar(documentoVistaPrevia)}
                className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:inline-flex"
              >
                Descargar
              </button>

              <button
                type="button"
                onClick={cerrarVisor}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                aria-label="Cerrar visor"
              >
                ✕
              </button>
            </header>

            <div className="min-h-[50vh] flex-1 overflow-auto bg-slate-100 p-2 sm:p-4">
              {cargandoVistaPrevia && (
                <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
                  Cargando documento…
                </div>
              )}

              {!cargandoVistaPrevia && urlVistaPrevia && (
                <iframe
                  title={`Vista previa: ${documentoVistaPrevia.nombre_original || "documento"}`}
                  src={urlVistaPrevia}
                  className="h-[75vh] min-h-[420px] w-full rounded-lg border border-slate-200 bg-white"
                />
              )}

              {!cargandoVistaPrevia && !urlVistaPrevia && (
                <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
                  No se ha podido mostrar el documento.
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
              <p className="min-w-0 truncate text-xs text-slate-500">
                {documentoVistaPrevia.nombre_original || "Documento"}
              </p>

              <button
                type="button"
                onClick={cerrarVisor}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Cerrar visor
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
```
