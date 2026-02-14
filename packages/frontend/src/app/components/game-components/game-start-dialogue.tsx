"use client";
import React, { useState } from "react";
import PopUpDialogue from "../pop-up-dialogue";
import { DrinkSelectionList } from "../team-components/edit-team-turn-dialogue";
import { startGame } from "@/utils/fetchers";

export default function GameStartDialogue({
  game,
  className,
}: {
  game: Game;
  className?: string;
}) {
  const [selectedDrinks, setSelectedDrinks] = useState<TurnDrinks>({
    drinks: [],
  });
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const drinksToSubmit = selectedDrinks.drinks.filter((d) => d.n > 0);
    const firstTurn: FirstTurnPost = {
      game_id: game.id,
      drinks: drinksToSubmit,
    };
    await startGame(game.id, firstTurn);
    setOpen(false);
  };

  const hasSelectedDrinks = selectedDrinks.drinks.some((d) => d.n > 0);

  return (
    <>
      <button
        className={`${className} button`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
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
            <p className="text-xl">Valitse aloitusjuomat.</p>
            <p>
              <em>Huom!</em> Hanki juomat valmiiksi pöytiin ennen pelin
              aloittamista!
            </p>
            <DrinkSelectionList
              selectedDrinks={selectedDrinks}
              setSelectedDrinks={setSelectedDrinks}
            />

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
                disabled={!hasSelectedDrinks}
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
