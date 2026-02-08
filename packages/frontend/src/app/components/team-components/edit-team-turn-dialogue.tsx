import React, { useEffect, useState, Dispatch, SetStateAction } from "react";
import PopUpDialogue from "../pop-up-dialogue";
import DropdownMenu from "@/app/components/dropdown-menu";
import {
  endTurn,
  startTurn,
  changeDice,
  cancelTurn,
  getDrinks,
  confirmPenalty,
  setMoralVictoryEligible,
} from "@/utils/fetchers";
import { TurnStatus, turnStatus, turnStatusTexts } from "@/utils/turns";
import SimpleConfirmedButton from "../simple-confirmed-button";

/** Set to true to show the dice selection dialog when creating turns. */
const REFEREE_ENTERS_DICE = false;

/** Returns the unconfirmed penalty turn if one exists. */
function getUnconfirmedPenalty(team: GameTeam): Turn | undefined {
  return team.turns.find((turn) => turn.penalty && !turn.confirmed_at);
}

export const EditTeamTurnDialogue = ({
  team,
  open,
  setOpen,
}: {
  team: GameTeam;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [choice, setChoice] = useState<"penalty" | "turn" | null>(null);
  const [pendingPenaltyTurnId, setPendingPenaltyTurnId] = useState<
    number | null
  >(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  const unconfirmedPenalty = getUnconfirmedPenalty(team);

  /** Creates a new pending penalty turn or takes over an existing one. */
  const handleAddPenalty = async () => {
    if (unconfirmedPenalty) {
      // Take over existing unconfirmed penalty
      setPendingPenaltyTurnId(unconfirmedPenalty.turn_id);
      setChoice("penalty");
      return;
    }

    setPending(true);
    const postTurn: PostStartTurn = {
      team_id: team.team.team_id,
      game_id: team.team.game_id,
      dice1: null,
      dice2: null,
      penalty: true,
    };
    const turn = await startTurn(postTurn);
    setPendingPenaltyTurnId(turn.turn_id);
    setPending(false);
    setChoice("penalty");
  };

  if (choice === "penalty" && pendingPenaltyTurnId) {
    return (
      <AddTeamPenaltyDialogue
        team={team}
        turnId={pendingPenaltyTurnId}
        onClose={() => {
          setChoice(null);
          setOpen(false);
        }}
      />
    );
  }

  const addTurnSetOpen = (open: boolean) => {
    setChoice(open ? "turn" : null);
    setOpen(open);
  };

  return (
    <PopUpDialogue
      setOpen={setOpen}
      title={`Vuoro joukkueelle ${team.team.team_name}`}
      disabled={pending}
    >
      <div className="w-100 flex flex-col gap-6 p-4">
        <h3>
          Joukkue:{" "}
          <span className="text-primary-900">{team.team.team_name}</span>
        </h3>
        <AddTeamTurnButton
          team={team}
          referee
          allowDice={REFEREE_ENTERS_DICE}
          open={choice === "turn"}
          setOpen={addTurnSetOpen}
        />
        <button
          className="button text-xl p-5"
          onClick={handleAddPenalty}
          disabled={pending}
        >
          {unconfirmedPenalty ? "Jatka sakon luontia" : "Lisää sakko"}
        </button>
        <ToggleMoralVictoryButton team={team} referee />
        {unconfirmedPenalty && (
          <p className="text-lg text-center">
            <em>HUOM!</em> Joukkueelle ollaan jo lisäämässä sakkoa!
          </p>
        )}
      </div>
    </PopUpDialogue>
  );
};

export const Dice = ({
  value,
  setValue,
}: {
  value: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
}) => {
  return (
    <div className="flex flex-wrap mb-4 gap-x-2 gap-y-1 justify-center">
      {[1, 2, 3, 0, 4, 5, 6].map((i) =>
        i ? (
          <button
            key={i}
            type="button"
            className={`
            rounded
            cursor-pointer
            border-2
            text-3xl
            w-[24vw]
            md:w-[12vw]
            max-w-24
            aspect-square
            ${value === i ? "bg-primary-900 border-primary-500 text-white" : ""}`}
            onClick={() => setValue(i)}
          >
            {i}
          </button>
        ) : (
          <div key="0" className="w-full md:hidden" />
        ),
      )}
    </div>
  );
};

const statusPriority: Record<TurnStatus, number> = {
  [TurnStatus.WaitingForAssistantReferee]: 1,
  [TurnStatus.WaitingForPenalty]: 2,
  [TurnStatus.WaitingForIE]: 3,
  [TurnStatus.Mixing]: 4,
  [TurnStatus.Delivering]: 5,
  [TurnStatus.Drinking]: 6,
  [TurnStatus.WaitingForDice]: 7,
  [TurnStatus.Ended]: 8,
};

export const AddTeamTurnButton = ({
  team,
  open,
  setOpen,
  pending: externalPending,
  setPending: setExternalPending,
  referee,
  allowDice,
}: {
  team: GameTeam;
  open: boolean;
  setOpen: (open: boolean) => void;
  pending?: boolean;
  setPending?: (pending: boolean) => void;
  referee?: boolean;
  allowDice?: boolean;
}) => {
  const [localPending, setLocalPending] = useState(false);
  const pending = externalPending || localPending;

  const turnForDice = team.turns.find(
    (turn) => !turn.thrown_at && !turn.penalty,
  );
  const currentStatus = team.turns
    .filter((turn) => !turn.end_time)
    .reduce((latest, turn) => {
      const status = turnStatus(turn);
      return statusPriority[status] < statusPriority[latest] ? status : latest;
    }, TurnStatus.Ended);

  const canDice =
    currentStatus === TurnStatus.WaitingForDice ||
    (currentStatus === TurnStatus.Ended && allowDice);

  /** Creates a new pending turn without dice values. */
  const handleStartTurn = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    const postTurn: PostStartTurn = {
      team_id: team.team.team_id,
      game_id: team.team.game_id,
      dice1: null,
      dice2: null,
      penalty: false,
    };
    await startTurn(postTurn);
    setLocalPending(false);
    setExternalPending?.(false);
    setOpen(false);
  };

  /** Ends all active turns for a team. */
  const handleEndTurn = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    await endTurn(team.team.team_id);
    setLocalPending(false);
    setExternalPending?.(false);
    setOpen(false);
  };

  return (
    <>
      {currentStatus === TurnStatus.Drinking ? (
        referee ? (
          <button
            className="button text-xl p-5"
            onClick={handleEndTurn}
            disabled={pending}
          >
            Juomat juotu!
          </button>
        ) : (
          <SimpleConfirmedButton
            buttonClassName="button text-xl p-5"
            buttonText="Juomat juotu!"
            dialogTitle="Vahvista vuoron päättyminen"
            dialogText="Oletko varma, että kaikki joukkueen juomat on juotu?"
            onAccept={handleEndTurn}
          />
        )
      ) : canDice ? (
        <button
          className="button text-xl p-5"
          onClick={() => setOpen(true)}
          disabled={pending}
        >
          Kirjaa nopanheitto
        </button>
      ) : currentStatus === TurnStatus.Ended && referee ? (
        <button
          className="button text-xl p-5"
          onClick={handleStartTurn}
          disabled={pending}
        >
          Uusi vuoro (anna nopat)
        </button>
      ) : (
        <button className="button text-xl p-5" disabled>
          {currentStatus === TurnStatus.Ended
            ? "Odotetaan päätuomaria"
            : turnStatusTexts[currentStatus]}
        </button>
      )}
      {open && canDice && (
        <AddTeamTurnDialogue
          team={team}
          ongoingTurn={turnForDice}
          onClose={() => setOpen(false)}
        />
      )}
      {!referee && (
        <p className="text-lg text-center h-[3.5em]">
          {secretaryInstructions[currentStatus]}
        </p>
      )}
    </>
  );
};

