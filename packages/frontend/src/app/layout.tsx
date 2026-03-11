import { Pixeloid, PixeloidBold, PixeloidMono } from "@/utils/get_fonts";
import type { Metadata } from "next";
import Script from "next/script";
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
    <html
      lang="fi"
      className={`${Pixeloid.variable} ${PixeloidBold.variable} ${PixeloidMono.variable}`}
    >
      <body>
        <Script src="/__env.js" strategy="beforeInteractive" />
        <div className="flex flex-col h-screen overflow-hidden">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
