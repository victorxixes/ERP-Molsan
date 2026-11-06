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
