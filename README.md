# Sofa - Self-Hosted PaaS Panel

Sofa is a self-hosted hosting panel for one-click deployment of web applications. Think of it as your personal Vercel/Railway running on your own server.

## Quick Start

```bash
# Clone and start
docker network create sofa-network
docker compose up -d

# Access the panel
open http://localhost:3000

# Default credentials
# Password: admin
```

## Architecture

```
Frontend (React + Vite + TypeScript)
  ↕ REST API + WebSocket
Backend (Go + Gin + GORM)
  ↕
  ├── PostgreSQL (database)
  ├── Redis (queue + cache)
  ├── Docker Engine (container management)
  └── Traefik (reverse proxy + SSL)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS 4 |
| UI | Custom shadcn-style components |
| Backend | Go 1.22 + Gin + GORM |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + Asynq |
| Containers | Docker Engine API |
| Proxy | Traefik v3 (auto-SSL) |
| Real-time | WebSocket (gorilla/websocket) |
| Terminal | xterm.js + node-pty |

## Features

- One-click deploy from Git repo, Docker image, or Dockerfile
- Auto framework detection (Node.js, Python, Go, Static, Ruby, PHP)
- Zero-downtime blue-green deployments
- Auto SSL via Let's Encrypt + Traefik
- Real-time log streaming
- Web terminal access into containers
- Environment variable management (encrypted at rest)
- Custom domain support
- Database provisioning (PostgreSQL, MySQL, Redis, MongoDB)
- Resource monitoring (CPU, RAM, Disk, Network)
- Deployment history with one-click rollback

## Project Structure

```
sofa/
├── backend/                # Go API server
│   ├── cmd/server/         # Entry point
│   ├── internal/
│   │   ├── config/         # Viper configuration
│   │   ├── handler/        # Gin HTTP handlers
│   │   ├── middleware/      # Auth, CORS, logging
│   │   ├── model/          # GORM models
│   │   ├── repository/     # Database queries
│   │   ├── service/        # Business logic
│   │   ├── docker/         # Docker Engine client
│   │   ├── deploy/         # Deploy pipeline + builder
│   │   ├── proxy/          # Traefik config manager
│   │   ├── queue/          # Asynq workers
│   │   ├── realtime/       # WebSocket hub
│   │   ├── crypto/         # AES-256-GCM encryption
│   │   └── git/            # Git clone operations
│   ├── migrations/         # SQL migrations
│   └── config.yaml         # Default config
│
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # UI + custom components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand stores
│   │   ├── services/       # API client layer
│   │   ├── lib/            # Utilities
│   │   └── types/          # TypeScript interfaces
│   └── vite.config.ts
│
├── traefik/                # Traefik configuration
└── docker-compose.yml      # Full stack deployment
```

## Development

### Backend

```bash
cd backend
export GOROOT=$HOME/go
export GOPATH=$HOME/gopath
export PATH=$GOROOT/bin:$GOPATH/bin:$PATH
go run ./cmd/server/
```

### Frontend

```bash
cd frontend
bun install
bun dev
```

## License

MIT
