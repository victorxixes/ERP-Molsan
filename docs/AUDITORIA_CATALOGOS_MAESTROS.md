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

Estos módulos deben conservar sus esquemas y reglas específicas. No se debe crear una segunda tabla genérica para reemplazar los registros que ya administran.

### 1.4 Catálogos funcionales dentro de otros módulos
Se han localizado ejemplos de valores que se presentan como catálogos, pero que están definidos o consumidos fuera de la central:

- `backend/app/expedientes/router.py`: endpoint de catálogos para filtros del listado y actividades del circuito.
- `frontend-app/src/pages/expedientes/FichaExpediente.jsx`: lista `ENTIDADES_ORIGINALES_FINCA` con entidades bancarias históricas. Hay que determinar su finalidad exacta y si representa entidades históricas de una operación concreta; no se debe mezclar automáticamente con el maestro de entidades bancarias actuales.
- `frontend-app/src/pages/encargagest/EncargaGest.jsx`: estados definidos en código para el flujo EncargaGest.
- `backend/app/encargagest/models.py`: estados y prioridad con valores predeterminados que forman parte de un flujo operativo.
- `backend/app/provisiones/models.py`: estados y tipos operativos de provisiones/cancelaciones.
- `frontend-app/src/components/empleados/ModalEmpleado.jsx`: consume catálogos para reparto (comunidades, productos, tipos de operación y estados de expediente), cuya fuente y posibilidad de mantenimiento hay que rastrear.

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
- Revisar los modelos y relaciones relevantes de expedientes, carpeta digital, notarios/CTN, empleados, seguridad y provisiones.
- Comparar las fuentes que parecen representar el mismo dato y marcar cada caso como duplicado confirmado, dato histórico o concepto distinto.
- Entregar un inventario final con ubicación, fuente de datos, consumidores, riesgo y acción propuesta antes de comenzar migraciones o nuevas tablas.

**Conclusión provisional:** ERP-Molsan ya dispone de una central de Catálogos y de varios maestros especializados. La siguiente fase debe ampliar el inventario y comprobar las dependencias; todavía no hay base suficiente para afirmar que una categoría concreta falte o que dos listas deban fusionarse.
