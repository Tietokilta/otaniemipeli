"use client";
import DrinkCard from "@/app/components/drink-components/drink-card";
import AddDrinkForm from "@/app/components/drink-components/add-drink-form";
import { useCallback, useEffect, useState } from "react";
import { getDrinkIngredients, getDrinks } from "@/utils/fetchers";
import Petrified from "@/app/components/petrified";
import ItemList from "@/app/components/item-list";

export default function DrinkList({
  className,
  drinksList,
}: {
  className?: string;
  drinksList?: PlaceDrink[];
}): JSX.Element {
  const [drinks, setDrinks] = useState<DrinkIngredients[] | null>([]);

  const fetchDrinks = useCallback(async () => {
    if (!drinksList) {
      const data = await getDrinks();
      setDrinks(data.drink_ingredients);
    } else {
      // Fetch drink ingredients for place drinks
      const newDrinks: DrinkIngredients[] = [];
      for (const drink of drinksList) {
        try {
          const data: DrinkIngredients = await getDrinkIngredients(
            drink.drink.id,
          );
          newDrinks.push(data);
        } catch (error) {
          console.error("Error fetching drink ingredients:", error);
        }
      }
      setDrinks(newDrinks);
    }
  }, [drinksList]);

  useEffect(() => {
    void fetchDrinks();
  }, [fetchDrinks]);

  return (
    <ItemList
      title="Juomat"
      addDialog={!drinksList && <AddDrinkForm refreshAction={fetchDrinks} />}
      className={className}
    >
      {drinks && drinks.length > 0 ? (
        drinks
          .sort((a, b) => a.drink.name.localeCompare(b.drink.name))
          .map((drink: DrinkIngredients) => (
            <DrinkCard
              key={drink.drink.id}
              drink={drink}
              functional={!drinksList}
              refreshListAction={fetchDrinks}
            />
          ))
      ) : (
        <p className="flex w-full center font-redaction-i-50 text-2xl">
          <Petrified className="h-[1.5rem] w-auto" /> Tässä ruudussa ei ole
          juomia <Petrified className="h-[1.5rem] w-auto" />
        </p>
      )}
    </ItemList>
  );
}
