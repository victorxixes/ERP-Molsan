import axios from "./axios";


// ============================================================
// CATÁLOGO MAESTRO DE ACCIONES
// ============================================================

export async function obtenerCatalogoAcciones(params = {}) {
  const response = await axios.get(
    "/acciones-expediente",
    {
      params,
    }
  );

  return response.data;
}


// ============================================================
// LISTAR ACCIONES ASIGNADAS A UN EXPEDIENTE
// ============================================================

export async function obtenerAccionesExpediente(
  idExpediente
) {
  const response = await axios.get(
    `/expediente-acciones/expediente/${encodeURIComponent(
      idExpediente
    )}`
  );

  return response.data;
}


// ============================================================
// ASIGNAR ACCIÓN AL EXPEDIENTE
// ============================================================

export async function asignarAccionExpediente(
  idExpediente,
  datos
) {
  const response = await axios.post(
    `/expediente-acciones/expediente/${encodeURIComponent(
      idExpediente
    )}`,
    datos
  );

  return response.data;
}


// ============================================================
// ACTUALIZAR ACCIÓN ASIGNADA
// ============================================================

export async function actualizarAccionExpediente(
  relacionId,
  datos
) {
  const response = await axios.put(
    `/expediente-acciones/${relacionId}`,
    datos
  );

  return response.data;
}


// ============================================================
// RETIRAR ACCIÓN DEL EXPEDIENTE
// ============================================================

export async function eliminarAccionExpediente(
  relacionId
) {
  const response = await axios.delete(
    `/expediente-acciones/${relacionId}`
  );

  return response.data;
}
