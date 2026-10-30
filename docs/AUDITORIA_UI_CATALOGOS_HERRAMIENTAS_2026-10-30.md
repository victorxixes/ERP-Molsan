# Auditoría visual — catálogos y herramientas
Fecha: 30/10/2026  
Rama: `molsan-premium-2027-glass-luxe`  
Alcance: revisión estática, sin ejecutar importaciones ni guardar cambios en catálogos.

## Resultado
Se detectan acentos visuales heredados que no están totalmente unificados con los tokens Molsan. No se han cambiado en esta pasada para evitar una sustitución masiva de clases sin validación visual.

| Pantalla | Observación estática | Prioridad |
|---|---|---|
| `Catalogos.jsx` | Gradiente azul/índigo, tarjetas destacadas y enlaces azules; se mantiene el contraste actual. | Media |
| `CatalogoOficinas.jsx` | Botones de previsualización/importación, foco de búsqueda y hover de filas usan azul Tailwind directo. No cambiar funcionalidad de importación. | Media |
| `CatalogoAbsis.jsx` | Botón principal usa tokens Molsan, pero gradiente superior y algunos anillos de foco siguen en azul/índigo. | Baja |
| `ReglasActividadesExpediente.jsx` | Gradiente azul/índigo y bloque informativo azul heredados. | Baja |
| `DatosMolsan.jsx` | Gradiente superior y foco de campos con azul Tailwind directo. | Media |
| `TiposImpositivos.jsx` | Gradiente, rótulo y botón de guardado en índigo directo. | Media |
| `TiposConceptoGastos.jsx` | Archivo extenso con múltiples clases azul/índigo en formularios, controles y plantilla de factura. Requiere refactor por bloques, no reemplazo global. | Media-alta |
| `HonorariosGestoria.jsx` | No se detectaron clases directas azul/índigo en el recuento de esta revisión; los acentos visuales ya están neutralizados. | Revisado |

## Siguiente paso recomendado
1. Sustituir los acentos directos por tokens del sistema de diseño en bloques pequeños y comprobables.
2. Mantener colores semánticos (error, aviso, éxito) donde expresan estado, no marca.
3. Probar estados normal, hover, foco visible, deshabilitado y error antes de aceptar cada bloque.
4. Para `TiposConceptoGastos.jsx`, separar primero los estilos por componente o sección y no hacer una sustitución global.

## Limitaciones
La revisión confirma clases presentes en el código, no una diferencia visual exacta en navegador. El build de frontend no garantiza contraste, legibilidad ni consistencia visual a todos los tamaños. Las pruebas de navegador siguen pendientes.


## Pasada adicional — configuración de build y pruebas automatizadas
- `frontend-app/package.json` define `npm run build` y `npm run preview`, pero no define scripts de test unitario, integración o pruebas de navegador. La revisión de workflows localizados confirma build de frontend y validaciones de sintaxis, no una suite de regresión visual.
- El workflow `.github/workflows/frontend-build.yml` compila desde `frontend-app`, usa Node 20 y publica el artefacto de build como evidencia temporal de CI. Esto ayuda a detectar errores de compilación, pero no sustituye a la ejecución real de las pantallas.
- El `package.json` de la raíz y el de `frontend-app` declaran versiones distintas de React Router, Vite y Tailwind. Como el workflow y la aplicación de Render están configurados para el frontend bajo `frontend-app`, la raíz parece ser una configuración heredada; conviene verificar cuál es la fuente oficial de instalación antes de limpiar o sincronizar manifiestos.
- No se encontró en el manifiesto de `frontend-app` un script Playwright/Cypress/Vitest. No se deben presentar como realizadas pruebas automatizadas de interacción que no están configuradas.
- Recomendación antes de integrar: confirmar el comando y directorio exactos de build usados por Render LIVE, contrastarlos con el workflow de CI y documentar el resultado. No se ha modificado configuración de build ni despliegue.

