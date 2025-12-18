"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CallOverlayProps {
    status: 'IDLE' | 'RINGING_OUT' | 'RINGING_IN' | 'ACTIVE';
    callerName?: string;
    onAnswer: () => void;
    onReject: () => void;
    onCancel: () => void;
    onEnd: (duration: string) => void;
}

export function CallOverlay({ status, callerName, onAnswer, onReject, onCancel, onEnd }: CallOverlayProps) {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'ACTIVE') {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [status]);

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (status === 'IDLE') return null;

    return (
        <AnimatePresence>
            <div className="absolute inset-0 z-[200] flex items-center justify-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative z-[201] w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-6 pointer-events-auto"
                >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                    </div>

                    <div className="text-center">
                        <h3 className="text-lg font-bold text-white truncate w-full">{callerName || 'Unknown User'}</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {status === 'RINGING_OUT' && 'Calling...'}
                            {status === 'RINGING_IN' && 'Incoming Audio Call'}
                            {status === 'ACTIVE' && formatDuration(duration)}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {status === 'RINGING_IN' ? (
                            <>
                                <button
                                    onClick={onReject}
                                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition shadow-lg group"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="group-hover:rotate-90 transition-transform">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                                <button
                                    onClick={onAnswer}
                                    className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition shadow-lg animate-bounce"
                                >
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    if (status === 'RINGING_OUT') onCancel();
                                    else onEnd(formatDuration(duration));
                                }}
                                className="px-8 py-3 rounded-full bg-red-500 hover:bg-red-400 text-white font-bold transition shadow-lg flex items-center gap-2"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 4.24 3.4"></path>
                                    <line x1="23" y1="1" x2="1" y2="23"></line>
                                </svg>
                                {status === 'ACTIVE' ? 'End Call' : 'Cancel'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
