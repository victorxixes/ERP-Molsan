import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import axios from "../../api/axios";
import "../../css/Cancelagest.css";
import "../../css/CancelagestUnified.css";

const MODULOS = [
  { titulo: "Expedientes", descripcion: "Consultar expedientes y su situación actual.", icono: "▤", ruta: "/expedientes" },
  { titulo: "Agenda", descripcion: "Revisar citas y actividad programada.", icono: "▦", ruta: "/agenda" },
  { titulo: "Informes", descripcion: "Acceder a informes y seguimiento de gestión.", icono: "▥", ruta: "/informes" },
  { titulo: "ApoderaGest", descripcion: "Encargos, firmas y actividad del apoderado.", icono: "AG", ruta: "/apoderagest" },
  { titulo: "NotarGest", descripcion: "Seguimiento del trabajo y estados notariales.", icono: "NG", ruta: "/notargest" },
  { titulo: "CTN", descripcion: "Consultar el catálogo de notarías y sus relaciones.", icono: "◇", ruta: "/ctn" },
];

const fmtNumero = (n) => Number(n || 0).toLocaleString("es-ES");
const fmtDias = (n) => n == null || !Number.isFinite(Number(n)) ? "—" : `${Number(n).toLocaleString("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} días`;
const fmtMes = (v) => {
  if (!v || !/^\d{4}-\d{2}$/.test(v)) return v || "";
  const [y, m] = v.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
};

function GraficoBarras({ items, labelKey, valueKey, formatter = fmtNumero, emptyText }) {
  const max = Math.max(1, ...items.map((x) => Number(x[valueKey] || 0)));
  if (!items.length) return <p className="cg-empty-chart">{emptyText}</p>;
  return <div className="cg-bars">
    {items.map((item) => {
      const valor = item[valueKey];
      const pct = valor == null ? 0 : Math.max(0, Math.min(100, (Number(valor) / max) * 100));
      return <div className="cg-bar-row" key={item[labelKey]}>
        <div className="cg-bar-label" title={item[labelKey]}>{item[labelKey]}</div>
        <div className="cg-bar-track"><div className={`cg-bar-fill${valor == null ? " is-empty" : ""}`} style={{ width: `${pct}%` }} /></div>
        <strong className="cg-bar-value">{formatter(valor)}</strong>
      </div>;
    })}
  </div>;
}

