import axios from "./axios";

/**
 * API auxiliar de notarios.
 *
 * El catálogo canónico se sirve desde el módulo CTN: GET /api/ctn/notarias.
 * Esta API conserva el contrato histórico que espera useNotarios(): una
 * respuesta Axios cuyo campo `data` es un array, aunque el backend pagine.
 */
export async function listarNotarios(filtros = {}) {
  const pageSize = 200;
  const maxPaginas = 50;
  const todos = [];
  let primeraRespuesta = null;
  let totalEsperado = Number.POSITIVE_INFINITY;

  for (let page = 1; page <= maxPaginas && todos.length < totalEsperado; page += 1) {
    const respuesta = await axios.get("/ctn/notarias", {
      params: {
        ...filtros,
        page,
        page_size: pageSize,
      },
    });

    if (!primeraRespuesta) primeraRespuesta = respuesta;

    const payload = respuesta?.data;
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

    todos.push(...items);

    if (Array.isArray(payload)) {
      totalEsperado = todos.length;
    } else {
      const total = Number(payload?.total);
      totalEsperado = Number.isFinite(total) && total >= 0
        ? total
        : todos.length;
    }

    if (items.length === 0) break;
  }

  // Se mantiene el envoltorio Axios para no romper consumidores existentes.
  return {
    ...(primeraRespuesta || {}),
    data: todos,
  };
}

export default listarNotarios;
