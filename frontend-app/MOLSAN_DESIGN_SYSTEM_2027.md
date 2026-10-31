# MOLSAN ERP PREMIUM 2027 — Sistema de diseño

## Propósito
Construir una experiencia empresarial coherente, sobria y de alta calidad. La interfaz debe priorizar claridad, ritmo visual, lectura rápida y consistencia entre módulos. La identidad corporativa se mantiene fija: no se introducen paletas alternativas ni tipografías decorativas.

## Fuente de verdad
- Tokens y base visual: `src/css/NeutralizarPresentacion.css`.
- Utilidades Tailwind 4: `src/css/index.css`, conectadas a los tokens mediante `@theme inline`.
- Orden de carga: la neutralización visual se importa después de los estilos de módulos.
- Sidebar: expresamente excluido; conservar estructura, estilos, iconos, hover y comportamiento.
- El Layout es el único propietario del margen exterior del área de trabajo. Las páginas no duplican gutter, centrado ni ancho máximo.

## Identidad corporativa invariable

| Token | Valor | Uso |
|---|---|---|
| `--molsan-white` | `#FFFFFF` | Fondo principal y superficies |
| `--molsan-panel` | `#F2F7FB` | Paneles y superficies secundarias |
| `--molsan-table-head` | `#EAF2F8` | Cabeceras de tablas |
| `--molsan-border` | `#D8E4EC` | Bordes y separadores |
| `--molsan-blue` | `#064675` | Marca, títulos, iconos y acción primaria |
| `--molsan-muted` | `#617789` | Texto secundario |
| `--molsan-text` | `#18364B` | Texto principal |

Tipografía única: Inter, con alternativas de sistema. No cargar fuentes remotas ni cambiar la familia como parte de esta fase.

Los colores de éxito, advertencia, error e información son semánticos y solo se usan para comunicar estados funcionales. Nunca asignan una identidad cromática a un módulo.

## Fase 1 — Fundamentos visuales ampliados

### 1. Superficies y equilibrio
- Blanco como superficie dominante.
- Azul hielo reservado a agrupaciones, paneles secundarios y cabeceras de tabla.
- No convertir cada bloque en una tarjeta: agrupar solo cuando exista relación funcional.
- Bordes finos y sombras discretas; evitar contornos dobles y elevaciones acumuladas.
- Las tarjetas son blancas y se distinguen por jerarquía, espaciado y borde, no por grandes bloques de color.

### 2. Jerarquía tipográfica
- Escala común de 12 a 24 px.
- Títulos de página en azul Molsan; títulos de sección claramente subordinados.
- Texto principal con contraste suficiente y texto auxiliar en gris azulado.
- Pesos tipográficos limitados a normal, medio, seminegrita y negrita.
- Evitar mayúsculas sostenidas, tamaños arbitrarios y exceso de negritas.

### 3. Ritmo y espaciado
- Escala base de 4 px.
- Separación entre secciones coherente y mayor que la separación entre elementos relacionados.
- Padding interior de tarjetas y formularios uniforme.
- El Layout define el gutter exterior; las páginas no añaden otro margen global.
- No reducir el espacio hasta dificultar la lectura ni ampliarlo hasta desperdiciar área útil.

### 4. Geometría y alineación
- Todas las páginas comienzan en la misma coordenada útil.
- Ancho disponible, alineación superior y márgenes laterales dependen del Layout compartido.
- Cabeceras, contenido, filtros y tablas comparten ejes de alineación.
- Los elementos de una misma familia mantienen alturas y proporciones equivalentes.
- En pantallas estrechas, las columnas se reorganizan sin crear scroll horizontal de página.

### 5. Densidad de trabajo
- Densidad predeterminada equilibrada.
- Filas de tabla base de 44 px; variantes compacta y cómoda solo cuando el contexto lo justifique.
- Controles de formulario con alturas normalizadas.
- Datos tabulares, importes y fechas alineados de forma consistente.
- No sacrificar legibilidad para introducir más información en pantalla.

### 6. Bordes, radios y elevación
- Radios compartidos y limitados a una escala pequeña.
- Sombras muy sutiles para tarjetas; elevación superior reservada a popovers y modales.
- No apilar sombras en contenedores anidados.
- Separadores en azul hielo corporativo, sin líneas oscuras innecesarias.