## Verificación de Render y manifiestos — 30/10/2026

- Workspace comprobado: **Molsan** (tea-d8cr02ek1jcs73a3s880), no Agenda_Molsan.
- Servicio frontend LIVE: agenda-intranet-f, rama main, directorio raíz frontend-app, build `npm install && npm run build`, publicación dist. Auto-deploy por commit activo y previews de PR deshabilitadas.
- Servicio backend LIVE: agenda-intranet-b, rama main, despliegue Docker desde la raíz. Ambos servicios estaban en estado live al consultar los despliegues; el último commit servido en ambos era e81d4ab9d571f9e266d7181db8bca57c49d98812. Por tanto, la rama de la PR no se ha desplegado en LIVE mediante esta configuración.
- El workflow de compilación frontend usa también frontend-app y Node 20, por lo que coincide en directorio con Render. No coincide en el comando de instalación: CI usa `npm install --no-audit --no-fund`, Render usa `npm install`; ambos ejecutan `npm run build`.
- En la rama auditada, frontend-app/.env contiene las URL públicas de API y WebSocket de producción. Son endpoints, no credenciales secretas, pero su presencia en el repositorio puede inducir a que un entorno local o una preview hable con producción. Render tiene las previews de PR deshabilitadas actualmente; antes de habilitarlas, habría que separar explícitamente la configuración de entornos y comprobar que los datos de prueba no apunten a producción.
- La búsqueda de archivos no localizó package-lock.json ni en raíz ni en frontend-app. Esto debe confirmarse en una inspección completa del árbol antes de darlo por definitivo. Si realmente no hay lockfile, las instalaciones con rangos ^ pueden resolver versiones diferentes entre builds; conviene generar y revisar un lockfile en un cambio separado, no improvisar versiones durante esta auditoría.
- El package.json raíz parece heredado frente al de frontend-app: difieren versiones de React Router, Vite y Tailwind. La configuración de Render y CI apunta a frontend-app, así que no se deben sincronizar ni actualizar dependencias en la raíz sin identificar primero si algún flujo todavía la utiliza.

## Rutas principales — revisión estática

- App.jsx usa importación diferida (lazy) para la mayoría de módulos y agrupa las rutas internas bajo un layout protegido por RequireAuth.
- Hay rutas externas de ApoderaGest, NotarGest y EncargaGest fuera de ese wrapper general. Esto puede ser intencional para portales con autenticación propia; queda pendiente verificar en navegador que cada portal valide su sesión y no exponga datos antes de autenticar.
- Se conservan alias de compatibilidad (notargestweb, encargagestweb y variantes de rutas externas). No se han eliminado para evitar romper enlaces existentes.
- La revisión de texto no detecta por sí sola rutas huérfanas, errores de navegación por permisos o módulos que fallen al cargar. Requiere pruebas con perfiles de usuario autorizados y no autorizados.

## Ajustes visuales puntuales aplicados en esta pasada

- `Catalogos.jsx`: se sustituyeron los acentos de marca azul/índigo directos en cabecera, aviso, tarjetas destacadas, iconos y flecha de hover por tokens `--molsan-*`. Se conservan colores semánticos como el aviso ámbar «En construcción». Rutas y datos del catálogo no cambian.
- `TiposImpositivos.jsx`: se armonizaron el acento superior de la cabecera, la etiqueta de marca y el botón principal de guardado con `--molsan-primary` y `--molsan-primary-hover`. Los estados de éxito/error/aviso mantienen sus colores semánticos.
- Commits: `28ee36d87bc022c9e00ea04fbfe7ec6c46bbeeb4` y `0bf40355568c056dc681d986fec4414639273756`.
- El workflow de build configurado en esta rama se dispara por `push` sobre la rama y cambios en `frontend-app/**`; la herramienta de consulta de ejecuciones no devolvió ejecuciones asociadas a estos commits. Por tanto, estos dos cambios aún no se dan por compilados por CI. Antes de cerrar la auditoría se debe obtener evidencia de build completo; no se ha afirmado éxito de compilación para estos commits.
- No se han modificado handlers, endpoints, fórmulas, operaciones de importación ni datos. La aceptación visual final depende de comparar el resultado en navegador, incluido foco/hover y anchuras estrechas.

