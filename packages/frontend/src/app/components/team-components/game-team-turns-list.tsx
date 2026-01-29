import TeamTurnCard from "@/app/components/team-components/team-turn-card";
import { HorizontalList } from "@/app/components/generic-list-components";
import React from "react";

export default function GameTeamTurnsList({
  gameData,
  collect = false,
  className,
}: {
  gameData: GameData;
  collect?: boolean;
  className?: string;
}): JSX.Element {
  const get_min_dice = (turn: Turn): number => {
    return Math.min(turn.dice1, turn.dice2);
  };
  return (
    <HorizontalList className={className}>
      {gameData.teams
        .sort((a, b) => {
          if (collect) {
            return (
              a.turns.reduce((acc, turn) => acc + get_min_dice(turn), 0) -
              b.turns.reduce((acc, turn) => acc + get_min_dice(turn), 0)
            );
          }
          const aLast = a.turns[a.turns.length - 1];
          const bLast = b.turns[b.turns.length - 1];

          // put items with no turns always last
          if (!aLast && !bLast) return 0;
          if (!aLast) return 1;
          if (!bLast) return -1;

          const aFinished = aLast.end_time != null;
          const bFinished = bLast.end_time != null;

          // finished first
          if (aFinished !== bFinished) {
            return aFinished ? -1 : 1;
          }

          // same group → sort by correct time DESC
          const aTime = aFinished
            ? new Date(aLast.end_time!).getTime()
            : new Date(aLast.start_time).getTime();

          const bTime = bFinished
            ? new Date(bLast.end_time!).getTime()
            : new Date(bLast.start_time).getTime();

          return aTime - bTime;
        })
        .map((team: GameTeam) => {
          return (
            <TeamTurnCard
              key={team.team.team_id}
              team={team}
              collect={collect}
              teamTurns={team.turns}
            />
          );
        })}
    </HorizontalList>
  );
}
