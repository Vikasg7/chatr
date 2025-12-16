"use client";

import Image from "next/image";
import React from "react";

type AvatarProps = {
  name?: string | null;
  email?: string;
  src?: string | null;
  size?: number; // px dimension
  className?: string;
  alt?: string;
};

function hashToHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 360;
}

function initials(name?: string | null, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export function Avatar({ name, email, src, size = 40, className = "", alt }: AvatarProps) {
  const fallback = initials(name, email);
  const seed = (name || email || "anon").toString();
  const hue = hashToHue(seed);
  const bg = `linear-gradient(135deg, hsl(${hue}deg 65% 40%), hsl(${(hue + 40) % 360}deg 65% 48%))`;

  const style: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: size / 4,
    background: src ? undefined : bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.max(12, Math.floor(size / 3.2)),
    fontWeight: 600,
    color: "white",
    overflow: "hidden",
  };

  // Map common sizes to token classes for consistent radii and layout
  const sizeClass = size === 28 ? "avatar-sm" : size === 36 ? "avatar-md" : "";

  return (
    <div className={`avatar ${sizeClass} ${className}`} style={style} aria-label={alt || name || email}>
      {src ? (
        // Next Image is preferred in Next.js; fallback to normal img if you prefer
        // make sure external domains are allowed in next.config.js if using external urls
        <Image src={src} alt={alt || name || email || "avatar"} width={size} height={size} style={{ objectFit: "cover" }} />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}
