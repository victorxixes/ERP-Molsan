# Migración controlada de Supabase Preview

La migración de esquema se ejecuta desde GitHub Actions, nunca desde el arranque de la API web.

## Preparación única

En GitHub, abre **Settings → Secrets and variables → Actions → New repository secret** y crea:

- **Name:** `MOLSAN_SUPABASE_MIGRATION_DATABASE_URL`
- **Value:** URL PostgreSQL del proyecto Supabase `powiprqarmluanplxpyb`, preferentemente conexión **Session pooler** (no Transaction pooler), base `postgres`.

La URL debe incluir el usuario del proyecto y la contraseña de base de datos. No se debe copiar al chat ni dejar en archivos del repositorio. El workflow valida el host/usuario del proyecto antes de conectarse.

## Ejecución manual

1. Selecciona la rama `production/erp-molsan-2026-11-04`.
2. Abre **Actions → Supabase Preview schema migration → Run workflow**.
3. En confirmación escribe exactamente `APPLY_TO_EMPTY_MOLSAN_PREVIEW`.
4. Revisa el resultado completo.

El workflow aborta si no reconoce el proyecto esperado, si `public` ya contiene tablas o si el bucket `molsan-private` no existe, es público o contiene objetos. Ejecuta Alembic hasta `20261104_0004`, comprueba que no hay diferencias pendientes y valida que todas las tablas públicas tienen RLS y no conceden SELECT a `anon` ni `authenticated`.

El trabajo de migración usa una clave JWT temporal y almacenamiento local efímero sin operaciones de archivos. No requiere ni expone la clave de Storage. No crea usuarios ni importa expedientes, pagos o documentos.

## Límites de seguridad

- Solo actúa sobre la rama de integración y el proyecto Supabase Preview identificado.
- No se ejecuta automáticamente en cada push o PR.
- No hace downgrade ni elimina tablas.
- No despliega Render ni modifica producción.
- Si falla cualquier precondición, se detiene sin ejecutar Alembic.
