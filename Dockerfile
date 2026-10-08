FROM python:3.11

WORKDIR /app

# ============================================================
# COPIAR BACKEND
# ============================================================

COPY backend /app/backend

# ============================================================
# INSTALAR DEPENDENCIAS
# ============================================================

RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# ============================================================
# CONFIGURACIÓN
# ============================================================

ENV PYTHONUNBUFFERED=1

# Puerto HTTP utilizado por Render
EXPOSE 10000

# ============================================================
# ARRANQUE
# ============================================================

CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
