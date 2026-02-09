import React from "react";
import PlaceCard from "@/app/components/board-components/place-card";
import ErrorDisplay from "@/app/components/error-display";

export default async function PlacesList({
  className,
}: {
  className?: string;
}): Promise<JSX.Element> {
  const res = await fetch(`${process.env.API_URL}/boards/places`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    return (
      <ErrorDisplay message="Error fetching places!" status={res.status} />
    );
  }
  const places: Places = await res.json();
  return (
    <ul
      className={`${className} flex flex-col gap-2 px-2 py-2 overflow-y-auto`}
    >
      {places ? (
        places.places.map((place: Place) => (
          <li key={place.place_id}>
            <PlaceCard
              place={{
                board_id: -1,
                place,
                place_number: -1,
                drinks: {
                  drinks: [],
                },
                connections: { connections: [] },
                start: false,
                area: "normal",
                end: false,
                x: -100,
                y: -100,
              }}
            />
          </li>
        ))
      ) : (
        <p>No places!</p>
      )}
    </ul>
  );
}
