import { useMemo } from "react";
/**
 * MENSAJES HEADER — MOLSAN ERP SAAS PREMIUM 2027
 *
 * Cabecera de conversación:
 * - Avatar
 * - Estado online
 * - Nombre completo
 * - Glass Luxe claro
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
      className="mensajes-header-premium mb-4
        flex
        items-center
        justify-between
        gap-3
        rounded-2xl
        border
        border-[var(--molsan-border)]
        bg-white
        px-4
        py-3
        shadow-[var(--molsan-shadow-card)]
        
      "
    >
      {/* =====================================================
          USUARIO
      ===================================================== */}

      <div
        className="
          flex
          min-w-0
          items-center
          gap-3
        "
      >
        {/* Avatar */}

        <div
          className="
            relative
            h-12
            w-12
            shrink-0
          "
        >
          <img
            src={fotoUrl}
            alt=""
            className="
              h-12
              w-12
              rounded-full
              border
              border-[var(--molsan-border)]
              object-cover
              shadow-[var(--molsan-shadow-card)]
            "
          />

          {usuario && (
            <span
              className="
                absolute
                bottom-0
                right-0
                h-3.5
                w-3.5
                rounded-full
                border-2
                border-white
                bg-emerald-500
                animate-pulse
              "
            />
          )}
        </div>

        {/* Nombre */}

        <div className="min-w-0">
          <div
            className="
              truncate
              text-base
              font-bold
              tracking-tight
              text-[var(--molsan-primary)]
            "
          >
            {usuario?.nombre}{" "}
            {usuario?.apellidos}
          </div>

          <div
            className="
              mt-0.5
              flex
              items-center
              gap-1.5
              text-xs
            "
          >
            <span
              className={`
                h-1.5
                w-1.5
                rounded-full
                ${
                  usuario
                    ? "bg-emerald-500"
                    : "bg-[var(--molsan-border-strong)]"
                }
              `}
            />

            <span
              className={
                usuario
                  ? "text-emerald-600"
                  : "text-[var(--molsan-text-secondary)]"
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
        className="
          hidden
          sm:flex
          items-center
          rounded-full
          border
          border-[var(--molsan-border)]
          bg-[var(--molsan-primary-soft)]
          px-3
          py-1.5
          text-[11px]
          font-medium
          text-[var(--molsan-primary)]
        "
      >
        Mensajería interna
      </div>
    </div>
  );
}
