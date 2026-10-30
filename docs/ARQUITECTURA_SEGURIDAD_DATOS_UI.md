# MOLSAN ERP — Regla de seguridad de datos en interfaz

Estado: criterio funcional obligatorio para nuevas implementaciones y auditorías.

## Principio

Cada dato tiene un único módulo o registro de origen. Las ventanas de consulta, revisión, consolidación y previsualización consumen esos datos y no deben convertirse en vías alternativas para modificarlos.

## Clasificación obligatoria de pantallas

1. **Consulta / revisión / previsualización**: solo lectura. No deben incluir controles editables ni enviar cambios de datos maestros o movimientos.
2. **Edición del dato de origen**: permite modificar únicamente los campos cuya responsabilidad pertenece a ese módulo, respetando permisos, validaciones y trazabilidad.
3. **Acción transaccional**: ejecuta una operación explícita (por ejemplo, registrar un pago, emitir una factura o cerrar un expediente). Debe usar su flujo/endpoint específico, validar precondiciones y evitar duplicidades.

## Fuentes de verdad del ERP

- Datos personales y fiscales: ficha/registro maestro del cliente o titular correspondiente.
- Datos notariales y tipo de documento: Envío a notario y sus registros vinculados.
- Gastos, facturas, pagos, estados de pago y saldos: Gestión económica y sus movimientos registrados.
- Documentos: Carpeta digital y repositorio documental correspondiente.
- Fechas y datos de actividad: registro de actividad o SLA que sea propietario de esos campos.

## Requisitos técnicos

- En pantallas de consulta, preferir texto/valores presentacionales o controles `readOnly`; no usar `onChange` para datos de origen.
- No incluir esos campos en payloads PUT/PATCH/POST de guardado de la pantalla de consulta.
- No inferir ni inventar valores por defecto para datos históricos o fechas; mostrar vacío/no disponible y señalar la incidencia.
- Los importes y estados económicos deben derivarse de movimientos reales. Adjuntar una factura no equivale a pagarla.
- No permitir que una vista previa altere los datos que representa.
- Los controles de edición deben permanecer disponibles en el módulo propietario del dato, con autorización y validación.
- Las acciones transaccionales deben ser explícitas, trazables e idempotentes cuando proceda.

## Aplicación al modal «Liquidar expediente»

El modal es una vista de revisión y consolidación. Tipo de documento, ID documental, conceptos de movimientos, datos fiscales, fecha, importes, pagos y saldo se muestran en solo lectura. «Validar datos» no modifica el expediente ni movimientos. Los pagos se registran desde Gestión económica; los datos notariales desde Envío a notario; los datos fiscales desde su ficha de origen.

## Excepciones legítimas

No se debe aplicar un bloqueo indiscriminado a todos los formularios. Por ejemplo, Envío a notario es el formulario propietario de los datos de envío y puede editar esos campos dentro de su flujo. La edición de fechas SLA en su panel propietario y la carga/gestión de documentos en Carpeta digital también son operaciones legítimas. Cada campo debe clasificarse por su origen y finalidad antes de cambiar su comportamiento.

## Checklist de auditoría para cada modal

- ¿Qué datos muestra y cuál es su fuente de verdad?
- ¿Es consulta, edición del origen o acción transaccional?
- ¿Hay inputs/selects/date pickers editables que no corresponden a su finalidad?
- ¿El guardado envía campos ajenos a la responsabilidad del módulo?
- ¿Puede crear, alterar o simular pagos, estados, saldos o identificadores?
- ¿La vista previa es estrictamente no destructiva?
- ¿Los permisos y la trazabilidad se validan en backend, no solo en frontend?
- ¿Qué pruebas de regresión verifican que el dato solo cambia desde su módulo propietario?

Esta regla debe aplicarse durante auditorías y nuevas modificaciones, sin alterar datos históricos ni producción como parte de una revisión de interfaz.
