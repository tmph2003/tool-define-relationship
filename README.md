# Relationship Designer

A full-stack monorepo application for designing and managing relationships.

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| Backend  | Python 3.11 · FastAPI · Uvicorn  |
| Infra    | Docker · Docker Compose           |

## Project Structure

```
relationship-designer/
├── frontend/                # React + Vite + Tailwind
│   ├── src/
│   │   ├── assets/          # Static assets (images, fonts)
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layouts/         # Page layout wrappers
│   │   ├── pages/           # Route-level page components
│   │   ├── services/        # API client & external services
│   │   ├── store/           # State management
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── ...
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/v1/endpoints/  # Versioned API routes
│   │   ├── core/              # Config, security, dependencies
│   │   ├── models/            # ORM / domain models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic layer
│   │   └── db/                # Database session & migrations
│   └── tests/
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- Docker & Docker Compose

### Quick Start (Docker)

```bash
# 1. Clone & configure
cp .env.example .env

# 2. Build and run all services
docker compose up --build
```

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:8000        |
| API Docs | http://localhost:8000/docs   |

### Local Development

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Useful Commands

```bash
make dev          # Start all services via Docker Compose
make build        # Build all Docker images
make down         # Stop all services
make lint         # Run linters for both frontend and backend
make test         # Run all tests
```

## Environment Variables

Copy `.env.example` to `.env` and configure the values. See the file for documentation on each variable.

## License

Private — All rights reserved.
