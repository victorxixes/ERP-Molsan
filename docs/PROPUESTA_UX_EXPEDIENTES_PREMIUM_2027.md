# Propuesta UX — Expedientes · MOLSAN Premium 2027

## Objetivo

Hacer que el listado de Expedientes sea más fácil de entender y utilizar para el equipo, sin perder funciones existentes ni cambiar las reglas de negocio. Esta propuesta documenta el diseño objetivo para revisión antes de modificar la interfaz productiva.

## Principios de diseño

- **Primero encontrar, después actuar:** búsqueda rápida visible desde el inicio; filtros avanzados agrupados y plegables.
- **Prioridad por urgencia:** los plazos y bloqueos relevantes deben destacar por encima de métricas secundarias.
- **Lenguaje operativo:** etiquetas que indiquen qué ocurre y qué necesita atención.
- **Consistencia:** mantener la identidad visual MOLSAN Premium 2027 y sus tokens compartidos.
- **Sin regresiones:** conservar permisos, filtros, exportación, selección de columnas, paginación, navegación a ficha y acciones actuales.
- **Accesibilidad:** foco visible, contraste suficiente, adaptación a móvil y respeto a `prefers-reduced-motion`.

## Propuesta de composición del listado

### 1. Cabecera compacta

- Título **Expedientes** y una frase breve de contexto.
- Mantener el estilo de cabecera MOLSAN ya existente.
- Colocar las acciones globales (por ejemplo, exportar Excel) alineadas y sin competir visualmente con la búsqueda.

### 2. Búsqueda rápida

Un campo principal y visible para localizar expedientes por identificador o texto disponible en la búsqueda actual. Mantener los botones **Buscar** y **Limpiar búsqueda** con estados de carga/deshabilitado cuando corresponda. No se añadirá una nueva semántica de búsqueda sin verificar primero qué soporta la API.

### 3. Filtros avanzados por grupos

Mantener el panel plegable actual y ordenar sus campos por tarea:

- **Identificación y fechas:** número de expediente, oficina y fechas de alta/firma/vencimiento.
- **Personas y notaría:** titular, solicitante, NIF, notario y apoderado.
- **Registro y economía:** finca, registro, importes y saldos disponibles en el listado.
- **Actividad y estado:** actividad actual, estado de actividad y estado del expediente.
- **Clasificación ABSIS y observaciones:** conservar los campos que ya existan.

Los filtros deben mostrar claramente cuándo están aplicados y permitir limpiarlos sin borrar accidentalmente otros criterios no relacionados.

### 4. Panel de alertas de plazos

Presentar las alertas como tarjetas compactas con título, cantidad calculada por los datos reales y acceso a la vista correspondiente. No mostrar cifras ficticias ni inventar criterios en frontend.

1. **Defectos registrales vencidos:** usar la fecha de vencimiento de presentación registral definida en el flujo de alta del defecto.
2. **Sede notarial pendiente:** expedientes que superen el umbral operativo de 10 días desde el envío.
3. **Liquidación de impuestos:** expedientes que requieran revisión por falta de fecha de presentación tributaria.
4. **Listos para facturación y cierre:** expedientes con fecha de inscripción informada que cumplan el criterio funcional de cierre.
5. **Inscripción demorada:** expedientes que superen 30 días desde la fecha de presentación.

**Condición previa a implementación:** verificar los campos y los métodos de cálculo disponibles en backend/API. Si una alerta no puede calcularse de forma fiable con los datos actuales, no debe inventarse ni presentar un cero engañoso; debe indicarse como pendiente de conexión.

### 5. Tabla de resultados

- Priorizar en la vista inicial las columnas necesarias para identificar el expediente, titular/solicitante, actividad actual, estado y fechas relevantes.
- Mantener selección de columnas para quienes necesiten más detalle.
- Usar etiquetas de estado coherentes, fechas legibles y alineación de cifras.
- Conservar acceso a la ficha y acciones disponibles, exportación Excel y paginación.
- Evitar duplicar en la tabla información que ya se muestre de forma clara en otra columna; confirmar antes de retirar cualquier columna funcional.

### 6. Ficha y modal de actividades

La propuesta visual se extenderá en una fase separada al modal de actividades, manteniendo la ficha como fuente de referencia de los datos del expediente.

- Agrupar requisitos por actividad y mostrar cada requisito como **Correcto**, **Pendiente** o **No aplicable**, solo cuando el sistema pueda determinarlo.
- Para documentación previa, comprobar los documentos exigidos en la carpeta digital y los datos de envío a notario existentes en la ficha.
- En sede notarial, comprobar fecha de envío y, cuando exista protocolo, los datos requeridos de apoderado/firma.
- En defectos registrales, aplicar la checklist específica únicamente si existe un defecto abierto; si no existe ninguno abierto, no bloquear el expediente por esa checklist.
- Cada requisito pendiente debe indicar qué falta y dónde se puede completar.
- No permitir que el nuevo diseño cambie por sí solo las reglas de avance de actividad.

### 7. Acciones operativas

Mantener las acciones actuales y ordenarlas por frecuencia de uso. Las acciones de expediente (por ejemplo, ver actividades, carpeta digital, control/bloqueo y alta de defecto) deben quedar agrupadas cerca de la información de identificación, con etiquetas consistentes y sin eliminar permisos ni flujos.

## Criterios de aceptación

- [ ] La búsqueda y los filtros actuales siguen funcionando.
- [ ] Los campos existentes siguen disponibles y la selección de columnas continúa operativa.
- [ ] Exportación Excel, paginación, navegación a ficha y acciones conservan su comportamiento.
- [ ] Las alertas utilizan datos reales y criterios de negocio confirmados.
- [ ] La checklist no bloquea indebidamente expedientes sin defecto registral abierto.
- [ ] No se muestran métricas, expedientes o cantidades ficticias.
- [ ] Se conserva el estilo MOLSAN Premium 2027 y se adapta a móvil.
- [ ] Se ejecuta la compilación de frontend y se revisan los resultados antes de integrar.

## Alcance de esta entrega

Este documento es la **propuesta para revisión**. No cambia todavía los componentes de Expedientes ni las reglas de negocio. Tras validar el enfoque, los cambios de interfaz se implementarán en una rama aparte, se compilarán y se presentarán en un pull request para revisión antes de integrarlos en `main` y desplegarlos en Render.
