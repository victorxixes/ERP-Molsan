# Auditoría exhaustiva de estilos y componentes — MOLSAN ERP PREMIUM 2027

**Rama de trabajo:** `fix/molsan-css-selector-audit-round1`  
**PR:** #409 (Draft)  
**Último commit de código:** `3551af019c3a12f30aee2c97f3f1b5cbb865daf2`  
**Alcance de esta revisión:** frontend `frontend-app/src`; sin cambios en backend, API, Supabase, datos ni producción.

## 1. Inventario real del frontend

El árbol Git de este commit contiene **41 hojas CSS**, **143 archivos JSX/TSX** (98 bajo `pages/`, 37 bajo `components/`, 2 bajo `layout/` y 6 en otras ubicaciones del frontend). El árbol completo no está truncado.

### 1.1 CSS globales y sistema compartido (11)

- `css/index.css`
- `css/molsan-tokens.css`
- `css/molsan-design-system.css`
- `css/molsan-module-styles.css`
- `css/MolsanCanonicalVisual2027.css`
- `css/MolsanCardsPremium2027.css`
- `css/MolsanFase3.css`
- `css/MolsanGlassLuxeUnified2027.css`
- `css/MolsanGlobalConsistency2027.css`
- `css/MolsanPremium2027.css`
- `css/MolsanRedesign2027.css`

### 1.2 Portales y estructura compartida (2)

- `css/LayoutPortalesPremium.css`
- `css/PortalProfesionalPremium2027.css`

### 1.3 Hojas de módulos (11)

- `css/ApoderaGest.css`
- `css/Cancelagest.css`
- `css/CancelagestUnified.css`
- `css/CatalogosMaestrosPremium.css`
- `css/CtnListadoPage.css`
- `css/DashboardCancelagest.css`
- `css/EncargaGest.css`
- `css/Fusiones.css`
- `css/HerramientasPremium.css`
- `css/ImportacionesDatos.css`
- `css/NotarGest.css`

### 1.4 Hojas de páginas y subpáginas (17)

- `pages/agenda/Agenda.css`
- `pages/ctn/CtnDetallePage.css`
- `pages/empleados/EmpleadoEditar.css`
- `pages/empleados/EmpleadoFicha.css`
- `pages/empleados/EmpleadosListadoPremium.css`
- `pages/empleados/EmpleadosModulo2026.css`
- `pages/expedientes/ExpedientesListado.css`
- `pages/expedientes/FichaExpedientePremium.css`
- `pages/intranet/Intranet.css`
- `pages/logs/Logs.css`
- `pages/maestros/Maestros.css`
- `pages/notificaciones/Notificaciones.css`
- `pages/paneltecnico/PanelTecnico.css`
- `pages/paneltecnico/PanelTecnicoSubmodulos.css`
- `pages/provisiones/ProvisionesFondosPage.css`
- `pages/seguridad/Seguridad.css`
- `pages/seguridad/SeguridadSubpaginasPremium.css`

> La clasificación identifica responsabilidad predominante, no significa que cada hoja esté ya validada como correcta u obsoleta.

## 2. Dependencias y orden de carga comprobados

`main.jsx` importa primero `index.css`, tokens y Design System; después carga `MolsanFase3.css`, `molsan-module-styles.css`, las tres hojas de portales y, finalmente, las capas Redesign, Premium, Cards, PortalProfesional, GlobalConsistency, GlassLuxeUnified y CanonicalVisual.

`molsan-module-styles.css` es un agregador con 26 imports de componentes/hojas de módulo y página. ApoderaGest, EncargaGest y NotarGest se importan aparte desde `main.jsx`. Este orden es deliberado en la rama, pero genera una cascada de varias capas globales posteriores a los estilos específicos. **No debe cambiarse a ciegas:** al hacerlo se pueden invertir reglas que hoy dependen del orden de carga.

La revisión de `Layout.jsx` confirma que el contenedor principal añade la clase `cg-unified-workspace` a prácticamente todas las rutas del ERP interno (excepto Panel Técnico, Seguridad y Auditoría). Por tanto, `CancelagestUnified.css` actúa de hecho como una capa transversal compartida y no se debe borrar por su nombre. El mismo Layout añade `molsan-page-header`/`molsan-page-header--legacy` a cabeceras heredadas mediante `MutationObserver`; es un mecanismo de compatibilidad que deberá desaparecer gradualmente cuando todas las páginas migren al componente real `MolsanPageHeader`.

