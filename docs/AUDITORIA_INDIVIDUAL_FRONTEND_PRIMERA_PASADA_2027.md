# Auditoría individual del frontend — primera pasada verificada

Fecha: 2026-11-06  
Rama auditada: `main`  
Commit auditado: `288e193590d3dbdbbc27c815761efd8f19c70d3a`

> Estado: auditoría en curso. Este informe registra hallazgos comprobados en código fuente; no certifica la revisión completa de las 96 páginas ni de todos los diálogos.

## 1. Hallazgos transversales confirmados

### 1.1 El sistema visual no es único todavía

`main.jsx` carga en cascada `index.css`, `molsan-tokens.css`, `molsan-design-system.css`, `molsan-tables.css`, `molsan-controls.css` y `MolsanRedesign2027.css`. A esto se suman hojas CSS importadas por páginas y componentes.

El design system contiene reglas de compatibilidad para cabeceras antiguas (`.ag-hero`, `.ng-cabecera`, `.eg-hero`, etc.) y declara expresamente que son temporales hasta migrar cada pantalla. Por tanto, añadir clases comunes a un JSX no demuestra que la pantalla haya dejado de depender de sus estilos antiguos.

### 1.2 El CSS global es grande y tiene alta especificidad

Mediciones directas de los ficheros en `main`:

| Hoja | Líneas | Selectores aproximados | `!important` |
|---|---:|---:|---:|
| MolsanRedesign2027.css | 3.499 | 270 | 118 |
| PortalProfesionalShared.css | 1.891 | 528 | 54 |
| molsan-design-system.css | 688 | 103 | 0 |
| EncargaGest.css | 748 | 198 | 7 |
| NotarGest.css | 904 | 432 | 83 |
| LayoutPortalesPremium.css | 240 | 83 | 7 |
| Agenda.css | 148 | 49 | 8 |

Los recuentos de selectores son aproximados (reglas CSS contadas por bloques), no equivalen a selectores únicos. La cantidad de `!important` y la coexistencia de reglas compartidas y específicas justifican un mapa de cascada antes de retirar hojas.

### 1.3 La cabecera común actual no cubre el sistema visual real

En páginas auditadas aparecen marcas de texto como `AG`, `EG`, `NG`, `CG`, `CTN` y `EXP`, además de iconos emoji en algunas áreas. No se ha encontrado un componente `MolsanIcon` ni `IconoModulo` en los ficheros consultados. `Sidebar.jsx` mantiene un mapa propio de SVG inline, que debe ser evaluado como fuente para el sistema común.

### 1.4 Los diálogos no están centralizados ni auditados por estados todavía

Hay diálogos implementados inline en páginas grandes. Ejemplos verificados:
- `FichaExpediente.jsx`: 9.869 líneas; 110 referencias a patrones/nombres de modal o dialog.
- `Agenda.jsx`: 634 líneas; 50 referencias.
- `EncargaGest.jsx`: 1.446 líneas; 52 referencias.
- `NotarGest.jsx`: 958 líneas; 43 referencias.
- `ApoderaGest.jsx`: 1.133 líneas; 36 referencias.
- `Informes.jsx`: 3.817 líneas; 64 referencias.
- `EntidadesBancarias.jsx`: 3.973 líneas; 27 referencias.
- `AccionesExpediente.jsx`: 3.020 líneas; 11 referencias.

Estos números son búsquedas textuales, no un recuento exacto de ventanas. Se han localizado overlays con `role="dialog"` y `aria-modal="true"`, pero aún no se han verificado sistemáticamente gestión de foco, restauración del foco, Escape, bloqueo de scroll, backdrop, estados de guardado/error ni responsive.

## 2. Revisión por familias y pantallas

### Portales profesionales — prioridad alta

**ApoderaGest** (`pages/apoderagest/ApoderaGest.jsx`)
- Importa `PortalProfesionalShared.css`.
- Mantiene `.ag-hero`, marca textual `AG` y numerosos estilos de secciones internas.
- Contiene paneles desplegables, visor documental, detalles de encargo y overlays/portales.
- No está migrado a una cabecera/iconografía común real.

**EncargaGest** (`pages/encargagest/EncargaGest.jsx`)
- Importa `PortalProfesionalShared.css` y `EncargaGest.css`.
- Usa simultáneamente `.ag-hero`, `.eg-hero`, clases de perfil y cabeceras propias de modales.
- Se han detectado al menos 52 referencias textuales a modal/dialog.
- Conserva estilos específicos que impiden considerar terminada la unificación.

**NotarGest** (`pages/notargest/NotarGest.jsx`)
- Importa `PortalProfesionalShared.css` y `NotarGest.css`.
- Usa `.ag-hero`, `.ng-hero-apoderagest`, marca `NG` y cabeceras de modal propias.
- La hoja `NotarGest.css` tiene 904 líneas y 83 usos de `!important`.
- Presenta varios modales inline (avisos, pagos, perfil y áreas de gestión).

**Conclusión de la familia:** los tres portales siguen dependiendo de hojas específicas y clases heredadas. La migración debe cubrir cabecera, tarjetas, tablas, formularios, modales y subestados, no solo el hero.

