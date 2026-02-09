import React from "react";
import PlaceCard from "@/app/components/board-components/place-card";
import ErrorDisplay from "@/app/components/error-display";

export default async function BoardPlacesList({
  boardId,
  className,
}: {
  boardId?: number;
  className?: string;
}) {
  const res = await fetch(process.env.API_URL + `/boards/places/${boardId}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    return (
      <ErrorDisplay
        message="Error fetching ingredients!"
        status={res.status}
        className={className}
      />
    );
  }

  const boardPlaces: BoardPlaces = await res.json();
  return (
    <ul
      className={`${className} flex flex-col gap-2 overflow-y-auto px-2 py-2`}
    >
      {boardPlaces ? (
        boardPlaces.places
          .sort((i, b) => {
            return b.place_number - i.place_number;
          })
          .map((boardPlace: BoardPlace) => (
            <li key={boardPlace.place_number}>
              <PlaceCard place={boardPlace} />
            </li>
          ))
      ) : (
        <p>No ingredients!</p>
      )}
    </ul>
  );
}
