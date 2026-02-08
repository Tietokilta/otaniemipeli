import { useMemo, useState } from "react";
import { HorizontalList } from "../generic-list-components";
import IeTurnCard, { DELIVERY_WARNING_SEC, TurnWithTeam } from "./ie-turn-card";
import { setDrinkPrepStatus } from "@/utils/fetchers";

const RECENTLY_FINISHED_TIMEOUT_MS = 5000;

export default function IeTurnsList({
  teams,
  wrap,
}: {
  teams: GameTeam[];
  wrap: boolean;
}): JSX.Element {
  const [recentlyChanged, setRecentlyChanged] = useState(
    () => new Map<number, number | boolean>(),
  );

  const handleStateChange = async (
    turn: TurnWithTeam,
    newState: DrinkPrepStatus,
  ) => {
    const turnId = turn.turn_id;

    // Clear any existing timeout for this turn
    const existingTimeout = recentlyChanged.get(turnId);
    if (typeof existingTimeout === "number") {
      window.clearTimeout(existingTimeout);
    }

    setRecentlyChanged((prev) => new Map(prev).set(turnId, true));

    await setDrinkPrepStatus(turnId, newState);

    const timeout = window.setTimeout(() => {
      setRecentlyChanged((prev) => {
        const next = new Map(prev);
        next.delete(turnId);
        return next;
      });
    }, RECENTLY_FINISHED_TIMEOUT_MS);
    setRecentlyChanged((prev) => new Map(prev).set(turnId, timeout));
  };

  const [activeJobs, readyJobs] = useMemo(() => {
    const allTurns =
      teams.flatMap((team) =>
        team.turns
          .filter((turn) => turn.confirmed_at)
          .map((turn): TurnWithTeam => ({ ...turn, team })),
      ) || [];
    const isActive = (turn: TurnWithTeam) =>
      !turn.mixed_at || recentlyChanged.has(turn.turn_id);
    return [
      allTurns.filter(isActive).toSorted((a, b) => {
        // Sort by confirmation time, oldest first
        return (
          new Date(a.confirmed_at ?? 0).getTime() -
          new Date(b.confirmed_at ?? 0).getTime()
        );
      }),
      allTurns
        .filter((turn) => !isActive(turn))
        .toSorted((a, b) => {
          // If a delivery is delayed, prioritize it in the ready list
          const aDelayed =
            !a.delivered_at &&
            Date.now() - new Date(a.mixed_at!).getTime() >
              DELIVERY_WARNING_SEC * 1000;
          const bDelayed =
            !b.delivered_at &&
            Date.now() - new Date(b.mixed_at!).getTime() >
              DELIVERY_WARNING_SEC * 1000;
          if (aDelayed !== bDelayed) return aDelayed ? -1 : 1;

          // Sort by finishing time, newest first
          return (
            new Date(b.mixed_at ?? 0).getTime() -
            new Date(a.mixed_at ?? 0).getTime()
          );
        }),
    ] as const;
  }, [teams, recentlyChanged]);

  return (
    <>
      <div className={`flex flex-1 ${wrap ? "min-h-0" : ""}`}>
        <div className="writing-vertical text-xl font-bold mr-2 mt-3">
          Työjono
        </div>
        <HorizontalList
          className={`content-start ${wrap ? "flex-wrap overflow-y-scroll min-h-0" : ""}`}
        >
          {activeJobs.map((turn) => (
            <IeTurnCard
              key={turn.turn_id}
              turn={turn}
              onStateChange={(state) => handleStateChange(turn, state)}
            />
          ))}
        </HorizontalList>
      </div>
      <div className="flex">
        <div className="writing-vertical text-xl font-bold mr-2 mt-3">
          Valmiit
        </div>
        <HorizontalList>
          {readyJobs.map((turn) => (
            <IeTurnCard key={turn.turn_id} turn={turn} />
          ))}
        </HorizontalList>
      </div>
    </>
  );
}
