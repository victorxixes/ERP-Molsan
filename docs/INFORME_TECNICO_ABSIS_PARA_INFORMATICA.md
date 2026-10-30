# Informe técnico para Informática — ABSIS

Fecha de revisión: 30/10/2026  
Repositorio: `victorxixes/ERP-Molsan` · rama `main`

## 1. Alcance y conclusión

Este documento separa tres funciones que no deben confundirse:

1. Importación de ficheros ABSIS hacia la base de datos del ERP.
2. Registro interno de solicitudes/envíos y sus incidencias.
3. Transmisión externa efectiva al sistema ABSIS y recepción de su confirmación.

La revisión del código confirma las dos primeras funciones en distintos grados. **No se ha encontrado evidencia de un cliente HTTP operativo que transmita solicitudes al servicio externo ABSIS ni de una confirmación técnica recibida desde ABSIS.** La integración externa debe considerarse pendiente de especificación e implementación.

## 2. Seguridad del importador de expedientes

Ruta:

`POST /api/utilidades/importador-absis/expedientes`

Archivo:

`backend/app/Utilidades/importadores/router_absis.py`

La función de importación no declara `get_current_user` ni `require_perm_modulo` directamente en su firma. No obstante, la aplicación registra un guard global en `backend/app/auth/route_guard.py` que protege las rutas `/api`:

- El prefijo `/api/utilidades` se asigna al módulo `utilidades`.
- El método POST de esta ruta se clasifica como edición porque contiene el segmento `/importador`.
- Por tanto, el guard añade autenticación JWT y exige el permiso `utilidades:editar`.

**Conclusión:** no se considera una ruta pública ni una brecha de autenticación confirmada mientras el guard global esté registrado y ejecutándose. Como defensa en profundidad, se recomienda declarar también `usuario=Depends(get_current_user)` y `require_perm_modulo(usuario, "utilidades", "editar")` dentro de la propia función, y mantener una prueba que verifique el mapeo global. Esta recomendación no sustituye ni elimina el guard global.

La ruta lee el Excel, ejecuta `importar_excel_expedientes(...)` y publica un evento realtime `expedientes/importacion_finalizada`. Este proceso es una importación local al ERP; no acredita por sí mismo una llamada externa a ABSIS.

Los endpoints Post Firma sí declaran autenticación y permiso explícito `utilidades:editar` en sus funciones de importación y validación, y `utilidades:ver` en las consultas.

## 3. Estado de los envíos ABSIS

Archivo:

`backend/app/proceso_absis.py`

La tabla `envios_absis` almacena un registro local con expediente, fecha, identificador ABSIS, tipo, estado e incidencia.

Comportamiento observado:

- `GET /proceso-absis/actividades` y `GET /proceso-absis/envios`: consultan el registro local.
- `POST /proceso-absis/envios`: crea un registro local.
- `POST /proceso-absis/envios/{id}/reintentar`: cambia el estado a `Pendiente de reintento`; el propio código indica que no retransmite.
- `POST /proceso-absis/envios/{id}/pasado`: marca manualmente el registro como `Pasado`; no es una confirmación automática de ABSIS.

En Gestión económica, `POST /api/expedientes/{expediente_id}/gastos/{gasto_id}/integracion-absis` construye una solicitud local en `expediente_absis_solicitudes`, con estado `PENDIENTE_CONFIGURACION`, y devuelve explícitamente `transmitido_a_absis: false`. El mensaje de respuesta deja constancia de que falta validar endpoint, autenticación y contrato de datos.

La búsqueda de código no ha encontrado referencias operativas a `ABSIS_URL`, `httpx.post`, `requests.post`, `aiohttp.ClientSession`, `transmitir_absis` o `cliente_absis`.

## 4. Trabajo requerido a Informática para la integración externa

Antes de programar la conexión, Informática debe obtener y documentar:

1. **Contrato oficial:** URL base, endpoints, versión de API, operaciones disponibles, esquema de petición/respuesta y límites.
2. **Autenticación:** mecanismo exigido por ABSIS (OAuth2, certificado, API key u otro), rotación de credenciales y certificados. Los secretos deben residir en variables/secretos de Render, nunca en el repositorio.
3. **Entornos:** sandbox de ABSIS, credenciales de pruebas, datos de prueba y criterios de aceptación.
4. **Mapeo de datos:** identificadores ERP/ABSIS, expediente, actividad, gastos, facturas, estados, fechas, importes, documentos y catálogos.
5. **Confirmación:** definir qué respuesta constituye aceptación real, identificador de operación externa, rechazo funcional, error técnico y estado pendiente.
6. **Documentos:** mecanismo de transferencia, formatos, tamaños, checksum, antivirus y confirmación de recepción.
7. **Trazabilidad:** correlación entre solicitud ERP y operación ABSIS, actor, marcas temporales, payload saneado, respuesta y auditoría.

## 5. Arquitectura recomendada

No realizar la transmisión dentro de la petición HTTP del usuario. Se recomienda una arquitectura de *outbox*:

1. El ERP valida la operación y guarda, en una única transacción, la solicitud y un identificador de idempotencia.
2. Un worker independiente recoge solicitudes pendientes y las transmite con timeout y reintentos controlados.
3. El worker registra cada intento y la respuesta técnica, sin duplicar operaciones.
4. Una respuesta de aceptación verificable mueve la solicitud a `CONFIRMADA`; un rechazo de negocio a `RECHAZADA`; los errores recuperables a `REINTENTO_PENDIENTE`; los errores agotados a una cola de incidencias.
5. Si ABSIS ofrece callback/webhook, validar firma/autenticidad y correlacionar la respuesta. Si no, definir consulta/polling con límites.
6. Solo tras la confirmación externa se actualizará el estado de negocio correspondiente. Nunca marcar como enviado/pasado por haber creado la solicitud local o por un clic manual.
7. Mantener una pantalla de seguimiento con solicitud, estado, fecha, identificador externo, número de intentos, última incidencia y acción de reintento autorizada.

Estados mínimos propuestos:

- `PENDIENTE_CONFIGURACION`
- `PENDIENTE_ENVIO`
- `ENVIANDO`
- `CONFIRMADA`
- `RECHAZADA`
- `REINTENTO_PENDIENTE`
- `ERROR_DEFINITIVO`

## 6. Pruebas de aceptación obligatorias

- Token ausente, caducado y usuario sin `utilidades:editar`: acceso denegado.
- Usuario autorizado: importación local validada sin alterar campos no incluidos en el fichero.
- Timeout externo: la solicitud queda trazada y puede reintentarse sin duplicar.
- Repetición de la misma idempotency key: no duplica la operación externa.
- Rechazo de ABSIS: se registra el código y detalle, sin marcar como confirmado.
- Confirmación válida: se guarda el identificador externo y se actualiza el estado.
- Callback duplicado o fuera de orden: procesamiento idempotente.
- Caída del worker y recuperación: las solicitudes pendientes se retoman.
- Secretos y datos personales: no aparecen en logs.
- Reconciliación diaria entre solicitudes ERP y operaciones confirmadas en ABSIS.

## 7. Límites de esta revisión

No se han enviado ficheros, no se han ejecutado importaciones y no se ha transmitido información a ABSIS. Tampoco se han modificado expedientes ni datos históricos. Este documento es una especificación de trabajo para Informática, no una certificación de integración operativa.
