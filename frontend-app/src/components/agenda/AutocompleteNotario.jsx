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
          className="px-0.5"
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

function coordenadaValida(valor, minimo, maximo) {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo
    ? numero
    : null;
}

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
    !Number.isFinite(lon2) ||
    lat1 < -90 || lat1 > 90 ||
    lat2 < -90 || lat2 > 90 ||
    lon1 < -180 || lon1 > 180 ||
    lon2 < -180 || lon2 > 180
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

const MOLSAN_LAT = 41.436194;
const MOLSAN_LNG = 2.179865;


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

  const [searchError, setSearchError] =
    useState("");

  const containerRef =
    useRef(null);


  // ==========================================================
  // TEXTO ACTUAL
  // ==========================================================

  const currentLabel = useMemo(() => {

    // Mientras se escribe, priorizamos el texto introducido.
    // Si el campo está vacío, mostramos el notario seleccionado.
    if (query.trim()) return query;

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

    return "";

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
      setSearchError("");

      return;
    }

    setLoading(true);
    setSearchError("");

    const timer =
      setTimeout(() => {

        listarNotarias({
          q: texto,
          page: 1,
          page_size: 50,
        })

          .then((res) => {

            // El endpoint CTN puede responder como array directo o como
            // objeto paginado, según la versión del backend.
            const payload = res?.data ?? res;
            const lista = Array.isArray(payload)
              ? payload
              : Array.isArray(payload?.items)
                ? payload.items
                : Array.isArray(payload?.resultados)
                  ? payload.resultados
                  : Array.isArray(payload?.notarias)
                    ? payload.notarias
                    : [];

            setNotarios(lista);
            setSearchError("");
            setOpen(true);

          })

          .catch((err) => {

            console.error("ERROR BUSCANDO NOTARIOS:", "Error interno");

            setNotarios([]);
            const status = err?.response?.status;
            const detalle = err?.response?.data?.detail;
            setSearchError(
              (typeof detalle === "string" && detalle) ||
              (status ? `Error HTTP ${status} al buscar notarías.` : "No se ha podido conectar con el catálogo de notarías.")
            );
            setOpen(true);

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

        const lat = coordenadaValida(n.lat, -90, 90);
        const lng = coordenadaValida(n.lng, -180, 180);

        const distancia_km =
          lat === null || lng === null
            ? null
            : distanciaKm(
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

          lat,

          lng,

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


        // El valor seleccionado se muestra desde la prop "value".
        // Limpiar query evita relanzar la búsqueda y reabrir el desplegable.
        setQuery("");

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
        className={`flex
 items-center
 gap-2
 min-h-[42px]
 
 
 
 px-3 py-2
 
 

 ${
 disabled
 ? ""
 : ""
 }`}
      >

        {/* AVATAR */}

        <span
          className="inline-flex
 items-center
 justify-center
 w-7
 h-7
 
 
 
 
 
 
 shrink-0"
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
          className="w-full
 
 
 placeholder-slate-400"
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
            className="h-4 w-4
 
 
 
 
 shrink-0"
          />

        )}

      </div>


      {/* ====================================================
          DROPDOWN
         ==================================================== */}

      {open && !disabled && (

        <div
          className="absolute
 left-0
 right-0
 mt-2
 
 
 
 
 
 overflow-hidden
 z-[110]
 max-h-80
 overflow-y-auto"
        >

          {notarios.length === 0 &&
          !loading ? (

            <div
              className="px-4 py-4"
            >
              {searchError || (query.trim().length < 2
                ? "Escribe al menos dos caracteres para buscar."
                : "No hay resultados para esta búsqueda.")}
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

              const lat = coordenadaValida(n.lat, -90, 90);
              const lng = coordenadaValida(n.lng, -180, 180);
              const km =
                lat === null || lng === null
                  ? null
                  : distanciaKm(
                      MOLSAN_LAT,
                      MOLSAN_LNG,
                      lat,
                      lng
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
                  className="w-full
 
 px-4 py-3
 
 
 
 
 
 
 
 flex
 gap-3"
                >

                  {/* AVATAR / KM */}

                  <div
                    className="flex
 flex-col
 items-center
 justify-start
 shrink-0"
                  >

                    <div
                      className="w-9 h-9
 
 
 
 
 
 flex
 items-center
 justify-center"
                    >
                      {iniciales}
                    </div>


                    {km !== null && (

                      <div
                        className="mt-1
 
 
 
 whitespace-nowrap"
                      >
                        🚗{" "}
                        {km.toFixed(1)} km
                      </div>

                    )}

                  </div>


                  {/* DATOS */}

                  <div
                    className="flex-1
 min-w-0"
                  >

                    <div
                      className="truncate"
                    >
                      {highlight(
                        nombreCompleto,
                        query
                      )}
                    </div>


                    <div
                      className="truncate
 mt-0.5"
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
                        className="truncate
 mt-0.5"
                      >
                        {highlight(
                          direccionCompleta,
                          query
                        )}
                      </div>

                    )}


                    {apoderadoLabel && (

                      <div
                        className="truncate
 mt-0.5"
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
                    className="flex
 flex-col
 items-end
 justify-start
 gap-1
 shrink-0"
                  >

                    <span
                      className={`inline-flex
 items-center
 px-2
 py-0.5
 
 
 

 ${
 esVC
 ? ""
 : ""
 }`}
                    >
                      {vcLabel}
                    </span>


                    {n.codigo && (

                      <span
                       
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