## 3. Componentes visuales canónicos existentes

El repositorio ya tiene componentes reutilizables que deben ser la fuente de verdad, no nuevas capas de overrides:

- `components/ui/MolsanPageHeader.jsx`: cabecera común; identidad, título, descripción y acciones; resuelve iconos de marca mediante `MolsanIcon`.
- `components/ui/MolsanPremiumCard.jsx`: composición de tarjeta con icono Molsan, título, descripción y contenido.
- `components/ui/MolsanIcon.jsx`: catálogo corporativo SVG.
- `components/ui/MolsanButton.jsx`: botón compartido con variantes e icono.
- `components/ui/MolsanDataTable.jsx`: tabla con ordenación, búsqueda y paginación opcionales.

Hallazgo importante: la existencia de estos componentes no demuestra que todas las páginas los utilicen. Hay JSX con cabeceras propias y estructuras antiguas; por ejemplo, los portales AG/EG/NG y Dashboard conservan estructuras `ag-hero` con clases compatibles añadidas. La migración debe ser de consumidores reales, no solo CSS.

## 4. Hallazgos de la primera pasada estática

1. **Canonical Visual concentra 115 usos de `!important` en 321 líneas.** Es una capa de precedencia muy alta que impone cabeceras, tarjetas, botones y estados sobre clases de módulo. Debe reducirse mediante migración de consumidores y reglas semánticas, no eliminando prioridades sin sustitución.
2. **EncargaGest.css tiene 117 `!important` en 905 líneas.** Es la mayor concentración dentro de las hojas de portal/módulo examinadas. Requiere comparar sus reglas con JSX y con Canonical Visual.
3. **ApoderaGest.css contiene 2.250 líneas y 747 bloques/reglas detectados por conteo estático.** Su tamaño exige una auditoría por secciones y consumidores; no se considera obsoleto por tamaño.
4. **MolsanRedesign2027.css tiene 2.757 líneas; MolsanPremium2027.css 1.350.** Ambas hojas tienen responsabilidades que se cruzan con GlobalConsistency, Fase3, Design System y Canonical Visual. Debe decidirse qué capa conserva cada responsabilidad antes de retirar código.
5. **SeguridadSubpaginasPremium.css tiene 369 líneas** y contiene bloques repetidos de tablas, botones, controles y accesibilidad dentro de varios selectores de seguridad; candidato a consolidación local tras verificar cada subpágina.
6. **Agenda.css tiene 40 `!important` en 198 líneas.** Revisar si son realmente necesarios frente a las capas globales.
7. **No se ha encontrado un duplicado exacto de bloque completo entre las cinco hojas globales comparadas** mediante una primera comparación textual de selectores. Esto no descarta declaraciones solapadas con selectores distintos ni conflictos de especificidad.
8. **El recuento de `!important` no equivale a deuda eliminable:** algunos pueden ser necesarios en estados concretos o para neutralizar estilos legacy. Cada eliminación necesita evidencia de cascada y prueba.

## 5. Inventario de componentes, páginas y modales

- Hay 98 archivos de página/subpágina y 37 componentes JSX en el árbol.
- Se han localizado componentes de interfaz compartidos y componentes de negocio en `components/`.
- Entre los modales con archivo propio aparecen Agenda, CTN, Empleados y Expedientes (carpeta digital, envío a notario, liquidación y provisiones). Otros modales se implementan dentro de páginas/componentes y no se detectan por el nombre del archivo.
- Primera comprobación estática de los tres portales: ApoderaGest tiene 2 diálogos `role=dialog` / 2 refs / 2 llamadas a `useAccessibleDialog`; EncargaGest 5/5/5; NotarGest 4/4/4. Los 11 diálogos examinados declaran `aria-modal="true"`. El hook compartido implementa Escape, contención de foco, ciclo Tab y restauración del foco anterior. Esto verifica la estructura del código, no el comportamiento real en navegador.
- La revisión de modales debe incluir apertura/cierre, confirmación, validación, carga, error, foco, Escape, backdrop, scroll y responsive. El inventario de rutas no basta para enumerarlos.

## 6. Cambios seguros ya aplicados en esta ronda

