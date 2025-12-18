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
  onAcceptInvite?: (inviteId: number) => void;
}

export function MessageList({ messages, currentUserId, onReact, onEdit, onDelete, onAcceptInvite }: MessageListProps) {
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
      className="flex-1 overflow-y-auto overflow-x-hidden content-pad space-y-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 scroll-thin min-w-0"
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">
          No messages yet. Be the first to say hi 👋
        </div>
      ) : (
        <div className="flex flex-col py-4">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const mine = m.sender.id === userId;
              const prev = messages[i - 1];
              const time = m.createdAt ? new Date(m.createdAt).getTime() : 0;
              const prevTime = prev ? new Date(prev.createdAt).getTime() : 0;

              // group messages if they are from the same sender within 1 minute
              const withinWindow = (a: number, b: number) => Math.abs(a - b) < 1 * 60 * 1000;
              const isFirstInGroup = !prev || prev.sender.id !== m.sender.id || !withinWindow(time, prevTime);

              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className={`group flex items-start gap-3 w-full px-4 ${mine ? 'flex-row-reverse' : 'flex-row'} ${isFirstInGroup ? 'mt-6' : 'mt-1'}`}
                >
                  {/* Time Marker - Only show for first in group */}
                  <div className={`w-12 flex-shrink-0 text-[10px] text-slate-600 font-medium pt-2 ${mine ? 'text-left' : 'text-right'}`}>
                    {isFirstInGroup && format.time(m.createdAt)}
                  </div>

                  {/* Message Content Container */}
                  <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[70%]`}>
                    <div
                      className={`
                        relative px-3 py-2 shadow-sm text-sm break-words group
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

                      {/* Actions Overlays */}
                      {mine && (
                        <div className="absolute top-1/2 -left-12 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 hover:text-indigo-400 transition-colors" onClick={() => onEdit?.(m)} title="Edit">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button className="p-1 hover:text-red-400 transition-colors" onClick={() => onDelete?.(m.id)} title="Delete">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      )}

                      {!mine && (
                        <div className="absolute top-1/2 -right-12 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="relative group/react">
                            <button className="p-1 hover:text-indigo-400 transition-colors font-bold text-xs">+</button>
                            <div className="absolute bottom-full mb-1 bg-slate-900 border border-slate-700 rounded-full flex gap-1 p-1 shadow-xl z-20 opacity-0 group-hover/react:opacity-100 pointer-events-none group-hover/react:pointer-events-auto transition-opacity -right-4 flex-nowrap shrink-0">
                              {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                                <button key={emoji} onClick={() => onReact && onReact(m.id, emoji)} className="hover:scale-125 transition text-lg leading-none p-1">{emoji}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reactions Display */}
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      {(Object.entries((m.reactions || []).reduce((acc: any, r: any) => {
                        acc[r.emoji] = acc[r.emoji] || [];
                        acc[r.emoji].push(r);
                        return acc;
                      }, {})) as [string, any[]][]).map(([emoji, reactions]) => {
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
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
