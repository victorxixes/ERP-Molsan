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


## Vigésima cuarta pasada: controles compartidos y modales económicos

- **SelectSJ:** se han alineado los colores de borde, texto, foco, selección y hover con los tokens Molsan. Se conserva la selección controlada, el cierre por clic exterior y Escape.
- **Liquidar Expediente:** los diálogos de liquidación y vista previa PDF tenían `role="dialog"` en el overlay; se ha trasladado a cada panel interior, manteniendo `aria-labelledby` y sus identificadores de título.
- **Provisiones y cancelaciones:** el rol de diálogo se ha trasladado del overlay al panel principal, conservando el nombre accesible y la clase operativa que aplica los límites responsive.
- **Enviar a Notario:** usa portal y hoja de modales operativos, pero la estructura del diálogo no se ha cambiado todavía; queda para la pasada específica de modales integrados de FichaExpediente.
- Se mantienen las alertas de error/éxito, la previsualización PDF y el flujo de liquidación/pago.


### Continuación FichaExpediente · Envío a Notario
- El modal de envío a notario se renderiza mediante portal cuando funciona como ventana independiente y también admite modo integrado en línea. El panel interior no tenía semántica de diálogo en ninguno de los dos modos.
- Se ha añadido `role="dialog"`, `aria-modal` y una etiqueta accesible únicamente cuando se presenta como modal independiente; el modo inline no recibe atributos de diálogo falsos.
- Se conserva el diseño de ancho amplio, el formulario, los datos de notaría, los controles de firma y las operaciones existentes.


## Vigésima quinta pasada: shell principal y navegación global

### Estructura confirmada
- `Layout.jsx` es el shell de ERP interno: Sidebar, notificaciones WebSocket, modal de perfil y `Outlet`. ApoderaGest, NotarGest y EncargaGest usan shells independientes; seguridad/panel técnico mantienen su tratamiento especializado.
- El contenedor `erp-main-inner` tiene padding global en CSS y además clases de padding Tailwind en JSX. Muchas páginas hijas también declaran su propio padding responsive. Esto puede acumular gutters (doble margen) en algunos módulos.
- **Decisión:** no retirar el padding global todavía, porque existen rutas antiguas que dependen de él y otras que ya incluyen padding propio. Se registra como punto de QA visual del shell: comprobar ruta por ruta y dejar un único propietario del gutter en cada una.
- La navegación se mantiene en Sidebar centralizado; los estilos de transición están acotados a enlaces y botones del sidebar. La ventana de notificaciones se ha corregido para que el rol de diálogo esté en el panel.
- El shell principal no se ha reestructurado en esta pasada para evitar alterar la anchura útil de los portales y módulos que no comparten el mismo patrón.


## Vigésima sexta pasada: Panel Técnico

- **Panel Técnico principal, Monitor Realtime, Auditoría Avanzada y Logs Avanzados** ya están dentro de sus ámbitos especializados `panel-tecnico-premium` / `panel-tecnico-submodulo-premium`.
- **Monitor de Sistema:** su contenedor usaba `p-6` fijo; se ha cambiado a `p-4 sm:p-6` y añadido `min-w-0` para que los paneles de métricas no fuercen el ancho en móvil.
- Los paneles técnicos conservan sus propios estados de conexión, alertas y severidad; no se han recoloreado indicadores de salud ni errores.


## Decimoséptima pasada: Fichajes y Control de Fichajes

### Revisión
- **Fichajes empleado:** calendario mensual de 7 columnas; historial de marcajes con tabla de 560px dentro de `overflow-x-auto`; documentos y solicitudes con paneles propios.
- **Control de Fichajes:** tabla administrativa de 1250px contenida en un wrapper horizontal; el modal de corrección ya tiene rol de diálogo, etiqueta accesible y estilos responsive compartidos.
- **Solicitudes de ausencia:** tabla de 850px con wrapper horizontal; formulario empleado/administrador y filtros etiquetados.
- **Festivos y compensaciones:** tablas extensas de 520–850px contenidas en wrappers independientes; el CSS móvil limita las tablas y evita que desborden el documento.
- Se confirma que los colores verde/rojo/ámbar/violeta de los marcajes y las decisiones de aprobación/rechazo son estados semánticos, no se sustituyen.

### Ajustes aplicados
- El ámbito `fichajes-premium-page` ahora impide que el contenido fuerce el ancho de la página (`min-width:0`, `max-width:100%`).
- Los wrappers `overflow-x-auto` de Fichajes contienen el desplazamiento horizontal y mantienen el gesto táctil dentro de cada tabla.
- Se añadió un foco visible coherente con el color primario a botones y campos de Fichajes.
- El encabezado de tablas consume el token de superficie suave en lugar de un hexadecimal fijo.

### Pendiente de prueba real
- Confirmar en móvil que el calendario de siete columnas conserva legibilidad con el tamaño real de los días.
- Probar el scroll horizontal de cada tabla en dispositivo táctil y la edición del marcaje con teclado.
- El selector de ausencia en Fichajes es un `select` nativo, correctamente asociado a su etiqueta; no se sustituye por un selector custom innecesario.


## Decimoctava pasada: selector compartido y mensajería

### Selector personalizado `SelectSJ`
- Se revisó el commit de alineación de colores del selector y su hoja responsive.
- Hallazgo: `.select-sj-premium [role=listbox]` define altura máxima y scroll táctil, pero la clase estaba colocada en el texto interior del botón, no en el contenedor que contiene al desplegable. Por ello, las reglas responsive no podían alcanzar el listbox.
- Corrección: la clase `select-sj-premium` se ha movido al wrapper raíz y el texto mantiene truncado con `min-w-0`. No se altera la selección, las opciones, el valor ni los callbacks.

### Mensajería
- **Mensajería Molsan** y **Mensajería Solicitudes** ya usan overlay compartido y paneles interiores con semántica de diálogo.
- Se detectaron dos utilidades Tailwind incompletas: `max-h-[92vh` y `max-h-[90vh`. Aunque la hoja compartida ya limitaba la altura, esas clases no eran válidas. Se han corregido a `max-h-[92vh]` y `max-h-[90vh]`.
- **Mensajería Proveedores** usa un ámbito de formulario propio con controles y focus-visible compartidos.
- **Mensajes internos** conserva un chat de altura dinámica en escritorio y composición flexible en móvil; no se ha cambiado su distribución ni el comportamiento de tiempo real.
- Los colores de mensajes pendientes, leídos, presencia y estados de encargo se mantienen como semánticos.

### Pendiente de prueba real
- Probar SelectSJ con teclado, táctil y listas largas, confirmando que el desplegable queda dentro de la ventana.
- Comprobar el scroll y la altura de ambos modales en móvil y tablet.
- Revisar el chat en viewport estrecho y en escritorio con el panel de contactos abierto/cerrado.


## Vigésima séptima pasada: revisión estructural de portales profesionales

### NotarGest
- Se ha verificado el catálogo de nueve bandejas operativas: recepción, firma, factura notarial, presentación en Registro, AJD/ITP, inscripción, defectos, copias simples y escrituras cerradas inscritas. La bandeja adicional de firmas urgentes se mantiene como acceso transversal.
- El dashboard contiene tres paneles analíticos (hitos registrales, actividad de firmas y gestión económica), con reglas de reordenación responsive.
- Se han localizado cuatro diálogos principales: avisos, pagos, perfil y resumen de expedientes. Los cuatro paneles declaran `role="dialog"`, `aria-modal="true"` y nombre accesible; los fondos usan presentación y cierre por clic exterior.
- Las tablas mantienen scroll horizontal encapsulado; la tabla de pagos conserva un ancho mínimo para no comprimir datos económicos.
- La navegación de bandejas pasa de cinco columnas en escritorio a cuatro/tres/dos y una columna en viewports progresivamente estrechos.
- Pendiente de QA real: altura útil y scroll de pagos/perfil/resumen en móvil; lectura de las nueve bandejas con datos reales de prueba; foco y retorno de foco al cerrar cada diálogo.

### EncargaGest
- Se han localizado cinco diálogos de trabajo: alta, edición, incidencia, perfil CTN y gestión de acceso. Todos tienen semántica de diálogo y etiqueta accesible.
- El alta dispone de formulario largo con carpeta digital y datos del encargo; CSS establece composición de dos columnas y reflujo a una columna por debajo de 1100px, y campos de una columna en móvil.
- El perfil CTN tiene reflujo a una columna por debajo de 900px y datos en una columna por debajo de 600px; el panel limita altura y contiene su propio scroll.
- Las tablas del directorio CTN tienen wrapper de scroll horizontal. La paginación y filtros se reordenan en móvil.
- Hallazgo de deuda CSS: `EncargaGest.css` contiene varias redefiniciones sucesivas de `.eg-modal-layout`, `.eg-modal-datos`, `.eg-modal-carpeta-lateral` y `.eg-contrato-layout`. Las reglas posteriores ajustan deliberadamente la distribución del alta, pero la cascada es difícil de mantener. No se eliminan duplicidades sin capturas comparativas de la composición final.
- Pendiente de QA real: alta con varios contratos/fincas y adjuntos; edición larga; incidencia; perfil CTN; gestión de acceso; comprobar scroll y botones en móvil/tablet.

### ApoderaGest
- Se ha revisado la estructura de encargos agrupados por apoderado, el detalle expandible y el modal de bloque con lista de expedientes.
- El modal se monta mediante portal, el panel tiene `role="dialog"`, `aria-modal="true"` y nombre accesible; el overlay cierra al pulsar fuera.
- Se conserva la impresión diferenciada de listado y fichas; las reglas de impresión quedan fuera de normalizaciones de pantalla.
- Pendiente de QA real: grupos extensos, expansión de fichas, comentarios al gestor, firma, visor documental, impresión y modal en tres tamaños.

### Límite de esta pasada
La revisión anterior es estática sobre la rama aislada. No se han ejecutado operaciones con notarías, encargos, documentos, pagos ni accesos; tampoco se han modificado datos. No se marca QA visual como completado. La consolidación de cascada y cualquier ajuste adicional quedan condicionados a una previsualización aislada con backend de pruebas o mocks, nunca contra el backend productivo.


## Vigésima octava pasada: medición de deuda de cascada CSS

Se ha repetido el recuento estático directamente sobre las cinco hojas principales de la rama. Los datos actuales son:

| Hoja | Líneas | `!important` | Media queries | Selectores repetidos destacados |
|---|---:|---:|---:|---:|
| `MolsanRedesign2027.css` | 3.499 | 118 | 25 | `.erp-main-inner` (2), `.tabs-sj` (2), `.modal-sj` (2) |
| `NotarGest.css` | 958 | 83 | 46 | `.ng-admin-notarias .ng-control-hero` (5), `.notargest .ng-modulos-grid` (4), `.ng-modal` (3) |
| `PortalProfesionalShared.css` | 1.988 | 56 | 55 | `.ag-aceptar-resumen` (10), `.ag-encargo-paneles.ag-ficha-paneles` (8), `.ag-encargo-detalle-cabecera` (6) |
| `EncargaGest.css` | 792 | 7 | 17 | `.eg-modal-layout` (4), `.eg-perfil-layout` (4), `.eg-modal-form` (3) |
| `molsan-design-system.css` | 938 | 0 | 12 | `.molsan-page-header` (2), `.molsan-toolbar` (2), `.molsan-kpi-card` (2) |

