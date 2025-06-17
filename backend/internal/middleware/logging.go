package middleware

import (
	"context"
	"log"
	"time"

	"connectrpc.com/connect"
)

// NewLoggingInterceptor creates a new logging interceptor
func NewLoggingInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
			start := time.Now()
			method := req.Spec().Procedure
			
			log.Printf("RPC started: %s", method)
			
			resp, err := next(ctx, req)
			
			duration := time.Since(start)
			status := "success"
			if err != nil {
				status = "error"
			}
			
			log.Printf("RPC completed: %s - %s - %v", method, status, duration)
			
			return resp, err
		}
	}
}