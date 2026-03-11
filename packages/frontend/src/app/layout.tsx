import type { Metadata } from "next";
import FontProvider from "@/app/components/font-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Otaniemipeli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FontProvider>
      <div className="flex flex-col h-screen overflow-hidden">{children}</div>
      <Toaster />
    </FontProvider>
  );
}
