import { useEffect } from "react";

import { useAuthStore } from "../store/authStore";

import { useMensajesStore } from "../store/mensajesStore";

import {
  buildRealtimeWsUrl,
} from "../api/monitorRealtime";

import {
  setRealtimeSocket,
  clearRealtimeSocket,
} from "../realtime/realtimeClient";


// ============================================================
// REALTIME GLOBAL — MOLSAN ERP
// ============================================================

export default function useRealtimeGlobal() {

  const empleado =
    useAuthStore(
      (state) =>
        state.empleado
    );


  useEffect(() => {

    // ========================================================
    // VALIDAR USUARIO
    // ========================================================

    if (
      !empleado ||
      !empleado.id
    ) {

      return;

    }


    // ========================================================
    // TOKEN JWT
    // ========================================================

    const token =
      localStorage.getItem(
        "token"
      );


    if (!token) {

      console.warn(
        "[REALTIME] No existe JWT."
      );

      return;

    }


    // ========================================================
    // VARIABLES
    // ========================================================

    let ws = null;

    let reconnectTimer =
      null;

    let pingInterval =
      null;

    let mounted =
      true;


    // ========================================================
    // LIMPIAR TEMPORIZADORES
    // ========================================================

    const limpiarTimers = () => {

      if (
        reconnectTimer
      ) {

        clearTimeout(
          reconnectTimer
        );

        reconnectTimer =
          null;

      }


      if (
        pingInterval
      ) {

        clearInterval(
          pingInterval
        );

        pingInterval =
          null;

      }

    };


    // ========================================================
    // PROGRAMAR RECONEXIÓN
    // ========================================================

    const programarReconexion = () => {

      if (
        !mounted ||
        reconnectTimer
      ) {

        return;

      }


      reconnectTimer =
        setTimeout(
          () => {

            reconnectTimer =
              null;

            conectar();

          },
          2000
        );

    };


    // ========================================================
    // PROPAGAR EVENTO AL ERP
    // ========================================================

    const propagarEventoERP = (
      data
    ) => {

      if (
        typeof window ===
        "undefined"
      ) {

        return;

      }


      try {

        window.dispatchEvent(
          new CustomEvent(
            "erp:realtime",
            {
              detail: data,
            }
          )
        );

      } catch (
        error
      ) {

        console.warn(
          "[REALTIME] No se pudo propagar erp:realtime:",
          error
        );

      }

    };


    // ========================================================
    // PROCESAR PRESENCIA
    // ========================================================

    const procesarPresencia = (
      data
    ) => {

      // ------------------------------------------------------
      // SNAPSHOT
      // ------------------------------------------------------

      if (
        data.evento ===
        "usuarios_snapshot"
      ) {

        const usuarios =
          Array.isArray(
            data.data?.usuarios
          )
            ? data.data.usuarios
            : [];


        useMensajesStore.setState(
          (state) => ({

            ...state,

            conectados:
              usuarios,

          })
        );


        return true;

      }


      // ------------------------------------------------------
      // ONLINE — EVENTO NUEVO
      // ------------------------------------------------------

      if (
        data.evento ===
        "usuario_online"
      ) {

        const usuario =
          data.data;


        if (
          usuario &&
          usuario.id
        ) {

          useMensajesStore
            .getState()
            .setConectadosWS(
              usuario
            );

        }


        return true;

      }


      // ------------------------------------------------------
      // OFFLINE — EVENTO NUEVO
      // ------------------------------------------------------

      if (
        data.evento ===
        "usuario_offline"
      ) {

        const id =
          Number(
            data.data?.id ??
            data.usuario_id
          );


        if (id) {

          useMensajesStore
            .getState()
            .setConectadosWS({

              id,

              offline:
                true,

            });

        }


        return true;

      }


      // ------------------------------------------------------
      // COMPATIBILIDAD CON EVENTO ANTIGUO "online"
      // ------------------------------------------------------

      if (
        data.tipo ===
        "online"
      ) {

        if (
          data.id
        ) {

          useMensajesStore
            .getState()
            .setConectadosWS({

              id:
                Number(
                  data.id
                ),

              nombre:
                data.nombre,

              apellidos:
                data.apellidos,

              foto:
                data.foto,

            });

        }


        return true;

      }


      // ------------------------------------------------------
      // COMPATIBILIDAD CON EVENTO ANTIGUO "offline"
      // ------------------------------------------------------

      if (
        data.tipo ===
        "offline"
      ) {

        const id =
          Number(
            data.id
          );


        if (id) {

          useMensajesStore
            .getState()
            .setConectadosWS({

              id,

              offline:
                true,

            });

        }


        return true;

      }


      return false;

    };


    // ========================================================
    // PROCESAR MENSAJES
    // ========================================================

    const procesarMensajes = (
      data
    ) => {

      // ------------------------------------------------------
      // TYPING — EVENTO NUEVO
      // ------------------------------------------------------

      if (
        data.evento ===
        "typing"
      ) {

        const fromId =
          Number(
            data.data?.from ??
            data.usuario_id
          );


        if (
          !fromId
        ) {

          return true;

        }


        useMensajesStore
          .getState()
          .setTyping(
            fromId
          );


        setTimeout(
          () => {

            useMensajesStore
              .getState()
              .clearTyping(
                fromId
              );

          },
          1500
        );


        return true;

      }


      // ------------------------------------------------------
      // MENSAJE — EVENTO NUEVO
      // ------------------------------------------------------

      if (
        data.evento ===
        "mensaje_nuevo"
      ) {

        const mensaje =
          data.data?.mensaje;


        if (
          mensaje
        ) {

          useMensajesStore
            .getState()
            .addMensajeRealtime(
              mensaje
            );

        }


        return true;

      }


      // ------------------------------------------------------
      // ARCHIVO — EVENTO NUEVO
      // ------------------------------------------------------

      if (
        data.evento ===
        "archivo_nuevo"
      ) {

        const mensaje =
          data.data?.mensaje;


        if (
          mensaje
        ) {

          useMensajesStore
            .getState()
            .addArchivoRealtime(
              mensaje
            );

        }


        return true;

      }


      // ------------------------------------------------------
      // COMPATIBILIDAD TYPING ANTIGUO
      // ------------------------------------------------------

      if (
        data.tipo ===
        "typing"
      ) {

        const fromId =
          Number(
            data.from
          );


        if (
          !fromId
        ) {

          return true;

        }


        useMensajesStore
          .getState()
          .setTyping(
            fromId
          );


        setTimeout(
          () => {

            useMensajesStore
              .getState()
              .clearTyping(
                fromId
              );

          },
          1500
        );


        return true;

      }


      // ------------------------------------------------------
      // COMPATIBILIDAD MENSAJE ANTIGUO
      // ------------------------------------------------------

      if (
        data.tipo ===
          "nuevo_mensaje" ||
        data.tipo ===
          "mensaje"
      ) {

        if (
          data.mensaje
        ) {

          useMensajesStore
            .getState()
            .addMensajeRealtime(
              data.mensaje
            );

        }


        return true;

      }


      // ------------------------------------------------------
      // COMPATIBILIDAD ARCHIVO ANTIGUO
      // ------------------------------------------------------

      if (
        data.tipo ===
          "nuevo_archivo" ||
        data.tipo ===
          "archivo"
      ) {

        if (
          data.mensaje
        ) {

          useMensajesStore
            .getState()
            .addArchivoRealtime(
              data.mensaje
            );

        }


        return true;

      }


      return false;

    };


    // ========================================================
    // CONECTAR
    // ========================================================

    const conectar = () => {

      if (
        !mounted
      ) {

        return;

      }


      limpiarTimers();


      // ------------------------------------------------------
      // EVITAR DUPLICAR CONEXIONES
      // ------------------------------------------------------

      if (
        ws &&
        (
          ws.readyState ===
            WebSocket.OPEN ||
          ws.readyState ===
            WebSocket.CONNECTING
        )
      ) {

        return;

      }


      // ------------------------------------------------------
      // CONSTRUIR URL
      // ------------------------------------------------------

      let url;


      try {

        url =
          buildRealtimeWsUrl({

            usuario_id:
              empleado.id,

            token,

          });

      } catch (
        error
      ) {

        console.error(
          "[REALTIME] Error construyendo URL:",
          error
        );


        programarReconexion();

        return;

      }


      // ------------------------------------------------------
      // CREAR SOCKET
      // ------------------------------------------------------

      try {

        console.log(
          "[REALTIME] Conectando usuario:",
          empleado.id
        );


        ws =
          new WebSocket(
            url
          );


        setRealtimeSocket(
          ws
        );

      } catch (
        error
      ) {

        console.error(
          "[REALTIME] Error creando WebSocket:",
          error
        );


        ws =
          null;


        clearRealtimeSocket();


        programarReconexion();

        return;

      }


      // ======================================================
      // OPEN
      // ======================================================

      ws.onopen = () => {

        if (
          !mounted
        ) {

          return;

        }


        console.log(
          "[REALTIME] Conectado:",
          empleado.id
        );


        // ----------------------------------------------------
        // USUARIO ACTUAL EN MENSAJES STORE
        // ----------------------------------------------------

        useMensajesStore.setState(
          (state) => ({

            ...state,

            usuarioId:
              Number(
                empleado.id
              ),

          })
        );


        // ----------------------------------------------------
        // PING
        // ----------------------------------------------------

        pingInterval =
          setInterval(
            () => {

              if (
                ws &&
                ws.readyState ===
                  WebSocket.OPEN
              ) {

                try {

                  ws.send(
                    "ping"
                  );

                } catch {
                  // Ignorar
                }

              }

            },
            15000
          );

      };


      // ======================================================
      // MESSAGE
      // ======================================================

      ws.onmessage = (
        event
      ) => {

        if (
          !event.data
        ) {

          return;

        }


        let data;


        // ----------------------------------------------------
        // PARSE JSON
        // ----------------------------------------------------

        try {

          data =
            JSON.parse(
              event.data
            );

        } catch {

          // Puede ser una respuesta no JSON.
          return;

        }


        if (
          !data
        ) {

          return;

        }


        // ====================================================
        // PONG
        // ====================================================

        if (
          data.tipo ===
          "pong"
        ) {

          return;

        }


        // ====================================================
        // PROPAGAR SIEMPRE
        // ====================================================

        propagarEventoERP(
          data
        );


        // ====================================================
        // PRESENCIA
        // ====================================================

        if (
          procesarPresencia(
            data
          )
        ) {

          return;

        }


        // ====================================================
        // MENSAJES
        // ====================================================

        if (
          procesarMensajes(
            data
          )
        ) {

          return;

        }

      };


      // ======================================================
      // ERROR
      // ======================================================

      ws.onerror = (
        error
      ) => {

        console.warn(
          "[REALTIME] Error WebSocket:",
          error
        );

      };


      // ======================================================
      // CLOSE
      // ======================================================

      ws.onclose = (
        event
      ) => {

        console.warn(
          "[REALTIME] Desconectado:",
          event.code
        );


        limpiarTimers();


        clearRealtimeSocket(
          ws
        );


        if (
          !mounted
        ) {

          return;

        }


        ws =
          null;


        // ----------------------------------------------------
        // ERRORES DE AUTENTICACIÓN
        // ----------------------------------------------------

        const erroresAuth = [

          4001,
          4002,
          4003,
          4004,
          4005,
          4006,

        ];


        if (
          erroresAuth.includes(
            event.code
          )
        ) {

          console.warn(
            "[REALTIME] No se reintentará por error de autenticación."
          );

          return;

        }


        // ----------------------------------------------------
        // RECONEXIÓN
        // ----------------------------------------------------

        programarReconexion();

      };

    };


    // ========================================================
    // INICIAR
    // ========================================================

    conectar();


    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {

      mounted =
        false;


      limpiarTimers();


      const socket =
        ws;


      ws =
        null;


      clearRealtimeSocket(
        socket
      );


      if (
        socket
      ) {

        try {

          socket.close();

        } catch {
          // Ignorar
        }

      }

    };

  }, [
    empleado?.id,
  ]);

}
