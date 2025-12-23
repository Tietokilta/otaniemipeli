import { useEffect, useState } from "react";
import { useSocket } from "@/app/template";
import { getBoards } from "@/utils/fetchers";
import DropdownMenu from "@/app/components/dropdown-menu";

export default function CreateGameForm({ className }: { className?: string }) {
  const [name, setName] = useState<string>("");
  const [boards, setBoards] = useState<Boards>({ boards: [] });
  const [selectedBoard, setSelectedBoard] = useState<Board | undefined>(
    undefined,
  );
  const [active, setActive] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    getBoards().then((data) => setBoards(data));
  }, []);

  const handleSend = () => {
    if (socket) {
      if (name === "" && !selectedBoard) {
        setActive(false);
        return;
      } else if (name === "" || !selectedBoard) {
        alert("Please fill in all fields");
        return;
      }
      const game: PostGame = {
        name: name,
        board: selectedBoard.id,
      };
      socket.emit("create-game", game);
      setActive(false);
      setName("");
      setSelectedBoard(undefined);
    }
  };

  return (
    <div className={`${className} box`}>
      {!active ? (
        <div className="button w-full" onClick={() => setActive(true)}>
          <h1>Aloita uusi peli</h1>
        </div>
      ) : (
        <div>
          <h1>Aloita uusi peli</h1>
        </div>
      )}
      {active && (
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
            <p className="h-6 w-full font-bold center text-lg">
              {selectedBoard && selectedBoard.name}
            </p>
            <div className="button w-full text-lg" onClick={handleSend}>
              Create Game
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
