"use client";
import { usePathname, useRouter } from "next/navigation";

export default function BoardCard({
  board,
  active = true,
  className,
}: {
  board: Board;
  active?: boolean;
  className?: string;
}): JSX.Element {
  const router = useRouter();
  const path = usePathname();
  return (
    <div
      className={`${className} ${active ? "button" : "box"} list-none center`}
      onClick={() => active && router.push(`${path}/${board.id}`)}
    >
      {board.name}
    </div>
  );
}
