# Auditoría exhaustiva de estilos y componentes — MOLSAN ERP PREMIUM 2027

**Rama de trabajo:** `fix/molsan-css-selector-audit-round1`  
**PR:** #409 (Draft)  
**Último commit desplegado en Preview:** `ff7b1fdc599e7c36a8982f7685a9f98b47a01ba8` (incluye los cambios funcionales hasta `f9a8e2a9c7f5f51788b343566a83b8b9a5bebef8`)  
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

1. **Canonical Visual concentra 110 usos de `!important` en 298 líneas.** Es una capa de precedencia muy alta que impone cabeceras, tarjetas, botones y estados sobre clases de módulo. Debe reducirse mediante migración de consumidores y reglas semánticas, no eliminando prioridades sin sustitución.
2. **EncargaGest.css tiene 72 `!important` en 820 líneas.** Es la mayor concentración dentro de las hojas de portal/módulo examinadas. Requiere comparar sus reglas con JSX y con Canonical Visual.
3. **ApoderaGest.css contiene 2.250 líneas y 747 bloques/reglas detectados por conteo estático.** Su tamaño exige una auditoría por secciones y consumidores; no se considera obsoleto por tamaño.
4. **MolsanRedesign2027.css tiene 2.757 líneas; MolsanPremium2027.css 1.350.** Ambas hojas tienen responsabilidades que se cruzan con GlobalConsistency, Fase3, Design System y Canonical Visual. Debe decidirse qué capa conserva cada responsabilidad antes de retirar código.
5. **SeguridadSubpaginasPremium.css tiene 369 líneas** y contiene bloques repetidos de tablas, botones, controles y accesibilidad dentro de varios selectores de seguridad; candidato a consolidación local tras verificar cada subpágina.
6. **Agenda.css tiene 40 `!important` en 160 líneas.** Revisar si son realmente necesarios frente a las capas globales.
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
- `Agenda.css`: retiradas 13 reglas de iconografía KPI antigua (`agenda-stat-icon*` y `agenda-stat-label`) que ya no se renderiza; las tarjetas usan `MolsanPremiumCard`. La hoja pasa de 198 a 160 líneas y sus clases restantes tienen consumidores identificados, incluidas las vistas de mes/semana/día y `SelectSJ`.
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
| Build y despliegue Render Preview | Correctos; deploy `dep-dbmvlsqjnfac73bj64k0` en estado `live`, incluye el código `4dcd32b` |
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

## 10. Revisión incremental de modales — 6 de noviembre de 2026

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

## 11. Segunda pasada estática de las 41 hojas CSS

Se ha vuelto a recorrer el árbol Git completo de `frontend-app/src` en el commit auditado: el árbol no está truncado y devuelve exactamente **41 CSS** y **143 JSX/TSX**.

La pasada ha calculado líneas y usos de `!important` y ha comparado selectores/declaraciones en las ocho capas globales principales. Los datos confirman que la deuda no está concentrada en una sola hoja:

| Hoja | Líneas | `!important` |
|---|---:|---:|
| `MolsanRedesign2027.css` | 2.757 | 57 |
| `MolsanCanonicalVisual2027.css` | 298 | 110 |
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

## 12. Tercera pasada de accesibilidad de modales — actualización 15:42

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

Quedan por cerrar el inventario completo de modales embebidos que no declaran `role="dialog"`, las subpáginas restantes y la matriz de validación funcional. La rama está desplegada en Render Preview con commit `a82d38a` (incluye código `4dcd32b`); la inspección visual interactiva y la regresión funcional siguen pendientes.


## 13. Limpieza adicional de reglas vacías — 6 de noviembre de 2026

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


## 14. Corrección de selectores canónicos inválidos — 6 de noviembre de 2026

La inspección de reglas repetidas en `MolsanCanonicalVisual2027.css` detectó dos selectores `:where()` con una coma final antes del paréntesis (`:where(.molsan-icon-3d,.molsan-icon-wrap,)`). Esa lista no es válida y el navegador descarta la regla completa. Se han corregido ambas apariciones eliminando únicamente la coma sobrante, para que vuelvan a aplicarse la transición y el movimiento de los iconos dentro de las tarjetas.

Commit: `5a62310`.

La corrección no cambia la estructura de las tarjetas ni el comportamiento de las acciones. Queda pendiente el build y la comprobación visual del hover en Preview; se debe comprobar también el estado con `prefers-reduced-motion`.

## 15. Cuarta pasada — Expedientes, CTN y Panel Técnico

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



## 16. Cabeceras de Catálogos en pantallas estrechas — 6 de noviembre de 2026

La comparación de reglas en `MolsanCardsPremium2027.css` encontró que el bloque móvil de la cabecera de Catálogos estaba declarado antes de las reglas base posteriores. Estas últimas volvían a imponer `flex-wrap: nowrap` y `flex: 0 0 auto` en las acciones, mientras el bloque móvil solo fijaba `width: 100%`. La combinación podía mantener identidad y acciones en una sola fila y desbordar el ancho disponible.

Se ha movido la regla responsive después de las reglas base y se ha definido el apilado explícito a ≤760 px: identidad al 100%, acciones debajo alineadas a la izquierda y sin margen automático. La geometría de escritorio se conserva.

Commit: `0c18516`.

**Validación pendiente:** comprobar en Preview Catálogos, Entidades bancarias, Registros de propiedad, Municipios, Tipos de carga hipotecaria y Honorarios, en anchuras de escritorio y móvil. No se declara corregido visualmente hasta esa comprobación.


## 17. Validación automatizada tras la ronda CSS — 6 de noviembre de 2026

El commit de código `0c18516` (ajuste responsive de cabeceras de Catálogos) quedó validado por GitHub Actions:

- Workflow `Validar Fichaje Molsan`, ejecución `#3272`: job `Build del frontend` = **success**; job `Sintaxis del backend de fichajes` = **success**.
- Workflow `Frontend dependency security audit`, ejecución `#237` = **success**.
- La ejecución `MOLSAN frontend premium build` `#663` aparece como `cancelled`; no se interpreta como fallo de compilación, porque el build del frontend del workflow `#3272` sí terminó correctamente para el mismo commit de código.

El commit posterior `c8bb1d3` solo actualiza esta documentación. La validación automatizada no acredita todavía la inspección de navegador, las pruebas de modales, la matriz funcional ni el responsive visual. Render Preview sí está desplegado en esta ronda (`dep-dbmvlsqjnfac73bj64k0`, `live`); Producción, API y Supabase permanecen fuera del alcance.


## 18. Consolidación no destructiva de cabeceras de Catálogos — 6 de noviembre de 2026

Tras corregir el orden responsive, se consolidaron en `MolsanCardsPremium2027.css` los bloques base repetidos de `.molsan-page-header`, `__identity` y `__actions` de Catálogos. Las declaraciones comunes se han reunido en una única definición por selector; los breakpoints permanecen separados y después de la base para conservar la cascada. Se mantienen intactas las reglas particulares de las fichas de Catálogos y los accesos de Informes.

Commit: `eb2cefa`.

La modificación es una consolidación de declaraciones equivalentes; requiere build y verificación visual junto con la corrección responsive anterior.


## 19. Consolidación del layout del modal de EncargaGest — 6 de noviembre de 2026

La inspección de `EncargaGest.css` confirmó dos definiciones base de `.eg-modal-layout`: la segunda reemplazaba el grid-template y alineación de la primera, mientras las reglas de tablet/móvil estaban repartidas en dos bloques con los mismos breakpoints. Se consolidó la base conservando el resultado efectivo de escritorio (`0.9fr / 1.1fr`, alineación superior, scroll vertical, padding y scrollbar) y se unificaron los breakpoints de 1100 px y 650 px. Se preservaron los ajustes de overlay, altura máxima del formulario, columnas de datos/carpeta, campos y pie de acciones.

Commits: `19bff3d` (consolidación) y `e8e734b` (revisión de preservación del espaciado de tablet).

No se ha tocado JSX, handlers, permisos, envío ni guardado del modal. **Validación pendiente:** build posterior a estos commits y prueba real de alta/edición, scroll, teclado, foco y móvil/tablet en EncargaGest.


## 20. Consolidación de tarjetas KPI de administración en NotarGest — 6 de noviembre de 2026

En `NotarGest.css` se encontraron dos reglas base para `.ng-admin-kpi-button` y declaraciones repetidas para sus elementos `span`, `strong` y `small`. La segunda regla base cambiaba altura, padding, gap, radio, fondo y sombra. Se trasladó el conjunto final efectivo a la regla base inicial y se eliminaron las redefiniciones repetidas, manteniendo cursor/transición y los estilos del icono Molsan. No se ha cambiado el JSX ni la acción de los KPI.

Commit: `e3ae11a`.

**Validación pendiente:** build posterior al commit y comprobación visual del panel global y las fichas individuales por notaría, incluyendo hover, foco y móvil. Las reglas de los modales NotarGest que aparecen repetidas en distintos breakpoints se conservan hasta validar cada estado; no se han eliminado por coincidencia de selector.


## 21. Consolidación de superficies base de modales NotarGest — 6 de noviembre de 2026

Se unificaron las reglas base repetidas de `.ng-modal` / `.ng-resumen-expedientes-modal` y sus cabeceras. La segunda definición solo repetía el z-index del overlay y volvía a fijar borde, radio, sombra, fondo y borde inferior. Se trasladó el acabado final corporativo a las reglas base y se retiró el bloque duplicado. Se conserva la variante oscura específica de `.notargest .ng-modal > header` (portal profesional), que es una excepción funcional/visual distinta y no se ha neutralizado.

Commit: `9aa2115`.

No se ha modificado JSX ni el comportamiento de apertura/cierre. **Validación pendiente:** probar los modales de avisos, pagos, perfil y resumen de expedientes en el panel administrativo y el portal NotarGest, incluyendo foco, Escape, scroll y responsive.


## 22. Modal de resumen en ApoderaGest: cascada y estados responsive pendientes

La inspección de `ApoderaGest.css` localiza cuatro capas para `.ag-resumen-modal` y dos grupos de reglas de overlay: geometría inicial, scroll/overscroll, acabado corporativo y ajustes móviles. Los dos bloques móviles comparten el breakpoint de 650 px, pero el segundo sustituye el padding por valores con `env(safe-area-inset-top/bottom)` y redefine el alto máximo. La cabecera del modal también tiene una variante azul oscuro específica del portal.

No se han eliminado estas reglas por coincidencia de selector: hacerlo sin comprobar notch/safe-area, scroll del overlay, altura del viewport dinámico y cabecera del portal podría recortar el modal en móvil. Queda señalado para la prueba individual del resumen de apoderado en escritorio, tablet y móvil. Se conserva también la variante de grupo/notario, que es otro diálogo y no debe mezclarse con el resumen.

## 23. Consolidación de la capa visual canónica — 6 de noviembre de 2026

Se ha resuelto una de las colisiones globales identificadas en la auditoría:

- `molsan-design-system.css` vuelve a ser el único propietario del componente `MolsanPremiumCard`: geometría, franja superior única de 4px, hover, foco y título. Se ha eliminado el pseudoelemento interior que duplicaba la franja.
- `MolsanCanonicalVisual2027.css` deja de sobrescribir el componente `MolsanPremiumCard`; se mantiene como capa de compatibilidad para tarjetas legacy que aún no usan el componente.
- `MolsanPremium2027.css` pasa a ser el único propietario del acabado base y hover de `MolsanIcon`; se han retirado sus reglas base duplicadas de `molsan-design-system.css`.
- `MolsanRedesign2027.css` deja de repetir `color/background` de `.erp-app-shell` y `position/z-index` de `.mol-sidebar-premium`; conserva únicamente sus responsabilidades visuales propias.

La capa Canonical reduce sus `!important` de 115 a 110 en esta pasada. El resultado conserva el acento superior, el movimiento sutil de tarjeta y la iconografía Molsan.

### Validación

- Commit de código: `cdd387b`.
- `Build del frontend`: success.
- `Vite production build`: success.
- `Sintaxis del backend de fichajes`: success.
- `Frontend dependency security audit`: success.
- Render Preview contiene esta consolidación en el deploy live `dep-dbmvlsqjnfac73bj64k0`.
- La inspección visual interactiva y las pruebas de foco/hover en navegador siguen pendientes.



## 24. Validación completa del commit desplegado en Preview — 6 de noviembre de 2026

El commit de código `cdd387b` (consolidación de la capa canónica de tarjetas e iconos) tiene las tres comprobaciones automatizadas en **success**:

- `MOLSAN frontend premium build` #699: success.
- `Validar Fichaje Molsan` #3289: success.
- `Frontend dependency security audit` #254: success.

Render confirma el deploy `dep-dbmvkg6gekts73ej1ktg` en estado `live`, con el commit `cdd387b`. El HEAD del PR es `7a7c71a`, un commit posterior únicamente documental; por tanto, el código desplegado corresponde al último commit funcional de esta ronda. No se ha desplegado Producción ni la API.

La URL de Preview responde como servicio desplegado según Render, pero la lectura web automatizada no puede acceder a la aplicación para una inspección visual autenticada. La validación visual de páginas, subpáginas, estados y modales sigue siendo manual y no se declara completada.

## 25. Barrido de cabeceras legacy y diálogos embebidos — 6 de noviembre de 2026

### Cabeceras de Catálogos

Se ha buscado `catalogos-subpage-header` en los **98 archivos de página** y los **37 componentes JSX/TSX** inventariados. No hay consumidores. Se retiró el bloque legacy completo de `MolsanCardsPremium2027.css` (83 líneas), conservando las reglas activas de `catalogos-premium-page .molsan-page-header` y su responsive.

Commit: `1c32921`.

### Diálogos y foco

La pasada de los 98 archivos de página y 37 componentes detectó overlays con apertura/cierre propios que no tenían ciclo de foco ni Escape. Se han incorporado refs y `useAccessibleDialog` en 31 instancias de diálogo repartidas entre:
- FichaExpediente (modal base, orden de pago, PPAD y gasto).
- CTN, Provisiones e Informes.
- Selector de módulos, Control de Apoderados, Catálogo ABSIS (dos), Tipos de expediente y Mensajería (dos).
- Empleados, Acciones de expediente (dos), Control de Fichajes, Tipos de carga hipotecaria, Tipos de concepto de gastos y Auditoría de Seguridad.
- Entidades bancarias (dos), Municipios (dos), Registros de la Propiedad (dos) y Oficinas Liquidadoras (dos).
- ExpedientesListado (filtros y ayuda de plazos, migración previa de la rama).

Los componentes de diálogo compartidos de Agenda, CTN, Empleados y Expedientes que ya utilizaban el hook se han mantenido. Se han añadido nombres accesibles a los diálogos que no tenían `aria-label` o `aria-labelledby`. No se han modificado las operaciones de negocio ni las llamadas de API.

### Consolidación de capas visuales

- `MolsanIcon`: la base, hover, sombra SVG y variante `prefers-reduced-motion` se concentran en `MolsanPremium2027.css`; se elimina la definición duplicada de `molsan-design-system.css`.
- `MolsanPremiumCard`: se retiran sus overrides de `MolsanCanonicalVisual2027.css`; el componente vuelve a gobernarse por su bloque único en Design System (franja superior de 4 px, icono, título y hover).
- `EncargaGest.css`: se consolidó la estructura base del modal y se mantuvieron expresamente los breakpoints de 1100 y 650 px, incluido el padding del overlay y el alto disponible en tablet.
- `NotarGest.css`: se consolidaron las reglas KPI y la superficie base de modales, conservando la variante oscura específica del portal profesional.
- `MolsanCardsPremium2027.css`: se consolidaron las reglas de cabecera de Catálogos y se retiró el bloque legacy sin consumidores.

### Build y Preview

- Rama: `fix/molsan-css-selector-audit-round1`.
- Último commit de código de esta pasada: `90cb639` (guardado de cita/teclado en Agenda); HEAD documental actual: `2c5d7a8`.
- `MOLSAN frontend premium build` #699, `Frontend dependency security audit` #254 y `Validar Fichaje Molsan` #3289: success para el commit canónico `cdd387b`.
- Render Preview `molsan-premium-2027-candidate-preview`: deploy live `dep-dbmvmq5bedkc73dknrf0`, commit `095efb9`, que incluye el código `90cb639`; auto-deploy permanece desactivado.

Producción, API y base de datos principal no forman parte de estos cambios. El workflow separado `supabase-schema-audit` sigue apareciendo como fallo; se ha limitado su paso de commit de migración a la rama `release/molsan-premium-2027-candidate`, por lo que esta rama de auditoría no puede escribir una migración Supabase.

### Validación todavía pendiente

El build y el deploy no sustituyen la comprobación visual y funcional. Falta probar en navegador: foco inicial, Tab/Shift+Tab, Escape, restauración del foco, backdrop, scroll, responsive y estados de carga/error/guardado de cada modal; además de revisar permisos 401/403/200 y completar la matriz de todas las subpáginas. No se declara finalizada la auditoría completa.


## 26. Corrección funcional del diálogo de grupo en ApoderaGest — 6 de noviembre de 2026

La revisión conjunta de JSX, estado y modal encontró un desacoplamiento real: `abierto` se calculaba desde `grupoEncargosAbierto`, pero el botón escribía en `abiertos[grupo.clave]`. Por ello el estado que controlaba el render del portal no cambiaba y el diálogo de grupo no podía abrirse correctamente.

Corrección aplicada en `ApoderaGest.jsx`:
- El botón del grupo ahora establece `grupoEncargosAbierto` con la clave seleccionada o `null` al alternar.
- El cierre por backdrop y el botón Cerrar usan el mismo estado.
- `useAccessibleDialog` queda como propietario único de Escape, trampa de foco y restauración del foco.
- Se eliminan dos listeners manuales de Escape que duplicaban o intentaban limpiar claves de grupo que ya no controlan el diálogo.
- `abiertos` se mantiene separado para las filas de detalle expandidas dentro del diálogo.

Commits: `986b079`, `3559730` y `4dcd32b`.

**Validación pendiente:** build del HEAD actual y prueba real de abrir/cerrar grupo, backdrop, Escape, ciclo Tab/Shift+Tab, restauración del foco y apertura de resumen. El commit desplegado anteriormente en Preview (`cdd387b`) todavía no incluye esta corrección; requiere nuevo despliegue de Preview.


## 27. Revisión de estados de diálogo en FichaExpediente — 6 de noviembre de 2026

La inspección estática de `FichaExpediente.jsx` (9.924 líneas) confirma que:

- El wrapper `Modal` usa `useAccessibleDialog` y aplica `role=dialog`, `aria-modal` y referencias de foco.
- Los diálogos propios de orden de pago, PPAD y registro de gasto tienen refs y llamadas explícitas a `useAccessibleDialog`; sus condiciones `open` coinciden con las condiciones de render.
- Los componentes separados `EnviarANotarioModal`, `LiquidarExpedienteModal` y `CarpetaDigitalModal` se mantienen como propietarios de sus propios estados; deben verificarse en sus archivos respectivos antes de modificar sus capas visuales.
- El panel de solicitud de complemento de saldo es una expansión inline dentro de Gestión económica, no un modal de bloqueo; no se fuerza `aria-modal` ni trampa de foco sobre él.

No se modifica FichaExpediente en esta pasada porque la estructura de sus diálogos propios está correctamente conectada en el JSX revisado. La validación final sigue requiriendo abrir cada diálogo, comprobar Escape/Tab/Shift+Tab, backdrop, foco restaurado, scroll y responsive en Preview.


## 28. Despliegue de la corrección de estado de ApoderaGest — 6 de noviembre de 2026

La corrección del diálogo de grupo y la retirada de los listeners duplicados se incluyeron en el commit `a82d38a`. Render completó el despliegue `dep-dbmvlsqjnfac73bj64k0` con estado `live` sobre el servicio `molsan-premium-2027-candidate-preview`. El Preview ya contiene el cambio funcional de ApoderaGest y las consolidaciones CSS anteriores.

El HEAD del PR añade después documentación de auditoría, sin cambios adicionales de código. Producción y API siguen intactas. Pendiente únicamente la prueba visual/funcional autenticada en navegador; el deploy live por sí solo no acredita foco real, comportamiento de teclado ni responsive.


## 29. Componentes modales propios de FichaExpediente — 6 de noviembre de 2026

Se revisaron también los tres componentes externos usados por la ficha:

- `EnviarANotarioModal.jsx`: usa `useAccessibleDialog` para la variante modal; la variante `inline` no declara `aria-modal` ni se trata como diálogo bloqueante.
- `LiquidarExpedienteModal.jsx`: usa un diálogo principal y un diálogo de vista previa anidado con refs independientes. `useAccessibleDialog` prioriza el diálogo superior para Escape y Tab.
- `CarpetaDigitalModal.jsx`: distingue la carpeta modal de su uso en modo actividad inline y activa un segundo diálogo accesible para el visor de documento.

No se modifican estos componentes en esta ronda porque sus condiciones de apertura y sus refs están conectadas a `useAccessibleDialog`. La comprobación visual debe validar especialmente el apilamiento de visor/preview sobre el modal principal, la restauración de foco al cerrar cada capa y que la variante inline no bloquee la pantalla.


## 30. Modal de cita de Agenda: Escape y guardado — 6 de noviembre de 2026

La revisión de `ModalNuevaCita.jsx` detectó un listener manual de Escape duplicado con `useAccessibleDialog`. El listener manual respetaba `loading`, pero el hook recibía directamente `onClose`, por lo que Escape podía cerrar el modal mientras se guardaba la cita. El backdrop y el botón de cierre ya estaban bloqueados durante el guardado.

Se ha pasado la misma condición al callback de `useAccessibleDialog` (`if (!loading) onClose?.()`) y se ha eliminado el listener manual. Se conserva el ciclo de foco/Tab del hook y el bloqueo de cierre durante el guardado.

Commit: `90cb639`.

**Validación pendiente:** probar crear/editar cita, Escape mientras guarda, Escape en reposo, backdrop, foco restaurado y navegación Tab/Shift+Tab en Preview.


## 31. Cobertura de diálogos en módulos operativos — 6 de noviembre de 2026

Se contrastaron los estados de render y los refs de los diálogos en seis módulos adicionales:

- `CtnDetallePage.jsx`: modal de firmas conectado a `modalAbierto` y `useAccessibleDialog`.
- `SeguridadAuditoria.jsx`: detalle de registro conectado a `Boolean(registro)` y su ref.
- `MensajeriaMolsan.jsx`: diálogo conectado a `Boolean(modal)`.
- `ProvisionesFondosPage.jsx`: borrador de correo conectado a `Boolean(emailDraft)`.
- `AccionesExpediente.jsx`: diálogo de acción e importación con refs y callbacks separados.
- `Agenda.jsx` / `ModalNuevaCita.jsx`: diálogo con foco gestionado por el hook; corregido el cierre por Escape durante el guardado.

En los cinco primeros no se detectó un desacoplamiento entre el estado que abre el modal y la condición de render en la inspección estática. No se han alterado porque la conexión de estado/ref es coherente. La comprobación de teclado, backdrop, scroll y foco restaurado sigue pendiente en navegador.
## 32. Estado consolidado de la rama y colisiones resueltas — 6 de noviembre de 2026

- `molsan-design-system.css` es ahora el único propietario del componente `MolsanPremiumCard`: franja superior única, hover, foco y título. `MolsanCanonicalVisual2027.css` ya no lo sobrescribe.
- `MolsanPremium2027.css` es el único propietario del acabado base de `MolsanIcon`; se retiró la base duplicada de `molsan-design-system.css`.
- `MolsanRedesign2027.css` ya no duplica `position/z-index` de `.mol-sidebar-premium` ni `color/background` de `.erp-app-shell`.
- Canonical conserva 110 `!important` (antes 115); no se eliminan más sin validar especificidad y comportamiento de las páginas legacy.
- El listener Escape manual de grupos de ApoderaGest se eliminó; `useAccessibleDialog` controla Escape para el diálogo real. La corrección del estado de apertura/cierre del grupo está en `4dcd32b`.
- En Agenda, Escape queda bloqueado durante el guardado de la cita; el hook accesible es el único propietario del cierre por teclado (`90cb639`).
- Render Preview está `live` en `dep-dbmvmq5bedkc73dknrf0`, commit `095efb9`, que incluye el código `90cb639`; auto-deploy sigue desactivado.
- PR #409 sigue en Draft y sin merge. Producción, API y base de datos principal no se han tocado.
- GitHub Actions pasó en el commit canónico `cdd387b` y Render completó correctamente el build/despliegue del código posterior de Agenda en `095efb9`.
- Pendiente: revisión visual autenticada en navegador, responsive real, prueba de foco/Tab/Shift+Tab/Escape/backdrop de cada modal, matriz de permisos 401/403/200 y regresión funcional por módulo. No se declara finalizada la auditoría global.


