import { useEffect, useState } from "react";
import { getBoards, createGame } from "@/utils/fetchers";
import DropdownMenu from "@/app/components/dropdown-menu";

export default function CreateGameForm({
  className,
  onCreate,
}: {
  className?: string;
  onCreate: () => void;
}) {
  const [name, setName] = useState<string>("");
  const [boards, setBoards] = useState<Boards>({ boards: [] });
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(
    undefined,
  );

  useEffect(() => {
    getBoards().then((data) => setBoards(data));
  }, []);

  const handleSend = async () => {
    if (name === "" && !selectedBoard) {
      return;
    } else if (name === "" || !selectedBoard) {
      alert("Please fill in all fields");
      return;
    }
    const game: PostGame = {
      name: name,
      board: selectedBoard.id,
    };
    await createGame(game);
    setName("");
    setSelectedBoard(undefined);
    onCreate();
  };

  return (
    <div className={`${className} box`}>
      <h1>Aloita uusi peli</h1>
      <div className="flex flex-col gap-3 w-full h-full">
        <form className="flex flex-col gap-3 w-full">
          <input
            className="w-full text-center text-lg"
            name="name"
            required
            placeholder="Name"
            onChange={(e) => setName(e.target.value)}
            type="text"
          />
          <DropdownMenu
            buttonText="Valitse lauta"
            options={boards.boards}
            selectedOption={selectedBoard}
            setSelectedOption={setSelectedBoard}
          />
          <button
            type="button"
            className="button w-full text-lg"
            onClick={handleSend}
            disabled={!name || !selectedBoard}
          >
            Create Game
          </button>
        </form>
      </div>
    </div>
  );
}
