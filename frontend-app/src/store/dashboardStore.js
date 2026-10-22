import { create } from "zustand";

import axios from "../api/axios";


const ESTADO_INICIAL = {
  totalExpedientes: 0,

  expedientesPorActividad: [],

  mediaFirmaPorTipoOperacion: [],

  firmasRealizadas: null,

  errorFirmas: null,

  loading: false,

  error: null,
};


export const useDashboardStore = create(
  (set) => ({

    ...ESTADO_INICIAL,


    cargarDashboard: async () => {

      set({
        loading: true,
        error: null,
        errorFirmas: null,
      });

      try {

        const [dashboardResult, firmasResult] = await Promise.allSettled([
          axios.get("/dashboard/expedientes"),
          axios.get("/informes/firmas"),
        ]);

        if (dashboardResult.status === "rejected") {
          throw dashboardResult.reason;
        }

        const response = dashboardResult.value;
        const datos = response?.data || {};

        const firmasPayload =
          firmasResult.status === "fulfilled"
            ? firmasResult.value?.data
            : null;

        const resumenFirmas = firmasPayload?.resumen;
        const firmasRealizadas = resumenFirmas
          ? {
              total: Number(resumenFirmas.total_firmas ?? 0) || 0,
              presencial: Number(resumenFirmas.presencial ?? 0) || 0,
              videoconferencia: Number(resumenFirmas.videoconferencia ?? 0) || 0,
              sin_clasificar: Number(resumenFirmas.sin_clasificar ?? 0) || 0,
            }
          : null;

        const errorFirmas =
          firmasResult.status === "rejected"
            ? (firmasResult.reason?.response?.data?.detail ||
              "No se han podido cargar las firmas reales desde el informe de firmas.")
            : null;


        const totalExpedientes =
          Number(
            datos.total_expedientes ?? 0
          ) || 0;


        const expedientesPorActividad =
          Array.isArray(
            datos.expedientes_por_actividad
          )
            ? datos.expedientes_por_actividad.map(
                (actividad) => ({
                  key:
                    actividad?.key ?? "",

                  nombre:
                    actividad?.nombre ?? "",

                  total:
                    Number(
                      actividad?.total ?? 0
                    ) || 0,
                })
              )
            : [];


        const mediaFirmaPorTipoOperacion =
          Array.isArray(
            datos.media_firma_por_tipo_operacion
          )
            ? datos.media_firma_por_tipo_operacion.map(
                (fila) => ({
                  tipo_operacion:
                    fila?.tipo_operacion ??
                    "Sin tipo de operación",

                  expedientes_firmados:
                    Number(
                      fila?.expedientes_firmados ??
                      0
                    ) || 0,

                  media_dias:
                    fila?.media_dias == null
                      ? null
                      : Number(
                          fila.media_dias
                        ),
                })
              )
            : [];


        set({

          totalExpedientes,

          expedientesPorActividad,

          mediaFirmaPorTipoOperacion,

          firmasRealizadas,

          errorFirmas,

          loading: false,

          error: null,

        });


        return {

          totalExpedientes,

          expedientesPorActividad,

          mediaFirmaPorTipoOperacion,

          firmasRealizadas,

        };

      } catch (error) {

        console.error("No se ha podido cargar el dashboard de expedientes.");


        const mensaje =
          error?.response?.data?.detail ||
          "No se ha podido cargar el Dashboard de Expedientes.";


        set({

          ...ESTADO_INICIAL,

          loading: false,

          error: mensaje,

        });


        throw error;

      }

    },


    limpiarDashboard: () => {

      set({
        ...ESTADO_INICIAL,
      });

    },

  })
);


export default useDashboardStore;
