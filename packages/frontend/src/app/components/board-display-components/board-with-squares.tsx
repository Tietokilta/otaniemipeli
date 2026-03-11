import Image from "next/image";
import LineLayer from "@/app/components/board-display-components/line-layer";
import SquareLayer from "@/app/components/board-display-components/square-layer";
import React from "react";
import { usePathname } from "next/navigation";

export default function BoardWithSquares({
  places,
  focusedPlace,
  setFocusedPlace,
  toggleGraphics = false,
  className,
}: {
  places: BoardPlaces;
  focusedPlace: BoardPlace;
  setFocusedPlace: React.Dispatch<React.SetStateAction<BoardPlace>>;
  toggleGraphics?: boolean;
  className?: string;
}): JSX.Element {
  const [photo, setPhoto] = React.useState<boolean>(true);
  const [showLines, setShowLines] = React.useState<boolean>(true);
  const path = usePathname();
  const isAdmin = path.includes("admin");
  const selectBoardImage = () => {
    switch (places.board.id) {
      case 1:
        return photo ? "/1-photo.png" : "/1-graphic.png";
      case 2:
        return "/2-photo.png";
      case 3:
        return "/3-photo.png";
      default:
        return "/1-photo.png";
    }
  };
  return (
    <div
      className={`${className} flex flex-col relative w-full overflow-hidden mx-auto`}
    >
      <Image
        src={selectBoardImage()}
        alt="Game Board"
        className="w-full h-auto"
        priority
      />
      <div className="absolute top-0 left-0 w-full h-full">
        {toggleGraphics && (
          <div className="flex flex-col gap-1 absolute top-1 right-2 w-28">
            <div
              className="flex flex-col items-center gap-3.5 w-full button"
              onClick={() => setPhoto(!photo)}
            >
              <p className="select-none text-sm font-bold">
                {photo ? "Kuva" : "Grafiikka"}
              </p>
            </div>
            <div
              className="flex flex-col items-center gap-3.5 w-full button"
              onClick={() => setShowLines(!showLines)}
            >
              <p className="select-none text-sm font-bold">
                {showLines ? "Ruudut" : "Ei ruutuja"}
              </p>
            </div>
          </div>
        )}
        {places && showLines && !photo && <LineLayer places={places} />}
        {places && showLines && (
          <SquareLayer
            placesIn={places}
            focusedPlace={focusedPlace}
            setFocusedPlace={setFocusedPlace}
            photo={photo}
            functional={isAdmin}
          />
        )}
      </div>
    </div>
  );
}
