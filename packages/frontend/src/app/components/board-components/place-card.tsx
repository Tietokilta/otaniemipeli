import React from "react";
import { getPlaceColor } from "@/utils/colors";
import { PlaceDrinkCard } from "@/app/components/drink-components/drink-card";

export default function PlaceCard({
  place,
  className,
  showInfo,
}: {
  place: BoardPlace | undefined;
  className?: string;
  showInfo?: boolean;
}): JSX.Element {
  if (!place) {
    return <div className="text-alert-500">Place not found</div>;
  }
  return (
    <div
      className={`${className} flex flex-col w-full`}
      style={
        {
          "--place-color": getPlaceColor(place.place.place_type, false),
          "--place-color-hover": getPlaceColor(place.place.place_type, true),
        } as React.CSSProperties
      }
    >
      <div className="flex flex-col gap-1 border-[var(--place-color)] border-4 rounded-lg bg-juvu-sini-400 p-2">
        <div className="flex gap-1 center w-full">
          {/* <p className="text-left ml-auto">{place.place.place_id}</p> */}
          <p className="font-redaction-b-70 text-2xl text-center w-full">
            {place.place.place_name}
          </p>
          <p className="text-right mr-auto">#{place.place_number}</p>
        </div>
        {showInfo && (
          <div className="flex gap-1 w-full h-full">
            <div className="w-full flex-3 center p-2 border-r-1 border-primary-900">
              <p className="text-justify text-xl pr-1">{place.place.rule}</p>
            </div>
            <div className="flex flex-col gap-1 p-2 flex-2">
              {place.drinks.drinks.length > 0 &&
                place.drinks.drinks.map((drink) => (
                  <PlaceDrinkCard drink={drink} key={drink.drink.id} />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
