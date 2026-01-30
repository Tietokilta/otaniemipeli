"use client";
import { useSocket } from "@/app/template";
import React, {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DropdownMenu from "@/app/components/dropdown-menu";
import PopUpDialogue from "../pop-up-dialogue";

export default function GameStartDialogue({
  game,
  className,
}: {
  game: Game;
  className?: string;
}) {
  const socket = useSocket();

  const [knownDrinks, setKnownDrinks] = useState<Drink[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<TurnDrink[]>([]);

  const [open, setOpen] = useState(false);
  const justOpened = useRef(true);

  const openModal = () => {
    setOpen(true);
    justOpened.current = true;
    requestAnimationFrame(() => {
      justOpened.current = false;
    });
  };

  useEffect(() => {
    if (!socket) return;
    const onReply = (payload: DrinksIngredients) => {
      const list = payload.drink_ingredients?.map((d) => d.drink) ?? [];
      const seen = new Set<number>();
      const uniq = list.filter((d) =>
        seen.has(d.id) ? false : (seen.add(d.id), true),
      );
      setKnownDrinks(uniq);
    };
    socket.on("reply-drinks", onReply);
    socket.emit("get-drinks");

    return () => {
      socket.off("reply-drinks", onReply);
    };
  }, [socket]);

  const handleAdd = useCallback((action: SetStateAction<Drink | undefined>) => {
    const picked = typeof action === "function" ? action(undefined) : action;
    if (!picked) return;
    // Check if already selected
    setSelectedDrinks((prev): TurnDrink[] => {
      const already = prev.some((td) => td.drink.id === picked.id);
      return already ? prev : [...prev, { drink: picked, turn_id: -1, n: 1 }];
    });
  }, []);

  const handleDelete = (id: number) => {
    setSelectedDrinks((prev) => prev.filter((td) => td.drink.id !== id));
  };

  const availableDrinks = useMemo<Drink[]>(() => {
    return knownDrinks.filter(
      (d1) => !selectedDrinks.some((td) => td.drink.id === d1.id),
    );
  }, [knownDrinks, selectedDrinks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    const firstTurn: FirstTurnPost = {
      game_id: game.id,
      drinks: selectedDrinks,
    };
    socket.emit("start-game", firstTurn);
    setOpen(false);
  };

  return (
    <>
      <button
        className={`${className} button`}
        onClick={(e) => {
          e.stopPropagation();
          openModal();
        }}
      >
        Aloita peli
      </button>

      {open && (
        <PopUpDialogue setOpen={setOpen} title="Aloita peli">
          <form
            onSubmit={handleSubmit}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg w-xl bg-white p-6 shadow"
          >
            <div className="flex flex-col mb-4 border-2 border-juvu-sini-800 rounded-3xl p-2 h-80">
              <DropdownMenu
                buttonText="Lisää juoma"
                options={availableDrinks}
                selectedOption={undefined}
                setSelectedOption={handleAdd}
              />

              <div className="flex flex-col flex-1 gap-1 py-2 overflow-y-auto">
                {selectedDrinks.length === 0 && (
                  <p className="text-tertiary-500">Ei valittuja juomia</p>
                )}
                {selectedDrinks.map((td) => (
                  <DrinkSelectionCard
                    key={td.drink.id}
                    turnDrink={td}
                    onDelete={handleDelete}
                    updateDrinks={setSelectedDrinks}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="button"
                onClick={() => setOpen(false)}
              >
                Eiku
              </button>
              <button
                type="submit"
                className="button"
                disabled={selectedDrinks.length === 0}
              >
                Aloita peli
              </button>
            </div>
          </form>
        </PopUpDialogue>
      )}
    </>
  );
}

function DrinkSelectionCard({
  turnDrink,
  onDelete,
  updateDrinks,
}: {
  turnDrink: TurnDrink;
  onDelete: (id: number) => void;
  updateDrinks: React.Dispatch<React.SetStateAction<TurnDrink[]>>;
}): JSX.Element {
  const handleChange = (n: number) => {
    updateDrinks((list) => {
      return list.map((td) =>
        td.drink.id === turnDrink.drink.id ? { ...td, n: Math.max(1, n) } : td,
      );
    });
  };

  return (
    <div className="flex items-center box p-2 gap-2">
      <p className="flex-1 overflow-hidden whitespace-nowrap text-left text-ellipsis text-xl font-bold">
        {turnDrink.drink.name}
      </p>
      <button
        type="button"
        className="button py-1"
        onClick={() => handleChange(Math.max(1, turnDrink.n - 1))}
      >
        -
      </button>
      <p className="text-lg text-center">{Math.max(1, turnDrink.n)}</p>
      <button
        type="button"
        className="button py-1"
        onClick={() => handleChange(turnDrink.n + 1)}
      >
        +
      </button>
      <button
        type="button"
        className="button py-1"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(turnDrink.drink.id);
        }}
      >
        Poista
      </button>
    </div>
  );
}
