import { useAuthStore } from "@/stores/auth";

export const API_BASE = "http://localhost:4000/api";

export async function get(path: string) {
  const token = useAuthStore.getState().token;
  console.log(token);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res.json();
}

export async function post(path: string, body: any) {
  const token = useAuthStore.getState().token;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json();
}
