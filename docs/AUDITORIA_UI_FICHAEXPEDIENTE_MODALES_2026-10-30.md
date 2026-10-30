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
