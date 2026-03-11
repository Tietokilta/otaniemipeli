import { useEffect, useMemo, useState } from "react";
import { HorizontalList } from "../generic-list-components";
import IeTurnCard, { DELIVERY_WARNING_SEC, TurnWithTeam } from "./ie-turn-card";

/** Read-only list of turns that have been mixed but not yet delivered. */
export default function DeliveryTurnsList({
  teams,
  drinksData,
}: {
  teams: GameTeam[];
  drinksData: DrinksIngredients | null;
}): JSX.Element {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const pendingDeliveries = useMemo(() => {
    return teams
      .flatMap((team) =>
        team.turns
          .filter((turn) => turn.mixed_at && !turn.delivered_at)
          .map((turn): TurnWithTeam => ({ ...turn, team })),
      )
      .toSorted((a, b) => {
        // Prioritize delayed deliveries
        const aDelayed =
          now - new Date(a.mixed_at!).getTime() > DELIVERY_WARNING_SEC * 1000;
        const bDelayed =
          now - new Date(b.mixed_at!).getTime() > DELIVERY_WARNING_SEC * 1000;
        if (aDelayed !== bDelayed) return aDelayed ? -1 : 1;

        // Sort by mix time, oldest first
        return (
          new Date(a.mixed_at!).getTime() - new Date(b.mixed_at!).getTime()
        );
      });
  }, [teams, now]);

  return (
    <div className="flex flex-1 min-h-0">
      <div className="writing-vertical text-xl font-bold mr-2 mt-3">
        Toimitettavat
      </div>
      <HorizontalList className="content-start flex-wrap overflow-y-scroll min-h-0">
        {pendingDeliveries.map((turn) => (
          <IeTurnCard key={turn.turn_id} turn={turn} drinksData={drinksData} />
        ))}
      </HorizontalList>
    </div>
  );
}
