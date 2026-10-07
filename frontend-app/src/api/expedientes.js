import axios from "./axios";

/**
 * Obtiene el listado paginado de expedientes.
 */
export async function obtenerListadoExpedientes(params = {}) {
  const res = await axios.get("/expedientes/listado", {
    params,
  });

  return res.data;
}

/**
 * Obtiene el resumen general de expedientes.
 */
export async function obtenerResumenExpedientes() {
  const res = await axios.get("/expedientes/resumen");

  return res.data;
}

/**
 * Obtiene un expediente completo.
 */
export async function obtenerExpediente(idExpediente) {
  const res = await axios.get(
    `/expedientes/${encodeURIComponent(idExpediente)}`
  );

  return res.data;
}

/**
 * Exporta los expedientes a Excel aplicando los filtros actuales.
 */
export async function exportarExcelExpedientes(params = {}) {
  const res = await axios.get(
    "/expedientes/exportar-excel",
    {
      params,
      responseType: "blob",
    }
  );

  const blob = new Blob(
    [res.data],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "expedientes.xlsx";

  document.body.appendChild(a);
  a.click();

  a.remove();

  window.URL.revokeObjectURL(url);
}

// ============================================================
// ENVIAR EXPEDIENTE A NOTARIO
// ============================================================

export async function enviarExpedienteANotario(
  idExpediente,
  datos
) {
  const response = await axios.put(
    `/expedientes/${encodeURIComponent(
      idExpediente
    )}/enviar-a-notario`,
    datos
  );

  return response.data;
}
