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
- El siguiente build ha superado los errores de sintaxis anteriores y ha descubierto otro `className` incompleto en `EncargaGest.jsx`; ya está corregido.
- Siguen apareciendo avisos JSX no bloqueantes en `ModelosDocumentos.jsx` y `FichaExpediente.jsx`; se revisarán por separado.
- El build de Preview del commit `653c30484ac08c204bec3ab1ec708fe20c9f0b7d` terminó en estado `live` (deploy `dep-dbirup0ae00c73chfpqg`). Las limpiezas de cabecera de NotarGest y ApoderaGest también han pasado compilación.
- La compilación aún emite avisos JSX no bloqueantes en `ModelosDocumentos.jsx`, `FichaExpediente.jsx` y `CarpetaDigitalModal.jsx`; quedan pendientes de análisis para determinar si generan texto residual o esconden cierres de expresiones incorrectos.

## Estado

Auditoría y limpieza en curso. El primer cambio selectivo está aplicado en la rama de Preview. No se declara ningún archivo JSX completamente limpio hasta completar el recorrido de sus estilos y referencias. Este documento registra únicamente hechos comprobados en la revisión del 31/10/2026; no representa una certificación de limpieza total.

## Segunda fase — recorrido por módulos (31/10/2026)

### Módulos revisados

- Agenda y CTN: Agenda, vistas Día/Semana/Mes, modales, hooks, API y stores.
- Expedientes y provisiones: listado, ficha, carpeta digital, envío a notario, liquidación, traspasos, visibilidad de tablas y provisiones.
- ApoderaGest, EncargaGest, NotarGest y CancelaGest.
- Empleados y Fichajes: fichas, listado, modal, fichajes, control, ausencias y compensaciones.
- Herramientas e Informes: catálogos, PPAD, importadores, modelos documentales, utilidades e informes.
- Seguridad y Mensajería: permisos, roles, usuarios, auditoría, mensajes y componentes.
- Componentes compartidos, navegación, sidebar e intranet.

### Hallazgos y decisiones

1. En la muestra recorrida no aparecen importaciones CSS locales en la mayoría de los componentes; las referencias que sí permanecen se contrastan con el contenido real de cada hoja.
2. NeutralizarPresentacion.css sigue siendo el reset global temporal: neutraliza color, tipografía, fondos, bordes, radios, sombras, transformaciones y transiciones. No se elimina todavía porque evita que reaparezcan estilos antiguos mientras no esté desplegado el sistema visual unificado. Debe revisarse como siguiente tarea de arquitectura.
3. SidebarBase.css se conserva: contiene reglas de navegación, foco, desplazamiento y perfil.
4. index.css se conserva: importa Tailwind.
5. Informes.jsx contiene CSS embebido para una plantilla documental/impresión. No se elimina: puede ser necesario para generar documentos correctamente.
6. Los estilos inline que calculan alturas/anchos de gráficos, barras y posicionamiento de citas se clasifican como funcionales/datos y se conservan.
7. Hay múltiples atributos className="" y fragmentos de clases vacíos en componentes de varios módulos. Son residuos de la neutralización y siguen pendientes de retirada selectiva; no se han eliminado de forma masiva.
8. Las hojas vacías no se borran hasta confirmar que no quedan importaciones en la rama.

### Cambios aplicados en esta fase

- src/pages/agenda/VistaDia.jsx: compactadas clases con espacios vacíos; retirada condición de clase vacía y variable de resaltado local no utilizada. Se conserva el posicionamiento dinámico de citas, los datos y los eventos. Commit: d5f6ba791702ae75bf2ae6d8a35a3d64d764148a.
- src/pages/fusiones/Fusiones.jsx: eliminada importación de Fusiones.css, hoja vacía.
- src/pages/herramientas/AccesosNotariales.jsx: eliminada importación de CtnListadoPage.css, hoja vacía.
- src/pages/paneltecnico/LogsAvanzados.jsx, AuditoriaAvanzada.jsx, MonitorRealtime.jsx y MonitorSistema.jsx: eliminadas importaciones de PanelTecnicoSubmodulos.css, hoja vacía.
- src/pages/notargest/NotarGest.jsx: eliminado rótulo restante MOLSAN ERP · PREMIUM 2027.
- src/pages/apoderagest/ApoderaGest.jsx: eliminado texto de pie Premium 2027.
- src/pages/empleados/EmpleadoEditar.jsx: eliminados atributos className vacíos.
- src/pages/LoginPage.jsx: eliminado atributo className vacío.

