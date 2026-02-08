"use client";

import React, { use, useMemo } from "react";
import { useSocket } from "@/app/template";
import GameTeamTurnsList from "@/app/components/team-components/game-team-turns-list";
import { useGameData } from "@/app/hooks/useGameData";
import {
  GameLoadingSpinner,
  GameErrorDisplay,
} from "@/app/components/game-components/game-loading-states";
import { computeTotals } from "@/app/components/team-components/team-turn-card";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, parseInt(id));

  const preppedTeams = useMemo(
    () => gameData && gameData.teams.map((team) => computeTotals(team)),
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
    <div className="gap-4 4 h-[85dvh] box">
      <h1>{gameData.game.name}</h1>
      <div className="flex flex-col gap-2 flex-3 max-h-[66dvh]">
        <GameTeamTurnsList teams={preppedTeams} className="max-h-1/2" />
        <GameTeamTurnsList
          teams={preppedTeams}
          collect
          className="flex-grow-2"
        />
      </div>
    </div>
  );
}
