import { useCallback, useEffect, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://agenda-intranet-b.onrender.com/api"
).replace(/\/$/, "");

const PAGE_SIZE = 15;

function cabecerasConToken(extra = {}) {
  const token = localStorage.getItem("token");
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function texto(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return String(valor);
}

function nombreNotario(item) {
  return (
    [item?.nombre, item?.apellidos].filter(Boolean).join(" ").trim() ||
    item?.nombre_completo || item?.notario || ""
  );
}

function listaAsociados(item) {
  const asociados = item?.notarios_asociados;
  if (Array.isArray(asociados)) {
    return asociados
      .map((a) =>
        typeof a === "string"
          ? a
          : nombreNotario(a) || a?.nombre_completo || `ID ${a?.id ?? a?.asociado_id ?? ""}`
      )
      .filter(Boolean)
      .join(", ");
  }
  return item?.notario_asociado || "";
}

function leerDetalleError(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail) return JSON.stringify(detail);
  return error?.message || fallback;
}

function normalizarVc(valor) {
  const v = String(valor ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (["si", "s", "yes", "true", "1", "vc", "video"].includes(v) || v.includes("videoconfer")) return "si";
  if (["no", "n", "false", "0", "presencial"].includes(v)) return "no";
  return "";
}

function etiquetaVc(valor) {
  const estado = normalizarVc(valor);
  if (estado === "si") return { texto: "Sí", clase: "" };
  if (estado === "no") return { texto: "No", clase: "" };
  return { texto: texto(valor), clase: "" };
}

export default function CtnListadoPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const [notariaSeleccionada, setNotariaSeleccionada] = useState(null);
  const [accesosEncargaGest, setAccesosEncargaGest] = useState([]);
  const [errorEncargaGest, setErrorEncargaGest] = useState("");

  const [orden, setOrden] = useState({ campo: "apellidos", direccion: "asc" });
  const filtrosIniciales = {
    q: "",
    provincia: "",
    municipio: "",
    vc: "",
    apoderado: "",
    asociado: "",
  };
  const [filtros, setFiltros] = useState({ ...filtrosIniciales });
  const [filtrosAplicados, setFiltrosAplicados] = useState({ ...filtrosIniciales });
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const cargarListado = useCallback(
    async (paginaSolicitada = pagina, filtrosActuales = filtrosAplicados, ordenActual = orden) => {
      setCargando(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(paginaSolicitada),
          page_size: String(PAGE_SIZE),
          sort_by: ordenActual.campo,
          sort_order: ordenActual.direccion,
        });
        Object.entries(filtrosActuales).forEach(([key, value]) => {
          if (value?.trim()) params.set(key, value.trim());
        });

        const response = await fetch(`${API_BASE}/ctn/notarias?${params.toString()}`, {
          headers: cabecerasConToken({ Accept: "application/json" }),
          credentials: "include",
        });

        if (!response.ok) {
          let mensaje = `Error HTTP ${response.status} al cargar el listado CTN.`;
          try {
            const body = await response.json();
            if (body?.detail) mensaje = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
          } catch {
            // Puede que el servidor devuelva una respuesta no JSON.
          }
          throw new Error(mensaje);
        }

        const data = await response.json();
        const filas = Array.isArray(data) ? data : data.items || data.notarias || data.results || [];
        setItems(filas);
        setTotal(Number(data.total ?? data.count ?? filas.length));
        setPagina(Number(data.page ?? paginaSolicitada));
      } catch (err) {
        console.error("No se ha podido cargar el listado CTN.");
        setItems([]);
        setTotal(0);
        setError(leerDetalleError(err, "No se ha podido cargar el listado de notarios."));
      } finally {
        setCargando(false);
      }
    },
    [pagina, filtrosAplicados, orden]
  );

  useEffect(() => {
    cargarListado(pagina, filtrosAplicados, orden);
  }, [pagina, filtrosAplicados, orden, cargarListado]);

  useEffect(() => {
    let activo = true;
    fetch(`${API_BASE}/encargagest/accesos`, {
      headers: cabecerasConToken({ Accept: "application/json" }),
      credentials: "include",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.detail || `Error HTTP ${response.status}`);
        return body;
      })
      .then((data) => { if (activo) setAccesosEncargaGest(Array.isArray(data) ? data : []); })
      .catch((err) => { if (activo) setErrorEncargaGest(leerDetalleError(err, "No se ha podido consultar el estado de los accesos EncargaGest.")); });
    return () => { activo = false; };
  }, []);

  const cambiarFiltro = (campo, valor) => setFiltros((actual) => ({ ...actual, [campo]: valor }));

  const aplicarFiltros = (event) => {
    event?.preventDefault();
    setPagina(1);
    setFiltrosAplicados({ ...filtros });
  };

  const limpiarFiltros = () => {
    const vacios = { ...filtrosIniciales };
    setFiltros(vacios);
    setFiltrosAplicados(vacios);
    setPagina(1);
  };

  const ordenarPor = (campo) => {
    setPagina(1);
    setOrden((actual) => ({
      campo,
      direccion: actual.campo === campo && actual.direccion === "asc" ? "desc" : "asc",
    }));
  };

  const indicadorOrden = (campo) => {
    if (orden.campo !== campo) return "↕";
    return orden.direccion === "asc" ? "↑" : "↓";
  };

  const cerrarFichaNotaria = async () => {
    setNotariaSeleccionada(null);
    await cargarListado(pagina, filtrosAplicados);
    try {
      const response = await fetch(`${API_BASE}/encargagest/accesos`, {
        headers: cabecerasConToken({ Accept: "application/json" }),
        credentials: "include",
      });
      const data = await response.json().catch(() => []);
      if (response.ok) setAccesosEncargaGest(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("No se ha podido actualizar el estado de accesos EncargaGest.");
    }
  };

  const exportarExcel = async () => {
    setExportando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filtrosAplicados).forEach(([key, value]) => {
        if (value?.trim()) params.set(key, value.trim());
      });
      const query = params.toString();
      const response = await fetch(`${API_BASE}/ctn/exportar-excel${query ? `?${query}` : ""}`, {
        headers: cabecerasConToken({
          Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        credentials: "include",
      });
      if (!response.ok) {
        let mensaje = `Error HTTP ${response.status} al exportar Excel.`;
        try {
          const body = await response.json();
          if (body?.detail) mensaje = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        } catch {
          // Puede que el servidor devuelva una respuesta no JSON.
        }
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
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("No se ha podido exportar el Excel de CTN.");
      setError(leerDetalleError(err, "No se ha podido exportar el Excel."));
    } finally {
      setExportando(false);
    }
  };

  return (
    <main className="erp-page ctn-listado-page min-w-0 space-y-6" aria-busy={cargando}>
      <MolsanPageHeader mark="CTN" title="Listado CTN" description="Consulta, filtra y gestiona los notarios y sus asociaciones." />
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="molsan-btn molsan-export-excel" onClick={exportarExcel} disabled={exportando}>
          <><span className="molsan-export-excel__icon" aria-hidden="true">📗</span>{exportando ? "Preparando Excel…" : "Exportar a Excel"}</>
        </button>
        <button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => cargarListado(pagina, filtrosAplicados)} disabled={cargando}>
          {cargando ? "Actualizando…" : "↻ Actualizar"}
        </button>
      </div>

      <section className=" molsan-panel" aria-label="Filtros del listado CTN">
        <h2>Filtros de búsqueda</h2>
        <form className="molsan-filter-bar" onSubmit={aplicarFiltros}>
          <div>
            <label>Buscar notario
              <input className="molsan-field__control" value={filtros.q} onChange={(e) => cambiarFiltro("q", e.target.value)} placeholder="Nombre, apellidos, NIF o código" />
            </label>
            <label>Provincia
              <input className="molsan-field__control" value={filtros.provincia} onChange={(e) => cambiarFiltro("provincia", e.target.value)} placeholder="Provincia" />
            </label>
            <label>Municipio
              <input className="molsan-field__control" value={filtros.municipio} onChange={(e) => cambiarFiltro("municipio", e.target.value)} placeholder="Municipio" />
            </label>
            <label>Notario asociado
              <input className="molsan-field__control" value={filtros.asociado} onChange={(e) => cambiarFiltro("asociado", e.target.value)} placeholder="Nombre del asociado" />
            </label>
            <label>Apoderado
              <input className="molsan-field__control" value={filtros.apoderado} onChange={(e) => cambiarFiltro("apoderado", e.target.value)} placeholder="Apoderado" />
            </label>
            <label>Videoconferencia (VC)
              <select className="molsan-field__control" value={filtros.vc} onChange={(e) => cambiarFiltro("vc", e.target.value)}>
                <option value="">Todos</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </label>
          </div>
          <div className="molsan-filter-actions">
            <button type="button" className="molsan-btn molsan-btn--secondary" onClick={limpiarFiltros}>Limpiar</button>
            <button type="submit" className="molsan-btn molsan-btn--primary">Buscar</button>
          </div>
        </form>
      </section>

      <section aria-label="Resumen del listado">
        <div><span>Total de notarios</span><strong>{total.toLocaleString("es-ES")}</strong></div>
        <div><span>Resultados en esta página</span><strong>{items.length}</strong></div>
        <div><span>Página actual</span><strong>{pagina} / {totalPaginas}</strong></div>
        <div><span>Estado</span><strong>{cargando ? "Cargando" : error ? "Con incidencias" : "Actualizado"}</strong></div>
      </section>

      {error && <div role="alert"><strong>No se ha podido completar la operación.</strong><span>{error}</span></div>}
      {errorEncargaGest && <div role="alert"><strong>No se ha podido consultar el estado de EncargaGest.</strong><span>{errorEncargaGest}</span></div>}

      <section className=" molsan-table-wrap">
        <div><div><h2>Notarios</h2><p>{total.toLocaleString("es-ES")} resultados encontrados</p></div></div>
        <div>
          <table className=" molsan-table">
            <thead><tr>
              <th><button type="button" onClick={() => ordenarPor("id")}>ID {indicadorOrden("id")}</button></th>
              <th><button type="button" onClick={() => ordenarPor("apellidos")}>Notario {indicadorOrden("apellidos")}</button></th>
              <th><button type="button" onClick={() => ordenarPor("nif")}>NIF {indicadorOrden("nif")}</button></th>
              <th><button type="button" onClick={() => ordenarPor("municipio")}>Municipio {indicadorOrden("municipio")}</button></th>
              <th><button type="button" onClick={() => ordenarPor("provincia")}>Provincia {indicadorOrden("provincia")}</button></th>
              <th><button type="button" onClick={() => ordenarPor("vc")}>VC {indicadorOrden("vc")}</button></th><th><button type="button" onClick={() => ordenarPor("apoderado")}>Apoderado {indicadorOrden("apoderado")}</button></th>
              <th><button type="button" onClick={() => ordenarPor("notario_asociado")}>Notario asociado {indicadorOrden("notario_asociado")}</button></th>
              <th><button type="button" onClick={() => ordenarPor("notargest_habilitado")}>Acceso NotarGest {indicadorOrden("notargest_habilitado")}</button></th><th><button type="button" onClick={() => ordenarPor("encargagest_habilitado")}>Acceso EncargaGest {indicadorOrden("encargagest_habilitado")}</button></th><th><button type="button" onClick={() => ordenarPor("distancia_km")}>Distancia {indicadorOrden("distancia_km")}</button></th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {cargando && items.length === 0 ? (
                <tr><td colSpan={12}>Cargando notarios…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={12}>No hay notarios que coincidan con los filtros.</td></tr>
              ) : items.map((item) => {
                const vc = etiquetaVc(item.vc);
                return (
                  <tr key={item.id}>
                    <td>{texto(item.id)}</td>
                    <td><strong>{texto(nombreNotario(item))}</strong></td>
                    <td>{texto(item.nif)}</td><td>{texto(item.municipio)}</td><td>{texto(item.provincia)}</td>
                    <td><span className={` ${vc.clase}`}>{vc.texto}</span></td>
                    <td>{texto(item.apoderado)}</td><td>{texto(listaAsociados(item))}</td>
                    <td><span className={` ${item.notargest_habilitado ? "" : ""}`} title="El acceso se gestiona desde la ficha de la notaría">{item.notargest_habilitado ? "✓ Habilitado" : "Deshabilitado"}</span></td>
                    <td>{errorEncargaGest ? <span title={errorEncargaGest}>No disponible</span> : (() => { const acceso = accesosEncargaGest.find((x) => Number(x.notaria_id) === Number(item.id)); const habilitado = Boolean(acceso?.tiene_acceso && acceso?.habilitado); const configurado = Boolean(acceso?.tiene_acceso); return <span className={` ${habilitado ? "" : ""}`} title="El acceso se gestiona desde la ficha de la notaría">{habilitado ? "✓ Habilitado" : configurado ? "Deshabilitado" : "Sin configurar"}</span>; })}</td>
                    <td>{item.distancia_km == null ? "—" : `${Number(item.distancia_km).toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`}</td>
                    <td><button type="button" className="   molsan-btn molsan-btn--primary molsan-btn--compact" onClick={() => setNotariaSeleccionada(item)}>Ver ficha</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer>
          <span>Mostrando {items.length ? (pagina - 1) * PAGE_SIZE + 1 : 0}–{Math.min((pagina - 1) * PAGE_SIZE + items.length, total)} de {total}</span>
          <div>
            <button type="button" className="   molsan-btn molsan-btn--secondary molsan-btn--compact" onClick={() => setPagina(1)} disabled={pagina <= 1 || cargando}>« Primera</button>
            <button type="button" onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1 || cargando}>‹ Anterior</button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button type="button" onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas || cargando}>Siguiente ›</button>
            <button type="button" onClick={() => setPagina(totalPaginas)} disabled={pagina >= totalPaginas || cargando}>Última »</button>
          </div>
        </footer>
      </section>

      {notariaSeleccionada && (
        <ModalCtnDetalle open={Boolean(notariaSeleccionada)} notaria={notariaSeleccionada} onClose={cerrarFichaNotaria} />
      )}
    </main>
  );
}
