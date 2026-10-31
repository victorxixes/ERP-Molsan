# Auditoría de limpieza visual Glass Luxe — 31/10/2026

## Alcance y referencia

- Repositorio: `victorxixes/ERP-Molsan`
- Rama: `molsan-premium-2027-glass-luxe`
- Commit inspeccionado: `86841aaf8b5fb1551e5eccd63c797f5de48d5619`
- Directorio de aplicación: `frontend-app/src`

## Reconciliación del inventario

El inventario de `frontend-app/src` contiene 239 archivos: 187 JavaScript/JSX y 52 CSS. El recuento ampliado de `frontend-app` asciende a 242 porque incluye además tres archivos JavaScript de configuración situados en la raíz (`postcss.config.js`, `tailwind.config.js` y `vite.config.js`). No son tres archivos de módulos adicionales.

De las 52 hojas CSS:
- 49 contienen únicamente el comentario de hoja vaciada (62 bytes en el inventario).
- 3 contienen código: `index.css`, `NeutralizarPresentacion.css` y `SidebarBase.css`.

## Clasificación confirmada hasta ahora

### Conservar: estilos funcionales

- `SidebarBase.css`: reglas de apilamiento, anchura, navegación, desplazamiento, altura mínima de enlaces/botones, foco accesible y límites del diálogo de perfil. Se conserva íntegra.
- `index.css`: importa Tailwind; no eliminar.
- Estilos inline dinámicos de gráficos en `Dashboard.jsx`, `ApoderaGest.jsx` y `NotarGest.jsx`: sus anchos/alturas se calculan a partir de datos reales. Son representación de datos, no decoración estática. No eliminar.
- Estilos inline de fallback de error en `App.jsx`: organizan el contenido del estado de error. No eliminar sin sustituir por una estructura funcional equivalente.
- Reglas `:focus-visible` y `prefers-reduced-motion`: conservar por accesibilidad.

### Revisar antes de modificar

- `NeutralizarPresentacion.css`: aplica un reset global con `!important` sobre color, tipografía, fondos, bordes, radios, sombras, transformaciones, transiciones y animaciones. Neutraliza visuales heredados, pero también puede anular estilos funcionales/estados y accesibilidad visual. No se considera solución definitiva hasta revisar qué reglas pueden sustituirse por neutralización selectiva.
- `ModulosSelector.jsx` y su hover: conservar el comportamiento aprobado de elevación y realce de tarjetas; no eliminar el efecto.
- `Sidebar.jsx`: mantener navegación, permisos, iconos y perfil; su CSS asociado queda protegido.
- Clases Tailwind y clases semánticas de módulos: no retirar por nombre. Deben clasificarse por uso real antes de tocarse.

## Primera muestra de componentes inspeccionados

- Sin importaciones CSS locales detectadas en la muestra: LoginPage, ModulosSelector, Dashboard, Agenda, ApoderaGest, EncargaGest, NotarGest, Seguridad, Fichajes e Intranet.
- Se detectaron estilos inline dinámicos de datos en Dashboard (2), ApoderaGest (2) y NotarGest (3).
- No se ha declarado ningún archivo JSX como completamente limpio todavía: falta el recorrido completo y el análisis de referencias.

## Criterio de limpieza

1. Eliminar decoración heredada redundante (fondos, sombras, colores, tipografía decorativa, bordes ornamentales y estilos duplicados) solo cuando no represente estado, jerarquía o información.
2. Conservar layout, responsive, interacción, foco, validación, estados, datos, gráficos, accesibilidad y navegación.
3. No borrar hojas CSS vacías hasta localizar y retirar de forma coordinada todas sus importaciones.
4. No modificar backend, datos, documentos ni producción.
5. Cada lote de cambios debe compilarse y revisarse antes de continuar.

## Cambios selectivos aplicados

1. `src/pages/provisiones/ProvisionesFondosPage.jsx`: eliminados dos rótulos puramente decorativos `MOLSAN ERP PREMIUM 2027` (catálogos económicos y Glass Luxe). Se conservan títulos funcionales, explicaciones, controles y lógica de provisiones. Commit: `7e7fe7b8ff30b75e6bd6f7e6fb02c70471f8268c`.
2. `src/pages/herramientas/ModelosDocumentos.jsx`: retirado el import de `ComponentesOperativosPremium.css` (hoja vacía); retiradas las menciones obsoletas `PREMIUM 2027` del encabezado y pie de la vista previa documental, conservando la marca MOLSAN y el contenido del documento. Commit: `9259485eb4298ff9da4947c773a1da502c9c4cf6`.
3. `src/pages/expedientes/FichaExpediente.jsx`: corregido el cierre de la expresión JSX en el `onMouseDown` del modal PPAD. Era un error de sintaxis que bloqueaba la compilación; se ha conservado la lógica del manejador. Commit: `c80e3776b37523f16f5782dc10499cde1b13db1a`.

## Comprobación de compilación

- Los despliegues Preview anteriores habían fallado por el cierre JSX ausente en el modal PPAD de `FichaExpediente.jsx`.
- La corrección PPAD ya está en la rama.
- Un build posterior reveló dos defectos adicionales en `Fusiones.jsx` (expresión de clase incompleta) y `FichaExpediente.jsx` (llave de cierre sobrante); ambos se han corregido de forma localizada.
- En `ModelosDocumentos.jsx` Render emitió además un aviso de análisis JSX sobre un carácter `}`. No se ha alterado esa zona porque primero hay que aislar si es un aviso no bloqueante o un defecto real.
- Pendiente: ejecutar y confirmar un build completo con estos últimos arreglos.

## Estado

Auditoría y limpieza en curso. El primer cambio selectivo está aplicado en la rama de Preview. No se declara ningún archivo JSX completamente limpio hasta completar el recorrido de sus estilos y referencias. Este documento registra únicamente hechos comprobados en la revisión del 31/10/2026; no representa una certificación de limpieza total.
