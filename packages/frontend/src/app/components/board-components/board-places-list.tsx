"use client";
import { useEffect, useState } from "react";
import PlaceCard from "@/app/components/board-components/place-card";
import ErrorDisplay from "@/app/components/error-display";
import { getBoardPlaces } from "@/utils/fetchers";

export default function BoardPlacesList({
  boardId,
  className,
}: {
  boardId?: number;
  className?: string;
}) {
  const [boardPlaces, setBoardPlaces] = useState<BoardPlaces | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (boardId == null) return;
    getBoardPlaces(boardId)
      .then(setBoardPlaces)
      .catch((err) => setError(String(err)));
  }, [boardId]);

  if (error) {
    return (
      <ErrorDisplay
        message="Error fetching board places!"
        status={error}
        className={className}
      />
    );
  }

  if (!boardPlaces) return null;

  return (
    <ul
      className={`${className} flex flex-col gap-2 overflow-y-auto px-2 py-2`}
    >
      {boardPlaces.places
        .sort((i, b) => {
          return b.place_number - i.place_number;
        })
        .map((boardPlace: BoardPlace) => (
          <li key={boardPlace.place_number}>
            <PlaceCard place={boardPlace} />
          </li>
        ))}
    </ul>
  );
}
