#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Test task - runs all tests for backend and frontend
 */

import { join } from "@std/path";

const projectRoot = new URL("..", import.meta.url).pathname;

console.log("🧪 Running all tests...");
console.log("");

let hasErrors = false;

// Test backend
console.log("🔧 Testing Go backend...");
try {
  const backendTest = new Deno.Command("go", {
    args: ["test", "./...", "-v"],
    cwd: join(projectRoot, "backend"),
  });
  
  const result = await backendTest.output();
  
  if (result.code === 0) {
    console.log("✅ Backend tests passed");
  } else {
    console.error("❌ Backend tests failed");
    console.error(new TextDecoder().decode(result.stderr));
    hasErrors = true;
  }
} catch (err) {
  console.error("❌ Error running backend tests:", err);
  hasErrors = true;
}

console.log("");

// Note about frontend tests
console.log("ℹ️  Frontend tests skipped (frontend setup in progress)");

console.log("");

if (hasErrors) {
  console.error("❌ Some tests failed");
  Deno.exit(1);
} else {
  console.log("✅ All tests passed!");
}