"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toastLib, { Toast } from "@/lib/toast";

function Icon({ type }: { type?: Toast["type"] }) {
  if (type === "success") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mr-2">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mr-2">
        <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="0" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mr-2">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = toastLib.subscribe((t) => setToasts(t));
    return () => {
      unsub();
    };
  }, []);

  return (
    // Container positioned bottom-left and aligned start so toasts stack upward
    <div className="pointer-events-none fixed left-4 bottom-4 z-50 flex flex-col items-start gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, x: -6 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 12, x: -6 }}
            transition={{ duration: 0.18 }}
            layout
            role="status"
            aria-live="polite"
            className="pointer-events-auto"
          >
            <div
              className={`toast-card ${
                t.type === "error"
                  ? "bg-red-800 border-red-400 text-white"
                  : t.type === "success"
                  ? "bg-green-800 border-green-400 text-white"
                  : "bg-slate-800 border-slate-600 text-slate-100"
              } flex items-center justify-between gap-3`}
            >
              <div className="flex items-center flex-1">
                <Icon type={t.type} />
                <div className="pr-2 break-words">{t.message}</div>
              </div>

              <div className="flex items-center gap-2">
                {t.action && (
                  <button
                    onClick={() => {
                      try {
                        t.action?.onClick();
                      } catch (e) {
                        console.error(e);
                      }
                      toastLib.dismissToast(t.id);
                    }}
                    className="btn-ghost btn-ghost-sm"
                  >
                    {t.action.label}
                  </button>
                )}

                <button
                  className="ml-2 text-xs opacity-80 hover:opacity-100"
                  onClick={() => toastLib.dismissToast(t.id)}
                  aria-label="dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
