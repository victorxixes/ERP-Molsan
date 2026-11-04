# Revisiones Alembic

Las revisiones versionadas del esquema se mantienen en este directorio y se aplican en orden:

1. `20261104_0001_initial_orm_schema.py` — las 67 tablas registradas en SQLAlchemy.
2. `20261104_0002_reconcile_orm_constraints.py` — reconciliación de la FK de subtipo de defecto.
3. `20261104_0003_auxiliary_schema.py` — 33 tablas auxiliares y 7 índices.

La cadena completa se ha probado en PostgreSQL temporal de CI con `upgrade head`, `alembic check`, `downgrade base` y un segundo `upgrade head`. No se ha aplicado todavía al proyecto Supabase.

Las revisiones siguientes deben ser incrementales, revisadas y acompañadas de pruebas. No se deben ejecutar migraciones automáticamente desde el proceso web ni desde endpoints.
