import { useMemo } from "react";

/**
 * MENSAJES HEADER
 *
 * Cabecera de conversación:
 * - Avatar
 * - Estado online
 * - Nombre completo
 */

export default function MensajesHeader({
  otroId,
  conectados,
}) {
  const usuario = useMemo(
    () =>
      conectados.find(
        (x) => x.id === otroId
      ),
    [conectados, otroId]
  );

  const fotoUrl = usuario?.foto
    ? `${import.meta.env.VITE_API_URL}${usuario.foto}`
    : "/no-foto.png";

  return (
    <div
      className="molsan-chat-header erp-card mb-4
 flex
 items-center
 justify-between
 gap-3
 
 
 
 
 px-4
 py-3"
    >
      {/* =====================================================
          USUARIO
      ===================================================== */}

      <div
        className="flex
 min-w-0
 items-center
 gap-3"
      >
        {/* Avatar */}

        <div
          className="relative
 h-12
 w-12
 shrink-0"
        >
          <img
            src={fotoUrl}
            alt=""
            className="h-12
 w-12
 
 
 
 object-cover"
          />

          {usuario && (
            <span
              className="absolute
 bottom-0
 right-0
 h-3.5
 w-3.5"
            />
          )}
        </div>

        {/* Nombre */}

        <div className="min-w-0">
          <div
            className="molsan-chat-header__name truncate"
          >
            {usuario?.nombre}{" "}
            {usuario?.apellidos}
          </div>

          <div
            className="mt-0.5
 flex
 items-center
 gap-1.5"
          >
            <span
              className={`molsan-chat-header__presence h-1.5
 w-1.5
 
 ${usuario ? "is-online" : "is-offline"}`}
            />

            <span
              className={
                usuario
                  ? ""
                  : ""
              }
            >
              {usuario
                ? "Online"
                : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================
          INDICADOR
      ===================================================== */}

      <div
        className="molsan-chat-header__tag hidden
 sm:flex
 items-center
 
 
 
 
 px-3
 py-1.5"
      >
        Mensajería interna
      </div>
    </div>
  );
}
