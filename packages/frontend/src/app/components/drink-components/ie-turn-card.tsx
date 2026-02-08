import { TurnStatus, turnStatus } from "@/utils/turns";
import { TurnDrinksList } from "./drink-card";
import { TimeSince } from "../time-since";
import "./ie-turn-card.css";

export type TurnWithTeam = Turn & { team: GameTeam };

function RadioButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}): JSX.Element {
  return (
    <button
      className={`
        cursor-pointer
        w-1/3
        rounded
        px-2
        py-4
        border-2
        not-first:-ml-[2px]
        ${active ? "bg-primary-900 border-primary-500 text-white" : "border-transparent hover:border-primary-500 hover:bg-primary-900/10"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export const DELIVERY_WARNING_SEC = 60;

export default function IeTurnCard({
  turn,
  onStateChange,
  drinksData,
}: {
  turn: TurnWithTeam;
  onStateChange?: (newState: DrinkPrepStatus) => void;
  drinksData?: DrinksIngredients | null;
}): JSX.Element {
  const status = turnStatus(turn);
  return (
    <div
      className={`
        box
        w-80
        flex-grow-0
        shrink-0
        flex
        flex-col
        transition
        ${turn.mixed_at ? "bg-slime-600/20" : ""}
        ${onStateChange && turn.mixed_at ? "animate-[ieturn-fade_5s_linear_1_forwards]" : ""}`}
    >
      <h2 className="text-xl font-bold mb-1">{turn.team.team.team_name}</h2>
      {turn.delivered_at ? (
        <p>Toimitettu!</p>
      ) : turn.mixed_at ? (
        <p>
          Toimituksessa:{" "}
          <TimeSince timestamp={turn.mixed_at} warnSec={DELIVERY_WARNING_SEC} />
        </p>
      ) : (
        <p>
          Jonossa: <TimeSince timestamp={turn.confirmed_at!} />
        </p>
      )}
      {onStateChange && (
        <div className="flex">
          <RadioButton
            active={status === TurnStatus.WaitingForIE}
            onClick={() => onStateChange("Queued")}
          >
            Jonossa
          </RadioButton>
          <RadioButton
            active={status === TurnStatus.Mixing}
            onClick={() => onStateChange("Mixing")}
          >
            Työn alla
          </RadioButton>
          <RadioButton
            active={!!turn.mixed_at}
            onClick={() => onStateChange("Mixed")}
          >
            Valmis
          </RadioButton>
        </div>
      )}
      <TurnDrinksList
        drinks={turn.drinks.drinks}
        className="flex-1"
        drinksData={drinksData}
      />
      {onStateChange && (
        <div
          className={`h-2 -mx-3 -mb-2 rounded-b ${turn.mixed_at ? "animate-[ieturn-progressbar_5s_linear_1_forwards] bg-primary-900" : ""}`}
        />
      )}
    </div>
  );
}
