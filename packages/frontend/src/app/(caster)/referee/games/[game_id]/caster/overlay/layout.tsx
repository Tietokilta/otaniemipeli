import type { Metadata } from "next";
import "../../../../../../globals.css";
import "./caster.css";

export const metadata: Metadata = {
  title: "Otaniemipeli: Caster",
};

export default function CasterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style>{`body { background: transparent !important; }`}</style>
      {children}
    </>
  );
}
