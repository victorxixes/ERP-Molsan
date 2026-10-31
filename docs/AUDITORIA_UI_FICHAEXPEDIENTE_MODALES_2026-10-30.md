# Auditoría UI — bloque FichaExpediente y modales operativos
Fecha: 30/10/2026  
Rama: `molsan-premium-2027-glass-luxe`  
PR: #374 (borrador; no integrada)

## Alcance de esta pasada
Inspección estática de `FichaExpediente.jsx`, `FichaExpedientePremium.css`, `ModalesOperativosPremium.css`, `EnviarANotarioModal.jsx`, `LiquidarExpedienteModal.jsx`, `TraspasoSaldoPanel.jsx`, `CarpetaDigitalModal.jsx`, `ProvisionesFondosPage.jsx` y `ModelosDocumentos.jsx`. No se abrieron expedientes ni se ejecutaron acciones transaccionales.

## Corrección aplicada
- En `LiquidarExpedienteModal.jsx`, el botón antes llamado «Guardar liquidación» se ha renombrado a «Validar datos» (estado: «Validando datos…»). El manejador solo comprueba que existe un identificador y muestra un mensaje; no persiste datos de liquidación. El texto anterior prometía un guardado que no se realizaba. El cierre documental sigue teniendo su flujo explícito de previsualización y aceptación.

Commit: `9962c63221227bdbc8a4ad41267f33705848156b`.

## Comprobaciones estáticas favorables
- La ficha importa explícitamente los cuatro modales operativos principales y les pasa el expediente / estado correspondiente.
- `FichaExpedientePremium.css` limita anchuras, habilita desplazamiento horizontal contenido en tablas y reduce las rejillas a dos columnas y después una columna en pantallas estrechas.
- `ModalesOperativosPremium.css` contempla altura de viewport dinámica, áreas seguras, scroll de diálogo y tamaño de fuente de 16 px en formularios móviles.
- `LiquidarExpedienteModal` tiene nombres accesibles para el diálogo y la vista previa PDF, estados de error y estado, tabla desplazable y bloquea el cierre final hasta aceptar el PDF documental.
- `EnviarANotarioModal` incorpora cierre con Escape cuando no está cargando y valida selección del notario y datos requeridos antes de enviar.
- `TraspasoSaldoPanel` distingue operaciones de crear, verificar, actualizar email, enviar y cancelar, con estados de carga/error.
- `CarpetaDigitalModal` conserva categorías documentales, incluye búsqueda, y da nombres accesibles a los diálogos principales y al visor.
- `ModelosDocumentos.jsx` importa `DocumentoLayoutDesigner` como exportación nombrada; se ha comprobado que la función se exporta en `ProvisionesFondosPage.jsx`. La importación no presenta el defecto de símbolo ausente observado anteriormente.

## Riesgos / validaciones pendientes
1. **Accesibilidad de modales:** no se encontró gestión explícita de Escape ni de foco inicial/retorno/trampa de foco en `LiquidarExpedienteModal`, `TraspasoSaldoPanel` y `CarpetaDigitalModal`. Debe probarse con teclado y lector de pantalla; no añadir trampas de foco sin verificar primero la composición de modales anidados.
2. **Carpeta digital:** la distribución de escritorio usa una zona de trabajo de `800px` de alto. Las reglas responsivas existen, pero se debe comprobar en portátil de poca altura y en móvil que los botones finales sigan accesibles y que el visor no tape la navegación.
3. **Liquidación y saldos:** la tabla se construye desde `gastosExpediente` y el saldo mostrado resta del importe inicial los importes brutos de filas cuyo `estado_pago` indica pagado. Es necesario contrastar con expedientes de prueba que el endpoint entregue exactamente los conceptos esperados, que no duplique movimientos y cómo se representan pagos parciales/anulados. No validar el saldo financiero por inspección estática únicamente.
4. **Envío a notario:** el modal tiene un ancho máximo de 1750 px y altura cercana al viewport. Revisar visualmente el formulario largo, especialmente su pie de acciones, a 1366 px, tablet y móvil.
5. **Provisiones:** las tablas extensas usan scroll horizontal encapsulado (anchos mínimos 1000/760 px); validar navegación con teclado, edición de tramos y formulario largo en tablet/móvil.
6. **Modelos de documentos:** el editor y la vista previa de Word tienen un área de previsualización con mínimo de 700 px. Comprobar zoom 100/125 %, carga de un DOCX real de prueba y adaptación móvil. El formulario puede consultar un expediente mediante API; no se hizo ninguna consulta durante esta auditoría.
7. **Foco y Escape:** la ausencia estática de estos patrones no prueba por sí sola que el usuario quede bloqueado, pero sí impide dar accesibilidad modal por verificada sin QA interactiva.

## Estado de verificación
- Inspección de código: realizada para los archivos enumerados.
- Build/CI del commit de corrección: pendiente al redactar esta nota; ejecutar/verificar los workflows asociados al commit `9962c63221227bdbc8a4ad41267f33705848156b`.
- Pruebas visuales reales en navegador, tamaños de pantalla y teclado: pendientes.
- Pruebas de negocio con expedientes, documentos, pagos y cierre: pendientes y deben hacerse solo con datos de prueba autorizados.
- Producción / Render LIVE / base de datos: no tocados.


