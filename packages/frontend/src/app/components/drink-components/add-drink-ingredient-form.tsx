"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getIngredients } from "@/utils/fetchers";
import { DrinkCardNoIngredients } from "@/app/components/drink-components/drink-card";
import DropdownMenu from "@/app/components/dropdown-menu";
import PopUpDialogue from "@/app/components/pop-up-dialogue";

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
  const [picked, setPicked] = useState<Ingredient | undefined>(undefined);

  const justOpened = useRef(true);

  const openModal = () => {
    setOpen(true);
    justOpened.current = true;
    requestAnimationFrame(() => {
      justOpened.current = false;
    });
  };

  useEffect(() => {
    setSelectedIds(new Set(ingredientsStart.map((iq) => iq.ingredient.id)));
  }, [ingredientsStart]);

  const loadIngredients = useCallback(async () => {
    const data = await getIngredients();
    setAllIngredients(data.ingredients);
  }, []);

  // fetch when dialog opens
  useEffect(() => {
    if (open) void loadIngredients();
  }, [open, loadIngredients]);

  // when user picks from dropdown, add to selection then clear pick
  useEffect(() => {
    if (!picked) return;
    setSelectedIds((prev) => new Set(prev).add(picked.id));
    setPicked(undefined);
  }, [picked]);

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

  const remove = useCallback(
    (id: number) => {
      // block removing originals, or allow if you want
      if (originalIds.has(id)) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [originalIds],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/drinks/ingredients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${localStorage.getItem("auth_token")}`,
      },
      body: JSON.stringify(toPost),
    });

    onUpdateAction?.();
    setOpen(false);
  }

  return (
    <>
      <div
        className="button"
        onClick={(e) => {
          e.stopPropagation(); // extra safety if inside another clickable
          openModal();
        }}
      >
        Lisää ainesosa
      </div>

      {open && (
        <PopUpDialogue justOpened={justOpened} setOpen={setOpen}>
          <form
            onSubmit={handleSubmit}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow"
          >
            <h2 className="mb-1 text-xl font-semibold">
              Lisää ainesosa juomaan
            </h2>
            <DrinkCardNoIngredients drink={drink} className="mb-2" />
            <div className="flex w-full mb-4 border-2 border-juvu-sini-800 rounded-3xl p-2 h-60">
              <DropdownMenu
                buttonText="Ainesosat"
                options={available}
                selectedOption={picked}
                setSelectedOption={setPicked}
              />

              <div className="flex flex-col items-center w-full h-full overflow-scroll mb-4">
                {selected.length > 0 ? (
                  selected.map((ing) => (
                    <button
                      type="button"
                      key={ing.id}
                      className="flex border-juvu-sini-800 border-2 w-full rounded-2xl items-center mx-2 py-1 my-1 hover:border-juvu-sini-600"
                      onClick={() => remove(ing.id)}
                      title={
                        originalIds.has(ing.id)
                          ? "Jo lisätty (lukittu)"
                          : "Poista valinnasta"
                      }
                    >
                      <p className="text-base px-2 text-right border-juvu-sini-600 border-r font-bold w-full">
                        {ing.name}
                      </p>
                      <p className="text-base px-2 text-left border-juvu-sini-800 w-3/12">
                        {ing.abv}%
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-base pl-2 my-2 text-gray-900">
                    Valitse ainesosa
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full mb-4 border-2 border-juvu-sini-800 rounded-3xl p-2 h-80">
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
                        className="flex border-juvu-sini-800 border-2 w-full rounded-2xl items-center px-3 py-1 my-1 hover:border-juvu-sini-600"
                      >
                        <p className="text-base p-2 text-left font-bold w-9/12">
                          {ing.name}
                        </p>
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
                  <p className="text-base pl-2 my-2 text-gray-900">
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
                className="rounded bg-gray-100 px-3 py-1"
              >
                Eiku
              </button>
              <button
                type="submit"
                className="rounded bg-juvu-sini-800 px-3 py-1 text-white"
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
