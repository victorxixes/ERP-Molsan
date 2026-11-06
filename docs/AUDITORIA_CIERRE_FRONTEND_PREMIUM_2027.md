# Auditoría de cierre frontend MOLSAN ERP PREMIUM 2027

**Fecha:** 6 de noviembre de 2026  
**Rama auditada:** `fix/molsan-css-selector-audit-round1`  
**Último commit de limpieza App/main y CSS global:** `3f407f05ec99d7661d08171fe9e0cb671e16ff5a`  
**Último commit con build Vite confirmado:** `6facf31bc108632018683345111cc684c9f77b3f`  
**PR:** [#409](https://github.com/victorxixes/ERP-Molsan/pull/409)  
**Alcance de seguridad:** solo frontend y documentación en la rama de Preview. No se han modificado producción, API, base de datos ni datos de expedientes.

## Resultado ejecutivo

Esta auditoría distingue expresamente entre inspección estática, compilación y validación real en navegador. No se marca como validada una pantalla solo porque exista su componente o compile.

- El enrutador de `frontend-app/src/App.jsx` contiene **110 elementos `Route`**: 109 con atributo `path` (108 rutas concretas y una ruta comodín `*`) y una ruta índice. No hay duplicados literales entre paths. El inventario se ha guardado en `docs/INVENTARIO_RUTAS_FRONTEND_2027.md`. El número no equivale automáticamente a pantallas: incluye rutas externas, variantes, rutas dinámicas y compatibilidad.
- Se inspeccionaron los JSX principales de ApoderaGest, EncargaGest y NotarGest y sus tres hojas CSS.
- Se inspeccionaron los puntos de entrada de estilos en `main.jsx`, además de las capas globales CanonicalVisual, GlobalConsistency, GlassLuxeUnified, Premium2027 y Redesign2027.
- Se inspeccionaron los componentes principales de Expedientes, Agenda, CTN, Fusiones, Provisiones, Mensajería, Informes, Catálogos, Seguridad y Panel Técnico.
- El workflow de compilación Vite asociado al commit de referencia terminó correctamente. Esto verifica compilación, no comportamiento funcional ni apariencia en Render.
- Se consultó Render con autorización del usuario: el servicio `molsan-premium-2027-candidate-preview` está activo y su último deploy figura `live`, pero sirve el commit `fb0c71eb4fb908af3868a247802752972af7a8df` desde `integration/erp-molsan-supabase-ready`. El auto-deploy está desactivado; no se ha desplegado la rama PR #409.
- La apertura de la URL del Preview desde el lector web no ha sido posible; no se declara una inspección visual real de escritorio, tablet o móvil.
- Tras las modificaciones posteriores en `App.jsx` y `main.jsx`, todavía no hay un nuevo build asociado al commit final. Por tanto, no se declara completado el punto de validación visual ni la ausencia total de regresiones.

## 1. Portales profesionales

| Hoja | Tamaño inspeccionado | Selectores repetidos detectados | Decisión |
|---|---:|---:|---|
| `ApoderaGest.css` | 90.092 caracteres | 118 | Mantener capas hasta contrastar cada estado con JSX y navegador |
| `EncargaGest.css` | 34.372 caracteres | 44 | Mantener capas hasta contrastar cada estado con JSX y navegador |
| `NotarGest.css` | 39.852 caracteres | 23 | Mantener capas hasta contrastar cada estado con JSX y navegador |

Los selectores repetidos no son necesariamente duplicados muertos: las declaraciones cambian en distintos puntos de la cascada y pueden representar estados responsive, variantes de modal o ajustes posteriores. Una eliminación masiva no es segura.

La comparación automática de nombres de clases CSS con un único JSX principal tampoco basta para declarar reglas huérfanas: hay clases dinámicas, subcomponentes, portales y elementos de impresión. No se han eliminado reglas de estas tres hojas por una mera ausencia textual.

## 2. Capas globales

El orden de carga en `main.jsx` confirma que se cargan varias capas globales después de las hojas de módulos. Se detectaron responsabilidades que se solapan y deben revisarse con comparación de cascada:

- `MolsanRedesign2027.css`: normalización, inputs, foco, tablas, overflow y responsive.
- `MolsanGlobalConsistency2027.css`: gutters, cabeceras sin parpadeo en Catálogos/Utilidades, controles, tablas y foco.
- `MolsanGlassLuxeUnified2027.css`: compatibilidad de botones heredados.
- `MolsanPremium2027.css`: patrón de Espacios de trabajo, iconos y un bloque global específico de tarjetas de ApoderaGest.
- `MolsanCanonicalVisual2027.css`: geometría canónica de cabeceras y tarjetas.
- `MolsanCardsPremium2027.css`: excepciones de tarjetas y Catálogos que siguen vigentes.

No se han retirado reglas solo por parecer similares: el orden de importación y la especificidad determinan cuál gana y suprimir una capa sin prueba visual podría reintroducir márgenes dobles, parpadeos o cambios de estado.

## 3. Módulos técnicos inspeccionados en código

Se localizaron y abrieron los componentes principales de:

- Expedientes: listado y ficha.
- Agenda.
- CTN.
- Fusiones.
- Provisiones de fondos.
- Mensajería.
- Informes.
- Catálogos.
- Seguridad.
- Panel Técnico.

La inspección de archivos no equivale a una revisión completa de todas sus subrutas, componentes hijos, tablas, estados vacíos y modales. La FichaExpediente, por su tamaño y número de flujos, requiere revisión por secciones y pruebas de interacción específicas.

## 4. Modales

El inventario de arquitectura existente identifica, entre otros, los siguientes grupos que deben verificarse individualmente: filtros avanzados, carpeta digital, datos de actividad, envío a notario, factura de honorarios, complemento de saldo y PPAD en Expedientes; resumen de actividad en ApoderaGest; avisos, pagos, perfil y resumen de expedientes en NotarGest; alta, edición, incidencias, accesos y perfil en EncargaGest; y modales de CTN, Informes, Mensajería, Seguridad y Panel Técnico.

La revisión de un modal debe comprobar apertura, cierre, foco, Escape, validación, errores, guardado, scroll, responsive y conservación de la acción funcional. No se marca ninguno como visual y funcionalmente validado sin ejecutar esas pruebas.

## 5. Cambios ya incluidos en PR #409

- Retirada de selectores genéricos que no correspondían al JSX vigente en Notificaciones y Panel Técnico.
- Traslado de la responsabilidad de ancho de cabecera al CSS canónico.
- Eliminación de bloques de Utilidades e Informes que no correspondían al marcado actual y de selectores de portal direct-child que no podían alcanzar el hero anidado.
- Conservación de excepciones específicas de Catálogos y reglas de tarjetas que sí tienen uso.
- Build Vite correcto en el workflow asociado al commit de referencia `6facf31` (antes de los cambios recientes en `App.jsx` y `main.jsx`).
- En `App.jsx`, retirada de la importación lazy `ModuloPendiente`, que no tenía ninguna referencia de uso; traslado de `RealtimeGlobal` al grupo de imports estáticos; corrección del diagnóstico copiado para usar saltos de línea reales y espera/captura de errores de Clipboard API.
- En `main.jsx`, aclaración de la identidad Molsan ERP PREMIUM 2027 y del orden intencional de carga: las dependencias de la shell se evalúan antes de las capas globales finales. No se alteró la inicialización de sesión ni el orden efectivo de CSS.

## 6. Estado de los siete puntos solicitados

| Punto | Estado honesto |
|---|---|
| 1. Consolidar ApoderaGest, EncargaGest y NotarGest | **En revisión estática; no consolidación destructiva sin contraste visual** |
| 2. Módulos técnicos y subpáginas | **Componentes principales inspeccionados; inventario de subrutas y estados pendiente de cerrar** |
| 3. Auditar modales individualmente | **Inventario parcial; pruebas individuales pendientes** |
| 4. Inventario de 98 páginas/rutas | **Inventario de 110 elementos Route creado; reconciliar las 98 pantallas con componentes, subpáginas internas y modales** |
| 5. Eliminar reglas heredadas sin uso | **Nuevas reglas muertas/duplicadas verificadas eliminadas; quedan reglas legacy cuya retirada exige revisar componentes y estados** |
| 6. Validar build y Preview visualmente | **Build correcto; Preview desktop/tablet/móvil pendiente de comprobación real** |
| 7. Regresiones funcionales | **Pendiente de pruebas de navegación, permisos, formularios, modales, persistencia y flujos** |

## 7. Criterio de cierre

El trabajo solo puede declararse cerrado cuando:
1. Cada ruta concreta esté asociada a un componente y estado de revisión.
2. Cada modal tenga una prueba individual documentada.
3. Se hayan ejecutado las rutas con perfiles autorizados y no autorizados cuando corresponda.
4. Se comprueben desktop, tablet y móvil en el Preview desplegado que corresponda al commit revisado.
5. El build y las pruebas funcionales relevantes estén verdes.
6. Se confirme que producción y la base de datos principal no han recibido cambios.

**Conclusión:** PR #409 contiene limpieza estática real y compila, pero esta auditoría no certifica todavía el cierre integral de los siete puntos. La diferencia queda documentada para evitar presentar como terminado algo que aún no se ha probado en Preview.

## 8. Revisión de App, main y Preview (actualización)

- `App.jsx`: se mantiene la estructura de rutas y los wrappers de autenticación/permisos. No se han cambiado paths, módulos protegidos ni accesos externos. Se ha retirado una importación lazy sin uso (`ModuloPendiente`).
- `main.jsx`: el orden de importaciones CSS se conserva deliberadamente. `App` se evalúa antes de las últimas capas globales para que el CSS de la shell quede debajo de la normalización/capa canónica final. No se ha eliminado `index.css` ni hojas heredadas sin verificar sus clases en uso.
- Preview Render: `molsan-premium-2027-candidate-preview` está `not_suspended` y su deploy actual `live`. Sirve `fb0c71e`, no la rama de esta PR. Su auto-deploy está `off`. Se ha consultado el estado; no se ha disparado ningún deploy ni cambiado la infraestructura.
- La URL del Preview no pudo abrirse desde el lector web. El estado `live` del deploy confirma que Render lo publicó, no que la interfaz se haya inspeccionado visualmente.
- El commit final `f024f3c` no tiene todavía un workflow de build asociado visible en la consulta de GitHub Actions. El build previo `6facf31` no certifica los cambios posteriores.

**Siguiente control seguro:** ejecutar el build de la rama actual y, solo después de revisar el artefacto y acordar el despliegue, publicar esa rama en el servicio Preview (nunca en producción).

## 9. Limpieza adicional del arranque y CSS compartido

- Se conserva la jerarquía de CSS: base heredada → tokens → design system opt-in → estilos de shell/componentes → módulos/portales → armonización → tarjetas → consistencia → botones legacy → canon visual. No se ha reordenado porque el orden actual tiene efecto real en la cascada.
- El análisis de coincidencias se limitó a selectores y declaraciones textuales de las diez hojas globales; no sustituye una prueba de computed styles ni detecta todos los solapamientos por especificidad, `:where()`, `:is()`, media queries o selectores ancestro.
- La limpieza no modifica estructura JSX de páginas, handlers de negocio, rutas, guards, API ni almacenamiento.
- La compilación del commit final sigue pendiente. El último build confirmado pertenece al commit anterior `6facf31`.
