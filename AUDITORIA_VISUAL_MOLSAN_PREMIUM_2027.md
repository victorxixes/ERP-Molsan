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


## Tercera pasada: cobertura de ámbitos visuales y herramientas

### Hallazgos de cobertura
- `App.jsx` carga 88 pantallas mediante `React.lazy` / importación dinámica. Sus hojas CSS de módulo se descargan al entrar en la ruta; por tanto, no se puede asumir que una normalización global cargada al inicio prevalezca sobre las reglas específicas de cada módulo.
- `EmpleadoPerfil.jsx` importaba CSS de acceso premium, pero el contenedor principal de la vista completa no tenía la clase `empleado-perfil-premium`; se ha añadido para activar el ámbito previsto.
- `TiposExpediente.jsx` importaba `CatalogosMaestrosPremium.css` pero su raíz no tenía la clase `catalogo-maestro-page-premium`; se ha añadido.
- `Verifacti.jsx` importaba componentes operativos compartidos, pero el ámbito `verifacti-premium` se aplicaba a un campo reutilizable, no a la página completa; se ha añadido `verifacti-page-premium` y su normalización de página.
- Control Apoderados, Control Fichajes, resumen de fichajes, solicitudes de ausencia, festivos/compensaciones, Datos Molsan y Mensajería Proveedores carecían de ámbitos completos compartidos o no los tenían en el contenedor principal.

### Correcciones aplicadas
- Ámbitos raíz premium añadidos a EmpleadoPerfil, TiposExpediente y Verifacti.
- Estilos de marca y controles para fichajes (resumen, solicitudes, festivos) conectados a tokens comunes, preservando estados semánticos.
- Datos Molsan conectado a tokens comunes en cabecera, tarjetas, campos y botón de guardado; conserva la lógica de logo y persistencia.
- Se eliminaron tres declaraciones duplicadas de tokens en `molsan-tokens.css`.
- Se añadieron ámbitos de página para Control Apoderados, Control Fichajes y Mensajería Proveedores, con adaptación móvil y foco visible.

### Hallazgos que requieren revisión visual antes de corregir
- `MolsanRedesign2027.css` contiene 118 declaraciones `!important`, 25 media queries y varios selectores repetidos. No se hará una limpieza masiva porque hay reglas de compatibilidad que pueden estar compensando estilos de módulos.
- `PortalProfesionalShared.css` contiene 56 `!important`, 55 media queries y selectores repetidos (por ejemplo, varios bloques de detalle de encargos).
- `NotarGest.css` contiene 83 `!important`, 46 media queries y selectores repetidos para paneles, controles y modales.
- `molsan-design-system.css` contiene reglas repetidas para algunos componentes y media queries. Deben consolidarse por componente después de confirmar qué bloque prevalece en cada ruta.
- La página Informes tiene 64 menciones a modal/diálogo en su fuente y la página FichaExpediente tiene muchos diálogos inline. Es necesario verificar uno por uno los overlays, scroll interno, foco, cierre y altura útil.

### Estado de QA
- La compilación completa del frontend en el commit `5dce93ceece96fe60cf776eb669c723dc717b375` y los tres workflows de módulo terminaron correctamente.
- Los commits posteriores siguen con validación en curso; no se da por validada la última versión hasta que acaben.
- Ninguna de estas verificaciones estáticas equivale a abrir y comprobar las rutas y modales en un navegador real.


## Cuarta pasada: armonización de acentos y estados semánticos

### Correcciones aplicadas
- `PortalProfesionalShared.css`: se sustituyeron los acentos azules heredados en botones, cabeceras de encargos, spinner, acciones de firma, acciones de impresión y progreso por los tokens `--molsan-primary`, `--molsan-primary-hover`, `--molsan-primary-soft` y `--molsan-primary-border`.
- `NotarGest.css`: se armonizaron acciones principales, botones secundarios, pestañas activas, iconos de módulos, avatar y acentos de gráficas con los mismos tokens. Se conservaron los estados de éxito y error con sus colores semánticos.
- `SeguridadSubpaginasPremium.css`: la insignia primaria y el texto de cabecera usan los tokens corporativos; las insignias success, warning, danger y sus colores de estado no se modificaron.
- Se evitó una sustitución global de colores: los verdes de éxito, rojos de error, avisos y estados funcionales quedan intactos.

