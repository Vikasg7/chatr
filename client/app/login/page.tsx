"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect legacy /login to the new landing page that contains the auth form
    router.replace("/");
  }, [router]);

  return null;
}
