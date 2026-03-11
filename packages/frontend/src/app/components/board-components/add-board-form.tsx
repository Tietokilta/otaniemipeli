"use client";

import { addBoard } from "@/utils/fetchers";
import SimpleAddForm from "@/app/components/simple-add-form";
import { toastError } from "@/utils/toast-error";

export default function AddBoardForm({
  refreshAction,
}: {
  refreshAction: () => Promise<void> | void;
}) {
  function handleSubmit(name: string) {
    addBoard({
      id: -1,
      name: name,
    })
      .then(() => refreshAction())
      .catch(toastError);
  }

  return (
    <SimpleAddForm
      buttonText="Lisää Lauta"
      dialogTitle="Uusi lauta"
      inputPlaceholder="Nimi"
      onSubmit={handleSubmit}
    />
  );
}
