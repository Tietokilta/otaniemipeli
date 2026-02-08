"use client";
import React, { useEffect, useRef, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { addDrinksToPlace, getDrinks } from "@/utils/fetchers";
import { useRouter } from "next/navigation";

export default function AddDrinkToPlace({ place }: { place: BoardPlace }) {
  const [drinks, setDrinks] = useState<DrinksIngredients>({
    drink_ingredients: [],
  });
  const [placeDrinks, setPlaceDrinks] = useState<PlaceDrinks>(place.drinks);
  const router = useRouter();
  const deleteDrink = (id: number) => {
    const list = [...placeDrinks.drinks];

    const idx = list.findIndex((drink) => drink.drink.id === id); // first match
    if (idx !== -1) {
      list.splice(idx, 1);
    }
    setPlaceDrinks({
      drinks: list,
    });
  };
  useEffect(() => {
    getDrinks().then((drinks) => {
      setDrinks(drinks);
    });
  }, []);
  const addDrink = (drink: PlaceDrink) => {
    const alreadyExists = placeDrinks.drinks.find(
      (dr) =>
        dr.place_number === drink.place_number &&
        dr.board_id === drink.board_id &&
        dr.drink.id === drink.drink.id,
    );
    if (alreadyExists) return;
    setPlaceDrinks({ drinks: [...placeDrinks.drinks, drink] });
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full max-h-[54vh] mx-auto box">
      <h3 className="text-2xl font-bold">Lisää juomia valittuun ruutuun</h3>
      <div className="flex gap-2 h-full overflow-y-scroll">
        <div className="flex flex-col gap-1 w-2/5">
          {drinks.drink_ingredients.length > 0 && (
            <Menu>
              <MenuButton className="flex rounded cursor-pointer text-base bg-primary-900 p-1 text-white h-10 mx-1 center w-full hover:bg-primary-500">
                Juomat
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
                            n_update: "",
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
        </div>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-1 w-full h-full overflow-hidden overflow-y-scroll box list-none">
            {placeDrinks.drinks.length > 0 &&
              placeDrinks.drinks
                .filter((pd) => pd.place_number == place.place_number)
                .sort((a, b) => a.drink.name.localeCompare(b.drink.name))
                .map((drink) => (
                  <DrinkSelectionCard
                    key={`${drink.board_id}-${drink.place_number}-${drink.drink.id}`}
                    placeDrink={drink}
                    onDelete={deleteDrink}
                    updateDrinks={setPlaceDrinks}
                  />
                ))}
          </div>
          <div
            className="flex button"
            onClick={() => {
              addDrinksToPlace(placeDrinks);
              router.refresh();
            }}
          >
            <h1>Lisää juomat ruutuihin</h1>
          </div>
        </div>
      </div>
    </div>
  );
}
export function DrinkSelectionCard({
  placeDrink,
  onDelete,
  updateDrinks,
}: {
  placeDrink: PlaceDrink;
  onDelete: (id: number) => void;
  updateDrinks: React.Dispatch<React.SetStateAction<PlaceDrinks>>;
}): JSX.Element {
  const [refill, setRefill] = useState<boolean>(placeDrink.refill || false);
  const [optional, setOptional] = useState<boolean>(
    placeDrink.optional || false,
  );
  const [onTable, setOnTable] = useState<boolean>(placeDrink.on_table || false);
  const [n, setN] = useState<number>(placeDrink.n || 1);
  const [rule, setRule] = useState<string>(placeDrink.n_update || "1");
  const [showEverything, setShowEverything] = useState<boolean>(false);

  // Track initial render to avoid unnecessary update on mount
  const isFirstRender = useRef(true);
  // Store stable references for placeDrink properties
  const placeDrinkRef = useRef(placeDrink);
  placeDrinkRef.current = placeDrink;

  useEffect(() => {
    // Skip the initial render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const pd = placeDrinkRef.current;
    updateDrinks((dr) => {
      return {
        drinks: [
          ...dr.drinks.filter(
            (d) =>
              !(
                d.place_number === pd.place_number &&
                d.board_id === pd.board_id &&
                d.drink.id === pd.drink.id
              ),
          ),
          {
            place_number: pd.place_number,
            board_id: pd.board_id,
            drink: pd.drink,
            refill: refill,
            optional: optional,
            on_table: onTable,
            n: n,
            n_update: rule,
          },
        ],
      };
    });
  }, [refill, optional, onTable, n, rule, updateDrinks]);

  return (
    <div
      className="flex flex-col gap-2 w-full box p-2 cursor-pointer"
      onClick={() => {
        setShowEverything(!showEverything);
      }}
    >
      <div className="flex h-1/3">
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
              onClick={() => setRefill(!refill)}
            >
              <p className="text-sm w-2/3">Täytettävä</p>
              <p
                className={`w-min-1/3 box ${refill ? "bg-emerald-800 border-emerald-800" : ""}`}
              ></p>
            </div>
            <div
              className={`flex gap-2 w-1/2 box center`}
              onClick={() => setOptional(!optional)}
            >
              <p className="text-sm w-2/3">Valinnainen</p>
              <p
                className={`w-min-1/3 box ${optional ? "bg-emerald-800 border-emerald-800" : ""}`}
              ></p>
            </div>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <div
              className={`flex gap-2 w-1/2 box center`}
              onClick={() => setOnTable(!onTable)}
            >
              <p className="text-sm w-2/3">Pöydällä</p>
              <p
                className={`w-min-1/3 box ${onTable ? "bg-emerald-800 border-emerald-800" : ""}`}
              ></p>
            </div>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <div className={`flex gap-2 w-1/2 box center`}>
              <div className="w-1/3 center button p-1">
                <p
                  className="text-center w-full select-none"
                  onClick={() => {
                    setN(n - 1);
                  }}
                >
                  -
                </p>
              </div>
              <div className="w-1/3 center p-1">
                <p className="text-sm text-center w-full">{n}</p>
              </div>
              <div className="w-1/3 center button p-1">
                <p
                  className="text-center w-full select-none"
                  onClick={() => {
                    setN(n + 1);
                  }}
                >
                  +
                </p>
              </div>
            </div>
            <div className={`flex flex-col gap-2 w-1/2 box center`}>
              <p className="text-sm text-center w-full">Täyttösääntö</p>
              <div className="center w-full p-1">
                <input
                  className="box w-full"
                  type="text"
                  placeholder={rule}
                  onChange={(e) => setRule(e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
