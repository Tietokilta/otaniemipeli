import React, {
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
  useCallback,
} from "react";
import deepEqual from "fast-deep-equal";
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
  confirmTurn,
  setDrinkPrepStatus,
} from "@/utils/fetchers";
import { TurnStatus, turnStatus, turnStatusTexts } from "@/utils/turns";
import SimpleConfirmedButton from "../simple-confirmed-button";
import PlaceCard from "../board-components/place-card";

/** Set to false to show the dice selection dialog when creating turns. */
const USE_SECRETARIES = true;
/** Set to false to auto-enter the assistant referee dialogue. */
const USE_ASSISTANT_REFEREES = true;

const ALLOW_REFEREE_TO_DELIVER_DRINKS = true;
const KEEP_DIALOGUE_OPEN_ON_ACTIONS = true;

/** Returns the unconfirmed penalty turn if one exists. */
function getUnconfirmedPenalty(team: GameTeam): Turn | undefined {
  return team.turns.find((turn) => turn.penalty && !turn.confirmed_at);
}

/** Returns the unconfirmed turn if one exists. */
function getUnconfirmedTurn(team: GameTeam): Turn | undefined {
  return team.turns.find((turn) => turn.thrown_at && !turn.confirmed_at);
}

export const EditTeamTurnDialogue = ({
  team,
  open,
  setOpen,
  assistant = false,
}: {
  team: GameTeam;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  assistant?: boolean;
}) => {
  const [choice, setChoice] = useState<"penalty" | "turn" | "assistant" | null>(
    null,
  );
  const [pendingPenaltyTurnId, setPendingPenaltyTurnId] = useState<
    number | null
  >(null);
  const [pending, setPending] = useState(false);

  if (!open) return null;

  const unconfirmedPenalty = getUnconfirmedPenalty(team);
  const unconfirmedTurn = getUnconfirmedTurn(team);

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
      dice_ayy: null,
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

  if (
    (choice === "assistant" || assistant || !USE_ASSISTANT_REFEREES) &&
    unconfirmedTurn
  ) {
    return (
      <AssistantRefereeDialogue
        team={team}
        turn={unconfirmedTurn!}
        setOpen={setOpen}
      />
    );
  }

  const setDiceOpen = (open: boolean) => {
    setChoice(open ? "turn" : null);
    setOpen(open);
  };

  const onActionDone = () => {
    if (!KEEP_DIALOGUE_OPEN_ON_ACTIONS) {
      setChoice(null);
      setOpen(false);
    }
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
          allowDice={!USE_SECRETARIES}
          diceOpen={choice === "turn"}
          setDiceOpen={setDiceOpen}
          onAssistant={() => setChoice("assistant")}
          onActionDone={onActionDone}
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
  diceOpen,
  setDiceOpen,
  onActionDone,
  onAssistant,
  pending: externalPending,
  setPending: setExternalPending,
  referee,
  allowDice,
}: {
  team: GameTeam;
  diceOpen: boolean;
  setDiceOpen: (open: boolean) => void;
  onActionDone?: () => void;
  onAssistant?: () => void;
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
    turnForDice != null || (currentStatus === TurnStatus.Ended && allowDice);

  /** Creates a new pending turn without dice values. */
  const handleStartTurn = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    const postTurn: PostStartTurn = {
      team_id: team.team.team_id,
      game_id: team.team.game_id,
      dice1: null,
      dice2: null,
      dice_ayy: null,
      penalty: false,
    };
    await startTurn(postTurn);
    setLocalPending(false);
    setExternalPending?.(false);
    onActionDone?.();
  };

  /** Ends all active turns for a team. */
  const handleEndTurn = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    await endTurn(team.team.team_id);
    setLocalPending(false);
    setExternalPending?.(false);
    onActionDone?.();
  };

  /** Marks the drinks as delivered for the current turn. */
  const handleDrinksDelivered = async () => {
    setLocalPending(true);
    setExternalPending?.(true);
    await setDrinkPrepStatus(
      team.turns.find((turn) => !turn.delivered_at)!.turn_id,
      "Delivered",
    );
    setLocalPending(false);
    setExternalPending?.(false);
    onActionDone?.();
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
      ) : currentStatus === TurnStatus.WaitingForAssistantReferee &&
        onAssistant ? (
        <button
          className="button text-xl p-5"
          onClick={onAssistant}
          disabled={pending}
        >
          Aputuomaroi vuoro
        </button>
      ) : canDice ? (
        <button
          className="button text-xl p-5"
          onClick={() => setDiceOpen(true)}
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
      ) : ALLOW_REFEREE_TO_DELIVER_DRINKS &&
        [
          TurnStatus.WaitingForIE,
          TurnStatus.Mixing,
          TurnStatus.Delivering,
        ].includes(currentStatus) &&
        referee ? (
        <button
          className="button text-xl p-5"
          onClick={handleDrinksDelivered}
          disabled={pending}
        >
          Juomat toimitettu
          <br />
          (ohita IE ja sihteeri)
        </button>
      ) : (
        <button className="button text-xl p-5" disabled>
          {currentStatus === TurnStatus.Ended
            ? "Odotetaan päätuomaria"
            : turnStatusTexts[currentStatus]}
        </button>
      )}
      {diceOpen && canDice && (
        <AddTeamTurnDialogue
          team={team}
          ongoingTurn={turnForDice}
          onClose={() => setDiceOpen(false)}
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
  const [dice1, setDice1] = useState<number>(ongoingTurn?.dice1 || 0);
  const [dice2, setDice2] = useState<number>(ongoingTurn?.dice2 || 0);
  const [dice_ayy, setDiceAyy] = useState<number>(ongoingTurn?.dice_ayy || 0);
  const [pending, setPending] = useState(false);

  // TODO: unhardcode :D
  const showAyy =
    !!ongoingTurn?.dice_ayy ||
    ongoingTurn?.place?.place.place_name === "Aalto-yliopiston Ylioppilaskunta";

  const submitTurn = async () => {
    setPending(true);

    if (ongoingTurn) {
      // Update existing turn with dice values
      await changeDice(ongoingTurn.turn_id, { dice1, dice2, dice_ayy });
    } else {
      // Create new turn with dice values
      const postTurn: PostStartTurn = {
        team_id: team.team.team_id,
        game_id: team.team.game_id,
        dice1,
        dice2,
        dice_ayy,
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
            {showAyy && (
              <>
                <h2>AYY ekstranoppa:</h2>
                <Dice value={dice_ayy} setValue={setDiceAyy} />
              </>
            )}
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
            {ongoingTurn?.thrown_at ? "Muuta heitot" : "Heitä"}
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
      buttonClassName={`button text-xl p-5 ${!team.team.moral_victory_eligible ? "bg-slime-600/20" : ""}`}
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
        .map(
          (d): TurnDrink => ({
            drink: d,
            n: 0,
            on_table: 0,
            optional: false,
          }),
        );
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

function addFavorites(
  turnDrinks: TurnDrinks,
  availableDrinks: Drink[],
): TurnDrinks {
  const favoriteDrinks = availableDrinks
    .filter((d) => d.favorite)
    .map((d) => ({
      drink: d,
      n: 0,
      on_table: 0,
      optional: false,
    }));
  const toAdd = favoriteDrinks.filter(
    (fd) => !turnDrinks.drinks.some((d) => d.drink.id === fd.drink.id),
  );
  return toAdd.length === 0
    ? turnDrinks
    : { drinks: [...turnDrinks.drinks, ...toAdd] };
}

const AssistantRefereeDialogue = ({
  team,
  turn,
  setOpen,
}: {
  team: GameTeam;
  turn: Turn;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [availableDrinks, setAvailableDrinks] = useState<Drink[]>([]);
  const [pending, setPending] = useState(false);
  const [changingDice, setChangingDice] = useState(false);

  type TurnDrinksWithSources = {
    combined: TurnDrinks;
    fromServer: TurnDrinks;
    drinksLoaded: boolean;
    modified: boolean;
  };
  const [prevTurnDrinks, setTurnDrinks] = useState<TurnDrinksWithSources>({
    combined: turn.drinks,
    fromServer: turn.drinks,
    drinksLoaded: false,
    modified: false,
  });
  const { combined: turnDrinks } = prevTurnDrinks;

  useEffect(() => {
    getDrinks().then((drinks) => {
      const drinkList = drinks.drink_ingredients.map((d) => d.drink);
      setAvailableDrinks(drinkList);
    });
  }, []);

  // Populate turnDrinks if the turn changed
  if (
    !deepEqual(turn.drinks, prevTurnDrinks.fromServer) &&
    availableDrinks.length > 0
  ) {
    setTurnDrinks({
      combined: addFavorites(turnDrinks, availableDrinks),
      fromServer: turn.drinks,
      drinksLoaded: availableDrinks.length > 0,
      modified: false,
    });
  }
  // Or if drinks just loaded and we haven't added favorites yet
  else if (!prevTurnDrinks.drinksLoaded && availableDrinks.length > 0) {
    setTurnDrinks({
      combined: addFavorites(turnDrinks, availableDrinks),
      fromServer: turn.drinks,
      drinksLoaded: availableDrinks.length > 0,
      modified: false,
    });
  }

  const hasOptionals = turnDrinks.drinks.some((d) => d.optional);
  const mustModify = hasOptionals && !prevTurnDrinks.modified;

  const handleSubmit = async () => {
    setPending(true);
    const drinks: TurnDrinks = {
      drinks: turnDrinks.drinks.filter((d) => d.n > 0),
    };
    await confirmTurn(turn.turn_id, drinks);
    setPending(false);
    // TODO issue #33
    setOpen(false);
  };

  // TODO: unhardcode :D
  const showAyy =
    !!turn.dice_ayy ||
    turn.place?.place.place_name === "Aalto-yliopiston Ylioppilaskunta";
  const mustAyy = showAyy && !turn.dice_ayy;

  return (
    <PopUpDialogue
      setOpen={setOpen}
      title={`Vahvista vuoro: ${team.team.team_name}`}
      disabled={pending}
    >
      {changingDice && (
        <AddTeamTurnDialogue
          onClose={() => setChangingDice(false)}
          team={team}
          ongoingTurn={turn}
        />
      )}
      <form
        className="w-[90vw] md:w-2xl flex flex-col gap-2 h-[80dvh] max-h-200 px-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex items-center gap-2">
          <span>
            Heitot: {turn.dice1}&nbsp;+&nbsp;{turn.dice2}
          </span>
          {mustAyy ? (
            <em>AYY-nopanheitto vaaditaan.</em>
          ) : (
            showAyy && <em>AYY-noppa: {turn.dice_ayy}</em>
          )}
          <button
            type="button"
            className="button"
            onClick={() => setChangingDice(true)}
          >
            Muuta heittoja
          </button>
        </div>
        {turn.place ? (
          <PlaceCard place={turn.place} className="max-w-full" />
        ) : (
          <p>Paikkaa ei löydy!</p>
        )}
        {turn.place?.place.rule && (
          <div className="flex items-center">
            <em>Sääntö</em>
            <p className="text-lg text-left border-l-2 border-primary-900 pl-2 ml-2">
              &quot;{turn.place.place.rule}&quot;
            </p>
          </div>
        )}
        <DrinkSelectionList
          availableDrinks={availableDrinks}
          selectedDrinks={turnDrinks}
          setSelectedDrinks={(fn) =>
            setTurnDrinks((prev) => ({
              ...prev,
              combined: fn(turnDrinks),
              modified: true,
            }))
          }
        />
        {mustModify && (
          <div className="text-lg -mb-4">
            <em>Ruudun sääntö sisältää juomavaihtoehtoja. </em>
            Lue sääntö huolella ja koske juomavalintoihin vahvistaaksesi vuoron.
          </div>
        )}
        <div className="flex justify-between px-4 py-4">
          <button
            type="button"
            className="button text-xl p-4"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Eiku
          </button>
          <button
            type="button"
            className="button text-xl p-4"
            onClick={handleSubmit}
            disabled={pending || mustAyy || mustModify}
          >
            Vahvista vuoro
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
  setSelectedDrinks: (fn: (prev: TurnDrinks) => TurnDrinks) => void;
  buttonText?: string;
}): JSX.Element {
  // Filter out already-selected drinks from the dropdown
  const filteredDrinks = availableDrinks.filter(
    (d) => !selectedDrinks.drinks.some((td) => td.drink.id === d.id),
  );

  const onSelect = useCallback(
    (selected: T | undefined) => {
      if (!selected) return;
      setSelectedDrinks((prev) => {
        // Ensure we don't add the same drink twice (shouldn't occur normally with the filtering above)
        if (prev.drinks.some((d) => d.drink.id === selected.id)) return prev;
        // Add new drink with n=1
        return {
          drinks: [
            ...prev.drinks,
            {
              drink: selected,
              n: 1,
              on_table: 0,
              optional: false,
            },
          ],
        };
      });
    },
    [setSelectedDrinks],
  );

  return (
    <>
      <DropdownMenu
        buttonText={buttonText}
        options={filteredDrinks}
        selectedOption={undefined}
        setSelectedOption={onSelect}
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
          />
        ))}
      </div>
    </>
  );
}

export function DrinkSelectionCard({
  turnDrink,
  updateDrinks,
}: {
  turnDrink: TurnDrink;
  updateDrinks: (fn: (prev: TurnDrinks) => TurnDrinks) => void;
}): JSX.Element {
  const updateN = (change: number) => {
    updateDrinks((dr) => {
      const newN = turnDrink.n + change;
      // Don't go below 0
      if (newN < 0) return dr;
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
      <div className="w-1/2 flex flex-col">
        <div className="text-lg font-bold overflow-hidden text-ellipsis text-nowrap text-left">
          {turnDrink.drink.name}
        </div>
        {turnDrink.on_table > 0 && (
          <div className="text-base text-left">
            Ruudussa: {turnDrink.on_table} kpl
          </div>
        )}
        {turnDrink.optional && (
          <div className="text-base text-left">
            <em>Valinnainen</em>
          </div>
        )}
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
