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

// Start frontend in background
console.log("🌊 Starting Fresh frontend on port 8007...");
const frontendProcess = new Deno.Command("deno", {
  args: ["run", "-A", "main.ts"],
  cwd: join(projectRoot, "frontend"),
  env: {
    ...Deno.env.toObject(),
    PORT: "8007",
    BACKEND_URL: "http://localhost:3007",
  },
  stdout: "piped",
  stderr: "piped",
});

const frontendChild = frontendProcess.spawn();

// Give frontend time to start
await new Promise(resolve => setTimeout(resolve, 3000));

console.log("✅ Frontend started");
console.log("🌐 Frontend: http://localhost:8007/");
console.log("");
console.log("💡 Open http://localhost:8007/ in your browser to test the complete integration!");
console.log("");

// Stream logs from both processes
const backendReader = backendChild.stdout.getReader();
const frontendReader = frontendChild.stdout.getReader();
const decoder = new TextDecoder();

// Handle background streaming for backend
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

// Handle background streaming for frontend
(async () => {
  try {
    while (true) {
      const { done, value } = await frontendReader.read();
      if (done) break;
      console.log("🌊 Frontend:", decoder.decode(value).trim());
    }
  } catch (err) {
    console.error("Frontend log error:", err);
  }
})();

// Handle graceful shutdown
const shutdown = async () => {
  console.log("\n🛑 Shutting down servers...");
  try {
    backendChild.kill("SIGTERM");
    frontendChild.kill("SIGTERM");
    await Promise.all([backendChild.status, frontendChild.status]);
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