"use client";

import { use } from "react";
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
import Link from "next/link";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id), {
    pollingInterval: 1000,
  });

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
        <GameCard game={gameData.game} className="w-full" />
        <TeamList
          game={gameData.game}
          teams={gameData.teams}
          className="w-full"
        />
        {!gameData.game.started && gameData.teams.length > 0 && (
          <GameStartDialogue game={gameData.game} className="w-full" />
        )}
        {gameData.game.started && (
          <Link
            className="button"
            href={`/referee/teams/${gameData.game.id}/all`}
          >
            Näytä kaikki vuorot
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-3 max-h-[80dvh] w-1/2">
        <GameTeamTurnsList gameData={gameData} className="max-h-1/2" />
        <GameTeamTurnsList
          gameData={gameData}
          collect
          className="flex-grow-2"
        />
      </div>
    </div>
  );
}
