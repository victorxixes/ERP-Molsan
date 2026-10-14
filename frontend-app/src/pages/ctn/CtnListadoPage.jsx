
import { useEffect, useState, useCallback, useMemo } from "react";
import { useCtn } from "../../hooks/useCtn";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";

const PAGE_SIZE = 15;

const FILTROS_INICIALES = {
  provincia: "",
  municipio: "",
  vc: "",
  apoderado: "",
  q: "",
  asociado: "",
};

function mostrar(valor) {
  return valor === null || valor === undefined || valor === ""
    ? "—"
    : String(valor);
}

function nombreCompleto(notario) {
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
        if (typeof asociado === "string") return asociado;

        return (
          asociado?.nombre_completo ||
          nombreCompleto(asociado) ||
          asociado?.nif ||
          ""
        );
      })
      .filter(Boolean);
  }

  if (typeof notaria?.notario_asociado === "string") {
    return notaria.notario_asociado
      .split(",")
      .map((nombre) => nombre.trim())
      .filter(Boolean);
  }

  return [];
}

function CampoFiltro({ label, value, placeholder, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[var(--erp-text)]">
        {label}
      </span>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(evento) => onChange(evento.target.value)}
        className="w-full rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface-soft)] px-3 py-2 text-sm text-[var(--erp-text)] outline-none transition focus:border-[var(--erp-primary)] focus:ring-2 focus:ring-[var(--erp-primary-soft)]"
      />
    </label>
  );
}

