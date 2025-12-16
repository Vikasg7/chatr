"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "./Avatar";

interface CallInterfaceProps {
    callState: "idle" | "incoming" | "calling" | "connected";
    caller?: { id: number; name: string }; // Who is calling me
    target?: { id: number; name: string }; // Who I am calling
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onAccept: () => void;
    onReject: () => void;
    onEnd: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
    toggleMute: () => void;
    toggleVideo: () => void;
}

export function CallInterface({
    callState,
    caller,
    target,
    localStream,
    remoteStream,
    onAccept,
    onReject,
    onEnd,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
}: CallInterfaceProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callState]);

    if (callState === "idle") return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col h-[80vh] md:h-auto md:aspect-video">

                    {/* Main Content Area */}
                    <div className="flex-1 relative bg-black">

                        {/* Remote Video (or Placeholder) */}
                        {callState === "connected" && remoteStream ? (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center flex-col gap-4">
                                <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center animate-pulse">
                                    <Avatar name={caller?.name || target?.name || "?"} size={64} />
                                </div>
                                <div className="text-xl font-medium text-slate-200">
                                    {callState === "incoming" ? `${caller?.name} is calling...` :
                                        callState === "calling" ? `Calling ${target?.name}...` :
                                            "Connecting..."}
                                </div>
                            </div>
                        )}

                        {/* Local Video (PiP) */}
                        {callState === "connected" && localStream && (
                            <div className="absolute top-4 right-4 w-32 md:w-48 aspect-video bg-slate-800 rounded-lg overflow-hidden shadow-lg border border-slate-700">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted // Always mute local video to prevent feedback
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Incoming Call Overlay Controls */}
                        {callState === "incoming" && (
                            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-8">
                                <button
                                    onClick={onReject}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition transform group-hover:scale-110">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </div>
                                    <span className="text-xs font-medium text-red-400">Decline</span>
                                </button>

                                <button
                                    onClick={onAccept}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition transform group-hover:scale-110 animate-bounce">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    </div>
                                    <span className="text-xs font-medium text-green-400">Accept</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Controls Bar for Active/Calling State */}
                    {callState !== "incoming" && (
                        <div className="h-20 bg-slate-950 flex items-center justify-center gap-6">
                            <button
                                onClick={toggleMute}
                                className={`p-3 rounded-full transition ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                            >
                                {isMuted ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                )}
                            </button>

                            <button
                                onClick={onEnd}
                                className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transform rotate-135"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </button>

                            <button
                                onClick={toggleVideo}
                                className={`p-3 rounded-full transition ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                            >
                                {isVideoOff ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                )}
                            </button>
                        </div>
                    )}

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
