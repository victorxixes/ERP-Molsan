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
