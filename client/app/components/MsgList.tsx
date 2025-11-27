"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as format from "@/lib/format";
import { useAuthStore } from "@/stores/auth";

interface MessageListProps {
  messages: any[];
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = useAuthStore(s => s.user?.id);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-1 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 scroll-thin"
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">
          No messages yet. Be the first to say hi 👋
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.sender.id === userId;

            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`flex mb-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm border border-slate-800/60 ${
                    mine
                      ? "bg-indigo-600 text-slate-50"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  {!mine && (
                    <div className="text-[11px] font-medium text-slate-400 mb-1">
                      {m.sender.name || m.sender.email}
                    </div>
                  )}
                  <div className="leading-snug break-words">{m.text}</div>
                  <div
                    className={`mt-1 text-[10px] text-right ${
                      mine ? "text-indigo-100/80" : "text-slate-400"
                    }`}
                  >
                    {format.time(m.createdAt)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
