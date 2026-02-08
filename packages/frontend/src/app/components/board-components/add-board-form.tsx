"use client";

import { addBoard } from "@/utils/fetchers";
import SimpleAddForm from "@/app/components/simple-add-form";

export default function AddBoardForm({
  refreshAction,
}: {
  refreshAction: () => Promise<void>;
}) {
  async function handleSubmit(name: string) {
    const board: Board = {
      id: -1,
      name: name,
    };

    await addBoard(board);
    await refreshAction();
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
