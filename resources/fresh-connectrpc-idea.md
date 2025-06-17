# Fresh + ConnectRPC: Modern Full-Stack Architecture

This document explains the core concepts behind Deno Fresh and ConnectRPC frameworks and how they form a powerful, modern full-stack architecture for building web applications.

## Framework Overview

### Deno Fresh: The Modern Web Framework

Fresh is a full-stack web framework for Deno that emphasizes performance, simplicity, and modern web development practices.

#### Core Concepts

**1. Islands Architecture**
- Server-side rendering by default with selective client-side hydration
- Only interactive components ("islands") run on the client
- Minimal JavaScript bundle size for optimal performance
- Progressive enhancement approach

**2. File-System Based Routing**
- Routes are automatically generated from the `routes/` directory structure
- No configuration required for basic routing
- Dynamic routes with parameter extraction
- API routes alongside page routes

**3. Zero Configuration TypeScript**
- Built-in TypeScript support without build tools
- Type safety across the entire application
- Seamless integration with Deno's module system

**4. Server-Side Rendering (SSR)**
- Fast initial page loads with pre-rendered HTML
- SEO-friendly content delivery
- Optimal Core Web Vitals scores

**5. Preact Integration**
- Lightweight React alternative (3KB vs 45KB)
- React ecosystem compatibility
- Modern hooks and state management with signals

#### Fresh Architecture Benefits

```
┌─────────────────┐
│   Browser       │
├─────────────────┤
│ Minimal JS      │ ← Only interactive islands
│ Fast Loading    │ ← Server-rendered HTML
│ SEO Optimized   │ ← Pre-rendered content
└─────────────────┘
        ↕ HTTP
┌─────────────────┐
│   Fresh Server  │
├─────────────────┤
│ File-based      │ ← Automatic routing
│ TypeScript      │ ← Zero config
│ SSR + Islands   │ ← Hybrid rendering
└─────────────────┘
```

### ConnectRPC: Type-Safe RPC Communication

ConnectRPC is a family of libraries for building HTTP APIs using Protocol Buffers with a focus on simplicity and compatibility.

#### Core Concepts

**1. Protocol Buffer Schema-First**
- Define APIs using Protocol Buffers (.proto files)
- Generate type-safe client and server code
- Schema evolution with backward compatibility

**2. Multi-Protocol Support**
- gRPC: High-performance binary protocol
- gRPC-Web: Browser-compatible variant
- Connect: Simple HTTP/JSON protocol
- Same service accessible via all protocols

**3. Type Safety Across the Stack**
- Compile-time guarantees for request/response types
- Automatic serialization/deserialization
- IDE autocompletion and error detection

**4. Streaming Support**
- Unary: Single request/response
- Server streaming: Server pushes multiple responses
- Client streaming: Client sends multiple requests
- Bidirectional streaming: Full-duplex communication

**5. Interceptor Pattern**
- Middleware for cross-cutting concerns
- Authentication, logging, metrics, rate limiting
- Composable and reusable across services

#### ConnectRPC Architecture Benefits

```
┌─────────────────┐
│   TypeScript    │ ← Generated types
│   Client        │ ← Type-safe calls
└─────────────────┘
        ↕ HTTP/JSON or gRPC
┌─────────────────┐
│   Go Server     │ ← Generated handlers
│   ConnectRPC    │ ← Multi-protocol
│   Service       │ ← Type-safe implementation
└─────────────────┘
        ↕
┌─────────────────┐
│ Protocol Buffer │ ← Single source of truth
│ Schema (.proto) │ ← Version controlled
└─────────────────┘
```

## Integration Architecture

### How Fresh + ConnectRPC Work Together

The combination creates a modern, type-safe, full-stack architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Fresh Frontend                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐      │
│  │   Routes    │  │   Islands   │  │   Components    │      │
│  │ (SSR Pages) │  │ (Client JS) │  │ (Static Preact) │      │
│  └─────────────┘  └─────────────┘  └─────────────────┘      │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Generated ConnectRPC Client                  │ │
│  │     • Type-safe RPC calls                             │ │
│  │     • Automatic serialization                         │ │
│  │     • Error handling                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │ HTTP/JSON or gRPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Proxy Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Fresh Route: /api/[...path].ts                            │
│  • Forwards requests to backend                            │
│  • Handles CORS and headers                                │
│  • Provides unified API endpoint                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ConnectRPC Backend                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Generated ConnectRPC Server                  │ │
│  │     • Type-safe service implementation                 │ │
│  │     • Multi-protocol support                           │ │
│  │     • Interceptor middleware                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Business Logic Layer                      │ │
│  │     • Service implementations                          │ │
│  │     • Repository pattern                               │ │
│  │     • Domain models                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database                               │
│                    (MySQL/PostgreSQL)                      │
└─────────────────────────────────────────────────────────────┘
```

### Integration Patterns

#### 1. Schema-Driven Development

```protobuf
// proto/todo/v1/todo.proto
syntax = "proto3";

