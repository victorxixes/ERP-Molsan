# Auditoría de Catálogos y Maestros — ERP-Molsan

**Estado:** inventario inicial en curso.  
**Repositorio:** `victorxixes/ERP-Molsan`  
**Rama de auditoría:** `audit/catalogos-maestros-2026-10`  
**Alcance de esta entrega:** lectura del código y localización inicial de catálogos existentes. No se han modificado tablas ni lógica de negocio.

## 1. Hallazgos confirmados

### 1.1 Central de Catálogos existente
Archivo: `frontend-app/src/pages/herramientas/Catalogos.jsx`

La pantalla ya actúa como índice de acceso a nueve áreas:

1. Entidades bancarias.
2. Municipios.
3. Registros de la Propiedad.
4. Oficinas liquidadoras.
5. Honorarios de gestoría.
6. Tipos de carga hipotecaria.
7. Tipos de conceptos de gastos.
8. Maestros generales.
9. Acciones del expediente.

Agrupa las tarjetas en datos territoriales/entidades, catálogos económicos y catálogos operativos. De momento es una central de enlaces: no mantiene un registro universal ni ofrece por sí misma CRUD común para todas las categorías. Las pantallas enlazadas mantienen sus propias rutas y fuentes de datos.

### 1.2 Maestros generales existentes
Frontend: `frontend-app/src/pages/maestros/Maestros.jsx`  
API frontend: `frontend-app/src/api/maestros.js`  
Backend: `backend/app/maestros/router.py`, `models.py`, `service.py`, `schemas.py`

El módulo general de Maestros administra tres tipos:

- Departamentos.
- Secciones.
- Cargos.

Las operaciones disponibles son listar, consultar uno, crear, editar y eliminar. El backend usa modelos/tablas separados (`departamentos`, `secciones`, `cargos`) con un campo `nombre` único a nivel de modelo/tabla.

**Riesgo que requiere revisión:** la operación de eliminación hace un borrado físico. Antes de ampliarla o reutilizarla, hay que comprobar sus relaciones y valorar desactivación lógica cuando los registros puedan estar referenciados. También hay que verificar el control efectivo de permisos y autenticación del router, porque el archivo del router no declara explícitamente una dependencia de usuario autenticado en cada endpoint.

### 1.3 Catálogos con módulos dedicados
El repositorio tiene pantallas y módulos backend específicos para, al menos:

- Entidades bancarias: `frontend-app/src/pages/herramientas/EntidadesBancarias.jsx`, `backend/app/entidades_bancarias/`.
- Municipios: `.../Municipios.jsx`, `backend/app/municipios/`.
- Registros de la Propiedad: `.../RegistrosPropiedad.jsx`, `backend/app/registros_propiedad/`.
- Oficinas liquidadoras: `.../OficinasLiquidadoras.jsx`, `backend/app/oficinas_liquidadoras/`.
- Tipos de carga hipotecaria: `.../TiposCargaHipotecaria.jsx`, `backend/app/tipos_carga_hipotecaria/`.
- Tipos de conceptos de gastos: `.../TiposConceptoGastos.jsx`, `backend/app/tipos_concepto_gastos/`.
- Acciones del expediente: `.../AccionesExpediente.jsx`, `backend/app/acciones_expediente/`.
- Honorarios de gestoría: `.../HonorariosGestoria.jsx`, `backend/app/honorarios_gestoria/`.
- Provisiones y cancelaciones: `backend/app/provisiones/`, con lógica de tarifas y cálculos que debe tratarse como sensible.
- Notarías/CTN: `backend/app/ctn/`, con su propio catálogo y relaciones.

Estos módulos deben conservar sus esquemas y reglas específicas. No se debe crear una segunda tabla genérica para reemplazar los registros que ya administran.

### 1.3.1 Primeras comprobaciones de los modelos
La lectura inicial de los modelos confirma que hay campos de mantenimiento ya disponibles:

- `entidades_bancarias`: código europeo, LEI, nombre, categoría, dirección, relación `entidad_actual_id` y campo `activo`; existe restricción única para código europeo.
- `municipios`: comunidad autónoma, provincia, municipio y `activo`, con restricción única compuesta.
- `registros_propiedad`: datos de contacto y ubicación, además de campo de estado activo.
- `oficinas_liquidadoras`: datos de contacto/horario y `activo`, con nombre único.
- `tipos_carga_hipotecaria` y `tipos_concepto_gastos`: nombre y `activo`, con nombre único.
- `acciones_expediente`: departamento, sección, actividad, descripción y `activo`.
- `honorarios_gestoria_catalogo`: base imponible, tipo y porcentaje de impuesto, total compatible y `activo`.
- `ctn_notarios`: datos de notaría/notario y relaciones con empleados/citas, pero también campos de acceso a NotarGest y credenciales protegidas. Este módulo no debe tratarse como una tabla maestra genérica sin separar cuidadosamente los permisos y la información sensible.

La presencia de un campo `activo` en el modelo no garantiza por sí sola que todas las pantallas y endpoints respeten la desactivación; esto debe verificarse en routers, servicios y formularios.

### 1.4 Catálogos funcionales dentro de otros módulos
Se han localizado ejemplos de valores que se presentan como catálogos, pero que están definidos o consumidos fuera de la central:

- `backend/app/expedientes/router.py`: endpoint de catálogos para filtros del listado. Incluye estados, tipos de acta, tipos de firma, tipos de documento, provincias, poblaciones y otros valores distintos obtenidos de los expedientes. Parte de esta respuesta se deriva de los datos existentes; por tanto, no equivale necesariamente a un catálogo maestro editable.
- `backend/app/expedientes/router.py`: actividades del circuito que el propio código describe como catálogo funcional.
- `frontend-app/src/pages/expedientes/FichaExpediente.jsx`: lista `ENTIDADES_ORIGINALES_FINCA` con entidades bancarias históricas. Hay que determinar su finalidad exacta y si representa entidades históricas de una operación concreta; no se debe mezclar automáticamente con el maestro de entidades bancarias actuales.
- `frontend-app/src/pages/provisiones/ProvisionesFondosPage.jsx`: constantes de tipos de carga y territorios, además de valores iniciales de formulario. Hay que compararlas con el catálogo de tipos de carga ya existente y determinar si son conceptos equivalentes o un conjunto específico del cálculo de provisiones.
- `frontend-app/src/pages/herramientas/TiposConceptoGastos.jsx`: contiene conceptos iniciales; hay que comprobar si son semillas para la tabla o si siguen funcionando como una segunda fuente.
- `frontend-app/src/pages/encargagest/EncargaGest.jsx`: estados definidos en código para el flujo EncargaGest.
- `backend/app/encargagest/models.py`: estados y prioridad con valores predeterminados que forman parte de un flujo operativo.
- `backend/app/provisiones/models.py`: estados y tipos operativos de provisiones/cancelaciones.
- `frontend-app/src/components/agenda/ModalNuevaCita.jsx`: tipos de cita definidos en una constante.
- `frontend-app/src/components/empleados/ModalEmpleado.jsx`: consume catálogos para reparto (comunidades, productos, tipos de operación, estados de expediente y actividades), cuya fuente y posibilidad de mantenimiento hay que rastrear.
- `frontend-app/src/components/expedientes/EnviarANotarioModal.jsx`: campos del flujo de envío a notario; deben revisarse las opciones de tipo de trámite/firma/documento antes de proponer un catálogo común.

Estos valores no deben hacerse editables sin clasificar primero si son datos maestros, valores históricos o estados de una máquina de flujo.

## 2. Inventario inicial por estado