## Revisión adicional de catálogos y superficies económicas — 30/10/2026

- `CatalogoOficinas.jsx` conserva varios acentos azules directos en avisos, botones, foco y filas; la tabla incorpora contenedores de overflow y reglas responsive. Pendiente armonización visual selectiva y prueba de importación/preview, que no debe confundirse con QA visual.
- `CatalogoAbsis.jsx` mantiene dos estados de diálogo accesibles mediante `role=dialog` y `aria-modal`, pero no se encontró gestión explícita de Escape en el componente. Persisten dos acentos índigo en anillos/bordes de foco.
- `ReglasActividadesExpediente.jsx` conserva un aviso informativo azul. Su estructura incluye bastantes breakpoints responsive; no se detectó desbordamiento horizontal explícito en el JSX.
- `DatosMolsan.jsx` conserva estilos azules directos de foco/borde. Es una pantalla breve, pero su comprobación visual debe incluir la carga del logo y la previsualización corporativa.
- `TraspasoSaldoPanel.jsx` conserva varios acentos índigo y un diálogo con `role=dialog`/`aria-modal`, sin manejo explícito de Escape detectado. No se modificó la lógica ni se ejecutó un traspaso.
- `TiposConceptoGastos.jsx` es una pantalla extensa (2.772 líneas) y mantiene bastantes clases de marca azul/índigo directas en cabecera, botones, filtros, formulario, modal y bloque de plantilla Word. Un intento de actualización automática completa fue rechazado por controles de seguridad; no se considera corregida ni se forzará una sustitución masiva. Requiere intervención por fragmentos pequeños y revisión del JSX resultante.
- `HonorariosGestoria.jsx` ya no muestra clases de marca azul/índigo directas en la búsqueda estática posterior al ajuste previo.
- No se encontró `ProvisionesFondosPage.jsx` en la ruta probada `src/pages/herramientas/`; se debe localizar su ruta real antes de seguir con esa superficie.

## CI de los últimos ajustes visuales

- Los workflows `Validar Fichaje Molsan` (41084468780), `Validar Control Apoderados` (41084469024), `Consolidación Post Firma checks` (41084468876) y `EncargaGest checks` (41084468851) finalizaron con éxito para el commit `0bf40355568c056dc681d986fec4414639273756`.
- En esos flujos finalizaron correctamente las tareas de build frontend; además, los flujos indicados completaron comprobaciones de sintaxis backend y el de EncargaGest completó la importación de la aplicación FastAPI.
- El commit posterior `89f9ba65c97d11b3911e20ce5db8c637c457c744` solo añade documentación de auditoría; no se recibió ejecución de workflows asociada a ese commit.
- Estos resultados confirman compilación CI de los cambios visuales aplicados hasta `0bf4035`, no una inspección visual en navegador ni pruebas funcionales de importación, pagos o expedientes.

## Provisiones y operaciones económicas — revisión de código

- Ruta correcta localizada: `frontend-app/src/pages/provisiones/ProvisionesFondosPage.jsx` (913 líneas) y hoja dedicada `ProvisionesFondosPage.css` (106 líneas). La búsqueda previa por `src/pages/herramientas/` no era la ruta correcta.
- `ProvisionesFondosPage.jsx` mantiene 42 clases directas de la familia azul/índigo en la inspección estática, un diálogo con `role=dialog`/`aria-modal` y sin gestión explícita de Escape detectada. Es una pantalla de alta densidad funcional; no se recomienda un reemplazo global de clases sin validar los paneles de cálculo, previsualización y editor.
- `ProvisionesFondosPage.css` no contiene clases Tailwind azul/índigo ni `!important` en la inspección de texto. La deuda cromática reside principalmente en JSX.
- `ProvisionesModal.jsx` contiene un diálogo accesible con `role=dialog`/`aria-modal`, seis clases de la familia azul/índigo y sin gestión explícita de Escape detectada.
- `TraspasoSaldoPanel.jsx` presenta el mismo patrón general: diálogo etiquetado, acentos índigo heredados y sin Escape explícito detectado. La interacción de traspaso no se ejecutó para no alterar saldos.

