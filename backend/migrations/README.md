# Migraciones ERP-Molsan

Este directorio contiene las revisiones Alembic versionadas de la integración controlada.

## Revisiones candidatas
- `20261104_0001_initial_orm_schema.py`: 67 tablas ORM y sus restricciones/índices.
- `20261104_0002_reconcile_orm_constraints.py`: reconciliación de la FK de subtipo de defecto.
- `20261104_0003_auxiliary_schema.py`: 33 tablas auxiliares y 7 índices, con sus dependencias.

Las tres revisiones son candidatas hasta completar en PostgreSQL aislado el ciclo:
`upgrade head` → `alembic check` → `downgrade base` → `upgrade head`.
No se ha aplicado ninguna revisión a Supabase.

## Salvaguardas
- El backend web no ejecuta migraciones al arrancar ni desde endpoints.
- No habilitar `MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS` en el servicio web de Render.
- Solo un proceso aislado, temporal y autorizado puede ejecutar Alembic.
- La generación de revisiones en CI no debe escribir ni hacer push automático a la rama; publica artefactos para revisión.
- No se migrarán expedientes ni pagos históricos ficticios de Preview.
- La carga inicial de datos de negocio se planificará aparte: aproximadamente 25 expedientes seleccionados para pruebas reales, una vez validado el ERP.

## Comandos (solo entorno aislado)
Validar las revisiones existentes contra PostgreSQL temporal:

```bash
MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS=true alembic upgrade head
MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS=true alembic check
MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS=true alembic downgrade base
MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS=true alembic upgrade head
```

No aplicar una revisión autogenerada sin comprobar tipos, claves foráneas, índices, secuencias, triggers, funciones, RLS y extensiones. Nunca ejecutar estos comandos contra producción durante la fase de integración.
