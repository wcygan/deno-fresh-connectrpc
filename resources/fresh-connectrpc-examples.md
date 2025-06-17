# Fresh + ConnectRPC: Practical Implementation Examples

This guide provides comprehensive, real-world examples of how Fresh and ConnectRPC work together in practice. Each example includes complete code snippets from our actual implementation, showing the full flow from frontend to backend.

## Table of Contents

1. [Complete CRUD Example: Task Management](#complete-crud-example-task-management)
2. [Frontend Implementation Examples](#frontend-implementation-examples)
3. [Backend Implementation Examples](#backend-implementation-examples)
4. [Integration Patterns](#integration-patterns)
5. [State Management with Signals](#state-management-with-signals)
6. [Error Handling Examples](#error-handling-examples)
7. [Testing Examples](#testing-examples)
8. [Performance Optimization Examples](#performance-optimization-examples)

## Complete CRUD Example: Task Management

This section demonstrates a complete CRUD implementation using the Todo service, showing how data flows from the browser through Fresh to the ConnectRPC backend.

### 1. Protocol Buffer Schema Definition

**File: `proto/todo/v1/todo.proto`**

```protobuf
syntax = "proto3";

package todo.v1;

import "google/protobuf/timestamp.proto";
import "google/protobuf/empty.proto";

// TodoService provides CRUD operations for tasks
service TodoService {
  rpc CreateTask(CreateTaskRequest) returns (CreateTaskResponse);
  rpc GetTask(GetTaskRequest) returns (GetTaskResponse);
  rpc ListTasks(ListTasksRequest) returns (ListTasksResponse);
  rpc UpdateTask(UpdateTaskRequest) returns (UpdateTaskResponse);
  rpc DeleteTask(DeleteTaskRequest) returns (google.protobuf.Empty);
  rpc HealthCheck(google.protobuf.Empty) returns (HealthCheckResponse);
}

// Task represents a todo item
message Task {
  string id = 1;                               // UUID v4
  string title = 2;                            // Task title (max 255 chars)
  bool completed = 3;                          // Completion status
  google.protobuf.Timestamp created_at = 4;    // Creation timestamp
  google.protobuf.Timestamp updated_at = 5;    // Last update timestamp
}

message CreateTaskRequest {
  string title = 1; // Required, max 255 chars
}

message CreateTaskResponse {
  Task task = 1;
}

message ListTasksRequest {
  uint32 page = 1;          // Page number (1-based), default: 1
  uint32 page_size = 2;     // Items per page, default: 20, max: 100
  string query = 3;         // Search in title
  StatusFilter status = 4;  // Filter by completion status
  SortField sort_by = 5;    // Field to sort by
  SortOrder sort_order = 6; // Sort direction
}

message ListTasksResponse {
  repeated Task tasks = 1;
  PaginationMetadata pagination = 2;
}

// Additional message types...
```

### 2. Generated Type-Safe Client

After running `buf generate`, we get type-safe TypeScript definitions:

**File: `frontend/lib/gen/todo/v1/todo_connect.ts` (Generated)**

```typescript
export const TodoService = {
  typeName: "todo.v1.TodoService",
  methods: {
    createTask: {
      name: "CreateTask",
      I: CreateTaskRequest,
      O: CreateTaskResponse,
      kind: MethodKind.Unary,
    },
    listTasks: {
      name: "ListTasks",
      I: ListTasksRequest,
      O: ListTasksResponse,
      kind: MethodKind.Unary,
    },
    // ... other methods
  }
} as const;
```

## Frontend Implementation Examples

### 1. Setting Up the ConnectRPC Client

**File: `frontend/hooks/useTodoClient.ts`**

```typescript
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { TodoService } from "@buf/wcygan_simple-connect-web-stack.bufbuild_es/todo/v1/todo_pb.js";
import { useMemo } from "preact/hooks";

/**
 * Custom hook for managing the TodoService RPC client
 * Creates a singleton client instance with Connect Web transport
 */
export function useTodoClient() {
  const client = useMemo(() => {
    // Create HTTP transport for browser compatibility
    const transport = createConnectTransport({ 
      baseUrl: "/api",  // Routes through Fresh's API proxy
      // Additional options:
      // credentials: "include",  // For cookies/auth
      // interceptors: [authInterceptor],  // Custom interceptors
    });
    
    // Create type-safe RPC client
    return createClient(TodoService, transport);
  }, []);

  return client;
}
```

**Key Points:**
- Uses `createConnectTransport` for HTTP/JSON communication
- `baseUrl: "/api"` routes through Fresh's proxy system
- Client is memoized to prevent recreation on every render
- Fully type-safe with generated service definition

### 2. State Management with Preact Signals

**File: `frontend/hooks/useTodoState.ts`**

```typescript
import { useSignal } from "@preact/signals";
import type { Task } from "@buf/wcygan_simple-connect-web-stack.bufbuild_es/todo/v1/todo_pb.js";

/**
 * Custom hook for managing todo-related state
 * Uses Preact signals for reactive state management
 */
export function useTodoState() {
  // Reactive signals - automatically trigger re-renders when changed
  const tasks = useSignal<Task[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const newTaskTitle = useSignal("");
  const isAdding = useSignal(false);

  // State mutation helpers
  const clearError = () => {
    error.value = null;
  };

  const setError = (message: string) => {
    error.value = message;
  };

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading;
  };

  const setTasks = (newTasks: Task[]) => {
    tasks.value = newTasks;
  };

  // Optimistic UI updates
  const addTask = (task: Task) => {
    tasks.value = [task, ...tasks.value];  // Add to beginning
  };

  const updateTask = (updatedTask: Task) => {
    tasks.value = tasks.value.map(t => 
      t.id === updatedTask.id ? updatedTask : t
    );
  };

  const removeTask = (taskId: string) => {
    tasks.value = tasks.value.filter(t => t.id !== taskId);
  };

  // Utility function for sorting tasks by creation date
  const sortTasksByDate = (tasksToSort: Task[]) => {
    return tasksToSort.sort((a, b) => {
      const dateA = a.createdAt ? new Date(Number(a.createdAt.seconds) * 1000) : new Date();
      const dateB = b.createdAt ? new Date(Number(b.createdAt.seconds) * 1000) : new Date();
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
  };

  return {
    // State signals
    tasks,
    loading,
    error,
    newTaskTitle,
    isAdding,
    
    // Helper functions
    clearError,
    setError,
    setLoading,
    setTasks,
    addTask,
    updateTask,
    removeTask,
    sortTasksByDate,
  };
}
```

**Key Benefits:**
- **Reactive Updates**: Signals automatically trigger re-renders
- **Fine-Grained Reactivity**: Only components using changed signals re-render
- **Type Safety**: Fully typed with generated Protocol Buffer types
- **Optimistic UI**: Immediate UI updates before server confirmation

### 3. Business Logic with RPC Calls

**File: `frontend/hooks/useTodoActions.ts`**

```typescript
import { useEffect } from "preact/hooks";
import type { Task } from "@buf/wcygan_simple-connect-web-stack.bufbuild_es/todo/v1/todo_pb.js";
import { useTodoClient } from "./useTodoClient.ts";
import { useTodoState } from "./useTodoState.ts";

/**
 * Custom hook combining state management with RPC business logic
 * Demonstrates complete CRUD operations with error handling
 */
export function useTodoActions() {
  const client = useTodoClient();
  const state = useTodoState();

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  /**
   * Load all tasks from server
   * Example of ListTasks RPC call with pagination
   */
  const loadTasks = async () => {
    state.setLoading(true);
    state.clearError();
    
    try {
      // Type-safe RPC call
      const response = await client.listTasks({ 
        page: 1, 
        pageSize: 100,
        // Optional filters:
        // query: "search term",
        // status: StatusFilter.STATUS_FILTER_PENDING,
        // sortBy: SortField.SORT_FIELD_CREATED_AT,
        // sortOrder: SortOrder.SORT_ORDER_DESC,
      });
      
      const sortedTasks = state.sortTasksByDate(response.tasks);
      state.setTasks(sortedTasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks";
      state.setError(message);
    } finally {
      state.setLoading(false);
    }
  };

  /**
   * Create a new task
   * Example of CreateTask RPC call with optimistic updates
   */
  const createTask = async (e: Event) => {
    e.preventDefault();
    if (!state.newTaskTitle.value.trim() || state.isAdding.value) return;
    
    state.isAdding.value = true;
    state.clearError();
    
    try {
      // Type-safe RPC call with request validation
      const response = await client.createTask({ 
        title: state.newTaskTitle.value.trim() 
      });
      
      if (response.task) {
        // Optimistic UI update
        state.addTask(response.task);
        state.newTaskTitle.value = "";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      state.setError(message);
    } finally {
      state.isAdding.value = false;
    }
  };

  /**
   * Toggle task completion status
   * Example of UpdateTask RPC call
   */
  const toggleTask = async (task: Task) => {
    try {
      const response = await client.updateTask({
        id: task.id,
        title: task.title,
        completed: !task.completed  // Toggle completion
      });
      
      if (response.task) {
        // Update state with server response
        state.updateTask(response.task);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update task";
      state.setError(message);
      // Could implement rollback here for optimistic updates
    }
  };

  /**
   * Delete a task
   * Example of DeleteTask RPC call
   */
  const deleteTask = async (id: string) => {
    try {
      // DeleteTask returns Empty message
      await client.deleteTask({ id });
      
      // Remove from UI immediately
      state.removeTask(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      state.setError(message);
    }
  };

  return {
    // Expose all state
    ...state,
    
    // Expose actions
    loadTasks,
    createTask,
    toggleTask,
    deleteTask,
  };
}
```

### 4. UI Component Implementation

**File: `frontend/components/todo/TaskItem.tsx`**

```typescript
import type { Task } from "@buf/wcygan_simple-connect-web-stack.bufbuild_es/todo/v1/todo_pb.js";

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}

/**
 * Individual task item component
 * Demonstrates working with Protocol Buffer timestamp types
 */
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  // Convert Protocol Buffer timestamp to JavaScript Date
  const createdDate = task.createdAt 
    ? new Date(Number(task.createdAt.seconds) * 1000).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })
    : '';

  return (
    <div class="group bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 hover:border-white/25 rounded-lg p-4 hover-lift animate-scale-in">
      <div class="flex items-center gap-4">
        {/* Completion toggle */}
        <input
          type="checkbox"
          id={`task-${task.id}`}
          checked={task.completed}
          onChange={() => onToggle(task)}
          class="cursor-pointer w-5 h-5"
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        />
        
        {/* Task title with completion styling */}
        <label 
          for={`task-${task.id}`}
          class={`flex-1 cursor-pointer select-none transition-all duration-200 text-base ${
            task.completed 
              ? "line-through text-gray-500" 
              : "text-gray-100"
          }`}
        >
          {task.title}
        </label>
        
        <div class="flex items-center gap-3">
          {/* Creation date display */}
          <span class="text-xs text-gray-400 hidden sm:block">
            {createdDate}
          </span>
          
          {/* Delete button */}
          <button
            onClick={() => onDelete(task.id)}
            class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all duration-200 focus:opacity-100"
            aria-label={`Delete "${task.title}"`}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5. Fresh API Proxy Implementation

**File: `frontend/routes/api/[...path].ts`**

```typescript
import type { FreshContext } from "fresh";

/**
 * Fresh catch-all route that proxies API requests to the backend
 * This enables the frontend to make RPC calls through /api/* endpoints
 */
export const handler = (ctx: FreshContext): Response | Promise<Response> => {
  const method = ctx.req.method;
  
  // Handle CORS preflight requests
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Connect-Protocol-Version",
      },
    });
  }
  
  return proxyToBackend(ctx.req);
};

/**
 * Proxy function that forwards requests to the Go backend
 * Preserves all headers and body content for ConnectRPC
 */
async function proxyToBackend(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Transform /api/todo.v1.TodoService/CreateTask -> /todo.v1.TodoService/CreateTask
  const backendUrl = `${Deno.env.get("BACKEND_URL") || "http://localhost:3007"}${url.pathname.replace('/api', '')}${url.search}`;
  
  // Forward the request with all original headers and body
  const response = await fetch(backendUrl, {
    method: req.method,
    headers: req.headers,  // Includes Connect-Protocol-Version
    body: req.body,        // Raw request body (JSON for Connect protocol)
  });
  
  // Create new response with CORS headers
  const modifiedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  
  // Ensure CORS headers are set for browser compatibility
  modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
  modifiedResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  modifiedResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version");
  
  return modifiedResponse;
}
```

**Key Features:**
- **Catch-all Routing**: `[...path].ts` captures all `/api/*` requests
- **URL Rewriting**: Strips `/api` prefix before forwarding
- **Header Preservation**: Maintains ConnectRPC headers like `Connect-Protocol-Version`
- **CORS Support**: Handles preflight OPTIONS requests
- **Environment Configuration**: Configurable backend URL

## Backend Implementation Examples

### 1. ConnectRPC Service Implementation

**File: `backend/internal/service/todo.go`**

```go
package service

import (
	"context"
	"database/sql"
	"strings"

	"connectrpc.com/connect"
	"github.com/wcygan/simple-connect-web-stack/internal/middleware"
	"github.com/wcygan/simple-connect-web-stack/internal/repository"
	"github.com/wcygan/simple-connect-web-stack/internal/validator"
	todov1 "buf.build/gen/go/wcygan/simple-connect-web-stack/protocolbuffers/go/todo/v1"
	"google.golang.org/protobuf/types/known/emptypb"
)

/**
 * TodoService implements the ConnectRPC TodoService interface
 * Provides type-safe RPC handlers with validation and error handling
 */
type TodoService struct {
	repo         repository.TodoRepository
	validator    *validator.TodoValidator
	errorHandler *middleware.ErrorHandler
}

// Constructor with dependency injection
func NewTodoService(db *sql.DB) *TodoService {
	logger := middleware.NewStructuredLogger(middleware.LevelInfo)
	return &TodoService{
		repo:         repository.NewMySQLTodoRepository(db),
		validator:    validator.NewTodoValidator(),
		errorHandler: middleware.NewErrorHandler(logger),
	}
}

/**
 * CreateTask implements the CreateTask RPC method
 * Demonstrates request validation, business logic, and error handling
 */
func (s *TodoService) CreateTask(
	ctx context.Context,
	req *connect.Request[todov1.CreateTaskRequest],
) (*connect.Response[todov1.CreateTaskResponse], error) {
	// Step 1: Validate the incoming request
	if err := s.validator.ValidateCreateTask(req.Msg); err != nil {
		return nil, s.errorHandler.HandleValidationError(err)
	}

	// Step 2: Prepare repository request
	createReq := &repository.CreateTaskRequest{
		Title: strings.TrimSpace(req.Msg.Title),
	}

	// Step 3: Persist to database
	task, err := s.repo.Create(ctx, createReq)
	if err != nil {
		return nil, s.errorHandler.HandleRepositoryError(err)
	}

	// Step 4: Return type-safe response
	return connect.NewResponse(&todov1.CreateTaskResponse{
		Task: task,
	}), nil
}

/**
 * ListTasks implements the ListTasks RPC method
 * Demonstrates pagination, filtering, and sorting
 */
func (s *TodoService) ListTasks(
	ctx context.Context,
	req *connect.Request[todov1.ListTasksRequest],
) (*connect.Response[todov1.ListTasksResponse], error) {
	// Validate request
	if err := s.validator.ValidateListTasks(req.Msg); err != nil {
		return nil, s.errorHandler.HandleValidationError(err)
	}

	// Convert Protocol Buffer request to repository request
	filters := &repository.ListTasksRequest{
		Page:      req.Msg.Page,
		PageSize:  req.Msg.PageSize,
		Query:     req.Msg.Query,
		Status:    req.Msg.Status,      // Enum type
		SortBy:    req.Msg.SortBy,      // Enum type
		SortOrder: req.Msg.SortOrder,   // Enum type
	}

	// Query database with filters
	tasks, pagination, err := s.repo.List(ctx, filters)
	if err != nil {
		return nil, s.errorHandler.HandleRepositoryError(err)
	}

	// Convert repository response to Protocol Buffer response
	return connect.NewResponse(&todov1.ListTasksResponse{
		Tasks: tasks,
		Pagination: &todov1.PaginationMetadata{
			Page:        pagination.Page,
			PageSize:    pagination.PageSize,
			TotalPages:  pagination.TotalPages,
			TotalItems:  pagination.TotalItems,
			HasPrevious: pagination.HasPrevious,
			HasNext:     pagination.HasNext,
		},
	}), nil
}

/**
 * UpdateTask implements the UpdateTask RPC method
 * Demonstrates partial updates and optimistic concurrency
 */
func (s *TodoService) UpdateTask(
	ctx context.Context,
	req *connect.Request[todov1.UpdateTaskRequest],
) (*connect.Response[todov1.UpdateTaskResponse], error) {
	// Validate request
	if err := s.validator.ValidateUpdateTask(req.Msg); err != nil {
		return nil, s.errorHandler.HandleValidationError(err)
	}

	// Convert to repository request
	updateReq := &repository.UpdateTaskRequest{
		ID:        req.Msg.Id,
		Title:     strings.TrimSpace(req.Msg.Title),
		Completed: req.Msg.Completed,
	}

	// Update in database
	task, err := s.repo.Update(ctx, updateReq)
	if err != nil {
		return nil, s.errorHandler.HandleRepositoryError(err)
	}

	return connect.NewResponse(&todov1.UpdateTaskResponse{
		Task: task,
	}), nil
}

/**
 * DeleteTask implements the DeleteTask RPC method
 * Returns Empty response as defined in Protocol Buffer schema
 */
func (s *TodoService) DeleteTask(
	ctx context.Context,
	req *connect.Request[todov1.DeleteTaskRequest],
) (*connect.Response[emptypb.Empty], error) {
	// Validate request
	if err := s.validator.ValidateDeleteTask(req.Msg); err != nil {
		return nil, s.errorHandler.HandleValidationError(err)
	}

	// Delete from database
	err := s.repo.Delete(ctx, req.Msg.Id)
	if err != nil {
		return nil, s.errorHandler.HandleRepositoryError(err)
	}

	// Return empty response (standard for delete operations)
	return connect.NewResponse(&emptypb.Empty{}), nil
}

/**
 * HealthCheck implements the HealthCheck RPC method
 * Useful for load balancer health checks and monitoring
 */
func (s *TodoService) HealthCheck(
	ctx context.Context,
	req *connect.Request[emptypb.Empty],
) (*connect.Response[todov1.HealthCheckResponse], error) {
	// Check database connectivity
	if err := s.repo.HealthCheck(ctx); err != nil {
		return nil, s.errorHandler.HandleRepositoryError(err)
	}

	return connect.NewResponse(&todov1.HealthCheckResponse{
		Status: "ok",
	}), nil
}
```

### 2. Repository Pattern Implementation

**File: `backend/internal/repository/todo.go` (Key Methods)**

```go
/**
 * Create implements task creation with UUID generation
 * Demonstrates database operations with generated Protocol Buffer types
 */
func (r *mysqlTodoRepository) Create(ctx context.Context, req *CreateTaskRequest) (*todov1.Task, error) {
	start := time.Now()
	ctx = middleware.WithSource(ctx, "repository.Create")
	
	// Generate UUID for new task
	id := uuid.New().String()

	// Insert into database
	query := `
		INSERT INTO tasks (id, title, completed)
		VALUES (?, ?, FALSE)
	`
	
	result, err := r.db.ExecContext(ctx, query, id, req.Title)
	duration := time.Since(start)
	
	// Log database operation for monitoring
	var rowsAffected int64
	if result != nil {
		rowsAffected, _ = result.RowsAffected()
	}
	r.logger.LogDatabaseOperation(ctx, "INSERT tasks", duration, err == nil, rowsAffected)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	// Return the created task with timestamps
	return r.GetByID(ctx, id)
}

/**
 * List implements pagination, filtering, and sorting
 * Converts database rows to Protocol Buffer Task messages
 */
func (r *mysqlTodoRepository) List(ctx context.Context, filters *ListTasksRequest) ([]*todov1.Task, *PaginationResult, error) {
	// Set defaults for pagination
	page := filters.Page
	if page == 0 {
		page = 1
	}
	
	pageSize := filters.PageSize
	if pageSize == 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100  // Prevent abuse
	}

	// Build dynamic WHERE clause
	conditions := []string{}
	args := []interface{}{}

	// Search query filter
	if filters.Query != "" {
		conditions = append(conditions, "title LIKE ?")
		args = append(args, "%"+filters.Query+"%")
	}

	// Status filter using Protocol Buffer enum
	switch filters.Status {
	case todov1.StatusFilter_STATUS_FILTER_COMPLETED:
		conditions = append(conditions, "completed = TRUE")
	case todov1.StatusFilter_STATUS_FILTER_PENDING:
		conditions = append(conditions, "completed = FALSE")
	}

	// Build complete query with sorting
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Determine sort field from Protocol Buffer enum
	sortField := "created_at"
	switch filters.SortBy {
	case todov1.SortField_SORT_FIELD_UPDATED_AT:
		sortField = "updated_at"
	case todov1.SortField_SORT_FIELD_TITLE:
		sortField = "title"
	}

	sortOrder := "DESC"
	if filters.SortOrder == todov1.SortOrder_SORT_ORDER_ASC {
		sortOrder = "ASC"
	}

	// Execute paginated query
	query := fmt.Sprintf(`
		SELECT id, title, completed, created_at, updated_at
		FROM tasks
		%s
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, whereClause, sortField, sortOrder)

	offset := (page - 1) * pageSize
	args = append(args, pageSize, offset)
	
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to query tasks: %w", err)
	}
	defer rows.Close()

	// Convert database rows to Protocol Buffer messages
	tasks := []*todov1.Task{}
	for rows.Next() {
		var task todov1.Task
		var createdAt, updatedAt sql.NullTime

		err := rows.Scan(&task.Id, &task.Title, &task.Completed, &createdAt, &updatedAt)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to scan task: %w", err)
		}

		// Convert SQL timestamps to Protocol Buffer timestamps
		if createdAt.Valid {
			task.CreatedAt = timestamppb.New(createdAt.Time)
		}
		if updatedAt.Valid {
			task.UpdatedAt = timestamppb.New(updatedAt.Time)
		}

		tasks = append(tasks, &task)
	}

	// Calculate pagination metadata
	totalItems := uint32(len(tasks)) // Simplified for example
	totalPages := (totalItems + pageSize - 1) / pageSize
	
	pagination := &PaginationResult{
		Page:        page,
		PageSize:    pageSize,
		TotalPages:  totalPages,
		TotalItems:  totalItems,
		HasPrevious: page > 1,
		HasNext:     page < totalPages,
	}

	return tasks, pagination, nil
}
```

### 3. Server Setup and Handler Registration

**File: `backend/cmd/server/main.go` (Key Sections)**

```go
func main() {
	// Database setup
	database, err := sql.Open("mysql", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Initialize middleware stack
	logLevel := middleware.GetLogLevel(os.Getenv("LOG_LEVEL"))
	logger := middleware.NewStructuredLogger(logLevel)
	middlewareStack := middleware.NewMiddlewareStack(logger)

	// Create service with dependency injection
	todoService := service.NewTodoService(database)

	// Create HTTP mux
	mux := http.NewServeMux()

	// Register ConnectRPC service handler
	interceptors := middlewareStack.GetConnectInterceptors()
	path, handler := todov1connect.NewTodoServiceHandler(
		todoService, 
		connect.WithInterceptors(interceptors...),
	)
	mux.Handle(path, handler)

	// Apply middleware stack (logging, recovery, metrics, etc.)
	finalHandler := middlewareStack.WrapHandler(mux)
	
	// Add CORS support for browser requests
	corsHandler := withCORS(finalHandler)

	// Start server
	server := &http.Server{
		Addr:    ":" + port,
		Handler: corsHandler,
	}

	log.Printf("Server starting on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}

/**
 * CORS middleware for browser compatibility
 * Essential for Fresh frontend to communicate with backend
 */
func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for all responses
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version")
		
		// Handle preflight OPTIONS requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		h.ServeHTTP(w, r)
	})
}
```

## Integration Patterns

### 1. End-to-End Type Safety

```typescript
// Frontend: Type-safe RPC call
const response = await client.createTask({ title: "Learn ConnectRPC" });
//    ^? CreateTaskResponse (fully typed)

// Backend: Type-safe handler
func (s *TodoService) CreateTask(
	ctx context.Context,
	req *connect.Request[todov1.CreateTaskRequest],  // Typed request
) (*connect.Response[todov1.CreateTaskResponse], error) {  // Typed response
	// Implementation
}
```

### 2. Error Handling Pattern

```typescript
// Frontend error handling
try {
  const response = await client.createTask({ title: "" });
} catch (err) {
  if (err instanceof ConnectError) {
    switch (err.code) {
      case Code.InvalidArgument:
        setError("Invalid task title");
        break;
      case Code.Internal:
        setError("Server error occurred");
        break;
      default:
        setError("Unknown error occurred");
    }
  }
}
```

```go
// Backend error handling
if err := s.validator.ValidateCreateTask(req.Msg); err != nil {
	return nil, connect.NewError(connect.CodeInvalidArgument, err)
}

if err := s.repo.Create(ctx, createReq); err != nil {
	return nil, connect.NewError(connect.CodeInternal, 
		fmt.Errorf("failed to create task: %w", err))
}
```

### 3. Optimistic UI Updates

```typescript
// Optimistic update pattern
const toggleTask = async (task: Task) => {
  // 1. Update UI immediately
  const optimisticTask = { ...task, completed: !task.completed };
  state.updateTask(optimisticTask);
  
  try {
    // 2. Send request to server
    const response = await client.updateTask({
      id: task.id,
      title: task.title,
      completed: !task.completed
    });
    
    // 3. Update with server response
    if (response.task) {
      state.updateTask(response.task);
    }
  } catch (err) {
    // 4. Rollback on error
    state.updateTask(task);
    state.setError("Failed to update task");
  }
};
```

### 4. Data Transformation Pattern

```typescript
// Protocol Buffer timestamp handling
const formatTaskDate = (task: Task) => {
  if (!task.createdAt) return '';
  
  // Convert Protocol Buffer timestamp to JavaScript Date
  const date = new Date(Number(task.createdAt.seconds) * 1000);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};
```

## State Management with Signals

### 1. Reactive State Updates

```typescript
// Signals automatically trigger re-renders when changed
const tasks = useSignal<Task[]>([]);
const loading = useSignal(false);

// This will trigger a re-render of any component using these signals
tasks.value = [...tasks.value, newTask];
loading.value = true;
```

### 2. Computed Values

```typescript
// Computed signals derive values from other signals
const completedTasks = useComputed(() => 
  tasks.value.filter(task => task.completed)
);

const taskStats = useComputed(() => ({
  total: tasks.value.length,
  completed: completedTasks.value.length,
  pending: tasks.value.length - completedTasks.value.length
}));
```

### 3. Signal-Based Effects

```typescript
// Effects that run when signals change
useEffect(() => {
  // This runs whenever tasks.value changes
  localStorage.setItem('tasks', JSON.stringify(tasks.value));
}, [tasks.value]);
```

## Error Handling Examples

### 1. Structured Error Types

```typescript
interface TodoError {
  code: string;
  message: string;
  field?: string;
}

const handleTodoError = (err: unknown): TodoError => {
  if (err instanceof ConnectError) {
    return {
      code: err.code,
      message: err.message,
      field: err.details[0]?.value?.field
    };
  }
  
  return {
    code: 'UNKNOWN',
    message: 'An unexpected error occurred'
  };
};
```

### 2. Backend Error Handling

```go
// Custom error handler with logging
func (eh *ErrorHandler) HandleValidationError(err error) error {
	eh.logger.Error("Validation error", "error", err.Error())
	return connect.NewError(connect.CodeInvalidArgument, err)
}

func (eh *ErrorHandler) HandleRepositoryError(err error) error {
	if strings.Contains(err.Error(), "not found") {
		return connect.NewError(connect.CodeNotFound, err)
	}
	
	eh.logger.Error("Repository error", "error", err.Error())
	return connect.NewError(connect.CodeInternal, 
		fmt.Errorf("internal server error"))
}
```

## Testing Examples

### 1. Frontend Component Testing

```typescript
// Testing with mock ConnectRPC client
import { createMockClient } from "@connectrpc/connect-mock";
import { TodoService } from "../lib/gen/todo/v1/todo_connect.ts";

Deno.test("TodoApp creates task successfully", async () => {
  const mockTask = {
    id: "123",
    title: "Test task",
    completed: false,
    createdAt: timestamppb.now(),
    updatedAt: timestamppb.now(),
  };

  const mockClient = createMockClient(TodoService, {
    createTask: { task: mockTask },
    listTasks: { tasks: [mockTask], pagination: mockPagination },
  });

  // Render component with mock client
  const { getByRole, getByText } = render(
    <TodoApp client={mockClient} />
  );

  // Test task creation
  const input = getByRole("textbox");
  const button = getByRole("button");
  
  fireEvent.change(input, { target: { value: "Test task" } });
  fireEvent.click(button);

  // Assert task appears in UI
  expect(getByText("Test task")).toBeInTheDocument();
});
```

### 2. Backend Service Testing

```go
func TestTodoService_CreateTask(t *testing.T) {
	// Setup test database
	db := setupTestDB(t)
	service := NewTodoService(db)

	tests := []struct {
		name    string
		request *todov1.CreateTaskRequest
		wantErr bool
	}{
		{
			name: "valid task creation",
			request: &todov1.CreateTaskRequest{
				Title: "Test task",
			},
			wantErr: false,
		},
		{
			name: "empty title should fail",
			request: &todov1.CreateTaskRequest{
				Title: "",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			req := connect.NewRequest(tt.request)

			resp, err := service.CreateTask(ctx, req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, resp)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, resp)
				assert.NotEmpty(t, resp.Msg.Task.Id)
				assert.Equal(t, tt.request.Title, resp.Msg.Task.Title)
			}
		})
	}
}
```

### 3. Integration Testing

```typescript
// End-to-end integration test
Deno.test("complete task workflow", async () => {
  // Start test server
  const testServer = await startTestServer();
  
  try {
    // Create real ConnectRPC client
    const transport = createConnectTransport({
      baseUrl: testServer.url,
    });
    const client = createClient(TodoService, transport);

    // Test complete workflow
    const createResponse = await client.createTask({ 
      title: "Integration test task" 
    });
    
    const listResponse = await client.listTasks({ 
      page: 1, 
      pageSize: 10 
    });
    
    assertEquals(listResponse.tasks.length, 1);
    assertEquals(listResponse.tasks[0].title, "Integration test task");
    
    await client.deleteTask({ 
      id: createResponse.task!.id 
    });
    
    const emptyListResponse = await client.listTasks({ 
      page: 1, 
      pageSize: 10 
    });
    
    assertEquals(emptyListResponse.tasks.length, 0);
  } finally {
    await testServer.close();
  }
});
```

## Performance Optimization Examples

### 1. Connection Pooling

```go
// Database connection pool configuration
func setupDatabase(dbURL string) *sql.DB {
	db, err := sql.Open("mysql", dbURL)
	if err != nil {
		log.Fatal(err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)                 // Maximum connections
	db.SetMaxIdleConns(25)                 // Idle connections
	db.SetConnMaxLifetime(5 * time.Minute) // Connection lifetime
	db.SetConnMaxIdleTime(2 * time.Minute) // Idle timeout

	return db
}
```

### 2. Request Batching

```typescript
// Batch multiple operations
const batchOperations = async (operations: Array<() => Promise<any>>) => {
  // Execute operations in parallel
  const results = await Promise.allSettled(operations);
  
  // Handle results and errors
  const successful = results
    .filter((result): result is PromiseFulfilledResult<any> => 
      result.status === 'fulfilled')
    .map(result => result.value);
    
  const failed = results
    .filter((result): result is PromiseRejectedResult => 
      result.status === 'rejected')
    .map(result => result.reason);
    
  return { successful, failed };
};

// Usage
const operations = [
  () => client.createTask({ title: "Task 1" }),
  () => client.createTask({ title: "Task 2" }),
  () => client.createTask({ title: "Task 3" }),
];

const { successful, failed } = await batchOperations(operations);
```

### 3. Caching Strategy

```typescript
// Simple in-memory cache for task lists
class TaskCache {
  private cache = new Map<string, { data: Task[], timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  get(key: string): Task[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: Task[]): void {
    this.cache.set(key, {
      data: [...data], // Clone to prevent mutations
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage in actions
const cache = new TaskCache();

const loadTasks = async () => {
  const cacheKey = "tasks-page-1";
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    state.setTasks(cached);
    return;
  }
  
  // Fetch from server
  const response = await client.listTasks({ page: 1, pageSize: 100 });
  const tasks = response.tasks;
  
  // Update cache and state
  cache.set(cacheKey, tasks);
  state.setTasks(tasks);
};
```

## Conclusion

This comprehensive example collection demonstrates how Fresh and ConnectRPC create a powerful, type-safe, full-stack development experience. The integration provides:

1. **End-to-End Type Safety**: From Protocol Buffer schema to frontend UI
2. **Modern Development Experience**: Hot reload, excellent tooling, clear error messages
3. **Production-Ready Patterns**: Error handling, validation, testing, performance optimization
4. **Clean Architecture**: Clear separation of concerns with dependency injection
5. **Browser Compatibility**: HTTP/JSON transport that works in all browsers

The examples show practical, real-world implementations that can be adapted to your specific use cases while maintaining the benefits of this modern architecture.