export function create(token: string) {
  const serverHost = process.env.NEXT_PUBLIC_SERVER_HOST || "localhost:4000";
  const protocol = serverHost.includes("localhost") ? "ws" : "wss";
  const baseUrl = `${protocol}://${serverHost}`;
  return new WebSocket(`${baseUrl}?token=${token}`);
}