const secretaryInstructions: Record<TurnStatus, string> = {
  [TurnStatus.WaitingForDice]:
    "Kirjaa joukkueen nopanheitto kun noppia on heitetty.",
  [TurnStatus.WaitingForPenalty]: "Odota että sakot on kirjattu.",
  [TurnStatus.WaitingForAssistantReferee]:
    "Odota että aputuomari on vahvistanut vuoron.",
  [TurnStatus.WaitingForIE]: "Odota että IE kokkailee.",
  [TurnStatus.Mixing]: "Odota että IE kokkailee.",
  [TurnStatus.Delivering]: "Kuittaa alta, kun juomat toimitetaan joukkueelle.",
  [TurnStatus.Drinking]: "Kuittaa yltä, kun kaikki joukkueen juomat on juotu.",
  [TurnStatus.Ended]: "Odotetaan päätuomaria aloittamaan joukkueen vuoro.",
};

const AddTeamTurnDialogue = ({
  team,
  ongoingTurn,
  onClose,
}: {
  team: GameTeam;
  ongoingTurn?: Turn;
  onClose: () => void;
}) => {
  const [dice1, setDice1] = useState<number>(0);
  const [dice2, setDice2] = useState<number>(0);
  const [pending, setPending] = useState(false);

  const submitTurn = async () => {
    setPending(true);

    if (ongoingTurn) {
      // Update existing turn with dice values
      await changeDice(ongoingTurn.turn_id, dice1, dice2);
    } else {
      // Create new turn with dice values
      const postTurn: PostStartTurn = {
        team_id: team.team.team_id,
        game_id: team.team.game_id,
        dice1,
        dice2,
        penalty: false,
      };
      await startTurn(postTurn);
    }

    setPending(false);
    onClose();
  };

  return (
    <PopUpDialogue
      setOpen={() => onClose()}
      title={`Nopanheitto: ${team.team.team_name}`}
      disabled={pending}
    >
      <div className="flex flex-col gap-2 px-4 py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitTurn();
          }}
        >
          <div className="flex flex-col w-full gap-2">
            <h2>Noppa 1:</h2>
            <Dice value={dice1} setValue={setDice1} />
            <h2>Noppa 2:</h2>
            <Dice value={dice2} setValue={setDice2} />
          </div>
        </form>
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
            className="button text-xl p-4"
            type="button"
            onClick={submitTurn}
            disabled={dice1 === 0 || dice2 === 0 || pending}
          >
            Heitä
          </button>
        </div>
      </div>
    </PopUpDialogue>
  );
};

