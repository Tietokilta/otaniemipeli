"use client";

import { DrinkCardNoIngredients } from "@/app/components/drink-components/drink-card";
import PopUpDialogue from "@/app/components/pop-up-dialogue";
import { addDrinkIngredient, getIngredients } from "@/utils/fetchers";
import { SubmitEvent, useEffect, useMemo, useState } from "react";
import DrinkDropdown from "../drink-dropdown";

type Props = {
  drink: Drink;
  ingredientsStart: IngredientQty[];
  onUpdateAction: () => void;
};

export default function AddDrinkIngredientForm({
  drink,
  ingredientsStart,
  onUpdateAction,
}: Props) {
  const originalIds = useMemo<Set<number>>(
    () => new Set(ingredientsStart.map((iq) => iq.ingredient.id)),
    [ingredientsStart],
  );

  const [open, setOpen] = useState(false);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set(ingredientsStart.map((iq) => iq.ingredient.id)));
  }, [ingredientsStart]);

  // fetch when dialog opens
  useEffect(() => {
    if (open) {
      getIngredients().then((data) => setAllIngredients(data.ingredients));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const available = useMemo(
    () => allIngredients.filter((ing) => !selectedIds.has(ing.id)),
    [allIngredients, selectedIds],
  );

  const selected = useMemo(
    () =>
      allIngredients
        .filter((ing) => selectedIds.has(ing.id))
        // optional sort, you can remove if you want keep insertion order
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allIngredients, selectedIds],
  );

  function setPicked(picked: Ingredient | undefined) {
    if (!picked) return;
    setSelectedIds((prev) => new Set(prev).add(picked.id));
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const newIds = [...selectedIds].filter((id) => !originalIds.has(id));
    const toPost: DrinkIngredientsPost = {
      drink,
      ingredients: newIds.map((id) => {
        const ing = allIngredients.find((i) => i.id === id)!;
        const qty = Number(fd.get(`quantity-${id}`)) || 0;
        return { ingredient: ing, quantity: qty };
      }),
    };

    if (toPost.ingredients.length === 0) {
      setOpen(false);
      return;
    }

    await addDrinkIngredient(toPost);

    onUpdateAction?.();
    setOpen(false);
  }

  return (
    <>
      <div
        className="rounded cursor-pointer text-sm bg-primary-900 hover:bg-primary-500 px-4 py-1 text-white center text-nowrap"
        onClick={(e) => {
          e.stopPropagation(); // extra safety if inside another clickable
          setOpen(true);
        }}
      >
        Lisää ainesosa
      </div>

      {open && (
        <PopUpDialogue setOpen={setOpen}>
          <form
            onSubmit={handleSubmit}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl rounded-lg bg-white p-6 shadow"
          >
            <h2 className="mb-1 text-xl font-semibold">
              Lisää ainesosa juomaan
            </h2>
            <DrinkCardNoIngredients drink={drink} className="mb-2" />
            <DrinkDropdown
              buttonText="Lisää ainesosa"
              options={available}
              selectedOption={undefined}
              setSelectedOption={setPicked}
            />
            <div className="flex w-full mt-2 mb-4 border-2 border-primary-900 rounded-3xl p-2 h-80">
              <div className="flex flex-col items-center w-full h-full overflow-scroll mb-4">
                {selected.length > 0 ? (
                  selected.map((ing) => {
                    const isOriginal = originalIds.has(ing.id);
                    const existingQty = ingredientsStart.find(
                      (iq) => iq.ingredient.id === ing.id,
                    )?.quantity;

                    return (
                      <div
                        key={ing.id}
                        className="flex border-primary-900 border-2 w-full rounded-2xl items-center px-3 py-1 my-1 hover:border-primary-500"
                      >
                        <p className="text-base px-2 py-2 text-left font-bold">
                          {ing.name}
                        </p>
                        {ing.abv > 0 ? (
                          <p className="text-base px-2 border-primary-900 border-l">
                            {ing.abv}%
                          </p>
                        ) : (
                          <p className="text-base px-2 border-primary-900 border-l">
                            0.0%
                          </p>
                        )}
                        {isOriginal ? (
                          <span className="ml-auto text-sm opacity-70">
                            {existingQty ?? 0} cl (jo lisätty)
                          </span>
                        ) : (
                          <input
                            name={`quantity-${ing.id}`}
                            type="number"
                            min="0"
                            step="0.1"
                            required
                            placeholder="Quantity in cl"
                            className="w-full text-left text-sm rounded border px-3 py-2"
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-base pl-2 my-2 text-tertiary-900">
                    Valitse ainesosa
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
                className="rounded bg-primary-100 px-3 py-1"
              >
                Eiku
              </button>
              <button
                type="submit"
                className="rounded bg-primary-900 px-3 py-1 text-white"
              >
                Tallenna
              </button>
            </div>
          </form>
        </PopUpDialogue>
      )}
    </>
  );
}
