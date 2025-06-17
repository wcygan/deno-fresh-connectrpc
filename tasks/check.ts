#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Check task - type checking, linting, and formatting
 */

import { join } from "@std/path";

const projectRoot = new URL("..", import.meta.url).pathname;

console.log("🔍 Running code quality checks...");
console.log("");

let hasErrors = false;

// Check backend
console.log("🔧 Checking Go backend...");
try {
  // Go vet
  const goVet = new Deno.Command("go", {
    args: ["vet", "./..."],
    cwd: join(projectRoot, "backend"),
  });
  
  const vetResult = await goVet.output();
  
  if (vetResult.code === 0) {
    console.log("✅ Go vet passed");
  } else {
    console.error("❌ Go vet failed");
    console.error(new TextDecoder().decode(vetResult.stderr));
    hasErrors = true;
  }

  // Go fmt check
  const goFmtCheck = new Deno.Command("gofmt", {
    args: ["-l", "."],
    cwd: join(projectRoot, "backend"),
  });
  
  const fmtResult = await goFmtCheck.output();
  const unformattedFiles = new TextDecoder().decode(fmtResult.stdout).trim();
  
  if (unformattedFiles === "") {
    console.log("✅ Go formatting is correct");
  } else {
    console.error("❌ Go formatting issues found:");
    console.error(unformattedFiles);
    console.error("Run: cd backend && go fmt ./...");
    hasErrors = true;
  }

} catch (err) {
  console.error("❌ Error checking backend:", err);
  hasErrors = true;
}

console.log("");

// Note about frontend checks
console.log("ℹ️  Frontend checks skipped (frontend setup in progress)");

console.log("");

if (hasErrors) {
  console.error("❌ Code quality checks failed");
  Deno.exit(1);
} else {
  console.log("✅ All code quality checks passed!");
}