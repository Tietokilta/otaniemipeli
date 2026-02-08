import { useMemo } from "react";
import { TurnDrinksList } from "./drink-card";
import { setDrinkPrepStatus } from "@/utils/fetchers";

function SecretaryTurnCard({ turn }: { turn: Turn }) {
  const handleDelivered = async () => {
    await setDrinkPrepStatus(turn.turn_id, "Delivered");
  };

  return (
    <div className="box p-0 flex">
      <TurnDrinksList drinks={turn.drinks.drinks} className="flex-1" />
      {turn.mixed_at && !turn.delivered_at && (
        <button type="button" className="button" onClick={handleDelivered}>
          Saapui
        </button>
      )}
    </div>
  );
}

export default function SecretaryTurnsList({
  team,
}: {
  team: GameTeam;
}): JSX.Element {
  const activeDrinks = useMemo(
    () =>
      team.turns
        .filter((turn) => turn.confirmed_at && !turn.end_time)
        .toSorted((a, b) => {
          // Sort by confirmation time, oldest first
          return (
            new Date(a.confirmed_at ?? 0).getTime() -
            new Date(b.confirmed_at ?? 0).getTime()
          );
        }),
    [team],
  );

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
      {activeDrinks.map((turn) => (
        <SecretaryTurnCard key={turn.turn_id} turn={turn} />
      ))}
      {activeDrinks.length === 0 && (
        <p className="text-center text-lg mt-4">Ei aktiivisia juomia.</p>
      )}
    </div>
  );
}
