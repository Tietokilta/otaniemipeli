"use client";
import { getDrinks, setPlaceDrinks } from "@/utils/fetchers";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function AddDrinkToPlace({ place }: { place: BoardPlace }) {
  const [drinks, setDrinks] = useState<DrinksIngredients>({
    drink_ingredients: [],
  });
  const [currentPlace, setCurrentPlace] = useState(place.place_number);
  const [currentDrinks, setCurrentDrinks] = useState<PlaceDrinks>(place.drinks);
  const router = useRouter();

  if (currentPlace !== place.place_number) {
    setCurrentPlace(place.place_number);
    setCurrentDrinks(place.drinks);
  }

  const deleteDrink = (id: number) => {
    const list = [...currentDrinks.drinks];

    const idx = list.findIndex((drink) => drink.drink.id === id); // first match
    if (idx !== -1) {
      list.splice(idx, 1);
    }
    setCurrentDrinks({
      drinks: list,
    });
  };

  const addDrink = (drink: PlaceDrink) => {
    const alreadyExists = currentDrinks.drinks.find(
      (dr) =>
        dr.place_number === drink.place_number &&
        dr.board_id === drink.board_id &&
        dr.drink.id === drink.drink.id,
    );
    if (alreadyExists) return;
    setCurrentDrinks({ drinks: [...currentDrinks.drinks, drink] });
  };

  useEffect(() => {
    getDrinks().then((drinks) => {
      setDrinks(drinks);
    });
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 mx-auto box">
      <h3 className="text-2xl font-bold">Lisää juomia valittuun ruutuun</h3>
      {drinks.drink_ingredients.length > 0 && (
        <Menu>
          <MenuButton className="flex rounded cursor-pointer text-base bg-primary-900 p-1 text-white h-10 mx-1 center w-full hover:bg-primary-500">
            Lisää juoma
          </MenuButton>
          <MenuItems
            anchor="right"
            className="text-sm text-juvu-kulta font-bold rounded-2xl z-50 h-3/4"
          >
            {drinks.drink_ingredients
              .sort((a, b) => a.drink.name.localeCompare(b.drink.name))
              .map((drink) => (
                <MenuItem
                  key={`${place.board_id}-${place.place_number}-${drink.drink.id}`}
                >
                  <div
                    className="w-full bg-primary-900 data-focus:bg-primary-500 hover:text-primary-900 hover:bg-primary-500 p-3 cursor-pointer"
                    onClick={() =>
                      addDrink({
                        board_id: place.board_id,
                        place_number: place.place_number,
                        drink: drink.drink,
                        refill: false,
                        optional: false,
                        on_table: false,
                        n: 0,
                      })
                    }
                  >
                    <p>{drink.drink.name}</p>
                  </div>
                </MenuItem>
              ))}
          </MenuItems>
        </Menu>
      )}
      <div className="flex-1 flex flex-col gap-1 overflow-y-scroll box list-none">
        {currentDrinks.drinks.length > 0 &&
          currentDrinks.drinks
            .filter((pd) => pd.place_number == place.place_number)
            .sort((a, b) => a.drink.name.localeCompare(b.drink.name))
            .map((drink) => (
              <DrinkSelectionCard
                key={`${drink.board_id}-${drink.place_number}-${drink.drink.id}`}
                placeDrink={drink}
                onDelete={deleteDrink}
                onChange={setCurrentDrinks}
              />
            ))}
      </div>
      <div
        className="flex button text-lg"
        onClick={() => {
          setPlaceDrinks(currentDrinks);
          router.refresh();
        }}
      >
        Tallenna
      </div>
    </div>
  );
}
export function DrinkSelectionCard({
  placeDrink,
  onDelete,
  onChange,
}: {
  placeDrink: PlaceDrink;
  onDelete: (id: number) => void;
  onChange: React.Dispatch<React.SetStateAction<PlaceDrinks>>;
}): JSX.Element {
  const [showEverything, setShowEverything] = useState<boolean>(false);

  const handleChange = function <T extends keyof PlaceDrink>(
    key: T,
    value: PlaceDrink[T],
  ) {
    onChange((prev) => {
      return {
        drinks: prev.drinks.map((d) =>
          d.place_number === placeDrink.place_number &&
          d.board_id === placeDrink.board_id &&
          d.drink.id === placeDrink.drink.id
            ? { ...d, [key]: value }
            : d,
        ),
      };
    });
  };

  return (
    <div
      className="flex flex-col gap-2 w-full box p-2 cursor-pointer"
      onClick={() => {
        setShowEverything(!showEverything);
      }}
    >
      <div className="flex items-center">
        <p className="mr-auto text-lg font-bold">{placeDrink.drink.name}</p>
        {showEverything && (
          <div
            className="flex button ml-auto justify-center items-center"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(placeDrink.drink.id);
            }}
          >
            <p>Poista</p>
          </div>
        )}
      </div>
      {showEverything && (
        <>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <div
              className={`flex gap-2 w-1/2 box center`}
              onClick={() => handleChange("refill", !placeDrink.refill)}
            >
              <p className="text-sm w-2/3">Täytettävä</p>
              <p
                className={`w-min-1/3 box ${placeDrink.refill ? "bg-emerald-800 border-emerald-800" : ""}`}
              ></p>
            </div>
            <div
              className={`flex gap-2 w-1/2 box center`}
              onClick={() => handleChange("optional", !placeDrink.optional)}
            >
              <p className="text-sm w-2/3">Valinnainen</p>
              <p
                className={`w-min-1/3 box ${placeDrink.optional ? "bg-emerald-800 border-emerald-800" : ""}`}
              ></p>
            </div>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <div
              className={`flex gap-2 w-1/2 box center`}
              onClick={() => handleChange("on_table", !placeDrink.on_table)}
            >
              <p className="text-sm w-2/3">Pöydällä</p>
              <p
                className={`w-min-1/3 box ${placeDrink.on_table ? "bg-emerald-800 border-emerald-800" : ""}`}
              ></p>
            </div>
          </div>
          <div
            className="flex gap-2 box center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-1/3 center button p-1">
              <p
                className="text-center w-full select-none"
                onClick={() => handleChange("n", placeDrink.n - 1)}
              >
                -
              </p>
            </div>
            <div className="w-1/3 center p-1">
              <p className="text-sm text-center w-full">{placeDrink.n}</p>
            </div>
            <div className="w-1/3 center button p-1">
              <p
                className="text-center w-full select-none"
                onClick={() => handleChange("n", placeDrink.n + 1)}
              >
                +
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
