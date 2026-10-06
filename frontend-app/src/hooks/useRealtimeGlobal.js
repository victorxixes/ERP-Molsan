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

  const empleado = useAuthStore(
    (state) => state.empleado
  );


  useEffect(() => {

    if (
      !empleado ||
      !empleado.id
    ) {

      return;

    }

    const token =
      localStorage.getItem("token");

    if (!token) {

      console.warn(
        "[REALTIME] No existe JWT."
      );

      return;

    }


    let ws = null;
    let reconnectTimer = null;
    let pingInterval = null;
    let mounted = true;


    // ========================================================
    // LIMPIAR
    // ========================================================

    const limpiar = () => {

      if (reconnectTimer) {

        clearTimeout(
          reconnectTimer
        );

        reconnectTimer = null;

      }

      if (pingInterval) {

        clearInterval(
          pingInterval
        );

        pingInterval = null;

      }

    };


    // ========================================================
    // CONECTAR
    // ========================================================

    const conectar = () => {

      if (!mounted) {
        return;
      }


      limpiar();


      try {

        const url =
          buildRealtimeWsUrl({
            usuario_id:
              empleado.id,
            token,
          });


        console.log(
          "[REALTIME] Conectando:",
          url
        );


        ws =
          new WebSocket(url);


        setRealtimeSocket(
          ws
        );


      } catch (error) {

        console.error(
          "[REALTIME] Error creando WebSocket:",
          error
        );

        programarReconexion();

        return;

      }


      // ======================================================
      // OPEN
      // ======================================================

      ws.onopen = () => {

        if (!mounted) {
          return;
        }


        console.log(
          "[REALTIME] Conectado:",
          empleado.id
        );


        // ----------------------------------------------
        // USUARIO ACTUAL EN STORE
        // ----------------------------------------------

        useMensajesStore.setState(
          (state) => ({
            ...state,
            usuarioId:
              empleado.id,
          })
        );


        // ----------------------------------------------
        // PING
        // ----------------------------------------------

        pingInterval =
          setInterval(
            () => {

              if (
                ws &&
                ws.readyState ===
                  WebSocket.OPEN
              ) {

                try {

                  ws.send("ping");

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

        try {

          data =
            JSON.parse(
              event.data
            );

        } catch {

          return;

        }


        if (!data) {
          return;
        }


        // ====================================================
        // SNAPSHOT
        // ====================================================

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


          return;

        }


        // ====================================================
        // ONLINE
        // ====================================================

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


          return;

        }


        // ====================================================
        // OFFLINE
        // ====================================================

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
                offline: true,
              });

          }


          return;

        }


        // ====================================================
        // TYPING
        // ====================================================

        if (
          data.evento ===
          "typing"
        ) {

          const fromId =
            Number(
              data.data?.from
            );


          if (!fromId) {
            return;
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


          return;

        }


        // ====================================================
        // MENSAJE
        // ====================================================

        if (
          data.evento ===
          "mensaje_nuevo"
        ) {

          const mensaje =
            data.data?.mensaje;


          if (mensaje) {

            useMensajesStore
              .getState()
              .addMensajeRealtime(
                mensaje
              );

          }


          return;

        }


        // ====================================================
        // ARCHIVO
        // ====================================================

        if (
          data.evento ===
          "archivo_nuevo"
        ) {

          const mensaje =
            data.data?.mensaje;


          if (mensaje) {

            useMensajesStore
              .getState()
              .addArchivoRealtime(
                mensaje
              );

          }


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


        limpiar();


        clearRealtimeSocket(
          ws
        );


        if (!mounted) {
          return;
        }


        // ----------------------------------------------
        // ERRORES DE AUTENTICACIÓN
        // ----------------------------------------------

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


        programarReconexión();

      };

    };


    // ========================================================
    // RECONEXIÓN
    // ========================================================

    const programarReconexión = () => {

      if (
        !mounted ||
        reconnectTimer
      ) {

        return;

      }


      reconnectTimer =
        setTimeout(
          () => {

            reconnectTimer = null;

            conectar();

          },
          2000
        );

    };


    // ========================================================
    // START
    // ========================================================

    conectar();


    // ========================================================
    // CLEANUP
    // ========================================================

    return () => {

      mounted = false;

      limpiar();

      clearRealtimeSocket(
        ws
      );


      if (ws) {

        try {

          ws.close();

        } catch {
          // Ignorar
        }

      }

    };

  }, [
    empleado?.id,
  ]);

}
