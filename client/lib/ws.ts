export function create(token: string) {
  const url = `ws://localhost:4000?token=${token}`;
  const ws = new WebSocket(url);

  return ws;
}