import { useEffect, useState, useCallback, useMemo } from "react";
import { useCtn } from "../../hooks/useCtn";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";

// ============================================================
// HELPERS
// ============================================================

function textoVisible(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return String(valor);
}

function obtenerNombreNotario(notario) {
  return [
    notario?.nombre,
    notario?.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function obtenerAsociados(notaria) {
  const asociados =
    notaria?.notarios_asociados ??
    notaria?.notarias_asociadas ??
    notaria?.asociados ??
    [];

  if (Array.isArray(asociados)) {
    return asociados
      .map((asociado) => {
        if (typeof asociado === "string") {
          return asociado;
        }

        return (
          obtenerNombreNotario(asociado) ||
          asociado?.nif ||
          asociado?.codigo ||
          ""
        );
      })
      .filter(Boolean);
  }

  if (typeof asociados === "string") {
    return asociados
      .split(",")
      .map((nombre) => nombre.trim())
      .filter(Boolean);
  }

  return [];
}

// ============================================================
// COMPONENTE
// ============================================================

export default function CtnListadoPage() {
  const {
    items,
    total,
    cargarNotarias,
    loading,
  } = useCtn();

  const [filtros, setFiltros] = useState({
    provincia: "",
    municipio: "",
    vc: "",
    apoderado: "",
    q: "",
    asociado: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [pagina, setPagina] = useState(1);
  const PAGE_SIZE = 15;

  const [orden, setOrden] = useState({
    campo: null,
    direccion: "asc",
  });

  // ==========================================================
  // ORDENACIÓN
  // ==========================================================

  const cambiarOrden = useCallback((campo) => {
    setOrden((prev) => {
      if (prev.campo === campo) {
        return {
          campo,
          direccion:
            prev.direccion === "asc" ? "desc" : "asc",
        };
      }

      return {
        campo,
        direccion: "asc",
      };
    });
  }, []);

  // ==========================================================
  // CARGAR NOTARÍAS
  // El filtro "asociado" se aplica localmente porque el
  // endpoint actual de listado no necesariamente lo admite.
  // ==========================================================

  const filtrosServidor = useMemo(() => {
    const { asociado, ...resto } = filtros;
    return resto;
  }, [filtros]);

  useEffect(() => {
    cargarNotarias(filtrosServidor, pagina, PAGE_SIZE);
  }, [cargarNotarias, filtrosServidor, pagina]);

  // ==========================================================
  // APLICAR FILTROS
  // ==========================================================

  const aplicarFiltros = useCallback(() => {
    setPagina(1);
    setOrden({
      campo: null,
      direccion: "asc",
    });

    cargarNotarias(filtrosServidor, 1, PAGE_SIZE);
  }, [filtrosServidor, cargarNotarias]);

  const limpiarFiltros = useCallback(() => {
    const vacios = {
      provincia: "",
      municipio: "",
      vc: "",
      apoderado: "",
      q: "",
      asociado: "",
    };

    setFiltros(vacios);
    setPagina(1);
    setOrden({
      campo: null,
      direccion: "asc",
    });

    cargarNotarias(
      {
        provincia: "",
        municipio: "",
        vc: "",
        apoderado: "",
        q: "",
      },
      1,
      PAGE_SIZE,
    );
  }, [cargarNotarias]);

  // ==========================================================
  // ABRIR DETALLE
  // ==========================================================

  const abrirDetalle = useCallback((notaria) => {
    setSelected(notaria);
    setModalOpen(true);
  }, []);

  // ==========================================================
  // FILTRAR ASOCIACIONES EN EL LISTADO CARGADO
  // ==========================================================

  const itemsFiltrados = useMemo(() => {
    if (!Array.isArray(items)) return [];

    const termino = filtros.asociado.trim().toLocaleLowerCase("es");

    if (!termino) return items;

    return items.filter((notaria) => {
      const asociados = obtenerAsociados(notaria);

      return asociados.some((nombre) =>
        nombre.toLocaleLowerCase("es").includes(termino),
      );
    });
  }, [items, filtros.asociado]);

  // ==========================================================
  // ORDENAR RESULTADOS
  // ==========================================================

  const itemsOrdenados = useMemo(() => {
    if (!orden.campo) return itemsFiltrados;

    const copia = [...itemsFiltrados];

    copia.sort((a, b) => {
      let valorA;
      let valorB;

      if (orden.campo === "notarios_asociados") {
        valorA = obtenerAsociados(a).join(", ");
        valorB = obtenerAsociados(b).join(", ");
      } else {
        valorA = a?.[orden.campo];
        valorB = b?.[orden.campo];
      }

      const textoA = String(valorA ?? "")
        .trim()
        .toLocaleLowerCase("es");

      const textoB = String(valorB ?? "")
        .trim()
        .toLocaleLowerCase("es");

      const numeroA = Number(textoA);
      const numeroB = Number(textoB);

      const ambosNumericos =
        textoA !== "" &&
        textoB !== "" &&
        Number.isFinite(numeroA) &&
        Number.isFinite(numeroB);

      const resultado = ambosNumericos
        ? numeroA - numeroB
        : textoA.localeCompare(textoB, "es", {
            numeric: true,
            sensitivity: "base",
          });

      return orden.direccion === "asc"
        ? resultado
        : -resultado;
    });

    return copia;
  }, [itemsFiltrados, orden]);

  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  // ==========================================================
  // EXPORTAR EXCEL
  // ==========================================================

  const descargarExcel = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      Object.entries(filtrosServidor).forEach(([key, value]) => {
        if (
          typeof value === "string" &&
          value.trim() !== ""
        ) {
          params.append(key, value.trim());
        }
      });

      const baseUrl = import.meta.env.VITE_API_URL;

      if (!baseUrl) {
        throw new Error(
          "No está configurada la variable VITE_API_URL.",
        );
      }

      const urlExcel =
        `${baseUrl}/ctn/exportar-excel?${params.toString()}`;

      const res = await fetch(urlExcel, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = "notarias.xlsx";

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando Excel:", err);

      window.alert(
        err?.message || "No se ha podido descargar el Excel.",
      );
    }
  }, [filtrosServidor]);

  // ==========================================================
  // CABECERA ORDENABLE
  // ==========================================================

  const CabeceraOrdenable = ({
    campo,
    children,
    className = "",
  }) => {
    const activa = orden.campo === campo;

    return (
      <th
        className={`px-3 py-3 text-left font-semibold whitespace-nowrap select-none ${className}`}
      >
        <button
          type="button"
          onClick={() => cambiarOrden(campo)}
          className="inline-flex items-center gap-2 font-semibold text-[var(--erp-text)] hover:text-[var(--erp-primary)]"
        >
          <span>{children}</span>

          <span
            className={
              activa
                ? "text-xs text-[var(--erp-primary)]"
                : "text-xs opacity-40"
            }
          >
            {activa
              ? orden.direccion === "asc"
                ? "↑"
                : "↓"
              : "↕"}
          </span>
        </button>
      </th>
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* FILTROS */}

      <section className="erp-card space-y-4 p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold">
            Filtros de notarías
          </h2>

          <p className="mt-1 text-sm text-[var(--erp-text-soft)]">
            Busca notarías por sus datos y consulta las asociaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CampoFiltro
            label="Búsqueda general"
            placeholder="Nombre, apellidos, código o NIF..."
            value={filtros.q}
            onChange={(valor) =>
              setFiltros((prev) => ({ ...prev, q: valor }))
            }
          />

          <CampoFiltro
            label="Provincia"
            placeholder="Provincia"
            value={filtros.provincia}
            onChange={(valor) =>
              setFiltros((prev) => ({
                ...prev,
                provincia: valor,
              }))
            }
          />

          <CampoFiltro
            label="Municipio"
            placeholder="Municipio"
            value={filtros.municipio}
            onChange={(valor) =>
              setFiltros((prev) => ({
                ...prev,
                municipio: valor,
              }))
            }
          />

          <CampoFiltro
            label="Videoconferencia"
            placeholder="Sí / No"
            value={filtros.vc}
            onChange={(valor) =>
              setFiltros((prev) => ({ ...prev, vc: valor }))
            }
          />

          <CampoFiltro
            label="Apoderado"
            placeholder="Nombre del apoderado"
            value={filtros.apoderado}
            onChange={(valor) =>
              setFiltros((prev) => ({
                ...prev,
                apoderado: valor,
              }))
            }
          />

          <CampoFiltro
            label="Notario asociado"
            placeholder="Nombre o apellidos del asociado"
            value={filtros.asociado}
            onChange={(valor) =>
              setFiltros((prev) => ({
                ...prev,
                asociado: valor,
              }))
            }
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl bg-[var(--erp-primary)] px-4 py-2 text-white shadow-sm transition hover:opacity-90"
            onClick={aplicarFiltros}
          >
            Aplicar filtros
          </button>

          <button
            type="button"
            className="rounded-xl border border-[var(--erp-border)] px-4 py-2 transition hover:bg-[var(--erp-surface-soft)]"
            onClick={limpiarFiltros}
          >
            Limpiar filtros
          </button>

          <button
            type="button"
            className="rounded-xl bg-[var(--erp-success)] px-4 py-2 text-white shadow-sm transition hover:opacity-90"
            onClick={descargarExcel}
          >
            Descargar Excel
          </button>
        </div>
      </section>

      {/* TABLA */}

      {loading ? (
        <div className="erp-card p-6">
          <p className="animate-pulse text-sm text-[var(--erp-text-soft)]">
            Cargando notarías...
          </p>
        </div>
      ) : (
        <section className="erp-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--erp-border)] bg-[var(--erp-surface-soft)]">
                  <CabeceraOrdenable campo="codigo">
                    Código
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="telefono">
                    Teléfono
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="nombre">
                    Nombre
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="apellidos">
                    Apellidos
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="provincia">
                    Provincia
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="municipio">
                    Municipio
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="cp">
                    CP
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="direccion">
                    Dirección
                  </CabeceraOrdenable>

                  <CabeceraOrdenable campo="notarios_asociados">
                    Notarios asociados
                  </CabeceraOrdenable>

                  <th className="px-3 py-3 text-left font-semibold text-[var(--erp-text)]">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {itemsOrdenados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-sm text-[var(--erp-text-soft)]"
                    >
                      No se han encontrado notarías con estos filtros.
                    </td>
                  </tr>
                ) : (
                  itemsOrdenados.map((notaria) => {
                    const asociados = obtenerAsociados(notaria);

                    return (
                      <tr
                        key={notaria.id}
                        className="border-b border-[var(--erp-border)] bg-[var(--erp-surface)] transition-colors last:border-b-0 hover:bg-[var(--erp-primary-soft)]"
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-medium">
                          {textoVisible(notaria.codigo)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {textoVisible(notaria.telefono)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 font-medium">
                          {textoVisible(notaria.nombre)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {textoVisible(notaria.apellidos)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {textoVisible(notaria.provincia)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {textoVisible(notaria.municipio)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {textoVisible(notaria.cp)}
                        </td>

                        <td className="min-w-[200px] px-3 py-3">
                          {textoVisible(notaria.direccion)}
                        </td>

                        <td className="min-w-[220px] px-3 py-3">
                          {asociados.length === 0 ? (
                            <span className="text-[var(--erp-text-soft)]">
                              Sin asociaciones
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {asociados.map((nombre, indice) => (
                                <span
                                  key={`${notaria.id}-${indice}-${nombre}`}
                                  className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800"
                                >
                                  {nombre}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(notaria)}
                            className="inline-flex items-center rounded-lg border border-blue-100 bg-[var(--erp-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--erp-primary)] transition hover:bg-blue-100"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}

          <div className="flex flex-col gap-3 border-t border-[var(--erp-border)] bg-[var(--erp-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="rounded-xl border border-[var(--erp-border)] bg-white px-3 py-2 transition hover:bg-[var(--erp-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pagina <= 1}
              onClick={() => setPagina((actual) => actual - 1)}
            >
              ← Anterior
            </button>

            <span className="text-center text-sm text-[var(--erp-text-soft)]">
              Página <strong className="text-[var(--erp-text)]">{pagina}</strong>{" "}
              de{" "}
              <strong className="text-[var(--erp-text)]">
                {totalPaginas || 1}
              </strong>
              {" · "}Total:{" "}
              <strong className="text-[var(--erp-text)]">
                {total}
              </strong>
              {filtros.asociado.trim() && (
                <>
                  {" · "}En esta página con asociación coincidente:{" "}
                  <strong>{itemsOrdenados.length}</strong>
                </>
              )}
            </span>

            <button
              type="button"
              className="rounded-xl border border-[var(--erp-border)] bg-white px-3 py-2 transition hover:bg-[var(--erp-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={pagina >= totalPaginas || totalPaginas === 0}
              onClick={() => setPagina((actual) => actual + 1)}
            >
              Siguiente →
            </button>
          </div>
        </section>
      )}

      {/* MODAL EXISTENTE */}

      <ModalCtnDetalle
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        notaria={selected}
      />
    </div>
  );
}

// ============================================================
// CAMPO DE FILTRO
// ============================================================

function CampoFiltro({ label, placeholder, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--erp-text)]">
        {label}
      </span>

      <input
        className="w-full rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface-soft)] px-3 py-2 text-sm text-[var(--erp-text)] outline-none transition focus:border-[var(--erp-primary)] focus:ring-2 focus:ring-[var(--erp-primary-soft)]"
        placeholder={placeholder}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
      />
    </label>
  );
}
