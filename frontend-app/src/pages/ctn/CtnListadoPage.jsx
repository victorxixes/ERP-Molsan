import { useCallback, useEffect, useMemo, useState } from "react";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";
import "../../css/CtnListadoPage.css";

const API_BASE = (import.meta.env.VITE_API_URL || "https://agenda-intranet-b.onrender.com/api").replace(/\/$/, "");
const PAGE_SIZE = 15;

function texto(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return String(valor);
}

function nombreNotario(item) {
  return [item?.nombre, item?.apellidos].filter(Boolean).join(" ").trim() || item?.nombre_completo || item?.notario || "";
}

function listaAsociados(item) {
  const asociados = item?.notarios_asociados;
  if (Array.isArray(asociados)) {
    return asociados.map((a) => typeof a === "string" ? a : nombreNotario(a) || a?.nombre_completo || `ID ${a?.id ?? a?.asociado_id ?? ""}`).filter(Boolean).join(", ");
  }
  return item?.notario_asociado || "";
}

function leerDetalleError(error, fallback) {
  return error?.message || fallback;
}

export default function CtnListadoPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const [notariaSeleccionada, setNotariaSeleccionada] = useState(null);
  const [orden, setOrden] = useState({ campo: "apellidos", direccion: "asc" });
  const [filtros, setFiltros] = useState({ q: "", provincia: "", municipio: "", vc: "", apoderado: "", asociado: "" });
  const [filtrosAplicados, setFiltrosAplicados] = useState({ q: "", provincia: "", municipio: "", vc: "", apoderado: "", asociado: "" });

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const cargarListado = useCallback(async (paginaSolicitada = pagina, filtrosActuales = filtrosAplicados) => {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(paginaSolicitada), page_size: String(PAGE_SIZE) });
      Object.entries(filtrosActuales).forEach(([key, value]) => {
        if (value?.trim()) params.set(key, value.trim());
      });
      const response = await fetch(`${API_BASE}/ctn/notarias?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        let mensaje = `Error HTTP ${response.status} al cargar el listado CTN.`;
        try {
          const body = await response.json();
          if (body?.detail) mensaje = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        } catch { /* La respuesta puede no ser JSON. */ }
        throw new Error(mensaje);
      }
      const data = await response.json();
      const filas = Array.isArray(data) ? data : (data.items || data.notarias || data.results || []);
      setItems(filas);
      setTotal(Number(data.total ?? data.count ?? filas.length));
      setPagina(Number(data.page ?? paginaSolicitada));
    } catch (err) {
      console.error("Error cargando listado CTN:", err);
      setItems([]);
      setTotal(0);
      setError(leerDetalleError(err, "No se ha podido cargar el listado de notarios."));
    } finally {
      setCargando(false);
    }
  }, [pagina, filtrosAplicados]);

  useEffect(() => {
    cargarListado(pagina, filtrosAplicados);
  }, [pagina, filtrosAplicados, cargarListado]);

  const filasOrdenadas = useMemo(() => {
    const copia = [...items];
    const obtener = (item, campo) => {
      if (campo === "nombre_completo") return nombreNotario(item);
      if (campo === "notario_asociado") return listaAsociados(item);
      return item?.[campo] ?? "";
    };
    copia.sort((a, b) => {
      const av = obtener(a, orden.campo);
      const bv = obtener(b, orden.campo);
      const comparacion = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "es", { sensitivity: "base", numeric: true });
      return orden.direccion === "asc" ? comparacion : -comparacion;
    });
    return copia;
  }, [items, orden]);

  const cambiarFiltro = (campo, valor) => setFiltros((actual) => ({ ...actual, [campo]: valor }));

  const aplicarFiltros = (event) => {
    event?.preventDefault();
    setPagina(1);
    setFiltrosAplicados({ ...filtros });
  };

  const limpiarFiltros = () => {
    const vacios = { q: "", provincia: "", municipio: "", vc: "", apoderado: "", asociado: "" };
    setFiltros(vacios);
    setFiltrosAplicados(vacios);
    setPagina(1);
  };

  const ordenarPor = (campo) => setOrden((actual) => ({
    campo,
    direccion: actual.campo === campo && actual.direccion === "asc" ? "desc" : "asc",
  }));

  const indicadorOrden = (campo) => orden.campo !== campo ? "↕" : orden.direccion === "asc" ? "↑" : "↓";

  const exportarExcel = async () => {
    setExportando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filtrosAplicados).forEach(([key, value]) => {
        if (value?.trim()) params.set(key, value.trim());
      });
      const response = await fetch(`${API_BASE}/ctn/exportar-excel${params.size ? `?${params.toString()}` : ""}`, {
        headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        credentials: "include",
      });
      if (!response.ok) {
        let mensaje = `Error HTTP ${response.status} al exportar Excel.`;
        try { const body = await response.json(); if (body?.detail) mensaje = body.detail; } catch { /* respuesta no JSON */ }
        throw new Error(mensaje);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `CTN_notarios_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exportando CTN:", err);
      setError(leerDetalleError(err, "No se ha podido exportar el Excel."));
    } finally {
      setExportando(false);
    }
  };

  return (
    <main className="ctn-listado-page">
      <header className="ctn-listado-header">
        <div>
          <h1>Listado CTN</h1>
          <p>Consulta, filtra y gestiona los notarios y sus asociaciones.</p>
        </div>
        <div className="ctn-listado-header-acciones">
          <button type="button" className="ctn-btn ctn-btn-excel" onClick={exportarExcel} disabled={exportando}>
            {exportando ? "Preparando Excel…" : "⇩ Exportar Excel"}
          </button>
          <button type="button" className="ctn-btn ctn-btn-secondary" onClick={() => cargarListado(pagina, filtrosAplicados)} disabled={cargando}>
            {cargando ? "Actualizando…" : "↻ Actualizar"}
          </button>
        </div>
      </header>

      <section className="ctn-filtros" aria-label="Filtros del listado CTN">
        <h2>Filtros de búsqueda</h2>
        <form onSubmit={aplicarFiltros}>
          <div className="ctn-filtros-grid">
            <label>Buscar notario<input value={filtros.q} onChange={(e) => cambiarFiltro("q", e.target.value)} placeholder="Nombre, apellidos, NIF o código" /></label>
            <label>Provincia<input value={filtros.provincia} onChange={(e) => cambiarFiltro("provincia", e.target.value)} placeholder="Provincia" /></label>
            <label>Municipio<input value={filtros.municipio} onChange={(e) => cambiarFiltro("municipio", e.target.value)} placeholder="Municipio" /></label>
            <label>Notario asociado<input value={filtros.asociado} onChange={(e) => cambiarFiltro("asociado", e.target.value)} placeholder="Nombre del asociado" /></label>
            <label>Apoderado<input value={filtros.apoderado} onChange={(e) => cambiarFiltro("apoderado", e.target.value)} placeholder="Apoderado" /></label>
            <label>Videoconferencia (VC)
              <select value={filtros.vc} onChange={(e) => cambiarFiltro("vc", e.target.value)}>
                <option value="">Todos</option><option value="SI">Sí</option><option value="NO">No</option>
              </select>
            </label>
          </div>
          <div className="ctn-filtros-acciones">
            <button type="button" className="ctn-btn ctn-btn-secondary" onClick={limpiarFiltros}>Limpiar</button>
            <button type="submit" className="ctn-btn ctn-btn-primary">Buscar</button>
          </div>
        </form>
      </section>

      <section className="ctn-listado-resumen" aria-label="Resumen del listado">
        <div><span>Total de notarios</span><strong>{total.toLocaleString("es-ES")}</strong></div>
        <div><span>Resultados en esta página</span><strong>{items.length}</strong></div>
        <div><span>Página actual</span><strong>{pagina} / {totalPaginas}</strong></div>
        <div><span>Estado</span><strong>{cargando ? "Cargando" : error ? "Con incidencias" : "Actualizado"}</strong></div>
      </section>

      {error && <div className="ctn-alerta-error" role="alert"><strong>No se ha podido completar la operación.</strong><span>{error}</span></div>}

      <section className="ctn-tabla-contenedor">
        <div className="ctn-tabla-cabecera">
          <div><h2>Notarios</h2><p>{total.toLocaleString("es-ES")} resultados encontrados</p></div>
        </div>
        <div className="ctn-tabla-scroll">
          <table className="ctn-tabla">
            <thead><tr>
              <th><button type="button" className="ctn-orden" onClick={() => ordenarPor("id")}>ID {indicadorOrden("id")}</button></th>
              <th><button type="button" className="ctn-orden" onClick={() => ordenarPor("nombre_completo")}>Notario {indicadorOrden("nombre_completo")}</button></th>
              <th><button type="button" className="ctn-orden" onClick={() => ordenarPor("nif")}>NIF {indicadorOrden("nif")}</button></th>
              <th><button type="button" className="ctn-orden" onClick={() => ordenarPor("municipio")}>Municipio {indicadorOrden("municipio")}</button></th>
              <th><button type="button" className="ctn-orden" onClick={() => ordenarPor("provincia")}>Provincia {indicadorOrden("provincia")}</button></th>
              <th>VC</th><th>Apoderado</th>
              <th><button type="button" className="ctn-orden" onClick={() => ordenarPor("notario_asociado")}>Notario asociado {indicadorOrden("notario_asociado")}</button></th>
              <th>Distancia</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {cargando && items.length === 0 ? <tr><td colSpan={10} className="ctn-tabla-vacio">Cargando notarios…</td></tr>
                : filasOrdenadas.length === 0 ? <tr><td colSpan={10} className="ctn-tabla-vacio">No hay notarios que coincidan con los filtros.</td></tr>
                  : filasOrdenadas.map((item) => <tr key={item.id}>
                    <td>{texto(item.id)}</td>
                    <td><strong>{texto(nombreNotario(item))}</strong></td>
                    <td>{texto(item.nif)}</td>
                    <td>{texto(item.municipio)}</td>
                    <td>{texto(item.provincia)}</td>
                    <td><span className={`ctn-etiqueta ${String(item.vc || "").toUpperCase() === "SI" || String(item.vc || "").toLowerCase() === "sí" ? "ctn-etiqueta-si" : "ctn-etiqueta-neutra"}`}>{texto(item.vc)}</span></td>
                    <td>{texto(item.apoderado)}</td>
                    <td>{texto(listaAsociados(item))}</td>
                    <td>{item.distancia_km == null ? "—" : `${Number(item.distancia_km).toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`}</td>
                    <td><button type="button" className="ctn-btn ctn-btn-primary ctn-btn-small" onClick={() => setNotariaSeleccionada(item)}>Ver ficha</button></td>
                  </tr>)}
            </tbody>
          </table>
        </div>
        <footer className="ctn-paginacion">
          <span>Mostrando {items.length ? (pagina - 1) * PAGE_SIZE + 1 : 0}–{Math.min((pagina - 1) * PAGE_SIZE + items.length, total)} de {total}</span>
          <div className="ctn-paginacion-acciones">
            <button type="button" className="ctn-btn ctn-btn-secondary ctn-btn-small" onClick={() => setPagina(1)} disabled={pagina <= 1 || cargando}>« Primera</button>
            <button type="button" className="ctn-btn ctn-btn-secondary ctn-btn-small" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1 || cargando}>‹ Anterior</button>
            <span className="ctn-pagina-indicador">Página {pagina} de {totalPaginas}</span>
            <button type="button" className="ctn-btn ctn-btn-secondary ctn-btn-small" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas || cargando}>Siguiente ›</button>
            <button type="button" className="ctn-btn ctn-btn-secondary ctn-btn-small" onClick={() => setPagina(totalPaginas)} disabled={pagina >= totalPaginas || cargando}>Última »</button>
          </div>
        </footer>
      </section>

      {notariaSeleccionada && (
        <ModalCtnDetalle
          notaria={notariaSeleccionada}
          onClose={() => setNotariaSeleccionada(null)}
          onCerrar={() => setNotariaSeleccionada(null)}
        />
      )}
    </main>
  );
}