- `SeguridadSubpaginasPremium.css`: eliminado un bloque `@media (max-width: 680px)` vacío, sin declaraciones.
- `MolsanFase3.css`: consolidados en un único bloque base los estilos y el contrato de tamaño/scroll de diálogos legacy con `role=dialog`; unificadas las reglas móviles que repetían ancho/alto y conservado el radio móvil de 14px. Se mantienen las exclusiones de overlays y modales propios.
- `MolsanPageHeader.jsx`: añadido el mapeo `CG → dashboard` a `MolsanIcon`, porque el Dashboard ya utiliza `MolsanPageHeader` con `mark="CG"` y antes mostraba el texto de marca en vez del icono corporativo.
- `FichaExpediente.jsx`: corregidos dos cierres JSX con una llave adicional en los botones de registro ABSIS y validación de actividad. Eran los dos avisos de análisis JSX que aparecían en el build anterior; el cambio no modifica las condiciones ni las acciones.
- `EncargaGest.css`: retiradas 26 referencias de selectores KPI legacy en 18 reglas (68 líneas netas). La versión actual de `EncargaGest.jsx` y `EncargaGestWorkspace.jsx` ya no renderiza `.eg-kpi`, `.ag-kpi` ni sus iconos; las tarjetas actuales salen de `MolsanStatCard` con clases `molsan-stat-card*`. Se conserva intacto el estilo del directorio, formularios y modales.
- Segunda pasada de `EncargaGest.css`: retiradas otras 5 reglas sin consumidor o filtradas al módulo equivocado (utilidades Tailwind antiguas, `.ag-fecha-actual` y duplicación de `.ag-estado`, que pertenece al portal ApoderaGest). El CSS restante se ha contrastado con EncargaGest, ApoderaGest y los componentes compartidos; no quedan clases sin consumidor en ese conjunto.
- `DashboardCancelagest.css`: eliminadas 26 reglas de 7 clases que ya no existen en Dashboard/Cancelagest (`ag-fecha-actual`, `ag-punto-vivo`, `ag-boton-actualizar` y paneles/KPI legacy). La hoja pasa de 269 a 134 líneas; todas las clases restantes se encuentran en los consumidores actuales.
- `Cancelagest.jsx`/`Cancelagest.css`: sustituida la iconografía Unicode de los accesos por `MolsanIcon` (incluidos los pictogramas de módulos, el distintivo de cabecera y la flecha de navegación); eliminado un cálculo de fecha no utilizado y retirados los estilos de cabecera legacy ya reemplazados por `MolsanPageHeader`.
- `Agenda.css`: retiradas 13 reglas de iconografía KPI antigua (`agenda-stat-icon*` y `agenda-stat-label`) que ya no se renderiza; las tarjetas usan `MolsanPremiumCard`. La hoja pasa de 198 a 161 líneas y sus clases restantes tienen consumidores identificados, incluidas las vistas de mes/semana/día y `SelectSJ`.
- `Agenda.jsx` y `Layout.jsx`: reemplazadas las flechas Unicode de navegación de calendario y de Volver por `MolsanIcon` (`arrowLeft`/`arrowRight`). No se ha añadido ningún botón de actualización.
- `SeguridadSubpaginasPremium.css`: retirado el bloque de layout específico `seguridad-usuarios-layout` (73 líneas), cuyo root no aparece en las páginas actuales. Se conservan las reglas compartidas que sí usan las subpáginas con `seguridad-subpagina-premium` y los estilos específicos de Resumen y Editor de roles.
- `PanelTecnico.css`: retiradas 13 reglas de cabecera y monitor heredadas sin consumidor (`panel-tecnico-header*`, `panel-tecnico-operativo`, `panel-tecnico-seccion` y títulos legacy de Monitor Realtime). La hoja pasa de 68 a 24 líneas; la comparación con las cinco páginas técnicas no deja clases CSS sin consumidor. `PanelTecnicoSubmodulos.css` conserva sus dos clases activas.
- `CtnListadoPage.css`: eliminadas 23 reglas de cuatro clases huérfanas (`ctn-modal-panel`, `ctn-modal-resultados` y dos clases de resumen notarial antiguo). La hoja pasa de 1.519 a 1.362 líneas; el contraste con listado, detalle, modal, pestañas de portal, importador CTN y portales confirma consumidores para todas las clases restantes.
- `CtnDetallePage.css`: retirada una regla de metadatos que ya no se renderiza; la hoja conserva 35 clases, todas presentes en la página, modal, pestañas o `MolsanPageHeader`. La limpieza de siete referencias de `.accesos-notariales-resumen-card` se revirtió: `AccesosNotariales.jsx` sigue importado en `App.jsx` y renderiza dos tarjetas con esa clase. Se mantiene su tratamiento canónico. Las siete referencias de `.ctn-detalle-info-card` sí se retiraron tras comprobar que no tienen consumidor actual.
- Portales: retiradas las clases legacy `ag-hero`, `eg-hero`, `ng-hero` y `dashboard-header` de las cabeceras que ya usan `MolsanPageHeader`; ApoderaGest pasa a la marca `AP` (icono de usuarios), mientras Agenda conserva `AG` (calendario), EncargaGest `EG` (maletín), NotarGest `NG` (notaría) y CancelaGest `CG` (dashboard). Se retiró `.ng-hero` de la capa canónica al dejar de tener consumidores.
- Accesibilidad de modales: `ExpedientesListado.jsx` incorpora `useAccessibleDialog` en sus dos diálogos inline (filtros y control de plazos); `FichaExpediente.jsx` ya usa el hook en sus tres diálogos económicos/PPAD y en el modal base. La comprobación estática confirma refs, foco, Escape y `aria-modal` en estos componentes.
- `NotarGest.css`: retiradas 12 referencias obsoletas en 20 líneas netas (`ng-dashboard-ciclo`, `ng-dashboard-kpis`, `ng-dashboard-kpi`, `ng-kpi-card` y `ng-volver`), ausentes del único consumidor `NotarGest.jsx`. Se han conservado los selectores activos del panel de administración (`ng-admin-kpis`), cabeceras, tablas y modales.
- `ApoderaGest.css`: retiradas 80 clases legacy que no aparecen en el JSX del portal ni en sus cinco consumidores integrados (Agenda, Intranet, Mensajes, CTN y ControlApoderados), más dos `@keyframes` sin referencias. La hoja pasa de 2.250 a 1.203 líneas; tras la limpieza, todas las clases restantes tienen consumidor en esos archivos o son generadas por `MolsanIcon`.
- `frontend-app/package.json`: fijadas `tailwindcss` y `@tailwindcss/postcss` a `4.3.4`. El registro npm publica 4.3.4 como versión estable actual, mientras la instalación de CI intentaba descargar `@tailwindcss/oxide@4.3.5`, que devolvía 404. El pin alinea los paquetes de Tailwind y evita la resolución de esa versión inexistente.
- Commits de esta ronda: `c052422` (inventario), `6465ffa` (regla vacía), `0a0b8df` y `633914f` (consolidación/estilo de diálogos), `54fe050` (icono CG), `321a44d` (cierres JSX de FichaExpediente), `31a200c` (KPI legacy de EncargaGest), `00c4f0a` (selectores NotarGest sin consumidor), `9b8aedc`/`7070e42`/`37a8015` (limpieza ApoderaGest), `f29b02d` (pin Tailwind), `f11f225` (Dashboard/Cancelagest), `6e238f4` (selectores globales), `f53383c`/`5468894` (Agenda), `4c04b72`/`b282f09` (cabeceras portales), `9c2ad62` (modales ExpedientesListado).

