import Image from "next/image";

export default function Petrified({ className }: { className?: string }) {
  return <Image src="/petrified.png" alt="😱" className={className} />;
}