### 7. Estados e interacción
- Hover discreto, sin cambios bruscos de color ni desplazamientos de layout.
- Foco visible para navegación por teclado.
- Estados deshabilitados, carga, vacío, éxito y error con tratamiento uniforme.
- Transiciones breves; respetar `prefers-reduced-motion`.
- No usar colores semánticos como decoración.

### 8. Accesibilidad y legibilidad
- Mantener contraste suficiente en texto, iconos y controles.
- No comunicar estados únicamente mediante color.
- Respetar zoom del navegador y tamaños de texto.
- Mantener el orden de lectura y la navegación por teclado.
- Evitar animaciones no esenciales cuando el usuario solicita movimiento reducido.

## Reglas de arquitectura
1. No introducir nuevos colores de marca ni códigos hexadecimales aislados en componentes.
2. No crear CSS de presentación específico por módulo.
3. No duplicar padding exterior, gutter, centrado ni max-width en las páginas.
4. Los tokens son la fuente única de valores visuales compartidos.
5. Los componentes compartidos definirán estructura y variantes; las páginas compondrán contenido y comportamiento.
6. Mantener intactos datos, permisos, validaciones, API y flujos funcionales.
7. Mantener intacto el Sidebar.
8. No hacer sustituciones masivas de clases sin comprobar su función estructural y accesible.

## Orden de construcción posterior
1. Completar y validar estos fundamentos visuales.
2. Fase 2: lenguaje visual compartido (cabeceras, contenedores, superficies y patrones).
3. Fase 3: biblioteca Molsan UI (botones, tarjetas, campos, tablas, pestañas, alertas y modales).
4. Fase 4: Dashboard y una pantalla operativa como piloto.
5. Fase 5: migración progresiva módulo por módulo.
6. Fase 6: auditoría visual, accesibilidad, resoluciones e interacciones.

## Criterio de aceptación de la Fase 1
- Paleta y tipografía corporativas intactas.
- Tokens centrales completos y conectados a Tailwind.
- Fondo, superficies, jerarquía, espaciado y densidad definidos.
- Sidebar y comportamiento funcional sin cambios.
- Build de producción frontend correcto.
- La validación visual por pantallas se documenta por separado; un deploy correcto no equivale a una auditoría visual completa.

## Fase 2 — Lenguaje visual compartido (primera aplicación)

### Componentes de superficie ya normalizados
- `.erp-card`: tarjeta blanca con borde corporativo, radio común y elevación discreta.
- `.molsan-panel`: panel secundario azul hielo para agrupar filtros y controles relacionados.
- `.molsan-table-wrap`: contenedor de tabla blanco, con cabecera de sección y pie de paginación coherentes.
- `.molsan-table`: cabecera azul hielo, filas blancas, separadores suaves y hover neutro.
- `.molsan-btn`: botones primarios y secundarios con alturas, radios, foco y estados compartidos.
- Campos `.molsan-field__control`: controles blancos sobre paneles secundarios, con foco visible.

### Pilotos de aplicación
- Dashboard: tarjetas KPI, indicadores de actividad, paneles de resumen y firmas.
- CTN: filtros, resumen de resultados, tabla, acciones y paginación.
- Los pilotos solo reciben reglas de presentación; no se modifican consultas, datos, permisos, navegación ni comportamiento funcional.
- Los estilos se centralizan en `src/css/NeutralizarPresentacion.css`; no crear hojas visuales específicas por módulo.

### Criterios de revisión de la Fase 2
1. La tarjeta se distingue del fondo sin sombras fuertes ni grandes bloques de color.
2. Los paneles secundarios usan azul hielo y contienen controles blancos.
3. Los encabezados de sección mantienen una jerarquía tipográfica común.
4. Las tablas son legibles, con densidad equilibrada y cabeceras azul hielo.
5. Los botones mantienen una jerarquía clara entre acción primaria y secundaria.
6. La composición se adapta a tablet y móvil sin desbordamiento horizontal de página.
7. Sidebar, API, datos, permisos y lógica permanecen intactos.

### Fase 2 — Glass Luxe discreto (pilotos Dashboard y CTN)

