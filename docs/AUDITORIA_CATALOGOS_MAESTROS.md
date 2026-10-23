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

## 7. Segunda pasada: servicios, schemas, llamadas API y permisos

**Método:** lectura estática de routers, modelos, validaciones, cliente API de Maestros y formularios con listas locales. No se ha ejecutado la aplicación ni consultado la base de datos de producción.

### 7.1 Permisos efectivos por operación: mecanismo verificado en código

El control no depende solo de las dependencias declaradas en cada router. main.py registra los routers bajo /api y auth/route_guard.py instala un guard global sobre las rutas FastAPI que empiezan por /api/. Salvo rutas expresamente exceptuadas, el guard agrega autenticación JWT si no existe ya y, cuando reconoce el prefijo, agrega un permiso modular.

permissions.py comprueba la unión de los permisos del empleado y de su rol, incluidos comodines modulo.* y *. Esto confirma el mecanismo, pero no permite afirmar que cada usuario real tenga o no tenga permiso: depende de la configuración guardada para ese usuario/rol y debe probarse con perfiles reales.

| Familia de rutas | Módulo que asigna el guard | GET | POST | PUT/PATCH | DELETE | Observaciones |
|---|---|---|---|---|---|---|
| /api/maestros | maestros | ver | normalmente crear | editar | eliminar | CRUD genérico; depende del guard global |
| /api/entidades-bancarias | maestros | ver | normalmente crear | editar | eliminar | Importaciones clasificadas como editar por sufijo |
| /api/municipios | maestros | ver | normalmente crear | editar | eliminar | Crear una coincidencia inactiva puede reactivarla |
| /api/registros-propiedad | maestros | ver | normalmente crear | editar | eliminar | Incluye importación |
| /api/oficinas-liquidadoras | maestros | ver | normalmente crear | editar | eliminar | Permite consultar inactivas con filtro activo |
| /api/tipos-carga-hipotecaria | maestros | ver | normalmente crear | editar | eliminar | Las semillas pueden modificar datos durante GET |
| /api/tipos-concepto-gastos | maestros | ver | normalmente crear | editar | eliminar | Las semillas pueden modificar datos durante GET |
| /api/acciones-expediente | expedientes | ver | normalmente crear | editar | eliminar | Módulo de permisos distinto de otros catálogos |
| /api/honorarios-gestoria | utilidades por guard y dependencia explícita | ver si tiene utilidades.ver o expedientes.ver | utilidades.editar en la dependencia explícita | utilidades.editar | confirmar por ruta | Revisar consistencia entre permiso explícito y acción inferida por guard |
| /api/ctn | ctn en el guard general | ver según ruta | acción inferida por método/sufijo | editar | eliminar | Hay controles adicionales de portal/asociaciones y rol administrador |