### Dashboard y selector de módulos

**Dashboard**
- Importa `DashboardCancelagest.css`.
- Usa `.ag-hero`, marca `CG`, iconos emoji en KPI y tarjetas, y reglas locales para la cabecera.
- La hoja contiene bloques sucesivos de refinamiento y selectores específicos del Dashboard.

**Selector de módulos**
- Su cabecera principal es un `header` con clases utilitarias inline, no una extracción demostrada del patrón de Espacios de trabajo.
- Contiene un modal de soporte inline.
- Es necesario comparar la estructura real de tarjetas y jerarquía del selector con las páginas que se van a migrar; no se ha demostrado aún que exista un componente canónico compartido.

### Agenda

- `Agenda.jsx` importa `Agenda.css`.
- Las vistas día, semana y mes importan `ComponentesCompartidosPremium.css`.
- Hay múltiples estados de diálogo en la página principal.
- Las vistas secundarias deben auditarse junto con la página principal; no se debe asumir que heredan correctamente la cabecera ni la geometría.

### Expedientes y ficha

**Listado**
- Importa `ExpedientesListado.css`.
- Tiene cabecera `.molsan-page-header`, pero icono textual `EXP` y hoja propia con ajustes específicos.
- Presenta otros headers de paneles/diálogos.

**Ficha**
- Importa `FichaExpedientePremium.css`.
- Es un componente de casi 10.000 líneas con gran cantidad de diálogos inline.
- Debe tratarse como migración por secciones funcionales, preservando las reglas de negocio y estados de expediente. No conviene sustituirlo de una vez por una plantilla visual.

### CTN

- `CtnListadoPage.jsx` usa cabecera común por clases, pero marca textual `CTN` y hoja `CtnListadoPage.css`.
- `CtnDetallePage.jsx` tiene cabecera propia y hoja propia; contiene varios diálogos.
- `ModalCtnDetalle.jsx` usa `molsan-page-header` con estructura propia.
- La familia requiere una sola cabecera y una sola estructura de panel/modal.

### Informes y utilidades/catálogos

- `Informes.jsx` contiene varias cabeceras independientes con superficies translúcidas y estilos Tailwind propios, además de múltiples ventanas.
- `EntidadesBancarias.jsx` (3.973 líneas) y `AccionesExpediente.jsx` (3.020 líneas) son páginas extensas con estados de modal.
- `HonorariosGestoria.jsx` y `TiposExpediente.jsx` mantienen cabeceras propias con geometrías distintas.
- `ProvisionesFondosPage.jsx` tiene dos modos con cabeceras distintas (catálogo y gestión).
- Deben revisarse también formularios, estados vacíos, filtros y tablas de cada subpágina, no solo su cabecera.

### Panel técnico, maestros, seguridad e intranet

- `PanelTecnico.jsx` y `MonitorSistema.jsx` importan hojas propias.
- `Maestros.jsx`, `Seguridad.jsx`, `Intranet.jsx`, `Logs.jsx` y `Notificaciones.jsx` conservan estructuras de presentación independientes.
- `Intranet.jsx` usa una cabecera con gradientes, bordes y sombras distintos del patrón acordado.
- Las páginas de seguridad son rutas individuales y necesitan revisión propia; no basta con migrar `Seguridad.jsx`.

## 3. Decisión sobre eliminar todo `src`

No recomiendo borrar el directorio `frontend-app/src` como primera medida. El código incluye rutas, permisos, flujos de expediente, integraciones, formularios, validaciones, carga documental y lógica operativa. Eliminarlo sin reconstrucción funcional paralela supondría perder comportamiento que no se recupera con CSS ni con un diseño nuevo.

La alternativa técnicamente más segura es:
1. Congelar la funcionalidad de negocio actual como referencia.
2. Crear el sistema visual canónico en componentes aislados.
3. Migrar una familia completa a la vez, incluyendo subpáginas y diálogos.
4. Comparar rutas, permisos, estados y operaciones antes/después.
5. Retirar CSS heredado únicamente cuando no queden consumidores y el Preview confirme la equivalencia funcional.

## 4. Trabajo pendiente explícito

- Revisar las 96 páginas de forma individual (esta pasada solo ha inspeccionado una selección representativa).
- Mapear todas las 107 rutas a su componente, subpágina y hoja CSS.
- Inventariar CSS importado directa e indirectamente y detectar reglas sin consumidor.
- Localizar todos los diálogos inline y componentes de modal; probar foco, Escape, backdrop, scroll y responsive.
- Auditar tablas, formularios, filtros, estados vacíos, carga, error y guardado.
- Extraer el patrón de Espacios de trabajo con medidas y estructura exactas.
- Validar Preview con sesión autenticada y pruebas de humo antes de producción.

## 5. Regla de seguridad

No se ha modificado `main`, producción, API ni base de datos. No se debe fusionar ni desplegar una entrega parcial como rediseño global.


## 6. Cambios ejecutados después de la primera pasada — 2026-11-06

Rama: `molsan-premium-2027-production-ready`.

