"use client";

import { useSocket } from "@/app/template";
import SimpleAddForm from "@/app/components/simple-add-form";

export default function AddTeamForm({ gameId }: { gameId: number }) {
  const socket = useSocket();

  async function handleSubmit(name: string) {
    const team: Team = {
      team_id: -1,
      game_id: gameId,
      team_name: name,
      team_hash: "",
      double_tampere: false,
    };
    console.log(team);
    if (socket) {
      socket.emit("create-team", team);
    }
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
