# Comprobación final de aceptación — Fases 1 y 2

**Preview:** https://molsan-glass-luxe-preview.onrender.com  
**Rama:** `molsan-premium-2027-glass-luxe`  
**Alcance:** lenguaje visual común y homogeneización transversal. No incluye Fase 3 ni ordenación funcional de tablas.

## Qué está implantado

- Paleta corporativa Molsan, tipografía y superficies comunes.
- Cabeceras y tarjetas con lenguaje visual compartido.
- Filtros y formularios: controles, etiquetas, bordes, foco y estados deshabilitados.
- Botones: geometría, jerarquía visual, foco, hover y deshabilitado, conservando su semántica funcional.
- Tablas: cabeceras, separadores, hover, densidad y contenedores responsive. No se simula ordenación.
- Diálogos: superficies, tipografía, controles, scroll interno y gestión accesible del foco en los modales operativos revisados.
- Excepciones preservadas: navegación/estilos del Sidebar, perfil de empleado abierto desde el Sidebar y diálogo de notificaciones.

## Rutas para la comprobación visual

Marcar cada bloque después de abrirlo en Preview y revisar su estado normal, hover, foco y deshabilitado cuando proceda.

- [ ] Dashboard.
- [ ] CTN: listado y detalle.
- [ ] Expedientes: listado.
- [ ] FichaExpediente: Documentación previa, Sede notarial, Gestión económica, Liquidación, Inscripción, Defectos y Cierre.
- [ ] ApoderaGest y Control de Apoderados.
- [ ] NotarGest.
- [ ] CancelaGest.
- [ ] Seguridad: usuarios, roles, permisos y ficha de empleado.
- [ ] Empleados: listado, ficha y perfil propio.
- [ ] Mensajería: Molsan, proveedores y solicitudes.
- [ ] Fichajes y Control de Fichajes.
- [ ] Provisiones de fondos.
- [ ] Informes.
- [ ] Herramientas y utilidades: catálogos, municipios, oficinas, entidades y mantenimiento.

## Diálogos prioritarios

- [ ] Detalle CTN.
- [ ] Alta/edición de citas y formularios de agenda.
- [ ] Enviar a notario (modal y modo embebido).
- [ ] Carpeta digital.
- [ ] Liquidar expediente y traspaso de saldo.
- [ ] Provisiones.
- [ ] Visibilidad de tablas.
- [ ] Ficha de empleado y perfil abierto desde Sidebar.
- [ ] Diálogos de configuración en NotarGest, EncargaGest, ApoderaGest, Mensajería, Informes y Catálogos.

## Criterios visuales de aceptación

- [ ] Fondo blanco `#FFFFFF`, panel secundario `#F2F7FB`, cabeceras de tabla `#EAF2F8`, borde `#D8E4EC`, azul corporativo `#064675` y texto secundario `#617789`.
- [ ] La tipografía, el tamaño de cabeceras y la densidad se perciben consistentes entre módulos.
- [ ] Los filtros forman una barra equilibrada; no aparecen tarjetas innecesarias alrededor de cada campo.
- [ ] Los formularios mantienen alineación, etiquetas legibles, controles de altura uniforme y errores visibles.
- [ ] Los botones primarios/secundarios/destructivos se distinguen sin perder los colores semánticos de estado.
- [ ] Las tablas conservan lectura, scroll horizontal local y cabeceras consistentes.
- [ ] Los diálogos mantienen cabecera/pie, scroll interno y no quedan cortados por la ventana.
- [ ] No aparecen solapamientos, saltos de anchura ni scroll horizontal de página inesperado.
- [ ] Sidebar, menús, hover, campana y perfil conservan su aspecto anterior.

## Pruebas de interacción

- [ ] En cada diálogo operativo, Tab y Mayús+Tab permanecen dentro del diálogo.
- [ ] Escape cierra el diálogo cuando no hay una operación bloqueante.
- [ ] Al cerrar, el foco vuelve al control que abrió el diálogo.
- [ ] Los controles deshabilitados y los errores de validación siguen siendo distinguibles.
- [ ] En ventanas estrechas, el contenido se adapta y el scroll permanece dentro del panel.

## Límites expresos

- No reorganizar tarjetas, KPIs, paneles ni bloques: corresponde a Fase 3.
- No añadir ordenación ficticia. La ordenación real de todas las columnas queda para la auditoría específica de backend, endpoints y paginación.
- No modificar producción, rama `main`, backend, APIs, permisos ni base de datos.
- La revisión de código y la compilación no sustituyen la aceptación visual en navegador. La casilla de cierre definitivo debe marcarse tras comprobar el Preview real.
