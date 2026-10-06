import {
  useEffect,
  useState,
} from "react";

import {
  useNotificacionesStore,
} from "../../store/notificacionesStore";


/**
 * ============================================================
 * NOTIFICACIONES TOAST
 * MOLSAN ERP — GLASS LUXE
 *
 * - Avisos realtime
 * - Diseño translúcido
 * - Backdrop blur
 * - Tamaño compacto
 * - Desaparición automática en 2 segundos
 * - No elimina la notificación del store
 * ============================================================
 */

export default function NotificacionesToast() {

  const notificaciones =
    useNotificacionesStore(
      (s) => s.notificaciones
    );


  /**
   * ==========================================================
   * SONIDO
   * ==========================================================
   */

  useEffect(() => {

    if (
      notificaciones.length === 0
    ) {
      return;
    }


    const audio =
      new Audio(
        "/sonido-notificacion.mp3"
      );


    audio.volume = 0.4;


    audio
      .play()
      .catch(() => {});


  }, [
    notificaciones,
  ]);


  return (
    <div
      className="
        pointer-events-none
        fixed
        bottom-5
        right-5
        z-[9999]

        flex
        w-[min(340px,calc(100vw-2rem))]
        flex-col
        gap-2
      "
    >

      {notificaciones
        .slice(0, 3)
        .map(
          (n) => (
            <Toast
              key={n.id}
              notificacion={n}
            />
          )
        )}

    </div>
  );
}


/**
 * ============================================================
 * TOAST INDIVIDUAL
 * ============================================================
 */

function Toast({
  notificacion: n,
}) {

  const configuracion =
    obtenerConfiguracion(
      n.tipo
    );


  const [
    visible,
    setVisible,
  ] = useState(true);


  /**
   * ==========================================================
   * VIDA DEL TOAST
   *
   * 1,5 segundos visible
   * 0,5 segundos de desvanecimiento
   * = 2 segundos totales
   * ==========================================================
   */

  useEffect(() => {

    const fadeTimer =
      setTimeout(
        () => {
          setVisible(false);
        },
        1500
      );


    const removeTimer =
      setTimeout(
        () => {
          setVisible(false);
        },
        2000
      );


    return () => {

      clearTimeout(
        fadeTimer
      );

      clearTimeout(
        removeTimer
      );

    };

  }, []);


  if (!visible) {

    return (
      <div
        className="
          h-0
          overflow-hidden
          opacity-0
        "
      />
    );

  }


  return (
    <div
      className="
        pointer-events-auto
        relative
        overflow-hidden

        w-full

        rounded-2xl

        border
        border-white/10

        bg-slate-900/50

        backdrop-blur-xl

        px-3
        py-3

        text-white

        shadow-[0_18px_45px_rgba(15,23,42,0.18)]

        transition-all
        duration-500
        ease-out

        animate-fade-in
      "
    >

      {/* ==================================================
          LÍNEA LATERAL
      ================================================== */}

      <div
        className={`
          absolute
          left-0
          top-0
          bottom-0
          w-[3px]
          ${configuracion.color}
        `}
      />


      {/* ==================================================
          CONTENIDO
      ================================================== */}

      <div
        className="
          flex
          items-center
          gap-3
        "
      >

        {/* =================================================
            ICONO
        ================================================= */}

        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center

            rounded-xl

            border
            border-white/10

            bg-white/10

            text-base

            shadow-sm
          "
        >
          {
            configuracion.icono
          }
        </div>


        {/* =================================================
            TEXTO
        ================================================= */}

        <div
          className="
            min-w-0
            flex-1
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

            <div
              className="
                truncate
                text-sm
                font-semibold
                text-white/95
              "
            >
              {
                configuracion.titulo
              }
            </div>


            <div
              className="
                shrink-0
                text-[10px]
                font-medium
                text-white/35
              "
            >
              Ahora
            </div>

          </div>


          {/* PREVIEW */}

          {(n.preview ||
            n.archivo_url) && (

            <div
              className="
                mt-0.5
                truncate
                text-xs
                text-white/55
              "
            >
              {
                n.preview ||
                n.archivo_url ||
                ""
              }
            </div>

          )}

        </div>

      </div>


      {/* ==================================================
          BRILLO SUPERIOR
      ================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          left-0
          right-0
          top-0
          h-px

          bg-gradient-to-r
          from-transparent
          via-white/20
          to-transparent
        "
      />

    </div>
  );
}


/**
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

function obtenerConfiguracion(
  tipo
) {

  switch (tipo) {

    case "nuevo_mensaje":

      return {
        icono: "💬",
        titulo: "Nuevo mensaje",
        color: "bg-blue-400",
      };


    case "nuevo_archivo":

      return {
        icono: "📎",
        titulo: "Nuevo archivo",
        color: "bg-purple-400",
      };


    case "online":

      return {
        icono: "🟢",
        titulo: "Usuario conectado",
        color: "bg-emerald-400",
      };


    case "offline":

      return {
        icono: "⚫",
        titulo: "Usuario desconectado",
        color: "bg-slate-400",
      };


    case "error":

      return {
        icono: "⛔",
        titulo: "Error",
        color: "bg-red-400",
      };


    case "warning":

      return {
        icono: "⚠️",
        titulo: "Advertencia",
        color: "bg-yellow-400",
      };


    default:

      return {
        icono: "🔔",
        titulo: "Nueva notificación",
        color: "bg-blue-400",
      };

  }
}
