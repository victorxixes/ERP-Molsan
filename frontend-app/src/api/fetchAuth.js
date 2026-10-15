/**
 * Añade JWT a las llamadas fetch antiguas dirigidas al backend ERP.
 * Axios ya incorpora el token por su interceptor; este módulo cubre las
 * pantallas heredadas que aún usan fetch() directamente.
 * Nunca envía el token a dominios distintos del backend configurado.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://agenda-intranet-b.onrender.com";

if (
  typeof window !== "undefined" &&
  typeof window.fetch === "function" &&
  !window.__molsanFetchAuthInstalled
) {
  let apiOrigin = null;
  try {
    apiOrigin = new URL(API_BASE_URL, window.location.href).origin;
  } catch (error) {
    console.error("[MOLSAN FETCH AUTH] VITE_API_URL no es válida.", error);
  }

  const fetchOriginal = window.fetch.bind(window);

  window.fetch = (input, init = undefined) => {
    let target = null;
    try {
      const rawUrl =
        typeof input === "string" || input instanceof URL
          ? String(input)
          : input && typeof input.url === "string"
            ? input.url
            : null;
      if (rawUrl) target = new URL(rawUrl, window.location.href);
    } catch {
      // Si no podemos interpretar la URL, dejamos que fetch original responda.
    }

    if (!apiOrigin || !target || target.origin !== apiOrigin) {
      return fetchOriginal(input, init);
    }

    let token = null;
    try {
      token = window.localStorage.getItem("token");
    } catch {
      token = null;
    }
    if (!token) return fetchOriginal(input, init);

    const requestHeaders =
      typeof Request !== "undefined" && input instanceof Request
        ? new Headers(input.headers)
        : new Headers();

    new Headers(init?.headers || {}).forEach((value, key) => {
      requestHeaders.set(key, value);
    });

    if (!requestHeaders.has("Authorization")) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }

    return fetchOriginal(input, {
      ...(init || {}),
      headers: requestHeaders,
    });
  };

  window.__molsanFetchAuthInstalled = true;
}
