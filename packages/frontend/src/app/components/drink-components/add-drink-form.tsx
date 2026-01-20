"use client";

import { addDrink } from "@/utils/fetchers";
import SimpleAddForm from "@/app/components/simple-add-form";

export default function AddDrinkForm({
  refreshAction,
}: {
  refreshAction: () => Promise<void>;
}) {
  async function handleSubmit(name: string) {
    const drink: Drink = {
      id: -1,
      name: name,
    };

    await addDrink(drink, localStorage.getItem("auth_token"));
    await refreshAction();
  }

  return (
    <SimpleAddForm
      buttonText="Lisää juoma"
      dialogTitle="Uusi juoma"
      inputPlaceholder="Nimi"
      buttonClassName="rounded text-lg bg-juvu-sini-800 px-2 py-1 text-white center ml-auto"
      onSubmit={handleSubmit}
    />
  );
}
