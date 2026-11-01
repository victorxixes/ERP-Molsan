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
 *
 * - Avisos realtime
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
      className="notificaciones-toast 
 pointer-events-none
 fixed
 bottom-5
 right-5
 z-[9999]

 flex
 w-[min(340px,calc(100vw-2rem))]
 flex-col
 gap-2"
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
        className="h-0
 overflow-hidden"
      />
    );

  }


  return (
    <div
      className="pointer-events-auto
 relative
 overflow-hidden

 w-full

 

 
 

 

 

 px-3
 py-3"
    >

      {/* ==================================================
          LÍNEA LATERAL
      ================================================== */}

      <div
        className={`absolute
 left-0
 top-0
 bottom-0
 w-[3px]
 `}
      />


      {/* ==================================================
          CONTENIDO
      ================================================== */}

      <div
        className="flex
 items-center
 gap-3"
      >

        {/* =================================================
            ICONO
        ================================================= */}

        <div
          className="flex
 h-9
 w-9
 shrink-0
 items-center
 justify-center"
        >
          {
            configuracion.icono
          }
        </div>


        {/* =================================================
            TEXTO
        ================================================= */}

        <div
          className="min-w-0
 flex-1"
        >

          <div
            className="flex
 items-center
 justify-between
 gap-3"
          >

            <div
              className="truncate"
            >
              {
                configuracion.titulo
              }
            </div>


            <div
              className="shrink-0"
            >
              Ahora
            </div>

          </div>


          {/* PREVIEW */}

          {(n.preview ||
            n.archivo_url) && (

            <div
              className="mt-0.5
 truncate"
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
        className="pointer-events-none
 absolute
 left-0
 right-0
 top-0
 h-px"
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

      };


    case "nuevo_archivo":

      return {
        icono: "📎",
        titulo: "Nuevo archivo",

      };


    case "online":

      return {
        icono: "🟢",
        titulo: "Usuario conectado",

      };


    case "offline":

      return {
        icono: "⚫",
        titulo: "Usuario desconectado",

      };


    case "error":

      return {
        icono: "⛔",
        titulo: "Error",

      };


    case "warning":

      return {
        icono: "⚠️",
        titulo: "Advertencia",

      };


    default:

      return {
        icono: "🔔",
        titulo: "Nueva notificación",

      };

  }
}
