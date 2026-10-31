import { useEffect, useMemo, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useNavigate } from "react-router-dom";
import ModalCtnDetalle from "../../components/ctn/ModalCtnDetalle";

const API_BASE = (import.meta.env.VITE_API_URL || "https://agenda-intranet-b.onrender.com/api").replace(/\/$/, "");
function headers() {
  const token = localStorage.getItem("token");
  return { Accept: "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) };
}
function mensajeLegible(valor, fallback) {
  if (typeof valor === "string" && valor.trim()) return valor;
  if (valor && typeof valor === "object") {
    if (typeof valor.detail === "string") return valor.detail;
    if (typeof valor.message === "string") return valor.message;
    if (Array.isArray(valor)) return valor.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join("; ");
    try { return JSON.stringify(valor); } catch { return fallback; }
  }
  return fallback;
}
function nombre(n) {
  return [n?.nombre, n?.apellidos].filter(Boolean).join(" ").trim() || n?.nombre_completo || n?.notario || "";
}

export default function AccesosNotariales() {
  const navigate = useNavigate();
  const [notarias, setNotarias] = useState([]);
  const [resumen, setResumen] = useState({ notargest: null, encargagest: null });
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true); setError("");
      try {
        const pageSize = 200;
        const cargarPagina = async (pagina) => {
          const r = await fetch(API_BASE + "/ctn/notarias?page=" + pagina + "&page_size=" + pageSize, {
            headers: headers(), credentials: "include",
          });
          const body = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(mensajeLegible(body?.detail ?? body, "No se ha podido cargar el listado de notarías (HTTP " + r.status + ")."));
          const lista = Array.isArray(body) ? body : body.items || body.notarias || body.results || [];
          return { lista, total: Number(body?.total ?? body?.count ?? lista.length) };
        };
        const primera = await cargarPagina(1);
        let listaCompleta = [...primera.lista];
        const paginas = Math.ceil(primera.total / pageSize);
        for (let pagina = 2; pagina <= paginas; pagina += 1) {
          const resultado = await cargarPagina(pagina);
          listaCompleta = listaCompleta.concat(resultado.lista);
        }
        // Evita duplicados si el catálogo cambia mientras se recorren las páginas.
        const unicas = Array.from(new Map(listaCompleta.map((n) => [String(n.id), n])).values());
        if (activo) setNotarias(unicas);
      } catch (e) { if (activo) setError(mensajeLegible(e?.message, "No se ha podido cargar el listado de notarías.")); }
      finally { if (activo) setCargando(false); }
    })();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const r = await fetch(API_BASE + "/ctn/accesos-portales/resumen", { headers: headers(), credentials: "include" });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error("No se han podido cargar los contadores.");
        if (activo) setResumen({ notargest: body?.notargest_habilitados ?? null, encargagest: body?.encargagest_habilitados ?? null });
      } catch { if (activo) setResumen({ notargest: null, encargagest: null }); }
    })();
    return () => { activo = false; };
  }, []);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    if (!q) return notarias;
    return notarias.filter(n => [nombre(n), n?.nif, n?.codigo, n?.municipio, n?.provincia].some(v => String(v || "").toLocaleLowerCase("es").includes(q)));
  }, [notarias, busqueda]);

  const abrir = async (n) => {
    setError("");
    try {
      const r = await fetch(API_BASE + "/ctn/notarias/" + n.id + "/accesos-portales", { headers: headers(), credentials: "include" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(mensajeLegible(body?.detail ?? body, "No tienes permiso para gestionar accesos notariales (HTTP " + r.status + ")."));
      if (!body?.permisos?.notargestweb?.ver && !body?.permisos?.encargagestweb?.ver) throw new Error("Tu usuario no tiene permisos para consultar accesos notariales.");
      setSeleccionada(n);
    } catch (e) { setError(mensajeLegible(e?.message, "No se ha podido comprobar el permiso de acceso.")); }
  };

  return (
    <main className="erp-page" aria-busy={cargando}>
      <MolsanPageHeader mark="AN" title="Accesos notariales" description="Gestión centralizada y restringida de accesos a NotarGest y EncargaGest." />
      <div className="flex justify-end"><button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => navigate("/herramientas/utilidades")}>← Volver a Utilidades</button></div>
      <section className="accesos-notariales-resumen" aria-label="Resumen de accesos habilitados">
        <article className="accesos-notariales-resumen-card">
          <span aria-hidden="true">🔐</span>
          <div><p>Notarios habilitados en NotarGest</p><strong>{resumen.notargest === null ? "—" : resumen.notargest}</strong><small>Acceso activo al portal</small></div>
        </article>
        <article className="accesos-notariales-resumen-card">
          <span aria-hidden="true">📋</span>
          <div><p>Notarios habilitados en EncargaGest</p><strong>{resumen.encargagest === null ? "—" : resumen.encargagest}</strong><small>Acceso activo al portal</small></div>
        </article>
      </section>
      <section className=" molsan-panel" aria-label="Buscar notaría">
        <h2>Buscar notaría</h2>
        <label className="block">Nombre, apellidos, NIF, código, municipio o provincia
          <input className="molsan-field__control mt-2 w-full" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Escribe para buscar una notaría…" />
        </label>
      </section>
      {error && <div role="alert">{error}</div>}
      <section>
        <div>
          <table>
            <thead><tr><th>Notario</th><th>NIF</th><th>Municipio</th><th>Provincia</th><th>Gestión</th></tr></thead>
            <tbody>
              {cargando ? <tr><td colSpan="5">Cargando notarías…</td></tr> :
                resultados.length ? resultados.map(n => <tr key={n.id}>
                  <td><strong>{nombre(n) || "Notaría " + n.id}</strong></td><td>{n.nif || "—"}</td><td>{n.municipio || "—"}</td><td>{n.provincia || "—"}</td>
                  <td><button type="button" onClick={() => abrir(n)}>Gestionar accesos</button></td>
                </tr>) : <tr><td colSpan="5">No se han encontrado notarías.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {seleccionada && <ModalCtnDetalle open={true} notaria={seleccionada} mostrarAccesosPortales={true} onClose={() => setSeleccionada(null)} />}
    </main>
  );
}
