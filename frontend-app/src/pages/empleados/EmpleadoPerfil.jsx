import {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  API_BASE,
} from "../../api/config";

import {
  obtenerFichaEmpleado,
  editarEmpleado,
  subirFotoEmpleado,
} from "../../api/empleados";

import {
  getMaestros,
} from "../../api/maestros";

/* ============================================================
   EMPLEADO PERFIL
   ============================================================ */

export default function EmpleadoPerfil({
  id,
}) {

  const idNum =
    Number(id);

  const idValido =
    Number.isFinite(idNum) &&
    idNum > 0;


  /* ==========================================================
     ESTADO
  ========================================================== */

  const [
    data,
    setData,
  ] = useState(null);

  const [
    empleadoEdit,
    setEmpleadoEdit,
  ] = useState({});

  const [
    empleadoOriginal,
    setEmpleadoOriginal,
  ] = useState({});

  const [
    fotoPreview,
    setFotoPreview,
  ] = useState(null);

  const [
    tab,
    setTab,
  ] = useState("basicos");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");


  /* ==========================================================
     MAESTROS
  ========================================================== */

  const [
    departamentos,
    setDepartamentos,
  ] = useState([]);

  const [
    secciones,
    setSecciones,
  ] = useState([]);

  const [
    cargos,
    setCargos,
  ] = useState([]);


  /* ==========================================================
     CARGAR PERFIL
  ========================================================== */

  const cargar =
    useCallback(
      async () => {

        if (!idValido) {
          return;
        }

        setLoading(true);

        setError("");

        setMensaje("");

        try {

          /*
           * Cargamos simultáneamente:
           *
           * 1. Ficha del empleado
           * 2. Departamentos
           * 3. Secciones
           * 4. Cargos
           */

          const [
            fichaRes,
            departamentosRes,
            seccionesRes,
            cargosRes,
          ] = await Promise.all([
            obtenerFichaEmpleado(idNum),
            getMaestros("departamentos"),
            getMaestros("secciones"),
            getMaestros("cargos"),
          ]);


          /* --------------------------------------------------
             FICHA
          -------------------------------------------------- */

          const d =
            fichaRes?.data || {};

          const empleado =
            d?.empleado || {};


          setData(
            d
          );

          setEmpleadoEdit(
            empleado
          );

          setEmpleadoOriginal(
            empleado
          );


          /* --------------------------------------------------
             MAESTROS
          -------------------------------------------------- */

          setDepartamentos(
            Array.isArray(
              departamentosRes?.data
            )
              ? departamentosRes.data
              : []
          );

          setSecciones(
            Array.isArray(
              seccionesRes?.data
            )
              ? seccionesRes.data
              : []
          );

          setCargos(
            Array.isArray(
              cargosRes?.data
            )
              ? cargosRes.data
              : []
          );

        } catch (err) {

          console.error(
            "Error cargando perfil del empleado:",
            err
          );

          setError(
            err?.response?.data?.detail ||
            err?.message ||
            "No se ha podido cargar el perfil del empleado."
          );

        } finally {

          setLoading(false);

        }

      },
      [
        idNum,
        idValido,
      ]
    );


  /* ==========================================================
     EFFECT
  ========================================================== */

  useEffect(() => {

    cargar();

  }, [
    cargar,
  ]);


  /* ==========================================================
     CAMBIO DE CAMPO
  ========================================================== */

  const handleChange =
    useCallback(
      (
        field,
        value
      ) => {

        setEmpleadoEdit(
          (prev) => ({
            ...prev,
            [field]: value,
          })
        );

        setMensaje("");

        setError("");

      },
      []
    );


  /* ==========================================================
     GUARDAR CAMBIOS
  ========================================================== */

  const guardarCambios =
    useCallback(
      async () => {

        if (!idValido) {
          return;
        }

        setGuardando(true);

        setError("");

        setMensaje("");

        try {

          /*
           * Solo enviamos campos editables que hayan cambiado.
           *
           * Esto evita mandar información innecesaria
           * y evita modificar accidentalmente otros campos.
           */

          const camposEditables = [
            "nombre",
            "apellidos",
            "dni",
            "telefono",
            "email_personal",
            "email_empresa",
            "extension",
            "usuario",

            "direccion",
            "codigo_postal",
            "poblacion",
            "provincia",
            "fecha_nacimiento",
            "alergias",
            "persona_contacto",
            "telefono_contacto",
            "observaciones",

            "departamento_id",
            "seccion_id",
            "cargo_id",
            "fecha_alta",
            "fecha_baja",
          ];


          const cambios = {};


          camposEditables.forEach(
            (campo) => {

              const nuevo =
                empleadoEdit?.[campo];

              const anterior =
                empleadoOriginal?.[campo];

              if (
                String(nuevo ?? "") !==
                String(anterior ?? "")
              ) {

                cambios[campo] =
                  nuevo === ""
                    ? null
                    : nuevo;

              }

            }
          );


          /*
           * Si no hay cambios no hacemos
           * ninguna petición innecesaria.
           */

          if (
            Object.keys(cambios).length === 0
          ) {

            setMensaje(
              "No hay cambios pendientes de guardar."
            );

            setGuardando(false);

            return;

          }


          const res =
            await editarEmpleado(
              idNum,
              cambios
            );


          const empleadoActualizado =
            res?.data || empleadoEdit;


          /*
           * Actualizamos inmediatamente el estado
           * con la respuesta del backend.
           */

          setEmpleadoEdit(
            empleadoActualizado
          );

          setEmpleadoOriginal(
            empleadoActualizado
          );


          /*
           * Volvemos a cargar la ficha para asegurarnos
           * de que los nombres maestros y auditoría
           * están actualizados.
           */

          try {

            const ficha =
              await obtenerFichaEmpleado(
                idNum
              );

            const fichaData =
              ficha?.data || {};

            const fichaEmpleado =
              fichaData?.empleado ||
              empleadoActualizado;

            setData(
              fichaData
            );

            setEmpleadoEdit(
              fichaEmpleado
            );

            setEmpleadoOriginal(
              fichaEmpleado
            );

          } catch (refreshError) {

            console.warn(
              "No se pudo refrescar la ficha después de guardar:",
              refreshError
            );

          }


          setMensaje(
            "Cambios guardados correctamente."
          );

        } catch (err) {

          console.error(
            "Error guardando empleado:",
            err
          );

          setError(
            err?.response?.data?.detail ||
            err?.message ||
            "Error al guardar los cambios."
          );

        } finally {

          setGuardando(false);

        }

      },
      [
        idNum,
        idValido,
        empleadoEdit,
        empleadoOriginal,
      ]
    );


  /* ==========================================================
     FOTO
  ========================================================== */

  const handleFoto =
    useCallback(
      async (
        event
      ) => {

        const file =
          event?.target?.files?.[0];

        if (
          !file ||
          !idValido
        ) {
          return;
        }

        setError("");

        setMensaje("");

        const preview =
          URL.createObjectURL(
            file
          );

        setFotoPreview(
          preview
        );

        try {

          await subirFotoEmpleado(
            idNum,
            file
          );


          /*
           * Recargar ficha después de subir
           * la fotografía.
           */

          const res =
            await obtenerFichaEmpleado(
              idNum
            );

          const fichaData =
            res?.data || {};

          const empleadoActualizado =
            fichaData?.empleado || {};


          setData(
            fichaData
          );

          setEmpleadoEdit(
            empleadoActualizado
          );

          setEmpleadoOriginal(
            empleadoActualizado
          );


          setMensaje(
            "Foto actualizada correctamente."
          );

        } catch (err) {

          console.error(
            "Error subiendo fotografía:",
            err
          );

          setError(
            err?.response?.data?.detail ||
            err?.message ||
            "No se ha podido subir la foto."
          );

        }

      },
      [
        idNum,
        idValido,
      ]
    );


  /* ==========================================================
     ESTADOS INICIALES
  ========================================================== */

  if (!idValido) {

    return (

      <div className="erp-page">

        <div className="
          erp-card
          p-8
          text-center
        ">

          <div className="
            text-4xl
            mb-3
          ">
            👤
          </div>

          <div className="
            text-[var(--erp-text)]
            font-semibold
          ">
            Selecciona un empleado válido.
          </div>

        </div>

      </div>

    );

  }


  if (
    loading &&
    !data
  ) {

    return (

      <div className="erp-page">

        <div className="
          erp-card
          p-12
          text-center
          text-[var(--erp-text-soft)]
          animate-pulse
        ">
          Cargando perfil del empleado…
        </div>

      </div>

    );

  }


  if (
    error &&
    !data
  ) {

    return (

      <div className="erp-page">

        <div className="
          erp-card
          p-6
        ">

          <div className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            text-red-700
            px-4
            py-3
          ">
            {error}
          </div>

        </div>

      </div>

    );

  }


  if (!data) {
    return null;
  }


  const empleado =
    empleadoEdit || {};


  /* ==========================================================
     FOTO URL
  ========================================================== */

  const fotoURL =
    empleado.foto
      ? empleado.foto.replace(
          /^\/api\//,
          "/"
        )
      : null;


  /* ==========================================================
     NOMBRES MAESTROS
  ========================================================== */

  const departamentoNombre =
    empleado.departamento_nombre ||
    empleado.departamento_id ||
    "Sin departamento";


  const seccionNombre =
    empleado.seccion_nombre ||
    empleado.seccion_id ||
    "Sin sección";


  const cargoNombre =
    empleado.cargo_nombre ||
    empleado.cargo_id ||
    "Sin cargo";


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div className="
      erp-page
      space-y-5
      animate-fade-in
    ">


      {/* ======================================================
          CABECERA
      ====================================================== */}

      <section className="
        erp-card
        p-6
      ">

        <div className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-6
        ">


          {/* --------------------------------------------------
              IDENTIDAD
          -------------------------------------------------- */}

          <div className="
            flex
            items-center
            gap-5
          ">

            <div className="
              w-20
              h-20
              rounded-2xl
              overflow-hidden
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              shrink-0
            ">

              {(
                fotoPreview ||
                empleado.foto
              ) ? (

                <img
                  src={
                    fotoPreview ||
                    `${API_BASE}${fotoURL}`
                  }
                  alt="Foto empleado"
                  className="
                    w-full
                    h-full
                    object-cover
                  "
                />

              ) : (

                <div className="
                  w-full
                  h-full
                  flex
                  items-center
                  justify-center
                  text-2xl
                ">
                  👤
                </div>

              )}

            </div>


            <div>

              <div className="
                text-xs
                uppercase
                tracking-[0.16em]
                font-semibold
                text-[var(--erp-primary)]
              ">
                Perfil de empleado
              </div>


              <h1 className="
                text-2xl
                font-semibold
                text-[var(--erp-text)]
                mt-1
              ">

                {empleado.nombre || ""}{" "}

                {empleado.apellidos || ""}

              </h1>


              <div className="
                flex
                flex-wrap
                gap-2
                mt-2
                items-center
              ">

                <span className="
                  text-sm
                  text-[var(--erp-text-soft)]
                ">
                  ID #{empleado.id}
                </span>


                <span className="
                  text-sm
                  text-[var(--erp-text-soft)]
                ">
                  ·
                </span>


                <span className="
                  text-sm
                  text-[var(--erp-text-soft)]
                ">
                  {empleado.usuario ||
                    "Sin usuario"}
                </span>


                <span
                  className={`
                    px-2.5
                    py-1
                    rounded-lg
                    text-xs
                    font-semibold
                    border
                    ${
                      empleado.activo
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }
                  `}
                >
                  {empleado.activo
                    ? "Activo"
                    : "Inactivo"}
                </span>

              </div>

            </div>

          </div>


          {/* --------------------------------------------------
              INFORMACIÓN LABORAL RESUMIDA
          -------------------------------------------------- */}

          <div className="
            grid
            grid-cols-1
            sm:grid-cols-3
            gap-3
            min-w-0
          ">

            <ResumenCabecera
              label="Departamento"
              value={
                departamentoNombre
              }
            />

            <ResumenCabecera
              label="Sección"
              value={
                seccionNombre
              }
            />

            <ResumenCabecera
              label="Cargo"
              value={
                cargoNombre
              }
            />

          </div>

        </div>

      </section>


      {/* ======================================================
          MENSAJES
      ====================================================== */}

      {error && (

        <div className="
          rounded-xl
          border
          border-red-200
          bg-red-50
          text-red-700
          px-4
          py-3
          text-sm
        ">

          {error}

        </div>

      )}


      {mensaje && (

        <div className="
          rounded-xl
          border
          border-emerald-200
          bg-emerald-50
          text-emerald-700
          px-4
          py-3
          text-sm
        ">

          ✓ {mensaje}

        </div>

      )}


      {/* ======================================================
          TABS
      ====================================================== */}

      <div className="
        erp-card
        p-2
      ">

        <div className="
          flex
          flex-wrap
          gap-1
        ">

          {[
            [
              "basicos",
              "Datos básicos",
              "👤",
            ],
            [
              "personales",
              "Datos personales",
              "🏠",
            ],
            [
              "laborales",
              "Datos laborales",
              "💼",
            ],
            [
              "auditoria",
              "Auditoría",
              "🛡️",
            ],
          ].map(
            ([
              key,
              label,
              icon,
            ]) => (

              <button
                type="button"
                key={key}
                onClick={() =>
                  setTab(key)
                }
                className={`
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2.5
                  rounded-xl
                  text-sm
                  font-medium
                  transition
                  ${
                    tab === key
                      ? "bg-[var(--erp-primary)] text-white shadow-sm"
                      : "text-[var(--erp-text-soft)] hover:bg-[var(--erp-surface-soft)] hover:text-[var(--erp-text)]"
                  }
                `}
              >

                <span>
                  {icon}
                </span>

                {label}

              </button>

            )
          )}

        </div>

      </div>


      {/* ======================================================
          DATOS BÁSICOS
      ====================================================== */}

      {tab === "basicos" && (

        <section className="
          erp-card
          p-6
          space-y-6
        ">

          <SectionTitle>
            Datos básicos
          </SectionTitle>


          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-3
            gap-5
          ">

            <Campo
              label="Nombre"
              value={
                empleado.nombre
              }
              onChange={(value) =>
                handleChange(
                  "nombre",
                  value
                )
              }
            />


            <Campo
              label="Apellidos"
              value={
                empleado.apellidos
              }
              onChange={(value) =>
                handleChange(
                  "apellidos",
                  value
                )
              }
            />


            <Campo
              label="DNI"
              value={
                empleado.dni
              }
              onChange={(value) =>
                handleChange(
                  "dni",
                  value
                )
              }
            />


            <Campo
              label="Teléfono"
              value={
                empleado.telefono
              }
              onChange={(value) =>
                handleChange(
                  "telefono",
                  value
                )
              }
            />


            <Campo
              label="Email personal"
              value={
                empleado.email_personal
              }
              onChange={(value) =>
                handleChange(
                  "email_personal",
                  value
                )
              }
            />


            <Campo
              label="Email empresa"
              value={
                empleado.email_empresa
              }
              onChange={(value) =>
                handleChange(
                  "email_empresa",
                  value
                )
              }
            />


            <Campo
              label="Extensión"
              value={
                empleado.extension
              }
              onChange={(value) =>
                handleChange(
                  "extension",
                  value
                )
              }
            />


            <Campo
              label="Usuario"
              value={
                empleado.usuario
              }
              onChange={(value) =>
                handleChange(
                  "usuario",
                  value
                )
              }
            />

          </div>


          {/* --------------------------------------------------
              FOTO
          -------------------------------------------------- */}

          <div className="
            rounded-2xl
            border
            border-[var(--erp-border)]
            bg-[var(--erp-surface-soft)]
            p-5
          ">

            <div className="
              flex
              flex-col
              md:flex-row
              md:items-center
              gap-5
            ">


              <div className="
                w-24
                h-24
                rounded-2xl
                overflow-hidden
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                shrink-0
              ">

                {(
                  fotoPreview ||
                  empleado.foto
                ) ? (

                  <img
                    src={
                      fotoPreview ||
                      `${API_BASE}${fotoURL}`
                    }
                    alt="Foto empleado"
                    className="
                      w-full
                      h-full
                      object-cover
                    "
                  />

                ) : (

                  <div className="
                    w-full
                    h-full
                    flex
                    items-center
                    justify-center
                    text-3xl
                  ">
                    👤
                  </div>

                )}

              </div>


              <div>

                <div className="
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                ">
                  Fotografía
                </div>


                <div className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-1
                  mb-3
                ">
                  Selecciona una nueva fotografía del empleado.
                </div>


                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleFoto
                  }
                  className="
                    block
                    text-sm
                    text-[var(--erp-text-soft)]
                  "
                />

              </div>

            </div>

          </div>


          <GuardarButton
            onClick={
              guardarCambios
            }
            loading={
              guardando
            }
          />

        </section>

      )}


      {/* ======================================================
          DATOS PERSONALES
      ====================================================== */}

      {tab === "personales" && (

        <section className="
          erp-card
          p-6
          space-y-6
        ">

          <SectionTitle>
            Datos personales
          </SectionTitle>


          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-3
            gap-5
          ">

            <Campo
              label="Dirección"
              value={
                empleado.direccion
              }
              onChange={(value) =>
                handleChange(
                  "direccion",
                  value
                )
              }
            />


            <Campo
              label="Código postal"
              value={
                empleado.codigo_postal
              }
              onChange={(value) =>
                handleChange(
                  "codigo_postal",
                  value
                )
              }
            />


            <Campo
              label="Población"
              value={
                empleado.poblacion
              }
              onChange={(value) =>
                handleChange(
                  "poblacion",
                  value
                )
              }
            />


            <Campo
              label="Provincia"
              value={
                empleado.provincia
              }
              onChange={(value) =>
                handleChange(
                  "provincia",
                  value
                )
              }
            />


            <Campo
              label="Fecha nacimiento"
              type="date"
              value={
                empleado.fecha_nacimiento ||
                ""
              }
              onChange={(value) =>
                handleChange(
                  "fecha_nacimiento",
                  value
                )
              }
            />


            <Campo
              label="Alergias"
              value={
                empleado.alergias
              }
              onChange={(value) =>
                handleChange(
                  "alergias",
                  value
                )
              }
            />


            <Campo
              label="Persona de contacto"
              value={
                empleado.persona_contacto
              }
              onChange={(value) =>
                handleChange(
                  "persona_contacto",
                  value
                )
              }
            />


            <Campo
              label="Teléfono contacto"
              value={
                empleado.telefono_contacto
              }
              onChange={(value) =>
                handleChange(
                  "telefono_contacto",
                  value
                )
              }
            />

          </div>


          {/* --------------------------------------------------
              OBSERVACIONES
          -------------------------------------------------- */}

          <div>

            <label className="
              block
              text-xs
              font-semibold
              text-[var(--erp-text-soft)]
              mb-2
            ">
              Observaciones
            </label>


            <textarea
              rows={5}
              value={
                empleado.observaciones ||
                ""
              }
              onChange={(e) =>
                handleChange(
                  "observaciones",
                  e.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
                text-[var(--erp-text)]
                px-4
                py-3
                outline-none
                resize-y
                transition
                focus:border-[var(--erp-primary)]
                focus:ring-2
                focus:ring-[var(--erp-primary-soft)]
              "
            />

          </div>


          <GuardarButton
            onClick={
              guardarCambios
            }
            loading={
              guardando
            }
          />

        </section>

      )}


      {/* ======================================================
          DATOS LABORALES
      ====================================================== */}

      {tab === "laborales" && (

        <section className="
          erp-card
          p-6
          space-y-6
        ">

          <SectionTitle>
            Datos laborales
          </SectionTitle>


          {/* --------------------------------------------------
              MAESTROS
          -------------------------------------------------- */}

          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-3
            gap-5
          ">


            {/* ==================================================
                DEPARTAMENTO
            ================================================== */}

            <CampoSelect
              label="Departamento"
              value={
                empleado.departamento_id
              }
              options={
                departamentos
              }
              placeholder="Sin departamento"
              onChange={(value) =>
                handleChange(
                  "departamento_id",
                  value === ""
                    ? null
                    : Number(value)
                )
              }
            />


            {/* ==================================================
                SECCIÓN
            ================================================== */}

            <CampoSelect
              label="Sección"
              value={
                empleado.seccion_id
              }
              options={
                secciones
              }
              placeholder="Sin sección"
              onChange={(value) =>
                handleChange(
                  "seccion_id",
                  value === ""
                    ? null
                    : Number(value)
                )
              }
            />


            {/* ==================================================
                CARGO
            ================================================== */}

            <CampoSelect
              label="Cargo"
              value={
                empleado.cargo_id
              }
              options={
                cargos
              }
              placeholder="Sin cargo"
              onChange={(value) =>
                handleChange(
                  "cargo_id",
                  value === ""
                    ? null
                    : Number(value)
                )
              }
            />


            <Campo
              label="Fecha alta"
              type="date"
              value={
                empleado.fecha_alta ||
                ""
              }
              onChange={(value) =>
                handleChange(
                  "fecha_alta",
                  value
                )
              }
            />


            <Campo
              label="Fecha baja"
              type="date"
              value={
                empleado.fecha_baja ||
                ""
              }
              onChange={(value) =>
                handleChange(
                  "fecha_baja",
                  value
                )
              }
            />

          </div>


          {/* --------------------------------------------------
              INFORMACIÓN MAESTRA
          -------------------------------------------------- */}

          <div className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-4
          ">

            <Dato
              label="Departamento actual"
              value={
                empleado.departamento_nombre
              }
            />


            <Dato
              label="Sección actual"
              value={
                empleado.seccion_nombre
              }
            />


            <Dato
              label="Cargo actual"
              value={
                empleado.cargo_nombre
              }
            />

          </div>


          {/* --------------------------------------------------
              ESTADO
          -------------------------------------------------- */}

          <div className="
            rounded-2xl
            border
            border-[var(--erp-border)]
            bg-[var(--erp-surface-soft)]
            p-4
            flex
            items-center
            justify-between
            gap-4
          ">

            <div>

              <div className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
              ">
                Estado
              </div>


              <div className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              ">
                Estado actual del empleado.
              </div>

            </div>


            <span
              className={`
                px-3
                py-1.5
                rounded-lg
                text-xs
                font-semibold
                border
                ${
                  empleado.activo
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }
              `}
            >
              {empleado.activo
                ? "Activo"
                : "Inactivo"}
            </span>

          </div>


          <GuardarButton
            onClick={
              guardarCambios
            }
            loading={
              guardando
            }
          />

        </section>

      )}


      {/* ======================================================
          AUDITORÍA
      ====================================================== */}

      {tab === "auditoria" && (

        <section className="
          erp-card
          p-6
        ">

          <SectionTitle>
            Auditoría
          </SectionTitle>


          <div className="
            space-y-3
            mt-6
          ">

            {(
              Array.isArray(
                data.auditoria
              )
                ? data.auditoria
                : []
            ).length === 0 ? (

              <div className="
                rounded-2xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface-soft)]
                p-6
                text-center
                text-sm
                text-[var(--erp-text-soft)]
              ">
                No hay registros de auditoría para este empleado.
              </div>

            ) : (

              (
                Array.isArray(
                  data.auditoria
                )
                  ? data.auditoria
                  : []
              ).map(
                (
                  item,
                  index
                ) => (

                  <div
                    key={
                      item.id ||
                      `audit-${index}`
                    }
                    className="
                      rounded-2xl
                      border
                      border-[var(--erp-border)]
                      bg-[var(--erp-surface-soft)]
                      p-5
                    "
                  >

                    <div className="
                      grid
                      grid-cols-1
                      md:grid-cols-2
                      gap-4
                      text-sm
                    ">

                      <DatoSimple
                        label="Fecha"
                        value={
                          item.fecha
                        }
                      />


                      <DatoSimple
                        label="Módulo"
                        value={
                          item.modulo
                        }
                      />


                      <DatoSimple
                        label="Acción"
                        value={
                          item.accion
                        }
                      />


                      <DatoSimple
                        label="Descripción"
                        value={
                          item.descripcion
                        }
                      />

                    </div>

                  </div>

                )
              )

            )}

          </div>

        </section>

      )}

    </div>

  );
}