## Verificación CI posterior

- Para el commit `54d9f38cc892bf07dcf7b83b6d93d004234c9007` (ajuste visual de Datos Molsan), los cuatro workflows consultados terminaron con `success`: Consolidación Post Firma checks (41084910113), Validar Fichaje Molsan (41084910244), Validar Control Apoderados (41084910072) y EncargaGest checks (41084909922).
- Los resultados CI prueban compilación/validaciones automatizadas de ese commit, pero no prueban que el logo, formularios y paneles se vean correctamente en dispositivos reales.

## Segunda pasada de armonización — 30/10/2026

- `CatalogoAbsis.jsx`: sustituido el gradiente azul/índigo superior por el token central `--molsan-primary`; el resto de los dos acentos detectados se limita a estilos de foco/borde que quedan para una pasada de controles.
- `ReglasActividadesExpediente.jsx`: cabecera y panel informativo migrados a tokens centrales `--molsan-primary`, `--molsan-primary-border`, `--molsan-primary-soft` y `--molsan-text`. La búsqueda posterior ya no encuentra clases Tailwind azul/índigo directas.
- `CatalogoOficinas.jsx`: cabecera, botones de validar/importar, foco de búsqueda, acción Limpiar y resaltado de fila armonizados con tokens Molsan. La inspección posterior deja solo dos clases directas de azul dentro del estilo nativo del selector de archivos; se dejan deliberadamente para una revisión del pseudo-elemento `file:` sin alterar su compatibilidad.
- `ProvisionesFondosPage.jsx`: el control compartido de formulario ahora usa tokens de borde, superficie, texto y foco del sistema. Se mantienen 40 acentos azules/índigo en las vistas de editor, cálculos, tablas y acciones; requieren revisión por zonas para no perder semántica o jerarquía.
- `TiposConceptoGastos.jsx`: siguen 27 acentos directos de azul/índigo distribuidos entre formularios, plantilla documental, filtros y acciones. No se aplicó sustitución automática al componente de 2.772 líneas por riesgo de modificar estados condicionales y variantes de botones.

## Estado CI de la segunda pasada

- Para `b873a45d75665df0ad3b59e50664de08e199c6d6`, los cuatro workflows de validación consultados completaron con éxito.
- En los commits posteriores de cabecera de oficinas y controles de provisiones, varios builds seguían en ejecución al cierre de esta consulta; no se declaran verdes hasta consultar su resultado final. Los checks de backend que ya finalizaron estaban correctos.
- La PR #374 continúa abierta, en borrador y sin integrar; `main` no tiene commits por delante/por detrás en el punto de comparación anterior. No se ha desplegado ni se han ejecutado operaciones sobre datos.

- Reconsulta CI: `Consolidación Post Firma checks` (41085318969), `EncargaGest checks` (41085318806), `Validar Fichaje Molsan` (41085346459), `EncargaGest checks` (41085346424) y `Consolidación Post Firma checks` (41085346453) finalizaron todos con éxito, incluyendo sus builds frontend y comprobaciones backend correspondientes.
- `Validar Control Apoderados` del commit `ff67bb27...` (run 41085346446) tenía backend correcto y build frontend aún en ejecución en la última lectura; queda pendiente de cierre.


## Cierre de pasada por zonas — Tipos de Concepto de Gastos y Provisiones — 30/10/2026

