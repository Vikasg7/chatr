"use client";
import { useRef, useState, useEffect } from "react";
import { Paperclip, Send, Check, UserPlus, X, Edit2, Loader2, FileIcon, ImageIcon, Music, Video as VideoIcon } from "lucide-react";
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
  quotingMessage?: any;
  onCancelQuote?: () => void;
  friendshipStatus?: string;
  isSender?: boolean;
  onSendRequest?: () => void;
  onAcceptRequest?: () => void;
  externalFile?: File | null;
  onFileConsumed?: () => void;
}

export function MsgInput({
  value,
  onChange,
  onSend,
  onTyping,
  disabled,
  isEditing,
  onCancelEdit,
  quotingMessage,
  onCancelQuote,
  friendshipStatus,
  isSender,
  onSendRequest,
  onAcceptRequest,
  externalFile,
  onFileConsumed
}: MsgInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle external file from drag-and-drop
  useEffect(() => {
    if (externalFile) {
      if (externalFile.size > 10 * 1024 * 1024) {
        toastLib.showToast("File size must be less than 10MB", "error");
        onFileConsumed?.();
        return;
      }
      setStagedFile(externalFile);
      onFileConsumed?.();
    }
  }, [externalFile, onFileConsumed]);

  if (friendshipStatus !== "ACCEPTED") {
    return (
      <div className="px-token-2 border-t border-[var(--border-subtle)] bg-[var(--color-elevated)] text-center" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
        {friendshipStatus === "PENDING" ? (
          <div className="flex flex-col items-center">
            <p className="text-[var(--text-muted)] text-sm font-medium italic" style={{ marginBottom: 'var(--space-2)' }}>
              {isSender ? "Friend request sent. Waiting for response..." : "This user wants to connect!"}
            </p>
            {!isSender && (
              <button
                onClick={onAcceptRequest}
                className="flex items-center gap-token-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-token-lg font-bold transition shadow-lg shadow-emerald-900/20 active:scale-95"
                style={{ paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)', paddingTop: 'calc(var(--space-1) * 1.25)', paddingBottom: 'calc(var(--space-1) * 1.25)' }}
              >
                <Check size={18} />
                Accept Friend Request
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="text-[var(--text-muted)] text-sm font-medium italic" style={{ marginBottom: 'var(--space-2)' }}>You are not friends with this user yet.</p>
            <button
              onClick={onSendRequest}
              className="flex items-center gap-token-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-token-lg font-bold transition shadow-lg shadow-indigo-900/20 active:scale-95"
              style={{ paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)', paddingTop: 'calc(var(--space-1) * 1.25)', paddingBottom: 'calc(var(--space-1) * 1.25)' }}
            >
              <UserPlus size={18} />
              Send Friend Request
            </button>
          </div>
        )}
      </div>
    );
  }

  async function handleSend() {
    if (isUploading) return;
    if (!value.trim() && !stagedFile) return;

    let attachment = undefined;
    if (stagedFile) {
      setIsUploading(true);
      try {
        const res = await api.uploadFile(stagedFile);
        attachment = { url: res.url, type: res.type, ...res };
      } catch (err) {
        toastLib.showToast("Failed to upload attachment", "error");
        setIsUploading(false);
        return;
      }
    }

    onSend(attachment);
    setStagedFile(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toastLib.showToast("File size must be less than 10MB", "error");
      e.target.value = "";
      return;
    }
    setStagedFile(file);
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon size={18} />;
    if (type.startsWith('video/')) return <VideoIcon size={18} />;
    if (type.startsWith('audio/')) return <Music size={18} />;
    return <FileIcon size={18} />;
  };

  return (
    <div className="px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--color-elevated)] backdrop-blur-md transition-colors">
      {/* Quoted Message Preview */}
      {quotingMessage && (
        <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 p-2 bg-[var(--color-card)] border-l-4 border-indigo-500 rounded-lg relative group">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">
                Quoting {quotingMessage.sender?.name || quotingMessage.sender?.email?.split('@')[0]}
              </div>
              <div className="text-xs text-[var(--text-muted)] truncate italic">
                "{quotingMessage.text || (quotingMessage.attachmentUrl ? "Attachment" : "...")}"
              </div>
            </div>
            <button
              onClick={onCancelQuote}
              className="p-1 hover:bg-[var(--border-subtle)] rounded-full transition-colors"
            >
              <X size={14} className="text-[var(--text-muted)]" />
            </button>
          </div>
        </div>
      )}

      {/* Staged File Preview */}
      {stagedFile && (
        <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="inline-flex items-center gap-3 p-2 pr-3 bg-indigo-600/10 border border-indigo-500/30 rounded-xl relative group">
            <div className="w-10 h-10 flex items-center justify-center bg-indigo-600/20 text-indigo-400 rounded-lg">
              {getFileIcon(stagedFile.type)}
            </div>
            <div className="min-w-0 max-w-[200px]">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">{stagedFile.name}</div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{(stagedFile.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button
              onClick={() => {
                setStagedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 bg-[var(--color-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)] transition-all shadow-lg"
              title="Remove attachment"
            >
              <X size={12} />
            </button>
            {isUploading && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                <Loader2 size={16} className="text-indigo-400 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 transition rounded-xl ${stagedFile ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:text-indigo-400 hover:bg-[var(--border-subtle)]'}`}
          disabled={disabled || isUploading}
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

        <div className="flex-1 input-wrap flex items-center shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all group">
          <input
            className="bg-transparent flex-1 text-sm outline-none placeholder:text-slate-500 h-10"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              onTyping?.(true);
            }}
            onBlur={() => onTyping?.(false)}
            placeholder={stagedFile ? "Add a caption..." : "Type a message…"}
            onKeyDown={handleKeyDown}
            disabled={disabled || isUploading}
          />
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={onCancelEdit}
              className="flex items-center justify-center p-2 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
              title="Cancel editing"
            >
              <X size={20} />
            </button>
          )}
          <button
            onClick={handleSend}
            className={`
              flex items-center justify-center gap-2 px-3 sm:px-5 h-10 rounded-xl font-bold transition shadow-lg active:scale-95
              ${isEditing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                : 'btn-primary shadow-indigo-900/20'
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
            `}
            disabled={disabled || isUploading || (!value.trim() && !stagedFile)}
          >
            {isUploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isEditing ? (
              <>
                <Edit2 size={16} />
                <span className="hidden sm:inline">Update</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <Send size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}