- Se añade una capa de cristal mate muy sutil: degradado blanco/azul hielo translúcido, reflejo interior superior, borde corporativo y sombra difusa de baja intensidad.
- Dashboard: aplicación limitada a tarjetas KPI, actividad y bloques de firmas.
- CTN: aplicación limitada al panel de filtros, tarjetas de resumen y contenedor de tabla. Las celdas mantienen superficies prácticamente opacas para proteger la lectura.
- Hover: elevación máxima de 1 px y sombra ligeramente reforzada; sin animaciones estructurales.
- Desenfoque de fondo limitado a 8 px y acompañado de superficies opacas de respaldo.
- Se respeta `prefers-reduced-motion`.
- No se modifican lógica, datos, permisos, API, navegación ni Sidebar. No se extiende todavía a otros módulos.
- Validación pendiente: revisar visualmente Dashboard y CTN en Render Preview en escritorio y una anchura reducida antes de aprobar la extensión global.


### Extensión Glass Luxe discreta — piloto Expedientes

- Se incorpora el listado de Expedientes como tercer piloto visual.
- El cristal mate se limita a la tarjeta exterior que contiene la tabla y al contenedor de la tabla.
- Cabeceras y celdas conservan fondos prácticamente opacos; el hover usa azul hielo de baja intensidad.
- No se reorganizan tarjetas, filtros, bloques SLA ni actividades. No se modifican columnas, datos, permisos, API ni flujos funcionales.
- La extensión queda pendiente de revisión visual en Render Preview antes de aplicarla a otros módulos.


### Extensión Fase 1 + Fase 2 — piloto FichaExpediente

- FichaExpediente adopta la tipografía, escala, colores corporativos, espaciado, bordes, foco y densidad definidos en la Fase 1.
- Las secciones de titulares, notario, información crediticia y demás paneles usan superficies Glass Luxe discretas con cabeceras azul hielo.
- Los datos individuales se presentan en superficies secundarias blancas, con etiquetas en texto gris azulado y valores en azul/texto principal.
- El selector de actividades, los controles, las tablas y los formularios comparten el mismo lenguaje visual de Dashboard, CTN y Expedientes.
- Los modales operativos reciben el mismo tratamiento de superficies, controles, cabecera y pie.
- La extensión es exclusivamente visual: no modifica cálculos, importes, pagos, actividades, documentos, integraciones, API, permisos, datos ni Sidebar.
- La reorganización de bloques y tarjetas queda expresamente aplazada a la fase de composición final.
- Validación visual pendiente en Render Preview: revisar ficha completa, formularios, tablas y modales en escritorio y móvil antes de aprobar el piloto.


## Cierre de Fase 1 — auditoría global de implementación (31/10/2026)

**Estado: Fase 1 cerrada como infraestructura visual global en la rama Preview.**

### Alcance comprobado en el repositorio
- Se han contado 192 archivos bajo `frontend-app/src/`.
- Se han revisado estáticamente las 97 pantallas JSX/TSX y los 30 componentes JSX/TSX.
- El frontend mantiene tres hojas CSS: `index.css`, `NeutralizarPresentacion.css` y `SidebarBase.css`.
- `main.jsx` carga la neutralización visual después de la base y los estilos de los módulos, para que los fundamentos comunes alcancen las pantallas y los componentes que renderizan sus diálogos y modales.
- La búsqueda estática no encontró paletas Tailwind alternativas ni códigos de color antiguos en las pantallas revisadas. Los colores semánticos de estado se conservan cuando comunican éxito, advertencia o error.
- Los colores hexadecimales detectados en pantallas corresponden a la paleta corporativa; las excepciones de identidad y tratamiento del Sidebar permanecen expresamente fuera del alcance.
- FichaExpediente, por su tamaño y complejidad, también fue inspeccionada estáticamente: no se detectaron colores hexadecimales, clases de paletas alternativas ni estilos inline de presentación en su componente principal.

### Corrección final
- El hover de `.molsan-btn` utilizaba el valor aislado `#b8ccdc`.
- Se ha sustituido por `var(--molsan-border)`, manteniendo el mismo lenguaje cromático y evitando un color aislado.
- Commit de corrección: `627c7e12cfe21729c0bcd6ce487a2be307570c04`.

### Qué significa este cierre
La paleta, tipografía, escalas, superficies, geometría base, espaciado, controles, foco, movimiento reducido y reglas de normalización están centralizados para todo el frontend y se heredan en sus pantallas, componentes, formularios y modales. No se han hecho sustituciones masivas de lógica ni cambios funcionales.

