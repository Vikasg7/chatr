import type { Metadata } from "next";
import "./globals.css";
import Toaster from "@/app/components/Toaster";

export const metadata: Metadata = {
  title: "Chatr",
  description: "A simple chat application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chatr",
  },
};

export const viewport = {
  themeColor: "#020617",
};

import { ThemeProvider } from "@/app/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
