# MOLSAN ERP PREMIUM 2027 — plan de integración y cierre

Fecha de inicio: 2026-11-04

## Objetivo
Construir una única versión candidata de MOLSAN ERP PREMIUM 2027, consolidando la línea visual Glass Luxe, las correcciones funcionales y la auditoría de seguridad, sin modificar producción ni la base de datos real.

## Entorno protegido
- Rama de producción: `main`.
- Servicios de producción: `agenda-intranet-f` y `agenda-intranet-b`.
- Base de datos de producción: `BBDD_Molsan`.
- No desplegar ni modificar estos recursos durante esta fase.

## Rama candidata creada
- `release/molsan-premium-2027-candidate`
- Creada desde `main`, cuyo commit base verificado es `e81d4ab9d571f9e266d7181db8bca57c49d98812`.
- Esta rama es el único destino previsto para la integración controlada.

## Fuentes de cambios identificadas

### Línea visual
- Rama: `molsan-premium-2027-global`
- HEAD verificado: `35fcdc009d818a5c9336493cf16a7deb9e89c555`
- PR original: #378.
- Integración aislada: PR #388 hacia la rama candidata.
- CI del HEAD: 6 workflows en success (Frontend build, Backend audit, Fichaje, Control Apoderados, EncargaGest y Consolidación Post Firma).
- El diff contra main abarca 213 archivos según la PR de integración.

### Auditoría Glass Luxe, funcional y seguridad
- Rama: `molsan-premium-2027-glass-luxe`
- HEAD verificado: `d4c6a050c07d4c6955d0f35873e3279cb7c6eacd`
- PR original: #374.
- Integración aislada: PR #389 hacia la rama candidata.
- CI del HEAD: 5 workflows en success (Backend audit, Fichaje, Control Apoderados, EncargaGest y Consolidación Post Firma).
- El diff contra main abarca 273 archivos según la PR de integración.

## Hallazgos que bloquean la fusión automática
1. Las dos ramas de trabajo parten de la misma base de main, pero han evolucionado por separado y sus historiales están divergidos. No se deben fusionar en bloque sin resolver y revisar solapamientos.
2. GitHub devolvió `mergeable=false` al crear las PR #388 y #389. No se fusionan hasta verificar la causa, resolver conflictos si existen y volver a ejecutar CI.
3. La documentación de auditoría deja sin completar la aceptación visual real en navegador, las pruebas de foco/teclado/responsive y la matriz de permisos con perfiles reales.
4. Se detectó una diferencia peligrosa de configuración entre ramas: la rama global mantiene `.env` deliberadamente vacío y exige configurar la API por entorno; la rama Glass Luxe contiene una configuración por defecto que puede dirigir llamadas a producción. Antes de desplegar el frontend candidato hay que confirmar que Render inyecta explícitamente la URL de la API Preview. No se copiarán ficheros `.env` entre ramas ni se publicarán secretos.

## Secuencia de integración
- [ ] Comparar y resolver primero los cambios comunes de frontend y backend entre #388 y #389.
- [ ] Revisar especialmente autenticación, guards, permisos por acción y ámbito de expediente.
- [ ] Revisar configuración de API/WS, archivos de entorno y configuración de Render.
- [ ] Revisar migraciones y operaciones de arranque; no ejecutar cambios en BBDD_Molsan.
- [ ] Integrar en la rama candidata mediante cambios revisados, no mediante sustitución ciega de una rama por otra.
- [ ] Ejecutar CI completo sobre la candidata.
- [ ] Completar pruebas de expedientes, actividades, documentos, cuantías, notarios y persistencia en entorno aislado.
- [ ] Completar pruebas de permisos 401/403/200 con perfiles de prueba.
- [ ] Completar QA visual y responsive en Preview.
- [ ] Preparar respaldo, migraciones compatibles y plan de reversión antes de producción.

## Estado al iniciar
- Rama candidata creada.
- PR #388 y PR #389 abiertas como borradores hacia la candidata.
- No se ha fusionado ninguna PR.
- No se han modificado Render, producción ni bases de datos.
- La integración y las pruebas funcionales/visuales siguen pendientes.
