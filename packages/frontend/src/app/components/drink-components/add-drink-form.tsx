"use client";

import { useState } from "react";
import { addDrink } from "@/utils/fetchers";
import PopUpDialogue from "@/app/components/pop-up-dialogue";

export default function AddDrinkForm({
  refreshAction,
}: {
  refreshAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const drink: Drink = {
      id: -1,
      name: data.get("name") as string,
    };

    addDrink(drink, localStorage.getItem("auth_token")).then();
    refreshAction().then();
    setOpen(false);
  }

  return (
    <>
      <button
        className="rounded text-lg bg-juvu-sini-800 px-2 py-1 text-white center ml-auto"
        onClick={() => setOpen(true)}
      >
        Lisää juoma
      </button>

      {open && (
        <PopUpDialogue setOpen={setOpen}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
          >
            <h2 className="mb-4 text-xl font-semibold">Uusi juoma</h2>
            <input
              name="name"
              required
              placeholder="Nimi"
              className="mb-3 w-full rounded border px-3 py-2"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="button"
              >
                Eiku
              </button>
              <button type="submit" className="button">
                Tallenna
              </button>
            </div>
          </form>
        </PopUpDialogue>
      )}
    </>
  );
}
