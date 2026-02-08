"use client";

import { TurnWithTeam } from "@/app/components/drink-components/ie-turn-card";
import IeTurnsList from "@/app/components/drink-components/ie-turns-list";
import GameCard from "@/app/components/game-components/game-card";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import GameTeamTurnsList from "@/app/components/team-components/game-team-turns-list";
import { computeTotals } from "@/app/components/team-components/team-turn-card";
import { useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import { use, useMemo, useState } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const { game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));
  const [showAllTurns, setShowAllTurns] = useState(false);

  const preppedTeams = useMemo(
    () => gameData && gameData.teams.map((team) => computeTotals(team)),
    [gameData],
  );

  const activeDeliveries = useMemo(
    () =>
      gameData?.teams
        .flatMap((team) => team.turns)
        .filter((turn) => turn.mixed_at && !turn.delivered_at)
        .toSorted((a, b) => {
          // Sort by mixed time, oldest first
          return (
            new Date(a.mixed_at ?? 0).getTime() -
            new Date(b.mixed_at ?? 0).getTime()
          );
        }) || [],
    [gameData],
  );

  if (isLoading) {
    return <GameLoadingSpinner />;
  }

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  if (!gameData || !preppedTeams) {
    return <GameLoadingSpinner />;
  }

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      <div className="flex flex-col gap-2">
        <GameCard game={gameData.game} />
        <div className="flex-1" />
        <button
          className="button"
          type="button"
          onClick={() => setShowAllTurns((prev) => !prev)}
        >
          {showAllTurns ? "Piilota kokonaistilanne" : "Näytä kokonaistilanne"}
        </button>
      </div>
      <div className="flex flex-col gap-2 flex-2 w-0">
        <IeTurnsList teams={gameData.teams} wrap={!showAllTurns} />
        {showAllTurns && (
          <GameTeamTurnsList
            teams={preppedTeams}
            collect
            className="flex-grow-2"
          />
        )}
      </div>
    </div>
  );
}
