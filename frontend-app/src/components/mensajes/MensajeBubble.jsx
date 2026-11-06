import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

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
    <div className={`my-2 flex items-end gap-2 ${propio ? "justify-end" : "justify-start"}`}>
      {!propio && (
        <div className="relative h-8 w-8 shrink-0">
          <img
            src={avatarUrl || "/no-foto.png"}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          {online && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5" />
          )}
        </div>
      )}

      <div className={`molsan-message-bubble max-w-[78%] px-4 py-2.5 ${propio ? "is-own" : "is-other"}`}>
        {mensaje.contenido && (
          <p className="whitespace-pre-wrap">
            {mensaje.contenido}
          </p>
        )}

        {mensaje.archivo_url && cargandoArchivo && (
          <p className="mt-2">Cargando adjunto protegido…</p>
        )}
        {mensaje.archivo_url && errorArchivo && (
          <p role="alert" className="mt-2">
            Adjunto no disponible o no tienes permiso para abrirlo.
          </p>
        )}

        {tipoArchivo === "imagen" && archivoBlobUrl && (
          <a href={archivoBlobUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={archivoBlobUrl}
              alt="Archivo adjunto"
              className="mt-2 max-h-64 max-w-full object-contain"
            />
          </a>
        )}

        {tipoArchivo === "pdf" && archivoBlobUrl && (
          <a
            href={archivoBlobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-3 px-3 py-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center">PDF</span>
            <span>Ver documento PDF</span>
          </a>
        )}

        {tipoArchivo === "otro" && archivoBlobUrl && (
          <a
            href={archivoBlobUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={nombreArchivo || "adjunto"}
            className="mt-2 flex items-center gap-3 px-3 py-2.5"
          >
            <span className="flex h-8 w-8 items-center justify-center">📎</span>
            <span>Descargar archivo adjunto</span>
          </a>
        )}

        <div className="molsan-message-time mt-1.5">
          {fecha}
        </div>
      </div>

      {propio && (
        <div className="h-8 w-8 shrink-0 overflow-hidden">
          <img
            src={avatarUrl || "/no-foto.png"}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
