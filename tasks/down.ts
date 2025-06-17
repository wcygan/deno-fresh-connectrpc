#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Down task - stops and removes all Docker Compose services
 */

import { cyan, green, red, yellow } from "@std/fmt/colors";

console.log(cyan("🐳 Stopping Docker Compose services..."));
console.log("");

try {
  // Stop and remove services
  const downProcess = new Deno.Command("docker", {
    args: ["compose", "down", "--remove-orphans"],
    stdout: "piped",
    stderr: "piped",
  });

  const downResult = await downProcess.output();
  
  if (!downResult.success) {
    const stderr = new TextDecoder().decode(downResult.stderr);
    console.error(red("❌ Failed to stop services:"));
    console.error(stderr);
    Deno.exit(1);
  }

  const stdout = new TextDecoder().decode(downResult.stdout);
  if (stdout.trim()) {
    console.log(stdout);
  }

  console.log(green("✅ All services stopped successfully!"));
  console.log("");
  
  // Optional: Show remaining containers (if any)
  const psProcess = new Deno.Command("docker", {
    args: ["ps", "--filter", "label=com.docker.compose.project=deno-fresh-connectrpc"],
    stdout: "piped",
    stderr: "piped",
  });

  const psResult = await psProcess.output();
  const psOutput = new TextDecoder().decode(psResult.stdout);
  
  if (psOutput.includes("CONTAINER ID")) {
    const lines = psOutput.split('\n');
    if (lines.length > 2) { // Header + at least one container
      console.log(yellow("⚠️  Some containers are still running:"));
      console.log(psOutput);
      console.log("");
      console.log(yellow("💡 Use 'docker compose down -v' to also remove volumes"));
    }
  }

} catch (error) {
  console.error(red("❌ Error stopping services:"), error);
  Deno.exit(1);
}