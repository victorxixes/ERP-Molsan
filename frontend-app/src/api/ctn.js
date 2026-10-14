import axios from "./axios";

/**
 * Listado de notarías CTN.
 * Mantiene los parámetros y la ruta utilizados por el listado actual.
 */
export const listarNotarias = ({
  provincia,
  municipio,
  vc,
  apoderado,
  q,
  page = 1,
  page_size = 15,
} = {}) =>
  axios.get("/ctn/notarias", {
    params: { provincia, municipio, vc, apoderado, q, page, page_size },
  });

/**
 * Obtiene la ficha de una notaría, incluidas sus asociaciones
 * si el backend las devuelve.
 */
export const obtenerNotaria = (id) =>
  axios.get(`/ctn/notarias/${id}`);

/**
 * Compatibilidad con el endpoint anterior.
 * Devuelve estadísticas de citas de agenda, NO de firmas realizadas.
 */
export const obtenerFirmasNotaria = (id) =>
  axios.get(`/ctn/notarias/${id}/firmas`);

/**
 * Histórico de firmas reales, basado en expedientes
 * con fecha_firma informada.
 *
 * modalidad: "VC" o "PRESENCIAL"
 * q: búsqueda por expediente, titular, solicitante,
 * NIF, protocolo u oficina.
 */
export const obtenerHistoricoFirmasNotaria = (
  id,
  { modalidad, q } = {},
) =>
  axios.get(`/ctn/notarias/${id}/firmas/historico`, {
    params: { modalidad, q },
  });

/**
 * Lista los notarios asociados al notario indicado.
 */
export const listarNotariasAsociadas = (id) =>
  axios.get(`/ctn/notarias/${id}/asociadas`);

/**
 * Crea una asociación recíproca A <-> B.
 * El backend debe guardar ambos sentidos de la relación.
 */
export const asociarNotarios = (notariaId, asociadaId) =>
  axios.post(
    `/ctn/notarias/${notariaId}/asociadas/${asociadaId}`,
  );

/**
 * Elimina la asociación en ambos sentidos.
 * Quitarla desde cualquiera de las dos fichas elimina
 * la relación recíproca.
 */
export const desasociarNotarios = (notariaId, asociadaId) =>
  axios.delete(
    `/ctn/notarias/${notariaId}/asociadas/${asociadaId}`,
  );

