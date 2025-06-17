package service

import (
	"context"
	"testing"

	"connectrpc.com/connect"
	hellov1 "buf.build/gen/go/wcygan/hello/protocolbuffers/go/hello/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGreeterService_SayHello(t *testing.T) {
	service := NewGreeterService()
	ctx := context.Background()

	tests := []struct {
		name         string
		request      *hellov1.SayHelloRequest
		expectedMsg  string
	}{
		{
			name:        "with name provided",
			request:     &hellov1.SayHelloRequest{Name: "Alice"},
			expectedMsg: "Hello, Alice!",
		},
		{
			name:        "empty name defaults to World",
			request:     &hellov1.SayHelloRequest{Name: ""},
			expectedMsg: "Hello, World!",
		},
		{
			name:        "nil name defaults to World",
			request:     &hellov1.SayHelloRequest{},
			expectedMsg: "Hello, World!",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := connect.NewRequest(tt.request)
			
			resp, err := service.SayHello(ctx, req)
			
			require.NoError(t, err)
			assert.NotNil(t, resp)
			assert.Equal(t, tt.expectedMsg, resp.Msg.Message)
		})
	}
}

func TestGreeterService_RequestsCounter(t *testing.T) {
	service := NewGreeterService()
	ctx := context.Background()
	
	// Initially should be 0
	assert.Equal(t, uint64(0), service.requestsServed.Load())
	
	// Make a request
	req := connect.NewRequest(&hellov1.SayHelloRequest{Name: "Test"})
	_, err := service.SayHello(ctx, req)
	require.NoError(t, err)
	
	// Should increment to 1
	assert.Equal(t, uint64(1), service.requestsServed.Load())
	
	// Make another request
	_, err = service.SayHello(ctx, req)
	require.NoError(t, err)
	
	// Should increment to 2
	assert.Equal(t, uint64(2), service.requestsServed.Load())
}