import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import "../../css/ModalesHerramientasPremium.css";

const CAMPO = "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700";

function euros(valor) {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero)
    ? numero.toLocaleString("es-ES", { style: "currency", currency: "EUR" })
    : "—";
}

function Metrica({ titulo, valor, detalle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-slate-500">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{valor ?? "—"}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

export default function ImportadorPostFirma() {
  const [archivo, setArchivo] = useState(null);
  const [validacion, setValidacion] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(`${new Date().getFullYear()}-01-01`);
  const [fechaHasta, setFechaHasta] = useState(`${new Date().getFullYear()}-12-31`);

  const ejecutar = async (modo) => {
    setError("");
    setResultado(null);
    if (!archivo) {
      setError("Selecciona el Excel histórico Post Firma (.xlsx).");
      return;
    }
    if (modo === "validar" && (!fechaDesde || !fechaHasta)) {
      setError("Selecciona las fechas desde y hasta para FPAGO.");
      return;
    }
    if (modo === "validar" && fechaDesde > fechaHasta) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return;
    }

    setCargando(true);
    const formData = new FormData();
    formData.append("fichero", archivo);
    try {
      const endpoint = modo === "validar"
        ? `/utilidades/importador-absis/postfirma/validar?fecha_desde=${encodeURIComponent(fechaDesde)}&fecha_hasta=${encodeURIComponent(fechaHasta)}`
        : "/utilidades/importador-absis/postfirma";
      const respuesta = await axios.post(endpoint, formData);
      if (modo === "validar") setValidacion(respuesta.data);
      else setResultado(respuesta.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo procesar el Excel Post Firma.");
    } finally {
      setCargando(false);
    }
  };

  const seleccionar = (event) => {
    const elegido = event.target.files?.[0] || null;
    setArchivo(null);
    setValidacion(null);
    setResultado(null);
    setError("");
    if (!elegido) return;
    if (!elegido.name.toLowerCase().endsWith(".xlsx")) {
      setError("El fichero debe estar en formato .xlsx.");
      event.target.value = "";
      return;
    }
    setArchivo(elegido);
  };

  return (
    <main className="herramientas-subpagina-premium min-h-screen space-y-5 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 p-4 text-slate-700 md:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-2xl">📦</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">Importador ABSIS · Post Firma</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Revisa el histórico Post Firma por fecha efectiva del pago (FPAGO). El análisis conserva cada movimiento por separado y no modifica gastos, pagos ni expedientes.
              </p>
            </div>
          </div>
          <Link to="/herramientas/importador-absis" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Importador Pre Firma</Link>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-slate-800">1. Seleccionar Excel</h2>
        <p className="mt-1 text-sm text-slate-500">El archivo se procesa en el servidor. La validación no guarda cambios en la base de datos.</p>
        <div className="mt-4 max-w-3xl">
          <label htmlFor="postfirma-excel" className="mb-2 block text-sm font-semibold text-slate-700">Fichero histórico Post Firma (.xlsx)</label>
          <input id="postfirma-excel" type="file" accept=".xlsx" onChange={seleccionar} disabled={cargando} className={CAMPO} />
          {archivo && <p className="mt-2 text-xs text-slate-500">Seleccionado: {archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        <div className="mt-5 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="postfirma-fecha-desde" className="mb-2 block text-sm font-semibold text-slate-700">FPAGO · Desde</label>
            <input id="postfirma-fecha-desde" type="date" value={fechaDesde} max={fechaHasta || undefined} onChange={(event) => setFechaDesde(event.target.value)} disabled={cargando} className={CAMPO} />
          </div>
          <div>
            <label htmlFor="postfirma-fecha-hasta" className="mb-2 block text-sm font-semibold text-slate-700">FPAGO · Hasta</label>
            <input id="postfirma-fecha-hasta" type="date" value={fechaHasta} min={fechaDesde || undefined} onChange={(event) => setFechaHasta(event.target.value)} disabled={cargando} className={CAMPO} />
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">El periodo se aplica a FPAGO, la fecha efectiva del pago. Cada movimiento de gasto se evalúa por separado; los pagos con FPAGO vacío o inválido se contabilizan como incidencias.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => ejecutar("validar")} disabled={cargando || !archivo || !fechaDesde || !fechaHasta} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">{cargando ? "Procesando…" : "Revisar periodo sin importar"}</button>
          <button type="button" onClick={() => ejecutar("importar")} disabled={cargando || !archivo} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{cargando ? "Procesando…" : "Importar Excel completo"}</button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Importación real:</strong> al pulsar «Importar Excel completo» se procesarán todas las filas del fichero, sin filtro de fechas. Los gastos con IDGASTO existente se actualizarán; los nuevos se crearán. Los que no encuentren expediente conservarán su referencia ABSIS y quedarán sin vínculo en el ERP. Esta acción sí guarda cambios en la base de datos.</div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      </section>

      {validacion && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800">2. Resultado de la validación</h2>
            <p className="mt-1 text-sm text-emerald-700">Validación completada sin guardar cambios.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica titulo="Filas con datos del periodo" valor={validacion.filas_con_datos} detalle={`Filas totales Excel: ${validacion.filas_excel ?? "—"}`} />
            <Metrica titulo="Filas dentro del periodo" valor={validacion.filas_dentro_periodo} detalle={`${validacion.fecha_desde || "—"} a ${validacion.fecha_hasta || "—"}`} />
            <Metrica titulo="Filas fuera del periodo" valor={validacion.filas_fuera_periodo} />
            <Metrica titulo="FPAGO vacío o inválido" valor={validacion.fpago_sin_fecha_o_invalida} />
            <Metrica titulo="IDGASTO distintos" valor={validacion.ids_gasto_unicos} />
            <Metrica titulo="Claves IDGASTO + TIPOCONCEPTO únicas" valor={validacion.claves_correlacion_unicas ?? validacion.ids_gasto_unicos} />
            <Metrica titulo="Importe total IMPGASTO" valor={euros(validacion.suma_imp_gasto)} detalle={`${validacion.filas_con_importe_valido ?? 0} filas con importe válido`} />
            <Metrica titulo="Claves ya existentes en ERP" valor={validacion.idgasto_ya_existentes_en_erp} />
            <Metrica titulo="IDGASTO vacíos" valor={validacion.idgasto_vacios} />
            <Metrica titulo="Filas duplicadas por clave compuesta" valor={validacion.filas_duplicadas_adicionales} />
            <Metrica titulo="Expedientes ABSIS sin vínculo" valor={validacion.expedientes_absis_distintos_sin_vinculo} />
            <Metrica titulo="Importes no interpretables" valor={validacion.importes_no_interpretables} />
          </div>
          {Array.isArray(validacion.columnas_detectadas) && <div><h3 className="mb-2 font-bold text-slate-700">Columnas detectadas en el Excel</h3><p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">{validacion.columnas_detectadas.join(" · ")}</p><p className="mt-1 text-xs text-slate-500">Columna utilizada para filtrar: <strong>{validacion.columna_filtro_fecha || "FPAGO"}</strong>.</p></div>}
          {validacion.por_estado_absis && <div><h3 className="mb-2 font-bold text-slate-700">Desglose por estado ABSIS</h3><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Filas</th><th className="px-3 py-2">Importe IMPGASTO</th></tr></thead><tbody>{Object.entries(validacion.por_estado_absis).map(([estado, dato]) => <tr key={estado} className="border-t border-slate-100"><td className="px-3 py-2">{estado}</td><td className="px-3 py-2">{dato.filas}</td><td className="px-3 py-2">{euros(dato.importe_imp_gasto)}</td></tr>)}</tbody></table></div></div>}
          <p className="text-xs text-slate-500">{validacion.nota_privacidad}</p>
        </section>
      )}

      {resultado && (
        <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
          <div><h2 className="text-lg font-bold text-slate-800">Importación Post Firma completada</h2><p className="mt-1 text-sm text-slate-500">{resultado.nota}</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica titulo="Filas Excel" valor={resultado.filas_excel} />
            <Metrica titulo="Gastos creados" valor={resultado.creados} />
            <Metrica titulo="Gastos actualizados" valor={resultado.actualizados} />
            <Metrica titulo="Total procesados" valor={resultado.total_procesados} />
            <Metrica titulo="Sin IDGASTO" valor={resultado.sin_id_gasto} />
            <Metrica titulo="Sin expediente vinculado" valor={resultado.sin_expediente_vinculado} />
            <Metrica titulo="Filas vacías" valor={resultado.filas_vacias} />
            <Metrica titulo="Errores detectados" valor={resultado.errores_total} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/informes/facturacion" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Abrir informe de facturación →</Link>
            <button type="button" onClick={() => ejecutar("validar")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Volver a validar el archivo</button>
          </div>
          {Array.isArray(resultado.errores) && resultado.errores.length > 0 && <div><h3 className="mb-2 font-bold text-slate-700">Primeros registros omitidos o con incidencia</h3><div className="max-h-64 overflow-auto rounded-xl border border-amber-200 bg-amber-50"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-amber-100"><tr><th className="px-3 py-2">Fila Excel</th><th className="px-3 py-2">IDGASTO</th><th className="px-3 py-2">Motivo</th></tr></thead><tbody>{resultado.errores.map((item, index) => <tr key={`${item.fila}-${index}`} className="border-t border-amber-100"><td className="px-3 py-2">{item.fila}</td><td className="px-3 py-2">{item.id_gasto || "—"}</td><td className="px-3 py-2">{item.motivo}</td></tr>)}</tbody></table></div></div>}
        </section>
      )}
    </main>
  );
}
