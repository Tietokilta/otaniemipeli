import Image from "next/image";
import petri from "../../../public/petrified.png";

export default function Petrified({ className }: { className?: string }) {
  return <Image src={petri} alt="😱" className={className} />;
}