## 7. Estado de ejecución — no confundir auditoría estática con validación

| Trabajo | Estado |
|---|---|
| Enumeración de las 41 hojas CSS | Completada |
| Clasificación por responsabilidad predominante | Completada, pendiente de validar consumidor a consumidor |
| Orden de imports y agregador de 26 hojas | Inspeccionado |
| Identificación de componentes canónicos | Completada |
| Mapa exhaustivo JSX ↔ CSS y selectores sin consumidor | Pendiente |
| Revisión de todas las subpáginas | Pendiente |
| Revisión individual de modales y estados | Pendiente |
| Consolidación/eliminación de CSS legacy | Pendiente de evidencia por consumidor |
| Migración completa a cabeceras/tarjetas canónicas | Pendiente |
| Pruebas de permisos 401/403/200 | Pendiente; no se han ejecutado en esta ronda |
| Pruebas funcionales de negocio y regresión | Pendiente; no se han ejecutado en navegador |
| Build y despliegue Render Preview | Pendiente de validar y desplegar la última limpieza de Panel Técnico |
| Validación visual interactiva de Preview | Pendiente; la URL no ha podido abrirse con el navegador de consulta disponible |

## 8. Límites de seguridad de esta fase

- Los cambios siguientes deben limitarse a la rama y al Preview.
- No tocar producción, base de datos principal, API ni permisos funcionales.
- No borrar almacenamiento de sesión/autenticación requerido por el flujo actual.
- No eliminar excepciones de Catálogos, CTN, Agenda, Expedientes o portales hasta verificar su función.
- No dar por validado un modal, permiso o flujo solo porque el frontend compile.
- Render Preview solo se despliega tras build correcto; el despliegue está confirmado. La inspección visual real y la regresión funcional siguen pendientes.