package todo.v1;

service TodoService {
  rpc CreateTask(CreateTaskRequest) returns (CreateTaskResponse);
  rpc ListTasks(ListTasksRequest) returns (ListTasksResponse);
  rpc UpdateTask(UpdateTaskRequest) returns (UpdateTaskResponse);
  rpc DeleteTask(DeleteTaskRequest) returns (DeleteTaskResponse);
}

message Task {
  string id = 1;
  string title = 2;
  bool completed = 3;
  google.protobuf.Timestamp created_at = 4;
  google.protobuf.Timestamp updated_at = 5;
}
```

#### 2. Code Generation Workflow

```bash
# Generate both client and server code
buf generate

# Results in:
# - backend/internal/gen/          (Go server code)
# - frontend/lib/gen/             (TypeScript client code)
```

#### 3. Fresh API Proxy Pattern

```typescript
// frontend/routes/api/[...path].ts
import { Handlers } from "@fresh/core";

export const handler: Handlers = {
  async fetch(req) {
    const url = new URL(req.url);
    const backendUrl = `${getBackendURL()}${url.pathname.replace('/api', '')}${url.search}`;
    
    // Forward request to ConnectRPC backend
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    
    return response;
  },
};
```

#### 4. Type-Safe Client Usage

```typescript
// frontend/islands/TodoApp.tsx
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { TodoService } from "../lib/gen/todo/v1/todo_connect.ts";

const transport = createConnectTransport({
  baseUrl: "/api", // Routes through Fresh proxy
});

const client = createClient(TodoService, transport);

// Type-safe RPC calls
async function createTask(title: string) {
  const response = await client.createTask({ title });
  return response.task; // Fully typed
}
```

#### 5. Go Service Implementation

```go
// backend/internal/service/todo.go
func (s *TodoService) CreateTask(
    ctx context.Context,
    req *connect.Request[todov1.CreateTaskRequest],
) (*connect.Response[todov1.CreateTaskResponse], error) {
    // Validate input
    if req.Msg.Title == "" {
        return nil, connect.NewError(
            connect.CodeInvalidArgument,
            errors.New("title is required"),
        )
    }
    
    // Create task
    task := &todov1.Task{
        Id:        uuid.NewString(),
        Title:     req.Msg.Title,
        Completed: false,
        CreatedAt: timestamppb.Now(),
        UpdatedAt: timestamppb.Now(),
    }
    
    // Save to database
    if err := s.repo.Create(ctx, task); err != nil {
        return nil, connect.NewError(
            connect.CodeInternal,
            fmt.Errorf("failed to create task: %w", err),
        )
    }
    
    return connect.NewResponse(&todov1.CreateTaskResponse{
        Task: task,
    }), nil
}
```

## Key Integration Benefits

### 1. End-to-End Type Safety

- **Schema Definition**: Single source of truth in Protocol Buffers
- **Generated Types**: Automatic TypeScript and Go type generation
- **Compile-Time Errors**: Catch API mismatches before runtime
- **IDE Support**: Full autocompletion and error detection

### 2. Performance Optimization

- **Fresh SSR**: Fast initial page loads with pre-rendered HTML
- **Minimal Client JS**: Only interactive components hydrate
- **Efficient Protocols**: gRPC for internal services, HTTP/JSON for web
- **Connection Reuse**: HTTP/2 multiplexing for RPC calls

### 3. Developer Experience

- **Zero Configuration**: Fresh provides TypeScript support out-of-the-box
- **Hot Reload**: Development server with instant updates
- **Generated Code**: No manual API client writing
- **Consistent Patterns**: Same RPC patterns across all services

### 4. Scalability

- **Protocol Flexibility**: Start with HTTP/JSON, upgrade to gRPC
- **Service Boundaries**: Clear separation between frontend and backend
- **Schema Evolution**: Backward-compatible API changes
- **Microservices Ready**: ConnectRPC services can be distributed

### 5. Modern Web Standards

- **Progressive Enhancement**: Works without JavaScript
- **SEO Friendly**: Server-rendered content for search engines
- **Accessibility**: Semantic HTML with client-side enhancements
- **Core Web Vitals**: Optimized for Google's performance metrics

## Development Workflow

### 1. Schema-First Development

```bash
# 1. Define API in Protocol Buffers
vim proto/todo/v1/todo.proto

# 2. Generate client and server code
buf generate

# 3. Implement service in Go
vim backend/internal/service/todo.go

# 4. Use generated client in Fresh
vim frontend/islands/TodoApp.tsx