### Referencias CSS observadas

- Globales que se mantienen: css/index.css y css/NeutralizarPresentacion.css.
- Sidebar protegido: css/SidebarBase.css, importado desde los componentes del sidebar/perfil.
- Referencias a hojas vacías retiradas: Fusiones.css, CtnListadoPage.css y PanelTecnicoSubmodulos.css.
- Retiradas las importaciones a PanelTecnicoSubmodulos.css en LogsAvanzados.jsx, AuditoriaAvanzada.jsx, MonitorRealtime.jsx y MonitorSistema.jsx.
- No se eliminan todavía los archivos CSS vacíos porque falta cerrar el inventario completo de imports de toda la rama.

### Estado de validación

- El despliegue Preview anterior quedó live para el commit 3c9239d1260d6e741a5006b8c1e8bb5e0bd66b5e.
- Los cambios posteriores de esta fase requieren un nuevo despliegue para comprobar compilación.
- La auditoría sigue en curso; no se declara ningún módulo completamente limpio ni se da por terminada la limpieza global.


### Comprobación completa de hojas CSS

Se ha inspeccionado el contenido de las 52 hojas CSS del frontend en la rama: 49 contienen únicamente el comentario de hoja vaciada; las tres restantes son index.css (importa Tailwind), NeutralizarPresentacion.css (reset global temporal) y SidebarBase.css (navegación/perfil protegidos). Las 49 hojas vacías no se eliminan todavía hasta cerrar la comprobación final de referencias en todos los ficheros JS/JSX y asegurar que no quedan imports dinámicos o referencias de documentación.


## Tercera fase — limpieza selectiva y racionalización (31/10/2026)

### Punto 1 — atributos visuales vacíos
- Retirados 769 atributos `className=""` en 27 componentes/páginas de Agenda, CTN, Expedientes, ApoderaGest, EncargaGest, NotarGest, Provisiones, Empleados, Fichajes, Seguridad, Mensajería, Intranet, Informes, Dashboard, Login y componentes compartidos.
- La operación se limitó a atributos cuyo valor era literalmente una cadena vacía. No se modificaron clases no vacías, expresiones dinámicas, eventos, datos ni lógica.
- Esta cifra corresponde a los archivos revisados en esta fase; no se certifica aún que no queden más atributos vacíos en el resto de los 187 archivos.

### Punto 2 — referencias CSS
- Se ha confirmado que las 49 hojas candidatas siguen teniendo solo el comentario marcador de vaciado (62 bytes cada una).
- Se han retirado importaciones conocidas de hojas vacías en Fusiones, AccesosNotariales, ModelosDocumentos y cuatro pantallas de Panel Técnico.
- No se eliminan todavía las 49 hojas: falta una búsqueda exhaustiva, específica de esta rama, de imports estáticos, imports dinámicos y referencias desde configuración/HTML. La búsqueda indexada de GitHub consultada no está sincronizada con esta rama y no se considera evidencia válida para borrar archivos.

### Punto 4 — NeutralizarPresentacion.css
- Retirados los bloques específicos redundantes para controles y enlaces: sus propiedades ya estaban cubiertas por el selector global de neutralización.
- Se mantienen el reset temporal, la exclusión del sidebar y su modal, el foco visible accesible, el hover aprobado de las tarjetas del selector y la regla de movimiento reducido.
- No se ha debilitado el reset global en esta fase para evitar que reaparezcan estilos heredados antes de implantar y probar el sistema visual definitivo.

