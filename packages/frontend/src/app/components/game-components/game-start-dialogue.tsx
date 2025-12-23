"use client";
import { useSocket } from "@/app/template";
import React, { useEffect, useRef, useState } from "react";
import DropdownMenu from "@/app/components/dropdown-menu";

export default function GameStartDialogue({
  game,
  setGameAction,
  className,
}: {
  game: Game;
  setGameAction: (updatedGame: Game) => void;
  className?: string;
}) {
  const socket = useSocket();

  const [availableDrinks, setAvailableDrinks] = useState<Drink[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<TurnDrink[]>([]);
  const [picked, setPicked] = useState<Drink | undefined>();

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
      setAvailableDrinks(uniq);
    };
    socket.on("reply-drinks", onReply);
    socket.emit("get-drinks");

    return () => {
      socket.off("reply-drinks", onReply);
    };
  }, [socket]);

  useEffect(() => {
    if (!picked) return;

    setSelectedDrinks((prev) => {
      const already = prev.some((td) => td.drink.id === picked.id);
      const nextSelected = already
        ? prev
        : [...prev, { drink: picked, turn_id: -1, n: 1 }];

      setAvailableDrinks((drs) => drs.filter((d) => d.id !== picked.id));

      return nextSelected;
    });
    setPicked(undefined);
  }, [picked, setSelectedDrinks, setAvailableDrinks]);

  const handleDelete = (id: number) => {
    setSelectedDrinks((prev) => {
      const removed = prev.find((td) => td.drink.id === id);
      const next = prev.filter((td) => td.drink.id !== id);
      if (removed) {
        setAvailableDrinks((drs) =>
          drs.some((d) => d.id === removed.drink.id)
            ? drs
            : [...drs, removed.drink],
        );
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket) return;
    socket.on("reply-game", (g: Game) => {
      setGameAction(g);
    });
    const firstTurn: FirstTurnPost = {
      game_id: game.id,
      drinks: selectedDrinks.map((td) => ({
        drink: td.drink,
        turn_id: -1,
        n: td.n || 1,
      })),
    };
    socket.emit("start-game", firstTurn);
    setOpen(false);
  };

  return (
    <>
      <div
        className={`${className} button`}
        onClick={(e) => {
          e.stopPropagation();
          openModal();
        }}
      >
        Aloita peli
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-juvu-sini-800/50"
          onClick={(e) => {
            if (justOpened.current) return;
            if (e.target !== e.currentTarget) return;
            setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSubmit}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
          >
            <div className="flex flex-col w-full mb-4 border-2 border-juvu-sini-800 rounded-3xl p-2 h-80">
              <DropdownMenu
                buttonText="Lisää juoma"
                options={availableDrinks}
                selectedOption={picked}
                setSelectedOption={setPicked}
              />

              <div className="flex flex-col flex-1 gap-1 overflow-y-auto p-2">
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
        </div>
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
  const [n, setN] = useState<number>(turnDrink.n || 1);
  useEffect(() => {
    updateDrinks((list) =>
      list.map((td) =>
        td.drink.id === turnDrink.drink.id ? { ...td, n: Math.max(1, n) } : td,
      ),
    );
  }, [n, turnDrink.drink.id, updateDrinks]);

  return (
    <div className="flex flex-col gap-2 w-full box p-2 cursor-pointer">
      <div className="flex items-center">
        <p className="mr-auto text-xl font-bold min-w-1/3">
          {turnDrink.drink.name}
        </p>
        <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1 w-2/3 center ml-auto">
            <div
              className="w-2/3 center button p-1"
              onClick={() => setN((v) => Math.max(1, v - 1))}
            >
              <p className="text-center select-none">-</p>
            </div>
            <p className="text-lg text-center w-full">{Math.max(1, n)}</p>
            <div
              className="w-2/3 center button p-1"
              onClick={() => setN((v) => v + 1)}
            >
              <p className="text-center w-full select-none">+</p>
            </div>
          </div>
        </div>
        <div
          className="flex button center ml-2"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(turnDrink.drink.id);
          }}
        >
          <p>Poista</p>
        </div>
      </div>
    </div>
  );
}