# 5. Test end-to-end
deno task test:integration
```

### 2. Hot Reload Development

```bash
# Start full development stack
deno task dev:all

# This runs:
# - Fresh frontend with hot reload (port 8007)
# - Go backend with air hot reload (port 3007)
# - MySQL database (port 3307)
```

### 3. Testing Strategy

```bash
# Frontend tests (Deno)
cd frontend && deno test

# Backend tests (Go)
cd backend && go test ./...

# Integration tests
deno task test:integration

# End-to-end tests
deno task test:e2e
```

## Production Considerations

### 1. Deployment Architecture

```yaml
# docker-compose.prod.yml
services:
  frontend:
    image: fresh-app:latest
    ports:
      - "8007:8007"
    environment:
      BACKEND_URL: "http://backend:3007"
  
  backend:
    image: connectrpc-service:latest
    ports:
      - "3007:3007"
    environment:
      DATABASE_URL: "postgres://..."
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    # Load balancer + SSL termination
```

### 2. Performance Optimization

- **Frontend**: Pre-built static assets, CDN distribution
- **Backend**: Connection pooling, database optimization
- **Network**: HTTP/2, compression, caching headers
- **Monitoring**: Metrics, logging, tracing

### 3. Security Best Practices

- **Authentication**: JWT tokens, OAuth integration
- **Authorization**: Role-based access control
- **Transport Security**: TLS encryption
- **Input Validation**: Server-side validation of all inputs

## Comparison with Alternatives

### vs. REST APIs

| Aspect | Fresh + ConnectRPC | Fresh + REST |
|--------|-------------------|--------------|
| Type Safety | ✅ End-to-end | ❌ Manual typing |
| API Documentation | ✅ Auto-generated | ❌ Manual docs |
| Performance | ✅ Binary protocol | ❌ JSON overhead |
| Schema Evolution | ✅ Built-in versioning | ❌ Manual versioning |
| Tooling | ✅ Code generation | ❌ Manual clients |

### vs. GraphQL

| Aspect | Fresh + ConnectRPC | Fresh + GraphQL |
|--------|-------------------|-----------------|
| Learning Curve | ✅ Simpler | ❌ Complex |
| Type Safety | ✅ Compile-time | ❌ Runtime |
| Performance | ✅ Efficient | ❌ N+1 queries |
| Schema Evolution | ✅ Backward compatible | ❌ Breaking changes |
| Caching | ✅ HTTP caching | ❌ Complex caching |

### vs. Next.js + tRPC

| Aspect | Fresh + ConnectRPC | Next.js + tRPC |
|--------|-------------------|----------------|
| Runtime | ✅ Deno | ❌ Node.js |
| Bundle Size | ✅ Minimal | ❌ Large |
| Type Safety | ✅ Cross-language | ✅ TypeScript only |
| Standards | ✅ Protocol Buffers | ❌ Custom |
| Performance | ✅ Islands architecture | ❌ Full hydration |

## Getting Started

### Prerequisites

```bash
# Install required tools
deno --version  # >= 1.40
go version      # >= 1.21
buf --version   # >= 1.28
```

### Quick Start

```bash
# 1. Clone the project
git clone <your-repo>
cd simple-connect-web-stack

# 2. Generate code from schemas
buf generate

# 3. Start development environment
deno task up

# 4. Open browser
open http://localhost:8007
```

### Project Structure

```
simple-connect-web-stack/
├── proto/                    # Protocol Buffer definitions
│   └── todo/v1/todo.proto   # API schema
├── frontend/                 # Fresh application
│   ├── routes/              # Pages and API proxy
│   ├── islands/             # Interactive components
│   ├── components/          # Static components
│   └── lib/gen/             # Generated TypeScript client
├── backend/                  # Go ConnectRPC service
│   ├── cmd/server/          # Application entry point
│   ├── internal/service/    # RPC service implementation
│   └── internal/gen/        # Generated Go server code
└── docker-compose.yml       # Development environment
```

## Conclusion

The combination of Fresh and ConnectRPC provides a modern, type-safe, and performant architecture for building full-stack web applications. Fresh's islands architecture ensures optimal performance and user experience, while ConnectRPC provides robust, type-safe API communication with excellent developer experience.

This architecture is particularly well-suited for:

- **Modern Web Applications**: Progressive enhancement with optimal performance
- **Type-Safe Development**: End-to-end type safety across the entire stack
- **Scalable Services**: Clean separation of concerns with RPC boundaries
- **Developer Productivity**: Generated code and excellent tooling
- **Production Reliability**: Proven technologies with strong error handling

The schema-first approach ensures API consistency, the generated code eliminates boilerplate, and the modern web standards provide an excellent user experience.