import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import MolsanIcon from "../ui/MolsanIcon";
import "../../css/ComponentesCompartidosPremium.css";

/** Burbuja de Mensajes con descarga autenticada de adjuntos. */
export default function MensajeBubble({
  mensaje,
  usuarioId,
  avatarUrl,
  online,
}) {
  const propio = Number(mensaje.remitente_id) === Number(usuarioId);
  const [archivoBlobUrl, setArchivoBlobUrl] = useState("");
  const [errorArchivo, setErrorArchivo] = useState(false);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);

  const nombreArchivo = useMemo(() => {
    const valor = String(mensaje.archivo_url || "");
    const match = valor.match(
      /(?:\/static\/mensajes\/|\/mensajes\/archivo\/)([0-9a-f-]{32,36}\.(?:pdf|doc|docx|jpg|jpeg|png))(?:[?#].*)?$/i
    );
    return match?.[1] || null;
  }, [mensaje.archivo_url]);

  const tipoArchivo = useMemo(() => {
    if (!nombreArchivo) return null;
    if (/\.(jpg|jpeg|png)$/i.test(nombreArchivo)) return "imagen";
    if (/\.pdf$/i.test(nombreArchivo)) return "pdf";
    return "otro";
  }, [nombreArchivo]);

  const fecha = useMemo(() => {
    try {
      const d = new Date(mensaje.fecha);
      if (Number.isNaN(d.getTime())) return mensaje.fecha || "";
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return mensaje.fecha || "";
    }
  }, [mensaje.fecha]);

  useEffect(() => {
    let cancelado = false;
    let urlCreada = "";

    setArchivoBlobUrl("");
    setErrorArchivo(false);

    if (!mensaje.archivo_url) {
      setCargandoArchivo(false);
      return undefined;
    }

    if (!nombreArchivo) {
      setErrorArchivo(true);
      setCargandoArchivo(false);
      return undefined;
    }

    setCargandoArchivo(true);
    axios
      .get(`/mensajes/archivo/${encodeURIComponent(nombreArchivo)}`, {
        responseType: "blob",
      })
      .then((response) => {
        const blob = response.data instanceof Blob
          ? response.data
          : new Blob([response.data]);
        urlCreada = URL.createObjectURL(blob);
        if (!cancelado) {
          setArchivoBlobUrl(urlCreada);
        } else {
          URL.revokeObjectURL(urlCreada);
        }
      })
      .catch(() => {
        if (!cancelado) setErrorArchivo(true);
      })
      .finally(() => {
        if (!cancelado) setCargandoArchivo(false);
      });

    return () => {
      cancelado = true;
      if (urlCreada) URL.revokeObjectURL(urlCreada);
    };
  }, [mensaje.archivo_url, nombreArchivo]);

  return (
    <div className={`mensaje-bubble-premium my-2 flex items-end gap-2 ${propio ? "justify-end" : "justify-start"}`}>
      {!propio && (
        <div className="relative h-8 w-8 shrink-0">
          <img
            src={avatarUrl || "/no-foto.png"}
            alt=""
            className="h-8 w-8 rounded-full border border-slate-200 bg-white object-cover shadow-sm"
          />
          {online && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
          )}
        </div>
      )}

      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
        propio
          ? "rounded-br-md border border-blue-200 bg-blue-50 text-slate-700"
          : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
      }`}>
        {mensaje.contenido && (
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {mensaje.contenido}
          </p>
        )}

        {mensaje.archivo_url && cargandoArchivo && (
          <p className="mt-2 text-xs text-slate-500">Cargando adjunto protegido…</p>
        )}
        {mensaje.archivo_url && errorArchivo && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            Adjunto no disponible o no tienes permiso para abrirlo.
          </p>
        )}

        {tipoArchivo === "imagen" && archivoBlobUrl && (
          <a href={archivoBlobUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={archivoBlobUrl}
              alt="Archivo adjunto"
              className="mt-2 max-h-64 max-w-full rounded-xl border border-slate-200 object-contain shadow-sm"
            />
          </a>
        )}

        {tipoArchivo === "pdf" && archivoBlobUrl && (
          <a
            href={archivoBlobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm shadow-sm">PDF</span>
            <span>Ver documento PDF</span>
          </a>
        )}

        {tipoArchivo === "otro" && archivoBlobUrl && (
          <a
            href={archivoBlobUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={nombreArchivo || "adjunto"}
            className="mt-2 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
          >
            <MolsanIcon name="attachment" size={32} />
            <span>Descargar archivo adjunto</span>
          </a>
        )}

        <div className={`mt-1.5 text-[10px] ${propio ? "text-blue-400" : "text-slate-400"}`}>
          {fecha}
        </div>
      </div>

      {propio && (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-blue-100 bg-blue-50 shadow-sm">
          <img
            src={avatarUrl || "/no-foto.png"}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
