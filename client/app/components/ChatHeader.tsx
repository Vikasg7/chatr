"use client";

interface ChatHeaderProps {
  connected: boolean;
  roomName: string;
  subtitle?: string;
  onInvite?: () => void;
  typingText?: string | null;
}

export function ChatHeader({ connected, roomName, subtitle, onInvite, typingText }: ChatHeaderProps) {
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
