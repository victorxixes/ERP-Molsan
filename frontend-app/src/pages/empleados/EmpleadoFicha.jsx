import {
  useEffect,
  useState,
} from "react";

import axios from "axios";
import "./EmpleadoFicha.css";

import {
  API_BASE,
} from "../../api/config";

import ModalEmpleado
  from "../../components/empleados/ModalEmpleado";


export default function EmpleadoFicha({
  empleadoId,
}) {

  const [
    empleado,
    setEmpleado,
  ] = useState(null);

  const [
    auditoria,
    setAuditoria,
  ] = useState([]);

  const [
    openModal,
    setOpenModal,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const cargar = async () => {

    if (!empleadoId) {
      return;
    }

    setLoading(true);
    setError("");

    try {

      const res =
        await axios.get(
          `${API_BASE}/empleados/${empleadoId}/ficha`
        );

      setEmpleado(
        res.data?.empleado ||
        null
      );

      setAuditoria(
        Array.isArray(
          res.data?.auditoria
        )
          ? res.data.auditoria
          : []
      );

    } catch (err) {

      console.error("No se ha podido cargar la ficha del empleado.");

      setError(
        err?.response?.data?.detail ||
        "No se ha podido cargar la ficha."
      );

    } finally {

      setLoading(false);
    }
  };


  useEffect(() => {

    cargar();

  }, [empleadoId]);


  if (!empleadoId) {

    return (
      <div className="erp-page">

        <div className="erp-card max-w-[1700px] mx-auto p-8">

          <p className="text-[var(--erp-text-soft)]">
            No se ha seleccionado ningún empleado.
          </p>

        </div>

      </div>
    );
  }


  if (loading) {

    return (
      <div className="erp-page">

        <div className="erp-card max-w-[1700px] mx-auto p-8">

          <div className="
            text-[var(--erp-text-soft)]
            animate-pulse
            text-center
            py-16
          ">
            Cargando ficha del empleado…
          </div>

        </div>

      </div>
    );
  }


  if (error) {

    return (
      <div className="erp-page">

        <div className="erp-card max-w-[1700px] mx-auto p-8">

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


  if (!empleado) {
    return null;
  }


  return (
    <div className="
      erp-page
      empleado-ficha-premium
      space-y-5
    ">

      {/* ===================================================
          CABECERA
      =================================================== */}

      <header className="molsan-page-header empleado-ficha-page-header max-w-[1700px] mx-auto">

        <div className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-5
        ">

          <div className="molsan-page-header__identity">

            <div className="
              w-16
              h-16
              rounded-2xl
              overflow-hidden
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              flex
              items-center
              justify-center
              shrink-0
            ">

              <img
                src={
                  empleado.foto
                    ? `${API_BASE}${empleado.foto}`
                    : "/no-foto.png"
                }
                alt="Foto empleado"
                className="
                  w-full
                  h-full
                  object-cover
                "
              />

            </div>


            <div>

              <p className="molsan-page-header__eyebrow">FICHA DE EMPLEADO</p>

              <h1 className="molsan-page-header__title">
                {empleado.nombre}{" "}
                {empleado.apellidos}
              </h1>

              <div className="
                flex
                flex-wrap
                items-center
                gap-2
                mt-1
              ">

                <span className="
                  text-sm
                  text-[var(--erp-text-soft)]
                ">
                  ID #{empleado.id}
                </span>

                <span className="
                  text-[var(--erp-text-soft)]
                ">
                  ·
                </span>

                <span className="
                  text-sm
                  text-[var(--erp-text-soft)]
                ">
                  {empleado.usuario || "Sin usuario"}
                </span>

                <span
                  className={`
                    px-2.5
                    py-1
                    rounded-lg
                    text-xs
                    font-medium
                    ${
                      empleado.activo
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }
                  `}
                >
                  {empleado.activo
                    ? "Activo"
                    : "Baja"}
                </span>

              </div>

            </div>

          </div>


          <button
            type="button"
            onClick={() =>
              setOpenModal(true)
            }
            className="
              inline-flex
              items-center
              justify-center
              px-4
              py-2.5
              rounded-xl
              bg-[var(--erp-primary)]
              hover:bg-[var(--erp-primary-dark)]
              text-white
              transition
            "
          >
            Editar ficha
          </button>

        </div>

      </header>


      {/* ===================================================
          DATOS BÁSICOS
      =================================================== */}

      <section className="
        erp-card
        max-w-[1700px]
        mx-auto
        p-5
      ">

        <h2 className="
          text-lg
          font-semibold
          text-[var(--erp-text)]
          mb-5
        ">
          Datos básicos
        </h2>

        <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-4
          gap-4
        ">

          <Dato
            label="Nombre"
            value={empleado.nombre}
          />

          <Dato
            label="Apellidos"
            value={empleado.apellidos}
          />

          <Dato
            label="DNI"
            value={empleado.dni}
          />

          <Dato
            label="Teléfono"
            value={empleado.telefono}
          />

          <Dato
            label="Email empresa"
            value={empleado.email_empresa}
          />

          <Dato
            label="Extensión"
            value={empleado.extension}
          />

          <Dato
            label="Usuario"
            value={empleado.usuario}
          />

        </div>

      </section>


      {/* ===================================================
          DATOS PERSONALES
      =================================================== */}

      <section className="
        erp-card
        max-w-[1700px]
        mx-auto
        p-5
      ">

        <h2 className="
          text-lg
          font-semibold
          text-[var(--erp-text)]
          mb-5
        ">
          Datos personales
        </h2>

        <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          gap-4
        ">

          <Dato
            label="Dirección"
            value={empleado.direccion}
          />

          <Dato
            label="Código postal"
            value={empleado.codigo_postal}
          />

          <Dato
            label="Población"
            value={empleado.poblacion}
          />

          <Dato
            label="Provincia"
            value={empleado.provincia}
          />

          <Dato
            label="Fecha nacimiento"
            value={empleado.fecha_nacimiento}
          />

          <Dato
            label="Alergias"
            value={empleado.alergias}
          />

          <Dato
            label="Persona de contacto"
            value={empleado.persona_contacto}
          />

          <Dato
            label="Teléfono contacto"
            value={empleado.telefono_contacto}
          />

        </div>


        <div className="mt-5">

          <Dato
            label="Observaciones"
            value={empleado.observaciones}
            multiline
          />

        </div>

      </section>


      {/* ===================================================
          DATOS LABORALES
      =================================================== */}

      <section className="
        erp-card
        max-w-[1700px]
        mx-auto
        p-5
      ">

        <h2 className="
          text-lg
          font-semibold
          text-[var(--erp-text)]
          mb-5
        ">
          Datos laborales
        </h2>

        <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          lg:grid-cols-3
          gap-4
        ">

          <Dato
            label="Departamento"
            value={
              empleado.departamento_nombre
            }
          />

          <Dato
            label="Sección"
            value={
              empleado.seccion_nombre
            }
          />

          <Dato
            label="Cargo"
            value={
              empleado.cargo_nombre
            }
          />

          <Dato
            label="Fecha alta"
            value={
              empleado.fecha_alta
            }
          />

          <Dato
            label="Fecha baja"
            value={
              empleado.fecha_baja
            }
          />

        </div>

      </section>


      {/* ===================================================
          AUDITORÍA
      =================================================== */}

      <section className="
        erp-card
        max-w-[1700px]
        mx-auto
        p-5
      ">

        <div className="
          flex
          items-center
          justify-between
          mb-4
        ">

          <h2 className="
            text-lg
            font-semibold
            text-[var(--erp-text)]
          ">
            Auditoría reciente
          </h2>

          <span className="
            text-sm
            text-[var(--erp-text-soft)]
          ">
            {auditoria.length} registros
          </span>

        </div>


        {auditoria.length === 0 ? (

          <div className="
            py-10
            text-center
            text-[var(--erp-text-soft)]
          ">
            No hay registros de auditoría.
          </div>

        ) : (

          <div className="
            overflow-auto
            rounded-xl
            border
            border-[var(--erp-border)]
          ">

            <table className="
              w-full
              text-sm
              text-[var(--erp-text)]
            ">

              <thead>

                <tr className="
                  bg-[var(--erp-primary)]
                  text-white
                  text-left
                ">

                  <th className="px-4 py-3">
                    Fecha
                  </th>

                  <th className="px-4 py-3">
                    Módulo
                  </th>

                  <th className="px-4 py-3">
                    Acción
                  </th>

                  <th className="px-4 py-3">
                    Descripción
                  </th>

                </tr>

              </thead>


              <tbody>

                {auditoria
                  .slice(0, 50)
                  .map((registro) => (

                    <tr
                      key={registro.id}
                      className="
                        border-t
                        border-[var(--erp-border)]
                        hover:bg-[var(--erp-primary-soft)]
                        transition-colors
                      "
                    >

                      <td className="
                        px-4
                        py-3
                        whitespace-nowrap
                      ">
                        {registro.fecha
                          ? new Date(
                              registro.fecha
                            ).toLocaleString(
                              "es-ES"
                            )
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {registro.modulo || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {registro.accion || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {registro.descripcion || "—"}
                      </td>

                    </tr>

                  ))}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ===================================================
          MODAL
      =================================================== */}

      {openModal && (

        <ModalEmpleado
          open={true}
          empleadoId={empleadoId}
          onClose={() => {
            setOpenModal(false);
            cargar();
          }}
        />

      )}

    </div>
  );
}


/* =========================================================
   DATO
========================================================= */

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
        text-xs
        font-medium
        text-[var(--erp-text-soft)]
        mb-1
      ">
        {label}
      </div>

      <div
        className={`
          text-sm
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
