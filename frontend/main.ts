#!/usr/bin/env -S deno run -A

import { App } from "@fresh/core";

const app = new App();

// Home page route
app.get("/", async () => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fresh + ConnectRPC Demo</title>
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body>
  <div class="container">
    <div class="page">
      <header class="header">
        <h1>Fresh + ConnectRPC Demo</h1>
        <p>A demonstration of Deno Fresh with ConnectRPC integration</p>
      </header>
      
      <main class="main">
        <div class="greeter-app">
          <div class="card">
            <h2>ConnectRPC Greeter Service</h2>
            <p>Enter your name to receive a greeting from the Go backend</p>
            
            <form id="greetingForm" class="form">
              <div class="input-group">
                <label for="name" class="label">Your Name:</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name (optional)"
                  class="input"
                />
              </div>
              
              <button type="submit" class="button">Say Hello</button>
            </form>

            <div id="error" class="error" style="display: none;">
              <strong>Error:</strong> <span id="errorMessage"></span>
            </div>

            <div id="greeting" class="greeting" style="display: none;">
              <h3>Latest Greeting:</h3>
              <p id="greetingMessage" class="greeting-message"></p>
            </div>

            <div id="history" class="history" style="display: none;">
              <h3>Greeting History:</h3>
              <ul id="historyList" class="history-list"></ul>
            </div>
          </div>

          <div class="info">
            <h3>Technical Details</h3>
            <ul>
              <li><strong>Frontend:</strong> Deno Fresh with vanilla JavaScript</li>
              <li><strong>Backend:</strong> Go with ConnectRPC</li>
              <li><strong>Protocol:</strong> HTTP/JSON transport via ConnectRPC</li>
              <li><strong>Schema:</strong> buf.build/wcygan/hello Protocol Buffers</li>
            </ul>
          </div>
        </div>
      </main>
      
      <footer class="footer">
        <p>Built with Deno Fresh and ConnectRPC</p>
      </footer>
    </div>
  </div>

  <script>
    const form = document.getElementById('greetingForm');
    const nameInput = document.getElementById('name');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const greetingDiv = document.getElementById('greeting');
    const greetingMessage = document.getElementById('greetingMessage');
    const historyDiv = document.getElementById('history');
    const historyList = document.getElementById('historyList');
    
    let greetings = [];

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Hide previous error/greeting
      errorDiv.style.display = 'none';
      
      const name = nameInput.value.trim() || '';
      
      try {
        const response = await fetch('/api/hello.v1.GreeterService/SayHello', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Connect-Protocol-Version': '1',
          },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          throw new Error(\`HTTP $\{response.status}: $\{response.statusText}\`);
        }

        const data = await response.json();
        
        if (data.message) {
          // Show greeting
          greetingMessage.textContent = data.message;
          greetingDiv.style.display = 'block';
          
          // Add to history
          greetings.unshift(data.message);
          if (greetings.length > 10) greetings = greetings.slice(0, 10);
          
          // Update history display
          historyList.innerHTML = greetings.map(msg => 
            \`<li class="history-item">$\{msg}</li>\`
          ).join('');
          historyDiv.style.display = 'block';
        }
      } catch (err) {
        errorMessage.textContent = err.message;
        errorDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// API proxy route
app.all("/api/*", async (ctx) => {
  const req = ctx.req;
  const url = new URL(req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms",
        "Access-Control-Expose-Headers": "Connect-Protocol-Version",
      },
    });
  }
  
  // Transform /api/hello.v1.GreeterService/SayHello -> /hello.v1.GreeterService/SayHello
  const backendUrl = `${Deno.env.get("BACKEND_URL") || "http://localhost:3007"}${url.pathname.replace('/api', '')}${url.search}`;
  
  console.log(`Proxying request: ${req.method} ${url.pathname} -> ${backendUrl}`);
  
  try {
    // Forward the request with all original headers and body
    const response = await fetch(backendUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    
    // Create new response with CORS headers
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
    
    // Ensure CORS headers are set for browser compatibility
    modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
    modifiedResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    modifiedResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version, Connect-Timeout-Ms");
    modifiedResponse.headers.set("Access-Control-Expose-Headers", "Connect-Protocol-Version");
    
    return modifiedResponse;
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: "Backend unavailable" }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});

// Static file serving
app.get("/static/*", async (ctx) => {
  const req = ctx.req;
  const url = new URL(req.url);
  const filePath = url.pathname.replace("/static", "./static");
  
  try {
    const file = await Deno.readTextFile(filePath);
    const contentType = filePath.endsWith('.css') ? 'text/css' : 'text/plain';
    
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
});

if (import.meta.main) {
  await app.listen({ port: 8007 });
}