#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Development task - starts backend and frontend in development mode
 * Uses Air for Go hot reloading and Fresh dev server for frontend
 * 
 * Performance optimizations:
 * - Parallel cleanup and Air detection
 * - Parallel path checks for Air binary
 * - Simultaneous server startup
 * - Smart health checks instead of fixed delays
 * - Parallel shutdown operations
 */

import { join } from "@std/path";

// Helper function to check if a port is free
async function isPortFree(port: number): Promise<boolean> {
  try {
    const cmd = new Deno.Command("lsof", { args: ["-ti", `:${port}`] });
    const result = await cmd.output();
    return !result.success; // Port is free if lsof returns non-zero
  } catch {
    return true; // Assume free if lsof fails
  }
}

const projectRoot = new URL("..", import.meta.url).pathname;

const startTime = performance.now();
console.log("🚀 Starting development servers...");
console.log("");

// Clean up any existing processes on our ports (run in parallel)
console.log("🧹 Cleaning up any existing processes...");
const cleanupPromise = (async () => {
  try {
    const killExistingCmd = new Deno.Command("bash", {
      args: ["-c", "(lsof -ti :3007 && lsof -ti :8007) | xargs kill -9 2>/dev/null || true"]
    });
    await killExistingCmd.output();
    await new Promise(resolve => setTimeout(resolve, 500)); // Reduced wait time
  } catch {
    // Ignore cleanup errors
  }
})();

// Check if Air is installed and return the command to use (optimized with parallel checks)
async function getAirCommand(): Promise<string | null> {
  // Try PATH first (fastest)
  try {
    const cmd = new Deno.Command("air", { args: ["-v"] });
    const result = await cmd.output();
    if (result.success) return "air";
  } catch {
    // Not in PATH, try other locations
  }
  
  // Run multiple path checks in parallel
  const pathChecks = [
    // Check GOPATH/bin
    (async () => {
      try {
        const goPathCmd = new Deno.Command("go", { args: ["env", "GOPATH"] });
        const goPathResult = await goPathCmd.output();
        if (goPathResult.success) {
          const goPath = new TextDecoder().decode(goPathResult.stdout).trim();
          const airPath = join(goPath, "bin", "air");
          const cmd = new Deno.Command(airPath, { args: ["-v"] });
          const result = await cmd.output();
          if (result.success) return airPath;
        }
      } catch {
        // Ignore error
      }
      return null;
    })(),
    
    // Check HOME/go/bin
    (async () => {
      try {
        const homeDir = Deno.env.get("HOME");
        if (homeDir) {
          const airPath = join(homeDir, "go", "bin", "air");
          const cmd = new Deno.Command(airPath, { args: ["-v"] });
          const result = await cmd.output();
          if (result.success) return airPath;
        }
      } catch {
        // Ignore error
      }
      return null;
    })()
  ];
  
  // Return the first successful result
  const results = await Promise.allSettled(pathChecks);
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      return result.value;
    }
  }
  
  return null;
}

// Start Air detection in parallel with cleanup
const airCommandPromise = getAirCommand();

// Wait for both cleanup and Air detection to complete
const [airCommand] = await Promise.all([airCommandPromise, cleanupPromise]);

if (!airCommand) {
  console.log("⚠️  Air not found. Installing Air for Go hot reloading...");
  const installCmd = new Deno.Command("go", {
    args: ["install", "github.com/air-verse/air@latest"],
    cwd: join(projectRoot, "backend"),
  });
  const installResult = await installCmd.output();
  if (!installResult.success) {
    console.error("❌ Failed to install Air. Using standard go run instead.");
    const errorText = new TextDecoder().decode(installResult.stderr);
    console.error("Install error:", errorText);
    airCommand = null;
  } else {
    console.log("✅ Air installed successfully!");
    // Wait briefly for filesystem to sync and check again
    await new Promise(resolve => setTimeout(resolve, 500));
    airCommand = await getAirCommand();
    
    if (!airCommand) {
      // Parallel search for Air binary in multiple locations
      console.log("🔍 Searching for Air binary...");
      try {
        const [goBinResult, goPathResult] = await Promise.all([
          new Deno.Command("go", { args: ["env", "GOBIN"] }).output(),
          new Deno.Command("go", { args: ["env", "GOPATH"] }).output()
        ]);
        
        const goBin = new TextDecoder().decode(goBinResult.stdout).trim();
        const goPath = new TextDecoder().decode(goPathResult.stdout).trim();
        
        // Try multiple paths in parallel
        const tryPaths = [
          goBin && join(goBin, "air"),
          join(goPath, "bin", "air"),
          join(Deno.env.get("HOME") || "", "go", "bin", "air")
        ].filter(Boolean);
        
        const pathTests = tryPaths.map(async (path) => {
          try {
            const stat = await Deno.stat(path);
            if (stat.isFile) {
              const testCmd = new Deno.Command(path, { args: ["-v"] });
              const testResult = await testCmd.output();
              if (testResult.success) return path;
            }
          } catch {
            // File doesn't exist or doesn't work
          }
          return null;
        });
        
        const results = await Promise.allSettled(pathTests);
        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            airCommand = result.value;
            console.log("✅ Found working Air at:", result.value);
            break;
          }
        }
        
        if (!airCommand) {
          console.log("❌ Could not find working Air binary. Using go run instead.");
        }
      } catch (err) {
        console.error("Error searching for Air:", err);
      }
    }
  }
}

