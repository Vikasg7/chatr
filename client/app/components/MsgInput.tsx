"use client";

interface MsgInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function MsgInput({ value, onChange, onSend, disabled, }: MsgInputProps) {
  
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90">
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 flex items-center shadow-sm">
          <input
            className="bg-transparent flex-1 text-sm outline-none placeholder:text-slate-500"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type a message…"
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          onClick={onSend}
          className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || !value.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}