| Área | Situación observada | Acción de auditoría |
|---|---|---|
| Central Catálogos | Existe como índice de nueve accesos | Comparar rutas, módulos reales y permisos; detectar apartados ausentes |
| Maestros generales | Departamentos, secciones y cargos | Revisar relaciones, seguridad, duplicados y borrado físico |
| Entidades bancarias | Módulo específico y datos históricos adicionales | Separar entidad actual, sucesiones y entidades históricas |
| Territorio | Municipios, registros y oficinas liquidadoras | Revisar relaciones territoriales y dependencias entre módulos |
| Economía | Honorarios, conceptos de gasto, provisiones/cancelaciones | Proteger cálculos, tarifas históricas y expedientes existentes |
| Actividades | Acciones del expediente y catálogos de filtros/actividades | Determinar si hay fuentes duplicadas o listas fijas |
| Documentación | Carpeta digital, checklist y categorías definidas en módulos | Inventariar tipos documentales y requisitos por operación/fase |
| Agenda | Tipos de cita en una constante frontend | Ver si deben ser configurables o mantenerse como opciones controladas |
| Reparto de expedientes | Reglas consumen productos, tipos de operación, comunidades y estados | Localizar las fuentes API y comprobar si son configurables |
| Estados operativos | Estados de expedientes y flujos especializados | Separar valores configurables de transiciones críticas de negocio |
| Organización y seguridad | Departamentos, secciones, cargos, roles y permisos | Evitar mezclar maestros organizativos con credenciales y autorizaciones |

## 3. Reglas de trabajo

1. No crear catálogos duplicados si ya hay un modelo y una API operativos.
2. No borrar ni transformar datos históricos durante la auditoría.
3. No cambiar tarifas, fórmulas de provisiones, estados de flujo ni permisos como efecto secundario de una reorganización visual.
4. No migrar texto libre a claves foráneas hasta analizar los datos y planificar la compatibilidad.
5. Comprobar cada opción desde la pantalla de origen hasta su guardado y consumo en los módulos dependientes.
6. Hacer los cambios funcionales posteriores por bloques pequeños, con pruebas, revisión del diff y despliegue controlado.

## 4. Trabajo pendiente para cerrar la auditoría integral

- Recorrer las rutas de `frontend-app/src/App.jsx` y el índice completo de módulos para verificar qué pantallas están fuera de la central Catálogos.
- Leer modelos, schemas, routers y servicios de cada catálogo dedicado, y registrar sus campos, CRUD, restricciones y permisos.
- Seguir las llamadas frontend/API para descubrir listas de opciones, constantes y configuraciones mantenidas fuera de Catálogos.
- Revisar los modelos y relaciones relevantes de expedientes, carpeta digital, notarios/CTN, empleados, seguridad, agenda y provisiones.
- Comparar las fuentes que parecen representar el mismo dato y marcar cada caso como duplicado confirmado, dato histórico o concepto distinto.
- Entregar un inventario final con ubicación, fuente de datos, consumidores, riesgo y acción propuesta antes de comenzar migraciones o nuevas tablas.

## 5. Recorrido ampliado de rutas, API y listas (revisión estática)

### 5.1 Enrutamiento frontend y backend
Se revisaron las rutas principales de `frontend-app/src/App.jsx` y los registros `app.include_router(...)` de `backend/app/main.py`.

Las rutas de frontend distinguen expresamente:
- `/catalogos`: central de Catálogos.
- `/maestros`: maestros generales.
- Rutas individuales para entidades bancarias, municipios, registros, oficinas liquidadoras, honorarios, acciones del expediente, tipos de carga y tipos de conceptos de gastos.
- Rutas separadas para Expedientes, CTN, Agenda, Carpeta Digital, Seguridad, EncargaGest, ApoderaGest y NotarGest.

En backend, los routers de catálogos se registran por separado bajo `/api`; provisiones se registra bajo `/api/expedientes`. La central Catálogos no es una API común: es un índice frontend que apunta a mantenedores especializados.

El backend incluye un guard global de rutas API en `backend/app/auth/route_guard.py`. Por ello, que un router no declare `Depends(get_current_user)` en cada endpoint no demuestra por sí solo que esté desprotegido; la auditoría de permisos debe verificar el guard global, su mapeo módulo/acción y las excepciones de rutas públicas.

### 5.2 API y operaciones identificadas en catálogos dedicados
Los routers revisados exponen operaciones de consulta y mantenimiento independientes:

