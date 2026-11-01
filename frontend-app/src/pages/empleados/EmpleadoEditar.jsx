import {
  useEffect,
  useState,
  useCallback,
} from "react";

import "./EmpleadoEditar.css";

import {
  obtenerEmpleado,
  editarEmpleado,
} from "../../api/empleados";


export default function EmpleadoEditar({
  empleadoId,
  onGuardado,
}) {

  const [
    form,
    setForm,
  ] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
    email_empresa: "",
    activo: true,
  });

  const [
    cargando,
    setCargando,
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
    guardado,
    setGuardado,
  ] = useState(false);


  /* ==========================================================
     CARGAR EMPLEADO
  ========================================================== */

  useEffect(() => {

    if (!empleadoId) {
      return;
    }

    let activo =
      true;

    const cargar =
      async () => {

        setCargando(
          true
        );

        setError("");

        try {

          const res =
            await obtenerEmpleado(
              empleadoId
            );

          if (!activo) {
            return;
          }

          const e =
            res?.data || {};

          setForm({
            nombre:
              e.nombre ?? "",

            apellidos:
              e.apellidos ?? "",

            telefono:
              e.telefono ?? "",

            email_empresa:
              e.email_empresa ?? "",

            activo:
              Boolean(
                e.activo
              ),
          });

        } catch (err) {

          if (!activo) {
            return;
          }

          console.error("No se ha podido cargar el empleado.");

          setError(
            err?.response?.data?.detail ||
            err?.message ||
            "No se ha podido cargar el empleado."
          );

        } finally {

          if (activo) {
            setCargando(
              false
            );
          }

        }
      };


    cargar();

    return () => {
      activo = false;
    };

  }, [empleadoId]);


  /* ==========================================================
     CAMBIO
  ========================================================== */

  const handleChange =
    useCallback(
      (
        campo,
        valor
      ) => {

        setForm(
          (actual) => ({
            ...actual,
            [campo]: valor,
          })
        );

        setGuardado(
          false
        );

      },
      []
    );


  /* ==========================================================
     GUARDAR
  ========================================================== */

  const guardar =
    useCallback(
      async () => {

        if (!empleadoId) {
          return;
        }

        setGuardando(
          true
        );

        setError("");

        setGuardado(
          false
        );

        try {

          await editarEmpleado(
            empleadoId,
            form
          );

          setGuardado(
            true
          );

          onGuardado?.();

        } catch (err) {

          console.error("No se ha podido guardar el empleado.");

          setError(
            err?.response?.data?.detail ||
            err?.message ||
            "No se han podido guardar los cambios."
          );

        } finally {

          setGuardando(
            false
          );
        }

      },
      [
        empleadoId,
        form,
        onGuardado,
      ]
    );


  if (!empleadoId) {
    return null;
  }


  if (cargando) {

    return (

      <div className="
        erp-card
        p-8
      ">

        <div className="
          text-center
          py-10
          text-[var(--erp-text-soft)]
          animate-pulse
        ">
          Cargando datos del empleado…
        </div>

      </div>

    );
  }


  return (

    <div className="
      erp-card
      empleado-editar-premium
      p-6
      space-y-6
    ">

      {/* CABECERA */}

      <div className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true">EMP</div>
          <div>
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · EMPLEADOS</p>
            <h2 className="molsan-page-header__title">Editar empleado</h2>
            <p className="molsan-page-header__description">Actualiza los datos corporativos del empleado.</p>
          </div>
        </div>
      </div>

            {/* ERROR */}

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


      {/* FORMULARIO */}

      <div className="
        grid
        grid-cols-1
        md:grid-cols-2
        gap-5
      ">

        <Campo
          label="Nombre"
          value={form.nombre}
          onChange={(value) =>
            handleChange(
              "nombre",
              value
            )
          }
        />

        <Campo
          label="Apellidos"
          value={form.apellidos}
          onChange={(value) =>
            handleChange(
              "apellidos",
              value
            )
          }
        />

        <Campo
          label="Teléfono"
          value={form.telefono}
          onChange={(value) =>
            handleChange(
              "telefono",
              value
            )
          }
        />

        <Campo
          label="Email empresa"
          type="email"
          value={
            form.email_empresa
          }
          onChange={(value) =>
            handleChange(
              "email_empresa",
              value
            )
          }
        />

      </div>


      {/* ACTIVO */}

      <div className="
        rounded-2xl
        border
        border-[var(--erp-border)]
        bg-[var(--erp-surface-soft)]
        p-4
      ">

        <div className="
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
              Estado del empleado
            </div>

            <div className="
              text-xs
              text-[var(--erp-text-soft)]
              mt-1
            ">
              {form.activo
                ? "El empleado está actualmente activo."
                : "El empleado está marcado como inactivo."}
            </div>

          </div>


          <button
            type="button"
            role="switch"
            aria-checked={
              form.activo
            }
            onClick={() =>
              handleChange(
                "activo",
                !form.activo
              )
            }
            className={`
              relative
              w-14
              h-7
              rounded-full
              transition-all
              duration-200
              shrink-0
              ${
                form.activo
                  ? "bg-emerald-500"
                  : "bg-slate-300"
              }
            `}
          >

            <span
              className={`
                absolute
                top-1
                w-5
                h-5
                rounded-full
                bg-white
                shadow
                transition-transform
                duration-200
                ${
                  form.activo
                    ? "translate-x-8"
                    : "translate-x-1"
                }
              `}
            />

          </button>

        </div>

      </div>


      {/* FOOTER */}

      <div className="
        flex
        flex-col
        sm:flex-row
        sm:items-center
        sm:justify-between
        gap-4
        pt-2
      ">

        <div className="
          text-sm
          text-emerald-600
          font-medium
        ">

          {guardado &&
            "✓ Cambios guardados correctamente"}

        </div>


        <button
          type="button"
          disabled={guardando}
          onClick={guardar}
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
          {guardando
            ? "Guardando…"
            : "Guardar cambios"}
        </button>

      </div>

    </div>
  );
}


/* ============================================================
   CAMPO
============================================================ */

function Campo({
  label,
  value,
  onChange,
  type = "text",
}) {

  return (

    <label className="
      block
    ">

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
        value={value}
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
