type ToastType = "info" | "success" | "error";

export type Toast = {
  id: string;
  message: string;
  type?: ToastType;
  ttl?: number; // ms
  action?: { label: string; onClick: () => void };
};

type Listener = (t: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l([...toasts]);
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  // send current
  listener([...toasts]);
  return () => listeners.delete(listener);
}

function id() {
  return Math.random().toString(36).slice(2, 9);
}

export function showToast(
  message: string,
  type: ToastType = "info",
  ttl = 4000,
  action?: { label: string; onClick: () => void }
) {
  const t: Toast = { id: id(), message, type, ttl, action };
  toasts = [...toasts, t];
  notify();
  if (ttl > 0) {
    setTimeout(() => {
      dismissToast(t.id);
    }, ttl);
  }
  return t.id;
}

export function dismissToast(idToRemove: string) {
  toasts = toasts.filter((t) => t.id !== idToRemove);
  notify();
}

export function errorToToast(err: unknown, fallback = "An error occurred") {
  // Accept Error, string, or unknown
  if (!err) {
    showToast(fallback, "error");
    return;
  }

  let msg = fallback;
  if (typeof err === "string") msg = err;
  else if (err instanceof Error) msg = err.message || fallback;
  else {
    try {
      msg = JSON.stringify(err);
    } catch (e) {
      msg = String(err);
    }
  }

  showToast(msg, "error");
}

export default {
  subscribe,
  showToast,
  dismissToast,
  errorToToast,
};
