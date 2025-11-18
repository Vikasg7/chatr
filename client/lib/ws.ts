export function create(token: string) {
  return new WebSocket(`ws://localhost:4000?token=${token}`);
}