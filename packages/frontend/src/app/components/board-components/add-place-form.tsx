"use client";

import { useState } from "react";
import { createPlace } from "@/utils/fetchers";
import { getPlaceColor } from "@/utils/colors";
import { useRouter } from "next/navigation";

export default function AddPlaceForm({
  className,
}: {
  className?: string;
}): JSX.Element {
  const defaultPlace: Place = {
    place_id: -1,
    place_name: "",
    rule: "",
    place_type: "Normal",
  };
  const router = useRouter();

  const [place, updatePlace] = useState<Place>(defaultPlace);
  const [selected, setSelected] = useState<PlaceType>("Normal");
  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    createPlace(place);
    updatePlace(defaultPlace);
    setSelected("Normal");
    e.currentTarget.reset(); // Reset the form fields

    router.refresh();
  };

  return (
    <form
      className={`${className} flex flex-col center gap-2`}
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-bold">Luo paikka</h2>
      <input
        type="text"
        value={place.place_name}
        placeholder="Paikan nimi"
        className="border border-primary-500 rounded-lg p-2 w-full"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          updatePlace({
            ...place,
            place_name: e.target.value,
          });
        }}
      />
      <div
        style={
          {
            "--place-color": getPlaceColor(place.place_type, false),
            "--place-color-selected": getPlaceColor(place.place_type, true),
          } as React.CSSProperties
        }
      >
        <label htmlFor="placeType">Paikan tyyppi:</label>
        <select
          id="placeType"
          value={selected}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const newType = e.target.value as PlaceType;
            setSelected(newType);
            updatePlace({
              ...place,
              place_type: newType,
            });
          }}
          className={`
    rounded-2xl
    border-4
    px-5 py-4
    w-full
    border-[var(--place-color)]
    focus:outline-none
    focus:border-[var(--place-color-selected)]
  `}
        >
          {(["Normal", "Food", "Sauna", "Special", "Guild"] as PlaceType[]).map(
            (type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ),
          )}
        </select>
      </div>
      <textarea
        value={place.rule}
        placeholder="Sääntö..."
        className="border border-primary-500 rounded-lg p-2 w-full"
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          updatePlace({
            ...place,
            rule: e.target.value,
          });
        }}
      />
      <button type="submit" className="button text-lg">
        Luo paikka
      </button>
    </form>
  );
}
