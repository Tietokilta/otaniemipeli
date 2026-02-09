"use client";

import SecretaryTurnsList from "@/app/components/drink-components/secretary-turns-list";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import {
  AddTeamTurnButton,
  ToggleMoralVictoryButton,
} from "@/app/components/team-components/edit-team-turn-dialogue";
import { useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import { use, useState } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string; team_id: string }>;
}) {
  const { game_id, team_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, parseInt(game_id));

  const [dialogueOpen, setDialogueOpen] = useState(false);

  const team = gameData?.teams.find(
    (t) => t.team.team_id === parseInt(team_id),
  );

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  if (isLoading || !gameData) {
    return <GameLoadingSpinner />;
  }

  if (!team) {
    return <GameErrorDisplay error={"Joukkuetta ei löytynyt"} />;
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <h3>
        Joukkue: <em>{team.team.team_name}</em>
      </h3>
      <AddTeamTurnButton
        team={team}
        diceOpen={dialogueOpen}
        setDiceOpen={setDialogueOpen}
        allowDice={true}
      />
      <ToggleMoralVictoryButton team={team} referee={false} />
      <SecretaryTurnsList team={team} />
    </div>
  );
}