Este cierre **no afirma que cada una de las 97 pantallas y cada modal hayan sido inspeccionados visualmente uno por uno en un navegador**. La revisión realizada es estática y de arquitectura/CSS. Las comprobaciones visuales por módulo, resoluciones e interacciones se registrarán durante la Fase 2 y la auditoría visual posterior. La compilación correcta tampoco sustituye esa revisión visual.

### Límites preservados
- Sidebar sin cambios.
- Sin cambios en producción, rama `main`, base de datos, APIs, permisos, datos o lógica de negocio.
- La distribución y reubicación de tarjetas y bloques queda aplazada a la fase de composición.

### Criterio de aceptación de Fase 1
- [x] Tokens corporativos y tipografía centralizados.
- [x] Fundamentos globales conectados a Tailwind y cargados en el punto de entrada.
- [x] Normalización global aplicada mediante una única hoja común.
- [x] Auditoría estática de 97 pantallas y 30 componentes JSX/TSX.
- [x] Corrección del último color aislado.
- [x] Sidebar y funcionalidad excluidos de los cambios.
- [x] Build de producción de Preview: correcto con Vite 6.4.5; compilación completada en 5,54 s y despliegue Render en estado LIVE (`dep-dbj043jbc2fs73bftb40`, 31/10/2026).
- [ ] Revisión visual individual de todas las pantallas y modales: pendiente, no se considera realizada por la auditoría estática.

## Fase 2 — Requisitos funcionales y visuales de tablas (criterio obligatorio)

### Ordenación de columnas
- Todas las columnas que representen datos deben permitir ordenación ascendente y descendente: identificadores, referencias, nombres, estados, fechas, importes, cantidades y cualquier otro dato visible.
- Las columnas dedicadas exclusivamente a acciones (editar, eliminar, abrir, descargar, etc.) quedan excluidas de la ordenación.
- Cada cabecera ordenable debe ser operable con ratón y teclado, exponer el estado mediante `aria-sort` y mostrar un indicador discreto de dirección.
- El comparador debe respetar el tipo real del dato: numérico para importes/cantidades/IDs, cronológico para fechas y alfabético natural en español para texto. Los valores vacíos deben mantener un criterio estable.
- En listados paginados, la ordenación debe afectar al conjunto completo filtrado, no solo a las filas de la página visible. Si los datos se consultan al servidor, se enviarán parámetros de orden al backend y este aplicará el orden antes de paginar. No se aceptará como solución ordenar únicamente la página cargada.
- Al cambiar el criterio de orden, se volverá a la primera página cuando corresponda y se conservarán los filtros activos.
- La exportación debe respetar los filtros y el criterio de orden activo siempre que el endpoint de exportación admita ese criterio.
- No se alterarán las reglas de negocio ni el significado de los campos para hacerlos ordenables.

### Método de implantación
- Inventariar todas las tablas reales de pantallas, componentes, modales y vistas especializadas.
- Clasificar cada tabla como local, paginada en cliente, paginada en servidor, agrupada/jerárquica o solo de presentación/impresión.
- Aplicar el patrón visual común a todas las tablas sin modificar la estructura de datos.
- Incorporar la ordenación funcional tabla por tabla, validando los tipos de dato y la paginación. Las tablas de impresión o solo lectura documental se documentarán como excepción cuando ordenar no tenga sentido en su función.
- Mantener fuera del alcance el Sidebar, la base de datos, los datos históricos y los cambios no solicitados de lógica de negocio.

## Fase 2 — Primera implantación de patrones globales (31/10/2026)

### Implementado en la rama Preview
- Se amplía `NeutralizarPresentacion.css` con una base global para tablas de trabajo dentro de `.erp-route-content`: cabeceras azul hielo, texto Molsan, bordes suaves, separación de filas, hover discreto y cifras tabulares.
- Se normalizan globalmente los estados visuales de campos de formulario: foco corporativo, placeholders, deshabilitados y acento de controles.
- Se consolidan las variantes compartidas `.molsan-btn`: primario, secundario, contorno, ghost, destructivo y compacto, con foco accesible y estados disabled.
- Se definen superficies reutilizables para modales: `.molsan-modal`, `.molsan-modal__panel`, `.erp-modal-panel`, junto con modificadores de cabecera, cuerpo y pie.
- Se excluyen explícitamente el Sidebar y las vistas de impresión/calendario de la normalización general.
- Se mantiene el sistema de tarjetas/cabeceras ya aprobado; esta implantación no los rediseña.
- Se conservan los colores semánticos cuando representan estados de negocio.

