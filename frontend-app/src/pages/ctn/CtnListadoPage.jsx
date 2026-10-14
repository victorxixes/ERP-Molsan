
import { useEffect, useState, useCallback, useMemo } from "react";
import { useCtn } from "../../hooks/useCtn";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";

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
        ? ` (${notaria.notario_asociado.nif})`
        : "")
    );
  }

  if (notaria.notarios_asociados?.length) {
    return notaria.notarios_asociados
      .map((asociado) => {
        const nombre = obtenerNombreCompleto(asociado);

        return asociado.nif
          ? `${nombre} (${asociado.nif})`
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
          ? `${nombre} (${asociado.nif})`
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
        `${baseUrl}/ctn/exportar-excel?${params.toString()}`,
        {
          method: "GET",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );

      if (!respuesta.ok) {
        const detalle = await respuesta.text();

        throw new Error(
          detalle || `Error HTTP ${respuesta.status}`
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
