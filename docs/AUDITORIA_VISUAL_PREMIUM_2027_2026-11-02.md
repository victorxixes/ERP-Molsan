# Auditoría visual MOLSAN ERP PREMIUM 2027 · 02/11/2026

## Estado

**En curso. No aprobada para producción.**

Esta revisión se está realizando sobre la rama `audit/visual-premium-20261102`, basada en `molsan-premium-2027-global`. Los cambios se mantienen en la PR borrador #383. No se ha fusionado ni desplegado nada en producción y no se han modificado datos ni configuración de Render.

## Alcance revisado estáticamente

Se han inspeccionado componentes y páginas de:

- Espacio de trabajo, Herramientas y Catálogos.
- ApoderaGest y Control Apoderados.
- NotarGest y EncargaGest (estructura y estilos existentes; su revisión de seguridad se mantiene en PR #381/#382).
- Mensajería, Mensajería Gestión y Solicitudes.
- Fichajes, Control de Fichajes, ausencias, documentos y compensaciones.
- CTN y ficha de notaría.
- Expedientes y FichaExpediente.
- Informes y Provisiones.
- Seguridad, permisos y usuarios.
- Logs y tabla de eventos.

## Correcciones registradas en esta rama

- Sustitución de iconos emoji y glifos funcionales por nombres semánticos de `MolsanIcon` en Herramientas, Catálogos, Control Apoderados, Mensajería, Expedientes, FichaExpediente, Informes, Provisiones, CTN, Seguridad y Logs.
- Incorporación de iconos SVG de ordenación y navegación en la tabla de Logs.
- Incorporación de iconos semánticos de orden ascendente, descendente y sin ordenar a la biblioteca común.
- Inclusión de Fichajes y Control Apoderados en los selectores tipográficos globales de Premium 2027.
- Normalización del título visible del módulo de empleado a **Fichajes**.

## Hallazgos que siguen abiertos

1. **Inspección visual real:** falta comprobar cada página y subpágina en Preview, con capturas de escritorio y móvil. La revisión del código no demuestra por sí sola el resultado visual.
2. **Consolidación de estilos:** quedan clases Tailwind y reglas CSS heredadas en Fichajes, Informes, Provisiones, Mensajería y algunas subpáginas. Hay que comprobar qué reglas globales las armonizan y retirar solo las sobrescrituras contradictorias, sin romper estados semánticos.
3. **Iconografía residual:** quedan flechas de ordenación/paginación en algunas tablas y módulos. Deben migrarse cuando se revise el componente concreto, distinguiendo indicadores funcionales de texto ordinario.
4. **Cabeceras y tarjetas:** falta comparar visualmente alturas, tamaños, alineación, iconos, espaciados y sombras entre todos los módulos.
5. **Responsive y accesibilidad:** falta probar modales, tablas anchas, formularios, foco de teclado, contraste y comportamiento con movimiento reducido.
6. **Datos frontend ↔ backend:** debe contrastarse en Preview que KPIs, estados, contadores, tablas, formularios y mensajes de error reflejan exactamente las respuestas reales de la API.
7. **Integración conjunta:** las correcciones visuales deben probarse junto con las PR #381 (frontend/seguridad) y #382 (backend/API), antes de aprobar cualquier integración.

## Criterio de aceptación

La auditoría solo se dará por finalizada cuando:
- el build y las comprobaciones automáticas estén en verde sobre el último commit;
- se hayan probado en Preview los módulos y subpáginas del alcance;
- no existan errores visuales responsive ni iconografía funcional heredada;
- los datos mostrados coincidan con las respuestas del backend;
- permisos y aislamiento hayan superado las pruebas funcionales;
- exista evidencia reproducible de las comprobaciones.

**Exclusión confirmada por el usuario:** no se exige almacenamiento documental persistente en Render.

## Estado de Preview comprobado el 02/11/2026

- Frontend Preview `molsan-premium-2027-preview`: rama configurada `molsan-premium-2027-global`; último deploy live observado en commit `7aa16ad74b788e90761b130384ab8398abefb55d`.
- API Preview `molsan-glass-luxe-preview-api`: rama configurada `molsan-premium-2027-glass-luxe`; último deploy live observado en commit `5f1716333afeaa5d092d9ae65eb2c824970464d1`.
- La rama visual `audit/visual-premium-20261102` y las ramas de auditoría frontend/API todavía no están publicadas conjuntamente en Preview. Por tanto, no se puede atribuir al código de esta auditoría una validación visual desplegada.
- No se ha lanzado ningún deploy ni se ha cambiado la configuración de los servicios. Para validar el aspecto final en navegador habrá que autorizar una publicación controlada en Preview y coordinar las ramas frontend y API.


## Despliegue temporal Preview — 02/11/2026, 18:54 UTC

- Integración frontend Preview desplegada correctamente en commit `8568b3e50be948534af468e36834c7e4b61cbfb5` (Render deploy `dep-dbkdntbbc2fs73ekh3gg`, estado `live`).
- API Preview desplegada correctamente en commit `bedbc6627236064766ea93dbad2aeede512905d5` (Render deploy `dep-dbkdnu8u01pc73brhejg`, estado `live`).
- Los dos servicios tienen auto-deploy desactivado; el despliegue se lanzó manualmente tras CI correcto. Los servicios siguen apuntando a sus ramas Preview, no a `main`.
- La API registró `Application startup complete` y `Uvicorn running`; no se encontraron respuestas HTTP 5xx en los logs de peticiones consultados después del arranque.
- El aviso del logger `[STORAGE][CRITICAL]` se mantiene anotado, pero queda fuera del alcance de esta auditoría por decisión expresa del usuario: no se almacenarán documentos en Render.
- Aún falta ejecutar pruebas E2E autenticadas por rol/portal y revisión visual manual de todas las páginas en navegador, escritorio y móvil. Estado de despliegue live no equivale a auditoría funcional/visual aprobada.

- Tras los merges de Preview, CI también terminó correctamente sobre los commits desplegados: frontend `8568b3e` (Frontend build, Validar Fichaje, EncargaGest checks, Backend audit, Control Apoderados y Consolidación Post Firma: todos success); API `bedbc66` (Backend audit, EncargaGest checks, Control Apoderados, Validar Fichaje y Consolidación Post Firma: todos success).