- `TiposConceptoGastos.jsx`: armonizados con los tokens Molsan los acentos de la tarjeta de plantilla documental, los estados hover de filas y acciones, iconografía, campos con foco y botones del formulario/modal. La búsqueda estática posterior ya no detecta utilidades de marca azul/índigo directas en este componente (0 coincidencias). Se conserva la estructura de 2.772 líneas y no se ha modificado la lógica de catálogo ni la carga/descarga de la plantilla Word.
- `ProvisionesFondosPage.jsx`: armonizados controles del diseñador de distribución, selección de campos, tablas/tramos, cabecera, acciones de guardar/calcular, paneles informativos y cabecera del envío por email. Las clases azules/índigo de interfaz se han migrado a tokens Molsan. Las 11 coincidencias de color que permanecen son parte de la maqueta/preview del documento A4 (colores impresos del documento), no controles de la aplicación.
- `ProvisionesModal.jsx` y `TraspasoSaldoPanel.jsx`: armonizados botones, campos, focos, estados y superficies con tokens centrales; no se han cambiado operaciones, importes, saldos, destinatarios ni llamadas API.
- Commits de esta pasada: `a3b9ade` (TiposConceptoGastos), `7a21c8a` y `7b6c327` (ProvisionesFondosPage), `9e9f6cf` (ProvisionesModal), `4893703` (TraspasoSaldoPanel); último ajuste adicional de ProvisionesModal posterior a esta anotación.
- Se ha comprobado que las variables `--molsan-primary`, `--molsan-primary-hover`, `--molsan-primary-soft`, `--molsan-primary-border`, `--molsan-surface-soft` y `--molsan-text` existen en `molsan-tokens.css`.

## Auditoría de teclado y foco — resultado estático y límite de validación

- Los cuatro diálogos inspeccionados conservan `role="dialog"` y `aria-modal="true"`; los diálogos de Tipos de Concepto y Provisiones tienen etiqueta accesible. El diálogo de traspaso usa `aria-labelledby`.
- No se detectan manejadores explícitos de Escape ni una trampa de foco/gestión programática del foco en estos cuatro componentes. Por tanto, no se puede certificar que Escape cierre el diálogo, que el foco inicial entre en él, que Tab/Mayús+Tab quede contenido ni que el foco vuelva al control que lo abrió.
- No se ha añadido una trampa de foco improvisada: estos componentes incluyen formularios y estados condicionales; una solución correcta debe cubrir apertura/cierre, modales anidados, controles deshabilitados, errores de validación y restauración del foco. Requiere prueba real con teclado y navegador.
- El repositorio no tiene una suite de navegador Playwright/Cypress configurada según la inspección de manifiestos anterior. Los workflows de CI que se disparen para estos commits solo podrán certificar lo que ejecuten (build y checks definidos), no la navegación real con teclado ni la apariencia visual en escritorio/tablet/móvil.
- No se han abierto pantallas de producción, enviado emails, guardado tarifas, calculado ni modificado provisiones, ni ejecutado traspasos o cambios de saldo.


## Revisión ampliada y cierre de cambios de auditoría — 30/10/2026

### Armonización visual adicional
- `CatalogoOficinas.jsx`: selector nativo de Excel alineado con `--molsan-primary-soft` y `--molsan-primary`.
- `CatalogoAbsis.jsx`: anillos y bordes de foco de búsqueda/acción unificados con los tokens primarios. Los dos diálogos de edición/listas siguen pendientes de integración con el gestor común de foco; no se da por cerrada su accesibilidad.
- `ReglasActividadesExpediente.jsx`: corregidas tres clases Tailwind mal formadas (`bg-[var(--molsan-primary-soft)]0`) que impedían mostrar correctamente los indicadores circulares de campos.
- `TiposExpediente.jsx`: acento de marca, campos, tarjeta de altas, acción principal, hover de filas y acción Editar armonizados con tokens Molsan. Se mantienen los colores semánticos de activo/inactivo y de eliminación.
- No se han modificado fórmulas, transiciones, endpoints, escrituras ni operaciones del catálogo.

