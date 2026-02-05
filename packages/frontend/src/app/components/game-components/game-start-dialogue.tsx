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
import { DrinkSelectionCard } from "../team-components/edit-team-turn-dialogue";

export default function GameStartDialogue({
  game,
  className,
}: {
  game: Game;
  className?: string;
}) {
  const socket = useSocket();

  const [knownDrinks, setKnownDrinks] = useState<Drink[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<TurnDrinks>({
    drinks: [],
  });

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
    setSelectedDrinks((prev): TurnDrinks => {
      const already = prev.drinks.some((td) => td.drink.id === picked.id);
      return already
        ? prev
        : { drinks: [...prev.drinks, { drink: picked, turn_id: -1, n: 1 }] };
    });
  }, []);

  const availableDrinks = useMemo<Drink[]>(() => {
    return knownDrinks.filter(
      (d1) => !selectedDrinks.drinks.some((td) => td.drink.id === d1.id),
    );
  }, [knownDrinks, selectedDrinks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    const firstTurn: FirstTurnPost = {
      game_id: game.id,
      drinks: selectedDrinks.drinks,
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
            className="w-xl bg-white h-[80dvh] max-h-200 flex flex-col gap-2 px-4 py-2"
          >
            <p className="text-xl">Valitse aloitusjuomat</p>
            <DropdownMenu
              buttonText="Lisää juoma"
              options={availableDrinks}
              selectedOption={undefined}
              setSelectedOption={handleAdd}
            />

            <div className="flex-1 flex flex-col gap-1 py-2 overflow-y-auto">
              {selectedDrinks.drinks.length === 0 && (
                <p className="text-tertiary-500">Ei valittuja juomia</p>
              )}
              {selectedDrinks.drinks.map((td) => (
                <DrinkSelectionCard
                  key={td.drink.id}
                  turnDrink={td}
                  updateDrinks={setSelectedDrinks}
                />
              ))}
            </div>

            <div className="flex justify-between px-4 py-4">
              <button
                type="button"
                className="button text-xl p-4"
                onClick={() => setOpen(false)}
              >
                Eiku
              </button>
              <button
                type="submit"
                className="button text-xl p-4"
                disabled={selectedDrinks.drinks.length === 0}
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
