import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  obtenerListadoExpedientes,
  exportarExcelExpedientes,
  obtenerResumenExpedientes,
} from "../../api/expedientes";


// ============================================================
// COLUMNAS
// ============================================================

const COLUMNAS = [

  // ==========================================================
  // IDENTIFICACIÓN
  // ==========================================================

  {
    key: "id_expediente",
    label: "Nº Expediente",
    tipo: "texto",
  },

  {
    key: "id",
    label: "ID",
    tipo: "numero",
  },

  {
    key: "cliente_id",
    label: "ID Cliente",
    tipo: "numero",
  },


  // ==========================================================
  // ESTADOS
  // ==========================================================

  {
    key: "estado_expediente",
    label: "Estado expediente",
    tipo: "texto",
  },

  {
    key: "estado_expediente_ancert",
    label: "Estado ANCERT",
    tipo: "texto",
  },

  {
    key: "estado_actividad",
    label: "Estado actividad",
    tipo: "texto",
  },

  {
    key: "facturacion_estado",
    label: "Estado facturación",
    tipo: "texto",
  },

  {
    key: "registral_estado",
    label: "Estado registral",
    tipo: "texto",
  },


  // ==========================================================
  // FECHAS
  // ==========================================================

  {
    key: "fecha_alta",
    label: "Fecha alta",
    tipo: "fecha",
  },

  {
    key: "fecha_firma",
    label: "Fecha firma",
    tipo: "fecha",
  },

  {
    key: "fecha_inscripcion",
    label: "Fecha inscripción",
    tipo: "fecha",
  },

  {
    key: "fecha_entregado_cliente",
    label: "Fecha entregado cliente",
    tipo: "fecha",
  },

  {
    key: "fecha_prevista_firma",
    label: "Fecha prevista firma",
    tipo: "fecha",
  },

  {
    key: "fecha_vencimiento",
    label: "Fecha vencimiento",
    tipo: "fecha",
  },

  {
    key: "fecha_sol_cgn",
    label: "Fecha solicitud CGN",
    tipo: "fecha",
  },

  {
    key: "fecha_firma_prev_val",
    label: "Firma prev. validación",
    tipo: "fecha",
  },

  {
    key: "fecha_firma_prev_cli",
    label: "Firma prev. cliente",
    tipo: "fecha",
  },

  {
    key: "fecha_inicio_actividad",
    label: "Inicio actividad",
    tipo: "fecha",
  },

  {
    key: "fecha_fin_actividad",
    label: "Fin actividad",
    tipo: "fecha",
  },

  {
    key: "fcierre_defecto",
    label: "Cierre defecto",
    tipo: "fecha",
  },

  {
    key: "facturacion_fecha",
    label: "Fecha facturación",
    tipo: "fecha",
  },

  {
    key: "registral_fecha",
    label: "Fecha registral",
    tipo: "fecha",
  },


  // ==========================================================
  // ACTIVIDAD
  // ==========================================================

  {
    key: "actividad_actual",
    label: "Actividad actual",
    tipo: "texto",
  },


  // ==========================================================
  // TITULAR
  // ==========================================================

  {
    key: "nombre_titular",
    label: "Nombre titular",
    tipo: "texto",
  },

  {
    key: "nif_titular",
    label: "NIF titular",
    tipo: "texto",
  },


  // ==========================================================
  // SOLICITANTE
  // ==========================================================

  {
    key: "nombre_solicitante",
    label: "Nombre solicitante",
    tipo: "texto",
  },

  {
    key: "nif_solicitante",
    label: "NIF solicitante",
    tipo: "texto",
  },

  {
    key: "apoderado",
    label: "Apoderado",
    tipo: "texto",
  },


  // ==========================================================
  // NOTARIO
  // ==========================================================

  {
    key: "nombre_notario",
    label: "Nombre notario",
    tipo: "texto",
  },

  {
    key: "nif_notario",
    label: "NIF notario",
    tipo: "texto",
  },

  {
    key: "notario",
    label: "Notario",
    tipo: "texto",
  },


  // ==========================================================
  // OFICINA
  // ==========================================================

  {
    key: "oficina",
    label: "Oficina",
    tipo: "texto",
  },

  {
    key: "dan",
    label: "DAN",
    tipo: "texto",
  },

  {
    key: "oficina_alta",
    label: "Oficina alta",
    tipo: "texto",
  },


  // ==========================================================
  // ECONÓMICOS
  // ==========================================================

  {
    key: "capital",
    label: "Capital",
    tipo: "numero",
  },

  {
    key: "importe",
    label: "Importe",
    tipo: "numero",
  },

  {
    key: "saldo_real",
    label: "Saldo real",
    tipo: "numero",
  },

  {
    key: "saldo_disponible",
    label: "Saldo disponible",
    tipo: "numero",
  },


  // ==========================================================
  // PROVISIÓN
  // ==========================================================

  {
    key: "id_provision",
    label: "ID provisión",
    tipo: "texto",
  },

  {
    key: "tipo_provision",
    label: "Tipo provisión",
    tipo: "texto",
  },


  // ==========================================================
  // OPERACIÓN
  // ==========================================================

  {
    key: "contrato",
    label: "Contrato",
    tipo: "texto",
  },

  {
    key: "num_solicitud_sia",
    label: "Nº solicitud SIA",
    tipo: "texto",
  },

  {
    key: "tipo_operacion",
    label: "Tipo operación",
    tipo: "texto",
  },

  {
    key: "subtipo_operacion",
    label: "Subtipo operación",
    tipo: "texto",
  },

  {
    key: "vinccanc",
    label: "VincCanc",
    tipo: "texto",
  },

  {
    key: "protocolo",
    label: "Protocolo",
    tipo: "texto",
  },


  // ==========================================================
  // GTG / BANKIA
  // ==========================================================

  {
    key: "origen_bankia",
    label: "Origen Bankia",
    tipo: "texto",
  },

  {
    key: "producto_gtg",
    label: "Producto GTG",
    tipo: "texto",
  },

  {
    key: "dt",
    label: "DT",
    tipo: "texto",
  },


  // ==========================================================
  // GESTORÍA
  // ==========================================================

  {
    key: "id_gestoria_tramite",
    label: "ID gestoría trámite",
    tipo: "texto",
  },

  {
    key: "nombre_gestoria",
    label: "Nombre gestoría",
    tipo: "texto",
  },

  {
    key: "gestoria",
    label: "Gestoría",
    tipo: "texto",
  },


  // ==========================================================
  // FINCA
  // ==========================================================

  {
    key: "finca",
    label: "Finca",
    tipo: "texto",
  },


  // ==========================================================
  // DEFECTOS
  // ==========================================================

  {
    key: "tiene_defectos_abiertos",
    label: "Defectos abiertos",
    tipo: "texto",
  },

  {
    key: "tipo_error",
    label: "Tipo error",
    tipo: "texto",
  },

  {
    key: "descripcion_error",
    label: "Descripción error",
    tipo: "texto",
  },

  {
    key: "falta_defecto",
    label: "Falta / defecto",
    tipo: "texto",
  },


  // ==========================================================
  // CGN
  // ==========================================================

  {
    key: "id_expediente_cgn",
    label: "ID expediente CGN",
    tipo: "texto",
  },


  // ==========================================================
  // ACTA
  // ==========================================================

  {
    key: "tipo_acta",
    label: "Tipo acta",
    tipo: "texto",
  },


  // ==========================================================
  // OTROS
  // ==========================================================

  {
    key: "lucy",
    label: "Lucy",
    tipo: "texto",
  },

  {
    key: "indicador_tt",
    label: "Indicador TT",
    tipo: "texto",
  },


  // ==========================================================
  // OBSERVACIONES
  // ==========================================================

  {
    key: "observaciones",
    label: "Observaciones",
    tipo: "texto",
  },

,

  { key: "sol", label: "SOL", tipo: "texto" },
  { key: "cs", label: "CS", tipo: "texto" },
  { key: "ns", label: "NS", tipo: "texto" },
  { key: "ultima_accion", label: "Última acción", tipo: "texto" },
  { key: "fecha_ultima_accion", label: "Fecha última acción", tipo: "fecha" },
  { key: "fecha_envio", label: "Fecha de envío", tipo: "fecha" },
  { key: "apoderado", label: "Apoderado", tipo: "texto" },
  { key: "tipo_documento", label: "Tipo documento", tipo: "texto" },
  { key: "poblacion", label: "Población", tipo: "texto" },
  { key: "provincia", label: "Provincia", tipo: "texto" },
  { key: "tipo_firma", label: "Tipo de firma", tipo: "texto" },
  { key: "protocolo", label: "Protocolo", tipo: "texto" },
  { key: "asiento_presentacion_libro_diario", label: "Asiento presentación / Libro diario", tipo: "texto" },
  { key: "fecha_presentacion", label: "Fecha presentación", tipo: "fecha" },
  { key: "numero_entrada", label: "Número de Entrada", tipo: "texto" },
  { key: "fecha_recogida_notario_presentacion_telematica", label: "Fecha recogida Notario o presentación telemática", tipo: "fecha" },
  { key: "copia_simple_escritura", label: "Copia simple escritura", tipo: "texto" },
  { key: "fecha_presentacion_tributaria", label: "Fecha presentación tributaria", tipo: "fecha" },
  { key: "fecha_liquidacion_tributaria", label: "Fecha liquidación tributaria", tipo: "fecha" },
  { key: "oficina_liquidadora", label: "Oficina liquidadora", tipo: "texto" },
  { key: "base_imponible", label: "Base imponible", tipo: "numero" },
  { key: "tributacion", label: "Tributación", tipo: "texto" },
  { key: "impuesto_ajd_itp", label: "Impuesto (AJD/ITP)", tipo: "texto" },
  { key: "fecha_vencimiento_asiento", label: "Fecha vencimiento asiento", tipo: "fecha" },
  { key: "escritura_simple_cancelacion", label: "Escritura simple de cancelación", tipo: "texto" },

];


