"use client";
import { usePathname, useRouter } from "next/navigation";
import SimpleCard from "@/app/components/simple-card";

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
    <SimpleCard
      className={className}
      active={active}
      onClick={() => router.push(`${path}/${board.id}`)}
    >
      {board.name}
    </SimpleCard>
  );
}
