package main

import (
	"log"
	"net/http"
	"os"

	"github.com/wcygan/deno-fresh-connectrpc/backend/internal/middleware"
	"github.com/wcygan/deno-fresh-connectrpc/backend/internal/service"
	hellov1connect "buf.build/gen/go/wcygan/hello/connectrpc/go/hello/v1/hellov1connect"
	"connectrpc.com/connect"
)

func main() {
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "3007"
	}

	// Create Greeter service
	greeterService := service.NewGreeterService()

	// Create HTTP mux
	mux := http.NewServeMux()

	// Register GreeterService handler with interceptors
	interceptors := []connect.Interceptor{
		middleware.NewLoggingInterceptor(),
		middleware.NewRecoveryInterceptor(),
	}

	path, handler := hellov1connect.NewGreeterServiceHandler(
		greeterService,
		connect.WithInterceptors(interceptors...),
	)
	mux.Handle(path, handler)

	// Add health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"greeter-service"}`))
	})

	// Add CORS support for browser requests
	corsHandler := withCORS(mux)

	// Start server
	server := &http.Server{
		Addr:    ":" + port,
		Handler: corsHandler,
	}

	log.Printf("GreeterService starting on :%s", port)
	log.Printf("Service path: %s", path)
	log.Printf("Health check: http://localhost:%s/health", port)
	
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}

// withCORS adds CORS headers for browser compatibility
func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers for all responses
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms")
		w.Header().Set("Access-Control-Expose-Headers", "Connect-Protocol-Version")
		
		// Handle preflight OPTIONS requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		h.ServeHTTP(w, r)
	})
}