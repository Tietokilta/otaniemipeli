"use client";

import SimpleAddForm from "@/app/components/simple-add-form";
import { createTeam } from "@/utils/fetchers";

export default function AddTeamForm({ gameId }: { gameId: number }) {
  async function handleSubmit(name: string) {
    const team: Team = {
      team_id: -1,
      game_id: gameId,
      team_name: name,
      team_hash: "",
      double_tampere: false,
    };
    console.log(team);
    await createTeam(gameId, team);
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
