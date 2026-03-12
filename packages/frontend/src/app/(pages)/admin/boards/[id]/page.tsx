"use client";

import AddPlaceForm from "@/app/components/board-components/add-place-form";
import AddPlaceToBoard from "@/app/components/board-components/add-place-to-board";
import BoardPlacesList from "@/app/components/board-components/board-places-list";
import PlacesList from "@/app/components/board-components/places-list";
import { getBoard } from "@/utils/fetchers";
import { toastError } from "@/utils/toast-error";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Admin page for managing a single board's places and connections. */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    getBoard(id).then(setBoard).catch(toastError);
  }, [id]);

  if (!board) return null;

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
