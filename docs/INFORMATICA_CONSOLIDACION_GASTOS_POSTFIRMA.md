# Consolidación de gastos ERP ↔ ABSIS Post Firma

**Estado:** preparado para revisión de Informática. No activar intercambio externo hasta validar el contrato de API, la migración y los casos de prueba.

## Objetivo funcional

Un gasto creado desde la FichaExpediente debe poder conservar su identidad ERP y recibir los datos que vuelven en el Excel Post Firma sin crear una segunda fila económica. Los gastos diferentes del mismo expediente se mantienen separados aunque compartan concepto.

## Identidad de correlación

- Clave de correlación preferente: `IDGASTO + TIPOCONCEPTO`.
- Mismo expediente y mismo concepto, pero distinto `IDGASTO`: son gastos distintos.
- Reimportar la misma pareja no debe crear otra fila; actualiza la fila correlacionada.
- Los históricos que todavía no tengan `TIPOCONCEPTO` solo se reutilizan por `IDGASTO` si existe una única coincidencia antigua y esta no tiene tipo de concepto guardado. Si hay varias candidatas, no se adivina la relación.
- Si el expediente no existe todavía en ERP, se conserva `IDEXPEDIENTE` de ABSIS y el gasto queda sin vínculo interno; no se crea un expediente automáticamente.

## Campos añadidos para trazabilidad

- `tipo_concepto_absis`: tipo de concepto devuelto por ABSIS.
- `origen_registro`: `ERP` o `ABSIS_POSTFIRMA`.
- `estado_consolidacion`: `Pendiente envío`, `Consolidado` o `Importado Post Firma`.
- `fecha_ultima_sincronizacion`: fecha de la última importación del movimiento.
- `numero_factura_absis` y `fecha_factura_absis`: datos de factura devueltos por ABSIS separados de los campos de factura originales del ERP.

La respuesta de la API de gastos expone la identidad ABSIS y el estado de consolidación, sin exponer el JSON completo de la fila Excel. La importación no debe marcar como consolidado un registro antiguo cuyo origen no se conozca.

## Alcance implementado en esta rama

1. Modelo de gasto ampliado con campos de identidad y trazabilidad.
2. Migración idempotente que añade las columnas opcionales; no borra ni altera filas existentes.
3. Importador Post Firma correlaciona por `IDGASTO + TIPOCONCEPTO` cuando la columna existe y conserva compatibilidad prudente con históricos sin tipo.
4. Cuando el movimiento coincide con un gasto ERP, se conservan sus campos nativos (tipo, descripción, importe, fecha y número de factura); los datos ABSIS se guardan en campos propios y el registro queda como `Consolidado`.
5. La FichaExpediente y el informe de facturación muestran la pareja de identidad y el estado de consolidación.
4. Respuesta de gastos preparada para devolver la información de consolidación.
5. El Catálogo ABSIS existente incluye las categorías `TIPOCONCEPTO` y `CONCEPTOGASTO`, sin crear una segunda pantalla de catálogo.

## Pendiente de validación / integración de Informática

- Confirmar los códigos/valores oficiales de `TIPOCONCEPTO` y `CONCEPTOGASTO` con Informática y cargar o revisar sus entradas en el Catálogo ABSIS.
- Definir endpoint, autenticación, reintentos, timeout y respuesta de la API del cliente. No hay envío externo activado por este cambio.
- Confirmar con Informática el contrato de la API saliente (endpoint, autenticación, método, estructura exacta de petición/respuesta, errores y reintentos). No se enviarán peticiones reales hasta disponer de ese contrato.
- En el alta ERP, guardar el `IDGASTO` y `TIPOCONCEPTO` que devuelva ABSIS (o el identificador de correlación acordado) y mantener `origen_registro=ERP`.
- Verificar en la FichaExpediente la presentación de los datos ERP y Post Firma como un único registro con estado visible. La rama prepara el contrato backend, pero la presentación visual final debe validarse con la pantalla real.
- Ejecutar la migración protegida de gastos en el entorno de prueba antes de usar las nuevas columnas.
- Revisar posibles duplicados históricos antes de crear restricciones UNIQUE en base de datos. No se añade una restricción de unicidad automática.
- Probar en entorno de pruebas antes de desplegar a producción.

## Pruebas de aceptación para Informática

1. Crear un gasto ERP, asignarle una pareja de identificación y recibir esa misma pareja desde Post Firma: debe quedar una fila con estado `Consolidado`.
2. Importar el mismo Excel dos veces: la segunda ejecución actualiza, no duplica.
3. Dos gastos del mismo expediente y tipo con distinto `IDGASTO`: deben permanecer dos filas.
4. Mismo `IDGASTO` con distinto `TIPOCONCEPTO`: no deben fusionarse.
5. Histórico sin `TIPOCONCEPTO` con una sola coincidencia antigua: puede actualizarse de forma segura.
6. Histórico ambiguo con varias coincidencias por `IDGASTO`: no se debe elegir arbitrariamente.
7. Gasto de expediente no cargado: se conserva con su referencia ABSIS y se puede vincular cuando exista el expediente.
8. Confirmar que ninguna operación de gastos crea, elimina o modifica expedientes.
9. Verificar que la API no devuelve cuentas bancarias ni el JSON íntegro de la fila como parte del resumen de consolidación.

**Importante:** hasta completar estas pruebas, esta funcionalidad debe considerarse preparada para validación, no integración externa certificada.
