"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as format from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { Avatar } from "./Avatar";
import { MediaViewer } from "./MediaViewer";

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
  const [activePickerId, setActivePickerId] = useState<number | null>(null);
  const [viewedMedia, setViewedMedia] = useState<{ url: string; type: "IMAGE" | "VIDEO" } | null>(null);
  const userId = currentUserId;

  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    if (scrollRef.current) {
      const isNewMessage = messages.length > prevCountRef.current;
      const isNearBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 100;

      // Only scroll if a new message was added and user is near bottom (or it's their own message)
      if (isNewMessage && (isNearBottom || messages[messages.length - 1]?.sender?.id === currentUserId)) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, currentUserId]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden content-pad space-y-0 bg-[var(--color-base)] scroll-thin min-w-0"
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
          No messages yet. Be the first to say hi 👋
        </div>
      ) : (
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const mine = m.sender.id === userId;
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const time = m.createdAt ? new Date(m.createdAt).getTime() : 0;
              const prevTime = prev ? new Date(prev.createdAt).getTime() : 0;
              const nextTime = next ? new Date(next.createdAt).getTime() : 0;

              // group messages if they are from the same sender within 1 minute
              const withinWindow = (a: number, b: number) => Math.abs(a - b) < 1 * 60 * 1000;
              const isFirstInGroup = !prev || !prev.sender || !m.sender || prev.sender.id !== m.sender.id || !withinWindow(time, prevTime);
              const isLastInGroup = !next || !next.sender || !m.sender || next.sender.id !== m.sender.id || !withinWindow(time, nextTime);

              const isLastMessage = i === messages.length - 1;
              const hasReactions = m.reactions && m.reactions.length > 0;
              const marginClass = isLastMessage ? 'mb-0' : (isLastInGroup || hasReactions ? 'mb-6' : 'mb-1');

              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className={`group flex items-start gap-2.5 w-full ${mine ? 'flex-row-reverse pl-6 md:pl-20' : 'flex-row pr-6 md:pr-20'} ${marginClass}`}
                >
                  {/* Time Marker - Only show for first in group */}
                  <div className={`w-6 flex-shrink-0 text-[10px] text-[var(--text-muted)] font-medium pt-2 ${mine ? 'text-left' : 'text-right'}`}>
                    {isFirstInGroup && format.time(m.createdAt)}
                  </div>

                  {/* Message Content Container */}
                  <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%] lg:max-w-[60%]`}>
                    <div
                      className={`
                        relative px-3 py-2 shadow-sm text-sm break-all group
                        ${mine
                          ? 'bg-indigo-600 text-indigo-50 rounded-2xl rounded-tr-sm'
                          : 'bg-[var(--color-card)] text-[var(--text-primary)] rounded-2xl rounded-tl-sm border border-[var(--border-subtle)]'}
                      `}
                    >
                      {/* Text Content */}
                      <div className="whitespace-pre-wrap leading-relaxed break-all">
                        {m.text}
                      </div>

                      {/* Attachments */}
                      {/* Attachments */}
                      {m.attachmentUrl && (
                        <div className="mt-2 space-y-2">
                          {m.attachmentType === "IMAGE" && (
                            <div
                              className="relative group/img overflow-hidden rounded-xl border border-[var(--border-subtle)] shadow-lg bg-[var(--color-elevated)] cursor-pointer"
                              onClick={() => setViewedMedia({ url: `http://localhost:4000${m.attachmentUrl}`, type: "IMAGE" })}
                            >
                              <img
                                src={`http://localhost:4000${m.attachmentUrl}`}
                                alt="attachment"
                                className="max-h-[300px] max-w-full object-contain rounded-lg transition-transform duration-500 group-hover/img:scale-105"
                              />
                            </div>
                          )}

                          {m.attachmentType === "VIDEO" && (
                            <div className="relative group/video overflow-hidden rounded-xl border border-[var(--border-subtle)] shadow-lg bg-[var(--color-elevated)]">
                              <video
                                controls
                                className="max-h-[300px] max-w-full rounded-lg"
                                src={`http://localhost:4000${m.attachmentUrl}`}
                              />
                              {/* Fullscreen Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewedMedia({ url: `http://localhost:4000${m.attachmentUrl}`, type: "VIDEO" });
                                }}
                                className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover/video:opacity-100 transition-all z-10"
                                title="Open in fullscreen"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                              </button>
                            </div>
                          )}

                          {m.attachmentType === "AUDIO" && (
                            <div className="p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--color-elevated)] shadow-inner min-w-[240px]">
                              <div className="text-[10px] text-[var(--text-muted)] mb-1 flex items-center gap-1.5 px-1 truncate">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                                {m.metadata?.attachmentName || "Audio clip"}
                              </div>
                              <audio
                                controls
                                className="w-full h-8"
                                src={`http://localhost:4000${m.attachmentUrl}`}
                              />
                            </div>
                          )}

                          {(m.attachmentType === "FILE" || m.attachmentType === "TEXT") && (
                            <div className={`group/file flex flex-col gap-2 p-3 rounded-xl border transition-all ${mine ? 'bg-indigo-700/50 border-indigo-400/30 hover:bg-indigo-600/50' : 'bg-[var(--color-elevated)] border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${mine ? 'bg-indigo-600' : 'bg-[var(--color-elevated)]'}`}>
                                  {m.attachmentType === "TEXT" ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                  ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold truncate text-[var(--text-primary)] italic">
                                    {m.metadata?.attachmentName || "Download file"}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider opacity-60">
                                    {m.attachmentType}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={`http://localhost:4000${m.attachmentUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${mine ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-[var(--border-subtle)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-primary)]'}`}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                DOWNLOAD
                              </a>
                            </div>
                          )}

                          {m.attachmentType === "CALL_SUMMARY" && (
                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[var(--color-card)] border border-[var(--border-subtle)] shadow-inner backdrop-blur-md">
                              <div className={`p-2 rounded-full ${m.metadata?.type === 'call:cancel' || m.metadata?.type === 'call:reject' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {m.metadata?.type === 'call:cancel' || m.metadata?.type === 'call:reject' ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-xs font-bold uppercase tracking-widest opacity-80 ${m.metadata?.type === 'call:cancel' || m.metadata?.type === 'call:reject' ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {m.text}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-medium">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Link Previews */}
                      {m.metadata && (m.metadata as any).title && (
                        <a
                          href={(m.metadata as any).url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block mt-2 rounded-lg border overflow-hidden transition max-w-sm group ${mine ? 'border-indigo-500/50 bg-indigo-800/50 hover:bg-indigo-700/50' : 'border-[var(--border-subtle)] bg-[var(--color-card)] hover:bg-[var(--border-subtle)]'}`}
                        >
                          {(m.metadata as any).image && (
                            <div className="h-32 w-full relative">
                              <img src={(m.metadata as any).image} className="w-full h-full object-cover" alt="preview" />
                            </div>
                          )}
                          <div className="p-2">
                            <div className={`text-xs font-semibold truncate ${mine ? 'text-indigo-100' : 'text-[var(--text-primary)]'}`}>{(m.metadata as any).title}</div>
                            {(m.metadata as any).description && (
                              <div className={`text-[10px] mt-1 line-clamp-2 ${mine ? 'text-indigo-200/80' : 'text-[var(--text-muted)]'}`}>{(m.metadata as any).description}</div>
                            )}
                          </div>
                        </a>
                      )}

                      {/* Reactions Trigger (Smiley Icon) - Only for other people's messages */}
                      {!mine && (
                        <div className="absolute top-1/2 -right-8 -translate-y-1/2">
                          <button
                            onClick={() => setActivePickerId(activePickerId === m.id ? null : m.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            title="React"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 group-hover:opacity-100 transition-opacity">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <circle cx="9" cy="9" r="0.5" fill="currentColor" />
                              <circle cx="15" cy="9" r="0.5" fill="currentColor" />
                            </svg>
                          </button>

                          <AnimatePresence>
                            {activePickerId === m.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                className="absolute bottom-full mb-2 z-[110] flex items-center gap-0.5 p-1 bg-[var(--color-elevated)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-full shadow-2xl left-0"
                              >
                                {["👍", "❤️", "😂", "😮", "😢", "🙏", "😘"].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      onReact?.(m.id, emoji);
                                      setActivePickerId(null);
                                    }}
                                    className="hover:scale-125 transition text-xl leading-none p-1 active:scale-95"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Edit/Delete Actions (Only for my messages) - Using Icons now */}
                      {mine && (
                        <div className="absolute top-0 -left-14 h-full flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button
                            className="p-1 px-1 text-[var(--text-muted)] hover:text-indigo-400 hover:scale-110 transition-all"
                            onClick={() => onEdit?.(m)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="p-1 text-[var(--text-muted)] hover:text-red-400 hover:scale-110 transition-all"
                            onClick={() => onDelete?.(m.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Reactions Display (Transparent, floating) */}
                      {m.reactions && m.reactions.length > 0 && (
                        <div className={`absolute -bottom-5 ${mine ? 'right-2' : 'left-2'} flex items-center gap-2 z-30 whitespace-nowrap`}>
                          {(Object.entries(m.reactions.reduce((acc: any, r: any) => {
                            acc[r.emoji] = acc[r.emoji] || [];
                            acc[r.emoji].push(r);
                            return acc;
                          }, {})) as [string, any[]][]).map(([emoji, reactions]) => {
                            const hasReacted = reactions.some(r => r.user.id === userId);
                            return (
                              <button
                                key={emoji}
                                onClick={() => !mine && onReact?.(m.id, emoji)}
                                className={`flex items-center gap-1 filter drop-shadow-xl select-none transition-transform duration-200 ${mine ? 'cursor-default' : 'hover:scale-125 active:scale-95'} ${hasReacted ? 'scale-110' : 'scale-100'}`}
                                title={reactions.map((r: any) => r.user.name).join(', ')}
                              >
                                <div className="relative">
                                  <span className="text-xl leading-none">{emoji}</span>
                                  {reactions.length > 1 && (
                                    <span className="absolute -top-1.5 -right-2 text-[9px] text-white bg-indigo-600 px-1 rounded-full font-black border border-white/20 backdrop-blur-sm min-w-[14px] h-[14px] flex items-center justify-center text-center shadow-lg">
                                      {reactions.length}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Media Viewer */}
      <MediaViewer
        mediaUrl={viewedMedia?.url || null}
        mediaType={viewedMedia?.type || null}
        onClose={() => setViewedMedia(null)}
      />
    </div>
  );
}