### Duplicidades CSS: criterio aplicado
- No se eliminaron bloques repetidos de `PortalProfesionalShared.css`, `NotarGest.css` ni `MolsanRedesign2027.css` por el mero hecho de repetir selector. En estas hojas hay reglas responsive y ajustes de compatibilidad añadidos por etapas; borrar bloques sin comprobar cascada y capturas por ruta podría alterar pantallas que todavía no se han validado visualmente.
- La duplicidad de tokens idénticos en `molsan-tokens.css` sí se redujo en la pasada anterior.
- La consolidación de reglas heredadas queda pendiente de QA visual real por pantalla; se hará solo cuando se pueda demostrar que el bloque anterior es redundante y no una excepción funcional.

### Validación
- Los tres workflows de módulo del commit `7b73e56d` finalizaron correctamente.
- Para el último commit `db2a2154`, el build general y los workflows de módulo se encuentran ejecutándose; no se declaran correctos hasta recibir su resultado.
- No se ha fusionado la PR ni se ha desplegado nada en Render.


## Quinta pasada: inventario estático de las 88 rutas del frontend

Se ha recorrido el inventario de importaciones lazy de `App.jsx`: 88 pantallas/rutas. La inspección de cada grupo ha contrastado importaciones CSS, clases de ámbito, contenedores principales y menciones a modales/diálogos.

### Ajustes añadidos durante el inventario
- `ModelosDocumentos.jsx`: faltaba una hoja compartida y un ámbito de página; añadidos.
- `AdministracionEmpleadoConfig.jsx`: no importaba estilos compartidos ni tenía ámbito de página; añadidos. El estado de acceso restringido conserva su aviso ámbar.
- `ImportadorPostFirma.jsx`: se añadió ámbito de página y conexión al sistema operativo compartido; se mantiene el scroll horizontal para el informe histórico de muchas columnas.
- `CatalogoAbsis.jsx` y `TiposImpositivos.jsx`: añadida la capa compartida y ámbitos propios de página.
- `FirmasEmail.jsx`: añadida clase raíz específica y capa compartida.
- `Fusiones.jsx`: añadida clase raíz premium y conexión a tokens corporativos.
- `Verifacti.jsx`: comprobado que la clase de página `verifacti-page-premium` existe en el contenedor principal; `verifacti-premium` se mantiene para el campo reutilizable.

### Rutas y superficies con cobertura CSS identificada
- Acceso/login y selector de módulos.
- Dashboard, CancelaGest, Agenda (Día/Semana/Mes), Expedientes, FichaExpediente y Provisiones.
- CTN (workspace, listado y detalle).
- Empleados (módulo, listado, ficha, edición y perfil).
- Herramientas y catálogos ABSIS, económicos, documentales, oficinas, entidades, municipios, registros y fichajes.
- Importadores ABSIS/Post Firma, Informes, Logs, Notificaciones y utilidades.
- Panel técnico y submódulos de monitorización/auditoría.
- Seguridad: usuarios, roles, módulos, permisos, ficha, logs, editor de rol y auditoría.
- Portales ApoderaGest, NotarGest y EncargaGest.
- Fichajes, mensajería, control de apoderados y fusiones.

### Riesgo visual que se mantiene abierto
- `FichaExpediente.jsx` concentra una cantidad especialmente alta de diálogos inline (119 menciones a modal/diálogo en el código fuente). Agenda, Informes y portales profesionales también contienen numerosas ventanas. No se considera cerrado ese bloque sin comprobar cada overlay con navegador y tamaños de viewport.
- Algunas pantallas no tienen CSS propio porque usan Tailwind y tokens directamente; eso no es por sí solo una incidencia. Se han añadido ámbitos compartidos solo donde faltaba consistencia de marca, foco, controles o adaptación.
- No se han cambiado los flujos de negocio, las llamadas API, los permisos ni los estados de los expedientes en estas correcciones visuales.

