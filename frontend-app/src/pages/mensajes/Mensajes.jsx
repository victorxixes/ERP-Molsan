import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

import { useMensajesStore } from "../../store/mensajesStore";
import { useMensajesWS } from "../../hooks/useMensajesWS";

import MensajeBubble from "../../components/mensajes/MensajeBubble";
import MensajesHeader from "../../components/mensajes/MensajesHeader";


/**
 * =========================================================
 * MENSAJES — MOLSAN ERP SAAS PREMIUM 2027
 * =========================================================
 *
 * Arquitectura:
 *
 * REST:
 * - Cargar conversación
 * - Cargar conectados
 * - Marcar leído
 * - Subir archivos
 *
 * WebSocket:
 * - Online
 * - Offline
 * - Typing
 * - Mensajes
 * - Archivos
 *
 * IMPORTANTE:
 *
 * Los mensajes enviados por WebSocket ya se guardan
 * en PostgreSQL desde el backend.
 *
 * Por eso NO hacemos un POST REST adicional después
 * de enviar un mensaje por WebSocket.
 * =========================================================
 */


export default function Mensajes({
  usuarioId,
}) {

  const [otroId, setOtroId] =
    useState(null);

  const [texto, setTexto] =
    useState("");


  /*
   * -------------------------------------------------------
   * ESTADO ZUSTAND
   * -------------------------------------------------------
   */

  const {
    mensajes,
    conectados,
    typing,
    cargarConversacion,
    marcarConversacionLeida,
  } = useMensajesStore();


  /*
   * -------------------------------------------------------
   * WEBSOCKET
   * -------------------------------------------------------
   *
   * IMPORTANTE:
   *
   * El WebSocket solamente depende del usuario.
   *
   * Cambiar otroId NO reconecta el socket.
   */

  const wsRef =
    useMensajesWS(
      usuarioId
    );


  const chatRef =
    useRef(null);


  /*
   * =======================================================
   * USUARIOS CONECTADOS
   * =======================================================
   */

  const conectadosFiltrados =
    useMemo(
      () =>
        conectados.filter(
          (c) =>
            c.id !==
            usuarioId
        ),
      [
        conectados,
        usuarioId,
      ]
    );


  /*
   * =======================================================
   * CARGAR CONVERSACIÓN
   * =======================================================
   */

  useEffect(() => {

    if (
      !usuarioId ||
      !otroId
    ) {

      return;

    }


    cargarConversacion(
      usuarioId,
      otroId
    );


    /*
     * Al abrir la conversación,
     * marcar como leída.
     */

    marcarConversacionLeida(
      usuarioId,
      otroId
    );

  }, [
    usuarioId,
    otroId,
    cargarConversacion,
    marcarConversacionLeida,
  ]);


  /*
   * =======================================================
   * SCROLL AUTOMÁTICO
   * =======================================================
   */

  useEffect(() => {

    const el =
      chatRef.current;


    if (!el) {
      return;
    }


    el.scrollTo({
      top:
        el.scrollHeight,

      behavior:
        "smooth",
    });

  }, [
    mensajes,
  ]);


  /*
   * =======================================================
   * ENVIAR MENSAJE WEBSOCKET
   * =======================================================
   */

  const enviarMensajeWS =
    useCallback(
      () => {

        if (
          !otroId
        ) {

          return false;

        }


        const contenido =
          texto.trim();


        if (
          !contenido
        ) {

          return false;

        }


        const ws =
          wsRef.current;


        if (
          !ws ||
          ws.readyState !==
            WebSocket.OPEN
        ) {

          console.warn(
            "[MENSAJES] WebSocket no conectado."
          );

          return false;

        }


        /*
         * Enviar solamente por WebSocket.
         *
         * El backend:
         *
         * 1. Guarda en BD.
         * 2. Genera ID.
         * 3. Envía el mensaje al remitente.
         * 4. Envía el mensaje al destinatario.
         */

        ws.send(
          JSON.stringify({
            tipo:
              "mensaje",

            destinatario_id:
              otroId,

            contenido,
          })
        );


        return true;

      },
      [
        otroId,
        texto,
        wsRef,
      ]
    );


  /*
   * =======================================================
   * TYPING
   * =======================================================
   */

  const enviarTypingWS =
    useCallback(
      () => {

        if (
          !otroId
        ) {

          return;

        }


        const ws =
          wsRef.current;


        if (
          !ws ||
          ws.readyState !==
            WebSocket.OPEN
        ) {

          return;

        }


        ws.send(
          JSON.stringify({
            tipo:
              "typing",

            destinatario_id:
              otroId,
          })
        );

      },
      [
        otroId,
        wsRef,
      ]
    );


  /*
   * =======================================================
   * ADJUNTO
   * =======================================================
   */

  const handleAdjunto =
    useCallback(
      async (e) => {

        const file =
          e.target.files?.[0];


        if (
          !file ||
          !otroId
        ) {

          return;

        }


        const ws =
          wsRef.current;


        if (
          !ws ||
          ws.readyState !==
            WebSocket.OPEN
        ) {

          console.warn(
            "[MENSAJES] WebSocket no conectado."
          );

          e.target.value =
            "";

          return;

        }


        const fd =
          new FormData();


        fd.append(
          "file",
          file
        );


        try {

          /*
           * ------------------------------------------------
           * SUBIR ARCHIVO
           * ------------------------------------------------
           */

          const res =
            await fetch(
              `${import.meta.env.VITE_API_URL}/mensajes/upload`,
              {
                method:
                  "POST",

                headers: {
                  /*
                   * NO poner Content-Type aquí.
                   *
                   * El navegador lo genera automáticamente
                   * con el boundary de FormData.
                   */
                },

                body:
                  fd,
              }
            );


          if (
            !res.ok
          ) {

            throw new Error(
              `HTTP ${res.status}`
            );

          }


          const data =
            await res.json();


          if (
            data.status !==
            "ok"
          ) {

            console.error(
              "[MENSAJES] Error subiendo archivo:",
              data
            );

            return;

          }


          const archivoUrl =
            data.archivo_url;


          if (
            !archivoUrl
          ) {

            console.error(
              "[MENSAJES] El backend no devolvió archivo_url."
            );

            return;

          }


          /*
           * ------------------------------------------------
           * ENVIAR ARCHIVO POR WEBSOCKET
           * ------------------------------------------------
           *
           * NO hacemos POST /mensajes.
           *
           * El backend WebSocket será quien cree
           * el registro Mensaje en PostgreSQL.
           */

          ws.send(
            JSON.stringify({
              tipo:
                "archivo",

              destinatario_id:
                otroId,

              archivo_url:
                archivoUrl,
            })
          );

        } catch (err) {

          console.error(
            "Error adjunto:",
            err
          );

        } finally {

          e.target.value =
            "";

        }

      },
      [
        otroId,
        wsRef,
      ]
    );


  /*
   * =======================================================
   * AGRUPAR MENSAJES POR FECHA
   * =======================================================
   */

  const mensajesAgrupados =
    useMemo(
      () =>
        mensajes.reduce(
          (
            acc,
            m
          ) => {

            const fechaObj =
              new Date(
                m.fecha
              );


            const fecha =
              isNaN(
                fechaObj.getTime()
              )
                ? "Sin fecha"
                : fechaObj
                    .toISOString()
                    .split("T")[0];


            if (
              !acc[fecha]
            ) {

              acc[fecha] =
                [];

            }


            acc[fecha].push(
              m
            );


            return acc;

          },
          {}
        ),
      [
        mensajes,
      ]
    );


  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

  return (
    <div
      className="
        relative
        min-h-full
        overflow-hidden
        px-4
        py-4
        sm:px-6
        sm:py-6
        animate-fadeIn
      "
    >

      {/* ===================================================
          FONDO PREMIUM
      =================================================== */}

      <div
        className="
          absolute
          inset-0
          pointer-events-none
          overflow-hidden
        "
      >

        <div
          className="
            absolute
            -top-48
            -left-48
            w-[520px]
            h-[520px]
            rounded-full
            bg-blue-400/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -bottom-48
            -right-48
            w-[520px]
            h-[520px]
            rounded-full
            bg-cyan-300/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            top-1/2
            left-1/2
            w-[700px]
            h-[700px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white/70
            blur-3xl
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-br
            from-white/70
            via-transparent
            to-blue-50/70
          "
        />

      </div>


      {/* ===================================================
          CONTENIDO
      =================================================== */}

      <div
        className="
          relative
          z-10
          grid
          grid-cols-1
          lg:grid-cols-3
          gap-5
        "
      >

        {/* =================================================
            COLUMNA CONTACTOS
        ================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[24px]
            border
            border-white/80
            bg-white/75
            backdrop-blur-2xl
            shadow-[0_20px_60px_rgba(15,23,42,0.10)]
            animate-slideUp
          "
        >

          <div
            className="
              absolute
              top-0
              left-0
              right-0
              h-px
              bg-gradient-to-r
              from-transparent
              via-blue-400/50
              to-transparent
            "
          />


          {/* CABECERA */}

          <div
            className="
              px-5
              py-5
              border-b
              border-slate-200/80
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >

              <div>

                <h2
                  className="
                    text-lg
                    font-bold
                    tracking-tight
                    text-slate-800
                  "
                >
                  Mensajes
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Empleados conectados
                </p>

              </div>


              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-3
                  py-1.5
                "
              >

                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-emerald-500
                    animate-pulse
                  "
                />

                <span
                  className="
                    text-xs
                    font-medium
                    text-emerald-600
                  "
                >
                  {
                    conectadosFiltrados.length
                  }
                </span>

              </div>

            </div>

          </div>


          {/* LISTA */}

          <div
            className="
              p-4
              space-y-2
              max-h-[650px]
              overflow-y-auto
            "
          >

            {conectadosFiltrados.length ===
              0 && (

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50/80
                  px-4
                  py-8
                  text-center
                "
              >

                <div
                  className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    bg-slate-100
                    text-xl
                  "
                >
                  👥
                </div>

                <p
                  className="
                    text-sm
                    font-medium
                    text-slate-600
                  "
                >
                  No hay empleados
                  conectados
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Los usuarios online
                  aparecerán aquí.
                </p>

              </div>

            )}


            {conectadosFiltrados.map(
              (c) => (

                <button
                  key={
                    c.id
                  }
                  type="button"
                  onClick={() =>
                    setOtroId(
                      c.id
                    )
                  }
                  className={`
                    group
                    w-full
                    rounded-2xl
                    border
                    p-3
                    text-left
                    transition-all
                    duration-200
                    flex
                    items-center
                    gap-3
                    ${
                      otroId === c.id
                        ? `
                          border-blue-200
                          bg-blue-50
                          shadow-[0_8px_25px_rgba(37,99,235,0.10)]
                        `
                        : `
                          border-slate-200/80
                          bg-white/70
                          hover:bg-white
                          hover:border-blue-200
                          hover:shadow-[0_8px_25px_rgba(15,23,42,0.07)]
                        `
                    }
                  `}
                >

                  {/* AVATAR */}

                  <div
                    className="
                      relative
                      h-11
                      w-11
                      shrink-0
                    "
                  >

                    <img
                      src={
                        c.foto
                          ? (
                              c.foto.startsWith(
                                "http://"
                              ) ||
                              c.foto.startsWith(
                                "https://"
                              )
                                ? c.foto
                                : `${import.meta.env.VITE_API_URL}${c.foto}`
                            )
                          : "/no-foto.png"
                      }
                      alt=""
                      className="
                        h-11
                        w-11
                        rounded-full
                        object-cover
                        border
                        border-slate-200
                        shadow-sm
                      "
                    />

                    <span
                      className="
                        absolute
                        bottom-0
                        right-0
                        h-3
                        w-3
                        rounded-full
                        border-2
                        border-white
                        bg-emerald-500
                      "
                    />

                  </div>


                  {/* DATOS */}

                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >

                    <div
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-slate-700
                      "
                    >
                      {c.nombre}{" "}
                      {c.apellidos}
                    </div>

                    <div
                      className="
                        mt-0.5
                        text-xs
                        text-slate-400
                      "
                    >
                      Disponible ahora
                    </div>

                  </div>


                  {/* FLECHA */}

                  <span
                    className="
                      text-slate-300
                      transition-transform
                      group-hover:translate-x-0.5
                      group-hover:text-blue-400
                    "
                  >
                    ›
                  </span>

                </button>

              )
            )}

          </div>

        </section>


        {/* =================================================
            CHAT
        ================================================= */}

        <section
          className="
            relative
            lg:col-span-2
            overflow-hidden
            rounded-[24px]
            border
            border-white/80
            bg-white/75
            backdrop-blur-2xl
            shadow-[0_20px_60px_rgba(15,23,42,0.10)]
            animate-slideUp
          "
        >

          <div
            className="
              absolute
              top-0
              left-0
              right-0
              h-px
              bg-gradient-to-r
              from-transparent
              via-blue-400/50
              to-transparent
            "
          />


          {otroId ? (

            <div
              className="
                p-4
                sm:p-5
              "
            >

              {/* CABECERA */}

              <MensajesHeader
                otroId={
                  otroId
                }
                conectados={
                  conectadosFiltrados
                }
              />


              {/* CHAT */}

              <div
                ref={
                  chatRef
                }
                className="
                  h-[400px]
                  sm:h-[480px]
                  overflow-y-auto
                  rounded-2xl
                  border
                  border-slate-200/80
                  bg-slate-50/70
                  p-4
                  shadow-inner
                "
              >

                {Object.keys(
                  mensajesAgrupados
                ).length === 0 && (

                  <div
                    className="
                      h-full
                      flex
                      items-center
                      justify-center
                      text-center
                    "
                  >

                    <div>

                      <div
                        className="
                          mx-auto
                          mb-3
                          flex
                          h-14
                          w-14
                          items-center
                          justify-center
                          rounded-2xl
                          bg-blue-50
                          text-2xl
                        "
                      >
                        💬
                      </div>

                      <p
                        className="
                          text-sm
                          font-medium
                          text-slate-600
                        "
                      >
                        No hay mensajes
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-slate-400
                        "
                      >
                        Escribe el primer
                        mensaje.
                      </p>

                    </div>

                  </div>

                )}


                {Object.keys(
                  mensajesAgrupados
                ).map(
                  (fecha) => (

                    <div
                      key={
                        fecha
                      }
                    >

                      <div
                        className="
                          my-4
                          flex
                          items-center
                          justify-center
                        "
                      >

                        <span
                          className="
                            rounded-full
                            border
                            border-slate-200
                            bg-white
                            px-3
                            py-1
                            text-[11px]
                            font-medium
                            text-slate-400
                            shadow-sm
                          "
                        >
                          {fecha}
                        </span>

                      </div>


                      {mensajesAgrupados[
                        fecha
                      ].map(
                        (m) => {

                          const remitente =
                            conectadosFiltrados.find(
                              (x) =>
                                x.id ===
                                m.remitente_id
                            );


                          const avatarUrl =
                            remitente?.foto
                              ? (
                                  remitente.foto.startsWith(
                                    "http://"
                                  ) ||
                                  remitente.foto.startsWith(
                                    "https://"
                                  )
                                    ? remitente.foto
                                    : `${import.meta.env.VITE_API_URL}${remitente.foto}`
                                )
                              : "/no-foto.png";


                          const online =
                            conectadosFiltrados.some(
                              (x) =>
                                x.id ===
                                m.remitente_id
                            );


                          return (

                            <MensajeBubble
                              key={
                                m.id
                              }
                              mensaje={
                                m
                              }
                              usuarioId={
                                usuarioId
                              }
                              avatarUrl={
                                avatarUrl
                              }
                              online={
                                online
                              }
                            />

                          );

                        }
                      )}

                    </div>

                  )
                )}


                {/* TYPING */}

                {typing[
                  otroId
                ] && (

                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-2
                      text-xs
                      text-slate-400
                      italic
                    "
                  >

                    <div
                      className="
                        flex
                        gap-1
                        rounded-full
                        border
                        border-slate-200
                        bg-white
                        px-2.5
                        py-2
                        shadow-sm
                      "
                    >

                      <span
                        className="
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-slate-300
                          animate-bounce
                        "
                      />

                      <span
                        className="
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-slate-300
                          animate-bounce
                          [animation-delay:150ms]
                        "
                      />

                      <span
                        className="
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-slate-300
                          animate-bounce
                          [animation-delay:300ms]
                        "
                      />

                    </div>

                    <span>
                      escribiendo…
                    </span>

                  </div>

                )}

              </div>


              {/* =================================================
                  INPUT
              ================================================= */}

              <form
                onSubmit={(
                  e
                ) => {

                  e.preventDefault();


                  if (
                    !texto.trim() ||
                    !otroId
                  ) {

                    return;

                  }


                  const enviado =
                    enviarMensajeWS();


                  if (
                    enviado
                  ) {

                    setTexto(
                      ""
                    );

                  }

                }}
                className="
                  mt-4
                  flex
                  gap-2
                "
              >

                {/* INPUT */}

                <input
                  value={
                    texto
                  }
                  onChange={(
                    e
                  ) => {

                    setTexto(
                      e.target.value
                    );

                    enviarTypingWS();

                  }}
                  className="
                    min-w-0
                    flex-1
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-700
                    placeholder:text-slate-400
                    outline-none
                    shadow-sm
                    transition-all
                    focus:border-blue-400
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                  placeholder="Escribe un mensaje…"
                />


                {/* ADJUNTO */}

                <label
                  className="
                    flex
                    h-[46px]
                    w-[46px]
                    shrink-0
                    cursor-pointer
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    text-lg
                    text-slate-400
                    shadow-sm
                    transition-all
                    hover:border-blue-200
                    hover:bg-blue-50
                    hover:text-blue-500
                    active:scale-[0.97]
                  "
                  title="Adjuntar archivo"
                >

                  📎

                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={
                      handleAdjunto
                    }
                  />

                </label>


                {/* ENVIAR */}

                <button
                  type="submit"
                  className="
                    h-[46px]
                    shrink-0
                    rounded-xl
                    border
                    border-blue-500/20
                    bg-gradient-to-r
                    from-blue-600
                    to-blue-500
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_8px_22px_rgba(37,99,235,0.18)]
                    transition-all
                    hover:from-blue-500
                    hover:to-blue-400
                    hover:shadow-[0_12px_28px_rgba(37,99,235,0.24)]
                    active:scale-[0.97]
                  "
                >
                  Enviar
                </button>

              </form>

            </div>

          ) : (

            <div
              className="
                flex
                min-h-[560px]
                items-center
                justify-center
                p-8
                text-center
              "
            >

              <div>

                <div
                  className="
                    mx-auto
                    mb-5
                    flex
                    h-20
                    w-20
                    items-center
                    justify-center
                    rounded-[24px]
                    border
                    border-blue-100
                    bg-blue-50
                    text-3xl
                    shadow-sm
                  "
                >
                  💬
                </div>

                <h2
                  className="
                    text-xl
                    font-bold
                    tracking-tight
                    text-slate-700
                  "
                >
                  Mensajería interna
                </h2>

                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-sm
                    text-sm
                    leading-6
                    text-slate-400
                  "
                >
                  Selecciona un empleado
                  conectado en la columna
                  izquierda para comenzar
                  una conversación.
                </p>

              </div>

            </div>

          )}

        </section>

      </div>

    </div>
  );
}
