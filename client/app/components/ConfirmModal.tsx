"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "info" | "warning";
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger"
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const typeConfig = {
        danger: {
            icon: <AlertCircle className="text-rose-400" size={24} />,
            btn: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20",
            bg: "bg-rose-500/5",
            border: "border-rose-500/20"
        },
        warning: {
            icon: <AlertCircle className="text-amber-400" size={24} />,
            btn: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20",
            bg: "bg-amber-500/5",
            border: "border-amber-500/20"
        },
        info: {
            icon: <AlertCircle className="text-indigo-400" size={24} />,
            btn: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20",
            bg: "bg-indigo-500/5",
            border: "border-indigo-500/20"
        }
    };

    const config = typeConfig[type];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-token-2 bg-black/40">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-sm bg-[var(--color-elevated)] border border-[var(--border-subtle)] rounded-token-3xl shadow-2xl overflow-hidden"
                >
                    <div className={`p-token-6 ${config.bg} flex flex-col items-center text-center border-b ${config.border}`} style={{ padding: 'var(--space-3)' }}>
                        <div className="p-token-3 bg-[var(--color-card)] rounded-token-2xl shadow-inner group transition-transform hover:scale-110" style={{ marginBottom: 'var(--space-2)' }}>
                            {config.icon}
                        </div>
                        <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">{title}</h2>
                    </div>

                    <div className="p-token-6" style={{ padding: 'var(--space-3)' }}>
                        <p className="text-sm text-[var(--text-muted)] text-center leading-relaxed font-medium">
                            {message}
                        </p>
                    </div>

                    <div className="p-token-2 bg-[var(--color-card)]/50 flex gap-token-3">
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-token-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/50 font-bold text-xs uppercase tracking-widest transition-all"
                            style={{ paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)', paddingTop: 'calc(var(--space-1) * 1.25)', paddingBottom: 'calc(var(--space-1) * 1.25)' }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 rounded-token-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${config.btn}`}
                            style={{ paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)', paddingTop: 'calc(var(--space-1) * 1.25)', paddingBottom: 'calc(var(--space-1) * 1.25)' }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