export const ToggleMoralVictoryButton = ({
  team,
  referee,
}: {
  team: GameTeam;
  referee: boolean;
}) => {
  const [pending, setPending] = useState(false);

  const toggleMoralVictory = async () => {
    setPending(true);
    await setMoralVictoryEligible(
      team.team.team_id,
      !team.team.moral_victory_eligible,
    );
    setPending(false);
  };

  return referee ? (
    <button className="button text-xl p-5" onClick={toggleMoralVictory}>
      {team.team.moral_victory_eligible
        ? "Merkitse laatta"
        : "Kumoa laattamerkintä"}
    </button>
  ) : (
    <SimpleConfirmedButton
      buttonClassName="button text-xl p-5"
      buttonText={
        team.team.moral_victory_eligible
          ? "Merkitse laatta"
          : "Joukkue on laatannut"
      }
      dialogTitle="Vahvista laattamerkintä"
      dialogText="Oletko varma, että haluat merkitä joukkueen laatanneeksi?"
      onAccept={toggleMoralVictory}
      disabled={pending || !team.team.moral_victory_eligible}
    />
  );
};

const AddTeamPenaltyDialogue = ({
  team,
  turnId,
  onClose,
}: {
  team: GameTeam;
  turnId: number;
  onClose: () => void;
}) => {
  const [availableDrinks, setAvailableDrinks] = useState<Drink[]>([]);
  const [penaltyDrinks, setPenaltyDrinks] = useState<TurnDrinks>({
    drinks: [],
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getDrinks().then((drinks) => {
      const drinkList = drinks.drink_ingredients.map((d) => d.drink);
      setAvailableDrinks(drinkList);

      // Add favorite drinks with n=0
      const favoriteDrinks = drinkList
        .filter((d) => d.favorite)
        .map((d) => ({
          drink: d,
          n: 0,
        }));
      if (favoriteDrinks.length > 0) {
        setPenaltyDrinks({ drinks: favoriteDrinks });
      }
    });
  }, []);

  const handleSubmit = async () => {
    setPending(true);
    const drinks: TurnDrinks = {
      drinks: penaltyDrinks.drinks.filter((d) => d.n > 0),
    };
    await confirmPenalty(turnId, drinks);
    setPending(false);
    onClose();
  };

  const handleCancel = async () => {
    setPending(true);
    await cancelTurn(turnId);
    setPending(false);
    onClose();
  };

  const hasSelectedDrinks = penaltyDrinks.drinks.some((d) => d.n > 0);

  return (
    <PopUpDialogue
      setOpen={() => handleCancel()}
      title={`Sakko: ${team.team.team_name}`}
      disabled={pending}
    >
      <form
        className="w-xl flex flex-col gap-2 h-[80dvh] max-h-200 px-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <DrinkSelectionList
          availableDrinks={availableDrinks}
          selectedDrinks={penaltyDrinks}
          setSelectedDrinks={setPenaltyDrinks}
        />
        <div className="flex justify-between px-4 py-4">
          <button
            type="button"
            className="button text-xl p-4"
            onClick={handleCancel}
            disabled={pending}
          >
            Eiku
          </button>
          <button
            type="button"
            className="button text-xl p-4"
            onClick={handleSubmit}
            disabled={!hasSelectedDrinks || pending}
          >
            Sakkoa
          </button>
        </div>
      </form>
    </PopUpDialogue>
  );
};

