"use client";

import { Phone, Video, UserMinus, Plus } from "lucide-react";

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

export function ChatHeader({ connected, roomName, isOnline, subtitle, onInvite, onUnfriend, isAccepted, typingText, onCall, onVideoCall }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--color-elevated)] transition-colors">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 group">
          <div className="text-h6 font-bold tracking-tight text-[var(--text-primary)] truncate">{roomName}</div>
          <div
            className={`w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-500 ${isOnline
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
              : "bg-[var(--text-muted)]"
              }`}
            title={isOnline ? "Online" : "Offline"}
          />
        </div>
        {typingText ? (
          <div className="text-xs text-indigo-400 font-semibold animate-pulse">{typingText}</div>
        ) : subtitle && (
          <div className="text-xs text-slate-400 prose-constrained font-medium truncate">{subtitle}</div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className={`flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--color-base)] border border-[var(--border-subtle)] transition-opacity ${connected ? 'opacity-100' : 'opacity-40 animate-pulse'}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-indigo-400' : 'bg-[var(--text-muted)]'}`} />
          <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] whitespace-nowrap">
            {connected ? "Syncing" : "Offline"}
          </span>
        </div>

        {onCall && (
          <div className="flex items-center gap-1">
            <button
              onClick={onCall}
              className="p-2 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--border-subtle)] rounded-xl transition-all"
              title="Start Audio Call"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={onVideoCall}
              className={`p-2 text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--border-subtle)] rounded-xl transition-all ${!onVideoCall ? 'cursor-not-allowed opacity-40' : ''}`}
              title={onVideoCall ? "Start Video Call" : "Video call coming soon"}
              disabled={!onVideoCall}
            >
              <Video size={20} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {onUnfriend && isAccepted && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to unfriend this user?")) {
                  onUnfriend();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-bold transition-all text-[11px] uppercase tracking-wide border border-transparent hover:border-rose-500/20"
              title="Unfriend"
            >
              <UserMinus size={14} />
              Unfriend
            </button>
          )}

          {onInvite && (
            <button
              onClick={onInvite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-bold transition-all text-[11px] uppercase tracking-wide border border-transparent hover:border-indigo-500/20"
            >
              <Plus size={14} />
              Invite
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
