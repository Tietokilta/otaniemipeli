import PlaceCard from "@/app/components/board-components/place-card";
import { TurnDrinksList } from "@/app/components/drink-components/drink-card";
import { EditTeamTurnDialogue } from "@/app/components/team-components/edit-team-turn-dialogue";
import {
  dateFromDb,
  formatShortDurationMs,
  TimeSince,
} from "@/app/components/time-since";
import { TurnStatus, turnStatus, turnStatusTexts } from "@/utils/turns";
import { useState } from "react";

export type GameTeamWithTotals = GameTeam & {
  // turn_ids: number[];
  normal_turns: number;
  penalties: number;
  total_drinks: number;
  total_active: number;
  total_drunk: number;
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

  for (const { drink, n, on_table } of rows) {
    total_drinks += n;
    const existing = byId.get(drink.id);
    if (existing) {
      existing.n += n; // add up
      existing.on_table += on_table;
    } else {
      byId.set(drink.id, { drink, n, on_table, optional: false });
    }
  }
  return { drinks: Array.from(byId.values()), total_drinks };
}

export function computeTotals(team: GameTeam): GameTeamWithTotals {
  // In non-collect mode, only show currently active turn(s). In collect mode, show all turns.
  const penalties = team.turns.filter((t) => t.penalty).length;
  const totalDrinks = sumByDrinkId(team.turns.flatMap((t) => t.drinks.drinks));
  const activeDrinks = sumByDrinkId(
    team.turns.filter((t) => !t.end_time).flatMap((t) => t.drinks.drinks),
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
    total_drunk: totalDrinks.total_drinks - activeDrinks.total_drinks,
  };
}

export function TurnState({ turn }: { turn: Turn }): JSX.Element {
  if (turn.end_time) {
    const startTs = dateFromDb(turn.start_time).getTime();
    const endTs = dateFromDb(turn.end_time).getTime();

    const dur = formatShortDurationMs(endTs - startTs);
    return (
      <>
        <p className="text-quaternary-500">
          Valmiina! (<TimeSince timestamp={turn.end_time} />)
        </p>
        <p>Vuoro kesti: {dur}</p>
      </>
    );
  }

  const status = turnStatus(turn);
  const lastChange =
    turn.delivered_at ??
    turn.mixed_at ??
    turn.mixing_at ??
    turn.confirmed_at ??
    turn.thrown_at ??
    turn.start_time;

  return (
    <>
      <p
        className={
          status === TurnStatus.WaitingForAssistantReferee
            ? "text-primary-900"
            : ""
        }
      >
        {turnStatusTexts[status]} (<TimeSince timestamp={lastChange} />)
      </p>
      <p>
        Vuoro alkoi <TimeSince timestamp={turn.start_time} /> sitten
      </p>
    </>
  );
}

export default function TeamTurnCard({
  team,
  collect,
  assistant,
  teamTurns,
  board,
}: {
  team: GameTeamWithTotals;
  collect?: boolean;
  assistant?: boolean;
  teamTurns: Turn[] | Turn;
  board?: BoardPlaces;
}): JSX.Element {
  const singleTurn = !Array.isArray(teamTurns);
  if (!Array.isArray(teamTurns)) teamTurns = [teamTurns];

  const lastTurn = teamTurns[teamTurns.length - 1];
  const lastThrow = teamTurns.findLast((t) => t.dice1 != null);
  const [showDialogue, setShowDialogue] = useState<boolean>(false);
  const onClickAction = collect ? undefined : () => setShowDialogue(true);

  const location = singleTurn
    ? board?.places.find((p) => p.place_number === teamTurns[0].location)
    : undefined;

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
          assistant={assistant}
          open
          setOpen={setShowDialogue}
        />
      )}
      <h2 className="text-xl font-bold mb-1">{team.team.team_name}</h2>
      {collect ? (
        <>
          <p>
            {team.normal_turns} vuoroa, {team.penalties} sakkoa
          </p>
          <p>
            Yhteensä {team.total_drinks}, juotu {team.total_drunk}
          </p>
          <p>Kokonaisaika: {formatShortDurationMs(team.combined_time)}</p>
        </>
      ) : (
        <>
          <TurnState turn={lastTurn} />
          {lastThrow?.dice1 != null ? (
            <p>
              Heitot: {lastThrow.dice1} + {lastThrow.dice2}
            </p>
          ) : singleTurn && teamTurns[0].confirmed_at ? (
            <p>Sakkovuoro, ei heittoja</p>
          ) : (
            <p>Ei vielä heittoja</p>
          )}
        </>
      )}
      {collect && !team.team.moral_victory_eligible && (
        <p>
          <em>Laatannut</em>
        </p>
      )}
      {!collect &&
        !(singleTurn && !lastThrow) &&
        (location ? (
          <PlaceCard place={location} showInfo={false} />
        ) : team.location ? (
          <PlaceCard place={team.location} showInfo={false} />
        ) : (
          <p>Place not found</p>
        ))}
      <TurnDrinksList
        drinks={
          singleTurn
            ? teamTurns[0].drinks.drinks
            : collect
              ? team.drinks
              : team.active_drinks
        }
      />
    </div>
  );
}
