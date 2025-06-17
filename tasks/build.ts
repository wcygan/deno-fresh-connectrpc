#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Build task - builds backend and frontend for production
 */

import { join } from "@std/path";

const projectRoot = new URL("..", import.meta.url).pathname;

console.log("🔨 Building project...");
console.log("");

let hasErrors = false;

// Build backend
console.log("🔧 Building Go backend...");
try {
  const backendBuild = new Deno.Command("go", {
    args: ["build", "-o", "bin/server", "cmd/server/main.go"],
    cwd: join(projectRoot, "backend"),
  });
  
  const result = await backendBuild.output();
  
  if (result.code === 0) {
    console.log("✅ Backend built successfully: backend/bin/server");
  } else {
    console.error("❌ Backend build failed");
    console.error(new TextDecoder().decode(result.stderr));
    hasErrors = true;
  }
} catch (err) {
  console.error("❌ Error building backend:", err);
  hasErrors = true;
}

console.log("");

// Note about frontend build
console.log("ℹ️  Frontend build skipped (frontend setup in progress)");

console.log("");

if (hasErrors) {
  console.error("❌ Build failed");
  Deno.exit(1);
} else {
  console.log("✅ Build completed successfully!");
  console.log("");
  console.log("📦 Built artifacts:");
  console.log("  - backend/bin/server (Go binary)");
  console.log("");
  console.log("🚀 To run:");
  console.log("  cd backend && ./bin/server");
}