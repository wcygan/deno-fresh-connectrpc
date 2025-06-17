package middleware

import (
	"context"
	"fmt"
	"log"
	"runtime/debug"

	"connectrpc.com/connect"
)

// NewRecoveryInterceptor creates a new recovery interceptor
func NewRecoveryInterceptor() connect.UnaryInterceptorFunc {
	return func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(ctx context.Context, req connect.AnyRequest) (resp connect.AnyResponse, err error) {
			defer func() {
				if r := recover(); r != nil {
					stack := debug.Stack()
					log.Printf("Panic recovered in RPC %s: %v\nStack trace:\n%s", 
						req.Spec().Procedure, r, stack)
					
					err = connect.NewError(
						connect.CodeInternal,
						fmt.Errorf("internal server error: %v", r),
					)
				}
			}()
			
			return next(ctx, req)
		}
	}
}