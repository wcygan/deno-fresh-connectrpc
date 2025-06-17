export async function APIProxy(req: Request): Promise<Response> {
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
  
  return await proxyToBackend(req);
}

async function proxyToBackend(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  // Transform /api/hello.v1.GreeterService/SayHello -> /hello.v1.GreeterService/SayHello
  const backendUrl = `${getBackendURL()}${url.pathname.replace('/api', '')}${url.search}`;
  
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
}

function getBackendURL(): string {
  return Deno.env.get("BACKEND_URL") || "http://localhost:3007";
}