### Interpretación
- El recuento confirma deuda de cascada especialmente concentrada en NotarGest y PortalProfesionalShared; no demuestra por sí mismo que cada repetición sea errónea.
- En PortalProfesionalShared hay selectores con hasta diez bloques. Es necesario contrastar cada bloque con sus media queries y el orden de importación antes de consolidarlo.
- EncargaGest presenta una fragmentación más acotada, pero las cuatro definiciones de `.eg-modal-layout` confirman que el formulario de alta ha recibido varias iteraciones estructurales.
- `molsan-design-system.css` no contiene declaraciones `!important`; sus selectores repetidos se deben revisar para comprobar si son variantes responsive o duplicidades consolidables.
- No se ha ejecutado una eliminación automática de selectores ni de `!important`. Se evita así introducir regresiones visuales en módulos que todavía no han pasado QA de navegador.

### Siguiente paso
Priorizar la lectura contextual de los bloques repetidos de NotarGest y PortalProfesionalShared, registrar cuáles son variantes responsive legítimas y cuáles pueden consolidarse sin cambiar el resultado calculado. Después repetir build/CI y reservar las capturas de comparación para la previsualización aislada.


## Vigésima novena pasada: cascada contextual de portales

### PortalProfesionalShared.css · aceptación de encargos
- Se ha seguido la cascada de `.ag-aceptar-resumen`: parte de cuatro columnas, recibe una variante de siete columnas para la fila compacta y después otra distribución de siete columnas para los campos de aceptación; existen breakpoints intermedios de cuatro y dos columnas.
- Una regla tardía dentro de un media query vuelve a imponer una rejilla de nueve columnas con `!important`. Por tanto, el número alto de repeticiones no es una simple copia literal: son iteraciones de diseño superpuestas y algunas se contradicen en el número de columnas.
- No se ha retirado ninguna regla. Antes hay que comprobar qué versión corresponde al flujo actual de aceptación en ApoderaGest y qué anchura real necesita cada campo; después se podrá dejar una única regla base y sus breakpoints.

### PortalProfesionalShared.css · ficha de encargo
- `.ag-encargo-paneles.ag-ficha-paneles` tiene varias distribuciones históricas: dos columnas, tres columnas y variantes específicas para envío, facturación, archivo, registro, firma y observaciones.
- Los breakpoints de 1200, 900 y 760px cambian la colocación de subpaneles. Las últimas reglas de escritorio vuelven a fijar tres columnas y modifican el reparto de Carpeta Digital/Registro.
- Se confirma que esta cascada necesita capturas del flujo real antes de consolidar: el orden de los paneles es parte de la comprensión del expediente y no debe cambiarse accidentalmente.

### NotarGest.css · administración y overlays
- Las repeticiones de `.ng-admin-notarias .ng-control-hero` corresponden a sucesivas adaptaciones de la cabecera administrativa; requieren validar el salto de acciones a segunda línea.
- Los overlays generales y los especializados de pagos/perfil se redefinen en varios tramos de la hoja. El modal de pagos conserva tabla con ancho mínimo y scroll interno; se debe comprobar que el scroll no se propaga al fondo y que el encabezado permanece visible.
- La navegación de bandejas tiene breakpoints explícitos hasta una columna a 390px; se registra como cobertura estática, no como confirmación de legibilidad visual.

### Decisión
La cascada de ambos portales queda clasificada como **deuda de mantenimiento prioritaria, sin regresión confirmada**. No se aplican sustituciones automáticas ni se elimina `!important` a ciegas. La reducción debe hacerse por bloque, con comparación visual de escritorio/tablet/móvil y verificación de que no cambian acciones, datos ni orden de trabajo.


## Trigésima pasada: utilidades, catálogos y formularios económicos

### Corrección aplicada
- `HonorariosGestoria.jsx`: los acentos Indigo de cabecera, acciones principales, resumen de cálculo y selector de plantilla Word se han conectado a `--molsan-primary`, `--molsan-primary-hover`, `--molsan-primary-soft` y `--molsan-primary-border`.
- El cambio es exclusivamente visual. No modifica el cálculo de base/impuesto/total, los endpoints, las tarifas, el estado activo ni la carga/descarga del Word.
- Los cuatro workflows disparados por este commit han finalizado correctamente: build frontend y sintaxis backend en los workflows de Fichajes, Control Apoderados y EncargaGest, además de Consolidación Post Firma.

### Revisión estática adicional
- `ImportadorPostFirma.jsx`: el informe histórico conserva su wrapper de scroll horizontal y el contenedor de página premium; no se altera el ancho de las columnas históricas.
- `ImportarCTN.jsx`: formulario responsive con reflujo y capa compartida; falta probar la selección de archivo y la vista previa con datos ficticios.
- `DatosMolsan.jsx`, `CatalogoAbsis.jsx`, `ReglasActividadesExpediente.jsx`, `Catalogos.jsx`, `CatalogoOficinas.jsx`, `TiposImpositivos.jsx` y `TiposConceptoGastos.jsx`: se han detectado acentos Indigo heredados en cabeceras, controles o acciones. Se registran como pendientes de armonización por pantalla, distinguiendo los estados semánticos (error, aviso, éxito) que deben conservar sus colores.
- `ModelosDocumentos.jsx`: el editor/previsualizador tiene tablas compactas y rejillas de dos columnas; necesita QA de lectura a 100 % y 125 % de zoom, y en tablet/móvil, especialmente en la previsualización de factura.
- Los catálogos de tarifas y entidades mantienen tablas con scroll horizontal encapsulado; no se reduce el ancho mínimo si ello impide leer importes o códigos.

### Estado de cierre del bloque
- Revisión estática: ampliada.
- Corrección visual aplicada: Honorarios Gestoría.
- CI del commit de Honorarios: correcto en los cuatro workflows.
- QA visual con navegador y datos ficticios: pendiente de entorno aislado.


## Trigésima primera pasada: diálogos pendientes y permiso de ApoderaGest — 30/10/2026

### Correcciones aplicadas en la rama
- `CatalogoAbsis.jsx`: los diálogos de creación de lista y edición de entrada usan `useAccessibleDialog` con foco inicial, ciclo Tab/Mayús+Tab, Escape y restauración del foco. Escape y cierre exterior quedan bloqueados mientras se está creando una lista; Escape durante el guardado de una entrada no cierra el formulario.
- `CtnDetallePage.jsx`: el histórico de firmas usa el gestor compartido de foco/teclado.
- `Informes.jsx`: el diálogo de detalle de facturación integra foco inicial, tabulación contenida, Escape y retorno de foco.
- `FichaExpediente.jsx`: el modal base de expediente y los diálogos explícitos de orden de pago, registro de gasto y PPAD integran el gestor compartido.
- `App.jsx`: la ruta `/apoderagest` queda envuelta en `RequireModule module="apoderagest"`; también queda protegida la ruta secundaria `/apoderagest/liquidaciones`. La comprobación usa el catálogo/permisos centrales y mantiene el guard de sesión existente. No se han alterado las rutas de acceso externo de NotarGest ni EncargaGest.

### Commits de esta pasada
- `a0365652`: guard de módulo en la ruta principal ApoderaGest.
- `e18f037b`: diálogos de Catálogo ABSIS.
- `f63a53fa`: diálogo CTN.
- `3564034b`: diálogo de Informes.
- `83227646`: diálogos de FichaExpediente.
- `74351f7d`: guard de módulo en la ruta secundaria de liquidaciones ApoderaGest.

### Verificación y límites
- La inspección posterior confirma que los dos diálogos ABSIS, el histórico CTN, el diálogo de facturación y los diálogos de Expedientes tienen ahora refs y llamadas al gestor común.
- La comparación de ramas confirma `main` como ancestro directo: rama de auditoría 271 commits por delante y 0 por detrás en la consulta realizada.
- La metadata de GitHub de la PR #374 devolvió `mergeable: false` en la última lectura; debe volver a consultarse antes de cualquier decisión de integración.
- En la consulta del último commit no se devolvieron runs ni estados de CI. Por tanto, estas últimas modificaciones **no se declaran compiladas** hasta obtener el resultado de los workflows.
- Sigue pendiente QA manual en navegador, con teclado y lector de pantalla, en escritorio/tablet/móvil. No se ha utilizado el backend productivo ni se han ejecutado operaciones con expedientes, pagos, documentos o catálogos.


### Ampliación de la pasada: ficha CTN y listado de Expedientes
- `ModalCtnDetalle.jsx`, utilizado por el listado CTN, integra ahora `useAccessibleDialog` con foco inicial, ciclo de teclado, Escape y retorno del foco al control que abrió la ficha.
- `ExpedientesListado.jsx`: los diálogos de filtros avanzados y ayuda de control de plazos integran el gestor común. En filtros avanzados, la semántica `role="dialog"` se ha situado en el panel de contenido y el overlay queda como presentación, evitando incluir el botón de fondo dentro de la región modal.
- Commits: `e9339ca7` (ficha CTN) y `48258919` (listado de Expedientes).
- Esta ampliación es revisión estática y corrección de código; la comprobación interactiva y la compilación del nuevo HEAD siguen pendientes.

## Trigésima segunda pasada: coherencia visual de Informes y Expedientes — 30/10/2026

### Armonización aplicada
- `Informes.jsx`: acciones principales (aplicar filtros, guardar datos y abrir el conjunto de informes) usan los tokens de marca Molsan en lugar de azul Tailwind fijo.
- Las cabeceras de las tablas de informes usan superficie suave y texto secundario del sistema de diseño.
- Se han armonizado también enlaces de expediente y acciones secundarias concretas sin cambiar colores semánticos de estados ABSIS ni colores de las series de gráficos.
- `ExpedientesListado.jsx`: los acentos del diálogo de control de plazos pasan a tokens Molsan.
- Commits: `2046f4a3` y `16a7abb6`.

### Revisión responsive estática de los bloques pendientes
- CTN listado: 12 media queries en su hoja específica; las tablas anchas están dentro de contenedores con scroll horizontal. La ficha CTN modal limita altura a `90dvh` y en móvil cambia a alineación superior y anchura completa.
- CTN detalle: rejillas adaptables y tabla histórica de 850 px dentro de wrapper desplazable; se conservan los datos sin comprimir columnas.
- Catálogo ABSIS: los dos diálogos quedan limitados por `max-height: calc(100dvh - 2rem)` y scroll vertical en `ModalesHerramientasPremium.css`; en móvil ocupan el ancho disponible.
- Expedientes listado: el diálogo de filtros tiene altura máxima del 88 % del viewport y scroll interno; la hoja local incluye breakpoint a 700 px.
- FichaExpediente: breakpoints estáticos a 900, 720 y 640 px; tablas con scroll horizontal encapsulado, y los modales operativos usan `dvh`, safe-area y campos de 16 px en móvil.
- Modales operativos: 8 media queries y reglas de altura/scroll contenidas.

