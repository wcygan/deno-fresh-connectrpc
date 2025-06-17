#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Up task - builds and starts all services with Docker Compose
 */

import { cyan, green, red, yellow } from "@std/fmt/colors";

console.log(cyan("🐳 Building and starting services with Docker Compose..."));
console.log("");

try {
  // Build and start services
  const buildProcess = new Deno.Command("docker", {
    args: ["compose", "up", "--build", "-d"],
    stdout: "piped",
    stderr: "piped",
  });

  const buildResult = await buildProcess.output();
  
  if (!buildResult.success) {
    const stderr = new TextDecoder().decode(buildResult.stderr);
    console.error(red("❌ Failed to build and start services:"));
    console.error(stderr);
    Deno.exit(1);
  }

  console.log(green("✅ Services started successfully!"));
  console.log("");
  
  // Show service status
  const statusProcess = new Deno.Command("docker", {
    args: ["compose", "ps"],
    stdout: "piped",
    stderr: "piped",
  });

  const statusResult = await statusProcess.output();
  const statusOutput = new TextDecoder().decode(statusResult.stdout);
  
  console.log(yellow("📋 Service Status:"));
  console.log(statusOutput);
  
  console.log(cyan("🌐 Application URLs:"));
  console.log("  • Frontend: http://localhost:8007/");
  console.log("  • Backend Health: http://localhost:3007/health");
  console.log("  • Backend RPC: http://localhost:3007/hello.v1.GreeterService/SayHello");
  console.log("");
  console.log(green("💡 Open http://localhost:8007/ in your browser to test the integration!"));
  console.log("");
  console.log(yellow("🔧 Useful commands:"));
  console.log("  • View logs: docker compose logs -f");
  console.log("  • Stop services: docker compose down");
  console.log("  • Restart services: docker compose restart");

} catch (error) {
  console.error(red("❌ Error starting services:"), error);
  Deno.exit(1);
}