"use client";

import React, { use } from "react";
import GameCard from "@/app/components/game-components/game-card";
import { useSocket } from "@/app/template";
import TeamList from "@/app/components/team-components/team-list";
import GameStartDialogue from "@/app/components/game-components/game-start-dialogue";
import GameTeamTurnsList from "@/app/components/team-components/game-team-turns-list";
import { useGameData } from "@/app/hooks/useGameData";
import {
  GameLoadingSpinner,
  GameErrorDisplay,
} from "@/app/components/game-components/game-loading-states";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(
    socket,
    Number(game_id),
    { pollingInterval: 1000 },
  );

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
    <div className="flex gap-4 4 h-[80dvh]">
      <div className="flex flex-col gap-2 flex-1">
        <h1>{gameData.game.name}</h1>
        <GameCard game={gameData.game} className="w-full" />
        <TeamList game={gameData.game} className="w-full" />
        {!gameData.game.started && (
          <GameStartDialogue
            game={gameData.game}
            className="w-full"
          />
        )}
      </div>
      <div className="flex flex-col gap-2 flex-3 max-h-[80dvh] w-1/2">
        <h1 className="text-2xl font-bold mb-4">Pelin kulku</h1>
        <GameTeamTurnsList gameData={gameData} className="h-64 flex-1" />
        <GameTeamTurnsList
          gameData={gameData}
          collect
          className="h-80 flex-2"
        />
      </div>
    </div>
  );
}
