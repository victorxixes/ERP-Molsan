import { useState } from "react";
import axios from "../../api/axios";


/**
 * ============================================================
 * IMPORTADOR ABSIS
 * MOLSAN ERP
 * ============================================================
 */

export default function ImportadorAbsis() {

    const [fecha, setFecha] = useState("");
    const [file, setFile] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);


    /**
     * ========================================================
     * IMPORTAR
     * ========================================================
     */

    const importar = async (modo) => {

        setError(null);
        setResultado(null);

        if (!file) {
            setError("Debes seleccionar un archivo Excel.");
            return;
        }

        if (modo === "fecha" && !fecha) {
            setError("Debes seleccionar una fecha para importar.");
            return;
        }

        setCargando(true);

        try {

            const formData = new FormData();

            formData.append(
                "fichero",
                file
            );

            const url =
                modo === "hoy"
                    ? "/utilidades/importador-absis/expedientes"
                    : `/utilidades/importador-absis/expedientes?fecha=${fecha}`;

            const res = await axios.post(
                url,
                formData
            );

            setResultado(res.data);

        } catch (err) {

            console.error("Error importando ABSIS:", "Error interno");

            setError(
                err?.response?.data?.detail ||
                err?.response?.data?.error ||
                "Error al importar el archivo. Revisa el formato o el servidor."
            );

        } finally {

            setCargando(false);

        }

    };


    /**
     * ========================================================
     * ARCHIVO
     * ========================================================
     */

    const seleccionarArchivo = (event) => {

        const seleccionado =
            event.target.files?.[0] || null;

        setError(null);
        setResultado(null);

        if (!seleccionado) {
            setFile(null);
            return;
        }

        const extension =
            seleccionado.name
                .split(".")
                .pop()
                ?.toLowerCase();

        if (extension !== "xlsx") {

            setFile(null);

            setError(
                "El archivo seleccionado debe estar en formato .xlsx."
            );

            event.target.value = "";

            return;
        }

        setFile(seleccionado);

    };


    /**
     * ========================================================
     * FORMATEAR TAMAÑO
     * ========================================================
     */

    const tamañoArchivo = file
        ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
        : "";


    return (

        <div
            className="utilidades-premium-page herramientas-subpagina-premium erp-page min-w-0 space-y-5"
        >


            <MolsanPageHeader mark="IA" title="Importador ABSIS" description="Importa expedientes desde el Excel matriz ABSIS seleccionando el día que deseas procesar." />

                PANEL PRINCIPAL
                ================================================== */}

            <section
                className="erp-card p-5
 lg:p-6"
            >


                {/* =================================================
                    CABECERA DEL PANEL
                    ================================================= */}

                <div
                    className="flex
 items-center
 gap-3
 mb-6"
                >

                    <div
                        className="w-9
 h-9
 
 
 
 
 flex
 items-center
 justify-center"
                    >
                        📥
                    </div>

                    <div>

                        <h2
                           
                        >
                            Configuración de la importación
                        </h2>

                        <p
                           
                        >
                            Selecciona la fecha y el archivo Excel ABSIS.
                        </p>

                    </div>

                </div>



                {/* =================================================
                    FECHA
                    ================================================= */}

                <div className="mb-6">

                    <label
                        htmlFor="absis-fecha"
                        className="flex
 items-center
 gap-2
 
 
 
 mb-2"
                    >

                        <span>📅</span>

                        <span>
                            Fecha de importación
                        </span>

                    </label>


                    <div
                        className="max-w-sm
 relative"
                    >

                        <input
                            id="absis-fecha"
                            type="date"
                            value={fecha}
                            onChange={(e) =>
                                setFecha(e.target.value)
                            }
                            disabled={cargando}
                            className="w-full
 h-11
 px-3"
                        />

                    </div>


                    <p
                        className="mt-2"
                    >
                        Selecciona una fecha si quieres importar un día
                        concreto del histórico ABSIS.
                    </p>

                </div>



                {/* =================================================
                    ARCHIVO EXCEL
                    ================================================= */}

                <div>

                    <label
                        className="flex
 items-center
 gap-2
 
 
 
 mb-2"
                    >

                        <span>📊</span>

                        <span>
                            Archivo Excel
                        </span>

                    </label>


                    <label
                        className="group
 flex
 flex-col
 items-center
 justify-center
 w-full
 min-h-[155px]
 
 
 
 
 
 
 
 
 
 
 px-6"
                    >

                        <div
                            className="pointer-events-none"
                        >

                            {/* ICONO */}

                            <div
                                className="mx-auto
 w-12
 h-12
 
 
 
 
 flex
 items-center
 justify-center
 
 
 mb-3"
                            >
                                {file ? "📊" : "📄"}
                            </div>


                            {/* ARCHIVO SELECCIONADO */}

                            {file ? (

                                <>

                                    <div
                                        className="break-all"
                                    >
                                        {file.name}
                                    </div>

                                    <div
                                        className="mt-1"
                                    >
                                        {tamañoArchivo}
                                    </div>

                                    <div
                                        className="inline-flex
 items-center
 gap-1.5
 mt-3
 px-3
 py-1"
                                    >
                                        <span>✓</span>
                                        Excel seleccionado
                                    </div>

                                </>

                            ) : (

                                <>

                                    <div
                                       
                                    >
                                        Selecciona el Excel ABSIS
                                    </div>

                                    <div
                                        className="mt-1"
                                    >
                                        Formato permitido: .xlsx
                                    </div>

                                    <div
                                        className="mt-3"
                                    >
                                        Haz clic aquí para seleccionar el archivo
                                    </div>

                                </>

                            )}

                        </div>


                        <input
                            type="file"
                            accept=".xlsx"
                            disabled={cargando}
                            onChange={seleccionarArchivo}
                            className="hidden"
                        />

                    </label>

                </div>



                {/* =================================================
                    BOTONES
                    ================================================= */}

                <div
                    className="grid
 grid-cols-1
 lg:grid-cols-2
 gap-3
 mt-6"
                >

                    {/* IMPORTAR DÍA ACTUAL */}

                    <button
                        type="button"
                        onClick={() =>
                            importar("hoy")
                        }
                        disabled={
                            cargando ||
                            !file
                        }
                        className="min-h-[46px]
 px-5"
                    >

                        {cargando ? (

                            <span
                                className="flex
 items-center
 justify-center
 gap-2"
                            >

                                <span
                                   
                                >
                                    ⟳
                                </span>

                                Importando...

                            </span>

                        ) : (

                            <span
                                className="flex
 items-center
 justify-center
 gap-2"
                            >
                                📥
                                Importar expedientes del día
                            </span>

                        )}

                    </button>



                    {/* IMPORTAR FECHA */}

                    <button
                        type="button"
                        onClick={() =>
                            importar("fecha")
                        }
                        disabled={
                            cargando ||
                            !file ||
                            !fecha
                        }
                        className="min-h-[46px]
 px-5"
                    >

                        {cargando ? (

                            <span
                                className="flex
 items-center
 justify-center
 gap-2"
                            >

                                <span
                                   
                                >
                                    ⟳
                                </span>

                                Importando...

                            </span>

                        ) : (

                            <span
                                className="flex
 items-center
 justify-center
 gap-2"
                            >
                                📅
                                Importar fecha seleccionada
                            </span>

                        )}

                    </button>

                </div>


            </section>



            {/* ==================================================
                ERROR
                ================================================== */}

            {error && (

                <section
                    className="p-5"
                >

                    <div
                        className="flex
 items-start
 gap-3"
                    >

                        <div
                            className="w-10
 h-10
 
 
 flex
 items-center
 justify-center
 
 flex-shrink-0"
                        >
                            ⛔
                        </div>


                        <div>

                            <h3
                               
                            >
                                Error en la importación
                            </h3>

                            <p
                                className="mt-1"
                            >
                                {error}
                            </p>

                        </div>

                    </div>

                </section>

            )}



            {/* ==================================================
                RESULTADO
                ================================================== */}

            {resultado && (

                <section
                    className="p-5
 lg:p-6"
                >

                    {/* CABECERA */}

                    <div
                        className="flex
 items-center
 gap-3
 mb-5"
                    >

                        <div
                            className="w-11
 h-11
 
 
 
 
 flex
 items-center
 justify-center"
                        >
                            ✓
                        </div>


                        <div>

                            <h2
                               
                            >
                                Importación completada
                            </h2>

                            <p
                               
                            >
                                El proceso ABSIS ha finalizado correctamente.
                            </p>

                        </div>

                    </div>



                    {/* KPIS */}

                    <div
                        className="grid
 grid-cols-1
 sm:grid-cols-2
 lg:grid-cols-4
 gap-3"
                    >

                        {/* FECHA */}

                        <div
                            className="p-4"
                        >

                            <div
                                className="uppercase"
                            >
                                Fecha importada
                            </div>

                            <div
                                className="mt-1"
                            >
                                {resultado.fecha_importada || "-"}
                            </div>

                        </div>


                        {/* CREADOS */}

                        <div
                            className="p-4"
                        >

                            <div
                                className="uppercase"
                            >
                                Expedientes creados
                            </div>

                            <div
                                className="mt-1"
                            >
                                {resultado.expedientes_creados ?? 0}
                            </div>

                        </div>


                        {/* ACTUALIZADOS */}

                        <div
                            className="p-4"
                        >

                            <div
                                className="uppercase"
                            >
                                Expedientes actualizados
                            </div>

                            <div
                                className="mt-1"
                            >
                                {resultado.expedientes_actualizados ?? 0}
                            </div>

                        </div>


                        {/* FILTRADOS */}

                        <div
                            className="p-4"
                        >

                            <div
                                className="uppercase"
                            >
                                Total filtrados
                            </div>

                            <div
                                className="mt-1"
                            >
                                {resultado.total_filtrados ?? 0}
                            </div>

                        </div>

                    </div>



                    {/* ERRORES */}

                    {resultado.errores > 0 && (

                        <div
                            className="mt-4
 p-4"
                        >

                            ⚠️ La importación terminó con{" "}

                            <strong>
                                {resultado.errores}
                            </strong>{" "}

                            registros con error.

                        </div>

                    )}

                </section>

            )}

        </div>

    );

}
