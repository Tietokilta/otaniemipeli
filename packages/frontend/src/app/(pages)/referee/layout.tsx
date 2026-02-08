import type { Metadata } from "next";
import "../../globals.css";
import GeneralHeader from "@/app/components/headers/general-header";

export const metadata: Metadata = {
  title: "Otaniemipeli: Tuomari",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GeneralHeader base_path="/referee" />
      <div className="flex flex-col flex-1 min-h-0 p-4">{children}</div>
    </>
  );
}