// ============================================================
// COLUMNAS VISIBLES POR DEFECTO
// ============================================================

const COLUMNAS_POR_DEFECTO = [

  "id_expediente",

  "estado_expediente",

  "estado_actividad",

  "fecha_alta",

  "fecha_firma",

  "actividad_actual",

  "nombre_titular",

  "nif_titular",

  "nombre_solicitante",

  "nif_solicitante",

  "nombre_notario",

  "nif_notario",

  "oficina",

  "capital",

  "importe",

  "saldo_disponible",

  "contrato",

  "tipo_operacion",

  "observaciones",

];


// ============================================================
// ACTIVIDADES CONOCIDAS DE ABSIS
// ============================================================

const ACTIVIDADES_ABSIS = [

  "Documentación previa",

  "Sede notarial",

  "Sede notarial con protocolo",

  "Liquidación de impuestos",

  "Tramitación inscripción",

  "Defectos registrales",

  "Facturación y cierre",

];


// ============================================================
// WORKFLOW DE EXPEDIENTES
// ============================================================

const ACTIVIDADES_EXPEDIENTES = [
  { key: "documentacion-previa", label: "Documentación previa", icono: "📄", aliases: ["Documentación previa"] },
  { key: "sede-notarial", label: "Sede notarial", icono: "🏛️", aliases: ["Sede notarial", "Sede Notarial"] },
  { key: "sede-notarial-protocolo", label: "Sede notarial con protocolo", icono: "📜", aliases: ["Sede notarial con protocolo", "Sede Notarial con protocolo"] },
  { key: "liquidacion-impuestos", label: "Liquidación de impuestos", icono: "💶", aliases: ["Liquidación de impuestos", "Liquidación impuestos", "Liquidacion de impuestos", "Liquidacion impuestos"] },
  { key: "tramitacion-inscripcion", label: "Tramitación inscripción", icono: "🏢", aliases: ["Tramitación inscripción", "Tramitacion inscripcion"] },
  { key: "defectos-registrales", label: "Defectos registrales", icono: "⚠️", aliases: ["Defectos registrales", "Defectos Registrales"] },
  { key: "facturacion-cierre", label: "Facturación y cierre", icono: "🧾", aliases: ["Facturación y cierre", "Facturacion y cierre"] },
];

// ============================================================
// COLUMNAS ESPECÍFICAS POR ACTIVIDAD
// ============================================================

