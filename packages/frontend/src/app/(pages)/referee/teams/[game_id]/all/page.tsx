"use client";
import {
  GameErrorDisplay,
  GameLoadingSpinner,
} from "@/app/components/game-components/game-loading-states";
import {
  HorizontalList,
  VerticalList,
} from "@/app/components/generic-list-components";
import TeamTurnCard from "@/app/components/team-components/team-turn-card";
import { useGameData } from "@/app/hooks/useGameData";
import { useSocket } from "@/app/template";
import { getBoardPlaces } from "@/utils/fetchers";
import { use, useEffect, useState } from "react";

export default function Page({
  params,
}: {
  params: Promise<{ game_id: string }>;
}) {
  const socket = useSocket();
  const { game_id } = use(params);
  const { gameData, error, isLoading } = useGameData(socket, Number(game_id));
  const [board, setBoard] = useState<BoardPlaces | undefined>();

  useEffect(() => {
    // get board places
    if (gameData) getBoardPlaces(gameData.game.board.id).then(setBoard);
  }, [gameData]);
  console.log("BOARD IS", board);

  if (isLoading) {
    return <GameLoadingSpinner />;
  }

  if (error) {
    return <GameErrorDisplay error={error} />;
  }

  return (
    <div className="p-4 max-h-[80dvh] overflow-scroll">
      {gameData?.teams && (
        <VerticalList className="gap-4">
          {gameData.teams.map((team: GameTeam) => (
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