### Requisito de ordenación: no declarar todavía completado
- La auditoría de CTN confirma que el endpoint `GET /ctn/notarias` pagina en servidor y actualmente no acepta parámetros de ordenación. El listado de interfaz ordena solo las filas de la página ya recibida y solo ofrece controles para parte de sus columnas.
- No se modifica el backend conectado a producción ni se ordena falsamente solo la página visible.
- La ordenación completa de todas las columnas de todas las tablas queda como requisito obligatorio de implantación funcional por tabla. Requiere identificar paginación, endpoint y tipos de datos; las tablas paginadas necesitan soporte de ordenación del lado servidor.
- Los estilos de cabeceras ordenables y `aria-sort` quedan preparados para los componentes que incorporen esa funcionalidad. La presencia de estilo no significa que una columna ya sea funcionalmente ordenable.

### Alcance y validación
- Esta entrega es una primera capa visual transversal, no la migración terminada de todos los componentes de filtros, formularios y modales.
- No se han modificado lógica de negocio, permisos, datos, API, base de datos, Sidebar ni producción.
- La validación de build y el despliegue Preview se registrarán tras su ejecución. La revisión visual final de módulos y modales sigue pendiente.


### Fase 2 — filtros y formularios (base compartida)

- Se amplía la hoja central `NeutralizarPresentacion.css` con patrones reutilizables `.molsan-filter-bar`, `.molsan-filters`, `.molsan-filter-actions`, `.molsan-form-grid`, `.molsan-field` y `.molsan-form-section`.
- Los filtros se agrupan en una única superficie blanca/azul hielo; no se convierten los campos en tarjetas individuales.
- Los campos comparten etiqueta, altura, borde, radio, foco, ayuda, error, obligatorio y estado deshabilitado.
- Se conserva la composición funcional de cada formulario; en móvil la rejilla común pasa a una columna.
- La capa define el patrón compartido y permite la adopción progresiva por los módulos. No se afirma que todos los formularios y barras de filtros existentes hayan sido migrados en esta entrega.
- No se cambian validaciones, valores, consultas, permisos, API ni flujos de negocio.
- Sidebar, producción, rama `main` y base de datos permanecen fuera del alcance.
- Botones y migración de modales continúan en las siguientes entregas de Fase 2; la ordenación funcional completa de tablas se abordará después.


### Fase 2 — botones y modales (base compartida)

- Se refuerza el contrato común de botones `.molsan-btn` y sus variantes primario, secundario, contorno, ghost, destructivo, compacto e icono. Se normalizan interacción activa, foco, deshabilitado e iconografía.
- Se amplía la estructura de diálogos reutilizable: overlay, panel, tamaños semánticos, cabecera, cuerpo con scroll interno, pie y cierre accesible.
- En móvil los diálogos ocupan el ancho disponible y mantienen el scroll dentro del cuerpo.
- La base está preparada para adopción progresiva; no se afirma que todas las instancias de botones y modales del ERP hayan sido migradas en esta entrega.
- No se cambian acciones, permisos, validaciones, navegación, datos ni flujos funcionales.
- Sidebar, producción, rama `main` y base de datos permanecen fuera del alcance.


### Fase 2 — adopción transversal de módulos heredados

- Se amplía la hoja global para que formularios, controles, botones, tablas y diálogos heredados reciban la identidad Molsan sin exigir que cada módulo reconstruya su JSX.
- Alcance de compatibilidad: formularios dentro de las áreas principales y diálogos, controles de texto/selección, estados de foco y deshabilitado, botones, tablas con cabecera azul hielo, separadores y hover, paneles de diálogo y contenedores de filtros reconocibles.
- La regla excluye el Sidebar y no cambia estructura, valores, validaciones, acciones, permisos, API ni datos.
- La adaptación visual se hereda en pantallas que utilizan esos patrones; no equivale a una migración semántica individual de cada formulario, modal o botón, ni a una validación visual manual de cada pantalla.
- Las tablas reciben exclusivamente el patrón visual. No se añade un indicador de ordenación a cabeceras que todavía no dispongan de ordenación real.

