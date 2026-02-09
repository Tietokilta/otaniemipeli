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
      <div className="flex gap-4 min-w-0 min-h-0">
        <div className="flex flex-col flex-2 gap-2 min-h-0 min-w-0">
          <AddPlaceForm className="box" />
          <PlacesList className="flex-1 min-h-0" />
        </div>
        <div className="flex-1 min-h-0">
          <AddPlaceToBoard boardId={board.id} />
        </div>
        <BoardPlacesList
          className="flex-2 min-w-0 min-h-0"
          boardId={board.id}
        />
      </div>
    </div>
  );
}
