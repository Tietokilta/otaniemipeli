"use client";
import { useState } from "react";
import AddDrinkIngredientForm from "@/app/components/drink-components/add-drink-ingredient-form";
import IngredientCard from "@/app/components/drink-components/ingredient-card";
import {
  deleteDrink,
  getDrinkIngredients,
  updateDrink,
} from "@/utils/fetchers";
import { useRouter } from "next/navigation";
import RefillSVG from "@/public/refill";

export default function DrinkCard({
  drink,
  functional,
  refreshListAction,
}: {
  drink: DrinkIngredients;
  functional: boolean;
  refreshListAction: () => void;
}): JSX.Element {
  const [state, setState] = useState(false);
  const [drink_ingredients, setDrinkIngredients] = useState(drink.ingredients);
  const [drinkIngrLen, setDrinkIngrLen] = useState(drink_ingredients.length);
  const [favorite, setFavorite] = useState(drink.drink.favorite);
  const [noMixRequired, setNoMixRequired] = useState(
    drink.drink.no_mix_required,
  );
  const router = useRouter();

  const handleFavoriteChange = async (checked: boolean) => {
    setFavorite(checked);
    await updateDrink({
      ...drink.drink,
      favorite: checked,
      no_mix_required: noMixRequired,
    });
  };

  const handleNoMixRequiredChange = async (checked: boolean) => {
    setNoMixRequired(checked);
    await updateDrink({ ...drink.drink, favorite, no_mix_required: checked });
  };

  const onClickHandle = async () => {
    await updateIngredients();
    setState((prev) => !prev);
  };
  const updateIngredients = async () => {
    const drinkIngredients = await getDrinkIngredients(drink.drink.id);
    setDrinkIngredients(drinkIngredients.ingredients);
    setDrinkIngrLen(drinkIngredients.ingredients.length);
    refreshListAction?.();
  };

  const onDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    updateIngredients().then();
  };

  return (
    <li
      className={`shadow-md hover:shadow-lg shadow-juvu-kulta box-hover center w-full ${functional && "cursor-pointer"}`}
      onClick={onClickHandle}
    >
      <div className="flex items-center justify-items-start w-full">
        <p
          className={`text-2xl font-mono text-left px-2 w-1/7 center select-none ${!functional && "text-4xl"} ${!functional && state && " rotate-90"}`}
        >
          {functional ? drink.drink.id : " ›"}
        </p>
        <p className="text-2xl font-mono text-left px-2 w-5/7 select-none">
          {drink.drink.name}
        </p>
        {drink.abv > 0 ? (
          <p className="text-2xl font-mono w-1/4 px-1 text-right border-juvu-sini-800 border-l">
            {drink.abv}%
          </p>
        ) : (
          <p className="text-2xl font-mono w-1/4 px-1 text-right border-juvu-sini-800 border-l">
            0.0%
          </p>
        )}
        {drink.quantity > 0 ? (
          <p className="text-2xl font-mono w-2/12 px-2 text-right border-juvu-sini-800 border-l">
            {Math.round(drink.quantity)}cl
          </p>
        ) : (
          <p className="text-2xl font-mono w-2/12 px-2 text-right border-juvu-sini-800 border-l">
            0cl
          </p>
        )}
        <div
          className="p-0 w-2/5"
          onClick={(e) => {
            e.stopPropagation();
            updateIngredients().then();
            router.refresh();
          }}
        >
          {state && functional ? (
            <button
              className="rounded cursor-pointer w-full my-1 text-sm bg-juvu-sini-800 hover:bg-juvu-sini-600 px-4 py-1 text-white center"
              onClick={(e) => {
                e.stopPropagation();
                deleteDrink(drink.drink.id).then();
                refreshListAction?.();
              }}
            >
              Poista juoma
            </button>
          ) : null}
        </div>
      </div>
      {state ? (
        <>
          <hr className="my-2 -mx-3 border-juvu-sini-600" />
          {functional && (
            <div
              className="flex gap-4 mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => handleFavoriteChange(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span>Suosikki</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noMixRequired}
                  onChange={(e) => handleNoMixRequiredChange(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span>Ei vaadi IE-työtä</span>
              </label>
            </div>
          )}
          <div className="w-full mb-2 flex text-2xl font-redaction-50">
            <div className="w-full">Ainesosat</div>
            {functional && state && drink_ingredients.length >= drinkIngrLen ? (
              <AddDrinkIngredientForm
                drink={drink.drink}
                ingredientsStart={drink_ingredients}
                onUpdateAction={updateIngredients}
              />
            ) : null}
          </div>
          <ul className="flex flex-col gap-2 w-full">
            {drink_ingredients.map((ingredient) => (
              <IngredientCard
                key={ingredient.ingredient.id}
                ingredient={ingredient.ingredient}
                quantity={ingredient.quantity}
                drink_id={drink.drink.id}
                deleteFromDrink={functional}
                onDelete={onDeleteClick}
              />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}
export function DrinkCardNoIngredients({
  drink,
  className,
}: {
  drink: Drink;
  className?: string;
}): JSX.Element {
  return (
    <div className={className}>
      <li className="shadow-md rounded-2xl border-2 border-juvu-sini-800 px-6 py-2 items-center">
        <div className="flex items-center justify-items-start w-100">
          <h3 className="text-lg font-bold text-left px-1 w-3/7">
            {drink.name}
          </h3>
        </div>
      </li>
    </div>
  );
}
export function PlaceDrinkCard({ drink }: { drink: PlaceDrink }): JSX.Element {
  return (
    <div className="flex flex-col justify-items-start w-full border-b-1 border-juvu-sini-800">
      <h2 className="font-redaction-i-50 text-2xl text-left px-1 w-full">
        {drink.drink.name}
      </h2>
      <div className="flex items-center justify-items-start w-full">
        <div className="w-7 h-7 my-1">
          <p className="font-redaction-i-70 text-2xl w-full text-center">
            {drink.n}
          </p>
        </div>
        <div className="w-7 h-7 my-1">
          {drink.refill && <RefillSVG className="w-full h-full" />}
        </div>
        <div className="w-7 h-7 my-1">
          <p className="text-xl w-full text-center font-bold">
            {drink.optional && "?"}
          </p>
        </div>
      </div>
    </div>
  );
}
export function TurnDrinkCard({ drink }: { drink: TurnDrink }): JSX.Element {
  return (
    <div className="flex items-center w-full border-b border-primary-900 whitespace-nowrap">
      <h2 className="text-2xl text-left px-1">{drink.n}x</h2>
      <h2 className="text-xl text-left px-1 overflow-hidden text-ellipsis">
        {drink.drink.name}
      </h2>
    </div>
  );
}
