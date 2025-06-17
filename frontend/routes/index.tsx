import { GreeterApp } from "../islands/GreeterApp.tsx";

export function HomePage() {
  return (
    <div class="page">
      <header class="header">
        <h1>Fresh + ConnectRPC Demo</h1>
        <p>A demonstration of Deno Fresh with ConnectRPC integration</p>
      </header>
      
      <main class="main">
        <GreeterApp />
      </main>
      
      <footer class="footer">
        <p>Built with Deno Fresh and ConnectRPC</p>
      </footer>
    </div>
  );
}