"use client";

interface ChatHeaderProps {
  connected: boolean;
  roomName: string;
  subtitle?: string;
  onInvite?: () => void;
  onUnfriend?: () => void;
  isAccepted?: boolean;
  typingText?: string | null;
  onCall?: () => void;
  onVideoCall?: () => void;
}

export function ChatHeader({ connected, roomName, subtitle, onInvite, onUnfriend, isAccepted, typingText, onCall, onVideoCall }: ChatHeaderProps) {
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
          <div className="flex items-center gap-1">
            <button
              onClick={onCall}
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition"
              title="Start Audio Call"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </button>
            <button
              onClick={onVideoCall}
              className={`p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-full transition ${!onVideoCall ? 'cursor-not-allowed opacity-40' : ''}`}
              title={onVideoCall ? "Start Video Call" : "Video call coming soon"}
              disabled={!onVideoCall}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            </button>
          </div>
        )}

        {onUnfriend && isAccepted && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to unfriend this user?")) {
                onUnfriend();
              }
            }}
            className="text-red-400 hover:text-red-300 font-medium transition-colors ml-2 text-xs"
            title="Unfriend"
          >
            Unfriend
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
