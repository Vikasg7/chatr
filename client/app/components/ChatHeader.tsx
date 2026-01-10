"use client";

import { useState, useRef, useEffect } from "react";
import { Phone, Video, UserMinus, Plus, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "./ConfirmModal";

interface ChatHeaderProps {
  connected: boolean;
  roomName: string;
  isOnline: boolean;
  subtitle?: string;
  onInvite?: () => void;
  onUnfriend?: () => void;
  isAccepted?: boolean;
  typingText?: string | null;
  onCall?: () => void;
  onVideoCall?: () => void;
}

export function ChatHeader({
  connected,
  roomName,
  isOnline,
  subtitle,
  onInvite,
  onUnfriend,
  isAccepted,
  typingText,
  onCall,
  onVideoCall
}: ChatHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between pl-4 pr-3 md:pl-4 md:pr-4 py-token-2 border-b border-[var(--border-subtle)] bg-[var(--color-elevated)] transition-colors relative">

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-h6 font-bold tracking-tight text-[var(--text-primary)] truncate leading-none">{roomName}</div>
          <div className="flex items-center gap-token-2">
            <div
              className={`w-2 h-2 rounded-full shadow-sm transition-all duration-500 shrink-0 ${isOnline
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                : "bg-[var(--text-muted)]"
                }`}
              title={isOnline ? "Online" : "Offline"}
            />
          </div>
        </div>
        {typingText ? (
          <div className="text-xs text-indigo-400 font-semibold animate-pulse mt-0.5">{typingText}</div>
        ) : subtitle && (
          <div className="text-xs text-slate-400 prose-constrained font-medium truncate mt-0.5">{subtitle}</div>
        )}
      </div>

      <div className="flex items-center gap-token-2">
        {/* Action Buttons */}
        <div className="flex items-center gap-token-1">
          {onCall && (
            <>
              <button
                onClick={onCall}
                className="p-token-1 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--border-subtle)] rounded-token-lg transition-all"
                title="Start Audio Call"
              >
                <Phone size={20} />
              </button>
              <button
                onClick={onVideoCall}
                className={`p-token-1 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--border-subtle)] rounded-token-lg transition-all ${!onVideoCall ? 'cursor-not-allowed opacity-40' : ''}`}
                title={onVideoCall ? "Start Video Call" : "Video call coming soon"}
                disabled={!onVideoCall}
              >
                <Video size={20} />
              </button>
            </>
          )}

          {/* Combined Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-token-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] rounded-token-lg transition-all ${isMenuOpen ? 'bg-[var(--border-subtle)] scale-110 text-indigo-400' : ''}`}
              title="More options"
            >
              <MoreHorizontal size={20} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 w-48 bg-[var(--color-elevated)] border border-[var(--border-subtle)] rounded-token-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden z-[1000]" style={{ marginTop: 'var(--space-1)', padding: 'calc(var(--space-1) * 0.75)' }}
                >
                  {onInvite && (
                    <button
                      onClick={() => {
                        onInvite();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-500/10 text-indigo-400 transition-all group"
                    >
                      <Plus size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Invite to Room</span>
                    </button>
                  )}

                  {onUnfriend && isAccepted && (
                    <button
                      onClick={() => {
                        setShowUnfriendConfirm(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-all group"
                    >
                      <UserMinus size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Unfriend</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showUnfriendConfirm}
        onClose={() => setShowUnfriendConfirm(false)}
        onConfirm={onUnfriend || (() => { })}
        title="Unfriend User?"
        message={`Are you sure you want to remove ${roomName} from your friends? You won't be able to message them until you connect again.`}
        confirmText="Unfriend"
        type="danger"
      />
    </div>
  );
}
