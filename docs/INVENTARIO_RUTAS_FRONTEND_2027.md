# Inventario de rutas frontend — MOLSAN ERP PREMIUM 2027

**Fuente:** `frontend-app/src/App.jsx` en `fix/molsan-css-selector-audit-round1`  
**Alcance:** declaraciones `Route` encontradas en el árbol actual; no equivale a páginas visuales ni incluye modales internos.

## Recuento

- **110 elementos `Route`**.
- **109 rutas con atributo `path`**: 108 rutas concretas y una ruta comodín (`*`).
- **1 ruta índice** (sin atributo `path`).
- **110 valores de ruta/índice únicos** en este árbol; no se detectaron duplicados literales.
- Existen rutas dinámicas como `:id` y `:apartado`, alias de compatibilidad y variantes externas. Una misma página/componente puede atender varias rutas; una ruta puede además mostrar subpestañas o modales que no aparecen aquí.

## Notas de protección

- La ruta raíz privada `/` envuelve `Layout` con `RequireAuth` y sirve de padre a las rutas operativas.
- Las rutas hijas heredan autenticación desde ese padre; las que muestran `RequireModule` o `protegerModulo` añaden el control de módulo.
- Los cinco accesos de portal externo se identifican expresamente como rutas sin `RequireAuth` en App. No se cambian porque forman parte del acceso externo previsto; su control específico debe verificarse dentro del propio portal.
- `/login` es público y `*` redirige a login.
- El acceso de demostración de FichaExpediente y la ruta de importaciones de datos heredan autenticación del padre, aunque no muestran un control de módulo en su propio elemento.

## Rutas

| # | Ruta | Grupo | Protección observada |
|---:|---|---|---|
| 1 | `/login` | Autenticación | Acceso público al login |
| 2 | `modulos` | Ruta privada independiente | Guard explícito en el elemento |
| 3 | `apoderagest` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 4 | `encargagest` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 5 | `encargagest/notario` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 6 | `encargagest/ctn` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 7 | `encargagest/agenda` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 8 | `encargagest/mensajes` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 9 | `encargagest/intranet` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 10 | `notargest` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 11 | `notargest-notario` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 12 | `notargest-notarios` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 13 | `encargagest-notario` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 14 | `encargagest-notarios` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 15 | `notargestweb` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 16 | `encargagestweb` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 17 | `/` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 18 | `(index)` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 19 | `dashboard` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 20 | `cancelagest` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 21 | `fichajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 22 | `control-fichajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 23 | `mensajeria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 24 | `mensajeria-gestion` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 25 | `apoderagest/liquidaciones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 26 | `herramientas/utilidades/control-apoderados` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 27 | `agenda` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 28 | `agenda/dia` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 29 | `agenda/semana` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 30 | `agenda/mes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 31 | `expedientes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 32 | `expedientes/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 33 | `expedientes-demo-glass-luxe` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 34 | `provisiones-fondos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 35 | `catalogos/provisiones-fondos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 36 | `herramientas/utilidades/visibilidad-tablas` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 37 | `herramientas/utilidades/asignaciones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 38 | `herramientas/utilidades/complementos-saldo` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 39 | `herramientas/utilidades/proceso-absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 40 | `herramientas/utilidades/ppad` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 41 | `herramientas/utilidades/verifacti` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 42 | `ctn` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 43 | `ctn/listado` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 44 | `ctn/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 45 | `empleados` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 46 | `empleados/listado` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 47 | `empleados/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 48 | `empleados/:id/editar` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 49 | `intranet` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 50 | `informes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 51 | `informes/:apartado` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 52 | `mensajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 53 | `herramientas` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 54 | `herramientas/importar-ctn` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 55 | `herramientas/municipios` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 56 | `herramientas/importador-absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 57 | `herramientas/importador-absis/postfirma` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 58 | `herramientas/importaciones-datos` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 59 | `herramientas/utilidades` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 60 | `herramientas/utilidades/modelos-documentos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 61 | `herramientas/utilidades/reglas-actividades-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 62 | `herramientas/utilidades/datos-molsan` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 63 | `herramientas/utilidades/alta-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 64 | `herramientas/utilidades/lectura-copias` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 65 | `herramientas/utilidades/cambios-actividad-absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 66 | `herramientas/utilidades/lectura-cancela-i` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 67 | `herramientas/utilidades/accesos-notariales` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 68 | `catalogos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 69 | `catalogos/absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 70 | `catalogos/oficinas` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 71 | `catalogos/tipos-impositivos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 72 | `catalogos/fichajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 73 | `catalogos/mensajeria-servicios` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 74 | `catalogos/firmas-email` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 75 | `catalogos/correspondencia-tipificada` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 76 | `herramientas/utilidades/correspondencia-tipificada` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 77 | `herramientas/honorarios-gestoria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 78 | `herramientas/entidades-bancarias` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 79 | `herramientas/registros-propiedad` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 80 | `herramientas/oficinas-liquidadoras` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 81 | `herramientas/acciones-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 82 | `herramientas/tipos-carga-hipotecaria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 83 | `herramientas/tipos-concepto-gastos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 84 | `herramientas/tipos-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 85 | `herramientas/utilidades/crear-noticia` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 86 | `herramientas/utilidades/subir-documento` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 87 | `herramientas/mantenimiento-tecnico` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 88 | `herramientas/utilidades/cambiar-gestor` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 89 | `herramientas/utilidades/reasignar-notario` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 90 | `herramientas/utilidades/asignar-promociones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 91 | `logs` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 92 | `notificaciones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 93 | `/fusiones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 94 | `paneltecnico` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 95 | `paneltecnico/monitor-sistema` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 96 | `paneltecnico/monitor-realtime` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 97 | `maestros` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 98 | `paneltecnico/auditoria-avanzada` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 99 | `paneltecnico/logs-avanzados` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 100 | `seguridad` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 101 | `seguridad/usuarios` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 102 | `seguridad/roles` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 103 | `seguridad/modulos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 104 | `seguridad/permisos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 105 | `seguridad/ficha/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 106 | `seguridad/logs` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 107 | `seguridad/roles/editor` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 108 | `auditoria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 109 | `seguridad/auditoria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 110 | `*` | Fallback | Redirige a /login |

## Interpretación del inventario anterior de 98

El número 98 no debe compararse directamente con las declaraciones de `Route`: hay 110 elementos de ruta, 109 paths, aliases, rutas dinámicas y una ruta índice. Para reconciliar 98 pantallas hay que agrupar estas rutas por componente/pantalla y sumar por separado subpáginas internas y modales. Este documento registra rutas; no afirma que existan 110 pantallas distintas ni que todos los modales estén inventariados.

