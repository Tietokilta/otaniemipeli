"use client";

import SimpleAddForm from "@/app/components/simple-add-form";
import { createTeam } from "@/utils/fetchers";

export default function AddTeamForm({ gameId }: { gameId: number }) {
  async function handleSubmit(name: string) {
    await createTeam(gameId, name);
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
