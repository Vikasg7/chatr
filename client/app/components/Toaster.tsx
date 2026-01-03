"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import toastLib, { Toast } from "@/lib/toast";

function Icon({ type }: { type?: Toast["type"] }) {
  const size = 20;
  if (type === "success") return <CheckCircle2 size={size} className="text-emerald-400" />;
  if (type === "error") return <AlertCircle size={size} className="text-rose-400" />;
  return <Info size={size} className="text-blue-400" />;
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = toastLib.subscribe((t) => setToasts(t));
    return () => { unsub() };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 sm:inset-auto sm:left-6 sm:bottom-6 z-[100] flex flex-col items-center sm:items-start gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: -40, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -20, scale: 0.95, filter: "blur(2px)", transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="pointer-events-auto group relative"
          >
            <div className={`
              relative flex flex-col min-w-[320px] max-w-[420px] overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-300
              ${t.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 shadow-[0_8px_32px_rgba(244,63,94,0.15)]"
                : t.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.15)]"
                  : "bg-[var(--color-card)] border-[var(--border-subtle)] shadow-[0_8px_32px_rgba(2,6,23,0.3)]"}
            `}>
              {/* Content */}
              <div className="flex items-start gap-4 p-4">
                <div className="mt-1 flex-shrink-0">
                  <Icon type={t.type} />
                </div>

                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold leading-relaxed text-[var(--text-primary)]">
                    {t.message}
                  </p>

                  {t.action && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        try { t.action?.onClick(); } catch (e) { console.error(e); }
                        toastLib.dismissToast(t.id);
                      }}
                      className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors pt-2"
                    >
                      {t.action.label}
                    </motion.button>
                  )}
                </div>

                <button
                  onClick={() => toastLib.dismissToast(t.id)}
                  className="mt-0.5 flex-shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Progress Bar (if TTL exists) */}
              {t.ttl && t.ttl > 0 && (
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: t.ttl / 1000, ease: "linear" }}
                  className={`h-1 w-full absolute bottom-0 left-0
                    ${t.type === "error" ? "bg-rose-500/50" : t.type === "success" ? "bg-emerald-500/50" : "bg-blue-500/50"}
                  `}
                />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
