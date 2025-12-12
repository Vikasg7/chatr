"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import * as api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const { user, setUser } = useAuthStore();

  const steps = [
    {
      title: "Join or create a room",
      desc: "Use the Rooms sidebar to create a room or join an existing one. Rooms are great for group conversations.",
    },
    {
      title: "Send messages",
      desc: "Type in the input bar to send messages. Messages sync instantly for everyone in the room.",
    },
    {
      title: "Direct messages",
      desc: "Start private conversations using Direct Messages. Click + under Direct Messages to begin.",
    },
    {
      title: "Profile & avatar",
      desc: "Upload an avatar from the profile or keep the auto-generated placeholder — avatars appear next to your messages.",
    },
  ];

  useEffect(() => {
    // Server-only persistence: show onboarding only for authenticated users
    if (user) {
      if (!user.onboardingSeen) setVisible(true);
    } else {
      // If no user, do not show onboarding (no localStorage fallback anymore)
      setVisible(false);
    }
  }, [user]);

  async function close(andPersist = true) {
    if (!andPersist) {
      setVisible(false);
      return;
    }

    // Persist flag server-side for authenticated users
    if (user) {
      try {
        await api.post("/auth/onboarding", { seen: true });
        setUser({ ...user, onboardingSeen: true });
      } catch (e) {
        console.error("Failed to persist onboarding flag", e);
      }
    }

    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => close(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

          <motion.div
            className="relative z-10 w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-100">{steps[step].title}</h3>
                <p className="mt-2 text-sm text-slate-300">{steps[step].desc}</p>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex gap-2">
                    {steps.map((_, i) => (
                      <div key={i} className={`h-2 w-8 rounded-full ${i === step ? 'bg-indigo-500' : 'bg-slate-700'}`} />
                    ))}
                  </div>

                  <div className="ml-auto text-xs text-slate-400">Step {step + 1} of {steps.length}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button onClick={() => close(true)} className="text-xs text-slate-400 hover:text-slate-200">Don't show again</button>
                <button onClick={() => close(false)} className="text-xs text-slate-400 hover:text-slate-200">Close</button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <button
                  disabled={step === 0}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="rounded-md px-3 py-2 bg-slate-800/60 text-sm text-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                  className="rounded-md px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm text-white"
                >
                  {step === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
