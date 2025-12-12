"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect legacy /signup to the landing page which contains the auth form
    router.replace("/");
  }, [router]);

  return null;
}