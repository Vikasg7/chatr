"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface MediaViewerProps {
    mediaUrl: string | null;
    mediaType: "IMAGE" | "VIDEO" | null;
    onClose: () => void;
}

export function MediaViewer({ mediaUrl, mediaType, onClose }: MediaViewerProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (mediaUrl) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [mediaUrl, onClose]);

    return (
        <AnimatePresence>
            {mediaUrl && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm"
                    onClick={onClose}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute p-token-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10" style={{ top: 'var(--space-2)', right: 'var(--space-2)' }}
                        title="Close (ESC)"
                    >
                        <X size={24} />
                    </button>

                    {/* Media Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="max-w-[95vw] max-h-[95vh] relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {mediaType === "IMAGE" && (
                            <img
                                src={mediaUrl}
                                crossOrigin="anonymous"
                                alt="Fullscreen view"
                                className="max-w-full max-h-[95vh] object-contain rounded-token-md shadow-2xl"
                            />
                        )}

                        {mediaType === "VIDEO" && (
                            <video
                                src={`${mediaUrl}#t=0.001`}
                                crossOrigin="anonymous"
                                controls
                                autoPlay
                                playsInline
                                preload="auto"
                                className="max-w-full max-h-[95vh] rounded-token-md shadow-2xl bg-black"
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
