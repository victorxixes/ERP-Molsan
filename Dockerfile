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
# PYTHON
# ============================================================

ENV PYTHONUNBUFFERED=1


# ============================================================
# FASTAPI / UVICORN
#
# Render proporciona el puerto mediante la variable PORT.
# Si PORT no existe, usamos 8000 como respaldo local.
# ============================================================

ENTRYPOINT ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
