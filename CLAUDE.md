# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This project demonstrates integrating Deno Fresh with ConnectRPC using a simple hello service from buf.build. It showcases a modern full-stack architecture with type-safe RPC communication between a Deno Fresh frontend and Go ConnectRPC backend.

## Project Structure

```
deno-fresh-connectrpc/
├── frontend/           # Deno Fresh application (planned)
├── backend/           # Go ConnectRPC service (planned)  
├── proto/             # Protocol Buffer definitions (planned)
├── deno.json         # Root task automation (planned)
├── docker-compose.yml # Service orchestration (planned)
└── resources/        # Architecture documentation
```

## Essential Commands

Once the project structure is established, these commands will be available:

### Development Workflow
```bash
# Start full development stack
deno task up

# Start development with hot reload
deno task dev

# Stop all services  
deno task down

# Generate code from Protocol Buffers
buf generate
```

### Frontend Commands (Deno Fresh)
```bash
# Frontend development server
cd frontend && deno task dev

# Build production assets
cd frontend && deno task build

# Run tests
cd frontend && deno test

# Type checking
cd frontend && deno check main.ts
```

### Backend Commands (Go ConnectRPC)
```bash
# Start Go backend
cd backend && go run cmd/server/main.go

# Run tests with coverage
cd backend && go test -v -cover ./...

# Build binary
cd backend && go build -o bin/server cmd/server/main.go
```

### Docker Operations
```bash
# Build and start all services
docker compose up --build

# Production deployment
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f frontend backend
```

## Architecture & Integration

### Technology Stack
- **Frontend**: Deno Fresh 2.0 (Islands Architecture + SSR)
- **Backend**: Go with ConnectRPC
- **Protocol**: ConnectRPC with HTTP/JSON transport
- **Schema**: Protocol Buffers from buf.build/wcygan/hello
- **Database**: MySQL (for expanded functionality)

### Core Integration Patterns

#### 1. API Proxy Pattern
Fresh frontend uses catch-all API routes (`/api/[...path].ts`) to proxy requests to the Go backend, enabling same-origin requests and CORS handling.

#### 2. Type-Safe RPC Client
```typescript
// Generated from Protocol Buffers
import { createClient } from "@connectrpc/connect";
import { HelloService } from "@buf/wcygan_hello.bufbuild_es/hello/v1/hello_pb.js";

const client = createClient(HelloService, transport);
const response = await client.sayHello({ name: "World" });
```

#### 3. Multi-Protocol Backend
Go service supports gRPC, gRPC-Web, and Connect protocols simultaneously.

### buf.build Integration

#### Package Dependencies
- `@buf/wcygan_hello.bufbuild_es` - Generated TypeScript types
- `@buf/wcygan_hello.connectrpc_query-es` - ConnectRPC client
- Backend uses `buf.build/gen/go/wcygan/hello/connectrpc/go`

#### Registry Configuration
Frontend `.npmrc`:
```
@buf:registry=https://buf.build/gen/npm/v1/
```

## Key Development Patterns

### Fresh Islands Architecture
- **Server-Side Rendering**: Pages render on server by default
- **Selective Hydration**: Only interactive components ("islands") run client-side
- **Minimal JavaScript**: Reduces bundle size and improves performance

### ConnectRPC Service Implementation
- **Type Safety**: End-to-end type safety from Protocol Buffers
- **Multi-Protocol**: Same service accessible via gRPC and HTTP/JSON
- **Middleware**: Interceptors for logging, auth, metrics

### Docker Strategy
- **Multi-Stage Builds**: Separate development, test, and production stages
- **Pre-Built Assets**: Build Fresh assets locally, copy to Docker for reliability
- **Fallback Strategy**: Graceful degradation if build fails

## Testing Strategy

### Frontend Testing (Deno)
```bash
# Run specific test
deno test --filter="component name" 

# Integration tests with mock client
deno test tests/integration/

# Component testing with Fresh testing library
```

### Backend Testing (Go)
```bash
# Table-driven tests
go test ./internal/service/

# Integration tests with TestContainers
go test ./tests/integration/

# Benchmark tests
go test -bench=. ./internal/service/
```

### End-to-End Testing
```bash
# Full stack integration
deno task test:e2e

# Docker-based testing
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Configuration Management

### Environment Variables
- `BACKEND_URL`: Backend service URL (default: http://localhost:3007)
- `PORT`: Frontend port (default: 8007)
- `DATABASE_URL`: MySQL connection string
- `LOG_LEVEL`: Logging level (info, debug, error)

### Port Allocation (Non-conflicting)
- Frontend: 8007 (instead of default 8000)
- Backend: 3007 (instead of default 3000) 
- MySQL: 3307 (instead of default 3306)

## Development Workflow

### Initial Setup
1. **Protocol Buffers**: Define service schema in `proto/`
2. **Code Generation**: Run `buf generate` to create client/server code
3. **Backend Implementation**: Implement ConnectRPC service in Go
4. **Frontend Integration**: Create Fresh islands using generated client
5. **Docker Integration**: Multi-stage Dockerfiles for each service

### Hot Reload Development
- Fresh frontend: Automatic reload on file changes
- Go backend: Use `air` for hot reload during development
- Protocol Buffers: Re-generate code when `.proto` files change

### Production Deployment
- Build Fresh assets locally with `deno task build`  
- Use production Dockerfile with pre-built assets
- Deploy with Docker Compose or Kubernetes

## Troubleshooting

### buf.build Registry Issues
- Ensure `.npmrc` is properly configured
- Use `--node-modules-dir=auto` flag consistently
- Check lock file for exact version pinning

### Fresh Build Issues
- Pre-build assets locally before Docker
- Use fallback strategy in production CMD
- Check for ESM compatibility issues with npm packages

### ConnectRPC Integration
- Verify CORS headers in API proxy
- Check Connect-Protocol-Version headers
- Ensure proper error handling for RPC calls

## Performance Considerations

### Frontend Optimization
- Fresh Islands: Minimal client-side JavaScript
- Static Site Generation: Pre-rendered pages where possible
- HTTP/2: Connection multiplexing for RPC calls

### Backend Optimization  
- Connection Pooling: Configure database connections
- gRPC: Use binary protocol for internal services
- Middleware: Efficient logging and metrics collection

This architecture demonstrates a modern, type-safe approach to full-stack development with excellent developer experience and production readiness.