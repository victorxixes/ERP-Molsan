# MOLSAN ERP Premium 2027 — inventario frontend de partida

Fecha de corte: 2026-11-06  
Rama de referencia: `main`  
Commit de referencia: `288e193590d3dbdbbc27c815761efd8f19c70d3a`

## Recuento reproducible

Inventario obtenido del árbol Git recursivo de ese commit y de las declaraciones de rutas de `frontend-app/src/App.jsx`.

| Elemento | Recuento |
|---|---:|
| Archivos bajo `frontend-app/src/` | 282 |
| Componentes/ficheros JSX o TSX | 132 |
| Hojas CSS | 50 |
| Componentes de página bajo `pages/` | 96 |
| Declaraciones `<Route>` en App.jsx | 107 |
| Componentes cuyo nombre indica modal/dialog | 8 |

El recuento de 8 modales es únicamente por nombre de fichero. No incluye diálogos implementados inline dentro de páginas, por lo que **no representa el total de ventanas** ni sustituye una auditoría de estados y accesibilidad.

## Hojas CSS existentes

- `css/Cancelagest.css`
- `css/CancelagestUnified.css`
- `css/CatalogosMaestrosPremium.css`
- `css/ComponentesAccesoPremium.css`
- `css/ComponentesCompartidosPremium.css`
- `css/ComponentesOperativosPremium.css`
- `css/CtnListadoPage.css`
- `css/DashboardCancelagest.css`
- `css/EncargaGest.css`
- `css/EncargaGestWorkspace.css`
- `css/Fusiones.css`
- `css/HerramientasPremium.css`
- `css/LayoutPortalesPremium.css`
- `css/ModalesHerramientasPremium.css`
- `css/ModalesOperativosPremium.css`
- `css/MolsanRedesign2027.css`
- `css/NotarGest.css`
- `css/PortalProfesionalShared.css`
- `css/animations.css`
- `css/base.css`
- `css/cards.css`
- `css/erp-theme.css`
- `css/forms.css`
- `css/index.css`
- `css/layout.css`
- `css/modals.css`
- `css/molsan-controls.css`
- `css/molsan-design-system.css`
- `css/molsan-tables.css`
- `css/molsan-tokens.css`
- `css/tables.css`
- `css/tabs.css`
- `css/variables.css`
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

## Hallazgos que condicionan la migración

1. El selector de módulos contiene el patrón visual de referencia: jerarquía de cabecera, acciones alineadas a la derecha y tarjetas con acento superior, icono, título y descripción dentro del bloque.
2. El nuevo `MolsanPageHeader` de la PR #410 no es todavía una extracción fiel de ese patrón: su marca son siglas en texto, sus medidas y fondo son propios y no reutiliza el sistema SVG ya presente en `Sidebar.jsx`.
3. `molsan-design-system.css` contiene un puente temporal que maquilla cabeceras heredadas (`.ag-hero`, `.ng-cabecera`, `.eg-hero`, entre otras). No debe retirarse hasta migrar y comprobar todos sus consumidores.
4. `MolsanRedesign2027.css` tiene 3.499 líneas y contiene bloques repetidos de normalización por familias de módulos, además de reglas específicas para portales, controles, tablas y diálogos. No se debe borrar por tamaño: hay que mapear selector, consumidor, orden de carga y función antes de retirar reglas.
5. `package.json` no declara una librería de iconos externa. `Sidebar.jsx` ya contiene un mapa de iconos SVG internos reutilizable como referencia para una implementación común; no añadir una dependencia de iconos sin necesidad.
6. Los nombres de archivo no permiten contar los modales inline ni sus estados. La siguiente fase debe localizar diálogos en páginas y componentes, y verificar foco, Escape, backdrop, scroll, loading, error y responsive.

## Secuencia de migración

- Definir una única cabecera y tarjeta canónicas a partir del selector y del sistema SVG interno existente.
- Migrar páginas y subpáginas por familias, manteniendo intacta la lógica de negocio y los permisos.
- Migrar los modales y sus estados de forma separada.
- Para cada CSS: identificar imports, selectores usados y reglas duplicadas; retirar solo reglas sin consumidor o sustituidas y verificadas.
- Ejecutar build y pruebas de regresión; después validar el Preview con sesión real.
- Solo entonces integrar en `main` y desplegar frontend. No tocar API ni base de datos para esta migración visual.

## Límites de este documento

Este archivo es un inventario de partida, no una declaración de auditoría terminada. No certifica el aspecto visual, no cuenta todos los diálogos inline y no declara migrado ningún módulo por el mero hecho de que compile.
