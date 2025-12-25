import IngredientCard from "@/app/components/drink-components/ingredient-card";
import AddIngredientDialog from "@/app/components/drink-components/add-ingredient-form";
import ItemList from "@/app/components/item-list";

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
      <div className="center p-4">
        <h1 className="text-2xl font-bold text-alert-500">
          Error fetching ingredients!
        </h1>
        <p className="text-sm text-tertiary-900">{res.status}</p>
      </div>
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
