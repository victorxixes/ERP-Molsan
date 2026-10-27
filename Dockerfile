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
# PUERTO RENDER
#
# Render proporciona PORT en tiempo de ejecución.
# El valor habitual de Render es 10000.
# ============================================================

EXPOSE 10000


# ============================================================
# ARRANQUE
#
# Uvicorn access logs incluyen la query string en conexiones
# WebSocket. Como la aplicación transporta el JWT en "token",
# no habilitamos access logs de Uvicorn para evitar que las
# credenciales de sesión terminen en los logs de aplicación.
# Render conserva sus logs HTTP de solicitudes por separado.
# ============================================================

CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --no-access-log"]