### Teclado y foco de diálogos
- Se incorpora `useAccessibleDialog`, una utilidad compartida para foco inicial, contención de Tab/Mayús+Tab, Escape y restauración del foco, con comprobación del diálogo modal superior para permitir anidamiento.
- Integrada en los diálogos de Tipos de Concepto, envío por email de Provisiones, Provisiones de expediente, traspaso de saldo, liquidación y su vista PDF, Carpeta digital y su visor, los cuatro diálogos principales de NotarGest, los cinco de EncargaGest, resumen de ApoderaGest, Mensajería Gestión, seguimiento de Mensajería, corrección de fichajes y ficha de empleado.
- La cobertura no es todavía universal: permanecen diálogos identificados en Catálogo ABSIS, selector de soporte de módulos, CTN, Informes, Tipos de expediente, Control Apoderados y Expedientes. Deben integrarse o verificarse antes de certificar accesibilidad global.
- La utilidad se ha validado mediante compilación CI; no se ha ejecutado aún una prueba manual en navegador con teclado/lector de pantalla. Por tanto, la comprobación funcional de foco, Escape y modales anidados sigue pendiente.

### Seguridad de registros y autenticación
- Se detectó en los registros históricos del backend que algunas conexiones WebSocket podían registrar la URL de conexión con el token en la query string. La rama contiene el filtro de redacción `backend/app/auth/log_redaction.py` y sus pruebas unitarias, que comprueban la redacción de `token`, `access_token` y `refresh_token` antes de formatear registros.
- Se ajustó `backend/app/realtime/router.py` para registrar el tipo de excepción y no su representación completa, evitando volcar detalles arbitrarios de una excepción WebSocket al log.
- La ruta interna `/apoderagest` queda protegida por `RequireAuth`. Las rutas de acceso externo de NotarGest/EncargaGest se mantienen separadas; no se han cambiado sus mecanismos propios de acceso.
- Las pruebas del backend se ejecutan en CI con SQLite aislado, no contra la base de datos de producción.

### Configuración y reproducibilidad
- En la rama no se encuentra `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock` ni lockfile de Bun en raíz o en `frontend-app`. CI y Render resuelven rangos semver durante la instalación; esto hace que las dependencias no queden fijadas de forma reproducible.
- Hay dos manifiestos `package.json`: el de raíz conserva Vite 5 / React Router 6 / Tailwind 3, mientras `frontend-app/package.json` usa Vite 6 / React Router 7 / Tailwind 4 y es el manifiesto que utiliza el build de Render/CI. No se han sincronizado ni alterado versiones en esta auditoría para evitar una migración accidental de toolchain.
- El workflow frontend usa Node 20 y `npm install --no-audit --no-fund`, seguido de `npm run build`. No hay configuración `.nvmrc` ni `.node-version`.

### Límites de validación
- No se ha ejecutado QA visual real en escritorio/tablet/móvil ni pruebas E2E; la revisión visual es estática sobre componentes y CSS.
- No se han integrado cambios, desplegado la rama, reiniciado Render, modificado secretos ni tocado datos de producción.
- La rama de auditoría y PR #374 permanecen separadas de `main`.


### Ampliación de teclado/foco y consistencia visual
- `EnviarANotarioModal.jsx`: añadido foco inicial, contención de Tab/Mayús+Tab, Escape y retorno de foco cuando se presenta como diálogo. El modo integrado `inline` no activa el gestor de diálogo.
- `TiposExpediente.jsx`: migrados sus acentos de marca a tokens Molsan y añadido el gestor común al diálogo de alta/edición.
- La validación CI de la revisión más reciente consultada (head `d9478850857540f1396f77ff56ad479e52a53d67`) finalizó correctamente en los cinco workflows: Backend audit, EncargaGest checks, Consolidación Post Firma checks, Validar Fichaje Molsan y Validar Control Apoderados. Incluyen build frontend y sintaxis backend; Backend audit ejecuta la suite unitaria sobre SQLite aislado.
- Los cambios de accesibilidad se consideran compilados, no probados aún con navegación real de teclado o lector de pantalla.

