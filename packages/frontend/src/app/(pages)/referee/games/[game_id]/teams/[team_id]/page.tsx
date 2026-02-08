"use client";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import { HorizontalList } from "@/app/components/generic-list-components";
import TeamTurnCard, {
  computeTotals,
} from "@/app/components/team-components/team-turn-card";
import { useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import { getBoardPlaces } from "@/utils/fetchers";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ team_id: string; game_id: string }>;
}) {
  const { team_id, game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));

  const team = useMemo(() => {
    const team = gameData?.teams.find(
      (t) => t.team.team_id === Number(team_id),
    );
    return team && computeTotals(team);
  }, [gameData, team_id]);

  const [board, setBoard] = useState<BoardPlaces | undefined>();
  useEffect(() => {
    // get board places
    if (gameData) {
      let cancelled = false;
      getBoardPlaces(gameData.game.board.id).then((b) => {
        if (!cancelled) setBoard(b);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [gameData]);

  if (isLoading) {
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
          Joukkueen{" "}
          <span className="text-primary-900">{team?.team.team_name}</span>{" "}
          vuorot
        </h1>
      </nav>
      {team ? (
        <div className="flex h-[30dvh]">
          <div className="pr-4 mr-4 border-r-2 border-tertiary-500">
            <TeamTurnCard team={team} teamTurns={team.turns} collect={true} />
          </div>
          <HorizontalList>
            {team &&
              team.turns.map((turn) => (
                <TeamTurnCard
                  team={team}
                  teamTurns={[turn]}
                  key={turn.turn_id}
                  board={board}
                />
              ))}
          </HorizontalList>
        </div>
      ) : (
        <p>Loading game data...</p>
      )}
    </>
  );
}
