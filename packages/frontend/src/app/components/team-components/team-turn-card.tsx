import PlaceCard from "@/app/components/board-components/place-card";
import { TurnDrinkCard } from "@/app/components/drink-components/drink-card";
import { VerticalList } from "@/app/components/generic-list-components";
import { EditTeamTurnDialogue } from "@/app/components/team-components/edit-team-turn-dialogue";
import {
  formatShortDurationMs,
  TurnElapsed,
} from "@/app/components/time-since";
import { useMemo, useState } from "react";

interface TurnCombined {
  turn_ids: number[];
  turns: number;
  penalties: number;
  total_drinks: number;
  combined_time: string;
  team_id: number;
  dice_throws: [number, number][];
  drinks: TurnDrink[];
}

const getTurnDuration = (turns: Turn[]): number[] => {
  return turns.map((turn: Turn) => {
    const start = new Date(turn.start_time);
    const end = turn.end_time ? new Date(turn.end_time) : new Date();
    return end.getTime() - start.getTime();
  });
};

export function sumByDrinkId(rows: TurnDrink[]) {
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

export default function TeamTurnCard({
  team,
  collect,
  teamTurns,
  board,
}: {
  team: GameTeam;
  collect?: boolean;
  teamTurns: Turn[];
  board?: BoardPlaces;
}): JSX.Element {
  const lastTurn = teamTurns[teamTurns.length - 1];
  const [showDialogue, setShowDialogue] = useState<boolean>(false);

  const location = useMemo<BoardPlace | undefined>(() => {
    if (!board || teamTurns.length === 0) return undefined;
    return board.places.find((p) => p.place_number === teamTurns[0].location);
  }, [board, teamTurns]);

  // TODO: handle penalty turns
  const combinedTurns = useMemo((): TurnCombined | null => {
    if (!collect) return null;
    const penalties = teamTurns.filter((t) => t.penalty).length;
    return {
      turn_ids: teamTurns.map((t) => t.turn_id),
      turns: teamTurns.length - penalties,
      penalties,
      combined_time: formatShortDurationMs(
        getTurnDuration(teamTurns).reduce((a, b) => a + b, 0),
      ),
      team_id: team.team.team_id,
      dice_throws: teamTurns.map((t) => [t.dice1, t.dice2] as [number, number]),
      ...sumByDrinkId(teamTurns.flatMap((t) => t.drinks.drinks)),
    };
  }, [collect, team, teamTurns]);

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
        <EditTeamTurnDialogue
          team={team}
          open={showDialogue}
          setOpen={setShowDialogue}
        />
      )}
      <h2 className="text-xl font-bold mb-1">{team.team.team_name}</h2>
      {combinedTurns ? (
        <>
          <p>
            {combinedTurns.turns} vuoroa, {combinedTurns.penalties} sakkoa
          </p>
          <p>Yhteensä {combinedTurns.total_drinks} juomaa</p>
          <p>Kokonaisaika: {combinedTurns.combined_time}</p>
        </>
      ) : (
        <>
          <TurnElapsed start={lastTurn.start_time} end={lastTurn.end_time} />
          {lastTurn.dice1 != null ? (
            <p>
              Heitot: {lastTurn.dice1} + {lastTurn.dice2}
            </p>
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
        {(combinedTurns?.drinks ?? lastTurn.drinks.drinks)
          .sort((da, db) => db.n - da.n)
          .map((drink) => (
            <TurnDrinkCard key={`${drink.drink.id}`} drink={drink} />
          ))}
      </VerticalList>
    </div>
  );
}