## 33. Cobertura adicional de modales en Informes, Empleados, Fichajes, Mensajería y Catálogos — 6 de noviembre de 2026

Se revisaron las condiciones de apertura, refs y cierres en:

- `Informes.jsx`: modal de facturación conectado a `modalAbierto` y `modalFacturacionRef`.
- `EmpleadosListado.jsx`: alta de empleado conectada a `mostrarNuevo` y `nuevoEmpleadoDialogRef`.
- `ControlFichajesAdmin.jsx`: editor conectado a `Boolean(editor)`.
- `MensajeriaSolicitudes.jsx`: detalle conectado a `Boolean(seleccionada)`.
- `EntidadesBancarias.jsx`: importación y edición/alta con refs independientes; los cierres respetan los estados `importando` y `guardando`.
- `TiposExpediente.jsx`: diálogo conectado a `mostrarModal` y `tipoDialogRef`.

En la inspección estática no se detectó desacoplamiento entre el estado que controla cada diálogo y su render. No se han modificado estos archivos; quedan pendientes las pruebas de interacción y responsive en Preview.


## 22. Segunda pasada focalizada: Catálogos, EncargaGest y NotarGest — 6 de noviembre de 2026

### Catálogos y fichas maestras

Se inspeccionó `CatalogosMaestrosPremium.css` junto con `MolsanCardsPremium2027.css`. No se encontraron bloques vacíos ni reglas base duplicadas que pudieran retirarse con seguridad. Las dos repeticiones de selectores de tabla/diálogo en `CatalogosMaestrosPremium.css` son aditivas y responsive: la base establece estructura y el media query añade scroll horizontal/ancho máximo. Las repeticiones de identidad y acciones en `MolsanCardsPremium2027.css` son overrides intencionados a ≤760 px para apilar cabecera y botones. Se conservan.

### EncargaGest

Se retiraron un selector vacío `.encargagest .eg-panel-head {}` y una redefinición de `min-width:0` en `.encargagest .eg-main` que ya estaba en la regla base. Se revisó la capa final de estilos exclusivos trasladados: las coincidencias restantes afectan al modal de perfil, breakpoints de 600/760 px, superficie de paneles, cabecera y overlays; no se borran en bloque porque parte de ellas son overrides con distinta especificidad o corresponden a la ficha de perfil y al formulario principal, que son diálogos distintos.

Commits: `abcd2b2`, `75e45ac` y `e479aaa`. La segunda consolidación integra la superficie del panel en una sola regla, retira el bloque duplicado de cabecera del panel y unifica el overlay del modal con su valor final de blur (incluido el prefijo WebKit). Se ha eliminado también una repetición exacta del color de títulos de modal.

### NotarGest

Se consolidaron las reglas duplicadas de las tarjetas KPI y las fichas del directorio por notaría:
- `.ng-admin-notarias .ng-admin-kpi-button`: ancho, apariencia y altura se integran en la definición principal; se elimina la redefinición repetida.
- `.ng-admin-notarias .ng-admin-kpi-button > strong`: el margen inferior se integra en una sola regla.
- `.ng-admin-notaria-card`: superficie, borde, radio y sombra se integran con su layout original.
- `.ng-admin-notaria-icono`: se integra la dimensión final de 54 px y su acabado en una sola definición.

Se mantienen los overrides de responsive (incluido el KPI a 150 px en móvil), porque cambian deliberadamente el tamaño y la distribución. No se modificó JSX, selección de notaría, filtros ni navegación.

Commits: `9a5a9a0` y `256fa92`.

### Resultado de esta pasada

- En `CatalogosMaestrosPremium.css` se retiró el selector `.tipos-carga-hipotecaria-premium` de sus siete listas: no aparece en el JSX de `TiposCargaHipotecaria.jsx`, que usa `.catalogo-maestro-page-premium`, ni en la búsqueda de código del repositorio. Se conserva el wrapper que sí utiliza la página.
- Commit adicional: `7e7a9db`.
- No quedan selectores vacíos en estas cuatro hojas inspeccionadas (`CatalogosMaestrosPremium.css`, `MolsanCardsPremium2027.css`, `EncargaGest.css` y `NotarGest.css`).
- Las coincidencias de selectores que permanecen se han clasificado como responsive, variantes de modal/perfil o reglas con distinta especificidad; no se consideran duplicados eliminables sin pruebas de navegador.
- **Validación pendiente:** ejecutar build sobre los commits de esta pasada y revisar visualmente Catálogos (incluidas fichas), EncargaGest y NotarGest en Preview, con escritorio/tablet/móvil y modales abiertos.


## 23. Validación de la segunda pasada y despliegue de Preview — 6 de noviembre de 2026

Para el commit funcional `7e7a9db` (limpieza de EncargaGest/NotarGest y retirada del selector de Catálogos sin uso):

- `Validar Fichaje Molsan` #3320: **success**, incluyendo compilación del frontend y sintaxis del backend de fichajes.
- `Frontend dependency security audit` #285: **success**.
- `MOLSAN frontend premium build` #763: el job volvió a cancelarse por concurrencia incluso tras repetirlo. La compilación del frontend sí quedó confirmada como correcta en `Validar Fichaje Molsan` #3320, con el mismo commit funcional.
- Render Preview: despliegue manual `dep-dbmvqquc6qcc73cmnt8g` finalizado en estado **live**, desde el HEAD documental `0884cf2`, que contiene el código validado `7e7a9db`.

El workflow `.github/workflows/supabase-schema-audit.yml` registró un fallo en este push, aunque no se ha cambiado ningún fichero de Supabase, esquema, API ni datos en esta pasada. No se atribuye a la limpieza CSS ni se presenta como validación satisfactoria; queda fuera de alcance y requiere diagnóstico separado si persiste.

La validación automatizada no sustituye la comprobación visual autenticada de Catálogos, EncargaGest y NotarGest en Preview (incluidos submódulos, fichas, estados de modal y breakpoints).

## 24. Segunda depuración de selectores sin consumidores — 6 de noviembre de 2026

Se ha contrastado el uso de las siguientes clases en los 98 archivos de página y 37 componentes JSX/TSX. No hay referencias en los consumidores activos:

- `.ag-card`, `.eg-card`, `.eg-directorio-card`
- `.expediente-card`, `.dashboard-card`
- `.ng-contador`, `.ng-tarea`, `.ng-acceso`, `.ng-contadores`

Se han retirado de las listas de superficie de `MolsanCanonicalVisual2027.css` y `MolsanRedesign2027.css`. Se mantienen las clases activas `.ag-kpi`, `.eg-kpi`, `.ng-admin-kpi-button`, `.ng-admin-notaria-card`, `.ctn-modal-resumen-firmas`, `.ctn-detalle-stat`, `.stat-card`, `.kpi-card`, `.agenda-upcoming-card`, `.ctn-portal-card`, `.ctn-portal-field-card` y `.seguridad-acceso`, contrastadas con sus consumidores.

La limpieza anterior dejó una coma doble en las listas de Canonical; se detectó antes de cerrar y se corrigió. Se ha repetido una comprobación estática de balance de llaves, comas dobles y comas finales en las cinco hojas modificadas principales (`MolsanCanonicalVisual2027.css`, `MolsanRedesign2027.css`, `EncargaGest.css`, `MolsanCardsPremium2027.css` y `NotarGest.css`): sin anomalías detectadas.

Commits de esta pasada: `f813d0b`, `3bdc64a`, `813ea20`, `f239d47`, `cb0bbb3` y `ac9dfd0`.

### Validación

- Head de código comprobado: `337d5a4`.
- `MOLSAN frontend premium build`: success.
- `Frontend dependency security audit`: success.
- `Validar Fichaje Molsan`: success (sintaxis backend y build frontend).
- Preview sigue live en `0884cf2`; la rama tiene cambios CSS posteriores todavía no publicados en Preview. No se ha activado producción ni se ha cambiado la base de datos.

La comprobación visual autenticada y la regresión de teclado/responsive de los modales siguen pendientes; por tanto, esta limpieza está validada por build y análisis estático, no por inspección visual completa.


## 25. Alineación de cabeceras de Catálogos con el patrón canónico — 6 de noviembre de 2026

En `MolsanCardsPremium2027.css` se ha reducido la responsabilidad local de la cabecera de Catálogos. Se han retirado las declaraciones de altura, padding, radio, margen, anchura y wrapping que duplicaban la geometría de `MolsanCanonicalVisual2027.css`. La hoja de Catálogos conserva únicamente su distribución interna específica (identidad a la izquierda, acciones a la derecha y separación entre ambas), además del ajuste responsive que apila identidad y acciones en pantallas estrechas.

La referencia visual de tarjetas queda en el componente `MolsanPremiumCard` y su definición estructural en `molsan-design-system.css`: una sola franja superior, icono corporativo integrado, título y descripción dentro de la tarjeta, contenido separado y hover cromático sutil. No se ha añadido otra capa global ni se han inferido tarjetas a partir de utilidades Tailwind.

- Commit: `7b822fc` (cabecera) y `ea2d59a` (tarjetas).
- Se retiraron también dos overrides locales de `.erp-card`: el radio de 20 px repetía exactamente `--molsan-canon-card-radius: 20px`, y el hover duplicaba un `transform` ya impuesto por la capa canónica con prioridad. Catálogos hereda ahora ambas propiedades del mismo sistema que el resto del ERP.
- Alcance: CSS de presentación; sin cambios JSX, datos, permisos, API, Supabase ni producción.
- Pendiente: comprobar Catálogos en Preview en escritorio/tablet/móvil y validar visualmente que las acciones no se desbordan; la compilación y la revisión de cascada de esta modificación aún no se han ejecutado.


## 26. Cobertura de tarjetas KPI de EncargaGest y NotarGest — 6 de noviembre de 2026

Se ha detectado una omisión en las listas de superficies de `MolsanCanonicalVisual2027.css`: aunque `.eg-kpi`, `.ng-dashboard-kpi` y `.ng-kpi-card` seguían teniendo consumidores activos, no estaban incluidos en todas las reglas comunes de superficie, hover, iconografía y movimiento reducido.

Se han incorporado esos tres selectores a las siete listas canónicas correspondientes. Así reciben el mismo borde, franja superior, radio, sombra, elevación y respuesta de hover que las tarjetas KPI equivalentes, sin tocar su JSX ni sus reglas de contenido específicas.

Comprobación estática posterior:
- Llaves CSS equilibradas: 41 aperturas y 41 cierres.
- Los tres selectores aparecen en las listas de superficie/interacción previstas.
- No se han modificado páginas, lógica de negocio, permisos, API, Supabase, datos ni producción.
- Commit: `2136abf3290513eb327ca7fcd44f9bd9ea8592a7`.

La comprobación estática no sustituye el build ni la inspección visual autenticada en Preview. Sigue pendiente revisar estos KPI en escritorio, tablet y móvil, junto con los modales de los módulos afectados.

## 27. ApoderaGest — consolidación de KPI y cascada responsive (6 de noviembre de 2026)

- Retiradas dos declaraciones anteriores de `.ag-kpi` que quedaban completamente sobrescritas por la regla específica final del portal.
- La superficie visual (borde, franja superior, fondo, relieve y hover) continúa siendo propiedad de `MolsanCanonicalVisual2027.css`; `ApoderaGest.css` conserva únicamente la estructura y las dimensiones propias de sus KPI.
- Corregida la cascada: la regla base final anulaba las alturas responsive declaradas antes. Se restablecen 138 px hasta 760 px y 126 px hasta 480 px, con la regla estrecha aplicada después de la general.
- Verificación estática posterior: 281 llaves de apertura y 281 de cierre; las declaraciones estructurales de KPI permanecen y no se alteran selectores de impresión, formularios ni modales.
- Pendiente: build/CI y comprobación visual autenticada en Preview, especialmente en 760 px y 480 px.

## 28. FichaExpediente — cierre de Gestión económica (6 de noviembre de 2026)

- Corregido un cierre JSX prematuro que aparecía antes del bloque «Movimientos de la provisión».
- Los movimientos, avisos y controles de gasto vuelven a quedar dentro de la condición y de la sección de la actividad «Gestión económica».
- Se conserva el cierre original de la sección y de la condición en su ubicación final; no se modifica el cálculo del saldo ni la confirmación de pagos.
- La compilación anterior había emitido un aviso de esbuild en esta línea. Se comprobará su desaparición en el siguiente build de Preview.

## 29. NotarGest — migración de KPI administrativos al componente compartido (6 de noviembre de 2026)

- Las diez tarjetas de resumen global (encargos, firmas, copias, facturas, fiscalidad, registro, defectos e inscripciones) pasan del botón artesanal `.ng-admin-kpi-button` a `MolsanStatCard`.
- Se conserva la interacción: cada tarjeta sigue abriendo el mismo resumen filtrado de expedientes. Se mantiene el tono de alerta ámbar cuando existen defectos o firmas urgentes.
- Retiradas de `NotarGest.css` las reglas de superficie, icono, tipografía, hover y alturas específicas que pertenecían al botón antiguo y que ya no tienen consumidores.
- Se conservan las reglas de cuadrícula y los breakpoints del panel administrativo; no se cambian los datos, los filtros ni la navegación.
- Verificación estática: no quedan referencias a `.ng-admin-kpi-button` en la hoja local y sus llaves están equilibradas (287/287).
- Pendiente: build/CI y revisión visual autenticada en Preview de la cuadrícula global y sus variantes responsive.

## 30. NotarGest — retirada de selectores KPI globales heredados (6 de noviembre de 2026)

- Eliminadas las ocho referencias al selector retirado `.ng-admin-kpi-button` de `MolsanCanonicalVisual2027.css`.
- La tarjeta `MolsanStatCard` conserva su propia franja superior y microinteracciones; se evita que el sistema canónico le suprima el pseudoelemento o le aplique estilos de un componente ya eliminado.
- No se han modificado las reglas globales de las tarjetas de dashboard que siguen teniendo consumidores.
- Verificación estática: 41/41 llaves equilibradas en la hoja canónica.
- Ajuste de sintaxis posterior: al retirar el último selector se eliminó también la coma final de la lista `::before`; se volverá a validar la minificación CSS en el despliegue siguiente.

## 31. ApoderaGest — retirada de estilos KPI locales ya sustituidos (6 de noviembre de 2026)

- Confirmado que `TarjetaIndicador` ya delega la representación en `MolsanStatCard`; se retiraron de sus llamadas cuatro props de variante que no se consumían.
- Eliminadas de `ApoderaGest.css` las reglas antiguas de `.ag-kpi` y sus cuatro variantes cromáticas, así como las alturas y paddings que ya no se aplicaban al DOM.
- Las alturas responsive se han trasladado al selector real `.molsan-stat-card`: 138 px hasta 760 px y 126 px hasta 480 px. Se conserva `.ag-grid-kpi` porque sigue controlando la distribución de la cuadrícula.
- Verificación estática: no quedan selectores locales `.ag-kpi` obsoletos; 269/269 llaves equilibradas.
- Los cuatro KPI de ApoderaGest y los cinco KPI de EncargaGest usan el componente compartido; no se cambian sus valores ni acciones.

## 32. EncargaGest y NotarGest — cobertura de accesibilidad de diálogos (6 de noviembre de 2026)

- EncargaGest: 5 diálogos con `role="dialog"` y `aria-modal="true"`; los cinco disponen de ref y llamada a `useAccessibleDialog`.
- NotarGest: 4 diálogos con `role="dialog"` y `aria-modal="true"`; los cuatro disponen de ref y llamada al mismo hook.
- El hook implementa cierre por Escape, contención del foco con Tab/Mayús+Tab, devolución del foco al elemento previo al cerrar y prioridad del diálogo superior cuando hay anidamiento.
- Verificación CSS: NotarGest limita la altura de los modales al viewport y los adapta a ancho completo en móvil; EncargaGest reorganiza el formulario a una columna, reduce paddings y adapta el footer en pantallas estrechas.
- Alcance: comprobación estática de código y estilos. La prueba manual de teclado, lector de pantalla y viewport real en Preview sigue pendiente.

## 33. Consolidación de cascada global y cabeceras compartidas (6 de noviembre de 2026)

- `main.jsx` importa las capas en orden explícito: tokens, design system, estilos de módulos, Redesign/Premium, compatibilidad de tarjetas, consistencia global, Glass Luxe y Canonical Visual al final. Se mantiene la capa canónica como última autoridad visual.
- Confirmado que la cabecera `MolsanPageHeader` es utilizada en las páginas revisadas de Agenda, Catálogos/Utilidades, Informes, CTN, Expedientes, Empleados, Provisiones, Panel Técnico, Maestros, Seguridad, Notificaciones, Logs, Mensajería y Cancelagest.
- Agenda conserva una variante de color propia en su cabecera, pero no redefine la geometría compartida; se mantienen sus controles de calendario como excepción funcional.
- Eliminada una segunda regla idéntica de `backdrop-filter: none` aplicada a paneles de los portales en `MolsanRedesign2027.css`. La regla base equivalente permanece en su ubicación anterior, sin cambiar la cascada efectiva.
- Verificación estática de las seis capas globales: no se detectan bloques con selector y declaraciones idénticos repetidos. Las redefiniciones con diferencias de estado, breakpoint o contexto se mantienen para no eliminar comportamiento intencionado.
- Validación de la hoja modificada: 194/194 llaves equilibradas. Build frontend, validación de fichaje y auditoría de dependencias: success en el commit de esta pasada.

## 34. Retirada de selectores KPI obsoletos de portales (6 de noviembre de 2026)

- Tras migrar los KPI de ApoderaGest y EncargaGest a `MolsanStatCard`, se contrastaron los JSX de ambos portales y sus hojas locales: ya no consumen las clases antiguas `.ag-kpi` ni `.eg-kpi`.
- Retiradas esas clases de los grupos visuales de `MolsanCanonicalVisual2027.css`, incluida la regla pseudo-elemento que aún afectaba a `.ag-kpi`.
- Retiradas las referencias residuales de `MolsanRedesign2027.css`, tanto el tratamiento de fondo como la regla de movimiento reducido. Se mantienen intactos `.ag-panel`, `.eg-panel`, `.eg-modal-section` y las reglas de distribución/responsive.
- Verificación estática posterior: ambas hojas conservan sus llaves equilibradas (CanonicalVisual: 41/41; Redesign: 194/194) y no quedan referencias a `.ag-kpi` ni `.eg-kpi` en ellas.
- No se han eliminado las clases KPI de NotarGest ni las clases de tarjetas compartidas; sus usos requieren tratamiento separado.

## 35. Retirada de KPI heredados de NotarGest (6 de noviembre de 2026)

- Verificados los JSX y CSS propios de NotarGest: los antiguos selectores `.ng-dashboard-kpi` y `.ng-kpi-card` ya no tienen consumidores tras la migración de los indicadores a `MolsanStatCard`.
- Eliminados ambos selectores de los grupos visuales, estados hover/focus y movimiento reducido de `MolsanCanonicalVisual2027.css`; también se retiró el pseudoelemento que duplicaba la franja superior de las tarjetas.
- Se conserva `.ng-admin-notaria-card`, que sí corresponde a las tarjetas de selección de notaría y sigue en uso.
- Verificación estática de la hoja tras la limpieza: 40/40 llaves equilibradas y cero referencias a los dos selectores retirados.

## 36. Auditoría de accesibilidad y responsive de modales: CTN, FichaExpediente y Acciones (6 de noviembre de 2026)

- `ModalCtnDetalle.jsx`: un diálogo con `role=dialog`, `aria-modal=true`, referencia de foco y `useAccessibleDialog`. La hoja CTN adapta overlay, padding, secciones, tablas y pie a 760/440/420 px; mantiene scroll vertical y desplazamiento horizontal de tablas.
- `FichaExpediente.jsx`: cuatro diálogos (modal base, orden de pago, PPAD y registro de gasto); los cuatro tienen `role=dialog` y `aria-modal=true`. El modal base usa su propio hook y los otros tres tienen refs y llamadas independientes a `useAccessibleDialog`, con cierres condicionados durante guardados.
- `AccionesExpediente.jsx`: dos diálogos (crear/editar acción e importar acciones), ambos con atributos ARIA, refs y hook independiente.
- `CtnListadoPage.jsx` y `Agenda.jsx` no declaran diálogos propios en el JSX revisado; CTN delega la ficha a `ModalCtnDetalle`.
- Resultado estático: 7 diálogos revisados en estos tres flujos, todos con marcado modal accesible y contención/restauración de foco centralizada. La verificación real con teclado, lector de pantalla y viewports físicos sigue pendiente; no se considera prueba manual.

## 37. CancelaGest — migración de indicadores al componente compartido (6 de noviembre de 2026)

- Los cuatro indicadores del dashboard (cancelaciones registradas, firmas realizadas, con provisión y sin provisión) se han migrado de `.cg-kpi` artesanal a `MolsanStatCard`.
- Se mantienen los mismos datos, formatos y textos; no se añaden acciones ni cambios de navegación. Cada indicador utiliza un icono Molsan y un tono semántico.
- `Cancelagest.css` conserva la cuadrícula `.cg-kpis` y sus breakpoints, pero elimina tipografía, padding y superficies locales de la tarjeta que ahora pertenecen al componente compartido.
- Retirado `.cg-kpi` de las reglas canónicas de tarjeta, hover, iconografía y movimiento reducido; `.cg-module-card` y los paneles/gráficos propios permanecen intactos.
- Verificación estática: cero referencias a `.cg-kpi` en JSX/CSS de CancelaGest y 40/40 llaves equilibradas en CanonicalVisual. Render Preview construyó correctamente los 299 módulos y el despliegue del commit `e72f284` está `LIVE`; permanece el aviso no bloqueante de importación doble de Notificaciones.

## 38. Fusiones — migración de indicadores y eliminación de iconos locales (6 de noviembre de 2026)

- Los seis filtros KPI de Fusiones pasan del componente artesanal `Indicador` a `MolsanStatCard`. Se conserva el filtrado por estado, el contador y la posibilidad de desactivar el filtro al pulsar de nuevo.
- Se mantiene una clase `is-active` con estilo local discreto para que el estado seleccionado siga siendo visible; la estructura, icono, franja superior, tipografía y hover pertenecen al componente compartido.
- Se elimina el componente SVG local `Icon`; los pictogramas de búsqueda y estado vacío pasan a `MolsanIcon`.
- Se añade el scope `fusiones-page` al contenedor raíz para activar los estilos locales de página y el estado seleccionado.
- No se cambian llamadas a API, filtros, datos, navegación ni estados de solicitudes. Render Preview construyó correctamente los 299 módulos y el despliegue del commit `5cccd4c` está `LIVE`; la revisión visual responsive de los seis filtros sigue pendiente.

## 39. Provisiones — iconografía de acción y cabeceras de vistas (6 de noviembre de 2026)

- Verificadas las dos vistas principales del archivo: catálogo de provisiones y gestión de provisiones; ambas utilizan `MolsanPageHeader` con títulos, descripciones y acciones dentro del mismo bloque cuando corresponde.
- Sustituido el carácter Unicode «＋» de la acción «Nueva provisión» por `MolsanIcon name="plus"`, manteniendo el texto, el evento y el estilo del botón.
- No se han alterado el editor de plantillas, los formularios, los importes, los cálculos ni la persistencia de provisiones.
- El formulario de envío por email es el único diálogo declarado en esta página: tiene `role=dialog`, `aria-modal=true`, ref y llamada a `useAccessibleDialog`.
- Render Preview construyó correctamente los 299 módulos y el despliegue del commit `79f9257` está `LIVE`; queda pendiente la prueba manual responsive y de teclado.

## 40. Seguridad y Panel Técnico — homogeneización de indicadores y cabecera (6 de noviembre de 2026)

- Centro de Seguridad: los cinco indicadores informativos pasan a `MolsanStatCard`, con tonos semánticos de la paleta compartida y los mismos datos de empleados, activos, roles, permisos y auditoría.
- Sustituida la implementación SVG local por `MolsanIcon` en los accesos, actividad reciente y bloque de supervisión; también el indicador de navegación usa el pictograma corporativo.
- Se conservan rutas, permisos, carga de datos, ordenación de actividad y mensajes. No se ha alterado la lógica de seguridad.
- Panel Técnico: el estado «Sistema operativo» pasa a la propiedad `actions` de `MolsanPageHeader`; deja de existir un contenedor flex externo que separaba el estado de la cabecera canónica.
- Las tarjetas de empleados del Panel Técnico ya estaban basadas en `MolsanPremiumCard`; se mantienen sin duplicar su estructura.
- Pendiente build y revisión visual autenticada de ambas pantallas, especialmente el comportamiento de la cabecera en móvil.

## 41. Maestros — sustitución completa de sprites SVG heredados (6 de noviembre de 2026)

