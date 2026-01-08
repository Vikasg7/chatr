"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const cycleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <button
            onClick={cycleTheme}
            className="p-token-1 rounded-token-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--border-subtle)] transition-all flex items-center justify-center border border-transparent hover:border-[var(--border-subtle)]/50"
            title={`Current theme: ${theme}. Click to change.`}
        >
            <AnimatePresence mode="wait">
                {theme === "dark" ? (
                    <motion.div
                        key="dark"
                        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Moon size={20} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="light"
                        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Sun size={20} />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
}