## Segunda pasada — portales profesionales (inspección estática)
Archivos revisados: `ApoderaGest.jsx`, `NotarGest.jsx`, `EncargaGest.jsx` y sus CSS compartidos/específicos.

- Los diálogos principales identificados tienen `role="dialog"` y `aria-modal="true"`; se detectaron dos diálogos en ApoderaGest, cuatro en NotarGest y cinco en EncargaGest.
- ApoderaGest y los dos portales de NotarGest/EncargaGest no muestran, en los archivos inspeccionados, un manejador explícito de Escape ni gestión explícita del foco para sus diálogos. Requiere prueba de teclado y lector de pantalla; no significa por sí solo que toda apertura/cierre falle.
- NotarGest tiene breakpoints específicos para bandejas y tarjetas de módulo hasta 390 px, tablas con contenedor desplazable y paneles que se reorganizan en móvil.
- EncargaGest adapta formularios de dos columnas y paneles de carpeta a una columna en anchos estrechos; permanecen algunas reglas `!important` puntuales para sobreescribir rejillas heredadas.
- PortalProfesionalShared.css mantiene una deuda de cascada considerable (56 `!important`, 55 media queries y selectores repetidos ya anotados en la auditoría general). No se eliminaron reglas en bloque porque falta comparar cada selector contra su componente real.
- QA visual real de las bandejas, formularios, gráficos, visor, foco y retorno de foco sigue pendiente en escritorio/tablet/móvil.

Esta pasada no modifica la lógica de negocio ni abre datos reales.


## Tercera pasada — detalles de accesibilidad y diálogos anidados
Revisión de código actual de `LiquidarExpedienteModal.jsx`, `EnviarANotarioModal.jsx` y `CarpetaDigitalModal.jsx`.

- `LiquidarExpedienteModal.jsx`: el diálogo principal y la vista previa de cierre tienen semántica de diálogo y nombre accesible. No se observó manejador de Escape ni control de foco explícito. El flujo de cierre documental requiere prueba interactiva para confirmar el orden de apertura, aceptación y cierre de la vista previa.
- `EnviarANotarioModal.jsx`: el diálogo tiene nombre accesible y manejador de Escape condicionado a que no esté cargando. El componente admite modo integrado y modo modal; debe comprobarse que al integrarlo dentro de Carpeta Digital no se anuncie dos veces como modal ni se bloquee el fondo de forma incorrecta.
- `CarpetaDigitalModal.jsx`: tiene diálogo principal, diálogo/estado de actividad y visor de documento. Hay más de un uso de `aria-modal` según el modo de actividad; probar combinaciones de carpeta → envío a notario → visor para detectar modales anidados, cierre inesperado o foco perdido.
- Los tres componentes tienen tratamiento de errores/carga en las operaciones examinadas. Esto no verifica la respuesta del servidor ni garantiza que todos los errores se comuniquen con lector de pantalla.
- No se han añadido listeners de teclado ni cambios de foco en esta pasada: la solución correcta depende de cómo se componen los overlays y podría empeorar los diálogos anidados si se parchea aisladamente.

### Criterios de aceptación interactiva pendientes
1. Abrir y cerrar cada modal con teclado; comprobar foco inicial, tabulación cíclica cuando corresponda y retorno al botón invocador.
2. Abrir/cerrar el visor y la vista previa de cierre sin perder el estado del modal padre.
3. Durante cargas, Escape no debe descartar una operación activa ni dejar el overlay huérfano.
4. Con zoom de navegador al 125 % y viewport estrecho, las acciones principales deben seguir visibles o alcanzables por scroll.


## Cuarta pasada — integración de foco y teclado en Expedientes

- El componente `Modal` base de FichaExpediente integra el gestor compartido `useAccessibleDialog`, cubriendo los diálogos que se renderizan mediante este componente.
- Se integra también en los diálogos explícitos de orden de pago, registro de gasto y PPAD, con sus refs dedicadas.
- Las acciones de cierre durante operaciones de guardado conservan sus bloqueos existentes; Escape sigue la misma condición para evitar descartar formularios en curso.
- No se han cambiado cálculos, estados de pago, saldos, endpoints, operaciones económicas ni persistencia.
- Commit: `83227646`.
- Pendiente: comprobar modales anidados, apertura/cierre con teclado, retorno de foco, scroll interno, zoom 125 % y responsive en navegador. No se han abierto expedientes ni ejecutado pagos o escrituras.


## Quinta pasada — listado de Expedientes

- `ExpedientesListado.jsx`: se integra `useAccessibleDialog` en «Filtros avanzados» y «Control de plazos».
- El panel de filtros avanzados es ahora la región semántica del diálogo; el overlay exterior se declara como presentación. Se evita que el botón de cierre por fondo quede incluido dentro de la lista de elementos enfocables del diálogo.
- Ambos diálogos reciben foco inicial, contención Tab/Mayús+Tab, cierre con Escape y restauración del foco.
- Commits: `48258919`.
- No se han cambiado filtros, consultas, exportaciones, alertas ni datos. QA navegador pendiente.

## Continuación — armonización de acciones
- El botón genérico `Boton` en variante primary y las acciones principales «Expedientes» y «Registrar gasto» usan los tokens de marca Molsan en vez de clases fijas azul/índigo.
- No se han reemplazado globalmente los colores de actividades, alertas, documentos o estados económicos para preservar su significado.
- CI del commit `b28eb331` completado con éxito en los cinco workflows asociados.