### Deuda visual que no debe corregirse a ciegas
- `Informes.jsx` aún contiene acentos azules asociados a estados de negocio, clasificaciones, datos y gráficas. No se sustituyen de forma global para no borrar diferencias semánticas.
- `FichaExpediente.jsx` conserva numerosos acentos azules/índigo y violeta. Parte identifica estados de actividad, alertas, documentos o importes; su clasificación final debe hacerse por contexto de cada control, no por reemplazo global.
- Los breakpoints y wrappers revisados son evidencia estática. No confirman ausencia de solapamientos ni legibilidad real en navegador.

### Estado de validación
- El commit de código anterior (`48258919`) terminó correctamente en los cinco workflows; el Backend audit completó compilación y pruebas unitarias sobre SQLite aislado.
- Los cambios visuales de los commits `2046f4a3` y `16a7abb6` son posteriores; sus workflows deben confirmarse antes de dar por validada la última versión.
- QA visual interactivo escritorio/tablet/móvil, teclado y lector de pantalla sigue pendiente. No se ha publicado una previsualización conectada a producción.

## Revalidación técnica y estado de PR — 30/10/2026
- El commit de código más reciente de esta tanda (`16a7abb6`) tiene los cinco workflows en `success`: Backend audit, EncargaGest checks, Consolidación Post Firma checks, Validar Fichaje Molsan y Validar Control Apoderados.
- Backend audit terminó con éxito la compilación de módulos y las pruebas unitarias sobre SQLite aislado; no conectó con la base productiva.
- El frontend build de los workflows terminó correctamente en la misma revisión de código.
- Validación estática de navegación: 32 claves del catálogo central, sin claves ni rutas duplicadas; la navegación mantiene Espacios/Técnicos y Notificaciones no aparece como entrada de menú.
- ApoderaGest: las dos rutas internas (`/apoderagest` y `/apoderagest/liquidaciones`) están envueltas por `RequireModule` con clave `apoderagest`; las rutas de acceso externo no se han cambiado.
- Estado consultado de PR #374: abierta, draft, mergeable=true; rama 281 commits por delante de `main` y 0 por detrás. Sigue sin integrar.
- El HEAD de la PR incluye una actualización documental posterior al commit de código validado; esa actualización no cambia el frontend.
- La validación técnica no sustituye QA visual real. Siguen pendientes pruebas en navegador en escritorio/tablet/móvil, teclado/lector de pantalla y validación de interacciones con datos ficticios.

## Revisión adicional de permisos y cierre de diálogos — 30/10/2026 18:05

### Corrección aplicada
- En `CatalogoAbsis.jsx`, el diálogo de entrada ya bloqueaba Escape durante el guardado, pero el clic en el fondo y el botón «Cancelar» todavía podían cerrarlo. Ambos mecanismos respetan ahora `guardando`, manteniendo coherencia con el bloqueo de Escape.

### Verificación del control de módulo ApoderaGest
- En frontend, `/apoderagest` y `/apoderagest/liquidaciones` usan `RequireModule` con la clave central `apoderagest`; la comprobación consulta el catálogo de módulos visibles del usuario.
- En backend, los routers principales de dashboard, agenda y encargos requieren autenticación y aplican alcance por usuario/asignación en operaciones de expediente. No se observa una comprobación uniforme de que la sesión tenga habilitado el módulo `apoderagest`.
- Hallazgo concreto: `GET /api/apoderagest/encargos/gestores` exige sesión autenticada, pero no verifica la visibilidad del módulo antes de devolver empleados activos. Por tanto, el guard frontend no constituye por sí solo una barrera backend de módulo.
- El helper backend `require_perm_modulo` consulta permisos de acción explícitos (`permisos_modulo_dict`), mientras que `RequireModule` consulta módulos visibles. No se ha añadido un guard backend improvisado en esta PR: primero debe definirse si la autorización backend debe basarse en módulo visible o en la acción explícita `apoderagest.ver`, y probarse con perfiles reales de permisos en entorno aislado. Este punto queda pendiente de cierre de seguridad.

### Validación de diálogos y límites
- La inspección estática confirma semántica y gestor de foco en los dos diálogos ABSIS, ficha CTN, histórico CTN, detalle de facturación y diálogos identificados de Expedientes.
- No se puede declarar completada la accesibilidad real sin abrir las ventanas con teclado/lector de pantalla y comprobar foco, Escape, anidamiento, scroll y retorno del foco.
- No se ha realizado QA real en navegador en escritorio/tablet/móvil: Render mantiene desactivadas las previews de PR y el frontend puede apuntar al backend LIVE si no se aísla la API. No se ha desplegado ni conectado esta rama a producción.

## Trigésima tercera pasada: accesibilidad transversal, controles y auditoría de cascada CSS — 30/10/2026

### Diálogos adicionales integrados con `useAccessibleDialog`
- Agenda: `ModalNuevaCita.jsx` añade foco inicial, ciclo Tab, Escape y retorno al disparador; Escape no cierra durante guardado.
- Empleados: `EmpleadosListado.jsx` integra el modal «Nuevo empleado» y conserva el bloqueo de cierre cuando está guardando.
- Catálogos: `EntidadesBancarias.jsx` (alta/edición e importación), `Municipios.jsx` (alta/edición e importación), `OficinasLiquidadoras.jsx` (alta/edición e importación), `RegistrosPropiedad.jsx` (alta/edición e importación), `TiposCargaHipotecaria.jsx` y `AccionesExpediente.jsx` (crear/editar e importar) integran el gestor común.
- ApoderaGest: el modal de encargos agrupados se integra con el gestor de foco. Se separa el grupo activo del estado de apertura de los detalles para mantener un único modal de grupo abierto y evitar refs duplicadas; el identificador del grupo activa la reinicialización correcta del foco al cambiar de grupo.
- `SelectSJ.jsx`: el selector personalizado admite flechas arriba/abajo, Inicio/Fin dentro de opciones, Escape con retorno al disparador, foco gestionado y relación `aria-controls` con su listbox.
- Commits principales: `62ea057f`, `e0ccdd80`, `ecea3472`, `82b58462`, `a1d5d939`, `cf734ecc`, `60bd0619`, `f264ea01`, `402981c3`, `b1b7692b`, `5a6f5a5d`, `d8476573` y `77cd28bf`.

### Revisión CSS transversal
- `main.jsx` importa primero `molsan-tokens.css`, después `molsan-design-system.css`, tablas y controles; la aplicación y sus hojas de módulo se cargan antes de `MolsanRedesign2027.css`, que actúa como última capa de armonización. La precedencia está documentada y explica parte de los overrides.
- Tokens canónicos usados en las correcciones de Informes existen en `molsan-tokens.css`: `--molsan-primary`, `--molsan-primary-hover`, `--molsan-primary-soft`, `--molsan-primary-border`, `--molsan-surface-soft` y `--molsan-text-secondary`.
- `MolsanRedesign2027.css` contiene 25 media queries, 118 declaraciones `!important` y varios selectores repetidos en capas base/responsive (p. ej. `.erp-main-inner`, `.tabs-sj`, `.modal-sj`, `.molsan-page-header`).
- `NotarGest.css` contiene 46 media queries y 83 `!important`; hay selectores con varias redefiniciones, especialmente `.ng-control-hero`, `.ng-control-botones`, `.ng-modulos-grid` y `.ng-admin-kpis-global`.
- `PortalProfesionalShared.css` contiene 55 media queries y 56 `!important`; `EncargaGest.css` contiene 17 media queries y 7 `!important`; `molsan-design-system.css` contiene 12 media queries y repeticiones de selectores de cabecera, toolbar y KPI.
- Estas repeticiones son indicios de deuda de cascada, pero varias son overrides responsive deliberados. No se han eliminado en bloque porque podría romper los portales o el diseño adaptativo. La consolidación debe hacerse selector por selector, verificando el resultado en navegador.

### Matriz responsive estática (cobertura CSS detectada)
- Portales profesionales compartidos: 55 media queries, con puntos de corte desde 320 px hasta escritorio amplio; hay reglas específicas de tablet/móvil para formularios, grids, visor y tablas.
- NotarGest: 46 media queries, con cortes frecuentes en 1050, 900, 800, 700, 650, 560 y 520 px.
- EncargaGest: 17 media queries, con reglas específicas a 1100, 900, 700, 650 y 600 px.
- Design system: 12 media queries; controles y tablas comunes tienen reglas específicas a 640/620 px.
- Expedientes: listado 5 media queries (700 px); ficha 4 media queries (900, 720, 680, 640 y 620 px).
- Agenda: 4 media queries (incluye 1100, 768, 760, 640 y 430 px).
- Empleados listado: 2 media queries (760 px); Seguridad subpáginas: 14 media queries (1100, 900, 760, 680, 640 y 620 px).
- Catálogos y modales operativos: los contenedores revisados usan límites de altura, scroll interno y breakpoints móviles. Esta es una comprobación de CSS estático, no una certificación visual de cada viewport.

### Pendientes que se mantienen abiertos
- El modal agrupado de ApoderaGest y los cambios del selector deben probarse con teclado real, especialmente al cambiar de grupo, seleccionar opciones y cerrar diálogos anidados.
- La ruta administrativa `/herramientas/utilidades/control-apoderados` está dentro del árbol `RequireAuth`, aunque no lleva el mismo `RequireModule` que `/apoderagest` y `/apoderagest/liquidaciones`. Se verificó en `backend/app/apoderagest/liquidaciones.py` que todos los endpoints `/admin` llaman a `_exigir_admin(usuario)`, que aplica el rol administrativo o permisos de edición de Utilidades/Seguridad. La API sí protege los datos y acciones; queda como mejora opcional añadir un guard equivalente en frontend para evitar mostrar una pantalla que terminaría respondiendo 403.
- La cascada CSS de NotarGest, EncargaGest y la capa global sigue necesitando consolidación selectiva; no conviene borrar `!important` sin una comparación visual.
- QA en navegador real con escritorio, tablet y móvil; teclado/lector de pantalla; zoom 125–200 %; scroll horizontal de tablas; modales anidados; formularios largos y estados de carga. No se ha realizado ninguna operación con expedientes ni datos productivos.

### CI de esta pasada
- En el commit de código `77cd28bf`, EncargaGest checks, Consolidación Post Firma, Validar Fichaje Molsan y Validar Control Apoderados finalizaron correctamente.
- Backend audit seguía en ejecución en la última consulta; no se marca como completado hasta confirmar su resultado.
- PR #374 permanece abierta, en borrador y mergeable; sin integración ni despliegue.

