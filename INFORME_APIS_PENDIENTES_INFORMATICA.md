# Informe técnico: APIs pendientes para Informática
## ERP-Molsan · Mensajería y Mensajería Gestión
**Fecha:** 27 de octubre de 2026

## 1. Objetivo y conclusión

Los módulos internos **Mensajería** y **Mensajería Gestión** ya tienen una API REST propia en el backend para solicitudes, servicios/tarifas, proveedores, comunicaciones, albaranes y facturas. La integración principal pendiente es conectar el ERP con la API externa de una o dos empresas transportistas.

No se debe programar contra un transportista concreto hasta recibir su documentación oficial, credenciales de pruebas y especificación de sus servicios. Las funciones concretas dependerán de lo que ofrezca cada proveedor.

## 2. Estado actual

| Área | Estado observado en el código | Pendiente |
|---|---|---|
| Solicitudes y comunicaciones internas | Endpoints implementados | Pruebas funcionales y de permisos |
| Catálogo de servicios/tarifas | Implementado | Relacionar cada servicio con el código externo del transportista |
| Ficha de proveedores (máximo dos) | Implementada | Configurar conexión API de forma segura |
| Envío automático de una solicitud al transportista | Pendiente | Integrar operación externa de creación de envío |
| Número de expedición y seguimiento | Sin integración externa completa confirmada | Guardar identificadores y sincronizar estados |
| Etiquetas y comprobantes | Depende del proveedor | Integrar descarga si la API lo permite |
| Incidencias del transportista | Flujo interno disponible; sincronización externa pendiente | Webhook o consulta de estado |
| Albaranes y facturas | Registro interno implementado | Automatización adicional solo si el proveedor la soporta |
| Despliegue y pruebas en Render | Pendiente de confirmación final | Pruebas completas en entorno desplegado |

## 3. APIs externas que debe integrar Informática

### 3.1 Autenticación y configuración por proveedor
- Crear un adaptador independiente por transportista para no acoplar el ERP a una sola API.
- Usar el método oficial de autenticación que indique cada proveedor.
- Separar entorno de pruebas (sandbox) y producción.
- Guardar claves, tokens y secretos en variables de entorno o almacén de secretos de Render. Nunca incluirlos en GitHub ni en campos de notas del proveedor.
- Configurar tiempos de espera, límites de peticiones y registro seguro de errores. Nunca escribir credenciales en logs.

### 3.2 Crear un envío
Cuando un gestor autorizado confirme el envío desde Mensajería Gestión, el backend debe enviar al proveedor los datos requeridos por su API, según sus especificaciones:
- Referencia interna de la solicitud, por ejemplo MSG-AAAAmm-00001.
- Servicio contratado y código de servicio del transportista.
- Dirección de origen y destino.
- Contactos y teléfonos de recogida y entrega.
- Fecha solicitada e instrucciones disponibles.
- Peso, medidas, bultos u otros datos únicamente si el proveedor los exige y el ERP dispone de ellos.

Antes de enviar, validar los campos obligatorios y comprobar que la solicitud no tenga ya un envío activo. Mostrar al gestor el resultado o el motivo de rechazo.

### 3.3 Guardar respuesta e identificadores
Vincular la respuesta del transportista a la solicitud interna y guardar:
- Proveedor seleccionado.
- Identificador externo del envío.
- Número de seguimiento o tracking.
- Fecha/hora de envío de la petición.
- Resultado: pendiente, aceptado, rechazado o error técnico.
- Último estado externo y fecha de actualización.
- Mensaje de error depurado, si procede.

La referencia interna de ERP-Molsan seguirá siendo la referencia principal; el identificador externo se guardará además, no en sustitución de ella.

### 3.4 Seguimiento y sincronización de estados
Usar el mecanismo que admita cada proveedor:
1. **Webhook/callback**, si ofrece eventos entrantes: endpoint HTTPS autenticado para recibir cambios de estado.
2. **Consulta periódica (polling)**, si no ofrece webhook: tarea programada para consultar envíos todavía abiertos respetando los límites de la API.

Mapear los estados externos a estados internos controlados —por ejemplo, aceptado, en tránsito, entregado, incidencia o cancelado— solo cuando haya equivalencias reales. Conservar también el estado original del transportista.

Los webhooks deben autenticar al emisor, tolerar eventos repetidos y evitar que un evento antiguo sobrescriba un estado más reciente.

### 3.5 Etiquetas, justificantes y cancelaciones
Si el proveedor lo permite:
- Descargar y asociar la etiqueta de envío o justificante a la solicitud.
- Permitir consultar e imprimir el documento desde Mensajería Gestión.
- Implementar cancelación externa solo cuando la API y el estado del envío lo permitan.
- No guardar URLs temporales como si fueran documentos permanentes sin controlar su caducidad.

Estas funciones dependen de la documentación real de cada transportista.

### 3.6 Errores, reintentos y duplicados
- Diferenciar fallos temporales (red, límite de peticiones o error de servidor) de rechazos funcionales (dirección incompleta, servicio no válido o credenciales incorrectas).
- Reintentar errores temporales de forma limitada y controlada.
- No repetir a ciegas una creación de envío: podría generar dos recogidas. Usar idempotencia si la API la admite; en caso contrario, consultar por referencia antes de repetir.
- Mostrar al gestor el error y ofrecer una acción de reintento cuando sea seguro.
- Registrar las operaciones realizadas y su resultado, sin secretos.