- Sustituidos los cinco usos de sprites externos `/icons/icons.svg` por `MolsanIcon`: iconos de tipo de maestro, alta, estado vacío, edición y eliminación.
- Los iconos conservan su contexto, tamaño aproximado y contraste según el estado activo/inactivo de las pestañas.
- No se han modificado acciones CRUD, confirmaciones, llamadas API, selección de tipo ni formularios.
- La cabecera ya utilizaba `MolsanPageHeader`; no se ha alterado su geometría.
- Pendiente build de Preview y revisión visual de los estados activo/inactivo y de los botones de fila.

## 42. Subpáginas de Seguridad — retirada de sprites SVG locales (6 de noviembre de 2026)

- `SeguridadLogs.jsx` y `SeguridadAuditoria.jsx` sustituyen sus componentes SVG locales por el wrapper corporativo basado en `MolsanIcon`.
- Se conservan los nombres semánticos de eventos y sus alias (`edit`, `delete`, `user-group`, etc.), así como tamaños/clases de presentación.
- No se modifica la consulta de registros, filtros, exportación, paginación ni el flujo del diálogo de auditoría.
- Verificación estática posterior: cero referencias a `/icons/icons.svg` o etiquetas SVG locales en ambas páginas.
- Build de Preview pendiente para este bloque.

## 43. Modales de Empleados, Expedientes y detalle CTN — revisión estática adicional (6 de noviembre de 2026)

- `EmpleadosListado.jsx`: un diálogo de alta, con `role=dialog`, `aria-modal=true` y `useAccessibleDialog`.
- `ExpedientesListado.jsx`: dos diálogos (principal y ayuda de plazos), ambos con marcado ARIA y dos llamadas al hook compartido.
- `FichaExpediente.jsx`: cuatro diálogos, todos con `role=dialog`, `aria-modal=true` y gestión mediante el hook compartido; se mantienen las restricciones de cierre durante guardados.
- `CtnDetallePage.jsx`: un diálogo de firmas, con ARIA y `useAccessibleDialog`.
- Resultado estático de esta ronda: ocho diálogos adicionales con marcado y hook verificados. No se han modificado operaciones, formularios ni persistencia. La prueba manual con teclado, lector de pantalla y tamaños reales continúa pendiente.

## 44. Dashboard CancelaGest — limpieza de reglas CSS inertes (6 de noviembre de 2026)

- Retirada una media query móvil que contenía una regla `.dashboard-kpi` vacía y sin efecto.
- Eliminados los bloques declarativos vacíos de la tarjeta KPI y normalizado el fallback duplicado de `--molsan-text`.
- Se conservan los tamaños efectivos de KPI (132 px escritorio, 112 px hasta 760 px y el ajuste de la zona de firmas en móvil), la jerarquía de títulos, los colores corporativos, las tablas y el soporte de movimiento reducido.
- No se modifica el JSX ni la lógica de métricas; el Dashboard ya utiliza `MolsanPremiumCard` y `MolsanPageHeader`.
- Verificación estática de la hoja: 34/34 llaves y cero media queries vacías. Build de Preview pendiente para este último bloque.

## 45. Barrido estático de las 41 hojas CSS inventariadas (6 de noviembre de 2026)

- Revisadas las 41 hojas incluidas en el inventario de auditoría: llaves, bloques vacíos y selectores repetidos.
- Eliminados los bloques sin declaraciones de `NotarGest.css` (media query de movimiento reducido vacía), `CtnListadoPage.css` (selectores de filtros/tabla sin propiedades) y `ProvisionesFondosPage.css` (regla móvil de página vacía). El Dashboard se limpió en la sección 44.
- Las 41 hojas conservan llaves equilibradas. Tras esta pasada, las hojas revisadas no presentan bloques vacíos detectados por el análisis estático.
- Los selectores repetidos detectados no se borran en bloque: varios son ampliaciones responsive, estados o ajustes de cascada. Se mantienen hasta contrastar sus declaraciones, orden de importación y consumidores; una coincidencia de nombre no demuestra duplicidad funcional.
- Este barrido es una verificación estática del inventario, no una inspección visual de las 41 hojas ni una prueba funcional de cada página.

## 46. Panel Técnico — iconografía Molsan en Monitor, Auditoría y Logs (6 de noviembre de 2026)

- Sustituidos once sprites SVG externos en `MonitorSistema.jsx` (3), `AuditoriaAvanzada.jsx` (6) y `LogsAvanzados.jsx` (2) por `MolsanIcon`.
- Conservados nombres semánticos, tamaños y clases de color; el selector de tablas mantiene el contraste del icono cuando la pestaña está activa.
- No se modifican consultas, filtros, monitorización, métricas, exportación ni navegación.
- Los tres submódulos dejan de depender de `/icons/icons.svg`; la cabecera común sigue residiendo en el contenedor Panel Técnico para evitar duplicados.
- Pendiente build de Preview para este último bloque.

## 47. Panel Técnico — eliminación de cabeceras anidadas sin perder rutas independientes (6 de noviembre de 2026)

- `MonitorSistema`, `AuditoriaAvanzada` y `LogsAvanzados` se utilizan tanto como secciones del Panel Técnico como mediante rutas independientes.
- Añadida la prop opcional `embedded` (por defecto `false`): cuando el Panel Técnico los incluye, ocultan su cabecera interna y utilizan la cabecera única del contenedor; al entrar por sus rutas propias conservan su `MolsanPageHeader`.
- El contenedor pasa explícitamente `embedded` a los tres hijos. Se evita así la duplicación visual sin retirar accesos directos ni cambiar rutas.
- En MonitorSistema se evita además añadir padding interior duplicado en el modo embebido; se conserva el padding en la vista independiente.
- Pendiente build y comprobación visual de ambas formas de entrada.


## 48. Alineación de gutters de ApoderaGest, EncargaGest y NotarGest — 6 de noviembre de 2026

Comparación estática de los wrappers JSX y las reglas responsive de los tres portales, tomando como referencia el gutter común del Layout (16 px móvil y 24 px en escritorio):

- **ApoderaGest:** el wrapper exterior ya aporta `px-4 py-6 lg:px-6`. Se limita a cero el padding móvil adicional de 14 px en `.erp-page.apoderagest`; los overlays y diálogos que también usan la clase `.apoderagest` no quedan afectados.
- **EncargaGest:** el contenido `.eg-main` mantenía 12 px laterales hasta 560 px, frente a 16 px en los otros portales. Se unifica a 16 px.
- **NotarGest:** el wrapper exterior ya aporta el gutter; se elimina el padding interior duplicado de `.notargest.ng-content`. La vista administrativa `.ng-admin-notarias`, que no está dentro de ese wrapper, recibe explícitamente el mismo gutter: 16 px móvil y 24 px desde 1024 px.

Los cambios se limitan a CSS y no alteran rutas, estructura de negocio, autenticación, permisos, API, datos ni modales.

### Verificación

- Build frontend Vite: success en el workflow #919.
- Auditoría de dependencias: success en el workflow #362.
- Validación Fichaje: success en el workflow #3397.
- Render Preview `molsan-premium-2027-candidate-preview`: deploy `dep-dbn0sj5g1s2s73c4m650`, commit `6b98941dd2dc9df924c6e1d93b8d2c59f3ed11cd`, estado `live`.

La validación visual autenticada y las pruebas manuales en desktop/tablet/móvil siguen pendientes. El navegador de consulta no puede abrir la URL del Preview; no se declara una inspección visual que no se ha realizado.


## 49. Matriz de rutas, componentes y cadena de estilos — 6 de noviembre de 2026

- Se ha generado en `docs/INVENTARIO_RUTAS_FRONTEND_2027.md` una matriz de las **110 declaraciones Route** de `App.jsx`, asociando cada ruta con el componente de página que recibe la navegación, excluyendo los wrappers de autenticación/módulo.
- La matriz identifica **91 componentes de destino** distintos. Varias rutas comparten componente (por ejemplo, vistas de Agenda, Informes, Seguridad, portales externos y alias de compatibilidad); por ello no se interpreta el número de rutas como número de pantallas independientes.
- Se han comprobado los **40 archivos JSX/TSX modificados en PR #409**: no contienen importaciones CSS locales directas; el punto de entrada de estilos es centralizado. `main.jsx` importa las capas globales y `molsan-module-styles.css` agrega 26 hojas de módulos/páginas.
- El orden de carga comprobado en `main.jsx` y las 26 importaciones del agregador se mantienen sin cambios. No se reordena la cascada sin prueba de estilos computados.
- Esta matriz cierra el vínculo ruta → componente a nivel de enrutador, pero no certifica todavía cada selector JSX → regla CSS ni los estados internos, subpestañas y modales. Esos consumidores deben verificarse por componente y sección.

### Estado de revisión

La ruta → componente está inventariada. La asociación componente → hoja CSS se establece a través del agregador central y de las clases consumidas, no mediante imports locales en los JSX revisados. La inspección de clases, subpáginas y modales continúa siendo una tarea separada; no se marca como completada por inferencia.


## 50. Reconciliación de tres hallazgos de colisión CSS — 6 de noviembre de 2026

Al volver a abrir los bloques completos de las hojas, se ha detectado que la heurística de la sección 11 atribuyó incorrectamente algunos solapamientos entre capas. Se corrige aquí el registro para que no se utilice como base de una eliminación:

- **`.mol-sidebar-premium`:** `molsan-design-system.css` define aislamiento, posicionamiento, z-index y estructura de navegación. `MolsanRedesign2027.css` define borde inferior, sombra, tipografía y estados activos. No se ha confirmado duplicación de `position` ni `z-index` entre ambas.
- **`.erp-app-shell`:** `MolsanRedesign2027.css` define la altura mínima del shell; `MolsanPremium2027.css` añade fondo y color. No se confirma la duplicación de `background` descrita en la pasada heurística.
- **`.molsan-icon-3d`:** el bloque base localizado está en `MolsanPremium2027.css`; no se ha localizado un bloque base homónimo en `molsan-design-system.css`. La atribución anterior de una base duplicada entre ambas hojas no queda confirmada.

La conclusión correcta es que estas capas tienen responsabilidades complementarias y selectores ancestro amplios, pero los tres ejemplos anteriores **no justifican por sí solos borrar declaraciones**. Se mantiene la decisión de no reordenar ni retirar capas sin evidencia de declaraciones computadas y validación en Preview.


## 51. Consolidación segura de movimiento reducido del shell — 6 de noviembre de 2026

Se ha retirado una repetición real entre las capas globales:

- `MolsanPremium2027.css` contenía una regla `@media (prefers-reduced-motion: reduce)` para `.erp-app-shell` y todos sus descendientes.
- `MolsanRedesign2027.css` ya contenía la misma regla para los descendientes del shell. Se ha añadido el propio `.erp-app-shell` a ese selector y se ha retirado el bloque repetido de Premium.
- Se conservan exactamente las declaraciones efectivas: `scroll-behavior: auto`, transición y animación de `.01ms`, y una sola iteración. La regla queda en la capa base de layout; Premium conserva el acabado visual y el selector de Espacios de trabajo.

### Verificación del cambio

Commit: `fb03640ed90271cea7888eeabc94f4637f2998f5`.

- `MOLSAN frontend premium build` #937: success.
- `Frontend dependency security audit` #371: success; el informe npm asociado registra 0 vulnerabilidades.
- `Validar Fichaje Molsan` #3406: success.
- Render Preview: deploy `dep-dbn0udou01pc73fr0q30`, commit `fb03640ed90271cea7888eeabc94f4637f2998f5`, estado `live`.

No se ha tocado producción, API, base de datos ni la lógica funcional. La comprobación visual autenticada del Preview continúa pendiente.


## 52. Eliminación de declaraciones repetidas y barrido de ocho capas globales — 6 de noviembre de 2026

En `molsan-design-system.css` se habían repetido dos declaraciones de color que ya estaban definidas por los bloques base de botones:

- `.molsan-btn--primary`: se retira el segundo `color: #fff`; se mantienen el gradiente y el borde de la variante Premium.
- `.molsan-btn--danger`: se retira el segundo `color: #fff`; se mantienen el fondo rojo y el borde.

El color efectivo sigue definido por el bloque base anterior de cada selector. El diff solo elimina esas dos declaraciones; no cambia dimensiones, estados hover, contraste, ni comportamiento.

Se ha repetido el barrido estático de selectores y declaraciones exactas en ocho capas globales: `molsan-design-system.css`, `MolsanCanonicalVisual2027.css`, `MolsanCardsPremium2027.css`, `MolsanFase3.css`, `MolsanGlassLuxeUnified2027.css`, `MolsanGlobalConsistency2027.css`, `MolsanPremium2027.css` y `MolsanRedesign2027.css`. Se analizaron 593 bloques de reglas; después de esta corrección no quedan coincidencias de selector exacto con propiedades idénticas repetidas entre los bloques incluidos. Es una comprobación estática por selector literal, no sustituye computed styles ni inspección de cascada en navegador.

### Verificación

Commit: `5ca6804988c9fa787d4a58237c82f37840ab1f40`.

- `MOLSAN frontend premium build` #943: success.
- `Frontend dependency security audit` #374: success; el informe de `frontend-app` registra cero vulnerabilidades.
- `Validar Fichaje Molsan` #3409: success.
- Render Preview: deploy `dep-dbn0vcp5efls738q2pqg`, commit `5ca6804988c9fa787d4a58237c82f37840ab1f40`, estado `live`.

El aviso de cuatro vulnerabilidades que aparece en el paso automático previo de instalación de Render procede de la instalación en la raíz del repositorio, fuera del audit específico de `frontend-app`. No se han actualizado dependencias de raíz ni backend dentro de esta tarea visual; queda anotado para revisión separada antes de modificar ese ámbito.


## 53. Revisión estática de modales de los tres portales prioritarios — 6 de noviembre de 2026

Se han vuelto a leer los JSX actuales de ApoderaGest, EncargaGest y NotarGest y se han contado los diálogos explícitos:

| Portal | Diálogos con `role="dialog"` | `aria-modal="true"` | Invocaciones de `useAccessibleDialog` |
|---|---:|---:|---:|
| ApoderaGest | 2 | 2 | 2 |
| EncargaGest | 5 | 5 | 5 |
| NotarGest | 4 | 4 | 4 |
| **Total** | **11** | **11** | **11** |

- ApoderaGest utiliza además un portal React para su overlay de grupo.
- EncargaGest mantiene overlays separados para alta/edición, incidencia, perfil y accesos; sus cinco diálogos tienen marcado ARIA y el hook compartido.
- NotarGest mantiene los diálogos de avisos, pagos, perfil y resumen de expedientes; los cuatro tienen marcado ARIA y el hook compartido.
- Se conservan los componentes y estados existentes; esta comprobación no cambia formularios ni acciones.

**Límite:** se confirma el marcado y la asociación estática del hook, no el comportamiento real de tabulación, Escape, foco inicial/retorno, lector de pantalla, scroll interno ni viewport. Esas pruebas deben hacerse en navegador autenticado y en cada estado del modal.


## 54. Inspección del hook compartido de accesibilidad de diálogos — 6 de noviembre de 2026

Se ha revisado `components/ui/useAccessibleDialog.js`, usado por los 11 diálogos de los tres portales:

- Al abrir, guarda el foco anterior y mueve el foco al primer elemento visible y habilitado; si no hay ninguno, enfoca el propio diálogo.
- Mantiene el foco dentro del diálogo mediante `focusin`.
- Intercepta `Tab` y `Shift+Tab` para recorrer cíclicamente los controles.
- Solo el diálogo modal superior procesa Escape y Tab, permitiendo superposición de diálogos.
- Al cerrar, retira los listeners y devuelve el foco al elemento previo si sigue conectado al documento.
- Excluye elementos no visibles, deshabilitados, dentro de `aria-hidden` o de contenedores `inert`.

No se han cambiado el hook ni sus consumidores. La lectura estática confirma el mecanismo; queda probar en navegador el comportamiento real de los 11 estados, especialmente cierres bloqueados durante guardado, modales anidados, scroll y retorno de foco.


## 55. Cabeceras sin parpadeo en Catálogos y Utilidades — verificación de consumidores JSX

Se han contrastado las clases reales de los componentes con los selectores globales:

- `Utilidades.jsx` monta `.utilidades-premium-page` y `.animate-fadeIn`, con cabecera `MolsanPageHeader`.
- `Catalogos.jsx` monta `.catalogos-premium-page` y `.animate-fadeIn`, con cabecera `MolsanPageHeader`.
- `MolsanGlobalConsistency2027.css` neutraliza la animación del root y de la cabecera dentro de ambos contenedores, dejando `opacity:1`, `transform:none` y sin animación de entrada.
- La misma capa evita un segundo padding interior porque el Layout ya aporta el gutter. `MolsanCardsPremium2027.css` conserva para Catálogos la distribución de identidad a la izquierda y acciones a la derecha, con ajuste responsive a móvil.
- `MolsanCanonicalVisual2027.css` define la geometría y la apariencia de la cabecera, pero no reintroduce una animación de montaje.

La coincidencia de clases y orden de importación confirma que las reglas alcanzan ambos JSX. El parpadeo queda corregido en el código estático; no se afirma la comprobación visual en navegador autenticado.

## 56. Catálogos — migración de tarjetas al patrón Espacios de trabajo (6 de noviembre de 2026)

- `Catalogos.jsx` sustituye las tarjetas construidas con Tailwind local por la estructura compartida `workspace-app-card` ya utilizada por Utilidades y Espacios de trabajo.
- Se reutilizan los tonos semánticos, el acento, el icono MolsanIcon, el título, la descripción, el acceso y el hover definidos en el sistema compartido.
- Se conservan las 18 rutas, la agrupación, la distinción de destacados y el aviso de construcción. No se modifica ningún destino ni dato del catálogo.
- Commit: `479461e9f727b7e90da59b10a28ee206eb44ac71`.

## 57. Mensajería — iconos corporativos en acciones de alta (6 de noviembre de 2026)

- Las cuatro acciones de alta de Mensajería (nueva solicitud, servicio y tarifa, registrar albarán y registrar factura) sustituyen el prefijo Unicode «+» por `MolsanIcon name="plus"`.
- Se conserva el texto de cada acción, su handler y su estado de habilitación; se ajusta únicamente la composición del botón para alinear icono y texto.
- Commit: `92c7ad4ac7dfe38ab48742c73f109a330fa693aa`.
- Render Preview `molsan-premium-2027-candidate-preview`: deploy `dep-dbn1mogn74is73dh3id0`, commit `92c7ad4ac7dfe38ab48742c73f109a330fa693aa`, estado `LIVE`. La compilación de Render terminó y publicó este commit.
- Producción, API y base de datos no se han desplegado ni modificado.

La validación visual autenticada de estas pantallas, sus estados responsive y las interacciones reales continúa pendiente; el estado LIVE acredita el despliegue/build, no sustituye esa inspección.

## 58. Segunda comprobación de cabeceras en herramientas, catálogos y mensajería (6 de noviembre de 2026)

Se ha vuelto a leer el JSX real de estas 20 pantallas/subpáginas: FirmasEmail, DatosMolsan, LecturaCopias, LecturaCancelaI, PPAD, CambiarGestorExpediente, Utilidades, TiposExpediente, ComplementosSaldo, AsignarExpedientesPromociones, ProcesoAbsis, CatalogoOficinas, ReasignarNotarioExpediente, CambiosActividadAbsis, CatalogoAbsis, Verifacti, MensajeriaMolsan, MensajeriaSolicitudes, CorrespondenciaTipificada y ReglasActividadesExpediente.

- Las 20 instancian `MolsanPageHeader`; no se detecta en ellas la cabecera inline heredada basada en `rounded-[24px] bg-white/90 p-6` ni la franja Tailwind `from-blue-600 via-indigo-500 to-cyan-400`.
- Catálogos utiliza ahora además las tarjetas `workspace-app-card` de Espacios de trabajo (ver sección 56); su cabecera sigue siendo `MolsanPageHeader`.
- CatalogoOficinas y EntidadesBancarias conservan sus acciones funcionales en la cabecera; FirmasEmail conserva el retorno a Catálogos; Mensajería conserva su descripción y acciones/pestañas funcionales.
- Esta comprobación es estática sobre JSX y no certifica renderizado, solapamientos reales, responsive ni navegación autenticada. No se eliminan hojas CSS locales solo por su nombre: las reglas de tablas, formularios, paginación, diálogos y estados de cada catálogo se preservan hasta demostrar que no tienen consumidor.
- No se modifica lógica de negocio, endpoints, permisos ni almacenamiento.

## 60. Normalización adicional de iconografía funcional (6 de noviembre de 2026)

Se han sustituido indicadores Unicode por pictogramas SVG del catálogo MolsanIcon en los siguientes puntos:

- Informes: icono de información, indicadores de ordenación y descarga Excel.
- Municipios, Entidades Bancarias y Registros de la Propiedad: avisos informativos.
- Importador ABSIS: aviso de importación con incidencias.
- Entidades Bancarias: ordenación ascendente, descendente y sin ordenar en sus seis columnas.
- Expedientes: indicador de ordenación simple y múltiple, conservando el número de prioridad de cada criterio.
- Lectura de Copias: acción Procesar.
- Verifacti: enlaces externos a documentación y web oficial.
- Carpeta Digital: acción Descargar.
- Se amplía el catálogo MolsanIcon con pictogramas SVG `play` y `externalLink`; no se incorporan dependencias de iconos externas.

Se conserva el texto accesible/visible y la acción de cada control. Los cambios no alteran endpoints, datos, permisos ni reglas de negocio.

Commits de código de esta pasada: `60a52c1`, `cca6475`, `45da09b`, `d87565e`, `eee7b59`, `c49ea8b`, `3b9f118`, `e8b2fc2` y commits previos de iconos informativos registrados en la rama.

Validación de build y despliegue: Render Preview `dep-dbn1qbc9v7es73a0h380`, asociado al commit `e8b2fc2`, finalizó en estado `LIVE` el 6 de noviembre de 2026. Los logs muestran `✓ built in 5.61s` y `Your site is live`. Esto confirma compilación y publicación del frontend Preview, pero no sustituye las pruebas visuales autenticadas y funcionales en navegador.

## 61. Segunda pasada de indicadores de acción y ordenación (6 de noviembre de 2026)

- Verifacti: los accesos de consulta, alta, subsanación/anulación y exportación utilizaban cadenas Unicode como nombre de icono de `MolsanIcon`, que no existían en el catálogo y caían al icono genérico. Se sustituyen por los nombres semánticos `search`, `plus`, `refresh` y `download`.
- Informes: se normalizan los indicadores de ordenación y las acciones de actualización/descarga a iconos MolsanIcon.
- Importador Post Firma: se normalizan los controles de actualización y navegación al histórico.
- Las flechas de ordenación en Entidades Bancarias y Expedientes, la acción Procesar de Lectura de Copias y las acciones de descarga/enlace externo también pasan a SVG corporativo.
- Se mantienen los handlers, la ordenación múltiple y sus índices de prioridad, los filtros, la descarga de archivos y los destinos de navegación.
- No se eliminan botones de actualización que forman parte del cuerpo operativo; la petición de retirar «Actualizar» se limita a los controles que estaban duplicados en cabeceras globales, no a acciones de recarga necesarias para consultar datos.
- Render Preview `dep-dbn1r9d9fdbs73fhg85g` se ha reconstruido desde el HEAD `ff7b1fd` y finalizó `LIVE` el 6 de noviembre de 2026. Los logs confirman `✓ built in 6.00s` y `Your site is live`. La compilación incluye las modificaciones de código hasta `f9a8e2a`; el último commit es documentación de auditoría.


## 19. Normalización visual transversal — 6 de noviembre de 2026

Se ha aplicado una nueva pasada sobre la capa visual final y el componente compartido de tarjetas, sin modificar JSX funcional, API, backend ni datos:

- Cabeceras canónicas: superficie blanca sólida, borde azul hielo ligeramente reforzado (1,5 px), sombra suave y retirada del desenfoque/gradiente de fondo.
- Tarjetas legacy incluidas en Canonical Visual: fondo blanco, borde 1,5 px, sombra más definida y hover discreto de 2 px; se conserva la franja superior de acento del patrón Espacios de trabajo.
- MolsanPremiumCard: superficie blanca, borde ligeramente reforzado, sombra, franja superior única y hover sutil. Se eliminan los pseudo-elementos decorativos internos; cabecera y contenido no añaden bordes separadores propios.
- Jerarquía interna de tarjeta: icono ampliado, título más visible y espaciado acercado al patrón de Espacios de trabajo; responsive ajustado para conservar proporción en móvil.
- Superficies raíz de páginas y portales declaradas en Canonical Visual con fondo blanco corporativo.
- El ámbito de los estilos compartidos de botones/controles se amplía a .erp-app-shell, para cubrir módulos técnicos además de los portales.

