FROM python:3.11

# ============================================================
# CONFIGURACIÓN
# ============================================================

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1


# ============================================================
# COPIAR BACKEND
# ============================================================

COPY backend /app/backend


# ============================================================
# INSTALAR DEPENDENCIAS
# ============================================================

RUN pip install --no-cache-dir \
    -r /app/backend/requirements.txt


# ============================================================
# ARRANQUE
#
# Render puede proporcionar PORT.
# Si no existe, usamos 8000.
# ============================================================

CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
