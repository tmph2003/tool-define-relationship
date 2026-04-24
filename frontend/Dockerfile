# =============================================================================
# Frontend — Multi-stage Dockerfile
# =============================================================================
# Stage 1: deps     — install node_modules (cached layer)
# Stage 2: builder  — build the production bundle
# Stage 3: dev      — Vite dev server with hot-reload  (target: dev)
# Stage 4: prod     — Nginx serving static files       (target: prod)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — deps (shared by dev & builder)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2 — builder (production bundle)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build-time API URL override
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — dev (Vite dev server — used by docker-compose in development)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS dev

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# Stage 4 — prod (Nginx serving the static build)
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS prod

LABEL maintainer="relationship-designer"

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Custom Nginx config for SPA routing + API proxy
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config — created below
RUN cat > /etc/nginx/conf.d/app.conf <<'EOF'
server {
    listen       80;
    server_name  _;

    root   /usr/share/nginx/html;
    index  index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Cache static assets aggressively
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
