
-- =========================================================
-- CATÁLOGO DE SUBTIPOS
-- Se crea vacío, sin insertar subtipos iniciales.
-- =========================================================

CREATE TABLE IF NOT EXISTS defecto_subtipos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_defecto_subtipos_id
    ON defecto_subtipos (id);

CREATE INDEX IF NOT EXISTS ix_defecto_subtipos_nombre
    ON defecto_subtipos (nombre);


-- =========================================================
-- AMPLIAR LA TABLA EXISTENTE DE DEFECTOS
-- No se borran los campos antiguos.
-- =========================================================

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS documento VARCHAR(300);

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS motivo_defecto VARCHAR(500);

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS subtipo_defecto_id INTEGER;

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS subtipo_defecto VARCHAR(500);

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS fecha_notificacion_registro DATE;

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS fecha_vencimiento_presentacion DATE;

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS fecha_entrada_subsanacion DATE;

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS observaciones_registro VARCHAR(200);

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS calificacion_registro TEXT;

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS calificacion_archivo BYTEA;

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS calificacion_nombre VARCHAR(255);

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS calificacion_content_type VARCHAR(100);

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS calificacion_tamano INTEGER;

ALTER TABLE expediente_defectos
    ADD COLUMN IF NOT EXISTS calificacion_subida_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ix_expediente_defectos_expediente_id
    ON expediente_defectos (expediente_id);

CREATE INDEX IF NOT EXISTS ix_expediente_defectos_subtipo_defecto_id
    ON expediente_defectos (subtipo_defecto_id);


-- =========================================================
-- RELACIÓN CON EL CATÁLOGO
-- =========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_expediente_defectos_subtipo'
          AND conrelid = 'expediente_defectos'::regclass
    ) THEN
        ALTER TABLE expediente_defectos
            ADD CONSTRAINT fk_expediente_defectos_subtipo
            FOREIGN KEY (subtipo_defecto_id)
            REFERENCES defecto_subtipos(id)
            ON DELETE SET NULL;
    END IF;
END $$;
