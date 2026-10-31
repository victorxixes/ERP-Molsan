import { useCallback } from "react";
import { useIntranet } from "../../hooks/useIntranet";

/**
 * DOCUMENTOS TABLE — MOLSAN ERP SAAS PREMIUM 2027
 *
 * Diseño:
 * - Glass Luxe claro
 * - Coherente con el resto del ERP
 * - Responsive
 * - Hover premium
 * - Animaciones suaves
 *
 * Lógica:
 * - Mantiene useIntranet()
 * - Mantiene eliminarDocumento()
 */

export default function DocumentosTable() {
  const {
    documentos,
    eliminarDocumento,
  } = useIntranet();

  const handleEliminar = useCallback(
    (id) => {
      eliminarDocumento(id);
    },
    [eliminarDocumento]
  );

  return (
    <div
      className="
        w-full
        overflow-hidden

        rounded-2xl

        border
        border-slate-200/80

        bg-white/75

        backdrop-blur-xl

        shadow-[0_15px_45px_rgba(15,23,42,0.08)]
      "
    >

      {/* =====================================================
          CABECERA TABLA
      ===================================================== */}

      <div
        className="
          border-b
          border-slate-200/80

          bg-slate-50/80

          px-5
          py-4
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >

          <div>

            <h3
              className="
                text-base
                font-semibold
                tracking-tight
                text-slate-800
              "
            >
              Documentos internos
            </h3>

            <p
              className="
                mt-0.5
                text-xs
                text-slate-400
              "
            >
              Documentación disponible en la intranet
            </p>

          </div>

          <div
            className="
              flex
              h-9
              min-w-9
              items-center
              justify-center

              rounded-xl

              border
              border-blue-100

              bg-blue-50

              px-2.5

              text-xs
              font-semibold
              text-blue-600
            "
          >
            {documentos.length}
          </div>

        </div>

      </div>


      {/* =====================================================
          TABLA
      ===================================================== */}

      <div className="w-full overflow-x-auto">

        <table
          className="
            w-full
            min-w-[760px]
            text-sm
            text-slate-700
          "
        >

          <thead>

            <tr
              className="
                border-b
                border-slate-200/80

                bg-white/60
              "
            >

              <th
                className="
                  px-5
                  py-3.5

                  text-left

                  text-[11px]
                  font-semibold

                  uppercase
                  tracking-[0.08em]

                  text-slate-400
                "
              >
                ID
              </th>

              <th
                className="
                  px-5
                  py-3.5

                  text-left

                  text-[11px]
                  font-semibold

                  uppercase
                  tracking-[0.08em]

                  text-slate-400
                "
              >
                Título
              </th>

              <th
                className="
                  px-5
                  py-3.5

                  text-left

                  text-[11px]
                  font-semibold

                  uppercase
                  tracking-[0.08em]

                  text-slate-400
                "
              >
                Concepto
              </th>

              <th
                className="
                  px-5
                  py-3.5

                  text-left

                  text-[11px]
                  font-semibold

                  uppercase
                  tracking-[0.08em]

                  text-slate-400
                "
              >
                Fecha
              </th>

              <th
                className="
                  px-5
                  py-3.5

                  text-right

                  text-[11px]
                  font-semibold

                  uppercase
                  tracking-[0.08em]

                  text-slate-400
                "
              >
                Acciones
              </th>

            </tr>

          </thead>


          {/* =================================================
              CUERPO
          ================================================= */}

          <tbody>

            {documentos.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="
                    px-5
                    py-12

                    text-center
                  "
                >

                  <div
                    className="
                      mx-auto
                      flex
                      max-w-sm
                      flex-col
                      items-center
                    "
                  >

                    <div
                      className="
                        mb-3

                        flex
                        h-12
                        w-12

                        items-center
                        justify-center

                        rounded-2xl

                        border
                        border-slate-200

                        bg-slate-50

                        text-xl
                      "
                    >
                      📄
                    </div>

                    <p
                      className="
                        text-sm
                        font-medium
                        text-slate-600
                      "
                    >
                      No hay documentos disponibles.
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-400
                      "
                    >
                      Los documentos internos aparecerán aquí.
                    </p>

                  </div>

                </td>

              </tr>

            ) : (

              documentos.map((d) => (

                <tr
                  key={d.id}
                  className="
                    border-b
                    border-slate-100

                    transition-all
                    duration-200

                    hover:bg-blue-50/40

                    last:border-b-0

                    animate-[fadeIn_0.25s_ease]
                  "
                  style={{
                    animationFillMode: "both",
                  }}
                >

                  {/* ID */}

                  <td
                    className="
                      px-5
                      py-4

                      whitespace-nowrap

                      text-xs
                      font-medium

                      text-slate-400
                    "
                  >
                    #{d.id}
                  </td>


                  {/* TÍTULO */}

                  <td
                    className="
                      px-5
                      py-4
                    "
                  >

                    <div
                      className="
                        font-semibold
                        text-slate-800
                      "
                    >
                      {d.titulo || "Sin título"}
                    </div>

                  </td>


                  {/* CONCEPTO */}

                  <td
                    className="
                      px-5
                      py-4

                      max-w-xs
                    "
                  >

                    <span
                      className="
                        text-sm
                        text-slate-500
                      "
                    >
                      {d.concepto || "—"}
                    </span>

                  </td>


                  {/* FECHA */}

                  <td
                    className="
                      px-5
                      py-4

                      whitespace-nowrap
                    "
                  >

                    <span
                      className="
                        inline-flex
                        items-center

                        rounded-lg

                        border
                        border-slate-200

                        bg-slate-50

                        px-2.5
                        py-1

                        text-xs

                        text-slate-500
                      "
                    >
                      {d.fecha_publicacion
                        ? new Date(
                            d.fecha_publicacion
                          ).toLocaleString("es-ES")
                        : "—"}
                    </span>

                  </td>


                  {/* ACCIONES */}

                  <td
                    className="
                      px-5
                      py-4

                      text-right
                    "
                  >

                    <button
                      type="button"
                      onClick={() =>
                        handleEliminar(d.id)
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

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}
