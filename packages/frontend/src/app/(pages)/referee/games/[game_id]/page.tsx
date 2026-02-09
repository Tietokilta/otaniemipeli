"use client";

import { use, useMemo } from "react";
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
import { computeTotals } from "@/app/components/team-components/team-turn-card";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));

  const preppedTeams = useMemo(
    () => gameData && gameData.teams.map((team) => computeTotals(team)),
    [gameData],
  );

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  if (isLoading || !gameData || !preppedTeams) {
    return <GameLoadingSpinner />;
  }

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      <div className="flex flex-col gap-2 flex-1 min-w-80">
        <GameCard game={gameData.game} className="w-full" />
        <TeamList
          game={gameData.game}
          teams={gameData.teams}
          className="w-full flex-1 min-h-0"
          editTurn={gameData.game.started}
        />
        {!gameData.game.started && gameData.teams.length > 0 && (
          <GameStartDialogue game={gameData.game} className="w-full" />
        )}
        <Link
          className="button"
          href={`/referee/games/${gameData.game.id}/assistant`}
        >
          Aputuomaritilaan
        </Link>
        {gameData.game.started && (
          <Link
            className="button"
            href={`/referee/games/${gameData.game.id}/teams/all`}
          >
            Näytä kaikki vuorot
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-3 w-0 min-h-0">
        <GameTeamTurnsList teams={preppedTeams} className="max-h-1/2" />
        <GameTeamTurnsList
          teams={preppedTeams}
          collect
          className="flex-grow-2 min-h-0"
        />
      </div>
    </div>
  );
}
