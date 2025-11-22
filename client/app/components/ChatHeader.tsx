"use client";

interface ChatHeaderProps {
  connected: boolean;
  roomName: string;
  subtitle?: string;
}

export function ChatHeader({ connected, roomName, subtitle }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
      <div>
        <div className="text-sm font-semibold">{roomName}</div>
        {subtitle && (
          <div className="text-xs text-slate-500 max-w-md">{subtitle}</div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${
            connected ? "bg-emerald-400" : "bg-red-500"
          }`}
        />
        {connected ? "Connected" : "Reconnecting..."}
      </div>
    </div>
  );
}
