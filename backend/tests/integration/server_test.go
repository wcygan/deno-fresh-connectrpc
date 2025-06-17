package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"connectrpc.com/connect"
	hellov1 "buf.build/gen/go/wcygan/hello/protocolbuffers/go/hello/v1"
	hellov1connect "buf.build/gen/go/wcygan/hello/connectrpc/go/hello/v1/hellov1connect"
	"github.com/wcygan/deno-fresh-connectrpc/backend/internal/middleware"
	"github.com/wcygan/deno-fresh-connectrpc/backend/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestServer() *httptest.Server {
	greeterService := service.NewGreeterService()
	
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
	
	return httptest.NewServer(mux)
}

func TestHealthCheck(t *testing.T) {
	server := setupTestServer()
	defer server.Close()
	
	resp, err := http.Get(server.URL + "/health")
	require.NoError(t, err)
	defer resp.Body.Close()
	
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "application/json", resp.Header.Get("Content-Type"))
	
	var health map[string]string
	err = json.NewDecoder(resp.Body).Decode(&health)
	require.NoError(t, err)
	
	assert.Equal(t, "ok", health["status"])
	assert.Equal(t, "greeter-service", health["service"])
}

func TestGreeterServiceHTTP(t *testing.T) {
	server := setupTestServer()
	defer server.Close()
	
	// Create ConnectRPC client
	client := hellov1connect.NewGreeterServiceClient(
		http.DefaultClient,
		server.URL,
	)
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	tests := []struct {
		name         string
		request      *hellov1.SayHelloRequest
		expectedMsg  string
	}{
		{
			name:        "with name Alice",
			request:     &hellov1.SayHelloRequest{Name: "Alice"},
			expectedMsg: "Hello, Alice!",
		},
		{
			name:        "with name Bob",
			request:     &hellov1.SayHelloRequest{Name: "Bob"},
			expectedMsg: "Hello, Bob!",
		},
		{
			name:        "empty name defaults to World",
			request:     &hellov1.SayHelloRequest{Name: ""},
			expectedMsg: "Hello, World!",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := client.SayHello(ctx, connect.NewRequest(tt.request))
			
			require.NoError(t, err)
			assert.NotNil(t, resp)
			assert.Equal(t, tt.expectedMsg, resp.Msg.Message)
		})
	}
}

func TestGreeterServiceHTTPRaw(t *testing.T) {
	server := setupTestServer()
	defer server.Close()
	
	// Test raw HTTP request to ConnectRPC endpoint
	requestBody := `{"name": "HTTP Test"}`
	
	req, err := http.NewRequest("POST", server.URL+"/hello.v1.GreeterService/SayHello", bytes.NewBufferString(requestBody))
	require.NoError(t, err)
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Connect-Protocol-Version", "1")
	
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	var response map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	require.NoError(t, err)
	
	assert.Equal(t, "Hello, HTTP Test!", response["message"])
}