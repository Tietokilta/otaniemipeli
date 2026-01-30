"use client";
import { use, useEffect, useMemo, useState } from "react";
import { HorizontalList } from "@/app/components/generic-list-components";
import TeamTurnCard from "@/app/components/team-components/team-turn-card";
import { useSocket } from "@/app/template";
import { usePathname } from "next/navigation";
import { getBoardPlaces } from "@/utils/fetchers";
import { useGameData } from "@/app/hooks/useGameData";
import {
  GameLoadingSpinner,
  GameErrorDisplay,
} from "@/app/components/game-components/game-loading-states";

export default function Page({
  params,
}: {
  params: Promise<{ team_id: string; game_id: string }>;
}) {
  const { team_id, game_id } = use(params);
  const socket = useSocket();
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));

  const team = useMemo(
    () =>
      gameData?.teams.find((t) => t.team.team_id === Number(team_id)) || null,
    [gameData, team_id],
  );

  const [board, setBoard] = useState<BoardPlaces | undefined>();
  useEffect(() => {
    // get board places
    if (gameData) {
      let cancelled = false;
      getBoardPlaces(gameData.game.board_id).then((b) => {
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
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Team {team_id} Details</h1>
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
    </div>
  );
}
