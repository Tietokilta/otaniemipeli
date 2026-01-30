import TeamTurnCard from "@/app/components/team-components/team-turn-card";
import { HorizontalList } from "@/app/components/generic-list-components";

export default function GameTeamTurnsList({
  gameData,
  collect = false,
  className,
}: {
  gameData: GameData;
  /** Whether to collect all earned drinks, if false only shows active turns (undrunk drinks) */
  collect?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div className={`flex ${className}`}>
      <div className="writing-vertical text-xl font-bold mr-2 mt-3">
        {collect ? "Kokonaissaldot" : "Aktiiviset vuorot"}
      </div>
      <HorizontalList>
        {gameData.teams
          .toSorted((a, b) => {
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
    </div>
  );
}
