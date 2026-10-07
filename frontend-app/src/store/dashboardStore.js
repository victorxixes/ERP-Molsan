import { create } from "zustand";

import axios from "../api/axios";


const ESTADO_INICIAL = {
  totalExpedientes: 0,

  expedientesPorActividad: [],

  mediaFirmaPorTipoOperacion: [],

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
      });

      try {

        const response = await axios.get(
          "/dashboard/expedientes"
        );

        const datos =
          response?.data || {};


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

          loading: false,

          error: null,

        });


        return {

          totalExpedientes,

          expedientesPorActividad,

          mediaFirmaPorTipoOperacion,

        };

      } catch (error) {

        console.error(
          "Error cargando Dashboard de Expedientes:",
          error
        );


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