Commits de código: d60cdf9, 70a0a49, 45a0a40, 21da073.

**Validación:** cambios escritos en la rama fix/molsan-css-selector-audit-round1. La ejecución CI para el nuevo HEAD aún no aparece en GitHub Actions en el momento de esta actualización. No se afirma validación visual: siguen pendientes la inspección autenticada de Preview, la comprobación de cada ruta/subpágina/modal y la regresión responsive. La capa canónica centraliza la apariencia, pero quedan reglas funcionales y estructurales propias de módulos que no deben eliminarse sin confirmar sus consumidores y comportamiento.

## 62. Herramientas — tarjetas migradas al patrón Espacios de trabajo (6 de noviembre de 2026)

- La página principal `Herramientas.jsx` deja de construir tarjetas con Tailwind local, línea superior de 1 px y flecha Unicode.
- Sus cinco accesos (Importar CTN, Crear noticia, Subir documento, Informes e Importador ABSIS) utilizan ahora `workspace-app-card`, `workspace-card-accent`, `workspace-app-icon`, `workspace-app-title`, `workspace-app-description` y `workspace-card-footer`.
- Los pictogramas se renderizan con MolsanIcon; se conservan rutas, títulos, descripciones y la distinción visual del acceso destacado.
- Catálogos y Herramientas comparten ya el mismo patrón de tarjetas que el selector de módulos/Espacios de trabajo. Utilidades ya utilizaba ese patrón; Informes mantiene `MolsanPremiumCard`, con franja, icono, título y hover común.
- No se han cambiado datos, permisos, rutas ni lógica de negocio.

## 63. Estado de Preview tras la última consolidación visual

- Render Preview `molsan-premium-2027-candidate-preview`, deploy `dep-dbn1t6l6e07s73f9a8g0`, commit `45a0a40d3a362a345671bf1f85f9907e055aad37`: `LIVE`.
- Los logs de build confirman `✓ built in 5.73s`.
- El deploy contiene las modificaciones de iconografía y tarjetas realizadas en esta tanda, además de los últimos ajustes de superficie canónica presentes en el HEAD de la rama en ese momento.
- El despliegue es únicamente de Preview. Producción, API, Supabase y datos siguen sin modificarse.
- Continúan pendientes la inspección visual autenticada de todas las rutas, las pruebas responsive y la interacción real de cada modal. La compilación correcta no equivale a certificación visual.


### 19.1. Retirada de skins particulares en portales — misma ronda

- ApoderaGest: las superficies `.ag-grupo-notario` y `.ag-carpeta-apoderado` pasan a la capa canónica. Se retiraron sus fondos, bordes, sombras y degradados locales; también se eliminó la animación de entrada `ag-aparecer`, que no forma parte del patrón de Espacios de trabajo. Se retiró el separador inferior de la cabecera interna del grupo y el separador del título de bloque registral.
- EncargaGest: `.eg-panel` deja de definir borde, radio, fondo y sombra propios; conserva únicamente su estructura y overflow. La apariencia pasa a la regla compartida.
- NotarGest: las superficies de paneles y tarjetas de administración dejan de definir borde, radio, fondo y sombra local. Las cabeceras internas de esas superficies dejan de dibujar banda de fondo y línea inferior; conservan estructura y espaciado.
- Canonical Visual amplía sus selectores de tarjeta a estas familias de portales. Se mantiene el CSS funcional de formularios, tablas, estados, gráficos, directorios y modales.
- Comprobación estática posterior: las cinco hojas modificadas tienen balance de llaves CSS igual a cero y sin cierres prematuros.

Commits adicionales: af8e1f7, 1b19d50, 60b3b1a, 57f21aa, 1bc3459.

**Pendiente:** build CI del nuevo HEAD y comprobación visual en Preview de las tres áreas de portal, incluidas fichas y estados responsive. La inspección estática no certifica que el resultado visual sea correcto.


### 19.2. Fondos y botones compartidos

- Las raíces de página incluidas en el canon fuerzan superficie blanca sólida para evitar que los fondos de módulo heredados vuelvan a teñir el lienzo.
- El botón secundario EncargaGest deja de definir su propia piel (borde, radio, fondo, color y hover); conserva únicamente layout, tamaño y área interactiva, delegando el aspecto al sistema común.
- Se mantienen las excepciones funcionales de estado (por ejemplo, botones deshabilitados y acciones de éxito) y las reglas de formularios/controles que no son tarjetas.

Commits adicionales: 25193d7 y dd72d6d.


### 19.3. NotarGest — panel de detalle individual

- El bloque «Detalle por notaría / Situación individual» deja de renderizarse como una tarjeta visual independiente dentro de otra tarjeta: se retiraron su borde, fondo, sombra y radio propios.
- El contenedor `.ng-admin-individual-panel` adopta la superficie canónica compartida.
- Se retiró la línea divisoria bajo el título; el encabezado queda integrado en la misma superficie que las fichas de notarías.

Commits: 29f4a02 y b8c2b0f.


### 19.4. Normalización de cabecera interna de NotarGest

- El panel «Detalle por notaría / Situación individual» se ha integrado visualmente: su contenedor usa la superficie canónica, el título deja de ser una tarjeta independiente y se elimina el separador entre título y fichas.
- Los selectores compartidos del portal conservan tipografía, estructura, espaciado y estados; se retiran únicamente fondos, bordes y sombras de presentación duplicados.

Commits: 29f4a02 y b8c2b0f.


### 19.5. Precedencia del fondo blanco

Se ha elevado el selector del lienzo de páginas a `:is(...)` para que su especificidad iguale la de las antiguas reglas `.erp-page`/portales con `!important`. Así el fondo blanco canónico no queda anulado por el tema anterior. Commit: 3f8dbb1.


## 20. Retirada de animaciones de entrada heredadas — 6 de noviembre de 2026

Se han retirado las clases de animación genérica `animate-fade-in` de los contenedores de página y vistas de contenido identificados en App, CTN, Agenda (raíz y vistas día/semana/mes), Empleados, Panel Técnico, Logs avanzados, Seguridad, Importador ABSIS y otras pantallas revisadas. También se retiró de tarjetas/elementos internos del Importador ABSIS y Notificaciones donde aparecía como animación de entrada decorativa.

Se conservan las transiciones propias de interacción (hover/focus), la animación de carga funcional de NotarGest y las entradas breves de componentes de interacción como desplegables y modales, pendientes de validación individual. No se modifica la preferencia `prefers-reduced-motion`.

Commits de esta tanda: c4ca98f, a2fa2d7, f102d44, 290b243, 657cf18, b4f4c7d.


### 20.1. Conservación de estado activo en NotarGest

Al retirar la piel local de las tarjetas de notaría, se ha trasladado explícitamente el estado `.ng-admin-notaria-activa` al canon visual para que la selección siga siendo visible sobre el nuevo fondo blanco. Commit: 393ef92.


## 21. Migración de superficies de Seguridad y tokens comunes — 6 de noviembre de 2026

- Seguridad: los paneles «Actividad reciente» y «Supervisión técnica» se han migrado a MolsanPremiumCard. El título, icono y descripción quedan dentro de la tarjeta; se retira la cabecera interna con línea inferior y las líneas divisorias de la lista de actividad.
- Se retiran clases de entrada `animate-fade-in` en varias páginas/vistas y en el contenedor global App; se conservan las transiciones de interacción y animaciones de carga/diálogo que cumplen una función concreta.
- Tokens globales de tarjeta actualizados a borde #C5D8E5 y sombras más definidas, coherentes con el acabado canónico.

Commits: a49b218, c4ca98f, a2fa2d7, f102d44, 290b243, 657cf18, b4f4c7d, 7f4a250.

**Validación pendiente de esta tanda:** ejecutar/confirmar build tras las migraciones JSX y los tokens; revisar Seguridad y las páginas afectadas en Preview, además de los tres portales.


### 19.6. Retirada de subtarjetas anidadas en NotarGest

Se han simplificado los bloques de métricas, circuitos y resumen de pagos que se dibujaban como pequeñas tarjetas con borde y fondo dentro de otras tarjetas. Conservan su estructura, espaciado y contenido; dejan de introducir cajas y líneas adicionales en el interior. Commit: 59f05e3.


### 21.1. Cobertura de fondos de subpáginas

Se amplió la lista de raíces blancas para incluir fichas maestras, subpáginas de seguridad, utilidades, herramientas operativas y páginas de inicio de herramientas. Se excluyó expresamente el login/portal de acceso para conservar el rediseño de acceso ya aprobado. Commits: 7762665 y 3c36284.


## 22. Consolidación del sistema de botones

Se han fusionado las dos definiciones base duplicadas de `.molsan-btn` en una sola regla y se han integrado sus variantes semánticas (principal, secundaria, éxito, aviso, peligro, Excel y ghost). Se conserva el spinner de carga; se elimina el movimiento independiente del icono del botón y se deja un hover discreto de 1 px, con soporte de `prefers-reduced-motion`. Los botones ya no dependen de dos bloques de estilos superpuestos.

Commit: 37a0042. Pendiente build del nuevo HEAD y revisión visual de botones primarios/secundarios y estados deshabilitados en módulos y portales.


## 23. Seguridad — ficha individual de empleado

- Los cuatro indicadores de la ficha pasan a MolsanStatCard.
- Las acciones de visibilidad/bloqueo se trasladan a la zona derecha de MolsanPageHeader junto a los chips de estado/rol; el mensaje de resultado queda como estado de página, no como tarjeta independiente.
- El bloque de datos de empleado pasa a MolsanPremiumCard y se eliminan las subtarjetas anidadas con borde y fondo.
- Se preservan las llamadas, condiciones de permisos, acciones de bloqueo/desbloqueo y el mensaje de guardado.

Commit: 35851f0. Pendiente build y revisión visual de la cabecera con acciones en anchuras móvil/tablet.


## 24. Capa de migración para tarjetas Tailwind en subpáginas

Se añadió una regla de compatibilidad acotada a raíces de Seguridad, Panel Técnico, Empleados, Maestros, Informes, Notificaciones, Logs, Herramientas/Utilidades, Provisiones, Fichajes, Mensajes, CTN y Agenda. Las tarjetas heredadas explícitas (`section/article/div.rounded-2xl.border`) reciben fondo blanco, borde reforzado, franja superior, sombra y hover suave del patrón Espacios de trabajo. Se neutralizan separadores inferiores de encabezados directos dentro de esas tarjetas. Los diálogos con `role=dialog`, `.modal` o `.erp-modal` quedan excluidos para no alterar modales.

Commits: 78bf3f6 y 02d6d2d. Esta capa es de migración: a medida que cada consumidor se pase a MolsanPremiumCard, deben retirarse los estilos Tailwind de presentación y reducirse los selectores de compatibilidad. Pendiente inspección de subpáginas y revisión de posibles tarjetas anidadas.


### 24.1. Microinteracción alineada con Espacios de trabajo

Se ajustó el hover de tarjetas canónicas y legacy a una elevación de 4 px y sombra más profunda, próxima al movimiento de 5 px de `.workspace-app-card`. Se mantienen fondos blancos y bordes reforzados; no se reintroducen gradientes de hover. Los botones conservan su elevación discreta de 1 px y los iconos de botón ya no hacen zoom independiente.

Commits: 9c2d0bc y 2834229.


## 25. Herramientas, utilidades, intranet y fusiones

- Se retiró la clase `animate-fadeIn` de las raíces de Herramientas, Utilidades, Importar CTN, Crear noticia, Logs, Subir documento, Firmas email, Catálogos, Datos Molsan, Intranet, Mensajes, Verifacti, Tipos de expediente y Catálogo de oficinas. También se retiró de MensajesHeader.
- Se mantiene la animación de acceso en LoginPage/PortalLogin y las transiciones funcionales de desplegables y modales.
- Fusiones se incorpora a la superficie de página blanca y al patrón de tarjeta heredada para su panel de solicitudes.

Commits: df2d3fd, 57328dd, 1337ba9, 237ebe0, 73f9e36, b7c9c4c, 8f2153e, da17b82, 7a0dbac, 299feb3, 28a7ec3, 1aff1d5, 414c719, 04525e4, 9934185, 3724ed6, 6361f4b.


## 26. Normalización visual de modales de portales

- El panel modal accesible genérico adopta borde #C5D8E5, radio de 22 px y sombra reforzada; en móvil mantiene 18 px.
- Se centraliza la superficie de los modales de EncargaGest y NotarGest (fondo blanco, borde reforzado, radio y sombra comunes).
- Los encabezados de modal dejan de usar gradientes oscuros/azul hielo y separadores inferiores: fondo blanco, título azul corporativo y descripción secundaria.
- El pie de EncargaGest deja de dibujar línea superior, fondo translúcido y blur; la marca del modal pasa a icono azul sobre fondo azul hielo.
- Se conservan overlays/backdrops oscuros, tamaños, scroll, columnas, estados de carga y acciones funcionales.

Commits: 2c6826d, d5ffc26, fcc42a3, 1c0ffa7, 07f4ba3. Pendiente comprobación en navegador de modales de alta/edición/perfil de EncargaGest y los modales de pagos/resumen de NotarGest.


### 26.1. Cabeceras y pies de diálogos accesibles

La última capa canónica unifica también los encabezados y pies de los diálogos con `role=dialog` (excluyendo la capa fixed/inset que actúa como backdrop y los diálogos exentos). Se neutralizan fondos de banda, líneas inferiores/superiores y blur; los títulos usan azul corporativo y la descripción texto secundario. Commit: 108f140.


### 26.2. Retirada de skins locales de modales

Se retiraron de NotarGest y EncargaGest las definiciones locales de borde, radio, fondo y sombra de sus paneles modales; también se retiraron los gradientes de cabecera, separadores inferiores, color blanco forzado de títulos y el fondo/blur del pie. La marca del modal EncargaGest ahora usa icono azul sobre superficie azul hielo. Las dimensiones, scroll, sticky header/footer, overlays, layout y estados warning/disabled siguen conservándose estructuralmente; el canon aporta la piel visual. Balance de llaves CSS verificado en ambas hojas y en Canonical/Fase3. Commits: fcc42a3, 1c0ffa7 y 07f4ba3.


### 24.2. Exclusión de overlays y paneles modales

La regla de migración de tarjetas Tailwind ahora excluye cualquier elemento con `role=dialog` y cualquier clase cuyo nombre contenga `modal`, evitando que una tarjeta heredada dentro de una subpágina capture por error el estilo de un diálogo. Commit: 53ce7d7.


## 27. Normalización de tarjetas KPI

MolsanStatCard deja de usar fondos degradados, borde fino y microanimaciones de giro/zoom del icono. Ahora comparte fondo blanco, borde 1,5 px, franja superior de acento, sombra reforzada y elevación de 4 px con el patrón Espacios de trabajo. Los tonos semánticos de cada indicador se conservan en la franja y el icono; los datos/valores y su jerarquía siguen intactos. Commit: 3918a4a.


## 28. Eliminación de duplicado físico en el Design System

Se detectó que `molsan-design-system.css` contenía una segunda copia completa de la hoja concatenada al final (casi 1.000 líneas adicionales), con estilos anteriores de tarjetas KPI y microanimaciones de icono que ya se habían sustituido en la primera copia. Se conservó la primera versión actualizada, se eliminó la copia antigua y se cerró explícitamente la regla `prefers-reduced-motion` de la sección KPI. La hoja pasa de 2.017 a 1.020 líneas, conserva un único encabezado de Design System y mantiene balance de llaves CSS.

Commits: 4da325c y 790e76f. Es una eliminación real de duplicado, no un override adicional.


### 28.1. Validación automatizada del duplicado eliminado

Para el commit de código 790e76f:
- Workflow Frontend dependency security audit #481: success.
- Workflow Validar Fichaje Molsan #3626: build del frontend success y sintaxis del backend de fichajes success.
- Workflow MOLSAN frontend premium build #1181: cancelado por concurrencia durante la fase de build; no se interpreta como fallo. La compilación del frontend sí quedó confirmada en el job de build del workflow Validar Fichaje.


### 25.1. Segunda pasada de animaciones de páginas

La búsqueda ampliada detectó más raíces de página con `animate-fadeIn`. Se retiró de Municipios, Mensajería Molsan, Modelos de documentos, Mensajería Solicitudes, Entidades bancarias, Registros de propiedad, Correspondencia tipificada y Reglas de actividades del expediente. Se mantiene en LoginPage y PortalLogin, y no se han retirado las animaciones de carga de spinners.

Commits: 1e29d74, e8cc5b8, 8e02314, 298475d, b81f1a9, 57dad80, 95e11e9 y 8b71c1f.


## 29. Ajuste del patrón de referencia Espacios de trabajo

Se ha afinado la propia tarjeta de referencia `.workspace-app-card`: fondo blanco sólido, borde de 1,5 px #C5D8E5 y sombra más definida. El hover pasa a elevar 4 px con sombra reforzada, manteniendo la franja superior de acento, el icono tonal, la flecha circular y el movimiento de flecha del pie que identifican el patrón. Las tarjetas canónicas y KPI usan ya la misma geometría/valores de borde, sombra y elevación.

Commit: 7022944.


### 26.3. Radio responsive de modales

Los paneles modales especiales de EncargaGest/NotarGest y los paneles compartidos bajan a radio de 18 px en móvil, conservando 22 px en escritorio. Commit: b23585a.


## 30. Intranet — tarjetas y subpanel de publicación

La Intranet ya utilizaba MolsanPageHeader, MolsanStatCard y MolsanIcon; se incorporó su raíz al canon de tarjetas heredadas, incluyendo los paneles con radio 26 px. Se retiró el fondo/borde azul del formulario de publicación anidado para que el formulario quede integrado dentro de la tarjeta principal, sin crear una tarjeta dentro de otra.

Commits: e9fa1ec y 4d3dcec.


### 30.1. Catálogos, mensajería y honorarios

Se amplió la regla de tarjetas heredadas a las raíces `catalogos-premium-page`, `catalogos-maestros-premium`, `catalogos-maestros-page` y `honorarios-gestoria-premium`. Mensajería Molsan y Mensajería Solicitudes reutilizan la raíz de Catálogos, por lo que quedan cubiertas sin tocar sus operaciones. Commit: a961530.


## 31. Segunda pasada integral de portales, expedientes y subpáginas

- La migración de tarjetas Tailwind al patrón Espacios de trabajo incluye ahora las raíces reales de ApoderaGest, EncargaGest, NotarGest y las páginas de listado/ficha de expedientes. También se incorporan paneles específicos `.ag-panel` y grupos `.ag-grupo-apoderado` al canon de tarjeta, evitando que queden fuera por no usar clases Tailwind.
- Se amplió el selector canónico a bloques `div` con radio Tailwind de 26 px, además de secciones/artículos y tarjetas de 2xl; se mantienen excluidos diálogos y cualquier clase que contenga `modal`.
- Se retiraron las últimas cabeceras locales oscuras de modales en ApoderaGest, EncargaGest y NotarGest; los paneles heredan superficie blanca, borde reforzado y sombra común. Se eliminaron duplicados de estilos de avatar/icono y gradientes púrpura/azul que no pertenecen al patrón de trabajo.
- Se eliminaron bandas de fondo y líneas interiores de cabeceras de panel en ApoderaGest, EncargaGest y NotarGest; las cabeceras de tabla y separadores funcionales de filas se mantienen para conservar legibilidad y estructura de datos.
- La pantalla Espacios de trabajo y sus cabeceras de modal pasan a fondo blanco, título azul corporativo, texto secundario #617789, borde 1,5 px y sombra suave reforzada. Las tarjetas de acceso mantienen su franja de acento, icono tonal y hover sutil.
- Se retiró `animate-fade-in` de ExpedientesListado, OficinasLiquidadoras, Auditoría avanzada, Monitor del sistema y Auditoría de seguridad. Se conservan animaciones locales de mensajes y spinners porque son microinteracciones/estados funcionales, no entradas de página.

Commits de código: 9088d8f, 52679ec, 74d6608, 325216b, 534d947, 33b13b3, 84de234, 65daa80, 5ae80fc, 6075174, d6ef950, 280ab9a, 661d2d9 y 05551d2.

Pendiente en esta sección: build final del commit más reciente y comprobación de las rutas principales en Preview Render; no se considera validación visual cerrada hasta revisar el navegador.


## 32. Validación del candidato en Preview

- Commit de código revisado: `d6ef950527f8ac106df5b7eb957408b70c21e671`.
- GitHub Actions sobre ese commit: **MOLSAN frontend premium build = success** (job Vite production build), **Frontend dependency security audit = success**, **Validar Fichaje Molsan = success** (incluye build del frontend y sintaxis del backend de fichajes).
- Servicio Render: `molsan-premium-2027-candidate-preview`, rama `fix/molsan-css-selector-audit-round1`, auto-deploy desactivado.
- Deploy candidato `dep-dbn2jpmgekts738nqdo0`, commit `daea3b483101c57f23277677f65f81ca0c7920e5`: estado **live**.
- Logs de error desde el inicio del deploy: **0**.
- El navegador de inspección disponible no pudo abrir el dominio público del Preview; por tanto, el deploy y la compilación están verificados, pero no se afirma una inspección visual real de cada ruta. La comprobación visual final de cabeceras, tarjetas, botones, tablas y modales sigue pendiente de una sesión de navegador accesible.

URL del Preview: https://molsan-premium-2027-candidate-preview.onrender.com


## 25. Cruce focalizado JSX ↔ CSS de NotarGest y EncargaGest — 6 de noviembre de 2026, 21:31

Se ha repetido el cruce de clases CSS con sus consumidores JSX sobre el HEAD de `molsan-premium-deep-cleanup-continuation`, sin inferir que una clase esté muerta por no aparecer literalmente en el componente principal.

- **NotarGest:** `NotarGest.css` contiene 145 nombres de clase únicos detectados estáticamente. Los dos tokens que no aparecen como texto literal en `NotarGest.jsx` son falsos positivos del análisis: `.css` procede de comentarios y `.molsan-icon-3d` lo genera el componente compartido `MolsanIcon`. No se autoriza borrar reglas de esta hoja por falta de consumidor.
- **EncargaGest:** `EncargaGest.css` contiene 65 nombres de clase únicos. Los tokens `.molsan-print-encargos-lista` y `.molsan-print-encargos-fichas` no aparecen en los dos JSX de EncargaGest, pero el flujo de impresión del portal ApoderaGest añade esas clases al `body`; por tanto, son selectores globales compartidos y no deben eliminarse desde EncargaGest sin trasladar primero su responsabilidad de impresión. `.molsan-icon-3d` lo genera `MolsanIcon`.
- Se han comprobado los consumidores de las tarjetas/controles de ambos portales: NotarGest utiliza `MolsanPageHeader`, `MolsanDataTable` y `MolsanStatCard`; EncargaGest utiliza `MolsanPageHeader` y `MolsanStatCard`. El espacio EncargaGest compone CTN, Agenda, Mensajes e Intranet como páginas hijas y no debe tratarse como una única hoja CSS aislada.
- **Incidencia visual localizada en NotarGest:** el `Sidebar` recibe todavía `headerActions` con fecha actual y botón «Actualizar datos»; el botón llama a `actualizarDatosSidebar`, que realiza la recarga de la bandeja o de la lista de notarías para el administrador. La petición visual de retirar fecha/actualización de las cabeceras sigue vigente, pero no se debe borrar el handler de recarga ni sus estados sin reubicar o decidir expresamente esa acción. Queda marcado como migración de acción fuera de cabecera, no como selector CSS huérfano.

### Resultado de esta comprobación

- No se han eliminado reglas de NotarGest ni EncargaGest en esta pasada: el cruce no aporta evidencia suficiente de selectores muertos.
- Se evita una regresión de impresión al conservar las clases globales activadas por ApoderaGest.
- La migración pendiente de NotarGest es estructural (sacar fecha/actualización del área de cabecera/sidebar), no un borrado indiscriminado de CSS.
- Esta revisión es estática. No sustituye la navegación autenticada ni la prueba visual responsive en Preview.


## 26. Corrección de alcance del hover Glass Luxe en paneles de contenido — 6 de noviembre de 2026

La inspección de `MolsanCanonicalVisual2027.css` detectó que la lista global de tarjetas incluía clases de panel/contenedor de contenido (`.ag-panel`, `.cg-panel`, `.eg-panel`, `.ng-panel`, `.ng-detalle-bloque` y `.ng-admin-global-resumen`). Esas clases describen paneles de trabajo, secciones y bloques de detalle, no necesariamente tarjetas de acceso/KPI. Al incluirlas en las reglas globales se les imponía franja superior cian, elevación y hover de tarjeta; esto contradecía el comentario de la propia hoja canónica que excluye paneles de contenido y podía crear líneas/animaciones internas no deseadas.

