"use client";

import SimpleAddForm from "@/app/components/simple-add-form";
import { createTeam } from "@/utils/fetchers";
import { toastError } from "@/utils/toast-error";

export default function AddTeamForm({ gameId }: { gameId: number }) {
  function handleSubmit(name: string) {
    createTeam(gameId, name).catch(toastError);
  }

  return (
    <SimpleAddForm
      buttonText="Lisää Joukkue"
      dialogTitle="Uusi joukkue"
      inputPlaceholder="Nimi"
      onSubmit={handleSubmit}
    />
  );
}
