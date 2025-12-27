import IngredientCard from "@/app/components/drink-components/ingredient-card";
import AddIngredientDialog from "@/app/components/drink-components/add-ingredient-form";
import ItemList from "@/app/components/item-list";
import ErrorDisplay from "@/app/components/error-display";

export default async function IngredientList({
  className,
}: {
  className?: string;
}): Promise<JSX.Element> {
  const res = await fetch(process.env.API_URL + "/ingredients", {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    return (
      <ErrorDisplay message="Error fetching ingredients!" status={res.status} />
    );
  }

  const ingredients: Ingredients = await res.json();
  return (
    <ItemList
      title="Ainesosalista"
      addDialog={<AddIngredientDialog />}
      className={className}
    >
      {ingredients ? (
        ingredients.ingredients
          .sort((i, b) => {
            return i.name.toLowerCase().localeCompare(b.name.toLowerCase());
          })
          .map((ingredient: Ingredient) => (
            <IngredientCard key={ingredient.id} ingredient={ingredient} />
          ))
      ) : (
        <p>No ingredients!</p>
      )}
    </ItemList>
  );
}