## Trigésima cuarta pasada: consolidación de tokens y acentos de acción — 30/10/2026
- `molsan-tokens.css` queda como fuente canónica para `--molsan-page-bg`, `--molsan-card-border`, `--molsan-card-shadow` y el nuevo `--molsan-card-shadow-hover`. Se conservan los valores que ya aplicaba la capa de rediseño, evitando un cambio visual brusco.
- `MolsanRedesign2027.css` deja de redefinir esos tokens localmente en `.cg-page` y en el conjunto de pantallas migradas; consume los tokens globales.
- `molsan-design-system.css` deja de sobrescribir `--molsan-radius-panel` (el valor canónico vuelve a ser el de `molsan-tokens.css`) y elimina un alias de sombra redundante.
- `--ag-line` se unifica con `var(--molsan-border)` en la capa de rediseño, alineado con los portales compartidos.
- Acciones principales de `FichaExpediente.jsx`, `EntidadesBancarias.jsx`, `Municipios.jsx` y `RegistrosPropiedad.jsx` pasan a `--molsan-primary` y `--molsan-primary-hover`; no se han cambiado colores de estados de negocio ni series de gráficos.
- Commits de tokens: `d66495a4`, `665b6c23`, `9b43a10f`, `4ae0e091`; botones: `ebfc2602`, `988f402d`, `89bc6606`, `b28eb331`.

### Resultado CI confirmado
- Para el commit de código `b28eb331`, los cinco workflows asociados a la PR terminaron en `success`: Backend audit, EncargaGest checks, Consolidación Post Firma checks, Validar Fichaje Molsan y Validar Control Apoderados.
- Backend audit completó compilación de módulos y pruebas unitarias con SQLite aislado; no utilizó la base de producción.
- Los workflows de frontend finalizaron correctamente en los builds aplicables.
- La última lectura de PR #374 mantiene estado abierto, draft y mergeable; no se ha integrado ni desplegado.

## Trigésima quinta pasada: seguridad, controles y tablas compartidas — 30/10/2026
- `SeguridadAuditoria.jsx`: el diálogo de detalle de registro integra `useAccessibleDialog`, foco inicial, ciclo de tabulación, Escape y restauración de foco.
- `molsan-controls.css`: se elimina una regla duplicada de foco que quedaba sobrescrita por una segunda definición posterior.
- `molsan-tables.css`: se consolidan en una sola definición las reglas repetidas de `.molsan-table-wrap`, scroll horizontal, ancho mínimo de tablas y breakpoint móvil; se conservan padding móvil, bordes y scroll táctil.
- Comprobación de tablas: CTN detalle usa `.ctn-detalle-table-wrap` y `.ctn-detalle-history-table-wrap` con `overflow:auto`; CTN listado usa `.ctn-tabla-scroll`; Expedientes usa `.expedientes-table-scroll`/`.molsan-table-wrap`; ApoderaGest usa `.ag-resumen-tabla-wrap`; catálogos usan wrappers de scroll; Informes y FichaExpediente conservan wrappers propios.
- Los listados extensos no se fuerzan a encoger columnas: el desplazamiento horizontal queda encapsulado en el contenedor de tabla.
- Commit de seguridad: `4cc860e7`; consolidación de controles/tablas: `aed538ed` y `9ed2d108`.
- El commit `9ed2d108` pasó los cinco workflows CI. El cambio posterior de SeguridadAuditoria (`4cc860e7`) está pendiente de la confirmación de su workflow asociado.

### Estado de permisos de Control Apoderados
- La ruta de administración se encuentra bajo `RequireAuth`; se verificó que los endpoints `/admin` del backend llaman a `_exigir_admin(usuario)`, que exige rol administrativo o permisos de edición de Utilidades/Seguridad. Los datos y las operaciones administrativas no dependen solo del guard visual del frontend.
- Añadir un guard equivalente en frontend queda como mejora de experiencia (evitar abrir una pantalla que devolverá 403), no como corrección de la autorización de datos.

## Trigésima sexta pasada: normalización de permisos — 30/10/2026
- `frontend-app/src/utils/permisos.js`: se corrigen dos expresiones regulares que contenían barras invertidas duplicadas: la normalización Unicode ahora elimina correctamente diacríticos NFD y la detección de rol reconoce espacios reales entre términos.
- La corrección mejora la identificación de perfiles como `Super Administrador` y la comparación de etiquetas de módulos con acentos. No cambia las listas de permisos ni concede permisos nuevos.
- Verificación lógica con casos `Administrador`, `Super Administrador`, `Administración`, `Gestoría`, `Superusuario` y `Usuario gestor`: los perfiles administrativos esperados se identifican; los nombres no administrativos no se elevan a administrador.
- El guard de `/apoderagest` y `/apoderagest/liquidaciones` sigue usando la clave central `apoderagest`; la ruta administrativa de Control Apoderados permanece autenticada y los endpoints backend `/admin` exigen `_exigir_admin`.
- Commit: `20da43cf`.
- Los cinco workflows asociados al commit `20da43cf` terminaron correctamente: Backend audit, EncargaGest checks, Consolidación Post Firma checks, Validar Fichaje Molsan y Validar Control Apoderados.

## Trigésima séptima pasada: inventario de diálogos, tokens y cascada responsive — 30/10/2026

### Inventario estático de diálogos
- Se revisaron los diálogos marcados con `role="dialog"` en los componentes operativos y pantallas modificadas de Agenda, CTN, Empleados, Expedientes, ApoderaGest, Control Apoderados, EncargaGest, NotarGest, Fichajes, Informes, Mensajería, Provisiones, Seguridad y Catálogo ABSIS.
- En los ficheros inspeccionados, los diálogos activos tienen `aria-modal="true"`, ref de foco y `useAccessibleDialog`; los nombres accesibles se proporcionan mediante `aria-label` o `aria-labelledby`.
- `EnviarANotarioModal` comparte componente entre modo modal y modo inline; el hook solo se activa cuando `inline=false` y en ese modo el contenedor lleva `role="dialog"` y `aria-modal="true"`.
- Se verificaron específicamente los diálogos de Catálogo ABSIS (alta/importación), CTN, Informes, Expedientes y Control Apoderados. La comprobación es estática: no equivale a probar el ciclo real de foco con teclado o lector de pantalla.
- `SelectSJ` declara `aria-haspopup="listbox"`, `aria-controls`, `aria-expanded`, `role="listbox"` y `role="option"`; incluye flechas, Inicio/Fin y Escape. Pendiente validación manual de navegación y anuncio por lector de pantalla.

### Tokens y cascada CSS
- Se contrastaron 73 definiciones y 52 referencias de tokens en las hojas globales y de los tres portales profesionales. No se detectaron referencias sin definición que carezcan de fallback; `--erp-border` y `--erp-text` solo se usan con fallback.
- Se eliminó la redefinición raíz redundante de tokens en `NotarGest.css` y se trasladaron `--eg-line`/`--eg-ink` al bloque raíz único de `EncargaGest.css`; también se eliminó su `min-width:0` repetido.
- En NotarGest, `min-width:0` queda consolidado en el bloque raíz inicial. Los bloques posteriores de paneles, tablas y diálogos mantienen solo las reglas específicas que añaden estilo o adaptación.
- La cascada conserva duplicaciones intencionales por breakpoint y por capas de compatibilidad. No se han borrado masivamente los `!important`: hacerlo sin comparar capturas podría alterar paneles, cabeceras, modales o tablas.
- `main.jsx` carga `index.css`, tokens, design system, tablas y controles antes de `App`, y `MolsanRedesign2027.css` después de los estilos de los módulos como capa final de armonización.

### Matriz responsive y overflow
- El shell `.erp-main-content` y `.erp-main-inner` tienen `min-width:0`; el contenido central ocupa el ancho disponible y se limita a 1920 px en escritorio.
- Los breakpoints globales más usados son 760 px y 640 px; NotarGest y EncargaGest añaden cortes específicos para grids, paneles, fichas y modales.
- Se han localizado anchos mínimos deliberados en tablas largas (por ejemplo CTN 680 px, NotarGest 760/1250 px y catálogos 620 px) dentro de wrappers con desplazamiento horizontal; deben verificarse visualmente en móvil para confirmar que el scroll queda dentro de la tabla y no en toda la página.
- `prefers-reduced-motion` está contemplado en la capa global para Expedientes, CTN, portales profesionales, catálogos, empleados, fichajes, Informes y otros módulos.

### Permisos ApoderaGest
- `/apoderagest` aplica `RequireAuth` y `RequireModule(module="apoderagest")`.
- `/apoderagest/liquidaciones` aplica `RequireModule(module="apoderagest")` dentro del árbol privado `RequireAuth`/Layout.
- `/herramientas/utilidades/control-apoderados` está dentro del árbol privado y el backend aplica `_exigir_admin` a los endpoints `/admin`; queda como mejora de UX añadir guard visual específico en frontend para evitar abrir la pantalla a quien recibirá 403.

### CI de la última tanda
- El commit `3f6e0d4f` ha generado los cinco workflows de PR; en la última consulta estaban en cola. Se confirmará su resultado antes de marcar esta tanda como validada.

### Endurecimiento adicional de la identificación administrativa
- Se detectó y corrigió un caso límite en `permisos.js`: `Number(null) === 0` podía clasificar como administrador un empleado cuyo identificador de rol fuera explícitamente nulo. Ahora solo se reconoce el rol técnico 0 si el identificador existe, además de los criterios explícitos de usuario/rol administrativo.
- Prueba lógica de regresión: rol 0 → administrador; rol nulo sin nombre/usuario admin → no administrador; `Super Administrador` → administrador; usuario `admin` → administrador; rol ordinario con módulo visible → solo ve ese módulo; rol ordinario sin asignación → no ve ApoderaGest.
- Commit de endurecimiento: `13dafe78`. La ejecución CI asociada está pendiente.

### Semántica de botones y ciclo de foco
- Se explicitó `type="button"` en acciones de CTN, NotarGest, Informes, Control Apoderados y Mensajería que no deben enviar formularios; se explicitó `type="submit"` en las acciones que sí envían formularios.
- Se hizo la misma distinción en formularios de Fichajes, Control de Fichajes, Festivos/Compensaciones y Solicitudes de Ausencia. En Mensajería, los botones de abrir/cerrar son `button` y los de crear/contestar son `submit`.
- Reescaneo de las pantallas principales: no quedan botones sin atributo `type` en los ficheros corregidos ni en las pantallas de empleados, agenda, selector de módulos y catálogos maestros inspeccionadas.
- `useAccessibleDialog` incluye ahora elementos nativos `details > summary`, `audio[controls]` y `video[controls]` en el ciclo de foco; además excluye controles descendientes de cualquier ancestro `aria-hidden="true"` o `inert`, no solo controles que lleven el atributo directamente.
- Commit de foco: `6a8f09c0`; commits de tipos de botón: `3aec61d4`, `bd92143e`, `2de3e581`, `f7e177b6`, `f1dc954a`, `9309efd2`, `0d18e17d`, `3000db29`, `e1b8336e`, `9bfa89e4` y `5f9a377d`.

