import { useAuthStore } from "@/stores/auth";

const serverHost = process.env.NEXT_PUBLIC_SERVER_HOST || "localhost:4000";
const protocol = serverHost.includes("localhost") ? "http" : "https";
export const SERVER_URL = `${protocol}://${serverHost}`;
export const API_BASE = `${SERVER_URL}/api`;

async function request(method: string, path: string, body?: any) {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle unauthorized centrally: clear auth and surface an error
  if (res.status === 401) {
    // clear token and user so UI can react
    useAuthStore.getState().logout();
    throw new Error("Unauthorized");
  }

  // Non-OK responses: try to parse json error, otherwise text
  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.clone().json();
    } catch (e) {
      errBody = await res.text();
    }
    const message = (errBody && errBody.error) || errBody || res.statusText;
    throw new Error(String(message));
  }

  // OK -> parse json (some endpoints may return empty body)
  try {
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function get(path: string) {
  return request("GET", path);
}

export async function post(path: string, body: any) {
  return request("POST", path, body);
}

export async function del(path: string) {
  return request("DELETE", path);
}

export async function uploadFile(file: File) {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return await res.json();
}
