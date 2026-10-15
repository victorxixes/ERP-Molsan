CREATE TABLE IF NOT EXISTS expediente_defectos_historial (
    id SERIAL PRIMARY KEY,
    expediente_id_externo VARCHAR(100) NOT NULL,
    expediente_pk INTEGER NULL,
    defecto_id INTEGER NULL,
    accion VARCHAR(40) NOT NULL,
    resumen VARCHAR(500) NOT NULL,
    cambios_json TEXT NULL,
    usuario VARCHAR(200) NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_expediente_defectos_historial_expediente_id_externo ON expediente_defectos_historial (expediente_id_externo);
CREATE INDEX IF NOT EXISTS ix_expediente_defectos_historial_expediente_pk ON expediente_defectos_historial (expediente_pk);
CREATE INDEX IF NOT EXISTS ix_expediente_defectos_historial_defecto_id ON expediente_defectos_historial (defecto_id);
CREATE INDEX IF NOT EXISTS ix_expediente_defectos_historial_accion ON expediente_defectos_historial (accion);
CREATE INDEX IF NOT EXISTS ix_expediente_defectos_historial_creado_en ON expediente_defectos_historial (creado_en);