### Correcciones adicionales de comportamiento modal
- `Informes.jsx`: se detectó que el hook y la ref del diálogo «Detalle de facturación» estaban declarados dentro de `InformeFirmas`, mientras que `modalAbierto` y el diálogo pertenecen a `InformeFacturacion`. Se trasladaron el `useRef` y `useAccessibleDialog` al componente propietario, evitando una referencia fuera de ámbito y asegurando que el foco se gestione en el diálogo correcto.
- `ModalCtnDetalle.jsx`: Escape ya no cierra el detalle CTN mientras se guardan datos bancarios o se procesa una asociación; se conserva la operación en curso y su feedback.
- Commits: `990eb877` (Informes) y `078f9f38` (CTN). Ambos requieren compilación/CI posterior; la prueba interactiva de cierre durante guardado queda pendiente.

### Cierre seguro durante operaciones asíncronas
- `EnviarANotarioModal`: el Escape duplicado manual se retiró; ahora usa un único `useAccessibleDialog` y el callback no cierra mientras `loading` esté activo. Los botones y el clic de fondo ya respetaban el bloqueo.
- `ModalEmpleado`: el hook se trasladó después de los estados y Escape/los dos botones de cierre pasan por un cierre común que bloquea guardado, subida de foto, restablecimiento de contraseña, cambios de visibilidad, asignaciones de notaría y reglas de reparto.
- `ModalCtnDetalle`: el hook se sitúa después de los estados y no permite cerrar mientras se guardan datos bancarios o asociaciones.
- `NotarGest`: el perfil CTN no se cierra mientras se está cambiando la contraseña.
- `ControlFichajesAdmin`: el diálogo de corrección de marcaje no se cierra mientras se guarda el cambio auditado.
- `MensajeriaMolsan` y `MensajeriaSolicitudes`: se bloquea el cierre del formulario/seguimiento mientras se guarda una solicitud o se envía un mensaje.
- `ProvisionesFondosPage`: el diálogo de envío por correo no se cierra durante el envío.
- Se eliminaron los listeners manuales de Escape redundantes en EnviarANotario y ModalEmpleado para que el gestor común sea la única fuente de cierre por teclado.
- Commits de esta corrección: `a52c05c3`, `9528ad4f`, `1e2cf1b6`, `13c0acb6`, `97442a72`, `317f5713` y `21360fd8`.

### Revisión del catálogo de navegación y rutas
- `MODULOS_ERP` contiene 32 claves únicas; no hay claves duplicadas ni rutas reales duplicadas. Las 27 entradas con ruta tienen correspondencia exacta con una declaración `Route` de `App.jsx`; las entradas `route:null` son metadatos internos y no enlaces.
- Se corrigió la etiqueta central `Notargest` a `NotarGest` en `frontend-app/src/config/modulos.js`, para que Sidebar y los espacios de trabajo muestren la marca con capitalización coherente.
- `notificaciones` permanece excluido de los desplegables, manteniendo el acceso por la campana. `mensajeria` y `fichajes` permanecen como accesos directos según la distribución acordada; `mensajeria-gestion` queda en Espacios.
- Commit de catálogo: `9bdfaf24`.

### Último ajuste del gestor de foco
- Se añadió un listener `focusin` al diálogo modal superior: si el foco se desplaza por código o interacción fuera del modal activo, vuelve al primer control disponible. Los diálogos anidados siguen delegando teclado/foco únicamente al modal superior.
- Commit: `9a1eb1e4`.

## Estado de cierre técnico de esta sesión — 30/10/2026
- `useAccessibleDialog` filtra controles invisibles (`visibility:hidden`, `display:none`), deshabilitados, descendientes de `aria-hidden` e `inert`; incluye controles nativos de `details`, audio y vídeo; contiene el foco incluso si otro script intenta moverlo fuera del modal superior; restaura el foco previo al cerrar.
- `ModalEmpleado`, Enviar a notario, CTN, NotarGest, Control de Fichajes, Mensajería y Provisiones bloquean Escape/cierre de interfaz cuando hay una operación de escritura o envío activa. Los cierres de solo lectura permanecen disponibles.
- Se comprobó por análisis estático que el catálogo central tiene 32 claves únicas, 27 rutas reales sin duplicados y todas las rutas tienen declaración exacta en `App.jsx`.
- El catálogo central ya muestra `NotarGest` con la capitalización acordada.
- CI actual del commit `794b69ad`: los cinco workflows (Backend audit, EncargaGest, Post Firma, Fichajes y Control Apoderados) están en estado `queued`; aún no se pueden dar por superados. El último conjunto de cinco workflows confirmado en verde corresponde al commit anterior `20da43cf`, anterior a estas últimas correcciones.
- `frontend-app/package.json` solo define `npm run build` y no define suite de pruebas unitarias frontend. El workflow frontend ejecuta `npm install` y `npm run build`; el workflow Backend audit sí incluye compilación y pruebas unitarias aisladas.
- PR #374 sigue abierta, en borrador y mergeable; rama `molsan-premium-2027-glass-luxe`: 353 commits por delante de `main`, 0 por detrás y 96 archivos modificados. No se ha fusionado ni desplegado.
- No se han ejecutado escrituras en expedientes ni en base de datos productiva. No se ha alterado el servicio Render Live.
- Cierre pendiente antes de declarar la fase técnica completamente validada: esperar el resultado de los cinco workflows de esta última tanda y, posteriormente, QA real en navegador con teclado, zoom y viewports 320/375/768/1024/1440 px. La revisión estática no sustituye esas pruebas.

### Última comprobación de la utilidad de foco y CI
- El filtro del ciclo de foco también excluye elementos con `visibility:hidden`, `display:none` y atributo `disabled`, evitando que el Tab se detenga en controles invisibles o no utilizables. Commit `794b69ad`.
- En la tanda CI asociada a `794b69ad`, el job de sintaxis Python de EncargaGest ya terminó en `success`; su build frontend seguía `in_progress`; Backend audit seguía `in_progress`; los jobs de Fichajes, Post Firma y Control Apoderados seguían `queued`. No se declara el conjunto como verde hasta que todos finalicen.

### Cierre de coherencia entre Sidebar y catálogo central
- Se detectó que `mantenimiento-tecnico` estaba en el Sidebar con ruta/etiqueta locales, pero faltaba en `MODULOS_ERP`. Se añadió al catálogo central con ruta `/herramientas/mantenimiento-tecnico`, permiso `utilidades` e icono `settings`.
- Revisión posterior: 33 claves en el catálogo, sin claves duplicadas; las 22 claves de navegación del Sidebar están cubiertas por el catálogo y las 28 rutas reales del catálogo tienen correspondencia exacta en `App.jsx`.
- Commit: `225a4aa`. Esto elimina la última excepción de navegación detectada en el Sidebar para un módulo con ruta real.

### Unificación definitiva de detección de administrador
- Se encontró que `Sidebar.jsx` mantenía un segundo detector de administrador distinto de `permisos.js`; además repetía el caso `Number(null) === 0` y no reconocía de forma homogénea los roles compuestos.
- Se extrajo `esAdministrador(empleado)` en `permisos.js` y ahora `puedeVerModulo` y Sidebar comparten exactamente el mismo criterio: flags `es_admin`/`is_admin`, rol técnico 0 solo si el ID existe, usuario `admin` y nombres administrativos normalizados.
- Pruebas lógicas: rol 0, `Super Administrador`, `Superadministrador`, `Super Usuario`, flags administrativos y usuario `admin` se reconocen; rol nulo y rol ordinario no reciben privilegios administrativos; `Administración` no se eleva automáticamente.
- Commits: `66ee993e` (helper central) y `2f724b67` (Sidebar). CI pendiente.

### Reanudación tras interrupción de conexión — 30/10/2026

- Se recuperó el estado de la PR #374 sin reiniciar la auditoría: rama `molsan-premium-2027-glass-luxe`, 96 archivos modificados, 362 commits por delante de `main`, 0 por detrás, PR abierta en borrador y mergeable. No se integró ni desplegó.
- Se volvió a comprobar `Informes.jsx`: `useRef` y `useAccessibleDialog` pertenecen a `InformeFacturacion`; la ref `modalFacturacionRef` está conectada al panel real de «Detalle de facturación», que conserva `role=dialog`, `aria-modal=true` y `aria-labelledby`.
- Se endureció `esAdministrador`: el rol técnico 0 solo se acepta para el número entero 0 o la cadena exacta "0" (admitiendo espacios exteriores); identificadores vacíos, nulos, booleanos u otros valores no se convierten en 0. Se normalizan guiones y guiones bajos en los nombres de rol y se reconocen las variantes administrativas compuestas.
- Se revisó el uso común de la función: Sidebar y `puedeVerModulo` comparten el detector central; `RequireModule` protege ApoderaGest y la ruta de liquidaciones mantiene el guard dentro del árbol privado.
- Reescaneo estático de botones en NotarGest, CTN, Informes, Control Apoderados, ApoderaGest, Mensajes, Mensajería Solicitudes y Mensajería Proveedores: tras la corrección no quedan botones sin atributo `type` en esos ocho ficheros. En Mensajería Proveedores se corrigieron el botón «Editar proveedor» (`type=button`) y el botón de alta/guardado del formulario (`type=submit`).
- Commits de esta reanudación: `582c14a2` (detección administrativa) y `95f88f80` (semántica de botones).
- Los cinco workflows asociados al HEAD `95f88f80` finalizaron correctamente: Backend audit, EncargaGest checks, Consolidación Post Firma checks, Validar Fichaje Molsan y Validar Control Apoderados.
- La comparación `main...HEAD` confirma 362 commits por delante y 0 por detrás. PR #374 continúa abierta, en borrador, no fusionada y mergeable.
- Estas comprobaciones son estáticas y de CI. Sigue pendiente el QA real en navegador para probar foco inicial, Tab/Shift+Tab, Escape, restauración de foco, diálogos anidados y tamaños escritorio/tablet/móvil. No se declaran pruebas de navegador que no se hayan ejecutado.

### Ampliación del barrido de botones en rutas y herramientas — 30/10/2026

