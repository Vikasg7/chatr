"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateRoomModal({ open, onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState("");

  if (!open) return null;

  function submit() {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-80 shadow-xl"
      >
        <h2 className="text-lg font-semibold mb-4">Create Room</h2>

        <input
          className="w-full bg-slate-800 text-slate-200 p-2 rounded-lg border border-slate-700
                     placeholder:text-slate-500"
          placeholder="Room name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
          >
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
