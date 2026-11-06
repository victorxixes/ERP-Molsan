# Revisiones Alembic

Las revisiones versionadas del esquema se mantienen en este directorio y se aplican en orden:

1. `20261104_0001_initial_orm_schema.py` — las 67 tablas registradas en SQLAlchemy.
2. `20261104_0002_reconcile_orm_constraints.py` — reconciliación de la FK de subtipo de defecto.
3. `20261104_0003_auxiliary_schema.py` — 33 tablas auxiliares y 7 índices.
4. `20261104_0004_secure_public_api.py` — RLS y revocación de privilegios Data API para los roles cliente.
5. `20261105_0005_expand_ctn_notarios_departments.py` — amplía a 255 caracteres los tres campos de departamentos de notarías.

Estado comprobado en el proyecto de integración Supabase `ERP_Molsan` el 6 de noviembre de 2026: revisión activa `20261105_0005`, 101 tablas públicas y RLS habilitado en las 101. No se encontraron privilegios de tabla para `PUBLIC`, `anon` ni `authenticated`.

Las revisiones 0001–0004 se diseñaron para validar su ciclo completo de upgrade/check/downgrade/upgrade en PostgreSQL temporal. La revisión 0005 es incremental y su downgrade aborta si existen valores de departamentos de más de 150 caracteres para evitar pérdida de datos.

Las revisiones siguientes deben ser incrementales, revisadas y acompañadas de pruebas. No se deben ejecutar migraciones automáticamente desde el proceso web ni desde endpoints. El bootstrap inicial debe comprobar la revisión actual `20261105_0005`.
