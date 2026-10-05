import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";

import { listarNotarias } from "../../api/ctn";


// ============================================================
// HIGHLIGHT
// ============================================================

function highlight(text, query) {
  if (!text || !query) return text;

  const q = query.trim();

  if (!q) return text;

  const escaped = q.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `(${escaped})`,
    "gi"
  );

  return text.split(regex).map(
    (part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="
            bg-yellow-200
            text-yellow-900
            font-semibold
            px-0.5
            rounded
          "
        >
          {part}
        </span>
      ) : (
        <span key={i}>
          {part}
        </span>
      )
  );
}


// ============================================================
// DISTANCIA KM
// ============================================================

function distanciaKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}


// ============================================================
// COORDENADAS MOLSAN
// ============================================================

const MOLSAN_LAT = 41.424960;
const MOLSAN_LNG = 2.181740;


// ============================================================
// COMPONENTE
// ============================================================

export default function AutocompleteNotario({
  value,
  onSelect,
  disabled = false,
}) {
  const [notarios, setNotarios] = useState([]);

  const [query, setQuery] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const containerRef =
    useRef(null);


  // ==========================================================
  // TEXTO ACTUAL
  // ==========================================================

  const currentLabel = useMemo(() => {

    if (
      value &&
      (
        value.nombre ||
        value.apellidos
      )
    ) {

      return (
        `${value.nombre || ""} ${
          value.apellidos || ""
        }`.trim()
      );
    }

    return query;

  }, [value, query]);


  // ==========================================================
  // CLICK FUERA
  // ==========================================================

  useEffect(() => {

    const handleClickOutside =
      (event) => {

        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target
          )
        ) {
          setOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  // ==========================================================
  // ESC
  // ==========================================================

  useEffect(() => {

    const handleEscape =
      (event) => {

        if (
          event.key === "Escape"
        ) {
          setOpen(false);
        }

      };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {

      document.removeEventListener(
        "keydown",
        handleEscape
      );

    };

  }, []);


  // ==========================================================
  // CERRAR AL DESHABILITAR
  // ==========================================================

  useEffect(() => {

    if (disabled) {
      setOpen(false);
    }

  }, [disabled]);


  // ==========================================================
  // BÚSQUEDA CON DEBOUNCE
  // ==========================================================

  useEffect(() => {

    const texto =
      query.trim();

    if (
      disabled ||
      texto.length < 2
    ) {

      setNotarios([]);
      setLoading(false);

      return;
    }

    setLoading(true);

    const timer =
      setTimeout(() => {

        listarNotarias({
          q: texto,
          page: 1,
          page_size: 50,
        })

          .then((res) => {

            const lista =
              Array.isArray(
                res?.data?.items
              )
                ? res.data.items
                : [];

            setNotarios(lista);
            setOpen(true);

          })

          .catch((err) => {

            console.error(
              "ERROR BUSCANDO NOTARIOS:",
              err
            );

            setNotarios([]);

          })

          .finally(() => {

            setLoading(false);

          });

      }, 250);

    return () => {

      clearTimeout(timer);

    };

  }, [query, disabled]);


  // ==========================================================
  // SELECCIONAR
  // ==========================================================

  const seleccionar =
    useCallback(
      (n) => {

        if (
          disabled ||
          !n
        ) {
          return;
        }

        const lat =
          Number(n.lat);

        const lng =
          Number(n.lng);

        const distancia_km =
          distanciaKm(
            MOLSAN_LAT,
            MOLSAN_LNG,
            lat,
            lng
          );


        // ====================================================
        // NORMALIZAR VC
        // ====================================================

        const vcVal =
          String(n.vc || "")
            .trim()
            .toUpperCase();

        const tipoFirma =
          (
            vcVal === "SI" ||
            vcVal === "VC" ||
            vcVal ===
              "VIDEOCONFERENCIA"
          )
            ? "Videoconferencia"
            : "Presencial";


        // ====================================================
        // NOTARIO COMPLETO
        // ====================================================

        const notarioCompleto = {

          id: n.id,

          codigo:
            n.codigo || "",

          nombre:
            n.nombre || "",

          apellidos:
            n.apellidos || "",

          nif:
            n.nif || "",

          telefono:
            n.telefono || "",

          provincia:
            n.provincia || "",

          municipio:
            n.municipio || "",

          cp:
            n.cp || "",

          direccion:
            n.direccion || "",

          vc:
            n.vc || "",

          lat:
            Number.isFinite(lat)
              ? lat
              : null,

          lng:
            Number.isFinite(lng)
              ? lng
              : null,

          apoderado:
            n.apoderado ||
            n.apoderado_s ||
            "",

          observacion:
            n.observacion ||
            "",

          tipo_firma:
            tipoFirma,

          distancia_km:
            distancia_km,

        };


        setQuery(
          `${n.nombre || ""} ${
            n.apellidos || ""
          }`.trim()
        );

        setOpen(false);

        setNotarios([]);

        onSelect(
          notarioCompleto
        );

      },
      [
        disabled,
        onSelect,
      ]
    );


  // ==========================================================
  // INPUT
  // ==========================================================

  const handleInputChange =
    (event) => {

      if (disabled) return;

      const nuevoValor =
        event.target.value;

      setQuery(nuevoValor);

      setOpen(
        nuevoValor
          .trim()
          .length >= 2
      );
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      ref={containerRef}
      className="relative w-full"
    >

      {/* ====================================================
          INPUT
         ==================================================== */}

      <div
        className={`
          flex
          items-center
          gap-2
          min-h-[42px]
          bg-white
          border
          rounded-xl
          px-3 py-2
          shadow-sm
          transition-all

          ${
            disabled
              ? "border-slate-200 bg-slate-100"
              : "border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10"
          }
        `}
      >

        {/* AVATAR */}

        <span
          className="
            inline-flex
            items-center
            justify-center
            w-7
            h-7
            rounded-full
            bg-blue-600
            text-white
            text-xs
            font-bold
            shadow-sm
            shrink-0
          "
        >
          {currentLabel
            ? currentLabel
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map(
                  (p) =>
                    p[0]?.toUpperCase()
                )
                .join("")
            : "NT"}
        </span>


        {/* INPUT */}

        <input
          type="text"
          disabled={disabled}
          className="
            w-full
            bg-transparent
            text-slate-700
            placeholder-slate-400
            focus:outline-none
            disabled:text-slate-400
          "
          placeholder="Buscar notario por nombre, apellidos, municipio o provincia…"
          value={currentLabel}
          onChange={
            handleInputChange
          }
          onFocus={() => {

            if (
              !disabled &&
              query.trim().length >= 2
            ) {

              setOpen(true);

            }

          }}
        />


        {/* LOADING */}

        {loading && (

          <div
            className="
              animate-spin
              h-4 w-4
              border-2
              border-slate-300
              border-t-blue-500
              rounded-full
              shrink-0
            "
          />

        )}

      </div>


      {/* ====================================================
          DROPDOWN
         ==================================================== */}

      {open && !disabled && (

        <div
          className="
            absolute
            left-0
            right-0
            mt-2
            bg-white
            border border-slate-200
            rounded-xl
            shadow-2xl
            shadow-slate-900/10
            overflow-hidden
            z-[110]
            max-h-80
            overflow-y-auto
            animate-fade-in
          "
        >

          {notarios.length === 0 &&
          !loading ? (

            <div
              className="
                px-4 py-4
                text-sm
                text-slate-400
              "
            >
              No hay resultados
            </div>

          ) : (

            notarios.map((n) => {

              const nombreCompleto =
                `${n.nombre || ""} ${
                  n.apellidos || ""
                }`.trim();

              const direccionCompleta =
                n.direccion ||
                `${n.municipio || ""}, ${
                  n.provincia || ""
                }`.trim();

              const vcVal =
                String(n.vc || "")
                  .trim()
                  .toUpperCase();

              const esVC =
                vcVal === "SI" ||
                vcVal === "VC" ||
                vcVal ===
                  "VIDEOCONFERENCIA";

              const vcLabel =
                esVC
                  ? "VC"
                  : "Presencial";

              const apoderadoLabel =
                n.apoderado ||
                n.apoderado_s ||
                "";

              const km =
                distanciaKm(
                  MOLSAN_LAT,
                  MOLSAN_LNG,
                  Number(n.lat),
                  Number(n.lng)
                );

              const iniciales =
                nombreCompleto
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(
                    (p) =>
                      p[0]?.toUpperCase()
                  )
                  .join("") ||
                "NT";


              return (

                <button
                  key={n.id}
                  type="button"
                  onClick={() =>
                    seleccionar(n)
                  }
                  className="
                    w-full
                    text-left
                    px-4 py-3
                    cursor-pointer
                    text-sm
                    hover:bg-slate-50
                    transition
                    border-b
                    border-slate-100
                    last:border-b-0
                    flex
                    gap-3
                  "
                >

                  {/* AVATAR / KM */}

                  <div
                    className="
                      flex
                      flex-col
                      items-center
                      justify-start
                      shrink-0
                    "
                  >

                    <div
                      className="
                        w-9 h-9
                        rounded-full
                        bg-blue-600
                        text-white
                        text-xs
                        font-bold
                        flex
                        items-center
                        justify-center
                        shadow-sm
                      "
                    >
                      {iniciales}
                    </div>


                    {km !== null && (

                      <div
                        className="
                          mt-1
                          text-[10px]
                          text-blue-600
                          font-semibold
                          whitespace-nowrap
                        "
                      >
                        🚗{" "}
                        {km.toFixed(1)} km
                      </div>

                    )}

                  </div>


                  {/* DATOS */}

                  <div
                    className="
                      flex-1
                      min-w-0
                    "
                  >

                    <div
                      className="
                        font-semibold
                        text-slate-800
                        truncate
                      "
                    >
                      {highlight(
                        nombreCompleto,
                        query
                      )}
                    </div>


                    <div
                      className="
                        text-xs
                        text-slate-500
                        truncate
                        mt-0.5
                      "
                    >
                      {highlight(
                        `${n.municipio || ""} — ${
                          n.provincia || ""
                        }`.trim(),
                        query
                      )}
                    </div>


                    {direccionCompleta && (

                      <div
                        className="
                          text-[11px]
                          text-slate-400
                          truncate
                          mt-0.5
                        "
                      >
                        {highlight(
                          direccionCompleta,
                          query
                        )}
                      </div>

                    )}


                    {apoderadoLabel && (

                      <div
                        className="
                          text-[11px]
                          text-emerald-600
                          truncate
                          mt-0.5
                        "
                      >
                        Apoderado:{" "}
                        {highlight(
                          apoderadoLabel,
                          query
                        )}
                      </div>

                    )}

                  </div>


                  {/* ESTADO */}

                  <div
                    className="
                      flex
                      flex-col
                      items-end
                      justify-start
                      gap-1
                      shrink-0
                    "
                  >

                    <span
                      className={`
                        inline-flex
                        items-center
                        px-2
                        py-0.5
                        rounded-full
                        text-[10px]
                        font-semibold

                        ${
                          esVC
                            ? "bg-purple-100 text-purple-700"
                            : "bg-sky-100 text-sky-700"
                        }
                      `}
                    >
                      {vcLabel}
                    </span>


                    {n.codigo && (

                      <span
                        className="
                          text-[10px]
                          text-slate-400
                        "
                      >
                        {n.codigo}
                      </span>

                    )}

                  </div>

                </button>

              );

            })

          )}

        </div>

      )}

    </div>
  );
}
