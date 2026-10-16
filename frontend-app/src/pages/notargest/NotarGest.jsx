import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import "../../css/NotarGest.css";

const TAREAS = [
  { id: "factura", titulo: "Facturas notariales", campos: ["factura_notario", "factura_notarial", "pendiente_factura"] },
  { id: "copia", titulo: "Copias simples", campos: ["copia_simple", "pendiente_copia_simple"] },
  { id: "registro", titulo: "Presentación en el Registro", campos: ["presentacion_registro", "pendiente_presentacion_registro"] },
  { id: "ajd", titulo: "Liquidación AJD / ITP", campos: ["impuesto_ajd_itp", "pendiente_ajd", "ajd_itp"] },
  { id: "inscripcion", titulo: "Inscripciones registrales", campos: ["inscripcion", "pendiente_inscripcion"] },
  { id: "sin-provision", titulo: "Copias simples sin provisión", campos: ["sin_provision", "pendiente_provision"] },
];

function listaDesdeRespuesta(data) {
  if (Array.isArray(data)) return data;
  for (const key of ["items", "resultados", "expedientes", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function valorExpediente(item, campos) {
  for (const campo of campos) {
    const valor = item?.[campo];
    if (valor !== undefined && valor !== null && valor !== "") return valor;
  }
  return "";
}

function pendiente(valor) {
  if (valor === true || valor === 1) return true;
  const texto = String(valor ?? "").toLowerCase().trim();
  return texto.includes("pendiente") || texto.includes("por hacer") || texto === "no" || texto === "false";
}

function identificador(item) {
  return item?.id_expediente ?? item?.numero_expediente ?? item?.expediente ?? item?.id ?? "—";
}

export default function NotarGest() {
  const navigate = useNavigate();
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("inicio");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await axios.get("/expedientes/listado", { params: { pagina: 1, porPagina: 500 } });
      setExpedientes(listaDesdeRespuesta(respuesta.data));
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido cargar la información. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const tareas = useMemo(() => TAREAS.map((tarea) => ({
    ...tarea,
    items: expedientes.filter((item) => pendiente(valorExpediente(item, tarea.campos))),
  })), [expedientes]);

  const contador = (campos, filtro) => expedientes.filter((item) => {
    const valor = valorExpediente(item, campos);
    return filtro(valor, item);
  }).length;

  const pendientesRecepcion = contador(["fecha_recepcion_notario", "recepcion_notario", "estado_recepcion"], (valor) => !valor || pendiente(valor));
  const pendientesFirma = contador(["fecha_firma", "firma_realizada", "estado_firma"], (valor) => !valor || pendiente(valor));
  const conDefectos = contador(["estado_expediente", "estado", "actividad_actual"], (valor) => String(valor ?? "").toLowerCase().includes("defecto"));

  function abrirExpediente(item) {
    const id = item?.id ?? item?.id_expediente ?? item?.numero_expediente;
    if (id !== undefined && id !== null) navigate(`/expedientes/${encodeURIComponent(id)}`);
  }

  return (
    <main className="notargest">
      <header className="ng-cabecera">
        <div><span className="ng-sobrelinea">MOLSAN ERP · PORTAL NOTARIAL</span><h1>NotarGest</h1><p>Tu trabajo pendiente, en un solo lugar.</p></div>
        <button className="ng-boton-secundario" onClick={cargar} disabled={cargando}>{cargando ? "Actualizando…" : "↻ Actualizar"}</button>
      </header>

      <section className="ng-alerta">
        <div className="ng-alerta-icono">!</div>
        <div><strong>Alertas de Molsan</strong><p>Comentarios y documentación pendientes de validar.</p></div>
        <button onClick={() => setVista("alertas")}>Ver alertas <span>→</span></button>
      </section>

      {error && <div className="ng-error" role="alert"><span>{error}</span><button onClick={cargar}>Reintentar</button></div>}

      <section className="ng-contadores" aria-label="Resumen de pendientes">
        <button className="ng-contador" onClick={() => setVista("alertas")}><span>Documentación por validar</span><strong>—</strong></button>
        <button className="ng-contador" onClick={() => setVista("recepcion")}><span>Pendientes de recepción</span><strong>{cargando ? "…" : pendientesRecepcion}</strong></button>
        <button className="ng-contador" onClick={() => setVista("firma")}><span>Pendientes de firma</span><strong>{cargando ? "…" : pendientesFirma}</strong></button>
        <button className="ng-contador ng-contador-rojo" onClick={() => setVista("defectos")}><span>Expedientes con defectos</span><strong>{cargando ? "…" : conDefectos}</strong></button>
      </section>

      {vista === "inicio" ? <>
        <section className="ng-panel">
          <div className="ng-panel-titulo"><h2>Mis tareas pendientes</h2><span>{cargando ? "Cargando…" : "Por expediente"}</span></div>
          <div className="ng-lista-tareas">
            {tareas.map((tarea) => <button className="ng-tarea" key={tarea.id} onClick={() => setVista(tarea.id)}>
              <span>{tarea.titulo}</span><strong>{cargando ? "…" : tarea.items.length}</strong><span className="ng-flecha">›</span>
            </button>)}
          </div>
        </section>
        <div className="ng-accesos">
          <button className="ng-acceso" onClick={() => setVista("documentacion")}><span className="ng-acceso-icono">↑</span><span><strong>Documentación</strong><small>Subir facturas, copias y justificantes.</small></span><b>→</b></button>
          <button className="ng-acceso ng-acceso-verde" onClick={() => setVista("pagos")}><span className="ng-acceso-icono">€</span><span><strong>Pagos</strong><small>Consultar pagos y justificantes registrados.</small></span><b>→</b></button>
        </div>
      </> : <section className="ng-panel">
        <div className="ng-panel-titulo"><button className="ng-volver" onClick={() => setVista("inicio")}>← Volver</button><h2>{vista === "alertas" ? "Alertas de Molsan" : vista === "recepcion" ? "Pendientes de recepción" : vista === "firma" ? "Pendientes de firma" : vista === "defectos" ? "Expedientes con defectos" : vista === "documentacion" ? "Documentación" : vista === "pagos" ? "Pagos" : (TAREAS.find(t => t.id === vista)?.titulo || "Tareas pendientes")}</h2></div>
        {vista === "documentacion" ? <p className="ng-mensaje">La carga documental se conectará con la Carpeta Digital y sus categorías: factura notarial, copia simple, presentación registral, AJD/ITP, inscripción y defectos.</p>
          : vista === "pagos" ? <p className="ng-mensaje">Aquí se mostrarán los pagos ya registrados en la Ficha de Expediente y los justificantes disponibles para consulta.</p>
          : vista === "alertas" ? <p className="ng-mensaje">Las alertas mostrarán los comentarios y documentos de Molsan que estén pendientes de validación cuando esté conectada esa fuente de datos.</p>
          : <div className="ng-tabla-contenedor"><table className="ng-tabla"><thead><tr><th>Expediente</th><th>Titular</th><th>Estado</th><th></th></tr></thead><tbody>
            {(vista === "recepcion" ? expedientes.filter(x => !x.fecha_recepcion_notario || pendiente(x.estado_recepcion)) : vista === "firma" ? expedientes.filter(x => !x.fecha_firma || pendiente(x.estado_firma)) : vista === "defectos" ? expedientes.filter(x => String(x.estado_expediente ?? x.estado ?? x.actividad_actual ?? "").toLowerCase().includes("defecto")) : (tareas.find(t => t.id === vista)?.items || [])).slice(0, 100).map((item, i) => <tr key={item.id ?? identificador(item) ?? i}><td>{identificador(item)}</td><td>{item.titular ?? item.nombre_titular ?? "—"}</td><td>{item.estado_expediente ?? item.estado ?? "Pendiente"}</td><td><button className="ng-abrir" onClick={() => abrirExpediente(item)}>Abrir →</button></td></tr>)}
          </tbody></table>{!cargando && expedientes.length === 0 && <p className="ng-mensaje">No hay expedientes disponibles para mostrar.</p>}</div>}
      </section>}

      <footer className="ng-pie">MOLSAN ERP · NotarGest</footer>
    </main>
  );
}