### Estado de la ordenación funcional tras la auditoría inicial

- El requisito sigue siendo ordenar todas las columnas de datos en ambos sentidos y sobre el conjunto completo filtrado.
- No es correcto simular una ordenación universal manipulando el DOM: React puede volver a renderizar las filas y, en tablas paginadas en servidor, ese método solo ordenaría la página visible.
- La finalización requiere migrar los componentes de tabla y sus consultas/endpoints de servidor, verificando por cada listado si pagina en cliente o servidor y manteniendo filtros, paginación y exportación.
- En esta entrega no se declara completada la ordenación de todas las tablas. Tampoco se declara completada la auditoría visual uno a uno de todas las pantallas y diálogos.
- Próxima comprobación técnica: inventario completo de tablas y endpoints, clasificación por estrategia de paginación, incorporación del contrato de ordenación en backend y frontend en Preview, pruebas de tipos (texto, fechas, importes e identificadores), y control visual responsive.

## Fase 2 — normalización global de controles y diálogos (31/10/2026)

- Se amplía la capa común para cubrir los campos de texto, selección y área de texto de todas las vistas operativas, también cuando no están dentro de un formulario HTML.
- Se unifican geometría, tipografía, bordes, foco accesible, estados deshabilitados y respuesta de botones sin sobrescribir sus variantes semánticas ni sus acciones.
- Los diálogos con `role="dialog"` reciben los mismos criterios aunque se monten mediante `createPortal` fuera de `#root`.
- Se homogeneizan tablas en presentación, cabeceras, separadores y hover. Esta capa es exclusivamente visual: no incorpora ordenación ni indicadores que la simulen.
- El ámbito de las reglas es el contenido principal y los diálogos; el Sidebar queda excluido por estructura y no se modifica.
- La implantación es transversal para las pantallas que utilizan controles HTML y diálogos accesibles. No sustituye la comprobación visual real de cada ruta ni la revisión de modales heredados que no expongan un contenedor accesible identificable.
- No se modifican APIs, backend, permisos, lógica de negocio, datos, base de datos, rama `main` ni servicios de producción.
- Pendiente de esta fase: revisión visual en navegador de todas las rutas y corrección puntual de excepciones de composición. La ordenación funcional de tablas queda fuera de esta entrega y requiere una auditoría posterior de frontend, endpoints y paginación en backend.


## Cierre técnico de Fases 1 y 2 — revisión de diálogos (31/10/2026)

- Se revisaron los diálogos identificados en las páginas y componentes operativos del frontend. Los diálogos operativos inspeccionados emplean `useAccessibleDialog` para restauración y contención del foco, navegación con Tab y cierre con Escape.
- `EnviarANotarioModal` ya tenía `role="dialog"`, `aria-modal="true"`, nombre accesible y `useAccessibleDialog` cuando se muestra en modo modal. El rol es condicional porque el mismo componente también se usa embebido; no se duplican atributos ni se altera su flujo.
- `VisibilidadTablas` se ha completado con `useAccessibleDialog`, referencia al panel y foco inicial cuando `modal=true`. En modo embebido no activa el comportamiento modal.
- El perfil de empleado abierto desde el Sidebar queda marcado como excepción visual explícita. La normalización global excluye ese diálogo para conservar su presentación previa.
- El diálogo de notificaciones del Sidebar también queda fuera de los selectores globales mediante su contenedor `.panel-modal-premium`. No se modifica el componente Sidebar, su navegación, menús, campana ni sus estilos.
- Los demás diálogos operativos conservan la normalización global de controles, botones, tablas, tipografía y estados de foco.
- Esta revisión es estática del código y de los selectores CSS. No equivale a una prueba de interacción en navegador de cada diálogo.

## Estado de cierre técnico

- Fase 1: base visual global y tokens corporativos implantados en Preview.
- Fase 2: normalización transversal de filtros, formularios, controles, botones, tablas y diálogos implantada en Preview; revisión estática de diálogos completada.
- La ordenación funcional de todas las columnas continúa expresamente fuera de estas fases y requiere auditoría de endpoints/paginación.
- La reorganización de tarjetas y bloques continúa reservada a Fase 3.
- El cierre visual definitivo requiere la comprobación de aceptación en Preview descrita en `QA_CIERRE_FASES_1_2.md`.
