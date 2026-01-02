"use client";
import { useRef } from "react";
import { Paperclip, Send, Check, UserPlus, X, Edit2 } from "lucide-react";
import * as api from "@/lib/api";
import toastLib from "@/lib/toast";

interface MsgInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (attachment?: { url: string; type: string }) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  friendshipStatus?: string;
  isSender?: boolean;
  onSendRequest?: () => void;
  onAcceptRequest?: () => void;
}

export function MsgInput({
  value,
  onChange,
  onSend,
  onTyping,
  disabled,
  isEditing,
  onCancelEdit,
  friendshipStatus,
  isSender,
  onSendRequest,
  onAcceptRequest
}: MsgInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (friendshipStatus !== "ACCEPTED") {
    return (
      <div className="px-4 py-8 border-t border-slate-800 bg-slate-950/90 text-center">
        {friendshipStatus === "PENDING" ? (
          <div className="flex flex-col items-center">
            <p className="text-slate-400 text-sm mb-4 font-medium italic">
              {isSender ? "Friend request sent. Waiting for response..." : "This user wants to connect!"}
            </p>
            {!isSender && (
              <button
                onClick={onAcceptRequest}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                <Check size={18} />
                Accept Friend Request
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="text-slate-400 text-sm mb-4 font-medium italic">You are not friends with this user yet.</p>
            <button
              onClick={onSendRequest}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-900/20 active:scale-95"
            >
              <UserPlus size={18} />
              Send Friend Request
            </button>
          </div>
        )}
      </div>
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) onSend();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toastLib.showToast("File size must be less than 10MB", "error");
      e.target.value = "";
      return;
    }

    e.target.value = "";
    try {
      const res = await api.uploadFile(file);
      onSend({ url: res.url, type: res.type, ...res });
    } catch (err: any) {
      toastLib.showToast("Upload failed", "error");
    }
  }

  return (
    <div className="px-4 py-4 border-t border-slate-800 bg-slate-950/90">
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-400 hover:text-indigo-400 transition hover:bg-indigo-500/10 rounded-xl"
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex-1 input-wrap flex items-center shadow-inner group-focus-within:border-indigo-500/50 transition-all">
          <input
            className="bg-transparent flex-1 text-sm outline-none placeholder:text-slate-500 h-10"
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

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={onCancelEdit}
              className="flex items-center justify-center p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              title="Cancel editing"
            >
              <X size={20} />
            </button>
          )}
          <button
            onClick={() => onSend()}
            className={`
              flex items-center justify-center gap-2 px-5 h-10 rounded-xl font-bold transition shadow-lg active:scale-95
              ${isEditing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                : 'btn-primary shadow-indigo-900/20'
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
            `}
            disabled={disabled || !value.trim()}
          >
            {isEditing ? (
              <>
                <Edit2 size={16} />
                <span>Update</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}