"use client";
import { useEffect, useState } from "react";
import IngredientCard from "@/app/components/drink-components/ingredient-card";
import AddIngredientDialog from "@/app/components/drink-components/add-ingredient-form";
import ItemList from "@/app/components/item-list";
import ErrorDisplay from "@/app/components/error-display";
import { getIngredients } from "@/utils/fetchers";

export default function IngredientList({ className }: { className?: string }) {
  const [ingredients, setIngredients] = useState<Ingredients | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIngredients()
      .then(setIngredients)
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return (
      <ErrorDisplay message="Error fetching ingredients!" status={error} />
    );
  }

  if (!ingredients) return null;

  return (
    <ItemList
      title="Ainesosalista"
      addDialog={<AddIngredientDialog />}
      className={className}
    >
      {ingredients.ingredients
        .sort((i, b) => {
          return i.name.toLowerCase().localeCompare(b.name.toLowerCase());
        })
        .map((ingredient: Ingredient) => (
          <IngredientCard key={ingredient.id} ingredient={ingredient} />
        ))}
    </ItemList>
  );
}