Reglas del guard:
- Para rutas con varios métodos HTTP se aplica la acción más restrictiva: DELETE prevalece, después PUT/PATCH y después POST.
- POST se clasifica como editar para sufijos definidos en _POST_ES_EDICION (por ejemplo, importar, asociadas, firmar, sincronizar o enviar a notario); los demás POST se clasifican como crear.
- Las rutas API sin prefijo mapeado siguen requiriendo JWT, pero quedan señaladas en logs sin permiso granular. Hay que revisar el contador sin_mapeo en logs de arranque; la lectura estática no ofrece ese resultado de ejecución.
- /api/notargest/* y /api/encargagest/* se excluyen del guard general porque validan su propia sesión/JWT.
- El guard no sustituye permisos de ámbito sobre un expediente concreto ni controles de negocio del servicio.

**Punto a comprobar:** Acciones del expediente está mapeado a expedientes, mientras que los otros mantenedores principales están mapeados a maestros. No cambiar ese reparto sin revisar la matriz de permisos de Seguridad y los usuarios que mantienen cada lista.

### 7.2 Servicios, validaciones y comportamiento sobre datos

- **Maestros generales:** el servicio lista por ID, comprueba duplicados en creación, modifica el nombre y elimina físicamente. La edición no comprueba explícitamente duplicados antes del commit; la restricción única de base de datos podría producir un error de integridad. Los schemas permiten nombre opcional en actualización, aunque el frontend envía un nombre. Antes de ampliar este CRUD, corregir/validar el contrato y estudiar referencias; no reutilizar el borrado físico para nuevos catálogos.
- **Entidades bancarias:** el esquema limita longitudes, normaliza texto y expone activo; existe vínculo autorreferente entidad_actual_id para sucesiones. El GET estándar lista solo activos. Debe conservarse la identidad histórica y no reemplazar nombres usados en operaciones antiguas.
- **Municipios:** unicidad compuesta por comunidad autónoma, provincia y municipio; crear una coincidencia inactiva puede reactivarla. “Crear” puede tener efecto de reactivación, que debe probarse y explicarse en interfaz.
- **Registros y oficinas liquidadoras:** tienen campos de ubicación/contacto y operaciones de importación; antes de deduplicar por nombre hay que revisar variaciones históricas, relaciones de expediente y reglas de importación.
- **Tipos de carga y conceptos de gastos:** el GET ejecuta una rutina que inserta entradas iniciales ausentes y hace commit. Si un usuario elimina una semilla, una lectura posterior puede volver a crearla; si la desactiva, la semilla solo comprueba existencia, por lo que debe probarse si persiste la desactivación. No cambiar esta rutina hasta definir una migración explícita.
- **Honorarios:** el schema valida importes decimales, impuesto (IVA/IGIC/EXENTO), porcentaje entre 0 y 100 y calcula el total con redondeo monetario. La función de catálogo inicial conserva tres tarifas históricas y documenta equivalencias anteriores. No modificar tarifas históricas ni eliminar semillas como parte de la reorganización.
- **Acciones del expediente:** departamento, sección y actividad son texto opcional; el listado filtra por esos campos. No hay evidencia suficiente para convertirlos en claves foráneas sin estudiar el circuito consumidor.
- **CTN:** mantiene asociaciones entre notarios y permisos de portal, además del catálogo de notarios. Hay controles de acceso por portal y la tabla de asociaciones se crea al inicio con checkfirst; cambios al catálogo no deben alterar asociaciones, historial de firmas o credenciales.

### 7.3 Relaciones con expedientes: comprobado y pendiente

Relaciones estructurales confirmadas en el código leído:
- Entidad bancaria → entidad sucesora mediante entidad_actual_id autorreferente.
- Notario/CTN → citas y asociaciones de notarios; hay lógica específica para historial de firmas y acceso a portales.
- Los campos de operación, documento, firma, idioma, formato y trámite se consumen en pantallas de expediente y envío a notario como opciones/textos.
- Acciones del expediente guarda departamento/sección/actividad como texto, por lo que la coherencia con los maestros organizativos no está garantizada por claves foráneas en ese modelo.

Relaciones que **no quedan demostradas por esta revisión estática**:
- Si expedientes/fincas guardan claves foráneas directas a municipios, registros, oficinas liquidadoras, tipos de carga o conceptos de gasto, o si guardan parte de esos valores como texto/copia histórica.
- Si existen filas históricas huérfanas, nombres duplicados por acentos/abreviaturas, o identificadores que ya no aparecen en listados activos.
- Si editar/borrar un maestro altera cálculos o expedientes ya guardados.

Para cerrar esta parte hay que inspeccionar modelos de expediente/finca/gastos/provisiones/carpeta digital, migraciones y constraints, y ejecutar consultas de solo lectura en una copia controlada de la base de datos. No se debe inferir ausencia de relaciones solo porque no aparezca una relación ORM en un fragmento.

### 7.4 Llamadas frontend/API y clasificación de destino

- **Central Catálogos:** conservar como punto de entrada. No necesita tabla universal. Debe incluir enlaces a mantenedores existentes que aún no estén representados y mantener agrupación funcional.
- **Maestros:** mantener departamentos, secciones y cargos; no añadir entidades bancarias, ubicaciones, tarifas, estados de flujo ni tipos documentales operativos. Antes de tocar el CRUD genérico, revisar duplicados, referencias y borrado físico.
- **Mantenedores especializados:** mantener entidades bancarias, municipios, registros, oficinas liquidadoras, tipos de carga, conceptos de gastos, honorarios y acciones del expediente en sus módulos actuales.
- **CTN:** mantener notarios y asociaciones dentro del módulo especializado. Puede añadirse enlace desde Catálogos, sin exponer credenciales ni CRUD genérico.
- **Tipos de cita:** candidato claro para nuevo mantenedor porque ModalNuevaCita.jsx usa una constante local. Diseñarlo solo si el tipo debe cambiarse por usuarios; mantener la regla de negocio que al elegir un tipo distinto de “Firma notarial” limpia notario, tipo de firma y apoderado.
- **Tipo/subtipo de operación, tipo de documento, firma, idioma, formato y trámite:** candidatos a catálogos específicos compartidos, pero no implementarlos hasta inventariar valores históricos y validaciones/consumidores de Expedientes, NotarGest, ApoderaGest y documentos.
- **Territorios de provisiones:** no unificar con municipios u otros catálogos hasta comparar semántica, identificadores y uso en cálculos.
- **Estados, actividades y requisitos de carpeta digital:** mantener bajo control de flujo/documentación; requieren pruebas por fase y tipo de operación antes de abrir su edición.

### 7.5 Plan de preparación y pruebas sin alterar históricos

1. **Inventario de esquema:** exportar de base de pruebas columnas, claves foráneas, índices, restricciones y recuentos de tablas implicadas. Solo lectura; no ejecutar migraciones en producción.
2. **Perfilado histórico:** detectar duplicados normalizados, valores vacíos, referencias huérfanas y valores usados en expedientes antiguos. Guardar informe reproducible sin corregir automáticamente.
3. **Matriz de permisos:** probar cada endpoint con usuario sin sesión (401), usuario solo ver (GET permitido y escrituras 403), usuario crear (POST de creación), usuario editar (PUT/importaciones clasificadas como editar) y usuario eliminar (DELETE); comprobar excepciones de honorarios y CTN. Usar usuarios de pruebas y datos sintéticos.
4. **Pruebas de contrato:** schemas válidos/ inválidos, nombres vacíos, duplicados, longitudes máximas, importaciones con filas inválidas y errores de integridad. Para honorarios, verificar redondeos y tarifas históricas.
5. **Pruebas de integridad:** crear expediente/finca sintético vinculado a cada maestro que realmente tenga relación; comprobar que desactivar no cambia la etiqueta histórica y que no se permite borrar un dato referenciado si la relación lo exige.
6. **Pruebas de semillas:** en base de pruebas, eliminar/desactivar una semilla y ejecutar GET para demostrar el comportamiento actual. Decidir a partir del resultado si las semillas pasan a migraciones explícitas o si la reactivación debe ser deliberada.
7. **Pruebas frontend:** recorrer formularios consumidores, verificar opciones activas, valores guardados, edición de expedientes antiguos y manejo 401/403. Comprobar build frontend y tests backend tras cambios.
8. **Reversión:** futuras migraciones aditivas y reversibles; conservar IDs/textos históricos, añadir claves foráneas opcionales solo después de mapear valores y no eliminar columnas ni reescribir expedientes en el primer despliegue.
9. **Criterio de salida:** no cerrar hasta documentar relaciones, tests de permisos y build. La rama de auditoría no sustituye esas comprobaciones ejecutadas.

### 7.6 Estado de esta segunda pasada

Se verificó estáticamente el mecanismo global de autenticación/permisos y se detectaron diferencias entre módulos y riesgos en servicios/semillas. **No se ha probado la autorización en ejecución, inspeccionado una base de datos real/copia de pruebas, ni ejecutado build o suite de tests.** Los permisos efectivos por perfil y las relaciones históricas siguen pendientes de verificación dinámica. No se modificaron datos, tablas ni lógica de negocio en esta fase.


## 8. Tercera pasada: relaciones declaradas en modelos de expedientes y módulos consumidores

Se revisaron los modelos de expedientes, fincas/registros, gastos, provisiones, carpeta digital, agenda, CTN y empleados para distinguir relaciones declaradas en base de datos de coincidencias de texto.

### 8.1 Relaciones y campos confirmados

- **Expediente → cliente y empleados:** expedientes tiene FK a clientes y a empleados para apoderado/gestor asignado. Los campos de estado y varios datos notariales/documentales siguen almacenados como texto.
- **Fincas de expediente → expediente:** expediente_fincas tiene FK expediente_id, pero los datos de finca guardan registro, provincia, población y entidad original como texto. No aparece en este modelo una FK directa al catálogo de registros de la propiedad o al catálogo de entidades bancarias.
- **Gastos → expediente:** expediente_gastos tiene FK a expedientes. El tipo de gasto se guarda como texto; documento_carpeta_id aparece como entero sin FK visible en el modelo revisado.
- **Provisiones:** provisiones_fondo se relaciona con expedientes mediante FK; provisiones_operaciones se relaciona con provisiones y tarifas mediante FK; provisiones_operaciones_fincas se relaciona con operaciones. En las fincas de provisión, registro_propiedad_id es un entero indexado sin FK visible y también se guarda registro_propiedad como texto. Las tarifas usan entidad y territorio como texto, no FK a entidad bancaria/municipio.
- **Carpeta digital:** los documentos se vinculan mediante expediente_id de texto y categoría de texto; el modelo revisado no declara FK a expediente ni a un catálogo de categorías. Antes de cambiar categorías hay que preservar la asociación histórica por identificador/texto y comprobar las reglas de checklist.
- **Agenda y CTN:** agenda_citas declara relaciones/FK a notario, expediente y apoderado según el modelo; CTN mantiene el catálogo de notarios, campos de provincia/municipio en texto, asociación a empleado para apoderado y datos de acceso a NotarGest.
- **Empleados → organización:** empleados contiene departamento_id, seccion_id y cargo_id como enteros, pero en el modelo revisado no se ven declaradas claves foráneas a las tablas departamentos, secciones y cargos. La relación actual puede depender de convenciones de aplicación; debe comprobarse en el esquema real antes de editar o borrar estos maestros.

### 8.2 Implicaciones para no alterar históricos

1. No sustituir los textos de registro, población, provincia, entidad original, tipo de gasto, categoría documental, territorio o entidad en expedientes existentes por el nombre vigente de un maestro. Los textos pueden reflejar el valor que se utilizó cuando se tramitó el expediente.
2. En provisiones, no conectar automáticamente registro_propiedad_id con el ID actual del catálogo: el campo es un entero indexado sin FK declarada en el modelo, por lo que primero hay que comprobar su semántica y los valores existentes.
3. Para empleados, comprobar si departamento_id/seccion_id/cargo_id corresponden efectivamente a los IDs de las tablas de Maestros y si hay referencias huérfanas. Hasta tener esa prueba, no ejecutar borrados ni reasignaciones.
4. Para documentos digitales, categoría es texto usado junto al expediente_id; cambiar los nombres o migrar a IDs podría romper búsquedas, checklists o clasificación documental.
5. Los catálogos que se incorporen deben usarse para nuevas selecciones, pero la lectura de expedientes antiguos debe seguir mostrando los datos históricos aunque el maestro se desactive o cambie de nombre.

### 8.3 Qué falta para verificar integridad real

El código del modelo indica las relaciones declaradas por SQLAlchemy, pero no prueba que el esquema desplegado coincida exactamente ni revela la calidad de los datos existentes. Falta comparar estas observaciones con constraints reales de una copia de base de datos, revisar migraciones SQL/alembic y ejecutar consultas de solo lectura para contar IDs huérfanos, valores de texto no presentes en catálogos y categorías documentales usadas. Esta comprobación sigue pendiente y no se ha ejecutado contra producción.


## 9. Verificación automatizada de la rama de auditoría

GitHub Actions ejecutó el workflow existente `.github/workflows/encargagest-checks.yml` sobre el commit `8052c67dcf5d9d6c872f6c483440286446e0b346` de esta rama. Resultado: **los dos jobs finalizaron correctamente**.

- **Frontend build:** instalación de dependencias y `npm run build` completados correctamente.
- **Backend Python syntax:** `python -m compileall -q backend`, instalación de dependencias e importación de la aplicación FastAPI con SQLite temporal completados correctamente. El smoke test también creó las tablas de EncargaGest previstas por ese workflow.

Ejecución: https://github.com/victorxixes/ERP-Molsan/actions/runs/39910917160

**Alcance de esta prueba:** valida que la rama de auditoría compila el frontend y que el backend compila/importa en el entorno temporal. No equivale a una suite de pruebas de negocio; el repositorio no declara script de tests en frontend-app/package.json, y el workflow existente no prueba la matriz de permisos, la integridad referencial de todos los catálogos ni la edición de formularios contra datos históricos.

Para terminar la verificación dinámica y la implementación funcional segura, falta elegir explícitamente el workspace de Render que contiene el servicio y/o la base de pruebas correcta. El workspace se ha seleccionado explícitamente como **Molsan**. En la inspección de recursos de Render se encontró una única instancia PostgreSQL (`BBDD_Molsan`, estado `available`, rol `primary`) y no aparece una instancia identificada como base de pruebas. Por precaución, no se ejecutaron consultas SQL ni pruebas autenticadas contra esa base: queda pendiente identificar una copia de pruebas aislada y usuarios de prueba.


## 10. Continuación de auditoría en Render: entorno, permisos y formulario de agenda

**Workspace elegido:** `Molsan` (`tea-d8cr02ek1jcs73a3s880`).

### 10.1 Inventario de recursos Render

La lectura de recursos del workspace devolvió:
- Servicio backend `agenda-intranet-b`, rama `main`, conectado al repositorio `victorxixes/ERP-Molsan`, URL `https://agenda-intranet-b.onrender.com`.
- Servicio frontend `agenda-intranet-f`, rama `main`, conectado al mismo repositorio, URL `https://agenda-intranet-f.onrender.com`.
- PostgreSQL `BBDD_Molsan`, ID `dpg-dac07k2jnfac73eh6q8g-a`, estado `available`, rol `primary`, base `bbdd_molsan`.

No se ha identificado una base de datos separada de pruebas en este workspace. Aunque la herramienta de consulta SQL impone transacciones de solo lectura, no se ha usado sobre la instancia primaria porque eso no demuestra que sea una copia de pruebas y no se ha autorizado consultar producción. No se han modificado recursos de Render, variables, despliegues ni datos.

### 10.2 Revisión de permisos y límite de la prueba dinámica

La lectura estática de `backend/app/auth/route_guard.py`, `backend/app/auth/permissions.py` y `backend/app/maestros/router.py` confirma:
- Las rutas `/api/maestros/*` entran bajo el prefijo del guard global y se asignan al módulo `maestros`.
- El guard añade autenticación JWT a las rutas API protegidas y asigna acción según método HTTP/sufijo.
- La autorización comprueba la unión de permisos del empleado y del rol, incluidos comodines.
- El CRUD genérico de Maestros no declara dependencia de usuario en cada endpoint, por lo que su seguridad depende del guard global registrado en la aplicación.

No se enviaron peticiones autenticadas o no autenticadas al backend. Por tanto, no se afirma que los códigos 401/403 se hayan verificado en ejecución ni que la matriz de permisos de usuarios reales esté probada. Para hacerlo con seguridad hacen falta un entorno aislado y cuentas de prueba con perfiles diferenciados; no se deben probar escrituras de CRUD contra la base primaria.

### 10.3 Formulario de tipos de cita: revisión estática de contrato

Archivos revisados:
- `frontend-app/src/components/agenda/ModalNuevaCita.jsx`
- `backend/app/agenda/schemas.py`

Observaciones:
1. El formulario mantiene una lista local fija: `Firma notarial`, `Reunión`, `Visita` y `Otros`; no procede aún de un catálogo editable.
2. Al cambiar de `Firma notarial` a otro tipo, el frontend limpia el notario seleccionado, el tipo de firma y el apoderado visible. Esta regla debe conservarse si los tipos pasan a administrarse desde Catálogos.
3. En el schema de creación (`CitaBase`/`CitaCreate`) se exige `notario_id` cuando `tipo_cita == "Firma notarial"`.
4. El schema de actualización (`CitaUpdate`) declara `tipo_cita` y `notario_id` como opcionales y no reproduce esa validación cruzada. Antes de cambiar el formulario o hacerlo configurable, hay que comprobar el comportamiento del endpoint de actualización y decidir si el servidor debe validar también las transiciones de edición.
5. No se ejecutaron pruebas de navegador ni se guardaron citas de prueba; estas conclusiones proceden de lectura de código.

**Siguiente paso recomendado:** cuando exista una base de pruebas confirmada, ejecutar tests con datos sintéticos para: crear/editar citas notariales y no notariales, cambiar de un tipo a otro y comprobar limpieza/validación; probar GET sin token (401), GET con permiso de lectura, POST/PUT/DELETE con permisos insuficientes (403) y con permisos autorizados; comprobar el esquema real de tablas y restricciones mediante consultas de solo lectura. Mantener la base primaria sin consultas hasta confirmar expresamente el entorno de pruebas.
