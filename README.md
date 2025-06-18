# Fresh + ConnectRPC Demo

A modern full-stack demonstration of Deno Fresh 2.0 integrated with ConnectRPC, showcasing type-safe RPC communication between a Go backend and Deno Fresh frontend.

## Quick Start

```bash
# Start the complete development stack
deno task dev
```

That's it! This will start both the Go backend (port 3007) with Air hot reloading and Fresh frontend (port 8007) with hot reload.

## Alternative Commands

### Docker Development
```bash
# Start containerized services
deno task up

# Stop all services
deno task down
```

### Manual Development
```bash
# Backend with hot reload (Air)
deno task dev:backend

# Backend without hot reload
cd backend && go run cmd/server/main.go

# Frontend only  
deno task dev:frontend

# Install Air manually if needed
deno task install:air
```

## Testing

```bash
# Run all tests (backend + frontend)
deno task test

# Individual test suites
deno task test:backend      # Go unit & integration tests
deno task test:frontend     # Deno/Fresh tests
deno task test:integration  # Cross-stack integration tests
```

## Production Build

```bash
# Build entire stack
deno task build

# Individual builds
deno task build:backend     # Go binary
deno task build:frontend    # Fresh static assets
```

## Architecture

This application demonstrates a complete full-stack integration using:

- **Frontend**: Deno Fresh 2.0 with Islands Architecture and Server-Side Rendering
- **Backend**: Go ConnectRPC service with HTTP/JSON transport
- **Schema**: Protocol Buffers from [buf.build/wcygan/hello](https://buf.build/wcygan/hello/docs/main:hello.v1)
- **Communication**: Browser-compatible ConnectRPC over HTTP/JSON

## Key Features

- **Type Safety**: Protocol Buffers → Go types → TypeScript interfaces
- **Modern UI**: Glassmorphism design with responsive layout
- **Development Experience**: Hot reload, concurrent services, automated testing
- **Production Ready**: Docker containerization with health checks
- **Cross-Platform**: Deno task automation for consistent workflow
