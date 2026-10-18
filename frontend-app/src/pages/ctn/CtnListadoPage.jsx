import { useCallback, useEffect, useMemo, useState } from "react";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";
import "../../css/CtnListadoPage.css";

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
  if (estado === "si") return { texto: "Sí", clase: "ctn-etiqueta-si" };
  if (estado === "no") return { texto: "No", clase: "ctn-etiqueta-neutra" };
  return { texto: texto(valor), clase: "ctn-etiqueta-neutra" };
}

export default function CtnListadoPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const [notariaSeleccionada, setNotariaSeleccionada] = useState(null);
  const [cambiandoAcceso, setCambiandoAcceso] = useState(null);
  const [accesosEncargaGest, setAccesosEncargaGest] = useState([]);
  const [notariaAccesoEncargaGest, setNotariaAccesoEncargaGest] = useState(null);
  const [passwordEncargaGest, setPasswordEncargaGest] = useState("");
  const [habilitadoEncargaGest, setHabilitadoEncargaGest] = useState(false);
  const [guardandoEncargaGest, setGuardandoEncargaGest] = useState(false);
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
    async (paginaSolicitada = pagina, filtrosActuales = filtrosAplicados) => {
      setCargando(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(paginaSolicitada),
          page_size: String(PAGE_SIZE),
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
        console.error("Error cargando listado CTN:", err);
        setItems([]);
        setTotal(0);
        setError(leerDetalleError(err, "No se ha podido cargar el listado de notarios."));
      } finally {
        setCargando(false);
      }
    },
    [pagina, filtrosAplicados]
  );

  useEffect(() => {
    cargarListado(pagina, filtrosAplicados);
  }, [pagina, filtrosAplicados, cargarListado]);

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
    const vacios = { ...filtrosIniciales };
    setFiltros(vacios);
    setFiltrosAplicados(vacios);
    setPagina(1);
  };

  const ordenarPor = (campo) => setOrden((actual) => ({
    campo,
    direccion: actual.campo === campo && actual.direccion === "asc" ? "desc" : "asc",
  }));

  const indicadorOrden = (campo) => {
    if (orden.campo !== campo) return "↕";
    return orden.direccion === "asc" ? "↑" : "↓";
  };

  const cambiarAccesoNotarGest = async (notaria) => {
    const nuevoEstado = !Boolean(notaria.notargest_habilitado);
    if (!window.confirm(`¿Quieres ${nuevoEstado ? "habilitar" : "deshabilitar"} NotarGest para ${nombreNotario(notaria)}?`)) return;
    setCambiandoAcceso(notaria.id);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/ctn/notarias/${notaria.id}/notargest?habilitado=${nuevoEstado}`, {
        method: "PUT", headers: cabecerasConToken({ Accept: "application/json" }), credentials: "include",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.detail || `Error HTTP ${response.status}`);
      setItems((actuales) => actuales.map((item) => item.id === notaria.id ? { ...item, notargest_habilitado: nuevoEstado } : item));
    } catch (err) {
      setError(leerDetalleError(err, "No se ha podido actualizar el acceso a NotarGest."));
    } finally { setCambiandoAcceso(null); }
  };

  const abrirAccesoEncargaGest = (notaria) => {
    const existente = accesosEncargaGest.find((acceso) => Number(acceso.notaria_id) === Number(notaria.id));
    setNotariaAccesoEncargaGest(notaria);
    setPasswordEncargaGest("");
    setHabilitadoEncargaGest(Boolean(existente?.habilitado));
    setErrorEncargaGest("");
  };

  const guardarAccesoEncargaGest = async (event) => {
    event.preventDefault();
    if (!notariaAccesoEncargaGest) return;
    const existente = accesosEncargaGest.find((acceso) => Number(acceso.notaria_id) === Number(notariaAccesoEncargaGest.id));
    if (!existente?.tiene_acceso && passwordEncargaGest.length < 10) {
      setErrorEncargaGest("Para crear el acceso inicial, introduce una contraseña de al menos 10 caracteres.");
      return;
    }
    setGuardandoEncargaGest(true);
    setErrorEncargaGest("");
    try {
      const response = await fetch(`${API_BASE}/encargagest/accesos`, {
        method: "POST",
        headers: cabecerasConToken({ "Content-Type": "application/json", Accept: "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          notaria_id: Number(notariaAccesoEncargaGest.id),
          password: passwordEncargaGest,
          habilitado: habilitadoEncargaGest,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.detail || `Error HTTP ${response.status}`);
      const responseAccesos = await fetch(`${API_BASE}/encargagest/accesos`, {
        headers: cabecerasConToken({ Accept: "application/json" }),
        credentials: "include",
      });
      const data = await responseAccesos.json().catch(() => []);
      if (!responseAccesos.ok) throw new Error(data?.detail || `Error HTTP ${responseAccesos.status}`);
      setAccesosEncargaGest(Array.isArray(data) ? data : []);
      setNotariaAccesoEncargaGest(null);
      setPasswordEncargaGest("");
    } catch (err) {
      setErrorEncargaGest(leerDetalleError(err, "No se ha podido guardar el acceso a EncargaGest."));
    } finally {
      setGuardandoEncargaGest(false);
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
            <label>Buscar notario
              <input value={filtros.q} onChange={(e) => cambiarFiltro("q", e.target.value)} placeholder="Nombre, apellidos, NIF o código" />
            </label>
            <label>Provincia
              <input value={filtros.provincia} onChange={(e) => cambiarFiltro("provincia", e.target.value)} placeholder="Provincia" />
            </label>
            <label>Municipio
              <input value={filtros.municipio} onChange={(e) => cambiarFiltro("municipio", e.target.value)} placeholder="Municipio" />
            </label>
            <label>Notario asociado
              <input value={filtros.asociado} onChange={(e) => cambiarFiltro("asociado", e.target.value)} placeholder="Nombre del asociado" />
            </label>
            <label>Apoderado
              <input value={filtros.apoderado} onChange={(e) => cambiarFiltro("apoderado", e.target.value)} placeholder="Apoderado" />
            </label>
            <label>Videoconferencia (VC)
              <select value={filtros.vc} onChange={(e) => cambiarFiltro("vc", e.target.value)}>
                <option value="">Todos</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
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
        <div className="ctn-tabla-cabecera"><div><h2>Notarios</h2><p>{total.toLocaleString("es-ES")} resultados encontrados</p></div></div>
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
              <th>Acceso NotarGest</th><th>Acceso EncargaGest</th><th>Distancia</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {cargando && items.length === 0 ? (
                <tr><td colSpan={12} className="ctn-tabla-vacio">Cargando notarios…</td></tr>
              ) : filasOrdenadas.length === 0 ? (
                <tr><td colSpan={12} className="ctn-tabla-vacio">No hay notarios que coincidan con los filtros.</td></tr>
              ) : filasOrdenadas.map((item) => {
                const vc = etiquetaVc(item.vc);
                return (
                  <tr key={item.id}>
                    <td>{texto(item.id)}</td>
                    <td><strong>{texto(nombreNotario(item))}</strong></td>
                    <td>{texto(item.nif)}</td><td>{texto(item.municipio)}</td><td>{texto(item.provincia)}</td>
                    <td><span className={`ctn-etiqueta ${vc.clase}`}>{vc.texto}</span></td>
                    <td>{texto(item.apoderado)}</td><td>{texto(listaAsociados(item))}</td>
                    <td><button type="button" className={`ctn-btn ctn-btn-small ${item.notargest_habilitado ? "ctn-btn-primary" : "ctn-btn-secondary"}`} onClick={() => cambiarAccesoNotarGest(item)} disabled={cambiandoAcceso === item.id || !String(item.nif || "").trim()} title={!item.nif ? "Esta notaría no tiene NIF/DNI registrado" : ""}>{cambiandoAcceso === item.id ? "Guardando…" : item.notargest_habilitado ? "✓ Habilitado" : "Habilitar"}</button></td>\n                    <td>{(() => { const acceso = accesosEncargaGest.find((x) => Number(x.notaria_id) === Number(item.id)); return <button type="button" className={`ctn-btn ctn-btn-small ${(acceso?.tiene_acceso && acceso?.habilitado) ? "ctn-btn-primary" : "ctn-btn-secondary"}`} onClick={() => abrirAccesoEncargaGest(item)} disabled={!String(item.nif || "").trim()} title={!item.nif ? "Esta notaría no tiene NIF/DNI registrado" : "Configurar usuario, contraseña y habilitación de EncargaGest"}>{(acceso?.tiene_acceso && acceso?.habilitado) ? "✓ Habilitado" : acceso?.tiene_acceso ? "Deshabilitado" : "Configurar acceso"}</button>; })()}</td>
                    <td>{item.distancia_km == null ? "—" : `${Number(item.distancia_km).toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`}</td>
                    <td><button type="button" className="ctn-btn ctn-btn-primary ctn-btn-small" onClick={() => setNotariaSeleccionada(item)}>Ver ficha</button></td>
                  </tr>
                );
              })}
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

      {notariaAccesoEncargaGest && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={guardarAccesoEncargaGest} className="my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[9px] font-extrabold tracking-[0.18em] text-amber-700">CTN · ENCARGAGEST</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Acceso de la notaría</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Configura las credenciales externas para que esta notaría pueda entrar en EncargaGest.</p>
              </div>
              <button type="button" onClick={() => setNotariaAccesoEncargaGest(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500" aria-label="Cerrar">×</button>
            </div>
            <div className="space-y-4 p-5 sm:p-7">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Notaría CTN</p>
                <p className="mt-1 font-black text-slate-900">{nombreNotario(notariaAccesoEncargaGest)}</p>
                <p className="mt-1 text-xs text-slate-600">NIF: {notariaAccesoEncargaGest.nif || "No registrado"}</p>
                <p className="mt-2 text-xs text-slate-500">El usuario de acceso se genera automáticamente a partir del NIF registrado en CTN.</p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{accesosEncargaGest.find((x) => Number(x.notaria_id) === Number(notariaAccesoEncargaGest.id))?.tiene_acceso ? "Cambiar contraseña (opcional)" : "Contraseña inicial *"}</span>
                <input type="password" autoComplete="new-password" minLength={10} value={passwordEncargaGest} onChange={(event) => setPasswordEncargaGest(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100" placeholder="Mínimo 10 caracteres" />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
                <input type="checkbox" checked={habilitadoEncargaGest} onChange={(event) => setHabilitadoEncargaGest(event.target.checked)} />
                Permitir a esta notaría acceder al portal EncargaGest
              </label>
              {errorEncargaGest && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800" role="alert">{errorEncargaGest}</p>}
              <p className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-900">La notaría solo podrá consultar sus propios encargos. Si ya existe una cuenta, deja la contraseña vacía para conservarla.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-7">
              <button type="button" onClick={() => setNotariaAccesoEncargaGest(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancelar</button>
              <button type="submit" disabled={guardandoEncargaGest || !String(notariaAccesoEncargaGest.nif || "").trim()} className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-amber-950 disabled:opacity-50">{guardandoEncargaGest ? "Guardando acceso…" : "Guardar acceso"}</button>
            </div>
          </form>
        </div>
      )}
\n      {notariaSeleccionada && (
        <ModalCtnDetalle open={Boolean(notariaSeleccionada)} notaria={notariaSeleccionada} onClose={() => setNotariaSeleccionada(null)} />
      )}
    </main>
  );
}
