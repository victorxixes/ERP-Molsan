import { useCallback } from "react";
import MolsanIcon from "../ui/MolsanIcon";
import { useIntranet } from "../../hooks/useIntranet";

import "../../css/LayoutPortalesPremium.css";
/**
 * NOTICIAS FEED — MOLSAN ERP SAAS PREMIUM 2027
 *
 * Diseño:
 * - Glass Luxe claro
 * - Tarjetas premium
 * - Azul corporativo
 * - Responsive
 * - Animaciones suaves
 *
 * Lógica:
 * - Mantiene useIntranet()
 * - Mantiene eliminarNoticia()
 */

export default function NoticiasFeed() {
  const {
    noticias,
    eliminarNoticia,
  } = useIntranet();

  const handleEliminar = useCallback(
    (id) => {
      eliminarNoticia(id);
    },
    [eliminarNoticia]
  );

  return (
    <div className="intranet-noticias-feed-premium space-y-4">

      {noticias.length === 0 ? (

        /* =====================================================
           SIN NOTICIAS
        ===================================================== */

        <div
          className="
            rounded-2xl

            border
            border-slate-200/80

            bg-white/75

            backdrop-blur-xl

            px-6
            py-12

            text-center

            shadow-[0_15px_45px_rgba(15,23,42,0.06)]
          "
        >

          <div
            className="
              mx-auto
              flex
              h-12
              w-12

              items-center
              justify-center

              rounded-2xl

              border
              border-blue-100

              bg-blue-50

              text-xl
            "
          >
            <MolsanIcon name="newspaper" size={32} />
          </div>

          <p
            className="
              mt-4

              text-sm
              font-medium

              text-slate-600
            "
          >
            No hay noticias publicadas.
          </p>

          <p
            className="
              mt-1

              text-xs

              text-slate-400
            "
          >
            Las comunicaciones internas aparecerán aquí.
          </p>

        </div>

      ) : (

        noticias.map((n) => (

          <article
            key={n.id}
            className="
              group

              relative
              overflow-hidden

              rounded-2xl

              border
              border-slate-200/80

              bg-white/75

              backdrop-blur-xl

              p-5

              shadow-[0_15px_45px_rgba(15,23,42,0.07)]

              transition-all
              duration-300

              hover:-translate-y-0.5

              hover:border-blue-200

              hover:shadow-[0_20px_55px_rgba(37,99,235,0.10)]

              animate-[fadeIn_0.3s_ease,slideUp_0.3s_ease]
            "
            style={{
              animationFillMode: "both",
            }}
          >

            {/* =================================================
                LÍNEA SUPERIOR
            ================================================= */}

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

                opacity-60
              "
            />


            {/* =================================================
                CABECERA
            ================================================= */}

            <div
              className="
                flex
                flex-col
                gap-3

                sm:flex-row
                sm:items-start
                sm:justify-between
              "
            >

              <div className="min-w-0">

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >

                  <span
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0

                      items-center
                      justify-center

                      rounded-xl

                      border
                      border-blue-100

                      bg-blue-50

                      text-sm
                    "
                  >
                    <MolsanIcon name="newspaper" size={32} />
                  </span>

                  <h3
                    className="
                      truncate

                      text-base
                      font-semibold

                      tracking-tight

                      text-slate-800
                    "
                  >
                    {n.titulo || "Sin título"}
                  </h3>

                </div>

              </div>


              {/* FECHA */}

              {n.fecha_publicacion && (

                <span
                  className="
                    shrink-0

                    rounded-lg

                    border
                    border-slate-200

                    bg-slate-50

                    px-2.5
                    py-1

                    text-[11px]

                    font-medium

                    text-slate-400
                  "
                >
                  {new Date(
                    n.fecha_publicacion
                  ).toLocaleString("es-ES")}
                </span>

              )}

            </div>


            {/* =================================================
                DESCRIPCIÓN
            ================================================= */}

            <div
              className="
                mt-4

                rounded-xl

                border
                border-slate-100

                bg-slate-50/70

                px-4
                py-3
              "
            >

              <p
                className="
                  text-sm

                  leading-6

                  text-slate-600
                "
              >
                {n.descripcion ||
                  "Sin descripción disponible."}
              </p>

            </div>


            {/* =================================================
                PIE
            ================================================= */}

            <div
              className="
                mt-4

                flex
                items-center
                justify-end
              "
            >

              <button
                type="button"
                onClick={() =>
                  handleEliminar(n.id)
                }
                className="
                  inline-flex
                  items-center
                  justify-center

                  rounded-xl

                  border
                  border-red-200

                  bg-red-50

                  px-3
                  py-1.5

                  text-xs
                  font-medium

                  text-red-600

                  shadow-sm

                  transition-all
                  duration-200

                  hover:border-red-300
                  hover:bg-red-100
                  hover:text-red-700

                  active:scale-[0.97]
                "
              >
                Eliminar
              </button>

            </div>

          </article>

        ))

      )}

    </div>
  );
}