export default function CtnListadoPage() {
  const {
    items,
    total,
    cargarNotarias,
    loading,
  } = useCtn();

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState(
    FILTROS_INICIALES,
  );

  const [pagina, setPagina] = useState(1);
  const [orden, setOrden] = useState({
    campo: null,
    direccion: "asc",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [errorExcel, setErrorExcel] = useState("");

  // ==========================================================
  // CARGA DEL LISTADO
  // ==========================================================

  useEffect(() => {
    let activo = true;

    Promise.resolve(
      cargarNotarias(filtrosAplicados, pagina, PAGE_SIZE),
    ).catch((error) => {
      if (activo) {
        console.error("Error cargando notarías:", error);
      }
    });

    return () => {
      activo = false;
    };
  }, [cargarNotarias, filtrosAplicados, pagina]);

  // ==========================================================
  // CAMBIOS DE FILTRO
  // ==========================================================

  const cambiarFiltro = useCallback((campo, valor) => {
    setFiltros((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));
  }, []);

  const aplicarFiltros = useCallback(() => {
    setPagina(1);
    setOrden({
      campo: null,
      direccion: "asc",
    });
    setFiltrosAplicados({ ...filtros });
  }, [filtros]);

  const limpiarFiltros = useCallback(() => {
    const vacios = { ...FILTROS_INICIALES };

    setFiltros(vacios);
    setFiltrosAplicados(vacios);
    setPagina(1);
    setOrden({
      campo: null,
      direccion: "asc",
    });
  }, []);

  // ==========================================================
  // ORDENACIÓN
  // ==========================================================

  const cambiarOrden = useCallback((campo) => {
    setOrden((actual) => ({
      campo,
      direccion:
        actual.campo === campo && actual.direccion === "asc"
          ? "desc"
          : "asc",
    }));
  }, []);

  const itemsOrdenados = useMemo(() => {
    if (!Array.isArray(items)) return [];

    if (!orden.campo) return items;

    return [...items].sort((a, b) => {
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
  }, [items, orden]);

  const totalPaginas = Math.ceil((total || 0) / PAGE_SIZE);

  // ==========================================================
  // MODAL DE DETALLE
  // ==========================================================

  const abrirDetalle = useCallback((notaria) => {
    setSelected(notaria);
    setModalOpen(true);
  }, []);

  const cerrarDetalle = useCallback(() => {
    setModalOpen(false);
    setSelected(null);
  }, []);

  // ==========================================================
  // EXPORTACIÓN EXCEL
  // ==========================================================

  const descargarExcel = useCallback(async () => {
    setErrorExcel("");

    try {
      const baseUrl = import.meta.env.VITE_API_URL;

      if (!baseUrl) {
        throw new Error(
          "No está configurada la variable VITE_API_URL.",
        );
      }

      const params = new URLSearchParams();

      Object.entries(filtrosAplicados).forEach(([clave, valor]) => {
        if (typeof valor === "string" && valor.trim()) {
          params.set(clave, valor.trim());
        }
      });

      const token = localStorage.getItem("token");
      const cabeceras = {};

      if (token) {
        cabeceras.Authorization = `Bearer ${token}`;
      }

      const respuesta = await fetch(
        `${baseUrl}/ctn/exportar-excel?${params.toString()}`,
        {
          method: "GET",
          headers: cabeceras,
        },
      );

      if (!respuesta.ok) {
        throw new Error(
          `No se pudo exportar el Excel (HTTP ${respuesta.status}).`,
        );
      }

      const blob = await respuesta.blob();
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = "notarias.xlsx";

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("Error exportando notarías:", error);
      setErrorExcel(
        error?.message || "No se ha podido descargar el Excel.",
      );
    }
  }, [filtrosAplicados]);

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
        className={`whitespace-nowrap px-3 py-3 text-left font-semibold text-[var(--erp-text)] ${className}`}
      >
        <button
          type="button"
          onClick={() => cambiarOrden(campo)}
          className="inline-flex items-center gap-2 hover:text-[var(--erp-primary)]"
        >
          <span>{children}</span>
          <span className={activa ? "text-[var(--erp-primary)]" : "opacity-40"}>
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
      <section className="erp-card space-y-4 p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-[var(--erp-text)]">
            Directorio de notarías
          </h2>
          <p className="mt-1 text-sm text-[var(--erp-text-soft)]">
            Busca notarías, consulta sus asociaciones y accede a su ficha.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CampoFiltro
            label="Búsqueda general"
            placeholder="Nombre, apellidos, código o NIF"
            value={filtros.q}
            onChange={(valor) => cambiarFiltro("q", valor)}
          />

          <CampoFiltro
            label="Provincia"
            placeholder="Provincia"
            value={filtros.provincia}
            onChange={(valor) => cambiarFiltro("provincia", valor)}
          />

          <CampoFiltro
            label="Municipio"
            placeholder="Municipio"
            value={filtros.municipio}
            onChange={(valor) => cambiarFiltro("municipio", valor)}
          />

          <CampoFiltro
            label="Videoconferencia"
            placeholder="Valor de VC"
            value={filtros.vc}
            onChange={(valor) => cambiarFiltro("vc", valor)}
          />

          <CampoFiltro
            label="Apoderado"
            placeholder="Nombre del apoderado"
            value={filtros.apoderado}
            onChange={(valor) => cambiarFiltro("apoderado", valor)}
          />

          <CampoFiltro
            label="Notario asociado"
            placeholder="Nombre, apellidos o NIF"
            value={filtros.asociado}
            onChange={(valor) => cambiarFiltro("asociado", valor)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={aplicarFiltros}
            className="rounded-xl bg-[var(--erp-primary)] px-4 py-2 text-white shadow-sm transition hover:opacity-90"
          >
            Aplicar filtros
          </button>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-xl border border-[var(--erp-border)] px-4 py-2 text-[var(--erp-text)] transition hover:bg-[var(--erp-surface-soft)]"
          >
            Limpiar filtros
          </button>

          <button
            type="button"
            onClick={descargarExcel}
            className="rounded-xl bg-[var(--erp-success)] px-4 py-2 text-white shadow-sm transition hover:opacity-90"
          >
            Descargar Excel
          </button>
        </div>

        {errorExcel && (
          <p role="alert" className="text-sm text-red-600">
            {errorExcel}
          </p>
        )}
      </section>

      {loading ? (
        <section className="erp-card p-6">
          <p className="animate-pulse text-sm text-[var(--erp-text-soft)]">
            Cargando notarías...
          </p>
        </section>
      ) : (
        <section className="erp-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--erp-border)] bg-[var(--erp-surface-soft)]">
                  <CabeceraOrdenable campo="codigo">Código</CabeceraOrdenable>
                  <CabeceraOrdenable campo="telefono">Teléfono</CabeceraOrdenable>
                  <CabeceraOrdenable campo="nombre">Nombre</CabeceraOrdenable>
                  <CabeceraOrdenable campo="apellidos">Apellidos</CabeceraOrdenable>
                  <CabeceraOrdenable campo="provincia">Provincia</CabeceraOrdenable>
                  <CabeceraOrdenable campo="municipio">Municipio</CabeceraOrdenable>
                  <CabeceraOrdenable campo="cp">CP</CabeceraOrdenable>
                  <CabeceraOrdenable campo="direccion">Dirección</CabeceraOrdenable>
                  <CabeceraOrdenable campo="notarios_asociados">
                    Notarios asociados
                  </CabeceraOrdenable>
                  <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-[var(--erp-text)]">
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
                      No se han encontrado notarías.
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
                          {mostrar(notaria.codigo)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {mostrar(notaria.telefono)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium">
                          {mostrar(notaria.nombre)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {mostrar(notaria.apellidos)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {mostrar(notaria.provincia)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {mostrar(notaria.municipio)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {mostrar(notaria.cp)}
                        </td>
                        <td className="min-w-[200px] px-3 py-3">
                          {mostrar(notaria.direccion)}
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

          <div className="flex flex-col gap-3 border-t border-[var(--erp-border)] bg-[var(--erp-surface-soft)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
              className="rounded-xl border border-[var(--erp-border)] bg-white px-3 py-2 transition hover:bg-[var(--erp-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>

            <span className="text-center text-sm text-[var(--erp-text-soft)]">
              Página <strong className="text-[var(--erp-text)]">{pagina}</strong>
              {" "}de{" "}
              <strong className="text-[var(--erp-text)]">
                {totalPaginas || 1}
              </strong>
              {" · "}Total de notarías:{" "}
              <strong className="text-[var(--erp-text)]">{total ?? 0}</strong>
              {" · "}Mostradas:{" "}
              <strong className="text-[var(--erp-text)]">
                {itemsOrdenados.length}
              </strong>
            </span>

            <button
              type="button"
              disabled={!totalPaginas || pagina >= totalPaginas}
              onClick={() =>
                setPagina((actual) =>
                  Math.min(totalPaginas || 1, actual + 1),
                )
              }
              className="rounded-xl border border-[var(--erp-border)] bg-white px-3 py-2 transition hover:bg-[var(--erp-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </section>
      )}

      <ModalCtnDetalle
        open={modalOpen}
        onClose={cerrarDetalle}
        notaria={selected}
      />
    </div>
  );
}