### Validación de la pasada
- Build general y workflows de módulos completados correctamente hasta el commit `61fbc420`.
- El commit `d5a8144e` incorpora los últimos ámbitos de utilidades/Fusiones y está pendiente de sus workflows.
- El artefacto `molsan-premium-frontend-dist` se publica desde GitHub Actions para conservar una compilación aislada de revisión.
- La inspección estática y la compilación no sustituyen la prueba visual real. El navegador automatizado de este entorno bloquea la navegación a los archivos/servidor locales; no se han fabricado capturas ni se declara QA visual de navegador completada.


## Sexta pasada: catálogo de tokens y validación de integración

- Se revisó el catálogo central de tokens: ahora contiene 48 variables, sin nombres duplicados.
- Se añadieron aliases explícitos para borde primario, sombra de diálogo, sombra de panel y compatibilidad de tarjetas heredadas. Esto evita que los componentes dependan de valores dispersos o de fallbacks inconsistentes.
- La rama completa compila correctamente en el commit `5f147b268992a394a04942e333a3f15df197d718`.
- También finalizaron correctamente los workflows de Control Apoderados, Fichaje Molsan, EncargaGest y Consolidación Post Firma para ese mismo commit.
- GitHub Actions ha generado el artefacto `molsan-premium-frontend-dist` (artefacto aislado de build; no es un despliegue ni una captura visual).
- La PR #374 sigue abierta, en borrador, con base `main`; no está fusionada.


## Séptima pasada: ventanas modales de mayor impacto

Se ha contrastado el código de los overlays reales con las hojas compartidas: se localizaron varios diálogos que importaban CSS premium pero no tenían la clase de ámbito que activa sus reglas responsive.

### Correcciones realizadas
- **FichaExpediente:** conectado el ámbito de página a `ModalesOperativosPremium.css`; los diálogos de orden de pago, PPAD y gasto tienen ahora `role="dialog"` en el panel, y el modal genérico portaleado usa la clase de ámbito y etiqueta accesible. Se preservan los anchos configurados por cada variante de modal.
- **Informes:** añadido `panel-modal-premium` al overlay del detalle de facturación para activar scroll y altura máxima responsive.
- **Selector de módulos:** conectado el modal de soporte al ámbito `panel-modal-premium`.
- **Provisiones:** conectado el modal de envío por email; el formulario, no el fondo oscuro, contiene ahora el rol de diálogo.
- **Catálogo ABSIS:** sus dos diálogos usan la capa responsive compartida.
- **Mensajería Molsan y Mensajería Solicitudes:** los paneles de edición/seguimiento activan las reglas comunes y contienen ahora los atributos accesibles del diálogo.
- **Seguridad · Auditoría:** el detalle de registro activa el modal compartido y tiene rol y etiqueta accesibles en el panel.
- **Control Apoderados:** el listado de firmas activa la capa común; el rol de diálogo se aplica al panel.
- **Control Fichajes:** el formulario de corrección tiene rol y etiqueta accesibles y mantiene su clase de modal específica.
- **Empleados:** el modal de alta activa `empleado-operativo-modal` y tiene rol y etiqueta accesibles. `ModalEmpleado` ya utilizaba la capa operativa compartida.

### Reglas que se mantienen sin cambios funcionales
- Los colores de éxito, error, advertencia y estados de pago se conservan.
- No se cambian operaciones de guardar, cancelar, firmar, pagar, validar ni enviar.
- Los diálogos con tablas extensas mantienen scroll horizontal en lugar de comprimir columnas.

### Validación pendiente de esta pasada
- Los workflows de los commits anteriores finalizaron correctamente; el build del commit `d3ee2b19` está pendiente.
- El QA de navegador de cada diálogo sigue pendiente: el navegador automatizado disponible bloquea la navegación local. No se declara una comprobación visual real que no se ha podido ejecutar.


## Octava pasada: cascada global y tipografía base