## 9. Siguiente secuencia obligatoria

1. Construir matriz de páginas/subpáginas: JSX, raíz CSS, cabecera, tarjetas, formularios, tablas, modales y estados.
2. Buscar selectores sin consumidor y clases JSX sin regla; diferenciar Tailwind/utilidades, CSS Modules, estilos inline y componentes compartidos.
3. Resolver primero los puntos de entrada visuales: Dashboard, Espacios de trabajo, FichaExpediente y portales AG/EG/NG.
4. Migrar por lotes pequeños a componentes canónicos, eliminando en el mismo lote la regla legacy ya sustituida.
5. Consolidar reglas comunes en Design System/Cards/Canonical Visual y reducir capas globales duplicadas.
6. Ejecutar build, pruebas automatizadas disponibles, revisión de permisos y flujos, y comprobación interactiva de Preview.
7. Actualizar esta auditoría con evidencia, commit, CI y resultado de Preview.

**Conclusión:** el inventario de 41 CSS está realizado y se han localizado focos claros de cascada heredada. La limpieza global todavía no está terminada. Este documento registra el punto de partida verificable y evita presentar como completadas pruebas que aún no se han ejecutado.

## 11. Revisión incremental de modales — 6 de noviembre de 2026

Se ha profundizado en el flujo de Agenda y, especialmente, en FichaExpediente y sus modales de gestión documental/económica.

### Componentes comprobados estáticamente

- `Agenda.jsx` utiliza `MolsanPageHeader` y cuatro `MolsanPremiumCard` para los indicadores. Su `ModalNuevaCita` utiliza `useAccessibleDialog`, `role="dialog"` y `aria-modal="true"`.
- `EnviarANotarioModal.jsx` utiliza `useAccessibleDialog` cuando se presenta como modal independiente; su variante inline no se declara como diálogo modal.
- `LiquidarExpedienteModal.jsx` contiene dos diálogos apilables (liquidación y vista previa) y dos instancias del hook con refs independientes.
- `CarpetaDigitalModal.jsx` separa el diálogo de carpeta, el panel inline de actividad y el visor documental. El visor usa un diálogo propio cuando se abre en modo actividad.
- `FichaExpediente.jsx` tiene 9.883 líneas en el commit revisado y concentra estados de múltiples modales y formularios. No es seguro validar sus interacciones leyendo únicamente el JSX.

### Defectos de accesibilidad encontrados y corrección aplicada

1. El componente base `Modal` de `FichaExpediente.jsx` no declaraba `role="dialog"` / `aria-modal`, no tenía un ref de foco y no utilizaba el hook compartido. Se ha incorporado `useAccessibleDialog`, ref, etiqueta accesible y foco inicial/ciclo de Tab/Escape.
2. Tres overlays propios de la ficha (orden de pago, PPAD y registro de gasto dentro de Gestión económica) declaraban el diálogo, pero no tenían ciclo de foco ni gestión de Escape. Se han conectado a refs independientes y a `useAccessibleDialog`, respetando las condiciones existentes para no cerrar mientras se guarda un pago/gasto y conservando la cancelación PPAD.

Commits de corrección:
- `2b620bd`: modal base de FichaExpediente.
- `315f84c`: orden de pago, PPAD y registro de gasto.

### Pendiente de validación

- Confirmar build del commit `315f84c` y revisar cualquier fallo de CI.
- En navegador, abrir/cerrar cada modal con ratón y teclado; comprobar foco inicial, Tab/Shift+Tab, Escape, restauración del foco, backdrop y scroll.
- Probar especialmente anidamiento de vista previa de cierre y visor documental sobre sus diálogos padre.
- Verificar estados de carga, validación, error, guardado y bloqueo de cierre durante operaciones.
- No se declara completada la auditoría de modales de todos los módulos: esta pasada cubre los componentes indicados y no sustituye la matriz completa de rutas/subpáginas.