- Se amplió el barrido estático a los componentes operativos de Expedientes, Empleados, Agenda, Fichajes, ApoderaGest, EncargaGest, CTN, Informes, Mensajería, Seguridad, herramientas, catálogos y panel técnico.
- Se encontraron diez botones sin tipo explícito en `ProvisionesModal.jsx`: cierre del diálogo, pestañas de navegación y acciones del histórico. Todos son acciones que no envían formularios y se declararon `type=button`.
- Se encontró una acción de navegación sin tipo en `Verifacti.jsx`; se declaró `type=button`.
- Se encontró el botón «Guardar honorario» sin tipo explícito en `HonorariosGestoria.jsx`; se declaró `type=submit` por pertenecer al formulario.
- En los restantes archivos JSX inspeccionados no se detectaron botones sin tipo. Un patrón de búsqueda simple produjo un falso positivo en `SelectSJ.jsx` por el operador flecha dentro de un atributo JSX; la inspección del fragmento confirmó que el botón de opción ya declara `type=button`.
- Correcciones añadidas: `6d198c27` (ProvisionesModal), `be2d96b8` (Verifacti) y `c52b8077` (Honorarios Gestoría).
- El barrido sigue siendo estático y no demuestra por sí mismo el comportamiento de envío/cancelación en navegador; la prueba funcional interactiva permanece pendiente.

### Resultado CI tras las correcciones de accesibilidad de herramientas

- Los cinco workflows asociados al último commit funcional `c52b8077` terminaron en `success`: Validar Fichaje Molsan, Consolidación Post Firma checks, Backend audit, EncargaGest checks y Validar Control Apoderados.
- El commit posterior `8305c00e` solo actualiza esta documentación; no modifica código ni requiere una nueva compilación.
- Estado consultado de PR #374: abierta, en borrador, no fusionada, mergeable; rama 367 commits por delante de `main` y 0 por detrás.

### Revisión de rutas, autorización y cascada CSS — 30/10/2026

- Revisión de `App.jsx`: las rutas internas se agrupan bajo `RequireAuth`, por lo que exigen sesión. Sin embargo, el guard `RequireModule` solo aparece explícitamente en la ruta principal de ApoderaGest y en `apoderagest/liquidaciones`; la mayoría de rutas internas (Expedientes, Agenda, Empleados, CTN, Informes, Herramientas, Seguridad, Panel técnico, etc.) no muestran un control de módulo equivalente en el router.
- Sidebar filtra elementos con `puedeVerModulo`, pero ocultar enlaces no constituye protección de navegación directa. No se debe concluir que la API backend esté desprotegida sin auditar sus dependencias/autorización; queda pendiente contrastar permisos de backend y establecer la matriz ruta → módulo/permiso antes de aplicar guards masivos, para no bloquear módulos legítimos ni alterar roles.
- `MODULOS_ERP` es el catálogo de navegación/etiquetas y declara expresamente que no contiene permisos; por tanto, no basta por sí solo para inferir todos los permisos de subrutas internas. Las rutas de utilidades, catálogos, seguridad y panel técnico necesitan una matriz explícita y validada.
- Revisión de la cascada: `main.jsx` importa primero `css/index.css` (Tailwind y estilos SJ heredados), después tokens, design system, tablas y controles, y finalmente `MolsanRedesign2027.css` como capa de armonización. La intención de orden está documentada y es coherente; los CSS locales importados por páginas/componentes deben comprobarse también en el orden final compilado.
- Se detectó deuda de cascada significativa, no un fallo visual confirmado: `MolsanRedesign2027.css` contiene 118 declaraciones `!important`, `NotarGest.css` 83, `PortalProfesionalShared.css` 56 y `SeguridadSubpaginasPremium.css` 19. Hay además reglas de acabado repetidas al final de varias hojas de módulo. No se deben borrar en bloque: algunas protegen estados o neutralizan estilos Tailwind; se requiere consolidar por componente y validar visualmente antes de retirarlas.
- Cobertura responsive estática: las hojas revisadas incluyen breakpoints móviles y tratamiento de tablas desplazables; se encontraron anchos mínimos deliberados de tabla (por ejemplo 620–680 px) dentro de contenedores con scroll horizontal. Esto evita comprimir datos, pero requiere validar que el scroll quede contenido y no desborde la página en 320/375 px.
- El barrido estático de CSS no permite afirmar ausencia de colisiones computadas, solapamientos, clipping ni errores de interacción. QA real en navegador (320, 375, 768, 1024 y 1440 px; teclado, zoom y diálogos) continúa pendiente.

### Contraste adicional con autorización backend

- `backend/app/auth/dependencies.py`: `get_current_user` valida JWT, existencia del empleado y estado activo; devuelve el objeto empleado, pero documenta expresamente que no concede permisos por rol.
- `backend/app/auth/permissions.py`: `require_perm_modulo(usuario, modulo, accion)` exige que la acción esté presente explícitamente en `permisos_modulo_dict[modulo]`; no aplica comodines ni herencia de roles y no contiene bypass automático para administradores.
- Por tanto, el bypass administrativo de `esAdministrador` en frontend no equivale a un bypass en backend. La configuración de permisos de los administradores debe contener las acciones requeridas por los endpoints que utilizan esta dependencia. No se debe cambiar esta política sin confirmar el modelo de SeguridadUsuarios y las asignaciones reales.
- `main.py` registra routers de Expedientes, Agenda, Empleados, Fichajes, CTN, NotarGest, ApoderaGest, Mensajería, Informes, Utilidades y otros; el registro de un router no prueba que todas sus operaciones estén protegidas. Queda pendiente verificar router por router qué endpoints usan `get_current_user`, `require_perm_modulo` o dependencias equivalentes, y cruzarlos con la matriz frontend.
- Resultado: la autenticación general está presente en las rutas privadas del frontend y el backend dispone de autorización explícita por acción; no se declara aún cobertura completa de autorización para todas las rutas/API. Esta es una comprobación prioritaria de cierre.

### Inventario detallado de rutas privadas sin guard de módulo — 30/10/2026

Se volvió a leer el bloque completo de rutas de `App.jsx` (líneas 438–890 en el HEAD revisado). Todas están dentro del layout privado que usa `RequireAuth`, pero la protección por módulo no se aplica de forma general.

- Guard explícito detectado: `apoderagest/liquidaciones` → `RequireModule("apoderagest")`.
- Rutas sin guard de módulo visible en el router: Dashboard, CancelaGest, Fichajes, Control Fichajes, Mensajería, Mensajería Gestión, Control Apoderados administrativo, Agenda (raíz/día/semana/mes), Expedientes (listado/ficha), Provisiones, Catálogo Provisiones, herramientas de configuración/ABSIS/PPAD/Verifacti, CTN (raíz/listado/detalle), Empleados (módulo/listado/ficha/edición), Intranet, Informes (raíz/apartados), Mensajes, Herramientas (raíz e importadores), Utilidades y sus subpantallas, Catálogos y sus subpantallas, Honorarios Gestoría, entidades bancarias, registros, oficinas, acciones y tipos, Logs, Notificaciones, Fusiones, Panel técnico y sus monitores, Maestros, Seguridad y sus subpantallas, Auditoría y alias histórico.
- Riesgo confirmado a nivel de frontend: una persona con sesión válida puede intentar acceder directamente a rutas que el Sidebar no le muestra, porque el router no evalúa de forma uniforme `puedeVerModulo`. El acceso efectivo a datos/operaciones depende además de los permisos de cada endpoint backend; no se infiere una exposición de datos sin esa comprobación.
- No se aplicó un guard masivo como corrección automática: varias rutas secundarias no tienen correspondencia 1:1 obvia con una clave del catálogo (p. ej. Utilidades, Herramientas, Panel Técnico, subrutas de Seguridad, Control Apoderados y alias). Antes hay que definir y contrastar una matriz de acceso por ruta y acción, incluidos los permisos de los roles reales, para evitar conceder acceso por usar una clave demasiado amplia o bloquear operaciones legítimas.
- Criterio de cierre: cada ruta tendrá clave/permiso explícito; alias compartirán la misma política; las rutas administrativas tendrán permiso específico; y el backend seguirá siendo la autoridad final para cada operación. Después se probarán accesos permitidos y denegados con perfiles de prueba.

### Auditoría backend — rutas que carecían de autenticación JWT y corrección aplicada — 30/10/2026

En la revisión directa de los routers montados desde `main.py` se localizaron cinco superficies API cuyo `APIRouter` no declaraba dependencia de autenticación y cuyos endpoints tampoco recibían una dependencia de usuario:

1. `/api/agenda`: búsqueda, consulta, alta, modificación y eliminación de citas.
2. `/api/informes/apoderados`: tabla mensual, ranking e informe individual.
3. `/api/maestros`: lectura y CRUD de departamentos, secciones y cargos.
4. `/api/municipios`: consultas y operaciones del catálogo/importación.
5. `/api/dashboard/expedientes`: indicadores de expedientes y CancelaGest.

Corrección aplicada en la rama de auditoría: se añadió `Depends(get_current_user)` a nivel de router en los cinco módulos, de forma que todas sus rutas exigen una sesión JWT válida. Commits:
- Agenda: `d4944f4b0aac52174e9b2e716645a93dde473027`
- Informes ApoderaGest: `bc15a301acb0844d4393d25f974a7133a534da0c`
- Maestros: `75bc543ca31ee14f8855390f6e87bae3b83170f4`
- Municipios: `8b8f43715408b38536c324c544b4f46bcdf6a941`
- Dashboard Expedientes: `1a61bc2c7e3eed92b0aa5731b3798fd833d0f123`

Alcance y cautela:
- Esto corrige la ausencia de autenticación, no concede ni sustituye permisos por módulo/acción. La autorización granular de Agenda, Informes, Maestros y Municipios debe contrastarse con la matriz real de permisos y las pantallas que los consumen antes de añadir restricciones adicionales.
- El dashboard queda accesible solo a usuarios autenticados; la visibilidad del módulo y el permiso de consulta requieren verificación separada.
- No se han ejecutado peticiones HTTP con perfiles de prueba ni pruebas de regresión tras estos cambios. Deben pasar CI/build y posteriormente pruebas 401 sin sesión, 200 con sesión autorizada y 403 con sesión sin permiso cuando se incorpore autorización granular.
- Se comprobó además que Mensajería Molsan ya aplica comprobaciones explícitas de permiso en cada operación; CTN y Carpetas Digitales declaran autenticación a nivel de router; y los routers de borrado de tablas/restablecimiento de Intranet no registran endpoints destructivos.

### Segunda pasada de routers backend y nuevas correcciones de autenticación — 30/10/2026

Se amplió el muestreo a los routers de catálogos, importadores, expedientes y seguridad. Se localizaron otras rutas sin requisito JWT y se cerraron con dependencias de autenticación a nivel de router, conservando sus prefijos y contratos:

- Fincas y registros del expediente: `backend/app/expedientes/fincasyregistros/router.py`.
- Fusiones: `backend/app/fusiones/router.py`.
- Defectos de expediente: `backend/app/expedientes/defectos/router.py`. Se preservó expresamente el prefijo original `/expedientes`; no se alteran las URLs existentes.
- Catálogo ABSIS: `backend/app/catalogos_absis/router.py`.
- Catálogo de oficinas: `backend/app/oficinas_catalogo/router.py`.
- Entidades bancarias: `backend/app/entidades_bancarias/router.py`.
- Registros de la Propiedad: `backend/app/registros_propiedad/router.py`.
- Oficinas liquidadoras: `backend/app/oficinas_liquidadoras/router.py`.
- Tipos de concepto de gastos: `backend/app/tipos_concepto_gastos/router.py`.
- Tipos de expediente: `backend/app/tipos_expediente/router.py`.
- Acciones de expediente y asignaciones de acciones: `backend/app/acciones_expediente/router.py` y `backend/app/expediente_acciones/router.py`.
- Tipos de carga hipotecaria: `backend/app/tipos_carga_hipotecaria/router.py`.
- Importador ABSIS de expedientes: `backend/app/Utilidades/importadores/router_absis.py`.

Hallazgo adicional de prioridad alta: el endpoint heredado `POST /api/seguridad/asignar/empleado/{empleado_id}/password` permitía restablecer contraseñas sin autenticación ni permiso. Se ha protegido con sesión JWT y permiso explícito `seguridad.editar` en `backend/app/seguridad/asignar_password_router.py`.

Límites de esta corrección:
- Las dependencias añadidas garantizan autenticación; no equivalen a autorización por módulo/acción en todos los routers. En particular, Maestros, Municipios, Dashboard, Agenda, Informes ApoderaGest, Fusiones, Fincas, Defectos y varios catálogos aún necesitan contrastar el permiso funcional correcto con SeguridadUsuarios antes de restringir por acción.
- Los routers de gastos de expediente y proceso ABSIS exigen JWT en sus endpoints, pero la revisión granular de permiso/ámbito de expediente continúa abierta.
- No se ha modificado ninguna asignación de permisos de empleados ni se ha concedido bypass administrativo.

### Incidencia CI de instalación de Rollup — 30/10/2026

Los workflows de frontend fallaron después de instalar dependencias porque faltaba el paquete opcional nativo de Rollup para Linux `@rollup/rollup-linux-x64-gnu`. Los logs muestran que la compilación no llegó a analizar el código de la aplicación; el backend sí superó `compileall` y el workflow de auditoría ejecutó 84 tests y 21 subtests satisfactoriamente antes de quedar cancelado por la concurrencia de ejecuciones.

Se actualizó la instalación de dependencias para incluir explícitamente las dependencias opcionales en:
- `.github/workflows/frontend-build.yml`
- `.github/workflows/validar-fichajes.yml`
- `.github/workflows/control-apoderados-ci.yml`
- `.github/workflows/encargagest-checks.yml`
- `.github/workflows/consolidacion-postfirma-checks.yml`

La solución está aplicada en la rama, pero queda pendiente confirmar un nuevo build verde con los workflows reejecutados. No se considera resuelta hasta esa comprobación.

### Endpoints auxiliares y migraciones de esquema — ampliación 30/10/2026

La revisión de endpoints auxiliares detectó que `POST /api/mantenimiento-defectos/crear-tablas` podía ejecutar DDL sin identidad ni autorización. Se ha añadido autenticación JWT y exigencia de `seguridad.editar` en `backend/app/expedientes/defectos/migracion_router.py`. La migración de gastos ya tenía protección equivalente y se mantiene.

También se revisaron:
- WebSocket Realtime: valida token, identidad del empleado y permisos antes de aceptar; no confía en el usuario/grupo enviado por el cliente.
- WebSocket de Agenda y Mensajes: valida token y permiso de módulo/acción.
- Notificaciones WebSocket: valida token y que el empleado solicitado coincida con la identidad autenticada.
- Documentos y noticias de Intranet: requieren JWT y aplican la política de permisos de Intranet.
- El endpoint GET de diagnóstico `/api/ws/notificaciones/test` no exige JWT, pero únicamente devuelve `{"status":"ok"}`, sin datos de negocio ni identificadores; se considera diagnóstico inocuo, no acceso a información privada.

La matriz de autorización sigue separando autenticación (JWT), permiso funcional por módulo/acción y ámbito de expediente. No se da por cerrada la autorización integral hasta verificar cada endpoint y sus permisos concretos.

### Cascada CSS — colisión localizada en NotarGest — 30/10/2026

Se contrastó la secuencia real de imports de `NotarGest.jsx`: primero `PortalProfesionalShared.css` y después `NotarGest.css`. Ambas hojas definen `.notargest .ng-tabla` con anchuras mínimas distintas (1450px en la compartida y 760px en la local). Por el orden de importación, la regla local de NotarGest prevalece cuando ambas reglas están en la misma capa/origen y no hay una regla posterior de mayor prioridad. No se cambia: parece una especialización deliberada del portal, pero debe verificarse en navegador que el scroll horizontal queda dentro de `.ng-tabla-contenedor` y no ensancha la página.

También se encontró una regla global posterior en `MolsanRedesign2027.css` para `.notargest .ng-tabla td`, limitada al color del borde y marcada `!important`. Es una armonización de borde, no una redefinición de anchura ni un conflicto visual probado. Se mantiene hasta comprobar el resultado real.

### Protección de navegación frontend por módulo — corrección aplicada — 30/10/2026

Se ha cerrado el hallazgo de navegación directa en `frontend-app/src/App.jsx` mediante el helper `protegerModulo`, que reutiliza `RequireModule` y el mismo `puedeVerModulo` que alimenta el Sidebar.

- Se han añadido guards por clave de módulo a las rutas privadas de Dashboard, CancelaGest, Fichajes, Control de Fichajes, Mensajería, Agenda, Expedientes, Provisiones, CTN, Empleados, Intranet, Informes, Mensajes, Herramientas/Utilidades, Catálogos, Fusiones, Panel Técnico, Maestros, Seguridad y Auditoría, además de sus subrutas.
- Las pantallas de configuración de permisos/visibilidad se vinculan a Seguridad; las rutas de mantenimiento técnico a su módulo específico; el Control Apoderados administrativo a ApoderaGest.
- La ruta de liquidaciones de ApoderaGest conserva su guard explícito previo.
- Recuento estático posterior: 90 de 90 rutas dentro del grupo privado tienen guard de módulo. La ruta `/notificaciones` usa la clave de permiso `notificaciones` aunque no se incorpora al catálogo de navegación, manteniendo la preferencia de no mostrarla como elemento de menú (el acceso ordinario sigue siendo el icono de notificaciones).
- Las rutas de portales externos NotarGest/EncargaGest, que se encuentran fuera del grupo privado y tienen su propio flujo de autenticación de portal, no se han alterado.

La protección de rutas frontend complementa, pero no sustituye, los permisos del backend. Quedan pruebas con perfiles reales para verificar que la lista de módulos visibles y los permisos asignados producen los 200/403 esperados y no bloquean módulos legítimos.

### Revalidación CI tras las correcciones — 30/10/2026

La ejecución asociada al commit `423144ec36bff7adead6750d5203577f57bac038` finalizó correctamente en los cinco workflows:
- Validar Fichaje Molsan: success.
- Validar Control Apoderados: success.
- EncargaGest checks: success.
- Consolidación Post Firma checks: success.
- Backend audit: success; `compileall` correcto y `84 passed, 1 warning, 21 subtests passed`.

Esta ejecución ya incluye las correcciones backend de autenticación y el cambio de instalación de dependencias opcionales. Después se incorporaron los guards de rutas frontend; sus cinco workflows se han lanzado de nuevo para el commit `c0945ef78ed3d0f7aef0315a907220b2ff550d64` y estaban en curso en el momento de esta anotación. No se declara todavía la última ejecución como verde.

### Resultado de la última ronda de CI — 30/10/2026

La ejecución del commit `c0945ef78ed3d0f7aef0315a907220b2ff550d64`, que contiene los guards de rutas privadas y la limpieza del helper de rutas, terminó así:
- Validar Fichaje Molsan: success.
- Validar Control Apoderados: success.
- EncargaGest checks: success.
- Consolidación Post Firma checks: success.
- Backend audit: cancelled por concurrencia de ejecuciones.

El backend audit del commit anterior `423144ec36bff7adead6750d5203577f57bac038`, que ya contenía todos los cambios backend de esta auditoría, sí terminó en success con `compileall` y 84 tests + 21 subtests satisfactorios. No se han introducido cambios backend después de ese commit. Por tanto, el resultado backend válido sigue siendo verde; la cancelación posterior no indica fallo de código.

### Accesibilidad de diálogos — revisión ampliada de integración — 30/10/2026

Se verificó la integración de `useAccessibleDialog` en los diálogos operativos más relevantes, comprobando refs, `role="dialog"`, `aria-modal`, nombre accesible y `tabIndex=-1` en el contenedor enfocable:

- Ficha de Informes: Detalle de facturación.
- Expedientes: Envío a notario, Liquidar expediente y vista previa, Carpeta Digital y visor, Provisiones y Traspaso de saldo.
- CTN: ficha/detalle de notaría.
- Empleados: ficha modal.
- Catálogo ABSIS: alta de categoría y entrada.
- Catálogos de Municipios, Entidades Bancarias, Registros de la Propiedad y Oficinas Liquidadoras: diálogos de importación/edición.
- ApoderaGest: grupo de encargos y resumen.
- NotarGest: avisos, pagos, perfil de notario y resumen de expedientes.
- EncargaGest: alta, edición, incidencia, perfil y accesos de notaría.
- Control Apoderados: listado de firmas.

El hook implementa foco inicial, ciclo Tab/Shift+Tab, Escape solo en el diálogo superior y restauración del foco previo, permitiendo diálogos anidados. La revisión estática no sustituye la prueba real con teclado/lector de pantalla: quedan por verificar en navegador el orden de foco, la interacción con overlays anidados, el scroll del documento, zoom y lectores de pantalla.

### Responsive de tablas operativas — contraste estático adicional — 30/10/2026

Se verificaron los contenedores de las tablas que conservan anchuras mínimas elevadas:
- Control de Fichajes: tabla de 1250px dentro de un contenedor `overflow-x-auto`, con `max-width:100%`, `overscroll-behavior-x:contain` y desplazamiento táctil.
- Control Apoderados: tabla de 1250px dentro de `overflow-x-auto`.
- Importador Post Firma: tabla `min-w-max` dentro de contenedor `overflow-auto`; el ancho se desplaza dentro del panel de informe.
- NotarGest: tablas de ancho extenso dentro de `.ng-tabla-contenedor` con scroll horizontal; la hoja local define 760px y prevalece sobre el mínimo de la hoja compartida por orden de importación.

No se elimina el ancho mínimo: preserva la lectura de columnas. El punto pendiente es comprobar visualmente en navegador a 320/375px que el scroll queda confinado al contenedor y no produce desplazamiento horizontal del documento completo.

### Agenda — permisos de acción aplicados en backend — 30/10/2026

