import { usePreppedTeams } from "@/app/components/team-components/game-team-turns-list";
import { GameTeamWithTotals } from "@/app/components/team-components/team-turn-card";
import type { BoardPlacesWithDistances } from "@/app/hooks/useGameData";
import { useMemo } from "react";

export function CasterTeamsList({
  teams,
  mode,
  board,
}: {
  teams: GameTeamWithTotals[];
  mode: "moral" | "progress";
  board?: BoardPlacesWithDistances;
}) {
  const sortedTeams = usePreppedTeams(teams, {
    collect: mode === "moral",
    progress: mode === "progress",
    moral: mode === "moral",
    board,
  });

  const distances = useMemo(() => {
    if (!board) return null;
    return sortedTeams.map((team) => {
      const placeNumber = team.turns.findLast(
        (turn) => turn.place_number != null,
      )?.place_number;
      const place = board.places.find((p) => p.place_number === placeNumber);
      return place ? place.distanceToEnd : Infinity;
    });
  }, [board, sortedTeams]);

  return (
    <div className="w-full flex flex-col gap-4">
      {sortedTeams.map((team, pos) => (
        <div
          key={team.team.team_id}
          className="
            flex
            items-baseline
            gap-6
            border-2
            border-tertiary-500
            bg-primary-100/75
            rounded-3xl
            py-3
            px-12
            caster-flip"
          style={{ animationDelay: `${(1 + pos) * 125}ms` }}
        >
          <div className="text-4xl w-16 text-secondary-900 font-bold">
            {pos + 1}.
          </div>
          <h3 className="text-4xl w-1/5 text-left">{team.team.team_name}</h3>
          <div className="text-4xl flex-1 text-secondary-900 font-bold">
            {mode === "moral"
              ? "I".repeat(team.total_drunk)
              : `${distances?.[pos]} ruutua maaliin`}
          </div>
          {team.team.moral_loss_level > 0 && (
            <div className="text-3xl text-tertiary-900">
              🤮 {team.team.moral_loss_level}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
