import { useEffect, useRef } from "react";
import { useMensajesStore } from "../store/mensajesStore";


/**
 * =========================================================
 * WEBSOCKET MENSAJES — MOLSAN ERP PREMIUM 2027
 * =========================================================
 *
 * El socket pertenece al empleado autenticado.
 *
 * NO depende de:
 *
 *     otroId
 *
 * Porque cambiar de conversación NO debe cerrar ni
 * reconstruir el WebSocket.
 *
 * Eventos:
 *
 *     online
 *     offline
 *     typing
 *     nuevo_mensaje
 *     nuevo_archivo
 *
 * También acepta:
 *
 *     mensaje
 *     archivo
 *
 * para mantener compatibilidad.
 * =========================================================
 */

export const useMensajesWS = (empleadoId) => {

  const wsRef = useRef(null);

  const pingInterval = useRef(null);

  const reconnectTimeout = useRef(null);

  const mountedRef = useRef(false);


  /*
   * =======================================================
   * ZUSTAND
   * =======================================================
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
          Number(state.usuarioId) ===
          Number(empleadoId)
        ) {
          return state;
        }

        return {
          ...state,
          usuarioId: Number(
            empleadoId
          ),
        };
      }
    );

  }, [
    empleadoId,
  ]);


  /*
   * =======================================================
   * WEBSOCKET
   * =======================================================
   */

  useEffect(() => {

    mountedRef.current = true;

    if (!empleadoId) {

      console.warn(
        "[WS-MSG] No hay empleadoId."
      );

      return () => {
        mountedRef.current = false;
      };

    }


    /*
     * -------------------------------------------------------
     * TOKEN
     * -------------------------------------------------------
     */

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {

      console.warn(
        "[WS-MSG] No existe token JWT."
      );

      return () => {
        mountedRef.current = false;
      };

    }


    /*
     * -------------------------------------------------------
     * URL WEBSOCKET
     * -------------------------------------------------------
     */

    let wsBase =
      import.meta.env.VITE_WS_URL;


    /*
     * Si VITE_WS_URL no existe, intentamos derivarla
     * automáticamente desde VITE_API_URL.
     */

    if (!wsBase) {

      const apiUrl =
        import.meta.env.VITE_API_URL;

      if (apiUrl) {

        try {

          const parsed =
            new URL(
              apiUrl
            );

          parsed.protocol =
            parsed.protocol ===
            "https:"
              ? "wss:"
              : "ws:";

          parsed.pathname =
            parsed.pathname.replace(
              /\/api\/?$/,
              ""
            );

          parsed.search = "";

          wsBase =
            parsed.toString().replace(
              /\/$/,
              ""
            );

        } catch (error) {

          console.error(
            "[WS-MSG] No se pudo derivar VITE_WS_URL:",
            error
          );

        }

      }

    }


    if (!wsBase) {

      console.error(
        "[WS-MSG] VITE_WS_URL no está configurada."
      );

      return () => {
        mountedRef.current = false;
      };

    }


    wsBase =
      wsBase.replace(
        /\/$/,
        ""
      );


    /*
     * =======================================================
     * LIMPIAR TIMERS
     * =======================================================
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
     * =======================================================
     * CONECTAR
     * =======================================================
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
       * No abrir dos sockets.
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


      const url =
        `${wsBase}/ws/mensajes/${empleadoId}` +
        `?token=${encodeURIComponent(
          token
        )}`;


      console.log(
        "[WS-MSG] Conectando:",
        `${wsBase}/ws/mensajes/${empleadoId}`
      );


      let ws;

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
       * =====================================================
       * OPEN
       * =====================================================
       */

      ws.onopen = () => {

        if (
          !mountedRef.current
        ) {

          try {
            ws.close();
          } catch {
            // ignorar
          }

          return;

        }


        console.log(
          `[WS-MSG] CONECTADO empleado=${empleadoId}`
        );


        /*
         * Cargar lista actual de conectados.
         */

        cargarConectados();


        /*
         * Ping.
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
                ws.readyState ===
                WebSocket.OPEN
              ) {

                try {

                  ws.send(
                    "ping"
                  );

                } catch {
                  // ignorar
                }

              }

            },
            15000
          );

      };


      /*
       * =====================================================
       * MESSAGE
       * =====================================================
       */

      ws.onmessage = (
        event
      ) => {

        if (
          !event.data
        ) {
          return;
        }


        /*
         * "pong" no es JSON.
         */

        if (
          event.data ===
          "pong"
        ) {
          return;
        }


        let data;

        try {

          data =
            JSON.parse(
              event.data
            );

        } catch (error) {

          console.warn(
            "[WS-MSG] Mensaje no JSON:",
            event.data
          );

          return;

        }


        if (
          !data ||
          !data.tipo
        ) {
          return;
        }


        console.log(
          "[WS-MSG] EVENTO:",
          data
        );


        /*
         * ===================================================
         * ONLINE
         * ===================================================
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
         * ===================================================
         * OFFLINE
         * ===================================================
         */

        if (
          data.tipo ===
          "offline"
        ) {

          setConectadosWS(
            {
              id:
                Number(
                  data.id
                ),

              offline:
                true,
            }
          );

          return;

        }


        /*
         * ===================================================
         * TYPING
         * ===================================================
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
         * ===================================================
         * MENSAJE
         * ===================================================
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
         * ===================================================
         * ARCHIVO
         * ===================================================
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
       * =====================================================
       * ERROR
       * =====================================================
       */

      ws.onerror = (
        error
      ) => {

        console.warn(
          "[WS-MSG] ERROR WebSocket",
          error
        );

      };


      /*
       * =====================================================
       * CLOSE
       * =====================================================
       */

      ws.onclose = (
        event
      ) => {

        console.warn(
          `[WS-MSG] CERRADO empleado=${empleadoId}`,
          "code=",
          event.code,
          "reason=",
          event.reason
        );


        if (
          wsRef.current ===
          ws
        ) {

          wsRef.current =
            null;

        }


        if (
          pingInterval.current
        ) {

          clearInterval(
            pingInterval.current
          );

          pingInterval.current =
            null;

        }


        /*
         * Reconectar únicamente si el componente
         * sigue montado.
         */

        if (
          mountedRef.current
        ) {

          if (
            reconnectTimeout.current
          ) {

            clearTimeout(
              reconnectTimeout.current
            );

          }


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
     * =======================================================
     * PRIMERA CONEXIÓN
     * =======================================================
     */

    conectar();


    /*
     * =======================================================
     * CLEANUP
     * =======================================================
     */

    return () => {

      mountedRef.current =
        false;


      limpiarTimers();


      const ws =
        wsRef.current;


      wsRef.current =
        null;


      if (ws) {

        try {

          ws.close(
            1000,
            "Componente desmontado"
          );

        } catch {
          // ignorar
        }

      }

    };

  }, [
    empleadoId,
    cargarConectados,
    setConectadosWS,
    setTyping,
    clearTyping,
  ]);


  return wsRef;
};
