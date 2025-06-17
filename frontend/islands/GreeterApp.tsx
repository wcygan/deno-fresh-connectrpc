import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export function GreeterApp() {
  // State management with signals
  const name = useSignal("");
  const greeting = useSignal<string>("");
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);
  const greetings = useSignal<string[]>([]);

  // Handle form submission
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (loading.value) return;

    loading.value = true;
    error.value = null;

    try {
      // Make direct HTTP request to ConnectRPC endpoint
      const response = await fetch("/api/hello.v1.GreeterService/SayHello", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Connect-Protocol-Version": "1",
        },
        body: JSON.stringify({
          name: name.value.trim() || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.message) {
        greeting.value = data.message;
        greetings.value = [data.message, ...greetings.value.slice(0, 9)]; // Keep last 10
      }
    } catch (err) {
      console.error("Error calling SayHello:", err);
      error.value = err instanceof Error ? err.message : "An error occurred";
    } finally {
      loading.value = false;
    }
  };

  // Clear error when user starts typing
  useEffect(() => {
    if (error.value) {
      error.value = null;
    }
  }, [name.value]);

  return (
    <div class="greeter-app">
      <div class="card">
        <h2>ConnectRPC Greeter Service</h2>
        <p>Enter your name to receive a greeting from the Go backend</p>
        
        <form onSubmit={handleSubmit} class="form">
          <div class="input-group">
            <label htmlFor="name" class="label">
              Your Name:
            </label>
            <input
              id="name"
              type="text"
              value={name.value}
              onInput={(e) => name.value = (e.target as HTMLInputElement).value}
              placeholder="Enter your name (optional)"
              class="input"
              disabled={loading.value}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading.value}
            class={`button ${loading.value ? 'loading' : ''}`}
          >
            {loading.value ? "Greeting..." : "Say Hello"}
          </button>
        </form>

        {error.value && (
          <div class="error">
            <strong>Error:</strong> {error.value}
          </div>
        )}

        {greeting.value && (
          <div class="greeting">
            <h3>Latest Greeting:</h3>
            <p class="greeting-message">{greeting.value}</p>
          </div>
        )}

        {greetings.value.length > 0 && (
          <div class="history">
            <h3>Greeting History:</h3>
            <ul class="history-list">
              {greetings.value.map((msg, index) => (
                <li key={index} class="history-item">
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div class="info">
        <h3>Technical Details</h3>
        <ul>
          <li><strong>Frontend:</strong> Deno Fresh with Islands Architecture</li>
          <li><strong>Backend:</strong> Go with ConnectRPC</li>
          <li><strong>Protocol:</strong> HTTP/JSON transport via ConnectRPC</li>
          <li><strong>Schema:</strong> buf.build/wcygan/hello Protocol Buffers</li>
        </ul>
      </div>
    </div>
  );
}