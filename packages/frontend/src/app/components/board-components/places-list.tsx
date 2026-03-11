"use client";
import { useEffect, useState } from "react";
import PlaceCard from "@/app/components/board-components/place-card";
import ErrorDisplay from "@/app/components/error-display";
import { getPlaces } from "@/utils/fetchers";

export default function PlacesList({ className }: { className?: string }) {
  const [places, setPlaces] = useState<Places | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlaces()
      .then(setPlaces)
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return <ErrorDisplay message="Error fetching places!" status={error} />;
  }

  if (!places) return null;

  return (
    <ul
      className={`${className} flex flex-col gap-2 px-2 py-2 overflow-y-auto`}
    >
      {places.places.map((place: Place) => (
        <li key={place.place_id}>
          <PlaceCard
            place={{
              board_id: -1,
              place,
              place_number: -1,
              drinks: {
                drinks: [],
              },
              connections: { forwards: [], backwards: [] },
              start: false,
              area: "normal",
              end: false,
              x: -100,
              y: -100,
            }}
          />
        </li>
      ))}
    </ul>
  );
}
