# Auditoría exhaustiva de estilos y componentes — MOLSAN ERP PREMIUM 2027

**Rama de trabajo:** `fix/molsan-css-selector-audit-round1`  
**PR:** #409 (Draft)  
**Último commit de código:** `31a200c57fffb321550d13bf8f824da6d5237f47`  
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
- Commits de esta ronda: `c052422` (inventario), `6465ffa` (regla vacía), `0a0b8df` y `633914f` (consolidación/estilo de diálogos), `54fe050` (icono CG), `321a44d` (cierres JSX de FichaExpediente), `31a200c` (KPI legacy de EncargaGest).

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
| Build y despliegue Render Preview | Correctos; deploy `dep-dbmuu11srm7s73a0a3m0` en estado `live` para commit `666114d` |
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
