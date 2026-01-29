"use client";
import { useEffect, useState } from "react";
import {
  HorizontalList,
  VerticalList,
} from "@/app/components/generic-list-components";
import TeamTurnCard from "@/app/components/team-components/team-turn-card";
import { useSocket } from "@/app/template";
import { usePathname } from "next/navigation";
import { getBoardPlaces } from "@/utils/fetchers";
import { useGameData } from "@/app/hooks/useGameData";
import {
  GameLoadingSpinner,
  GameErrorDisplay,
} from "@/app/components/game-components/game-loading-states";

export default function Page() {
  const socket = useSocket();
  const path = usePathname();
  console.log(path);
  const gameId = Number(path.split("/")[3]);
  console.log(gameId, path.split("/")[3]);
  const { gameData, error, isLoading } = useGameData(socket, gameId);
  const [teams, setTeams] = useState<GameTeam[] | null>(null);
  const [board, setBoard] = useState<BoardPlaces | undefined>();

  useEffect(() => {
    if (gameData) {
      setTeams(gameData.teams);
    }
  }, [gameData]);
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
    <div className="p-4 max-h-[80dvh] overflow-scroll">
      {teams && (
        <VerticalList className="gap-4">
          {teams.map((team: GameTeam) => (
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
                      teamTurns={[turn]}
                      key={turn.turn_id}
                      board={board}
                    />
                  ))}
              </HorizontalList>
            </div>
          ))}
        </VerticalList>
      )}
    </div>
  );
}
