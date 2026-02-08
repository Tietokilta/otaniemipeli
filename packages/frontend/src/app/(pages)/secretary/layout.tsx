import GeneralHeader from "@/app/components/headers/general-header";
import type { Metadata } from "next";
import "../../globals.css";

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
      <div className="flex flex-col flex-1 min-h-0 p-4">{children}</div>
    </>
  );
}
