import { useEffect, useState, useCallback, useMemo } from "react";
import { useCtn } from "../../hooks/useCtn";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";

/* ============================================================
   MOLSAN ERP PREMIUM 2027 — CTN · LISTADO
   Estilos encapsulados para no afectar a otros módulos.
   ============================================================ */

.ctn-listado-page {
  --ctn-primary: var(--erp-primary, #3346a8);
  --ctn-primary-soft: var(--erp-primary-soft, #eef2ff);
  --ctn-text: var(--erp-text, #1e293b);
  --ctn-muted: var(--erp-muted, #64748b);
  --ctn-border: var(--erp-border, #e2e8f0);
  --ctn-surface: var(--erp-surface, #ffffff);

  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  min-width: 0;
  padding: 24px;
  color: var(--ctn-text);
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
}

.ctn-listado-page *,
.ctn-listado-page *::before,
.ctn-listado-page *::after {
  box-sizing: border-box;
}

/* ============================================================
   CABECERA
   ============================================================ */

.ctn-listado-page .ctn-listado-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px;
  overflow: hidden;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 22px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
}

.ctn-listado-page .ctn-listado-header::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--ctn-primary),
    #818cf8,
    #38bdf8
  );
}

.ctn-listado-page .ctn-listado-header > div {
  min-width: 0;
}

.ctn-listado-page .ctn-listado-header h1 {
  margin: 0;
  color: var(--ctn-text);
  font-size: clamp(22px, 2vw, 29px);
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.035em;
}

.ctn-listado-page .ctn-listado-header p {
  margin: 7px 0 0;
  color: var(--ctn-muted);
  font-size: 13px;
}

/* ============================================================
   FILTROS
   ============================================================ */

.ctn-listado-page .ctn-filtros {
  padding: 22px;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
}

.ctn-listado-page .ctn-filtros-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.ctn-listado-page .ctn-filtros-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 650;
}

.ctn-listado-page .ctn-filtros-grid input,
.ctn-listado-page .ctn-filtros-grid select {
  display: block;
  width: 100%;
  min-width: 0;
  height: 42px;
  margin: 0;
  padding: 0 12px;
  color: #1e293b;
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  background-color: #fff;
  border: 1px solid #d8e0eb;
  border-radius: 10px;
  outline: none;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.ctn-listado-page .ctn-filtros-grid input::placeholder {
  color: #94a3b8;
  opacity: 1;
}

.ctn-listado-page .ctn-filtros-grid input:hover,
.ctn-listado-page .ctn-filtros-grid select:hover {
  border-color: #b6c3d6;
}

.ctn-listado-page .ctn-filtros-grid input:focus,
.ctn-listado-page .ctn-filtros-grid select:focus {
  border-color: var(--ctn-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

/* ============================================================
   BOTONES
   ============================================================ */

.ctn-listado-page .ctn-btn,
.ctn-listado-page .ctn-paginacion button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 39px;
  padding: 9px 15px;
  color: #334155;
  font-family: inherit;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  background: #fff;
  border: 1px solid #dbe2ec;
  border-radius: 10px;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.ctn-listado-page .ctn-btn:hover:not(:disabled),
.ctn-listado-page .ctn-paginacion button:hover:not(:disabled) {
  border-color: #b8c4d8;
  background: #f8fafc;
  box-shadow: 0 3px 9px rgba(15, 23, 42, 0.07);
}

.ctn-listado-page .ctn-btn:active:not(:disabled),
.ctn-listado-page .ctn-paginacion button:active:not(:disabled) {
  transform: translateY(1px);
}

.ctn-listado-page .ctn-btn:disabled,
.ctn-listado-page .ctn-paginacion button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.ctn-listado-page .ctn-btn-primary,
.ctn-listado-page .ctn-btn-excel {
  color: #fff;
  background: var(--ctn-primary);
  border-color: var(--ctn-primary);
  box-shadow: 0 4px 10px rgba(51, 70, 168, 0.15);
}

.ctn-listado-page .ctn-btn-primary:hover:not(:disabled),
.ctn-listado-page .ctn-btn-excel:hover:not(:disabled) {
  color: #fff;
  background: #29398d;
  border-color: #29398d;
}

.ctn-listado-page .ctn-btn-secondary {
  color: #475569;
  background: #fff;
}

.ctn-listado-page .ctn-btn-small {
  min-height: 32px;
  padding: 7px 11px;
  color: var(--ctn-primary);
  background: var(--ctn-primary-soft);
  border-color: #dbe3ff;
}

.ctn-listado-page .ctn-btn-small:hover:not(:disabled) {
  color: #fff;
  background: var(--ctn-primary);
  border-color: var(--ctn-primary);
}

.ctn-listado-page .ctn-filtros-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding-top: 17px;
  border-top: 1px solid #edf0f5;
}

/* ============================================================
   RESUMEN
   ============================================================ */

.ctn-listado-page .ctn-listado-resumen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 19px;
  color: var(--ctn-muted);
  background: #f8faff;
  border: 1px solid var(--ctn-border);
  border-radius: 14px;
  font-size: 12px;
}

.ctn-listado-page .ctn-listado-resumen strong {
  color: var(--ctn-text);
  font-size: 14px;
  font-weight: 750;
}

/* ============================================================
   TABLA
   ============================================================ */

.ctn-listado-page .ctn-tabla-contenedor {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
}

.ctn-listado-page .ctn-tabla-scroll {
  width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.ctn-listado-page .ctn-tabla {
  width: 100%;
  min-width: 1050px;
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  color: #334155;
  font-size: 12px;
  text-align: left;
}

.ctn-listado-page .ctn-tabla thead {
  background: #f1f5fb;
}

.ctn-listado-page .ctn-tabla th {
  padding: 13px 14px;
  color: #475569;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
  background: #f1f5fb;
  border-bottom: 1px solid #dfe6f0;
}

.ctn-listado-page .ctn-tabla th:first-child {
  padding-left: 18px;
}

.ctn-listado-page .ctn-tabla td {
  padding: 12px 14px;
  vertical-align: middle;
  border-bottom: 1px solid #edf1f6;
  line-height: 1.45;
}

.ctn-listado-page .ctn-tabla td:first-child {
  padding-left: 18px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

.ctn-listado-page .ctn-tabla tbody tr {
  background: #fff;
  transition: background-color 120ms ease;
}

.ctn-listado-page .ctn-tabla tbody tr:nth-child(even) {
  background: #fbfcfe;
}

.ctn-listado-page .ctn-tabla tbody tr:hover {
  background: #f1f5ff;
}

.ctn-listado-page .ctn-tabla tbody tr:last-child td {
  border-bottom: 0;
}

.ctn-listado-page .ctn-tabla .ctn-orden {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.ctn-listado-page .ctn-tabla .ctn-orden:hover {
  color: var(--ctn-primary);
}

.ctn-listado-page .ctn-tabla-vacio {
  padding: 38px 18px !important;
  color: var(--ctn-muted);
  text-align: center;
  font-size: 13px;
}

/* ============================================================
   PAGINACIÓN
   ============================================================ */

.ctn-listado-page .ctn-paginacion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 15px 17px;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 15px;
}

.ctn-listado-page .ctn-paginacion button {
  min-height: 35px;
  padding: 8px 11px;
  font-size: 11px;
}

.ctn-listado-page .ctn-paginacion span {
  margin: 0 5px;
  color: var(--ctn-muted);
  font-size: 12px;
  font-weight: 600;
}

/* ============================================================
   ACCESIBILIDAD
   ============================================================ */

.ctn-listado-page button:focus-visible {
  outline: 3px solid rgba(79, 70, 229, 0.3);
  outline-offset: 2px;
}

/* ============================================================
   TABLET
   ============================================================ */

@media (max-width: 1050px) {
  .ctn-listado-page {
    padding: 18px;
    gap: 17px;
  }

  .ctn-listado-page .ctn-filtros-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ctn-listado-page .ctn-listado-header {
    padding: 21px;
  }
}

/* ============================================================
   MÓVIL
   ============================================================ */

@media (max-width: 600px) {
  .ctn-listado-page {
    padding: 12px;
    gap: 14px;
  }

  .ctn-listado-page .ctn-listado-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 20px 17px;
    border-radius: 17px;
  }

  .ctn-listado-page .ctn-btn-excel {
    width: 100%;
  }

  .ctn-listado-page .ctn-filtros {
    padding: 16px;
    border-radius: 16px;
  }

  .ctn-listado-page .ctn-filtros-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .ctn-listado-page .ctn-filtros-acciones {
    align-items: stretch;
    flex-direction: column;
  }

  .ctn-listado-page .ctn-filtros-acciones .ctn-btn {
    width: 100%;
  }

  .ctn-listado-page .ctn-listado-resumen {
    align-items: flex-start;
    flex-direction: column;
  }

  .ctn-listado-page .ctn-paginacion {
    justify-content: center;
    padding: 12px 8px;
  }
}

/* ============================================================
   MOVIMIENTO REDUCIDO
   ============================================================ */

@media (prefers-reduced-motion: reduce) {
  .ctn-listado-page *,
  .ctn-listado-page *::before,
  .ctn-listado-page *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }

   // ============================================================
// HELPERS
// ============================================================

function texto(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return String(valor);
}

function obtenerNombreCompleto(notaria) {
  if (!notaria) return "—";

  const nombre = [
    notaria.nombre,
    notaria.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return nombre || notaria.nombre_completo || "—";
}

function obtenerNombreAsociado(notaria) {
  if (!notaria) return "—";

  if (notaria.notario_asociado) {
    if (typeof notaria.notario_asociado === "string") {
      return notaria.notario_asociado;
    }

    return (
      obtenerNombreCompleto(notaria.notario_asociado) +
      (notaria.notario_asociado.nif
        ?  (${notaria.notario_asociado.nif})
        : "")
    );
  }

  if (notaria.notarios_asociados?.length) {
    return notaria.notarios_asociados
      .map((asociado) => {
        const nombre = obtenerNombreCompleto(asociado);

        return asociado.nif
          ? ${nombre} (${asociado.nif})
          : nombre;
      })
      .join(", ");
  }

  if (notaria.asociados?.length) {
    return notaria.asociados
      .map((asociado) => {
        if (typeof asociado === "string") return asociado;

        const nombre = obtenerNombreCompleto(asociado);

        return asociado.nif
          ? ${nombre} (${asociado.nif})
          : nombre;
      })
      .join(", ");
  }

  return "—";
}

// ============================================================
// COMPONENTE
// ============================================================

export default function CtnListadoPage() {
  const {
    items = [],
    total = 0,
    cargarNotarias,
    loading = false,
  } = useCtn();

  const PAGE_SIZE = 15;

  const [pagina, setPagina] = useState(1);

  const [filtros, setFiltros] = useState({
    provincia: "",
    municipio: "",
    vc: "",
    apoderado: "",
    asociado: "",
    q: "",
  });

  const [orden, setOrden] = useState({
    campo: "nombre",
    direccion: "asc",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // ==========================================================
  // CARGA DEL LISTADO
  // ==========================================================

  const cargarListado = useCallback(
    (paginaDestino = pagina, filtrosDestino = filtros) => {
      if (typeof cargarNotarias !== "function") return;

      cargarNotarias(
        filtrosDestino,
        paginaDestino,
        PAGE_SIZE
      );
    },
    [cargarNotarias, pagina, filtros]
  );

  useEffect(() => {
    cargarListado(pagina, filtros);
  }, [cargarListado, pagina, filtros]);

  // ==========================================================
  // FILTROS
  // ==========================================================

  const cambiarFiltro = (campo, valor) => {
    setFiltros((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));

    setPagina(1);
  };

  const limpiarFiltros = () => {
    const filtrosVacios = {
      provincia: "",
      municipio: "",
      vc: "",
      apoderado: "",
      asociado: "",
      q: "",
    };

    setFiltros(filtrosVacios);
    setPagina(1);
    cargarListado(1, filtrosVacios);
  };

  const aplicarFiltros = () => {
    setPagina(1);
    cargarListado(1, filtros);
  };

  // ==========================================================
  // ORDENACIÓN
  // ==========================================================

  const cambiarOrden = (campo) => {
    setOrden((actual) => ({
      campo,
      direccion:
        actual.campo === campo && actual.direccion === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const indicadorOrden = (campo) => {
    if (orden.campo !== campo) return "";

    return orden.direccion === "asc" ? " ▲" : " ▼";
  };

  const itemsOrdenados = useMemo(() => {
    const copia = [...items];

    const valorCampo = (item, campo) => {
      switch (campo) {
        case "nombre":
          return obtenerNombreCompleto(item);

        case "codigo":
          return item.codigo;

        case "telefono":
          return item.telefono;

        case "provincia":
          return item.provincia;

        case "municipio":
          return item.municipio;

        case "cp":
          return item.cp;

        case "direccion":
          return item.direccion;

        case "notario_asociado":
          return obtenerNombreAsociado(item);

        default:
          return item[campo];
      }
    };

    copia.sort((a, b) => {
      const valorA = valorCampo(a, orden.campo);
      const valorB = valorCampo(b, orden.campo);

      const textoA =
        valorA === null || valorA === undefined
          ? ""
          : String(valorA);

      const textoB =
        valorB === null || valorB === undefined
          ? ""
          : String(valorB);

      const comparacion = textoA.localeCompare(
        textoB,
        "es",
        {
          numeric: true,
          sensitivity: "base",
        }
      );

      return orden.direccion === "asc"
        ? comparacion
        : -comparacion;
    });

    return copia;
  }, [items, orden]);

  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(Number(total || 0) / PAGE_SIZE)
  );

  const irPagina = (destino) => {
    if (destino < 1 || destino > totalPaginas) return;

    setPagina(destino);
  };

  // ==========================================================
  // EXCEL
  // ==========================================================

  const exportarExcel = async () => {
    try {
      const baseUrl = (
        import.meta.env.VITE_API_URL || ""
      ).replace(/\/$/, "");

      const params = new URLSearchParams();

      Object.entries(filtros).forEach(([clave, valor]) => {
        if (
          valor !== undefined &&
          valor !== null &&
          String(valor).trim() !== ""
        ) {
          params.set(clave, String(valor).trim());
        }
      });

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access_token");

      const respuesta = await fetch(
        ${baseUrl}/ctn/exportar-excel?${params.toString()},
        {
          method: "GET",
          headers: token
            ? {
                Authorization: Bearer ${token},
              }
            : {},
        }
      );

      if (!respuesta.ok) {
        const detalle = await respuesta.text();

        throw new Error(
          detalle || Error HTTP ${respuesta.status}
        );
      }

      const blob = await respuesta.blob();
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = "listado_ctn.xlsx";

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar CTN:", error);

      window.alert(
        "No se ha podido exportar el listado CTN. " +
          (error?.message || "")
      );
    }
  };

  // ==========================================================
  // DETALLE
  // ==========================================================

  const abrirDetalle = (notaria) => {
    setSelected(notaria);
    setModalOpen(true);
  };

  const cerrarDetalle = () => {
    setModalOpen(false);
    setSelected(null);

    // Recarga por si se han modificado datos o asociaciones.
    cargarListado(pagina, filtros);
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="ctn-listado-page">
      <div className="ctn-listado-header">
        <div>
          <h1>CTN · Notarios</h1>
          <p>
            Gestión del censo notarial y de sus notarios asociados.
          </p>
        </div>

        <button
          type="button"
          onClick={exportarExcel}
          className="ctn-btn ctn-btn-excel"
        >
          Exportar Excel
        </button>
      </div>

      {/* FILTROS */}

      <section className="ctn-filtros">
        <div className="ctn-filtros-grid">
          <label>
            Búsqueda general
            <input
              type="text"
              value={filtros.q}
              onChange={(e) =>
                cambiarFiltro("q", e.target.value)
              }
              placeholder="Nombre, apellidos, código o NIF"
            />
          </label>

          <label>
            Provincia
            <input
              type="text"
              value={filtros.provincia}
              onChange={(e) =>
                cambiarFiltro("provincia", e.target.value)
              }
              placeholder="Provincia"
            />
          </label>

          <label>
            Municipio
            <input
              type="text"
              value={filtros.municipio}
              onChange={(e) =>
                cambiarFiltro("municipio", e.target.value)
              }
              placeholder="Municipio"
            />
          </label>

          <label>
            Videoconferencia
            <select
              value={filtros.vc}
              onChange={(e) =>
                cambiarFiltro("vc", e.target.value)
              }
            >
              <option value="">Todos</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </label>

          <label>
            Apoderado
            <input
              type="text"
              value={filtros.apoderado}
              onChange={(e) =>
                cambiarFiltro("apoderado", e.target.value)
              }
              placeholder="Nombre del apoderado"
            />
          </label>

          <label>
            Notario asociado
            <input
              type="text"
              value={filtros.asociado}
              onChange={(e) =>
                cambiarFiltro("asociado", e.target.value)
              }
              placeholder="Nombre, apellidos o NIF"
            />
          </label>
        </div>

        <div className="ctn-filtros-acciones">
          <button
            type="button"
            onClick={aplicarFiltros}
            className="ctn-btn ctn-btn-primary"
          >
            Buscar
          </button>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="ctn-btn ctn-btn-secondary"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* RESUMEN */}

      <div className="ctn-listado-resumen">
        <span>
          Total de notarios: <strong>{total}</strong>
        </span>

        <span>
          Página <strong>{pagina}</strong> de{" "}
          <strong>{totalPaginas}</strong>
        </span>
      </div>

      {/* TABLA */}

      <section className="ctn-tabla-contenedor">
        <div className="ctn-tabla-scroll">
          <table className="ctn-tabla">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    onClick={() => cambiarOrden("codigo")}
                    className="ctn-orden"
                  >
                    Código{indicadorOrden("codigo")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => cambiarOrden("telefono")}
                    className="ctn-orden"
                  >
                    Teléfono{indicadorOrden("telefono")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => cambiarOrden("nombre")}
                    className="ctn-orden"
                  >
                    Nombre y apellidos{indicadorOrden("nombre")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => cambiarOrden("provincia")}
                    className="ctn-orden"
                  >
                    Provincia{indicadorOrden("provincia")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => cambiarOrden("municipio")}
                    className="ctn-orden"
                  >
                    Municipio{indicadorOrden("municipio")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => cambiarOrden("cp")}
                    className="ctn-orden"
                  >
                    CP{indicadorOrden("cp")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => cambiarOrden("direccion")}
                    className="ctn-orden"
                  >
                    Dirección{indicadorOrden("direccion")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      cambiarOrden("notario_asociado")
                    }
                    className="ctn-orden"
                  >
                    Notario asociado
                    {indicadorOrden("notario_asociado")}
                  </button>
                </th>

                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="ctn-tabla-vacio">
                    Cargando notarios…
                  </td>
                </tr>
              ) : itemsOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="ctn-tabla-vacio">
                    No se han encontrado notarios con los filtros
                    indicados.
                  </td>
                </tr>
              ) : (
                itemsOrdenados.map((notaria) => (
                  <tr key={notaria.id}>
                    <td>{texto(notaria.codigo)}</td>
                    <td>{texto(notaria.telefono)}</td>
                    <td>{obtenerNombreCompleto(notaria)}</td>
                    <td>{texto(notaria.provincia)}</td>
                    <td>{texto(notaria.municipio)}</td>
                    <td>{texto(notaria.cp)}</td>
                    <td>{texto(notaria.direccion)}</td>

                    <td>
                      {obtenerNombreAsociado(notaria)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ctn-btn ctn-btn-small"
                        onClick={() => abrirDetalle(notaria)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAGINACIÓN */}

      <div className="ctn-paginacion">
        <button
          type="button"
          onClick={() => irPagina(1)}
          disabled={pagina <= 1 || loading}
        >
          « Primera
        </button>

        <button
          type="button"
          onClick={() => irPagina(pagina - 1)}
          disabled={pagina <= 1 || loading}
        >
          ‹ Anterior
        </button>

        <span>
          Página {pagina} de {totalPaginas}
        </span>

        <button
          type="button"
          onClick={() => irPagina(pagina + 1)}
          disabled={pagina >= totalPaginas || loading}
        >
          Siguiente ›
        </button>

        <button
          type="button"
          onClick={() => irPagina(totalPaginas)}
          disabled={pagina >= totalPaginas || loading}
        >
          Última »
        </button>
      </div>

      {/* MODAL DE DETALLE */}

      {modalOpen && (
        <ModalCtnDetalle
          open={modalOpen}
          onClose={cerrarDetalle}
          notaria={selected}
        />
      )}
    </div>
  );
}
}
