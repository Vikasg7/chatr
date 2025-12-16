"use client";

interface MsgInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onTyping?: (isTyping: boolean) => void; // New prop
  disabled?: boolean;
}

export function MsgInput({ value, onChange, onSend, onTyping, disabled, }: MsgInputProps) {

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="px-4 py-4 border-t border-slate-800 bg-slate-950/90">
      <div className="flex items-center gap-3">
        <div className="flex-1 input-wrap flex items-center shadow-sm">
          <input
            className="bg-transparent flex-1 text-sm outline-none placeholder:text-slate-500"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onTyping?.(true);
            }}
            onBlur={() => onTyping?.(false)}
            placeholder="Type a message…"
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          onClick={onSend}
          className="btn-primary"
          disabled={disabled || !value.trim()}
          aria-disabled={disabled || !value.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}