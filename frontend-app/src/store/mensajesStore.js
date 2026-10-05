import { create } from "zustand";

import * as api from "../api/mensajes";


export const useMensajesStore = create(
  (set, get) => ({

    // =======================================================
    // ESTADO
    // =======================================================

    mensajes: [],

    conectados: [],

    typing: {},

    error: null,

    usuarioId: null,


    // =======================================================
    // CARGAR CONVERSACIÓN
    // =======================================================

    cargarConversacion: async (
      usuarioId,
      otroId
    ) => {

      if (
        !usuarioId ||
        !otroId
      ) {
        return;
      }

      try {

        const res =
          await api.obtenerConversacion(
            usuarioId,
            otroId
          );

        set({
          mensajes:
            res.data || [],
        });

      } catch (err) {

        console.error(
          "Error cargando conversación:",
          err
        );

        set({
          error:
            "Error cargando conversación",
        });

      }

    },


    // =======================================================
    // CARGAR CONECTADOS
    // =======================================================

    cargarConectados: async () => {

      const usuarioId =
        get().usuarioId;

      if (!usuarioId) {
        return;
      }

      try {

        const res =
          await api.obtenerConectados(
            usuarioId
          );

        set({
          conectados: (
            res.data || []
          ).filter(
            (empleado) =>
              Number(empleado.id) !==
              Number(usuarioId)
          ),
        });

      } catch (err) {

        console.error(
          "Error cargando conectados:",
          err
        );

        set({
          error:
            "Error cargando conectados",
        });

      }

    },


    // =======================================================
    // WEBSOCKET — ONLINE / OFFLINE
    // =======================================================

    setConectadosWS: (
      empleado
    ) =>

      set(
        (state) => {

          const usuarioId =
            state.usuarioId;

          if (
            !empleado ||
            !empleado.id
          ) {
            return state;
          }

          if (
            Number(empleado.id) ===
            Number(usuarioId)
          ) {
            return state;
          }


          // -------------------------------------------------
          // OFFLINE
          // -------------------------------------------------

          if (
            empleado.offline
          ) {

            return {

              conectados:
                state.conectados.filter(
                  (e) =>
                    Number(e.id) !==
                    Number(empleado.id)
                ),

            };

          }


          // -------------------------------------------------
          // ONLINE / ACTUALIZACIÓN
          // -------------------------------------------------

          const existe =
            state.conectados.some(
              (e) =>
                Number(e.id) ===
                Number(empleado.id)
            );


          if (existe) {

            return {

              conectados:
                state.conectados.map(
                  (e) =>
                    Number(e.id) ===
                    Number(empleado.id)
                      ? {
                          ...e,
                          ...empleado,
                        }
                      : e
                ),

            };

          }


          return {

            conectados: [
              ...state.conectados,
              {
                ...empleado,
                mensajes_no_leidos:
                  Number(
                    empleado.mensajes_no_leidos
                  ) || 0,
              },
            ],

          };

        }
      ),


    // =======================================================
    // INCREMENTAR PENDIENTES
    // =======================================================

    incrementarNoLeidos: (
      remitenteId
    ) =>

      set(
        (state) => ({

          conectados:
            state.conectados.map(
              (empleado) => {

                if (
                  Number(empleado.id) !==
                  Number(remitenteId)
                ) {
                  return empleado;
                }

                return {

                  ...empleado,

                  mensajes_no_leidos:
                    (
                      Number(
                        empleado.mensajes_no_leidos
                      ) || 0
                    ) + 1,

                };

              }
            ),

        })
      ),


    // =======================================================
    // LIMPIAR PENDIENTES
    // =======================================================

    limpiarNoLeidos: (
      empleadoId
    ) =>

      set(
        (state) => ({

          conectados:
            state.conectados.map(
              (empleado) =>
                Number(empleado.id) ===
                Number(empleadoId)
                  ? {
                      ...empleado,
                      mensajes_no_leidos: 0,
                    }
                  : empleado
            ),

        })
      ),


    // =======================================================
    // ENVIAR MENSAJE REST
    // =======================================================

    enviarMensajeREST:
      async (
        data
      ) => {

        try {

          const res =
            await api.enviarMensajeREST(
              data
            );

          return res.data;

        } catch (err) {

          console.error(
            "Error enviando mensaje REST:",
            err
          );

          set({
            error:
              "Error enviando mensaje",
          });

          return null;

        }

      },


    // =======================================================
    // MARCAR MENSAJE
    // =======================================================

    marcarLeido:
      async (
        id
      ) => {

        try {

          await api.marcarLeido(
            id
          );

        } catch (err) {

          console.error(
            "Error marcando leído:",
            err
          );

        }

      },


    // =======================================================
    // MARCAR CONVERSACIÓN
    // =======================================================

    marcarConversacionLeida:
      async (
        usuarioId,
        otroId
      ) => {

        // ---------------------------------------------------
        // Actualizar UI inmediatamente
        // ---------------------------------------------------

        get().limpiarNoLeidos(
          otroId
        );

        try {

          await api.marcarConversacionLeida(
            usuarioId,
            otroId
          );

        } catch (err) {

          console.error(
            "Error marcando conversación leída:",
            err
          );

        }

      },


    // =======================================================
    // TYPING
    // =======================================================

    setTyping: (
      fromId
    ) =>

      set(
        (state) => ({

          typing: {
            ...state.typing,
            [fromId]: true,
          },

        })
      ),


    clearTyping: (
      fromId
    ) =>

      set(
        (state) => {

          const typing = {
            ...state.typing,
          };

          delete typing[
            fromId
          ];

          return {
            typing,
          };

        }
      ),


    // =======================================================
    // REALTIME — MENSAJE
    // =======================================================

    addMensajeRealtime: (
      mensaje
    ) =>

      set(
        (state) => {

          if (
            !mensaje
          ) {
            return state;
          }


          // -------------------------------------------------
          // EVITAR DUPLICADOS
          // -------------------------------------------------

          if (
            mensaje.id &&
            state.mensajes.some(
              (m) =>
                Number(m.id) ===
                Number(mensaje.id)
            )
          ) {
            return state;
          }


          const mensajes = [
            ...state.mensajes,
            mensaje,
          ];


          // -------------------------------------------------
          // ¿ES UN MENSAJE RECIBIDO?
          // -------------------------------------------------

          const esRecibido =
            Number(
              mensaje.destinatario_id
            ) ===
            Number(
              state.usuarioId
            );


          if (
            esRecibido &&
            mensaje.leido === false
          ) {

            const remitenteId =
              Number(
                mensaje.remitente_id
              );


            return {

              mensajes,

              conectados:
                state.conectados.map(
                  (empleado) => {

                    if (
                      Number(
                        empleado.id
                      ) !==
                      remitenteId
                    ) {
                      return empleado;
                    }

                    return {

                      ...empleado,

                      mensajes_no_leidos:
                        (
                          Number(
                            empleado.mensajes_no_leidos
                          ) || 0
                        ) + 1,

                    };

                  }
                ),

            };

          }


          return {
            mensajes,
          };

        }
      ),


    // =======================================================
    // REALTIME — ARCHIVO
    // =======================================================

    addArchivoRealtime: (
      mensaje
    ) =>

      set(
        (state) => {

          if (
            !mensaje
          ) {
            return state;
          }


          if (
            mensaje.id &&
            state.mensajes.some(
              (m) =>
                Number(m.id) ===
                Number(mensaje.id)
            )
          ) {
            return state;
          }


          const mensajes = [
            ...state.mensajes,
            mensaje,
          ];


          const esRecibido =
            Number(
              mensaje.destinatario_id
            ) ===
            Number(
              state.usuarioId
            );


          if (
            esRecibido &&
            mensaje.leido === false
          ) {

            const remitenteId =
              Number(
                mensaje.remitente_id
              );

            return {

              mensajes,

              conectados:
                state.conectados.map(
                  (empleado) =>
                    Number(
                      empleado.id
                    ) ===
                    remitenteId
                      ? {
                          ...empleado,
                          mensajes_no_leidos:
                            (
                              Number(
                                empleado.mensajes_no_leidos
                              ) || 0
                            ) + 1,
                        }
                      : empleado
                ),

            };

          }


          return {
            mensajes,
          };

        }
      ),

  })
);
