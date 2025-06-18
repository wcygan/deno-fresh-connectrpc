#!/usr/bin/env -S deno run --allow-run --allow-env

/**
 * Development task - starts backend and frontend in development mode
 * Uses Air for Go hot reloading and Fresh dev server for frontend
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

console.log("🚀 Starting development servers...");
console.log("");

// Clean up any existing processes on our ports
console.log("🧹 Cleaning up any existing processes...");
try {
  const killExistingCmd = new Deno.Command("bash", {
    args: ["-c", "(lsof -ti :3007 && lsof -ti :8007) | xargs kill -9 2>/dev/null || true"]
  });
  await killExistingCmd.output();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
} catch {
  // Ignore cleanup errors
}

// Check if Air is installed and return the command to use
async function getAirCommand(): Promise<string | null> {
  try {
    const cmd = new Deno.Command("air", { args: ["-v"] });
    const result = await cmd.output();
    if (result.success) return "air";
  } catch {
    // Not in PATH, try other locations
  }
  
  // Try checking if air is in GOPATH/bin
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
    // Ignore error and try HOME/go/bin
  }
  
  // Try default GOPATH/bin location
  try {
    const homeDir = Deno.env.get("HOME");
    if (homeDir) {
      const airPath = join(homeDir, "go", "bin", "air");
      const cmd = new Deno.Command(airPath, { args: ["-v"] });
      const result = await cmd.output();
      if (result.success) return airPath;
    }
  } catch {
    // Final fallback
  }
  
  return null;
}

let airCommand = await getAirCommand();
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
    // Wait a moment for filesystem to sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Check again after installation
    airCommand = await getAirCommand();
    if (!airCommand) {
      // Let's try to find where Go installed it
      console.log("🔍 Searching for Air binary...");
      try {
        const goBinCmd = new Deno.Command("go", { args: ["env", "GOBIN"] });
        const goBinResult = await goBinCmd.output();
        const goBin = new TextDecoder().decode(goBinResult.stdout).trim();
        
        const goPathCmd = new Deno.Command("go", { args: ["env", "GOPATH"] });
        const goPathResult = await goPathCmd.output();
        const goPath = new TextDecoder().decode(goPathResult.stdout).trim();
        
        // Try GOBIN first, then GOPATH/bin
        const tryPaths = [
          goBin && join(goBin, "air"),
          join(goPath, "bin", "air"),
          join(Deno.env.get("HOME") || "", "go", "bin", "air")
        ].filter(Boolean);
        
        for (const path of tryPaths) {
          try {
            const stat = await Deno.stat(path);
            if (stat.isFile) {
              // Test if it actually works
              try {
                const testCmd = new Deno.Command(path, { args: ["-v"] });
                const testResult = await testCmd.output();
                if (testResult.success) {
                  airCommand = path;
                  console.log("✅ Found working Air at:", path);
                  break;
                }
              } catch {
                // Air binary doesn't work
              }
            }
          } catch {
            // File doesn't exist
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

// Start backend with Air hot reload or fallback to go run
let backendProcess;

if (airCommand) {
  console.log("🔧 Starting Go backend with Air hot reload on port 3007...");
  backendProcess = new Deno.Command(airCommand, {
    args: ["-c", ".air.toml"],
    cwd: join(projectRoot, "backend"),
    env: {
      ...Deno.env.toObject(),
      PORT: "3007",
    },
    stdout: "piped",
    stderr: "piped",
  });
} else {
  console.log("🔧 Starting Go backend (no hot reload) on port 3007...");
  backendProcess = new Deno.Command("go", {
    args: ["run", "cmd/server/main.go"],
    cwd: join(projectRoot, "backend"),
    env: {
      ...Deno.env.toObject(),
      PORT: "3007",
    },
    stdout: "piped",
    stderr: "piped",
  });
}

const backendChild = backendProcess.spawn();

// Give backend time to start
await new Promise(resolve => setTimeout(resolve, 2000));

console.log(`✅ Backend started ${airCommand ? '(with hot reload)' : '(no hot reload)'}`);
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
    
    // Try to kill any remaining processes on our ports
    try {
      const killBackendCmd = new Deno.Command("bash", {
        args: ["-c", "lsof -ti :3007 | xargs kill -9 2>/dev/null || true"]
      });
      await killBackendCmd.output();
      
      const killFrontendCmd = new Deno.Command("bash", {
        args: ["-c", "lsof -ti :8007 | xargs kill -9 2>/dev/null || true"]
      });
      await killFrontendCmd.output();
    } catch {
      // Ignore errors
    }
    
    // Verify ports are free
    const backendFree = await isPortFree(3007);
    const frontendFree = await isPortFree(8007);
    
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