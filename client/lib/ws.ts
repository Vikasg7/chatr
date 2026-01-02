export function create(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
  return new WebSocket(`${baseUrl}?token=${token}`);
}