**Cambio aplicado:** se retiraron esas seis clases de las siete listas repetidas de selectores que gobiernan la superficie, hover, animación de icono y foco de las tarjetas globales. Se mantienen los selectores de tarjetas identificables (`.ag-grupo-apoderado`, `.ag-grupo-notario`, `.ag-carpeta-apoderado`, `.ng-admin-individual-panel`, etc.) y los paneles conservan sus reglas de módulo para estructura, bordes y espaciado. No se han borrado hojas CSS ni estilos funcionales específicos.

**Validación estática:** las siete listas objetivo se sustituyeron de forma exacta; no se tocó ningún otro bloque. Falta ejecutar build/lint y revisar visualmente Preview en Dashboard, ficha/detalle y modales de los tres portales, con especial atención a tarjetas KPI frente a paneles de contenido.


## 27. Reubicación de acciones de NotarGest fuera de Sidebar — 6 de noviembre de 2026

Se ha completado la incidencia estructural identificada en la sección 25:

- Se retiró de las props `headerActions` de `Sidebar` la fecha dinámica y el botón «Actualizar datos». La fecha ya no se calcula ni se muestra en esa cabecera lateral.
- La acción de actualización se conserva y se ha reubicado en la cabecera principal `MolsanPageHeader` del portal NotarGest. En el modo de administración global también queda disponible en la cabecera global, donde actualiza el catálogo de notarías.
- Se conservan el handler `actualizarDatosSidebar`, los estados `cargando` / `cargandoSelectorNotaria`, los bloqueos durante la operación y el indicador de carga giratorio. No se ha eliminado funcionalidad ni se han cambiado endpoints.
- Se retiraron de `NotarGest.css` los estilos obsoletos `.ng-sidebar-date`, `.ng-sidebar-live-dot` y `.ng-sidebar-refresh`. Se conserva `.ng-icono-girando`, que ahora utilizan las acciones reubicadas.

**Comprobación estática posterior:** las cuatro clases/variables de la cabecera lateral antigua (`fechaActual`, `.ng-sidebar-date`, `.ng-sidebar-live-dot`, `.ng-sidebar-refresh`) ya no aparecen ni en el JSX ni en la hoja CSS. `actualizarDatosSidebar` sigue teniendo sus dos puntos de invocación (cabecera principal y cabecera global) además de su definición; `.ng-icono-girando` sigue teniendo consumidores JSX y regla CSS. La comprobación no sustituye build, navegación ni prueba visual autenticada, que continúan pendientes.


## 28. Reconciliación de cobertura de ficheros frontend — 6 de noviembre de 2026

Se ha contrastado el árbol completo de `frontend-app/src` de esta rama con el contenido de esta auditoría y con el inventario de rutas:

- Árbol actual: **241 ficheros** bajo `frontend-app/src`: 143 JSX, 57 JS y 41 CSS.
- Las **41 hojas CSS** tienen registrada una pasada estática de llaves, bloques vacíos y selectores repetidos (sección 45). Esto no equivale a validar visualmente todas sus reglas ni todos los estados.
- El inventario `docs/INVENTARIO_RUTAS_FRONTEND_2027.md` registra 110 declaraciones Route y 91 componentes de destino distintos. La matriz ruta → componente está hecha; no certifica por sí sola todas las subpáginas, pestañas, estados y modales.
- La PR #409 contiene 103 ficheros cambiados, 97 bajo `frontend-app/src` (40 JSX/TSX y 57 CSS según el recuento documentado en la sección 49). Los restantes ficheros del árbol no se deben considerar automáticamente revisados por el hecho de que la PR sea amplia.
- La búsqueda de trazabilidad por nombre de fichero en esta auditoría encuentra referencias explícitas a 45 de los 143 JSX. Quedan **98 JSX sin una referencia individual inequívoca por nombre en el documento**. Esto es una lista de cobertura documental pendiente, no una afirmación de que ninguno haya sido leído durante las sesiones anteriores.

### JSX sin trazabilidad individual explícita en esta auditoría

**Componentes compartidos, layout, autenticación y utilidades**
- `components/AuthenticatedPhoto.jsx`
- `components/PortalLogin.jsx`
- `components/Sidebar.jsx`
- `components/SidebarPerfilModal.jsx`
- `components/agenda/AgendaToast.jsx`
- `components/agenda/AutocompleteNotario.jsx`
- `components/auth/RequireAuth.jsx`
- `components/auth/RequireModule.jsx`
- `components/ctn/PortalAccessTabs.jsx`
- `components/expedientes/ProvisionesLauncher.jsx`
- `components/expedientes/ProvisionesModal.jsx`
- `components/expedientes/VisibilidadTablas.jsx`
- `components/informes/InformeApoderado.jsx`
- `components/intranet/DocumentosTable.jsx`
- `components/intranet/NoticiasFeed.jsx`
- `components/layout/NotificacionesBadge.jsx`
- `components/logs/TablaLogs.jsx`
- `components/mensajes/MensajeBubble.jsx`
- `components/mensajes/MensajesHeader.jsx`
- `components/notificaciones/NotificacionesToast.jsx`
- `components/realtime/RealtimeGlobal.jsx`
- `components/ui/MolsanDetailField.jsx`
- `components/ui/MolsanSortableTh.jsx`
- `components/ui/MolsanStatCard.jsx`
- `components/ui/SelectSJ.jsx`
- `context/AuthContext.jsx`
- `icons/IconCalendar.jsx`
- `icons/IconClock.jsx`
- `icons/IconMonth.jsx`
- `icons/IconWeek.jsx`

**Páginas y módulos**
- `pages/LoginPage.jsx`
- `pages/ModuloPendiente.jsx`
- `pages/ModulosSelector.jsx`
- `pages/agenda/VistaDia.jsx`
- `pages/agenda/VistaMes.jsx`
- `pages/agenda/VistaSemana.jsx`
- `pages/apoderagest/ControlApoderados.jsx`
- `pages/ctn/Ctn.jsx`
- `pages/dashboard/Dashboard.jsx`
- `pages/empleados/EmpleadoEditar.jsx`
- `pages/empleados/EmpleadoFicha.jsx`
- `pages/empleados/EmpleadoPerfil.jsx`
- `pages/empleados/EmpleadosModulo2026.jsx`
- `pages/expedientes/FichaExpedienteDemo.jsx`
- `pages/fichajes/DocumentosAdmin.jsx`
- `pages/fichajes/FestivosCompensaciones.jsx`
- `pages/fichajes/Fichajes.jsx`
- `pages/fichajes/FichajesResumen.jsx`
- `pages/fichajes/SolicitudesAusencia.jsx`
- `pages/fusiones/Fusiones.jsx`
- `pages/herramientas/AdministracionEmpleadoConfig.jsx`
- `pages/herramientas/AltaExpediente.jsx`
- `pages/herramientas/AsignarExpedientesPromociones.jsx`
- `pages/herramientas/CambiarGestorExpediente.jsx`
- `pages/herramientas/CambiosActividadAbsis.jsx`
- `pages/herramientas/CatalogoAbsis.jsx`
- `pages/herramientas/CatalogoFichajes.jsx`
- `pages/herramientas/CatalogoOficinas.jsx`
- `pages/herramientas/ComplementosSaldo.jsx`
- `pages/herramientas/CorrespondenciaTipificada.jsx`
- `pages/herramientas/CrearNoticia.jsx`
- `pages/herramientas/DatosMolsan.jsx`
- `pages/herramientas/FirmasEmail.jsx`
- `pages/herramientas/HonorariosGestoria.jsx`
- `pages/herramientas/ImportacionesDatos.jsx`
- `pages/herramientas/ImportadorPostFirma.jsx`
- `pages/herramientas/ImportarCTN.jsx`
- `pages/herramientas/LecturaCancelaI.jsx`
- `pages/herramientas/LecturaCopias.jsx`
- `pages/herramientas/MantenimientoTecnico.jsx`
- `pages/herramientas/ModelosDocumentos.jsx`
- `pages/herramientas/Municipios.jsx`
- `pages/herramientas/OficinasLiquidadoras.jsx`
- `pages/herramientas/PPAD.jsx`
- `pages/herramientas/ProcesoAbsis.jsx`
- `pages/herramientas/ReasignarNotarioExpediente.jsx`
- `pages/herramientas/RegistrosPropiedad.jsx`
- `pages/herramientas/ReglasActividadesExpediente.jsx`
- `pages/herramientas/SubirDocumento.jsx`
- `pages/herramientas/TiposConceptoGastos.jsx`
- `pages/herramientas/TiposImpositivos.jsx`
- `pages/herramientas/Verifacti.jsx`
- `pages/herramientas/importador_absis.jsx`
- `pages/intranet/Intranet.jsx`
- `pages/maestros/Maestros.jsx`
- `pages/mensajeria/MensajeriaProveedores.jsx`
- `pages/mensajes/Mensajes.jsx`
- `pages/notificaciones/Notificaciones.jsx`
- `pages/paneltecnico/MonitorRealtime.jsx`
- `pages/paneltecnico/PanelTecnico.jsx`
- `pages/seguridad/Seguridad.jsx`
- `pages/seguridad/SeguridadFicha.jsx`
- `pages/seguridad/SeguridadModulos.jsx`
- `pages/seguridad/SeguridadPermisos.jsx`
- `pages/seguridad/SeguridadResumen.jsx`
- `pages/seguridad/SeguridadRolEditor.jsx`
- `pages/seguridad/SeguridadRoles.jsx`
- `pages/seguridad/SeguridadUsuarios.jsx`

### Qué falta para poder declarar cierre

1. Reconciliar estos 98 JSX con la memoria de revisión y comprobar especialmente los componentes compartidos que afectan a todas las rutas: Sidebar, MolsanStatCard, MolsanDetailField, MolsanSortableTh, SelectSJ, autenticación, notificaciones y layouts.
2. Verificar que los 91 destinos de ruta quedan cubiertos por la revisión de componentes; incluir las vistas secundarias de Agenda, Fichajes, Seguridad y Herramientas que no tengan evidencia explícita.
3. Ejecutar build sobre el HEAD actual y pruebas de navegación/modal/responsive en Preview. Para el HEAD actual `a2b042a8ccd1f0f0340cb06c84582c23cef45564`, GitHub no devuelve ejecuciones de workflow ni checks asociados. No se declara build ni despliegue de este HEAD.
4. La revisión visual autenticada de todas las rutas no está certificada por la auditoría estática. No se marca como terminada por extrapolación desde un build anterior.

**Conclusión de cobertura:** el inventario de rutas y el barrido estático de las 41 hojas CSS están documentados; la revisión individual de todos los JSX no puede darse por cerrada con la evidencia documental actual. Esta sección deja identificados los 98 ficheros cuya revisión necesita trazabilidad explícita, sin afirmar que el trabajo previo sobre ellos no haya existido.


## 29. Primera pasada de componentes compartidos pendientes — 6 de noviembre de 2026

Se ha iniciado la revisión individual de los componentes compartidos señalados en la sección 28. Esta pasada incorpora cambios concretos y acotados:

- `components/layout/NotificacionesBadge.jsx`: eliminado el uso de `material-icons` para el icono de campana. Ahora utiliza `MolsanIcon`, conserva el contador reactivo del store y limita visualmente el valor mostrado a `99+` sin alterar el total real.
- `components/ui/MolsanSortableTh.jsx`: sustituidos los caracteres Unicode de ordenación por los pictogramas corporativos `MolsanIcon` (`arrowUp`, `arrowDown`, `arrowUpDown`). Se mantienen `aria-sort`, el callback y la semántica del botón.
- `components/PortalLogin.jsx`: corregida la clase raíz de `portal-login` a `portal-login-premium`, que es la clase realmente gobernada por `LayoutPortalesPremium.css`. Así el login profesional recibe los tokens de fondo, tipografía, superficie de formulario y foco visible definidos en la capa compartida.

### Componentes inspeccionados sin modificación

- `components/Sidebar.jsx`: iconografía principal ya centralizada en `MolsanIcon`; navegación y permisos conservados. Requiere aún revisión completa de todos los estados responsive y menús superpuestos.
- `components/ui/MolsanStatCard.jsx`: componente común basado en clases `molsan-stat-card*`; no se ha reescrito porque la apariencia depende de sus reglas CSS compartidas y de las variantes consumidas por los portales.
- `components/ui/MolsanDetailField.jsx`: estructura de campo de detalle con blanco/azul hielo, borde corporativo y jerarquía tipográfica coherente. No se modifica.
- `components/ui/SelectSJ.jsx`: conserva gestión de foco, Escape, selección y cierre al hacer clic fuera. Pendiente contrastar todas sus variantes con el sistema de formularios y los consumidores.
- `components/AuthenticatedPhoto.jsx`: mantiene descarga autenticada de fotografías protegidas mediante Bearer y URL Blob temporal, con revocación en cleanup. No se altera el origen/API ni la autenticación.
- `components/SidebarPerfilModal.jsx`: delega el modal al componente compartido `ModalEmpleado`; no introduce una capa visual propia.
- `components/ui/useAccessibleDialog.js`: implementa foco inicial, trampa de Tab, Escape, soporte de diálogos apilados y restauración del foco.
- `components/auth/RequireAuth.jsx` y `RequireModule.jsx`: son guards funcionales, no superficies visuales de módulo; se preservan sin cambios de autorización.

### Límite de validación

Los cambios están escritos en la rama de trabajo y comprobados mediante lectura posterior del contenido guardado. Esta comprobación no equivale a ejecutar el build, pruebas automatizadas ni navegación visual autenticada. La revisión de Sidebar, StatCard, SelectSJ y los componentes de notificaciones no se considera globalmente cerrada hasta completar sus consumidores y variantes.


## 30. Segunda pasada: vistas secundarias y clasificación de JavaScript — 6 de noviembre de 2026

### Vistas inspeccionadas y correcciones

- Agenda: inspeccionadas `VistaDia.jsx`, `VistaMes.jsx` y `VistaSemana.jsx`. Las tres consumen tokens ERP/Molsan para superficies, bordes y azul principal; los colores de reunión, firma pendiente y firma realizada se mantienen como estados semánticos. No se ha cambiado la lógica de calendario ni de citas.
- Seguridad: inspeccionadas `SeguridadResumen.jsx` y `SeguridadUsuarios.jsx`. Las páginas ya usan `MolsanPageHeader`, contenedores `erp-card`, badges y controles compartidos; no se reescriben sus permisos ni sus operaciones.
- Fichajes: inspeccionadas `FichajesResumen.jsx` y `SolicitudesAusencia.jsx`. El resumen usa `MolsanStatCard` y `MolsanPremiumCard`; no se alteran solicitudes ni endpoints.
- Herramientas: `CatalogoOficinas.jsx` y `HonorariosGestoria.jsx` tenían colores Tailwind slate/blue/indigo específicos en tarjetas, tablas y acciones. Se han migrado esos colores de presentación a los tokens corporativos MOLSAN (azul principal, azul hielo, texto secundario, borde y cabecera de tabla). Se conservan los colores semánticos de éxito/error y los flujos de importación, paginación, tarifas y plantilla Word.
- ApoderaGest: el título y subtítulo base de la cabecera local en `ApoderaGest.css` dejan de usar los tonos antiguos `#1b2a43` / `#7a879b` y pasan a `--molsan-primary` / `--molsan-text-secondary`. No se han borrado reglas estructurales ni estados funcionales.

### Reconciliación de los 57 ficheros JavaScript

El árbol documentado contiene 57 ficheros `.js`. La lectura del árbol Git recursivo ha localizado los 57 y se han leído los 57. Ninguno contiene JSX ni devuelve componentes visuales; por su ubicación y exportaciones se clasifican como capa de datos, hooks, estado o configuración. Los cuatro ficheros que no aparecían en el índice de búsqueda se localizaron directamente en el árbol Git y también se leyeron.

**API (21 localizados):** `api/ctn.js`, `api/auth.js`, `api/logs.js`, `api/axios.js`, `api/config.js`, `api/agenda.js`, `api/intranet.js`, `api/maestros.js`, `api/mensajes.js`, `api/notarios.js`, `api/empleados.js`, `api/dashboard.js`, `api/auditoria.js`, `api/seguridad.js`, `api/fetchAuth.js`, `api/encargagest.js`, `api/expedientes.js`, `api/herramientas.js`, `api/monitorRealtime.js`, `api/expedienteDefectos.js`, `api/expedienteAcciones.js`.

**Hooks (19 localizados):** `hooks/useCtn.js`, `hooks/useLogs.js`, `hooks/useAgenda.js`, `hooks/useAgendaWS.js`, `hooks/useIntranet.js`, `hooks/useNotarios.js`, `hooks/useDashboard.js`, `hooks/useEmpleados.js`, `hooks/useSeguridad.js`, `hooks/useAgendaData.js`, `hooks/useIntranetWS.js`, `hooks/useMensajesWS.js`, `hooks/useUtilidades.js`, `hooks/useEmpleadosWS.js`, `hooks/useHerramientas.js`, `hooks/useRealtimeGlobal.js`, `hooks/useNotificacionesWS.js`, `components/ui/useAccessibleDialog.js`, `hooks/useSortableData.js`.

**Stores (12 localizados):** `store/ctnStore.js`, `store/logsStore.js`, `store/authStore.js`, `store/agendaStore.js`, `store/mensajesStore.js`, `store/intranetStore.js`, `store/notariasStore.js`, `store/dashboardStore.js`, `store/empleadosStore.js`, `store/seguridadStore.js`, `store/herramientasStore.js`, `store/notificacionesStore.js`.

**Utilidades/configuración/realtime (5 localizados):** `utils/permisos.js`, `config/modulos.js`, `realtime/realtimeClient.js`, `utils/formatters.js`, `utils/sortRows.js`.

### Build y CI

Se ha comprobado `frontend-app/package.json`: el comando de compilación disponible es `npm run build` (Vite). Se han localizado siete workflows, pero los workflows de build existentes están limitados a PR hacia `main` o a rutas concretas; la PR #411 apunta a `fix/molsan-css-selector-audit-round1` y sus cambios no satisfacen los filtros de rutas de los otros workflows. El workflow de seguridad solo se activa al cambiar `frontend-app/package.json` o su propio YAML.

Para el commit `0cdde89adb6c1cc8a4901c5afa4f20c5a45515a3`, GitHub devuelve cero ejecuciones asociadas y cero status checks. No se ha podido ejecutar `npm run build` desde esta sesión ni se declara build correcto. La compilación sigue siendo una condición pendiente, no un resultado supuesto.

**Cobertura restante:** 98 JSX que al inicio de esta pasada carecían de trazabilidad individual inequívoca en la sección 28; 0 JS pendientes de localizar; quedan pendientes consumidores de componentes compartidos, modales, estados responsive y navegación visual autenticada en Preview.


## 31. Tercera pasada de componentes compartidos y expedientes — 6 de noviembre de 2026

- `components/mensajes/MensajesHeader.jsx`: sustituida la paleta slate/blue del encabezado de conversación por tokens Molsan de borde, superficie, sombra, texto principal y azul hielo. Se mantiene el verde de estado online/offline como indicador semántico.
- `components/ui/MolsanDetailField.jsx`: sus valores de color literales se han sustituido por referencias a los tokens centrales `--molsan-border`, `--molsan-surface-soft`, `--molsan-text-secondary` y `--molsan-primary`; el resultado visual sigue usando la paleta corporativa acordada.
- `components/expedientes/ProvisionesLauncher.jsx`: el acceso flotante deja de usar fondo slate casi negro y el símbolo monetario como icono; pasa al botón azul corporativo y a `MolsanIcon wallet`. Se conservan ruta, condición de visibilidad y apertura del modal.
- `components/expedientes/ProvisionesModal.jsx`: el control de cierre deja de utilizar el carácter Unicode `×` y usa `MolsanIcon x`; no se modifica el flujo del modal.
- Inspeccionados `AgendaToast.jsx`, `AutocompleteNotario.jsx`, `PortalAccessTabs.jsx`, `VisibilidadTablas.jsx`, `InformeApoderado.jsx`, `DocumentosTable.jsx`, `NoticiasFeed.jsx`, `TablaLogs.jsx`, `MensajeBubble.jsx`, `RealtimeGlobal.jsx`, `MolsanStatCard.jsx`, `MolsanPremiumCard.jsx` y `SelectSJ.jsx`. No se reescriben componentes cuyo estilo está gobernado por clases compartidas o tokens existentes sin tener confirmados todos sus consumidores. Continúa pendiente la comprobación visual y responsive.

**Verificación de contenido tras escritura:** se recuperaron los ficheros modificados y se comprobaron las nuevas clases/tokens. Esto no equivale a compilación.


## 32. Cuarta pasada de subpáginas operativas y herramientas — 6 de noviembre de 2026

Se han inspeccionado y normalizado a tokens corporativos, sin cambiar sus operaciones:

- Fichajes: `FestivosCompensaciones.jsx`, `Fichajes.jsx` y `SolicitudesAusencia.jsx`; se sustituyen paletas slate/blue/violet de controles, formularios, tablas y botones por los tokens Molsan. Los estados semánticos de aprobación, error y éxito se conservan.
- Expedientes: `FichaExpedienteDemo.jsx` y componentes compartidos de provisiones; se alinean superficies y controles, el acceso flotante usa azul corporativo + icono wallet y el cierre del modal usa MolsanIcon.
- ApoderaGest: `ControlApoderados.jsx` migra tarjetas, tablas, campos y botones a tokens; sus controles de mes usan iconos Molsan en lugar de flechas Unicode.
- Herramientas: se normalizan `CambiosActividadAbsis.jsx`, `CatalogoAbsis.jsx`, `CatalogoFichajes.jsx`, `ComplementosSaldo.jsx`, `CorrespondenciaTipificada.jsx`, `DatosMolsan.jsx`, `FirmasEmail.jsx`, `ImportadorPostFirma.jsx`, `ImportarCTN.jsx`, `LecturaCancelaI.jsx`, `LecturaCopias.jsx`, `MantenimientoTecnico.jsx`, `ModelosDocumentos.jsx`, `Municipios.jsx`, `PPAD.jsx`, `ProcesoAbsis.jsx`, `ReasignarNotarioExpediente.jsx`, `RegistrosPropiedad.jsx`, `ReglasActividadesExpediente.jsx`, `SubirDocumento.jsx`, `TiposConceptoGastos.jsx`, `TiposImpositivos.jsx`, `Verifacti.jsx`, `importador_absis.jsx`, `AdministracionEmpleadoConfig.jsx`, `CrearNoticia.jsx` y `OficinasLiquidadoras.jsx`. Se migran tonos decorativos slate/blue/indigo/violet/cyan a variables corporativas; se conservan colores de estados, advertencias y acciones de riesgo cuando son semánticos. El signo de suma de «Nueva oficina» pasa a MolsanIcon.
- Intranet y comunicación: `Intranet.jsx`, `MensajeriaProveedores.jsx`, `Mensajes.jsx` y `MensajesHeader.jsx` normalizan controles, superficies, tablas y texto a tokens Molsan.
- Seguridad: `SeguridadFicha.jsx` y `SeguridadModulos.jsx` normalizan sus colores decorativos a la paleta corporativa; se mantienen badges/estados con significado.
- ApoderaGest CSS: títulos y subtítulos base usan los tokens Molsan en lugar de los dos tonos antiguos.

**Preservación funcional:** no se han cambiado endpoints, payloads, permisos, datos, reglas de negocio ni llamadas de guardado/importación. Son sustituciones de clases de presentación y de pictogramas de interfaz.

**Validación:** cada fichero editado se recuperó de GitHub antes de escribir y las escrituras devolvieron commit SHA. No se ha ejecutado build ni inspección visual autenticada. Algunos componentes complejos (Maestros, Oficinas Liquidadoras, municipios y modales anidados) necesitan prueba visual específica antes de declararlos cerrados.


## 33. Corrección de clases raíz desconectadas de CSS compartido — 6 de noviembre de 2026

La lectura cruzada de `molsan-design-system.css` y los componentes detectó clases de alcance responsive/foco definidas en CSS pero no aplicadas en sus raíces JSX. Se han conectado y verificado por lectura posterior:

- `AgendaToast.jsx` → `agenda-toast-premium`
- `NotificacionesToast.jsx` → `notificaciones-toast-premium`
- `TablaLogs.jsx` → `tabla-logs-premium`
- `MensajeBubble.jsx` → `mensaje-bubble-premium`
- `MensajesHeader.jsx` → `mensajes-header-premium`
- `AutocompleteNotario.jsx` → `autocomplete-notario-premium`
- `SelectSJ.jsx` → `select-sj-premium`

Estas clases activan reglas compartidas de ancho mínimo, foco visible, tablas, listas de opciones, overflow táctil y reducción de movimiento donde corresponde. No se cambian sus handlers, store, autenticación ni navegación. Se ha comprobado que los siete nombres de clase están presentes en los ficheros guardados. Sigue pendiente la comprobación visual de cada estado y viewport.