const COLUMNAS_BASE_ACTIVIDAD = [
  "id_expediente",
  "estado_expediente",
  "estado_actividad",
  "fecha_alta",
  "actividad_actual",
  "nombre_titular",
  "nif_titular",
  "nombre_solicitante",
  "nif_solicitante",
  "nombre_notario",
  "nif_notario",
  "oficina",
  "capital",
  "saldo_disponible",
  "contrato",
  "tipo_operacion",
  "observaciones",
];

const COLUMNAS_DOCUMENTACION_PREVIA = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "sol",
  "cs",
  "ns",
  "ultima_accion",
  "fecha_ultima_accion",
];

const COLUMNAS_SEDE_NOTARIAL = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "fecha_envio",
  "apoderado",
  "tipo_documento",
  "poblacion",
  "provincia",
  "tipo_firma",
  "sol",
  "cs",
  "ns",
  "ultima_accion",
  "fecha_ultima_accion",
];

const COLUMNAS_SEDE_NOTARIAL_PROTOCOLO = [
  ...COLUMNAS_SEDE_NOTARIAL,
  "fecha_firma",
  "protocolo",
  "asiento_presentacion_libro_diario",
  "fecha_presentacion",
  "numero_entrada",
  "fecha_recogida_notario_presentacion_telematica",
  "copia_simple_escritura",
];

const COLUMNAS_LIQUIDACION_IMPUESTOS = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "ultima_accion",
  "fecha_ultima_accion",
  "fecha_presentacion_tributaria",
  "fecha_liquidacion_tributaria",
  "oficina_liquidadora",
  "base_imponible",
  "tributacion",
  "impuesto_ajd_itp",
];

const COLUMNAS_TRAMITACION_INSCRIPCION = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "ultima_accion",
  "fecha_ultima_accion",
  "fecha_presentacion",
  "fecha_vencimiento_asiento",
  "fecha_inscripcion",
  "escritura_simple_cancelacion",
];

const COLUMNAS_POR_ACTIVIDAD = {
  "documentacion-previa": COLUMNAS_DOCUMENTACION_PREVIA,
  "sede-notarial": COLUMNAS_SEDE_NOTARIAL,
  "sede-notarial-protocolo": COLUMNAS_SEDE_NOTARIAL_PROTOCOLO,
  "liquidacion-impuestos": COLUMNAS_LIQUIDACION_IMPUESTOS,
  "tramitacion-inscripcion": COLUMNAS_TRAMITACION_INSCRIPCION,
};

function obtenerColumnasActividad(actividad) {
  return COLUMNAS_POR_ACTIVIDAD[actividad] || COLUMNAS_POR_DEFECTO;
}

function normalizarActividad(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function actividadCoincide(definicion, valor) {
  const normalizada = normalizarActividad(valor);
  return [definicion.label, ...(definicion.aliases || [])]
    .some((alias) => normalizarActividad(alias) === normalizada);
}


// ============================================================
// FORMATEAR VALOR
// ============================================================

function formatearValor(
  valor,
  tipo
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return "—";

  }


  // ==========================================================
  // FECHA
  // ==========================================================

  if (
    tipo === "fecha"
  ) {

    const texto =
      String(valor);


    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        texto
      )
    ) {

      const [
        year,
        month,
        day,
      ] = texto.split("-");


      return (
        `${day}/${month}/${year}`
      );

    }


    return texto;

  }


  // ==========================================================
  // NÚMERO
  // ==========================================================

  if (
    tipo === "numero"
  ) {

    const numero =
      Number(valor);


    if (
      Number.isNaN(
        numero
      )
    ) {

      return String(valor);

    }


    return new Intl.NumberFormat(
      "es-ES",
      {
        maximumFractionDigits: 2,
      }
    ).format(
      numero
    );

  }


  return String(valor);

}


// ============================================================
// FORMATEAR NÚMERO
// ============================================================