### Hallazgo confirmado
- `main.jsx` importa en este orden: `index.css`, `molsan-tokens.css`, `molsan-design-system.css`, `molsan-tables.css`, `molsan-controls.css` y finalmente `MolsanRedesign2027.css`. Por tanto, la capa de rediseño actúa como override final sobre parte de los estilos heredados.
- `MolsanRedesign2027.css` contiene varias fases históricas de normalización y una capa final transversal. Hay reglas repetidas para controles, tablas, paneles y foco; no conviene borrar bloques por similitud textual porque algunas variantes están limitadas a portales o páginas concretas.
- El bloque global `body` fijaba el tamaño de texto en 13px, aunque el token canónico `--molsan-font-size-md` establece 14px. Era una divergencia real entre la escala tipográfica declarada y la aplicada al ERP.
- Se ha corregido el tamaño global para consumir `var(--molsan-font-size-md, 14px)`. No se han cambiado los colores semánticos ni los tamaños específicos de títulos, etiquetas o densidad de tablas.
- Los estilos `index.css`, `base.css`, `erp-theme.css` y `MolsanRedesign2027.css` mantienen reglas globales parcialmente solapadas. La limpieza debe hacerse por familias y después de pruebas visuales, no mediante una sustitución masiva.

### Pendiente de contraste
- Confirmar en navegador que el cambio de 13px a 14px mejora legibilidad sin provocar desbordes en formularios densos y tablas.
- Revisar específicamente portales y páginas con fuentes/tamaños explícitos que puedan neutralizar la escala global.
- Verificar impresión: las reglas de impresión de `PortalProfesionalShared.css` usan deliberadamente colores y visibilidad forzados y deben quedar aisladas del tema de pantalla.


## Novena pasada: herramientas y catálogos operativos

### Correcciones aplicadas
- **Acciones de expediente:** los modales Crear/Editar e Importar Excel ahora activan `panel-modal-premium`; el panel interior es el diálogo accesible con nombre contextual.
- **Entidades bancarias:** los modales Importar Excel y Nueva/Editar entidad ahora activan la capa responsive compartida y trasladan el rol accesible al panel real.
- En ambos módulos se han mantenido los formularios, validaciones, callbacks, operaciones de guardado y estructuras de datos; los cambios son de presentación y semántica accesible.

### Inventario de herramientas
Se está recorriendo el catálogo real de páginas bajo `pages/herramientas` (40 componentes JSX en el árbol de la rama). Ya se han contrastado, entre otros, Accesos Notariales, Acciones Expediente, Administración Empleado, Alta Expediente, Asignar Expedientes, Cambiar Gestor, Cambios Actividad ABSIS, Catálogo ABSIS, Catálogo Fichajes, Catálogo Oficinas, Catálogos, Complementos Saldo, Correspondencia Tipificada, Crear Noticia, Datos Molsan, Entidades Bancarias y Firmas Email.
- Varias páginas no contienen overlays propios: usan formularios integrados o componentes compartidos. No se les ha añadido una capa modal artificial.
- Los catálogos que usan clases raíz premium están identificados; falta completar el recorrido de las restantes páginas y sus formularios secundarios.

### Validación
- El workflow de compilación y los cuatro workflows específicos se ejecutaron correctamente en el commit anterior `5a34b2b7`.
- Los cambios de esta pasada han generado una nueva ejecución de CI; debe terminar en verde antes de dar por validado el bloque.
- La inspección visual de navegador sigue pendiente, especialmente para tablas densas y diálogos en anchuras pequeñas.


## Décima pasada: páginas de herramientas e importadores

