# Preparación de importación de 25 expedientes de prueba real

## Cuándo se ejecuta
Solo después de:
1. Validar el esquema completo en PostgreSQL aislado.
2. Integrar y probar autenticación, permisos y aislamiento de portales.
3. Resolver el almacenamiento documental mediante Supabase Storage privado.
4. Conectar y validar el Preview de Render con el proyecto Supabase correcto.
5. Completar las pruebas integrales y aprobar el punto de restauración/rollback.

Esta guía no ejecuta importaciones ni contiene datos personales.

## Alcance confirmado
- Importar únicamente los aproximadamente 25 expedientes seleccionados por MOLSAN.
- No importar los 417 expedientes pendientes de los entornos anteriores.
- No importar pagos históricos, saldos antiguos ni movimientos ficticios.
- No copiar automáticamente archivos desde almacenamiento efímero o discos antiguos.
- No crear empleados, notarios, gestores ni permisos a partir de referencias no verificadas.
- Los pagos y saldos de prueba se crearán posteriormente dentro del ERP, con el flujo funcional normal y confirmación explícita.

## Preparación del fichero fuente
El fichero de trabajo deberá separar las entidades en pestañas o ficheros:
- **Clientes**: identificador de origen, datos de contacto y facturación estrictamente necesarios.
- **Expedientes**: una fila por expediente, con `id_expediente` como clave natural única.
- **Relaciones**: referencias a tipo de expediente, notaría, apoderado y gestor; solo se resolverán contra catálogos/usuarios ya creados.
- **Documentos**: inventario de ficheros que MOLSAN decida incorporar, sin incrustar contenido binario en la hoja.

No se debe incluir información que no sea necesaria para las pruebas. Los identificadores y referencias deben conservarse como texto para no perder ceros iniciales.

## Validaciones previas obligatorias
- Exactamente el conjunto aprobado de expedientes; sin filas adicionales.
- `id_expediente` no vacío, único y sin colisiones con el entorno destino.
- Fechas y horas en formato inequívoco; importes numéricos con decimal explícito.
- Tipos, estados, notaría, gestor y apoderado contrastados con los catálogos destino.
- Relaciones cliente-expediente coherentes.
- Valores de actividad/estado incluidos en los flujos soportados.
- Detección de campos no reconocidos; nunca descartarlos silenciosamente.
- Informe de errores por fila antes de cualquier escritura.

## Ejecución controlada
1. Cargar el fichero en una zona de staging aislada, sin publicar registros en los módulos.
2. Generar un informe de previsualización: altas, relaciones resueltas, referencias faltantes, duplicados y campos descartados.
3. Obtener aprobación del listado y del informe de validación.
4. Importar en una transacción controlada y con orden de dependencias (clientes/catálogos antes que expedientes).
5. Registrar lote, hash del fichero, fecha, usuario ejecutor y resultado por expediente.
6. Verificar recuentos, claves únicas, relaciones y lectura desde la ficha del expediente.
7. Ejecutar comprobaciones de permisos y visibilidad para administración, ApoderaGest, EncargaGest y NotarGest.
8. Si falla una validación, revertir el lote completo; no dejar expedientes parciales.

## Documentos
Los documentos aprobados se subirán a buckets privados de Supabase Storage. La base de datos guardará únicamente la referencia/clave del objeto y sus metadatos. Las descargas se autorizarán en el backend y se entregarán mediante streaming o URL firmada de corta duración. No se habilitará acceso público al bucket.

## Evidencias de cierre
- Fichero fuente y hash del lote.
- Informe de previsualización aprobado.
- Informe de importación por expediente.
- Recuentos y comprobación de relaciones.
- Evidencia de acceso permitido/denegado por rol y portal.
- Resultado de prueba de rollback.
- Confirmación expresa de que no se importaron expedientes ni pagos históricos ficticios.

**Estado actual:** preparación documental únicamente. No hay datos de los 25 expedientes, no se ha creado un lote de importación y no se ha escrito ningún dato en Supabase.
