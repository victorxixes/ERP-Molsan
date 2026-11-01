import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";

const campo = "w-full rounded-xl border border-[var(--molsan-border-strong)] bg-[var(--molsan-surface)] px-3 py-2.5 text-sm text-[var(--molsan-text)] outline-none transition focus:border-[var(--molsan-primary)] focus:ring-4 focus:ring-[var(--molsan-primary)]/10";
const botonSecundario = "rounded-xl border border-[var(--molsan-border-strong)] bg-[var(--molsan-surface)] px-3 py-2 text-sm font-semibold text-[var(--molsan-text)] transition hover:border-[var(--molsan-primary)] hover:bg-[var(--molsan-surface-soft)]";
const fincaVacia = () => ({ finca: "", cru_idufir: "", registro: "", provincia: "", poblacion: "", seccion: "", inscripcion: "", cuantia: "", contrato: "", entidad_original: "" });
const hipotecaVacia = () => ({ acreedor: "", numero: "", capital: "", contrato: "", observaciones: "" });

function Campo({ label, value, onChange, type = "text", required = false, placeholder = "", readOnly = false }) {
  return <label className="block space-y-1.5"><span className="text-sm font-semibold text-[var(--molsan-text)]">{label}{required && <span className="text-rose-600"> *</span>}</span><input className={campo} type={type} value={value ?? ""} onChange={onChange} required={required} placeholder={placeholder} readOnly={readOnly} /></label>;
}

function Seccion({ numero, titulo, descripcion, children, className = "" }) {
  return <section className={`overflow-hidden rounded-2xl border border-[var(--molsan-border)] bg-[var(--molsan-surface)] shadow-[0_12px_36px_rgba(15,23,42,0.07)] backdrop-blur-sm ${className}`}><div className="flex items-start gap-3 border-b border-[var(--molsan-border-light)] bg-[var(--molsan-surface-soft)] px-5 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--molsan-primary-soft)] text-sm font-bold text-[var(--molsan-primary)] ring-1 ring-[var(--molsan-border)]">{numero}</span><div><h2 className="font-bold text-[var(--molsan-text)]">{titulo}</h2><p className="mt-0.5 text-sm text-[var(--molsan-text-muted)]">{descripcion}</p></div></div><div className="space-y-5 p-5">{children}</div></section>;
}

