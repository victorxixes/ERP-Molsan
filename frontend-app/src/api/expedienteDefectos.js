
import axios from "./axios";

export async function listarDefectosExpediente(idExpediente) {
  const response = await axios.get(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos`
  );
  return response.data;
}

export async function crearDefectoExpediente(idExpediente, datos) {
  const response = await axios.post(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos`,
    datos
  );
  return response.data;
}

export async function actualizarDefectoExpediente(
  idExpediente,
  defectoId,
  datos
) {
  const response = await axios.put(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos/${defectoId}`,
    datos
  );
  return response.data;
}

export async function registrarSubsanacionDefecto(
  idExpediente,
  defectoId,
  fechaEntrada
) {
  const response = await axios.patch(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos/${defectoId}/subsanacion`,
    null,
    {
      params: { fecha_entrada: fechaEntrada },
    }
  );
  return response.data;
}
