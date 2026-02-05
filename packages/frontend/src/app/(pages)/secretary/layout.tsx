import type { Metadata } from "next";
import "../../globals.css";
import GeneralHeader from "@/app/components/headers/general-header";
import FontProvider from "@/app/components/font-provider";

export const metadata: Metadata = {
  title: "Otaniemipeli: Sihteeri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerItems: HeaderItem[] = [
    { text: "Pelit", href: "/games" },
    { text: "Laudat", href: "/boards" },
    { text: "Juomat", href: "/drinks" },
  ];
  return (
    <FontProvider>
      <GeneralHeader base_path="/secretary" items={headerItems} />
      <div className="p-2 h-[90dvh] min-h-0">{children}</div>
    </FontProvider>
  );
}