function formatearNumero(
  valor
) {

  return new Intl.NumberFormat(
    "es-ES"
  ).format(
    Number(valor || 0)
  );

}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ExpedientesListado() {

  // ==========================================================
  // DATOS
  // ==========================================================

  const [
    expedientes,
    setExpedientes,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");

  // ==========================================================
  // ACTUALIZACIÓN REALTIME
  // ==========================================================

  const [
    recargaRealtime,
    setRecargaRealtime,
  ] = useState(0);

  // ==========================================================
  // INTERFAZ
  // ==========================================================

  const [
    mostrarFiltros,
    setMostrarFiltros,
  ] = useState(false);


  const [
    mostrarColumnas,
    setMostrarColumnas,
  ] = useState(false);


  // ==========================================================
  // FILTROS EDITABLES
  // ==========================================================

  const [
    filtroNif,
    setFiltroNif,
  ] = useState("");


  const [
    filtroActividad,
    setFiltroActividad,
  ] = useState("");


  const [
    filtroFechaInicio,
    setFiltroFechaInicio,
  ] = useState("");


  const [
    filtroFechaFin,
    setFiltroFechaFin,
  ] = useState("");


  const [
    filtroNotario,
    setFiltroNotario,
  ] = useState("");


  const [
    filtroOficina,
    setFiltroOficina,
  ] = useState("");


  const [
    filtroImporteMin,
    setFiltroImporteMin,
  ] = useState("");


  const [
    filtroImporteMax,
    setFiltroImporteMax,
  ] = useState("");


  // ==========================================================
  // FILTROS APLICADOS
  // ==========================================================

  const [
    filtrosAplicados,
    setFiltrosAplicados,
  ] = useState({

    nif: "",

    actividad: "",

    fechaInicio: "",

    fechaFin: "",

    notario: "",

    oficina: "",

    importeMin: "",

    importeMax: "",

  });


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const [
    pagina,
    setPagina,
  ] = useState(1);


  const [
    totalPaginas,
    setTotalPaginas,
  ] = useState(1);


  const [
    totalExpedientes,
    setTotalExpedientes,
  ] = useState(0);


  const porPagina = 20;


  // ==========================================================
  // ORDENACIÓN
  // ==========================================================

  const [
    ordenMultiple,
    setOrdenMultiple,
  ] = useState([]);


  // ==========================================================
  // COLUMNAS
  // ==========================================================

  const [
    columnasVisiblesManuales,
    setColumnasVisiblesManuales,
  ] = useState(
    COLUMNAS_POR_DEFECTO
  );

  const columnasVisibles = useMemo(
    () =>
      actividadSeleccionada
        ? obtenerColumnasActividad(actividadSeleccionada)
        : columnasVisiblesManuales,
    [
      actividadSeleccionada,
      columnasVisiblesManuales,
    ]
  );


  // ==========================================================
  // ACTIVIDADES
  // ==========================================================

  const [
    actividades,
    setActividades,
  ] = useState([]);


  const [
    totalActividades,
    setTotalActividades,
  ] = useState(0);


  const [
    loadingActividades,
    setLoadingActividades,
  ] = useState(true);


  const [
    errorActividades,
    setErrorActividades,
  ] = useState("");


  // ==========================================================
  // ACTIVIDAD SELECCIONADA EN EL SIDEBAR
  // ==========================================================

  const [
    actividadSeleccionada,
    setActividadSeleccionada,
  ] = useState("");


  // ==========================================================
  // ESCUCHAR REALTIME DE EXPEDIENTES
  // ==========================================================

  useEffect(() => {

    const manejarRealtime =
      (event) => {

        const data =
          event?.detail;


        if (
          !data ||
          data.modulo !==
            "expedientes" ||
          data.evento !==
            "importacion_finalizada"
        ) {

          return;

        }


        console.log(
          "[EXPEDIENTES] Importación finalizada. Recargando listado...",
          data.data
        );


        setRecargaRealtime(
          (valor) =>
            valor + 1
        );

      };


    window.addEventListener(
      "erp:realtime",
      manejarRealtime
    );


    return () => {

      window.removeEventListener(
        "erp:realtime",
        manejarRealtime
      );

    };

  }, []);


  // ==========================================================
  // CARGAR LISTADO
  // ==========================================================

  useEffect(() => {

    let activo = true;


    async function cargar() {

      setLoading(true);

      setError("");


      try {

        const res =
          await obtenerListadoExpedientes({

            pagina,

            porPagina,

            nif:
              filtrosAplicados.nif ||
              undefined,

            actividad:
              filtrosAplicados.actividad ||
              undefined,

            fechaInicio:
              filtrosAplicados.fechaInicio ||
              undefined,

            fechaFin:
              filtrosAplicados.fechaFin ||
              undefined,

            notario:
              filtrosAplicados.notario ||
              undefined,

            oficina:
              filtrosAplicados.oficina ||
              undefined,

            importeMin:
              filtrosAplicados.importeMin !== ""
                ? Number(
                    filtrosAplicados.importeMin
                  )
                : undefined,

            importeMax:
              filtrosAplicados.importeMax !== ""
                ? Number(
                    filtrosAplicados.importeMax
                  )
                : undefined,

            ordenMultiple:
              ordenMultiple.length > 0
                ? JSON.stringify(
                    ordenMultiple
                  )
                : undefined,

          });


        if (!activo) {

          return;

        }


        setExpedientes(
          Array.isArray(
            res?.items
          )
            ? res.items
            : []
        );


        setTotalExpedientes(
          Number(
            res?.total || 0
          )
        );


        setTotalPaginas(
          Math.max(
            1,
            Number(
              res?.total_paginas ||
              1
            )
          )
        );

      } catch (
        err
      ) {

        console.error(
          "Error cargando expedientes:",
          err
        );


        if (activo) {

          setError(
            err?.response?.data?.detail ||
            "No se han podido cargar los expedientes."
          );


          setExpedientes([]);

          setTotalExpedientes(0);

          setTotalPaginas(1);

        }

      } finally {

        if (activo) {

          setLoading(false);

        }

      }

    }


    cargar();


    return () => {

      activo = false;

    };

  }, [
    pagina,
    filtrosAplicados,
    ordenMultiple,
    recargaRealtime,
  ]);


  // ==========================================================
  // CARGAR RESUMEN DE ACTIVIDADES
  // ==========================================================

  useEffect(() => {

    let activo = true;


    async function cargarActividades() {

      setLoadingActividades(true);

      setErrorActividades("");


      try {

        const res =
          await obtenerResumenExpedientes();


        if (!activo) {

          return;

        }


        setTotalActividades(
          Number(
            res?.total || 0
          )
        );


        // ======================================================
        // FORMATO ARRAY
        // ======================================================

        if (
          Array.isArray(
            res?.actividades
          )
        ) {

          const actividadesNormalizadas =
            res.actividades

              .map(
                (item) => ({

                  actividad:
                    item?.actividad ??
                    item?.nombre ??
                    item?.actividad_actual ??
                    "Sin actividad",

                  total:
                    Number(
                      item?.total ??
                      item?.cantidad ??
                      item?.count ??
                      0
                    ),

                })
              )

              .filter(
                (item) =>
                  item.total >= 0
              );


          actividadesNormalizadas.sort(
            (a, b) => {

              const indiceA =
                ACTIVIDADES_ABSIS.findIndex(
                  (nombre) =>
                    nombre.toLowerCase() ===
                    String(
                      a.actividad
                    ).toLowerCase()
                );


              const indiceB =
                ACTIVIDADES_ABSIS.findIndex(
                  (nombre) =>
                    nombre.toLowerCase() ===
                    String(
                      b.actividad
                    ).toLowerCase()
                );


              if (
                indiceA !== -1 &&
                indiceB !== -1
              ) {

                return (
                  indiceA -
                  indiceB
                );

              }


              if (
                indiceA !== -1
              ) {

                return -1;

              }


              if (
                indiceB !== -1
              ) {

                return 1;

              }


              return (
                b.total -
                a.total
              );

            }
          );


          setActividades(
            actividadesNormalizadas
          );


          return;

        }


        // ======================================================
        // FORMATO OBJETO
        // ======================================================

        if (
          res?.actividades &&
          typeof res.actividades ===
            "object" &&
          !Array.isArray(
            res.actividades
          )
        ) {

          const actividadesNormalizadas =
            Object.entries(
              res.actividades
            )
              .map(
                ([actividad, total]) => ({

                  actividad,

                  total:
                    Number(
                      total || 0
                    ),

                })
              );


          actividadesNormalizadas.sort(
            (a, b) =>
              b.total -
              a.total
          );


          setActividades(
            actividadesNormalizadas
          );


          return;

        }


        setActividades([]);


        setErrorActividades(
          "El backend no está devolviendo el resumen por actividad."
        );

      } catch (
        err
      ) {

        console.error(
          "Error cargando actividades:",
          err
        );


        if (activo) {

          setActividades([]);

          setTotalActividades(0);


          setErrorActividades(
            err?.response?.data?.detail ||
            "No se han podido cargar las actividades."
          );

        }

      } finally {

        if (activo) {

          setLoadingActividades(false);

        }

      }

    }


    cargarActividades();


    return () => {

      activo = false;

    };

  }, [
    recargaRealtime,
  ]);


  // ==========================================================
  // APLICAR FILTROS
  // ==========================================================

  const aplicarFiltros = () => {

    setFiltrosAplicados({

      nif:
        filtroNif.trim(),

      actividad:
        filtroActividad.trim(),

      fechaInicio:
        filtroFechaInicio,

      fechaFin:
        filtroFechaFin,

      notario:
        filtroNotario.trim(),

      oficina:
        filtroOficina.trim(),

      importeMin:
        filtroImporteMin,

      importeMax:
        filtroImporteMax,

    });


    setPagina(1);

    setError("");

  };


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  const limpiarFiltros = () => {

    setFiltroNif("");

    setFiltroActividad("");

    setFiltroFechaInicio("");

    setFiltroFechaFin("");

    setFiltroNotario("");

    setFiltroOficina("");

    setFiltroImporteMin("");

    setFiltroImporteMax("");


    setFiltrosAplicados({

      nif: "",

      actividad: "",

      fechaInicio: "",

      fechaFin: "",

      notario: "",

      oficina: "",

      importeMin: "",

      importeMax: "",

    });


    setPagina(1);

    setError("");

  };


  // ==========================================================
  // ORDENAR
  // ==========================================================

  const ordenar = (
    columna,
    shiftKey
  ) => {

    // ========================================================
    // ORDENACIÓN SIMPLE
    // ========================================================

    if (!shiftKey) {

      const actual =
        ordenMultiple[0];


      if (
        actual &&
        actual.columna ===
          columna
      ) {

        setOrdenMultiple([

          {

            columna,

            direccion:
              actual.direccion ===
              "asc"
                ? "desc"
                : "asc",

          },

        ]);

      } else {

        setOrdenMultiple([

          {

            columna,

            direccion:
              "asc",

          },

        ]);

      }


      setPagina(1);

      return;

    }


    // ========================================================
    // ORDENACIÓN MÚLTIPLE
    // ========================================================

    const indice =
      ordenMultiple.findIndex(
        (orden) =>
          orden.columna ===
          columna
      );


    if (
      indice !== -1
    ) {

      setOrdenMultiple(
        (actual) =>
          actual.map(
            (
              orden,
              index
            ) => {

              if (
                index !==
                indice
              ) {

                return orden;

              }


              return {

                ...orden,

                direccion:
                  orden.direccion ===
                  "asc"
                    ? "desc"
                    : "asc",

              };

            }
          )
      );

    } else {

      setOrdenMultiple(
        (actual) => [

          ...actual,

          {

            columna,

            direccion:
              "asc",

          },

        ]
      );

    }


    setPagina(1);

  };


  // ==========================================================
  // ICONO ORDEN
  // ==========================================================

  const iconoOrden =
    (
      columna
    ) => {

      const indice =
        ordenMultiple.findIndex(
          (orden) =>
            orden.columna ===
            columna
        );


      if (
        indice === -1
      ) {

        return "↕";

      }


      const orden =
        ordenMultiple[
          indice
        ];


      const flecha =
        orden.direccion ===
        "asc"
          ? "↑"
          : "↓";


      if (
        ordenMultiple.length >
        1
      ) {

        return (
          `${flecha}${indice + 1}`
        );

      }


      return flecha;

    };


  // ==========================================================
  // EXPORTAR EXCEL
  // ==========================================================

  const exportarExcel =
    async () => {

      try {

        setError("");


        await exportarExcelExpedientes({

          nif:
            filtrosAplicados.nif ||
            undefined,

          actividad:
            filtrosAplicados.actividad ||
            undefined,

          fechaInicio:
            filtrosAplicados.fechaInicio ||
            undefined,

          fechaFin:
            filtrosAplicados.fechaFin ||
            undefined,

          notario:
            filtrosAplicados.notario ||
            undefined,

          oficina:
            filtrosAplicados.oficina ||
            undefined,

          importeMin:
            filtrosAplicados.importeMin !== ""
              ? Number(
                  filtrosAplicados.importeMin
                )
              : undefined,

          importeMax:
            filtrosAplicados.importeMax !== ""
              ? Number(
                  filtrosAplicados.importeMax
                )
              : undefined,

        });

      } catch (
        err
      ) {

        console.error(
          "Error exportando Excel:",
          err
        );


        setError(
          err?.response?.data?.detail ||
          "No se ha podido exportar el Excel."
        );

      }

    };


  // ==========================================================
  // TOGGLE COLUMNA
  // ==========================================================

  const toggleColumna = (
    key
  ) => {

    setColumnasVisiblesManuales(
      (actuales) => {

        if (
          actuales.includes(
            key
          )
        ) {

          return actuales.filter(
            (item) =>
              item !== key
          );

        }


        return [

          ...actuales,

          key,

        ];

      }
    );

  };


  // ==========================================================
  // MOSTRAR TODAS
  // ==========================================================

  const mostrarTodasColumnas =
    () => {

      setColumnasVisiblesManuales(
        COLUMNAS.map(
          (columna) =>
            columna.key
        )
      );

    };


  // ==========================================================
  // RESTAURAR POR DEFECTO
  // ==========================================================

  const restaurarColumnas =
    () => {

      setColumnasVisiblesManuales(
        COLUMNAS_POR_DEFECTO
      );

    };


  // ==========================================================
  // COLUMNAS ACTIVAS
  // ==========================================================

  const columnasActivas =
    useMemo(
      () =>
        COLUMNAS.filter(
          (columna) =>
            columnasVisibles.includes(
              columna.key
            )
        ),
      [
        columnasVisibles,
      ]
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="
        erp-page
        min-h-full

        p-4
        sm:p-6
        lg:p-8

        text-[var(--erp-text)]

        space-y-6

        animate-fade-in
      "
    >

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div
        className="
          max-w-[1700px]
          mx-auto

          flex
          flex-col

          md:flex-row
          md:items-center
          md:justify-between

          gap-4
        "
      >

        <div>

          <h1
            className="
              text-3xl
              font-bold
              text-[var(--erp-text)]
            "
          >
            Expedientes
          </h1>


          <p
            className="
              text-[var(--erp-text-soft)]
              mt-1
            "
          >
            Gestión y consulta de expedientes
          </p>

        </div>


        <button
          type="button"
          onClick={
            exportarExcel
          }
          disabled={
            loading
          }
          className="
            px-4
            py-2.5

            rounded-xl

            bg-[var(--erp-success)]

            hover:brightness-95

            text-white

            shadow-sm

            transition

            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          Exportar Excel
        </button>

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div
          className="
            max-w-[1700px]
            mx-auto

            bg-red-50

            border
            border-red-200

            rounded-xl

            p-4

            text-red-700
          "
        >
          {error}
        </div>

      )}


      {/* ======================================================
          ESTRUCTURA EXPEDIENTES — SIDEBAR + ÁREA DE TRABAJO
      ====================================================== */}

      <div
        className="
          max-w-[1700px]
          mx-auto

          grid
          grid-cols-1
          lg:grid-cols-[280px_minmax(0,1fr)]

          gap-6
          items-start
        "
      >

        {/* ====================================================
            SIDEBAR INTERNO DE EXPEDIENTES
        ==================================================== */}

        <aside
          className="
            rounded-2xl
            border
            shadow-sm
            overflow-hidden
            lg:sticky
            lg:top-4
          "
          style={{
            background: "var(--erp-surface)",
            borderColor: "var(--erp-border)",
          }}
        >

          <div
            className="px-5 py-5 border-b"
            style={{
              borderColor: "var(--erp-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{
                  background: "var(--erp-primary-soft)",
                  color: "var(--erp-primary)",
                }}
              >
                📂
              </div>

              <div>
                <h2 className="font-bold text-base text-[var(--erp-text)]">
                  Expedientes
                </h2>
                <p className="text-xs mt-0.5 text-[var(--erp-text-soft)]">
                  Áreas de trabajo
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActividadSeleccionada("");
                setFiltroActividad("");
                setFiltrosAplicados((actual) => ({ ...actual, actividad: "" }));
                setPagina(1);
              }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all"
              style={{
                background: !actividadSeleccionada
                  ? "var(--erp-primary)"
                  : "transparent",
                color: !actividadSeleccionada
                  ? "#fff"
                  : "var(--erp-text)",
              }}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span>📋</span>
                <span className="font-semibold text-sm truncate">Todos los expedientes</span>
              </span>
              <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: !actividadSeleccionada ? "rgba(255,255,255,.18)" : "var(--erp-surface-soft)" }}>
                {formatearNumero(totalActividades)}
              </span>
            </button>

            <div className="my-2 border-t" style={{ borderColor: "var(--erp-border)" }} />

            {ACTIVIDADES_EXPEDIENTES.map((actividad) => {
              const total = actividades
                .filter((item) => actividadCoincide(actividad, item?.actividad))
                .reduce((suma, item) => suma + Number(item?.total || 0), 0);

              const activa = actividadSeleccionada === actividad.key;

              return (
                <button
                  key={actividad.key}
                  type="button"
                  onClick={() => {
                    const encontrado = actividades.find((item) =>
                      actividadCoincide(actividad, item?.actividad)
                    );
                    const valorBackend = encontrado?.actividad || actividad.label;

                    setActividadSeleccionada(actividad.key);
                    setFiltroActividad(valorBackend);
                    setFiltrosAplicados((actual) => ({ ...actual, actividad: valorBackend }));
                    setPagina(1);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: activa ? "var(--erp-primary-soft)" : "transparent",
                    color: activa ? "var(--erp-primary-dark)" : "var(--erp-text)",
                    border: activa ? "1px solid var(--erp-primary)" : "1px solid transparent",
                  }}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span>{actividad.icono}</span>
                    <span className={activa ? "font-bold text-sm truncate" : "font-medium text-sm truncate"}>
                      {actividad.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "var(--erp-surface-soft)", color: activa ? "var(--erp-primary-dark)" : "var(--erp-text-soft)" }}>
                    {formatearNumero(total)}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ====================================================
            ÁREA PRINCIPAL DE TRABAJO
        ==================================================== */}

        <main className="min-w-0 space-y-6">

          <div
            className="erp-card px-5 py-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {ACTIVIDADES_EXPEDIENTES.find((item) => item.key === actividadSeleccionada)?.icono || "📋"}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-[var(--erp-text)] truncate">
                      {ACTIVIDADES_EXPEDIENTES.find((item) => item.key === actividadSeleccionada)?.label || "Todos los expedientes"}
                    </h2>
                    <p className="text-sm text-[var(--erp-text-soft)] mt-1">
                      {actividadSeleccionada
                        ? "Área de trabajo de la actividad seleccionada"
                        : "Consulta general de todos los expedientes"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 px-4 py-2 rounded-xl" style={{ background: "var(--erp-primary-soft)", color: "var(--erp-primary-dark)" }}>
                <span className="text-xs font-semibold uppercase tracking-wide">Expedientes</span>
                <span className="ml-2 font-bold">{formatearNumero(totalExpedientes)}</span>
              </div>
            </div>
          </div>

      {/* ======================================================
          FILTROS
      ====================================================== */}

      <section
        className="
          erp-card

          max-w-[1700px]
          mx-auto

          p-4

          shadow-sm
        "
      >

        <button
          type="button"

          onClick={() =>
            setMostrarFiltros(
              (actual) =>
                !actual
            )
          }

          className="
            w-full

            flex
            items-center
            justify-between

            text-xl
            font-semibold
            text-left

            text-[var(--erp-text)]

            hover:text-[var(--erp-primary)]

            transition
          "
        >

          <span>
            Filtros avanzados
          </span>


          <span
            className="
              text-sm
              text-[var(--erp-text-soft)]
            "
          >
            {mostrarFiltros
              ? "▲ Ocultar"
              : "▼ Mostrar"}
          </span>

        </button>


        {mostrarFiltros && (

          <div
            className="
              mt-5

              grid

              grid-cols-1
              md:grid-cols-2
              lg:grid-cols-3

              gap-4
            "
          >

            <FiltroInput
              label="NIF titular"
              value={
                filtroNif
              }
              onChange={
                setFiltroNif
              }
            />


            <div>

              <label
                className="
                  block

                  text-sm
                  font-medium

                  text-[var(--erp-text)]

                  mb-1
                "
              >
                Actividad actual
              </label>


              <select
                value={
                  filtroActividad
                }

                onChange={(event) =>
                  setFiltroActividad(
                    event.target.value
                  )
                }

                className="
                  w-full

                  px-3
                  py-2.5

                  rounded-xl

                  bg-[var(--erp-surface)]

                  border
                  border-[var(--erp-border)]

                  text-[var(--erp-text)]

                  outline-none

                  focus:border-[var(--erp-primary)]

                  focus:ring-2

                  focus:ring-[var(--erp-primary-soft)]

                  transition
                "
              >

                <option value="">
                  Todas las actividades
                </option>


                {actividades.map(
                  (
                    item
                  ) => (

                    <option
                      key={
                        item.actividad
                      }
                      value={
                        item.actividad
                      }
                    >
                      {
                        item.actividad
                      }
                    </option>

                  )
                )}

              </select>

            </div>


            <FiltroInput
              label="NIF / nombre notario"
              value={
                filtroNotario
              }
              onChange={
                setFiltroNotario
              }
            />


            <FiltroInput
              label="Oficina"
              value={
                filtroOficina
              }
              onChange={
                setFiltroOficina
              }
            />


            <FiltroInput
              label="Fecha inicio"
              type="date"
              value={
                filtroFechaInicio
              }
              onChange={
                setFiltroFechaInicio
              }
            />


            <FiltroInput
              label="Fecha fin"
              type="date"
              value={
                filtroFechaFin
              }
              onChange={
                setFiltroFechaFin
              }
            />


            <FiltroInput
              label="Importe mínimo"
              type="number"
              value={
                filtroImporteMin
              }
              onChange={
                setFiltroImporteMin
              }
            />


            <FiltroInput
              label="Importe máximo"
              type="number"
              value={
                filtroImporteMax
              }
              onChange={
                setFiltroImporteMax
              }
            />


            <div
              className="
                flex
                items-end

                gap-3
              "
            >

              <button
                type="button"

                onClick={
                  aplicarFiltros
                }

                className="
                  px-4
                  py-2.5

                  rounded-xl

                  bg-[var(--erp-primary)]

                  hover:bg-[var(--erp-primary-dark)]

                  text-white

                  transition
                "
              >
                Aplicar filtros
              </button>


              <button
                type="button"

                onClick={
                  limpiarFiltros
                }

                className="
                  px-4
                  py-2.5

                  rounded-xl

                  bg-white

                  border
                  border-[var(--erp-border)]

                  text-[var(--erp-text)]

                  hover:bg-[var(--erp-surface-soft)]

                  transition
                "
              >
                Limpiar
              </button>

            </div>

          </div>

        )}

      </section>


      {/* ======================================================
          COLUMNAS VISIBLES
      ====================================================== */}

      <section
        className="
          erp-card

          max-w-[1700px]
          mx-auto

          p-4

          shadow-sm
        "
      >

        <button
          type="button"

          onClick={() =>
            setMostrarColumnas(
              (actual) =>
                !actual
            )
          }

          className="
            w-full

            flex
            items-center
            justify-between

            text-xl
            font-semibold
            text-left

            text-[var(--erp-text)]

            hover:text-[var(--erp-primary)]

            transition
          "
        >

          <span>
            Columnas visibles
          </span>


          <span
            className="
              text-sm
              text-[var(--erp-text-soft)]
            "
          >
            {mostrarColumnas
              ? "▲ Ocultar"
              : "▼ Mostrar"}
          </span>

        </button>


        {mostrarColumnas && (

          <div
            className="
              mt-5
            "
          >

            <div
              className="
                flex
                flex-wrap

                gap-2

                mb-4
              "
            >

              <button
                type="button"

                onClick={
                  mostrarTodasColumnas
                }

                className="
                  px-3
                  py-1.5

                  rounded-lg

                  text-sm

                  bg-[var(--erp-primary-soft)]

                  text-[var(--erp-primary)]

                  border
                  border-[var(--erp-border)]

                  hover:border-[#c1cee2]
                "
              >
                Mostrar todas
              </button>


              <button
                type="button"

                onClick={
                  restaurarColumnas
                }

                className="
                  px-3
                  py-1.5

                  rounded-lg

                  text-sm

                  bg-white

                  text-[var(--erp-text)]

                  border
                  border-[var(--erp-border)]

                  hover:bg-[var(--erp-surface-soft)]
                "
              >
                Restaurar por defecto
              </button>

            </div>


            <div
              className="
                grid

                grid-cols-2
                md:grid-cols-4
                lg:grid-cols-6

                gap-2
              "
            >

              {COLUMNAS.map(
                (
                  columna
                ) => (

                  <label
                    key={
                      columna.key
                    }

                    className="
                      flex

                      items-start

                      gap-2

                      text-sm

                      text-[var(--erp-text)]

                      cursor-pointer

                      rounded-lg

                      px-2
                      py-1.5

                      hover:bg-[var(--erp-primary-soft)]
                    "
                  >

                    <input
                      type="checkbox"

                      checked={
                        columnasVisibles.includes(
                          columna.key
                        )
                      }

                      onChange={() =>
                        toggleColumna(
                          columna.key
                        )
                      }

                      className="
                        mt-0.5

                        accent-[var(--erp-primary)]
                      "
                    />


                    <span>
                      {
                        columna.label
                      }
                    </span>

                  </label>

                )
              )}

            </div>

          </div>

        )}

      </section>


      {/* ======================================================
          TABLA
      ====================================================== */}

      <section
        className="
          erp-card

          max-w-[1700px]
          mx-auto

          p-2
          sm:p-3

          shadow-sm
        "
      >

        {loading ? (

          <div
            className="
              text-[var(--erp-text-soft)]

              animate-pulse

              py-16

              text-center
            "
          >
            Cargando expedientes…
          </div>

        ) : expedientes.length === 0 ? (

          <div
            className="
              text-[var(--erp-text-soft)]

              py-16

              text-center
            "
          >
            No hay expedientes para mostrar.
          </div>

        ) : (

          <div
            className="
              overflow-auto

              rounded-xl

              border
              border-[var(--erp-border)]

              bg-[var(--erp-surface)]
            "
          >

            <table
              className="
                min-w-max

                w-full

                text-sm

                text-[var(--erp-text)]
              "
            >

              <thead>

                <tr
                  className="
                    text-left

                    bg-[var(--erp-primary)]
                  "
                >

                  {columnasActivas.map(
                    (
                      columna
                    ) => (

                      <th
                        key={
                          columna.key
                        }

                        className="
                          px-4
                          py-3

                          cursor-pointer
                          select-none

                          whitespace-nowrap

                          text-white

                          font-semibold

                          border-b
                          border-white/20

                          sticky
                          top-0

                          bg-[var(--erp-primary)]

                          z-10

                          hover:bg-[var(--erp-primary-dark)]
                        "

                        onClick={(
                          event
                        ) =>
                          ordenar(
                            columna.key,
                            event.shiftKey
                          )
                        }

                        title={
                          "Clic para ordenar. " +
                          "Shift + clic para añadir " +
                          "ordenación múltiple."
                        }
                      >

                        <div
                          className="
                            flex
                            items-center

                            gap-2
                          "
                        >

                          <span>
                            {
                              columna.label
                            }
                          </span>


                          <span
                            className="
                              text-white/70

                              text-xs
                            "
                          >
                            {
                              iconoOrden(
                                columna.key
                              )
                            }
                          </span>

                        </div>

                      </th>

                    )
                  )}


                  <th
                    className="
                      px-4
                      py-3

                      whitespace-nowrap

                      text-white

                      font-semibold

                      border-b
                      border-white/20

                      sticky
                      top-0

                      bg-[var(--erp-primary)]

                      z-10
                    "
                  >
                    Acciones
                  </th>

                </tr>

              </thead>


              <tbody>

                {expedientes.map(
                  (
                    expediente,
                    indice
                  ) => (

                    <tr
                      key={
                        expediente.id_expediente ||
                        expediente.id ||
                        indice
                      }

                      className="
                        bg-[var(--erp-surface)]

                        border-t
                        border-[var(--erp-border)]

                        hover:bg-[var(--erp-primary-soft)]

                        transition-colors
                      "
                    >

                      {columnasActivas.map(
                        (
                          columna
                        ) => (

                          <td
                            key={
                              columna.key
                            }

                            className="
                              px-4
                              py-3

                              whitespace-nowrap

                              max-w-[400px]

                              overflow-hidden
                              text-ellipsis

                              text-[var(--erp-text)]
                            "

                            title={
                              expediente[
                                columna.key
                              ] ?? ""
                            }
                          >

                            {
                              formatearValor(
                                expediente[
                                  columna.key
                                ],
                                columna.tipo
                              )
                            }

                          </td>

                        )
                      )}


                      <td
                        className="
                          px-4
                          py-3

                          whitespace-nowrap

                          bg-[var(--erp-surface)]
                        "
                      >

                        <Link
                          to={
                            `/expedientes/${encodeURIComponent(
                              expediente.id_expediente
                            )}`
                          }

                          className="
                            inline-flex
                            items-center

                            px-3
                            py-1.5

                            rounded-lg

                            bg-[var(--erp-primary-soft)]

                            text-[var(--erp-primary)]

                            font-medium

                            hover:bg-[#dfe9ff]

                            transition
                          "
                        >
                          Ver ficha
                        </Link>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ======================================================
          INFORMACIÓN DE PAGINACIÓN
      ====================================================== */}

      <div
        className="
          max-w-[1700px]
          mx-auto

          flex

          flex-col

          sm:flex-row

          items-center
          justify-between

          gap-3

          text-sm

          text-[var(--erp-text-soft)]
        "
      >

        <span>

          Total de expedientes:{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              formatearNumero(
                totalExpedientes
              )
            }
          </strong>

        </span>


        <span>

          Mostrando{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              expedientes.length
            }
          </strong>

          {" "}en esta página

        </span>

      </div>


      {/* ======================================================
          PAGINACIÓN
      ====================================================== */}

      <div
        className="
          max-w-[1700px]
          mx-auto

          flex
          flex-col

          sm:flex-row

          items-center
          justify-center

          gap-4
        "
      >

        <button
          type="button"

          disabled={
            pagina <= 1 ||
            loading
          }

          onClick={() =>
            setPagina(
              (actual) =>
                Math.max(
                  1,
                  actual - 1
                )
            )
          }

          className="
            px-4
            py-2

            rounded-xl

            bg-white

            border
            border-[var(--erp-border)]

            text-[var(--erp-text)]

            hover:bg-[var(--erp-surface-soft)]

            transition

            disabled:opacity-40

            disabled:cursor-not-allowed
          "
        >
          Anterior
        </button>


        <span
          className="
            text-[var(--erp-text-soft)]
          "
        >

          Página{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              pagina
            }
          </strong>

          {" "}de{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              totalPaginas
            }
          </strong>

        </span>


        <button
          type="button"

          disabled={
            pagina >=
              totalPaginas ||
            loading
          }

          onClick={() =>
            setPagina(
              (actual) =>
                Math.min(
                  totalPaginas,
                  actual + 1
                )
            )
          }

          className="
            px-4
            py-2

            rounded-xl

            bg-white

            border
            border-[var(--erp-border)]

            text-[var(--erp-text)]

            hover:bg-[var(--erp-surface-soft)]

            transition

            disabled:opacity-40

            disabled:cursor-not-allowed
          "
        >
          Siguiente
        </button>

      </div>

        </main>

      </div>

    </div>

  );
}


// ============================================================
// FILTRO INPUT
// ============================================================

function FiltroInput({
  label,
  value,
  onChange,
  type = "text",
}) {

  return (

    <div>

      <label
        className="
          block

          text-sm
          font-medium

          text-[var(--erp-text)]

          mb-1
        "
      >
        {label}
      </label>


      <input
        type={type}

        value={value}

        onChange={(event) =>
          onChange(
            event.target.value
          )
        }

        className="
          w-full

          px-3
          py-2.5

          rounded-xl

          bg-[var(--erp-surface)]

          border
          border-[var(--erp-border)]

          text-[var(--erp-text)]

          placeholder:text-[var(--erp-text-soft)]

          outline-none

          focus:border-[var(--erp-primary)]

          focus:ring-2

          focus:ring-[var(--erp-primary-soft)]

          transition
        "
      />

    </div>

  );

}
