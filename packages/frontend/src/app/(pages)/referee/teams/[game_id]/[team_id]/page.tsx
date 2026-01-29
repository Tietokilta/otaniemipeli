"use client";
import { use, useEffect, useState } from "react";
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
  params: Promise<{ team_id: string }>;
}) {
  const { team_id } = use(params);
  const socket = useSocket();
  const path = usePathname();
  const gameId = Number(path.split("/")[3]);
  const { gameData, error, isLoading } = useGameData(socket, gameId);
  const [team, setTeam] = useState<GameTeam | null>(null);
  const [board, setBoard] = useState<BoardPlaces | undefined>();

  useEffect(() => {
    if (gameData) {
      const teamId = Number(team_id);
      setTeam(gameData.teams.find((t) => t.team.team_id === teamId) || null);
    }
  }, [gameData, team_id]);
  useEffect(() => {
    // get board places
    if (gameData) {
      getBoardPlaces("" + gameData?.game.board_id).then((b) => {
        setBoard(b);
      });
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
