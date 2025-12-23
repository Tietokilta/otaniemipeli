import IngredientList from "@/app/components/drink-components/ingredient-list";
import DrinkList from "@/app/components/drink-components/drinks-list";

export default function Home() {
  return (
    <div className="flex w-full gap-2 h-full min-h-0 justify-center">
      <DrinkList className="w-120 h-full mr-auto" />
      <IngredientList className="w-120 max-h-1/2 ml-auto" />
    </div>
  );
}
