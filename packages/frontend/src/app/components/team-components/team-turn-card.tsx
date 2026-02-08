import PlaceCard from "@/app/components/board-components/place-card";
import { TurnDrinkCard } from "@/app/components/drink-components/drink-card";
import { VerticalList } from "@/app/components/generic-list-components";
import { EditTeamTurnDialogue } from "@/app/components/team-components/edit-team-turn-dialogue";
import { formatShortDurationMs, TurnStatus } from "@/app/components/time-since";
import { useMemo, useState } from "react";

export type GameTeamWithTotals = GameTeam & {
  // turn_ids: number[];
  normal_turns: number;
  penalties: number;
  total_drinks: number;
  total_active: number;
  combined_time: number;
  // dice_throws: [number, number][];
  drinks: TurnDrink[];
  active_drinks: TurnDrink[];
};

const getTurnDuration = (turns: Turn[]): number[] => {
  return turns.map((turn: Turn) => {
    const start = new Date(turn.start_time);
    const end = turn.end_time ? new Date(turn.end_time) : new Date();
    return end.getTime() - start.getTime();
  });
};

function sumByDrinkId(rows: TurnDrink[]) {
  const byId = new Map<number, TurnDrink>();
  let total_drinks = 0;

  for (const { drink, n } of rows) {
    total_drinks += n;
    const existing = byId.get(drink.id);
    if (existing) {
      existing.n += n; // add up
    } else {
      byId.set(drink.id, { drink, n });
    }
  }
  return { drinks: Array.from(byId.values()), total_drinks };
}

export function computeTotals(team: GameTeam): GameTeamWithTotals {
  // In non-collect mode, only show currently active turn(s). In collect mode, show all turns.
  const activeTurns = team.turns.filter((t) => !t.end_time);
  const penalties = team.turns.filter((t) => t.penalty).length;
  const totalDrinks = sumByDrinkId(team.turns.flatMap((t) => t.drinks.drinks));
  const activeDrinks = sumByDrinkId(
    activeTurns.flatMap((t) => t.drinks.drinks),
  );
  return {
    ...team,
    // turn_ids: applicableTurns.map((t) => t.turn_id),
    normal_turns: team.turns.length - penalties,
    penalties,
    combined_time: getTurnDuration(team.turns).reduce((a, b) => a + b, 0),
    // dice_throws: applicableTurns.map(
    //   (t) => [t.dice1, t.dice2] as [number, number],
    // ),
    ...totalDrinks,
    active_drinks: activeDrinks.drinks,
    total_active: activeDrinks.total_drinks,
  };
}

export default function TeamTurnCard({
  team,
  collect,
  teamTurns,
  board,
}: {
  team: GameTeamWithTotals;
  collect?: boolean;
  teamTurns: Turn[] | Turn;
  board?: BoardPlaces;
}): JSX.Element {
  const singleTurn = !Array.isArray(teamTurns);
  if (!Array.isArray(teamTurns)) teamTurns = [teamTurns];

  const lastTurn = teamTurns[teamTurns.length - 1];
  const lastThrow = teamTurns.findLast((t) => t.dice1 != null);
  const [showDialogue, setShowDialogue] = useState<boolean>(false);

  const location = useMemo<BoardPlace | undefined>(() => {
    if (!board || teamTurns.length === 0) return undefined;
    return board.places.find((p) => p.place_number === teamTurns[0].location);
  }, [board, teamTurns]);

  const onClickAction = collect ? undefined : () => setShowDialogue(true);

  if (!lastTurn) {
    return (
      <div className="box">
        <h2 className="text-xl font-bold mb-2">{team.team.team_name}</h2>
        <p>Ei vielä vuoroja</p>
      </div>
    );
  }

  return (
    <div
      key={team.team.team_id}
      className={`${collect ? "box" : "box-hover cursor-pointer"} ${!collect && lastTurn.end_time ? "bg-slime-600/20" : ""} h-full w-80 shrink-0 flex flex-col min-h-0`}
      onClick={onClickAction}
    >
      {showDialogue && (
        <EditTeamTurnDialogue team={team} open setOpen={setShowDialogue} />
      )}
      <h2 className="text-xl font-bold mb-1">{team.team.team_name}</h2>
      {collect ? (
        <>
          <p>
            {team.normal_turns} vuoroa, {team.penalties} sakkoa
          </p>
          <p>Yhteensä {team.total_drinks} juomaa</p>
          <p>Kokonaisaika: {formatShortDurationMs(team.combined_time)}</p>
        </>
      ) : (
        <>
          <TurnStatus turn={lastTurn} />
          {lastThrow?.dice1 != null ? (
            <p>
              Heitot: {lastThrow.dice1} + {lastThrow.dice2}
            </p>
          ) : singleTurn ? (
            <p>Sakkovuoro, ei heittoja</p>
          ) : (
            <p>Ei vielä heittoja</p>
          )}
        </>
      )}
      {!collect &&
        (location ? (
          <PlaceCard place={location} showInfo={false} />
        ) : team.location ? (
          <PlaceCard place={team.location} showInfo={false} />
        ) : (
          <p className="text-juvu-puna">Place not found</p>
        ))}
      <VerticalList className="gap-2 px-2 py-4 overflow-y-auto">
        {(collect ? team.drinks : team.active_drinks)
          .sort((da, db) => db.n - da.n)
          .map((drink) => (
            <TurnDrinkCard key={`${drink.drink.id}`} drink={drink} />
          ))}
      </VerticalList>
    </div>
  );
}
