import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useMensajesStore,
} from "../../store/mensajesStore";

import {
  sendRealtime,
} from "../../realtime/realtimeClient";

import MensajeBubble from "../../components/mensajes/MensajeBubble";

import MensajesHeader from "../../components/mensajes/MensajesHeader";


export default function Mensajes({
  usuarioId,
}) {

  const [otroId, setOtroId] =
    useState(null);

  const [texto, setTexto] =
    useState("");

  const [subiendoArchivo, setSubiendoArchivo] =
    useState(false);

  const chatRef =
    useRef(null);


  // =======================================================
  // STORE
  // =======================================================

  const mensajes =
    useMensajesStore(
      (state) =>
        state.mensajes
    );

  const conectados =
    useMensajesStore(
      (state) =>
        state.conectados
    );

  const typing =
    useMensajesStore(
      (state) =>
        state.typing
    );

  const cargarConversacion =
    useMensajesStore(
      (state) =>
        state.cargarConversacion
    );

  const marcarConversacionLeida =
    useMensajesStore(
      (state) =>
        state.marcarConversacionLeida
    );

  const limpiarNoLeidos =
    useMensajesStore(
      (state) =>
        state.limpiarNoLeidos
    );


  // =======================================================
  // CONTACTOS
  // =======================================================

  const conectadosFiltrados =
    useMemo(
      () =>
        conectados.filter(
          (empleado) =>
            Number(empleado.id) !==
            Number(usuarioId)
        ),
      [
        conectados,
        usuarioId,
      ]
    );


  // =======================================================
  // EMPLEADO SELECCIONADO
  // =======================================================

  const empleadoSeleccionado =
    useMemo(
      () =>
        conectados.find(
          (empleado) =>
            Number(empleado.id) ===
            Number(otroId)
        ),
      [
        conectados,
        otroId,
      ]
    );


  // =======================================================
  // CARGAR CONVERSACIÓN
  // =======================================================

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

    marcarConversacionLeida(
      usuarioId,
      otroId
    );

    limpiarNoLeidos(
      otroId
    );

  }, [
    usuarioId,
    otroId,
    cargarConversacion,
    marcarConversacionLeida,
    limpiarNoLeidos,
  ]);


  // =======================================================
  // CUANDO LLEGA UN MENSAJE DEL CHAT ABIERTO
  // =======================================================

  useEffect(() => {

    if (
      !otroId ||
      !usuarioId ||
      !mensajes.length
    ) {
      return;
    }


    const ultimo =
      mensajes[
        mensajes.length - 1
      ];


    if (
      !ultimo
    ) {
      return;
    }


    const esRecibido =
      Number(
        ultimo.remitente_id
      ) ===
      Number(
        otroId
      ) &&
      Number(
        ultimo.destinatario_id
      ) ===
      Number(
        usuarioId
      );


    if (
      esRecibido &&
      ultimo.leido === false
    ) {

      marcarConversacionLeida(
        usuarioId,
        otroId
      );

      limpiarNoLeidos(
        otroId
      );

    }

  }, [
    mensajes,
    usuarioId,
    otroId,
    marcarConversacionLeida,
    limpiarNoLeidos,
  ]);


  // =======================================================
  // SCROLL
  // =======================================================

  useEffect(() => {

    const element =
      chatRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      top:
        element.scrollHeight,
      behavior:
        "smooth",
    });

  }, [
    mensajes,
  ]);


  // =======================================================
  // ENVIAR MENSAJE
  // =======================================================

  const enviarMensaje =
    useCallback(() => {

      if (!otroId) {
        return;
      }


      const contenido =
        texto.trim();


      if (!contenido) {
        return;
      }


      const enviado =
        sendRealtime({
          tipo:
            "mensaje",

          destinatario_id:
            Number(otroId),

          contenido,
        });


      if (!enviado) {

        console.warn(
          "[MENSAJES] No se pudo enviar el mensaje. WebSocket realtime no conectado."
        );

        return;

      }


      setTexto("");

    }, [
      otroId,
      texto,
    ]);


  // =======================================================
  // ENTER
  // =======================================================

  const manejarTecla =
    useCallback(
      (event) => {

        if (
          event.key ===
          "Enter" &&
          !event.shiftKey
        ) {

          event.preventDefault();

          enviarMensaje();

        }

      },
      [
        enviarMensaje,
      ]
    );


  // =======================================================
  // TYPING
  // =======================================================

  const enviarTyping =
    useCallback(() => {

      if (!otroId) {
        return;
      }


      sendRealtime({

        tipo:
          "typing",

        destinatario_id:
          Number(otroId),

      });

    }, [
      otroId,
    ]);


  // =======================================================
  // SUBIR ARCHIVO
  // =======================================================

  const handleAdjunto =
    useCallback(
      async (event) => {

        const file =
          event.target.files?.[0];


        if (
          !file ||
          !otroId
        ) {

          event.target.value =
            "";

          return;

        }


        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );


        setSubiendoArchivo(
          true
        );


        try {

          // =================================================
          // SUBIR ARCHIVO
          // =================================================

          const response =
            await fetch(
              `${import.meta.env.VITE_API_URL}/mensajes/upload`,
              {
                method:
                  "POST",

                body:
                  formData,
              }
            );


          if (
            !response.ok
          ) {

            throw new Error(
              `HTTP ${response.status}`
            );

          }


          const data =
            await response.json();


          if (
            data.status !==
            "ok"
          ) {

            throw new Error(
              data.msg ||
              "No se pudo subir el archivo."
            );

          }


          if (
            !data.archivo_url
          ) {

            throw new Error(
              "El backend no devolvió archivo_url."
            );

          }


          // =================================================
          // ENVIAR POR REALTIME GLOBAL
          // =================================================

          const enviado =
            sendRealtime({

              tipo:
                "archivo",

              destinatario_id:
                Number(otroId),

              archivo_url:
                data.archivo_url,

            });


          if (!enviado) {

            throw new Error(
              "No existe conexión realtime para enviar el archivo."
            );

          }

        } catch (error) {

          console.error(
            "[MENSAJES] Error adjunto:",
            error
          );

        } finally {

          setSubiendoArchivo(
            false
          );

          event.target.value =
            "";

        }

      },
      [
        otroId,
      ]
    );


  // =======================================================
  // AGRUPAR POR FECHA
  // =======================================================

  const mensajesAgrupados =
    useMemo(() => {

      const grupos = {};


      for (
        const mensaje of mensajes
      ) {

        const fecha =
          new Date(
            mensaje.fecha
          );


        const clave =
          Number.isNaN(
            fecha.getTime()
          )
            ? "Sin fecha"
            : fecha
                .toLocaleDateString(
                  "es-ES",
                  {
                    day:
                      "2-digit",

                    month:
                      "2-digit",

                    year:
                      "numeric",
                  }
                );


        if (
          !grupos[clave]
        ) {

          grupos[clave] =
            [];

        }


        grupos[clave].push(
          mensaje
        );

      }


      return grupos;

    }, [
      mensajes,
    ]);


  // =======================================================
  // URL FOTO
  // =======================================================

  const fotoUrl =
    (foto) => {

      if (!foto) {
        return "/no-foto.png";
      }


      if (
        foto.startsWith(
          "http://"
        ) ||
        foto.startsWith(
          "https://"
        )
      ) {
        return foto;
      }


      return `${import.meta.env.VITE_API_URL}${foto}`;

    };


  // =======================================================
  // TOTAL MENSAJES PENDIENTES
  // =======================================================

  const totalPendientes =
    useMemo(
      () =>
        conectadosFiltrados.reduce(
          (
            total,
            empleado
          ) =>
            total +
            (
              Number(
                empleado.mensajes_no_leidos
              ) || 0
            ),
          0
        ),
      [
        conectadosFiltrados,
      ]
    );


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div
      className="
        relative

        min-h-0

        lg:h-[calc(100dvh-96px)]
        lg:min-h-0

        overflow-hidden

        px-4
        py-4

        sm:px-6
        sm:py-6

        animate-fadeIn
      "
    >

      {/* =================================================
          FONDO PREMIUM
      ================================================= */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
        "
      >

        <div
          className="
            absolute
            -left-48
            -top-48
            h-[520px]
            w-[520px]
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
            h-[520px]
            w-[520px]
            rounded-full
            bg-cyan-300/10
            blur-3xl
          "
        />

        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[700px]
            w-[700px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white/70
            blur-3xl
          "
        />

      </div>


      {/* =================================================
          CONTENIDO
      ================================================= */}

      <div
        className="
          relative
          z-10

          grid
          grid-cols-1

          gap-5

          lg:grid-cols-3
          lg:h-full
          lg:min-h-0
        "
      >

        {/* =================================================
            CONTACTOS
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

            lg:flex
            lg:h-full
            lg:min-h-0
            lg:flex-col
          "
        >

          {/* línea superior */}

          <div
            className="
              absolute
              left-0
              right-0
              top-0
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
              border-b
              border-slate-200/80
              px-5
              py-5
              shrink-0
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
                "
              >

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
                    {conectadosFiltrados.length}
                  </span>

                </div>


                {totalPendientes > 0 && (
                  <div
                    className="
                      flex
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-red-200
                      bg-red-50
                      px-2.5
                      py-1.5
                      text-xs
                      font-bold
                      text-red-600
                    "
                  >

                    <span>
                      ●
                    </span>

                    <span>
                      {totalPendientes}
                    </span>

                  </div>
                )}

              </div>

            </div>

          </div>


          {/* LISTA */}

          <div
            className="
              flex-1
              min-h-0

              space-y-2
              overflow-y-auto

              p-4
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
              (empleado) => {

                const pendientes =
                  Number(
                    empleado.mensajes_no_leidos
                  ) || 0;


                const seleccionado =
                  Number(
                    otroId
                  ) ===
                  Number(
                    empleado.id
                  );


                return (

                  <button
                    key={
                      empleado.id
                    }
                    type="button"
                    onClick={() =>
                      setOtroId(
                        empleado.id
                      )
                    }
                    className={`
                      group
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-2xl
                      border
                      p-3
                      text-left
                      transition-all
                      duration-200

                      ${
                        seleccionado
                          ? `
                            border-blue-200
                            bg-blue-50
                            shadow-[0_8px_25px_rgba(37,99,235,0.10)]
                          `
                          : `
                            border-slate-200/80
                            bg-white/70
                            hover:border-blue-200
                            hover:bg-white
                            hover:shadow-[0_8px_25px_rgba(15,23,42,0.07)]
                          `
                      }

                      ${
                        pendientes > 0
                          ? "ring-1 ring-red-100"
                          : ""
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
                          fotoUrl(
                            empleado.foto
                          )
                        }
                        alt=""
                        className="
                          h-11
                          w-11
                          rounded-full
                          border
                          border-slate-200
                          object-cover
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
                        {
                          empleado.nombre
                        }{" "}
                        {
                          empleado.apellidos
                        }
                      </div>


                      {pendientes > 0 ? (

                        <div
                          className="
                            mt-1
                            flex
                            items-center
                            gap-2
                          "
                        >

                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1
                              rounded-full
                              bg-red-50
                              px-2
                              py-0.5
                              text-[11px]
                              font-bold
                              text-red-600
                            "
                          >

                            <span>
                              ●
                            </span>

                            <span>
                              {pendientes === 1
                                ? "Nuevo mensaje"
                                : `${pendientes} mensajes nuevos`}
                            </span>

                          </span>

                        </div>

                      ) : (

                        <div
                          className="
                            mt-0.5
                            text-xs
                            text-slate-400
                          "
                        >
                          Disponible ahora
                        </div>

                      )}

                    </div>


                    {/* CONTADOR */}

                    {pendientes > 0 && (

                      <span
                        className="
                          flex
                          h-7
                          min-w-7
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-red-500
                          px-2
                          text-xs
                          font-bold
                          text-white
                          shadow-sm
                        "
                      >
                        {
                          pendientes > 99
                            ? "99+"
                            : pendientes
                        }
                      </span>

                    )}


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

                );

              }
            )}

          </div>

        </section>


        {/* =================================================
            CHAT
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

            lg:col-span-2

            animate-slideUp

            lg:flex
            lg:h-full
            lg:min-h-0
            lg:flex-col
          "
        >

          {!otroId ? (

            <div
              className="
                flex
                flex-1
                min-h-0
                items-center
                justify-center
                p-8
              "
            >

              <div
                className="
                  max-w-md
                  text-center
                "
              >

                <div
                  className="
                    mx-auto
                    mb-6
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
                    mt-2
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

          ) : (

            <div
              className="
                flex
                h-full
                min-h-0
                flex-1
                flex-col
                p-4
                sm:p-5
              "
            >

              {/* HEADER */}

              <MensajesHeader
                otroId={
                  otroId
                }
                conectados={
                  conectados
                }
              />


              {/* MENSAJES */}

              <div
                ref={
                  chatRef
                }
                className="
                  min-h-0
                  flex-1

                  overflow-y-auto

                  rounded-2xl

                  border
                  border-slate-200/70

                  bg-slate-50/50

                  px-3
                  py-4

                  sm:px-5
                "
              >

                {Object.keys(
                  mensajesAgrupados
                ).length === 0 ? (

                  <div
                    className="
                      flex
                      h-full
                      min-h-0
                      items-center
                      justify-center
                      text-center
                    "
                  >

                    <div>

                      <div
                        className="
                          mx-auto
                          mb-4
                          flex
                          h-14
                          w-14
                          items-center
                          justify-center
                          rounded-2xl
                          bg-white
                          text-2xl
                          shadow-sm
                        "
                      >
                        💬
                      </div>

                      <p
                        className="
                          text-sm
                          font-medium
                          text-slate-500
                        "
                      >
                        No hay mensajes todavía
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-slate-400
                        "
                      >
                        Envía el primer mensaje.
                      </p>

                    </div>

                  </div>

                ) : (

                  Object.entries(
                    mensajesAgrupados
                  ).map(
                    ([
                      fecha,
                      lista,
                    ]) => (

                      <div
                        key={
                          fecha
                        }
                      >

                        {/* FECHA */}

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
                              text-[10px]
                              font-semibold
                              uppercase
                              tracking-wide
                              text-slate-400
                              shadow-sm
                            "
                          >
                            {fecha}
                          </span>

                        </div>


                        {/* MENSAJES */}

                        {lista.map(
                          (mensaje) => (

                            <MensajeBubble
                              key={
                                mensaje.id
                              }
                              mensaje={
                                mensaje
                              }
                              usuarioId={
                                usuarioId
                              }
                              avatarUrl={
                                Number(
                                  mensaje.remitente_id
                                ) ===
                                Number(
                                  otroId
                                )
                                  ? fotoUrl(
                                      empleadoSeleccionado?.foto
                                    )
                                  : "/no-foto.png"
                              }
                              online={
                                Number(
                                  mensaje.remitente_id
                                ) ===
                                Number(
                                  otroId
                                )
                              }
                            />

                          )
                        )}

                      </div>

                    )
                  )

                )}

              </div>


              {/* TYPING */}

              {otroId &&
                typing[
                  otroId
                ] && (

                  <div
                    className="
                      shrink-0
                      px-2
                      py-2
                      text-xs
                      italic
                      text-slate-400
                    "
                  >
                    {
                      empleadoSeleccionado?.nombre ||
                      "El usuario"
                    } está escribiendo...
                  </div>

                )}


              {/* COMPOSER */}

              <div
                className="
                  mt-3
                  shrink-0

                  rounded-2xl

                  border
                  border-slate-200/80

                  bg-white/85

                  p-3

                  shadow-sm
                "
              >

                <div
                  className="
                    flex
                    items-end
                    gap-2
                  "
                >

                  {/* ARCHIVO */}

                  <label
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      cursor-pointer
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      text-lg
                      text-slate-500
                      transition
                      hover:border-blue-200
                      hover:bg-blue-50
                    "
                    title="Adjuntar archivo"
                  >

                    📎

                    <input
                      type="file"
                      className="hidden"
                      accept="
                        .pdf,
                        .doc,
                        .docx,
                        .jpg,
                        .jpeg,
                        .png
                      "
                      disabled={
                        subiendoArchivo
                      }
                      onChange={
                        handleAdjunto
                      }
                    />

                  </label>


                  {/* TEXTO */}

                  <textarea
                    value={
                      texto
                    }
                    onChange={(
                      event
                    ) => {

                      setTexto(
                        event.target.value
                      );

                      enviarTyping();

                    }}
                    onKeyDown={
                      manejarTecla
                    }
                    rows={1}
                    placeholder={
                      subiendoArchivo
                        ? "Subiendo archivo..."
                        : "Escribe un mensaje..."
                    }
                    disabled={
                      subiendoArchivo
                    }
                    className="
                      max-h-32
                      min-h-11

                      flex-1

                      resize-none

                      rounded-xl

                      border
                      border-slate-200

                      bg-slate-50/70

                      px-4
                      py-3

                      text-sm
                      text-slate-700

                      outline-none

                      transition

                      placeholder:text-slate-400

                      focus:border-blue-300
                      focus:bg-white
                      focus:ring-2
                      focus:ring-blue-100
                    "
                  />


                  {/* ENVIAR */}

                  <button
                    type="button"
                    onClick={
                      enviarMensaje
                    }
                    disabled={
                      !texto.trim() ||
                      subiendoArchivo
                    }
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-600
                      text-lg
                      text-white
                      shadow-sm
                      transition
                      hover:bg-blue-700
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                    title="Enviar mensaje"
                  >
                    ➤
                  </button>

                </div>


                <div
                  className="
                    mt-2
                    px-1
                    text-[10px]
                    text-slate-400
                  "
                >
                  Enter para enviar · Shift+Enter
                  para salto de línea
                </div>

              </div>

            </div>

          )}

        </section>

      </div>

    </div>
  );
}
