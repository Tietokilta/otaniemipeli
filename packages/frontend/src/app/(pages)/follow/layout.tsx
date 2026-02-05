import type { Metadata } from "next";
import "../../globals.css";
import FollowHeader from "@/app/components/headers/follow-header";
import FontProvider from "@/app/components/font-provider";

export const metadata: Metadata = {
  title: "Otaniemipeli: Katsoja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FontProvider>
      <FollowHeader />
      <div className="p-2 h-[90dvh] min-h-0">{children}</div>
    </FontProvider>
  );
}
