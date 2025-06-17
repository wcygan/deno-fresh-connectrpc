export default function App({ children }: { children: any }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Fresh + ConnectRPC Demo</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div class="container">
          {children}
        </div>
      </body>
    </html>
  );
}