import type { Metadata } from "next";
import "../../globals.css";
import GeneralHeader from "@/app/components/headers/general-header";

export const metadata: Metadata = {
  title: "Otaniemipeli: Sihteeri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GeneralHeader base_path="/secretary" />
      <div className="p-2 h-[90dvh] min-h-0">{children}</div>
    </>
  );
}