export function DrinkSelectionList<T extends Drink>({
  availableDrinks,
  selectedDrinks,
  setSelectedDrinks,
  buttonText = "Lisää juoma",
}: {
  availableDrinks: T[];
  selectedDrinks: TurnDrinks;
  setSelectedDrinks: React.Dispatch<React.SetStateAction<TurnDrinks>>;
  buttonText?: string;
}): JSX.Element {
  const [selectedOption, setSelectedOption] = useState<T | undefined>();

  // Filter out already-selected drinks from the dropdown
  const filteredDrinks = availableDrinks.filter(
    (d) => !selectedDrinks.drinks.some((td) => td.drink.id === d.id),
  );

  useEffect(() => {
    if (!selectedOption) return;

    setSelectedDrinks((prev) => {
      const existing = prev.drinks.find(
        (d) => d.drink.id === selectedOption.id,
      );
      if (existing) {
        // Increment n if already exists (e.g., favorite at n=0)
        return {
          drinks: prev.drinks.map((d) =>
            d.drink.id === selectedOption.id ? { ...d, n: d.n + 1 } : d,
          ),
        };
      }
      // Add new drink with n=1
      return {
        drinks: [
          ...prev.drinks,
          {
            drink: selectedOption,
            n: 1,
          },
        ],
      };
    });

    setSelectedOption(undefined);
  }, [selectedOption, setSelectedDrinks]);

  return (
    <>
      <DropdownMenu
        buttonText={buttonText}
        options={filteredDrinks}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
      />
      <div className="flex-1 flex flex-col gap-1 py-2 overflow-y-auto">
        {selectedDrinks.drinks.length === 0 && (
          <p className="text-tertiary-500">Ei valittuja juomia</p>
        )}
        {selectedDrinks.drinks.map((drink) => (
          <DrinkSelectionCard
            key={drink.drink.id}
            turnDrink={drink}
            updateDrinks={setSelectedDrinks}
            favorite={drink.drink.favorite}
          />
        ))}
      </div>
    </>
  );
}

export function DrinkSelectionCard({
  turnDrink,
  updateDrinks,
  favorite = false,
}: {
  turnDrink: TurnDrink;
  updateDrinks: React.Dispatch<React.SetStateAction<TurnDrinks>>;
  favorite?: boolean;
}): JSX.Element {
  const updateN = (change: number) => {
    updateDrinks((dr) => {
      const newN = turnDrink.n + change;
      // Don't go below 0
      if (newN < 0) return dr;
      // Delete non-favorite drinks when going below 1
      if (newN < 1 && !favorite) {
        return {
          drinks: dr.drinks.filter(
            (drink) => drink.drink.id !== turnDrink.drink.id,
          ),
        };
      }
      return {
        drinks: dr.drinks.map((existingDrink) =>
          existingDrink.drink.id === turnDrink.drink.id
            ? {
                ...existingDrink,
                n: newN,
              }
            : existingDrink,
        ),
      };
    });
  };

  return (
    <div className="flex gap-2 w-full box p-2 center">
      <div className="w-1/2 mr-auto text-lg font-bold overflow-hidden flex-grow-0 text-ellipsis text-nowrap text-left">
        {turnDrink.drink.name}
      </div>
      <div
        className="flex gap-2 w-1/2 center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="w-1/3 button text-3xl select-none"
          onClick={() => updateN(-1)}
        >
          -
        </button>
        <div className="w-1/3 center p-1 text-lg text-center">
          {turnDrink.n}
        </div>
        <button
          type="button"
          className="w-1/3 button text-3xl select-none"
          onClick={() => updateN(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
