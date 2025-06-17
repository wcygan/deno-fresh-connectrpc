# deno-fresh-connectrpc

This application demonstrates how to use Connect RPC with Deno Fresh.

We will setup a VERY SIMPLE demonstration using https://buf.build/wcygan/hello/docs/main:hello.v1 with a [Go Backend](https://buf.build/wcygan/hello/sdks/main:go from `go get buf.build/gen/go/wcygan/hello/connectrpc/go` and `go get buf.build/gen/go/wcygan/hello/protocolbuffers/go`) and a [Deno Fresh](https://fresh.deno.dev/) Frontend with [Connect Web](https://buf.build/wcygan/hello/sdks/main:typescript) (from `@buf/wcygan_hello.bufbuild_es` and `@buf/wcygan_hello.connectrpc_query-es`)

Examples for how to integrate ConnectRPC with Deno Fresh can be found in [/resources](/resources) folder.

Create separate folders `frontend` and `backend` to organize the codebase.

Create a separate `deno.json` file in the root directory to configure Deno as the scripting harness for the entire application.

Do local testing first, then move onto Dockerizing the application.
