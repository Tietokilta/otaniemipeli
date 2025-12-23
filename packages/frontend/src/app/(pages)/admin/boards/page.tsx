import BoardsList from "@/app/components/board-components/boards-list";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-3.5 max-h-[90dvh] sm:px-10 sm:py-4 font-[family-name:var(--font-geist-sans)]">
      <BoardsList />
    </div>
  );
}
