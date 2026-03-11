"use client";
import AddBoardForm from "@/app/components/board-components/add-board-form";
import BoardCard from "@/app/components/board-components/board-card";
import ItemList from "@/app/components/item-list";
import { getBoards } from "@/utils/fetchers";
import { toastError } from "@/utils/toast-error";
import { useCallback, useEffect, useState } from "react";

export default function BoardList({
  className,
}: {
  className?: string;
}): JSX.Element {
  const [boards, setBoards] = useState<Board[]>([]);
  const fetchBoards = useCallback(() => {
    getBoards()
      .then((data) => setBoards(data.boards))
      .catch(toastError);
  }, []);

  useEffect(() => {
    void fetchBoards();
  }, [fetchBoards]);

  return (
    <ItemList
      title="Laudat"
      addDialog={<AddBoardForm refreshAction={fetchBoards} />}
      className={className}
    >
      {boards.length > 0 ? (
        boards.map((board) => (
          <li key={board.id}>
            <BoardCard key={board.id} board={board} className="w-full" />
          </li>
        ))
      ) : (
        <p className="text-center text-juvu-tumma">Ei lautoja</p>
      )}
    </ItemList>
  );
}
