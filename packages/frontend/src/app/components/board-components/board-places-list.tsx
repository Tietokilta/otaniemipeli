import React from "react";
import PlaceCard from "@/app/components/board-components/place-card";

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
      <div className={`${className} center`}>
        <h1 className="text-2xl font-bold text-red-500">
          Error fetching ingredients!
        </h1>
        <p className="text-sm text-gray-900">{res.status}</p>
      </div>
    );
  }

  const boardPlaces: BoardPlaces = await res.json();
  return (
    <div className={`${className} max-h-screen`}>
      <ul className="grid gap-2 overflow-y-scroll px-4 py-2">
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
    </div>
  );
}