- **Importador ABSIS · Post Firma:** se detectó que el contenedor raíz conservaba un fondo degradado propio y un color de texto explícito que lo separaban del lienzo común del ERP. Se ha conectado al ámbito `utilidades-premium-page`, eliminado el fondo degradado local y retirado el color heredado del contenedor para que consuma la tipografía/color del sistema global. Se mantienen las superficies internas, tabla, paginación y estados.
- **Honorarios Gestoría:** la página ya utiliza `honorarios-gestoria-premium` y el sistema de modales/catálogos compartido; se deja anotado que conserva acentos Indigo en ciertos elementos primarios. Debe revisarse en conjunto con la plantilla Word y el editor de factura para no confundir estados semánticos con el color corporativo.
- **Importar CTN, Cambiar Gestor, Cambios Actividad ABSIS, Complementos Saldo y Asignar Expedientes:** disponen de ámbito premium/subpágina y hojas compartidas, pero aún requieren comprobación de sus controles reales y formularios secundarios.
- **Accesos Notariales:** comparte el ámbito de CTN/listados. No se ha añadido modal ni wrapper adicional porque la página no contiene un diálogo propio en su JSX.

Se mantiene pendiente el recorrido del resto de herramientas: importaciones, modelos documentales, municipios, oficinas liquidadoras, registros, reglas de actividad, tipos, Verifacti, PPAD, proceso ABSIS y utilidades técnicas.


## Undécima pasada: catálogos territoriales

- **Municipios:** sus dos ventanas (importación Excel y alta/edición) activan ahora el sistema de modal compartido. Los paneles interiores contienen `role="dialog"`, `aria-modal` y una etiqueta contextual.
- **Oficinas Liquidadoras:** los diálogos de alta/edición e importación Excel activan el mismo sistema; las etiquetas accesibles están en los paneles y no en el overlay.
- Se conservan las anchuras propias (2xl/xl/4xl) y el contenido de los formularios. No se han alterado guardado, importación ni reglas de negocio.


## Duodécima pasada: registros de propiedad

- **Registros de Propiedad:** el modal de importación Excel y el modal de alta/edición activan ahora `panel-modal-premium`; los paneles interiores declaran su rol de diálogo y nombre accesible.
- Se mantienen los anchos de importación (3xl) y edición (4xl), así como el scroll vertical del formulario largo.
- **PPAD, Proceso ABSIS y Reasignar Notario:** no presentan overlays propios en el JSX inspeccionado; conservan sus ámbitos de subpágina y componentes compartidos. Se revisarán los controles integrados en el recorrido funcional visual.


## Decimotercera pasada: catálogos de tipos

- **Tipos de Carga Hipotecaria** y **Tipos de Concepto de Gastos:** conectados al modal responsive común; sus paneles interiores ahora tienen semántica de diálogo y etiqueta contextual.
- **Tipos de Expediente:** el diálogo ya tenía atributos accesibles; se ha conectado al estilo responsive compartido.
- Se conservan sus colores de validación y estados (rojo/verde), que son semánticos y no deben convertirse en el color corporativo.
- **Tipos Impositivos:** no se detectó overlay propio en el JSX inspeccionado; se conserva el ámbito de controles operativos.


## Decimocuarta pasada: cobertura de ámbitos premium en utilidades técnicas

- **Importador ABSIS clásico:** se añadió `utilidades-premium-page` al contenedor raíz; antes solo tenía la clase genérica de subpágina, por lo que no recibía todas las reglas de la capa transversal.
- **Mantenimiento Técnico:** el contenido autorizado carecía del ámbito raíz premium (solo lo tenía el estado de acceso restringido). Se añadió `mantenimiento-tecnico-premium utilidades-premium-page` al `main` real.
- **Verifacti** contiene componentes de formulario internos y no un shell de página autónomo en el archivo inspeccionado; se mantiene el ámbito de componente y no se fuerza una clase de página a cada campo.
- **Utilidades, Lectura Copias y Lectura CancelaI** conservan sus ámbitos operativos existentes. No se detectaron modales propios en los archivos revisados de esta pasada.


## Decimoquinta pasada: cobertura de páginas de documentos

- **Alta de Expediente:** el formulario ya consume tokens de Molsan para campos y botones, pero su `main` no tenía un ámbito de página reconocido por la capa transversal. Se ha añadido `alta-expediente-premium utilidades-premium-page`.
- **Modelos Documentales:** el `main` carecía de ámbito global aunque la página incorpora un editor de factura, vista previa y subcomponentes de provisiones/honorarios. Se ha añadido `modelos-documentos-premium utilidades-premium-page`.
- **Catálogo de Fichajes** ya estaba cubierto por `catalogos-premium-page`.
- Se ha respetado la composición interna de los editores, especialmente la vista previa de documentos y los componentes reutilizados; no se han cambiado cálculos, almacenamiento de plantillas ni generación de documentos.


