#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Development task - starts backend and frontend in development mode
 */

import { join } from "@std/path";

const projectRoot = new URL("..", import.meta.url).pathname;

console.log("🚀 Starting development servers...");
console.log("");

// Start backend in background
console.log("🔧 Starting Go backend on port 3007...");
const backendProcess = new Deno.Command("go", {
  args: ["run", "cmd/server/main.go"],
  cwd: join(projectRoot, "backend"),
  env: {
    ...Deno.env.toObject(),
    PORT: "3007",
  },
  stdout: "piped",
  stderr: "piped",
});

const backendChild = backendProcess.spawn();

// Give backend time to start
await new Promise(resolve => setTimeout(resolve, 2000));

console.log("✅ Backend started");
console.log("🌐 Backend health: http://localhost:3007/health");
console.log("🔌 Backend RPC: http://localhost:3007/hello.v1.GreeterService/SayHello");
console.log("");
console.log("💡 To test the backend:");
console.log('curl -X POST http://localhost:3007/hello.v1.GreeterService/SayHello \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -H "Connect-Protocol-Version: 1" \\');
console.log('  -d \'{"name": "World"}\'');
console.log("");
console.log("📝 Backend logs:");

// Stream backend logs
const backendReader = backendChild.stdout.getReader();
const decoder = new TextDecoder();

// Handle background streaming
(async () => {
  try {
    while (true) {
      const { done, value } = await backendReader.read();
      if (done) break;
      console.log("🔧 Backend:", decoder.decode(value).trim());
    }
  } catch (err) {
    console.error("Backend log error:", err);
  }
})();

// Handle graceful shutdown
const shutdown = async () => {
  console.log("\n🛑 Shutting down servers...");
  try {
    backendChild.kill("SIGTERM");
    await backendChild.status;
  } catch (err) {
    console.error("Error during shutdown:", err);
  }
  Deno.exit(0);
};

// Listen for shutdown signals
Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

// Keep the script running
console.log("Press Ctrl+C to stop all servers");
await new Promise(() => {}); // Keep running indefinitely