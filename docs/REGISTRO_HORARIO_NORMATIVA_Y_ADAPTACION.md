# Registro horario en Fichajes Molsan: normativa y adaptación

**Revisión normativa:** 1 de noviembre de 2026  
**Norma principal:** artículo 34.9 del Estatuto de los Trabajadores (Real Decreto Legislativo 2/2015), texto consolidado del BOE actualizado el 21 de octubre de 2026.

## 1. Obligaciones vigentes

El artículo 34.9 exige que la empresa garantice un registro diario de jornada que incluya el horario concreto de inicio y finalización de la jornada de cada persona trabajadora. El sistema se organiza y documenta mediante negociación colectiva o acuerdo de empresa; en su defecto, por decisión empresarial previa consulta con la representación legal de las personas trabajadoras.

Los registros deben conservarse durante **cuatro años** y permanecer a disposición de las personas trabajadoras, de sus representantes legales y de la Inspección de Trabajo y Seguridad Social.

El artículo 34.9 no prescribe una plantilla, extensión de fichero, formato CSV/XLSX/PDF ni una estructura técnica universal. Por tanto, el CSV incorporado a Molsan es un formato práctico de consulta y exportación, no un formato oficial impuesto por la ley.

## 2. Criterio de diseño para Molsan

El registro debe poder demostrar, por cada persona y día:

- Fecha de la jornada.
- Hora concreta de inicio y de finalización.
- Identificación de la persona trabajadora.
- Detalle cronológico de los eventos que permiten justificar el resumen diario.
- Trazabilidad de altas y correcciones, identificando quién actuó, cuándo y por qué.
- Disponibilidad y recuperación de la información durante todo el plazo legal de conservación.

Las pausas pueden conservarse como eventos adicionales para el cálculo de tiempo efectivo y la organización interna; no deben confundirse con el mínimo literal de inicio y fin de jornada que establece el artículo 34.9.

## 3. Adaptaciones realizadas en esta rama

- Los marcajes de empleado se incorporan también al historial de auditoría como eventos de alta.
- Se añade una exportación CSV para administración, con resumen diario de primera entrada y última salida, detalle de cada evento y su historial de auditoría.
- La exportación respeta el rango de fechas, empleado y tipo de evento seleccionados, y utiliza la zona horaria Europe/Madrid.
- Se mantiene la corrección administrativa con motivo, instantánea anterior/posterior y bloqueo de periodos cerrados.
- La exportación no limita el número de registros a los 5.000 que muestra la consulta de pantalla.

## 4. Aspectos que requieren una fase de seguridad y datos antes de producción

Esta adaptación técnica **no certifica por sí sola el cumplimiento jurídico completo**. Antes de usarla como sistema oficial de registro deben revisarse y cerrarse estos puntos:

1. Política de conservación efectiva durante cuatro años, incluidas copias de seguridad y restauración.
2. Evitar que la baja o eliminación física de una ficha de empleado provoque el borrado en cascada de sus registros horarios y auditorías. Debe preferirse la baja lógica o una relación histórica protegida, con migración de base de datos planificada.
3. Reforzar la inalterabilidad del historial (permisos, controles append-only en base de datos y auditoría de accesos), no solo la trazabilidad a nivel de aplicación.
4. Definir el procedimiento de entrega y puesta a disposición de registros a trabajadores, representantes e Inspección, con permisos y protección de datos adecuados.
5. Documentar el sistema de organización y consulta aplicable en la empresa, teniendo en cuenta el convenio colectivo y, cuando corresponda, a la representación legal de las personas trabajadoras.
6. Validar con asesoría laboral el tratamiento de horarios flexibles, jornadas parciales, pausas, ausencias, teletrabajo y cualquier convenio sectorial o de empresa aplicable.

No se deben borrar, recalcular ni modificar registros históricos de producción para implantar estas mejoras. Cualquier cambio de esquema debe prepararse con migración reversible y probarse primero en un entorno aislado.

## 5. Fuente normativa

- BOE, Estatuto de los Trabajadores, artículo 34.9, texto consolidado actualizado el 21/10/2026: https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430&p=20261021&tn=1