/* ============================================================
   COMPONENTES AUXILIARES
============================================================ */


/* ============================================================
   TÍTULO DE SECCIÓN
============================================================ */

function SectionTitle({
  children,
}) {

  return (

    <div className="
      flex
      items-center
      gap-3
    ">

      <div className="
        w-2
        h-7
        rounded-full
        bg-[var(--erp-primary)]
      " />


      <h2 className="
        text-xl
        font-semibold
        text-[var(--erp-text)]
      ">

        {children}

      </h2>

    </div>

  );

}


/* ============================================================
   CAMPO EDITABLE
============================================================ */

function Campo({
  label,
  value,
  onChange,
  type = "text",
}) {

  return (

    <label className="block">

      <span className="
        block
        text-xs
        font-semibold
        text-[var(--erp-text-soft)]
        mb-2
      ">

        {label}

      </span>


      <input
        type={type}
        value={
          value ?? ""
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="
          w-full
          h-11
          rounded-xl
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          text-[var(--erp-text)]
          px-4
          outline-none
          transition
          focus:border-[var(--erp-primary)]
          focus:ring-2
          focus:ring-[var(--erp-primary-soft)]
        "
      />

    </label>

  );

}


/* ============================================================
   CAMPO SELECT — MAESTROS
============================================================ */

function CampoSelect({
  label,
  value,
  options = [],
  placeholder,
  onChange,
}) {

  return (

    <label className="block">

      <span className="
        block
        text-xs
        font-semibold
        text-[var(--erp-text-soft)]
        mb-2
      ">

        {label}

      </span>


      <select
        value={
          value ?? ""
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="
          w-full
          h-11
          rounded-xl
          border
          border-[var(--erp-border)]
          bg-[var(--erp-surface)]
          text-[var(--erp-text)]
          px-4
          outline-none
          transition
          focus:border-[var(--erp-primary)]
          focus:ring-2
          focus:ring-[var(--erp-primary-soft)]
          cursor-pointer
        "
      >

        <option value="">
          {placeholder}
        </option>


        {options.map(
          (item) => (

            <option
              key={item.id}
              value={item.id}
            >
              {item.nombre}
            </option>

          )
        )}

      </select>

    </label>

  );

}


/* ============================================================
   DATO SOLO LECTURA
============================================================ */

function Dato({
  label,
  value,
  multiline = false,
}) {

  return (

    <div className="
      rounded-xl
      border
      border-[var(--erp-border)]
      bg-[var(--erp-surface-soft)]
      px-4
      py-3
    ">

      <div className="
        text-[11px]
        uppercase
        tracking-wide
        font-semibold
        text-[var(--erp-text-soft)]
        mb-1
      ">

        {label}

      </div>


      <div
        className={`
          text-sm
          font-medium
          text-[var(--erp-text)]
          ${
            multiline
              ? "whitespace-pre-wrap"
              : ""
          }
        `}
      >

        {value ||
          "—"}

      </div>

    </div>

  );

}


/* ============================================================
   DATO SIMPLE
============================================================ */

function DatoSimple({
  label,
  value,
}) {

  return (

    <div>

      <div className="
        text-[11px]
        uppercase
        tracking-wide
        font-semibold
        text-[var(--erp-text-soft)]
        mb-1
      ">

        {label}

      </div>


      <div className="
        text-sm
        text-[var(--erp-text)]
      ">

        {value ||
          "—"}

      </div>

    </div>

  );

}


/* ============================================================
   RESUMEN CABECERA
============================================================ */

function ResumenCabecera({
  label,
  value,
}) {

  return (

    <div className="
      rounded-xl
      border
      border-[var(--erp-border)]
      bg-[var(--erp-surface-soft)]
      px-4
      py-3
      min-w-0
    ">

      <div className="
        text-[10px]
        uppercase
        tracking-[0.12em]
        font-semibold
        text-[var(--erp-text-soft)]
        mb-1
      ">

        {label}

      </div>


      <div className="
        text-sm
        font-semibold
        text-[var(--erp-text)]
        truncate
      ">

        {value ||
          "—"}

      </div>

    </div>

  );

}


/* ============================================================
   BOTÓN GUARDAR
============================================================ */

function GuardarButton({
  onClick,
  loading,
}) {

  return (

    <div className="
      flex
      justify-end
      pt-2
    ">

      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="
          inline-flex
          items-center
          justify-center
          px-5
          py-2.5
          rounded-xl
          bg-[var(--erp-primary)]
          hover:bg-[var(--erp-primary-dark)]
          disabled:opacity-50
          disabled:cursor-not-allowed
          text-white
          font-medium
          shadow-sm
          transition
        "
      >

        {loading
          ? "Guardando…"
          : "Guardar cambios"}

      </button>

    </div>

  );

}
