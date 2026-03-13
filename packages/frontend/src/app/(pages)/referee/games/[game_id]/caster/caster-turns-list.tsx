import { TurnState } from "@/app/components/team-components/team-turn-card";
import { BoardPlacesWithDistances } from "@/app/hooks/useGameData";
import { createRef, useMemo } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import "./caster-turns-list.css";

export type TurnWithTeam = Turn & { team: GameTeam };

/** Duration for the slide-in animation in ms. */
const SLIDE_TIMEOUT = 400;

export default function CasterTurnsList({
  teams,
  board,
  className,
}: {
  teams: GameTeam[];
  board: BoardPlacesWithDistances;
  className?: string;
}) {
  const allTurns = useMemo(
    () =>
      teams
        .flatMap((team) =>
          team.turns.map(
            (
              turn,
            ): TurnWithTeam & {
              nodeRef: React.RefObject<HTMLDivElement | null>;
            } => ({
              ...turn,
              team,
              nodeRef: createRef<HTMLDivElement>(),
            }),
          ),
        )
        .toSorted(
          (a, b) =>
            new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
        ),
    [teams],
  );

  return (
    <TransitionGroup
      className={`${className} flex flex-col gap-2 overflow-y-auto`}
    >
      {allTurns.map((turn) => (
        <CSSTransition
          key={turn.turn_id}
          nodeRef={turn.nodeRef}
          timeout={SLIDE_TIMEOUT}
          classNames="caster-turn-slide"
        >
          <CasterTurnCard ref={turn.nodeRef} turn={turn} board={board} />
        </CSSTransition>
      ))}
    </TransitionGroup>
  );
}

function CasterTurnCard({
  ref,
  turn,
  board,
}: {
  ref?: React.Ref<HTMLDivElement>;
  turn: TurnWithTeam;
  board: BoardPlacesWithDistances;
}) {
  return (
    <div
      ref={ref}
      className={`
            p-2
            border
            rounded
            flex
            flex-wrap
            gap-2
            ${turn.end_time ? "bg-slime-600/20" : ""}`}
    >
      {turn.penalty ? (
        <strong className="text-tertiary-900">SAKKO</strong>
      ) : (
        <strong className="text-secondary-900">VUORO</strong>
      )}
      <strong>{turn.team.team.team_name}</strong>
      -
      <TurnState turn={turn} showDuration={false} />
      {!turn.penalty && (
        <>
          -
          <span>
            {turn.via_number != null && (
              <>
                {board.places.find((p) => p.place_number === turn.via_number)
                  ?.place.place_name || "Tuntematon paikka"}
                <span className="text-primary-900"> &rarr; </span>
              </>
            )}
            {board.places.find((p) => p.place_number === turn.place_number)
              ?.place.place_name || "Tuntematon paikka"}
          </span>
        </>
      )}
      {turn.drinks.drinks.some((d) => d.n) && (
        <>
          -
          <span>
            {turn.drinks.drinks
              .filter((d) => d.n)
              .map((d) => `${d.n}x ${d.drink.name}`)
              .join(", ")}
          </span>
        </>
      )}
    </div>
  );
}
