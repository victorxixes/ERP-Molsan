import { useEffect, useRef } from "react";
import { useMensajesStore } from "../store/mensajesStore";


/**
 * =========================================================
 * WEBSOCKET MENSAJES — MOLSAN ERP PREMIUM 2027
 * =========================================================
 *
 * Canal realtime:
 *
 * - online
 * - offline
 * - typing
 * - nuevo_mensaje
 * - nuevo_archivo
 *
 * El WebSocket pertenece al empleado conectado,
 * NO a la conversación seleccionada.
 *
 * Por eso este hook solamente depende de empleadoId.
 * =========================================================
 */


export const useMensajesWS = (empleadoId) => {

  const wsRef =
    useRef(null);

  const pingInterval =
    useRef(null);

  const reconnectTimeout =
    useRef(null);

  const mountedRef =
    useRef(true);


  /*
   * -------------------------------------------------------
   * ACCIONES ZUSTAND
   * -------------------------------------------------------
   */

  const cargarConectados =
    useMensajesStore(
      (state) =>
        state.cargarConectados
    );

  const setConectadosWS =
    useMensajesStore(
      (state) =>
        state.setConectadosWS
    );

  const setTyping =
    useMensajesStore(
      (state) =>
        state.setTyping
    );

  const clearTyping =
    useMensajesStore(
      (state) =>
        state.clearTyping
    );


  /*
   * =======================================================
   * GUARDAR USUARIO ACTUAL
   * =======================================================
   */

  useEffect(() => {

    if (!empleadoId) {
      return;
    }

    useMensajesStore.setState(
      (state) => {

        if (
          state.usuarioId ===
          empleadoId
        ) {
          return state;
        }

        return {
          ...state,
          usuarioId: empleadoId,
        };

      }
    );

  }, [
    empleadoId,
  ]);


  /*
   * =======================================================
   * CONEXIÓN WEBSOCKET
   * =======================================================
   */

  useEffect(() => {

    mountedRef.current = true;

    if (!empleadoId) {
      return;
    }


    /*
     * -----------------------------------------------------
     * TOKEN JWT
     * -----------------------------------------------------
     */

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {

      console.warn(
        "[WS-MSG] No existe JWT. No se abre WebSocket."
      );

      return;

    }


    /*
     * -----------------------------------------------------
     * SI YA EXISTE UNA CONEXIÓN
     * -----------------------------------------------------
     */

    if (
      wsRef.current &&
      (
        wsRef.current.readyState ===
          WebSocket.OPEN ||
        wsRef.current.readyState ===
          WebSocket.CONNECTING
      )
    ) {

      return;

    }


    let ws = null;


    /*
     * -----------------------------------------------------
     * LIMPIAR TEMPORIZADORES
     * -----------------------------------------------------
     */

    const limpiarTimers = () => {

      if (
        pingInterval.current
      ) {

        clearInterval(
          pingInterval.current
        );

        pingInterval.current =
          null;

      }

      if (
        reconnectTimeout.current
      ) {

        clearTimeout(
          reconnectTimeout.current
        );

        reconnectTimeout.current =
          null;

      }

    };


    /*
     * =====================================================
     * CONECTAR
     * =====================================================
     */

    const conectar = () => {

      if (
        !mountedRef.current
      ) {
        return;
      }


      if (!empleadoId) {
        return;
      }


      /*
       * Si ya hay una conexión activa,
       * no crear otra.
       */

      if (
        wsRef.current &&
        (
          wsRef.current.readyState ===
            WebSocket.OPEN ||
          wsRef.current.readyState ===
            WebSocket.CONNECTING
        )
      ) {

        return;

      }


      const wsBase =
        import.meta.env.VITE_WS_URL;


      if (!wsBase) {

        console.error(
          "[WS-MSG] VITE_WS_URL no está configurada."
        );

        return;

      }


      /*
       * ---------------------------------------------------
       * URL
       * ---------------------------------------------------
       *
       * Ejemplo:
       *
       * wss://servidor/ws/mensajes/15?token=JWT
       */

      const url =
        `${wsBase}/ws/mensajes/${empleadoId}` +
        `?token=${encodeURIComponent(token)}`;


      try {

        ws =
          new WebSocket(
            url
          );

      } catch (error) {

        console.error(
          "[WS-MSG] Error creando WebSocket:",
          error
        );

        return;

      }


      wsRef.current =
        ws;


      /*
       * ===================================================
       * OPEN
       * ===================================================
       */

      ws.onopen = () => {

        console.log(
          `[WS-MSG] Conectado: ${empleadoId}`
        );


        /*
         * Cargar empleados conectados.
         */

        cargarConectados();


        /*
         * Ping cada 15 segundos.
         */

        if (
          pingInterval.current
        ) {

          clearInterval(
            pingInterval.current
          );

        }


        pingInterval.current =
          setInterval(
            () => {

              if (
                ws &&
                ws.readyState ===
                  WebSocket.OPEN
              ) {

                ws.send(
                  "ping"
                );

              }

            },
            15000
          );

      };


      /*
       * ===================================================
       * MESSAGE
       * ===================================================
       */

      ws.onmessage = (
        event
      ) => {

        if (
          !event.data
        ) {
          return;
        }


        let data;


        try {

          data =
            JSON.parse(
              event.data
            );

        } catch {

          /*
           * Puede ser "pong".
           */

          return;

        }


        if (
          !data ||
          !data.tipo
        ) {

          return;

        }


        /*
         * -----------------------------------------------
         * ONLINE
         * -----------------------------------------------
         */

        if (
          data.tipo ===
          "online"
        ) {

          setConectadosWS(
            data
          );

          return;

        }


        /*
         * -----------------------------------------------
         * OFFLINE
         * -----------------------------------------------
         */

        if (
          data.tipo ===
          "offline"
        ) {

          setConectadosWS(
            {
              id:
                data.id,

              offline:
                true,
            }
          );

          return;

        }


        /*
         * -----------------------------------------------
         * TYPING
         * -----------------------------------------------
         */

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

            return;

          }


          setTyping(
            fromId
          );


          /*
           * Ocultar typing después de 1,5 segundos.
           */

          setTimeout(
            () => {

              clearTyping(
                fromId
              );

            },
            1500
          );


          return;

        }


        /*
         * -----------------------------------------------
         * MENSAJE
         * -----------------------------------------------
         *
         * Backend:
         *
         * {
         *   tipo: "nuevo_mensaje",
         *   mensaje: {...}
         * }
         */

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


          return;

        }


        /*
         * -----------------------------------------------
         * ARCHIVO
         * -----------------------------------------------
         */

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


          return;

        }

      };


      /*
       * ===================================================
       * ERROR
       * ===================================================
       */

      ws.onerror = (
        error
      ) => {

        console.warn(
          "[WS-MSG] Error WebSocket.",
          error
        );

      };


      /*
       * ===================================================
       * CLOSE
       * ===================================================
       */

      ws.onclose = (
        event
      ) => {

        console.warn(
          `[WS-MSG] Desconectado: ${empleadoId}`,
          event.code
        );


        limpiarTimers();


        if (
          wsRef.current ===
          ws
        ) {

          wsRef.current =
            null;

        }


        /*
         * Reconectar automáticamente.
         *
         * No hacerlo si el componente ya se desmontó.
         */

        if (
          mountedRef.current
        ) {

          reconnectTimeout.current =
            setTimeout(
              () => {

                reconnectTimeout.current =
                  null;

                conectar();

              },
              2000
            );

        }

      };

    };


    /*
     * PRIMERA CONEXIÓN
     */

    conectar();


    /*
     * =====================================================
     * CLEANUP
     * =====================================================
     */

    return () => {

      mountedRef.current =
        false;


      limpiarTimers();


      if (
        wsRef.current
      ) {

        try {

          wsRef.current.close();

        } catch {
          // Ignorar errores de cierre.
        }

      }


      wsRef.current =
        null;

    };

  }, [
    empleadoId,
    cargarConectados,
    setConectadosWS,
    setTyping,
    clearTyping,
  ]);


  /*
   * =======================================================
   * RETURN
   * =======================================================
   */

  return wsRef;
};
