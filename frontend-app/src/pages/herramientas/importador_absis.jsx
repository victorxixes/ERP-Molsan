import MolsanIcon from "../../components/ui/MolsanIcon";
import { useState } from "react";
import axios from "../../api/axios";
import MolsanButton from "../../components/ui/MolsanButton";
import "../../css/ModalesHerramientasPremium.css";


/**
 * ============================================================
 * IMPORTADOR ABSIS
 * MOLSAN ERP — TEMA CLARO PREMIUM
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
            className="
                herramientas-subpagina-premium
                w-full
                p-4
                lg:p-6
                space-y-5
                animate-fade-in
                text-[var(--erp-text)]
            "
        >


            {/* ==================================================
                CABECERA
                ================================================== */}

            <section
                className="
                    bg-white
                    border
                    border-[var(--erp-border)]
                    rounded-2xl
                    p-5
                    lg:p-6
                    shadow-sm
                "
            >

                <div
                    className="molsan-page-header 
                        flex
                        items-center
                        gap-4
                    "
                >

                    {/* ICONO */}

                    <div
                        className="
                            w-12
                            h-12
                            rounded-2xl
                            bg-[var(--erp-primary-soft)]
                            border
                            border-[var(--erp-primary)]
                            flex
                            items-center
                            justify-center
                            flex-shrink-0
                            shadow-sm
                        "
                    >

                        <span
                            className="
                                text-xl
                            "
                        >
                            <MolsanIcon name="download" size={20} />
                        </span>

                    </div>


                    {/* TEXTO */}

                    <div className="min-w-0">

                        <h1
                            className="
                                text-2xl
                                lg:text-3xl
                                font-bold
                                tracking-tight
                                text-[var(--erp-text)]
                            "
                        >
                            Importador ABSIS
                        </h1>

                        <p
                            className="
                                text-sm
                                text-[var(--erp-text-soft)]
                                mt-1
                            "
                        >
                            Importa expedientes desde el Excel matriz ABSIS
                            seleccionando el día que deseas procesar.
                        </p>

                    </div>

                </div>

            </section>



            {/* ==================================================
                PANEL PRINCIPAL
                ================================================== */}

            <section
                className="
                    bg-white
                    border
                    border-[var(--erp-border)]
                    rounded-2xl
                    p-5
                    lg:p-6
                    shadow-sm
                "
            >


                {/* =================================================
                    CABECERA DEL PANEL
                    ================================================= */}

                <div
                    className="
                        flex
                        items-center
                        gap-3
                        mb-6
                    "
                >

                    <div
                        className="
                            w-9
                            h-9
                            rounded-xl
                            bg-[var(--erp-primary-soft)]
                            border
                            border-[var(--erp-border)]
                            flex
                            items-center
                            justify-center
                        "
                    >
                        <MolsanIcon name="download" size={20} />
                    </div>

                    <div>

                        <h2
                            className="
                                text-base
                                font-bold
                                text-[var(--erp-text)]
                            "
                        >
                            Configuración de la importación
                        </h2>

                        <p
                            className="
                                text-xs
                                text-[var(--erp-text-soft)]
                            "
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
                        className="
                            flex
                            items-center
                            gap-2
                            text-sm
                            font-semibold
                            text-[var(--erp-text)]
                            mb-2
                        "
                    >

                        <span><MolsanIcon name="calendar" size={20} /></span>

                        <span>
                            Fecha de importación
                        </span>

                    </label>


                    <div
                        className="
                            max-w-sm
                            relative
                        "
                    >

                        <input
                            id="absis-fecha"
                            type="date"
                            value={fecha}
                            onChange={(e) =>
                                setFecha(e.target.value)
                            }
                            disabled={cargando}
                            className="
                                w-full
                                h-11
                                px-3
                                rounded-xl
                                border
                                border-[var(--erp-border)]
                                bg-white
                                text-[var(--erp-text)]
                                text-sm
                                outline-none
                                transition-all
                                focus:border-[var(--erp-primary)]
                                focus:ring-2
                                focus:ring-[var(--erp-primary-soft)]
                                disabled:bg-gray-50
                                disabled:cursor-not-allowed
                            "
                        />

                    </div>


                    <p
                        className="
                            text-xs
                            text-[var(--erp-text-soft)]
                            mt-2
                        "
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
                        className="
                            flex
                            items-center
                            gap-2
                            text-sm
                            font-semibold
                            text-[var(--erp-text)]
                            mb-2
                        "
                    >

                        <span><MolsanIcon name="chart" size={20} /></span>

                        <span>
                            Archivo Excel
                        </span>

                    </label>


                    <label
                        className="
                            group
                            flex
                            flex-col
                            items-center
                            justify-center
                            w-full
                            min-h-[155px]
                            rounded-2xl
                            border-2
                            border-dashed
                            border-[var(--erp-border)]
                            bg-[var(--erp-background)]
                            hover:border-[var(--erp-primary)]
                            hover:bg-[var(--erp-primary-soft)]
                            transition-all
                            duration-200
                            cursor-pointer
                            px-6
                        "
                    >

                        <div
                            className="
                                text-center
                                pointer-events-none
                            "
                        >

                            {/* ICONO */}

                            <div
                                className="
                                    mx-auto
                                    w-12
                                    h-12
                                    rounded-2xl
                                    bg-white
                                    border
                                    border-[var(--erp-border)]
                                    flex
                                    items-center
                                    justify-center
                                    text-2xl
                                    shadow-sm
                                    mb-3
                                    group-hover:border-[var(--erp-primary)]
                                    transition
                                "
                            >
                                {file ? "📊" : "📄"}
                            </div>


                            {/* ARCHIVO SELECCIONADO */}

                            {file ? (

                                <>

                                    <div
                                        className="
                                            font-semibold
                                            text-[var(--erp-text)]
                                            text-sm
                                            break-all
                                        "
                                    >
                                        {file.name}
                                    </div>

                                    <div
                                        className="
                                            text-xs
                                            text-[var(--erp-text-soft)]
                                            mt-1
                                        "
                                    >
                                        {tamañoArchivo}
                                    </div>

                                    <div
                                        className="
                                            inline-flex
                                            items-center
                                            gap-1.5
                                            mt-3
                                            px-3
                                            py-1
                                            rounded-full
                                            bg-green-50
                                            border
                                            border-green-200
                                            text-green-700
                                            text-[11px]
                                            font-semibold
                                        "
                                    >
                                        <span>✓</span>
                                        Excel seleccionado
                                    </div>

                                </>

                            ) : (

                                <>

                                    <div
                                        className="
                                            font-semibold
                                            text-[var(--erp-text)]
                                            text-sm
                                        "
                                    >
                                        Selecciona el Excel ABSIS
                                    </div>

                                    <div
                                        className="
                                            text-xs
                                            text-[var(--erp-text-soft)]
                                            mt-1
                                        "
                                    >
                                        Formato permitido: .xlsx
                                    </div>

                                    <div
                                        className="
                                            text-[11px]
                                            text-[var(--erp-text-soft)]
                                            mt-3
                                        "
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
                    className="
                        grid
                        grid-cols-1
                        lg:grid-cols-2
                        gap-3
                        mt-6
                    "
                >

                    {/* IMPORTAR DÍA ACTUAL */}

                    <MolsanButton icon="upload" variant="primary" className="min-h-[46px]" onClick={() => importar("hoy")} disabled={cargando || !file} loading={cargando}>Importar expedientes del día</MolsanButton>



                    {/* IMPORTAR FECHA */}

                    <MolsanButton icon="check" variant="success" className="min-h-[46px]" onClick={() => importar("fecha")} disabled={cargando || !file || !fecha} loading={cargando}>Importar fecha seleccionada</MolsanButton>

                </div>


            </section>



            {/* ==================================================
                ERROR
                ================================================== */}

            {error && (

                <section
                    className="
                        bg-red-50
                        border
                        border-red-200
                        rounded-2xl
                        p-5
                        shadow-sm
                        animate-fade-in
                    "
                >

                    <div
                        className="
                            flex
                            items-start
                            gap-3
                        "
                    >

                        <div
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-red-100
                                flex
                                items-center
                                justify-center
                                text-lg
                                flex-shrink-0
                            "
                        >
                            ⛔
                        </div>


                        <div>

                            <h3
                                className="
                                    font-semibold
                                    text-red-800
                                "
                            >
                                Error en la importación
                            </h3>

                            <p
                                className="
                                    text-sm
                                    text-red-700
                                    mt-1
                                "
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
                    className="
                        bg-white
                        border
                        border-green-200
                        rounded-2xl
                        p-5
                        lg:p-6
                        shadow-sm
                        animate-fade-in
                    "
                >

                    {/* CABECERA */}

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                            mb-5
                        "
                    >

                        <div
                            className="
                                w-11
                                h-11
                                rounded-xl
                                bg-green-50
                                border
                                border-green-200
                                flex
                                items-center
                                justify-center
                                text-xl
                                text-green-600
                            "
                        >
                            ✓
                        </div>


                        <div>

                            <h2
                                className="
                                    text-xl
                                    font-bold
                                    text-[var(--erp-text)]
                                "
                            >
                                Importación completada
                            </h2>

                            <p
                                className="
                                    text-sm
                                    text-[var(--erp-text-soft)]
                                "
                            >
                                El proceso ABSIS ha finalizado correctamente.
                            </p>

                        </div>

                    </div>



                    {/* KPIS */}

                    <div
                        className="
                            grid
                            grid-cols-1
                            sm:grid-cols-2
                            lg:grid-cols-4
                            gap-3
                        "
                    >

                        {/* FECHA */}

                        <div
                            className="
                                rounded-xl
                                border
                                border-[var(--erp-border)]
                                bg-[var(--erp-background)]
                                p-4
                            "
                        >

                            <div
                                className="
                                    text-[11px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-[var(--erp-text-soft)]
                                "
                            >
                                Fecha importada
                            </div>

                            <div
                                className="
                                    text-lg
                                    font-bold
                                    text-[var(--erp-text)]
                                    mt-1
                                "
                            >
                                {resultado.fecha_importada || "-"}
                            </div>

                        </div>


                        {/* CREADOS */}

                        <div
                            className="
                                rounded-xl
                                border
                                border-green-200
                                bg-green-50
                                p-4
                            "
                        >

                            <div
                                className="
                                    text-[11px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-green-700
                                "
                            >
                                Expedientes creados
                            </div>

                            <div
                                className="
                                    text-2xl
                                    font-bold
                                    text-green-700
                                    mt-1
                                "
                            >
                                {resultado.expedientes_creados ?? 0}
                            </div>

                        </div>


                        {/* ACTUALIZADOS */}

                        <div
                            className="
                                rounded-xl
                                border
                                border-blue-200
                                bg-blue-50
                                p-4
                            "
                        >

                            <div
                                className="
                                    text-[11px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-blue-700
                                "
                            >
                                Expedientes actualizados
                            </div>

                            <div
                                className="
                                    text-2xl
                                    font-bold
                                    text-blue-700
                                    mt-1
                                "
                            >
                                {resultado.expedientes_actualizados ?? 0}
                            </div>

                        </div>


                        {/* FILTRADOS */}

                        <div
                            className="
                                rounded-xl
                                border
                                border-[var(--erp-border)]
                                bg-[var(--erp-background)]
                                p-4
                            "
                        >

                            <div
                                className="
                                    text-[11px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-[var(--erp-text-soft)]
                                "
                            >
                                Total filtrados
                            </div>

                            <div
                                className="
                                    text-2xl
                                    font-bold
                                    text-[var(--erp-text)]
                                    mt-1
                                "
                            >
                                {resultado.total_filtrados ?? 0}
                            </div>

                        </div>

                    </div>



                    {/* ERRORES */}

                    {resultado.errores > 0 && (

                        <div
                            className="
                                mt-4
                                p-4
                                rounded-xl
                                bg-yellow-50
                                border
                                border-yellow-200
                                text-yellow-800
                                text-sm
                            "
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
