import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

import {
  useEffect,
  useState,
  useCallback,
} from "react";


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

      <div className="erp-page min-w-0 space-y-5">
        <MolsanPageHeader mark="EM" title="Editar empleado" description="Actualiza los datos corporativos del empleado." />
        <div className="erp-card p-8">

        <div className="py-10">
          Cargando datos del empleado…
        </div>

        </div>
      </div>

    );
  }


  return (

    <div className="erp-page min-w-0 space-y-5">
      <MolsanPageHeader mark="EM" title="Editar empleado" description="Actualiza los datos corporativos del empleado." />
      <div className="erp-card min-w-0 p-4 sm:p-6 space-y-6">

      {/* ERROR */}

      {error && (

        <div className="px-4
 py-3">
          {error}
        </div>

      )}


      {/* FORMULARIO */}

      <div className="grid
 grid-cols-1
 md:grid-cols-2
 gap-5">

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

      <div className="p-4">

        <div className="flex
 items-center
 justify-between
 gap-4">

          <div>

            <div>
              Estado del empleado
            </div>

            <div className="mt-1">
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
            className={`relative
 w-14
 h-7
 
 
 
 shrink-0
 ${
 form.activo
 ? ""
 : ""
 }`}
          >

            <span
              className={`absolute
 top-1
 w-5
 h-5
 
 
 
 
 
 ${
 form.activo
 ? ""
 : ""
 }`}
            />

          </button>

        </div>

      </div>


      {/* FOOTER */}

      <div className="flex
 flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between
 gap-4
 pt-2">

        <div>

          {guardado &&
            "✓ Cambios guardados correctamente"}

        </div>


        <button
          type="button"
          disabled={guardando}
          onClick={guardar}
          className="molsan-btn molsan-btn--primary inline-flex
 items-center
 justify-center
 px-5
 py-2.5"
        >
          {guardando
            ? "Guardando…"
            : "Guardar cambios"}
        </button>

      </div>

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

    <label className="block">

      <span className="block
 
 
 
 mb-2">
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
        className="w-full
 h-11
 
 
 
 
 
 px-4"
      />

    </label>
  );
}