### Estado de esta fase
- Punto 1: limpieza selectiva avanzada; queda pendiente barrido final de los archivos restantes.
- Punto 2: inventario de hojas completado; confirmación de dependencias no completada, por lo que no se borran las 49 hojas.
- Punto 3: pendiente de la confirmación exhaustiva del punto 2.
- Punto 4: racionalización segura aplicada; el reset global se conserva temporalmente.
- Punto 5: expresamente no iniciado. No se ha realizado comprobación visual de módulos.


## Cierre de los puntos 1–3 — barrido completo de la rama (31/10/2026)

### Punto 1 — barrido de atributos vacíos
- Revisados los 187 archivos JavaScript/JSX/TS/TSX de `frontend-app/src`.
- Eliminados 1.505 atributos literales `className=""` en 104 archivos.
- Se mantuvieron intactas las expresiones de clase dinámicas y las clases no vacías. No se hizo sustitución global de clases ni de estilos inline.
- En el barrido completo no se identificaron más atributos literales vacíos de ese patrón tras aplicar las correcciones.

### Punto 2 — referencias CSS en la rama
- Revisados los 187 archivos de código de `frontend-app/src` para referencias CSS en cadenas, imports y rutas.
- Las únicas referencias CSS encontradas son:
  - `src/main.jsx` → `./css/index.css` y `./css/NeutralizarPresentacion.css`.
  - `src/components/Sidebar.jsx` → `../css/SidebarBase.css`.
  - `src/components/SidebarPerfilModal.jsx` → `../css/SidebarBase.css`.
- Revisados también `index.html`, `package.json`, `postcss.config.js`, `tailwind.config.js` y `vite.config.js`: no contienen referencias a las hojas candidatas.
- Se conserva el trío anterior. No hay importaciones estáticas ni referencias de archivo CSS detectadas para las 49 hojas vaciadas.

### Punto 3 — eliminación de CSS vacíos
- Eliminadas las 49 hojas CSS de 62 bytes que contenían únicamente el comentario marcador.
- Inventario resultante: 3 hojas CSS, todas justificadas y en uso:
  - `index.css` (Tailwind).
  - `NeutralizarPresentacion.css` (neutralización temporal).
  - `SidebarBase.css` (navegación, foco, scroll y perfil).

### Estado actualizado
- Puntos 1, 2 y 3: completados en la rama Preview.
- Punto 4: racionalización segura aplicada; se conserva el reset global temporal y las excepciones funcionales/accesibles.
- Punto 5: no iniciado, conforme a la instrucción. La comprobación visual de módulos queda pendiente.
- Pendiente antes de declarar cerrado este lote: ejecutar build de Preview y verificar el resultado del despliegue.


### Validación del lote Preview
- Build de Render: deploy `dep-dbislcff3r2c73bgv030`.
- Commit desplegado: `a468e2ae38473a54afd92276997ea1da73607e80`.
- Resultado: `live` (31/10/2026, 11:02:30 UTC).
- Vite transformó 274 módulos y terminó el build correctamente.
- Se mantienen tres avisos de análisis JSX no bloqueantes ya identificados en `ModelosDocumentos.jsx`, `FichaExpediente.jsx` y `CarpetaDigitalModal.jsx` (carácter `}` dentro de JSX). No se han corregido en este lote porque requieren revisión contextual aparte y no forman parte de la limpieza de atributos vacíos.
- La fase visual del punto 5 permanece sin iniciar.


---

## Fase 4 — auditoría integral del frontend (31/10/2026)

### Alcance e inventario verificado en la rama Preview

