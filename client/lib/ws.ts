export function create(token?: string | null) {
  const serverHost = process.env.NEXT_PUBLIC_SERVER_HOST || "localhost:4000";
  const protocol = serverHost.includes("localhost") ? "ws" : "wss";
  const baseUrl = `${protocol}://${serverHost}`;
  // ✅ Pass token as a sub-protocol instead of query param (if available)
  // The server now also supports reading from HttpOnly cookies.
  return new WebSocket(baseUrl, token ? [token] : []);
}