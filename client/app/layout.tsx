import type { Metadata } from "next";
import "./globals.css";
import Toaster from "@/app/components/Toaster";

export const metadata: Metadata = {
  title: "Chatr",
  description: "A simple chat application",
  manifest: "/manifest.json",
  themeColor: "#020617",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chatr",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={"bg-slate-950 text-slate-100"} >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