### Migración visual aplicada
- `MolsanPageHeader` utiliza ahora el componente SVG compartido `MolsanIcon`; las marcas de texto AG/EG/NG/CG dejan de renderizarse como siglas.
- ApoderaGest, EncargaGest, NotarGest, Dashboard y Espacio de trabajo usan el componente común de cabecera.
- Se retiraron las clases de cabecera heredadas de los tres portales y los estilos específicos equivalentes de `PortalProfesionalShared.css`, `EncargaGest.css`, `NotarGest.css`, `DashboardCancelagest.css`, `molsan-design-system.css` y los bloques de cabecera portal de `MolsanRedesign2027.css`.
- ApoderaGest ya no muestra fecha, «Ir a módulos» ni «Actualizar datos» en la cabecera. EncargaGest mantiene solo la acción de cierre de sesión cuando procede.
- Las tarjetas de navegación de NotarGest se han migrado al patrón de Espacios de trabajo: franja superior, icono SVG, título, descripción, contador y acción de apertura.
- Las tarjetas KPI de ApoderaGest y EncargaGest comparten la base visual y los iconos SVG.
- Los botones de cabecera y las acciones principales/secundarias de NotarGest y EncargaGest usan las clases comunes `molsan-btn`.
- Las tablas de NotarGest usan `molsan-table` y `molsan-table-wrap`; se retiraron sus reglas genéricas locales de tabla.
- Los diálogos de NotarGest adoptan el shell común `molsan-modal-overlay` / `molsan-modal`; se retiraron las reglas base duplicadas de overlay y modal de esa hoja.

### Comprobación
- Build frontend y comprobaciones asociadas: **correctas** en el commit `edf92240d29d54cf98182ab52231f41d83ae67fd`.
- El build emitió un aviso preexistente en `ModelosDocumentos.jsx` sobre un carácter `}` dentro de JSX; no impidió la compilación.
- La comprobación de build no sustituye la revisión visual autenticada de Preview ni las pruebas de regresión de los diálogos.

### Alcance que sigue abierto
- No se considera migrado el frontend completo. Quedan pendientes las restantes páginas, subpáginas, tarjetas, formularios, tablas y modales de los 96 componentes de página y 107 rutas.
- No se han retirado aún todas las hojas CSS particulares; solo se han retirado reglas de cabecera/controles/tablas sustituidas y verificadas en las familias indicadas.
- No se ha fusionado la PR #410 ni se ha desplegado a producción. No se han tocado API ni base de datos.


### Segunda tanda de migración — 2026-11-06
- Migradas a `MolsanPageHeader`: ExpedientesListado, CTN listado y detalle, ProvisionesFondos (modo principal y catálogo), HonorariosGestoría, TiposExpediente, Intranet, Seguridad, AccionesExpediente y EntidadesBancarias.
- Retiradas las hojas/reglas de cabecera particulares de ExpedientesListado y CTN listado/detalle; retirada la cabecera particular de ProvisionesFondos.
- La ficha modal CTN utiliza el shell compartido de modal, con cabecera, metadatos y distintivo comunes.
- Se eliminó la acción «Actualizar» de la cabecera del listado CTN; se conserva la exportación Excel.
- La compilación completa de frontend y las comprobaciones de backend asociadas finalizaron correctamente en el commit `a5ff6b0edf5e7c06888780c1b33ce7ce153f9fca`.

**Pendiente:** migración visual del resto de páginas/subpáginas y sus diálogos, revisión funcional y responsive, y validación autenticada de Preview. No desplegar a producción todavía.


### Tercera tanda — páginas técnicas, informes, iconografía y modales
- Cabeceras comunes aplicadas también a Panel Técnico, Monitor del Sistema, Maestros, Notificaciones, Logs e Informes (incluidos los subinformes de firmas, notarios y SLA).
- Migradas también las cabeceras de Acciones del expediente, Entidades bancarias, Honorarios, Tipos de expediente, Intranet, Seguridad, Provisiones y las dos vistas de CTN.
- El selector «Espacio de trabajo» conserva su composición de tarjetas de referencia, pero sustituye las siglas por iconografía SVG compartida `MolsanIcon`.
- Dashboard, ApoderaGest y EncargaGest sustituyen iconos funcionales emoji/glyph por iconos SVG; las tarjetas KPI comparten la base visual con franja superior, superficie blanca, borde y hover sutil.
- Controles de cabecera y botones principales/secundarios de varias familias migrados a `molsan-btn`.
- Shell común de modal aplicado a los diálogos de NotarGest, CTN detalle, EncargaGest, resumen y detalle de ApoderaGest, Informes de facturación y Tipos de expediente.
- Se retiraron reglas locales de cabecera, tabla, botón, modal y tarjeta solo donde el JSX ya usa el componente común. Las excepciones de anchura de diálogos grandes se conservan como variantes de tamaño, no como rediseños independientes.

La última tanda tiene todos los checks de CI en verde en el commit de código `bd09a17d206a4929d3c3737723384786e990a691`. Esto confirma compilación y sintaxis; no sustituye la revisión visual autenticada de Preview. La migración del resto de rutas, subpáginas, formularios, tablas y diálogos sigue abierta.
