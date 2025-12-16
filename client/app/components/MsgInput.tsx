"use client";



import { useRef } from "react";
import * as api from "@/lib/api";
import toastLib from "@/lib/toast";

interface MsgInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (attachment?: { url: string; type: string }) => void; // Updated signature
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MsgInput({ value, onChange, onSend, onTyping, disabled, }: MsgInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input
    e.target.value = "";

    try {
      const res = await api.uploadFile(file);
      // Immediately send message with attachment
      // Alternatively, we could show a preview and let user type text with it.
      // For simplicity v1: Send immediately as separate message
      onSend(res);
    } catch (err: any) {
      toastLib.showToast("Upload failed", "error");
    }
  }

  return (
    <div className="px-4 py-4 border-t border-slate-800 bg-slate-950/90">
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-400 hover:text-indigo-400 transition"
          disabled={disabled}
          title="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
        />

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
          onClick={() => onSend()}
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