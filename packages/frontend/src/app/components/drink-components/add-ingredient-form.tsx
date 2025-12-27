/* components/AddPlaceForm.tsx */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addIngredient } from "@/utils/fetchers";
import PopUpDialogue from "@/app/components/pop-up-dialogue";

export default function AddIngredientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ingredient: Ingredient = {
      id: -1,
      name: data.get("name") as string,
      abv: Number(data.get("abv")),
      carbonated: data.get("carbonated") === "on",
    };

    addIngredient(ingredient, localStorage.getItem("auth_token")).then();

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        className="rounded text-lg bg-juvu-sini-800 px-2 py-1 text-white center ml-auto"
        onClick={() => setOpen(true)}
      >
        Lisää ainesosa
      </button>

      {open && (
        <PopUpDialogue setOpen={setOpen}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
          >
            <h2 className="mb-4 text-xl font-semibold">Uusi ainesosa</h2>
            <input
              name="name"
              required
              placeholder="Name"
              className="mb-3 w-full rounded border px-3 py-2"
            />

            <input
              name="abv"
              type="number"
              min="0"
              max="100"
              step="0.1"
              required
              placeholder="ABV (%)"
              className="mb-3 w-full rounded border px-3 py-2"
            />

            <label className="mb-4 flex items-center gap-2 text-sm">
              <input name="carbonated" type="checkbox" /> Carbonated
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded bg-primary-100 px-3 py-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-juvu-sini-800 px-3 py-1 text-white"
              >
                Save
              </button>
            </div>
          </form>
        </PopUpDialogue>
      )}
    </>
  );
}