export default function Cancelagest() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await axios.get("/dashboard/expedientes/cancelagest");
      setDatos(data || {});
      setUltimaActualizacion(new Date());
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || "No se han podido cargar los indicadores de CancelaGest.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const fechaActual = useMemo(() => new Intl.DateTimeFormat("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date()), []);

  const firmasMensuales = (datos?.firmas_mensuales || []).slice(-12).map((x) => ({ ...x, mesLabel: fmtMes(x.mes) }));
  const categorias = datos?.categorias_firma || [];
  const tiempos = datos?.tiempos_circuito || [];

  const navegar = (label) => {
    if (label === "Dashboard") return;
    const rutas = { Expedientes: "/expedientes", Agenda: "/agenda", Mensajes: "/mensajes", CTN: "/ctn", Intranet: "/intranet", Informes: "/informes" };
    if (rutas[label]) navigate(rutas[label]);
  };

  return <div className="min-h-screen bg-[var(--erp-bg)] text-[var(--erp-text)]">
    <Sidebar
      brandName="CancelaGest"
      navigationItems={[
        { key: "dashboard", label: "Dashboard", icon: "home" },
        { key: "expedientes", label: "Expedientes", icon: "folder" },
        { key: "agenda", label: "Agenda", icon: "calendar" },
        { key: "informes", label: "Informes", icon: "chart" },
        { key: "mensajes", label: "Mensajes", icon: "chat" },
        { key: "ctn", label: "CTN", icon: "globe" },
        { key: "intranet", label: "Intranet", icon: "folder" },
      ]}
      activeNavigationItem="Dashboard"
      onNavigationItemClick={navegar}
    />
    <main className="cg-page">
      <header className="cg-hero">
        <div className="cg-hero-identidad">
          <div className="cg-logo"><img src="/img/logo.jpg" alt="MOLSAN" /></div>
          <div><div className="cg-eyebrow">MOLSAN ERP · PREMIUM 2027</div><h1>CancelaGest</h1><p>Centro de gestión de cancelaciones, provisiones, firmas y seguimiento registral.</p></div>
        </div>
        <div className="cg-hero-acciones">
          <div className="cg-fecha">{fechaActual}</div>
          <button type="button" className="cg-button-secondary" onClick={() => navigate("/modulos")}>▦ Ir a módulos</button>
          <button type="button" className="cg-button-primary" onClick={cargar} disabled={cargando}>{cargando ? "Actualizando…" : "↻ Actualizar datos"}</button>
        </div>
      </header>

      {error && <div className="cg-error" role="alert"><strong>No se han podido cargar los indicadores.</strong><p>{error}</p><button onClick={cargar}>Reintentar</button></div>}

      <section className="cg-kpis">
        <article className="cg-kpi"><span>Cancelaciones registradas</span><strong>{cargando && !datos ? "…" : fmtNumero(datos?.total_cancelaciones)}</strong><small>Expedientes identificados como cancelación</small></article>
        <article className="cg-kpi"><span>Firmas realizadas</span><strong>{cargando && !datos ? "…" : fmtNumero(datos?.total_firmadas)}</strong><small>Cancelaciones con fecha de firma</small></article>
        <article className="cg-kpi"><span>Cancelaciones con provisión</span><strong>{fmtNumero(categorias.find((x) => x.key === "con_provision")?.total)}</strong><small>Con provisión identificada</small></article>
        <article className="cg-kpi"><span>Cancelaciones sin provisión</span><strong>{fmtNumero(categorias.find((x) => x.key === "sin_provision")?.total)}</strong><small>Sin provisión identificada</small></article>
      </section>

      <section className="cg-section">
        <div className="cg-section-heading"><div><span className="cg-kicker">ACCESOS DIRECTOS</span><h2>Módulos de trabajo</h2><p>Accede a las herramientas principales del ERP sin salir del entorno corporativo.</p></div></div>
        <div className="cg-module-grid">{MODULOS.map((modulo) => <button type="button" className="cg-module-card" key={modulo.titulo} onClick={() => navigate(modulo.ruta)}>
          <span className="cg-module-icon">{modulo.icono}</span><span className="cg-module-text"><strong>{modulo.titulo}</strong><small>{modulo.descripcion}</small></span><span className="cg-module-arrow">↗</span>
        </button>)}</div>
      </section>

      <section className="cg-charts-grid">
        <article className="cg-panel">
          <div className="cg-section-heading"><div><span className="cg-kicker">ACTIVIDAD</span><h2>Firmas realizadas</h2><p>Firmas registradas por mes, según la fecha de firma del expediente.</p></div></div>
          {firmasMensuales.length ? <div className="cg-month-chart">{firmasMensuales.map((item) => {
            const max = Math.max(1, ...firmasMensuales.map((x) => Number(x.total || 0)));
            return <div className="cg-month-column" key={item.mes}><strong>{fmtNumero(item.total)}</strong><div className="cg-month-bar-wrap"><div className="cg-month-bar" style={{ height: `${Math.max(4, Number(item.total || 0) / max * 100)}%` }} /></div><small>{item.mesLabel}</small></div>;
          })}</div> : <p className="cg-empty-chart">{cargando ? "Cargando firmas…" : "Todavía no hay firmas registradas para mostrar."}</p>}
        </article>
        <article className="cg-panel">
          <div className="cg-section-heading"><div><span className="cg-kicker">MEDIA DE FIRMA</span><h2>Envío hasta firma</h2><p>Días naturales entre la fecha de envío a notaría y la fecha de firma, separados por tipo de cancelación.</p></div></div>
          <GraficoBarras items={categorias.map((x) => ({ ...x, media: x.media_dias_envio_firma }))} labelKey="nombre" valueKey="media" formatter={fmtDias} emptyText={cargando ? "Calculando medias…" : "No hay expedientes con fecha de envío y firma para calcular la media."} />
          <div className="cg-category-counts">{categorias.map((x) => <div key={x.key}><span>{x.nombre}</span><strong>{fmtNumero(x.firmadas)} firmas</strong><small>{fmtNumero(x.casos_media)} casos con ambas fechas</small></div>)}</div>
        </article>
      </section>

      <section className="cg-panel cg-circuito-panel">
        <div className="cg-section-heading"><div><span className="cg-kicker">CIRCUITO COMPLETO</span><h2>Tiempo medio entre hitos</h2><p>Las medias se calculan solo con expedientes que tienen ambas fechas y cuya secuencia no produce un intervalo negativo.</p></div></div>
        <GraficoBarras items={tiempos.map((x) => ({ ...x, media: x.media_dias }))} labelKey="nombre" valueKey="media" formatter={fmtDias} emptyText={cargando ? "Calculando tiempos…" : "Todavía no hay suficientes fechas para calcular los tiempos del circuito."} />
        <div className="cg-circuito-nota"><strong>Hitos medidos</strong><span>Firma → presentación tributaria</span><span>Presentación tributaria → presentación en Registro</span><span>Presentación en Registro → inscripción</span><span>Inscripción → cierre</span></div>
      </section>

      <footer className="cg-footer">MOLSAN ERP · PREMIUM 2027 · CancelaGest{ultimaActualizacion ? ` · Actualizado a las ${ultimaActualizacion.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}</footer>
    </main>
  </div>;
}