## 34. Cierre de reconciliación JavaScript — 6 de noviembre de 2026

La consulta del árbol Git recursivo de la rama ha permitido localizar los cuatro ficheros que faltaban en el índice de búsqueda: `components/ui/useAccessibleDialog.js`, `hooks/useSortableData.js`, `utils/formatters.js` y `utils/sortRows.js`. Se han leído los cuatro.

La cobertura JavaScript queda reconciliada: **57 de 57** ficheros leídos, clasificados como API (21), hooks (19), stores (12) y utilidades/configuración/realtime (5). Ninguno contiene JSX ni implementa una superficie visual; `useAccessibleDialog` sí gestiona foco/teclado de los modales y se conserva como comportamiento transversal de accesibilidad.

La reconciliación JavaScript queda cerrada. La cobertura JSX y la validación de build/visual siguen abiertas.


## 35. Última pasada de iconografía, clases Tailwind y componentes de formulario — 6 de noviembre de 2026

- Se han conectado las clases raíz compartidas de toast, logs, mensajes, autocomplete y SelectSJ (sección 33).
- En Catálogo ABSIS, Fichajes, Alta de expediente, Proceso ABSIS e Importaciones se han sustituido signos funcionales (`+`, flechas, doble chevrón y pictogramas de texto) por `MolsanIcon`; se conserva el texto accesible y las etiquetas aria.
- Se ha corregido una familia de clases Tailwind que había quedado con modificador de opacidad después de una variable CSS arbitraria (forma inválida como `bg-[var(--token)]/40`). Se han eliminado los sufijos incompatibles en Fichajes, FichaExpedienteDemo, ComplementosSaldo, CorrespondenciaTipificada, ImportadorPostFirma, ImportarCTN, ModelosDocumentos, RegistrosPropiedad, ReglasActividadesExpediente, TiposConceptoGastos, Verifacti, Administración de empleados, Mensajes, SeguridadModulos y ControlApoderados.
- La paleta de la vista previa de ModelosDocumentos se ha llevado a azul corporativo y azul hielo, preservando el significado de las zonas seleccionadas del editor.
- Se ha comprobado por lectura posterior que los siete componentes de la sección 33 conservan su clase raíz compartida.

**Límite:** esta pasada estática reduce clases inválidas conocidas y pictogramas inconsistentes, pero no sustituye el build de Vite ni la prueba real en navegador. El estado de compilación sigue sin confirmarse.


## 37. Reconciliación final de JSX y validación de compilación — 6 de noviembre de 2026

### Cobertura JSX cerrada a nivel de lectura estática

Se han leído individualmente los 98 JSX enumerados inicialmente en la sección 28. Sumados a los 45 que ya tenían referencias explícitas en la auditoría anterior, queda revisado el conjunto documentado de **143/143 JSX** del árbol `frontend-app/src`.

En esta última pasada se incluyeron:
- Autenticación y navegación: `LoginPage`, `ModulosSelector`, `ModuloPendiente`, `Sidebar`, `SidebarPerfilModal`, guards y contexto.
- Vistas de Agenda, CTN, Dashboard, empleados, expedientes, Fichajes, Fusiones, Intranet, Maestros, Mensajería, Mensajes, Notificaciones, Panel Técnico y todas las subpáginas de Seguridad.
- Las 33 herramientas/catálogos enumerados en secciones 29–35.
- Componentes compartidos de portales, notificaciones, logs, tablas, informes, formularios, modales y pictogramas.

No se han forzado cambios en las superficies que ya responden al patrón acordado: el login se conserva porque su rediseño ya está consolidado; `ModulosSelector` se conserva como referencia visual de Espacios de trabajo; Dashboard, CTN, Seguridad y Maestros mantienen sus componentes/tokens compartidos. Los colores de estado y los controles de decisión se conservan por semántica, no como decoración.

### Últimas conexiones CSS

- `PortalAccessTabs.jsx` recibe `portal-access-tabs-premium`.
- `DocumentosTable.jsx` recibe `intranet-documentos-table-premium`.
- `NoticiasFeed.jsx` recibe `intranet-noticias-feed-premium`.
- `InformeApoderado.jsx` recibe `informe-apoderado-premium`.
- Los estilos de foco/reducción de movimiento de perfil se vinculan al selector real `.empleado-operativo-modal`.
- La página operativa de `MantenimientoTecnico.jsx` y la raíz de `Verifacti.jsx` reciben sus clases premium compartidas.
- `DocumentosAdmin.jsx` normaliza cabecera de tabla, inputs y botón de descarga con tokens Molsan; los botones Aprobar/Rechazar mantienen colores de resultado.

### Compilación

<badge color="success">Build frontend correcto</badge>

Para el commit de código `b8baf97b85358ebdd028767154390ae7f54306fe`, la ejecución GitHub Actions `42293606642` terminó con:
- Build del frontend: **success** (`npm install` + `npm run build`).
- Sintaxis Python del backend de fichajes: **success**.

El commit posterior de documentación no cambia código ejecutable. Se observan ejecuciones independientes de `supabase-schema-audit` que terminan en failure sin jobs; no son el workflow de compilación frontend y esta rama no ha modificado backend, esquema ni datos de Supabase.

### Estado real de cierre

- CSS: 41/41 hojas con pasada estática documentada.
- JSX: 143/143 leídos individualmente.
- JS: 57/57 leídos y clasificados.
- Build: correcto en el último commit de código.
- Pendiente externo: navegación visual autenticada y responsive en Render Preview. No se afirma que el aspecto final esté validado en navegador.
- PR #411 continúa abierta y en Draft; no se fusiona ni se despliega a producción sin revisión visual y aprobación.


## 38. Cruce focalizado de selectores CSS y consumidores JSX — 7 de noviembre de 2026

Se ha realizado una pasada adicional de relación CSS→JSX sobre los portales y varias familias técnicas, buscando también consumidores fuera del JSX principal de cada módulo. El objetivo es distinguir selectores realmente huérfanos de selectores compartidos, utilidades de impresión y clases generadas por componentes comunes.

### Portales profesionales

- **ApoderaGest:** los seis nombres que no aparecían en el JSX principal se han localizado en sus consumidores reales: `ag-print-footer`, `molsan-print-agenda` y `ag-agenda-print-root` en `Agenda.jsx`; `molsan-icon-3d` en `MolsanIcon.jsx`; `molsan-stat-card` en `MolsanStatCard.jsx`. No se retiran.
- **NotarGest:** el único selector no localizado en el JSX principal, `molsan-icon-3d`, pertenece al componente compartido `MolsanIcon.jsx`. El resto de selectores examinados tiene consumidor en `NotarGest.jsx`.
- **EncargaGest:** `molsan-icon-3d` se resuelve en `MolsanIcon.jsx` y `encargagest-workspace-premium` en `EncargaGestWorkspace.jsx`. Permanecen como candidatos de comprobación global `molsan-print-encargos-lista` y `molsan-print-encargos-fichas`: aparecen en reglas `@media print` de `EncargaGest.css`, pero no en los dos JSX principales consultados. No se eliminan hasta descartar consumidores indirectos o activación dinámica fuera de esos archivos.

### Módulos técnicos y subpáginas

- **Catálogos/Maestros:** seis clases que inicialmente no aparecían en el subconjunto de páginas inspeccionado se han localizado en sus consumidores: `correspondencia-tipificada-premium`, `importar-ctn-premium`, `subir-documento-premium`, `cambiar-gestor-premium`, `tipos-concepto-gastos-premium` y `utilidades-premium-page`. No eran reglas huérfanas; el CSS agrupa varias subpáginas.
- **Panel Técnico:** `panel-tecnico-premium` se consume en `PanelTecnico.jsx`; `panel-tecnico-submodulo-premium` en las cuatro subpáginas de Auditoría avanzada, Logs avanzados, Monitor Realtime y Monitor de sistema. `overflow-x-auto` aparece en las subpáginas que necesitan tablas desplazables. No se detecta selector huérfano en el conjunto contrastado.
- **Expedientes:** la hoja de listado utiliza un grupo semántico `:is(.text-red-600, .text-red-700, .text-rose-600, .text-rose-700)` para mantener el peso de los mensajes de error. `text-rose-600` no aparece en los JSX seleccionados; no se elimina porque forma parte de una regla de compatibilidad para variantes de color y no de un bloque visual autónomo. La hoja de ficha no presenta clases sin consumidor en el conjunto de ficha y modales contrastado.

### Resultado y límites

- Se han resuelto falsos positivos causados por consumidores en páginas hermanas, componentes compartidos y subpáginas.
- Se deja identificado el único candidato concreto de esta pasada: las dos clases de impresión de EncargaGest, pendientes de búsqueda en el conjunto completo de JSX y de comprobar cómo se activa la impresión.
- No se han borrado selectores por coincidencia negativa parcial. La eliminación exige confirmar ausencia global de consumidor y revisar estados de impresión, modales y responsive.
- Esta comprobación es estática y focalizada; no sustituye la inspección visual autenticada de Preview ni las pruebas interactivas de los modales.


## 39. Eliminación de duplicidad en reglas de impresión de portales — 7 de noviembre de 2026

Se ha contrastado el candidato de impresión de EncargaGest contra sus consumidores reales:

- `molsan-print-encargos-lista` y `molsan-print-encargos-fichas` se activan dinámicamente desde `ApoderaGest.jsx` y sus reglas de visibilidad/raíz imprimible están centralizadas en `PortalProfesionalShared.css`, que importan ApoderaGest, NotarGest y EncargaGest.
- `EncargaGest.css` repetía únicamente la ocultación global `visibility:hidden!important` para esos dos estados, creando una segunda fuente de control de impresión sin aportar comportamiento adicional.
- Se han retirado solo esas dos reglas duplicadas de `EncargaGest.css`. Se conservan el formato A4 y los márgenes de página, así como `print-color-adjust: exact`. La visibilidad de la vista imprimible permanece en la hoja compartida.

No se han eliminado las clases de impresión ni los selectores compartidos. La corrección es una deduplicación de cascada; requiere aún comprobación de impresión en navegador y no se considera validación visual completa.


## 40. Centralización y recuperación de estilos de impresión — 7 de noviembre de 2026

La reconciliación del árbol de la rama mostró que la antigua hoja `PortalProfesionalShared.css` ya no existe en esta rama y que la hoja activa es `PortalProfesionalPremium2027.css`. Los portales importan esta última desde `main.jsx`. La antigua lógica de impresión compartida no se había trasladado a la hoja activa.

Se ha corregido la brecha en la capa canónica de portales:

- Se han centralizado en `PortalProfesionalPremium2027.css` los estilos de impresión de Agenda y ApoderaGest, con la paleta Molsan para los controles de impresión y formato documental blanco/A4.
- Se conservan los tres modos de impresión: agenda, listado de encargos y fichas detalladas.
- Se asegura que el contenido imprimible sea visible y que el resto de la aplicación quede oculto durante la impresión.
- Se ha añadido la clase `ag-print-ficha` a cada artículo de ficha para que las reglas de salto de página se apliquen al elemento real del JSX.
- Se ha retirado de `EncargaGest.css` la regla local duplicada de ocultación, manteniendo allí los márgenes A4 y la impresión de colores. La gestión de visibilidad queda centralizada.

### Verificación y límites

- Los ficheros modificados se han recuperado de nuevo desde GitHub tras escritura.
- La rama de la PR #411 apunta al commit de código `8e795ec04189efdb296944832fc2fc92eb7a7ddc`.
- El workflow de validación asociado al último commit se encontraba en cola al documentar esta sección; no se declara todavía como correcto.
- Sigue pendiente abrir Preview en navegador y probar realmente la impresión de agenda, listado y fichas, además de la inspección visual de los portales y modales. Esta corrección estática no se presenta como prueba visual.


### Ajuste final de la centralización de impresión

Una segunda comprobación de las hojas realmente importadas desde `main.jsx` localizó reglas residuales de ocultación e impresión en `molsan-module-styles.css` y `EncargaGest.css`. Se han retirado esas duplicidades: `PortalProfesionalPremium2027.css` queda como única fuente de reglas de impresión de Agenda y ApoderaGest. Se conserva la impresión A4, el ajuste de color, la ocultación de la aplicación y la presentación exclusiva de la raíz imprimible. La hoja global de portales está importada desde `main.jsx`, por lo que no depende de imports dinámicos de una página.


## 41. Revisión de duplicidades entre capas globales — 7 de noviembre de 2026

Se ha repetido el cruce estático de selectores en las diez hojas globales activas: Redesign, Premium, Global Consistency, Glass Luxe Unified, Canonical Visual, Design System, Module Styles, Tokens, Portal Profesional Premium y Cards Premium.

- Antes de centralizar impresión se detectaban dos selectores globales repetidos entre hojas: la ocultación de contenido para impresión y el ajuste universal de color de impresión.
- Tras mover ambas responsabilidades a `PortalProfesionalPremium2027.css` y retirar los bloques de `molsan-module-styles.css` y `EncargaGest.css`, el cruce exacto no encuentra selectores duplicados entre hojas globales distintas (0 coincidencias en esta comparación).
- Se mantienen los selectores repetidos dentro de una misma hoja cuando son capas responsive, estados o refinamientos posteriores de cascada; no se borran automáticamente por igualdad textual sin analizar orden, media queries y especificidad.

La comparación es estática y exacta; no prueba equivalencia semántica entre selectores distintos ni sustituye una inspección de cascada en navegador.


## 42. Normalización de iconografía y auditoría de compatibilidad de cabeceras — 7 de noviembre de 2026

### Corrección aplicada

- frontend-app/src/layout/Layout.jsx: el botón común de retorno de subpágina utilizaba el carácter Unicode «←». Se ha sustituido por MolsanIcon name="arrowLeft", manteniendo el texto visible «Volver», el aria-label, el destino de navegación y la inserción del botón mediante portal.
- Commit de la corrección: 40d6ec6c3e16b09a28fd599782c5d2e0374ef80b.

### Riesgos estructurales identificados que no se eliminan sin prueba de consumidores

- Layout.jsx conserva dos efectos de compatibilidad: uno detecta cabeceras estructurales heredadas y les añade las clases molsan-page-header y molsan-page-header--legacy; otro localiza la cabecera de subpágina, oculta controles «Volver» antiguos y monta el control común en su zona de acciones.
- Ambos efectos utilizan MutationObserver para cubrir páginas que renderizan su cabecera de forma asíncrona. El primer efecto se desactiva cuando encuentra una cabecera Premium o una cabecera estructural heredada; el segundo se desactiva al localizar la primera .molsan-page-header.
- La detección de cabecera heredada utiliza selectores estructurales y selectores específicos de herramientas. Aunque excluye diálogos en el elemento finalmente seleccionado, todavía requiere comprobar en cada ruta que el selector no alcance un encabezado interno de una sección, un panel o una vista hija.
- El segundo efecto consulta .molsan-page-header en todo .erp-main-inner; no limita la búsqueda a .erp-route-content ni exige que la cabecera pertenezca al nivel principal de la página. En rutas con más de una cabecera Premium, la primera coincidencia del DOM podría ser una cabecera secundaria. No se cambia esta lógica sin inventariar las rutas y validar sus estructuras reales.
- El botón de retorno se monta en .molsan-page-header__actions cuando existe; si no, se monta en el propio header. Se debe confirmar que no desplace acciones, no se duplique y no quede fuera del orden visual esperado en páginas con acciones propias.

### Pruebas pendientes para retirar la compatibilidad heredada

1. Inventariar por ruta la existencia y posición DOM de MolsanPageHeader, headers estructurales y acciones de retorno heredadas.
2. Verificar las rutas principales y subpáginas de Expedientes, Agenda, CTN, Fusiones, Provisiones, Mensajería, Informes, Catálogos, Maestros, Herramientas y Seguridad.
3. Probar carga inicial y render asíncrono, navegación entre rutas sin recarga, retorno al módulo padre, modales abiertos y cierre de modales.
4. Confirmar ausencia de parpadeo, doble cabecera, doble botón, botones ocultos que sigan ocupando espacio y desplazamientos de las acciones.
5. Solo después de esa matriz se podrá retirar MutationObserver y la capa legacy sin arriesgar páginas que todavía dependan de ella.

### Estado de validación

La corrección de iconografía está escrita en la rama de trabajo. Esta sección documenta un riesgo de compatibilidad y un plan de prueba; no afirma que la capa heredada esté ya retirada ni que la validación visual de Preview esté completada.


## 43. Reconciliación del árbol completo, cascada de importación y build de la rama — 7 de noviembre de 2026

### Inventario real del árbol

Se ha consultado el árbol Git recursivo de molsan-premium-deep-cleanup-continuation. GitHub devuelve 241 archivos bajo frontend-app/src, con el siguiente desglose exacto: 143 JSX, 57 JS y 41 CSS. El árbol no está truncado. La cifra coincide con el inventario documentado anteriormente; no se ha usado el número de archivos modificados por el PR como sustituto del inventario total.

### Cascada global de estilos

Se ha leído main.jsx y se ha confirmado el orden de importación: index.css y tokens/design system primero; App; después MolsanFase3, molsan-module-styles y las hojas propias de ApoderaGest, EncargaGest y NotarGest; finalmente Redesign, Premium, Cards, Portal Profesional, Global Consistency, Glass Luxe y Canonical Visual. Canonical Visual es la última capa visual importada.

Se identifica un frente de migración todavía abierto: index.css se describe expresamente como base heredada y mantiene bloques de compatibilidad SJ-2026 para layout, tarjetas, tablas, formularios, tabs y modales. Sus comentarios indican que se mantienen mientras existan consumidores legacy. No se elimina de forma global sin cruzar cada clase con JSX y comprobar que los estilos funcionales de esos consumidores ya están migrados.

### Variantes de color detectadas

Se ha realizado un muestreo de literales cromáticos en las 41 hojas CSS. Hay tonos antiguos slate/azul en varias hojas de módulos y portales (incluidas ApoderaGest.css, Cancelagest.css, CancelagestUnified.css, CtnListadoPage.css, EncargaGest.css, MolsanRedesign2027.css y SeguridadSubpaginasPremium.css). Parte de esos valores representa texto neutro o superficies heredadas; otros son estados semánticos de aprobación, error, advertencia, éxito, disponibilidad o riesgo. Por tanto, el mero hecho de no coincidir con los seis colores base no justifica sustituirlos todos.

El siguiente criterio de normalización es: sustituir los tonos decorativos antiguos por tokens corporativos; mantener los colores de estado solo cuando su significado sea explícito y coherente; y no modificar colores de datos, estados o acciones destructivas sin revisar el componente que los produce.

### Build verificado tras las últimas escrituras

Para el HEAD 8353889c97fa37443460ba78956e6202910dc410, GitHub Actions ejecutó MOLSAN frontend premium build (run 42348344681). El job Vite production build terminó con success; tanto Install dependencies como Build frontend terminaron correctamente. La validación de Fichaje Molsan también terminó con success. El workflow supabase-schema-audit figura como failure separado y no forma parte de la compilación frontend; no se atribuye a este cambio de estilos.

PR #411 continúa abierta y en Draft, con base fix/molsan-css-selector-audit-round1 y head molsan-premium-deep-cleanup-continuation. No se ha fusionado ni desplegado a producción.

### Límite

El árbol completo está reconciliado y el build del HEAD está correcto. Esto no equivale a una inspección semántica exhaustiva de cada regla CSS ni a validación visual autenticada de las 91 rutas/componentes, sus estados, modales y viewports. Esa comprobación continúa abierta y es condición para declarar la entrega visual cerrada.


## 44. Corrección de contraste de subtítulos en cabeceras canónicas — 7 de noviembre de 2026

La revisión de la cascada de MolsanCanonicalVisual2027.css encontró una regla tardía que sobrescribía el token de subtítulo de la cabecera con #496B82. El comentario asociado describía un fondo azul Glass, mientras que la cabecera canónica real usa superficie blanca. Esto producía una excepción cromática innecesaria frente al texto secundario corporativo acordado.

