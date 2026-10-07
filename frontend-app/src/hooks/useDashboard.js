import { useEffect } from "react";

import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";


export function useDashboard() {

  const authReady = useAuthStore(
    (state) => state.authReady
  );

  const token = useAuthStore(
    (state) => state.token
  );

  const cargarDashboard = useDashboardStore(
    (state) => state.cargarDashboard
  );

  const limpiarDashboard = useDashboardStore(
    (state) => state.limpiarDashboard
  );

  const totalExpedientes = useDashboardStore(
    (state) => state.totalExpedientes
  );

  const expedientesPorActividad = useDashboardStore(
    (state) => state.expedientesPorActividad
  );

  const mediaFirmaPorTipoOperacion = useDashboardStore(
    (state) => state.mediaFirmaPorTipoOperacion
  );

  const loading = useDashboardStore(
    (state) => state.loading
  );

  const error = useDashboardStore(
    (state) => state.error
  );


  useEffect(() => {

    if (!authReady || !token) {
      return;
    }

    cargarDashboard();

  }, [
    authReady,
    token,
    cargarDashboard,
  ]);


  return {
    totalExpedientes,
    expedientesPorActividad,
    mediaFirmaPorTipoOperacion,
    loading,
    error,
    cargarDashboard,
    limpiarDashboard,
  };
}


export default useDashboard;
