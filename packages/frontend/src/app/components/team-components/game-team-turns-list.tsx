import TeamTurnCard, {
  GameTeamWithTotals,
} from "@/app/components/team-components/team-turn-card";
import { HorizontalList } from "@/app/components/generic-list-components";
import { useMemo } from "react";

export default function GameTeamTurnsList({
  teams,
  board,
  collect = false,
  assistant = false,
  className,
}: {
  teams: GameTeamWithTotals[];
  board?: BoardPlaces;
  /** Whether to collect all earned drinks, if false only shows active turns (undrunk drinks) */
  collect?: boolean;
  assistant?: boolean;
  className?: string;
}): JSX.Element {
  const sortedTeams = useMemo(
    () =>
      teams
        .filter(
          (team) =>
            !assistant ||
            team.turns.some((turn) => turn.thrown_at && !turn.confirmed_at),
        )
        .toSorted((a, b) => {
          if (collect) {
            // In collect mode, sort teams by drunk drinks (most drinks first),
            // then total drinks awarded, then by total turn time (shortest time first)
            if (b.total_drunk !== a.total_drunk) {
              return b.total_drunk - a.total_drunk;
            }
            if (b.total_drinks !== a.total_drinks) {
              return b.total_drinks - a.total_drinks;
            }
            return a.combined_time - b.combined_time;
          }

          if (assistant) {
            // In assistant mode, sort teams by age of unconfirmed turn (oldest first)
            const aUnconfirmed = a.turns.find(
              (turn) => turn.thrown_at && !turn.confirmed_at,
            )!;
            const bUnconfirmed = b.turns.find(
              (turn) => turn.thrown_at && !turn.confirmed_at,
            )!;

            return (
              new Date(aUnconfirmed.thrown_at!).getTime() -
              new Date(bUnconfirmed.thrown_at!).getTime()
            );
          }

          // teams with no turns go last
          if (!a.turns.length) return 1;
          if (!b.turns.length) return -1;

          // find oldest non-ready turn
          const aNonReady = a.turns.filter((turn) => !turn.end_time);
          const bNonReady = b.turns.filter((turn) => !turn.end_time);

          if (!aNonReady.length) {
            if (!bNonReady.length) {
              // for ready teams, sort teams by time their last turn was finished (oldest team to clear their turns first)
              const aLast = a.turns
                .map((turn) => new Date(turn.end_time!).getTime())
                .reduce((prev, curr) => Math.max(prev, curr));
              const bLast = b.turns
                .map((turn) => new Date(turn.end_time!).getTime())
                .reduce((prev, curr) => Math.max(prev, curr));
              return aLast - bLast;
            }
            // a is ready, b is non-ready -> a goes first
            return -1;
          }
          if (!bNonReady.length) {
            // b is ready, a is non-ready -> b goes first
            return 1;
          }
          // both non-ready, sort teams by time their oldest non-ready turn was started (oldest turn starter first)
          const aFirst = aNonReady
            .map((turn) => new Date(turn.start_time).getTime())
            .reduce((prev, curr) => Math.min(prev, curr));
          const bFirst = bNonReady
            .map((turn) => new Date(turn.start_time).getTime())
            .reduce((prev, curr) => Math.min(prev, curr));
          return aFirst - bFirst;
        })
        .map((team) => {
          return (
            <TeamTurnCard
              key={team.team.team_id}
              team={team}
              board={board}
              collect={collect}
              assistant={assistant}
              teamTurns={team.turns}
            />
          );
        }),
    [teams, board, collect, assistant],
  );

  return (
    <div className={`flex ${className}`}>
      <div className="writing-vertical text-xl font-bold mr-2 mt-3">
        {assistant
          ? "Vahvistamattomat"
          : collect
            ? "Moraalisen voiton tilanne"
            : "Aktiiviset vuorot"}
      </div>
      <HorizontalList>{sortedTeams}</HorizontalList>
    </div>
  );
}
