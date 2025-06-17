package service

import (
	"context"
	"fmt"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	hellov1 "buf.build/gen/go/wcygan/hello/protocolbuffers/go/hello/v1"
)

// GreeterService implements the GreeterService RPC interface
type GreeterService struct {
	startTime       time.Time
	requestsServed  atomic.Uint64
}

// NewGreeterService creates a new GreeterService instance
func NewGreeterService() *GreeterService {
	return &GreeterService{
		startTime: time.Now(),
	}
}

// SayHello implements the SayHello RPC method
func (s *GreeterService) SayHello(
	ctx context.Context,
	req *connect.Request[hellov1.SayHelloRequest],
) (*connect.Response[hellov1.SayHelloResponse], error) {
	s.requestsServed.Add(1)

	name := req.Msg.GetName()
	if name == "" {
		name = "World"
	}

	// Create greeting message
	message := fmt.Sprintf("Hello, %s!", name)

	// Create response
	response := &hellov1.SayHelloResponse{
		Message: message,
	}

	return connect.NewResponse(response), nil
}