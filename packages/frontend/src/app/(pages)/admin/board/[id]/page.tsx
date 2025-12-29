"use client";
import React, { useEffect, useState } from "react";
import AddDrinkToPlace from "@/app/components/board-display-components/add-drink-to-place";
import PlaceCard from "@/app/components/board-components/place-card";
import BoardWithSquares from "@/app/components/board-display-components/board-with-squares";
import { getBoardPlaces } from "@/utils/fetchers";

export default function BoardOverlay({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = React.use(params);
  const [focusedPlace, setFocusedPlace] = useState<BoardPlace>({
    place_number: -1,
    x: 0,
    y: 0,
    start: false,
    area: "normal",
    end: false,
    board_id: 1,
    place: {
      place_id: 0,
      place_name: "No selected place",
      rule: "",
      place_type: "Normal",
    },
    connections: [],
    drinks: {
      drinks: [],
    },
  });
  const [places, setPlaces] = useState<BoardPlaces | undefined>();

  useEffect(() => {
    getBoardPlaces(id)
      .then((data: BoardPlaces) => {
        setPlaces(data);
        if (data.places.length > 0) {
          setFocusedPlace(data.places[0]);
        }
      })
      .catch((error) => {
        console.error("Error fetching board places:", error);
      });
  }, [id]);

  return (
    <div className="flex gap-2 w-full h-[86vh] h-max-[86vh] justify-center">
      {places && (
        <div className="w-7/9 mr-auto">
          <BoardWithSquares
            places={places}
            focusedPlace={focusedPlace}
            setFocusedPlace={setFocusedPlace}
          />
        </div>
      )}
      <div className="flex flex-col gap-2 w-1/3 h-full">
        <div className="mb-auto h-full">
          <AddDrinkToPlace place={focusedPlace} />
        </div>
        <div className="h-full">
          <PlaceCard place={focusedPlace} />
        </div>
      </div>
    </div>
  );
}