Se ha sustituido el color literal y su -webkit-text-fill-color por var(--molsan-canon-header-muted, #617789), y se ha corregido el comentario para reflejar la superficie blanca. Se conservan los selectores de compatibilidad para subtítulos heredados, la opacidad, visibilidad, peso tipográfico y ausencia de sombra.

Commit de código: 11e1c72f87d3236d425a0cc100413b39cfdcc9f9. Requiere nuevo build y actualización del Preview después de la corrección; la inspección visual de cabeceras en navegador sigue pendiente.

## 45. Corrección de token efectivo, catálogo de iconos y aislamiento de alertas — 7 de noviembre de 2026

### Token de subtítulo: corrección en la fuente
La pasada anterior cambió la regla consumidora de MolsanCanonicalVisual2027.css para leer `--molsan-canon-header-muted`, pero el token seguía definido en molsan-tokens.css como `#496B82`. La variable tenía precedencia sobre el fallback `#617789`, por lo que la corrección no era efectiva por sí sola. Se ha corregido la definición raíz del token a `#617789`, manteniendo una única fuente semántica y evitando un override adicional.

### Iconografía de navegación
Se ha contrastado el catálogo MolsanIcon con los nombres literales utilizados en los componentes JSX y con los nombres dinámicos de los elementos de navegación. EncargaGestWorkspace enviaba `file-text` a Sidebar; ese nombre no tenía alias en MolsanIcon y caía en el pictograma genérico `activity`. Se ha añadido el alias `file-text: file`, sin alterar el contrato de navegación ni las acciones.

### Cabeceras de NotarGest
Las acciones «Actualizar datos» estaban dentro de las cabeceras principales de los dos modos de NotarGest (administración global y portal de notaría). Se han movido a una barra de acciones inmediatamente posterior a la cabecera. Se mantiene la función de actualización, el estado disabled, el indicador de carga y el texto accesible. La cabecera queda reservada al título, descripción y navegación contextual «Volver» cuando procede.

### Alertas y avisos frente a tarjetas
La regla de compatibilidad de tarjetas Tailwind en MolsanCanonicalVisual2027.css podía clasificar como tarjeta ordinaria un `section.rounded-2xl.border` con `role="status"` o `role="alert"`. Se han excluido expresamente los elementos con roles status/alert y los que llevan aria-live de las tres reglas genéricas de tarjeta, incluida la variante hover y la normalización de cabeceras internas. Así se evita que un aviso semántico pierda su tratamiento de estado y se convierta en una tarjeta de navegación.

### Commits de código
- `299eff61c1e3bd6367c86acfd5192ff484da958c`: token efectivo de subtítulo a #617789.
- `9562cb45d34c13eedec50bda9f425ffb77ba2a01`: alias file-text a pictograma file.
- `ebcb5cb5a19b3d8dc7d92498329f9f5e73d27162`: acciones de actualización fuera de cabeceras NotarGest.
- `2c7649fa5fe1c161a71f39e1b57d71f0ed7f79ad`: barra de acciones NotarGest y adaptación responsive.
- `acfa962f3944a2dc128277634fa63e883b5c64fb`: exclusión de avisos y alertas de la normalización genérica de tarjetas.

### Validación pendiente
Estas son correcciones estáticas de código. Deben pasar por build y despliegue de Preview, y después por navegación visual autenticada para comprobar las dos variantes de NotarGest, el icono de navegación de EncargaGest y que los avisos mantienen sus colores semánticos. No se afirma que esa inspección visual esté completada.

## 46. Eliminación de tarjetas anidadas en el detalle individual de NotarGest — 7 de noviembre de 2026

La revisión del árbol real de NotarGest encontró que la lista global de tarjetas de MolsanCanonicalVisual2027.css aplicaba borde, franja superior, sombra y hover tanto a `.ng-admin-notaria-card` como a sus descendientes estructurales `.ng-admin-resumen` y `.ng-admin-resumen-principal`. Esto podía producir tarjetas dentro de tarjetas y líneas interiores en el resumen de cada notaría, contrario al patrón visual acordado.

Se han retirado únicamente esos dos contenedores internos de los siete grupos de selectores compartidos (base, hover, iconografía, focus y compatibilidad). Se conserva el estilo de la tarjeta real `.ng-admin-notaria-card` y del bloque exterior `.ng-admin-individual-panel`, que contiene el título «Detalle por notaría / Situación individual» y el conjunto de fichas.

Commit: `e87b71fe32be19b17c3717c2182bbe77813265a1`.

La comprobación es estática. Queda verificar en Preview que cada notaría tenga una sola tarjeta exterior, que los contadores interiores no reciban bordes/franjas adicionales y que el bloque general conserve su jerarquía.

## 47. Segunda pasada de iconografía funcional y controles de tabla — 7 de noviembre de 2026

Se ha extendido el contraste de iconografía a páginas y componentes de Expedientes, CTN, Catálogos, Mensajería, Provisiones, Seguridad, Empleados y componentes compartidos. Se han sustituido caracteres Unicode que actuaban como controles o pictogramas por MolsanIcon, manteniendo textos, handlers, estados y accesibilidad.

### Correcciones aplicadas
- Se amplía MolsanIcon con el glifo semántico `minus` y el alias `file-text` → `file`.
- CTN: indicadores de ordenación, exportación Excel y estados de habilitación usan MolsanIcon.
- Expedientes: ficha, checklist, fases, compensaciones PPAD, refresco, fusión, adjuntos, navegación y acciones de creación/edición usan iconos Molsan.
- Listado de expedientes: flechas de acceso a filtros rápidos sustituidas por arrowRight.
- Catálogo de entidades bancarias: paginación con arrowLeft/arrowRight.
- Mensajería: confirmaciones del catálogo, navegación de solicitudes y acceso a mapas con check, arrowRight, pin y externalLink.
- Provisiones: controles de ajuste fino con arrowUp/arrowDown/arrowLeft/arrowRight.
- Seguridad: ordenación de logs y roles, confirmaciones de permisos/roles y enlaces a auditoría/logs con iconos canónicos.
- Empleados: confirmaciones de guardado con check.
- Componentes compartidos: tabla de datos con indicadores de ordenación Molsan; detalle CTN con enlace a Google Maps; traspasos de saldo con icono merge; ordenación manual de columnas con flechas Molsan.
- Selector de módulos: acceso a NotarGest con arrowRight.

Se mantienen flechas en frases que expresan una relación textual o un flujo de datos (por ejemplo, «Utilidades → Municipios», «Origen → destino» o el intervalo entre dos hitos); no son controles ni pictogramas.

### Commits representativos
- `6f56f21c3bf5ddb50a53fca646c6ad98ad830ab5`: glifo minus.
- `71fb9dbdb38634280a84cddb1fb795f345231933`: iconografía CTN.
- `4eecf6a3a27dd58cc8ed6f2bf6f00f4e323df25a` y `a49445e8ef7f6801b1ef68e3bd816b545e968278`: iconografía de ficha de expediente.
- `38ed5bd3834fd65e706585c53d43bdd3e7f0dfb4`: flechas de navegación del listado.
- `518c282986f8d9dc618a74cff71d18452df7f9d4`: paginación del catálogo bancario.
- `f444ea9ae15adcb8a9f9c3a4f6052977320d00f9`: acciones de mapas en Mensajería.
- `00359242f16c707e1e044b55c16ec83310d4c00a`: controles de Provisiones.
- `961be42fb0b3d69b8b224f7a1847afb5055f2f7f`, `65f8270c59463b4837d59d778ac1de8cdcb52f21`, `f80fbf53821884620eab67743989f0ddf97c08b3`, `406ba953c89707e2d4aa75b63d81f54eb2b1edd7`: iconografía de Seguridad.
- `fe8983be88f6ea5409bdbef5f162e28cb32d8dfe`, `4b269ab31b2bf654b4a0fc2f4dbab4d086e03cd3`, `179bdd74d0989a245d62f02ddc9b52437772c7fd`, `dd4165f4dbaa07b576c16f2aa37c1f44ec603a02`: componentes compartidos de CTN, tablas y Expedientes.

### Estado
Las sustituciones son cambios estáticos revisados sobre los componentes citados. La compilación completa del último HEAD y la inspección visual autenticada de los controles en Preview siguen pendientes; esta sección no las da por superadas.

## 48. Normalización adicional de iconos en Herramientas, Mensajería y componentes — 7 de noviembre de 2026

La revisión de caracteres de interfaz ha encontrado y corregido pictogramas Unicode residuales que todavía se utilizaban como controles o iconos en varias subpáginas. Se han sustituido por MolsanIcon en:
- Herramientas: retorno a Utilidades/Catálogos, paginación de Municipios y Registros de la Propiedad, exportación y métricas de Proceso ABSIS, confirmaciones de importación ABSIS/CTN, alta de noticia, subida de documentos, paginación Post Firma, acciones de Complementos de saldo y Correspondencia tipificada.
- Proceso ABSIS y Complementos de saldo: sus componentes KPI ya renderizan iconos mediante MolsanIcon, en vez de imprimir el nombre o el carácter recibido como texto.
- Empleados: confirmaciones de guardado.
- Componentes de Expedientes: transferencia de saldo y reordenación de columnas.
- CTN y tablas compartidas: icono de mapa externo e indicadores de ordenación.
- Seguridad y selector de módulos: ordenación, confirmaciones y navegación contextual.

Se conservan flechas que expresan una relación dentro de una frase o dato (por ejemplo, «origen → destino», una ruta de navegación escrita en ayuda o el paso entre dos hitos), porque no actúan como iconos ni controles.

Commits de esta pasada: `61e494dc15aa8a920e31a946683bc2ad8bb7dd9e`, `95bc7190bea662867432b0de56f743e99f29e677`, `66e9f9798ce70491847b91488b15f12e06ab6293`, `92a7d8cea730f8c473be5a79b573113acd6f360f`, `4656bf3b7928dc6101a16d43a6aa0be5997b9c34`, `d32d540291b05cb368bfddc5a03957fcdea6be71`, `4dfc554ab6c43b27e88c246c85b5910f2ac6624c`, `8e3affb0eb897192bb05ee9c7d8ff859bbc0e4e5`, `56f53f2ae35f61e453aed5079504f92ebe4aaf34`, `b35cb691cf2cf6af9f6b6c5a73a66730ef8b8da6`, `6b209b66806c5db35e3dee453c11c11511663bbc`, `e56094442802ead07b4d5d4e3e534293ccd9ae31`, `246a032e2ff030e225e956e6dc7ba3072f9a4c7b`, `0b7453cd9a9c0178e3ceb9965cb2b7828e211511`, `e2b58b40359f10b8ead629812c4be0e760ca121d`, `8bd20316c26a83ae16faca0e22b656f41d182551`, `f444ea9ae15adcb8a9f9c3a4f6052977320d00f9`, `fe8983be88f6ea5409bdbef5f162e28cb32d8dfe`, `4b269ab31b2bf654b4a0fc2f4dbab4d086e03cd3`, `179bdd74d0989a245d62f02ddc9b52437772c7fd` y `dd4165f4dbaa07b576c16f2aa37c1f44ec603a02`.

El código de esta tanda queda pendiente de build y despliegue de Preview. La validación visual autenticada sigue abierta.

## 49. Cierre de iconos residuales en utilidades y tablas — 7 de noviembre de 2026

Se han eliminado los últimos pictogramas Unicode funcionales localizados en las subpáginas revisadas de Herramientas y en componentes de tabla:
- Lectura Cancela I, Lectura Copias, Proceso ABSIS, Verifacti, Complementos de saldo y Correspondencia tipificada: iconos de retorno a la sección padre.
- Municipios, Registros de la Propiedad y Post Firma: flechas de paginación.
- Proceso ABSIS: las métricas KPI ahora renderizan sus iconos por MolsanIcon (antes imprimían literalmente el texto recibido en `icono`); el símbolo de descarga se sustituye por download.
- Complementos de saldo: el componente Metrica ahora representa `clipboardList`, `euro`, `clock` y `check` con el catálogo corporativo.
- Importador ABSIS, Importar CTN, Crear noticia y Subir documento: confirmaciones de éxito con check.
- Traspaso de saldo, ordenación de columnas, DataTable y detalle CTN: merge, flechas de ordenación y enlaces externos con pictogramas Molsan.

Se ha vuelto a pasar el detector de símbolos sobre los ficheros corregidos. En las pantallas revisadas, los caracteres de flecha que permanecen son parte de frases de ayuda, rutas escritas o relaciones entre valores; no se usan como iconos, botones ni indicadores visuales.

Commits de cierre: `4dfc554ab6c43b27e88c246c85b5910f2ac6624c`, `8e3affb0eb897192bb05ee9c7d8ff859bbc0e4e5`, `56f53f2ae35f61e453aed5079504f92ebe4aaf34`, `b35cb691cf2cf6af9f6b6c5a73a66730ef8b8da6`, `6b209b66806c5db35e3dee453c11c11511663bbc`, `e56094442802ead07b4d5d4e3e534293ccd9ae31`, `246a032e2ff030e225e956e6dc7ba3072f9a4c7b`, `0b7453cd9a9c0178e3ceb9965cb2b7828e211511`, `e2b58b40359f10b8ead629812c4be0e760ca121d`, `8bd20316c26a83ae16faca0e22b656f41d182551`.

Build y despliegue de Preview del último commit pendiente.

## 50. Unificación de paneles operativos de los tres portales — 7 de noviembre de 2026

El cruce de JSX con las hojas propias mostró que algunos paneles reales de ApoderaGest, EncargaGest y NotarGest seguían usando radios, bordes y sombras locales diferentes del patrón «Espacios de trabajo». No eran formularios ni paneles de calendario: eran contenedores de dashboard/listado con título, acciones, KPIs o tablas.

Se han incorporado a la capa canónica compartida los selectores `.ag-panel`, `.eg-directorio` y `.ng-admin-global-resumen` en todos los grupos de tarjeta (superficie base, hover, transición de iconos y focus). El acabado usa el mismo borde azul hielo, franja superior, radio, sombra y hover Premium que el resto de tarjetas. Se conservan los estilos propios de distribución, filtros, tablas, contenido y responsive; la capa global solo normaliza la superficie exterior.

Commit: `5c1c9a61553fb049e7fa419d592b0ecdc54ad3ee`.

Requiere build y contraste visual en Preview para comprobar los paneles de encargos de ApoderaGest, directorio de EncargaGest y resumen global de NotarGest, especialmente el espacio entre el borde exterior y los componentes interiores.

## 51. Retirada de overrides locales de superficie en ApoderaGest — 7 de noviembre de 2026

Tras incorporar `.ag-panel` a la capa de tarjetas canónicas, se han retirado de ApoderaGest.css los bordes, radios, fondos y sombras duplicados que seguían compitiendo con la superficie global en `.ag-panel`, `.ag-panel-resumen-heading` y `.ag-panel-proximas`. También se ha limpiado el grupo compartido que repetía borde/radio/sombra sobre los hijos de la cuadrícula; se conservan las reglas de anchura mínima, overflow, padding, estructura interna y responsive.

El estilo exterior de estos paneles pasa a tener una única fuente: MolsanCanonicalVisual2027.css. La regla local conserva únicamente responsabilidades estructurales. El dashboard KPI sigue usando MolsanStatCard y mantiene su propio componente canónico.

Commit: `a6cf08c6866cd9cdb35be7efe016ef15e1e74b6d`.

Pendiente validar visualmente el resumen de actividad, próximas citas, grupo de encargos y el panel de tabla para asegurar que el borde y la franja superior no desplazan contenido ni alteran el scroll.

## 52. Normalización del bloque de icono de ficha de notaría — 7 de noviembre de 2026

El icono principal de cada tarjeta de notaría en NotarGest conservaba un degradado y una sombra propios, distintos del bloque de icono plano azul hielo del patrón corporativo. Se ha normalizado a fondo `#F2F7FB`, borde corporativo existente, radio de 16 px y sin sombra adicional; se mantiene tamaño y se añade un desplazamiento/escala hover sutil.

Commit: `cb2b32c3c440745aab16dac442eed942829ddc7a`.

Pendiente comprobar visualmente la tarjeta de notaría en desktop y móvil junto con el hover de la tarjeta exterior.

## 53. Eliminación del override tardío de paneles ApoderaGest en MolsanPremium2027.css — 7 de noviembre de 2026

La auditoría de las 41 hojas CSS encontró un segundo override que podía neutralizar la normalización recién aplicada: MolsanPremium2027.css cargaba más tarde que ApoderaGest.css y definía con `!important` borde, radio, fondo y sombra para `.ag-panel`, KPIs y paneles del dashboard. Aunque MolsanCanonicalVisual2027.css es la última hoja, esa regla tardía tenía mayor especificidad que los selectores `:where()` canónicos.

Se ha reducido ese bloque a la responsabilidad estructural `min-width: 0`. Se eliminan sus propiedades visuales duplicadas y se deja la superficie exterior bajo la hoja canónica. Las tarjetas KPI mantienen la presentación del componente MolsanStatCard.

Commit: `c0d28a8b177c41a7d04becceaf3108ae8d03583f`.

Debe verificarse en Preview que el bloque de paneles no recupere el radio/sombra antiguos al cambiar de ruta y que los KPI conserven su icono y acento.

## 54. Token dedicado para cabeceras de tabla — 7 de noviembre de 2026

La auditoría transversal de las 41 hojas CSS confirmó que la regla general de tablas estaba usando `--molsan-surface-soft` (#F2F7FB) para las cabeceras, aunque la paleta corporativa reserva `--molsan-table-head` (#EAF2F8) para esa función.

Se ha corregido MolsanRedesign2027.css para consumir el token dedicado y se ha añadido una normalización final en MolsanCanonicalVisual2027.css para las cabeceras de tablas de los módulos y portales. Esta última fija texto secundario #617789, fondo #EAF2F8 y borde inferior #D8E4EC, sin cambiar las celdas ni la densidad de las tablas.

Commits: `ffd19bc2f83e2df9dc7cea9935131edb9e9dd503` y `757260390a7d2a4e49b156c40356fe7fd8f108d6`.

Pendiente de comprobar tablas normales, sticky headers, tablas dentro de modales y las vistas responsive.

## 55. Normalización de neutros heredados en CSS de módulos — 7 de noviembre de 2026

La pasada por las 41 hojas CSS identificó varios fallbacks antiguos de texto secundario (#526176 y #64748b) y superficies neutrales (#f7f9fc, #f8fafc, #f5f7fb) en ApoderaGest, EncargaGest, CTN, Agenda, Seguridad, Maestros, Empleados, Herramientas, Cancelagest e index.css.

Se han actualizado los usos neutrales y de texto a los tokens corporativos: texto secundario #617789, panel suave #F2F7FB, cabecera de tabla #EAF2F8 y borde #D8E4EC. Se han mantenido sin cambios los colores semánticos de éxito, error, advertencia y estados habilitado/deshabilitado. En CTN se ha distinguido expresamente el fondo de cabecera de tabla del fondo de hover y del fondo de controles.

Archivos corregidos: ApoderaGest.css, EncargaGest.css, CtnListadoPage.css, CancelagestUnified.css, HerramientasPremium.css, MolsanRedesign2027.css, index.css, Agenda.css, EmpleadosListadoPremium.css, Maestros.css y SeguridadSubpaginasPremium.css.

Commits representativos: `50c1ec15d770b5bb9ac38ff608258e862f34c267`, `7523f098ded1fa73d7e80bc74297ad71834df394`, `a3d94197f827bce1e3cb021289f77369eac5015f`, `ba9543816b3ee0e147421d25ceaeea0a48255223`, `cb520cf961fe57d919e0bdc26ec5772729c5493d`, `c7436274a3bce6503e60903feb2badb471aa4274`, `7fdadead7128ef68fb15407b267cb878817b0e4f`, `d56a691f4cc740e6fae6feba532f0cf09537ae48`, `ab0ef7fd52d5a6a0ba6b7871233b3c660c6f49fb`, `fe4e9ff7bf0997dcfe9502a0c29274b1fcd31d91`, `c935c0dcd2e77fd10c8f739f73d662eaf3a20477`, `5afbb60aa46a50fcbaf640eea18ef663ed88520a`.

Esta pasada es estática. El build y el despliegue de Preview deben ejecutarse sobre el HEAD actualizado; la validación visual de las tablas, chips y estados continúa pendiente.

## 56. Retirada de compatibilidades SJ-2026 sin consumidores activos — 7 de noviembre de 2026

Se ha cruzado el inventario de clases heredadas con las referencias del repositorio y se han retirado las reglas que solo existían en CSS y no tenían consumidores JSX activos:
- `card-sj`, `card-sj-header`, `card-sj-footer`
- `table-sj` y sus reglas de filas/celdas
- `input-sj`, `select-sj`, `textarea-sj`, `label-sj`
- `tabs-sj`, `tab-sj`
- `modal-overlay-sj`, `modal-sj`, `modal-sj-header`, `modal-sj-footer`
- `erp-table` y `erp-modal` / `erp-modal-header` / `erp-modal-panel`
- estados `erp-warning`, `erp-danger` y `erp-info` sin consumidores detectados.

Se han eliminado sus reglas en index.css y los overrides correspondientes de MolsanRedesign2027.css, MolsanPremium2027.css y MolsanCanonicalVisual2027.css. Se conservan `erp-page`, `erp-btn-*`, `erp-badge` y `erp-success`, que sí tienen consumidores activos en páginas de Seguridad, Expedientes y componentes de tabla. La limpieza no toca el sistema de modales vigente (`molsan-modal-panel`, `ctn-modal-panel`, `eg-modal-form`, `ng-modal`, etc.).

Commits: `d1431868316b03641162366c6e752049d8238297` y `46c06200b87e208d256e55d306ca9aa6de4b6c51` (limpieza de index.css y Redesign), `bedded563e6f33ccfafdc19769ebd7b7e5513f5e`, `feae1107ca870cc814e8c9f63d48776785161b58`, `b6d021a00e9d7e2f79a0a3415c550c53d496ba8f`, `2dc6ab543e58f59481fe73775ec476178d9f9912`.

El build de Vite debe confirmar que no quedan referencias dinámicas. La validación visual de formularios y modales modernos continúa pendiente.

## 57. Normalización de la superficie modal común — 7 de noviembre de 2026

Se ha unificado el panel exterior de los modales compartidos: borde `var(--molsan-border, #D8E4EC)`, radio `var(--molsan-canon-card-radius, 20px)`, fondo blanco y sombra más contenida `0 18px 42px rgba(6,70,117,.12)`. Se elimina el borde azul grisáceo #C5D8E5, el radio fijo de 22 px y la sombra excesiva anterior.

La corrección se aplica en la regla común de MolsanPremium2027.css y en la normalización final de MolsanCanonicalVisual2027.css, manteniendo los overlays, estructura de cabecera, cuerpo, footer, focus y responsive. Los modales específicos siguen conservando sus clases funcionales.

Commits: `8a1fbfe3ec77e02f563d532c844cd8dd640e62ab` y `519d59f30dac454b8a5858da50b8d1d4b6cc1c1c`.

Pendiente validar visualmente modales de CTN, EncargaGest, NotarGest, ficha de expediente y empleados.

## 58. Contraste de cabeceras de las 98 páginas JSX — 7 de noviembre de 2026

Se ha revisado el inventario de las 98 páginas JSX de frontend buscando uso de MolsanPageHeader y cabeceras estructurales alternativas. No se han encontrado cabeceras de página independientes que sigan usando un encabezado heredado en lugar de MolsanPageHeader.

Las dos coincidencias sin MolsanPageHeader son contextuales, no cabeceras de página:
- ModulosSelector: encabezado de un diálogo de acceso de soporte.
- FestivosCompensaciones: encabezado de sección interna dentro de la página de Fichajes.

Se conserva la compatibilidad MutationObserver de Layout.jsx hasta completar la navegación visual y las rutas con renderizado asíncrono; no se elimina a ciegas porque puede seguir atendiendo contenido dinámico o diálogos no incluidos en el inventario de páginas.

La revisión es estática de los 98 archivos. No sustituye el contraste visual de dimensiones, márgenes, parpadeo, acciones y responsive.


## 59. Quinta pasada focalizada: residuos de paleta en los tres portales — 7 de noviembre de 2026

Se han corregido inconsistencias concretas que seguían visibles en los JSX de NotarGest, ApoderaGest y EncargaGest, aunque las hojas globales ya definían los tokens Premium:

- NotarGest: las acciones «Actualizar datos» estaban fuera de la cabecera corporativa en la administración global y en el portal. Se han integrado en `MolsanPageHeader.actions`, junto al botón contextual «Volver» cuando procede. Se han normalizado también los campos de seguridad del perfil a los tokens de superficie, texto y borde.
- ApoderaGest: el modal de agrupación aún utilizaba neutros Slate en sus textos, bordes y hover; se han conectado a los tokens Molsan. La tabla ahora utiliza el token dedicado `--molsan-table-head` (#EAF2F8), no el fondo de panel #F2F7FB.
- EncargaGest: se han migrado los neutros Slate y el acento Indigo heredado de bandeja, ficha, contratos, formularios y modales a los tokens corporativos. Los estados de incidencia, advertencia y éxito mantienen sus colores semánticos. Se ha corregido además una clase Tailwind de hover mal formada.
- NotarGest: bordes de filas, hover de tabla y textos de pie ajustados a #D8E4EC, #F2F7FB y #617789; los colores de alertas y estados se conservan.
- EncargaGest: se han normalizado superficies, textos y bordes residuales de su modal y ficha a la paleta corporativa.
- LayoutPortalesPremium: las cabeceras de tabla de Documentos, CTN e Herramientas consumen `--molsan-table-head` (#EAF2F8), evitando que una regla específica las deje en #F2F7FB.
- Se conserva la lógica funcional, endpoints, estados, operaciones, permisos y responsive.

Esta pasada es estática. Requiere build sobre el nuevo HEAD y contraste visual autenticado de los tres portales, especialmente cabeceras con acciones, bandejas, tarjetas, tablas, formularios y modales.

## 60. Reconciliación de bordes canónicos y última cascada de cabeceras de tabla — 7 de noviembre de 2026

La lectura conjunta de los tokens y de las reglas efectivas de las 41 hojas CSS encontró dos restos de divergencia respecto de la paleta corporativa:
- El token `--molsan-card-border` seguía en #C5D8E5, y la capa canónica repetía ese literal en cabeceras, tarjetas y tarjetas Tailwind heredadas.
- Aunque la última capa ya fijaba #EAF2F8 en varias tablas, capas anteriores conservaban fondos #F2F7FB, #F3F6FB o #EEF3FA para cabeceras. También había una regla específica del Design System para las tablas de ApoderaGest, NotarGest y EncargaGest con #52617A.

Correcciones:
- `--molsan-card-border` ahora referencia `--molsan-border` (#D8E4EC).
- Las tres superficies de cabecera/tarjeta de MolsanCanonicalVisual2027.css consumen el mismo token de borde.
- Las cabeceras de tabla del Design System, incluidos los encabezados de la intranet, usan `--molsan-table-head` (#EAF2F8) y `--molsan-text-secondary` (#617789).
- MolsanRedesign2027.css se ha reconciliado en las variantes de CancelaGest, páginas técnicas, CTN, portales, Expedientes y Empleados. Los fondos de hover de filas permanecen como superficie suave; no se han convertido en cabeceras.
- Los bordes y sombras de controles y modales no se han sustituido indiscriminadamente: mantienen sus tokens de control y profundidad.

El escaneo estático de las 41 hojas CSS no encuentra ya las familias de fallback antiguas revisadas (#526176, #64748b, #718096, #475569, #f8fafc, #f1f5f9, #e2e8f0 y #f7f9fc). Esto no significa que se hayan eliminado todos los colores literales: permanecen acentos y colores semánticos de éxito, advertencia, error, prioridad y estados, que no deben convertirse en neutros.

Commits de código: `9c21da4fdc32cc34efb5e127d32435922315968b`, `ed27fa84e921d2754f07d0365af40c212a923e23`, `4fc91d213363b482d78a9eb124bd3e279348a020`, `fcd1a0e3355894727ff07e75f3b9cc5a43a7e9ba`, `19455f1678e99b44833285794446c077d60d4265`, `24b25cdf1b266864db1e8ca654fe324d2214a73d`.

La validación visual de cabeceras normales, sticky, portales, modales y tablas responsive sigue pendiente. El build y el despliegue del nuevo HEAD deben confirmarse antes de pasar a navegación autenticada.

## 61. Quinta pasada de colisiones de paneles y cabecera de Agenda — 7 de noviembre de 2026

El cruce de JSX con las reglas genéricas de panel detectó dos elementos que no debían recibir superficie de tarjeta:
- `.eg-modal-section` son columnas de contenido del formulario modal de EncargaGest, no tarjetas independientes.
- `.agenda-list-table-wrap` es únicamente el contenedor de scroll horizontal de la tabla de citas, no un panel visual.

Se han retirado ambos selectores de las reglas globales de borde/radio/sombra/hover y de movimiento reducido de MolsanPremium2027.css. Se conservan los estilos de estructura y espaciado locales. Se corrigieron además las listas de selectores CSS tras retirar las clases.

En sentido inverso, `.ctn-detalle-panel` sí es un panel de contenido real de la ficha CTN (bloque «Notarios asociados»); se ha incorporado a los mismos grupos canónicos que `.ctn-detalle-stat`, para que no quede con una superficie distinta.

### Cabecera y tablas
- Agenda.jsx ya utiliza MolsanPageHeader, pero Agenda.css imponía sobre esa cabecera un degradado azul claro con una regla local de mayor especificidad. Se ha retirado el override y se deja la geometría/superficie a MolsanCanonicalVisual2027.css.
- La tabla de Agenda y las tablas de detalle CTN usan ahora el token dedicado #EAF2F8 y el texto secundario #617789; los fondos hover permanecen en #F2F7FB.
- En el modal CTN se han alineado el separador de sección, los títulos y el chip descriptivo con los tokens corporativos. Los botones secundarios también consumen el borde y el texto secundario acordados.

Commits de código: `c2fe1803b6515e6cc755eda13e86b98da70d81cd`, `414de17188770ca1b5d7f004659504e0f3b6ff3b`, `b33b846492b87d1938d5e8597efb8b345082bcd8`, `dd565990ecf2a7dbedc4f5ab1e3adeebded0ad79`, `a41fa3a3cfd512b8510f6b52d443c7681e05bc14`, `9ddb45dcb40415d8b2b46678196a519aa82943aa`.

La revisión sigue siendo estática. Se debe confirmar que el build del nuevo HEAD pasa y comprobar visualmente el modal de EncargaGest, la ficha CTN, la cabecera de Agenda y la tabla de citas en escritorio y móvil.

## 62. Recuperación del panel modal de detalle CTN — 7 de noviembre de 2026

El contraste entre `ModalCtnDetalle.jsx`, las hojas globales y CtnListadoPage.css reveló que el diálogo usa `molsan-modal molsan-modal--lg ctn-modal-dialog`, pero la capa común solo estilaba `.molsan-modal-panel` y `.ctn-modal-panel`. La clase real `.ctn-modal-dialog` no estaba incluida en ninguna de esas superficies y, además, MolsanFase3 la excluía indirectamente de la normalización genérica por llevar `role=dialog` y `.molsan-modal`.

Se ha incorporado `.ctn-modal-dialog` al contrato de superficie modal compartida (borde, radio, fondo blanco y sombra) y se ha definido su geometría funcional: columna flex, ancho máximo 1240 px, altura limitada al viewport y scroll delegado al cuerpo del modal. En móvil ocupa el ancho disponible y respeta el margen de 8 px del overlay. La cabecera sigue usando la regla accesible común y el contenido conserva sus pestañas y scroll.

Commits: `439df46ca76d8bdba549687abf441b573d0499ef` y `912551383f97d569fa77334d3b26a9935ed574f9`.

Es una corrección basada en el contrato JSX/CSS, aún pendiente de build y verificación visual en escritorio y móvil.

## 63. Unificación de cabeceras de modales compartidos — 7 de noviembre de 2026

El cruce de los componentes de modal encontró dos convenciones activas para la cabecera: `.molsan-modal-header` y `.molsan-modal__header`. La primera recibía la normalización global; la segunda seguía dependiendo de utilidades Tailwind locales, aunque se usa en ModalEmpleado, CarpetaDigital, LiquidarExpediente y otros diálogos.

Se han unificado ambas clases en los mismos selectores del contrato modal común: disposición flex, alineación, espaciado, padding, fondo blanco, ausencia de bandas y jerarquía de color. Se conserva el comportamiento funcional de cada diálogo, incluyendo scroll, pestañas, cierre y altura responsive.

También se ha conectado la barra superior de cierre de EnviarANotarioModal a `.molsan-modal-header`, para que no conserve su borde inferior y fondo local como excepción.

Commits: `a47c93724226591ad21b5db53580f13e6fc4b3e6` y `e718e13d9fe97acce170107ba6a02887dba04c87`.

Pendiente comprobar visualmente los modales de Agenda, CTN, Enviar a notario, Carpeta digital, Liquidar expediente y Empleados en escritorio y móvil.

## 64. Limpieza de neutros locales en modales operativos — 7 de noviembre de 2026

Tras unificar el contrato de cabeceras, se ha extendido el cruce a las clases de presentación del cuerpo de los modales:
- Agenda / ModalNuevaCita: panel y cabecera pasan a las clases compartidas `molsan-modal__panel` y `molsan-modal-header`. Los textos, bordes y superficies Slate del formulario se han sustituido por tokens Molsan; se conservan los colores de error y los acentos funcionales.
- CarpetaDigitalModal, LiquidarExpedienteModal, ProvisionesModal y EnviarANotarioModal: se han reemplazado los neutros Slate de texto, bordes y fondos por `--molsan-text`, `--molsan-text-secondary`, `--molsan-border` y `--molsan-surface-soft`. Se conserva el fondo oscuro del overlay, los colores semánticos y las acciones.

Commits: `3291c3bb7b6c85512db6e8c102569acc9eaf5bb8`, `acf1213492ae6695c223fc9163ebb26457c1a4c3`, `efba72ad87e0700bea320690fac2da4ad0fe2135`, `4e3d9b44df042ec28b6c074a52e41ccd766cfc1d`, `92d83c3dcb680272d8b0628693dc921a00032082`, `88604512c46ea562bb97c456b50866396b27e9a0`, `97c294105473a4e90f3dd560a30320fd4760abb6`.

Pendiente build y comprobación visual de los formularios, errores, botones deshabilitados, scroll interno y comportamiento móvil.

## 65. Eliminación de tarjetas anidadas dentro de la ficha modal CTN — 7 de noviembre de 2026

La revisión del árbol JSX de `ModalCtnDetalle` confirmó que `.ctn-modal-seccion` agrupa contenido dentro del panel modal exterior. Su CSS local aún añadía a cada sección un segundo fondo blanco, borde, radio y sombra; el título de sección añadía además un separador horizontal. Esto producía tarjetas dentro del modal y líneas interiores.

Se ha dejado `.ctn-modal-seccion` como bloque de contenido transparente, sin borde ni sombra, conservando padding y separación vertical. Se ha retirado el separador del encabezado de sección. Los chips de contexto y los datos conservan sus superficies suaves, pero consumen los tokens corporativos de texto, fondo y borde.

Commit: `c2974deeb97d22a8f499847dfb5da56307c0fe7d`.

Pendiente comprobar la ficha de notaría y la pestaña de ubicación en desktop y móvil, incluyendo scroll y tabla de asociaciones.

## 66. Ajuste de especificidad para secciones internas del modal CTN — 7 de noviembre de 2026

Al verificar la cascada completa después de retirar las tarjetas locales, se detectó que MolsanPremium2027.css aún contenía `.ctn-modal-seccion` en su selector genérico de superficies de contenido. Esa regla se carga después de CtnListadoPage.css y, por especificidad, podía volver a imponer borde y fondo sobre el reset local.

Se han retirado tanto `.ctn-modal-seccion` como el selector redundante `.ctn-modal-panel .ctn-modal-seccion` de los grupos globales de superficie y movimiento. La sección de la ficha modal queda ahora gobernada por su regla estructural local: transparente, sin borde, sin sombra y con padding. El panel exterior del diálogo conserva la superficie modal canónica.

Commit: `b78960b452e479b96f064c4f9bc0cef58fdc3faf`.

El cambio requiere build y comprobación visual del modal CTN para confirmar que no quedan separadores ni fondos anidados.

## 67. Aislamiento de los observadores de cabecera y botón Volver — 7 de noviembre de 2026

La revisión del consumidor común `Layout.jsx` confirmó el riesgo ya señalado en la sección 42: el segundo observador buscaba la primera `.molsan-page-header` en `.erp-main-inner`, ámbito que incluye overlays y nodos fuera del contenido de ruta. Una cabecera de diálogo podía convertirse accidentalmente en destino del botón «Volver» o impedir localizar la cabecera real.

Se han aplicado dos restricciones:
- Ambos observadores quedan limitados a `.erp-route-content`.
- La búsqueda de cabeceras existentes y candidatas excluye expresamente elementos dentro de `role=dialog`, `aria-modal`, `.molsan-modal`, `.ng-modal` y `[data-modal]`. La búsqueda usa `querySelectorAll + find` para saltar candidatos excluidos y poder localizar la cabecera válida siguiente.

Se mantienen MutationObserver, el montaje dinámico del botón común, el destino de navegación y la compatibilidad de las rutas heredadas. No se ha retirado la capa de compatibilidad sin pruebas de ruta.

Commit: `cda080ef0f1e18b29b96a15a0c3fa1fc8e5c49c7`.

Pendiente comprobar cambios de ruta con carga diferida, subpáginas con y sin acciones, modales abiertos durante la navegación y anchuras móvil/tablet.

## 68. Barrido adicional de paleta en CTN, portales, Seguridad y Expedientes — 7 de noviembre de 2026

Se amplió el barrido de colores a las reglas efectivas de CTN y a los neutros locales de portales y subpáginas:
- CtnListadoPage.css: normalizadas las cabeceras de la tabla principal y de las tablas del modal, texto de celdas, hover, bordes de tabla, campos, paginación y botones secundarios. Las cabeceras usan #EAF2F8; hover/superficie suave #F2F7FB; texto #617789; borde #D8E4EC.
- CtnDetallePage.css: tabla de histórico y hover ajustados a los mismos tokens.
- SeguridadSubpaginasPremium.css: reemplazados los neutros antiguos de fondos, bordes y texto; se conservan rojo/verde semánticos para error y éxito.
- ApoderaGest.css, EncargaGest.css y NotarGest.css: fallbacks de texto principal #17243A alineados a #173247.
- MolsanPremium2027.css: las cuatro superficies globales que aún usaban #C5D8E5 pasan al token #D8E4EC y el texto principal #17384D pasa a #173247.
- ExpedientesListado.css: eliminado el último fallback #24324A detectado en el grupo de subpáginas revisado.

El escaneo adicional de 11 hojas CSS de páginas técnicas (Expedientes, Ficha, Intranet, Logs, Maestros, Notificaciones, Panel Técnico, Provisiones y Empleados) no encontró otras coincidencias de la familia de neutros heredados revisada.

Commits: `c826eff0adc3a2e52b71eb7d675f65676f5a70a4`, `fa2be814dae7ef81c7e5a140c0d4d91d3ba7ebaa`, `9e299053131c6a9cff7513fb3906ecfa8de458c6`, `36704f5e11e5dc11ffacf052b0c2b3e46f5fba99`, `e7c5fbd22f0352e84c3129ff09aecd6dfa4d6dd4`, `264345b9ae9ac71d038aaafceaab8e291c46c8d8`, `04f70a2fadc17d1c04b6b6dfea50dc214ba85c35`, `8da5851ef2e76c252d8460aaf14bad772ec9b6c2`.

El build y el despliegue del HEAD más reciente deben confirmar estas correcciones antes de la validación visual.

## 69. Corrección de sintaxis del observador y recuperación del build — 7 de noviembre de 2026

El build de Vite detectó un paréntesis de cierre ausente en la expresión `Array.from(querySelectorAll(...))` del nuevo filtro de cabeceras en Layout.jsx. La compilación falló en el commit `73c4d310`; ese artefacto no se promovió a Preview y el servicio conservó el último despliegue correcto.

Se corrigió el cierre de la expresión en `caa3be72ec126049f96fc08637c1fc48a9891439`. El workflow **MOLSAN frontend premium build** #42371102007 ha terminado con resultado `success` para ese commit.

El siguiente despliegue debe usar el HEAD posterior a esta corrección. La validación visual autenticada sigue pendiente; la compilación correcta no sustituye esa comprobación.

## 70. Reconciliación de la última cascada de tablas en los portales — 7 de noviembre de 2026

Una nueva lectura de las reglas al final de las hojas locales encontró overrides heredados que aún declaraban azul corporativo como texto de cabecera de tabla, aunque la capa canónica posterior lo corregía por especificidad/importancia. Se han corregido también las fuentes locales para que no dependan de ese override final:
- ApoderaGest: `.ag-panel table thead th` usa texto secundario #617789, fondo #EAF2F8 y borde #D8E4EC; las celdas usan el borde corporativo.
- EncargaGest: tablas de panel y directorio usan los mismos tokens en encabezados y celdas; se elimina la última referencia a `--molsan-prof-blue` para el texto de cabecera.
- NotarGest: la regla final de `.ng-tabla th` y tablas de panel se ha reconciliado en la sección 63 con los mismos tokens.

Así la hoja local y la capa canónica expresan la misma presentación, sin depender de una regla `!important` de rescate.

Commits: `5a74482db1fb69b43fa485c5cfd3f0a253a07bd2`, `d67ccea60cdf0489227e40da050091675f2f07a0`, `8216e3a5a0565a18478a8cd0f962f8c940ba1967`.

Pendiente de build y verificación visual de las tablas en los tres portales.

## 71. Última normalización de cabeceras de tabla en Seguridad — 7 de noviembre de 2026

La revisión de las hojas de página encontró dos reglas locales de Seguridad que todavía usaban superficie blanca o azul hielo genérico en los encabezados. Se han cambiado ambas variantes —subpáginas de roles/permisos y editor de roles/usuarios— al token dedicado #EAF2F8 y texto secundario #617789. No se han cambiado los colores de estados ni el hover de filas.

Commit: `8665fc7dd13e09378332694b1d890b0ea35cbc60`.

Pendiente validar tablas sticky y responsive en Seguridad y sus subpáginas.


## 72. Reconciliación de tarjetas, paneles y geometría exterior de páginas — 7 de noviembre de 2026

Se ha contrastado la lista canónica de tarjetas con los consumidores JSX reales. Cinco tipos de panel de contenido se estaban tratando como tarjetas funcionales en siete listas repetidas de Canonical Visual. Se han retirado de esas listas, conservando su estilo estructural propio y sin quitar las tarjetas reales:
- `.ag-panel` y `.ng-admin-global-resumen` (ApoderaGest / NotarGest).
- `.ctn-detalle-panel` (panel de asociaciones de la ficha CTN).
- `.ng-admin-individual-panel` (bloque “Detalle por notaría”).
- `.notargest.ng-content .ng-dashboard-grafico` (paneles de gráficos de NotarGest).

Se mantienen como tarjetas `.ag-grupo-notario`, `.ag-grupo-apoderado`, `.ag-carpeta-apoderado`, `.ctn-detalle-stat`, `.ng-admin-notaria-card` y las tarjetas de accesos/estadísticas que tienen consumidores reales. Tras la edición se comprobó que Canonical Visual no contiene separadores de selector dobles, no hay selectores que comiencen con una coma y las llaves CSS están equilibradas.

### Geometría común y márgenes

El Layout ya aporta el gutter exterior. Se retiraron paddings/max-width duplicados o se conectaron las raíces de página al reset común:
- Fichajes (modo empleado y Control de Fichajes): se retiró `mx-auto`, `max-w-[1500px]` y el padding propio; se alineó la raíz con Dashboard y se añadió `.fichajes-premium-page` al contrato de geometría común.
- EncargaGestWorkspace: su contenedor principal deja de añadir un segundo padding horizontal/vertical sobre el de Layout.
- ControlApoderados: raíz semántica `.control-apoderados-page` y alta en la lista de geometría compartida.
- Fusiones: `.fusiones-page` queda registrada en el reset común.
- Subpáginas de Herramientas que tenían padding propio sin marcador común: FirmasEmail, DatosMolsan, CrearNoticia, AltaExpediente, TiposExpediente, Verifacti, TiposImpositivos, CatalogoAbsis, MantenimientoTecnico y AdministracionEmpleadoConfig. Se añadió `.herramientas-subpagina-premium` a sus raíces y a los estados de acceso restringido cuando procedía. Las clases de padding internas de contenido y tarjetas no se modifican.

### Paleta y limpieza local de CancelaGest

- Eliminada la repetición exacta de `.cg-section,.cg-panel{margin-bottom:0}`.
- Los neutros heredados de kicker, títulos, etiquetas, ejes y bordes pasan a tokens Molsan (#064675, #617789, #173247, #D8E4EC y #F2F7FB). Se conservan los colores semánticos de error y los acentos de las gráficas.

### Commits y validación

Commits de código de esta tanda: `0fa37ed`, `a63fbc1`, `53ef6b1`, `a6d58ea`, `4f649bc`, `701828e`, `d1dd781`, `6e86573`, `c879863`, `78b40bc`, `6d8256b`, `23d2cc9`, `0906753`, `e52bf6f`, `21d4571`, `04efbde`, `1eef508`, `f20705f`, `da0a609`, `9ee6efe` (registro de `.fusiones-page` en la geometría compartida; la clase ya estaba en el JSX).

- Build Vite: success para `9ee6efe1c8b1acde144e4833e508c52f8dfde5b2`.
- Validación Fichajes: success para el mismo commit.
- Render Preview: deploy `dep-dbnk1jm417fc73dvt3vg` en estado `live`, commit `9ee6efe1c8b1acde144e4833e508c52f8dfde5b2`.
- URL del candidato Preview: https://molsan-premium-2027-candidate-preview.onrender.com
- La inspección visual autenticada de rutas, estados y responsive continúa pendiente: el navegador de consulta no puede abrir el dominio Render. Build y deploy correctos no se presentan como validación visual.
- PR #411 continúa en Draft y sin merge. Producción, API y bases de datos no se han tocado.



## 73. Retirada de toolbar heredida sin consumidor en NotarGest — 7 de noviembre de 2026

La revisión de `NotarGest.jsx` confirma que las acciones de actualización están integradas en `MolsanPageHeader` y que no existe consumidor JSX de `.ng-page-toolbar`. Se ha eliminado ese bloque CSS y actualizado el comentario de responsabilidad. Se conserva `.ng-icono-girando` y su animación porque sí tiene consumidor en el estado de carga.

Validación:
- Build Vite: success en `b5cd3d0f1ac1fe1e2f0cfd2b6bd21932700dcaf2`.
- Validación Fichajes: success en el mismo commit.
- Render Preview: deploy `dep-dbnk2i8u01pc73cvvkug` en estado `live`, commit `b5cd3d0f1ac1fe1e2f0cfd2b6bd21932700dcaf2`.
- No se ha modificado producción ni el backend.

La inspección visual autenticada de NotarGest y de los demás módulos sigue pendiente; no se declara cierre visual.


## 74. Último ajuste de tokens de CancelaGest y despliegue actualizado — 7 de noviembre de 2026

Se ha simplificado el fallback duplicado de `--molsan-text`, y se han normalizado el icono de flecha y el borde del icono de módulo a los tokens de texto secundario y borde. Se ha reducido también la precisión sobrante de un porcentaje en `color-mix`; se conservan los colores semánticos del estado de error y los acentos propios de las gráficas.

- Build Vite: success para `e31cc6962bcd5f93de715c9f2899e6cc87d3f541`.
- Validación Fichajes: success para el mismo commit.
- Render Preview: deploy `dep-dbnk4ap5efls73bipa9g` en estado `live`, commit `e31cc6962bcd5f93de715c9f2899e6cc87d3f541`.
- Producción y API siguen intactas.

El Preview actual es el servicio `molsan-premium-2027-candidate-preview`; no debe confundirse con enlaces de Preview antiguos. La revisión visual autenticada sigue pendiente.


## 75. Estado consolidado de cobertura y ruta de promoción — 7 de noviembre de 2026

Este apartado actualiza las referencias históricas de cobertura de las primeras secciones del documento:

- Árbol completo de `frontend-app/src`: 241 ficheros (143 JSX, 57 JS y 41 CSS).
- Pasada estática individual: 143/143 JSX leídos y clasificados; 57/57 JS leídos y clasificados; 41/41 CSS contrastadas con sus importaciones y responsabilidades.
- Navegación: inventario de 98 páginas/subpáginas y revisión de cabeceras; las rutas alias y los portales externos se mantienen identificados por separado.
- La cobertura estática no equivale a validación visual ni a prueba funcional de cada estado/modal.

### Estado verificable

- Último commit de código desplegado en Preview: `e31cc6962bcd5f93de715c9f2899e6cc87d3f541`, deploy `dep-dbnk4ap5efls73bipa9g`, estado `live`.
- Build frontend y validación Fichajes: success en ese commit.
- Servicio Preview actual: `molsan-premium-2027-candidate-preview` (`https://molsan-premium-2027-candidate-preview.onrender.com`).
- Producción identificada, sin cambios: frontend `agenda-intranet-f` en rama `main`; API `agenda-intranet-b` en rama `main`. El último deploy frontend observado en producción sigue siendo `e81d4ab9d571f9e266d7181db8bca57c49d98812`.
- PR #411 continúa Draft y tiene como base `fix/molsan-css-selector-audit-round1`; PR #409 continúa Draft y tiene como base `integration/erp-molsan-supabase-ready`. La promoción debe respetar esta cadena y no saltar directamente a producción.

### Condiciones aún abiertas para cierre

1. Inspección visual autenticada de Preview: Dashboard, todos los departamentos, páginas/subpáginas, portales externos y alias.
2. Prueba de modales y formularios: foco, Escape, cierre, scroll interno, errores, estados deshabilitados y responsive.
3. Recorrido desktop/tablet/móvil, incluidas tablas sticky y desbordamientos.
4. Corregir diferencias detectadas, repetir build y Preview, y solo entonces preparar la promoción secuencial de PRs.

No se considera finalizada la auditoría global ni se autoriza inferir cierre visual a partir de build/deploy. Producción, API y datos permanecen intactos.


## 76. Contraste estático de diálogos y ciclo de foco — 7 de noviembre de 2026

Se ha contrastado el conjunto de ficheros JSX identificados por el marcado `role="dialog"` / `aria-modal="true"` en páginas y componentes: Sidebar, ModulosSelector, CTN detalle, NotarGest, ApoderaGest, EncargaGest, ControlApoderados, Catálogo ABSIS, Tipos de expediente, Informes, Mensajería Molsan, Mensajería Solicitudes, ExpedientesListado, ProvisionesFondosPage, ModalCtnDetalle, LiquidarExpedienteModal, ProvisionesModal, TraspasoSaldoPanel, CarpetaDigitalModal, VisibilidadTablas, EnviarANotarioModal, ModalEmpleado, ModalNuevaCita, ControlFichajesAdmin, SeguridadAuditoria, EmpleadosListado, AccionesExpediente, Municipios, TiposConceptoGastos, OficinasLiquidadoras, TiposCargaHipotecaria, EntidadesBancarias y RegistrosPropiedad.

En los 33 ficheros se ha confirmado importación/uso de `useAccessibleDialog` y correspondencia entre llamadas al hook y diálogos declarados. El hook común:
- devuelve el foco al elemento anterior al cerrar;
- lleva el foco al primer control disponible al abrir;
- limita Escape y Tab al diálogo superior cuando hay diálogos anidados;
- mantiene el foco dentro del diálogo y filtra controles ocultos/deshabilitados.

No se ha cambiado lógica de formularios ni operaciones. Esta comprobación es estática: siguen pendientes las pruebas manuales reales de teclado, lectores de pantalla, scroll interno, cierre anidado y viewport móvil/tablet.


## 77. Barrido de paleta en Herramientas, Informes, Mensajería y modales — 7 de noviembre de 2026

Se ha realizado un barrido de clases cromáticas heredadas en las **41 páginas JSX de Herramientas**. Los neutros slate y acentos blue/indigo/sky de la interfaz se han conectado a los tokens Molsan de texto, superficie, borde y acción. Se conservan:
- los colores semánticos de estados (correcto, incidencia, aviso, cancelación, etc.);
- los fondos oscuros de overlays de diálogo;
- la paleta corporativa propia de las plantillas oficiales de documentos y sus vistas de impresión, sin confundir documento emitido con interfaz del editor.

También se han normalizado las superficies de Informes, Mensajería, Expedientes, Fusiones, Control Apoderados y Control de Fichajes. Los botones primarios y estados de foco pasan al azul Molsan; tablas, formularios y textos secundarios usan los tokens comunes.

### Superficie común de modales

Se ha añadido `.molsan-modal__panel` como alias del panel canónico `.molsan-modal-panel` en el CSS compartido. Los diálogos de herramientas, mensajería, informes, expedientes, fichajes, seguridad, control de apoderados, empleados y selectores ahora reciben la misma superficie, radio, borde y sombra. El modal de alta de empleado se ha migrado explícitamente a `.molsan-modal-panel` y `.molsan-modal__header`, incluidos sus controles de formulario con tokens. Se mantienen las cabeceras específicas de los portales cuando ya están centralizadas por sus estilos de módulo.

### Validación

- Build frontend: success en `cb9cb1e344a0e84eab6d208bf7bc878b67a5c29d`.
- Validación Fichajes: success en el mismo commit.
- Render Preview: deploy `dep-dbnkff6c6qcc73e56170` en estado `live`, commit `cb9cb1e344a0e84eab6d208bf7bc878b67a5c29d`.
- Producción y API sin cambios.

Sigue pendiente la prueba visual autenticada y la comprobación manual de interacción/responsive antes de cerrar la auditoría y promover a producción.