## 4. API interna existente

En el router backend/app/mensajeria_molsan/router.py aparecen estas rutas internas:

- GET /mensajeria/resumen
- GET, POST y PATCH /mensajeria/servicios
- GET, POST y PATCH /mensajeria/solicitudes
- GET y POST /mensajeria/mis-solicitudes
- GET, POST y PATCH /mensajeria/proveedores
- GET y POST /mensajeria/solicitudes/{solicitud_id}/comunicaciones
- Endpoints GET, POST y PATCH para albaranes y facturas.

Esta lista confirma que existen rutas en el código; no certifica que estén todas validadas en producción. Deben contrastarse con OpenAPI/Swagger del backend desplegado.

No hace falta crear una segunda API interna paralela si las rutas existentes cubren el circuito. La integración del transportista debe implementarse en servicios/adaptadores de backend, no directamente desde React en el navegador.

## 5. Seguridad y validaciones previas a producción

Antes de activar el envío automático, Informática debe comprobar y probar:

- El empleado solo puede consultar y comunicar sobre sus propias solicitudes.
- La identidad del solicitante se obtiene de la sesión autenticada; no se confía en el identificador o nombre enviados por el navegador.
- Los empleados no pueden modificar directamente campos administrativos como estado, responsable, coste previsto ni datos devueltos por el transportista.
- Las operaciones de gestión requieren permisos explícitos en el backend; ocultar botones en la interfaz no es suficiente.
- Validación de IDs, fechas, teléfonos, importes, servicios y estados permitidos.
- Trazabilidad de quién envía, reintenta, cancela o modifica un envío.
- Protección frente a envíos duplicados y conservación de la relación solicitud → envío externo → seguimiento → albarán/factura.
- Pruebas negativas: un usuario sin permiso debe recibir una denegación incluso si llama directamente al endpoint.
- Los cambios de esquema deben conservar las solicitudes existentes.

Estas comprobaciones son criterios de aceptación; no se consideran terminadas solo porque existan rutas o controles visuales.

## 6. Albaranes y facturas

El ERP ya permite registrar albaranes y facturas en Mensajería Gestión. La API de transporte no debe sustituir ese circuito.

Primera fase recomendada:
- Automatizar creación de envío y seguimiento.
- Mantener el registro interno de albaranes y facturas.
- Evaluar la descarga o conciliación automática de albaranes/facturas solo si el proveedor ofrece endpoints adecuados y después de definir reglas de revisión.

Las facturas de mensajería deben permanecer en Mensajería Molsan; no se deben mezclar automáticamente con la facturación general sin una decisión explícita.

## 7. Información que debe facilitar Molsan

Por cada transportista:
1. Nombre del proveedor y contacto técnico.
2. Documentación oficial de la API y versión.
3. Credenciales de sandbox y proceso de acceso.
4. URLs base de pruebas y producción.
5. Servicios contratados y códigos válidos para la cuenta de Molsan.
6. Campos obligatorios para crear envíos: direcciones, bultos, peso, medidas, referencias y horarios, según corresponda.
7. Especificación de seguimiento, webhooks, autenticación de eventos y límites de peticiones.
8. Especificación de etiquetas, cancelaciones, incidencias y códigos de error.
9. Contacto de soporte técnico del proveedor.

**No incluir credenciales reales en este documento ni en GitHub.** Deben entregarse por un canal seguro y configurarse como secretos en Render.

## 8. Plan de trabajo

1. **Cierre de seguridad:** revisar autorización, propiedad de solicitudes, campos editables y pruebas de permisos.
2. **Preparación:** recibir documentación y credenciales de pruebas; confirmar los campos y códigos de servicio.
3. **Primer transportista:** autenticación, creación de envío, persistencia del tracking y tratamiento de errores.
4. **Seguimiento:** webhook o consulta periódica, equivalencias de estados e incidencias.
5. **Documentos y acciones extra:** etiquetas y cancelación, solo si la API lo soporta.
6. **Segundo transportista:** desarrollar un adaptador independiente reutilizando el contrato común.
7. **Aceptación:** pruebas de sandbox, permisos, duplicados, fallos y luego prueba controlada de producción.
8. **Despliegue:** configurar secretos en Render, verificar logs y documentar el procedimiento operativo.

## 9. Criterios de aceptación

La integración se considerará terminada cuando:
- Un gestor autorizado pueda enviar una solicitud válida al transportista seleccionado.
- El sistema guarde el identificador externo y tracking sin duplicar envíos.
- Los estados e incidencias se reflejen en el ERP cuando el proveedor los publique o permita consultarlos.
- Los fallos y rechazos se muestren claramente y se puedan gestionar.
- No existan secretos en el repositorio ni en los logs.
- Las pruebas confirmen que un empleado no puede acceder a solicitudes ajenas ni ejecutar operaciones administrativas.
- El circuito solicitud → envío → seguimiento → albarán/factura sea trazable.
- El flujo esté probado en Render y se confirme qué versión está desplegada.

## 10. Fuera de alcance hasta nueva definición

- No se presupone un transportista ni una API concreta.
- No se da por hecho que ABSIS intervenga en este circuito de mensajería.
- No se automatiza el pago de facturas.
- No se sincronizan albaranes o facturas automáticamente salvo acuerdo expreso y soporte real de la API del proveedor.