## Decimosexta pasada: Agenda

- **Agenda principal:** el contenedor pasaba 24px de padding en todos los tamaños. Se ha convertido en espaciado progresivo (12px móvil, 16px intermedio, 24px escritorio) y añadido `min-w-0` para evitar que el calendario fuerce el ancho de la página.
- **Modal Nueva Cita:** ya estaba conectado al estilo compartido `panel-modal-premium`; ahora el panel interior tiene `role="dialog"`, `aria-modal` y nombre dinámico según la acción (crear, editar o ver cita).
- **Vistas Día/Mes/Semana:** mantienen sus componentes propios de calendario. El diseño de semana usa siete columnas y requiere comprobación real en móvil para confirmar que el desplazamiento horizontal queda contenido en el calendario, no en toda la página.
- Se mantienen los colores semánticos de tipo de cita y los estados de carga.


## Decimoséptima pasada: fichajes y administración horaria

- Se han añadido ámbitos de página `fichajes-premium-page` a Resumen, Solicitudes de Ausencia, Festivos/Compensaciones y Control de Fichajes, para que reciban la misma capa visual transversal que el módulo principal.
- **Control de Fichajes · modal de corrección:** ahora activa `panel-modal-premium` además de conservar su clase específica; el diálogo mantiene su rol/etiqueta accesible y las acciones de corrección existentes.
- El módulo principal Fichajes ya tenía el ámbito `fichajes-premium-page`; se ha mantenido sin añadir un scope de otra familia.
- No se han tocado marcajes, calendarios laborales, reglas de cómputo, permisos ni datos.
- Falta comprobar en navegador las tablas de marcajes, los formularios de solicitud y la adaptación de las vistas en móvil.


## Decimoctava pasada: ficha y edición de empleados

- **EmpleadoFicha:** hallazgo real de cobertura incompleta: su CSS específico `EmpleadoFicha.css` definía todas las reglas bajo `.empleado-ficha-premium`, pero los tres estados de renderizado (sin selección, carga y ficha) solo montaban `.erp-page`. Se ha añadido el scope premium a los tres contenedores; así las reglas locales previstas pasan a aplicarse de verdad.
- **EmpleadoEditar:** el contenedor tenía padding fijo `p-6`; se ha convertido en `p-4 sm:p-6` y añadido `min-w-0` para el formulario en anchuras reducidas.
- **EmpleadosListado:** el modal de alta ya activa el ámbito operativo y tiene semántica accesible.
- **EmpleadoPerfil** y **EmpleadosModulo2026** ya tienen sus ámbitos premium.
- No se han cambiado restricciones de edición, permisos ni datos de empleados.


## Decimonovena pasada: portales profesionales · ApoderaGest y EncargaGest

- **ApoderaGest · bloque de encargos:** se ha movido la semántica `role="dialog"` desde el overlay al panel de contenido, conservando el nombre dinámico del grupo y el cierre por clic en el fondo. Se ha conectado el overlay a `panel-modal-premium`.
- **EncargaGest:** se ha añadido la capa compartida a los overlays de edición, incidencia, ficha/perfil y gestión de accesos. Los paneles de alta de encargo, edición, incidencia y acceso tienen ahora roles y nombres accesibles; el perfil externo ya tenía su diálogo etiquetado.
- Se mantiene el modal específico `eg-modal-form` para alta de encargo y sus estilos propios de portal; la capa común solo añade foco, scroll y adaptación de viewport.
- No se han cambiado los flujos de creación, edición, incidencias, perfiles, contraseñas ni accesos de notaría.
- Pendiente: inspección visual real de todos los paneles de EncargaGest en escritorio/móvil, especialmente el formulario de alta largo y la edición de encargo.


## Vigésima pasada: NotarGest y CSS independiente de portales