### Permisos de ruta — observación pendiente
- `/apoderagest` está protegido por `RequireAuth`, que comprueba sesión/token. La inspección de `puedeVerModulo` y del catálogo central confirma que la visibilidad de módulo se gestiona por separado mediante `empleado.modulos_visibles` / `modulos_visibles_list`.
- Por tanto, el control de sesión ya está aplicado, pero la ruta todavía no comprueba de forma reactiva que el empleado tenga asignado el módulo ApoderaGest. No debe darse por cerrada la auditoría de permisos hasta integrar el guard de módulo y probar perfiles con y sin asignación.
- Se ha dejado un componente auxiliar `RequireModule.jsx` en la rama, pero no está conectado a ninguna ruta; es un borrador y no aporta protección efectiva mientras no se integre. Las rutas de portales externos no se han modificado.

### Diálogos todavía pendientes de integración común
- Catálogo ABSIS (crear lista y editar entrada), selector de soporte de módulos, CTN, Informes, Control Apoderados y Expedientes mantienen diálogos que requieren revisar su gestión de foco/teclado.
- El inventario de diálogos se ha ampliado con `EnviarANotarioModal` y `TiposExpediente`, ya cubiertos por el gestor común.


### Última ampliación de diálogos — 30/10/2026
- `ModulosSelector.jsx`: diálogo de soporte de notaría añadido al gestor común de teclado/foco.
- `ControlApoderados.jsx`: diálogo de listado de firmas añadido al gestor común.
- `TiposExpediente.jsx`: diálogo de alta/edición añadido al gestor común; el componente también queda armonizado visualmente.
- Los cambios de los tres módulos y los previos se compilaron correctamente en el head `cce08181dea0da4fbc1f68567af7c86bbaacf240`: los cinco workflows consultados finalizaron en `success`, incluido Backend audit.
- Sigue pendiente la integración de Catálogo ABSIS, CTN, Informes y Expedientes. La cobertura de accesibilidad no se declara completa.


## Continuación — diálogos Catálogo ABSIS

- Los diálogos «Crear nueva lista ABSIS» y «Añadir/Editar entrada» integran `useAccessibleDialog`.
- Cada diálogo tiene ref y foco programático inicial; el gestor contiene Tab/Mayús+Tab, atiende Escape y restaura el foco al control invocador.
- Durante la creación de una lista Escape no cierra el diálogo mientras la operación está activa. En la edición de entrada Escape queda bloqueado durante el guardado.
- Se mantienen las validaciones, endpoints y operaciones originales. No se ha creado ninguna lista ni modificado entradas.
- Commit: `e18f037b`.
- Pendiente: QA real con teclado/lector de pantalla y viewports escritorio/tablet/móvil; la compilación de este último commit aún no está confirmada.

## Continuación — diálogos y coherencia de acciones
- Se integró `useAccessibleDialog` en alta/edición e importación de Entidades Bancarias, Municipios, Oficinas Liquidadoras y Registros de la Propiedad; también en Tipos de Carga Hipotecaria y Acciones del Expediente.
- Los cierres por Escape respetan los estados de guardado/importación y no descartan operaciones en curso.
- Los botones principales de alta/guardado de estos catálogos utilizan ahora tokens `--molsan-primary` y `--molsan-primary-hover`; los estados semánticos se conservan.
- CI del commit `b28eb331` completado con éxito en los cinco workflows asociados.

## Permisos y verificación
- Se corrigió en `permisos.js` la normalización de caracteres acentuados y espacios de rol. Esto evita falsos negativos en el reconocimiento de perfiles administrativos y en la comparación de etiquetas de módulos.
- CI del commit `20da43cf`: los cinco workflows asociados finalizaron correctamente.