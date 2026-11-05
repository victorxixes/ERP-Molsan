# Revisiones Alembic

Las revisiones versionadas del esquema se mantienen en este directorio y se aplican en orden:

1. `20261104_0001_initial_orm_schema.py` — las 67 tablas registradas en SQLAlchemy.
2. `20261104_0002_reconcile_orm_constraints.py` — reconciliación de la FK de subtipo de defecto.
3. `20261104_0003_auxiliary_schema.py` — 33 tablas auxiliares y 7 índices.
4. `20261104_0004_secure_public_api.py` — RLS y revocación de privilegios Data API para los roles cliente.

Las revisiones 0001–0003 superaron el ciclo de upgrade/check/downgrade/upgrade en PostgreSQL temporal. La revisión 0004 está añadida y debe superar el mismo ciclo junto con las anteriores en el workflow actual. No se ha aplicado ninguna revisión al proyecto Supabase.

Las revisiones siguientes deben ser incrementales, revisadas y acompañadas de pruebas. No se deben ejecutar migraciones automáticamente desde el proceso web ni desde endpoints.