- **ApoderaGest:** el modal de encargos ya usa el overlay/panel semánticamente correcto; se ha añadido la importación efectiva de `ModalesHerramientasPremium.css` para que la clase `panel-modal-premium` recién conectada aplique de verdad scroll, foco y límites de viewport.
- **NotarGest:** sus cuatro diálogos revisados (avisos, pagos, perfil CTN y resumen de expedientes) ya usan `role="presentation"` en el fondo y `role="dialog"` + `aria-modal` + `aria-labelledby` en el panel. Se mantiene su sistema propio `ng-modal`, con tablas anchas dentro de contenedores desplazables.
- **EncargaGest:** dispone de hoja de estilos propia y una capa de workspace separada; se han conservado ambas. El portal no se debe forzar a adoptar la estructura del ERP interno.
- La auditoría estática de CSS revela alta fragmentación de media queries en portales (más de 50 bloques en PortalProfesionalShared y más de 40 en NotarGest), además de reglas `!important` concentradas en las hojas históricas. Es una señal de deuda de cascada, no una razón para borrarlas automáticamente.
- **Decisión técnica:** mantener estilos de portal aislados y reducir contradicciones por secciones pequeñas, con pruebas de escritorio/móvil de cada flujo. Las reglas de impresión de ApoderaGest quedan fuera de cualquier normalización de pantalla.


## Vigésima primera pasada: CTN, informes e intranet

- **CTN · ficha de notaría:** se ha añadido `ctn-workspace-premium` al ámbito de su contenedor propio para que las reglas transversales de CTN también alcancen esta ruta de detalle, que no necesariamente se renderiza dentro del listado.
- **Informes:** el contenedor raíz imponía un degradado azul/gris y un color de texto local. Se ha conectado también a `utilidades-premium-page`, retirado el fondo degradado del módulo y eliminado el color de texto fijo para heredar el lienzo y la tipografía corporativos.
- **Dashboard:** ya usa `erp-page`, `dashboard-cancelagest` y `molsan-page`, con hoja específica de dashboard; no se ha forzado otra clase.
- **Intranet** y **Logs** ya tienen sus ámbitos premium propios.
- Se conservan gráficos, filtros, navegación de informes, información de CTN y contenido de intranet.


## Vigésima segunda pasada: Fusiones, Logs y Notificaciones

- **Fusiones:** su hoja `Fusiones.css` estaba escrita bajo el selector raíz `.fusiones-page`, pero el contenedor solo tenía `fusiones-premium-page`. Se ha añadido la clase prevista y `min-w-0` para activar la hoja local y evitar desbordes.
- **Logs:** se ha retirado el color Tailwind fijo del contenedor raíz; la página hereda el color del sistema visual y conserva los colores específicos de severidad/evento dentro de la tabla.
- **Notificaciones:** ya utiliza el ámbito `notificaciones-premium-page` y espaciado responsive; no se han cambiado los estados de lectura ni el significado de las alertas.
- **Selector de módulos:** su ventana de ayuda ya activa `panel-modal-premium` y tiene semántica de diálogo; el shell de selección mantiene su composición actual.


## Vigésima tercera pasada: componentes compartidos y ventanas globales

- **Sidebar · notificaciones:** el fondo del modal ya no actúa como diálogo accesible; el rol y el nombre se han trasladado al panel interior. Se ha conectado el overlay a las reglas responsive compartidas.
- **Carpeta Digital:** el diálogo principal ya estaba correctamente etiquetado y usa el sistema compartido. En el visor de documento secundario se ha trasladado también la semántica de diálogo al panel de visualización y se ha activado el ámbito responsive.
- **Modal CTN detalle:** conserva su sistema propio `ctn-modal-overlay/ctn-modal-panel`, con hoja CTN específica y semántica de diálogo. No se le impone el modal genérico para no alterar sus dimensiones/flujo.
- **SelectSJ:** es un componente de selector compartido con estilos operativos; requiere comprobación visual en formularios de densidad alta, pero no contiene un modal independiente.
- Se mantiene la navegación y las acciones de notificación, carpeta y visor sin cambios funcionales.
