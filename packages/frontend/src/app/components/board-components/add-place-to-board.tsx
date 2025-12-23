"use client";
import { useEffect, useState } from "react";
import { getPlacesNotInBoard, postBoardPlace } from "@/utils/fetchers";
import { useRouter } from "next/navigation";

// Mocked data (replace with real fetch if needed)

export default function AddPlaceToBoard({
  boardId,
  className,
}: {
  boardId: number;
  className?: string;
}): JSX.Element {
  const [places, setPlaces] = useState<Places>({ places: [] });
  const [boardPlaces, setBoardPlaces] = useState<BoardPlaces>({
    board: { id: boardId, name: "" },
    places: [],
  });
  const [selectedPlace, setSelectedPlace] = useState<Place>();
  const [placeNumber, setPlaceNumber] = useState<number>(0);
  const [start, setStart] = useState<boolean>(false);
  const [end, setEnd] = useState<boolean>(false);
  const x = 0;
  const y = 0;
  const [submitted, setSubmitted] = useState<boolean>(false);
  const router = useRouter();
  useEffect(() => {
    getPlacesNotInBoard(boardId)
      .then((data: { p: Places; bp: BoardPlaces }) => {
        setPlaces(data.p);
        setBoardPlaces(data.bp);
        if (data.p.places.length > 0) {
          setSelectedPlace(data.p.places[0]);
        }
      })
      .catch((err) => console.error("Error fetching places:", err));
  }, [submitted, boardId]);
  const [value, setValue] = useState<"" | number>("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);

    if (isNaN(num)) {
      setValue("");
      setError(null);
      return;
    }

    if (boardPlaces.places.map((place) => place.place_number).includes(num)) {
      setError(`Number ${num} is not allowed`);
      setValue(num);
    } else {
      setError(null);
      setValue(num);
      setPlaceNumber(num);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlace === undefined) {
      console.error("No place selected");
      return;
    }
    const boardPlace: BoardPlace = {
      board_id: boardId,
      place: selectedPlace,
      place_number: placeNumber,
      start,
      end,
      x,
      y,
      connections: [],
      drinks: { drinks: [] },
    };
    setSubmitted(!submitted);
    if (value === "") {
      setError("Paikka numero on pakollinen");
    } else {
      setValue(value + 1);
    }
    setPlaceNumber(placeNumber + 1);
    try {
      await postBoardPlace(
        boardPlace,
        localStorage.getItem("auth_token") ?? "",
      );
    } catch (err) {
      console.error("Post error:", err);
    }
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${className} flex flex-col gap-4 box`}
    >
      <h2 className="text-lg font-semibold">Lisää paikka laudalle</h2>

      <label>Paikka:</label>

      <select
        defaultValue={2}
        onChange={(e) => {
          const id = Number(e.target.value);
          const found = places.places.find((p) => p.place_id === id);
          if (found) setSelectedPlace(found);
        }}
        className="border rounded p-2"
      >
        {places.places
          .sort((a, b) => a.place_name.localeCompare(b.place_name))
          .map((place) => (
            <option key={place.place_id} value={place.place_id}>
              {place.place_name}
            </option>
          ))}
      </select>

      <input
        type="number"
        value={value}
        onChange={handleChange}
        className="border rounded p-2"
        placeholder="Paikka numero"
      />
      {error && <span className="text-red-500 text-sm">{error}</span>}

      <div className="flex gap-2">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={start}
            className="!focus:bg-juvu-sini-800"
            onChange={() => (!end ? setStart(!start) : {})}
          />
          Start
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={end}
            onChange={() => (!start ? setEnd(!end) : {})}
          />
          End
        </label>
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
      >
        Lisää
      </button>
    </form>
  );
}
