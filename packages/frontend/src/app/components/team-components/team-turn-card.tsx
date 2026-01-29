import { TurnElapsed } from "@/app/components/time-since";
import { TurnDrinkCard } from "@/app/components/drink-components/drink-card";
import React, { useEffect } from "react";
import { VerticalList } from "@/app/components/generic-list-components";
import { EditTeamTurnDialogue } from "@/app/components/team-components/edit-team-turn-dialogue";
import PlaceCard from "@/app/components/board-components/place-card";

interface TurnCombined {
  turn_ids: number[];
  n: number;
  combined_time: string;
  team_id: number;
  game_id: number;
  dice_throws: [number, number][];
  drinks: TurnDrinks;
}
const getTimeInBetween = (turns: Turn[]): number[] => {
  return turns.map((turn: Turn) => {
    const start = new Date(turn.start_time);
    const end = turn.end_time ? new Date(turn.end_time) : new Date();
    return end.getTime() - start.getTime();
  });
};
function formatDhms(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(days)} päivää ${pad(hours)} tuntia ${pad(minutes)} minuuttia ja ${pad(seconds)} sekuntia.`;
}
export function sumByDrinkId(rows: TurnDrink[]): TurnDrink[] {
  const byId = new Map<number, TurnDrink>();

  for (const { drink, turn_id, n } of rows) {
    const existing = byId.get(drink.id);
    if (existing) {
      existing.n += n; // add up
    } else {
      byId.set(drink.id, {
        drink: { id: drink.id, name: drink.name },
        turn_id,
        n,
      });
    }
  }
  return Array.from(byId.values());
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
  const [combinedTurns, setCombinedTurns] = React.useState<TurnCombined | null>(
    null,
  );
  const [showDialogue, setShowDialogue] = React.useState<boolean>(false);
  const [location, setLocation] = React.useState<BoardPlace | undefined>();

  useEffect(() => {
    if (board && teamTurns.length > 0) {
      const loc = board.places.find((p) => {
        return p.place_number === teamTurns[0].location;
      });
      setLocation(loc);
    }
  }, [board, teamTurns]);

  useEffect(() => {
    if (!collect) return;
    if (!lastTurn) return;
    const combinedTurn: TurnCombined = {
      turn_ids: teamTurns.map((t) => t.turn_id),
      n: teamTurns.length,
      combined_time: formatDhms(
        getTimeInBetween(teamTurns).reduce((a, b) => a + b, 0),
      ),
      team_id: team.team.team_id,
      game_id: lastTurn.game_id,
      dice_throws: teamTurns.map((t) => [t.dice1, t.dice2] as [number, number]),
      drinks: {
        drinks: sumByDrinkId(teamTurns.flatMap((t) => t.drinks.drinks)),
      },
    };
    setCombinedTurns(combinedTurn);
  }, [setCombinedTurns, collect, lastTurn, team, teamTurns]);
  const onClickAction = () => {
    if (collect) return;
    setShowDialogue(true);
  };
  if (!lastTurn) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-2">{team.team.team_name}</h2>
        <p>Ei vielä vuoroja</p>
        <p>{team.team.team_id}</p>
      </div>
    );
  }
  return (
    <div
      key={team.team.team_id}
      className={`${collect ? "box" : "box-hover"} h-full w-80 shrink-0 flex flex-col min-h-0`}
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
          <p>Yhteensä {combinedTurns.n} vuoroa</p>
          <p>Kokonaisaika: {combinedTurns.combined_time}</p>
        </>
      ) : lastTurn.end_time ? (
        <TurnElapsed iso={lastTurn.start_time} end={lastTurn.end_time} />
      ) : (
        <TurnElapsed iso={lastTurn.start_time} />
      )}
      {!combinedTurns && (
        <p>
          Heitot: {lastTurn.dice1} + {lastTurn.dice2}
        </p>
      )}
      {!combinedTurns &&
        (location ? (
          <PlaceCard place={location} showInfo={false} />
        ) : team.location ? (
          <PlaceCard place={team.location} showInfo={false} />
        ) : (
          <p className="text-juvu-puna">Place not found</p>
        ))}
      <VerticalList className="mt-2 flex-1 gap-2 px-2 py-4">
        {(combinedTurns ? combinedTurns : lastTurn).drinks.drinks
          .sort((da, db) => db.n - da.n)
          .map((drink) => (
            <TurnDrinkCard key={`${drink.drink.id}`} drink={drink} />
          ))}
      </VerticalList>
    </div>
  );
}
