import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://agenda-intranet-b.onrender.com";

const FALLBACK = "/no-foto.png";

/**
 * Muestra fotografías protegidas usando fetch + Bearer JWT. Un <img src> no
 * puede añadir Authorization; por eso las URLs /api/fotos se descargan como
 * Blob y se muestran con una URL temporal. Nunca envía el token a otro origen.
 */
export default function AuthenticatedPhoto({
  src,
  alt = "Fotografía",
  fallback = FALLBACK,
  className,
  ...props
}) {
  const [blobUrl, setBlobUrl] = useState(null);

  const isProtectedPhoto = (() => {
    if (!src) return false;
    try {
      const apiOrigin = new URL(API_BASE_URL, window.location.href).origin;
      const target = new URL(src, window.location.href);
      return target.origin === apiOrigin && target.pathname.startsWith("/api/fotos/");
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    let cancelled = false;
    let temporaryUrl = null;

    async function load() {
      setBlobUrl(null);
      if (!src || !isProtectedPhoto) return;

      let target;
      try {
        target = new URL(src, window.location.href);
      } catch {
        return;
      }

      const apiOrigin = new URL(API_BASE_URL, window.location.href).origin;
      if (target.origin !== apiOrigin || !target.pathname.startsWith("/api/fotos/")) return;

      let token = null;
      try { token = window.localStorage.getItem("token"); } catch { token = null; }
      if (!token) return;

      try {
        const response = await fetch(target.href, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const blob = await response.blob();
        if (cancelled) return;
        temporaryUrl = URL.createObjectURL(blob);
        setBlobUrl(temporaryUrl);
      } catch (error) {
        console.warn("No se pudo cargar la fotografía protegida.", error);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    };
  }, [src, isProtectedPhoto]);

  const displayedSrc = isProtectedPhoto ? (blobUrl || fallback) : (src || fallback);
  return <img src={displayedSrc} alt={alt} className={className} {...props} />;
}