- Rama: `molsan-premium-2027-glass-luxe`.
- Commit de partida: `73dd33b3c4ceedb10a74d49908d550a919c2d80a`.
- Inventario: 209 archivos bajo `frontend-app`; 187 archivos de código JS/JSX en `src`.
- Hojas CSS actuales: cinco (`index.css`, `NeutralizarPresentacion.css`, `SidebarBase.css`, `MolsanFase3.css`, `MolsanFase3Portales.css`). Esto actualiza la documentación anterior que indicaba tres hojas: las dos hojas Fase 3 se incorporaron después.
- `NeutralizarPresentacion.css`: 6.421 líneas, 810 bloques de reglas CSS, 35 media queries, 277 reglas/selector(es) con referencias específicas de módulos y 6 declaraciones `!important` distribuidas en tres bloques. No es únicamente un reset: concentra tokens, estilos comunes y una gran cantidad de reglas específicas de módulos.
- `MolsanFase3.css` (88 líneas) y `MolsanFase3Portales.css` (118 líneas) también se importan desde `main.jsx`. La arquitectura real tiene, por tanto, tres capas globales de estilo además de Tailwind y el CSS protegido del Sidebar.
- No se han encontrado importaciones CSS locales en la muestra amplia de páginas y componentes consultada; el Sidebar conserva su hoja propia protegida.

### Hallazgo corregido — protección de rutas internas

Se detectó que las rutas internas `/encargagest`, sus cuatro espacios de trabajo (`ctn`, `agenda`, `mensajes`, `intranet`) y las rutas de compatibilidad `/encargagestweb` y `/notargestweb`, además de `/notargest`, no aplicaban explícitamente los guards de sesión y permiso usados por el resto de módulos.

Corrección aplicada en `src/App.jsx`:
- Las rutas internas de EncargaGest ahora requieren `RequireAuth` y permiso `encargagest`.
- Las rutas internas de NotarGest ahora requieren `RequireAuth` y permiso `notargest`.
- Se protegen también las rutas de compatibilidad internas.
- Se mantienen sin cambios las rutas explícitas de acceso externo de notarías (`accessMode="external"`), que conservan su autenticación independiente.

Commit: `312f30a483bb8ddf923f2e0505046ae403e8c2af`.

### Validación de este cambio

- Preview Render: `molsan-glass-luxe-preview`.
- Deploy: `dep-dbj4gvcs728c738qgbbg`.
- Resultado: `live`.
- Vite: `✓ built in 4.83s`.
- Producción, backend y base de datos: sin cambios.

### Hallazgos pendientes — tablas y ordenación

El análisis estático de las páginas y componentes identifica tablas de datos que no muestran lógica de ordenación propia. Ejemplos confirmados para revisión y migración:
- `ControlApoderados.jsx`: cinco tablas sin lógica de ordenación detectada.
- `FestivosCompensaciones.jsx`: ocho tablas sin lógica de ordenación detectada.
- `Fichajes.jsx`: dos tablas sin lógica de ordenación detectada.
- `DocumentosAdmin.jsx`: una tabla sin lógica de ordenación detectada.
- `CtnDetallePage.jsx` y `ModalCtnDetalle.jsx`: dos tablas cada uno sin lógica de ordenación detectada.
- `CatalogoOficinas.jsx`, `CorrespondenciaTipificada.jsx`, `MensajeriaMolsan.jsx` y `NotarGest.jsx`: contienen tablas de datos sin lógica de ordenación detectada.

La detección es estática: cada tabla debe clasificarse antes de cambiarla para excluir correctamente calendarios, vistas de impresión, tablas documentales fijas y resúmenes que no sean listados operativos. La ordenación debe actuar sobre los datos de React y conservar paginación, filtros y estados; no se aplicará reordenación directa del DOM.

### Estado de Fase 4

- Inventario frontend y capas CSS: realizado.
- Primera corrección de navegación/permisos: implementada y desplegada en Preview.
- Revisión y migración completa de tablas: pendiente.
- Revisión individual de todos los formularios, modales y componentes secundarios: pendiente.
- Revisión responsive real en navegador autenticado y validación funcional de cada flujo: pendiente; no se certifica con una compilación.
- Eliminación/refactor de reglas CSS heredadas: pendiente de mapa de dependencias y pruebas para evitar regresiones.
- La Fase 4 continúa abierta. No se declara completada.
