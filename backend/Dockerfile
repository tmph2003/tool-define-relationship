# =============================================================================
# Backend — Multi-stage Dockerfile
# =============================================================================
# Stage 1: builder — install Python deps into a clean prefix
# Stage 2: runtime — copy only what's needed (no build tools)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — builder
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install only the system libs needed to compile native extensions
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into an isolated prefix so we can copy them cleanly
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ---------------------------------------------------------------------------
# Stage 2 — runtime
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

LABEL maintainer="relationship-designer"

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Pull in compiled packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8000

# ---------------------------------------------------------------------------
# Entrypoint — dev vs production controlled by env var APP_ENV
# ---------------------------------------------------------------------------
# In Docker Compose (dev): APP_ENV=development -> adds --reload and binds to
# the volume-mounted source.
# In production: APP_ENV=production (default) -> no --reload.
# ---------------------------------------------------------------------------
CMD ["sh", "-c", "\
  if [ \"$APP_ENV\" = 'development' ]; then \
    exec uvicorn app.main:app \
      --host 0.0.0.0 \
      --port 8000 \
      --reload \
      --log-level ${BACKEND_LOG_LEVEL:-info}; \
  else \
    exec uvicorn app.main:app \
      --host 0.0.0.0 \
      --port 8000 \
      --workers ${UVICORN_WORKERS:-2} \
      --log-level ${BACKEND_LOG_LEVEL:-info}; \
  fi"]
