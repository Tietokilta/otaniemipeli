import AddPlaceForm from "@/app/components/board-components/add-place-form";
import AddPlaceToBoard from "@/app/components/board-components/add-place-to-board";
import BoardPlacesList from "@/app/components/board-components/board-places-list";
import PlacesList from "@/app/components/board-components/places-list";
import { getBoard } from "@/utils/fetchers";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board: Board = await getBoard(id);
  return (
    <div className="flex flex-col h-full">
      <h1 className="pb-0">{board.name}</h1>
      <div className="flex gap-4 min-h-0">
        <div className="flex flex-col flex-2 gap-2 min-h-0 overflow-hidden">
          <AddPlaceForm className="w-full box" />
          <PlacesList className="w-full flex-1 min-h-0 overflow-auto" />
        </div>
        <div className="flex-1 min-h-0">
          <AddPlaceToBoard className="w-full" boardId={board.id} />
        </div>
        <div className="flex-2 min-h-0 overflow-auto">
          <BoardPlacesList className="w-full" boardId={board.id} />
        </div>
      </div>
    </div>
  );
}
