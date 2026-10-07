// ============================================================
// ERP MOLSAN — EXPEDIENTES
// LISTADO PREMIUM 2027
// ============================================================

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
  obtenerResumenExpedientes,
  exportarExcelExpedientes,
} from "../../api/expedientes";


// ============================================================
// ACTIVIDADES OFICIALES ABSIS
// ============================================================

const ACTIVIDADES_ABSIS = [
  "Alta/Validación",
  "Documentación previa",
  "Facturación y cierre",
  "Liquidación impuestos",
  "Sede Notarial",
  "Tramitación inscripción",
];


// ============================================================
// ACTIVIDADES DEL WORKFLOW DE EXPEDIENTES
// ============================================================

const ACTIVIDADES_EXPEDIENTES = [
  {
    key: "documentacion-previa",
    label: "Documentación previa",
    icon: "📄",
    aliases: [
      "Documentación previa",
    ],
  },

  {
    key: "sede-notarial",
    label: "Sede notarial",
    icon: "🏛️",
    aliases: [
      "Sede notarial",
      "Sede Notarial",
    ],
  },

  {
    key: "sede-notarial-protocolo",
    label: "Sede notarial con protocolo",
    icon: "📜",
    aliases: [
      "Sede notarial con protocolo",
      "Sede Notarial con protocolo",
    ],
  },

  {
    key: "liquidacion-impuestos",
    label: "Liquidación de impuestos",
    icon: "💶",
    aliases: [
      "Liquidación de impuestos",
      "Liquidación impuestos",
      "Liquidacion de impuestos",
      "Liquidacion impuestos",
    ],
  },

  {
    key: "tramitacion-inscripcion",
    label: "Tramitación inscripción",
    icon: "🏢",
    aliases: [
      "Tramitación inscripción",
      "Tramitacion inscripcion",
    ],
  },

  {
    key: "defectos-registrales",
    label: "Defectos registrales",
    icon: "⚠️",
    aliases: [
      "Defectos registrales",
      "Defectos Registrales",
    ],
  },

  {
    key: "facturacion-cierre",
    label: "Facturación y cierre",
    icon: "🧾",
    aliases: [
      "Facturación y cierre",
      "Facturacion y cierre",
    ],
  },
];


// ============================================================
// COLUMNAS
// ============================================================

const COLUMNAS = [
  {
    key: "id_expediente",
    label: "Nº Expediente",
    tipo: "texto",
  },

  {
    key: "fecha_alta",
    label: "Fecha alta",
    tipo: "fecha",
  },

  {
    key: "actividad_actual",
    label: "Actividad actual",
    tipo: "texto",
  },

  {
    key: "estado_expediente",
    label: "Estado expediente",
    tipo: "texto",
  },

  {
    key: "estado_actividad",
    label: "Estado actividad",
    tipo: "texto",
  },

  {
    key: "importe",
    label: "Importe",
    tipo: "numero",
  },

  {
    key: "capital",
    label: "Capital",
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

  {
    key: "nif",
    label: "NIF",
    tipo: "texto",
  },

  {
    key: "cliente",
    label: "Cliente",
    tipo: "texto",
  },

  {
    key: "notario",
    label: "Notario",
    tipo: "texto",
  },

  {
    key: "oficina",
    label: "Oficina",
    tipo: "texto",
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
    label: "Fecha entrega cliente",
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
    key: "estado_expediente_ancert",
    label: "Estado ANCert",
    tipo: "texto",
  },
];


// ============================================================
// COLUMNAS POR DEFECTO
// ============================================================

const COLUMNAS_POR_DEFECTO = [
  "id_expediente",
  "fecha_alta",
  "actividad_actual",
  "estado_expediente",
  "estado_actividad",
  "importe",
  "capital",
  "saldo_real",
  "saldo_disponible",
  "oficina",
];


// ============================================================
// FORMATEAR NÚMERO
// ============================================================

function formatearNumero(
  valor
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "0";
  }

  const numero = Number(
    valor
  );

  if (
    Number.isNaN(numero)
  ) {
    return String(
      valor
    );
  }

  return numero.toLocaleString(
    "es-ES"
  );
}


// ============================================================
// FORMATEAR FECHA
// ============================================================

function formatearFecha(
  valor
) {
  if (
    !valor
  ) {
    return "";
  }

  const fecha =
    new Date(
      valor
    );

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return String(
      valor
    );
  }

  return fecha.toLocaleDateString(
    "es-ES"
  );
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

  if (
    tipo === "numero"
  ) {
    return formatearNumero(
      valor
    );
  }

  if (
    tipo === "fecha"
  ) {
    return formatearFecha(
      valor
    );
  }

  return String(
    valor
  );
}


// ============================================================
// NORMALIZAR TEXTO DE ACTIVIDAD
// ============================================================

function normalizarActividad(
  valor
) {
  return String(
    valor || ""
  )
    .trim()
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}


// ============================================================
// OBTENER DATOS DE UNA ACTIVIDAD
// ============================================================

