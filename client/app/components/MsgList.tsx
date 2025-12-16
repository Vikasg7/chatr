"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as format from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "./Avatar";

interface MessageListProps {
  messages: any[];
  currentUserId: number | null;
  onReact?: (msgId: number, emoji: string) => void;
}

export function MessageList({ messages, currentUserId, onReact }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = currentUserId;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto content-pad space-y-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 scroll-thin"
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
                <div className="flex items-start mr-3" aria-hidden>
                  {firstInGroup ? (
                    <Avatar
                      src={m.sender.avatarUrl ?? null}
                      name={m.sender.name}
                      email={m.sender.email}
                      size={28}
                    />
                  ) : (
                    <div className="avatar-sm" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {firstInGroup && (
                    <div className="flex items-baseline gap-2">
                      <div className="msg-sender">{m.sender.name || m.sender.email}</div>
                      <div className="text-xs text-slate-400">{format.time(m.createdAt)}</div>
                    </div>
                  )}

                  <div className={`${firstInGroup ? '' : 'mt-0'} text-slate-200 leading-relaxed whitespace-pre-wrap break-normal`}>
                    {m.text}

                    {m.attachmentUrl && (
                      <div className="mt-2">
                        {m.attachmentType === "IMAGE" ? (
                          <img
                            src={`http://localhost:4000${m.attachmentUrl}`}
                            alt="attachment"
                            className="max-h-64 rounded-lg border border-slate-700 shadow-sm object-contain"
                          />
                        ) : (
                          <a
                            href={`http://localhost:4000${m.attachmentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition text-sm text-indigo-400"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                            Download Attachment
                          </a>
                        )}
                      </div>
                    )}
                    {m.metadata && (m.metadata as any).title && (
                      <a
                        href={(m.metadata as any).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden hover:bg-slate-800 transition max-w-sm group"
                      >
                        {(m.metadata as any).image && (
                          <div className="h-32 w-full relative">
                            <img src={(m.metadata as any).image} className="w-full h-full object-cover" alt="preview" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition truncate">{(m.metadata as any).title}</div>
                          {(m.metadata as any).description && (
                            <div className="text-xs text-slate-400 mt-1 line-clamp-2">{(m.metadata as any).description}</div>
                          )}
                          <div className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider font-medium">
                            {new URL((m.metadata as any).url).hostname}
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  {Object.entries(
                    (m.reactions || []).reduce((acc: any, r: any) => {
                      acc[r.emoji] = acc[r.emoji] || [];
                      acc[r.emoji].push(r);
                      return acc;
                    }, {})
                  ).map(([emoji, reactions]: [string, any[]]) => {
                    const hasReacted = reactions.some(r => r.user.id === userId);
                    return (
                      <button
                        key={emoji}
                        onClick={() => onReact && onReact(m.id, emoji)}
                        className={`
                                    flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border transition
                                    ${hasReacted
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}
                                `}
                      >
                        <span>{emoji}</span>
                        <span>{reactions.length}</span>
                      </button>
                    );
                  })}

                  <div className="relative group/add">
                    <button className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition text-xs opacity-0 group-hover:opacity-100 group-hover/add:opacity-100 transition-opacity">
                      +
                    </button>
                    {/* Simple Hover Popup for adding reactions */}
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover/add:flex bg-slate-900 border border-slate-700 rounded-full shadow-lg p-1 gap-1 z-10">
                      {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => onReact && onReact(m.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-full text-lg transition"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
              </motion.div>
      );
          })}
    </AnimatePresence>
  )
}
    </div >
  );
}
