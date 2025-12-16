"use client";

interface ChatHeaderProps {
  connected: boolean;
  roomName: string;
  subtitle?: string;
  onInvite?: () => void;
  typingText?: string | null;
  onCall?: () => void;
}

export function ChatHeader({ connected, roomName, subtitle, onInvite, typingText, onCall }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
      <div>
        <div className="text-h6">{roomName}</div>
        {typingText ? (
          <div className="text-xs text-indigo-400 font-medium animate-pulse">{typingText}</div>
        ) : subtitle && (
          <div className="text-xs text-slate-400 prose-constrained">{subtitle}</div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-500"
            }`}
        />
        {connected ? "Connected" : "Reconnecting..."}

        {onCall && (
          <button
            onClick={onCall}
            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition mr-2"
            title="Start Video Call"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </button>
        )}

        {onInvite && (
          <button
            onClick={onInvite}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors ml-2"
          >
            + Invite
          </button>
        )}
      </div>
    </div>
  );
}
