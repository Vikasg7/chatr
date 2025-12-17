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
  onEdit?: (msg: any) => void;
  onDelete?: (msgId: number) => void;
}

export function MessageList({ messages, currentUserId, onReact, onEdit, onDelete }: MessageListProps) {
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
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`flex w-full ${mine ? 'justify-end' : 'justify-start'} ${firstInGroup ? 'mt-4' : 'mt-1'}`}
              >
                {!mine && (
                  <div className="flex-shrink-0 mr-2 mt-1 w-8">
                    {firstInGroup ? (
                      <Avatar src={m.sender.avatarUrl ?? null} name={m.sender.name} email={m.sender.email} size={32} />
                    ) : <div className="w-8" />}
                  </div>
                )}

                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                  {firstInGroup && !mine && (
                    <div className="flex items-baseline gap-2 mb-1 pl-1">
                      <span className="text-xs font-bold text-slate-300">{m.sender.name || m.sender.email}</span>
                      <span className="text-[10px] text-slate-500">{format.time(m.createdAt)}</span>
                    </div>
                  )}

                  <div
                    className={`
                        relative px-3 py-2 shadow-sm text-sm break-words
                        ${mine
                        ? 'bg-indigo-600 text-indigo-50 rounded-2xl rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm'}
                      `}
                  >
                    {/* Text Content */}
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {m.text}
                    </div>

                    {/* Attachments */}
                    {m.attachmentUrl && (
                      <div className="mt-2">
                        {m.attachmentType === "IMAGE" ? (
                          <img
                            src={`http://localhost:4000${m.attachmentUrl}`}
                            alt="attachment"
                            className="max-h-60 rounded-lg border border-white/10 shadow-sm object-cover bg-black/20"
                          />
                        ) : (
                          <a
                            href={`http://localhost:4000${m.attachmentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition text-sm ${mine ? 'bg-indigo-700 border-indigo-500 hover:bg-indigo-600' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                            <span>Download Attachment</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Link Previews */}
                    {m.metadata && (m.metadata as any).title && (
                      <a
                        href={(m.metadata as any).url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block mt-2 rounded-lg border overflow-hidden transition max-w-sm group ${mine ? 'border-indigo-500/50 bg-indigo-800/50 hover:bg-indigo-700/50' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-900'}`}
                      >
                        {(m.metadata as any).image && (
                          <div className="h-32 w-full relative">
                            <img src={(m.metadata as any).image} className="w-full h-full object-cover" alt="preview" />
                          </div>
                        )}
                        <div className="p-2">
                          <div className={`text-xs font-semibold truncate ${mine ? 'text-indigo-100' : 'text-slate-200'}`}>{(m.metadata as any).title}</div>
                          {(m.metadata as any).description && (
                            <div className={`text-[10px] mt-1 line-clamp-2 ${mine ? 'text-indigo-200/80' : 'text-slate-400'}`}>{(m.metadata as any).description}</div>
                          )}
                        </div>
                      </a>
                    )}

                    {/* Timestamp for self (since we hide header) */}
                    {mine && firstInGroup && (
                      <div className="absolute bottom-1 right-2 translate-y-full pt-1 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <span>{format.time(m.createdAt)}</span>
                        {/* Edit/Delete Actions */}
                        <button className="hover:text-slate-300" onClick={() => onEdit?.(m)}>Edit</button>
                        <button className="hover:text-red-400" onClick={() => onDelete?.(m.id)}>Delete</button>
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  <div className="mt-1 flex items-center justify-end gap-1 flex-wrap pl-1">
                    {Object.entries((m.reactions || []).reduce((acc: any, r: any) => {
                      acc[r.emoji] = acc[r.emoji] || [];
                      acc[r.emoji].push(r);
                      return acc;
                    }, {})).map(([emoji, reactions]: [string, any[]]) => {
                      const hasReacted = reactions.some(r => r.user.id === userId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onReact && onReact(m.id, emoji)}
                          className={`
                                      flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition shadow-sm
                                      ${hasReacted
                              ? 'bg-indigo-500 text-white border-indigo-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}
                                  `}
                          title={reactions.map((r: any) => r.user.name).join(', ')}
                        >
                          <span>{emoji}</span>
                          {reactions.length > 1 && <span>{reactions.length}</span>}
                        </button>
                      );
                    })}

                    {/* Reaction Add Button (visible on hover) */}
                    <div className="relative group/add">
                      <button className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800/50 text-slate-500 hover:text-slate-300 transition text-xs opacity-0 group-hover:opacity-100">+
                      </button>
                      <div className="absolute bottom-full mb-1 bg-slate-900 border border-slate-700 rounded-full flex gap-1 p-1 shadow-xl z-10 opacity-0 group-hover/add:opacity-100 pointer-events-none group-hover/add:pointer-events-auto transition-opacity -left-8">
                        {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                          <button key={emoji} onClick={() => onReact && onReact(m.id, emoji)} className="hover:scale-125 transition text-lg">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div >
  );
}
