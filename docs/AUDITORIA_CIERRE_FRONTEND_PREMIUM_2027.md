# Auditoría de cierre frontend MOLSAN ERP PREMIUM 2027

**Fecha:** 6 de noviembre de 2026  
**Rama auditada:** `fix/molsan-css-selector-audit-round1`  
**Commit de referencia antes de este informe:** `6facf31bc108632018683345111cc684c9f77b3f`  
**PR:** [#409](https://github.com/victorxixes/ERP-Molsan/pull/409)  
**Alcance de seguridad:** solo frontend y documentación en la rama de Preview. No se han modificado producción, API, base de datos ni datos de expedientes.

## Resultado ejecutivo

Esta auditoría distingue expresamente entre inspección estática, compilación y validación real en navegador. No se marca como validada una pantalla solo porque exista su componente o compile.

- El enrutador de `frontend-app/src/App.jsx` contiene **109 declaraciones de ruta**: 108 rutas concretas y una ruta comodín (`*`). No hay duplicados literales entre las declaraciones encontradas. El número 109 no equivale automáticamente a 109 pantallas: incluye rutas de acceso externo, variantes, rutas dinámicas y compatibilidad.
- Se inspeccionaron los JSX principales de ApoderaGest, EncargaGest y NotarGest y sus tres hojas CSS.
- Se inspeccionaron los puntos de entrada de estilos en `main.jsx`, además de las capas globales CanonicalVisual, GlobalConsistency, GlassLuxeUnified, Premium2027 y Redesign2027.
- Se inspeccionaron los componentes principales de Expedientes, Agenda, CTN, Fusiones, Provisiones, Mensajería, Informes, Catálogos, Seguridad y Panel Técnico.
- El workflow de compilación Vite asociado al commit de referencia terminó correctamente. Esto verifica compilación, no comportamiento funcional ni apariencia en Render.
- No se ha realizado una comprobación visual real en Preview de escritorio, tablet y móvil en esta ronda. Por tanto, no se declara completado el punto de validación visual ni la ausencia total de regresiones.

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
- Build Vite correcto en el workflow asociado al commit de referencia.

## 6. Estado de los siete puntos solicitados

| Punto | Estado honesto |
|---|---|
| 1. Consolidar ApoderaGest, EncargaGest y NotarGest | **En revisión estática; no consolidación destructiva sin contraste visual** |
| 2. Módulos técnicos y subpáginas | **Componentes principales inspeccionados; inventario de subrutas y estados pendiente de cerrar** |
| 3. Auditar modales individualmente | **Inventario parcial; pruebas individuales pendientes** |
| 4. Inventario de 98 páginas/rutas | **Conteo actualizado: 109 declaraciones (108 concretas + comodín); reconciliar el alcance de las 98 pantallas con las rutas y subcomponentes** |
| 5. Eliminar reglas heredadas sin uso | **Eliminadas las reglas verificadas de PR #409; quedan capas solapadas que requieren contraste de cascada** |
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
