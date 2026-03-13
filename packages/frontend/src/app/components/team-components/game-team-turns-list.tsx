import { HorizontalList } from "@/app/components/generic-list-components";
import TeamTurnCard, {
  GameTeamWithTotals,
} from "@/app/components/team-components/team-turn-card";
import type { BoardPlacesWithDistances } from "@/app/hooks/useGameData";
import {
  findAssistantRefereeTurnId,
  getTurnNeedingAssistantReferee,
  needsDice,
  needsYkkonen,
} from "@/utils/turns";
import { useMemo } from "react";

export function usePreppedTeams(
  teams: GameTeamWithTotals[],
  {
    collect = false,
    progress = false,
    assistant = false,
    moral = false,
    board,
  }: {
    /** Whether to collect all earned drinks, if false only shows active turns (undrunk drinks) */
    collect?: boolean;
    /** Whether to sort teams by their progress on the board */
    progress?: boolean;
    /** Whether the list is for the assistant referee, which has different sorting logic */
    assistant?: boolean;
    /** Whether the list is for moral victory, which has different sorting logic */
    moral?: boolean;
    board?: BoardPlacesWithDistances;
  },
) {
  return useMemo(
    () =>
      teams.toSorted((a, b) => {
        if (moral) {
          if (b.team.moral_loss_level !== a.team.moral_loss_level) {
            return a.team.moral_loss_level - b.team.moral_loss_level;
          }
        }

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

        if (progress && board) {
          // In progress mode, sort teams by their closest distance to the end (shortest distance first)
          const aPlaceNumber = a.turns.findLast(
            (turn) => turn.place_number != null,
          )?.place_number;
          const bPlaceNumber = b.turns.findLast(
            (turn) => turn.place_number != null,
          )?.place_number;
          const aDistance = board.places.find(
            (place) => place.place_number === aPlaceNumber,
          )?.distanceToEnd;
          const bDistance = board.places.find(
            (place) => place.place_number === bPlaceNumber,
          )?.distanceToEnd;

          if (aDistance != null && bDistance != null) {
            return aDistance - bDistance;
          }
          if (aDistance != null) return -1;
          if (bDistance != null) return 1;
        }

        // teams with no turns go last
        if (!a.turns.length) return 1;
        if (!b.turns.length) return -1;

        // teams playing ykköstä (unconfirmed at ykkonen place) go first for all referees
        const aYkkonen = a.turns.some(needsYkkonen);
        const bYkkonen = b.turns.some(needsYkkonen);
        if (aYkkonen && !bYkkonen) return -1;
        if (bYkkonen && !aYkkonen) return 1;

        if (assistant) {
          // Assistant referee logic.

          // Find unconfirmed turn
          const aUnconfirmed = getTurnNeedingAssistantReferee(a);
          const bUnconfirmed = getTurnNeedingAssistantReferee(b);

          if (!aUnconfirmed) {
            if (!bUnconfirmed) {
              // for confirmed teams, sort teams by their last confirmed turn (newest first)
              const aLast = a.turns
                .map((turn) => new Date(turn.confirmed_at!).getTime())
                .reduce((prev, curr) => Math.max(prev, curr), 0);
              const bLast = b.turns
                .map((turn) => new Date(turn.confirmed_at!).getTime())
                .reduce((prev, curr) => Math.max(prev, curr), 0);
              return bLast - aLast;
            }
            // a has no unconfirmed turns, b has unconfirmed turn -> b goes first
            return 1;
          }
          if (!bUnconfirmed) {
            // b has no unconfirmed turns, a has unconfirmed turn -> a goes first
            return -1;
          }

          // Sort teams by age of unconfirmed turn (oldest first)
          return (
            new Date(aUnconfirmed.start_time).getTime() -
            new Date(bUnconfirmed.start_time).getTime()
          );
        }

        // Main referee logic.

        // teams awaiting dice go next
        const aAwaitingDice = a.turns.some(needsDice);
        const bAwaitingDice = b.turns.some(needsDice);
        if (aAwaitingDice && !bAwaitingDice) return -1;
        if (bAwaitingDice && !aAwaitingDice) return 1;

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
      }),
    [teams, collect, moral, progress, board, assistant],
  );
}

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
  // Find the first turn awaiting assistant referee input
  const assistantRefereeTurnId = useMemo(
    () => findAssistantRefereeTurnId(teams),
    [teams],
  );

  const sortedTeams = usePreppedTeams(teams, { collect, assistant });

  const teamCards = useMemo(
    () =>
      sortedTeams.map((team) => {
        return (
          <TeamTurnCard
            key={team.team.team_id}
            team={team}
            board={board}
            assistantRefereeTurnId={assistantRefereeTurnId}
            interactive
            collect={collect}
            assistant={assistant}
            teamTurns={team.turns}
          />
        );
      }),
    [sortedTeams, board, assistantRefereeTurnId, collect, assistant],
  );

  return (
    <div className={`flex ${className}`}>
      <div className="writing-vertical text-xl font-bold mr-2 mt-3">
        {collect ? "Moraalisen voiton tilanne" : "Aktiiviset vuorot"}
      </div>
      <HorizontalList>{teamCards}</HorizontalList>
    </div>
  );
}
