"use client";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import {
  HorizontalList,
  VerticalList,
} from "@/app/components/generic-list-components";
import TeamTurnCard, {
  computeTotals,
} from "@/app/components/team-components/team-turn-card";
import { useGameBoard, useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import Link from "next/link";
import { use, useMemo } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const socket = useSocket();
  const { game_id } = use(params);
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));
  const board = useGameBoard(gameData);

  const preppedTeams = useMemo(
    () => gameData && gameData.teams.map((team) => computeTotals(team)),
    [gameData],
  );

  if (isLoading || !preppedTeams) {
    return <GameLoadingSpinner />;
  }

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  return (
    <>
      <nav className="flex items-center gap-4 mb-4">
        <Link href={`/referee/games/${game_id}`} className="button">
          Takaisin peliin
        </Link>
        <h1 className="text-2xl font-bold mb-0 pb-0">
          Kaikkien joukkueiden vuorot
        </h1>
      </nav>
      <div className="flex-1 overflow-scroll">
        <VerticalList className="gap-4">
          {preppedTeams.map((team) => (
            <div className="flex h-[30dvh]" key={team.team.team_id}>
              <div className="pr-4 mr-4 border-r-2 border-tertiary-500">
                <TeamTurnCard
                  team={team}
                  teamTurns={team.turns}
                  collect={true}
                />
              </div>
              <HorizontalList>
                {team &&
                  team.turns.map((turn) => (
                    <TeamTurnCard
                      team={team}
                      teamTurns={turn}
                      key={turn.turn_id}
                      board={board}
                    />
                  ))}
              </HorizontalList>
            </div>
          ))}
        </VerticalList>
      </div>
    </>
  );
}
