import type { Metadata } from "next";
import "./globals.css";
import AuthLoader from "@/app/authloader";
import GlobalHeader from "@/app/components/GlobalHeader";

export const metadata: Metadata = {
  title: "Chatr",
  description: "A simple chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={"bg-slate-950 text-slate-100"} >
        <AuthLoader>
          <GlobalHeader />
          {children}
        </AuthLoader>
      </body>
    </html>
  );
}
