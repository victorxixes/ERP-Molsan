# Auditoría visual integral — MOLSAN ERP PREMIUM 2027 · GLASS LUXE

**Fecha de inicio:** 30-10-2026  
**Rama:** `molsan-premium-2027-glass-luxe`  
**PR:** [#374](https://github.com/victorxixes/ERP-Molsan/pull/374)  
**Estado:** en curso. No integrada ni desplegada.

## Objetivo y límites

Revisar el 100 % de las pantallas, portales, formularios, tablas, tarjetas y ventanas modales para unificar la experiencia visual, preservando rutas, permisos, autenticación, reglas de negocio, API y datos.

Esta auditoría distingue tres niveles que no deben confundirse:

1. **Inventario / revisión estática:** rutas, componentes, hojas CSS, selectores, breakpoints y estructura del código.
2. **Validación técnica:** compilación, CI y pruebas automatizadas.
3. **QA visual real:** abrir cada pantalla y modal en navegador en escritorio, tablet y móvil, con evidencias. No se marcará como completado sin realizarlo.

No se autoriza tocar la base de datos productiva ni los servicios actuales de Render. Todo cambio se mantiene en esta rama.

## Inventario inicial verificado

- 113 archivos bajo `frontend-app/src/pages/`.
- 50 hojas CSS bajo `frontend-app/src/`.
- El layout ERP principal está en `src/layout/Layout.jsx`.
- ApoderaGest, NotarGest y EncargaGest tienen presentación/rutas propias y requieren QA independiente del layout operativo.
- La PR #374 está abierta, en borrador, con 54 commits, 29 archivos cambiados y 1.126 adiciones / 10 eliminaciones en el momento de iniciar esta auditoría.
- Último HEAD verificado: `51700a9b8c514afe3641339171a591c5b6bc3b90`.

## Hallazgos iniciales

### A. Sistema visual y capas globales

- `molsan-tokens.css`, `molsan-design-system.css`, `molsan-controls.css` y `molsan-tables.css` definen la base compartida.
- `MolsanRedesign2027.css` aplica normalización a una lista cerrada de clases de página; por tanto, no todas las páginas quedan cubiertas automáticamente.
- Conviven estilos globales antiguos (`base.css`, `erp-theme.css`, etc.), el rediseño general y CSS específicos por módulo. Hay que revisar cascada y orden de carga por pantalla.
- Recuento estático de declaraciones `!important` en hojas principales seleccionadas:
  - `MolsanRedesign2027.css`: 118.
  - `NotarGest.css`: 83.
  - `PortalProfesionalShared.css`: 56.
  - `EncargaGest.css`: 7.
  - `Cancelagest.css`: 5.
  - `CancelagestUnified.css`: 13.
  Estos usos no se eliminarán en bloque: se analizarán por selector y contexto para no romper estados funcionales.

### B. Estructura y navegación

- `Layout.jsx` aloja el ERP operativo y excluye explícitamente del layout común los portales profesionales.
- `Sidebar.jsx` deriva accesos desde el catálogo y permisos, con lógica específica para Espacios/Técnicos y exclusión de Notificaciones del listado.
- Pendiente: comprobar visualmente menú, submenús, estados activos, hover, teclado, scroll y comportamiento responsive.

### C. FichaExpediente

- `FichaExpediente.jsx` es un componente extenso (más de 540 KB de texto fuente) y contiene numerosas referencias a modales/diálogos.
- Usa `FichaExpedientePremium.css`, además de estilos globales y clases locales.
- Pendiente: inventariar cada ventana por actividad, formulario, estados, tablas y acciones; comprobar el flujo completo sin alterar lógica económica ni actividades.

### D. Portales profesionales

- ApoderaGest importa `PortalProfesionalShared.css` y contiene varios diálogos/modales propios.
- NotarGest importa `PortalProfesionalShared.css` y `NotarGest.css`; sus hojas presentan numerosos breakpoints y reglas de compatibilidad.
- EncargaGest importa `PortalProfesionalShared.css` y `EncargaGest.css`; contiene formularios y modales de trabajo propios.
- Pendiente: revisar cada ventana, bandeja, tabla, detalle, formulario y estado vacío/error, por separado y en tres tamaños.

## Matriz de avance

| Bloque | Revisión estática | Correcciones | QA navegador escritorio/tablet/móvil |
|---|---|---|---|
| 1. Estructura general y navegación | Iniciada | Pendiente de auditoría completa | Pendiente |
| 2. FichaExpediente y modales | Inventario inicial | Pendiente | Pendiente |
| 3. ApoderaGest, NotarGest, EncargaGest | Inventario inicial | Parcial en PR #374; falta auditoría completa | Pendiente |
| 4. Empleados, fichajes, mensajería, seguridad y permisos | Inventario de rutas | Pendiente | Pendiente |
| 5. CancelaGest, provisiones, agenda y expedientes | Inventario de rutas | Parcial en PR #374; falta auditoría completa | Pendiente |
| 6. Herramientas, catálogos, utilidades, importadores, informes y panel técnico | Inventario de rutas | Pendiente | Pendiente |
| 7. Componentes comunes | Tokens y hojas compartidas identificados | Parcial; revisar cobertura real | Pendiente |
| 8. Responsive | Breakpoints estáticos parcialmente inventariados | Pendiente | Pendiente |
| 9. CSS heredado y duplicidades | Conflictos potenciales identificados | Pendiente de revisión por selector | Pendiente |

## Criterios para cerrar cada pantalla

- Tipografía, jerarquía, tamaños, contraste y legibilidad coherentes.
- Colores, fondos, bordes, radios, sombras y espaciado coherentes.
- Tarjetas, botones, iconos, inputs, selectores, alertas y estados consistentes.
- Tablas legibles, con columnas y scroll adecuados, sin ensanchar la página.
- Modales con jerarquía clara, scroll interno y cierre/acciones accesibles.
- Sin solapamientos, recortes, desbordamientos ni elementos inaccesibles.
- Adaptación comprobada en escritorio, tablet y móvil.
- Sin cambios accidentales de permisos, rutas, comportamiento o lógica de negocio.

## Condición de cierre

La auditoría solo se considerará completa cuando todos los bloques estén revisados, las correcciones estén aplicadas en esta rama, CI/build estén verdes y exista QA visual real de las pantallas y modales en escritorio, tablet y móvil. La PR no se integrará antes de ese cierre.


## Ampliación del inventario de ventanas modales

El árbol del frontend contiene, al menos, estos componentes dedicados a modales:

- `components/SidebarPerfilModal.jsx`
- `components/agenda/ModalNuevaCita.jsx`
- `components/ctn/ModalCtnDetalle.jsx`
- `components/empleados/ModalEmpleado.jsx`
- `components/expedientes/CarpetaDigitalModal.jsx`
- `components/expedientes/EnviarANotarioModal.jsx`
- `components/expedientes/LiquidarExpedienteModal.jsx`
- `components/expedientes/ProvisionesModal.jsx`

Además, las páginas de ApoderaGest, NotarGest y EncargaGest contienen diálogos y modales propios; FichaExpediente también contiene varios diálogos inline y un portal para la orden de pago. Esta lista es un inventario inicial por nombre de archivo, no una lista exhaustiva de todas las ventanas que se abren en la aplicación.

## Actualización de validación técnica

En el commit `69d37549e939a10743cff55ed2635293024fd82b`, los tres workflows asociados a la PR terminaron correctamente:
- Validar Fichaje Molsan: build frontend y sintaxis backend correctos.
- Validar Control Apoderados: build frontend y sintaxis backend correctos.
- EncargaGest checks: build frontend y sintaxis backend correctos.

Esto no equivale a QA visual ni a una prueba de todas las rutas.


## Riesgo detectado para el entorno de previsualización

La configuración `frontend-app/src/api/config.js` usa por defecto `https://agenda-intranet-b.onrender.com/api` cuando no existe `VITE_API_URL`.

**Consecuencia:** no se debe publicar una previsualización aislada sin fijar explícitamente un backend de pruebas. De lo contrario, el frontend de la rama podría enviar peticiones al backend de producción. No se ha creado ningún servicio de preview ni se ha modificado Render.

Antes del QA visual interactivo habrá que proporcionar un backend de pruebas aislado con datos ficticios, o preparar una capa de mocks de API para las pruebas. No se utilizará el backend productivo ni se copiarán datos históricos para esta finalidad.


## Detalle inicial de FichaExpediente

En `FichaExpediente.jsx` se han contado estáticamente:
- 14 usos del componente `<Modal>`.
- 3 diálogos explícitos con `role="dialog"` y `aria-modal="true"`.
- 3 identificadores `aria-labelledby` distintos en esos diálogos.
- 3 llamadas a `createPortal`.
- Dos clases raíz detectadas: `ficha-expediente-premium erp-page p-6` y `ficha-expediente-premium erp-page space-y-4 pb-8`.

El componente tiene aproximadamente 543 KB de fuente y 675 valores distintos de `className` estáticos detectados. Por su tamaño y densidad, la revisión debe hacerse por subactividad y ventana, no con una sustitución masiva de estilos.


## Segunda pasada: administración, seguridad y mensajería

### Hallazgos
- `ControlApoderados.jsx` no importaba una hoja compartida; empleaba clases Tailwind con indigo fijo para el color de marca, además de superficies y tipografía slate.
- `ControlFichajesAdmin.jsx` tampoco importaba las hojas compartidas; empleaba acciones verdes/azules de marca, una tabla de ancho mínimo de 1.250 px y un modal inline sin clase de ámbito propia.
- `MensajeriaProveedores.jsx` no importaba CSS compartido y tenía campos/botones con azul Tailwind fijo.
- `SeguridadSubpaginasPremium.css` contenía fallbacks de azul y texto diferentes a los tokens corporativos (`#4169e1`, `#2563eb`, `#172033`).

### Correcciones aplicadas en la rama
- Se añadió ámbito `control-apoderados-premium`, importación de componentes operativos compartidos y normalización de la marca indigo al token azul Molsan. Se preservan los colores semánticos de validación, error y estado.
- Se añadió ámbito `control-fichajes-admin-premium`, importaciones compartidas y clase específica para su modal de edición; botones de acción quedan vinculados al color primario y el modal incorpora límites de viewport y safe-area.
- Se añadió ámbito `mensajeria-proveedores-premium`, importación compartida y normalización de campos, bordes y acento.
- Se alinearon los fallbacks de Seguridad con los tokens corporativos.

### Límites de esta pasada
- Las correcciones anteriores son de CSS/clases de ámbito e importaciones; no alteran endpoints, estados, cálculos ni permisos.
- La tabla de Control de Fichajes conserva scroll horizontal en móvil para no comprimir columnas de auditoría; debe comprobarse en navegador.
- La vista previa real de estas pantallas y sus modales sigue pendiente de entorno de pruebas aislado y QA de navegador.

## Pasada adicional de inventario

Se han inspeccionado estáticamente también:
- Agenda: vistas Día, Semana y Mes importan `ComponentesCompartidosPremium.css`.
- CTN: ficha y listado tienen CSS dedicados; la ficha contiene al menos un diálogo con rol accesible.
- Intranet, Maestros y Notificaciones tienen CSS dedicados.
- Mensajería de Molsan importa estilos de herramientas; la ficha de proveedores carecía de estilos compartidos y ya se ha incorporado.
- Seguridad (Usuarios y Permisos) ya utiliza clases de ámbito premium; persisten reglas CSS repetidas que se deben consolidar con cuidado, no mediante borrado masivo.
