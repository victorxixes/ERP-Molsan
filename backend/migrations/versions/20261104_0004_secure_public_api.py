"""Lock down Supabase's exposed public schema for the ERP's server-only API.

The ERP authenticates employees with its existing JWT/permission system and
connects to PostgreSQL from the trusted backend. It does not expose ERP tables
to browser clients through Supabase Auth/PostgREST. RLS with no client policies
plus revoked API-role grants keeps that boundary explicit.
"""
from alembic import op

revision = "20261104_0004"
down_revision = "20261104_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        r"""
        DO $molsan_security$
        DECLARE
            item record;
            role_name text;
        BEGIN
            -- Enable RLS on every application table. Table owners (the trusted
            -- migration/backend DB role) retain owner access; API roles have no
            -- policies and are denied by default.
            FOR item IN
                SELECT schemaname, tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            LOOP
                EXECUTE format(
                    'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                    item.schemaname,
                    item.tablename
                );
            END LOOP;

            -- Supabase projects define anon/authenticated. Generic CI Postgres
            -- does not, so keep this migration testable outside Supabase too.
            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
            LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                    EXECUTE format(
                        'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I',
                        role_name
                    );
                    EXECUTE format(
                        'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I',
                        role_name
                    );
                    EXECUTE format(
                        'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM %I',
                        role_name
                    );
                    EXECUTE format(
                        'REVOKE ALL ON SCHEMA public FROM %I',
                        role_name
                    );
                    EXECUTE format(
                        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
                        role_name
                    );
                    EXECUTE format(
                        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
                        role_name
                    );
                    EXECUTE format(
                        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM %I',
                        role_name
                    );
                END IF;
            END LOOP;

            -- No implicit PUBLIC grants to newly created ERP objects.
            REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
            REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
            REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
            REVOKE CREATE ON SCHEMA public FROM PUBLIC;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
        END
        $molsan_security$;
        """
    )


def downgrade() -> None:
    # Deliberately retain RLS and revoked client grants on rollback. Removing
    # schema objects must never silently reopen the Supabase Data API.
    pass