| Catálogo | Ruta base backend | Operaciones observadas | Notas |
|---|---|---|---|
| Entidades bancarias | `/api/entidades-bancarias` | GET, POST, PUT, DELETE; auditoría de sucesiones | Tiene relación `entidad_actual_id`; preservar historia y sucesiones |
| Municipios | `/api/municipios` | GET, POST, PUT, DELETE | Unicidad por CCAA + provincia + municipio |
| Registros de la Propiedad | `/api/registros-propiedad` | GET, POST, PUT, DELETE e importación | Revisar relaciones con expedientes/fincas y oficinas liquidadoras |
| Oficinas liquidadoras | `/api/oficinas-liquidadoras` | GET, POST, PUT, DELETE e importación Excel | Nombre único; revisar relaciones territoriales |
| Tipos de carga hipotecaria | `/api/tipos-carga-hipotecaria` | GET, opciones, POST, PUT, DELETE | La API garantiza catálogo inicial; revisar interacción con borrados y constantes de provisiones |
| Tipos de conceptos de gastos | `/api/tipos-concepto-gastos` | GET, opciones, POST, PUT, DELETE | La API garantiza catálogo inicial; revisar interacción con borrados |
| Acciones del expediente | `/api/acciones-expediente` | GET, POST, PUT, DELETE | Separar acciones configurables de las actividades/transiciones del flujo |
| Honorarios de gestoría | `/api/honorarios-gestoria` | GET, POST, PUT y desactivación | El router define dependencias de permisos para ver/editar; inicializa tarifas históricas |
| Maestros generales | `/api/maestros/{tipo}` | GET, GET por ID, POST, PUT, DELETE | Tipos permitidos: departamentos, secciones y cargos |
| Notarías/CTN | `/api/ctn/notarias` y rutas relacionadas | Consulta, detalle, asociadas, historial de firmas y gestión de accesos de portales | No debe fusionarse con un catálogo genérico: contiene relaciones, datos operativos y credenciales de portal |

### 5.3 Riesgos funcionales concretos encontrados
1. **Borrado físico en Maestros:** `backend/app/maestros/router.py` llama a `eliminar`; el frontend presenta una operación de eliminación. Antes de ampliar este módulo, comprobar referencias y evaluar desactivación lógica para datos usados por expedientes o empleados.
2. **Semillas de catálogo en peticiones de lectura:** los routers de tipos de carga y tipos de conceptos llaman a `garantizar_catalogo_inicial`; honorarios llama a `asegurar_catalogo_inicial`. Estas rutinas hacen commits. Hay que comprobar su comportamiento exacto tras desactivar/eliminar una opción y evitar que una consulta restaure valores que el administrador había retirado intencionadamente.
3. **Doble representación de conceptos de carga:** `ProvisionesFondosPage.jsx` contiene `TIPOS_CARGA` y `TERRITORIOS` como constantes. El formulario consulta dinámicamente entidades bancarias, pero esas dos listas son locales. No se debe conectar `TIPOS_CARGA` automáticamente al catálogo hipotecario hasta definir si ambos representan el mismo concepto de negocio.
4. **Tipos de cita fijos:** `ModalNuevaCita.jsx` define `Firma notarial`, `Reunión`, `Visita` y `Otros` como constante. Candidato a catálogo editable si el negocio necesita mantenerlo, pero conservar reglas especiales de la firma notarial (notario, tipo de firma y apoderado).
5. **Campos de operación y documentos en texto:** expedientes guardan `tipo_operacion`, `subtipo_operacion`, `tipo_documento`, `tipo_firma`, `idioma_documento`, `formato_escritura` y `tipo_tramite` como texto. Los datos se usan en Enviar a notario, NotarGest, ApoderaGest y otras vistas. Son candidatos a normalización gradual, no a migración inmediata.
6. **Catálogos derivados de datos existentes:** `/api/expedientes/catalogos-listado` construye opciones mediante valores distintos guardados en expedientes y fincas (oficinas, productos GTG, operaciones, documentos, estados, provincias, poblaciones, notarios, etc.). Son útiles para filtros, pero no son un maestro editable y no deben confundirse con él.
7. **Actividades del circuito:** el mismo endpoint define explícitamente actividades funcionales de flujo. No todas las actividades son simples etiquetas: algunas intervienen en reglas de avance, integraciones, validaciones documentales o cierres automáticos.
8. **Datos sensibles de CTN:** `ctn_notarios` incluye campos de credenciales de NotarGest y gestión de acceso a portales. Esos campos deben seguir bajo permisos específicos y fuera de listados generales de maestros.
9. **Seguridad de API:** Maestros no declara dependencia de usuario dentro de cada endpoint; el guard global de `main.py` debe comprobarse en ejecución para confirmar que todas las rutas están mapeadas a permisos correctos. No modificar seguridad solo desde frontend.