### Resultado de CI de las correcciones incrementales

El commit de código `315f84c` ha terminado con resultado correcto en los tres workflows asociados:
- `MOLSAN frontend premium build`: success.
- `Frontend dependency security audit`: success.
- `Validar Fichaje Molsan`: success.

La actualización posterior `6ca454c` solo añade esta documentación. CI correcto confirma compilación y controles automatizados disponibles; el despliegue de Preview está confirmado, pero no sustituye las pruebas interactivas en navegador.

## 12. Segunda pasada estática de las 41 hojas CSS

Se ha vuelto a recorrer el árbol Git completo de `frontend-app/src` en el commit auditado: el árbol no está truncado y devuelve exactamente **41 CSS** y **143 JSX/TSX**.

La pasada ha calculado líneas y usos de `!important` y ha comparado selectores/declaraciones en las ocho capas globales principales. Los datos confirman que la deuda no está concentrada en una sola hoja:

| Hoja | Líneas | `!important` |
|---|---:|---:|
| `MolsanRedesign2027.css` | 2.757 | 57 |
| `MolsanCanonicalVisual2027.css` | 321 | 115 |
| `molsan-design-system.css` | 952 | 40 |
| `MolsanPremium2027.css` | 1.350 | 18 |
| `MolsanGlobalConsistency2027.css` | 226 | 5 |
| `MolsanGlassLuxeUnified2027.css` | 69 | 18 |
| `MolsanCardsPremium2027.css` | 206 | 2 |
| `MolsanFase3.css` | 189 | 4 |
| `ApoderaGest.css` | 1.203 | 25 |
| `EncargaGest.css` | 830 | 72 |
| `NotarGest.css` | 741 | 2 |
| `Agenda.css` | 161 | 40 |
| `CtnListadoPage.css` | 1.519 | 3 |

El recuento de `!important` es un indicador de precedencia, no una lista automática de código eliminable. La capa Canonical tiene una densidad especialmente alta; EncargaGest y Agenda también necesitan revisión por estados y contexto, no borrado masivo.

### Colisiones entre capas globales

La comparación heurística de reglas con selector exacto y propiedad repetida en las ocho hojas globales detectó solapamientos entre:
- `.mol-sidebar-premium`: `position` y `z-index` con valores idénticos en Redesign y Design System.
- `.erp-app-shell`: `color` compartido; `background` aparece repetido y la capa Premium añade `!important`.
- `.molsan-icon-3d`: base repetida, pero no idéntica; Design System aporta color, transformación y hover, mientras Premium aporta radio, variantes cromáticas y tratamiento `bare`. No se debe borrar el bloque completo de ninguna de las dos hojas sin trasladar primero las propiedades exclusivas.
- `.molsan-premium-card::before`: Design System crea el pseudoelemento y Canonical lo neutraliza con `content:none !important`; la última capa gana por orden y prioridad.

La detección es estática y no modela por completo media queries, estados, especificidad, herencia ni estilos inline. Por eso estos casos quedan registrados como candidatos de consolidación, no como eliminaciones autorizadas.

### Decisión de esta pasada

No se ha reordenado `main.jsx` ni se han retirado capas globales: la cascada actual sí tiene dependencias verificables. La siguiente consolidación debe mover cada responsabilidad a una única hoja y retirar la regla anterior en el mismo cambio, conservando el valor computado actual y validándolo en Preview antes de continuar con la siguiente familia.

## 13. Tercera pasada de accesibilidad de modales — actualización 15:42

Se han revisado además los modales explícitos de CTN, Provisiones e Informes, junto con los componentes de empleado y traspaso de saldo.

### Correcciones de esta pasada

- `CtnDetallePage.jsx`: el diálogo de historial de firmas ahora tiene ref, foco inicial, ciclo de Tab/Shift+Tab y Escape mediante `useAccessibleDialog`.
- `ProvisionesFondosPage.jsx`: el diálogo de envío de provisión por email incorpora ref y cierre por Escape, manteniendo la misma limpieza de borrador e identificador que el botón Cerrar.
- `Informes.jsx`: el diálogo de detalle de facturación incorpora ref y gestión de foco/Escape.
- `ExpedientesListado.jsx`: la rama contiene también la migración de los diálogos de filtros y ayuda de control de plazos a refs y `useAccessibleDialog` (commit `9c2ad626`).
- `AccionesExpediente.jsx`: los dos diálogos de acciones ahora tienen refs y `useAccessibleDialog` (foco inicial, ciclo de teclado y Escape); el componente declara 2 `role=dialog`, 2 `aria-modal` y 2 hooks.

