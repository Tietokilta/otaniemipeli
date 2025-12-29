import React from "react";
import PlaceCard from "@/app/components/board-components/place-card";

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
      <div className="center p-4">
        <h1 className="text-2xl font-bold text-alert-500">
          Error fetching places!
        </h1>
        <p className="text-sm text-tertiary-900">{res.status}</p>
      </div>
    );
  }
  const places: Places = await res.json();
  return (
    <div className={`${className} overflow-y-scroll`}>
      <ul className="flex flex-col gap-2 px-4 py-2">
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
                  connections: [],
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
    </div>
  );
}