El frontend de Agenda ya distinguía explícitamente `agenda.ver`, `agenda.crear`, `agenda.editar` y `agenda.eliminar`, pero el router backend solo exigía JWT. Se ha alineado la API con ese contrato:
- Lecturas, búsqueda, consulta diaria/semanal/mensual y diagnóstico: `agenda.ver`.
- Alta: `agenda.crear`.
- Edición y movimiento: `agenda.editar`.
- Borrado: `agenda.eliminar`.

La comprobación se aplica en cada endpoint mediante `require_perm_modulo`; no se concede permiso por rol ni por ser administrador. Esto cierra la diferencia entre los controles de botones del frontend y la autorización real del servidor. Las asignaciones efectivas deben probarse con perfiles de prueba antes de desplegar.

### Ámbito de reparto por expediente — correcciones backend — 30/10/2026

Se ha extendido el control de visibilidad del expediente a los routers auxiliares que reciben su identificador por URL. Antes exigían JWT, pero su router no aplicaba el mismo guard de reparto que el router principal de Expedientes:

- Gastos y pagos: `backend/app/expedientes/gastos/router.py`.
- Fincas y registros: `backend/app/expedientes/fincasyregistros/router.py`.
- Defectos e historial: `backend/app/expedientes/defectos/router.py`.
- Carpeta Digital y descargas: `backend/app/carpeta_digital/router.py`.
- PPAD: `backend/app/expediente_ppad/router.py`.
- Provisiones: `backend/app/provisiones/router.py`; las rutas de provisiones independientes conservan el bypass previsto por el helper compartido.
- Observaciones: `backend/app/expediente_observaciones/router.py` usa su autenticación JWT específica y ahora valida el empleado contra `validar_acceso_candidatos_expediente` antes de operar sobre el expediente.

El guard compartido valida solo el expediente solicitado, devuelve 404 para referencias fuera del ámbito y conserva el criterio central de administradores/empleados con reglas de reparto. Traspasos de saldo ya calculaba `ids_expedientes_visibles` en sus operaciones y se mantiene.

No se han cambiado reglas de reparto ni asignaciones de empleados. Queda validar con perfiles de prueba: empleado con expediente asignado, empleado sin asignación y administrador con permisos explícitos.

### Autorización funcional adicional — Agenda, informes, Dashboard y ABSIS — 30/10/2026

Se alinearon permisos de acción del backend con las operaciones expuestas:
- Agenda: `agenda.ver/crear/editar/eliminar` por endpoint, según lectura, alta, modificación/movimiento y borrado.
- Informes ApoderaGest y firmas/notarios: `informes.ver`; la modificación de datos de firma exige además `expedientes.editar`.
- Dashboard: `dashboard.ver`.
- Proceso ABSIS: lecturas/exportación con `utilidades.ver`; alta, borrado, reintento y cambio de estado con `utilidades.editar`.
- Importación ABSIS de expedientes: `utilidades.editar`.

No se ha extendido indiscriminadamente el control de acciones a todos los catálogos auxiliares: Maestros, Municipios y varios catálogos todavía tienen endpoints autenticados cuya autorización de escritura no está unificada con el modelo acción-permiso. Se mantiene como deuda de autorización para revisar con la matriz real de SeguridadUsuarios y el uso de cada pantalla, en lugar de asignar una acción por intuición.

### CI final tras la revisión de ámbitos y permisos — 30/10/2026

La ejecución del commit `79180ca9a18b63bde61b879734cf50e1e38a8f4f` terminó con los cinco workflows en success:
- Backend audit: `compileall` correcto; `84 passed, 1 warning, 21 subtests passed`.
- Validar Fichaje Molsan: success.
- Validar Control Apoderados: success.
- EncargaGest checks: success.
- Consolidación Post Firma checks: success.

Este commit incluye las correcciones de autenticación, visibilidad de expedientes en routers auxiliares, permisos de Agenda/Informes/Dashboard/ABSIS y guards de las rutas privadas frontend. No hay cambios de código posteriores a ese commit en la rama; las anotaciones posteriores son únicamente documentación/PR.

### Operaciones técnicas/destructivas — comprobación de cierre — 30/10/2026

- `/debug/*`: solo lectura; exige JWT, `seguridad.editar` e identidad administradora. No ejecuta DDL ni devuelve filas de negocio.
- Router de borrado de roles: deshabilitado; no registra operación DROP TABLE.
- Router de borrado de tablas: deshabilitado.
- Router de reset de Intranet: sin endpoints destructivos registrados.
- Herramientas de creación de tablas: router desactivado; DDL de producción reservado a migraciones revisadas.
- Migraciones de gastos y defectos: autenticación y permiso explícito `seguridad.editar`.

No se han ejecutado ni solicitado acciones destructivas ni cambios sobre datos reales durante esta auditoría.

### Detección administrativa — excepción localizada en Tipos Impositivos — 30/10/2026

Se detectó que `backend/app/tipos_impositivos/router.py::_admin` autoriza únicamente por nombre de rol en una lista cerrada (`admin`, `administrador`, `superadmin`, etc.). No utiliza el mismo criterio central de permisos de seguridad ni contempla explícitamente usuario `admin`, `rol_id=0` o flags administrativos. Puede producir un falso negativo si la cuenta administradora se identifica por otro atributo, aunque el resto del sistema la reconozca.

No se ha cambiado este guard sin confirmar la política que debe gobernar el mantenimiento del catálogo de impuestos. Queda como ajuste puntual pendiente: unificarlo con el criterio administrativo backend aprobado, manteniendo el requisito de permiso de mantenimiento y sin conceder privilegios por nombre de usuario no verificado.
### Hallazgos adicionales de autorización en acciones y defectos — 30/10/2026

La revisión endpoint por endpoint ha detectado tres huecos que no quedaban cubiertos por el guard de ámbito genérico:

- Catálogo de subtipos de defectos (`backend/app/expedientes/defectos/router.py`): al no llevar ID de expediente en la URL, el guard de reparto no aplicaba autorización funcional. Se ha añadido `expedientes.ver` a la consulta y `expedientes.editar` a alta, modificación y desactivación.
- Catálogo de acciones (`backend/app/acciones_expediente/router.py`): las operaciones de lectura y mantenimiento solo exigían JWT. Ahora requieren, respectivamente, `expedientes.ver` y `expedientes.editar`, incluida la importación Excel.
- Acciones asignadas a expedientes (`backend/app/expediente_acciones/router.py`): el listado, la asignación y las operaciones por ID de relación no comprobaban de forma uniforme el ámbito del expediente. Ahora cada operación resuelve el expediente real asociado y aplica `validar_acceso_candidatos_expediente`; la lectura exige `expedientes.ver` y las modificaciones `expedientes.editar`.

Se ha añadido `backend/tests/test_permission_contract.py` para comprobar que el permiso es exacto por módulo/acción, que la ausencia devuelve 403 y que los comodines no sustituyen permisos explícitos.

La ejecución del commit `5fdfa830444de37830bba0b21b3fd845af530aac` terminó con los cinco workflows en success. Backend audit: `compileall` correcto y `92 passed, 1 warning, 21 subtests passed`. La primera ejecución de EncargaGest detectó que el nuevo test dependía de `pytest`, que ese workflow no instala; se cambió el test a `unittest` y la siguiente ejecución completa quedó verde.

La revisión de autorización sigue sin considerarse integralmente cerrada: Maestros, Municipios y varios catálogos auxiliares continúan pendientes de contrastar con la matriz real de SeguridadUsuarios. No se han inventado permisos ni se han modificado asignaciones de empleados.
El test `backend/tests/test_permission_contract.py` usa ahora exclusivamente `unittest`, compatible con todos los workflows que ejecutan la suite compartida.

Los cambios backend de esta última ronda están validados por CI en `5fdfa83`. La documentación de esta auditoría se actualiza en un commit posterior sin modificar código backend.
### Aclaración del estado actual de autorización global — 30/10/2026

Las notas de la primera ronda que identificaban catálogos y routers pendientes de autorización describen el estado histórico previo al guard global. La revisión posterior de `backend/app/auth/route_guard.py` confirma que las rutas HTTP privadas de `/api` reciben JWT y un permiso explícito por módulo/acción según el método HTTP; los portales NotarGest y EncargaGest mantienen su autenticación y autorización propias.

Las pruebas `test_all_protected_api_routes_have_a_module_mapping` y `test_all_case_id_routes_have_visibility_guard` verifican la cobertura de las rutas privadas y de las rutas que reciben identificadores de expediente. En la última ejecución se revisaron 490 rutas HTTP y las comprobaciones de cobertura terminaron correctamente.

Por tanto, la deuda pendiente ya no es la ausencia general de un guard granular en Maestros/Municipios/catálogos: es validar con perfiles de prueba reales que las asignaciones de SeguridadUsuarios para cada módulo/acción corresponden al trabajo de cada puesto y producen 200/403 correctos. No se han consultado ni modificado asignaciones reales desde producción.
### Revisión final de guards de rutas frontend — 30/10/2026

Se compararon las claves usadas por `RequireModule` en `App.jsx` con el catálogo central `MODULOS_ERP` y los permisos alternativos declarados para cada módulo. Se detectó una discrepancia en la ruta `/herramientas/mantenimiento-tecnico`: el menú la mostraba usando `utilidades`, pero la ruta la comprobaba con la clave `mantenimiento-tecnico`. Se ha alineado el guard de ruta con `utilidades`, que es el permiso central definido en el catálogo, para evitar que un usuario vea el acceso en el menú y sea redirigido al entrar.

Se confirma que `notificaciones` conserva una ruta directa protegida por su permiso, pero no se añade como entrada de navegación; las notificaciones siguen accesibles desde el control de campana, según el criterio de navegación establecido.

Limitación de QA: no hay una herramienta de navegador interactivo disponible en esta sesión. Por ello, las pruebas de foco/teclado, diálogos anidados, scroll y responsive real a 320/375 px no se declaran ejecutadas. El análisis de CSS, rutas y componentes es estático; la compilación CI valida sintaxis y build, no el render ni la interacción real.
### Validación CI posterior al ajuste de ruta — 30/10/2026 19:45 UTC

El commit de código `4ae77f4ad4a0432a5277671ea4d8aee22954f5ce` terminó con seis workflows correctos: `Molsan frontend build`, `Backend audit`, `Validar Fichaje Molsan`, `Validar Control Apoderados`, `EncargaGest checks` y `Consolidación Post Firma checks`.

El frontend completó instalación, compilación completa y publicación del artefacto de previsualización. Backend audit ejecutó `compileall` y terminó con `92 passed, 1 warning, 21 subtests passed` usando SQLite aislado, sin conexión a la base de datos de producción. EncargaGest también importó la aplicación FastAPI completa y compiló frontend y backend.

El commit posterior `3c0a880` contiene únicamente documentación de auditoría. No modifica código funcional ni requiere repetir la validación de build.