### Componentes revisados que ya disponían del hook compartido

- `ModalNuevaCita.jsx`
- `ModalCtnDetalle.jsx`
- `ModalEmpleado.jsx`
- `TraspasoSaldoPanel.jsx`
- `EnviarANotarioModal.jsx`
- `LiquidarExpedienteModal.jsx`
- `CarpetaDigitalModal.jsx`
- Portales ApoderaGest, EncargaGest y NotarGest.

### CI

La última revisión de CI corresponde al head de rama `cfd2b4c`:
- `MOLSAN frontend premium build`: success (job Vite production build).
- `Frontend dependency security audit`: success.
- `Validar Fichaje Molsan`: success.

La compilación confirma que las nuevas referencias y hooks compilan en conjunto. No confirma todavía la prueba real de teclado, backdrop, restauración del foco ni anidamiento en navegador.

### Alcance todavía abierto

Quedan por cerrar el inventario completo de modales embebidos que no declaran `role="dialog"`, las subpáginas restantes y la matriz de validación funcional. La rama está desplegada en Render Preview con commit `cfd2b4c`; la inspección visual interactiva y la regresión funcional siguen pendientes.


## 12. Limpieza adicional de reglas vacías — 6 de noviembre de 2026

La pasada de comprobación sobre las 41 hojas CSS identificó **47 bloques `@media` completamente vacíos**. Se retiraron exclusivamente esos contenedores sin declaraciones; no se eliminaron breakpoints que contuvieran reglas ni se alteró ninguna declaración activa.

Archivos afectados:
- `css/ApoderaGest.css`: 39 bloques vacíos.
- `css/MolsanRedesign2027.css`: 1.
- `css/index.css`: 1.
- `css/MolsanPremium2027.css`: 1.
- `css/CtnListadoPage.css`: 1.
- `css/DashboardCancelagest.css`: 1.
- `pages/agenda/Agenda.css`: 1.
- `pages/empleados/EmpleadoFicha.css`: 1.
- `pages/notificaciones/Notificaciones.css`: 1.

Commits de código: `43ecec9`, `96ea71e`, `2fa5ef1`, `7790be7`, `6f442d5`, `f49b8e9`, `b667804`, `d238722` y `b8394da`.

**Validación pendiente:** no hay todavía un resultado de build asociado a estos commits en la consulta disponible. La limpieza es estructural y no cambia declaraciones CSS, pero no se da por validada hasta ejecutar el build de la rama actual. Tampoco sustituye la inspección visual real de Preview ni la matriz de páginas, subpáginas y modales.


## 13. Corrección de selectores canónicos inválidos — 6 de noviembre de 2026

La inspección de reglas repetidas en `MolsanCanonicalVisual2027.css` detectó dos selectores `:where()` con una coma final antes del paréntesis (`:where(.molsan-icon-3d,.molsan-icon-wrap,)`). Esa lista no es válida y el navegador descarta la regla completa. Se han corregido ambas apariciones eliminando únicamente la coma sobrante, para que vuelvan a aplicarse la transición y el movimiento de los iconos dentro de las tarjetas.

Commit: `5a62310`.

La corrección no cambia la estructura de las tarjetas ni el comportamiento de las acciones. Queda pendiente el build y la comprobación visual del hover en Preview; se debe comprobar también el estado con `prefers-reduced-motion`.

## 14. Cuarta pasada — Expedientes, CTN y Panel Técnico

En esta pasada se cruzaron las hojas CSS con sus JSX consumidores y componentes compartidos antes de retirar reglas.

