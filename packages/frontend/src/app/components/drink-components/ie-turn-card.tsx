import { editTurnDrinks } from "@/utils/fetchers";
import { TurnStatus, turnStatus } from "@/utils/turns";
import { useState } from "react";
import PlaceCard from "../board-components/place-card";
import PopUpDialogue from "../pop-up-dialogue";
import { DrinkSelectionList } from "../team-components/edit-team-turn-dialogue";
import { TimeSince } from "../time-since";
import { TurnDrinksList } from "./drink-card";
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
  const [editing, setEditing] = useState(false);
  const status = turnStatus(turn);
  const isIeSpecial = turn.place?.place.special === "IE";

  return (
    <div
      className={`
        box
        w-80
        flex-grow-0
        shrink-0
        flex
        flex-col
        gap-1
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
          {turn.mixing_at ? "Työn alla: " : "Jonossa: "}
          <TimeSince timestamp={turn.confirmed_at!} />
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
      {onStateChange && (
        <p className="text-lg -mb-4">
          {turn.place ? turn.place.place.place_name : "Sakko"}
          {isIeSpecial && (
            <>
              {", "}
              <em>
                Heitot: {turn.dice1}&nbsp;+&nbsp;{turn.dice2}
              </em>
            </>
          )}
        </p>
      )}
      <TurnDrinksList
        drinks={turn.drinks.drinks}
        className={`flex-1 ${isIeSpecial ? "-mb-2" : ""}`}
        drinksData={drinksData}
        ieOnly
      />
      {isIeSpecial && !turn.mixed_at && (
        <button className="button" onClick={() => setEditing(true)}>
          Muokkaa juomia
        </button>
      )}
      {onStateChange && (
        <div
          className={`h-2 -mx-3 -mb-2 rounded-b ${turn.mixed_at ? "animate-[ieturn-progressbar_5s_linear_1_forwards] bg-primary-900" : ""}`}
        />
      )}
      {editing && (
        <IeEditDrinksDialogue turn={turn} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

/** Dialog for IE to edit drinks on a turn with the "IE" special. */
function IeEditDrinksDialogue({
  turn,
  onClose,
}: {
  turn: TurnWithTeam;
  onClose: () => void;
}): JSX.Element {
  const [selectedDrinks, setSelectedDrinks] = useState<TurnDrinks>(turn.drinks);
  const [pending, setPending] = useState(false);

  const handleSubmit = async () => {
    setPending(true);
    const drinks: TurnDrinks = {
      drinks: selectedDrinks.drinks.filter((d) => d.n > 0),
    };
    await editTurnDrinks(turn.turn_id, drinks);
    setPending(false);
    onClose();
  };

  return (
    <PopUpDialogue
      setOpen={() => onClose()}
      title={`Muokkaa juomia: ${turn.team.team.team_name}`}
      disabled={pending}
    >
      <form
        className="w-xl flex flex-col gap-2 h-[80dvh] max-h-200 px-4 py-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <p className="text-xl">
          Heitot: {turn.dice1}&nbsp;+&nbsp;{turn.dice2}
        </p>
        {turn.place ? (
          <PlaceCard place={turn.place} className="max-w-full" />
        ) : (
          <p>Paikkaa ei löydy!</p>
        )}
        <DrinkSelectionList
          selectedDrinks={selectedDrinks}
          setSelectedDrinks={setSelectedDrinks}
        />
        <div className="flex justify-between px-4 py-4">
          <button
            type="button"
            className="button text-xl p-4"
            onClick={onClose}
            disabled={pending}
          >
            Eiku
          </button>
          <button
            type="button"
            className="button text-xl p-4"
            onClick={handleSubmit}
            disabled={pending}
          >
            Tallenna
          </button>
        </div>
      </form>
    </PopUpDialogue>
  );
}
