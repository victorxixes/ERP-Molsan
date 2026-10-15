import axios from "./axios";

// ============================================================
// DEFECTOS DE EXPEDIENTES
// ============================================================

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

// ============================================================
// REGISTRO DE SUBSANACIÓN
// ============================================================

export async function registrarSubsanacionDefecto(
  idExpediente,
  defectoId,
  fechaEntrada
) {
  const response = await axios.patch(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos/${defectoId}/subsanacion`,
    null,
    {
      params: {
        fecha_entrada: fechaEntrada,
      },
    }
  );

  return response.data;
}

// ============================================================
// CATÁLOGO DE SUBTIPOS DE DEFECTO
// ============================================================

export async function listarSubtiposDefecto(incluirInactivos = false) {
  const response = await axios.get("/expedientes/subtipos-defecto", {
    params: {
      incluir_inactivos: incluirInactivos,
    },
  });

  return response.data;
}

export async function crearSubtipoDefecto(datos) {
  const response = await axios.post(
    "/expedientes/subtipos-defecto",
    datos
  );

  return response.data;
}

export async function actualizarSubtipoDefecto(subtipoId, datos) {
  const response = await axios.put(
    `/expedientes/subtipos-defecto/${subtipoId}`,
    datos
  );

  return response.data;
}

export async function desactivarSubtipoDefecto(subtipoId) {
  const response = await axios.delete(
    `/expedientes/subtipos-defecto/${subtipoId}`
  );

  return response.data;
}

// ============================================================
// CATÁLOGO DE TIPOS DE CARGA HIPOTECARIA
// ============================================================

export async function listarTiposCargaHipotecaria() {
  const response = await axios.get(
    "/tipos-carga-hipotecaria/opciones"
  );

  return response.data;
}

// ============================================================
// PDF DE CALIFICACIÓN REGISTRAL
// ============================================================

export async function subirCalificacionRegistro(
  idExpediente,
  defectoId,
  archivo
) {
  const datos = new FormData();
  datos.append("fichero", archivo);

  const response = await axios.post(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos/${defectoId}/calificacion`,
    datos
  );

  return response.data;
}

export async function obtenerCalificacionRegistro(
  idExpediente,
  defectoId
) {
  const response = await axios.get(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos/${defectoId}/calificacion`,
    {
      responseType: "blob",
    }
  );

  return response.data;
}

// ============================================================
// CARPETA DIGITAL: LISTADO DE DOCUMENTOS
// ============================================================

export async function listarDocumentosCarpetaDigital(idExpediente) {
  const response = await axios.get(
    `/expedientes/${encodeURIComponent(idExpediente)}/carpeta-digital`
  );

  return response.data;
}

// ============================================================
// COPIAR CALIFICACIÓN REGISTRAL A LA CARPETA DIGITAL
// ============================================================

export async function subirCalificacionACarpetaDigital(
  idExpediente,
  archivo,
  categoria = "Defecto registral"
) {
  const datos = new FormData();
  datos.append("archivo", archivo);
  datos.append("categoria", categoria);

  const response = await axios.post(
    `/expedientes/${encodeURIComponent(idExpediente)}/carpeta-digital`,
    datos
  );

  return response.data;
}



// ============================================================
// HISTORIAL PERSISTENTE DE DEFECTOS
// ============================================================

export async function listarHistorialDefectosExpediente(idExpediente, limite = 100) {
  const response = await axios.get(
    `/expedientes/${encodeURIComponent(idExpediente)}/defectos/historial`,
    { params: { limite } }
  );
  return response.data;
}
