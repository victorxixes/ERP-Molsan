import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { puedeVerModulo } from "../../utils/permisos";
import MODULOS_ERP from "../../config/modulos";
import axios from "../../api/axios";
import "../../css/Cancelagest.css";
import "../../css/CancelagestUnified.css";
import MolsanIcon from "../../components/ui/MolsanIcon";

const TARJETAS_DASHBOARD = [
  { key: "expedientes", descripcion: "Consultar expedientes y su situación actual.", icono: "▤" },
  { key: "agenda", descripcion: "Revisar citas y actividad programada.", icono: "▦" },
  { key: "informes", descripcion: "Acceder a informes y seguimiento de gestión.", icono: "▥" },
  { key: "apoderagest", descripcion: "Encargos, firmas y actividad del apoderado.", icono: "AG" },
  { key: "notargest", descripcion: "Seguimiento del trabajo y estados notariales.", icono: "NG" },
  { key: "ctn", descripcion: "Consultar el catálogo de notarías y sus relaciones.", icono: "◇" },
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

  // Los accesos del dashboard reutilizan nombres, rutas, iconos y claves
  // del catálogo central. La descripción y el icono ilustrativo son propios
  // de estas tarjetas; el permiso siempre se comprueba con la clave del catálogo.
  const modulosVisibles = TARJETAS_DASHBOARD
    .map((tarjeta) => {
      const modulo = MODULOS_ERP.find((item) => item.key === tarjeta.key && item.route);
      return modulo ? { ...modulo, ...tarjeta, titulo: modulo.label, ruta: modulo.route } : null;
    })
    .filter((modulo) => modulo && puedeVerModulo(modulo.key));

  return <main className="molsan-page-stack cg-page">
      <header className="cg-hero molsan-page-header">
        <div className="cg-hero-identidad">
          <div className="cg-logo molsan-page-header__mark"><img src="/img/logo.jpg" alt="MOLSAN" /></div>
          <div><div className="cg-eyebrow molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</div><h1>CancelaGest</h1><p className="molsan-page-header__description">Centro de gestión de cancelaciones, provisiones, firmas y seguimiento registral.</p></div>
        </div>
        <div className="cg-hero-acciones">
          <div className="cg-fecha">{fechaActual}</div>
          <button type="button" className="cg-button-primary" onClick={cargar} disabled={cargando}>{cargando ? "Actualizando…" : "↻ Actualizar datos"}</button>
        </div>
      </header>

      {error && <div className="cg-error" role="alert"><strong>No se han podido cargar los indicadores.</strong><p>{error}</p><button onClick={cargar}>Reintentar</button></div>}

      <section className="cg-kpis">
        <article className="erp-card cg-kpi"><span>Cancelaciones registradas</span><strong>{cargando && !datos ? "…" : fmtNumero(datos?.total_cancelaciones)}</strong><small>Expedientes identificados como cancelación</small></article>
        <article className="erp-card cg-kpi"><span>Firmas realizadas</span><strong>{cargando && !datos ? "…" : fmtNumero(datos?.total_firmadas)}</strong><small>Cancelaciones con fecha de firma</small></article>
        <article className="erp-card cg-kpi"><span>Cancelaciones con provisión</span><strong>{fmtNumero(categorias.find((x) => x.key === "con_provision")?.total)}</strong><small>Con provisión identificada</small></article>
        <article className="erp-card cg-kpi"><span>Cancelaciones sin provisión</span><strong>{fmtNumero(categorias.find((x) => x.key === "sin_provision")?.total)}</strong><small>Sin provisión identificada</small></article>
      </section>

      <section className="erp-card cg-section">
        <div className="cg-section-heading molsan-section-header"><div><span className="cg-kicker">ACCESOS DIRECTOS</span><h2>Módulos de trabajo</h2><p>Accede a las herramientas principales del ERP sin salir del entorno corporativo.</p></div></div>
        <div className="cg-module-grid">{modulosVisibles.map((modulo) => <button type="button" className="erp-card cg-module-card" key={modulo.titulo} onClick={() => navigate(modulo.ruta)}>
          <MolsanIcon name={modulo.icono} size={46} tone="ocean" className="cg-module-icon" /><span className="cg-module-text"><strong>{modulo.titulo}</strong><small>{modulo.descripcion}</small></span><span className="cg-module-arrow">↗</span>
        </button>)}</div>
      </section>

      <section className="cg-charts-grid">
        <article className="erp-card cg-panel">
          <div className="cg-section-heading molsan-section-header"><div><span className="cg-kicker">ACTIVIDAD</span><h2>Firmas realizadas</h2><p>Firmas registradas por mes, según la fecha de firma del expediente.</p></div></div>
          {firmasMensuales.length ? <div className="cg-month-chart">{firmasMensuales.map((item) => {
            const max = Math.max(1, ...firmasMensuales.map((x) => Number(x.total || 0)));
            return <div className="cg-month-column" key={item.mes}><strong>{fmtNumero(item.total)}</strong><div className="cg-month-bar-wrap"><div className="cg-month-bar" style={{ height: `${Math.max(4, Number(item.total || 0) / max * 100)}%` }} /></div><small>{item.mesLabel}</small></div>;
          })}</div> : <p className="cg-empty-chart">{cargando ? "Cargando firmas…" : "Todavía no hay firmas registradas para mostrar."}</p>}
        </article>
        <article className="erp-card cg-panel">
          <div className="cg-section-heading molsan-section-header"><div><span className="cg-kicker">MEDIA DE FIRMA</span><h2>Envío hasta firma</h2><p>Días naturales entre la fecha de envío a notaría y la fecha de firma, separados por tipo de cancelación.</p></div></div>
          <GraficoBarras items={categorias.map((x) => ({ ...x, media: x.media_dias_envio_firma }))} labelKey="nombre" valueKey="media" formatter={fmtDias} emptyText={cargando ? "Calculando medias…" : "No hay expedientes con fecha de envío y firma para calcular la media."} />
          <div className="cg-category-counts">{categorias.map((x) => <div key={x.key}><span>{x.nombre}</span><strong>{fmtNumero(x.firmadas)} firmas</strong><small>{fmtNumero(x.casos_media)} casos con ambas fechas</small></div>)}</div>
        </article>
      </section>

      <section className="cg-panel cg-circuito-panel">
        <div className="cg-section-heading molsan-section-header"><div><span className="cg-kicker">CIRCUITO COMPLETO</span><h2>Tiempo medio entre hitos</h2><p>Las medias se calculan solo con expedientes que tienen ambas fechas y cuya secuencia no produce un intervalo negativo.</p></div></div>
        <GraficoBarras items={tiempos.map((x) => ({ ...x, media: x.media_dias }))} labelKey="nombre" valueKey="media" formatter={fmtDias} emptyText={cargando ? "Calculando tiempos…" : "Todavía no hay suficientes fechas para calcular los tiempos del circuito."} />
        <div className="cg-circuito-nota"><strong>Hitos medidos</strong><span>Firma → presentación tributaria</span><span>Presentación tributaria → presentación en Registro</span><span>Presentación en Registro → inscripción</span><span>Inscripción → cierre</span></div>
      </section>

      <footer className="cg-footer">MOLSAN ERP · PREMIUM 2027 · CancelaGest{ultimaActualizacion ? ` · Actualizado a las ${ultimaActualizacion.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}</footer></main>;
}
