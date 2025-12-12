"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as format from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "./Avatar";

interface MessageListProps {
  messages: any[];
}

export function MessageList({ messages }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 scroll-thin"
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">
          No messages yet. Be the first to say hi 👋
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const mine = m.sender.id === userId;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const time = new Date(m.createdAt).getTime();
            const prevTime = prev ? new Date(prev.createdAt).getTime() : 0;
            const nextTime = next ? new Date(next.createdAt).getTime() : 0;

            // group messages if they are within 1 minute
            const withinWindow = (a: number, b: number) => Math.abs(a - b) < 1 * 60 * 1000; // 1 minute

            const prevSame = !!prev && prev.sender.id === m.sender.id && withinWindow(time, prevTime);

            const firstInGroup = !prevSame;

            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
                className={`flex w-full justify-start items-start ${firstInGroup ? 'mt-4' : 'mt-0'}`}
              >
                {/* Avatar column: show avatar at start of group, otherwise placeholder to maintain alignment */}
                <div className="flex items-start mr-2" aria-hidden>
                  {firstInGroup ? (
                    <Avatar
                      src={m.sender.avatarUrl ?? null}
                      name={m.sender.name}
                      email={m.sender.email}
                      size={28}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {firstInGroup && (
                    <div className="flex items-baseline gap-2">
                      <div className="text-sm font-semibold text-slate-250">{m.sender.name || m.sender.email}</div>
                      <div className="text-xs text-slate-400">{format.time(m.createdAt)}</div>
                    </div>
                  )}

                  <div className={`${firstInGroup ? '' : 'mt-0'} text-slate-200 leading-relaxed whitespace-pre-wrap break-normal`}> 
                    {m.text}
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
