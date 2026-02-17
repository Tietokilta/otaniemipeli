import type { Metadata } from "next";
import "../../globals.css";
import GeneralHeader from "@/app/components/headers/general-header";

export const metadata: Metadata = {
  title: "Otaniemipeli: Admin",
};

const headerItems: HeaderItem[] = [
  { text: "Pelilauta", href: "/board" },
  { text: "Paikat", href: "/boards" },
  { text: "Juomat", href: "/drinks" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GeneralHeader base_path="/admin" items={headerItems} />
      <div className="flex flex-col flex-1 p-4 min-h-0">{children}</div>
    </>
  );
}