function obtenerActividadDatos(
  actividad,
  actividades
) {
  if (
    !actividad
  ) {
    return null;
  }

  const aliases = [
    actividad.label,
    ...(actividad.aliases || []),
  ];

  const encontrados =
    actividades.filter(
      (item) => {
        const actual =
          normalizarActividad(
            item?.actividad
          );

        return aliases.some(
          (alias) =>
            normalizarActividad(
              alias
            ) === actual
        );
      }
    );

  if (
    encontrados.length === 0
  ) {
    return null;
  }

  return encontrados.reduce(
    (acumulado, item) => {
      return (
        acumulado +
        Number(
          item?.total || 0
        )
      );
    },
    0
  );
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ExpedientesListado() {

  // ==========================================================
  // DATOS PRINCIPALES
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

  const [
    recargaRealtime,
    setRecargaRealtime,
  ] = useState(0);


  // ==========================================================
  // UI
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
  // ACTIVIDAD SELECCIONADA
  // ==========================================================

  const [
    actividadSeleccionada,
    setActividadSeleccionada,
  ] = useState("");


  // ==========================================================
  // FILTROS
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
  // ORDEN
  // ==========================================================

  const [
    ordenMultiple,
    setOrdenMultiple,
  ] = useState([]);


  // ==========================================================
  // COLUMNAS
  // ==========================================================

  const [
    columnasVisibles,
    setColumnasVisibles,
  ] = useState(
    COLUMNAS_POR_DEFECTO
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
  // ACTIVIDAD ACTIVA
  // ==========================================================

  const actividadActiva =
    ACTIVIDADES_EXPEDIENTES.find(
      (item) =>
        item.key ===
        actividadSeleccionada
    ) || null;


  // ==========================================================
  // TOTAL DE UNA ACTIVIDAD
  // ==========================================================

  const obtenerTotalActividad = (
    actividad
  ) => {
    const total =
      obtenerActividadDatos(
        actividad,
        actividades
      );

    return Number(
      total || 0
    );
  };


  // ==========================================================
  // SELECCIONAR ACTIVIDAD
  // ==========================================================

  const seleccionarActividad = (
    actividad
  ) => {

    if (
      !actividad
    ) {

      setActividadSeleccionada(
        ""
      );

      setFiltroActividad(
        ""
      );

      setFiltrosAplicados(
        (actual) => ({
          ...actual,
          actividad: "",
        })
      );

      setPagina(
        1
      );

      setError(
        ""
      );

      return;
    }


    const datos =
      obtenerActividadDatos(
        actividad,
        actividades
      );


    let valorFiltro =
      actividad.label;


    if (
      datos !== null
    ) {

      const encontrado =
        actividades.find(
          (item) => {

            const actual =
              normalizarActividad(
                item?.actividad
              );

            return (
              actividad.aliases.some(
                (alias) =>
                  normalizarActividad(
                    alias
                  ) === actual
              )
            );

          }
        );


      if (
        encontrado?.actividad
      ) {
        valorFiltro =
          encontrado.actividad;
      }

    }


    setActividadSeleccionada(
      actividad.key
    );

    setFiltroActividad(
      valorFiltro
    );

    setFiltrosAplicados(
      (actual) => ({
        ...actual,
        actividad:
          valorFiltro,
      })
    );

    setPagina(
      1
    );

    setError(
      ""
    );
  }


  // ==========================================================
  // CARGAR EXPEDIENTES
  // ==========================================================

  useEffect(() => {

    let activo = true;


    async function cargar() {

      setLoading(
        true
      );


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
              filtrosAplicados.importeMin !==
              ""
                ? Number(
                    filtrosAplicados.importeMin
                  )
                : undefined,

            importeMax:
              filtrosAplicados.importeMax !==
              ""
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


        if (
          !activo
        ) {
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


        if (
          activo
        ) {

          setError(
            err?.response?.data?.detail ||
            "No se han podido cargar los expedientes."
          );


          setExpedientes([]);

          setTotalExpedientes(
            0
          );

          setTotalPaginas(
            1
          );

        }

      } finally {

        if (
          activo
        ) {

          setLoading(
            false
          );

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

      setLoadingActividades(
        true
      );

      setErrorActividades(
        ""
      );


      try {

        const res =
          await obtenerResumenExpedientes();


        if (
          !activo
        ) {
          return;
        }


        setTotalActividades(
          Number(
            res?.total || 0
          )
        );


        // ====================================================
        // FORMATO ARRAY
        // ====================================================

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
                    normalizarActividad(
                      nombre
                    ) ===
                    normalizarActividad(
                      a.actividad
                    )
                );


              const indiceB =
                ACTIVIDADES_ABSIS.findIndex(
                  (nombre) =>
                    normalizarActividad(
                      nombre
                    ) ===
                    normalizarActividad(
                      b.actividad
                    )
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


        // ====================================================
        // FORMATO OBJETO
        // ====================================================

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
                ([
                  actividad,
                  total,
                ]) => ({
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


        if (
          activo
        ) {

          setActividades([]);

          setTotalActividades(
            0
          );


          setErrorActividades(
            err?.response?.data?.detail ||
            "No se han podido cargar las actividades."
          );

        }

      } finally {

        if (
          activo
        ) {

          setLoadingActividades(
            false
          );

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


    setPagina(
      1
    );

    setError(
      ""
    );

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


    setActividadSeleccionada(
      ""
    );


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


    setPagina(
      1
    );

    setError(
      ""
    );

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

    if (
      !shiftKey
    ) {

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


      setPagina(
        1
      );

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


    setPagina(
      1
    );

  };


  // ==========================================================
  // ICONO ORDEN
  // ==========================================================

  const iconoOrden = (
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

        setError(
          ""
        );


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
            filtrosAplicados.importeMin !==
            ""
              ? Number(
                  filtrosAplicados.importeMin
                )
              : undefined,

          importeMax:
            filtrosAplicados.importeMax !==
            ""
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

    setColumnasVisibles(
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

      setColumnasVisibles(
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

      setColumnasVisibles(
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

  // ============================================================
  // CARGA DEL LISTADO DE EXPEDIENTES
  // ============================================================

  useEffect(() => {
    let activo = true;

    async function cargarExpedientes() {
      try {
        setLoading(true);
        setError("");

        const respuesta = await obtenerListadoExpedientes({
          pagina,
          porPagina,

          nif: filtrosAplicados.nif || undefined,
          actividad: filtrosAplicados.actividad || undefined,

          fechaInicio:
            filtrosAplicados.fechaInicio || undefined,

          fechaFin:
            filtrosAplicados.fechaFin || undefined,

          notario:
            filtrosAplicados.notario || undefined,

          oficina:
            filtrosAplicados.oficina || undefined,

          importeMin:
            filtrosAplicados.importeMin !== ""
              ? Number(filtrosAplicados.importeMin)
              : undefined,

          importeMax:
            filtrosAplicados.importeMax !== ""
              ? Number(filtrosAplicados.importeMax)
              : undefined,

          ordenMultiple:
            ordenMultiple.length > 0
              ? JSON.stringify(ordenMultiple)
              : undefined,
        });

        if (!activo) return;

        const datos = respuesta?.datos || respuesta?.items || [];

        setExpedientes(Array.isArray(datos) ? datos : []);

        setTotalExpedientes(
          Number(
            respuesta?.total ??
              respuesta?.totalExpedientes ??
              respuesta?.count ??
              0
          )
        );

        setTotalPaginas(
          Math.max(
            1,
            Number(
              respuesta?.totalPaginas ??
                respuesta?.paginas ??
                Math.ceil(
                  Number(
                    respuesta?.total ??
                      respuesta?.totalExpedientes ??
                      0
                  )
                ) / porPagina
            )
          )
        );
      } catch (err) {
        console.error(
          "ERROR CARGANDO LISTADO DE EXPEDIENTES:",
          err
        );

        if (!activo) return;

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "No se ha podido cargar el listado de expedientes."
        );

        setExpedientes([]);
        setTotalExpedientes(0);
        setTotalPaginas(1);
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    }

    cargarExpedientes();

    return () => {
      activo = false;
    };
  }, [
    pagina,
    filtrosAplicados,
    ordenMultiple,
    recargaRealtime,
  ]);

  // ============================================================
  // CARGA DEL RESUMEN DE ACTIVIDADES
  // ============================================================

  useEffect(() => {
    let activo = true;

    async function cargarResumenActividades() {
      try {
        setLoadingActividades(true);
        setErrorActividades("");

        const respuesta = await obtenerResumenExpedientes();

        if (!activo) return;

        let lista = [];

        if (Array.isArray(respuesta)) {
          lista = respuesta;
        } else if (Array.isArray(respuesta?.actividades)) {
          lista = respuesta.actividades;
        } else if (Array.isArray(respuesta?.datos)) {
          lista = respuesta.datos;
        } else if (Array.isArray(respuesta?.items)) {
          lista = respuesta.items;
        } else if (
          respuesta &&
          typeof respuesta === "object"
        ) {
          lista = Object.entries(respuesta).map(
            ([actividad, total]) => ({
              actividad,
              total,
            })
          );
        }

        const normalizados = lista.map((item) => {
          if (typeof item === "string") {
            return {
              actividad: item,
              total: 0,
            };
          }

          return {
            ...item,
            actividad:
              item?.actividad ??
              item?.nombre ??
              item?.actividad_actual ??
              item?.label ??
              "",
            total:
              Number(
                item?.total ??
                  item?.cantidad ??
                  item?.count ??
                  item?.numero ??
                  0
              ) || 0,
          };
        });

        setActividades(normalizados);

        const total =
          Number(
            respuesta?.total ??
              respuesta?.totalExpedientes ??
              respuesta?.total_expedientes
          ) ||
          normalizados.reduce(
            (acumulado, item) =>
              acumulado + Number(item.total || 0),
            0
          );

        setTotalActividades(total);
      } catch (err) {
        console.error(
          "ERROR CARGANDO RESUMEN DE ACTIVIDADES:",
          err
        );

        if (!activo) return;

        setErrorActividades(
          err?.response?.data?.detail ||
            err?.message ||
            "No se ha podido cargar el resumen de actividades."
        );

        setActividades([]);
        setTotalActividades(0);
      } finally {
        if (activo) {
          setLoadingActividades(false);
        }
      }
    }

    cargarResumenActividades();

    return () => {
      activo = false;
    };
  }, [recargaRealtime]);

  // ============================================================
  // RECARGA EN TIEMPO REAL
  // ============================================================

  useEffect(() => {
    const intervalo = setInterval(() => {
      setRecargaRealtime((valor) => valor + 1);
    }, 30000);

    return () => clearInterval(intervalo);
  }, []);

  // ============================================================
  // APLICAR FILTROS AVANZADOS
  // ============================================================

  const aplicarFiltros = () => {
    setPagina(1);

    setFiltrosAplicados({
      nif: filtroNif.trim(),
      actividad: filtroActividad.trim(),
      fechaInicio: filtroFechaInicio,
      fechaFin: filtroFechaFin,
      notario: filtroNotario.trim(),
      oficina: filtroOficina.trim(),
      importeMin: filtroImporteMin,
      importeMax: filtroImporteMax,
    });

    /*
     * Si el usuario escribe manualmente una actividad
     * en el filtro avanzado, sincronizamos también
     * la selección visual del menú lateral.
     */
    if (filtroActividad.trim()) {
      setActividadSeleccionada(filtroActividad.trim());
    } else {
      setActividadSeleccionada("");
    }
  };

  // ============================================================
  // LIMPIAR FILTROS
  // ============================================================

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

    setActividadSeleccionada("");
    setPagina(1);
  };

  // ============================================================
  // SELECCIONAR ACTIVIDAD DESDE EL SIDEBAR
  // ============================================================

  const seleccionarActividad = (actividad) => {
    /*
     * TODOS
     */
    if (!actividad) {
      setActividadSeleccionada("");
      setFiltroActividad("");

      setFiltrosAplicados((actual) => ({
        ...actual,
        actividad: "",
      }));

      setPagina(1);
      return;
    }

    /*
     * ACTIVIDAD CONCRETA
     */
    const datosActividad =
      obtenerActividadDatos(actividad);

    const valorBackend =
      datosActividad?.actividadBackend ||
      datosActividad?.label ||
      actividad;

    setActividadSeleccionada(actividad);
    setFiltroActividad(valorBackend);

    setFiltrosAplicados((actual) => ({
      ...actual,
      actividad: valorBackend,
    }));

    setPagina(1);
  };

  // ============================================================
  // ORDENACIÓN DE COLUMNAS
  // ============================================================

  const cambiarOrden = (campo) => {
    setOrdenMultiple((actual) => {
      const existente = actual.find(
        (item) => item.campo === campo
      );

      if (!existente) {
        return [
          ...actual,
          {
            campo,
            direccion: "asc",
          },
        ];
      }

      if (existente.direccion === "asc") {
        return actual.map((item) =>
          item.campo === campo
            ? {
                ...item,
                direccion: "desc",
              }
            : item
        );
      }

      return actual.filter(
        (item) => item.campo !== campo
      );
    });

    setPagina(1);
  };

  // ============================================================
  // INFORMACIÓN DE ORDENACIÓN
  // ============================================================

  const obtenerOrdenCampo = (campo) => {
    const indice = ordenMultiple.findIndex(
      (item) => item.campo === campo
    );

    if (indice === -1) {
      return null;
    }

    return {
      posicion: indice + 1,
      direccion:
        ordenMultiple[indice].direccion,
    };
  };

  // ============================================================
  // EXPORTAR EXCEL
  // ============================================================

  const exportarExcel = async () => {
    try {
      const blob = await exportarExcelExpedientes({
        nif: filtrosAplicados.nif || undefined,

        actividad:
          filtrosAplicados.actividad || undefined,

        fechaInicio:
          filtrosAplicados.fechaInicio || undefined,

        fechaFin:
          filtrosAplicados.fechaFin || undefined,

        notario:
          filtrosAplicados.notario || undefined,

        oficina:
          filtrosAplicados.oficina || undefined,

        importeMin:
          filtrosAplicados.importeMin !== ""
            ? Number(filtrosAplicados.importeMin)
            : undefined,

        importeMax:
          filtrosAplicados.importeMax !== ""
            ? Number(filtrosAplicados.importeMax)
            : undefined,

        ordenMultiple:
          ordenMultiple.length > 0
            ? JSON.stringify(ordenMultiple)
            : undefined,
      });

      const url = window.URL.createObjectURL(blob);

      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = "expedientes.xlsx";

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "ERROR EXPORTANDO EXPEDIENTES:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "No se ha podido exportar el listado."
      );
    }
  };

  // ============================================================
  // CAMBIO DE PÁGINA
  // ============================================================

  const irAPagina = (numero) => {
    const nuevaPagina = Math.min(
      Math.max(1, numero),
      totalPaginas
    );

    setPagina(nuevaPagina);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================================================
  // CAMBIAR VISIBILIDAD DE COLUMNA
  // ============================================================

  const cambiarVisibilidadColumna = (campo) => {
    setColumnasVisibles((actual) => {
      const existe = actual.includes(campo);

      if (existe) {
        /*
         * Evitamos dejar la tabla completamente vacía.
         */
        if (actual.length <= 1) {
          return actual;
        }

        return actual.filter(
          (columna) => columna !== campo
        );
      }

      return [...actual, campo];
    });
  };

  // ============================================================
  // FORMATEADORES
  // ============================================================

  const formatearFecha = (valor) => {
    if (!valor) return "—";

    try {
      const fecha = new Date(valor);

      if (Number.isNaN(fecha.getTime())) {
        return String(valor);
      }

      return fecha.toLocaleDateString("es-ES");
    } catch {
      return String(valor);
    }
  };

  const formatearNumero = (valor) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "—";
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return numero.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatearTexto = (valor) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "—";
    }

    return String(valor);
  };

  // ============================================================
  // RENDER DE CELDAS
  // ============================================================

  const renderValorColumna = (
    expediente,
    columna
  ) => {
    const valor = expediente?.[columna.campo];

    if (
      columna.tipo === "fecha"
    ) {
      return formatearFecha(valor);
    }

    if (
      columna.tipo === "numero" ||
      columna.tipo === "importe"
    ) {
      return formatearNumero(valor);
    }

    return formatearTexto(valor);
  };

  // ============================================================
  // COLUMNAS ACTUALES
  // ============================================================

  const columnasRenderizadas = columnas
    .filter((columna) =>
      columnasVisibles.includes(
        columna.campo
      )
    );

  // ============================================================
  // ACTIVIDAD ACTIVA
  // ============================================================

  const actividadActiva = actividadSeleccionada
    ? obtenerActividadDatos(
        actividadSeleccionada
      )
    : null;

  // ============================================================
  // TOTALES DE PÁGINACIÓN
  // ============================================================

  const primerRegistro =
    totalExpedientes === 0
      ? 0
      : (pagina - 1) * porPagina + 1;

  const ultimoRegistro =
    Math.min(
      pagina * porPagina,
      totalExpedientes
    );

  // ============================================================
  // CARGANDO
  // ============================================================

  if (loading && expedientes.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div
          className="flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-sm"
          style={{
            background:
              "var(--erp-surface)",
            borderColor:
              "var(--erp-border)",
            color: "var(--erp-text)",
          }}
        >
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor:
                "var(--erp-primary)",
              borderTopColor:
                "transparent",
            }}
          />

          <span className="font-medium">
            Cargando expedientes...
          </span>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <div
      className="w-full min-h-full px-4 py-6 lg:px-6"
      style={{
        background:
          "var(--erp-surface-soft)",
        color: "var(--erp-text)",
      }}
    >
            {/* ======================================================
          CABECERA PRINCIPAL
      ====================================================== */}

      <div className="max-w-[1700px] mx-auto mb-6">
        <div
          className="rounded-3xl border shadow-sm px-6 py-5"
          style={{
            background: "var(--erp-surface)",
            borderColor: "var(--erp-border)",
          }}
        >
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                  style={{
                    background:
                      "var(--erp-primary-soft)",
                    color:
                      "var(--erp-primary)",
                  }}
                >
                  📁
                </div>

                <div>
                  <h1
                    className="text-2xl font-bold tracking-tight"
                    style={{
                      color:
                        "var(--erp-text)",
                    }}
                  >
                    Expedientes
                  </h1>

                  <p
                    className="text-sm mt-1"
                    style={{
                      color:
                        "var(--erp-text-soft)",
                    }}
                  >
                    Gestión y seguimiento de expedientes
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMostrarFiltros(
                    (valor) => !valor
                  )
                }
                className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:shadow-sm"
                style={{
                  background:
                    mostrarFiltros
                      ? "var(--erp-primary-soft)"
                      : "var(--erp-surface)",
                  borderColor:
                    "var(--erp-border)",
                  color:
                    "var(--erp-text)",
                }}
              >
                🔎{" "}
                {mostrarFiltros
                  ? "Ocultar filtros"
                  : "Filtros avanzados"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setMostrarColumnas(
                    (valor) => !valor
                  )
                }
                className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:shadow-sm"
                style={{
                  background:
                    mostrarColumnas
                      ? "var(--erp-primary-soft)"
                      : "var(--erp-surface)",
                  borderColor:
                    "var(--erp-border)",
                  color:
                    "var(--erp-text)",
                }}
              >
                ☷{" "}
                {mostrarColumnas
                  ? "Ocultar columnas"
                  : "Columnas"}
              </button>

              <button
                type="button"
                onClick={exportarExcel}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md"
                style={{
                  background:
                    "var(--erp-primary)",
                }}
              >
                📊 Exportar Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          ERROR GENERAL
      ====================================================== */}

      {error && (
        <div className="max-w-[1700px] mx-auto mb-6">
          <div
            className="rounded-2xl border px-5 py-4"
            style={{
              background:
                "rgba(220, 38, 38, 0.06)",
              borderColor:
                "rgba(220, 38, 38, 0.20)",
              color:
                "rgb(185, 28, 28)",
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">
                ⚠️
              </span>

              <div>
                <div className="font-semibold">
                  No se ha podido cargar el listado
                </div>

                <div className="text-sm mt-1">
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          ESTRUCTURA PRINCIPAL
          SIDEBAR + ÁREA DE TRABAJO
      ====================================================== */}

      <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">

        {/* ====================================================
            SIDEBAR DE EXPEDIENTES
        ==================================================== */}

        <aside
          className="rounded-3xl border shadow-sm overflow-hidden lg:sticky lg:top-4"
          style={{
            background:
              "var(--erp-surface)",
            borderColor:
              "var(--erp-border)",
          }}
        >
          {/* CABECERA SIDEBAR */}

          <div
            className="px-5 py-5 border-b"
            style={{
              borderColor:
                "var(--erp-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    "var(--erp-primary-soft)",
                  color:
                    "var(--erp-primary)",
                }}
              >
                📂
              </div>

              <div>
                <h2
                  className="font-bold text-base"
                  style={{
                    color:
                      "var(--erp-text)",
                  }}
                >
                  Expedientes
                </h2>

                <p
                  className="text-xs mt-0.5"
                  style={{
                    color:
                      "var(--erp-text-soft)",
                  }}
                >
                  Áreas de trabajo
                </p>
              </div>
            </div>
          </div>

          {/* OPCIÓN TODOS */}

          <div className="p-3">
            <button
              type="button"
              onClick={() =>
                seleccionarActividad("")
              }
              className={
                !actividadSeleccionada
                  ? "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all shadow-sm"
                  : "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all hover:bg-black/[0.03]"
              }
              style={{
                background:
                  !actividadSeleccionada
                    ? "var(--erp-primary)"
                    : "transparent",
                color:
                  !actividadSeleccionada
                    ? "#ffffff"
                    : "var(--erp-text)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">
                  📋
                </span>

                <span className="font-semibold text-sm truncate">
                  Todos los expedientes
                </span>
              </div>

              <span
                className={
                  !actividadSeleccionada
                    ? "shrink-0 min-w-[30px] h-7 px-2 rounded-lg flex items-center justify-center text-xs font-bold bg-white/20"
                    : "shrink-0 min-w-[30px] h-7 px-2 rounded-lg flex items-center justify-center text-xs font-bold"
                }
                style={{
                  color:
                    !actividadSeleccionada
                      ? "#ffffff"
                      : "var(--erp-text)",
                  background:
                    !actividadSeleccionada
                      ? undefined
                      : "var(--erp-surface-soft)",
                }}
              >
                {totalActividades}
              </span>
            </button>
          </div>

          {/* SEPARADOR */}

          <div className="px-5">
            <div
              className="border-t"
              style={{
                borderColor:
                  "var(--erp-border)",
              }}
            />
          </div>

          {/* ACTIVIDADES */}

          <div className="p-3 space-y-1">
            {ACTIVIDADES_EXPEDIENTES.map(
              (actividad) => {
                const datos =
                  obtenerActividadDatos(
                    actividad.key
                  );

                const total =
                  obtenerTotalActividad(
                    actividad.key
                  );

                const activa =
                  actividadSeleccionada ===
                  actividad.key;

                return (
                  <button
                    key={actividad.key}
                    type="button"
                    onClick={() =>
                      seleccionarActividad(
                        actividad.key
                      )
                    }
                    className={
                      activa
                        ? "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all shadow-sm"
                        : "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all hover:bg-black/[0.03]"
                    }
                    style={{
                      background: activa
                        ? "var(--erp-primary-soft)"
                        : "transparent",
                      color: activa
                        ? "var(--erp-primary-dark)"
                        : "var(--erp-text)",
                      border: activa
                        ? "1px solid var(--erp-primary)"
                        : "1px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={
                          activa
                            ? "text-base"
                            : "text-base opacity-80"
                        }
                      >
                        {actividad.icono}
                      </span>

                      <span
                        className={
                          activa
                            ? "font-bold text-sm truncate"
                            : "font-medium text-sm truncate"
                        }
                      >
                        {actividad.label}
                      </span>
                    </div>

                    <span
                      className={
                        activa
                          ? "shrink-0 min-w-[30px] h-7 px-2 rounded-lg flex items-center justify-center text-xs font-bold"
                          : "shrink-0 min-w-[30px] h-7 px-2 rounded-lg flex items-center justify-center text-xs font-semibold"
                      }
                      style={{
                        background: activa
                          ? "var(--erp-surface)"
                          : "var(--erp-surface-soft)",
                        color: activa
                          ? "var(--erp-primary-dark)"
                          : "var(--erp-text-soft)",
                      }}
                    >
                      {total}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* INFORMACIÓN */}

          <div
            className="px-5 py-4 border-t"
            style={{
              borderColor:
                "var(--erp-border)",
              background:
                "var(--erp-surface-soft)",
            }}
          >
            <p
              className="text-xs leading-relaxed"
              style={{
                color:
                  "var(--erp-text-soft)",
              }}
            >
              Selecciona un área de trabajo para
              consultar únicamente los expedientes
              correspondientes a esa actividad.
            </p>
          </div>
        </aside>

        {/* ====================================================
            ÁREA PRINCIPAL
        ==================================================== */}

        <main className="min-w-0 space-y-6">

          {/* ==================================================
              CABECERA DE ACTIVIDAD
          ================================================== */}

          <section
            className="rounded-3xl border shadow-sm px-6 py-5"
            style={{
              background:
                "var(--erp-surface)",
              borderColor:
                "var(--erp-border)",
            }}
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {actividadActiva?.icono ||
                      "📋"}
                  </span>

                  <div className="min-w-0">
                    <h2
                      className="text-xl font-bold truncate"
                      style={{
                        color:
                          "var(--erp-text)",
                      }}
                    >
                      {actividadActiva?.label ||
                        "Todos los expedientes"}
                    </h2>

                    <p
                      className="text-sm mt-1"
                      style={{
                        color:
                          "var(--erp-text-soft)",
                      }}
                    >
                      {actividadActiva
                        ? "Expedientes pendientes de trabajo en esta actividad"
                        : "Consulta general de todos los expedientes"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="shrink-0 px-4 py-2 rounded-xl"
                style={{
                  background:
                    "var(--erp-primary-soft)",
                  color:
                    "var(--erp-primary-dark)",
                }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Expedientes
                </span>

                <span className="ml-2 text-lg font-bold">
                  {totalExpedientes}
                </span>
              </div>
            </div>
          </section>

          {/* ==================================================
              FILTROS AVANZADOS
          ================================================== */}

          {mostrarFiltros && (
            <section
              className="rounded-3xl border shadow-sm overflow-hidden"
              style={{
                background:
                  "var(--erp-surface)",
                borderColor:
                  "var(--erp-border)",
              }}
            >
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{
                  borderColor:
                    "var(--erp-border)",
                }}
              >
                <div>
                  <h3
                    className="font-bold"
                    style={{
                      color:
                        "var(--erp-text)",
                    }}
                  >
                    Filtros avanzados
                  </h3>

                  <p
                    className="text-xs mt-1"
                    style={{
                      color:
                        "var(--erp-text-soft)",
                    }}
                  >
                    Combina varios criterios para localizar expedientes.
                  </p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                <FiltroInput
                  label="NIF"
                  value={filtroNif}
                  onChange={setFiltroNif}
                  placeholder="NIF / CIF"
                />

                <FiltroInput
                  label="Actividad"
                  value={filtroActividad}
                  onChange={setFiltroActividad}
                  placeholder="Actividad"
                />

                <FiltroInput
                  label="Fecha inicio"
                  type="date"
                  value={filtroFechaInicio}
                  onChange={setFiltroFechaInicio}
                />

                <FiltroInput
                  label="Fecha fin"
                  type="date"
                  value={filtroFechaFin}
                  onChange={setFiltroFechaFin}
                />

                <FiltroInput
                  label="Notario"
                  value={filtroNotario}
                  onChange={setFiltroNotario}
                  placeholder="Nombre del notario"
                />

                <FiltroInput
                  label="Oficina"
                  value={filtroOficina}
                  onChange={setFiltroOficina}
                  placeholder="Oficina"
                />

                <FiltroInput
                  label="Importe mínimo"
                  type="number"
                  value={filtroImporteMin}
                  onChange={setFiltroImporteMin}
                  placeholder="0,00"
                />

                <FiltroInput
                  label="Importe máximo"
                  type="number"
                  value={filtroImporteMax}
                  onChange={setFiltroImporteMax}
                  placeholder="0,00"
                />
              </div>

              <div
                className="px-6 py-4 border-t flex flex-wrap items-center justify-end gap-3"
                style={{
                  borderColor:
                    "var(--erp-border)",
                  background:
                    "var(--erp-surface-soft)",
                }}
              >
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:shadow-sm"
                  style={{
                    background:
                      "var(--erp-surface)",
                    borderColor:
                      "var(--erp-border)",
                    color:
                      "var(--erp-text)",
                  }}
                >
                  Limpiar filtros
                </button>

                <button
                  type="button"
                  onClick={aplicarFiltros}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md"
                  style={{
                    background:
                      "var(--erp-primary)",
                  }}
                >
                  Aplicar filtros
                </button>
              </div>
            </section>
          )}

          {/* ==================================================
              CONFIGURACIÓN DE COLUMNAS
          ================================================== */}

          {mostrarColumnas && (
            <section
              className="rounded-3xl border shadow-sm overflow-hidden"
              style={{
                background:
                  "var(--erp-surface)",
                borderColor:
                  "var(--erp-border)",
              }}
            >
              <div
                className="px-6 py-4 border-b"
                style={{
                  borderColor:
                    "var(--erp-border)",
                }}
              >
                <h3
                  className="font-bold"
                  style={{
                    color:
                      "var(--erp-text)",
                  }}
                >
                  Columnas visibles
                </h3>

                <p
                  className="text-xs mt-1"
                  style={{
                    color:
                      "var(--erp-text-soft)",
                  }}
                >
                  Selecciona las columnas que quieres mostrar en el listado.
                </p>
              </div>

              <div className="p-6 flex flex-wrap gap-2">
                {columnas.map((columna) => {
                  const visible =
                    columnasVisibles.includes(
                      columna.campo
                    );

                  return (
                    <button
                      key={columna.campo}
                      type="button"
                      onClick={() =>
                        cambiarVisibilidadColumna(
                          columna.campo
                        )
                      }
                      className="px-3 py-2 rounded-xl border text-xs font-semibold transition-all"
                      style={{
                        background: visible
                          ? "var(--erp-primary-soft)"
                          : "var(--erp-surface)",
                        borderColor: visible
                          ? "var(--erp-primary)"
                          : "var(--erp-border)",
                        color: visible
                          ? "var(--erp-primary-dark)"
                          : "var(--erp-text-soft)",
                      }}
                    >
                      {visible ? "✓ " : ""}
                      {columna.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ==================================================
              TABLA DE EXPEDIENTES
          ================================================== */}

          <section
            className="rounded-3xl border shadow-sm overflow-hidden"
            style={{
              background:
                "var(--erp-surface)",
              borderColor:
                "var(--erp-border)",
            }}
          >
            <div
              className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{
                borderColor:
                  "var(--erp-border)",
              }}
            >
              <div>
                <h3
                  className="font-bold"
                  style={{
                    color:
                      "var(--erp-text)",
                  }}
                >
                  Listado de expedientes
                </h3>

                <p
                  className="text-xs mt-1"
                  style={{
                    color:
                      "var(--erp-text-soft)",
                  }}
                >
                  {totalExpedientes === 0
                    ? "No hay expedientes para los criterios seleccionados."
                    : `Mostrando ${primerRegistro}–${ultimoRegistro} de ${totalExpedientes} expedientes.`}
                </p>
              </div>

              {loading && (
                <div
                  className="flex items-center gap-2 text-xs font-medium"
                  style={{
                    color:
                      "var(--erp-text-soft)",
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{
                      borderColor:
                        "var(--erp-primary)",
                      borderTopColor:
                        "transparent",
                    }}
                  />

                  Actualizando...
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      borderColor:
                        "var(--erp-border)",
                      background:
                        "var(--erp-surface-soft)",
                    }}
                  >
                    {columnasRenderizadas.map(
                      (columna) => {
                        const orden =
                          obtenerOrdenCampo(
                            columna.campo
                          );

                        return (
                          <th
                            key={columna.campo}
                            className="px-4 py-3 text-left whitespace-nowrap font-bold"
                            style={{
                              color:
                                "var(--erp-text)",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                cambiarOrden(
                                  columna.campo
                                )
                              }
                              className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity"
                            >
                              <span>
                                {columna.label}
                              </span>

                              {!orden && (
                                <span className="opacity-30">
                                  ↕
                                </span>
                              )}

                              {orden && (
                                <span
                                  className="inline-flex items-center gap-1"
                                  style={{
                                    color:
                                      "var(--erp-primary)",
                                  }}
                                >
                                  {orden.direccion ===
                                  "asc"
                                    ? "↑"
                                    : "↓"}

                                  <small className="text-[10px]">
                                    {orden.posicion}
                                  </small>
                                </span>
                              )}
                            </button>
                          </th>
                        );
                      }
                    )}

                    <th
                      className="px-4 py-3 text-center whitespace-nowrap font-bold"
                      style={{
                        color:
                          "var(--erp-text)",
                      }}
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {expedientes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          columnasRenderizadas.length +
                          1
                        }
                        className="px-6 py-16 text-center"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
                            style={{
                              background:
                                "var(--erp-surface-soft)",
                            }}
                          >
                            📭
                          </div>

                          <div
                            className="font-semibold"
                            style={{
                              color:
                                "var(--erp-text)",
                            }}
                          >
                            No hay expedientes
                          </div>

                          <p
                            className="text-sm mt-1 max-w-md"
                            style={{
                              color:
                                "var(--erp-text-soft)",
                            }}
                          >
                            No se han encontrado expedientes
                            para la actividad y los filtros
                            seleccionados.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expedientes.map(
                      (expediente, indice) => (
                        <tr
                          key={
                            expediente.id ??
                            expediente.id_expediente ??
                            indice
                          }
                          className="border-b last:border-b-0 hover:bg-black/[0.02] transition-colors"
                          style={{
                            borderColor:
                              "var(--erp-border)",
                          }}
                        >
                          {columnasRenderizadas.map(
                            (columna) => (
                              <td
                                key={
                                  columna.campo
                                }
                                className="px-4 py-3 whitespace-nowrap"
                                style={{
                                  color:
                                    "var(--erp-text)",
                                }}
                              >
                                {renderValorColumna(
                                  expediente,
                                  columna
                                )}
                              </td>
                            )
                          )}

                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <Link
                              to={`/expedientes/${encodeURIComponent(
                                expediente.id_expediente
                              )}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-sm"
                              style={{
                                background:
                                  "var(--erp-primary-soft)",
                                color:
                                  "var(--erp-primary-dark)",
                              }}
                            >
                              Ver ficha
                              <span>
                                →
                              </span>
                            </Link>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ==================================================
              PAGINACIÓN
          ================================================== */}

          <section
            className="rounded-3xl border shadow-sm px-5 py-4"
            style={{
              background:
                "var(--erp-surface)",
              borderColor:
                "var(--erp-border)",
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <div
                className="text-sm"
                style={{
                  color:
                    "var(--erp-text-soft)",
                }}
              >
                {totalExpedientes > 0 ? (
                  <>
                    Mostrando{" "}
                    <strong
                      style={{
                        color:
                          "var(--erp-text)",
                      }}
                    >
                      {primerRegistro}
                    </strong>{" "}
                    a{" "}
                    <strong
                      style={{
                        color:
                          "var(--erp-text)",
                      }}
                    >
                      {ultimoRegistro}
                    </strong>{" "}
                    de{" "}
                    <strong
                      style={{
                        color:
                          "var(--erp-text)",
                      }}
                    >
                      {totalExpedientes}
                    </strong>{" "}
                    expedientes
                  </>
                ) : (
                  "0 expedientes"
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() =>
                    irAPagina(pagina - 1)
                  }
                  className="px-3 py-2 rounded-xl border text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{
                    background:
                      "var(--erp-surface)",
                    borderColor:
                      "var(--erp-border)",
                    color:
                      "var(--erp-text)",
                  }}
                >
                  ← Anterior
                </button>

                <div
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{
                    background:
                      "var(--erp-primary-soft)",
                    color:
                      "var(--erp-primary-dark)",
                  }}
                >
                  Página {pagina} de{" "}
                  {totalPaginas}
                </div>

                <button
                  type="button"
                  disabled={
                    pagina >= totalPaginas
                  }
                  onClick={() =>
                    irAPagina(pagina + 1)
                  }
                  className="px-3 py-2 rounded-xl border text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{
                    background:
                      "var(--erp-surface)",
                    borderColor:
                      "var(--erp-border)",
                    color:
                      "var(--erp-text)",
                  }}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE AUXILIAR — INPUT DE FILTRO
// ============================================================

function FiltroInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className="block">
      <span
        className="block text-xs font-bold mb-2"
        style={{
          color:
            "var(--erp-text-soft)",
        }}
      >
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm transition-all focus:ring-2"
        style={{
          background:
            "var(--erp-surface)",
          borderColor:
            "var(--erp-border)",
          color:
            "var(--erp-text)",
          "--tw-ring-color":
            "var(--erp-primary-soft)",
        }}
      />
    </label>
  );
}

export default ExpedientesListado;
