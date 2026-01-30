"use client";
import React, { useEffect, useState, use } from "react";
import PlaceCard from "@/app/components/board-components/place-card";
import BoardWithSquares from "@/app/components/board-display-components/board-with-squares";
import { getBoardPlaces } from "@/utils/fetchers";
import DrinkList from "@/app/components/drink-components/drinks-list";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
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
    connections: { connections: [] },
    drinks: {
      drinks: [],
    },
  });
  const [places, setPlaces] = useState<BoardPlaces | undefined>();

  useEffect(() => {
    getBoardPlaces(Number(id))
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
    <div className="flex gap-1 w-full h-full justify-center">
      {places && (
        <div className="flex-2">
          <BoardWithSquares
            className="w-full"
            places={places}
            focusedPlace={focusedPlace}
            setFocusedPlace={setFocusedPlace}
          />
        </div>
      )}
      <div className="flex flex-col flex-1 gap-2 h-full">
        <DrinkList
          className="flex-1 w-full h-full"
          drinksList={focusedPlace.drinks.drinks}
        />
        <PlaceCard className="flex-1 w-full h-full" place={focusedPlace} />
      </div>
    </div>
  );
}
