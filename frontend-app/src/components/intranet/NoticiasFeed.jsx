import { useCallback } from "react";
import { useIntranet } from "../../hooks/useIntranet";

/**
 * NOTICIAS FEED
 *
 * Diseño:
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
    <div className="space-y-4">

      {noticias.length === 0 ? (

        /* =====================================================
           SIN NOTICIAS
        ===================================================== */

        <div
          className="px-6
 py-12"
        >

          <div
            className="mx-auto
 flex
 h-12
 w-12

 items-center
 justify-center"
          >
            📰
          </div>

          <p
            className="mt-4"
          >
            No hay noticias publicadas.
          </p>

          <p
            className="mt-1"
          >
            Las comunicaciones internas aparecerán aquí.
          </p>

        </div>

      ) : (

        noticias.map((n) => (

          <article
            key={n.id}
            className="group

 relative
 overflow-hidden

 

 
 

 

 

 p-5"
            
          >

            {/* =================================================
                LÍNEA SUPERIOR
            ================================================= */}

            <div
              className="absolute
 left-0
 right-0
 top-0

 h-px"
            />


            {/* =================================================
                CABECERA
            ================================================= */}

            <div
              className="flex
 flex-col
 gap-3

 sm:flex-row
 sm:items-start
 sm:justify-between"
            >

              <div className="min-w-0">

                <div
                  className="flex
 items-center
 gap-2"
                >

                  <span
                    className="flex
 h-8
 w-8
 shrink-0

 items-center
 justify-center"
                  >
                    📰
                  </span>

                  <h3
                    className="truncate"
                  >
                    {n.titulo || "Sin título"}
                  </h3>

                </div>

              </div>


              {/* FECHA */}

              {n.fecha_publicacion && (

                <span
                  className="shrink-0

 

 
 

 

 px-2.5
 py-1"
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
              className="mt-4

 

 
 

 

 px-4
 py-3"
            >

              <p
               
              >
                {n.descripcion ||
                  "Sin descripción disponible."}
              </p>

            </div>


            {/* =================================================
                PIE
            ================================================= */}

            <div
              className="mt-4

 flex
 items-center
 justify-end"
            >

              <button
                type="button"
                onClick={() =>
                  handleEliminar(n.id)
                }
                className="inline-flex
 items-center
 justify-center

 

 
 

 

 px-3
 py-1.5"
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