- `CtnListadoPage.css`: 23 reglas retiradas de cuatro clases sin consumidor actual (`ctn-modal-panel`, `ctn-modal-resultados` y dos clases de resumen notarial antiguo). La hoja pasa de 1.519 a 1.362 líneas; el conjunto de clases restante tiene consumidores en listado, detalle, modal CTN, pestañas de portal, importador y portales.
- `CtnDetallePage.css`: retirada una regla de metadatos sin consumidor; las 35 clases restantes aparecen en la página, el modal, las pestañas o `MolsanPageHeader`.
- `MolsanCanonicalVisual2027.css`: eliminadas siete referencias de `.accesos-notariales-resumen-card` y siete de `.ctn-detalle-info-card`, ya sin consumidores actuales.
- `ExpedientesListado.css`: retirados dos bloques `@media` vacíos y tres reglas bajo `.expedientes-listado-premium`, un root que no existe en el JSX actual. Se mantiene el sistema activo bajo `.expedientes-page`.
- `FichaExpedientePremium.css`: eliminado el bloque `ficha-dato*` (40 líneas) que no tiene consumidores en la ficha ni en sus modales; las dos clases restantes están presentes en el JSX.
- `PanelTecnico.css`: retiradas 13 reglas legacy de cabecera y monitor; queda en 24 líneas y sus clases restantes tienen consumidores en las cinco páginas técnicas.
- `SeguridadSubpaginasPremium.css`: retirado el layout `seguridad-usuarios-layout` (73 líneas) que no se usa en las páginas actuales.

### Validación de esta pasada

- La comparación estática de selectores confirma que las hojas CTN y FichaExpediente revisadas no conservan clases huérfanas en los consumidores incluidos.
- Build de la rama tras estos últimos cambios: **pendiente** (head observado: `7790be7`; Build del frontend en curso).
- Preview Render: el último deploy confirmado sigue siendo `dep-dbmve8bm8hqs73bhg0d0` / `cfd2b4c`; todavía no contiene esta última tanda de CSS.
- Producción, API y base de datos principal permanecen fuera de esta intervención.
- La revisión visual interactiva y la matriz de permisos 401/403/200 siguen pendientes; el build no las sustituye.



## 14. Cabeceras de Catálogos en pantallas estrechas — 6 de noviembre de 2026

La comparación de reglas en `MolsanCardsPremium2027.css` encontró que el bloque móvil de la cabecera de Catálogos estaba declarado antes de las reglas base posteriores. Estas últimas volvían a imponer `flex-wrap: nowrap` y `flex: 0 0 auto` en las acciones, mientras el bloque móvil solo fijaba `width: 100%`. La combinación podía mantener identidad y acciones en una sola fila y desbordar el ancho disponible.

Se ha movido la regla responsive después de las reglas base y se ha definido el apilado explícito a ≤760 px: identidad al 100%, acciones debajo alineadas a la izquierda y sin margen automático. La geometría de escritorio se conserva.

Commit: `0c18516`.

**Validación pendiente:** comprobar en Preview Catálogos, Entidades bancarias, Registros de propiedad, Municipios, Tipos de carga hipotecaria y Honorarios, en anchuras de escritorio y móvil. No se declara corregido visualmente hasta esa comprobación.


## 15. Validación automatizada tras la ronda CSS — 6 de noviembre de 2026

El commit de código `0c18516` (ajuste responsive de cabeceras de Catálogos) quedó validado por GitHub Actions:

- Workflow `Validar Fichaje Molsan`, ejecución `#3272`: job `Build del frontend` = **success**; job `Sintaxis del backend de fichajes` = **success**.
- Workflow `Frontend dependency security audit`, ejecución `#237` = **success**.
- La ejecución `MOLSAN frontend premium build` `#663` aparece como `cancelled`; no se interpreta como fallo de compilación, porque el build del frontend del workflow `#3272` sí terminó correctamente para el mismo commit de código.

El commit posterior `c8bb1d3` solo actualiza esta documentación. La validación automatizada no acredita todavía la inspección de navegador, las pruebas de modales, la matriz funcional ni el responsive visual. Render Preview no se ha desplegado desde esta rama en esta ronda; Producción, API y Supabase permanecen fuera del alcance.


## 16. Consolidación no destructiva de cabeceras de Catálogos — 6 de noviembre de 2026

Tras corregir el orden responsive, se consolidaron en `MolsanCardsPremium2027.css` los bloques base repetidos de `.molsan-page-header`, `__identity` y `__actions` de Catálogos. Las declaraciones comunes se han reunido en una única definición por selector; los breakpoints permanecen separados y después de la base para conservar la cascada. Se mantienen intactas las reglas particulares de las fichas de Catálogos y los accesos de Informes.

Commit: `eb2cefa`.

La modificación es una consolidación de declaraciones equivalentes; requiere build y verificación visual junto con la corrección responsive anterior.