export default function AltaExpediente() {
  const navigate = useNavigate();
  const [catalogos, setCatalogos] = useState({ tipos: [], notarios: [] });
  const [tipoId, setTipoId] = useState("");
  const [numero, setNumero] = useState(null);
  const [fechaAlta, setFechaAlta] = useState(new Date().toISOString().slice(0, 10));
  const [titular, setTitular] = useState("");
  const [nifTitular, setNifTitular] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [nifSolicitante, setNifSolicitante] = useState("");
  const [contrato, setContrato] = useState("");
  const [numeroContrato, setNumeroContrato] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [notarioId, setNotarioId] = useState("");
  const [busquedaNotario, setBusquedaNotario] = useState("");
  const [facturacion, setFacturacion] = useState({ nombre: "", nif: "", direccion: "", codigo_postal: "", poblacion: "", provincia: "", telefono: "", email: "" });
  const [fincas, setFincas] = useState([fincaVacia()]);
  const [hipotecas, setHipotecas] = useState([hipotecaVacia()]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [imprimiendo, setImprimiendo] = useState(false);

  const cargarCatalogos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await axios.get("/alta-expediente/catalogos");
      setCatalogos({ tipos: data?.tipos || [], notarios: data?.notarios || [] });
    } catch (e) {
      setError(e?.response?.data?.detail || "No se han podido cargar los tipos de expediente y el catálogo CTN.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  useEffect(() => {
    if (!tipoId) { setNumero(null); return; }
    let vigente = true;
    axios.get(`/alta-expediente/siguiente-numero/${tipoId}`)
      .then(({ data }) => { if (vigente) setNumero(data); })
      .catch((e) => { if (vigente) { setNumero(null); setError(e?.response?.data?.detail || "No se pudo calcular el siguiente número."); } });
    return () => { vigente = false; };
  }, [tipoId]);

  const notariosFiltrados = catalogos.notarios.filter((n) => `${n.nombre} ${n.nif} ${n.poblacion} ${n.provincia}`.toLowerCase().includes(busquedaNotario.toLowerCase()));
  const notarioSeleccionado = catalogos.notarios.find((n) => String(n.id) === String(notarioId));

  function cambiarFinca(index, key, value) {
    setFincas((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }
  function cambiarHipoteca(index, key, value) {
    setHipotecas((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  }
  function cambiarFacturacion(key, value) {
    setFacturacion((actual) => ({ ...actual, [key]: value }));
  }

  async function imprimirFicha() {
    if (!resultado?.id) return;
    setImprimiendo(true);
    setError("");
    try {
      const response = await axios.get(`/alta-expediente/${resultado.id}/documento`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `ficha-${resultado.id_expediente || resultado.id}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("No se ha podido generar la ficha PDF. " + (e?.response?.data?.detail || ""));
    } finally {
      setImprimiendo(false);
    }
  }

  async function guardar(event) {
    event.preventDefault();
    setError(""); setResultado(null); setGuardando(true);
    try {
      const payload = {
        tipo_expediente_id: Number(tipoId),
        fecha_alta: fechaAlta || null,
        titular, nif_titular: nifTitular, solicitante, nif_solicitante: nifSolicitante,
        contrato, numero_contrato: numeroContrato, observaciones,
        notario_id: notarioId ? Number(notarioId) : null,
        facturacion,
        fincas: fincas.filter((f) => Object.values(f).some((v) => String(v || "").trim())),
        hipotecas: hipotecas.filter((h) => Object.values(h).some((v) => String(v || "").trim())).map((h) => ({ ...h, capital: h.capital === "" ? null : Number(h.capital) })),
      };
      const { data } = await axios.post("/alta-expediente", payload);
      setResultado(data);
      setTipoId(""); setNumero(null); setFechaAlta(new Date().toISOString().slice(0, 10));
      setTitular(""); setNifTitular(""); setSolicitante(""); setNifSolicitante(""); setContrato(""); setNumeroContrato(""); setObservaciones("");
      setNotarioId(""); setBusquedaNotario("");
      setFacturacion({ nombre: "", nif: "", direccion: "", codigo_postal: "", poblacion: "", provincia: "", telefono: "", email: "" });
      setFincas([fincaVacia()]); setHipotecas([hipotecaVacia()]);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido crear el expediente.");
    } finally {
      setGuardando(false);
    }
  }

  return <main className="molsan-page-stack min-h-full bg-[var(--molsan-surface-soft)]">
    <header className="molsan-page-header relative overflow-hidden rounded-[28px] border border-[var(--molsan-border)] bg-[var(--molsan-surface)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--molsan-primary)]" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--molsan-primary)]">MOLSAN ERP · PREMIUM 2027</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--molsan-text)] sm:text-3xl">Alta de expediente</h1><p className="mt-2 max-w-3xl text-sm text-[var(--molsan-text-muted)]">Crea un expediente manual con facturación, contrato, múltiples fincas, hipotecas y notaría CTN.</p></div>
        <button type="button" onClick={() => navigate("/herramientas/utilidades")} className={botonSecundario}>← Volver a Utilidades</button>
      </div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {resultado && <div role="status" className="flex flex-col gap-3 rounded-xl border border-[var(--molsan-border)] bg-[var(--molsan-primary-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-[var(--molsan-primary-hover)]">Expediente creado correctamente</p><p className="mt-1 text-sm text-[var(--molsan-primary)]">{resultado.id_expediente} · {resultado.tipo_expediente}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={imprimirFicha} disabled={imprimiendo} className="rounded-xl border border-[var(--molsan-primary)] bg-white px-4 py-2 text-sm font-semibold text-[var(--molsan-primary)] hover:bg-[var(--molsan-primary-soft)] disabled:opacity-60">{imprimiendo ? "Generando PDF…" : "Imprimir ficha PDF"}</button><button type="button" onClick={() => navigate("/expedientes")} className="rounded-xl bg-[var(--molsan-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--molsan-primary-hover)]">Ir a expedientes</button></div></div>}

    {cargando ? <div className="rounded-2xl border border-[var(--molsan-border)] bg-white p-8 text-center text-sm text-[var(--molsan-text-muted)]">Cargando catálogos…</div> : <form onSubmit={guardar} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      <Seccion className="lg:col-span-2 2xl:col-span-3" numero="1" titulo="Identificación del expediente" descripcion="Particulares y entidades externas: contador anual común (NNNNNAAAA). CaixaBank conserva su numeración y las importaciones mantienen el identificador original.">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1.5"><span className="text-sm font-semibold text-[var(--molsan-text)]">Tipo de expediente <span className="text-rose-600">*</span></span><select className={campo} required value={tipoId} onChange={(e) => setTipoId(e.target.value)}><option value="">Selecciona un tipo…</option>{catalogos.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></label>
          <Campo label="Número previsto" value={numero?.identificador_previo || (tipoId ? "Calculando…" : "Se asigna al seleccionar tipo")} readOnly onChange={() => {}} />
          <Campo label="Fecha de alta" type="date" value={fechaAlta} onChange={(e) => setFechaAlta(e.target.value)} required />
        </div>
      </Seccion>

      <Seccion numero="2" titulo="Datos de titular y contrato" descripcion="Identificación básica y referencia contractual.">
        <div className="grid gap-4 md:grid-cols-2"><Campo label="Nombre del titular" value={titular} onChange={(e) => setTitular(e.target.value)} required /><Campo label="NIF del titular" value={nifTitular} onChange={(e) => setNifTitular(e.target.value)} /><Campo label="Nombre del solicitante" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} /><Campo label="NIF del solicitante" value={nifSolicitante} onChange={(e) => setNifSolicitante(e.target.value)} /><Campo label="Contrato" value={contrato} onChange={(e) => setContrato(e.target.value)} /><Campo label="Número de contrato" value={numeroContrato} onChange={(e) => setNumeroContrato(e.target.value)} /></div>
      </Seccion>

      <Seccion numero="3" titulo="Datos de facturación" descripcion="Información de facturación vinculada al expediente.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo label="Nombre / razón social" value={facturacion.nombre} onChange={(e) => cambiarFacturacion("nombre", e.target.value)} />
          <Campo label="NIF / CIF" value={facturacion.nif} onChange={(e) => cambiarFacturacion("nif", e.target.value)} />
          <Campo label="Dirección" value={facturacion.direccion} onChange={(e) => cambiarFacturacion("direccion", e.target.value)} />
          <Campo label="Código postal" value={facturacion.codigo_postal} onChange={(e) => cambiarFacturacion("codigo_postal", e.target.value)} />
          <Campo label="Población" value={facturacion.poblacion} onChange={(e) => cambiarFacturacion("poblacion", e.target.value)} />
          <Campo label="Provincia" value={facturacion.provincia} onChange={(e) => cambiarFacturacion("provincia", e.target.value)} />
          <Campo label="Teléfono" value={facturacion.telefono} onChange={(e) => cambiarFacturacion("telefono", e.target.value)} />
          <Campo label="Correo electrónico" type="email" value={facturacion.email} onChange={(e) => cambiarFacturacion("email", e.target.value)} />
        </div>
      </Seccion>

      <Seccion numero="4" titulo="Fincas y registros" descripcion="Añade tantas fincas como sean necesarias para este expediente.">
        {fincas.map((f, i) => <div key={i} className="space-y-4 rounded-xl border border-[var(--molsan-border)] p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-[var(--molsan-text)]">Finca {i + 1}</h3>{fincas.length > 1 && <button type="button" className="text-sm font-semibold text-rose-600" onClick={() => setFincas((items) => items.filter((_, j) => j !== i))}>Eliminar finca</button>}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Campo label="Número de finca" value={f.finca} onChange={(e) => cambiarFinca(i, "finca", e.target.value)} /><Campo label="CRU / IDUFIR" value={f.cru_idufir} onChange={(e) => cambiarFinca(i, "cru_idufir", e.target.value)} /><Campo label="Registro de la propiedad" value={f.registro} onChange={(e) => cambiarFinca(i, "registro", e.target.value)} /><Campo label="Provincia" value={f.provincia} onChange={(e) => cambiarFinca(i, "provincia", e.target.value)} /><Campo label="Población" value={f.poblacion} onChange={(e) => cambiarFinca(i, "poblacion", e.target.value)} /><Campo label="Sección" value={f.seccion} onChange={(e) => cambiarFinca(i, "seccion", e.target.value)} /><Campo label="Inscripción" value={f.inscripcion} onChange={(e) => cambiarFinca(i, "inscripcion", e.target.value)} /><Campo label="Cuantía" value={f.cuantia} onChange={(e) => cambiarFinca(i, "cuantia", e.target.value)} /><Campo label="Entidad original" value={f.entidad_original} onChange={(e) => cambiarFinca(i, "entidad_original", e.target.value)} /></div></div>)}
        <button type="button" className={botonSecundario} onClick={() => setFincas((items) => [...items, fincaVacia()])}>＋ Añadir otra finca</button>
      </Seccion>

      <Seccion numero="5" titulo="Hipotecas" descripcion="Registra una o varias hipotecas vinculadas al expediente.">
        {hipotecas.map((h, i) => <div key={i} className="space-y-4 rounded-xl border border-[var(--molsan-border)] p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-[var(--molsan-text)]">Hipoteca {i + 1}</h3>{hipotecas.length > 1 && <button type="button" className="text-sm font-semibold text-rose-600" onClick={() => setHipotecas((items) => items.filter((_, j) => j !== i))}>Eliminar hipoteca</button>}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Campo label="Entidad acreedora" value={h.acreedor} onChange={(e) => cambiarHipoteca(i, "acreedor", e.target.value)} /><Campo label="Número de hipoteca" value={h.numero} onChange={(e) => cambiarHipoteca(i, "numero", e.target.value)} /><Campo label="Capital" type="number" value={h.capital} onChange={(e) => cambiarHipoteca(i, "capital", e.target.value)} /><Campo label="Contrato" value={h.contrato} onChange={(e) => cambiarHipoteca(i, "contrato", e.target.value)} /><Campo label="Observaciones" value={h.observaciones} onChange={(e) => cambiarHipoteca(i, "observaciones", e.target.value)} /></div></div>)}
        <button type="button" className={botonSecundario} onClick={() => setHipotecas((items) => [...items, hipotecaVacia()])}>＋ Añadir otra hipoteca</button>
      </Seccion>

      <Seccion numero="6" titulo="Notaría CTN" descripcion="Selecciona una notaría del catálogo; NIF, población y provincia se rellenan automáticamente.">
        <div className="grid gap-4 md:grid-cols-2"><Campo label="Buscar notaría" value={busquedaNotario} onChange={(e) => setBusquedaNotario(e.target.value)} placeholder="Nombre, NIF, población o provincia…" /><label className="block space-y-1.5"><span className="text-sm font-semibold text-[var(--molsan-text)]">Notario / notaría</span><select className={campo} value={notarioId} onChange={(e) => setNotarioId(e.target.value)}><option value="">Sin seleccionar</option>{notariosFiltrados.map((n) => <option key={n.id} value={n.id}>{n.nombre || `Notaría ${n.id}`} · {n.poblacion} ({n.provincia})</option>)}</select></label></div>
        {notarioSeleccionado && <div className="grid gap-4 rounded-xl border border-[var(--molsan-border)] bg-[var(--molsan-primary-soft)] p-4 md:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--molsan-primary)]">NIF</p><p className="mt-1 font-semibold text-[var(--molsan-text)]">{notarioSeleccionado.nif || "No disponible"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--molsan-primary)]">Población</p><p className="mt-1 font-semibold text-[var(--molsan-text)]">{notarioSeleccionado.poblacion || "No disponible"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--molsan-primary)]">Provincia</p><p className="mt-1 font-semibold text-[var(--molsan-text)]">{notarioSeleccionado.provincia || "No disponible"}</p></div></div>}
      </Seccion>

      <Seccion numero="7" titulo="Observaciones" descripcion="Notas generales o instrucciones adicionales para el expediente.">
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-[var(--molsan-text)]">Observaciones generales</span><textarea className={campo} rows={5} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Escribe aquí las observaciones generales del expediente…" /></label>
      </Seccion>

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:col-span-2 2xl:col-span-3"><p className="text-sm text-[var(--molsan-text-muted)]">Revisa los datos antes de confirmar el alta. Los campos marcados con * son obligatorios.</p><div className="flex gap-3"><button type="button" className={botonSecundario} disabled={guardando} onClick={() => navigate("/herramientas/utilidades")}>Cancelar</button><button type="submit" disabled={guardando || !tipoId} className="rounded-xl bg-[var(--molsan-primary)] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--molsan-primary)]/15 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{guardando ? "Creando expediente…" : "Crear expediente"}</button></div></div>
    </form>}
  </main>;
}
