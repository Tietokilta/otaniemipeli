"use client";

import GameCard from "@/app/components/game-components/game-card";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import TeamList from "@/app/components/team-components/team-list";
import { useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import { use } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, parseInt(game_id));

  if (isLoading) {
    return <GameLoadingSpinner />;
  }

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  if (!gameData) {
    return <GameLoadingSpinner />;
  }
  return (
    <div className="flex flex-col gap-4 min-h-0">
      <GameCard game={gameData.game} />
      <TeamList
        game={gameData.game}
        teams={gameData.teams}
        link
        linkPrefix="/teams"
        canAdd={false}
        className="overflow-y-auto"
      />
    </div>
  );
}