// Prepare both server configurations
console.log("🔧 Starting Go backend with Air hot reload on port 3007...");
console.log("🌊 Starting Fresh frontend on port 8007...");

const backendProcess = airCommand 
  ? new Deno.Command(airCommand, {
      args: ["-c", ".air.toml"],
      cwd: join(projectRoot, "backend"),
      env: { ...Deno.env.toObject(), PORT: "3007" },
      stdout: "piped",
      stderr: "piped",
    })
  : new Deno.Command("go", {
      args: ["run", "cmd/server/main.go"],
      cwd: join(projectRoot, "backend"),
      env: { ...Deno.env.toObject(), PORT: "3007" },
      stdout: "piped",
      stderr: "piped",
    });

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

// Start both processes simultaneously
const [backendChild, frontendChild] = [
  backendProcess.spawn(),
  frontendProcess.spawn()
];

// Smart health checking instead of fixed delays
async function waitForBackend(): Promise<boolean> {
  for (let i = 0; i < 20; i++) { // 10 seconds max
    try {
      const response = await fetch("http://localhost:3007/health", { 
        signal: AbortSignal.timeout(500) 
      });
      if (response.ok) return true;
    } catch {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function waitForFrontend(): Promise<boolean> {
  for (let i = 0; i < 20; i++) { // 10 seconds max
    try {
      const response = await fetch("http://localhost:8007/", { 
        signal: AbortSignal.timeout(500) 
      });
      if (response.ok) return true;
    } catch {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

// Wait for both services to be ready in parallel
const [backendReady, frontendReady] = await Promise.all([
  waitForBackend(),
  waitForFrontend()
]);

// Report startup results
if (backendReady) {
  console.log(`✅ Backend started ${airCommand ? '(with hot reload)' : '(no hot reload)'}`);
  console.log("🌐 Backend health: http://localhost:3007/health");
  console.log("🔌 Backend RPC: http://localhost:3007/hello.v1.GreeterService/SayHello");
} else {
  console.log("⚠️ Backend may not be ready yet (health check timeout)");
}

if (frontendReady) {
  console.log("✅ Frontend started");
  console.log("🌐 Frontend: http://localhost:8007/");
} else {
  console.log("⚠️ Frontend may not be ready yet (health check timeout)");
}

const setupTime = ((performance.now() - startTime) / 1000).toFixed(2);
console.log(`⚡ Servers ready in ${setupTime}s`);
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
      const logPrefix = airCommand ? "🔥 Air" : "🔧 Backend";
      console.log(`${logPrefix}:`, decoder.decode(value).trim());
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

// Track process status
let backendRunning = true;
let frontendRunning = true;

// Monitor process status
backendChild.status.then(() => {
  backendRunning = false;
  console.log("🔧 Backend process ended");
});

frontendChild.status.then(() => {
  frontendRunning = false;
  console.log("🌊 Frontend process ended");
});

// Handle graceful shutdown
const shutdown = async () => {
  console.log("\n🛑 Shutting down servers...");
  try {
    // Kill processes with SIGTERM first
    if (backendRunning) {
      backendChild.kill("SIGTERM");
    }
    if (frontendRunning) {
      frontendChild.kill("SIGTERM");
    }
    
    // Wait briefly for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force kill if still running
    if (backendRunning) {
      try {
        backendChild.kill("SIGKILL");
      } catch {
        // Process might already be dead
      }
    }
    if (frontendRunning) {
      try {
        frontendChild.kill("SIGKILL");
      } catch {
        // Process might already be dead
      }
    }
    
    // Wait for processes to terminate (with timeout)
    const promises = [];
    if (backendRunning) promises.push(backendChild.status);
    if (frontendRunning) promises.push(frontendChild.status);
    
    if (promises.length > 0) {
      await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 3000)) // 3s timeout
      ]);
    }
    
    // Try to kill any remaining processes on our ports (in parallel)
    await Promise.allSettled([
      new Deno.Command("bash", {
        args: ["-c", "lsof -ti :3007 | xargs kill -9 2>/dev/null || true"]
      }).output(),
      new Deno.Command("bash", {
        args: ["-c", "lsof -ti :8007 | xargs kill -9 2>/dev/null || true"]
      }).output()
    ]);
    
    // Verify ports are free (in parallel)
    const [backendFree, frontendFree] = await Promise.all([
      isPortFree(3007),
      isPortFree(8007)
    ]);
    
    if (backendFree && frontendFree) {
      console.log("✅ All servers stopped");
    } else {
      console.log("⚠️ Servers stopped, but some ports may still be in use:");
      if (!backendFree) console.log("  - Port 3007 still in use");
      if (!frontendFree) console.log("  - Port 8007 still in use");
    }
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