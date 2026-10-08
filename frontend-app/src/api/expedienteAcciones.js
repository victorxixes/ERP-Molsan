// frontend-app/src/api/expedienteAcciones.js

import axios from "./axios";


// ============================================================
// LISTAR ACCIONES DE UN EXPEDIENTE
// ============================================================

export async function obtenerAccionesExpediente(idExpediente) {
  const response = await axios.get(
    `/expediente-acciones/expediente/${encodeURIComponent(
      idExpediente
    )}`
  );

  return response.data;
}


// ============================================================
// ASIGNAR ACCIÓN
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
// ACTUALIZAR ACCIÓN
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
// ELIMINAR / RETIRAR ACCIÓN
// ============================================================

export async function eliminarAccionExpediente(
  relacionId
) {
  const response = await axios.delete(
    `/expediente-acciones/${relacionId}`
  );

  return response.data;
}
