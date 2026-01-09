"use client";

import { useRef, useState, memo, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import * as format from "@/lib/format";
import { MediaViewer } from "./MediaViewer";
import { SERVER_URL } from "@/lib/api";
import { ConfirmModal } from "./ConfirmModal";

interface MessageListProps {
  messages: any[];
  currentUserId: number | null;
  onReact?: (msgId: number, emoji: string) => void;
  onEdit?: (msg: any) => void;
  onQuote?: (msg: any) => void;
  onDelete?: (msgId: number) => void;
  onAcceptInvite?: (inviteId: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

const MessageItem = memo(({
  m,
  mine,
  isFirstInGroup,
  isLastInGroup,
  hasReactions,
  isLastMessage,
  userId,
  activeActionsId,
  setActiveActionsId,
  activePickerId,
  setActivePickerId,
  setDeleteMsgId,
  setViewedMedia,
  onReact,
  onEdit,
  onQuote,
  scrollToMessage
}: any) => {
  const marginClass = isLastMessage ? 'mb-0' : (isLastInGroup || hasReactions ? 'mb-6' : 'mb-1');

  return (
    <div
      id={`msg-container-${m.id}`}
      className={`group flex items-start gap-token-1 w-full px-0 ${mine ? 'flex-row-reverse' : 'flex-row'} ${marginClass}`}
      style={{ paddingTop: 'calc(var(--space-1) * 0.75)', paddingBottom: 'calc(var(--space-1) * 0.75)' }}
    >
      {/* Time Marker - Only show for first in group */}
      <div className={`w-8 shrink-0 text-[10px] text-[var(--text-muted)] font-medium ${mine ? 'text-left' : 'text-right'}`} style={{ paddingTop: 'var(--space-1)' }}>
        {isFirstInGroup && format.time(m.createdAt)}
      </div>

      {/* Message Content Container */}
      <div className={`flex flex-col relative ${mine ? 'items-end' : 'items-start'} max-w-[calc(100%-140px)] sm:max-w-[75%] lg:max-w-[65%]`}>
        {/* Emoji Picker - Moved here for edge safety */}
        <AnimatePresence>
          {activePickerId === m.id && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`
                absolute bottom-full mb-3 flex items-center gap-1.5 p-2 
                bg-[var(--color-elevated)] border border-[var(--border-subtle)] 
                rounded-full shadow-2xl z-[500] backdrop-blur-md
                ${mine ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {["👍", "❤️", "😂", "😮", "😢", "🙏", "😘"].map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
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

        <div
          id={`msg-${m.id}`}
          onClick={(e) => {
            if (window.innerWidth < 768) {
              e.stopPropagation();
              setActiveActionsId(activeActionsId === m.id ? null : m.id);
              setActivePickerId(null); // Clear picker when switching messages
            }
          }}
          className={`
            relative px-token-3 shadow-sm text-sm break-all group transition-colors duration-200 cursor-pointer md:cursor-default
            ${mine
              ? 'bg-indigo-600 text-indigo-50 rounded-token-2xl rounded-tr-sm'
              : 'bg-[var(--color-card)] text-[var(--text-primary)] rounded-token-2xl rounded-tl-sm border border-[var(--border-subtle)]'}
          `}
          style={{ paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' }}
        >
          {/* Quoted Message (Reply) */}
          {m.replyTo && (
            <div
              onClick={() => scrollToMessage(m.replyTo.id)}
              className={`
                p-token-1 rounded-token-md border-l-4 border-indigo-400 cursor-pointer transition-colors min-w-0
                ${mine ? 'bg-indigo-700/50 hover:bg-indigo-700' : 'bg-[var(--border-subtle)] hover:bg-[var(--accent)]/10'}
              `}
              style={{ marginBottom: 'var(--space-1)' }}
            >
              <div className={`text-[10px] font-black uppercase tracking-widest mb-1 truncate ${mine ? 'text-indigo-200' : 'text-indigo-500'}`}>
                {m.replyTo.sender?.name || m.replyTo.sender?.email?.split('@')[0]}
              </div>
              <div className={`text-xs italic opacity-80 overflow-hidden text-ellipsis line-clamp-2 ${mine ? 'text-indigo-100' : 'text-[var(--text-muted)]'}`}>
                {m.replyTo.text || (m.replyTo.attachmentUrl ? "Attachment" : "...")}
              </div>
            </div>
          )}

          {/* Text Content */}
          <div className="whitespace-pre-wrap leading-relaxed break-all">
            {m.text}
          </div>

          {/* Attachments and other content same as before but without motion... */}
          {m.attachmentUrl && (
            <div style={{ marginTop: 'var(--space-1)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {m.attachmentType === "IMAGE" && (
                <div
                  className="relative group/img overflow-hidden rounded-token-lg border border-[var(--border-subtle)] shadow-lg bg-[var(--color-elevated)] cursor-pointer"
                  onClick={() => setViewedMedia({ url: `${SERVER_URL}${m.attachmentUrl}`, type: "IMAGE" })}
                >
                  <img
                    src={`${SERVER_URL}${m.attachmentUrl}`}
                    alt="attachment"
                    className="max-h-[300px] max-w-full object-contain rounded-token-md transition-transform duration-500 group-hover/img:scale-105"
                  />
                </div>
              )}

              {m.attachmentType === "VIDEO" && (
                <div className="relative group/video overflow-hidden rounded-token-lg border border-[var(--border-subtle)] shadow-lg bg-[var(--color-elevated)]">
                  <video
                    controls
                    className="w-full max-h-[400px] rounded-token-md"
                    style={{ minWidth: '280px' }}
                    src={`${SERVER_URL}${m.attachmentUrl}`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewedMedia({ url: `${SERVER_URL}${m.attachmentUrl}`, type: "VIDEO" });
                    }}
                    className="absolute p-token-1 bg-black/60 hover:bg-black/80 text-white rounded-token-md opacity-0 group-hover/video:opacity-100 transition-all z-10"
                    style={{ top: 'var(--space-1)', right: 'var(--space-1)' }}
                    title="Open in fullscreen"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                </div>
              )}

              {m.attachmentType === "AUDIO" && (
                <div className="p-token-1 rounded-token-lg border border-[var(--border-subtle)] bg-[var(--color-elevated)] shadow-inner min-w-[240px]">
                  <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-token-1 px-1 truncate" style={{ marginBottom: 'calc(var(--space-1) * 0.5)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    {m.metadata?.attachmentName || "Audio clip"}
                  </div>
                  <audio
                    controls
                    className="w-full h-8"
                    src={`${SERVER_URL}${m.attachmentUrl}`}
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
                      <div className={`text-xs font-semibold truncate italic ${mine ? 'text-indigo-50' : 'text-[var(--text-primary)]'}`}>
                        {m.metadata?.attachmentName || "Download file"}
                      </div>
                      <div className={`text-[10px] uppercase font-bold tracking-wider opacity-60 ${mine ? 'text-indigo-200' : 'text-[var(--text-muted)]'}`}>
                        {m.attachmentType}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`${SERVER_URL}${m.attachmentUrl}`}
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

          {/* Message Actions (React, Quote, Edit, Delete) */}
          <div className={`
            absolute top-1/2 -translate-y-1/2 flex items-center gap-0
            transition-all duration-200 z-[40]
            ${activeActionsId === m.id ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 md:group-hover:opacity-100 md:group-hover:visible md:group-hover:scale-100'}
            ${mine ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2 flex-row'}
          `}>
            {/* Reaction Trigger (Only for others) */}
            {!mine && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePickerId(activePickerId === m.id ? null : m.id);
                  }}
                  className="p-1.5 text-[var(--text-muted)] hover:text-indigo-400 transition-colors"
                  title="React"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  </svg>
                </button>
              </div>
            )}

            {/* Quote Action */}
            <button
              className="p-1.5 text-[var(--text-muted)] hover:text-indigo-400 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onQuote?.(m);
                setActiveActionsId(null);
                setActivePickerId(null);
              }}
              title="Quote"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7"></polyline>
                <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
              </svg>
            </button>

            {/* Edit Action (Personal only) */}
            {mine && (
              <button
                className="p-1.5 text-[var(--text-muted)] hover:text-emerald-400 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(m);
                  setActiveActionsId(null);
                  setActivePickerId(null);
                }}
                title="Edit"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            )}

            {/* Delete Action (Personal only) */}
            {mine && (
              <button
                className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteMsgId(m.id);
                  setActiveActionsId(null);
                  setActivePickerId(null);
                }}
                title="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>

          {/* Reactions Display */}
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
    </div>
  );
});

export function MessageList({
  messages,
  currentUserId,
  onReact,
  onEdit,
  onQuote,
  onDelete,
  onAcceptInvite,
  onLoadMore,
  hasMore = false,
  loadingMore = false
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [activePickerId, setActivePickerId] = useState<number | null>(null);
  const [viewedMedia, setViewedMedia] = useState<{ url: string; type: "IMAGE" | "VIDEO" } | null>(null);
  const [deleteMsgId, setDeleteMsgId] = useState<number | null>(null);
  const [activeActionsId, setActiveActionsId] = useState<number | null>(null);
  const userId = currentUserId;

  const scrollToMessage = useCallback((msgId: number) => {
    const index = messages.findIndex(m => m.id === msgId);
    if (index !== -1) {
      virtuosoRef.current?.scrollToIndex({
        index,
        align: 'center',
        behavior: 'smooth'
      });
      setTimeout(() => {
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
          el.classList.add('highlight-msg');
          setTimeout(() => el.classList.remove('highlight-msg'), 2000);
        }
      }, 500);
    }
  }, [messages]);

  const enhancedMessages = useMemo(() => {
    return messages.map((m, i) => {
      const mine = m.sender.id === userId;
      const prev = messages[i - 1];
      const next = messages[i + 1];

      const time = m.createdAt ? new Date(m.createdAt).getTime() : 0;
      const prevTime = prev ? new Date(prev.createdAt).getTime() : 0;
      const nextTime = next ? new Date(next.createdAt).getTime() : 0;

      const withinWindow = (a: number, b: number) => Math.abs(a - b) < 1 * 60 * 1000;
      const isFirstInGroup = !prev || !prev.sender || !m.sender || prev.sender.id !== m.sender.id || !withinWindow(time, prevTime);
      const isLastInGroup = !next || !next.sender || !m.sender || next.sender.id !== m.sender.id || !withinWindow(time, nextTime);

      return {
        ...m,
        mine,
        isFirstInGroup,
        isLastInGroup,
        isLastMessage: i === messages.length - 1,
        hasReactions: m.reactions && m.reactions.length > 0
      };
    });
  }, [messages, userId]);

  const Header = useCallback(() => {
    if (!loadingMore) return <div className="h-4" />;
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Loading more history...</span>
      </div>
    );
  }, [loadingMore]);

  const Footer = useCallback(() => <div className="h-8" />, []);

  return (
    <div
      className="flex-1 bg-[var(--color-base)] relative min-w-0 overflow-hidden"
      onClick={() => {
        setActiveActionsId(null);
        setActivePickerId(null);
      }}
    >
      {!messages || messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
          {loadingMore ? (
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            "No messages yet. Be the first to say hi 👋"
          )}
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          data={enhancedMessages}
          initialTopMostItemIndex={enhancedMessages.length - 1}
          followOutput="smooth"
          alignToBottom
          computeItemKey={(index, item) => item.id}
          increaseViewportBy={200}
          className="flex-1 scroll-thin"
          style={{ height: '100%', width: '100%', overflowX: 'hidden' }}
          components={{ Header, Footer }}
          startReached={() => {
            if (hasMore && !loadingMore && onLoadMore) {
              onLoadMore();
            }
          }}
          itemContent={(index, m) => (
            <div className="px-2 md:px-4 w-full">
              <MessageItem
                m={m}
                mine={m.mine}
                isFirstInGroup={m.isFirstInGroup}
                isLastInGroup={m.isLastInGroup}
                hasReactions={m.hasReactions}
                isLastMessage={m.isLastMessage}
                userId={userId}
                activeActionsId={activeActionsId}
                setActiveActionsId={setActiveActionsId}
                activePickerId={activePickerId}
                setActivePickerId={setActivePickerId}
                setDeleteMsgId={setDeleteMsgId}
                setViewedMedia={setViewedMedia}
                onReact={onReact}
                onEdit={onEdit}
                onQuote={onQuote}
                scrollToMessage={scrollToMessage}
              />
            </div>
          )}
        />
      )}

      {/* Media Viewer */}
      <MediaViewer
        mediaUrl={viewedMedia?.url || null}
        mediaType={viewedMedia?.type || null}
        onClose={() => setViewedMedia(null)}
      />
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteMsgId !== null}
        onClose={() => setDeleteMsgId(null)}
        onConfirm={() => deleteMsgId && onDelete?.(deleteMsgId)}
        title="Delete Message?"
        message="This action cannot be undone. The message will be removed for everyone in this chat."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