### 5.4 Clasificación de destino recomendada

| Elemento | Destino recomendado | Motivo |
|---|---|---|
| Entidades bancarias, municipios, registros y oficinas liquidadoras | Mantener en sus módulos especializados y enlazarlos desde Catálogos | Ya tienen modelos, API, restricciones e importadores propios |
| Honorarios, conceptos de gastos y tipos de carga | Mantener mantenedores especializados dentro de la central Catálogos | Requieren validaciones económicas o semillas de compatibilidad específicas |
| Departamentos, secciones y cargos | Mantener en Maestros | Son maestros organizativos; revisar relaciones y borrado antes de ampliar |
| Acciones del expediente | Mantener mantenedor especializado | Relacionadas con circuito de trabajo y departamentos/secciones |
| Notarios y relaciones notariales | Mantener CTN como módulo especializado, enlazable desde Catálogos | Tiene asociaciones, firmas, citas y accesos a portales |
| Tipos de cita | Evaluar añadir mantenedor a Catálogos | Ahora es una constante frontend; la regla especial de firma notarial debe permanecer en código |
| Tipo/subtipo de operación, tipo de documento, firma, idioma, formato y trámite | Evaluar catálogos específicos conectados a Expedientes/Enviar a notario/NotarGest/ApoderaGest | Actualmente son textos compartidos por varios procesos; requieren migración compatible |
| Estados de expediente, actividades, estados de EncargaGest y provisiones | Mantener como configuración de flujo controlada; no hacer editables de forma genérica | Afectan transiciones, cierres, bloqueos e integraciones |
| Opciones derivadas de expedientes para filtros | Mantener como filtros derivados, no como catálogo administrativo | Se calculan desde valores históricos existentes |
| Categorías/requisitos de carpeta digital y checklist | Auditoría funcional adicional necesaria | Deben modelarse por operación y fase, con condiciones de validación y no solo nombres |
| Seguridad, roles, permisos y credenciales de portales | Mantener en Seguridad/CTN con controles propios | No son catálogos de negocio genéricos |

### 5.5 Estado y límites de esta entrega
Esta revisión es estática sobre los ficheros de la rama `main`: rutas, modelos, endpoints y listas visibles en código. No se consultó la base de datos de producción ni se probaron formularios autenticados en el navegador. Por tanto, no se afirma que los CRUD funcionen correctamente en tiempo de ejecución ni que las relaciones estén libres de datos huérfanos.

No se han modificado tablas ni lógica de negocio. La rama de auditoría contiene documentación y el PR #144 sigue en borrador.

## 6. Siguientes pasos antes de implementar
1. Completar la revisión de schemas/servicios y de las llamadas frontend/API para todos los mantenedores.
2. Revisar los permisos efectivos del guard global y los permisos específicos de cada módulo.
3. Ejecutar pruebas de compilación/backend y pruebas funcionales en un entorno seguro.
4. Comprobar con datos reales si los valores de tipo de operación, documento, cita y territorios están duplicados o tienen significados distintos.
5. Diseñar la lista definitiva de mantenedores para Catálogos y Maestros, indicando fuente de verdad, consumidores y estrategia de compatibilidad.
6. Solo después, implementar cambios pequeños y probados; no migrar texto a claves foráneas ni cambiar semillas hasta definir estrategia de datos y reversión.

**Conclusión de esta pasada:** ERP-Molsan ya tiene una central de Catálogos que agrupa mantenedores especializados, además de Maestros generales. La mejora prioritaria no es crear una tabla universal, sino completar la cobertura de accesos y centralizar de forma coherente los mantenedores que ya existen, incorporando solo los candidatos confirmados (por ejemplo, tipos de cita y ciertos tipos documentales/operativos) después de verificar sus reglas y dependencias.
