"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth";

export default function AuthLoader({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);

  // show a small fallback while the store rehydrates
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}