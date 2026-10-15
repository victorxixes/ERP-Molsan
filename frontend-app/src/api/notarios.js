import axios from "./axios";

/**
 * Adaptador de compatibilidad para el hook useNotarios.
 * El backend CTN devuelve { items, total, page, page_size }; el hook
 * espera que response.data sea una lista de notarías.
 */
export async function listarNotarios(params = {}) {
  const response = await axios.get("/ctn/notarias", {
    params: {
      page: 1,
      page_size: 500,
      ...params,
    },
  });

  const payload = response?.data;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return {
    ...response,
    data: items,
  };
}

export default { listarNotarios };
