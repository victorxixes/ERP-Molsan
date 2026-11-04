from backend.app.schema_migrations import runtime_schema_migrations_enabled


def test_runtime_schema_migrations_disabled_by_default(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    monkeypatch.delenv("MOLSAN_PROCESS_ROLE", raising=False)
    assert runtime_schema_migrations_enabled() is False


def test_legacy_flag_cannot_enable_schema_tasks_in_web_process(monkeypatch):
    monkeypatch.setenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", "true")
    monkeypatch.setenv("MOLSAN_PROCESS_ROLE", "web")
    assert runtime_schema_migrations_enabled() is False


def test_migration_role_requires_explicit_enable_flag(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    monkeypatch.setenv("MOLSAN_PROCESS_ROLE", "migration")
    assert runtime_schema_migrations_enabled() is False


def test_migration_role_can_explicitly_enable_legacy_tasks(monkeypatch):
    monkeypatch.setenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", "true")
    monkeypatch.setenv("MOLSAN_PROCESS_ROLE", "migration")
    assert runtime_schema_migrations_enabled() is True
