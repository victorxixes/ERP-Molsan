# Migraciones ERP-Molsan

Este directorio contiene migraciones Alembic versionadas.

## Salvaguardas

- El backend web no debe ejecutar migraciones al arrancar.
- No habilitar `MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS` en el servicio web.
- Solo un proceso aislado, temporal y autorizado puede ejecutar Alembic.
- Antes de la primera migración se debe revisar el inventario offline del ORM y DDL auxiliar.
- No se migrarán los expedientes ni pagos históricos ficticios de Preview.
- La primera carga de datos de negocio se planificará aparte: aproximadamente 25 expedientes seleccionados para pruebas reales, una vez validado el ERP.

## Comandos (solo entorno aislado)

Generar una revisión tras tener una base de datos de referencia compatible:

```bash
MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS=true alembic revision --autogenerate -m "initial ERP schema"
```

Revisar manualmente el archivo generado antes de aplicarlo. No aplicar una revisión autogenerada sin comprobar tipos, claves foráneas, índices, secuencias, triggers, funciones, RLS y extensiones.

Aplicar únicamente en una base de datos de Preview confirmada:

```bash
MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS=true alembic upgrade head
```

Nunca ejecutar estos comandos contra producción durante la fase de integración.
