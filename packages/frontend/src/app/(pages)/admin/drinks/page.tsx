export const dynamic = "force-dynamic";

import IngredientList from "@/app/components/drink-components/ingredient-list";
import DrinkList from "@/app/components/drink-components/drinks-list";

export default function Home() {
  return (
    <div className="flex w-full gap-2 h-full min-h-0 justify-center">
      <DrinkList className="flex-1 h-full mr-auto" />
      <IngredientList className="flex-1 max-h-1/2 ml-auto" />
    </div>
  );
}
