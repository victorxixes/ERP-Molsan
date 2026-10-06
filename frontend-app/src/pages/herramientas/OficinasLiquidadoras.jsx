import React, {
  useEffect,
  useMemo,
  useState,
} from "react";


// ============================================================
// CONFIGURACIÓN API
// ============================================================

const API_ORIGEN =
  "https://agenda-intranet-b.onrender.com";

const API_BASE =
  `${API_ORIGEN}/api/oficinas-liquidadoras`;

const API_IMPORTAR_EXCEL =
  `${API_BASE}/importar-excel`;


// ============================================================
// UTILIDADES
// ============================================================

async function leerRespuestaServidor(response) {
  const texto = await response.text();

  let datos = null;

  try {
    datos = texto
      ? JSON.parse(texto)
      : null;
  } catch {
    datos = null;
  }

  if (!response.ok) {
    const detalle =
      datos?.detail ||
      datos?.mensaje ||
      texto ||
      `Error HTTP ${response.status}`;

    throw new Error(detalle);
  }

  return datos;
}


// ============================================================
// COMPONENTE
// ============================================================

export default function OficinasLiquidadoras() {
  const [oficinas, setOficinas] = useState([]);

  const [cargando, setCargando] = useState(false);

  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [filtroProvincia, setFiltroProvincia] =
    useState("");

  const [filtroPoblacion, setFiltroPoblacion] =
    useState("");

  const [filtroActivo, setFiltroActivo] =
    useState("true");

  const [pagina, setPagina] = useState(1);

  const [porPagina] = useState(20);

  const [mostrarModal, setMostrarModal] =
    useState(false);

  const [modoEdicion, setModoEdicion] =
    useState(false);

  const [oficinaEditando, setOficinaEditando] =
    useState(null);

  const [mostrarImportar, setMostrarImportar] =
    useState(false);

  const [archivo, setArchivo] =
    useState(null);

  const [importando, setImportando] =
    useState(false);

  const [formulario, setFormulario] = useState({
    oficina_liquidadora: "",
    direccion: "",
    codigo_postal: "",
    poblacion: "",
    provincia: "",
    telefono: "",
    email: "",
    horario: "",
    activo: true,
  });


  // ==========================================================
  // CARGAR
  // ==========================================================

  async function cargarOficinas() {
    try {
      setCargando(true);
      setError("");

      const params = new URLSearchParams();

      if (busqueda.trim()) {
        params.set(
          "q",
          busqueda.trim()
        );
      }

      if (filtroProvincia.trim()) {
        params.set(
          "provincia",
          filtroProvincia.trim()
        );
      }

      if (filtroPoblacion.trim()) {
        params.set(
          "poblacion",
          filtroPoblacion.trim()
        );
      }

      if (filtroActivo === "true") {
        params.set("activo", "true");
      }

      if (filtroActivo === "false") {
        params.set("activo", "false");
      }

      const url =
        params.toString()
          ? `${API_BASE}?${params.toString()}`
          : API_BASE;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      const datos =
        await leerRespuestaServidor(
          response
        );

      setOficinas(
        Array.isArray(datos)
          ? datos
          : []
      );

      setPagina(1);
    } catch (err) {
      setError(
        err.message ||
          "No se pudieron cargar las Oficinas Liquidadoras."
      );
    } finally {
      setCargando(false);
    }
  }


  useEffect(() => {
    cargarOficinas();
  }, [
    busqueda,
    filtroProvincia,
    filtroPoblacion,
    filtroActivo,
  ]);


  // ==========================================================
  // OPCIONES
  // ==========================================================

  const provincias = useMemo(() => {
    return [
      ...new Set(
        oficinas
          .map((item) =>
            item.provincia?.trim()
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(
        b,
        "es",
        {
          sensitivity: "base",
        }
      )
    );
  }, [oficinas]);


  const poblaciones = useMemo(() => {
    return [
      ...new Set(
        oficinas
          .map((item) =>
            item.poblacion?.trim()
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(
        b,
        "es",
        {
          sensitivity: "base",
        }
      )
    );
  }, [oficinas]);


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        oficinas.length / porPagina
      )
    );

  const oficinasPagina =
    oficinas.slice(
      (pagina - 1) * porPagina,
      pagina * porPagina
    );


  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas]);


  // ==========================================================
  // FORMULARIO
  // ==========================================================

  function abrirNuevo() {
    setModoEdicion(false);
    setOficinaEditando(null);

    setFormulario({
      oficina_liquidadora: "",
      direccion: "",
      codigo_postal: "",
      poblacion: "",
      provincia: "",
      telefono: "",
      email: "",
      horario: "",
      activo: true,
    });

    setMostrarModal(true);
    setError("");
    setMensaje("");
  }


  function abrirEditar(oficina) {
    setModoEdicion(true);
    setOficinaEditando(oficina);

    setFormulario({
      oficina_liquidadora:
        oficina.oficina_liquidadora || "",
      direccion:
        oficina.direccion || "",
      codigo_postal:
        oficina.codigo_postal || "",
      poblacion:
        oficina.poblacion || "",
      provincia:
        oficina.provincia || "",
      telefono:
        oficina.telefono || "",
      email:
        oficina.email || "",
      horario:
        oficina.horario || "",
      activo:
        oficina.activo !== false,
    });

    setMostrarModal(true);
    setError("");
    setMensaje("");
  }


  function cerrarModal() {
    setMostrarModal(false);
    setOficinaEditando(null);
    setModoEdicion(false);
  }


  function cambiarCampo(
    campo,
    valor
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }


  // ==========================================================
  // GUARDAR
  // ==========================================================

  async function guardarOficina(event) {
    event.preventDefault();

    if (
      !formulario.oficina_liquidadora.trim()
    ) {
      setError(
        "La Oficina Liquidadora es obligatoria."
      );
      return;
    }

    try {
      setCargando(true);
      setError("");
      setMensaje("");

      const metodo =
        modoEdicion
          ? "PUT"
          : "POST";

      const url =
        modoEdicion
          ? `${API_BASE}/${oficinaEditando.id}`
          : API_BASE;

      const response = await fetch(
        url,
        {
          method: metodo,
          headers: {
            Accept:
              "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            formulario
          ),
        }
      );

      await leerRespuestaServidor(
        response
      );

      setMensaje(
        modoEdicion
          ? "Oficina Liquidadora actualizada correctamente."
          : "Oficina Liquidadora creada correctamente."
      );

      cerrarModal();

      await cargarOficinas();
    } catch (err) {
      setError(
        err.message ||
          "No se pudo guardar la Oficina Liquidadora."
      );
    } finally {
      setCargando(false);
    }
  }


  // ==========================================================
  // ELIMINAR
  // ==========================================================

  async function eliminarOficina(oficina) {
    const confirmado =
      window.confirm(
        `¿Seguro que deseas eliminar "${oficina.oficina_liquidadora}"?`
      );

    if (!confirmado) {
      return;
    }

    try {
      setCargando(true);
      setError("");

      const response =
        await fetch(
          `${API_BASE}/${oficina.id}`,
          {
            method: "DELETE",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      await leerRespuestaServidor(
        response
      );

      setMensaje(
        "Oficina Liquidadora eliminada correctamente."
      );

      await cargarOficinas();
    } catch (err) {
      setError(
        err.message ||
          "No se pudo eliminar la Oficina Liquidadora."
      );
    } finally {
      setCargando(false);
    }
  }


  // ==========================================================
  // IMPORTAR EXCEL
  // ==========================================================

  function abrirImportar() {
    setArchivo(null);
    setMostrarImportar(true);
    setError("");
    setMensaje("");
  }


  function cerrarImportar() {
    if (importando) {
      return;
    }

    setMostrarImportar(false);
    setArchivo(null);
  }


  async function importarExcel(event) {
    event.preventDefault();

    if (!archivo) {
      setError(
        "Selecciona un fichero Excel."
      );
      return;
    }

    try {
      setImportando(true);
      setError("");
      setMensaje("");

      const formData =
        new FormData();

      formData.append(
        "fichero",
        archivo
      );

      const response =
        await fetch(
          API_IMPORTAR_EXCEL,
          {
            method: "POST",
            headers: {
              Accept:
                "application/json",
            },
            body: formData,
          }
        );

      const resultado =
        await leerRespuestaServidor(
          response
        );

      setMostrarImportar(false);
      setArchivo(null);

      setMensaje(
        `${resultado.mensaje} ` +
        `Excel: ${resultado.total_excel} · ` +
        `Procesados: ${resultado.procesados} · ` +
        `Creados: ${resultado.creados} · ` +
        `Actualizados: ${resultado.actualizados} · ` +
        `Sin cambios: ${resultado.sin_cambios} · ` +
        `Omitidos: ${resultado.omitidos} · ` +
        `Errores: ${resultado.errores}`
      );

      await cargarOficinas();
    } catch (err) {
      setError(
        err.message ||
          "No se pudo importar el Excel."
      );
    } finally {
      setImportando(false);
    }
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={{
        padding: "28px",
        maxWidth: "1700px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            Oficinas Liquidadoras
          </div>

          <div
            style={{
              marginTop: "6px",
              opacity: 0.65,
            }}
          >
            Catálogo de Oficinas Liquidadoras
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={abrirImportar}
            style={{
              border: "1px solid #cfd5df",
              background: "#fff",
              borderRadius: "12px",
              padding: "11px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📥 Importar Excel
          </button>

          <button
            type="button"
            onClick={abrirNuevo}
            style={{
              border: "none",
              background:
                "linear-gradient(135deg, #1f2937, #111827)",
              color: "#fff",
              borderRadius: "12px",
              padding: "11px 18px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ＋ Nueva Oficina
          </button>
        </div>
      </div>


      {mensaje && (
        <div
          style={{
            marginBottom: "18px",
            padding: "13px 16px",
            borderRadius: "12px",
            background: "#ecfdf3",
            border:
              "1px solid #bbf7d0",
            color: "#166534",
          }}
        >
          {mensaje}
        </div>
      )}


      {error && (
        <div
          style={{
            marginBottom: "18px",
            padding: "13px 16px",
            borderRadius: "12px",
            background: "#fef2f2",
            border:
              "1px solid #fecaca",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}


      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(280px, 2fr) minmax(180px, 1fr) minmax(180px, 1fr) 150px",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <input
          value={busqueda}
          onChange={(e) =>
            setBusqueda(
              e.target.value
            )
          }
          placeholder="Buscar oficina, dirección, código postal, población, teléfono..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            border:
              "1px solid #d8dee8",
            borderRadius: "12px",
            outline: "none",
          }}
        />

        <select
          value={filtroProvincia}
          onChange={(e) =>
            setFiltroProvincia(
              e.target.value
            )
          }
          style={{
            padding: "12px 14px",
            border:
              "1px solid #d8dee8",
            borderRadius: "12px",
          }}
        >
          <option value="">
            Todas las provincias
          </option>

          {provincias.map(
            (provincia) => (
              <option
                key={provincia}
                value={provincia}
              >
                {provincia}
              </option>
            )
          )}
        </select>

        <select
          value={filtroPoblacion}
          onChange={(e) =>
            setFiltroPoblacion(
              e.target.value
            )
          }
          style={{
            padding: "12px 14px",
            border:
              "1px solid #d8dee8",
            borderRadius: "12px",
          }}
        >
          <option value="">
            Todas las poblaciones
          </option>

          {poblaciones.map(
            (poblacion) => (
              <option
                key={poblacion}
                value={poblacion}
              >
                {poblacion}
              </option>
            )
          )}
        </select>

        <select
          value={filtroActivo}
          onChange={(e) =>
            setFiltroActivo(
              e.target.value
            )
          }
          style={{
            padding: "12px 14px",
            border:
              "1px solid #d8dee8",
            borderRadius: "12px",
          }}
        >
          <option value="true">
            Activas
          </option>

          <option value="false">
            Inactivas
          </option>

          <option value="">
            Todas
          </option>
        </select>
      </div>


      <div
        style={{
          background: "#fff",
          border:
            "1px solid #e5e7eb",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow:
            "0 10px 30px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth: "1200px",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f8fafc",
                }}
              >
                {[
                  "Oficina Liquidadora",
                  "Dirección",
                  "Código Postal",
                  "Población",
                  "Provincia",
                  "Teléfono",
                  "Email",
                  "Horario",
                  "Activo",
                  "Acciones",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    style={{
                      padding:
                        "14px 12px",
                      textAlign:
                        titulo ===
                          "Código Postal" ||
                        titulo === "Activo"
                          ? "center"
                          : "left",
                      fontSize:
                        "13px",
                      fontWeight: 800,
                      borderBottom:
                        "1px solid #e5e7eb",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {cargando &&
              oficinasPagina.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      padding:
                        "40px",
                      textAlign:
                        "center",
                      opacity: 0.65,
                    }}
                  >
                    Cargando...
                  </td>
                </tr>
              ) : oficinasPagina.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="10"
                    style={{
                      padding:
                        "40px",
                      textAlign:
                        "center",
                      opacity: 0.65,
                    }}
                  >
                    No hay Oficinas Liquidadoras.
                  </td>
                </tr>
              ) : (
                oficinasPagina.map(
                  (oficina) => (
                    <tr
                      key={
                        oficina.id
                      }
                      style={{
                        borderBottom:
                          "1px solid #eef2f7",
                      }}
                    >
                      <td
                        style={{
                          padding:
                            "14px 12px",
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          oficina.oficina_liquidadora
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {oficina.direccion ||
                          "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "center",
                        }}
                      >
                        {oficina.codigo_postal ||
                          "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {oficina.poblacion ||
                          "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {oficina.provincia ||
                          "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {oficina.telefono ||
                          "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                        }}
                      >
                        {oficina.email ||
                          "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                          maxWidth:
                            "220px",
                        }}
                      >
                        {oficina.horario ||
                          "—"}
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                          textAlign:
                            "center",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "5px 9px",
                            borderRadius:
                              "999px",
                            fontSize:
                              "12px",
                            fontWeight:
                              800,
                            background:
                              oficina.activo
                                ? "#dcfce7"
                                : "#fee2e2",
                            color:
                              oficina.activo
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {oficina.activo
                            ? "Sí"
                            : "No"}
                        </span>
                      </td>

                      <td
                        style={{
                          padding:
                            "14px 12px",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            abrirEditar(
                              oficina
                            )
                          }
                          style={{
                            marginRight:
                              "6px",
                            border:
                              "1px solid #d8dee8",
                            background:
                              "#fff",
                            padding:
                              "8px 10px",
                            borderRadius:
                              "9px",
                            cursor:
                              "pointer",
                          }}
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            eliminarOficina(
                              oficina
                            )
                          }
                          style={{
                            border:
                              "1px solid #fecaca",
                            background:
                              "#fff",
                            padding:
                              "8px 10px",
                            borderRadius:
                              "9px",
                            cursor:
                              "pointer",
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>


        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            padding:
              "14px 16px",
            borderTop:
              "1px solid #eef2f7",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              opacity: 0.65,
            }}
          >
            {oficinas.length} oficina
            {oficinas.length === 1
              ? ""
              : "s"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <button
              type="button"
              disabled={
                pagina <= 1
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
            >
              ←
            </button>

            <span
              style={{
                minWidth: "90px",
                textAlign:
                  "center",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              Página {pagina} de{" "}
              {totalPaginas}
            </span>

            <button
              type="button"
              disabled={
                pagina >=
                totalPaginas
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
            >
              →
            </button>
          </div>
        </div>
      </div>


      {/* ======================================================
          MODAL CREAR / EDITAR
      ====================================================== */}

      {mostrarModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.48)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
            zIndex: 5000,
          }}
        >
          <form
            onSubmit={
              guardarOficina
            }
            style={{
              width: "min(900px, 100%)",
              maxHeight:
                "90vh",
              overflowY:
                "auto",
              background:
                "#fff",
              borderRadius:
                "20px",
              padding: "24px",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "22px",
              }}
            >
              <div
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    800,
                }}
              >
                {modoEdicion
                  ? "Editar Oficina Liquidadora"
                  : "Nueva Oficina Liquidadora"}
              </div>

              <button
                type="button"
                onClick={
                  cerrarModal
                }
              >
                ✕
              </button>
            </div>


            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              <Campo
                label="Oficina Liquidadora *"
                value={
                  formulario.oficina_liquidadora
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "oficina_liquidadora",
                    valor
                  )
                }
                full
              />

              <Campo
                label="Dirección"
                value={
                  formulario.direccion
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "direccion",
                    valor
                  )
                }
                full
              />

              <Campo
                label="Código Postal"
                value={
                  formulario.codigo_postal
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "codigo_postal",
                    valor
                  )
                }
              />

              <Campo
                label="Población"
                value={
                  formulario.poblacion
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "poblacion",
                    valor
                  )
                }
              />

              <Campo
                label="Provincia"
                value={
                  formulario.provincia
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "provincia",
                    valor
                  )
                }
              />

              <Campo
                label="Teléfono"
                value={
                  formulario.telefono
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "telefono",
                    valor
                  )
                }
              />

              <Campo
                label="Email"
                value={
                  formulario.email
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "email",
                    valor
                  )
                }
              />

              <Campo
                label="Horario"
                value={
                  formulario.horario
                }
                onChange={(valor) =>
                  cambiarCampo(
                    "horario",
                    valor
                  )
                }
              />

              <label
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  paddingTop:
                    "28px",
                  fontWeight:
                    700,
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    formulario.activo
                  }
                  onChange={(e) =>
                    cambiarCampo(
                      "activo",
                      e.target.checked
                    )
                  }
                />

                Oficina activa
              </label>
            </div>


            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
                marginTop:
                  "24px",
              }}
            >
              <button
                type="button"
                onClick={
                  cerrarModal
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={cargando}
              >
                {cargando
                  ? "Guardando..."
                  : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}


      {/* ======================================================
          MODAL IMPORTAR EXCEL
      ====================================================== */}

      {mostrarImportar && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.48)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
            zIndex: 5000,
          }}
        >
          <form
            onSubmit={
              importarExcel
            }
            style={{
              width: "min(620px, 100%)",
              background:
                "#fff",
              borderRadius:
                "20px",
              padding: "26px",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                fontSize:
                  "22px",
                fontWeight:
                  800,
                marginBottom:
                  "10px",
              }}
            >
              📥 Importar Oficinas Liquidadoras
            </div>

            <p
              style={{
                opacity: 0.68,
                lineHeight: 1.5,
              }}
            >
              El Excel debe contener las columnas:
              <br />
              <strong>
                Oficina Liquidadora,
                Dirección, Código Postal,
                Población, Província,
                Teléfono, Email y Horario.
              </strong>
            </p>

            <input
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={(e) =>
                setArchivo(
                  e.target.files?.[0] ||
                    null
                )
              }
              disabled={importando}
            />

            {archivo && (
              <div
                style={{
                  marginTop:
                    "14px",
                  padding:
                    "12px",
                  borderRadius:
                    "10px",
                  background:
                    "#f8fafc",
                }}
              >
                {archivo.name}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
                marginTop:
                  "22px",
              }}
            >
              <button
                type="button"
                onClick={
                  cerrarImportar
                }
                disabled={
                  importando
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  importando ||
                  !archivo
                }
              >
                {importando
                  ? "Importando..."
                  : "Importar Excel"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


// ============================================================
// CAMPO
// ============================================================

function Campo({
  label,
  value,
  onChange,
  full = false,
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection:
          "column",
        gap: "7px",
        gridColumn: full
          ? "1 / -1"
          : undefined,
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 800,
        }}
      >
        {label}
      </span>

      <input
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding:
            "11px 12px",
          border:
            "1px solid #d8dee8",
          borderRadius:
            "10px",
        }}
      />
    </label>
  );
}
