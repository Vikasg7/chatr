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

  if (!open)
    return null;

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
        className="card w-80"
      >
        <h2 className="text-h6 mb-4">Create Room</h2>

        <input
          className="w-full input placeholder:text-slate-500"
          placeholder="Room name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="btn-ghost"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="btn-primary"
          >
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
