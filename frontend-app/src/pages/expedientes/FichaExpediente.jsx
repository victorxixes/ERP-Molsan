import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { obtenerExpediente } from "../../api/expedientes";
import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";

{/* ================================================== */}
{/* PRIMER BLOQUE — ESTADO / TITULARES / SOLICITANTES */}
{/* ================================================== */}

<div className="grid grid-cols-1 gap-5 xl:grid-cols-3">


  {/* ================================================= */}
  {/* IZQUIERDA — ESTADO */}
  {/* ================================================= */}

  <Seccion
    titulo="Estado"
    subtitulo="Situación actual del expediente"
    icono="estado"
  >

    <Dato
      etiqueta="Estado"
      valor={expediente.estado_expediente}
      destacado
    />

    <Dato
      etiqueta="Actividad actual"
      valor={expediente.actividad_actual}
      destacado
    />

    <Dato
      etiqueta="Estado actividad"
      valor={expediente.estado_actividad}
    />

    <Dato
      etiqueta="Tipo operación"
      valor={expediente.tipo_operacion}
      destacado
    />

    <Dato
      etiqueta="Oficina"
      valor={expediente.oficina}
      destacado
    />

    <Dato
      etiqueta="DAN"
      valor={expediente.dan}
    />

    <Dato
      etiqueta="Fecha alta"
      valor={expediente.fecha_alta}
      tipo="fecha"
      destacado
    />

  </Seccion>


  {/* ================================================= */}
  {/* CENTRO — TITULARES */}
  {/* ================================================= */}

  <Seccion
    titulo="Titulares"
    subtitulo="Información de los titulares del expediente"
    icono="titular"
  >

    <Dato
      etiqueta="Nombre titular"
      valor={expediente.nombre_titular}
      destacado
    />

    <Dato
      etiqueta="NIF titular"
      valor={expediente.nif_titular}
    />

  </Seccion>


  {/* ================================================= */}
  {/* DERECHA — SOLICITANTES */}
  {/* ================================================= */}

  <Seccion
    titulo="Solicitantes"
    subtitulo="Información de solicitantes y apoderados"
    icono="solicitante"
  >

    <Dato
      etiqueta="Nombre solicitante"
      valor={expediente.nombre_solicitante}
      destacado
    />

    <Dato
      etiqueta="NIF solicitante"
      valor={expediente.nif_solicitante}
    />

    <Dato
      etiqueta="Apoderado"
      valor={expediente.apoderado}
    />

  </Seccion>

</div>
```
