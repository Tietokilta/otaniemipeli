export const dynamic = "force-dynamic";

import IngredientList from "@/app/components/drink-components/ingredient-list";
import DrinkList from "@/app/components/drink-components/drinks-list";

export default function Home() {
  return (
    <div className="h-full flex w-full gap-2 min-h-0 items-stretch">
      <DrinkList className="flex-1" />
      <IngredientList className="flex-1" />
    </div>
  );
}
