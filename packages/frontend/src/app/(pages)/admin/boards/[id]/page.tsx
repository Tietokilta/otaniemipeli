import BoardCard from "@/app/components/board-components/board-card";
import { getBoard } from "@/utils/fetchers";
import BoardPlacesList from "@/app/components/board-components/board-places-list";
import AddPlaceForm from "@/app/components/board-components/add-place-form";
import PlacesList from "@/app/components/board-components/places-list";
import AddPlaceToBoard from "@/app/components/board-components/add-place-to-board";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board: Board = await getBoard(id);
  return (
    <div className="flex flex-col h-[85vh] w-full px-2">
      <div className="flex justify-center items-center shrink-0 pb-2">
        <BoardCard board={board} active={false} />
      </div>
      <div className="flex min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0">
          <AddPlaceToBoard className="w-full" boardId={board.id} />
        </div>
        <div className="flex-2 min-h-0 overflow-auto">
          <BoardPlacesList className="w-full" boardId={board.id} />
        </div>
        <div className="flex flex-col flex-2 gap-2 min-h-0 overflow-hidden">
          <AddPlaceForm className="w-full box flex-3" />
          <PlacesList className="w-full flex-4 min-h-0 overflow-auto" />
        </div>
      </div>
    </div>
  );
}
